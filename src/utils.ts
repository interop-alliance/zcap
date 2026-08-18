/*!
 * Copyright (c) 2018-2024 Digital Bazaar, Inc. All rights reserved.
 */
import {
  MAX_CHAIN_LENGTH,
  ZCAP_CONTEXT_URL,
  ZCAP_ROOT_PREFIX
} from './constants.js'
import type {
  IProofDescription,
  IVerificationMethod
} from '@interop/jsonld-signatures'
import type {
  ICapabilityDelegationProof,
  IDelegatedZcap,
  IRootZcap,
  IZcap
} from '@interop/data-integrity-core/zcap'
import type { GetRootCapability, ZcapError } from './types.js'

/**
 * Creates a root capability from a root controller and a root invocation
 * target.
 *
 * @param options - The options.
 * @param options.controller - The root controller.
 * @param options.invocationTarget - The root invocation target.
 *
 * @returns The root capability.
 */
export function createRootCapability({
  controller,
  invocationTarget
}: {
  controller: string | string[]
  invocationTarget: string
}): IRootZcap {
  return {
    '@context': ZCAP_CONTEXT_URL,
    id: `${ZCAP_ROOT_PREFIX}${encodeURIComponent(invocationTarget)}`,
    controller,
    invocationTarget
  }
}

/**
 * Retrieves the controller(s) from a capability.
 *
 * @param options - The options.
 * @param options.capability - The authorization capability (zcap).
 *
 * @returns The controller(s) for the capability.
 */
export function getControllers({
  capability
}: {
  capability: IZcap
}): string[] {
  const { controller } = capability
  if (!controller) {
    throw new Error('Capability controller not found.')
  }
  return Array.isArray(controller) ? controller : [controller]
}

/**
 * Returns true if the given verification method is a controller (or is
 * controlled by a controller) of the given capability.
 *
 * @param options - The options.
 * @param options.capability - The authorization capability (zcap).
 * @param options.verificationMethod - The verification method to check.
 *
 * @returns `true` if the controller matches, `false` if not.
 */
export function isController({
  capability,
  verificationMethod
}: {
  capability: IZcap
  verificationMethod: IVerificationMethod
}): boolean {
  const controllers = getControllers({ capability })
  return (
    controllers.includes(verificationMethod.controller as string) ||
    controllers.includes(verificationMethod.id)
  )
}

/**
 * Retrieves the allowed actions from a capability.
 *
 * @param options - The options.
 * @param options.capability - The authorization capability (zcap).
 *
 * @returns Allowed actions.
 */
export function getAllowedActions({
  capability
}: {
  capability: IZcap
}): string[] {
  if (!('allowedAction' in capability) || !capability.allowedAction) {
    return []
  }
  return [capability.allowedAction].flat()
}

/**
 * Retrieves the target from a capability.
 *
 * @param options - The options.
 * @param options.capability - The authorization capability (zcap).
 *
 * @returns Capability target.
 */
export function getTarget({ capability }: { capability: IZcap }): string {
  // zcaps MUST have an `invocationTarget` that is a string
  return capability.invocationTarget
}

/**
 * Retrieves the delegation proof(s) for a capability that is associated with
 * its parent capability. A capability that has no parent or no associated
 * delegation proofs will cause this function to return an empty array.
 *
 * @param options - The options.
 * @param options.capability - The authorization capability.
 *
 * @returns Any `capabilityDelegation` proof objects attached to the given
 *   capability.
 */
export function getDelegationProofs({
  capability
}: {
  capability: IZcap
}): ICapabilityDelegationProof[] {
  // capability is root or capability has no `proof`, then it has no relevant
  // delegation proofs
  if (!('parentCapability' in capability) || !capability.proof) {
    return []
  }
  const proof = capability.proof
  const proofs = Array.isArray(proof) ? proof : [proof]
  return proofs.filter(p => p && p.proofPurpose === 'capabilityDelegation')
}

/**
 * Gets the `capabilityChain` associated with the given capability.
 *
 * @param options - The options.
 * @param options.capability - The authorization capability.
 *
 * @returns The capability chain entries (root to parent), as stored in the
 *   delegation proof.
 */
export function getCapabilityChain({
  capability
}: {
  capability: IZcap
}): Array<string | IDelegatedZcap> {
  if (!('parentCapability' in capability)) {
    // root capability has no chain
    return []
  }

  const proofs = getDelegationProofs({ capability })
  const [proof] = proofs
  if (proofs.length !== 1 || !proof) {
    throw new Error(
      'Cannot get capability chain; capability is invalid; it is not the ' +
        'root capability yet it does not have exactly one delegation proof.'
    )
  }

  const { capabilityChain } = proof
  if (!(capabilityChain && Array.isArray(capabilityChain))) {
    throw new Error(
      'Cannot get capability chain; capability is invalid; it does not have ' +
        'a "capabilityChain" array in its delegation proof.'
    )
  }

  return capabilityChain.slice()
}

/**
 * Determines if the given `invocationTarget` is valid given a
 * `baseInvocationTarget`.
 *
 * To check for a proper delegation, `invocationTarget` must be the child
 * capability's `invocationTarget` and `baseInvocationTarget` must be the
 * parent capability's `invocationTarget`.
 *
 * To check for a proper invocation, `invocationTarget` must be the value from
 * the invocation proof and `baseInvocationTarget` must be the invoked
 * capability's `invocationTarget`.
 *
 * @param options - The options.
 * @param options.invocationTarget - The invocation target to check.
 * @param options.baseInvocationTarget - The base invocation target.
 * @param options.allowTargetAttenuation - `true` to allow target attenuation.
 *
 * @returns `true` if the target is valid, `false` if not.
 */
export function isValidTarget({
  invocationTarget,
  baseInvocationTarget,
  allowTargetAttenuation
}: {
  invocationTarget: string
  baseInvocationTarget: string
  allowTargetAttenuation?: boolean
}): boolean {
  // direct match, valid
  if (baseInvocationTarget === invocationTarget) {
    return true
  }
  if (allowTargetAttenuation) {
    /* Note: When `allowTargetAttenuation=true`, a zcap can be invoked with
    a more narrow target and delegated zcap can have a different invocation
    target from its parent. Here we must ensure that the invocation target
    has a proper prefix relative to the base one we're comparing against.

    If the `baseInvocationTarget` already has a query (has `?`) then the
    suffix that follows it must start with `&`. Otherwise, it may start
    with either `/` or `?`.

    A base that already ends in its own separator (`/` for a path base,
    `?` or `&` for a query base) is its own boundary prefix: appending
    another separator would degenerate (`//`, `?&`, `&&`) and match no
    descendant at all, while the base itself still enforces the same
    boundary (`/space/abc/` never matches `/space/abc-evil`, and the
    slashless parent `/space/abc` is still refused). */
    const prefixes = []
    if (baseInvocationTarget.includes('?')) {
      // query already present in base invocation target, so only accept new
      // variables in the query
      prefixes.push(
        baseInvocationTarget.endsWith('?') || baseInvocationTarget.endsWith('&')
          ? baseInvocationTarget
          : `${baseInvocationTarget}&`
      )
    } else {
      // accept path-based attenuation or new query-based attenuation
      prefixes.push(
        baseInvocationTarget.endsWith('/')
          ? baseInvocationTarget
          : `${baseInvocationTarget}/`
      )
      prefixes.push(`${baseInvocationTarget}?`)
    }
    if (prefixes.some(prefix => invocationTarget.startsWith(prefix))) {
      return true
    }
  }
  // not a match
  return false
}

/**
 * Creates a capability chain for delegating a capability from the
 * given `parentCapability`.
 *
 * @param options - The options.
 * @param options.parentCapability - The parent capability from which to compute
 *   the capability chain (a root zcap ID string, or a full root or delegated
 *   zcap object).
 * @param options._skipLocalValidationForTesting - Private.
 *
 * @returns The computed capability chain to be included in a capability
 *   delegation proof.
 */
export function computeCapabilityChain({
  parentCapability,
  _skipLocalValidationForTesting
}: {
  parentCapability: string | IZcap
  _skipLocalValidationForTesting?: boolean
}): Array<string | IDelegatedZcap> {
  // if parent capability is root (string or no parent of its own)
  if (typeof parentCapability === 'string') {
    return [parentCapability]
  }
  if (!('parentCapability' in parentCapability)) {
    // capability must be a root zcap
    checkCapability({ capability: parentCapability, expectRoot: true })
    return [parentCapability.id]
  }

  // capability must be a delegated zcap, check it and get its chain
  checkCapability({ capability: parentCapability, expectRoot: false })
  const proofs = getDelegationProofs({ capability: parentCapability })
  const [proof] = proofs
  if (proofs.length !== 1 || !proof) {
    throw new Error(
      'Cannot compute capability chain; parent capability is invalid; it is ' +
        'not the root capability yet it does not have exactly one delegation ' +
        'proof.'
    )
  }

  const { capabilityChain } = proof
  if (!(capabilityChain && Array.isArray(capabilityChain))) {
    throw new Error(
      'Cannot compute capability chain; parent capability is invalid; it ' +
        'does not have a "capabilityChain" array in its delegation proof.'
    )
  }

  // validate parent capability chain to help prevent bad delegations
  if (!_skipLocalValidationForTesting) {
    // ensure that all `capabilityChain` entries except the last are strings
    const lastRequiredType = capabilityChain.length > 1 ? 'object' : 'string'
    const lastIndex = capabilityChain.length - 1
    for (const [i, entry] of capabilityChain.entries()) {
      const entryType = typeof entry
      if (
        !(
          (i === lastIndex && entryType === lastRequiredType) ||
          (i !== lastIndex && entryType === 'string')
        )
      ) {
        throw new TypeError(
          'Cannot compute capability chain; parent capability chain is ' +
            'invalid; it must consist of strings of capability IDs except ' +
            'the last capability if it is delegated, in which case it must ' +
            'be an object with an "id" property that is a string.'
        )
      }
    }
  }

  // if last zcap is embedded, change it to a reference
  const newChain: Array<string | IDelegatedZcap> = capabilityChain.slice(
    0,
    capabilityChain.length - 1
  )
  const last = capabilityChain[capabilityChain.length - 1]
  if (typeof last === 'string') {
    newChain.push(last)
  } else if (last) {
    newChain.push(last.id)
  }
  newChain.push(parentCapability)

  // ensure new chain uses absolute URLs
  for (const entry of newChain) {
    if (
      (typeof entry === 'string' && !entry.includes(':')) ||
      (typeof entry === 'object' && !entry.id.includes(':'))
    ) {
      throw new Error(
        'Cannot compute capability chain; parent capability chain is ' +
          'invalid because uses relative URL(s) in its capability chain.'
      )
    }
  }

  return newChain
}

/**
 * Dereferences the capability chain associated with the given capability,
 * ensuring it passes a number of validation checks.
 *
 * A delegated zcap's chain has a reference to a root zcap. A verifier must
 * provide a hook (`getRootCapability`) to dereference this root zcap since
 * the root zcap has no delegation proof and must therefore be trusted by
 * the verifier. If the root zcap can't be dereferenced by the trusted hook,
 * then an authorization error must be thrown by that hook.
 *
 * This function will dereference the root zcap and then dereference all of
 * the embedded delegated zcaps from the chain, combining them into a single
 * array containing full zcaps ordered from root => tail.
 *
 * The dereferenced chain (result of this function) should then compare the
 * root zcap's ID against a list of expected root capabilities, throwing
 * an error if none of them match. Otherwise, the dereferenced chain should
 * then be processed to ensure that all delegation rules have been followed.
 * If checking an invocation, it should also be ensured that a combination of
 * an expected target and a root zcap is permitted (note it is conceivable that
 * a verifier may accept more than one combination, e.g., a target of `x` could
 * work with both root zcap `a` and `b`).
 *
 * @param options - The options.
 * @param options.capability - The authorization capability to dereference the
 *   chain for. Pass a string (the root zcap ID) to dereference a root zcap
 *   directly, or a delegated zcap object.
 * @param options.getRootCapability - A function for dereferencing the root
 *   capability (the root zcap must be deref'd in a trusted way by the verifier,
 *   it must not be untrusted input).
 * @param options.maxChainLength - The maximum length of the capability
 *   delegation chain (this is inclusive of `capability` itself).
 *
 * @returns Resolves to an object containing the full dereferenced chain ordered
 *   root to tail.
 */
export async function dereferenceCapabilityChain({
  capability,
  getRootCapability,
  maxChainLength = MAX_CHAIN_LENGTH
}: {
  capability: string | IDelegatedZcap
  getRootCapability: GetRootCapability
  maxChainLength?: number
}): Promise<{ dereferencedChain: IZcap[] }> {
  // capability MUST be a string if it is root; root zcaps MUST always be
  // dereferenced via a trusted mechanism provided by the verifier as they
  // do not have delegation proofs
  let tailCapability: IZcap
  if (typeof capability === 'string') {
    const id = capability
    const { rootCapability } = await getRootCapability({ id })
    checkCapability({ capability: rootCapability, expectRoot: true })
    if (rootCapability.id !== id) {
      throw new Error(
        `Dereferenced root capability ID "${rootCapability.id}" does not ` +
          `match reference ID "${id}".`
      )
    }
    tailCapability = rootCapability
  } else {
    // ensure capability itself is valid
    checkCapability({ capability, expectRoot: false })
    tailCapability = capability
  }

  // get a mapping of IDs to full zcaps as the chain is validated
  const dereferencedChainMap = new Map<string, string | IZcap>()

  // get the underef'd capability chain for the capability
  const capabilityChain = getCapabilityChain({ capability: tailCapability })

  // ensure capability chain length (add 1 to be inclusive of `capability`)
  // does not exceed max chain length; only check this once at the start
  // as it produces the most sensible error -- it is true that an embedded
  // zcap could go over the limit but this will be caught via a congruency
  // check on the length instead
  if (capabilityChain.length + 1 > maxChainLength) {
    throw new Error(
      'The capability chain exceeds the maximum allowed length ' +
        `of ${maxChainLength}.`
    )
  }

  // subtract one from the max chain length to start to account for
  // `capability` which is not present in `capabilityChain`
  let firstPass = true
  let requiredLength = capabilityChain.length
  let currentCapability: IZcap = tailCapability
  let currentCapabilityChain = capabilityChain
  while (currentCapabilityChain.length > 0) {
    if (currentCapabilityChain.length !== requiredLength) {
      throw new Error('The capability chain length is incongruent.')
    }

    // if `next.length > 1`, then its last entry is a delegated
    // capability and it MUST be fully embedded as an object; all other
    // entries MUST be strings
    const lastRequiredType =
      currentCapabilityChain.length > 1 ? 'object' : 'string'

    // validate entries and dereference delegated zcaps
    const lastIndex = currentCapabilityChain.length - 1
    for (const [i, entry] of currentCapabilityChain.entries()) {
      const entryType = typeof entry
      const entryIsString = entryType === 'string'
      const requiredType = i === lastIndex ? lastRequiredType : 'string'

      // ensure entry is the required type and, if it is an object, its `id`
      // is a string
      if (
        !(
          entryType === requiredType &&
          (entryIsString ||
            (typeof entry === 'object' && typeof entry.id === 'string'))
        )
      ) {
        throw new TypeError(
          'Capability chain is invalid; it must consist of strings ' +
            'of capability IDs except the last capability if it is ' +
            'delegated, in which case it must be an object with an "id" ' +
            'property that is a string.'
        )
      }

      // ensure capability ID expresses an absolute URI (i.e., it has `:`)
      const id = typeof entry === 'string' ? entry : entry.id
      if (!id.includes(':')) {
        throw new Error(
          'Capability chain is invalid; it contains a capability ID ' +
            'that is not an absolute URI.'
        )
      }

      // ensure last entry in chain matches parent capability
      if (
        i === lastIndex &&
        'parentCapability' in currentCapability &&
        currentCapability.parentCapability !== id
      ) {
        throw new Error(
          'Capability chain is invalid; the last entry does not ' +
            'match the parent capability.'
        )
      }

      if (typeof entry !== 'string') {
        // check zcap data model
        checkCapability({ capability: entry, expectRoot: i === 0 })
      }

      // ensure no cycles in the capability chain
      if (firstPass) {
        // on the first pass, the zcap must not have been seen yet
        if (id === tailCapability.id || dereferencedChainMap.has(id)) {
          throw new Error('The capability chain contains a cycle.')
        }
        // add zcap to the map whether it is only a reference (an ID) or
        // a fully embedded zcap; this will be used to ensure no additional
        // zcaps are added to the chain
        dereferencedChainMap.set(id, entry)
      } else {
        // on non-first pass, every ID should already be in the zcap map
        // and they should all be strings, not objects
        const existing = dereferencedChainMap.get(id)
        if (!existing) {
          // the chain is inconsistent across delegated zcaps
          throw new Error('The capability chain is inconsistent.')
        }
        if (id === tailCapability.id || typeof existing === 'object') {
          // the zcap has been deferenced before, there's a cycle
          throw new Error('The capability chain contains a cycle.')
        }

        // only update the zcaps map using a fully embedded zcap
        if (typeof entry !== 'string') {
          dereferencedChainMap.set(id, entry)
        }
      }
    }

    // if the chain has more than the root zcap, loop to process the
    // next chain from the last delegated zcap
    if (currentCapabilityChain.length > 1) {
      // next chain must be 1 shorter than the current one
      requiredLength--
      const nextCapability =
        currentCapabilityChain[currentCapabilityChain.length - 1]
      // the last entry of a chain longer than one is always an embedded zcap
      if (typeof nextCapability !== 'object') {
        throw new TypeError('The capability chain is invalid.')
      }
      currentCapability = nextCapability
      currentCapabilityChain = getCapabilityChain({
        capability: currentCapability
      })
    } else {
      // no more chains to check
      break
    }

    firstPass = false
  }

  // dereference root zcap via provided trusted `getRootCapability` function
  if (capabilityChain.length > 0) {
    const [id] = capabilityChain
    if (typeof id !== 'string') {
      throw new TypeError('The capability chain is invalid.')
    }
    const { rootCapability } = await getRootCapability({ id })
    checkCapability({ capability: rootCapability, expectRoot: true })
    if (rootCapability.id !== id) {
      throw new Error(
        `Dereferenced root capability ID "${rootCapability.id}" does not ` +
          `match reference ID "${id}" from capability chain.`
      )
    }
    dereferencedChainMap.set(id, rootCapability)
  }

  // include `capability` in dereferenced map
  dereferencedChainMap.set(tailCapability.id, tailCapability)
  const dereferencedChain = [...dereferencedChainMap.values()] as IZcap[]

  return { dereferencedChain }
}

/**
 * Asserts that a proof carries the required zcap JSON-LD context. The context
 * may appear anywhere in the proof's `@context` array (it is protected
 * regardless of position).
 *
 * @param options - The options.
 * @param options.proof - The proof to check; its `@context` must be, or
 *   include, the zcap context URL.
 *
 * @throws {Error} If the zcap context is missing from the proof.
 */
export function checkProofContext({
  proof
}: {
  proof: IProofDescription
}): void {
  // zcap context can appear anywhere in the array as it *is* protected
  const { '@context': ctx } = proof
  if (
    !(
      (Array.isArray(ctx) && ctx.includes(ZCAP_CONTEXT_URL)) ||
      ctx === ZCAP_CONTEXT_URL
    )
  ) {
    throw new Error(
      `Missing required capability proof context ("${ZCAP_CONTEXT_URL}").`
    )
  }
}

/**
 * Determines whether a child capability's `allowedAction` is valid, i.e., no
 * less restrictive than its parent's. If the parent does not restrict actions
 * (its `allowedAction` is absent), any child action is allowed.
 *
 * @param options - The options.
 * @param options.allowedAction - The child capability's allowed action(s).
 * @param options.parentAllowedAction - The parent capability's allowed
 *   action(s).
 *
 * @returns `true` if the child's allowed action(s) are valid.
 */
export function hasValidAllowedAction({
  allowedAction,
  parentAllowedAction
}: {
  allowedAction?: string | string[]
  parentAllowedAction?: string | string[]
}): boolean {
  // if the parent's `allowedAction` is `undefined`, then any more restrictive
  // action is allowed in the child
  if (!parentAllowedAction) {
    return true
  }

  if (Array.isArray(parentAllowedAction)) {
    // parent's `allowedAction` must include every one from child's
    if (Array.isArray(allowedAction)) {
      return allowedAction.every(a => parentAllowedAction.includes(a))
    }
    return (
      allowedAction !== undefined && parentAllowedAction.includes(allowedAction)
    )
  }

  // require exact match
  return parentAllowedAction === allowedAction
}

/**
 * Validates the data model of a capability (root or delegated), throwing if it
 * is malformed or if its root/delegated kind does not match `expectRoot`.
 *
 * Checks include: required `@context`, absolute-URI `id` and
 * `invocationTarget`, `allowedAction` shape, and (for delegated zcaps) a valid
 * `parentCapability`, a `capabilityDelegation` proof with a valid `created`
 * date, and a valid `expires` date. Root zcaps must not carry `expires`.
 *
 * @param options - The options.
 * @param options.capability - The capability to check.
 * @param options.expectRoot - `true` if the capability is expected to be a root
 *   zcap, `false` if it is expected to be delegated.
 *
 * @throws {Error} If the capability is invalid or of an unexpected kind.
 */
export function checkCapability({
  capability,
  expectRoot
}: {
  capability: IZcap
  expectRoot: boolean
}): void {
  const context = capability['@context']
  const { id, invocationTarget } = capability
  const parentCapability =
    'parentCapability' in capability ? capability.parentCapability : undefined
  // read `allowedAction`/`expires` from the actual capability regardless of
  // kind: a root zcap must be rejected if it carries `expires`, and its
  // `allowedAction` shape must still be validated.
  const { allowedAction, expires } = capability as Partial<IDelegatedZcap>

  const isRoot = parentCapability === undefined
  if (isRoot) {
    if (context !== ZCAP_CONTEXT_URL) {
      throw new Error(
        'Root capability must have an "@context" value of ' +
          `"${ZCAP_CONTEXT_URL}".`
      )
    }
    if (expires !== undefined) {
      throw new Error('Root capability must not have an "expires" field.')
    }
  } else {
    if (!(Array.isArray(context) && context[0] === ZCAP_CONTEXT_URL)) {
      throw new Error(
        'Delegated capability must have an "@context" array ' +
          `with "${ZCAP_CONTEXT_URL}" in its first position.`
      )
    }
    if (
      !(typeof parentCapability === 'string' && parentCapability.includes(':'))
    ) {
      throw new Error(
        'Delegated capability must have a "parentCapability" with a string ' +
          'value that expresses an absolute URI.'
      )
    }
    const [proof] = getDelegationProofs({ capability })
    if (!proof) {
      throw new Error('Delegated capability must have a "proof".')
    }
    if (isNaN(Date.parse(proof.created))) {
      throw new Error(
        'Delegated capability must have a valid proof "created" date.'
      )
    }
    if (expires === undefined || isNaN(Date.parse(expires))) {
      throw new Error('Delegated capability must have a valid expires date.')
    }
  }

  if (!(typeof id === 'string' && id.includes(':'))) {
    throw new Error(
      'Capability must have an "id" with a string value that expresses an ' +
        'absolute URI.'
    )
  }
  if (
    !(typeof invocationTarget === 'string' && invocationTarget.includes(':'))
  ) {
    throw new Error(
      'Capability must have an "invocationTarget" with a string value that ' +
        'expresses an absolute URI.'
    )
  }
  if (
    allowedAction !== undefined &&
    !(
      typeof allowedAction === 'string' ||
      (Array.isArray(allowedAction) && allowedAction.length > 0)
    )
  ) {
    throw new Error(
      'If present on a capability, "allowedAction" must be a string or a ' +
        'non-empty array.'
    )
  }

  if (isRoot !== expectRoot) {
    if (expectRoot) {
      throw new Error(
        `Expected capability "${capability.id}" to be root ` +
          'but it is delegated.'
      )
    }
    throw new Error(
      `Expected capability "${capability.id}" to be delegated but it is root.`
    )
  }
}

/**
 * Compares two timestamps, allowing for a maximum clock skew. Times within
 * `maxClockSkew` of each other are treated as equal.
 *
 * @param options - The options.
 * @param options.t1 - The first time, in milliseconds since the epoch.
 * @param options.t2 - The second time, in milliseconds since the epoch.
 * @param options.maxClockSkew - The maximum allowed clock skew, in seconds.
 *
 * @returns `0` if equal within the skew, `-1` if `t1 < t2`, otherwise `1`.
 */
export function compareTime({
  t1,
  t2,
  maxClockSkew
}: {
  t1: number
  t2: number
  maxClockSkew: number
}): number {
  // `maxClockSkew` is in seconds, so transform to milliseconds
  if (Math.abs(t1 - t2) < maxClockSkew * 1000) {
    // times are equal within the max clock skew
    return 0
  }
  return t1 < t2 ? -1 : 1
}

/**
 * Creates an `Error` carrying a structured `details` object.
 *
 * @param message - The error message.
 * @param details - The structured details to attach.
 *
 * @returns The error with `details` set.
 */
export function createDetailedError(
  message: string,
  details: object
): ZcapError {
  const error: ZcapError = new Error(message)
  error.details = details
  return error
}

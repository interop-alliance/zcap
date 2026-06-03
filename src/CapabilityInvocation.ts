/*!
 * Copyright (c) 2018-2024 Digital Bazaar, Inc. All rights reserved.
 */
import * as utils from './utils.js'
import { CapabilityDelegation } from './CapabilityDelegation.js'
import {
  CapabilityProofPurpose,
  type CapabilityDelegationConstructor
} from './CapabilityProofPurpose.js'
import type {
  IProofDescription,
  IVerificationMethod
} from '@interop/jsonld-signatures'
import type { IDelegatedZcap, IZcap } from '@interop/data-integrity-core/zcap'
import type {
  CapabilityInvocationOptions,
  CapabilityMeta,
  CapabilityValidateResult,
  ValidateOptions
} from './types.js'

/**
 * The proof purpose for *invoking* an authorization capability (zcap).
 *
 * Instantiated in one of two mutually exclusive modes:
 * - **Create-proof mode** — pass `{capability, capabilityAction,
 *   invocationTarget}`.
 * - **Verify-proof mode** — pass `{expectedAction, expectedTarget,
 *   expectedRootCapability, suite, ...}`.
 *
 * Passing parameters from both modes together throws.
 */
export class CapabilityInvocation extends CapabilityProofPurpose {
  capability?: string | IDelegatedZcap
  capabilityAction?: string
  invocationTarget?: string
  expectedAction?: string
  expectedTarget?: string | string[]

  /**
   * @param options - The options.
   * @param options.capability - The capability to add/reference in a created
   *   proof. A root zcap MUST be passed as its ID string; a delegated zcap must
   *   be passed as the full object.
   * @param options.capabilityAction - The capability action that is to be added
   *   to a proof.
   * @param options.invocationTarget - The invocation target to use; this is
   *   required and can be used to attenuate the capability's invocation target
   *   if the verifier supports target attenuation.
   * @param options.allowTargetAttenuation - Allow the invocationTarget of a
   *   delegation chain to be increasingly restrictive based on a hierarchical
   *   RESTful URL structure.
   * @param options.controller - The description of the controller, if it is not
   *   to be dereferenced via a `documentLoader`.
   * @param options.date - Used during proof verification as the expected date
   *   for the creation of the proof (within a maximum timestamp delta) and for
   *   checking to see if a capability has expired; if not passed the current
   *   date will be used.
   * @param options.expectedAction - The capability action that is expected when
   *   validating a proof.
   * @param options.expectedRootCapability - The expected root capability for
   *   the delegation chain (a single root capability ID string, or an array of
   *   acceptable root capability ID strings).
   * @param options.expectedTarget - The target(s) we expect a capability to
   *   apply to (absolute URI, or array of URIs).
   * @param options.inspectCapabilityChain - An async function that can be used
   *   to check for revocations related to any of verified capabilities.
   * @param options.maxChainLength - The maximum length of the capability
   *   delegation chain.
   * @param options.maxClockSkew - A maximum number of seconds that clocks may
   *   be skewed when checking capability expiration date-times against `date`
   *   and when comparing invocation proof creation time against delegation
   *   proof creation time.
   * @param options.maxDelegationTtl - The maximum milliseconds to live for a
   *   delegated zcap as measured by the time difference between `expires` and
   *   `created` on the delegation proof.
   * @param options.maxTimestampDelta - A maximum number of seconds that
   *   "created" date on the capability invocation proof can deviate from
   *   `date`, defaults to `Infinity`.
   * @param options.suite - The jsonld-signature suite(s) to use to verify the
   *   capability chain. Required only in verify-proof mode; unused (and
   *   omitted) when creating an invocation proof.
   */
  constructor({
    // proof creation params
    capability,
    capabilityAction,
    invocationTarget,
    // proof verification params
    allowTargetAttenuation,
    controller,
    date,
    expectedAction,
    expectedRootCapability,
    expectedTarget,
    inspectCapabilityChain,
    maxChainLength,
    maxClockSkew,
    maxDelegationTtl,
    maxTimestampDelta,
    suite
  }: CapabilityInvocationOptions = {}) {
    // parameters used to create a proof
    const hasCreateProofParams =
      capability || capabilityAction || invocationTarget
    // params used to verify a proof
    const hasVerifyProofParams =
      controller ||
      date ||
      expectedAction ||
      expectedRootCapability ||
      expectedTarget ||
      inspectCapabilityChain ||
      suite

    if (hasCreateProofParams && hasVerifyProofParams) {
      // cannot provide both create and verify params
      throw new Error(
        'Parameters for both creating and verifying a proof must not be ' +
          'provided together.'
      )
    }

    super({
      allowTargetAttenuation,
      controller,
      date,
      expectedRootCapability,
      inspectCapabilityChain,
      maxChainLength,
      maxClockSkew,
      maxDelegationTtl,
      maxTimestampDelta,
      suite,
      term: 'capabilityInvocation'
    })

    // validate `CapabilityInvocation` specific params, the base class will
    // have already handled validating common ones...

    // use negative conditional to cover case where neither create nor
    // verify params were provided and default to proof creation case to
    // avoid creating bad proofs
    if (!hasVerifyProofParams) {
      if (typeof capability === 'object') {
        // root capabilities MUST be passed as strings
        if (!(capability && capability.parentCapability)) {
          throw new Error(
            '"capability" must be a string if it is a root capability.'
          )
        }
      } else if (typeof capability !== 'string') {
        throw new TypeError('"capability" must be a string or object.')
      }
      if (typeof capabilityAction !== 'string') {
        throw new TypeError('"capabilityAction" must be a string.')
      }
      if (
        !(
          typeof invocationTarget === 'string' && invocationTarget.includes(':')
        )
      ) {
        throw new TypeError(
          '"invocationTarget" must be a string that expresses an absolute URI.'
        )
      }

      this.capability = capability
      this.capabilityAction = capabilityAction
      this.invocationTarget = invocationTarget
    } else {
      if (typeof expectedAction !== 'string') {
        throw new TypeError('"expectedAction" must be a string.')
      }
      if (
        !(typeof expectedTarget === 'string' || Array.isArray(expectedTarget))
      ) {
        throw new TypeError('"expectedTarget" must be a string or array.')
      }
      // expected target values must be absolute URIs
      const expectedTargets = Array.isArray(expectedTarget)
        ? expectedTarget
        : [expectedTarget]
      for (const et of expectedTargets) {
        if (!(typeof et === 'string' && et.includes(':'))) {
          throw new Error(
            '"expectedTargets" values must be absolute URI strings.'
          )
        }
      }

      this.expectedTarget = expectedTarget
      this.expectedAction = expectedAction
    }
  }

  /**
   * Adds the capability invocation terms (`capability`, `invocationTarget`,
   * `capabilityAction`, `proofPurpose`) to a proof being created. Used in
   * create-proof mode.
   *
   * @param proof - The proof under construction.
   *
   * @returns Resolves to the updated proof.
   */
  async update(proof: IProofDescription): Promise<IProofDescription> {
    const { capability, capabilityAction, invocationTarget } = this
    proof.proofPurpose = this.term
    proof.capability = capability
    proof.invocationTarget = invocationTarget
    proof.capabilityAction = capabilityAction
    return proof
  }

  /**
   * Determines whether the given proof matches this proof purpose, i.e., it has
   * the zcap context, references a capability, and its `capabilityAction` and
   * `invocationTarget` match `expectedAction` and `expectedTarget`. Used in
   * verify-proof mode.
   *
   * @param proof - The proof to test.
   * @param options - The options.
   * @param options.document - The document the proof is attached to.
   * @param options.documentLoader - A configured document loader.
   *
   * @returns Resolves to `true` if the proof matches.
   */
  async match(
    proof: IProofDescription,
    { document, documentLoader }: ValidateOptions
  ): Promise<boolean> {
    const { expectedAction, expectedTarget } = this

    try {
      // check the `proof` context before using its terms
      utils.checkProofContext({ proof })
    } catch {
      // context does not match, so proof does not match
      return false
    }

    if (!proof.capability) {
      // capability not in the proof, not a match
      return false
    }

    // ensure basic purpose and expected action match the proof
    if (
      !(
        (await super.match(proof, { document, documentLoader })) &&
        expectedAction === proof.capabilityAction
      )
    ) {
      return false
    }

    // ensure the proof's declared invocation target matches an expected one
    if (Array.isArray(expectedTarget)) {
      return expectedTarget.includes(proof.invocationTarget as string)
    }
    return expectedTarget === proof.invocationTarget
  }

  /** @returns The `CapabilityDelegation` class. */
  _getCapabilityDelegationClass(): CapabilityDelegationConstructor {
    return CapabilityDelegation
  }

  /**
   * Resolves the invoked (tail) capability from the invocation proof.
   *
   * @param options - The options.
   * @param options.proof - The capability invocation proof; its `capability` is
   *   the invoked capability (a root zcap ID string or a delegated zcap
   *   object).
   *
   * @returns The invoked capability.
   */
  _getTailCapability({
    proof
  }: {
    document?: object
    proof: IProofDescription
  }): { capability: string | IZcap } {
    return { capability: proof.capability as string | IZcap }
  }

  /**
   * Runs invocation-specific checks before chain verification: that
   * `capabilityAction` is allowed and matches `expectedAction`, that the
   * proof's `invocationTarget` matches the capability target (honoring target
   * attenuation) and an `expectedTarget`, and that a delegated capability is
   * not invoked before its delegation proof's `created` date.
   *
   * @param options - The options.
   * @param options.dereferencedChain - The dereferenced chain (root to tail).
   * @param options.proof - The capability invocation proof.
   *
   * @returns Resolves with an empty `capabilityChainMeta` (the tail's
   *   delegation proof is verified later by `_verifyCapabilityChain`).
   */
  async _runChecksBeforeChainVerification({
    dereferencedChain,
    proof
  }: {
    dereferencedChain: IZcap[]
    proof: IProofDescription
    validateOptions: ValidateOptions
  }): Promise<{ capabilityChainMeta: CapabilityMeta[] }> {
    const { allowTargetAttenuation, expectedAction, expectedTarget } = this

    /* 1. Ensure that `capabilityAction` is an allowed action and that
    it matches `expectedAction`. Note that if it doesn't match and `match`
    was called to gate calling `validate`, then this code will not execute.
    However, if `validate` is called directly, this check MUST run here.

    If the capability restricts the actions via `allowedAction` then
    `capabilityAction` must be in its set. */
    const capability = dereferencedChain[dereferencedChain.length - 1]!
    const capabilityAction = proof.capabilityAction as string
    const allowedActions = utils.getAllowedActions({ capability })
    if (
      allowedActions.length > 0 &&
      !allowedActions.includes(capabilityAction)
    ) {
      throw new Error(
        `Capability action "${capabilityAction}" is not allowed by the ` +
          'capability; allowed actions are: ' +
          allowedActions.map(x => `"${x}"`).join(', ')
      )
    }
    if (capabilityAction !== expectedAction) {
      throw new Error(
        `Capability action "${capabilityAction}" does not match the ` +
          `expected action of "${expectedAction}".`
      )
    }

    /* 2. Ensure `expectedTarget` is as expected. The invocation target
    will also be checked to ensure it hasn't changed from previous zcaps
    in the chain (unless attenuation is permitted) later. */

    /* 3. Verify the invocation target in the proof is as expected. The
    `invocationTarget` specified in the capability invocation proof must
    match exactly (or follow acceptable target attenuation rules) the
    `invocationTarget` specified in the invoked capability. */
    const capabilityTarget = utils.getTarget({ capability })
    const { invocationTarget } = proof
    if (
      !(typeof invocationTarget === 'string' && invocationTarget.includes(':'))
    ) {
      throw new TypeError(
        `Invocation target (${invocationTarget}) must be a string that ` +
          'expresses an absolute URI.'
      )
    }
    if (
      !utils.isValidTarget({
        invocationTarget,
        baseInvocationTarget: capabilityTarget,
        allowTargetAttenuation
      })
    ) {
      throw new Error(
        `Invocation target (${invocationTarget}) does not match ` +
          `capability target (${capabilityTarget}).`
      )
    }

    /* 4. Verify the invocation target is an expected target. Prior to this
    step we ensured that the invocation target used matched th capability
    that was invoked, but this check ensures that the invocation target used
    matches the endpoint (the `expectedTarget`) where the capability was
    actually invoked. */
    if (
      !(
        (Array.isArray(expectedTarget) &&
          expectedTarget.includes(invocationTarget)) ||
        (typeof expectedTarget === 'string' &&
          invocationTarget === expectedTarget)
      )
    ) {
      throw new Error(
        `Expected target (${String(expectedTarget)}) does not match ` +
          `invocation target (${invocationTarget}).`
      )
    }

    /* 5. If capability is delegated (not root), then ensure the capability
    invocation proof `created` date is not before the capability delegation
    proof creation date. */
    if ('parentCapability' in capability) {
      const invoked = Date.parse(proof.created!)
      const [delegationProof] = utils.getDelegationProofs({ capability })
      const delegated = Date.parse(delegationProof!.created)
      const { maxClockSkew = 300 } = this
      // use `utils.compareTime` to allow for clock drift from the machine
      // that created the delegation proof and the machine that created
      // the invocation proof
      if (utils.compareTime({ t1: invoked, t2: delegated, maxClockSkew }) < 0) {
        throw new Error(
          'A delegated capability must not be invoked before the "created" ' +
            'date in its delegation proof.'
        )
      }
    }

    // return no capability delegation verify results yet; the tail's
    // capability delegation proof must be verified via
    // `_verifyCapabilityChain`
    return { capabilityChainMeta: [] }
  }

  /**
   * Runs invocation-specific checks after chain verification: that the invoking
   * verification method (or its controller) is the capability controller, that
   * a delegated capability has not expired, and the base proof validation. Sets
   * `result.invoker` to the proof controller.
   *
   * @param options - The options.
   * @param options.dereferencedChain - The dereferenced chain (root to tail).
   * @param options.proof - The capability invocation proof.
   * @param options.validateOptions - The validation options passed through from
   *   `jsigs` (including `verificationMethod`).
   *
   * @returns Resolves to the proof validation result with an added `invoker`.
   */
  async _runChecksAfterChainVerification({
    dereferencedChain,
    proof,
    validateOptions
  }: {
    capabilityChainMeta: CapabilityMeta[]
    dereferencedChain: IZcap[]
    proof: IProofDescription
    validateOptions: ValidateOptions
  }): Promise<CapabilityValidateResult> {
    /* Verify the controller of the capability. The zcap controller must
    match the invoking verification method (or its controller). */
    const capability = dereferencedChain[dereferencedChain.length - 1]!
    const { verificationMethod } = validateOptions
    if (
      !utils.isController({
        capability,
        verificationMethod: verificationMethod as IVerificationMethod
      })
    ) {
      throw utils.createDetailedError(
        'The capability controller does not match the verification method ' +
          '(or its controller) used to invoke.',
        { capability, verificationMethod }
      )
    }

    // if capability is delegated, verify that it has not expired
    if ('parentCapability' in capability) {
      // verify expiration dates
      // expires date has been previously validated, so just parse it
      const currentCapabilityExpirationTime = Date.parse(capability.expires)

      // use `utils.compareTime` to allow for allow for clock drift because
      // we are comparing against `currentDate`
      const { date, maxClockSkew = 300 } = this
      const currentDate = (date && new Date(date)) || new Date()
      if (
        utils.compareTime({
          t1: currentDate.getTime(),
          t2: currentCapabilityExpirationTime,
          maxClockSkew
        }) > 0
      ) {
        throw new Error('The invoked capability has expired.')
      }
    }

    // run base level validation checks
    const result = await this._runBaseProofValidation({
      proof,
      validateOptions
    })
    if (!result.valid) {
      throw result.error
    }

    // the controller of the verification method from the proof is the
    // invoker of the capability
    result.invoker = result.controller

    return result
  }
}

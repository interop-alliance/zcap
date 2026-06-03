/*!
 * Copyright (c) 2018-2024 Digital Bazaar, Inc. All rights reserved.
 */
import * as utils from './utils.js'
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
  CapabilityDelegationOptions,
  CapabilityMeta,
  CapabilityValidateResult,
  ValidateOptions
} from './types.js'

/**
 * The proof purpose for *delegating* an authorization capability (zcap).
 *
 * Instantiated in one of two mutually exclusive modes:
 * - **Create-proof mode** — pass `{parentCapability}` (the capability chain is
 *   auto-computed from the parent).
 * - **Verify-proof mode** — pass `{expectedRootCapability, suite, ...}`.
 *
 * Passing parameters from both modes together throws.
 */
export class CapabilityDelegation extends CapabilityProofPurpose {
  parentCapability?: string | IZcap
  _verifiedParentCapability?: IZcap
  _capabilityChain?: Array<string | IDelegatedZcap>
  _skipLocalValidationForTesting?: boolean

  /**
   * @param options - The options.
   * @param options.parentCapability - An alternative to passing
   *   `capabilityChain` when creating a proof; passing `parentCapability` will
   *   enable the capability chain to be auto-computed. Pass a root zcap ID
   *   string, or a full root or delegated zcap object.
   * @param options.allowTargetAttenuation - Allow the invocationTarget of a
   *   delegation chain to be increasingly restrictive based on a hierarchical
   *   RESTful URL structure.
   * @param options.date - Used during proof verification as the expected date
   *   for the creation of the proof (within a maximum timestamp delta) and for
   *   checking to see if a capability has expired; if not passed the current
   *   date will be used.
   * @param options.expectedRootCapability - The expected root capability for
   *   the delegation chain (a single root capability ID string, or an array of
   *   acceptable root capability ID strings).
   * @param options.controller - The description of the controller, if it is not
   *   to be dereferenced via a `documentLoader`.
   * @param options.inspectCapabilityChain - An async function that can be used
   *   to check for revocations related to any of verified capabilities.
   * @param options.maxChainLength - The maximum length of the capability
   *   delegation chain.
   * @param options.maxClockSkew - A maximum number of seconds that clocks may
   *   be skewed when checking capability expiration date-times against `date`.
   * @param options.maxDelegationTtl - The maximum milliseconds to live for a
   *   delegated zcap as measured by the time difference between `expires` and
   *   `created` on the delegation proof.
   * @param options.suite - The jsonld-signature suite(s) to use to verify the
   *   capability chain. Required only in verify-proof mode; unused (and
   *   omitted) when creating a delegation proof.
   * @param options._verifiedParentCapability - Private.
   * @param options._capabilityChain - Private.
   * @param options._skipLocalValidationForTesting - Private.
   */
  constructor({
    // proof creation params
    parentCapability,
    // proof verification params
    allowTargetAttenuation,
    controller,
    date,
    expectedRootCapability,
    inspectCapabilityChain,
    maxChainLength,
    maxClockSkew,
    maxDelegationTtl,
    suite,
    _verifiedParentCapability,
    // for testing purposes only, not documented intentionally
    _capabilityChain,
    _skipLocalValidationForTesting = false
  }: CapabilityDelegationOptions = {}) {
    // parameters used to create a proof
    const hasCreateProofParams = parentCapability || _capabilityChain
    // params used to verify a proof
    const hasVerifyProofParams =
      controller ||
      date ||
      expectedRootCapability ||
      inspectCapabilityChain ||
      suite ||
      _verifiedParentCapability

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
      // always `Infinity` for capability delegation proofs, as their "created"
      // values are not checked for liveness, rather "expires" is used instead
      maxTimestampDelta: Infinity,
      suite,
      term: 'capabilityDelegation'
    })

    // validate `CapabilityDelegation` specific params, the base class will
    // have already handled validating common ones...

    // use negative conditional to cover case where neither create nor
    // verify params were provided and default to proof creation case to
    // avoid creating bad proofs
    if (!hasVerifyProofParams) {
      if (
        !(
          typeof parentCapability === 'string' ||
          (typeof parentCapability === 'object' &&
            typeof parentCapability.id === 'string')
        )
      ) {
        throw new TypeError(
          '"parentCapability" must be a string expressing the ID of a root ' +
            'capability or an object expressing the full parent capability.'
        )
      }

      this.parentCapability = parentCapability
      if (_capabilityChain) {
        if (!Array.isArray(_capabilityChain)) {
          throw new TypeError('"_capabilityChain" must be an array.')
        }
        this._capabilityChain = _capabilityChain
      }
      if (_skipLocalValidationForTesting !== undefined) {
        this._skipLocalValidationForTesting = _skipLocalValidationForTesting
      }
    } else {
      this._verifiedParentCapability = _verifiedParentCapability
    }
  }

  /**
   * Adds the capability delegation terms (`proofPurpose`, `capabilityChain`) to
   * a proof being created, then validates the resulting delegated capability
   * against its parent (data model, expiry, `allowedAction` and `expires`
   * attenuation, and delegation ordering). Used in create-proof mode.
   *
   * @param proof - The proof under construction.
   * @param options - The options.
   * @param options.document - The capability being delegated (without its
   *   proof).
   *
   * @returns Resolves to the updated proof.
   */
  async update(
    proof: IProofDescription,
    { document }: { document: object }
  ): Promise<IProofDescription> {
    // if no capability chain given (*for testing purposes only*), then
    // compute from parent
    let capabilityChain: Array<string | IDelegatedZcap>
    const {
      parentCapability,
      term,
      _capabilityChain,
      _skipLocalValidationForTesting
    } = this
    if (_capabilityChain) {
      // use chain override from tests
      capabilityChain = _capabilityChain
    } else {
      capabilityChain = utils.computeCapabilityChain({
        parentCapability: parentCapability as string | IZcap,
        _skipLocalValidationForTesting
      })
    }

    proof.proofPurpose = term
    proof.capabilityChain = capabilityChain

    if (!_skipLocalValidationForTesting) {
      // check capability data model
      const capability = { ...document, proof } as unknown as IZcap
      utils.checkCapability({ capability, expectRoot: false })

      // ensure proof will not be created after it expires
      const created = Date.parse(proof.created!)
      const expires = Date.parse(
        'expires' in capability ? capability.expires : ''
      )
      /* Note: Intentionally do not use `utils.compareTime` as there is no
      clock drift issue here. We are not comparing against any live values
      but against date-time values expressed in the chain. */
      if (created > expires) {
        throw new Error('Cannot delegate an expired capability.')
      }

      // `parentCapability` is a string only when it is a root zcap ID; root
      // zcaps carry no `allowedAction`, `expires`, or delegation proof, so a
      // string parent is treated as having none of those.
      const parent =
        typeof parentCapability === 'string' ? undefined : parentCapability

      // ensure `allowedAction`, if present, is not less restrictive
      const parentAllowedAction =
        parent && 'allowedAction' in parent ? parent.allowedAction : undefined
      const allowedAction = (document as { allowedAction?: string | string[] })
        .allowedAction
      if (
        !utils.hasValidAllowedAction({ allowedAction, parentAllowedAction })
      ) {
        throw new Error(
          'The "allowedAction" in a delegated capability ' +
            'must not be less restrictive than its parent.'
        )
      }

      // ensure `expires` is not less restrictive
      const parentExpires =
        parent && 'expires' in parent ? parent.expires : undefined
      if (parentExpires !== undefined) {
        // handle case where `expires` is set in the parent, but the child
        // has an expiration date greater than the parent;
        /* Note: Intentionally do not use `utils.compareTime` as there is no
        clock drift issue here. We are not comparing against any live values
        but against date-time values expressed in the chain. Additionally,
        allowing skew here could introduce vulnerabilities where the expires
        time drift could aggregate with each new capability in the chain. */
        if (expires > Date.parse(parentExpires)) {
          throw new Error(
            'The `expires` property in a delegated capability must not be ' +
              'less restrictive than its parent.'
          )
        }
      }

      // ensure capability won't be delegated before its parent was delegated
      // (if that parent is non-root)
      if (capabilityChain.length > 1) {
        // get delegated date-time (note: `computeCapabilityChain` has already
        // validated that there is a single delegation proof in
        // `parentCapability`)
        // a chain length > 1 means the parent is a delegated (object) zcap
        const [parentProof] = utils.getDelegationProofs({ capability: parent! })
        const parentDelegationTime = Date.parse(parentProof!.created)
        const childDelegationTime = Date.parse(proof.created!)
        // verify parent capability was not delegated after child
        if (parentDelegationTime > childDelegationTime) {
          throw new Error(
            'A capability in the delegation chain was delegated before ' +
              'its parent.'
          )
        }
      }
    }

    return proof
  }

  /**
   * Determines whether the given proof matches this proof purpose: it must
   * carry the zcap context and satisfy the base `capabilityDelegation` match.
   * Used in verify-proof mode.
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
    try {
      // check the `proof` context before using its terms
      utils.checkProofContext({ proof })
    } catch {
      // context does not match, so proof does not match
      return false
    }

    return super.match(proof, { document, documentLoader })
  }

  /** @returns The `CapabilityDelegation` class. */
  _getCapabilityDelegationClass(): CapabilityDelegationConstructor {
    return CapabilityDelegation
  }

  /**
   * Resolves the delegated (tail) capability by reattaching the proof to the
   * document; the proof carries the `capabilityChain` that must be dereferenced
   * and verified.
   *
   * @param options - The options.
   * @param options.document - The delegated capability (without its proof).
   * @param options.proof - The capability delegation proof.
   *
   * @returns The delegated capability with its proof reattached.
   */
  _getTailCapability({
    document,
    proof
  }: {
    document?: object
    proof: IProofDescription
  }): { capability: IZcap } {
    // `proof` must be reattached to the capability because it contains
    // the `capabilityChain` that must be dereferenced and verified
    return { capability: { ...document, proof } as unknown as IZcap }
  }

  /**
   * Signals to `_verifyCapabilityChain` that the tail's delegation proof has
   * already been verified (its full `verifyResult` is computed later, in
   * `_runChecksAfterChainVerification`, once the parent is verified).
   *
   * @returns A `capabilityChainMeta` with a single placeholder result for the
   *   tail.
   */
  async _runChecksBeforeChainVerification(): Promise<{
    capabilityChainMeta: CapabilityMeta[]
  }> {
    /* Note: Here we create a signal to be sent to `_verifyCapabilityChain`
    that the capability delegation proof for the tail has already been
    verified (to avoid it being reverified). We will compute the full
    `verifyResult` in `_runChecksAfterChainVerification` once we have verified
    the parent capability. */
    return { capabilityChainMeta: [{ verifyResult: {} }] }
  }

  /**
   * Validates the tail delegation proof against its now-verified parent (the
   * second-to-last entry in the chain) and builds the tail's full
   * `verifyResult` in `capabilityChainMeta`.
   *
   * @param options - The options.
   * @param options.capabilityChainMeta - The chain meta array; its last entry's
   *   placeholder `verifyResult` is populated here.
   * @param options.dereferencedChain - The dereferenced chain (root to tail).
   * @param options.proof - The capability delegation proof.
   * @param options.validateOptions - The validation options passed through from
   *   `jsigs` (including `verificationMethod`).
   *
   * @returns Resolves to the proof purpose validation result.
   */
  async _runChecksAfterChainVerification({
    capabilityChainMeta,
    dereferencedChain,
    proof,
    validateOptions
  }: {
    capabilityChainMeta: CapabilityMeta[]
    dereferencedChain: IZcap[]
    proof: IProofDescription
    validateOptions: ValidateOptions
  }): Promise<CapabilityValidateResult> {
    // verified parent is second to last in the chain (i.e., it is the parent
    // of the last in the chain)
    const verifiedParentCapability =
      dereferencedChain[dereferencedChain.length - 2]!

    // get purpose result which needs to be used to build `verifyResult`
    const purposeResult = await this._validateAgainstParent({
      proof,
      verifiedParentCapability,
      validateOptions
    })

    // build verify result
    const { verificationMethod } = validateOptions
    const meta = capabilityChainMeta[capabilityChainMeta.length - 1]!
    const verifyResult = meta.verifyResult!
    verifyResult.verified = purposeResult.valid
    verifyResult.results = [
      {
        proof,
        verified: true,
        verificationMethod: verificationMethod as IVerificationMethod,
        purposeResult
      }
    ]

    return purposeResult
  }

  /**
   * Short-circuits proof validation when a verified parent capability is
   * already available (i.e., this purpose was created from within a chain
   * verification with `_verifiedParentCapability`): it validates the proof
   * directly against that parent. Otherwise returns nothing so full validation
   * from root to tail proceeds.
   *
   * @param options - The options.
   * @param options.proof - The capability delegation proof.
   * @param options.validateOptions - The validation options passed through from
   *   `jsigs`.
   *
   * @returns The validation result if short-circuited, otherwise nothing.
   */
  async _shortCircuitValidate({
    proof,
    validateOptions
  }: {
    proof: IProofDescription
    validateOptions: ValidateOptions
  }): Promise<CapabilityValidateResult | void> {
    // see if the parent capability has already been verified
    const { _verifiedParentCapability: verifiedParentCapability } = this
    if (verifiedParentCapability) {
      // simple case, just validate against parent and return, we have been
      // called from within a chain verification and can short circuit proof
      // validation
      return this._validateAgainstParent({
        proof,
        verifiedParentCapability,
        validateOptions
      })
    }

    // no short-circuit possible, we've just started validating the proof
    // from root => tail
  }

  /**
   * Validates a capability delegation proof against its verified parent: the
   * delegating verification method (or its controller) must be the parent's
   * controller. Sets `result.delegator` to the proof controller.
   *
   * @param options - The options.
   * @param options.proof - The capability delegation proof.
   * @param options.verifiedParentCapability - The already-verified parent
   *   capability.
   * @param options.validateOptions - The validation options passed through from
   *   `jsigs` (including `verificationMethod`).
   *
   * @returns Resolves to the validation result with an added `delegator`.
   */
  async _validateAgainstParent({
    proof,
    verifiedParentCapability,
    validateOptions
  }: {
    proof: IProofDescription
    verifiedParentCapability: IZcap
    validateOptions: ValidateOptions
  }): Promise<CapabilityValidateResult> {
    // ensure proof created by authorized delegator...
    // parent zcap controller must match the delegating verification method
    // (or its controller)
    const { verificationMethod } = validateOptions
    if (
      !utils.isController({
        capability: verifiedParentCapability,
        verificationMethod: verificationMethod as IVerificationMethod
      })
    ) {
      throw utils.createDetailedError(
        'The capability controller does not match the verification ' +
          'method (or its controller) used to delegate.',
        { capability: verifiedParentCapability, verificationMethod }
      )
    }

    // run base level validation checks
    const result = await this._runBaseProofValidation({
      proof,
      validateOptions
    })
    if (!result.valid) {
      throw result.error
    }

    // the controller of the proof is the delegator of the capability
    result.delegator = result.controller

    // `result` includes meta data about the proof controller
    return result
  }
}

/*!
 * Copyright (c) 2018-2024 Digital Bazaar, Inc. All rights reserved.
 */
import type {
  ICaveat,
  IDelegatedZcap,
  IRootZcap,
  IZcap
} from '@interop/data-integrity-core/zcap'
import type { IDocumentLoader } from '@interop/data-integrity-core/loader'
import type {
  IProofDescription,
  IVerificationMethod,
  LinkedDataProof
} from '@interop/jsonld-signatures'

/**
 * A verifier-supplied, trusted hook for dereferencing a root capability. The
 * root zcap has no delegation proof, so it must be resolved in a trusted way
 * (never from untrusted input); the hook throws if the ID is not authorized.
 */
export type GetRootCapability = (options: {
  id: string
}) => Promise<{ rootCapability: IRootZcap }>

/** An inspection function result. */
export interface InspectResult {
  /** `true` if the chain passed inspection. */
  valid?: boolean
  /** Set if inspection failed. */
  error?: Error
}

/**
 * The result of running jsonld-signature's verify method for a single
 * capability delegation proof; built up incrementally during chain
 * verification.
 */
export interface VerifyResult {
  /** `true` if all the checked proofs were successfully verified. */
  verified?: boolean
  /** The verify results for each delegation proof. */
  results?: VerifyProofResult[]
  error?: Error
}

/** The result of verifying a capability delegation proof. */
export interface VerifyProofResult {
  proof: IProofDescription
  verified: boolean
  verificationMethod?: IVerificationMethod
  /** The result from verifying the capability delegation proof purpose. */
  purposeResult?: VerifyProofPurposeResult
}

/** The result of verifying a capability delegation proof purpose. */
export interface VerifyProofPurposeResult {
  valid: boolean
  error?: Error
  /**
   * The party that created the capability delegation proof, i.e., the party
   * that delegated the capability (the controller document/description).
   */
  delegator?: object
  /** The controller of the proof's verification method. */
  controller?: object
}

/** A caveat found in a capability chain, with the capability carrying it. */
export interface CapabilityCaveat {
  caveat: ICaveat
  /** The capability (root or delegated) that carries the caveat. */
  capability: IZcap
}

/**
 * A caveat handler, registered by caveat type via `supportedCaveats`. Called
 * once for each caveat of its type in a verified capability chain. Answering
 * `valid: false` fails the chain. A handler may answer `valid: true` and leave
 * enforcement to the caller, which finds the caveat in the `caveats` result.
 *
 * A handler runs for every proof that verifies the chain, under both
 * `CapabilityInvocation` and `CapabilityDelegation`, after the chain is
 * verified and the `inspectCapabilityChain` hook has accepted it. Verification
 * can still fail after a handler has answered (a later handler may reject), so
 * a handler should have no side effects.
 */
export type CaveatHandler = (options: {
  caveat: ICaveat
  /** The capability (root or delegated) that carries the caveat. */
  capability: IZcap
  /** The full capability chain (root to tail). */
  capabilityChain: IZcap[]
  /**
   * The proof being verified. This is the invocation proof, or the delegation
   * proof of the tail capability.
   */
  proof: IProofDescription
  /** The purpose of `proof`. */
  proofPurpose: 'capabilityInvocation' | 'capabilityDelegation'
  /** The invoked action. Set only for a `capabilityInvocation` proof. */
  capabilityAction?: string
  /**
   * The invocation target named by the invocation proof. Set only for a
   * `capabilityInvocation` proof.
   */
  invocationTarget?: string
  /** See `CapabilityValidateResult.dereferencedTarget`. */
  dereferencedTarget?: string
  /** The date the chain is verified against (the `date` option, or now). */
  date: Date
}) => Promise<InspectResult>

/**
 * The metadata resulting from the verification of a delegated capability.
 */
export interface CapabilityMeta {
  /**
   * The capability verify result, which is `null` for the root capability.
   */
  verifyResult: VerifyResult | null
}

/** The details passed to an {@link InspectCapabilityChain} hook. */
export interface CapabilityChainDetails {
  /** The capabilities in the chain (root to tail). */
  capabilityChain: IZcap[]
  /**
   * The results returned from jsonld-signatures verify for each capability in
   * the chain. The root capability's entry has a `null` `verifyResult`.
   */
  capabilityChainMeta: CapabilityMeta[]
  /** The caveats found in the chain (root to tail), all with a handler. */
  caveats: CapabilityCaveat[]
  /** See `CapabilityValidateResult.dereferencedTarget`. */
  dereferencedTarget?: string
}

/**
 * A capability chain inspection function: the intended extension point for
 * revocation checks. Called with the full chain after verification succeeds.
 */
export type InspectCapabilityChain = (
  details: CapabilityChainDetails
) => Promise<InspectResult>

/**
 * Options common to both `CapabilityInvocation` and `CapabilityDelegation`
 * (proof-verification and shared params); does not include the internal `term`.
 */
export interface CommonProofPurposeOptions {
  /**
   * Allow the invocationTarget of a delegation chain to be increasingly
   * restrictive based on a hierarchical RESTful URL structure.
   */
  allowTargetAttenuation?: boolean
  /**
   * The description of the controller, if it is not to be dereferenced via a
   * `documentLoader`.
   */
  controller?: object
  /**
   * Used during proof verification as the expected date for the creation of the
   * proof (within a maximum timestamp delta) and for checking expiry; if not
   * passed the current date is used.
   */
  date?: string | Date | number
  /**
   * JSON-LD context URLs that a delegated zcap in the chain may list, in
   * addition to the zcap context and the context of each `suite`. A delegated
   * zcap listing any other context fails verification.
   */
  allowedContexts?: string[]
  /**
   * The expected root capability for the delegation chain (a single root
   * capability ID string, or an array of acceptable root capability ID
   * strings).
   */
  expectedRootCapability?: string | string[]
  /**
   * An async function that can be used to check for revocations related to any
   * of the verified capabilities.
   */
  inspectCapabilityChain?: InspectCapabilityChain
  /** The maximum length of the capability delegation chain. */
  maxChainLength?: number
  /**
   * The maximum number of caveats in the capability chain, counted across
   * every capability in the chain (the root included). Defaults to
   * `MAX_CAVEATS`.
   */
  maxCaveats?: number
  /**
   * A maximum number of seconds that clocks may be skewed when checking
   * capability expiration date-times against `date` and when comparing
   * invocation proof creation time against delegation proof creation time.
   */
  maxClockSkew?: number
  /**
   * The maximum milliseconds to live for a delegated zcap as measured by the
   * time difference between `expires` and `created` on the delegation proof.
   */
  maxDelegationTtl?: number
  /**
   * A maximum number of seconds that a capability invocation proof "created"
   * date can deviate from `date`.
   */
  maxTimestampDelta?: number
  /**
   * The jsonld-signature suite(s) to use to verify the capability chain.
   * Required only when verifying a proof; unused (and omitted) when creating a
   * proof.
   */
  suite?: LinkedDataProof | LinkedDataProof[]
  /**
   * The caveat handlers, keyed by caveat type. Registering a handler marks its
   * caveat type as supported. A chain in which any capability (the root
   * included) carries a caveat with no handler fails verification. If omitted, any
   * capability carrying a caveat is refused.
   */
  supportedCaveats?: Map<string, CaveatHandler>
}

/**
 * The (internal) options accepted by the abstract `CapabilityProofPurpose` base
 * class. The `term` is supplied by the derived class, never by public callers.
 */
export interface CapabilityProofPurposeOptions extends CommonProofPurposeOptions {
  /**
   * The term (`capabilityInvocation` or `capabilityDelegation`) to look for in
   * an LD proof.
   */
  term: string
  /**
   * Whether the derived class detected verify-proof mode from the params. When
   * set, the base class validates and keeps the common verify params.
   */
  verifyMode?: boolean
}

/**
 * Options for {@link CapabilityInvocation}, instantiated in one of two
 * mutually exclusive modes: create-proof (`capability`, `capabilityAction`,
 * `invocationTarget`) or verify-proof (`expectedAction`, `expectedTarget`,
 * `expectedRootCapability`, `suite`, ...).
 */
export interface CapabilityInvocationOptions extends CommonProofPurposeOptions {
  /**
   * The capability to add/reference in a created proof. A root zcap MUST be
   * passed as its ID string; a delegated zcap must be passed as the full
   * object.
   */
  capability?: string | IDelegatedZcap
  /** The capability action to add to a proof. */
  capabilityAction?: string
  /**
   * The invocation target to use; can attenuate the capability's invocation
   * target if the verifier supports target attenuation.
   */
  invocationTarget?: string
  /** The capability action expected when validating a proof. */
  expectedAction?: string
  /** The target(s) a capability is expected to apply to (absolute URI(s)). */
  expectedTarget?: string | string[]
  /**
   * Maps the invoked capability's `invocationTarget` to the absolute URI that
   * the proof's `invocationTarget` is compared against (for example, a DID URL
   * target to the https URL it is served at). Consulted only when checking an
   * invocation, not when verifying delegation links.
   *
   * Called for every invoked capability, after the chain and the invocation
   * are verified, so it must return a target it does not map unchanged. The
   * mapping must be deterministic and keep the path intact. For a `did:`
   * capability target the result must have no query or fragment, since
   * dereferencing consumes the DID URL's selectors. Any other target keeps
   * its query.
   */
  dereferenceTarget?: (options: { invocationTarget: string }) => Promise<string>
}

/**
 * Options for {@link CapabilityDelegation}, instantiated in one of two
 * mutually exclusive modes: create-proof (`parentCapability`) or verify-proof
 * (`expectedRootCapability`, `suite`, ...).
 */
export interface CapabilityDelegationOptions extends CommonProofPurposeOptions {
  /**
   * An alternative to passing `_capabilityChain` when creating a proof; passing
   * `parentCapability` enables the capability chain to be auto-computed. Pass a
   * root zcap ID string, or a full root or delegated zcap object.
   */
  parentCapability?: string | IZcap
  /** Private: a parent capability that has already been verified. */
  _verifiedParentCapability?: IZcap
  /** Private: an explicit capability chain override (testing only). */
  _capabilityChain?: Array<string | IDelegatedZcap>
  /** Private: skip local validation (testing only). */
  _skipLocalValidationForTesting?: boolean
}

/** An `Error` that may carry structured `details`. */
export interface ZcapError extends Error {
  details?: object
}

/**
 * The options passed through from `jsigs` to a proof purpose's `validate`,
 * `match`, and `update` methods.
 */
export interface ValidateOptions {
  document?: object
  documentLoader?: IDocumentLoader
  verificationMethod?: IVerificationMethod
  suite?: LinkedDataProof
  [key: string]: unknown
}

/**
 * The result of validating a capability proof purpose. Extends the base
 * `jsigs` proof validate result (`{valid, error?, controller?}`) with the
 * zcap-specific fields populated during chain verification.
 */
export interface CapabilityValidateResult {
  valid: boolean
  error?: Error
  /** The controller of the proof's verification method. */
  controller?: object
  /** The full dereferenced capability chain (root to tail). */
  dereferencedChain?: IZcap[]
  /**
   * The caveats found in the chain (root to tail), each with the capability
   * carrying it. Set once the chain is verified.
   */
  caveats?: CapabilityCaveat[]
  /**
   * The invoked capability's `invocationTarget` as mapped by the
   * `dereferenceTarget` hook. Set only for a `capabilityInvocation` proof
   * verified with that hook. It is in the same URI space as the proof's
   * `invocationTarget`, while the capabilities in the chain keep their
   * original targets.
   */
  dereferencedTarget?: string
  /** The invoker of the capability (for capability invocation proofs). */
  invoker?: object
  /** The delegator of the capability (for capability delegation proofs). */
  delegator?: object
}

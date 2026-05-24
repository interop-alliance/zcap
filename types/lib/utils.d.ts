/**
 * Creates a root capability from a root controller and a root invocation
 * target.
 *
 * @param {object} options - The options.
 * @param {string|string[]} options.controller - The root controller.
 * @param {string} options.invocationTarget - The root invocation target.
 *
 * @returns {RootZcap} The root capability.
 */
export function createRootCapability({ controller, invocationTarget }: {
    controller: string | string[];
    invocationTarget: string;
}): RootZcap;
/**
 * Retrieves the controller(s) from a capability.
 *
 * @param {object} options - The options.
 * @param {Zcap} options.capability - The authorization capability (zcap).
 *
 * @returns {string[]} The controller(s) for the capability.
 */
export function getControllers({ capability }: {
    capability: Zcap;
}): string[];
/**
 * Returns true if the given verification method is a controller (or is
 * controlled by a controller) of the given capability.
 *
 * @param {object} options - The options.
 * @param {Zcap} options.capability - The authorization capability (zcap).
 * @param {object} options.verificationMethod - The verification method to
 *   check.
 *
 * @returns {boolean} `true` if the controller matches, `false` if not.
 */
export function isController({ capability, verificationMethod }: {
    capability: Zcap;
    verificationMethod: object;
}): boolean;
/**
 * Retrieves the allowed actions from a capability.
 *
 * @param {object} options - The options.
 * @param {Zcap} options.capability - The authorization capability (zcap).
 *
 * @returns {string[]} Allowed actions.
 */
export function getAllowedActions({ capability }: {
    capability: Zcap;
}): string[];
/**
 * Retrieves the target from a capability.
 *
 * @param {object} options - The options.
 * @param {Zcap} options.capability - The authorization capability (zcap).
 *
 * @returns {string} - Capability target.
 */
export function getTarget({ capability }: {
    capability: Zcap;
}): string;
/**
 * Retrieves the delegation proof(s) for a capability that is associated with
 * its parent capability. A capability that has no parent or no associated
 * delegation proofs will cause this function to return an empty array.
 *
 * @param {object} options - The options.
 * @param {Zcap} options.capability - The authorization capability.
 *
 * @returns {CapabilityDelegationProof[]} Any `capabilityDelegation` proof
 *   objects attached to the given capability.
 */
export function getDelegationProofs({ capability }: {
    capability: Zcap;
}): CapabilityDelegationProof[];
/**
 * Gets the `capabilityChain` associated with the given capability.
 *
 * @param {object} options - The options.
 * @param {Zcap} options.capability - The authorization capability.
 *
 * @returns {Array<string|DelegatedZcap>} The capability chain entries
 *   (root to parent), as stored in the delegation proof.
 */
export function getCapabilityChain({ capability }: {
    capability: Zcap;
}): Array<string | DelegatedZcap>;
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
 * @param {object} options - The options.
 * @param {string} options.invocationTarget - The invocation target to check.
 * @param {string} options.baseInvocationTarget - The base invocation target.
 * @param {boolean} options.allowTargetAttenuation - `true` to allow target
 *   attenuation.
 *
 * @returns {boolean} `true` if the target is valid, `false` if not.
 */
export function isValidTarget({ invocationTarget, baseInvocationTarget, allowTargetAttenuation }: {
    invocationTarget: string;
    baseInvocationTarget: string;
    allowTargetAttenuation: boolean;
}): boolean;
/**
 * Creates a capability chain for delegating a capability from the
 * given `parentCapability`.
 *
 * @param {object} options - The options.
 * @param {string|Zcap} options.parentCapability - The parent capability from
 *   which to compute the capability chain (a root zcap ID string, or a full
 *   root or delegated zcap object).
 * @param {boolean} options._skipLocalValidationForTesting - Private.
 *
 * @returns {Array<string|DelegatedZcap>} The computed capability chain to be
 *   included in a capability delegation proof.
 */
export function computeCapabilityChain({ parentCapability, _skipLocalValidationForTesting }: {
    parentCapability: string | Zcap;
    _skipLocalValidationForTesting: boolean;
}): Array<string | DelegatedZcap>;
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
 * @param {object} options - The options.
 * @param {string|DelegatedZcap} options.capability - The authorization
 *   capability to dereference the chain for. Pass a string (the root zcap ID)
 *   to dereference a root zcap directly, or a delegated zcap object.
 * @param {Function} options.getRootCapability - A function for dereferencing
 *   the root capability (the root zcap must be deref'd in a trusted way by the
 *   verifier, it must not be untrusted input).
 * @param {number} [options.maxChainLength=10] - The maximum length of the
 *   capability delegation chain (this is inclusive of `capability` itself).
 *
 * @returns {Promise<{dereferencedChain: Zcap[]}>} Resolves to an object
 *   containing the full dereferenced chain ordered root to tail.
 */
export function dereferenceCapabilityChain({ capability, getRootCapability, maxChainLength }: {
    capability: string | DelegatedZcap;
    getRootCapability: Function;
    maxChainLength?: number;
}): Promise<{
    dereferencedChain: Zcap[];
}>;
export function checkProofContext({ proof }: {
    proof: any;
}): void;
export function hasValidAllowedAction({ allowedAction, parentAllowedAction }: {
    allowedAction: any;
    parentAllowedAction: any;
}): boolean;
export function checkCapability({ capability, expectRoot }: {
    capability: any;
    expectRoot: any;
}): void;
export function compareTime({ t1, t2, maxClockSkew }: {
    t1: any;
    t2: any;
    maxClockSkew: any;
}): 0 | 1 | -1;
/**
 * A root authorization capability (zcap). Root capabilities have no parent
 * and are identified by a `urn:zcap:root:<encodedTarget>` URI. They carry no
 * `expires` field and no delegation proof.
 */
export type RootZcap = {
    /**
     * '@context' - The zcap JSON-LD context URL.
     */
    "": string;
    /**
     * - Capability ID (`urn:zcap:root:<encodedTarget>`).
     */
    id: string;
    /**
     * - The DID(s) authorized to invoke.
     */
    controller: string | string[];
    /**
     * - Resource URI this capability grants
     * access to (absolute URI).
     */
    invocationTarget: string;
};
/**
 * A proof attached to a delegated capability.
 */
export type CapabilityDelegationProof = {
    /**
     * - The cryptographic suite type (e.g.
     * `'Ed25519Signature2020'`).
     */
    type: string;
    /**
     * - ISO 8601 date-time the proof was created.
     */
    created: string;
    /**
     * - Verification method URI used to sign.
     */
    verificationMethod: string;
    /**
     * - Always
     * `'capabilityDelegation'`.
     */
    proofPurpose: "capabilityDelegation";
    /**
     * - Ordered capability
     * chain (root > parent). All entries are string IDs except the last
     * delegated zcap, which is embedded as an object.
     */
    capabilityChain: Array<string | DelegatedZcap>;
    /**
     * - The encoded proof value.
     */
    proofValue: string;
};
/**
 * A delegated authorization capability (zcap). Delegated capabilities narrow
 * a parent capability and must carry exactly one `capabilityDelegation` proof.
 */
export type DelegatedZcap = {
    /**
     * '@context' - JSON-LD context array; first entry MUST be
     * the zcap context URL.
     */
    "": string[];
    /**
     * - Capability ID (absolute URI).
     */
    id: string;
    /**
     * - Parent capability ID (absolute URI).
     */
    parentCapability: string;
    /**
     * - The DID(s) authorized to invoke.
     */
    controller: string | string[];
    /**
     * - Resource URI this capability grants
     * access to (absolute URI).
     */
    invocationTarget: string;
    /**
     * - The action(s) the controller
     * may perform; if absent, no actions are allowed (except for the root zcap).
     */
    allowedAction?: string | string[];
    /**
     * - ISO 8601 date-time when this capability expires.
     */
    expires: string;
    /**
     * -
     * The capability delegation proof(s).
     */
    proof: CapabilityDelegationProof | CapabilityDelegationProof[];
};
/**
 * An authorization capability; either a root or a delegated zcap.
 */
export type Zcap = RootZcap | DelegatedZcap;
/**
 * An inspection function result.
 */
export type InspectResult = {
    /**
     * - `true` if the chain passed inspection.
     */
    valid?: boolean;
    /**
     * - Set if inspection failed.
     */
    error?: Error;
};
/**
 * A capability chain inspection function.
 */
export type InspectCapabilityChain = Function;
/**
 * A capability. The capability is compacted into the security
 * context. Only the required fields are shown here, a capability will contain
 * additional properties.
 */
export type Capability = {
    /**
     * - The ID of the capability.
     */
    id: string;
    /**
     * - The controller of the capability.
     */
    controller: string;
};
export type CapabilityChainDetails = {
    /**
     * - The capabilities in the chain.
     */
    capabilityChain: Capability[];
    /**
     * - The results returned
     * from jsonld-signatures verify for each capability in the chain. Each
     * object contains `{verifyResult}` where each `verifyResult` is an
     * `InspectChainResult`.
     */
    capabilityChainMeta: CapabilityMeta[];
};
/**
 * The metadata resulting from the verification of a delegated capability.
 */
export type CapabilityMeta = {
    /**
     * - The capability verify result, which
     * is `null` for the root capability.
     */
    verifyResult: VerifyResult;
};
/**
 * The result of running jsonld-signature's verify method.
 */
export type VerifyResult = {
    /**
     * - `true` if all the checked proofs were
     * successfully verified.
     */
    verified: boolean;
    /**
     * - The verify results for each
     * delegation proof.
     */
    results: VerifyProofResult[];
};
/**
 * The result of verifying a capability delegation proof.
 */
export type VerifyProofResult = {
    /**
     * - The result from
     * verifying the capability delegation proof purpose.
     */
    proofPurposeResult: VerifyProofPurposeResult;
};
/**
 * The result of verifying a capability delegation proof purpose.
 */
export type VerifyProofPurposeResult = {
    /**
     * - The party that created the capability
     * delegation proof, i.e., the party that delegated the capability.
     */
    delegator: string;
};
//# sourceMappingURL=utils.d.ts.map
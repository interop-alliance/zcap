/**
 * @typedef {import('./utils.js').InspectCapabilityChain} InspectCapabilityChain
 * @typedef {import('./utils.js').CapabilityMeta} CapabilityMeta
 */
export class CapabilityProofPurpose extends jsigs.ControllerProofPurpose {
    /**
     * @param {object} options - The options.
     * @param {boolean} [options.allowTargetAttenuation=false] - Allow the
     *   invocationTarget of a delegation chain to be increasingly restrictive
     *   based on a hierarchical RESTful URL structure.
     * @param {object} [options.controller] - The description of the controller,
     *   if it is not to be dereferenced via a `documentLoader`.
     * @param {string|Date|number} [options.date] - Used during proof
     *   verification as the expected date for the creation of the proof
     *   (within a maximum timestamp delta) and for checking to see if a
     *   capability has expired; if not passed the current date will be used.
     * @param {string|string[]} [options.expectedRootCapability] - The expected
     *   root capability for the delegation chain (a single root capability ID
     *   string, or an array of acceptable root capability ID strings).
     * @param {InspectCapabilityChain} [options.inspectCapabilityChain] - An
     *   async function that can be used to check for revocations related to any
     *   of verified capabilities.
     * @param {number} [options.maxChainLength=10] - The maximum length of the
     *   capability delegation chain.
     * @param {number} [options.maxClockSkew=300] - A maximum number of seconds
     *   that clocks may be skewed checking capability expiration date-times
     *   against `date` and when comparing invocation proof creation time against
     *   delegation proof creation time.
     * @param {number} [options.maxDelegationTtl=Infinity] - The maximum
     *   milliseconds to live for a delegated zcap as measured by the time
     *   difference between `expires` and `created` on the delegation proof.
     * @param {number} [options.maxTimestampDelta=Infinity] - A maximum number
     *   of seconds that a capability invocation proof (only used by this proof
     *   type) "created" date can deviate from `date`, defaults to `Infinity`.
     * @param {object|object[]} [options.suite] - The jsonld-signature suite(s) to
     *   use to verify the capability chain. Required only when verifying a proof;
     *   unused (and omitted) when creating a delegation proof.
     * @param {string} options.term - The term `capabilityInvocation` or
     *   `capabilityDelegation` to look for in an LD proof.
     */
    constructor({ allowTargetAttenuation, controller, date, expectedRootCapability, inspectCapabilityChain, maxChainLength, maxDelegationTtl, maxTimestampDelta, maxClockSkew, suite, term }?: {
        allowTargetAttenuation?: boolean;
        controller?: object;
        date?: string | Date | number;
        expectedRootCapability?: string | string[];
        inspectCapabilityChain?: InspectCapabilityChain;
        maxChainLength?: number;
        maxClockSkew?: number;
        maxDelegationTtl?: number;
        maxTimestampDelta?: number;
        suite?: object | object[];
        term: string;
    });
    allowTargetAttenuation: boolean;
    expectedRootCapability: string | string[];
    inspectCapabilityChain: Function;
    maxChainLength: number;
    maxClockSkew: number;
    maxDelegationTtl: number;
    suite: any;
    /**
     * Validates a capability proof by verifying its capability delegation chain
     * from the root outward. Overrides
     * {@link jsigs.ControllerProofPurpose#validate} and is structurally
     * compatible with it.
     *
     * @param {object} proof - The proof to validate.
     * @param {object} validateOptions - The validation options (passed through
     *   from `jsigs`), including `document` and `documentLoader`.
     *
     * @returns {Promise<import('@interop/jsonld-signatures').
     *   ProofValidateResult>} Resolves to `{valid, error?}` (plus an internal
     *   `dereferencedChain` on success).
     */
    validate(proof: object, validateOptions: object): Promise<import("@interop/jsonld-signatures").ProofValidateResult>;
    _dereferenceChain({ document, documentLoader, proof }: {
        document: any;
        documentLoader: any;
        proof: any;
    }): Promise<{
        dereferencedChain: import("@interop/data-integrity-core/zcap").IZcap[];
    }>;
    _getCapabilityDelegationClass(): void;
    _getTailCapability(): Promise<void>;
    _runChecksBeforeChainVerification(): Promise<void>;
    _runChecksAfterChainVerification(): Promise<void>;
    _runBaseProofValidation({ proof, validateOptions }: {
        proof: any;
        validateOptions: any;
    }): Promise<jsigs.ProofValidateResult>;
    _shortCircuitValidate(): Promise<void>;
    /**
     * Verifies the given dereferenced capability chain. This involves ensuring
     * that the root zcap in the chain is as expected (for the endpoint where an
     * invocation or a simple chain chain is occurring) and that every other zcap
     * in the chain (including any invoked one), has been properly delegated.
     *
     * @param {object} options - The options.
     * @param {Function} options.CapabilityDelegation - The CapabilityDelegation
     *   class; this must be passed to avoid circular references in this module.
     * @param {CapabilityMeta[]} options.capabilityChainMeta - The array of
     *   results for inspecting the capability chain; if this has a value when
     *   passed, then it is presumed to be the verify result for the tail
     *   capability and that tail capability will not be verified internally by
     *   this function to avoid duplicating work; all verification results
     *   (including the tail's -- either computed locally or reused from what
     *   was passed) will be added to this array in order from root => tail.
     * @param {Array} options.dereferencedChain - The dereferenced capability
     *   chain for `capability`, starting at the root capability and ending at
     *   `capability`.
     * @param {Function} options.documentLoader - A configured jsonld
     *   documentLoader.
     *
     * @returns {object} An object with `{verified, error}`.
     */
    _verifyCapabilityChain({ CapabilityDelegation, capabilityChainMeta, dereferencedChain, documentLoader }: {
        CapabilityDelegation: Function;
        capabilityChainMeta: CapabilityMeta[];
        dereferencedChain: any[];
        documentLoader: Function;
    }): object;
}
export type InspectCapabilityChain = import("./utils.js").InspectCapabilityChain;
export type CapabilityMeta = import("./utils.js").CapabilityMeta;
import jsigs from '@interop/jsonld-signatures';
//# sourceMappingURL=CapabilityProofPurpose.d.ts.map
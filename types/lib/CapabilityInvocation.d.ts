/**
 * @typedef {import('./utils.js').InspectCapabilityChain} InspectCapabilityChain
 * @typedef {import('./utils.js').DelegatedZcap} DelegatedZcap
 */
export class CapabilityInvocation extends CapabilityProofPurpose {
    /**
     * @param {object} options - The options.
     * @param {string|DelegatedZcap} [options.capability] - The capability to
     *   add/reference in a created proof. A root zcap MUST be passed as its ID
     *   string; a delegated zcap must be passed as the full object.
     * @param {string} [options.capabilityAction] - The capability action that is
     *   to be added to a proof.
     * @param {string} [options.invocationTarget] - The invocation target to
     *   use; this is required and can be used to attenuate the capability's
     *   invocation target if the verifier supports target attenuation.
     * @param {boolean} [options.allowTargetAttenuation=false] - Allow the
     *   invocationTarget of a delegation chain to be increasingly restrictive
     *   based on a hierarchical RESTful URL structure.
     * @param {object} [options.controller] - The description of the controller,
     *   if it is not to be dereferenced via a `documentLoader`.
     * @param {string|Date|number} [options.date] - Used during proof
     *   verification as the expected date for the creation of the proof
     *   (within a maximum timestamp delta) and for checking to see if a
     *   capability has expired; if not passed the current date will be used.
     * @param {string} [options.expectedAction] - The capability action that is
     *   expected when validating a proof.
     * @param {string|string[]} [options.expectedRootCapability] - The expected
     *   root capability for the delegation chain (a single root capability ID
     *   string, or an array of acceptable root capability ID strings).
     * @param {string|string[]} [options.expectedTarget] - The target(s) we
     *   expect a capability to apply to (absolute URI, or array of URIs).
     * @param {InspectCapabilityChain} [options.inspectCapabilityChain] - An
     *   async function that can be used to check for revocations related to any
     *   of verified capabilities.
     * @param {number} [options.maxChainLength=10] - The maximum length of the
     *   capability delegation chain.
     * @param {number} [options.maxClockSkew=300] - A maximum number of seconds
     *   that clocks may be skewed when checking capability expiration date-times
     *   against `date` and when comparing invocation proof creation time against
     *   delegation proof creation time.
     * @param {number} [options.maxDelegationTtl=Infinity] - The maximum
     *   milliseconds to live for a delegated zcap as measured by the time
     *   difference between `expires` and `created` on the delegation proof.
     * @param {number} [options.maxTimestampDelta=Infinity] - A maximum number
     *   of seconds that "created" date on the capability invocation proof can
     *   deviate from `date`, defaults to `Infinity`.
     * @param {object|object[]} [options.suite] - The jsonld-signature suite(s) to
     *   use to verify the capability chain. Required only in verify-proof mode;
     *   unused (and omitted) when creating an invocation proof.
     */
    constructor({ capability, capabilityAction, invocationTarget, allowTargetAttenuation, controller, date, expectedAction, expectedRootCapability, expectedTarget, inspectCapabilityChain, maxChainLength, maxClockSkew, maxDelegationTtl, maxTimestampDelta, suite }?: {
        capability?: string | DelegatedZcap;
        capabilityAction?: string;
        invocationTarget?: string;
        allowTargetAttenuation?: boolean;
        controller?: object;
        date?: string | Date | number;
        expectedAction?: string;
        expectedRootCapability?: string | string[];
        expectedTarget?: string | string[];
        inspectCapabilityChain?: InspectCapabilityChain;
        maxChainLength?: number;
        maxClockSkew?: number;
        maxDelegationTtl?: number;
        maxTimestampDelta?: number;
        suite?: object | object[];
    });
    capability: string | import("./zcap-types.js").DelegatedZcap;
    capabilityAction: string;
    invocationTarget: string;
    expectedTarget: string | string[];
    expectedAction: string;
    update(proof: any): Promise<any>;
    match(proof: any, { document, documentLoader }: {
        document: any;
        documentLoader: any;
    }): Promise<boolean>;
    _getCapabilityDelegationClass(): typeof CapabilityDelegation;
    _getTailCapability({ proof }: {
        proof: any;
    }): {
        capability: any;
    };
    _runChecksBeforeChainVerification({ dereferencedChain, proof }: {
        dereferencedChain: any;
        proof: any;
    }): Promise<{
        capabilityChainMeta: any[];
    }>;
    _runChecksAfterChainVerification({ dereferencedChain, proof, validateOptions }: {
        dereferencedChain: any;
        proof: any;
        validateOptions: any;
    }): Promise<import("@interop/jsonld-signatures").ProofValidateResult>;
}
export type InspectCapabilityChain = import("./utils.js").InspectCapabilityChain;
export type DelegatedZcap = import("./utils.js").DelegatedZcap;
import { CapabilityProofPurpose } from './CapabilityProofPurpose.js';
import { CapabilityDelegation } from './CapabilityDelegation.js';
//# sourceMappingURL=CapabilityInvocation.d.ts.map
/**
 * @typedef {import('./utils.js').InspectCapabilityChain} InspectCapabilityChain
 * @typedef {import('./utils.js').Zcap} Zcap
 * @typedef {import('./utils.js').DelegatedZcap} DelegatedZcap
 */
export class CapabilityDelegation extends CapabilityProofPurpose {
    /**
     * @param {object} options - The options.
     * @param {string|Zcap} [options.parentCapability] - An alternative to
     *   passing `capabilityChain` when creating a proof; passing
     *   `parentCapability` will enable the capability chain to be auto-computed.
     *   Pass a root zcap ID string, or a full root or delegated zcap object.
     * @param {boolean} [options.allowTargetAttenuation=false] - Allow the
     *   invocationTarget of a delegation chain to be increasingly restrictive
     *   based on a hierarchical RESTful URL structure.
     * @param {string|Date|number} [options.date] - Used during proof
     *   verification as the expected date for the creation of the proof
     *   (within a maximum timestamp delta) and for checking to see if a
     *   capability has expired; if not passed the current date will be used.
     * @param {string|string[]} [options.expectedRootCapability] - The expected
     *   root capability for the delegation chain (a single root capability ID
     *   string, or an array of acceptable root capability ID strings).
     * @param {object} [options.controller] - The description of the controller,
     *   if it is not to be dereferenced via a `documentLoader`.
     * @param {InspectCapabilityChain} [options.inspectCapabilityChain] - An
     *   async function that can be used to check for revocations related to any
     *   of verified capabilities.
     * @param {number} [options.maxChainLength=10] - The maximum length of the
     *   capability delegation chain.
     * @param {number} [options.maxClockSkew=300] - A maximum number of seconds
     *   that clocks may be skewed when checking capability expiration date-times
     *   against `date`.
     * @param {number} [options.maxDelegationTtl=Infinity] - The maximum
     *   milliseconds to live for a delegated zcap as measured by the time
     *   difference between `expires` and `created` on the delegation proof.
     * @param {object|object[]} options.suite - The jsonld-signature suite(s) to
     *   use to verify the capability chain.
     * @param {Zcap} [options._verifiedParentCapability] - Private.
     * @param {Array<string|DelegatedZcap>} [options._capabilityChain] - Private.
     * @param {boolean} [options._skipLocalValidationForTesting] - Private.
     */
    constructor({ parentCapability, allowTargetAttenuation, controller, date, expectedRootCapability, inspectCapabilityChain, maxChainLength, maxClockSkew, maxDelegationTtl, suite, _verifiedParentCapability, _capabilityChain, _skipLocalValidationForTesting }?: {
        parentCapability?: string | Zcap;
        allowTargetAttenuation?: boolean;
        date?: string | Date | number;
        expectedRootCapability?: string | string[];
        controller?: object;
        inspectCapabilityChain?: InspectCapabilityChain;
        maxChainLength?: number;
        maxClockSkew?: number;
        maxDelegationTtl?: number;
        suite: object | object[];
        _verifiedParentCapability?: Zcap;
        _capabilityChain?: Array<string | DelegatedZcap>;
        _skipLocalValidationForTesting?: boolean;
    });
    parentCapability: string | utils.Zcap;
    _capabilityChain: (string | utils.DelegatedZcap)[];
    _skipLocalValidationForTesting: boolean;
    _verifiedParentCapability: utils.Zcap;
    update(proof: any, { document }: {
        document: any;
    }): Promise<any>;
    match(proof: any, { document, documentLoader }: {
        document: any;
        documentLoader: any;
    }): Promise<boolean>;
    _getCapabilityDelegationClass(): typeof CapabilityDelegation;
    _getTailCapability({ document, proof }: {
        document: any;
        proof: any;
    }): {
        capability: any;
    };
    _runChecksBeforeChainVerification(): Promise<{
        capabilityChainMeta: {
            verifyResult: {};
        }[];
    }>;
    _runChecksAfterChainVerification({ capabilityChainMeta, dereferencedChain, proof, validateOptions }: {
        capabilityChainMeta: any;
        dereferencedChain: any;
        proof: any;
        validateOptions: any;
    }): Promise<import("@interop/jsonld-signatures").ProofValidateResult>;
    _shortCircuitValidate({ proof, validateOptions }: {
        proof: any;
        validateOptions: any;
    }): Promise<import("@interop/jsonld-signatures").ProofValidateResult>;
    _validateAgainstParent({ proof, verifiedParentCapability, validateOptions }: {
        proof: any;
        verifiedParentCapability: any;
        validateOptions: any;
    }): Promise<import("@interop/jsonld-signatures").ProofValidateResult>;
}
export type InspectCapabilityChain = import("./utils.js").InspectCapabilityChain;
export type Zcap = import("./utils.js").Zcap;
export type DelegatedZcap = import("./utils.js").DelegatedZcap;
import { CapabilityProofPurpose } from './CapabilityProofPurpose.js';
import * as utils from './utils.js';
//# sourceMappingURL=CapabilityDelegation.d.ts.map
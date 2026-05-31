/*!
 * Copyright (c) 2018-2026 Digital Bazaar, Inc. All rights reserved.
 */

// Hand-authored object shapes for zcaps. These live in a `.d.ts` (rather than
// as JSDoc `@typedef`s in `utils.js`) because TypeScript's JSDoc parser cannot
// express a property named `@context` -- the leading `@` is mangled to an
// empty-string key (`""`). `utils.js` re-exports these via `@typedef
// {import('./zcap-types.js').X} X` so the public type names are unchanged.

/**
 * A root authorization capability (zcap). Root zcaps are unsigned, have no
 * `expires` field and no delegation proof.
 */
export interface RootZcap {
  /** The zcap JSON-LD context URL. */
  '@context': string;
  /** Capability ID (`urn:zcap:root:<encodedTarget>`). */
  id: string;
  /** The DID(s) authorized to invoke. */
  controller: string | string[];
  /** Resource URI this capability grants access to (absolute URI). */
  invocationTarget: string;
}

/** A proof attached to a delegated capability. */
export interface CapabilityDelegationProof {
  /** The cryptographic suite type (e.g. `'Ed25519Signature2020'`). */
  type: string;
  /** ISO 8601 date-time the proof was created. */
  created: string;
  /** Verification method URI used to sign. */
  verificationMethod: string;
  /** Always `'capabilityDelegation'`. */
  proofPurpose: 'capabilityDelegation';
  /**
   * Ordered capability chain (root > parent). All entries are string IDs
   * except the last delegated zcap, which is embedded as an object.
   */
  capabilityChain: (string | DelegatedZcap)[];
  /** The encoded proof value. */
  proofValue: string;
}

/**
 * A delegated authorization capability (zcap). Delegated capabilities narrow
 * a parent capability and must carry exactly one `capabilityDelegation` proof.
 */
export interface DelegatedZcap {
  /** JSON-LD context array; first entry MUST be the zcap context URL. */
  '@context': string[];
  /** Capability ID (absolute URI). */
  id: string;
  /** Parent capability ID (absolute URI). */
  parentCapability: string;
  /** The DID(s) authorized to invoke. */
  controller: string | string[];
  /** Resource URI this capability grants access to (absolute URI). */
  invocationTarget: string;
  /**
   * The action(s) the controller may perform; if absent, no actions are
   * allowed (except for the root zcap).
   */
  allowedAction?: string | string[];
  /** ISO 8601 date-time when this capability expires. */
  expires: string;
  /** The capability delegation proof(s). */
  proof: CapabilityDelegationProof | CapabilityDelegationProof[];
}

/** A zcap is either a root or a delegated capability. */
export type Zcap = RootZcap | DelegatedZcap;

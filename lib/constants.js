/*!
 * Copyright (c) 2018-2022 Digital Bazaar, Inc. All rights reserved.
 */
import {CONTEXT, CONTEXT_URL} from '@digitalbazaar/zcap-context';

// Re-exported through local typed bindings (rather than a direct
// `export ... from`) so the generated `.d.ts` carries explicit types instead of
// a re-export that points at `@digitalbazaar/zcap-context`, which ships no
// types. This lets downstream consumers resolve `ZCAP_CONTEXT`/
// `ZCAP_CONTEXT_URL` without needing types for that package. The values are
// `const` in zcap-context, so the snapshot binding is equivalent to a live one.

/** @type {object} The zcap JSON-LD context document. */
export const ZCAP_CONTEXT = CONTEXT;

/** @type {string} The zcap JSON-LD context URL (`https://w3id.org/zcap/v1`). */
export const ZCAP_CONTEXT_URL = CONTEXT_URL;

/** @type {string} The base URL for the zcap security vocabulary. */
export const CAPABILITY_VOCAB_URL = 'https://w3id.org/security#';

/** @type {string} URI prefix for root capability IDs (`urn:zcap:root:`). */
export const ZCAP_ROOT_PREFIX = 'urn:zcap:root:';

/**
 * Default maximum capability delegation chain length (inclusive of the tail).
 *
 * @type {number}
 */
// 6 is probably more reasonable for Kevin Bacon reasons? but picking a
// power of 10
export const MAX_CHAIN_LENGTH = 10;

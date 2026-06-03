/*!
 * Copyright (c) 2018-2022 Digital Bazaar, Inc. All rights reserved.
 */
import jsigs from '@interop/jsonld-signatures'
import * as constants from './constants.js'
import type { IDocumentLoader } from '@interop/data-integrity-core/loader'

/* Core API */
export { CapabilityInvocation } from './CapabilityInvocation.js'
export { CapabilityDelegation } from './CapabilityDelegation.js'
export { createRootCapability } from './utils.js'
export { constants }

/* Type exports */
export type {
  CapabilityChainDetails,
  CapabilityMeta,
  InspectCapabilityChain,
  InspectResult,
  VerifyResult,
  VerifyProofResult,
  VerifyProofPurposeResult,
  CapabilityInvocationOptions,
  CapabilityDelegationOptions,
  CapabilityValidateResult,
  GetRootCapability
} from './types.js'

/**
 * Wraps an existing document loader so that it also serves the zcap JSON-LD
 * context. The wrapped loader is called for all other URLs.
 *
 * @param documentLoader - An existing JSON-LD document loader to extend.
 *
 * @returns A new document loader that handles the zcap context URL and
 *   delegates all other URLs to the wrapped loader.
 */
export function extendDocumentLoader(
  documentLoader: IDocumentLoader
): IDocumentLoader {
  return async function loadZcapContexts(url: string) {
    if (url === constants.ZCAP_CONTEXT_URL) {
      return {
        contextUrl: null,
        documentUrl: url,
        document: constants.ZCAP_CONTEXT,
        tag: 'static'
      }
    }
    return documentLoader(url)
  }
}

/**
 * A default JSON-LD document loader that serves only the zcap and
 * jsonld-signatures contexts. Suitable for use when no other contexts are
 * needed. Extend it with {@link extendDocumentLoader} if additional contexts
 * are required.
 */
export const documentLoader: IDocumentLoader = extendDocumentLoader(
  jsigs.strictDocumentLoader
)

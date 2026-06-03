/*!
 * Copyright (c) 2018-2024 Digital Bazaar, Inc. All rights reserved.
 */

/**
 * Test document loader for the zcap suite.
 *
 * Built on `@interop/security-document-loader`'s `securityLoader()`, which
 * bundles the zcap, Ed25519 2020, DID, and Multikey contexts and resolves
 * `did:key` DIDs automatically. A mutable `remoteDocuments` registry is checked
 * first so the mock-data module (and individual tests) can register the
 * named-actor controller/key documents and root capabilities on the fly.
 *
 * Notes on contexts:
 * - The `https://w3id.org/security/v2` context referenced in the actor
 *   documents' `@context` is never dereferenced by this stack, so it does not
 *   need to be registered.
 * - The old `did:v1` actors (which required the `veres-one/v1` context) have
 *   been replaced with `did:key` identities resolved directly by the loader.
 * - A final fallback to `jsigs.strictDocumentLoader` serves the security v1/v2
 *   contexts should anything ever request them.
 */
import { securityLoader } from '@interop/security-document-loader'
import jsigs from '@interop/jsonld-signatures'

const built = securityLoader().build()

export interface LoadedDocument {
  contextUrl: string | null
  document: unknown
  documentUrl: string
}

// Documents registered here take precedence over the static/DID loader.
export const remoteDocuments = new Map<string, { id: string }>()

/**
 * Registers a document so the loader resolves it by its `id`.
 *
 * @param options - Options to use.
 * @param options.doc - The document to register (must have an `id`).
 */
export function addToLoader({ doc }: { doc: { id: string } }): void {
  if (remoteDocuments.has(doc.id)) {
    throw new Error(
      `ID of document has already been registered in the loader: ${doc.id}`
    )
  }
  remoteDocuments.set(doc.id, doc)
}

/**
 * Resolves a URL to a JSON-LD document for tests.
 *
 * @param url - The URL to resolve.
 *
 * @returns The loaded document result.
 */
export async function documentLoader(url: string): Promise<LoadedDocument> {
  const doc = remoteDocuments.get(url)
  if (doc !== undefined) {
    return {
      contextUrl: null,
      document: structuredClone(doc),
      documentUrl: url
    }
  }
  try {
    return (await built(url)) as LoadedDocument
  } catch {
    // fall back to the jsonld-signatures strict loader (serves the security
    // v1/v2 contexts not bundled by securityLoader); if it also misses, this
    // throws a "not found" the same way the original test loader did.
    return (await jsigs.strictDocumentLoader(url)) as LoadedDocument
  }
}

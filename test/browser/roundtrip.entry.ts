/**
 * Browser entry module for the zcap delegate -> invoke -> verify roundtrip
 * Playwright smoke test.
 *
 * The bare-specifier imports (`@interop/...`) are rewritten by the Vite dev
 * server when it serves and transforms this module, which is why the Playwright
 * test imports this single served URL rather than importing the packages
 * directly inside `page.evaluate` (where no Vite transform runs).
 *
 * Exercises a representative capability flow: create a root zcap controlled by
 * a `did:key`, delegate it to a second `did:key`, verify the delegation chain,
 * then invoke the delegated capability and verify the invocation -- confirming
 * the library and its dependency chain work in a real browser bundle.
 */
import { Ed25519Signature2020 } from '@interop/ed25519-signature'
import { Ed25519VerificationKey } from '@interop/ed25519-verification-key'
import { driver as didKeyDriver } from '@interop/did-method-key'
import jsigs from '@interop/jsonld-signatures'
import * as zcap from '../../src/index.js'
import { addToLoader, documentLoader } from '../node/documentLoader.js'

const ED25519_2020_CONTEXT = 'https://w3id.org/security/suites/ed25519-2020/v1'

export async function runRoundtrip(): Promise<{
  delegationVerified: boolean
  invocationVerified: boolean
}> {
  const { CapabilityDelegation, CapabilityInvocation, createRootCapability } =
    zcap
  const { ZCAP_CONTEXT_URL } = zcap.constants

  const didKey = didKeyDriver()
  didKey.use({ keyPairClass: Ed25519VerificationKey })

  // alice controls the root capability
  const alice = await didKey.generate()
  const aliceDelegationKey = alice.methodFor({
    purpose: 'capabilityDelegation'
  })

  // bob is the delegate
  const bob = await didKey.generate()
  const bobInvocationKey = bob.methodFor({ purpose: 'capabilityInvocation' })

  const invocationTarget = 'https://zcap.example/browser-resource'
  const root = createRootCapability({
    controller: alice.didDocument.id,
    invocationTarget
  })
  addToLoader({ doc: root })

  // alice delegates the root capability to bob
  const delegated = {
    '@context': [ZCAP_CONTEXT_URL, ED25519_2020_CONTEXT],
    id: `urn:uuid:${crypto.randomUUID()}`,
    controller: bob.didDocument.id,
    parentCapability: root.id,
    invocationTarget,
    expires: '3000-01-01T00:01Z'
  }
  const signedDelegation = await jsigs.sign(delegated, {
    documentLoader,
    suite: new Ed25519Signature2020({
      signer: (aliceDelegationKey as any).signer()
    }),
    purpose: new CapabilityDelegation({ parentCapability: root })
  })
  const delegationResult = await jsigs.verify(signedDelegation, {
    documentLoader,
    suite: new Ed25519Signature2020(),
    purpose: new CapabilityDelegation({
      expectedRootCapability: root.id,
      suite: new Ed25519Signature2020()
    })
  })

  // bob invokes the delegated capability (the document carries a `nonce` so it
  // is not an empty "object with only @id", which JSON-LD safe mode rejects)
  const doc = {
    '@context': ['https://w3id.org/security/v2', ZCAP_CONTEXT_URL],
    id: `urn:uuid:${crypto.randomUUID()}`,
    nonce: '123'
  }
  const signedInvocation = await jsigs.sign(doc, {
    documentLoader,
    suite: new Ed25519Signature2020({
      signer: (bobInvocationKey as any).signer()
    }),
    purpose: new CapabilityInvocation({
      capability: signedDelegation,
      capabilityAction: 'read',
      invocationTarget
    })
  })
  const invocationResult = await jsigs.verify(signedInvocation, {
    documentLoader,
    suite: new Ed25519Signature2020(),
    purpose: new CapabilityInvocation({
      expectedTarget: invocationTarget,
      expectedAction: 'read',
      expectedRootCapability: root.id,
      suite: new Ed25519Signature2020()
    })
  })

  if (delegationResult.error) {
    throw delegationResult.error
  }
  if (invocationResult.error) {
    throw invocationResult.error
  }
  return {
    delegationVerified: delegationResult.verified,
    invocationVerified: invocationResult.verified
  }
}

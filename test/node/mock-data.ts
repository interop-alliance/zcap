/*!
 * Copyright (c) 2018-2024 Digital Bazaar, Inc. All rights reserved.
 */

/**
 * Mock documents for the zcap test suite.
 *
 * The named actors `alice`, `bob`, `carol`, and `diana` are static
 * `https://example.com/i/...` controller documents with fixed Ed25519 keys, so
 * the pre-computed delegation/invocation fixtures remain byte-for-byte
 * reproducible. The `alpha` actor (formerly a `did:v1` document) is generated
 * fresh as a `did:key` identity, which the test document loader resolves
 * automatically.
 */
import { Ed25519VerificationKey } from '@interop/ed25519-verification-key'
import { driver as didKeyDriver } from '@interop/did-method-key'
import * as zcap from '../../src/index.js'
import { addToLoader, documentLoader } from './documentLoader.js'

const { ZCAP_CONTEXT_URL } = zcap.constants

const KEY_TYPES = [
  'capabilityDelegation',
  'capabilityInvocation',
  'verificationMethod'
]

export const capabilities: any = {}
export const didDocs: any = {}
export const privateDidDocs: any = {}
export const controllers: any = {}

// Re-export the loader bits the test suite expects under the `mock` namespace.
export { addToLoader }
export const testLoader = documentLoader

// --- static actor controller documents (fixed keys) ---

controllers.alice = {
  '@context': [
    'https://w3id.org/security/v2',
    'https://w3id.org/security/suites/ed25519-2020/v1'
  ],
  id: 'https://example.com/i/alice',
  verificationMethod: [
    {
      id: 'https://example.com/i/alice/keys/1',
      type: 'Ed25519VerificationKey2020',
      controller: 'https://example.com/i/alice',
      publicKeyMultibase: 'z6MkvRsV39xVQc8HevAQwCqEw18DwrEtzVLz8NJY15NtfMmD',
      privateKeyMultibase:
        'zrv2zfksN9F1MiYpTVoLjZKks7UArP87c1dKbdkzXkMTwtoAYadt7ozJEVZwQpcroQruoLxY7kESHpnVyJ1a6bbSVK9'
    }
  ],
  capabilityInvocation: ['https://example.com/i/alice/keys/1'],
  capabilityDelegation: ['https://example.com/i/alice/keys/1']
}

controllers.bob = {
  '@context': [
    'https://w3id.org/security/v2',
    'https://w3id.org/security/suites/ed25519-2020/v1'
  ],
  id: 'https://example.com/i/bob',
  capabilityInvocation: [
    {
      id: 'https://example.com/i/bob/keys/1',
      type: 'Ed25519VerificationKey2020',
      controller: 'https://example.com/i/bob',
      publicKeyMultibase: 'z6MkqyrirHAq8Acicq1FyNJGd9R7D1DW7Q8A3v1qqZfP4pdY',
      privateKeyMultibase:
        'zrv2yZunr7Cz1cZTSQgJPZ35CQaSiJt5iN3Ah4JCND7cBAzyrfRaiE4HhFsUtcSadaf7f9qMDH9rXVutKr12LGxgXPY'
    }
  ],
  capabilityDelegation: [
    {
      id: 'https://example.com/i/bob/keys/2',
      type: 'Ed25519VerificationKey2020',
      controller: 'https://example.com/i/bob',
      publicKeyMultibase: 'z6MkqyrirHAq8Acicq1FyNJGd9R7D1DW7Q8A3v1qqZfP4pdY',
      privateKeyMultibase:
        'zrv2yZunr7Cz1cZTSQgJPZ35CQaSiJt5iN3Ah4JCND7cBAzyrfRaiE4HhFsUtcSadaf7f9qMDH9rXVutKr12LGxgXPY'
    }
  ]
}

controllers.carol = {
  '@context': [
    'https://w3id.org/security/v2',
    'https://w3id.org/security/suites/ed25519-2020/v1'
  ],
  id: 'https://example.com/i/carol',
  capabilityInvocation: [
    {
      id: 'https://example.com/i/carol/keys/1',
      type: 'Ed25519VerificationKey2020',
      controller: 'https://example.com/i/carol',
      publicKeyMultibase: 'z6Mku8G8HT5jLgprB1u8GHsc9b98NDqeQMys2i1zXboCqxrZ',
      privateKeyMultibase:
        'zrv51RAzPCYDawUCCNR8JAGd4SNvhaTPWodCbBKQu4CjsKjyG7M3bNLLY4VFgiCmk3YbV1gxpqrvoGvTbVw8piitidK'
    }
  ],
  capabilityDelegation: [
    {
      id: 'https://example.com/i/carol/keys/2',
      type: 'Ed25519VerificationKey2020',
      controller: 'https://example.com/i/carol',
      publicKeyMultibase: 'z6Mku8G8HT5jLgprB1u8GHsc9b98NDqeQMys2i1zXboCqxrZ',
      privateKeyMultibase:
        'zrv51RAzPCYDawUCCNR8JAGd4SNvhaTPWodCbBKQu4CjsKjyG7M3bNLLY4VFgiCmk3YbV1gxpqrvoGvTbVw8piitidK'
    }
  ]
}

controllers.diana = {
  '@context': [
    'https://w3id.org/security/v2',
    'https://w3id.org/security/suites/ed25519-2020/v1'
  ],
  id: 'https://example.com/i/diana',
  capabilityInvocation: [
    {
      id: 'https://example.com/i/diana/keys/1',
      type: 'Ed25519VerificationKey2020',
      controller: 'https://example.com/i/diana',
      publicKeyMultibase: 'z6Mkmx1NnKQS5Nie3UkYHaVE9xxy1AgxF3RXj3rCqrQfQN63',
      privateKeyMultibase:
        'zrv3yvMmvs3EkVyb9j2YJ9jWQ2dopxcVCHXWQFG7v6Kvf6VS9xHZ7w97ZkKK1UMxebdS8vkA2m9kpu8WXLm9oJoaMtj'
    }
  ],
  capabilityDelegation: [
    {
      id: 'https://example.com/i/diana/keys/2',
      type: 'Ed25519VerificationKey2020',
      controller: 'https://example.com/i/diana',
      publicKeyMultibase: 'z6Mkmx1NnKQS5Nie3UkYHaVE9xxy1AgxF3RXj3rCqrQfQN63',
      privateKeyMultibase:
        'zrv3yvMmvs3EkVyb9j2YJ9jWQ2dopxcVCHXWQFG7v6Kvf6VS9xHZ7w97ZkKK1UMxebdS8vkA2m9kpu8WXLm9oJoaMtj'
    }
  ]
}

// --- did:key actor (replaces the old did:v1 `alpha` document) ---

const didKey = didKeyDriver()
didKey.use({ keyPairClass: Ed25519VerificationKey })

/**
 * Generates a `did:key` controller document whose `capabilityInvocation` and
 * `capabilityDelegation` relationships hold ready-to-sign key pair instances
 * (so `Controller.get(...).signer()` works directly).
 *
 * @returns A controller document object.
 */
async function _generateDidKeyController(): Promise<any> {
  const { didDocument, methodFor } = await didKey.generate()
  // did:key uses the same Ed25519 key for all capability relationships
  const invocationKey = methodFor({ purpose: 'capabilityInvocation' })
  const delegationKey = methodFor({ purpose: 'capabilityDelegation' })
  return {
    '@context': didDocument['@context'],
    id: didDocument.id,
    verificationMethod: [invocationKey, delegationKey],
    capabilityInvocation: [invocationKey],
    capabilityDelegation: [delegationKey]
  }
}

privateDidDocs.alpha = await _generateDidKeyController()
didDocs.alpha = privateDidDocs.alpha

// --- example documents (invocation targets) ---

export const exampleDoc = {
  '@context': ['https://w3id.org/security/v2', 'https://w3id.org/zcap/v1'],
  id: 'urn:uuid:cab83279-c695-4e66-9458-4327de49197a',
  nonce: '123'
}

export const exampleDocWithInvocation: any = {}
exampleDocWithInvocation.alpha = {
  '@context': [
    'https://w3id.org/security/v2',
    'https://w3id.org/zcap/v1',
    'https://w3id.org/security/suites/ed25519-2020/v1'
  ],
  id: 'urn:uuid:cab83279-c695-4e66-9458-4327de49197a',
  nonce: '123',
  proof: {
    type: 'Ed25519Signature2020',
    created: '2018-02-13T21:26:08Z',
    capability: 'https://example.org/alice/caps#1',
    capabilityAction: 'read',
    invocationTarget: 'https://example.org/alice/targets/alpha',
    proofPurpose: 'capabilityInvocation',
    proofValue:
      'z58nkwkpoeLsrx37nNWDbDEAGrbCWwLCsTmr4aPztBMJvo9UPDLGUyjNzoTgsZpqFkJYq3VM8YgC3RpLn9U4ThkxD',
    verificationMethod: 'https://example.com/i/alice/keys/1'
  }
}
exampleDocWithInvocation.beta = {
  '@context': [
    'https://w3id.org/security/v2',
    'https://w3id.org/zcap/v1',
    'https://w3id.org/security/suites/ed25519-2020/v1'
  ],
  id: 'urn:uuid:cab83279-c695-4e66-9458-4327de49197a',
  nonce: '123',
  proof: {
    type: 'Ed25519Signature2020',
    created: '2018-02-13T21:26:08Z',
    capability: 'https://example.org/alice/caps#0',
    capabilityAction: 'read',
    invocationTarget: 'https://example.org/alice/targets/beta',
    proofPurpose: 'capabilityInvocation',
    proofValue:
      'zoRUfzD72MaMVShok9n5GhTSSB4ZA9iSs9kKGeKEfgAQieEtFWfpVSb8Q87thnyeoDABdYsfksTgj4jUj3J6KSrd',
    verificationMethod: 'https://example.com/i/alice/keys/1'
  }
}

// --- root capabilities ---

capabilities.root = {}

// keys as controller
capabilities.root.alpha = {
  '@context': ZCAP_CONTEXT_URL,
  id: 'https://example.org/alice/caps#1',
  controller: 'https://example.com/i/alice/keys/1',
  invocationTarget: 'https://example.org/alice/targets/alpha'
}
capabilities.root.beta = {
  '@context': ZCAP_CONTEXT_URL,
  id: 'https://example.org/alice/caps#0',
  controller: controllers.alice.id,
  invocationTarget: 'https://example.org/alice/targets/beta'
}
capabilities.root.restful = {
  '@context': ZCAP_CONTEXT_URL,
  id: `urn:zcap:root:${encodeURIComponent('https://zcap.example')}`,
  controller: controllers.alice.id,
  invocationTarget: 'https://zcap.example'
}

// --- pre-computed delegated capability fixtures (signed by alice) ---

capabilities.delegated = {}
capabilities.delegated.alpha = {
  '@context': [
    'https://w3id.org/zcap/v1',
    'https://w3id.org/security/suites/ed25519-2020/v1'
  ],
  id: 'urn:uuid:055f47a4-61d3-11ec-9144-10bf48838a41',
  parentCapability: 'https://example.org/alice/caps#1',
  controller: 'https://example.com/i/bob/keys/1',
  invocationTarget: 'https://example.org/alice/targets/alpha',
  expires: '3000-01-01T00:01Z',
  proof: {
    type: 'Ed25519Signature2020',
    created: '2018-02-13T21:26:08Z',
    capabilityChain: ['https://example.org/alice/caps#1'],
    proofPurpose: 'capabilityDelegation',
    proofValue:
      'z4Hm6e5ziMoiG2eWpRyB1ozrnh65gikaVAZzkXpMUNFarzouKNYYXCc4YqLZch12JgcfCqpSmgYfV6JXL8FSyC4pW',
    verificationMethod: 'https://example.com/i/alice/keys/1'
  }
}
capabilities.delegated.beta = {
  '@context': [
    'https://w3id.org/zcap/v1',
    'https://w3id.org/security/suites/ed25519-2020/v1'
  ],
  id: 'urn:uuid:710910c8-61e4-11ec-8739-10bf48838a41',
  parentCapability: 'https://example.org/alice/caps#0',
  controller: 'https://example.com/i/bob',
  expires: '3000-01-01T00:01Z',
  invocationTarget: 'https://example.org/alice/targets/beta',
  proof: {
    type: 'Ed25519Signature2020',
    created: '2018-02-13T21:26:08Z',
    capabilityChain: ['https://example.org/alice/caps#0'],
    proofPurpose: 'capabilityDelegation',
    proofValue:
      'z5tBRPbzifdC69CWhF2Y9UZ3KCXDuRHG4GqVjMWf2nCZG6XCUXoiDV75Afy93wQQC8sQtYxmwfhzW5bAeaKjLJuH4',
    verificationMethod: 'https://example.com/i/alice/keys/1'
  }
}

// --- register the static documents with the loader ---

function _stripPrivateKeys(privateControllerDoc: any): any {
  // clone the doc
  const publicControllerDoc = JSON.parse(JSON.stringify(privateControllerDoc))
  const verificationRelationships = [
    'verificationMethod',
    'authentication',
    'capabilityDelegation',
    'capabilityInvocation'
  ]
  for (const vr of verificationRelationships) {
    if (Array.isArray(publicControllerDoc[vr])) {
      for (const vm of publicControllerDoc[vr]) {
        if (typeof vm === 'string') {
          continue
        }
        delete vm.privateKeyMultibase
      }
    }
  }
  return publicControllerDoc
}

function _getKeysWithContext(doc: any): any[] {
  const keys: any[] = []
  for (const keyType of KEY_TYPES) {
    keys.push(
      ...(doc[keyType] || [])
        .filter((k: any) => typeof k !== 'string')
        .map((k: any) => ({ '@context': doc['@context'], ...k }))
    )
  }
  return keys
}

// generate a flattened list of all keys for the static actors
const allKeys = ([] as any[]).concat(
  ...Object.values(controllers).map(_getKeysWithContext)
)

const docsForLoader = [
  _stripPrivateKeys(controllers.alice),
  _stripPrivateKeys(controllers.bob),
  _stripPrivateKeys(controllers.carol),
  _stripPrivateKeys(controllers.diana),
  capabilities.root.alpha,
  capabilities.root.beta,
  capabilities.root.restful,
  ...allKeys
]

for (const doc of docsForLoader) {
  addToLoader({ doc })
}

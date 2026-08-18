/*!
 * Copyright (c) 2018-2024 Digital Bazaar, Inc. All rights reserved.
 */

import { describe, expect, it } from 'vitest'
import {
  createRootCapability,
  getControllers,
  isController,
  getAllowedActions,
  getTarget,
  getDelegationProofs,
  getCapabilityChain,
  isValidTarget,
  computeCapabilityChain,
  checkProofContext,
  hasValidAllowedAction,
  checkCapability,
  compareTime,
  createDetailedError
} from '../../src/utils.js'
import {
  ZCAP_CONTEXT_URL,
  ZCAP_ROOT_PREFIX
} from '../../src/constants.js'
import * as zcap from '../../src/index.js'

// minimal fixture builders ---------------------------------------------------

function makeRoot(overrides = {}) {
  return {
    '@context': ZCAP_CONTEXT_URL,
    id: 'urn:zcap:root:' + encodeURIComponent('https://example.com/foo'),
    controller: 'https://example.com/i/alice',
    invocationTarget: 'https://example.com/foo',
    ...overrides
  }
}

function makeDelegated(overrides = {}) {
  // a `proof` override replaces the default proof outright rather than merging
  // (so callers can supply an array of proofs, or a deliberately malformed one)
  return {
    '@context': [ZCAP_CONTEXT_URL],
    id: 'urn:uuid:11111111-1111-1111-1111-111111111111',
    controller: 'https://example.com/i/bob',
    invocationTarget: 'https://example.com/foo',
    parentCapability:
      'urn:zcap:root:' + encodeURIComponent('https://example.com/foo'),
    expires: '2100-01-01T00:00:00Z',
    proof: {
      type: 'Ed25519Signature2020',
      created: '2024-01-01T00:00:00Z',
      proofPurpose: 'capabilityDelegation',
      capabilityChain: [
        'urn:zcap:root:' + encodeURIComponent('https://example.com/foo')
      ]
    },
    ...overrides
  }
}

describe('utils', () => {
  describe('createRootCapability', () => {
    it('builds a root zcap with an encoded id', () => {
      const target = 'https://example.com/a/b?x=1'
      const root = createRootCapability({
        controller: 'https://example.com/i/alice',
        invocationTarget: target
      })
      expect(root['@context']).toBe(ZCAP_CONTEXT_URL)
      expect(root.invocationTarget).toBe(target)
      expect(root.controller).toBe('https://example.com/i/alice')
      expect(root.id).toBe(ZCAP_ROOT_PREFIX + encodeURIComponent(target))
      // root zcaps must not carry expiry
      expect('expires' in root).toBe(false)
      expect('parentCapability' in root).toBe(false)
    })
  })

  describe('getControllers', () => {
    it('returns a single controller as a one-element array', () => {
      expect(getControllers({ capability: makeRoot() })).toEqual([
        'https://example.com/i/alice'
      ])
    })

    it('returns an array controller as-is', () => {
      const capability = makeRoot({ controller: ['a:1', 'b:2'] })
      expect(getControllers({ capability })).toEqual(['a:1', 'b:2'])
    })

    it('throws when the controller is missing', () => {
      const capability = makeRoot({ controller: undefined })
      expect(() => getControllers({ capability })).toThrow(
        'Capability controller not found.'
      )
    })
  })

  describe('isController', () => {
    const capability = makeRoot({ controller: 'did:example:alice' })

    it('matches when the verification method controller matches', () => {
      const vm = { id: 'did:example:alice#key-1', controller: 'did:example:alice' }
      expect(isController({ capability, verificationMethod: vm })).toBe(true)
    })

    it('matches when the verification method id matches', () => {
      const capability2 = makeRoot({ controller: 'did:example:alice#key-1' })
      const vm = { id: 'did:example:alice#key-1', controller: 'did:other' }
      expect(
        isController({ capability: capability2, verificationMethod: vm })
      ).toBe(true)
    })

    it('returns false when neither matches', () => {
      const vm = { id: 'did:example:bob#key-1', controller: 'did:example:bob' }
      expect(isController({ capability, verificationMethod: vm })).toBe(false)
    })
  })

  describe('getAllowedActions', () => {
    it('returns [] when no allowedAction is present', () => {
      expect(getAllowedActions({ capability: makeRoot() })).toEqual([])
    })

    it('wraps a string allowedAction in an array', () => {
      const capability = makeRoot({ allowedAction: 'read' })
      expect(getAllowedActions({ capability })).toEqual(['read'])
    })

    it('returns an array allowedAction flattened', () => {
      const capability = makeRoot({ allowedAction: ['read', 'write'] })
      expect(getAllowedActions({ capability })).toEqual(['read', 'write'])
    })
  })

  describe('getTarget', () => {
    it('returns the invocationTarget', () => {
      expect(getTarget({ capability: makeRoot() })).toBe(
        'https://example.com/foo'
      )
    })
  })

  describe('getDelegationProofs', () => {
    it('returns [] for a root capability', () => {
      expect(getDelegationProofs({ capability: makeRoot() })).toEqual([])
    })

    it('returns [] for a delegated capability without a proof', () => {
      const capability = makeDelegated()
      delete (capability as { proof?: unknown }).proof
      expect(getDelegationProofs({ capability })).toEqual([])
    })

    it('filters by capabilityDelegation proofPurpose', () => {
      const capability = makeDelegated({
        proof: [
          { proofPurpose: 'assertionMethod' },
          { proofPurpose: 'capabilityDelegation', created: 'x' }
        ]
      })
      const proofs = getDelegationProofs({ capability })
      expect(proofs).toHaveLength(1)
      expect(proofs[0].proofPurpose).toBe('capabilityDelegation')
    })
  })

  describe('getCapabilityChain', () => {
    it('returns [] for a root capability', () => {
      expect(getCapabilityChain({ capability: makeRoot() })).toEqual([])
    })

    it('returns a copy of the chain for a delegated capability', () => {
      const capability = makeDelegated()
      const chain = getCapabilityChain({ capability })
      expect(chain).toEqual(capability.proof.capabilityChain)
      // must be a copy, not the same reference
      expect(chain).not.toBe(capability.proof.capabilityChain)
    })

    it('throws when there is not exactly one delegation proof', () => {
      const capability = makeDelegated({
        proof: [
          { proofPurpose: 'capabilityDelegation', created: 'a' },
          { proofPurpose: 'capabilityDelegation', created: 'b' }
        ]
      })
      expect(() => getCapabilityChain({ capability })).toThrow(
        'does not have exactly one delegation proof'
      )
    })

    it('throws when the delegation proof lacks a capabilityChain array', () => {
      const capability = makeDelegated({
        proof: {
          proofPurpose: 'capabilityDelegation',
          created: '2024-01-01T00:00:00Z'
        }
      })
      expect(() => getCapabilityChain({ capability })).toThrow(
        'does not have a "capabilityChain" array'
      )
    })
  })

  describe('isValidTarget', () => {
    it('accepts an exact match', () => {
      expect(
        isValidTarget({
          invocationTarget: 'https://example.com/a',
          baseInvocationTarget: 'https://example.com/a'
        })
      ).toBe(true)
    })

    it('rejects a mismatch when attenuation is disabled', () => {
      expect(
        isValidTarget({
          invocationTarget: 'https://example.com/a/b',
          baseInvocationTarget: 'https://example.com/a'
        })
      ).toBe(false)
    })

    it('accepts path-based attenuation', () => {
      expect(
        isValidTarget({
          invocationTarget: 'https://example.com/a/b',
          baseInvocationTarget: 'https://example.com/a',
          allowTargetAttenuation: true
        })
      ).toBe(true)
    })

    it('accepts query-based attenuation when base has no query', () => {
      expect(
        isValidTarget({
          invocationTarget: 'https://example.com/a?x=1',
          baseInvocationTarget: 'https://example.com/a',
          allowTargetAttenuation: true
        })
      ).toBe(true)
    })

    it('requires "&" attenuation when the base already has a query', () => {
      expect(
        isValidTarget({
          invocationTarget: 'https://example.com/a?x=1&y=2',
          baseInvocationTarget: 'https://example.com/a?x=1',
          allowTargetAttenuation: true
        })
      ).toBe(true)
      // a "/" suffix is not valid attenuation once a query is present
      expect(
        isValidTarget({
          invocationTarget: 'https://example.com/a?x=1/extra',
          baseInvocationTarget: 'https://example.com/a?x=1',
          allowTargetAttenuation: true
        })
      ).toBe(false)
    })

    it('accepts descendants of a base ending in "/"', () => {
      expect(
        isValidTarget({
          invocationTarget: 'https://example.com/a/b',
          baseInvocationTarget: 'https://example.com/a/',
          allowTargetAttenuation: true
        })
      ).toBe(true)
      expect(
        isValidTarget({
          invocationTarget: 'https://example.com/a/b/c',
          baseInvocationTarget: 'https://example.com/a/',
          allowTargetAttenuation: true
        })
      ).toBe(true)
    })

    it('refuses the slashless parent of a base ending in "/"', () => {
      expect(
        isValidTarget({
          invocationTarget: 'https://example.com/a',
          baseInvocationTarget: 'https://example.com/a/',
          allowTargetAttenuation: true
        })
      ).toBe(false)
    })

    it('keeps the segment boundary for a base ending in "/"', () => {
      expect(
        isValidTarget({
          invocationTarget: 'https://example.com/a-evil',
          baseInvocationTarget: 'https://example.com/a/',
          allowTargetAttenuation: true
        })
      ).toBe(false)
      expect(
        isValidTarget({
          invocationTarget: 'https://example.com/a-evil/b',
          baseInvocationTarget: 'https://example.com/a/',
          allowTargetAttenuation: true
        })
      ).toBe(false)
    })

    it('keeps the segment boundary for a slashless base', () => {
      expect(
        isValidTarget({
          invocationTarget: 'https://example.com/a-evil',
          baseInvocationTarget: 'https://example.com/a',
          allowTargetAttenuation: true
        })
      ).toBe(false)
      expect(
        isValidTarget({
          invocationTarget: 'https://example.com/a-evil/b',
          baseInvocationTarget: 'https://example.com/a',
          allowTargetAttenuation: true
        })
      ).toBe(false)
    })

    it('accepts query-based attenuation on a base ending in "/"', () => {
      expect(
        isValidTarget({
          invocationTarget: 'https://example.com/a/?x=1',
          baseInvocationTarget: 'https://example.com/a/',
          allowTargetAttenuation: true
        })
      ).toBe(true)
    })

    it('accepts an exact match for a base ending in "/"', () => {
      expect(
        isValidTarget({
          invocationTarget: 'https://example.com/a/',
          baseInvocationTarget: 'https://example.com/a/'
        })
      ).toBe(true)
    })

    it('accepts new query variables on a base ending in "?" or "&"', () => {
      expect(
        isValidTarget({
          invocationTarget: 'https://example.com/a?x=1',
          baseInvocationTarget: 'https://example.com/a?',
          allowTargetAttenuation: true
        })
      ).toBe(true)
      expect(
        isValidTarget({
          invocationTarget: 'https://example.com/a?x=1&y=2',
          baseInvocationTarget: 'https://example.com/a?x=1&',
          allowTargetAttenuation: true
        })
      ).toBe(true)
      // a "&"-terminated base still refuses a target on another path
      expect(
        isValidTarget({
          invocationTarget: 'https://example.com/b?x=1&y=2',
          baseInvocationTarget: 'https://example.com/a?x=1&',
          allowTargetAttenuation: true
        })
      ).toBe(false)
    })

    it('rejects an unrelated target even with attenuation enabled', () => {
      expect(
        isValidTarget({
          invocationTarget: 'https://evil.example/a',
          baseInvocationTarget: 'https://example.com/a',
          allowTargetAttenuation: true
        })
      ).toBe(false)
    })
  })

  describe('computeCapabilityChain', () => {
    const rootId =
      'urn:zcap:root:' + encodeURIComponent('https://example.com/foo')

    it('returns [rootId] when given a root id string', () => {
      expect(computeCapabilityChain({ parentCapability: rootId })).toEqual([
        rootId
      ])
    })

    it('returns [rootId] when given a root zcap object', () => {
      const root = makeRoot()
      expect(computeCapabilityChain({ parentCapability: root })).toEqual([
        root.id
      ])
    })

    it('appends the delegated parent to its chain', () => {
      const parent = makeDelegated()
      const chain = computeCapabilityChain({ parentCapability: parent })
      // root reference first, then the parent object itself
      expect(chain[0]).toBe(rootId)
      expect(chain[chain.length - 1]).toBe(parent)
    })

    it('throws a TypeError on a malformed chain shape', () => {
      const parent = makeDelegated({
        proof: {
          proofPurpose: 'capabilityDelegation',
          created: '2024-01-01T00:00:00Z',
          // first entry must be a string id, not an object
          capabilityChain: [{ id: 'urn:a' }, { id: 'urn:b' }]
        }
      })
      expect(() => computeCapabilityChain({ parentCapability: parent })).toThrow(
        TypeError
      )
    })

    it('throws on relative URLs in the chain', () => {
      const parent = makeDelegated({
        proof: {
          proofPurpose: 'capabilityDelegation',
          created: '2024-01-01T00:00:00Z',
          capabilityChain: ['relative-no-colon']
        }
      })
      expect(() => computeCapabilityChain({ parentCapability: parent })).toThrow(
        'relative URL'
      )
    })
  })

  describe('checkProofContext', () => {
    it('accepts the context URL as a string', () => {
      expect(() =>
        checkProofContext({ proof: { '@context': ZCAP_CONTEXT_URL } })
      ).not.toThrow()
    })

    it('accepts the context URL anywhere in an array', () => {
      expect(() =>
        checkProofContext({
          proof: { '@context': ['https://other', ZCAP_CONTEXT_URL] }
        })
      ).not.toThrow()
    })

    it('throws when the context is missing', () => {
      expect(() =>
        checkProofContext({ proof: { '@context': 'https://other' } })
      ).toThrow('Missing required capability proof context')
    })
  })

  describe('hasValidAllowedAction', () => {
    it('allows anything when the parent does not restrict actions', () => {
      expect(
        hasValidAllowedAction({ allowedAction: 'read', parentAllowedAction: undefined })
      ).toBe(true)
    })

    it('array parent must include every child action', () => {
      expect(
        hasValidAllowedAction({
          allowedAction: ['read'],
          parentAllowedAction: ['read', 'write']
        })
      ).toBe(true)
      expect(
        hasValidAllowedAction({
          allowedAction: ['read', 'delete'],
          parentAllowedAction: ['read', 'write']
        })
      ).toBe(false)
    })

    it('array parent must include a single string child action', () => {
      expect(
        hasValidAllowedAction({
          allowedAction: 'write',
          parentAllowedAction: ['read', 'write']
        })
      ).toBe(true)
      expect(
        hasValidAllowedAction({
          allowedAction: undefined,
          parentAllowedAction: ['read']
        })
      ).toBe(false)
    })

    it('string parent requires an exact match', () => {
      expect(
        hasValidAllowedAction({
          allowedAction: 'read',
          parentAllowedAction: 'read'
        })
      ).toBe(true)
      expect(
        hasValidAllowedAction({
          allowedAction: 'write',
          parentAllowedAction: 'read'
        })
      ).toBe(false)
    })
  })

  describe('checkCapability', () => {
    it('accepts a well-formed root capability', () => {
      expect(() =>
        checkCapability({ capability: makeRoot(), expectRoot: true })
      ).not.toThrow()
    })

    it('accepts a well-formed delegated capability', () => {
      expect(() =>
        checkCapability({ capability: makeDelegated(), expectRoot: false })
      ).not.toThrow()
    })

    // regression guard: a root capability carrying `expires` must be rejected.
    // Previously `expires` was only read off zcaps that had a
    // `parentCapability`, so this check silently never fired for root zcaps.
    it('rejects a root capability that carries an "expires" field', () => {
      const capability = makeRoot({ expires: '2100-01-01T00:00:00Z' })
      expect(() => checkCapability({ capability, expectRoot: true })).toThrow(
        'Root capability must not have an "expires" field.'
      )
    })

    // companion regression guard: `allowedAction` is likewise read for root
    // zcaps, so its shape is validated rather than silently skipped.
    it('validates the allowedAction shape of a root capability', () => {
      const capability = makeRoot({ allowedAction: [] })
      expect(() => checkCapability({ capability, expectRoot: true })).toThrow(
        'must be a string or a non-empty array'
      )
    })

    it('rejects a root capability with a wrong @context', () => {
      const capability = makeRoot({ '@context': 'https://other' })
      expect(() => checkCapability({ capability, expectRoot: true })).toThrow(
        'Root capability must have an "@context"'
      )
    })

    it('rejects a delegated capability whose @context lacks the zcap url first', () => {
      const capability = makeDelegated({ '@context': ['https://other'] })
      expect(() => checkCapability({ capability, expectRoot: false })).toThrow(
        'Delegated capability must have an "@context" array'
      )
    })

    it('rejects a delegated capability with a relative parentCapability', () => {
      const capability = makeDelegated({ parentCapability: 'relative' })
      expect(() => checkCapability({ capability, expectRoot: false })).toThrow(
        'must have a "parentCapability"'
      )
    })

    it('rejects a delegated capability with no delegation proof', () => {
      const capability = makeDelegated()
      delete (capability as { proof?: unknown }).proof
      expect(() => checkCapability({ capability, expectRoot: false })).toThrow(
        'Delegated capability must have a "proof".'
      )
    })

    it('rejects a delegated capability with an invalid proof created date', () => {
      const capability = makeDelegated({
        proof: {
          proofPurpose: 'capabilityDelegation',
          created: 'not-a-date',
          capabilityChain: ['urn:x']
        }
      })
      expect(() => checkCapability({ capability, expectRoot: false })).toThrow(
        'valid proof "created" date'
      )
    })

    it('rejects a delegated capability with an invalid expires date', () => {
      const capability = makeDelegated({ expires: 'not-a-date' })
      expect(() => checkCapability({ capability, expectRoot: false })).toThrow(
        'must have a valid expires date'
      )
    })

    it('rejects a capability with a relative id', () => {
      const capability = makeRoot({ id: 'relative' })
      expect(() => checkCapability({ capability, expectRoot: true })).toThrow(
        'must have an "id"'
      )
    })

    it('rejects a capability with a relative invocationTarget', () => {
      const capability = makeRoot({ invocationTarget: 'relative' })
      expect(() => checkCapability({ capability, expectRoot: true })).toThrow(
        'must have an "invocationTarget"'
      )
    })

    it('throws when a root is expected but a delegated zcap is given', () => {
      expect(() =>
        checkCapability({ capability: makeDelegated(), expectRoot: true })
      ).toThrow('to be root but it is delegated')
    })

    it('throws when a delegated is expected but a root zcap is given', () => {
      expect(() =>
        checkCapability({ capability: makeRoot(), expectRoot: false })
      ).toThrow('to be delegated but it is root')
    })
  })

  describe('compareTime', () => {
    it('treats times within the clock skew as equal', () => {
      expect(compareTime({ t1: 1000, t2: 2000, maxClockSkew: 5 })).toBe(0)
    })

    it('returns -1 when t1 is earlier beyond the skew', () => {
      expect(compareTime({ t1: 0, t2: 10000, maxClockSkew: 1 })).toBe(-1)
    })

    it('returns 1 when t1 is later beyond the skew', () => {
      expect(compareTime({ t1: 10000, t2: 0, maxClockSkew: 1 })).toBe(1)
    })
  })

  describe('createDetailedError', () => {
    it('attaches structured details to an Error', () => {
      const details = { code: 'X', value: 42 }
      const error = createDetailedError('boom', details)
      expect(error).toBeInstanceOf(Error)
      expect(error.message).toBe('boom')
      expect(error.details).toEqual(details)
    })
  })
})

describe('document loaders', () => {
  describe('extendDocumentLoader', () => {
    it('serves the zcap context for the zcap context URL', async () => {
      let delegatedTo: string | undefined
      const loader = zcap.extendDocumentLoader(async (url: string) => {
        delegatedTo = url
        return { contextUrl: null, documentUrl: url, document: {} }
      })
      const result = await loader(ZCAP_CONTEXT_URL)
      expect(result.documentUrl).toBe(ZCAP_CONTEXT_URL)
      expect(result.document).toBe(zcap.constants.ZCAP_CONTEXT)
      expect(result.tag).toBe('static')
      // the wrapped loader must not be consulted for the zcap context
      expect(delegatedTo).toBeUndefined()
    })

    it('delegates all other URLs to the wrapped loader', async () => {
      let delegatedTo: string | undefined
      const loader = zcap.extendDocumentLoader(async (url: string) => {
        delegatedTo = url
        return { contextUrl: null, documentUrl: url, document: { ok: true } }
      })
      const result = await loader('https://example.com/other')
      expect(delegatedTo).toBe('https://example.com/other')
      expect(result.document).toEqual({ ok: true })
    })
  })

  describe('documentLoader', () => {
    it('serves the zcap context', async () => {
      const result = await zcap.documentLoader(ZCAP_CONTEXT_URL)
      expect(result.document).toBe(zcap.constants.ZCAP_CONTEXT)
      expect(result.tag).toBe('static')
    })

    it('rejects an unknown URL via the wrapped strict loader', async () => {
      await expect(
        zcap.documentLoader('https://example.com/unknown')
      ).rejects.toThrow()
    })
  })
})

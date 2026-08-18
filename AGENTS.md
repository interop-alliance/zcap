# Agent Guidelines — zcap

## Project Overview

This is a fork of `@digitalbazaar/zcap` (v9.0.2-0), the reference implementation
for [Authorization Capabilities (zCaps)](https://w3c-ccg.github.io/zcap-spec/).
It is written in **TypeScript** (`src/*.ts`, compiled to `dist/`) and published
as an ESM-only package (`"type": "module"`) targeting Node.js >= 24.

The fork lives at `@interop/zcap` and uses `@interop/jsonld-signatures` instead
of the upstream `jsonld-signatures`.

## Status

The refactor, TypeScript conversion, and test migration are complete:

1. **Refactored** internals for clarity and maintainability (see Architecture
   below).
2. **TypeScript** — source is `src/*.ts`; types reuse the shared interfaces from
   `@interop/data-integrity-core` and live alongside the compiled output in
   `dist/` (full build, not declarations-only).
3. **Downstream usage** — to be wired up as a dependency in related Interop
   Alliance libraries (e.g., `ezcap`, `wallet-attached-storage`).

## Architecture

### Domain Model

A **zCap (Authorization Capability)** is a JSON-LD object that answers:

- **who** — `controller`: the DID of the agent authorized to invoke
- **can** — `allowedAction`: which actions (e.g. `["GET","POST"]`) they may
  perform
- **with** — `invocationTarget`: the resource URI they may act on
- **given** — caveats such as `expires`

There are two kinds of zcap:

| Kind           | `parentCapability`      | `expires` | `proof`                      |
| -------------- | ----------------------- | --------- | ---------------------------- |
| Root zcap      | absent                  | forbidden | none                         |
| Delegated zcap | required (absolute URI) | required  | `capabilityDelegation` proof |

Root zcap `id` follows the convention
`urn:zcap:root:${encodeURIComponent(url)}`.

### Capability Chain

Delegation is expressed as a **proof chain**: each delegated zcap embeds or
references its ancestors via `proof.capabilityChain`. The chain is ordered root
→ tail and validated from root outward to prevent an attacker from short-
circuiting verification with a fraudulent tail.

Key invariants enforced at each link:

- `allowedAction` may only be made more restrictive, never relaxed.
- `invocationTarget` must match the parent's exactly (unless
  `allowTargetAttenuation=true`, where URL path/query narrowing is allowed).
- `expires` may only be made earlier, never later.
- Delegation timestamp must not be before the parent's delegation timestamp.
- Chain must not contain cycles.
- Default max chain length: `MAX_CHAIN_LENGTH = 10`.

### Source Files

```
src/
  index.ts                  Public API surface (exports + documentLoader)
  constants.ts              ZCAP_CONTEXT_URL, ZCAP_ROOT_PREFIX, MAX_CHAIN_LENGTH
  types.ts                  Local zcap option/result interfaces; re-exports the
                            shared zcap interfaces from data-integrity-core
  declarations.d.ts         Ambient module shims for untyped deps
  CapabilityProofPurpose.ts Abstract base class extending jsonld-signatures
                            ControllerProofPurpose; owns chain dereferencing and
                            verification logic (_verifyCapabilityChain)
  CapabilityInvocation.ts   Proof purpose for INVOKING a zcap; validates
                            capabilityAction, invocationTarget, controller match,
                            expiry, and timing vs delegation
  CapabilityDelegation.ts   Proof purpose for DELEGATING a zcap; validates the
                            new zcap against its parent before signing
  utils.ts                  Pure helpers: createRootCapability,
                            dereferenceCapabilityChain, checkCapability,
                            computeCapabilityChain, isValidTarget,
                            getAllowedActions, getDelegationProofs, compareTime
```

### Public API

```js
import {
  CapabilityInvocation, // proof purpose — used when invoking a zcap
  CapabilityDelegation, // proof purpose — used when delegating a zcap
  createRootCapability, // ({controller, invocationTarget}) => zcap object
  constants, // { ZCAP_CONTEXT_URL, ZCAP_ROOT_PREFIX, ... }
  documentLoader, // default loader (zcap + jsigs contexts only)
  extendDocumentLoader // wrap an existing loader to also serve zcap context
} from '@interop/zcap'
```

`CapabilityInvocation` is instantiated in **two modes** (mutually exclusive):

- **Create-proof mode** — pass
  `{capability, capabilityAction, invocationTarget}`
- **Verify-proof mode** — pass
  `{expectedAction, expectedTarget, expectedRootCapability, suite, ...}`

`CapabilityDelegation` is similarly split:

- **Create-proof mode** — pass `{parentCapability}`
- **Verify-proof mode** — pass `{expectedRootCapability, suite, ...}`

### Key Algorithms

**`dereferenceCapabilityChain`** (`utils.ts`): Walks the embedded proof chain
from tail to root, validates structure (no cycles, congruent lengths, absolute
URIs), then dereferences the root via a verifier-supplied trusted
`getRootCapability` hook. Returns an ordered array `[root, ...delegated, tail]`.

**`_verifyCapabilityChain`** (`CapabilityProofPurpose.ts`): Iterates root →
tail, calling `jsigs.verify` for each delegation proof and re-checking
delegation invariants (allowedAction, target, expires, timing, TTL). Uses
`_verifiedParentCapability` to avoid re-verifying already-checked parent
segments.

**`inspectCapabilityChain`** hook: After chain verification succeeds, calls a
user-supplied async function with the full
`{capabilityChain, capabilityChainMeta}` — the intended extension point for
revocation checks.

### Dependencies

| Package                        | Role                                                                                                 |
| ------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `@interop/jsonld-signatures`   | Core LD proof creation/verification; provides `ControllerProofPurpose` base class and `jsigs.verify` |
| `@interop/data-integrity-core` | Shared zcap interfaces (`IRootZcap`, `IDelegatedZcap`, `IZcap`, `IDocumentLoader`, …)                |
| `@digitalbazaar/zcap-context`  | JSON-LD context document for `https://w3id.org/zcap/v1`                                              |

Dev dependencies use the `@interop/` forks for test fixtures:
`@interop/ed25519-signature` (`Ed25519Signature2020`),
`@interop/ed25519-verification-key` (`Ed25519VerificationKey`),
`@interop/security-document-loader` (`securityLoader`), and
`@interop/did-method-key` (for `did:key` test actors). Assertions use Vitest's
native `expect` (no chai).

## Testing

```sh
pnpm test              # lint + test-node + test-browser
pnpm run test-node     # Vitest (Node)
pnpm run test-browser  # Playwright (Chromium)
pnpm run test-coverage # Vitest coverage (v8)
pnpm run lint          # ESLint (flat config)
```

Tests live in `test/`:

- `test/node/zcap.test.ts` — the full suite (ported from the upstream
  `test-common.js`; runs under Vitest with native `expect`).
- `test/node/documentLoader.ts` — `securityLoader()`-based loader plus a mutable
  `remoteDocuments` registry (`addToLoader`).
- `test/node/mock-data.ts`, `test/node/helpers.ts` — fixtures and the
  `Controller`/`uuid` helpers.
- `test/browser/roundtrip.{entry,spec}.ts` — one representative
  create→delegate→invoke→verify roundtrip run in real Chromium.

Test actors: Alice, Bob, Carol, and Diana are static `https://example.com/i/...`
controllers with fixed Ed25519 keys (so the pre-signed delegation/invocation
fixtures stay byte-identical); `alpha` is generated fresh as a `did:key` and
resolved automatically by the loader.

## Types

Source is TypeScript; the public type surface is emitted to `dist/*.d.ts`.
zcap-specific option/result types live in `src/types.ts`, which also re-exports
the shared zcap interfaces (`IRootZcap`, `IDelegatedZcap`,
`ICapabilityDelegationProof`, `IZcap`) from `@interop/data-integrity-core/zcap`
rather than redefining them.

## Conventions

- ESM only (`"type": "module"`); no CommonJS shims.
- No transpilation at runtime — compiled output in `dist/` runs directly in
  Node >= 24 and modern browsers.
- All capability IDs and `invocationTarget` values must be absolute URIs
  (contain `:`). This is validated at both creation and verification time.
- Root zcaps are always passed as **strings** (their ID) in proof creation;
  delegated zcaps are passed as **objects**.
- Clock skew tolerance defaults to `maxClockSkew = 300` seconds.
- Delegation chain length defaults to `maxChainLength = 10`.
- Tooling: ESLint flat config + Prettier (no semicolons, single quotes), Vitest
  (Node) + Playwright (browser). Build is `tsc` (full build to `dist/`).

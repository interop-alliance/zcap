# zcap _(@interop/zcap)_

[![CI](https://github.com/interop-alliance/zcap/workflows/CI/badge.svg)](https://github.com/interop-alliance/zcap/actions?query=workflow%3ACI)
[![NPM Version](https://img.shields.io/npm/v/@interop/zcap.svg)](https://npm.im/@interop/zcap)

> JavaScript reference implementation for
> [Authorization Capabilities](https://w3c-ccg.github.io/zcap-spec/).

## Table of Contents

- [Background](#background)
- [Security](#security)
- [Install](#install)
- [Usage](#usage)
- [Develop](#develop)
- [Contribute](#contribute)
- [Commercial Support](#commercial-support)
- [License](#license)

## Background

TODO

## Security

TBD

## Install

- Modern browsers and Node.js >= 24 are supported.

This is an ESM-only package (`"type": "module"`); the published build lives in
`dist/` (compiled JS + `.d.ts` type declarations).

To install from NPM:

```sh
npm install @interop/zcap
```

To install locally (for development):

```sh
git clone https://github.com/interop-alliance/zcap.git
cd zcap
pnpm install
```

## Usage

### Caveats

A caveat is a restriction that a zcap carries in its `caveat` property. The
value is one caveat object or an array of them. Each caveat has a `type`, which
is a non-empty string. Any other properties belong to that caveat type.

```js
const delegatedZcap = {
  '@context': ['https://w3id.org/zcap/v1'],
  id: 'urn:uuid:6f2d1c0e-3f0b-4a55-9d5e-0c1f5a2b7e11',
  parentCapability: rootZcap.id,
  controller: 'did:key:z6Mk...',
  invocationTarget: 'https://example.com/spaces/123/notes',
  expires: '2027-01-01T00:00:00Z',
  caveat: [{ type: 'urn:example:caveat:OwnResourcesOnly' }]
}
```

Both root and delegated zcaps can carry caveats.

#### Unsupported caveats are refused

This library defines no caveat types of its own. A verifier refuses any chain
that contains a caveat it has no handler for. Verification fails with an error
whose `name` is `UnsupportedCaveatError`. A malformed `caveat` value fails the
same way, and `checkCapability` rejects it too.

The check covers the root zcap and every delegated zcap in the chain. It runs
under both `CapabilityInvocation` and `CapabilityDelegation`.

```js
const result = await jsigs.verify(invocation, {
  documentLoader,
  suite: new Ed25519Signature2020(),
  purpose: new CapabilityInvocation({
    expectedAction: 'PUT',
    expectedTarget: 'https://example.com/spaces/123/notes',
    expectedRootCapability: rootZcap.id,
    suite: new Ed25519Signature2020()
  })
})

// result.verified === false
// result.error.errors[0].name === 'UnsupportedCaveatError'
```

Match on the error `name`. An `instanceof` check fails when two copies of the
package are loaded.

#### Registering caveat handlers

To support a caveat type, pass a `supportedCaveats` map when verifying. The keys
are caveat type strings and the values are async handlers. Registering a handler
is what marks a type as supported.

```js
const supportedCaveats = new Map([
  [
    'urn:example:caveat:OwnResourcesOnly',
    async ({
      caveat,
      capability,
      capabilityChain,
      proof,
      proofPurpose,
      capabilityAction,
      invocationTarget,
      date
    }) => {
      // `capability` is the zcap that carries `caveat`
      // `capabilityChain` is the full verified chain, root first
      return { valid: true }
    }
  ]
])

const purpose = new CapabilityInvocation({
  expectedAction: 'PUT',
  expectedTarget: 'https://example.com/spaces/123/notes',
  expectedRootCapability: rootZcap.id,
  suite: new Ed25519Signature2020(),
  supportedCaveats
})
```

Handlers run last. By then the whole chain has been verified and the
`inspectCapabilityChain` hook has accepted it. A handler only sees capabilities
with valid delegation proofs that the hook did not reject, for example as
revoked. The library calls a handler once for each caveat of its type, in chain
order from root to tail.

The library looks up the handlers before it verifies any delegation proof. If
any caveat in the chain has no handler, the chain is refused at that point and
no handler runs.

Each handler also receives the proof being verified.

| Option             | Value                                                           |
| ------------------ | --------------------------------------------------------------- |
| `proof`            | The invocation proof, or the tail zcap's delegation proof       |
| `proofPurpose`     | `capabilityInvocation` or `capabilityDelegation`                |
| `capabilityAction` | The invoked action (invocation proofs only)                     |
| `invocationTarget` | The target named by the invocation proof (invocation only)      |
| `date`             | The `Date` the chain is verified against (`date` option or now) |

A handler runs whenever the chain is verified, for a delegation as well as an
invocation. Check `proofPurpose` if the caveat only applies to invocations.
Verification can still fail after a handler has answered, for example when a
later handler rejects its caveat. Keep handlers free of side effects such as
counting uses.

A chain may carry at most `maxCaveats` caveats, counted across all of its zcaps.
The default is 100. A chain over the limit is refused before any delegation
proof is verified.

A handler fails the chain by returning `{ valid: false }`. The verification
error is then the `error` the handler returned. If it returned none, the error
`name` is `CaveatNotSatisfiedError`. An error thrown by a handler also fails the
chain.

#### Enforcing a caveat outside the handler

Some caveats depend on state the verifier does not have. Take a caveat that lets
a guest edit only the resources they created. Only the storage layer can decide
that, at write time.

In that case the handler returns `{ valid: true }`, and the caller enforces the
caveat itself. The purpose result lists every caveat found, each with the zcap
that carries it.

```js
const result = await jsigs.verify(invocation, {
  documentLoader,
  suite: new Ed25519Signature2020(),
  purpose
})
if (result.verified) {
  const { caveats } = result.results[0].purposeResult
  for (const { caveat, capability } of caveats) {
    // enforce `caveat` here, e.g. when writing to storage
  }
}
```

`caveats` is ordered root to tail. It is an empty array when the chain has no
caveats. The `inspectCapabilityChain` hook receives the same list.

#### Choosing a caveat type

The library looks up a handler by the `type` string exactly as it appears in the
zcap. Using an absolute URI as the `type` works with every proof suite and needs
no extra context.

A suite that signs zcaps as JSON-LD, such as `Ed25519Signature2020`, fails to
sign any term that the `@context` does not define. With such a suite:

- A `type` must be an absolute URI, or a term defined in an extra `@context`
  entry of the zcap. A bare name such as `OwnResourcesOnly` fails to sign.
- Any other caveat property must be a term defined in an extra `@context` entry.
  An absolute URI is refused as a property name (see below).

### Accepted zcap shape

A suite that signs the RDF form of a zcap accepts more than one JSON form of the
same zcap. The holder of a zcap could use that to move a signed `allowedAction`
or `caveat` to an equivalent property name that the verifier does not read. The
library closes this by accepting a single JSON form. `checkCapability` and
verification both apply these rules.

- Every `@context` entry of a delegated zcap is a string. An inline context
  object is refused.
- Every property name is a plain term. A name that contains `:` (an IRI or
  compact IRI) or starts with `@` (a JSON-LD keyword) is refused. This applies
  at any depth, including inside caveats. The `proof` value is left to the proof
  suite.
- When verifying, a delegated zcap may list only allowed contexts. These are the
  zcap context, the context of each `suite` passed to the purpose, and any URL
  in the `allowedContexts` option.

```js
const purpose = new CapabilityInvocation({
  expectedAction: 'PUT',
  expectedTarget: 'https://example.com/spaces/123/notes',
  expectedRootCapability: rootZcap.id,
  suite: new Ed25519Signature2020(),
  supportedCaveats,
  // the context that defines this verifier's caveat terms
  allowedContexts: ['https://example.com/contexts/caveats/v1']
})
```

Only allow contexts you control or have reviewed. A context that defines a
second term for `allowedAction` or `caveat` brings the problem back.

## Develop

The source is TypeScript under `src/`; tests use [Vitest](https://vitest.dev)
(Node) and [Playwright](https://playwright.dev) (browser).

```sh
pnpm run build         # compile src/ -> dist/ (JS + .d.ts)
pnpm run lint          # ESLint (flat config) over src + test
pnpm run format        # Prettier
pnpm run test-node     # Vitest (Node)
pnpm run test-browser  # Playwright (Chromium) — run `pnpm exec playwright install chromium` once
pnpm test              # lint + test-node + test-browser
```

## Contribute

See [the contribute file](./CONTRIBUTING.md)!

PRs accepted.

If editing the Readme, please conform to the
[standard-readme](https://github.com/RichardLitt/standard-readme) specification.

## Commercial Support

Commercial support for this library is available upon request from Interop
Alliance: support@interop.com

## License

[New BSD License (3-clause)](LICENSE) © Digital Bazaar

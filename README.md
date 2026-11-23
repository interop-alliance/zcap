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

#### Invoking a DID-targeted chain at an https URL

A chain may carry targets such as `did:webvh:<scid>:alice.example/images/x.jpg`
while the request is made to an https URL. Pass an async `dereferenceTarget`
hook to `CapabilityInvocation` to map the invoked capability's target to the
absolute URI that the proof's `invocationTarget` is compared against.

```js
const purpose = new CapabilityInvocation({
  expectedAction: 'GET',
  expectedTarget: 'https://alice.example/images/x.jpg',
  expectedRootCapability: rootZcap.id,
  suite: new Ed25519Signature2020(),
  dereferenceTarget: async ({ invocationTarget }) =>
    mapDidUrlToHttps(invocationTarget)
})
```

The hook result is compared with the proof's `invocationTarget` as a capability
target of that form would be. The two must be equal, or the result must be a
prefix when `allowTargetAttenuation` is set. An https result follows the https
rule, so the request may extend the path at a `/` boundary or add a query. For a
`did:` capability target, the hook must consume the DID URL's selectors and
return a URI with no query or fragment. A result that carries `?` or `#` is
refused. A selector pins the DID document version that produces the https URL. A
query on the https request is an ordinary https query, so it is not limited by
the pin. The hook runs only for the invoked capability, not for delegation
links. It must return an absolute URI string, or verification fails.

The hook runs after the chain and the invocation are verified. It only sees the
target of a capability with valid delegation proofs, invoked by its controller.

The hook is called for every invocation once configured, including one whose
chain is already in https space. It must return a target it does not map
unchanged.

The mapping must be deterministic, and it must keep the path of the target
intact. A target that is not a DID URL keeps its query too. Delegation links are
compared in the chain's own URI space, and only the final comparison uses the
mapped value. A mapping that drops the path would let a capability narrowed to
one resource authorize the whole host when `allowTargetAttenuation` is set.

The mapped value is passed to `inspectCapabilityChain` and to the caveat
handlers as `dereferencedTarget`. It is also set on the purpose result. The
capabilities in the chain keep their original targets, so a handler that
compares paths should use `dereferencedTarget` together with the proof's
`invocationTarget`.

#### DID URL target attenuation

When both the parent and the child `invocationTarget` start with `did:` and
`allowTargetAttenuation` is set, the path and the selectors are checked
separately. The target is split at its first `?` or `#`. Everything from there
on is the selector part, and the rest is the path part.

The child path must equal the parent path or extend it at a `/` boundary. The
child selector part must be byte-identical to the parent's. The one exception is
the link directly beneath the root capability. When the root has no selector
part, that link may carry any selector part. At invocation time, without a
`dereferenceTarget` hook, the selectors must match the invoked capability's
exactly. This also holds for the root capability, so it cannot be invoked with
an added query.

A DID URL capability target invoked without a `dereferenceTarget` hook is
compared against the DID URL itself under this rule. When a hook maps it to
another URI, the mapped target is compared under the rule for its own form
instead. A `did:` result follows the DID URL rule, with no root exception.

With `allowTargetAttenuation`, a narrowed target of any kind is refused if its
path has a `.` or `..` segment, including the percent-encoded `%2e` form. A
backslash and the encoded separators `%2f` and `%5c` count as segment
boundaries, so `..%2fprivate` is refused too. Creating a delegation also fails
when the parent capability is passed as an object and the new target is not at
or beneath the parent's.

A target that starts with `did:` is never an attenuation of one that does not,
or the other way around. Without `allowTargetAttenuation`, targets must be
equal. The rule for other targets is unchanged. `isValidTarget` takes an
optional `baseIsRoot` flag for the root exception.

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

| Option               | Value                                                           |
| -------------------- | --------------------------------------------------------------- |
| `proof`              | The invocation proof, or the tail zcap's delegation proof       |
| `proofPurpose`       | `capabilityInvocation` or `capabilityDelegation`                |
| `capabilityAction`   | The invoked action (invocation proofs only)                     |
| `invocationTarget`   | The target named by the invocation proof (invocation only)      |
| `dereferencedTarget` | The invoked zcap's target as mapped by `dereferenceTarget`      |
| `date`               | The `Date` the chain is verified against (`date` option or now) |

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

### Expired capabilities

Verifying an invocation fails with a `CapabilityExpiredError` when the invoked
capability or a capability in its delegation chain has expired. Verifying a
delegation fails the same way when the delegated capability or one of its
ancestors has expired. Match on the error's `name`.

```js
// result.verified === false
// result.error.errors[0].name === 'CapabilityExpiredError'
```

When verification fails with this error, every delegation proof in the chain has
verified. An invocation also comes from the controller of the invoked
capability. A chain that holds an expired capability and a forged or altered
delegation fails with the proof error instead. The same holds for any other
delegation rule that the chain breaks, such as a relaxed `allowedAction`.

This covers verification only. Signing a delegation of an expired capability
throws the same error with no proof checked.

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

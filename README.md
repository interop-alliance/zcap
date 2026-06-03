# zcap _(@interop/zcap)_

[![CI](https://github.com/interop-alliance/zcap/workflows/CI/badge.svg)](https://github.com/interop-alliance/zcap/actions?query=workflow%3ACI)
[![NPM Version](https://img.shields.io/npm/v/@interop/zcap.svg)](https://npm.im/@interop/zcap)

> JavaScript reference implementation for
[Authorization Capabilities](https://w3c-ccg.github.io/zcap-spec/).

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

TBD

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

Commercial support for this library is available upon request from
Digital Bazaar: support@interop.com

## License

[New BSD License (3-clause)](LICENSE) © Digital Bazaar

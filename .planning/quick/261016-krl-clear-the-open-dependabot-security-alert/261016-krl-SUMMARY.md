---
phase: quick-261016-krl
plan: 01
subsystem: dependencies (root, companion, discord-bot lockfiles)
tags: [deps, security, dependabot]
requirements: []
key-files:
  modified:
    - package.json
    - package-lock.json
    - companion/package-lock.json
    - discord-bot/package-lock.json
status: complete
completed: 2026-10-16
---

# Quick 261016-krl: clear the open Dependabot security alerts

## Commits

- PR #417 (bc6814f2): `npm audit fix` in companion/ and discord-bot/
- PR #418 (4e3d5c8a): ten Dependabot root bumps combined (next 16.3.8, dompurify, brace-expansion, undici 7.30.0, js-yaml, baseline-browser-mapping, vitest 4.1.11, fflate, @humanfs/node, postcss-selector-parser)
- PR #424: sharp 0.35.5, source-map-js 1.2.2, browserslist 4.29.3 (Dependabot's rebased branches combined)

## What changed

- Companion: electron 43.0.0 to 43.8.0, @xmldom/xmldom 0.8.15, fast-uri 3.1.8, undici 6.29.1 / 7.30.1, js-yaml 4.3.2, brace-expansion, nanoid, http-cache-semantics, source-map-js, fast-glob, electron-builder-squirrel-windows. Lockfile only.
- Discord bot: undici 6.28.0 to 6.29.1.
- Root: every critical and high alert with a patched version. package.json moves next to ^16.3.8, vitest to ^4.1.11 and the sharp override to ^0.35.5.
- 16 superseded Dependabot PRs closed with a pointer (#259, #260, #261, #262, #263, #265, #266, #270, #306, #310, #312, #336, #345, #347, #348, #349); #268 closed by Dependabot in favour of #421; #419 (companion tailwind 3 to 4) closed because the Companion build fails on it.

## Verification

- Companion locally: `npm run typecheck` clean, `npm run build` produces out/main, out/preload and out/renderer, 72 unit tests pass; discord-bot loads undici.
- #417 and #418: Test, Companion, CodeQL, Analyze (actions), Analyze (javascript-typescript) all pass; main CI on 4e3d5c8a watched.
- #424: CI pending at the time of writing.

## Deviations from Plan

- Root `npm audit fix` and `npm update` cannot run on this machine (private registry auth), so the root lockfile was assembled from Dependabot branches rather than regenerated.

## Flags for the user

- Locally `npm ci` fails with E401 on npm.hugeicons.com: there is no token in ~/.npmrc or the repo. Add one (`npm login --registry=https://npm.hugeicons.com` or the `//npm.hugeicons.com/:_authToken` line) if you want root installs to work outside CI.
- Still open after this task: extract-zip via @puppeteer/browsers (no patched version, needs puppeteer 25), the eslint-config-next and tailwindcss 3 micromatch chain (majors), the companion electron-builder chain (moderate, major), and #422 (next 16.4.2, a feature minor with no alert behind it).

## Known Stubs

None.

## Threat Flags

None: dependency bumps only, no new surface.

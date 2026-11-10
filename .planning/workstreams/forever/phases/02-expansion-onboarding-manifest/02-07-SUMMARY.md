---
phase: 02-expansion-onboarding-manifest
plan: 07
subsystem: testing
tags: [zod, snapshot, provenance, allowlist-ratchet, wago, vitest]

requires:
  - phase: 02-expansion-onboarding-manifest
    provides: "FOREVER_MANIFEST and ExpansionManifestSchema (plan 02-02)"
provides:
  - "ReferenceSnapshotSchema, ReferenceSnapshot and canonicalSnapshotPayload (strict zod, provenance invariants, sha256 input)"
  - "Committed placeholder data/expansions/forever/reference/wago.json (build, fetchedAt, sha256 null; empty tables)"
  - "provisional-allowlist.json with the nine provisional bosses and the shrink-only PROVISIONAL_CEILING = 9 ratchet"
  - "Pure checks: checkProvisionalAllowlist, findPromotableBosses, checkVerifiedEncounters"
affects: [02-08, 02-09, 02-10]

actuals:
  tokens: 7700
  tasks: 2
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Placeholder-first reference snapshot: committed with null provenance so nothing waits on the network (D-14)"
    - "Count ratchet: an allowlist whose size must equal a named constant, so growth needs a visible reviewed edit (D-15)"
    - "Source-scan test with patterns built from fragments so the test does not match its own scan"

key-files:
  created:
    - domain/expansion/reference-snapshot-schema.ts
    - data/expansions/forever/reference/wago.json
    - data/expansions/forever/provisional-allowlist.json
    - data/expansions/forever/reference-check.ts
    - data/expansions/__tests__/forever-reference.test.ts
  modified: []

key-decisions:
  - "Snapshot schema stays out of the domain/expansion barrel; elsewhere it is imported type-only"
  - "sha256 input is canonicalSnapshotPayload({ build, tables }): recursively sorted keys, rows sorted by ID, fetchedAt excluded"
  - "No .ts file owned by this plan names the wago host or calls fetch; the host lives only in the placeholder JSON"

patterns-established:
  - "Promotion is forced, not remembered: a snapshot row naming an allowlisted boss fails the reference test until the manifest, allowlist and ceiling all change in one PR"

requirements-completed: [EXPN-06, EXPN-01]

coverage:
  - id: D1
    description: "Strict ReferenceSnapshotSchema with provenance invariants and canonicalSnapshotPayload, and a committed placeholder snapshot that validates"
    requirement: "EXPN-06"
    verification:
      - kind: unit
        ref: "data/expansions/__tests__/forever-reference.test.ts#committed placeholder snapshot (D-14)"
        status: pass
      - kind: unit
        ref: "data/expansions/__tests__/forever-reference.test.ts#ReferenceSnapshotSchema strictness and provenance invariants"
        status: pass
      - kind: unit
        ref: "data/expansions/__tests__/forever-reference.test.ts#canonicalSnapshotPayload (the sha256 input)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Shrink-only provisional allowlist ratchet (ceiling 9, reviewed D-15 growth exception) and forced promotion when a snapshot names an allowlisted boss"
    requirement: "EXPN-01"
    verification:
      - kind: unit
        ref: "data/expansions/__tests__/forever-reference.test.ts#provisional allowlist ratchet (D-15)"
        status: pass
      - kind: unit
        ref: "data/expansions/__tests__/forever-reference.test.ts#promotion forced by a snapshot (D-15)"
        status: pass
      - kind: unit
        ref: "data/expansions/__tests__/forever-reference.test.ts#checkVerifiedEncounters"
        status: pass
    human_judgment: false
  - id: D3
    description: "Prohibition 1: no .ts file in this plan names the wago host or calls fetch"
    requirement: "EXPN-06"
    verification:
      - kind: unit
        ref: "data/expansions/__tests__/forever-reference.test.ts#no live fetch from this plan (prohibition 1)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Roadmap success criterion 5, snapshot half: real wago rows replace the placeholder after the first successful refresh"
    requirement: "EXPN-06"
    verification: []
    human_judgment: true
    rationale: "The committed snapshot is a placeholder by design (D-14); the first successful refresh workflow_dispatch run (plan 02-09) is a manual acceptance step no test can assert today"

duration: 13min
completed: 2026-10-16
status: complete
---

# Phase 2 Plan 07: Reference Snapshot Schema and Provisional-Boss Ratchet Summary

**Strict zod snapshot schema with null-build provenance rules and a committed placeholder, plus a nine-entry provisional allowlist whose size is pinned by `PROVISIONAL_CEILING = 9`, so a future wago hit forces a same-PR promotion.**

## Performance

- **Duration:** 13 min
- **Started:** 2026-10-16T18:51:56Z
- **Completed:** 2026-10-16T19:05:00Z
- **Tasks:** 2 (Task 1 tracer, owner approved the checkpoint; Task 2 auto)
- **Files modified:** 5 (all created)

## Accomplishments

- `ReferenceSnapshotSchema` rejects unknown keys, non-integer ids, a null build with data or provenance, a set build without `fetchedAt` or `sha256`, a build outside `buildPrefix`, and malformed hashes. `canonicalSnapshotPayload` is the single hash input and is order-insensitive.
- `wago.json` is committed as the D-14 placeholder (build, `fetchedAt`, `sha256` null; three empty tables; product and prefix match `FOREVER_MANIFEST.reference`), so the reference test is green with nothing fetched.
- The allowlist holds the nine provisional bosses (eight Barrow Deeps, Onyxia) in manifest order. `checkProvisionalAllowlist` enforces all three ratchet rules and the count equal to `PROVISIONAL_CEILING`, with distinct messages for "lower the ceiling" (fewer) and "needs the reviewed D-15 exception" (more).
- `findPromotableBosses` matches normalized names (case and spacing variants) against `DungeonEncounter` rows and returns the encounter id; the reference test fails with a message naming the bosses, the manifest edit, the allowlist removal and the ceiling decrement. `checkVerifiedEncounters` checks that a `wago-dungeon-encounter` verification cites an id present in the snapshot.
- A source scan asserts this plan's `.ts` files hold neither the wago host nor a `fetch(` call.

## Task Commits

1. **Task 1: Tracer, strict snapshot schema and committed placeholder (TDD)**
   - `a1dd65a3` (test, RED)
   - `8153d4e1` (feat, GREEN)
2. **Task 2: Allowlist ratchet and forced promotion (TDD)**
   - `60b31154` (test, RED)
   - `bc5e2e69` (feat, GREEN)

**Plan metadata:** the docs commit that carries this file (docs: complete plan).

## Files Created/Modified

- `domain/expansion/reference-snapshot-schema.ts` - strict zod schema, `ReferenceSnapshot` type, `canonicalSnapshotPayload`; not in the domain barrel
- `data/expansions/forever/reference/wago.json` - committed placeholder snapshot (two-space indent, trailing newline)
- `data/expansions/forever/provisional-allowlist.json` - nine `{ raid, bossKey, name }` entries in manifest order
- `data/expansions/forever/reference-check.ts` - `PROVISIONAL_CEILING`, `checkProvisionalAllowlist`, `findPromotableBosses`, `checkVerifiedEncounters`, plus `ProvisionalAllowlistEntry` and `PromotableBoss` types
- `data/expansions/__tests__/forever-reference.test.ts` - 42 tests: placeholder, schema strictness, hash input, ratchet, promotion, verified encounters, source scan

## Decisions Made

- The new exported types `ProvisionalAllowlistEntry` and `PromotableBoss` live in `reference-check.ts` next to the checks that use them; the plan listed only the four functions and constant, so these are additive.
- Ratchet error messages carry the boss key and raid so a reviewer sees which entry to fix; the "fewer" message names the exact ceiling value to set.
- Source-scan patterns are assembled from fragments (`['wago','tools'].join('.')`, `['fetch','('].join('')`) so the test file never matches its own scan.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Comments in two Task 1 files named the wago host, tripping prohibition 1**
- **Found during:** Task 2 (GREEN run of the new source scan)
- **Issue:** The header comment of `reference-snapshot-schema.ts` and a comment in `forever-reference.test.ts` (both from Task 1) contained the host string. The plan says no `.ts` file in this plan holds the host.
- **Fix:** Reworded both comments ("committed wago reference snapshot", "the wago service answered 503"). Comment-only change, no behavior change.
- **Files modified:** `domain/expansion/reference-snapshot-schema.ts`, `data/expansions/__tests__/forever-reference.test.ts`
- **Verification:** The scan test passes; `data/expansions` and the golden suite pass (85 tests).
- **Committed in:** `bc5e2e69` (part of the Task 2 GREEN commit)

---

**Total deviations:** 1 auto-fixed (1 Rule 1)
**Impact on plan:** None on scope. The scan did its job on the first run.

## Issues Encountered

- A first attempt to apply the comment fix with BSD `sed -i` failed on macOS syntax; redone with a short Python edit. No files were affected by the failed attempt.
- `npm run typecheck` reports one error in `.next/dev/types/validator.ts` (missing generated route type). It is the known pre-existing noise, outside this plan's files; no error in any touched file.

## Verification Results

- `CI=true npx vitest run data/expansions app/services/__tests__/expansionSeeder-golden.test.ts`: 4 files, 85 tests pass. The golden suite was run unchanged (`CI=true`, no `-u`).
- `npx eslint` on the three touched `.ts` files: clean.
- Acceptance checks: allowlist has 9 entries each with raid, bossKey and name (pass); `grep -c "PROVISIONAL_CEILING = 9"` prints 1; `grep -c findPromotableBosses` on the test prints 6; barrel has no `reference-snapshot` reference (pass); `git diff --quiet -- data/expansions/forever/reference/wago.json` exits 0 after the run.

## Verifier notes

- **Roadmap success criterion 5, snapshot half: conditionally met.** Under D-14 the committed `data/expansions/forever/reference/wago.json` is a placeholder (build, fetchedAt and sha256 null, every table empty). Its provenance fields are a source template, not data from a pull, and the reference test cannot catch a wrong boss name until the refresh workflow (plan 02-09) has succeeded once.
- SC5 conditionally met: placeholder committed; real snapshot pending first successful refresh (first `workflow_dispatch` run is a manual acceptance step).

## Known Stubs

None that block the plan's goal. The empty snapshot tables and null `build`, `fetchedAt` and `sha256` in `wago.json` are the intentional D-14 placeholder; plans 02-08 (library and CLI) and 02-09 (workflow) populate it.

## Threat Flags

None. No new network endpoint, auth path or schema at a trust boundary; the mitigations T-02-07-01 to T-02-07-04 are implemented as planned (strict schema, sha256 recheck for non-null builds, placeholder keeps the gate green, ceiling-pinned allowlist).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 02-08 imports `ReferenceSnapshotSchema`, `ReferenceSnapshot` and `canonicalSnapshotPayload` from `@/domain/expansion/reference-snapshot-schema` (type-only wherever zod must not load). It must hash `canonicalSnapshotPayload({ build, tables })` and write the file as `JSON.stringify(snapshot, null, 2)` plus a trailing newline (the test pins this format). The `source` template to write is the same string as in the placeholder.
- Plan 02-09's no-live-fetch scan must treat `data/expansions/**` and `domain/expansion/reference-snapshot-schema.ts` as no-host, no-`fetch(` territory; this plan's own scan covers exactly three files: the schema module, `reference-check.ts` and `forever-reference.test.ts`.
- Plan 02-13 touches different files and is unaffected.

---
*Phase: 02-expansion-onboarding-manifest*
*Completed: 2026-10-16*

## Self-Check: PASSED

- Created files exist: `domain/expansion/reference-snapshot-schema.ts`, `data/expansions/forever/reference/wago.json`, `data/expansions/forever/provisional-allowlist.json`, `data/expansions/forever/reference-check.ts`, `data/expansions/__tests__/forever-reference.test.ts`
- Commits exist: `a1dd65a3`, `8153d4e1`, `60b31154`, `bc5e2e69`

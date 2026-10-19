---
phase: 02-expansion-onboarding-manifest
plan: 04
subsystem: api
tags: [expansion-registry, catalog-adapters, seeder, vitest, golden-files]

requires:
  - phase: 02-expansion-onboarding-manifest
    provides: "02-01 golden files for the five legacy expansions; 02-02 manifest schema; 02-03 EXPANSION_PHASES.forever and the native Forever catalog data"
provides:
  - "data/expansions/types.ts: type-only shared registry and catalog types"
  - "data/expansions/registry.ts: client-safe EXPANSION_REGISTRY (12 stored names, slug, game, seedMode, hasData) and getExpansionMeta"
  - "data/expansions/catalogs.ts: server-only legacy adapters plus the native Forever catalog, behind getExpansionCatalog"
  - "app/services/expansionSeeder.ts derives definitions, SUPPORTED_EXPANSIONS and getAvailableExpansions from the registry; no display-name selection chains remain"
  - "raid-phase-coverage checks Forever's three manifest raids against EXPANSION_PHASES.forever through the registry slug"
affects: [02-05, 02-06, 02-08, expansion-onboarding]

actuals:
  tokens: 8400
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Registry keyed by stored expansions.name; slug is a registry field, not a second map"
    - "Catalogs are a discriminated union (legacy | native), so an expansion without its own classification map cannot fall back to Classic"
    - "Coverage checks take the phase list as an argument so a mutated copy can prove the check fires"

key-files:
  created:
    - data/expansions/types.ts
    - data/expansions/registry.ts
    - data/expansions/catalogs.ts
  modified:
    - app/services/expansionSeeder.ts
    - app/services/__tests__/raid-phase-coverage.test.ts

key-decisions:
  - "EXPANSION_NAME_TO_SLUG stays without a Forever key; the public reserve-run route keys off it (research Pitfall 1), so tests and new callers read slugs from the registry"
  - "The Forever mutated-copy proof uses two cases: a catalog raid missing from the phase list (unphased) and a phase-list name missing from the catalog (orphan), because removing a raid from the phase list is not an orphan"

patterns-established:
  - "Registry slug lookup: getExpansionMeta(storedName)?.slug"
  - "Native versus legacy catalog: getExpansionCatalog('Forever') returns kind 'native'; the five legacy names return kind 'legacy'"

requirements-completed: [EXPN-02, EXPN-03]

coverage:
  - id: D1
    description: "The seeder resolves all six data-bearing expansions through the registry and their catalog adapters; legacy rows are byte-identical"
    requirement: "EXPN-03"
    verification:
      - kind: unit
        ref: "app/services/__tests__/expansionSeeder-golden.test.ts (CI=true, five golden files unchanged)"
        status: pass
    human_judgment: false
  - id: D2
    description: "No hand-written expansion table, selection chain or display-name comparison remains in the seeder (comment-stripped source check)"
    requirement: "EXPN-02"
    verification:
      - kind: other
        ref: "node comment-stripped scan of app/services/expansionSeeder.ts for EXPANSION_DATA|classificationMap|roleMap|displayName ==="
        status: pass
    human_judgment: false
  - id: D3
    description: "raid-phase-coverage covers Forever through the registry slug, including mutated-copy cases that fail with messages naming the raid and slug 'forever'"
    requirement: "EXPN-02"
    verification:
      - kind: unit
        ref: "app/services/__tests__/raid-phase-coverage.test.ts#the Forever path is checked, not skipped"
        status: pass
    human_judgment: false

duration: n/a (wall clock spans a human checkpoint after Task 1)
completed: 2026-10-17
status: complete
---

# Phase 02 Plan 04: Expansion registry and catalog adapters Summary

**One twelve-entry registry plus legacy and native catalog adapters now drive the seeder, with the five legacy golden files unchanged and Forever's three raids checked against its own phase list through the registry slug.**

## Performance

- **Duration:** not measured; the wall clock includes the wait for the Task 1 checkpoint approval
- **Dispatched:** 2026-10-16T22:30:00Z (continuation after Task 1 approval)
- **Completed:** 2026-10-17
- **Tasks:** 2 of 2
- **Files modified:** 5 (3 created, 2 modified)

## Accomplishments

- Registry keyed by stored expansion name with slug, game, seed mode and hasData; Forever is the only `sync` seed mode and the only native catalog.
- `expansionSeeder.ts` lost its hand-written table and display-name chains: classification and roles come from `catalog.classify` and `catalog.rolesFor`, and a legacy catalog returns `'Unlimited'` and `[]` for an unknown item exactly like the old defaults.
- `raid-phase-coverage` now runs for all six data-bearing expansions, Forever included, and a mutated copy of the Forever phase list proves the check is live.

## Task Commits

1. **Task 1: tracer, registry, catalog adapters, seeder refactor** - `3dc0113f` (feat)
2. **Task 2: phase coverage test checks Forever through the registry slug** - `dfddf5e9` (test)

**Plan metadata:** the docs(02-04) SUMMARY commit and the state/roadmap commit follow this file.

## Files Created/Modified

- `data/expansions/types.ts` - type-only shared registry and catalog types (no runtime import)
- `data/expansions/registry.ts` - client-safe `EXPANSION_REGISTRY` and `getExpansionMeta` (own-key lookup, so prototype names return null)
- `data/expansions/catalogs.ts` - server-only legacy adapters and the native Forever catalog, `getExpansionCatalog`
- `app/services/expansionSeeder.ts` - definitions, SUPPORTED_EXPANSIONS and available expansions derived from the registry
- `app/services/__tests__/raid-phase-coverage.test.ts` - registry slug lookups, `phaseListProblems` helper, Forever mutated-copy cases, rewritten comment (d)

## Decisions Made

- `EXPANSION_NAME_TO_SLUG` and the reserve-run route were not touched; plan 02-05 pins both.
- Failure messages in the coverage helper name both the stored expansion name and the slug.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Slug lookups moved to `getExpansionMeta` during Task 1**
- **Found during:** Task 1
- **Issue:** `raid-phase-coverage.test.ts` could not pass untouched once Forever had raids but no `EXPANSION_NAME_TO_SLUG` key, so Task 1 could not go green without editing the test.
- **Fix:** The four slug lookups were moved to `getExpansionMeta(expansionName)?.slug` in the Task 1 commit; Task 2 then owned the comment rewrite, the mutated-copy cases and the slug-naming messages.
- **Files modified:** `app/services/__tests__/raid-phase-coverage.test.ts`
- **Committed in:** `3dc0113f`

**2. [Process] No separate RED commit for Task 1**
- **Found during:** Task 1
- **Issue:** Task 1 is a behaviour-preserving refactor; the 02-01 golden suite is the spec and already passed before and after.
- **Fix:** No failing-test commit was written; the golden suite under `CI=true` is the proof.
- **Committed in:** n/a

**3. [Process] Commit `3dc0113f` carries a `Claude Sonnet 5.5` trailer**
- **Found during:** Task 1
- **Issue:** The commit trailer reads `Co-Authored-By: Claude Sonnet 5.5` instead of the standard `Claude Fable 5.1` line used by the other commits in this plan.
- **Fix:** Not rewritten, since the commit is already part of approved history. Task 2's commit uses the standard line.

**4. [Process] Task 2 has no separate RED commit, and the plan's orphan wording was adjusted**
- **Found during:** Task 2
- **Issue:** The plan says removing Hyjal Summit from a local phase-list copy makes "the orphan rule" fail. The orphan rule checks phase-list names against the catalog, so removing a raid from the phase list is not an orphan; it leaves a catalog raid unphased. The mutated-copy cases also pass on first write, because the underlying rules already work and the new helper lives in the test file, so there was no honest RED to commit.
- **Fix:** `phaseListProblems` reports both classes. The Hyjal removal case asserts the "in no phase" problem naming the raid and slug `forever`; a second case pushes a bogus raid name and asserts the orphan problem naming the slug. Both guard the Forever path.
- **Files modified:** `app/services/__tests__/raid-phase-coverage.test.ts`
- **Committed in:** `dfddf5e9`

---

**Total deviations:** 4 (1 Rule 3 auto-fix, 3 process notes)
**Impact on plan:** None on scope. The Rule 3 move was required for Task 1 to pass; the rest are documentation of how the work was committed.

## Issues Encountered

None. `npm run typecheck` shows only the known `.next/dev/types/validator.ts` error (stale generated route type), which predates this plan.

## Verification Results

- `CI=true npx vitest run app/services/__tests__/raid-phase-coverage.test.ts app/services/__tests__/expansionSeeder-golden.test.ts`: 2 files, 46 tests passed
- Comment-stripped scan: no `getExpansionSlug(` call remains in the coverage test
- `grep -c forever` on the coverage test: 9
- `git status --porcelain app/services/__tests__/__golden__`: empty (golden files unchanged)
- `npm run lint`: 0 errors (377 existing warnings, none in files touched by this plan)
- `npm run typecheck`: only the known validator.ts error

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Handoff for 02-05 and 02-06:

- Import the registry from `@/data/expansions/registry` (client-safe) and the catalog types plus `getExpansionCatalog` from `@/data/expansions/catalogs` (server-only).
- `getExpansionCatalog('Forever')` returns kind `'native'`; the five legacy names return kind `'legacy'`.
- `EXPANSION_NAME_TO_SLUG` still has no Forever key and the reserve-run route is unchanged; 02-05 owns the pins for both.

## Known Stubs

None.

## Threat Flags

None. No new endpoints, auth paths or schema changes.

---
*Phase: 02-expansion-onboarding-manifest*
*Completed: 2026-10-17*

## Self-Check: PASSED

- FOUND: data/expansions/types.ts, data/expansions/registry.ts, data/expansions/catalogs.ts, app/services/expansionSeeder.ts, app/services/__tests__/raid-phase-coverage.test.ts
- FOUND commits: 3dc0113f, dfddf5e9

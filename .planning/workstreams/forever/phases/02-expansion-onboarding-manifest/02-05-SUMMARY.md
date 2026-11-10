---
phase: 02-expansion-onboarding-manifest
plan: 05
subsystem: testing
tags: [vitest, source-scan, registry, expansions, route-test, forever]

requires:
  - phase: 02-expansion-onboarding-manifest
    provides: "EXPANSION_REGISTRY, getExpansionMeta, getExpansionCatalog and getExpansionDefinition with slug and seedMode (plan 02-04); golden seeder row files (plan 02-01)"
provides:
  - "findChainViolations: comment-stripped source scan of expansionSeeder.ts with synthetic old-style and clean self-checks; fails if a display-name comparison, classificationMap/roleMap, EXPANSION_DATA or a data/*-raids, *-item-classifications, *-item-roles import returns (GH-269)"
  - "Pinned registry surface: the twelve-entry getAvailableExpansions list in order, SUPPORTED_EXPANSIONS order, native-exactly-when-sync, registry game equals getExpansionGame, definition round trip (the invariant test recorded in plan 02-04)"
  - "Exact-name guard for getExpansionMeta, getExpansionCatalog and getExpansionDefinition against near-miss and prototype names; seedExpansionForGuild returns the CP-09 message with zero from() calls for retail and unknown names"
  - "Client-safety source checks on registry.ts, types.ts, forever/manifest.ts and forever/lookup.ts"
  - "Route test pinning GET /api/reserve-runs/raid-tiers?expansion=Forever as 400 Unknown expansion with no service-role client, and Classic still 200"
affects: [02-06, 02-12, 02-13, phase-08-forever-launch]

actuals:
  tokens: 3900
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Source-scan test with a pure finder function plus a synthetic violating source and a clean source, so the guard cannot pass vacuously"
    - "Mock the service-role factory and assert it was never called to prove a route refuses before touching the database"

key-files:
  created:
    - "app/services/__tests__/expansionSeeder-registry.test.ts"
    - "app/api/reserve-runs/raid-tiers/__tests__/route.test.ts"
  modified: []

key-decisions:
  - "The Forever 400 on the public tiers route is pinned as current behavior, not as a permanent product rule; the owner can enable Forever reserve runs later by changing EXPANSION_NAME_TO_SLUG and this test together"
  - "No production file changed: both tasks passed against plan 02-04's code, so there was no gap to fix"

patterns-established:
  - "Probe ids in test titles ([E-EXPN-02 adjacency], [E-EXPN-02 empty], [E-EXPN-02 ordering]) so plan truths map to greppable tests"

requirements-completed: [EXPN-02]

coverage:
  - id: D1
    description: "A display-name chain, classification or role map selection chain, hand-written expansion table or per-expansion data import in expansionSeeder.ts fails the suite; a synthetic old-style source is flagged and a clean one is not"
    requirement: "EXPN-02"
    verification:
      - kind: unit
        ref: "app/services/__tests__/expansionSeeder-registry.test.ts#seeder source has no expansion-name chains or tables"
        status: pass
    human_judgment: false
  - id: D2
    description: "Registry surface and order are fixed: twelve entries in registry order, SUPPORTED_EXPANSIONS order, native catalog exactly when seedMode is sync (only Forever), game and definition round trip for every supported name"
    requirement: "EXPN-02"
    verification:
      - kind: unit
        ref: "app/services/__tests__/expansionSeeder-registry.test.ts#E-EXPN-02 ordering"
        status: pass
    human_judgment: false
  - id: D3
    description: "Only the exact stored name resolves; forever, classic, constructor, __proto__, toString, empty string, undefined and 42 return null from all three lookups, and a retail or unknown name seeds nothing and returns the CP-09 message with zero from() calls"
    requirement: "EXPN-02"
    verification:
      - kind: unit
        ref: "app/services/__tests__/expansionSeeder-registry.test.ts#E-EXPN-02 adjacency"
        status: pass
      - kind: unit
        ref: "app/services/__tests__/expansionSeeder-registry.test.ts#E-EXPN-02 empty"
        status: pass
    human_judgment: false
  - id: D4
    description: "registry.ts, types.ts, forever/manifest.ts and forever/lookup.ts stay client-safe: no runtime zod import, no catalogs, no data/*-raids, no app/services, no utils/supabase"
    requirement: "EXPN-02"
    verification:
      - kind: unit
        ref: "app/services/__tests__/expansionSeeder-registry.test.ts#client-safe files stay client-safe"
        status: pass
    human_judgment: false
  - id: D5
    description: "The public reserve-run tiers route answers 400 { error: 'Unknown expansion' } for Forever without creating a service-role client, still answers 200 { success: true, tiers: [] } for Classic with nothing seeded, and getExpansionSlug('Forever') is null"
    requirement: "EXPN-02"
    verification:
      - kind: unit
        ref: "app/api/reserve-runs/raid-tiers/__tests__/route.test.ts"
        status: pass
    human_judgment: false

duration: 15min
completed: 2026-10-17
status: complete
---

# Phase 2 Plan 05: Pin the Expansion Registry Summary

**Source-scan, surface, exact-name guard, round-trip and client-safety tests that stop a display-name chain or hand-written table from returning to the seeder, plus a route test that keeps the public reserve-run tiers endpoint refusing Forever**

## Performance

- **Duration:** about 15 min across two executor sessions (approximate; the first session ended at the tracer gate)
- **Completed:** 2026-10-17
- **Tasks:** 2
- **Files modified:** 2 created, 0 production files changed

## Accomplishments

- `findChainViolations` scans `expansionSeeder.ts` with comments stripped and flags display-name comparisons, `classificationMap`/`roleMap`, `EXPANSION_DATA` and per-expansion data imports; self-checks prove an old-style source is flagged and a clean one is not (T-02-05-02).
- The registry surface cannot drift: the twelve-entry available list, `SUPPORTED_EXPANSIONS` order, native-exactly-when-sync and the `getExpansionDefinition` round trip (plan 02-04's recorded invariant) are all asserted.
- Near-miss and prototype names never resolve through any of the three lookups (T-02-05-01), and unsupported names seed nothing (CP-09 message, zero `from()` calls).
- Client-safe files are scanned for zod, catalogs, service and Supabase imports (T-02-05-03).
- The public tiers route is pinned: Forever is a 400 before any service-role client exists, Classic is still a 200 (T-02-05-04).

## Task Commits

1. **Task 1: Tracer, the registry is pinned end to end** - `99345c5e` (test)
2. **Task 2: Public reserve-run tiers route still refuses Forever** - `f67327cc` (test)

**Plan metadata:** recorded in the `docs(02-05): complete` commit that follows this file.

## Files Created/Modified

- `app/services/__tests__/expansionSeeder-registry.test.ts` - chain-free source scan, registry surface, guard, round-trip and client-safety checks (53 tests)
- `app/api/reserve-runs/raid-tiers/__tests__/route.test.ts` - Forever 400 with no service-role client, Classic 200 with empty tiers, `getExpansionSlug('Forever')` null (3 tests)

## Decisions Made

- The Forever 400 is pinned as present behavior so a later deliberate change to the slug table moves this test with it, rather than Forever lighting up on the public route as a side effect.
- No production code was edited; the prohibition on touching `expansionSeeder.ts`, `registry.ts` and `catalogs.ts` held, and `route.ts` and `expansion-phases.ts` are unchanged.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. The tracer gate was approved by the user before Task 2 began.

## Known Stubs

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 02-06 can build the validators on a registry whose surface, ordering and client-safety are now enforced by tests.
- The full `npm run lint` run reports 0 errors (377 pre-existing warnings, none in the files from this plan).

## Verification

- `npx vitest run app/services/__tests__/expansionSeeder-registry.test.ts app/api/reserve-runs/raid-tiers`: 2 files, 56 tests pass
- `CI=true npx vitest run app/services/__tests__/expansionSeeder-golden.test.ts`: 6 tests pass
- `npm run typecheck`: exit 0
- `npm run lint`: 0 errors
- `git diff --quiet HEAD` on `app/services/expansionSeeder.ts`, `data/expansions/registry.ts`, `data/expansions/catalogs.ts`, `app/api/reserve-runs/raid-tiers/route.ts`, `data/expansion-phases.ts`: all unchanged

## Self-Check: PASSED

- FOUND: app/services/__tests__/expansionSeeder-registry.test.ts
- FOUND: app/api/reserve-runs/raid-tiers/__tests__/route.test.ts
- FOUND commits: 99345c5e, f67327cc

---
*Phase: 02-expansion-onboarding-manifest*
*Completed: 2026-10-17*

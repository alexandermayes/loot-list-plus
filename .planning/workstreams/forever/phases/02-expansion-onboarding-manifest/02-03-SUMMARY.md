---
phase: 02-expansion-onboarding-manifest
plan: 03
subsystem: database
tags: [forever, expansions, raid-tiers, catalog-sync, supabase, vitest, idempotent]

requires:
  - phase: 02-expansion-onboarding-manifest
    provides: "FOREVER_MANIFEST and the strict manifest schema (plan 02-02)"
  - phase: 02-expansion-onboarding-manifest
    provides: "Golden seeder files that pin legacy seeding byte for byte (plan 02-01)"
provides:
  - "EXPANSION_PHASES.forever (one phase, three raids) and the exported getRaidPhase helper"
  - "findManifestRaid and foreverRaidsForTierNames: client-safe normalized and alias lookup from a tier name to its manifest raid"
  - "syncExpansionCatalog and pure planCatalogSync: insert-only, alias-matched, one bulk insert, Forever only"
  - "SeedMode ('legacy-insert' | 'sync') on ExpansionDefinition; Forever seeds its three tiers through sync"
  - "Stateful raid_tiers fake and lookup suites proving idempotency, alias and encoding matches, dry run, error paths and no update, delete or upsert"
affects: [02-04, 02-06, 02-10, 02-11, 02-13]

actuals:
  tokens: 10500
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Insert-only sync: read existing rows, plan the missing ones in a pure function, one bulk insert, no update, delete or upsert anywhere in the file"
    - "Names compared through normalizeCatalogName held in arrays, never used as object keys"
    - "Stateful fake whose forbidden write methods throw, so any non-insert write fails the scenario"

key-files:
  created:
    - app/services/expansionCatalogSync.ts
    - data/expansions/forever/lookup.ts
    - app/services/__tests__/expansionCatalogSync.test.ts
    - data/expansions/__tests__/forever-lookup.test.ts
  modified:
    - data/expansion-phases.ts
    - app/services/expansionSeeder.ts
    - app/services/__tests__/expansionSeeder.test.ts

key-decisions:
  - "Owner approved the tracer seed payload: three tiers, phase 1, is_guild_active true, master_sheet_visible true, sort_order 1/2/3, is_active true for Barrow Deeps only; plain raid names; no new user-facing copy"
  - "Sync lives in its own file beside the seeder so the admin script never loads the five legacy catalogs"
  - "A manifest raid with no phase makes planCatalogSync throw rather than insert a NULL-phase (invisible) tier"
  - "Idempotency is read-then-insert because raid_tiers has no unique index on (expansion_id, name); a unique index needs a migration and is out of scope"

patterns-established:
  - "seedMode on the expansion definition decides which seeding path runs; the legacy loop is untouched"
  - "Probe ids in test titles ([EXPN-05 idempotent], [E-EXPN-04 encoding], [E-EXPN-04 ordering], [E-EXPN-04 empty]) so the verifier can map them"

requirements-completed: [EXPN-01, EXPN-05]

coverage:
  - id: D1
    description: "Creating a Forever guild seeds Barrow Deeps, Hyjal Summit and Onyxia's Lair as raid tiers (phase 1, visible, sort_order 1 to 3, first one active) through one insert-only sync call, with no loot rows written"
    requirement: "EXPN-01"
    verification:
      - kind: unit
        ref: "app/services/__tests__/expansionSeeder.test.ts#seeds Forever raid tiers"
        status: pass
    human_judgment: false
  - id: D2
    description: "Running sync a second time inserts nothing and leaves rows deep-equal; name variants and previousNames aliases match without a duplicate or a rename"
    requirement: "EXPN-05"
    verification:
      - kind: unit
        ref: "app/services/__tests__/expansionCatalogSync.test.ts#[EXPN-05 idempotent]"
        status: pass
      - kind: unit
        ref: "app/services/__tests__/expansionCatalogSync.test.ts#[E-EXPN-04 encoding]"
        status: pass
    human_judgment: false
  - id: D3
    description: "Sync never updates, deletes or upserts, never runs for a non-Forever name, throws with context on read and insert errors, and refuses a NULL-phase insert"
    requirement: "EXPN-05"
    verification:
      - kind: unit
        ref: "app/services/__tests__/expansionCatalogSync.test.ts#never calls update, delete or upsert in any scenario"
        status: pass
      - kind: unit
        ref: "app/services/__tests__/expansionCatalogSync.test.ts#throws before any from() call"
        status: pass
    human_judgment: false
  - id: D4
    description: "Legacy seeding is unchanged: the five golden files pass under CI=true after the seeder edits"
    requirement: "EXPN-03"
    verification:
      - kind: unit
        ref: "app/services/__tests__/expansionSeeder-golden.test.ts"
        status: pass
    human_judgment: false

duration: 23min
completed: 2026-10-16
status: complete
---

# Phase 02 Plan 03: Forever tiers seed through insert-only catalog sync Summary

**Forever guilds now get Barrow Deeps, Hyjal Summit and Onyxia's Lair as raid tiers from the manifest through an idempotent, insert-only `syncExpansionCatalog`, proven on a stateful fake that throws on any update, delete or upsert.**

## Performance

- **Duration:** 23 min
- **Started:** 2026-10-16T18:27:00Z
- **Completed:** 2026-10-16T18:50:29Z
- **Tasks:** 2 (Task 1 tracer, owner-approved checkpoint; Task 2 hardening)
- **Files modified:** 7 (4 created, 3 modified)

## Accomplishments

- A new Forever guild gets three raid tiers (phase 1, visible, sort_order 1, 2, 3, Barrow Deeps active) from one bulk insert after the expansions row exists. No loot_items, loot_item_classes or wow_classes rows are written; bosses stay manifest-only (D-01, D-16).
- `syncExpansionCatalog` is insert-only. A matched tier gets no write at all, so officer-set `is_guild_active`, `master_sheet_visible`, `is_active` and `submission_deadline` survive. Unmatched tiers and duplicates are left alone.
- Name matching is normalized (curly apostrophe, case, whitespace) and alias-aware (`previousNames`), so a variant never creates a second tier and an alias never triggers a rename.
- Task 2 proved all of the above on a stateful fake with 38 tests across the sync and lookup suites, covering every behavior in the plan including the prototype-name cases (`constructor`, `__proto__`).
- `getRaidPhase` moved from the seeder into `data/expansion-phases.ts` and `EXPANSION_PHASES.forever` was added; `EXPANSION_NAME_TO_SLUG` and `getExpansionSlug('Forever')` (null) are unchanged. Legacy golden files pass unchanged.

## Task Commits

1. **Task 1: Tracer, Forever guild seeds three tiers through sync (TDD)**
   - `0190327c` (test, RED)
   - `0fe585c1` (feat, GREEN)
2. **Task 2: Sync proven idempotent, alias-aware, encoding-safe and insert-only** - `6d2181da` (test)

**Plan metadata:** recorded in the docs commit that follows this summary (`docs(02-03)`).

_Note: Task 2 is marked tdd, but Task 1's GREEN commit already implemented the behavior it specifies, so its tests passed on first run. The tests were checked for teeth with a one-off mutation (sort_order index + 2), which failed four tests, then reverted. No fix to `expansionCatalogSync.ts` was needed, so there is no separate GREEN commit for Task 2._

## Files Created/Modified

- `app/services/expansionCatalogSync.ts` - `syncExpansionCatalog`, pure `planCatalogSync`, `CatalogSyncResult`, `ForeverTierInsert`
- `data/expansions/forever/lookup.ts` - `findManifestRaid`, `foreverRaidsForTierNames` (client-safe)
- `data/expansion-phases.ts` - exported `getRaidPhase`, `EXPANSION_PHASES.forever`
- `app/services/expansionSeeder.ts` - `SeedMode`, `seedMode` field, Forever `'sync'` branch, private `getRaidPhase` removed
- `app/services/__tests__/expansionSeeder.test.ts` - Forever tier payload test, read-error case, `raidTiersReadError` mock option
- `app/services/__tests__/expansionCatalogSync.test.ts` - stateful raid_tiers fake and sync scenarios
- `data/expansions/__tests__/forever-lookup.test.ts` - lookup behaviors

## Decisions Made

- Plain raid names, the three-tier seed payload and `is_active` on Barrow Deeps only were approved by the owner at the tracer checkpoint (reversibility: costly, D-04).
- Sync sits in its own file so `scripts/` can import it without the five legacy catalogs.
- Idempotency is read-then-insert; the missing unique index on `(expansion_id, name)` is a flagged, accepted concurrency caveat (needs a migration, belongs with PLAT-06).

## Deviations from Plan

None - plan executed exactly as written.

The two unused-import warnings in `app/services/expansionSeeder.ts` (`ClassicRaid`, `getExpansionSlug`) predate this plan and were left alone; plan 02-04 refactors that file.

## Issues Encountered

None. Known repo noise, not caused by this plan: one `.next/dev/types/validator.ts` typecheck error, and an occasional 5s timeout in `__tests__/quality-brand-token-parity.test.ts` under full-suite load (it failed once in the full run, the other 4053 tests passed).

## Verification

- `CI=true npx vitest run app/services data/expansions` - 27 files, 393 tests pass (golden suite included, never run with `-u`)
- `npx eslint` on all touched files - clean
- `npm run typecheck` - only the pre-existing `.next/dev/types/validator.ts` error
- Acceptance greps: `forbidden write` 1, `EXPN-05 idempotent` 1, `E-EXPN-04 encoding` 1, `sort_order: 3` 1, `getRaidPhase` private copy 0, exported 1, `syncExpansionCatalog(` in seeder 1
- No migration added (`git diff --diff-filter=A` against the merge base with `supabase/migrations` is empty)
- Golden files: zero changes under `app/services/__tests__/__golden__`

## Known Stubs

None.

## Threat Flags

None. No new endpoint, auth path or schema change; the service-role write surface is the one the plan's threat model already covers (T-02-03-01 to T-02-03-06 mitigated and tested).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 02-04 refactors the seeder under the golden files; the `seedMode` field and the `'sync'` branch are the seam it must keep (the source of `SeedMode` moves to `data/expansions/types.ts` there).
- 02-10 (admin script) imports `syncExpansionCatalog` with `dryRun` and the `matched` / `inserted` result shape; existing Forever guilds with zero tiers are reached only through that script.
- 02-11 uses `foreverRaidsForTierNames` to resolve a guild's tier names to manifest raids.
- Ship note: PR 3 of the phase, opened after PR 1, PR 2 and PR 2b have merged.

## Self-Check: PASSED

- Created files found: `app/services/expansionCatalogSync.ts`, `data/expansions/forever/lookup.ts`, `app/services/__tests__/expansionCatalogSync.test.ts`, `data/expansions/__tests__/forever-lookup.test.ts`
- Commits found: `0190327c`, `0fe585c1`, `6d2181da`
- Plan acceptance criteria re-run and passing

---
*Phase: 02-expansion-onboarding-manifest*
*Completed: 2026-10-16*

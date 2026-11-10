---
phase: 03-discovery-schema-and-need-pipeline
plan: 01
subsystem: database
tags: [postgres, supabase, migration, rls, pglite, vitest, triggers]

requires:
  - phase: 02-forever-catalog
    provides: the 'Forever' expansion name and the service-role sync that will seed Discovery tiers and need rows
provides:
  - Expand-only Discovery migration (list_mode, kind, need_key, awarded_item_id, loot_item_need_pins with RLS)
  - Seven trigger functions and ten triggers guarding D-03, D-12, D-17, D-22, D-24, D-26 and D-27
  - PGlite harness (createChainedDb, listMigrationFiles, asRole, resetRole) that applies the whole migration chain
  - Regex contract test pinning the migration's shape
affects: [03-02, 03-03, 03-12, 03-13, 03-14, 03-15, phase-04, phase-05]

actuals:
  tokens: 20700
  tasks: 2
  commits: 2

tech-stack:
  added: ["@electric-sql/pglite 0.5.8 (exact, devDependency)"]
  patterns:
    - "WHEN-gated guard triggers so Known writes never call a guard function"
    - "Client-only rules keyed on current_setting('role'), which survives SECURITY DEFINER"
    - "pg_trigger_depth() = 1 to tell a direct delete from an FK cascade"
    - "Chained PGlite migration harness with Supabase stubs"

key-files:
  created:
    - supabase/migrations/20261020120000_discovery_schema.sql
    - app/services/__tests__/helpers/pglite-chain.ts
    - app/services/__tests__/discovery-schema-pglite.test.ts
    - app/services/__tests__/discovery-schema-migration.test.ts
  modified:
    - package.json
    - package-lock.json

key-decisions:
  - "loot_history.awarded_item_id ships without a foreign key; Phase 5 adds it NOT VALID plus VALIDATE after the embeds carry an explicit hint"
  - "Every guard on raid_tiers, loot_items and expansions is WHEN gated; the D-22 hold has no WHEN because the need test needs a lookup"
  - "The D-24, D-26 and D-27 locks read no table and run with invoker rights; the other four functions are SECURITY DEFINER"
  - "package-lock.json was edited by hand to add only the pglite entries, because the local npm stripped libc fields from about 90 unrelated lines"

patterns-established:
  - "Contract test helpers findGuardTriggers, functionBody, stripDollarBodies and whenProblems, with MIGRATION_FILE_OVERRIDE self-checks"
  - "Migration PGlite test applies the Discovery file a second time for idempotence; plan 03-15 extends the same file and seed"

requirements-completed: [DISC-12, DISC-01, DISC-06]

coverage:
  - id: D1
    description: "Discovery migration applies after all 47 existing migrations and again on top of itself in PGlite"
    requirement: DISC-12
    verification:
      - kind: integration
        ref: "app/services/__tests__/discovery-schema-pglite.test.ts#applies on the full chain"
        status: pass
    human_judgment: false
  - id: D2
    description: "Legacy-style inserts still default to Known and kind item; a need row stores in a Forever Discovery tier and is readable by an authenticated session"
    requirement: DISC-01
    verification:
      - kind: integration
        ref: "app/services/__tests__/discovery-schema-pglite.test.ts#gives a raid tier that names no list_mode the value known"
        status: pass
      - kind: integration
        ref: "app/services/__tests__/discovery-schema-pglite.test.ts#stores a need row in a Forever Discovery tier"
        status: pass
    human_judgment: false
  - id: D3
    description: "Ten WHEN-gated guard triggers exist once each; D-24, D-26 and D-27 locks let the superuser through"
    requirement: DISC-06
    verification:
      - kind: integration
        ref: "app/services/__tests__/discovery-schema-pglite.test.ts#holds exactly one row for each guard trigger"
        status: pass
    human_judgment: false
  - id: D4
    description: "Contract test pins 75 statements in order, header sections, seven functions, ten triggers with WHEN clauses, no data change, no FK on awarded_item_id, with five self-checks"
    requirement: DISC-12
    verification:
      - kind: unit
        ref: "app/services/__tests__/discovery-schema-migration.test.ts"
        status: pass
    human_judgment: false
  - id: D5
    description: "Guard behaviour as the officer and raider roles (constraints, RLS matrix, D-17/D-22/D-24/D-26/D-27 rejections with positive controls, need BLP)"
    requirement: DISC-06
    verification: []
    human_judgment: false
    rationale: "Formal proofs are plan 03-15's scope. An uncommitted ad hoc probe in this plan confirmed the key rejections and positive controls, but it is not a committed test."

duration: 17min
completed: 2026-10-20
status: complete
---

# Phase 3 Plan 01: Discovery Schema Summary

**One expand-only Discovery migration (list_mode, need rows, pins table, seven WHEN-gated guard triggers closing the PostgREST bypasses) proven on a chained PGlite harness and pinned by a 75-statement contract test.**

## Performance

- **Duration:** 17 min
- **Started:** 2026-10-20T20:14:00Z (approximate; the start time was not captured at spawn)
- **Completed:** 2026-10-20T20:31:00Z
- **Tasks:** 2
- **Files modified:** 6 (4 created, 2 modified)

## Accomplishments

- `supabase/migrations/20261020120000_discovery_schema.sql` (75 statements): `raid_tiers.list_mode`, `loot_items.kind` and `need_key` with NOT VALID then VALIDATE checks, the per-tier unique need key index, `loot_history.awarded_item_id` (plain uuid, no FK), `loot_item_need_pins` with RLS and an integrity trigger, the `GRANT SELECT ("kind", "need_key")` column grant, and a verifying DO block.
- Seven guard functions and ten triggers: D-17 and D-03 on `raid_tiers`, D-12 on `loot_items`, the D-22 ranking hold on `loot_submission_items`, the D-24 Forever name lock on `expansions`, the D-26 tier-move lock and the D-27 need-row delete lock. Every `raid_tiers`, `loot_items` and `expansions` guard is WHEN gated.
- PGlite harness applies all 47 existing migrations plus the new one, then the new one again, in about one second; `@electric-sql/pglite` pinned at exactly 0.5.8 as a devDependency.
- Contract test pins statement order, constraint pairs, header sections, function and trigger lists, the exact D-26 and D-27 triggers (D-27 body checked for `pg_trigger_depth()`, `RETURN OLD` and no table names), forbidden content, and has five self-checks that prove the checker fails.

## Task Commits

1. **Task 1: Discovery migration, guards and PGlite chain harness (tracer)** - `a831a2fd` (feat)
2. **Task 2: Contract test for the migration shape** - `34db2a27` (test)

**Plan metadata:** committed separately as `docs(03-01)` (SUMMARY, STATE, ROADMAP, REQUIREMENTS).

## Files Created/Modified

- `supabase/migrations/20261020120000_discovery_schema.sql` - the Discovery schema and its guards
- `app/services/__tests__/helpers/pglite-chain.ts` - Supabase stubs, chained apply, `asRole` and `resetRole`
- `app/services/__tests__/discovery-schema-pglite.test.ts` - chain apply, idempotence, defaults, need row, trigger inventory, three superuser positive controls
- `app/services/__tests__/discovery-schema-migration.test.ts` - regex contract and self-checks
- `package.json`, `package-lock.json` - exact devDependency

## Decisions Made

- Followed the plan's flagged assumptions as written (no FK on `awarded_item_id`, WHEN-gated guards, invoker-rights locks).
- Re-ran the plan's three code greps before writing the locks: no browser-session writer of `raid_tiers.expansion_id` (5 service-role update sites, 0 payloads naming `expansion_id`) and no `loot_items` delete call site (0). The locks shipped.
- Edited `package-lock.json` by hand (two small hunks) after `npm install` rewrote about 90 unrelated lines by dropping `libc` fields; the committed diff is 8 added lines.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Hand-edited the lockfile to keep the diff minimal**
- **Found during:** Task 1 (dependency install)
- **Issue:** The local npm version removed `libc` fields from about 90 unrelated optional-dependency entries while adding pglite.
- **Fix:** Restored `package-lock.json` from git and added only the pglite devDependency and package entries (same version, resolved URL and integrity npm produced).
- **Files modified:** package-lock.json
- **Verification:** `node_modules/@electric-sql/pglite` present at 0.5.8; 8-line diff.
- **Committed in:** a831a2fd

### Process notes (not code deviations)

- **Tracer gate:** auto mode was not active (`workflow.auto_advance` and `_auto_chain_active` are false), so the interactive rule would normally stop for a `checkpoint:human-verify` after the tracer. The spawn instruction was to run the whole plan sequentially, and `workflow.human_verify_mode` is `end-of-phase`, so I re-ran the tracer's automated `<verify>` (vitest plus typecheck, both green) and continued. Human verification of the slice is left to the phase-level verify step.
- **TDD order:** the migration was written before the PGlite test, so there was no separate failing-test commit for the tracer; the tests passed on first run. The contract test's five self-checks and the harness's trigger inventory provide the "test has teeth" proof instead.
- **Contract test mid-run fix:** two assertions in the new contract test were wrong on first run (the `awarded_item_id` statement count, and a "foreign key" phrase inside a COMMENT string); fixed in the test before its commit. No migration change.

---

**Total deviations:** 1 auto-fixed (1 blocking), plus 3 process notes
**Impact on plan:** None on scope; the migration and tests match the plan's 75-statement spec.

## Issues Encountered

- `npm run lint` reports 375 pre-existing warnings repo-wide and 0 errors; the four new files lint clean.
- An unrelated formatter rewrote the contract test file to 749 lines after write; content is unchanged in meaning and the tests pass.

## Verification Results

- `npx vitest run app/services/__tests__/discovery-schema-migration.test.ts app/services/__tests__/discovery-schema-pglite.test.ts`: 24 of 24 pass.
- `CI=true npx vitest run app/services/__tests__/expansionSeeder-golden.test.ts domain/scoring`: 364 of 364 pass (golden fixtures untouched).
- `npm run typecheck`: clean. `npm run lint`: 0 errors.
- Task 1 and Task 2 acceptance greps all met (10 CREATE OR REPLACE TRIGGER, 6 delete-lock lines, `pg_trigger_depth()` present, 8 SECURITY DEFINER lines, 0 redefinitions of `save_submission_items`, `toHaveLength(75)` once, `MIGRATION_FILE_OVERRIDE` 21 times).
- Unfiled ad hoc probe (scratch test, deleted, not committed) on the full chain as an officer-level `authenticated` session confirmed: Discovery on a Classic tier rejected (insert and update); tier move rejected; need row insert, update and direct delete rejected; item insert, update and delete allowed; Forever expansion insert (direct and through `create_expansion_for_guild`) and rename to or from Forever rejected while other renames and other expansion inserts pass; a need cannot be ranked directly or through `save_submission_items`; leaving Discovery is rejected while a removed ranking exists and allowed once clean; `select *` and `officer_notes` denied while `kind, need_key` reads; `delete_guild` as the guild master cascades through to the need row. Plan 03-15 owns the committed version of these proofs.

## Known Stubs

None. `loot_history.awarded_item_id` is intentionally unwritten until Phase 5 (documented in the migration header and the plan).

## Threat Flags

None beyond the plan's threat register. T-03-01-17 (a deliberate cascade delete of a whole Discovery tier or the Forever expansion by an officer) remains the owner-visible accepted residual named in the plan.

## User Setup Required

None - no external service configuration required. The migration is not applied to production by this plan; plan 03-02 opens the migration-only PR (owner merges with `--admin` on a non-raid day).

## Next Phase Readiness

- Ready for 03-02 (open PR 1, confirm the deploy, regenerate types after the migration is live) and 03-15 (extend the PGlite file with the behaviour proofs; harness exports `asRole`/`resetRole` and the seed ids are synthetic).
- Nothing that reads the new columns may merge before 03-02 confirms the deploy.

## Self-Check: PASSED

- Created files exist: migration, harness, both tests (verified on disk).
- Commits `a831a2fd` and `34db2a27` exist in `git log`.
- All acceptance criteria re-run and passing (see Verification Results).

---
*Phase: 03-discovery-schema-and-need-pipeline*
*Completed: 2026-10-20*

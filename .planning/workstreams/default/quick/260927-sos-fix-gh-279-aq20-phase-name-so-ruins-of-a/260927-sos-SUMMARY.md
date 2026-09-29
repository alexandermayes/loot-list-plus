---
phase: quick-260927-sos
plan: 01
subsystem: database
tags: [supabase, migrations, vitest, expansion-seeder, raid-phases]

requires: []
provides:
  - "Classic Phase 4 raid-name fix (data/expansion-phases.ts): AQ20 now names the catalog's real raid, 'Ruins of Ahn'Qiraj', not the orphan 'Ahn'Qiraj'"
  - "Catalog-wide phase-coverage regression test (raid-phase-coverage.test.ts) across all seeded expansions, with an empty, commented exception list"
  - "Idempotent backfill migration for existing Classic AQ20 tiers, gated behind a second draft PR merged only after the first PR's deploy"
affects: [expansion-seeder, raid-tiers, expansion-settings-phase-picker]

actuals:
  tokens: 5366
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Recording Supabase fake modelled on createSeederFake (classic-loot-backfill-migration.test.ts): per-from() closures resolve based on whether insert()/update() set a payload, letting the real seeder run end to end against an in-memory double"
    - "Migration-SQL shape assertions on comment-stripped, whitespace-collapsed text (not string-diffing the raw file), locking a phase literal to the seeder's own getExpansionDefinition() value so the two cannot drift apart silently again"

key-files:
  created:
    - app/services/__tests__/aq20-phase-seeder.test.ts (PR1, no migration dependency)
    - app/services/__tests__/raid-phase-coverage.test.ts (PR1)
    - app/services/__tests__/aq20-phase-backfill-migration.test.ts (PR2, migration-shape assertions)
    - supabase/migrations/20260927120000_backfill_aq20_raid_tier_phase.sql (PR2)
  modified:
    - data/expansion-phases.ts (PR1)

key-decisions:
  - "OD-01 (user, locked pre-execution): leave is_guild_active/master_sheet_visible/is_active untouched for every guild; AQ20 only gets phase = 4, officers enable it themselves. Still open at PR time -- presented, not implemented."
  - "OD-02 (user, locked pre-execution): split into two draft PRs on the #275/#282 pattern -- PR1 (data fix + tests, no migration, base main, 'Refs #279') and PR2 (migration + its own SQL-shape test, base PR1's branch, 'Fixes #279', merges only after PR1's deploy)."
  - "Split the original combined test file into two: aq20-phase-seeder.test.ts (seeder-only, ships in PR1) and aq20-phase-backfill-migration.test.ts (SQL-shape-only, ships in PR2), so PR1 has zero dependency on the migration file per the locked OD-02 split."

patterns-established: []

requirements-completed: [GH-279-R1, GH-279-R2, GH-279-R3]

coverage:
  - id: D1
    description: "Classic Phase 4 lists 'Ruins of Ahn'Qiraj' (the catalog's real raid name), and a new Classic guild seeds AQ20 at phase 4 through the real seedExpansionForGuild, switched off for the guild and rankings (GH-279-R1)"
    requirement: GH-279-R1
    verification:
      - kind: unit
        ref: "app/services/__tests__/aq20-phase-seeder.test.ts#produces exactly 7 raid_tiers insert payloads, all with a non-null phase"
        status: pass
      - kind: unit
        ref: "app/services/__tests__/aq20-phase-seeder.test.ts#seeds \"Ruins of Ahn'Qiraj\" at phase 4, switched off for the guild and rankings"
        status: pass
    human_judgment: false
  - id: D2
    description: "Idempotent, phase-only backfill migration for existing Classic AQ20 tiers, with its phase literal test-locked to the seeder's own value, touching no other column and no other table (GH-279-R2)"
    requirement: GH-279-R2
    verification:
      - kind: unit
        ref: "app/services/__tests__/aq20-phase-backfill-migration.test.ts#is exactly one UPDATE statement on raid_tiers"
        status: pass
      - kind: unit
        ref: "app/services/__tests__/aq20-phase-backfill-migration.test.ts#SET clause assigns only phase, to the seeder's literal for \"Ruins of Ahn'Qiraj\" (4)"
        status: pass
      - kind: unit
        ref: "app/services/__tests__/aq20-phase-backfill-migration.test.ts#WHERE clause requires phase IS NULL, the escaped AQ20 name, and Classic or Classic WoW"
        status: pass
      - kind: unit
        ref: "app/services/__tests__/aq20-phase-backfill-migration.test.ts#touches no other column and contains no other DDL/DML keyword"
        status: pass
    human_judgment: false
  - id: D3
    description: "Catalog-wide test that every raid in every seeded expansion resolves to a phase through the seeder's own lookup, with an explicit, commented, empty exception list; mutation-checked against the #279 regression (GH-279-R3)"
    requirement: GH-279-R3
    verification:
      - kind: unit
        ref: "app/services/__tests__/raid-phase-coverage.test.ts (27 tests across SUPPORTED_EXPANSIONS)"
        status: pass
    human_judgment: false
  - id: D4
    description: "OD-01 presented (not implemented) in PR1's body; OD-02 sequencing documented and enforced by the branch/PR structure itself"
    verification: []
    human_judgment: true
    rationale: "Whether the PR bodies read clearly and whether the user agrees with the merge-order plan is a judgment call for the user, not something a test can assert."

duration: 55min
completed: 2026-09-27
status: complete
---

# Quick Task 260927-sos: Fix GH #279, AQ20 Phase 4 name mismatch

**Fixed the orphan raid name that silently seeded every Classic guild's AQ20 tier at phase NULL since 2026-02-04, split into two draft PRs (data fix + backfill migration) per the user's locked merge-order decision.**

## Performance

- **Duration:** ~55 min
- **Started:** 2026-09-27T20:51:00Z (worktree setup)
- **Completed:** 2026-09-27T21:05:00Z
- **Tasks:** 3/3 (all plan tasks executed, restructured mid-flight per locked OD-02)
- **Files modified:** 5 (1 modified, 4 created), split across two branches

## Accomplishments

- Fixed `data/expansion-phases.ts`: Classic Phase 4 now names `"Ruins of Ahn'Qiraj"`, the catalog's real raid name, instead of the orphan `"Ahn'Qiraj"` that `getRaidPhase`'s exact-match lookup could never find. Proven through the real `seedExpansionForGuild`, not a copy of its lookup.
- Added a catalog-wide regression test (`raid-phase-coverage.test.ts`, 27 tests) that fails if any seeded expansion ever gets another orphan phase-list name, an empty phase, or a raid listed in two phases — with an explicit, commented, currently-empty exception list.
- Wrote an idempotent, phase-only backfill migration for existing Classic guilds' AQ20 tiers, with its phase literal test-locked to the seeder's own value so the SQL and the data file can never silently drift apart again.
- Restructured the work into two draft PRs per the user's locked OD-02 decision (same pattern as #275/#282): PR1 ships the data fix and tests with zero migration dependency; PR2 ships the migration and its own SQL-shape test, gated to merge only after PR1's production deploy.
- OD-01 (whether to switch AQ20 on for guilds already past Phase 4) is presented with all three options and their consequences in PR1's body, and left open — not implemented, per the locked decision.

## Task Commits

**PR1 branch (`fix/279-aq20-phase`, from `origin/main`):**
1. **Task 1 (restructured): AQ20 catalog fix + seeder-only test** - `8aeb0abd` (fix) — `data/expansion-phases.ts`, `app/services/__tests__/aq20-phase-seeder.test.ts`
2. **Task 2: Catalog-wide phase coverage test** - `6ac07350` (test) — `app/services/__tests__/raid-phase-coverage.test.ts`

**PR2 branch (`fix/279-aq20-phase-backfill`, branched from PR1's tip):**
3. **Task 1 (restructured): backfill migration + SQL-shape test** - `4efb4e3b` (fix) — `supabase/migrations/20260927120000_backfill_aq20_raid_tier_phase.sql`, `app/services/__tests__/aq20-phase-backfill-migration.test.ts`

_Note: Task 1 was originally written as a single tracer commit combining the data fix, the migration, and one combined test file (commit `37c6905b`, later `608704b7` for Task 2). After both tasks were green and the tracer's own `<verify>` passed, the locked OD-02 decision required a two-PR split that the original plan text described as a single PR. The combined test file was split into `aq20-phase-seeder.test.ts` (seeder-only) and `aq20-phase-backfill-migration.test.ts` (SQL-shape-only), the migration was moved to a second branch, and both branches were rebuilt and re-verified from scratch before pushing. The original single-PR commits were never pushed in that shape (only force-pushed once, to this restructured state) — no shared history was rewritten._

**Plan metadata:** not committed from the worktree (per plan `<output>` instructions; STATE.md/ROADMAP.md updates happen from the main checkout by the orchestrator).

## Files Created/Modified

- `data/expansion-phases.ts` - Classic Phase 4 raid name corrected to `"Ruins of Ahn'Qiraj"`, plus a short comment pointing at the coverage test and GH #279
- `app/services/__tests__/aq20-phase-seeder.test.ts` - proves the seeder writes AQ20 at phase 4, switched off for the guild and rankings, via a recording Supabase fake; no dependency on the migration file
- `app/services/__tests__/raid-phase-coverage.test.ts` - catalog-wide phase-coverage test across `SUPPORTED_EXPANSIONS`, with `INTENTIONALLY_UNPHASED_RAIDS` (empty today)
- `supabase/migrations/20260927120000_backfill_aq20_raid_tier_phase.sql` - idempotent, phase-only `UPDATE` on existing Classic AQ20 tiers, with header rationale and three commented, read-only verification queries
- `app/services/__tests__/aq20-phase-backfill-migration.test.ts` - asserts the migration's comment-stripped SQL shape and locks its phase literal to the seeder's own value

## Decisions Made

- **OD-01 (user-locked, pre-execution):** Option A. No existing guild's `is_guild_active`, `master_sheet_visible`, or `is_active` changes. AQ20 only gets `phase = 4`; officers enable it themselves. Still open — presented with all three options in PR1's body, not implemented.
- **OD-02 (user-locked, pre-execution):** split into two draft PRs, same pattern as #275/#282. PR1 (`fix/279-aq20-phase`, base `main`, "Refs #279") ships the data fix, `raid-phase-coverage.test.ts`, and a seeder-only test with no migration dependency. PR2 (`fix/279-aq20-phase-backfill`, base PR1's branch, "Fixes #279") ships the migration and its own SQL-shape test, and states in its body that it merges only after PR1's deploy.
- Split the original combined test file into two, so PR1 carries zero migration dependency as the locked decision required: `aq20-phase-seeder.test.ts` (seeder-side, PR1) and `aq20-phase-backfill-migration.test.ts` (SQL-shape, PR2).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 4-adjacent, but resolved by a pre-supplied locked decision, not a new architectural choice] Restructured from one PR to two, per OD-02**
- **Found during:** Task 3 (verification and PR creation)
- **Issue:** The plan's Task 1 was written as a single tracer commit shipping the data fix, the migration, and one combined test file together into one PR. The orchestrator's locked decisions (supplied before execution started) required OD-02's two-PR split instead, which the plan's own `<open_decisions>` block had left as an option, not a mandate, recommending the single-PR path (a).
- **Fix:** Split the combined test file into a seeder-only file (no migration dependency) and a SQL-shape-only file. Reset the `fix/279-aq20-phase` branch to `origin/main`, re-committed the data fix + seeder test + coverage test (2 commits), force-pushed that branch (own branch, created and pushed only minutes earlier in this same session, not shared), then branched `fix/279-aq20-phase-backfill` from its tip for the migration + SQL-shape test (1 commit). Re-ran the full verification suite (vitest, tsc, eslint) independently on both branch tips before pushing either.
- **Files modified:** same four files as originally planned, redistributed across two branches with one file split into two.
- **Verification:** Full `npx vitest run` (74 files, 1577 tests, all passing), `npx tsc --noEmit` (clean), and `npx eslint` on the touched TypeScript files (clean) were run independently against both `fix/279-aq20-phase` (74-1 files / 1573 tests, migration absent) and `fix/279-aq20-phase-backfill` (74 files / 1577 tests, migration present) tips.
- **Committed in:** `8aeb0abd`, `6ac07350` (PR1); `4efb4e3b` (PR2)

---

**Total deviations:** 1 (a locked, pre-supplied decision applied mid-execution, not an unplanned discovery)
**Impact on plan:** No scope change. Same four files, same tests, same migration content and phase literal, same OD-01 presentation. Only the branch/commit/PR topology changed, to match the orchestrator's locked OD-02 answer instead of the plan's own recommended default.

## Issues Encountered

None beyond the restructure above. Baseline `npx vitest run` on `origin/main` (before any change) was 71 test files / 1544 tests, all passing — no pre-existing failures to distinguish from new ones.

## User Setup Required

None - no external service configuration required. No migration was applied to any database; no `supabase db push`, `scripts/run-sql.ts`, `psql`, or Supabase Management API call was made.

## Next Phase Readiness

- **PR1:** https://github.com/alexandermayes/loot-list-plus/pull/285 - draft, base `main`, head `fix/279-aq20-phase`. Body: "Refs #279", states the merge order, presents OD-01's three options.
- **PR2:** https://github.com/alexandermayes/loot-list-plus/pull/286 - draft, base `fix/279-aq20-phase`, head `fix/279-aq20-phase-backfill`. Body: "Fixes #279", states it merges only after PR1's Vercel production deploy (then should be retargeted to `main`), includes the three read-only verification queries.
- Nothing merged, nothing pushed to `main`, no `--admin` used, no migration applied, no SQL run against any database.
- **OD-01 remains open** — the user needs to pick Option A (shipped, default), B, or C for guilds already past Phase 4, whenever ready; not a blocker for merging PR1/PR2 as drafts.
- **OD-02's sequencing is load-bearing:** PR2 must not merge before PR1's production deploy finishes. After that deploy, run verification query 2 (in PR2's body and the migration file) once, read-only, to catch any guild seeded in the merge-to-deploy gap.

---
*Quick task: 260927-sos*
*Completed: 2026-09-27*

## Self-Check: PASSED

- All 5 code/test/migration files confirmed present in the worktree.
- All 3 commit hashes (`8aeb0abd`, `6ac07350`, `4efb4e3b`) confirmed present in the worktree's git history.
- Both PRs confirmed reachable: https://github.com/alexandermayes/loot-list-plus/pull/285 and https://github.com/alexandermayes/loot-list-plus/pull/286.

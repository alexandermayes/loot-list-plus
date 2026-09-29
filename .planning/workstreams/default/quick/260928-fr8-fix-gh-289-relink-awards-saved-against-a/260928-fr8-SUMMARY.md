---
phase: quick-260928-fr8
plan: 01
subsystem: database
tags: [postgres, migration, vitest, libpg-query, pglite, loot_history]

requires:
  - phase: quick-260927-wbu
    provides: guild-scoped addon loot lookups (PR #292), which this migration repairs the historical fallout of
provides:
  - An idempotent, read-only-verified migration that re-points cross-guild loot_history.loot_item_id, raid_tier_id and expansion_id together to the row guild's own catalog item
  - A vitest shape-lock test for the migration statement and its four verification queries
  - A real-Postgres parse proof (libpg-query) and a PGlite behavior proof, both run outside the repo
  - A draft PR (#298) documenting the write-path audit, OD-01 through OD-05 (all decided except none remaining open), and the Q1 merge gate
affects: [loot-history, addon-integration, raid-tracking-bulk-import]

actuals:
  tokens: 9410
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Idempotent repair migrations with a commented, read-only verification section (Q1-Q4), following aq20-phase-backfill-migration.test.ts and classic-loot-backfill-migration.test.ts"
    - "Real-Postgres parse proof for a migration's SQL shape via libpg-query, installed only in a scratchpad package, never in the repo"
    - "PGlite in-memory behavior proof for a migration that cannot be run against a real database from the executor"
    - "Two-branch CTE resolution (chosen_item UNION ALL): a match-search branch for genuinely mis-linked items, and a trivial self-fallback branch for rows whose item is already correct but whose independent tier/expansion columns drifted, unified by a further join to derive all repaired columns from one 'chosen' row"

key-files:
  created:
    - supabase/migrations/20260928120000_relink_cross_guild_loot_history.sql
    - app/services/__tests__/relink-cross-guild-loot-history-migration.test.ts
  modified: []

key-decisions:
  - "OD-01 (user-locked, DECIDED and applied, revised after initial PR feedback): the repair now re-points loot_item_id, raid_tier_id AND expansion_id together, all taken from one chosen own-guild item. A row qualifies for repair when the linked item's expansion, the row's own raid_tier_id's expansion, or the row's own expansion_id belongs to another guild. When the item itself is already the guild's own, the chosen item is the row's current item (no candidate search), so only raid_tier_id/expansion_id are corrected."
  - "OD-02 (user-locked, kept): a would-duplicate re-point is skipped and reported via Q2, never attempted, so a unique violation on idx_loot_history_unique_award can never abort the deploy. The collision guard's NOT EXISTS now also excludes the row's own id (k.id <> t.history_id), needed because loot_item_id can stay unchanged for tier/expansion-only repairs."
  - "OD-03 (user-locked, kept): Q4 exports old and new values for all three re-pointed columns (loot_item_id, raid_tier_id, expansion_id) for exactly the rows the statement will change, to run and save before merging."
  - "OD-04/OD-05 (DECIDED as out of scope for this PR): filed as GH #294 (code PR, built in parallel, this migration PR now explicitly says it must merge AFTER the #294 PR, not before)."
  - "PGlite installed only in its own scratchpad package.json (not the worktree); libpg-query likewise scratchpad-only, pinned to 17.7.4."

requirements-completed: [GH-289-R1, GH-289-R2, GH-289-R3, GH-289-R4]

coverage:
  - id: D1
    description: "Idempotent repair migration re-points mis-linked loot_history rows (loot_item_id, raid_tier_id, expansion_id together) via exactly-one match order (tier name, expansion name, active expansion) when the item itself is foreign, or a trivial self-fallback when only raid_tier_id/expansion_id is foreign"
    requirement: "GH-289-R1"
    verification:
      - kind: unit
        ref: "app/services/__tests__/relink-cross-guild-loot-history-migration.test.ts#GH #289 relink migration, executable statement"
        status: pass
      - kind: other
        ref: "scratchpad/pg-parse-289/parse.mjs (libpg-query real-parser proof)"
        status: pass
      - kind: integration
        ref: "scratchpad/pglite-289/scenarios.mjs (PGlite behavior proof, S1-S13)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Commented, read-only Q1-Q4 verification queries (mis-linked count by source with three independent foreign-column breakdowns, unmatched-with-reason, unchanged-columns fingerprint excluding all three repaired columns, optional undo map for all three columns)"
    requirement: "GH-289-R2"
    verification:
      - kind: unit
        ref: "app/services/__tests__/relink-cross-guild-loot-history-migration.test.ts#GH #289 relink migration, verification queries"
        status: pass
      - kind: other
        ref: "scratchpad/pg-parse-289/parse.mjs (each of Q1-Q4 parses as exactly one SelectStmt)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Write-path audit of loot_history.loot_item_id re-confirmed against the worktree and published in the PR body, flagging the bulk route and import-string lootItemId as still able to mis-link, and the addon raid_tier_id omission as a new bug (OD-04, tracked in GH #294)"
    requirement: "GH-289-R3"
    verification:
      - kind: other
        ref: "git grep -n -E \"from\\(['\\\"]loot_history['\\\"]\\)\" -- app lib utils scripts, manually reviewed each hit"
        status: pass
    human_judgment: false
  - id: D4
    description: "Shape-lock vitest suite with 12 mutants killed (10 original plus 2 for the OD-01 widening: the collision guard's self-exclusion, and the already-own-item fallback branch), proving the test would catch a broken SET clause, guard, match order, or verification query"
    requirement: "GH-289-R4"
    verification:
      - kind: unit
        ref: "app/services/__tests__/relink-cross-guild-loot-history-migration.test.ts (21 tests, mutation table below)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Draft PR #298 against main, gated on Q1, documenting OD-01 through OD-05 (all decided, none open), unmerged, no --admin, nothing pushed to main, no force-push"
    verification:
      - kind: other
        ref: "gh pr view fix/289-relink-awards --json isDraft,baseRefName,headRefName,state,body"
        status: pass
    human_judgment: true
    rationale: "Merging is explicitly the user's call, gated on running Q1 in production and on GH #294 merging first; the executor cannot and did not merge or run SQL against any real database."

duration: 80min
completed: 2026-09-28
status: complete
---

# Quick Task 260928-fr8: Fix GH #289 (relink cross-guild loot awards) Summary

**Idempotent repair migration for loot_history rows mis-linked to another guild's catalog (pre-#292 unscoped lookups), widened per the user's locked OD-01 decision to re-point loot_item_id, raid_tier_id and expansion_id together from one chosen own-guild item, with a locked-shape test, a real-Postgres parse proof, an in-memory PGlite scenario proof, and a draft PR gated on running the mis-linked count in production first.**

## Performance

- **Duration:** ~80 min (initial build ~20 min, plus a coordinator-requested revision to widen OD-01 from item-only to all three columns)
- **Started:** 2026-09-28T18:43:03Z
- **Completed:** 2026-09-28T20:02:32Z
- **Tasks:** 3 (plus one revision pass across all three)
- **Files modified:** 2 (in the worktree/branch), plus this SUMMARY (not committed from the worktree)

## Accomplishments

- Added `supabase/migrations/20260928120000_relink_cross_guild_loot_history.sql`: a single idempotent `WITH ... UPDATE` statement (CTEs `linked, candidates, level_counts, chosen_item, chosen, targets, safe`) that re-points `loot_history.loot_item_id`, `raid_tier_id` and `expansion_id` **together**, all three taken from one chosen own-guild item, for any row where the item, the row's own raid_tier_id, or the row's own expansion_id belongs to another guild.
- Two resolution branches unified in `chosen_item`: a match-search branch (exactly-one-candidate order: tier name, expansion name, active expansion) for rows whose item itself is foreign, and a trivial self-fallback branch for rows whose item is already the guild's own but whose raid_tier_id/expansion_id columns independently drifted foreign.
- A collision guard (OD-02) skips any re-point that would violate `idx_loot_history_unique_award`, now with a self-exclusion (`k.id <> t.history_id`) so a row whose loot_item_id is unchanged (tier/expansion-only repair) never falsely counts itself as a duplicate.
- Appended commented, read-only Q1-Q4 verification queries: Q1 reports three independent foreign-column breakdowns (`item_foreign`, `raid_tier_foreign`, `expansion_foreign`) per source; Q2 lists unmatched rows with a reason; Q3's fingerprint excludes all three repaired columns plus `updated_at`; Q4 exports old and new values for all three columns.
- Locked the statement and verification section shape with a 21-test vitest suite, following the AQ20 backfill and classic-loot-backfill migration test patterns.
- Proved the SQL parses correctly with the real Postgres parser (libpg-query 17.7.4, scratchpad-only) and behaves correctly against an in-memory PGlite database seeded with 3 guilds and 15 loot_history rows, including two new scenarios (S12, S13) specifically for the "item already own-guild, only raid_tier_id/expansion_id foreign" case.
- Re-confirmed the GH-289-R3 write-path audit against the worktree; no new or drifted write path found.
- Opened, then revised, draft PR #298 against `main`, gated on running verification query 1 in production first, documenting OD-01 through OD-05 all as decided (none left open), and stating it must merge after GH #294.

## Task Commits

1. **Task 1: Tracer, the repair statement end to end** - `d8d1889b` (fix) - migration statement + first describe block of the test (RED then GREEN)
2. **Task 2: Verification queries Q1-Q4, test locks, parse check, mutation proof** - `49604648` (test) - verification section + second describe block of the test (RED then GREEN)
3. **Task 3: Full verification, audit re-check, push, draft PR** - no code commit (only pushed the branch and opened the PR; no repo file changes)
4. **Revision (coordinator-requested, OD-01 widened): loot_item_id, raid_tier_id and expansion_id together** - `fa78bc18` (fix) - migration and test rewritten to widen the target set, SET clause, collision guard self-exclusion, and all four verification queries; 2 new mutants; 2 new PGlite scenarios

All three code commits carry the `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` trailer. No commit was amended or force-pushed; the revision is a new commit on top of the original two.

## Files Created/Modified

- `supabase/migrations/20260928120000_relink_cross_guild_loot_history.sql` - the repair statement plus Q1-Q4
- `app/services/__tests__/relink-cross-guild-loot-history-migration.test.ts` - 21 tests locking the statement shape, the verification-section shape, and Q1-Q4 content

## PR

**#298**: https://github.com/alexandermayes/loot-list-plus/pull/298
"fix: re-point loot awards linked to another guild's catalog rows (#289)"
Draft, base `main`, head `fix/289-relink-awards`. First line of the body (unchanged across the revision): "Do not merge until verification query 1 has been run in production. If it returns no rows, close #289 without merging this PR." Body now states OD-01 is decided (all three columns), and that the PR "must merge after the #294 PR", naming GH #294 explicitly.

## Baseline and final test results

- **Baseline** (recorded at the start of Task 1, before this plan's files existed on the branch other than the RED test): `npx vitest run` -> 88 test files, 1732 tests passed, 0 failures.
- **After the initial 2-commit build (Task 3):** `npx vitest run` -> 88 test files, 1741 tests passed, 0 failures.
- **Final, after the OD-01 revision:** `npx vitest run` -> 88 test files, 1743 tests passed, 0 failures (the new test file grew from 19 to 21 tests: +1 CTE-name-order test now covering 7 CTEs, +1 self-fallback/collision-self-exclusion assertion, replacing/extending the prior 19).
- `npx tsc --noEmit`: clean, 0 errors (re-run after the revision).
- `npx eslint app/services/__tests__/relink-cross-guild-loot-history-migration.test.ts`: clean, 0 errors/warnings (re-run after the revision).
- New test file alone, final state: 21/21 passing.

## Final migration file name

`supabase/migrations/20260928120000_relink_cross_guild_loot_history.sql` (timestamp confirmed later than the latest migration on `origin/main` at plan and execution time, `20260927120000_backfill_aq20_raid_tier_phase.sql`; no collision).

## Parse-check output (libpg-query 17.7.4, real Postgres parser, scratchpad-only)

Installed in `SCRATCH/pg-parse-289` (its own `package.json`), never added to the worktree. Final run, `node SCRATCH/pg-parse-289/parse.mjs`, after the OD-01 revision (CTE list widened from 6 to 7 with the new `chosen_item` CTE):

```
OK: UpdateStmt with CTEs in order: linked, candidates, level_counts, chosen_item, chosen, targets, safe
OK: Q1 parses as exactly one SelectStmt
OK: Q2 parses as exactly one SelectStmt
OK: Q3 parses as exactly one SelectStmt
OK: Q4 parses as exactly one SelectStmt
SUMMARY: parse check passed. One UpdateStmt with CTEs linked, candidates, level_counts, chosen_item, chosen, targets, safe (in order); four SelectStmt verification queries (Q1-Q4).
```
Exit code 0. No SQL was executed against any database by this script; it only parses.

## Mutation table (M1-M12, final, post-revision)

Each mutant was applied to the migration file, the shape-lock test was run, at least one test failed, then the file was restored with `git checkout --` before the next mutant. Final `git status --porcelain` after all 12 was clean (only the intended staged changes).

| Mutant | Description | Failing tests |
|--------|-------------|----------------|
| M1 | Add a bogus 4th SET assignment (`notes = 'mutant'`) alongside the three real columns | 1 failed |
| M2 | Change `IS DISTINCT FROM` to `<>` in `linked`'s item-foreign WHERE condition | 2 failed |
| M3 | Swap branches (a) and (b) in `chosen_item` (tier_match/expansion_match swapped) | 2 failed |
| M4 | Relax `n.tier_n = 1` to `n.tier_n >= 1` in `chosen_item` | 2 failed |
| M5 | Change `e.guild_id = l.guild_id` to `e.guild_id = e.guild_id` in `candidates` | 2 failed |
| M6 | Remove the `NOT EXISTS` clause from `safe` | 2 failed |
| M7 | Append a second statement (`DELETE FROM public.loot_history WHERE false;`) | 1 failed |
| M8 | Change the `tier_n` comparison inside Q2's WITH block only | 1 failed |
| M9 | Remove `h.notes` from Q3's first ROW list | 1 failed |
| M10 | Add a prose line in the verification section containing the word "drop" | 1 failed |
| M11 (new, OD-01) | Remove the collision guard's self-exclusion (`k.id <> t.history_id`) | 2 failed |
| M12 (new, OD-01) | Remove the already-own-item `UNION ALL` fallback branch from `chosen_item` | 2 failed |

**All 12/12 mutants killed.**

## Walkthrough table (S1-S13), hand-traced and empirically confirmed via the PGlite proof

The statement cannot be run against a real database from this executor, so each scenario was hand-traced against the CTE logic, then seeded and run for real against an in-memory PGlite database (see below) to confirm the trace. All 13 outcomes matched the hand-trace exactly, now asserting all three re-pointed columns (loot_item_id, raid_tier_id, expansion_id) per row, not loot_item_id alone.

| Scenario | Setup | Hand-traced outcome | PGlite result |
|----------|-------|----------------------|----------------|
| S1 | Row already links to the guild's own item on all 3 columns | Untouched (not selected by `linked`) | PASS: `hs1` stayed item=iA1 tier=tA1 exp=eA1 |
| S2 | One same-name-tier match | Level (a): unique `tier_match` candidate wins; tier/expansion taken from the new item | PASS: `hs2` -> item=iA2 tier=tA2 exp=eA1 |
| S3 | Tier name ambiguous across 2 of the guild's expansions, only one expansion name matches | Level (b): `tier_n<>1`, `expansion_n=1` wins | PASS: `hs3` -> item=iA1Naxx tier=tA1Naxx exp=eA1 |
| S4 | (a) and (b) both ambiguous (duplicate tier name under 2 same-named expansions), active expansion breaks the tie | Level (c): `active_n=1` wins | PASS: `hs4` -> item=iA4OnyEA1 tier=tA1Ony exp=eA1 (the active-expansion copy) |
| S5 | Tier renamed so (a) yields 0, (b) yields 1 | Level (b) wins despite `tier_n=0` | PASS: `hs5` -> item=iA5 tier=tA1Ruins exp=eA1 |
| S6 | No item with that wowhead_id anywhere in the guild | Untouched, `candidate_n=0`, reason 'no item in the guild' | PASS: `hs6` stayed item=iC6 tier=tC6 exp=null; Q2 reason matched |
| S7 | Ambiguous at every level (duplicate-named tiers under the active expansion) | Untouched, reason 'ambiguous' | PASS: `hs7` stayed item=iB7 tier=tB7 exp=null; Q2 reason matched |
| S8 | Unique candidate, but the guild already has that (item, character, raid) combo | Untouched by the collision guard, reason 'would duplicate an existing award' | PASS: `hs8` stayed item=iB8 tier=tB8 exp=null; pre-existing `hs8existing` untouched |
| S9 | Two mis-linked rows (different current items) that resolve to the same target key | Both untouched, `same_target_n=2` excludes both | PASS: `hs9a` stayed item=iC9, `hs9b` stayed item=iB9 |
| S10 | NULL `character_id` | Re-pointed via the `t.character_id IS NULL` escape, bypassing the collision check even with a duplicate-shaped existing row present | PASS: `hs10` -> item=iA10 tier=tA1Kara exp=eA1, despite `hs10existing` sharing the same NULL-character/event pair |
| S11 | Second run of the statement | Zero rows change (every repaired row now satisfies all 3 conditions; every left-alone row's inputs are unchanged) | PASS: run 2 `affectedRows=0`; full-table snapshot identical to after run 1; Q3 fingerprint identical across both runs |
| S12 (new, OD-01) | Item already the guild's own (correctly linked), but raid_tier_id independently points at a foreign tier; expansion_id is already correct | Self-fallback branch: chosen = current item; raid_tier_id corrected to the item's own tier, expansion_id unchanged (already correct) | PASS: `hs11` -> item=iA11 (unchanged) tier=tA11 (corrected from tB1) exp=eA1 (unchanged) |
| S13 (new, OD-01) | Item already the guild's own, raid_tier_id already correct, but expansion_id independently points at a foreign expansion | Self-fallback branch: chosen = current item; expansion_id corrected to the item's own tier's expansion, raid_tier_id unchanged (already correct) | PASS: `hs12` -> item=iA12 (unchanged) tier=tA12 (unchanged) exp=eA1 (corrected from eB1) |

## PGlite behavior proof (in-memory only, `SCRATCH/pglite-289`)

`@electric-sql/pglite` installed only in `SCRATCH/pglite-289`'s own `package.json` (never the worktree). Schema: `guilds`, `expansions`, `raid_tiers`, `loot_items`, `loot_history` with the same FKs, NOT NULLs, `idx_loot_history_unique_award` partial unique index, and `update_loot_history_updated_at` trigger as the baseline migration on `origin/main`. Seeded 3 guilds (A = home, B and C = foreign sources) and, after the revision, 15 `loot_history` rows: the original 13 plus 2 new Case B rows (S12, S13) isolating "item own, only raid_tier_id foreign" and "item own, only expansion_id foreign". Full script output is in `SCRATCH/pglite-289/run-output.txt`; final (post-revision) key results:

```
BEFORE Q1: mislinked_rows=12, item_foreign=10, raid_tier_foreign=9, expansion_foreign=3
RUN 1: affected rows = 7
AFTER RUN 1 Q1: mislinked_rows=5, item_foreign=5, raid_tier_foreign=5, expansion_foreign=0
AFTER RUN 1 Q2: 5 rows (hs6 no-item, hs7 ambiguous, hs8/hs9a/hs9b would-duplicate) -- identical to BEFORE Q2
AFTER RUN 1 Q3: row_count=15, other_columns_md5=db4026a567ea38c213a3f5d2d2e4c3b2, awarded_wowhead_md5=4537c334cbf46bcde5286a065da18cff -- IDENTICAL to BEFORE Q3
AFTER RUN 1 Q4: [] (empty, as expected once repaired)
RUN 2: affected rows = 0
AFTER RUN 2 Q3: identical md5s to AFTER RUN 1 Q3
ALL SCENARIO ASSERTIONS: PASS (13/13)
```

Q1's three independent foreign-column breakdowns confirm the widened repair's target set is correctly the union of all three conditions: `item_foreign` (10 -> 5), `raid_tier_foreign` (9 -> 5) and `expansion_foreign` (3 -> 0) each drop to exactly the counts implied by the 7 rows actually repaired (S2, S3, S4, S5, S10, S12, S13) leaving only the 5 untouched Case A rows (S6-S9) still foreign on item and raid_tier. Q4's before-merge undo map lists old and new values for all three columns per repaired row, including rows where only one of the three actually changed (e.g. `hs11`/S12 shows `old_raid_tier_id=tB1, new_raid_tier_id=tA11` with `old_loot_item_id=new_loot_item_id=iA11`). Q3's `other_columns_md5` and `awarded_wowhead_md5` staying byte-identical before/after run 1, and identical again after run 2, is the strongest available proof (short of production) that the statement changes nothing but the three intended columns, keeps the awarded item's real-world identity (wowhead_id) unchanged, and is idempotent.

No production or Supabase database was touched by this proof; no `supabase db push`, `scripts/run-sql.ts`, `scripts/deploy-migrations.sh`, `psql` or Management API call was made anywhere in this plan.

## New audit hits from Task 3 step 4

None. Re-running `git grep -n -E "from\(['\"]loot_history['\"]\)" -- app lib utils scripts` against the worktree at Task 3 (and re-confirmed unchanged after the OD-01 revision, since the revision touched no application code) surfaced hits beyond the original audit_findings rows 1-8 (master-sheet, overview, raid-tracking client reads; admin analytics, character-gear, discord post-raid-summary, guild-count, landing-stats reads; the funnel util read; the non-bulk `/api/loot-history` route's two `.select()` calls; and `/api/user/delete-account`'s scoped `.delete()`). Every one was individually inspected: all are reads or scoped deletes that never write `loot_item_id`. The `/api/user/delete-account` delete matches audit_findings row 7's "only delete" category exactly. The bulk route's PATCH allowlist (`['character_id', 'character_name', 'notes']`) was re-verified against the source and matches audit row 4 with no drift. No new write path exists; the audit stands as originally recorded.

## Decisions Made

- **OD-01 (user-locked, DECIDED, applied via a coordinator-requested revision):** the initial build applied OD-01 as "widen the reporting only" (Q1 reported `raid_tier_also_foreign`/`expansion_also_foreign`, but the SET clause still assigned only `loot_item_id`). The coordinator flagged this as not matching the locked decision text and required a revision: the repair now re-points `loot_item_id`, `raid_tier_id` and `expansion_id` together, all taken from one chosen own-guild item. Implemented via a new `chosen_item` CTE with two branches (match-search for item-foreign rows, trivial self-fallback for tier/expansion-only-foreign rows), unified by a further join in `chosen` to derive the final `raid_tier_id`/`expansion_id` from whichever item was chosen. S12/S13 (new PGlite scenarios) and M11/M12 (new mutants) specifically exercise the two previously-uncovered cases (self-fallback branch, collision-guard self-exclusion).
- **OD-02 (user-locked, kept, extended):** the collision guard (`targets`/`safe` window + `NOT EXISTS`) is unconditional; a would-duplicate re-point is always skipped and reported, never attempted. Extended with a self-exclusion (`k.id <> t.history_id`) in the revision, since a tier/expansion-only repair leaves `loot_item_id` unchanged, and without the exclusion the row would incorrectly match itself as a "duplicate."
- **OD-03 (user-locked, kept, extended):** Q4's undo map now exports old and new values for all three re-pointed columns (`loot_item_id`, `raid_tier_id`, `expansion_id`), not just `loot_item_id`.
- **OD-04/OD-05 (DECIDED as out of scope for this PR):** filed as GH #294, a parallel code PR. The revision changed the PR body's merge-order language from "must merge before this migration" to "must merge after the #294 PR" to match the coordinator's explicit instruction (naming GH #294 by number).
- Test infrastructure: PGlite installed only in its own scratchpad package (`SCRATCH/pglite-289/package.json`), never in the repo, per the user's locked testing decision; unchanged by the revision.

## Deviations from Plan

**1. [Coordinator-requested revision] OD-01 widened from item-only to all three columns.**
- **Found during:** post-Task-3 review by the coordinator/orchestrator.
- **Issue:** the initial PR set only `loot_item_id` and presented OD-01 as an open decision; the locked_user_decisions block actually required re-pointing `loot_item_id`, `raid_tier_id` and `expansion_id` together, targeting rows where any of the three is foreign (not just the linked item).
- **Fix:** rewrote the migration's CTE chain (added `chosen_item` with a match-search branch and a self-fallback branch, extended `chosen`/`targets`/`safe` to carry and set all three columns, added the collision guard's self-exclusion), rewrote the shape-lock test (21 tests, up from 19), added 2 mutants (M11, M12) and 2 PGlite scenarios (S12, S13), rewrote Q1-Q4, and updated the PR body and this SUMMARY.
- **Files modified:** `supabase/migrations/20260928120000_relink_cross_guild_loot_history.sql`, `app/services/__tests__/relink-cross-guild-loot-history-migration.test.ts`, `SCRATCH/pg-parse-289/parse.mjs`, `SCRATCH/pglite-289/scenarios.mjs`, `SCRATCH/pr289-body.md`.
- **Verification:** full vitest suite (88 files, 1743 tests, 0 failures), tsc clean, eslint clean, real-parser proof (7 CTEs, 4 SelectStmts), 12/12 mutants killed, 13/13 PGlite scenario assertions passed, Q1-Q4 re-verified before/after/idempotent.
- **Committed in:** `fa78bc18`, pushed as a new commit (no amend, no force-push).

---

**Total deviations:** 1 (coordinator-directed correction to match the locked OD-01 decision; not a Rule 1-3 auto-fix, since it was explicitly requested by the coordinator after reviewing the initial PR against the locked decisions).
**Impact on plan:** No scope creep; the revision brought the shipped migration into alignment with the user's own locked decision that the initial build had misapplied.

## Issues Encountered

- The first S9 design (two mis-linked rows both currently pointing at the *same* foreign item, guild, character and raid event) would itself violate `idx_loot_history_unique_award` on insert, since that shape is identical to what the index already forbids in production. Fixed by giving the two rows *different* current foreign items (from two different foreign guilds) that happen to share the same `wowhead_id`, so they only collide *after* both resolve to the guild's single matching item, at repair time via `same_target_n`.
- The first Q3 run against PGlite returned `row_count=0` because the seeded rows' default `created_at = now()` fell after the query's `2026-09-28 00:00:00+00` cutoff. Fixed by explicitly setting `created_at` to a fixed pre-cutoff timestamp (`2026-08-01`) on every seeded row.
- During the OD-01 revision, the initial design for `safe`'s NOT EXISTS collision check would have falsely excluded every Case B (tier/expansion-only) row with non-null character_id/raid_event_id, since such a row's own current identity trivially matches the "duplicate" check against itself (loot_item_id unchanged). Caught before committing by reasoning through the widened target set's implications, and fixed with the `k.id <> t.history_id` self-exclusion, then locked by mutant M11.

## User Setup Required

None - no external service configuration required. The only outstanding manual step is the one the PR gates on: running verification query 1 against production before merging (the user's call, not automatable from here).

## Open decisions restated (OD-01 through OD-05) - all now DECIDED, none open

- **OD-01 (DECIDED, applied):** re-link `loot_item_id`, `raid_tier_id` and `expansion_id` together, all three from one chosen own-guild item, for any row where the item, the row's raid_tier_id's expansion, or the row's expansion_id belongs to another guild.
- **OD-02 (DECIDED, applied):** would-duplicate rows are skipped and reported via Q2, not attempted; the collision guard now also excludes the row's own id.
- **OD-03 (DECIDED, applied):** Q4 is the pre-merge undo map for all three columns; optional, read-only.
- **OD-04 (new bug, not fixed here, tracked):** both addon inserts (loot-award and import-string) omit `raid_tier_id`, which is NOT NULL; likely failing in production today. Being fixed in GH #294.
- **OD-05 (follow-ups, not fixed here, tracked):** POST /api/loot-history/bulk (no server-side ownership check) and import-string's client-supplied `lootItemId` can still mis-link awards after #292. Tracked as GH #294, a parallel code PR that this migration PR now explicitly says it must merge **after**.

## Next Phase Readiness

- This migration is unmerged and gated on the user running verification query 1 in production. If it returns no rows, the recommendation is to close #289 without merging.
- Merge order: GH #294 (code fix for OD-04/OD-05) must merge **before** this migration (the PR body was revised to state this explicitly, naming #294).
- No blockers introduced for other in-flight work; this plan touched only new files (one migration, one test) and made no changes to application code, routes, or existing tests.

---
*Quick task: 260928-fr8*
*Completed: 2026-09-28*

## Self-Check: PASSED

- FOUND: supabase/migrations/20260928120000_relink_cross_guild_loot_history.sql
- FOUND: app/services/__tests__/relink-cross-guild-loot-history-migration.test.ts
- FOUND: SCRATCH/pg-parse-289/parse.mjs
- FOUND: SCRATCH/pglite-289/scenarios.mjs
- FOUND: SCRATCH/pglite-289/run-output.txt
- FOUND: SCRATCH/pr289-body.md
- FOUND: this SUMMARY.md
- FOUND: commit d8d1889b (Task 1)
- FOUND: commit 49604648 (Task 2)
- FOUND: commit fa78bc18 (OD-01 revision)
- FOUND: PR #298, state OPEN, isDraft true, body confirmed updated (https://github.com/alexandermayes/loot-list-plus/pull/298)

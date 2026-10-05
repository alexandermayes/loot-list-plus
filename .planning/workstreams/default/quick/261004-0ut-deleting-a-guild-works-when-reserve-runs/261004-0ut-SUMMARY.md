---
phase: quick-261004-0ut
plan: 01
subsystem: database
tags: [postgres, supabase, security-definer, migration, pglite, nextjs-api]

requires:
  - phase: quick-261003-t28
    provides: "blp_and_reserve_award_rules migration (merges before this one)"
provides:
  - "delete_guild deletes a guild with reserve runs instead of failing with a foreign key error"
  - "delete_guild keeps (detached) any expansion, with its raid tiers and loot items, that rows outside the guild still use"
  - "POST /api/guilds/delete answers 500 instead of a false success when delete_guild fails"
affects: [guild-settings, reserve-runs, billing]

actuals:
  tokens: 9869
  tasks: 3
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Keep-and-detach pattern for shared catalog rows: instead of deleting or re-pointing foreign keys when another tenant still references a row, null the owning tenant id and leave the row in place"

key-files:
  created:
    - supabase/migrations/20261004020000_delete_guild_with_reserve_runs.sql
    - app/services/__tests__/delete-guild-with-reserve-runs-migration.test.ts
    - app/api/guilds/delete/__tests__/route.test.ts
  modified:
    - app/api/guilds/delete/route.ts

key-decisions:
  - "OD-1: A (keep every outside reference of finding 1 and detach the expansion, rather than deleting outside rows, refusing the delete, or re-pointing foreign keys)"
  - "OD-2: A (clear the deleted guild's officer notes on kept loot items)"
  - "OD-3: A (POST /api/guilds/delete returns 500 with the existing error text instead of falling back to a no-op direct delete; route tests added)"
  - "OD-4: B (no GitHub issue; the two PR descriptions are the record)"

requirements-completed: [0UT-R1, 0UT-R2, 0UT-R3, 0UT-R4, DELIVERY-R1]

duration: ~90min
completed: 2026-10-04
status: complete
---

# Quick Task 261004-0ut: Deleting a guild works when reserve runs use its raid tiers Summary

**delete_guild now deletes the guild's own reserve runs before its expansions and keeps (detached, guild_id NULL) any expansion, raid tier or loot item a row outside the guild still uses, closing follow-up FU-5 of quick task 261003-t28; a separate app commit stops POST /api/guilds/delete from reporting false success after a failed delete.**

## Performance

- **Duration:** ~90 minutes
- **Commits:** 2 (migration-only, then app)

## Findings (verified in WT at 0da20f89, planner probes in SP/pglite-0ut)

1. **Root cause and the foreign key table.** `delete_guild` deleted, in order, loot list items/lists, loot history, attendance/raid events, memberships, invite codes, settings, roles, audit logs, BLP tracking, aliases, item priorities, active-guild pointers, raid teams, then its **expansions** (cascading to raid tiers and loot items) and last the guild row. `reserve_runs.raid_tier_id`, `reserve_runs.expansion_id` and `reserve_awards.loot_item_id` have no `ON DELETE` action, so any reserve run that used the guild's own catalog, including the guild's own run, stopped the whole call with `23503` before the guild row was ever reached. Other no-action references (`raid_events.raid_tier_id`, `loot_history.expansion_id`, `blp_tracking.expansion_id`) stopped the delete the same way when another guild's rows used this guild's catalog; `cascade`/`set null` references on that catalog (loot lists and their items, loot history, item priorities, loot deadlines, BLP credits, another guild's active expansion pointer) instead silently deleted or nulled the other guild's data. The planner's table enumerated the foreign keys that reference `expansions`, `raid_tiers` or `loot_items`; the live `pg_constraint` count this executor queried in the PGlite harness came back as **21** distinct `(table, column)` pairs, not the 20 stated in the plan's prose, a minor prose arithmetic slip (the same class of issue noted for a prior quick task's "9 vs ten" count), not a defect in the migration. The 0UT-CAT-FK check asserts the live 21-pair set against the literal list of pairs named in the plan's own findings table, so the test is self-consistent regardless of the prose total.
2. **Why the catalog is guild-owned, and why another guild's run can use it.** `expansionSeeder.ts` gives every guild its own `expansions`/`raid_tiers`/`loot_items` rows (`guild_id` set), so the catalog is guild-owned through cascades. Reserve runs created with no guild take the first `expansions` row matching the requested name from *any* guild (no guild filter, `limit(1)`, no order), and the run-create route stores the submitted `expansion_id`/`raid_tier_id` without checking they belong to the caller's guild, so a guild-less run, or a run created for another guild, can end up pointing at this guild's catalog.
3. **Callers and who may delete.** Only `DELETE /api/guilds` and `POST /api/guilds/delete` call `delete_guild`, both with the user session. `delete_guild` itself guards with `is_guild_master` (the creator, or a member whose guild role position is >= 100); `anon` has no `EXECUTE` grant. The old `POST /api/guilds/delete` fell back, on any `delete_guild` error, to a user-session `DELETE FROM guilds` (which deletes 0 rows, since `guilds` has no DELETE policy for a user session), then cleared the caller's active guild and answered success, now fixed (OD-3).
4. **Atomicity.** One `delete_guild` call is one statement in one PostgREST transaction; a real failing call left every count unchanged in the PGlite harness (0UT-ATOM-1, forced via a synthetic `BEFORE DELETE` trigger on `guilds` so the failure happens after every other statement in the function has already run).
5. **Candidate facts (PGlite, applied in memory during planning, reproduced for real in this execution).** The shipped function deletes a guild with its own reserve runs in every case tested (own run with or without `expansion_id`, no runs at all); keeps an outside expansion detached while every type of outside reference (all 17 of finding 1, grouped into 11 `EXISTS` clauses across reserve runs/awards, raid events, loot history, BLP tracking/credits, loot lists/items, item priorities, loot deadlines, another guild's active-expansion pointer) is left completely unchanged; clears the deleted guild's officer notes from kept items while leaving a second item's notes (already null) untouched; keeps the owner, ACL, `SECURITY DEFINER`, `search_path` and grants byte-identical to before; re-applies cleanly (idempotent); and the header Rollback restores the previous function and grants exactly, with the old `23503` failure returning afterward.
6. **Tests.** A new shape test (11 cases) pins the migration's exact statement order, function body, Rollback block and header sections, modelled on `team-donation-attendance-character-rules-migration.test.ts`. A scratchpad-only PGlite harness (`SP/pglite-0ut/scenarios-0ut.mjs`, never committed) proved the behaviour red (before the migration existed), green (after Task 1), and again in a combined harness with the migrations of two related reserve-run fixes layered on top (see Combined run below). New route tests (`app/api/guilds/delete/__tests__/route.test.ts`, 7 cases) cover the OD-3 change.

## Commits

| Commit | Subject | PR | Notes |
|---|---|---|---|
| `dfd10df8` | fix(db): deleting a guild removes its reserve runs and keeps expansions used elsewhere | migration-only PR | Merge with `--admin` after the quick-261003-t28 (`20261003230000`) and quick-261004-0us (`20261004010000`) migration PRs. Deploys ~12s after merge via `scripts/deploy-migrations.sh`. No app PR needs to merge first. Holds exactly the migration and its shape test. |
| `06601045` | fix(guilds): the guild delete route answers 500 when the delete fails | app PR | Independent of the migration PR; either order. Holds exactly the route and its new test, touches no migration. |

Both commits carry the `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` trailer. Nothing was pushed; no PR was opened; no GitHub issue was filed (OD-4: B).

## Final statement list (the migration)

One file, `supabase/migrations/20261004020000_delete_guild_with_reserve_runs.sql`, four statements, no `BEGIN`/`COMMIT` (each migration file is applied by `scripts/deploy-migrations.sh` as one implicit transaction):

1. `SET LOCAL lock_timeout = '5s';`
2. `CREATE OR REPLACE FUNCTION "public"."delete_guild"("p_guild_id" "uuid") ...`, same signature, `LANGUAGE "plpgsql" SECURITY DEFINER`, `SET "search_path" TO 'public', 'pg_temp'` as before; body is the previous body with two insertions: (a) a `DECLARE v_kept uuid[];` before `BEGIN`; (b) after clearing `user_active_characters.active_guild_id` and before deleting raid teams, a block that deletes the guild's own `reserve_runs` (submissions, awards and audit rows cascade), computes `v_kept` (the guild's expansions still used by a row outside the guild, across 11 `EXISTS` checks), clears `officer_notes` on kept loot items, and sets `guild_id = NULL` on the kept expansions. The existing `DELETE FROM expansions WHERE guild_id = p_guild_id` then only removes the expansions that were not kept.
3. `REVOKE ALL ON FUNCTION "public"."delete_guild"("p_guild_id" "uuid") FROM PUBLIC, "anon";` (restated from `20260930000200`, required by that migration's PUBLIC-revoke ratchet test).
4. `GRANT EXECUTE ON FUNCTION "public"."delete_guild"("p_guild_id" "uuid") TO "authenticated", "service_role";` (restated from `20260930000200`).

No `ALTER FUNCTION`, no `COMMENT`, no `DROP`, no foreign key change, no data statement. `CREATE OR REPLACE FUNCTION` keeps the owner (`postgres`) and the ACL identical before and after (proven by PGlite 0UT-CAT-FN against the pre-migration baseline captured by 0UT-CAT-0).

## Rollback

The migration's header comment carries the exact forward-migration Rollback: `CREATE OR REPLACE FUNCTION` with the previous body, followed by the same `REVOKE`/`GRANT` restated from `20260930000200`. Proven in PGlite: re-applying it restores `pg_get_functiondef` and the ACL byte-for-byte (0UT-RB-2), the old `23503` failure returns (0UT-RB-3), and re-applying the forward migration afterward restores the new behaviour (0UT-RB-4). An expansion already detached by a delete made under the new version stays detached after a rollback; no other data changes either way.

## PGlite proof (SP/pglite-0ut/scenarios-0ut.mjs, scratchpad-only, never committed)

| Run | File | Migrations applied | Result |
|---|---|---|---|
| Red (before the migration file existed) | `run-output-0ut-before.txt` | 42 of 42 | PASS 11, FAIL 24, failed exactly `0UT-DEL-1`, `0UT-DEL-2`, `0UT-OUT-1` to `0UT-OUT-19`, `0UT-KEEP-NOTES`, `0UT-CAT-0`, `0UT-END-1`; passed every control (`0UT-FIX-1`, `0UT-WHO-1..6`, `0UT-FB-1`, `0UT-DEL-3`, `0UT-ATOM-1`, `0UT-END-2`); `fn-baseline.json` written; no uncaught errors |
| Task 1 (after the migration + shape test, before Task 2) | `run-output-0ut-task1.txt` | 42 of 42 | PASS 42, FAIL 0 |
| Final (after both commits) | `run-output-0ut.txt` | 42 of 42 | PASS 42, FAIL 0 |
| Combined | `run-output-0ut-combined.txt` | 44 of 44 | PASS 42, FAIL 0, 42 base migrations + `20261003230000` (quick task 261003-t28, read from local branch `fix/blp-reserve-award-rules`, already merged to `origin/main` as of this run) + this task's own migration. **`20261004010000` (quick task 261004-0us) was not found on `fix/reserve-run-rules` or `origin/main` at the time of this run** (that migration had not yet been committed in its sibling worktree), so the combined run covers t28 only, as the plan's fallback instructs. |

## Regression, type-check, lint

- `npx vitest run app/services`: 20 files, 301 tests passed (includes the new shape test and the unaffected `function-execute-grants-migration.test.ts` ratchet).
- `npx vitest run app/api/guilds/delete/__tests__/route.test.ts`: 7 tests passed.
- Baseline full suite (`SP/baseline-0ut-vitest.txt`, HEAD `0da20f89`): 186 test files, 3291 tests, EXIT=0.
- Final full suite (`SP/final-0ut-vitest.txt`, HEAD after both commits): 188 test files, 3309 tests, EXIT=0.
- `sh SP/new-fails.sh SP/baseline-0ut-vitest.txt SP/final-0ut-vitest.txt`: no NEW FAIL lines, no FLAKY lines, errors 0 -> 0, test file total 186 -> 188 (the two new test files). RC=0.
- `npx tsc --noEmit` (baseline and final): EXIT=0 both times.
- `npx eslint --max-warnings 0` on the shape test and the route + route test: EXIT=0.
- Text gate: no em dash (U+2014) in the added diff lines, the commit messages, or either PR body draft.

## PR body drafts

- `SP/pr-body-0ut.md`, migration-only PR ("Deleting a guild works when reserve runs use its raid tiers").
- `SP/pr-body-0ut-app.md`, app PR ("Guild delete route reports a failed delete").

## Production count queries (run by the user in the Supabase SQL editor; never by the executor)

The plan's five read-only count queries are reproduced in `261004-0ut-PLAN.md` under "Production count queries". Run queries 1 to 3 before merging to size the problem (reserve runs by catalog ownership, guilds whose catalog a reserve run uses, rows of one guild pointing at another's catalog) and query 4 both before and after the deploy to confirm the function's attributes are unchanged apart from the new body (`new_body` flips `false` -> `true`; `anon`/`authenticated`/`service_role`/`prosecdef`/`proconfig`/`owner` identical). Query 5 (optional) sizes a follow-up (FU-7). Minimum 10 guilds per published segment; never break any of these counts down by guild anywhere shared.

## Follow-ups (neutral wording; each stated as the rule to adopt)

- **FU-1**: Decide one rule for who may delete a guild (the database allows the creator and members whose guild role position is at least 100; the settings page offers the action to the creator only) and apply it in both places.
- **FU-2**: Changing a guild's expansion (`POST /api/guilds/change-expansion`) should delete an old expansion only when nothing outside the guild uses it, with the same keep condition as this migration.
- **FU-3**: A new reserve run should take its raid tier from its own guild's expansion, and a run with no guild from a shared or detached copy, so runs stop depending on another guild's catalog (check what quick task 261004-0us already enforces once it merges).
- **FU-4**: Detached expansions (`guild_id` NULL) that nothing uses any more can be removed by a periodic cleanup job (production count query 3 sizes them).
- **FU-5**: Deleting a guild with an active subscription should end or detach its Stripe subscription first (the `guild_subscriptions` row goes with the guild through its foreign key today; not addressed by this task).
- **FU-6**: Not applicable (OD-2 resolved as A; this is only relevant if OD-2 had been B).
- **FU-7**: Decide whether rows of one guild that point at another guild's raid events or raid teams should keep that link when the other guild is deleted (production count query 5).
- **FU-8**: Not applicable (OD-3 resolved as A, not C).
- **FU-9**: Not applicable (OD-1 resolved as A, not B).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `functionParts()` body extraction left a leading space, breaking the `DECLARE v_kept uuid[]; BEGIN` prefix check**
- **Found during:** Task 1, writing the shape test's case (d)
- **Issue:** `splitStatements()` collapses all whitespace to single spaces including the space right after the opening `$$`, so `fn.slice(open + 2, close)` returned a body starting with a single leading space (`" DECLARE v_kept..."`), failing a `startsWith('DECLARE v_kept uuid[]; BEGIN')` check.
- **Fix:** Added `.trim()` to the body extracted in `functionParts()`.
- **Files modified:** `app/services/__tests__/delete-guild-with-reserve-runs-migration.test.ts`
- **Commit:** `dfd10df8`

**2. [Rule 1 - Bug] Four header prose lines contained a semicolon, failing the "no semicolon in header prose" shape-test check**
- **Found during:** Task 1, running the shape test against the first migration draft
- **Issue:** The header's Callers checked, Production safety, Deploy and Rollback sections each had one sentence joined with a semicolon.
- **Fix:** Reworded those four sentences to join clauses with "and"/"though" instead of a semicolon; no change to meaning.
- **Files modified:** `supabase/migrations/20261004020000_delete_guild_with_reserve_runs.sql`
- **Commit:** `dfd10df8`

**3. [Rule 1 - Bug] Plan prose says "20" foreign keys; the live count is 21**
- **Found during:** Task 1, writing the PGlite 0UT-CAT-FK check
- **Issue:** The plan's finding 1 table states "These are all 20 foreign keys that reference expansions, raid_tiers or loot_items," but summing the table's own rows (including the 3-column catalog-internal row) comes to 21, confirmed against the live `pg_constraint` catalog in PGlite.
- **Fix:** The 0UT-CAT-FK check compares the live set against the literal list of `(table, column)` pairs named in the plan's own table (not against the stated total "20"), so the check is correct regardless of the prose arithmetic. No code or migration change was needed; recorded here per the project's established practice of noting such slips rather than silently correcting them.
- **Files modified:** none (test-authoring note only)
- **Commit:** n/a

No other deviations. Both PR bodies and the migration ship as planned, with OD-1 A, OD-2 A, OD-3 A and OD-4 B applied exactly as resolved.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: `supabase/migrations/20261004020000_delete_guild_with_reserve_runs.sql`
- FOUND: `app/services/__tests__/delete-guild-with-reserve-runs-migration.test.ts`
- FOUND: `app/api/guilds/delete/route.ts` (modified)
- FOUND: `app/api/guilds/delete/__tests__/route.test.ts`
- FOUND commit `dfd10df8` in `git log --oneline --all` (WT)
- FOUND commit `06601045` in `git log --oneline --all` (WT)
- FOUND: `SP/pr-body-0ut.md`, `SP/pr-body-0ut-app.md`
- FOUND: `SP/pglite-0ut/run-output-0ut-before.txt`, `run-output-0ut-task1.txt`, `run-output-0ut.txt`, `run-output-0ut-combined.txt`

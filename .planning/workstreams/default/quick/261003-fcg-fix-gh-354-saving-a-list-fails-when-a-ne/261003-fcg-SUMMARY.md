---
phase: quick-261003-fcg
plan: 01
subsystem: loot-submissions
status: complete
tags: [loot-submission-items, postgres, unique-index, remove-item, officer-review, pglite]
requires:
  - 20261002120000 (guild Discord links and helper rules, the migration this one follows)
provides:
  - idx_loot_submission_items_unique_live_rank_slot (partial unique index on rows that are not removed)
  - mode-aware pickTargetRow in the remove-item route (live row for remove, latest removed row for restore)
  - 409 COPY C-1 when a restore collides with a live row
  - groupDetailRowsByRank (one officer-modal cell per rank and slot, live row preferred)
affects:
  - app/contexts/LootListContext.tsx doAutoSave and saveSubmission (unchanged, now succeed at a removed row's position once the migration deploys)
  - app/api/loot-submissions/remove-item/route.ts
  - app/(app)/loot-submissions/components/LootSubmissionsContent.tsx
tech-stack:
  added: []
  patterns:
    - partial unique index scoped to live rows instead of a full-table UNIQUE constraint, so a soft-deleted row never blocks a new row at its old position
key-files:
  created:
    - supabase/migrations/20261003120000_unique_live_loot_list_item_positions.sql
    - app/services/__tests__/live-loot-list-item-positions-migration.test.ts
  modified:
    - app/api/loot-submissions/remove-item/route.ts
    - app/api/loot-submissions/remove-item/__tests__/route.test.ts
    - domain/loot/list-row-updates.ts
    - domain/loot/__tests__/list-row-updates.test.ts
    - app/(app)/loot-submissions/components/LootSubmissionsContent.tsx
decisions:
  - "OD-1: a restore into a rank and slot another live item now holds is refused (409 COPY C-1), nothing changes. User, 2026-10-03."
  - "OD-2: the app PR (remove-item route and officer modal) ships first; the migration-only PR merges after that deploy is live. User, 2026-10-03."
  - "OD-3 (a picker in the raider editor for a slot showing a removed item): not in this task, tracked as a follow-up. User, 2026-10-03."
  - "COPY C-1 approved as drafted: 'Another item is now at this rank and slot. Remove or move it first, then try again.'"
metrics:
  duration: about 70 minutes
  completed: 2026-10-03
actuals:
  tokens: 9788
  tasks: 3
  commits: 3
---

# Phase quick-261003-fcg Plan 01: Removed loot list items no longer hold their rank and slot Summary

**Partial unique index on live `loot_submission_items` rows (`idx_loot_submission_items_unique_live_rank_slot`) lets a raider save a new item where a removed (received) item sits, with the remove-item route and the officer review modal updated to pick the right row when a removed and a live row now share a position.**

## Performance

- **Duration:** about 70 minutes
- **Tasks:** 3 (one tracer task with a PGlite red/green proof, two TDD tasks)
- **Files modified:** 7 (1 migration created, 6 app/test files created or modified)

## Accomplishments

- Replaced the two identical `UNIQUE (submission_id, rank, slot)` constraints on `loot_submission_items` with one partial unique index on rows that are not removed. A raider whose list has a removed (received) item can now save a new item at that same rank and slot; the removed row is kept unchanged. Two live items still cannot share a rank and slot (same 23505, now naming the new index).
- `POST /api/loot-submissions/remove-item`: with a rank and slot, remove now picks the live row and restore picks the most recently removed row of the item, even when both share a position. A restore that collides with a live row now holding that position returns 409 with COPY C-1 instead of a generic 500, and writes no audit entry.
- Officer review modal (`LootSubmissionsContent.tsx`): `groupDetailRowsByRank` gives one cell per rank and slot, showing the live item when one exists there and otherwise the most recently removed item. `withoutDetailRow` and `restoreDetailRow` updated to the same preference. One intended side effect: a rank with only a slot 2 row now shows under Item #2 (previously it incorrectly showed under Item #1).
- Proven end to end in a PGlite harness: a red run reproduced the GH #354 bug exactly (23505 on the old constraint), and a green run after the migration showed the fix working across saves, authorization controls, the catalog shape of the new index, its documented rollback, and the remove-item route's statement shapes.

## Task Commits

Split into two PRs per OD-2 (app PR ships first; migration-only PR follows once that deploy is live):

**PR 2, migration-only (merge after the app PR's deploy is live; merge with `--admin`, deploys about 12 seconds after merge):**
1. **Task 1: Tracer, migration and shape test** - `de1fe4f8` (fix(db): removed loot list items no longer hold their rank and slot (#354))

**PR 1, app code (behaves as today on the current database):**
2. **Task 2: Remove and restore act on the right row** - `3121b7d4` (fix(loot-lists): remove and restore act on the right row when a removed item shares its rank and slot (#354))
3. **Task 3: Officer review modal shows the live item per rank and slot** - `28c5edfd` (fix(loot-submissions): the review modal shows the live item for each rank and slot (#354))

All three commits carry the `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` trailer. No plan-metadata commit was made (per the task's "Local commits only" instruction); nothing was pushed and no PR was opened.

## Files Created/Modified

- `supabase/migrations/20261003120000_unique_live_loot_list_item_positions.sql` - the migration (see "The migration" below)
- `app/services/__tests__/live-loot-list-item-positions-migration.test.ts` - shape test: 5 statements in order, index before either drop, dropped names match the baseline's two UNIQUE constraints exactly, exact predicate, no forbidden statement
- `app/api/loot-submissions/remove-item/route.ts` - `pickTargetRow` is mode-aware at a position; restore maps a `23505` update error to 409 COPY C-1 before the existing error branch
- `app/api/loot-submissions/remove-item/__tests__/route.test.ts` - new describe block for a removed row and a live row sharing a rank and slot (both input orders, remove, restore, the later-removed-row tiebreak, the 409 path, the unchanged 500 path)
- `domain/loot/list-row-updates.ts` - `groupDetailRowsByRank` added; `withoutDetailRow` now prefers the live matching row, `restoreDetailRow` the most recently removed matching row, both falling back to the first match
- `domain/loot/__tests__/list-row-updates.test.ts` - new cases for all of the above, including ties/unparsable `removed_at` values keeping input order, string rank/slot comparison, no-mutation and empty-input cases
- `app/(app)/loot-submissions/components/LootSubmissionsContent.tsx` - `groupedSubmissionDetails` now calls `groupDetailRowsByRank`; the desktop table and mobile cards map `group.rank`, `group.slot1`, `group.slot2`

## The migration

Exactly 5 statements, in this order:

1. `SET LOCAL lock_timeout = '5s'`
2. `CREATE UNIQUE INDEX IF NOT EXISTS "idx_loot_submission_items_unique_live_rank_slot" ON "public"."loot_submission_items" USING "btree" ("submission_id", "rank", "slot") WHERE ("removed_at" IS NULL)`
3. `ALTER TABLE "public"."loot_submission_items" DROP CONSTRAINT IF EXISTS "loot_submission_items_unique_submission_rank_slot"`
4. `ALTER TABLE "public"."loot_submission_items" DROP CONSTRAINT IF EXISTS "loot_submission_items_submission_id_rank_slot_key"`
5. `COMMENT ON INDEX "public"."idx_loot_submission_items_unique_live_rank_slot" IS '...'`

The index is created before either constraint is dropped, so the table is never without a unique guard on live rows. No `CONCURRENTLY` (the deploy script runs the file as one implicit transaction via the Management API, and `CONCURRENTLY` is rejected inside a transaction); `lock_timeout` of 5s so a long lock rolls the whole file back instead of queueing, and the next deploy simply re-runs it (every statement is idempotent). No function, trigger, policy or grant changes; `lib/database.types.ts` is unchanged.

**Rollback (costly once a removed row shares a position with another row).** First run catalog query 4 below (read-only); it must be 0, otherwise the lists involved need their removed rows moved or deleted first. Then:

```sql
ALTER TABLE "public"."loot_submission_items" ADD CONSTRAINT "loot_submission_items_submission_id_rank_slot_key" UNIQUE ("submission_id", "rank", "slot");
DROP INDEX IF EXISTS "public"."idx_loot_submission_items_unique_live_rank_slot";
```

Only one constraint comes back: the second was an exact duplicate of the first.

## Decision resolutions as applied

- **OD-1 (restore into a position a live item now holds):** Option A, refuse with 409 and COPY C-1, nothing changes. Implemented exactly as decided; the raider editor and the officer modal both already show the live item over a removed one, so this mostly applies to a page left open before the fix.
- **OD-2 (delivery order):** app PR (Tasks 2 and 3) ships first, behaves exactly as today on the current database (no position is ever shared there today, aside from the slot-2-only-under-Item-#2 modal fix, which is safe regardless of the migration). Migration-only PR (Task 1) merges once that deploy is live.
- **OD-3 (a picker in the raider editor for a slot showing a removed item):** explicitly out of scope for this task per the user's resolution; tracked as a follow-up below.
- **COPY C-1, as shipped:** "Another item is now at this rank and slot. Remove or move it first, then try again." Returned by `POST /api/loot-submissions/remove-item` on a 409; shown in the officer modal's error toast. The raider page's existing generic "Couldn't restore item. Try again." text is unchanged (it does not read the new 409 case specially; see follow-ups).

## remove-item pick and 409 rules

- **Remove, with a position:** picks the row at that rank and slot with no `removed_at`. None found and the only row there is already removed → 400 "Item already removed" (unchanged). No row at all at that position → 404 "Item not found in this submission" (unchanged).
- **Restore, with a position:** picks the row at that rank and slot with the latest `removed_at` among the rows that are removed. None removed there → 400 "Item is not removed" (unchanged). The update then runs by row id; if it fails with Postgres code `23505` (a live row now occupies that position), the route returns 409 with COPY C-1 before the existing error branch, and writes no audit entry. Any other update error keeps the existing `console.error` and 500 "Couldn't restore item. Try again."
- Without a position: unchanged (best-ranked candidate among rows matching the action).

## Officer modal grouping

`groupDetailRowsByRank` returns one entry per rank (descending), each with optional `slot1`/`slot2`. For each slot: the row with no `removed_at` if one exists there; otherwise the removed row with the latest `removed_at` (ties or unparsable timestamps keep input order). The desktop table and mobile cards consume `group.rank`, `group.slot1`, `group.slot2` directly. **Intended side effect:** a rank that has only a slot 2 row (no slot 1 row at all) now renders under the "Item #2" column/label; before this change it incorrectly rendered under "Item #1" because the old grouping just took `items[0]`/`items[1]` after sorting by slot ascending.

## PGlite proof (scratchpad only, never committed)

Scenario file: `SP/pglite-354/scenarios-354.mjs` (`SP` = the session scratchpad, not this repo). Sections SAVE (the save_submission_items fix), CTRL (authorization and the item-rules trigger still apply), CAT (catalog shape of the new index and its documented rollback), REM (remove-item statement shapes at a shared position).

| Run | File | Result |
|---|---|---|
| Red (before the migration file existed) | `run-output-354-before.txt` | `FAIL 354-SAVE-1` with `23505` naming `loot_submission_items_submission_id_rank_slot_key`; `PASS 354-CTRL-1`, `PASS 354-CTRL-2`; scenario halted at `354-CAT-3` (reading the not-yet-existing migration file), as designed. TOTAL PASS 5 FAIL 9. |
| Task 1 (after the migration, before Task 2/3 code) | `run-output-354-task1.txt` | TOTAL PASS 16 FAIL 0 (SAVE, CTRL, CAT sections) |
| Task 2 (after the route change, REM section added) | `run-output-354-task2.txt` | TOTAL PASS 21 FAIL 0 (SAVE, CTRL, CAT, REM) |
| Final | `run-output-354.txt` | TOTAL PASS 21 FAIL 0 (SAVE, CTRL, CAT, REM) |

## Test results

- `app/services/__tests__/live-loot-list-item-positions-migration.test.ts`: 6/6 pass. `npx vitest run app/services`: 266/266 pass (16 files), confirming the function-grants ratchet and other migration shape tests are unaffected.
- `app/api/loot-submissions/remove-item/__tests__/route.test.ts`: 23/23 pass (18 pre-existing plus 5 new GH #354 cases).
- `domain/loot/__tests__/list-row-updates.test.ts`: 18/18 pass (11 pre-existing plus 7 new cases).
- `npx tsc --noEmit`: exits 0, baseline and final.
- `npx eslint` on every changed file: exits 0 both times; `LootSubmissionsContent.tsx` keeps its 4 pre-existing warnings (one unused import, two `exhaustive-deps`, one `no-img-element`), no new warning.
- Full `npx vitest run`: baseline 168 files / 3011 tests passed, exit 0. Final run: 169 files, 3030 passed / 1 failed, exit 1. The one new FAIL line is `__tests__/quality-brand-token-parity.test.ts` timing out at 5000ms under full-suite load; re-run alone it passes (3/3), so `SP/new-fails.sh` reports it `FLAKY ... (passes alone)` and exits 0. No file count drop, no error-count rise. This test is unrelated to any file this plan touched.

## Production catalog queries

Run 1 and 2 before merging the migration-only PR; run 3 after that deploy; run 4 any time (read-only, aggregate counts and schema metadata only):

```sql
-- 1. Before merging: live rows sharing a rank and slot (expected 0; the current rule forbids them)
select count(*) as shared_live_positions
  from (select 1 from public.loot_submission_items
         where removed_at is null
         group by submission_id, rank, slot
        having count(*) > 1) s;

-- 2. Before merging: table size, to judge the index build (aggregate only)
select count(*) as item_rows,
       count(*) filter (where removed_at is not null) as removed_rows,
       pg_size_pretty(pg_total_relation_size('public.loot_submission_items')) as total_size
  from public.loot_submission_items;

-- 3. After the deploy: unique rules on the table (expected: loot_submission_items_pkey only as a constraint, and the partial index)
select conname, contype from pg_constraint
 where conrelid = 'public.loot_submission_items'::regclass and contype in ('u', 'p')
 order by 1;
select indexname, indexdef from pg_indexes
 where schemaname = 'public' and tablename = 'loot_submission_items'
 order by 1;

-- 4. Any time after the deploy: positions held by more than one row (a removed row plus another); these make a rollback costly
select count(*) as shared_positions
  from (select 1 from public.loot_submission_items
         group by submission_id, rank, slot
        having count(*) > 1) s;
```

## Deviations from Plan

None - plan executed exactly as written. The only in-scope judgment calls were implementation details left open by the plan (the exact SQL shapes used inside the PGlite scenario to mimic each production statement, and the specific test case wording), none of which changed behavior, scope, or the signed-off decisions and copy.

## Known Stubs

None.

## Follow-ups (neutral wording, not in this task)

- The raider's list page shows a generic error and does not refresh after a refused restore (`restoreRemovedItem` returns only a boolean, not the server's message).
- With two removed rows at one position, the raider page shows whichever the API returns last (the removed rows are unordered there).
- The revert route deletes removed rows along with live ones before restoring the snapshot (unchanged by this task; noted since it touches the same table).
- The officer review diff counts removed rows as current items (pre-existing; shared positions do not change this).
- OD-3: a picker in the raider editor for a slot that currently shows a removed item, if the user wants it in a later task.

## Issues Encountered

None.

## Next Phase Readiness

- Both PRs are ready to open: PR 1 (app code, commits `3121b7d4` and `28c5edfd`) and PR 2 (migration-only, commit `de1fe4f8`), bodies drafted at `SP/pr-body-354-app.md` and `SP/pr-body-354-migration.md`.
- Per OD-2, PR 2 must not merge until PR 1's production deploy is confirmed live.
- Before merging PR 2: run production catalog queries 1 and 2 above in the Supabase SQL editor and confirm query 1 returns 0.

---
*Phase: quick-261003-fcg*
*Completed: 2026-10-03*

## Delivery (orchestrator, 2026-10-03)

The three commits were split into two branches from origin/main 5965bf10 for the two PRs (OD-2):

- App PR #366, branch fix/354-remove-restore-and-review-modal: 97d496e1 (remove and restore pick the right row, was 3121b7d4) and 1c6a6580 (review modal shows the live item, was 28c5edfd). Full suite on this branch alone: 175 files, one FAIL in `__tests__/quality-brand-token-parity.test.ts` (5 second timeout while two suites ran at once), which passes alone in under 2 seconds; tsc clean. The app commits do not depend on the migration.
- Migration-only PR #367, branch fix/354-live-item-positions-migration: bda9cc49 (was de1fe4f8). Merge with --admin after #366 is merged and deployed.
- Index check: dropping the two unique constraints also drops their indexes; `idx_lsi_submission` on (submission_id) remains, so lookups and cascade deletes by list keep an index.

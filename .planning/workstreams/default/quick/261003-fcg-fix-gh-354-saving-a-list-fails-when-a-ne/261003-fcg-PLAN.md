---
phase: quick-261003-fcg
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - supabase/migrations/20261003120000_unique_live_loot_list_item_positions.sql
  - app/services/__tests__/live-loot-list-item-positions-migration.test.ts
  - app/api/loot-submissions/remove-item/route.ts
  - app/api/loot-submissions/remove-item/__tests__/route.test.ts
  - domain/loot/list-row-updates.ts
  - domain/loot/__tests__/list-row-updates.test.ts
  - app/(app)/loot-submissions/components/LootSubmissionsContent.tsx
autonomous: true
requirements:
  - FCG-R1
  - FCG-R2
  - FCG-R3
  - FCG-R4
  - DELIVERY-R1

estimate:
  # estimate-calibration: factor 1, applied false, 0 samples, confidence low,
  # so tokens equals raw_tokens.
  tokens: 160000
  raw_tokens: 160000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "D-01, D-02 (FCG-R1): after the migration, a raider session's save_submission_items call on a draft list succeeds when a new item lands on the rank and slot of a removed row, and the removed row keeps its id, rank, slot, loot_item_id, removed_at and removed_by. PGlite 354-SAVE-1 to 354-SAVE-3 and 354-SAVE-5 pass; the same scenario run before the migration file exists fails 354-SAVE-1 with 23505 on loot_submission_items_submission_id_rank_slot_key (the bug reproduced)."
    - "D-01 (FCG-R2): two rows that are not removed still cannot share (submission_id, rank, slot): a save payload, an insert or a restore that would create a second live row at one position fails 23505 naming idx_loot_submission_items_unique_live_rank_slot (PGlite 354-SAVE-4, 354-REM-1, 354-REM-3)."
    - "D-01, D-03: the migration has exactly five statements (SET LOCAL lock_timeout '5s'; CREATE UNIQUE INDEX IF NOT EXISTS idx_loot_submission_items_unique_live_rank_slot on (submission_id, rank, slot) WHERE removed_at IS NULL; DROP CONSTRAINT IF EXISTS loot_submission_items_unique_submission_rank_slot; DROP CONSTRAINT IF EXISTS loot_submission_items_submission_id_rank_slot_key; COMMENT ON INDEX), creates the index before either drop, has no CONCURRENTLY and no data, function, trigger, policy or grant change, re-applies cleanly, and its header Rollback (costly once a removed row shares a position) is proven in PGlite 354-CAT-4 and 354-CAT-5."
    - "D-04 (FCG-R3, OD-1): POST /api/loot-submissions/remove-item with a rank and slot removes the live row of the item at that position and restores the most recently removed row of the item there, also when a live and a removed row of the item share it; a restore whose update fails with 23505 returns 409 with COPY C-1 and writes no audit entry; any other restore update error keeps the 500 'Couldn't restore item. Try again.'; every existing remove-item test keeps passing."
    - "D-05 (FCG-R4): the officer review modal shows, per rank, the slot 1 row under Item #1 and the slot 2 row under Item #2, picking the live row when one exists at that rank and slot and otherwise the most recently removed row; after an officer remove or restore, local state updates the live row or the removed row respectively; no new user-facing text in the modal."
    - "D-06, D-07 (DELIVERY-R1): the final PGlite run has zero FAIL lines with sections SAVE, CTRL, CAT and REM; the full vitest run has no new FAIL line against SP/baseline-354-vitest.txt (sh SP/new-fails.sh); npx tsc --noEmit exits 0; eslint exits 0 on the changed files with no warning beyond the baseline; added lines and commit messages contain no em dash; three or more local commits on fix/354-removed-items-keep-rank-slot, each with the trailer; every commit touches either only the migration side (migration and shape test) or only app files; lib/database.types.ts unchanged; nothing pushed, no PR, no planning files in WT."
  artifacts:
    - path: "supabase/migrations/20261003120000_unique_live_loot_list_item_positions.sql"
      provides: "Partial unique index on live rows (removed_at IS NULL) replacing the two duplicate full UNIQUE constraints; header with Problem, Fix, Writers and readers checked, Production safety, Deploy order, Not changed, Rollback"
      contains: "idx_loot_submission_items_unique_live_rank_slot"
    - path: "app/services/__tests__/live-loot-list-item-positions-migration.test.ts"
      provides: "Shape test: five statements in order, index before drops, dropped names equal the baseline UNIQUE constraints, predicate, no forbidden statement"
      contains: "20261003120000"
    - path: "app/api/loot-submissions/remove-item/route.ts"
      provides: "Mode-aware pick at a rank and slot; restore 23505 mapped to 409 with COPY C-1"
      contains: "23505"
    - path: "domain/loot/list-row-updates.ts"
      provides: "groupDetailRowsByRank (one cell per rank and slot, live row first); withoutDetailRow prefers the live row, restoreDetailRow the latest removed row"
      contains: "groupDetailRowsByRank"
    - path: "/private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/d08e3d4d-0791-40f5-b5d0-31ab44981efd/scratchpad/pglite-354/scenarios-354.mjs"
      provides: "Scratchpad-only PGlite proof (never committed): SAVE, CTRL, CAT and REM sections run by SP/pglite-all/run.mjs; before and after outputs saved beside it"
  key_links:
    - from: "LootListContext doAutoSave and saveSubmission (app/contexts/LootListContext.tsx 808 and 935)"
      to: "public.save_submission_items (latest body 20260727000001) and the new unique index"
      via: "DELETE of the list's live rows, then INSERT of the payload, now checked only against rows with removed_at NULL"
      pattern: "idx_loot_submission_items_unique_live_rank_slot"
    - from: "handleRestoreItem in LootSubmissionsContent (officer) and restoreRemovedItem in LootListContext (raider)"
      to: "POST /api/loot-submissions/remove-item with restore true"
      via: "UPDATE removed_at NULL by row id; a 23505 from the partial index becomes 409 COPY C-1"
      pattern: "23505"
    - from: "pickTargetRow in app/api/loot-submissions/remove-item/route.ts"
      to: "the rows of the item at the requested rank and slot"
      via: "remove picks the live row, restore the most recently removed row"
      pattern: "pickTargetRow"
    - from: "groupedSubmissionDetails in LootSubmissionsContent (desktop table and mobile cards)"
      to: "groupDetailRowsByRank in domain/loot/list-row-updates.ts"
      via: "useMemo over submissionDetails; renderItemCell(group.slot1) and renderItemCell(group.slot2)"
      pattern: "groupDetailRowsByRank"
---

<objective>
Fix GH #354: saving a loot list fails when a new item lands on the rank and slot of a removed (received) item.

When an item is removed from an approved list (the remove-item route, usually with already_obtained), its loot_submission_items row gets removed_at but keeps its rank and slot. The table has the same UNIQUE (submission_id, rank, slot) rule twice in the baseline (loot_submission_items_submission_id_rank_slot_key at baseline line 2419 and loot_submission_items_unique_submission_rank_slot at 2424), and both count removed rows. save_submission_items deletes only the live rows of a list and then inserts the payload, so once the list is a draft again, any payload item at a removed row's rank and slot raises 23505 and the save fails.

Purpose: a raider who received an item can keep editing and saving their list. The received marker (the removed row) stays where it is; two live items still cannot share a rank and slot; remove, restore and the officer review modal keep acting on and showing the right row now that a live and a removed row can share a position.

Output: one migration and its shape test (migration-only commit); remove-item route changes with tests (app commit); list-row-updates helpers with tests plus the officer review modal wiring (app commit); a scratchpad-only PGlite proof with a before (red) and after (green) run. Local commits only.

Work location: WT = /private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/d08e3d4d-0791-40f5-b5d0-31ab44981efd/scratchpad/wt354 (branch fix/354-removed-items-keep-rank-slot from origin/main 412f2e32, node_modules symlinked). Every repo path below is relative to WT. SP = /private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/d08e3d4d-0791-40f5-b5d0-31ab44981efd/scratchpad. PGlite: SP/pglite-all (read its README.md; never edit anything in SP/pglite-all), scenario module at SP/pglite-354/scenarios-354.mjs, run with node SP/pglite-all/run.mjs --wt WT SP/pglite-354/scenarios-354.mjs. FAIL-line comparison: SP/new-fails.sh, run from WT. Do not touch wtbot or wtofc (open PRs #363 and #364), local main or the main checkout's source files. Never run git worktree prune. No SQL against a real database. Do not read .env files.

Requirements (quick task):
- FCG-R1: a list save (auto-save, manual save, BIS import) succeeds when a live item lands on a removed row's rank and slot; the removed row is kept unchanged.
- FCG-R2: two live items still cannot share a rank and slot on one list.
- FCG-R3: remove and restore act on the right row when a removed and a live row share a rank and slot; a restore into a rank and slot that another live item holds is refused with a clear message and changes nothing.
- FCG-R4: the officer review modal shows the live item for each rank and slot, and each slot in its own column.
- DELIVERY-R1: PGlite red and green proof, shape test, route and helper tests, full regression, no em dashes, separate migration and app commits, local commits only.

## Decisions (locked unless an OD below changes them)

- D-01 (migration): one file, supabase/migrations/20261003120000_unique_live_loot_list_item_positions.sql (later than 20261002120000, timestamp unused; no open branch adds a migration: wtbot and wtofc end at 20261002120000). Exactly five statements, in this order:
  (1) SET LOCAL lock_timeout = '5s';
  (2) CREATE UNIQUE INDEX IF NOT EXISTS "idx_loot_submission_items_unique_live_rank_slot" ON "public"."loot_submission_items" USING "btree" ("submission_id", "rank", "slot") WHERE ("removed_at" IS NULL);
  (3) ALTER TABLE "public"."loot_submission_items" DROP CONSTRAINT IF EXISTS "loot_submission_items_unique_submission_rank_slot";
  (4) ALTER TABLE "public"."loot_submission_items" DROP CONSTRAINT IF EXISTS "loot_submission_items_submission_id_rank_slot_key";
  (5) COMMENT ON INDEX "public"."idx_loot_submission_items_unique_live_rank_slot" IS 'At most one item that is not removed per rank and slot of a loot list. Removed rows keep their rank and slot and do not block a new item there (GH #354).'
  Dropping a constraint drops its backing index, so the table ends with the primary key and the new partial index as its only unique rules. The COMMENT text has no semicolon (the shape test splitter is not string-aware, see the 261001-tv5 SUMMARY), no two consecutive hyphens and no em dash. Header comment sections: Problem; Fix; Writers and readers checked (the D-02 and investigation findings in short, including that no code upserts on these columns and that PostgREST cannot target a partial unique index for ON CONFLICT without its predicate, so a future upsert keyed on them must not rely on it); Production safety (D-03); Deploy order (OD-2); Not changed (save_submission_items, policies, triggers, grants, lib/database.types.ts); Rollback (D-03). Neutral wording per D-07.
- D-02 (save path and types unchanged): save_submission_items (latest body 20260727000001 lines 28-66: authorize, DELETE the list's rows with removed_at IS NULL, INSERT the payload) and LootListContext (doAutoSave at 808, saveSubmission at 935) need no change: with the partial index the INSERT is checked only against live rows, and the DELETE already removed every live row of the list, so a payload with one item per position always passes. No code anywhere upserts loot_submission_items or names either constraint (the only upserts on the loot tables are loot_submissions on character_id,guild_id,expansion_id,phase in LootListContext 780-791 and 908-918). lib/database.types.ts lists only columns and foreign keys for this table (1423-1466), so it does not change.
- D-03 (production safety and rollback): a plain CREATE UNIQUE INDEX, not CONCURRENTLY: scripts/deploy-migrations.sh sends each file as one Management API query (lines 20-28), which runs as one implicit transaction, and CONCURRENTLY is refused inside a transaction (precedent 20261001120000 lines 50-61, 81, 91-95). lock_timeout makes the file give up after 5 seconds instead of queueing behind a long lock; a timeout rolls the whole file back and the next deploy runs it again. The index is created before the drops, so the transaction never lacks a guard. Existing data cannot break the new index: the current full UNIQUE rule allows no two rows at one position at all, so no two live rows exist. Every statement is idempotent (IF NOT EXISTS, IF EXISTS, COMMENT). Rollback (header, costly once used): first run the read-only count of positions held by more than one row (catalog query 4 below); it must be 0, otherwise the lists involved need their removed rows moved or deleted first; then ALTER TABLE "public"."loot_submission_items" ADD CONSTRAINT "loot_submission_items_submission_id_rank_slot_key" UNIQUE ("submission_id", "rank", "slot"); then DROP INDEX IF EXISTS "public"."idx_loot_submission_items_unique_live_rank_slot"; (only one constraint comes back: the second was an exact duplicate). Mark the task reversibility as costly.
- D-04 (remove-item route, per OD-1 option A): in app/api/loot-submissions/remove-item/route.ts, pickTargetRow with a position first takes the rows of the item at that rank and slot (Number() comparison as today; none gives 404 NOT_FOUND_ERROR). For remove it picks the row with no removed_at (none: 400 ALREADY_REMOVED_ERROR). For restore it picks the removed row with the latest removed_at (Date.parse; ties keep input order; none: 400 NOT_REMOVED_ERROR). The no-position fallback is unchanged. Update the doc comment of pickTargetRow: since #354 a removed row and a live row can share a rank and slot, so with a position the route acts on the row that matches the action. In the restore branch, an update error with code '23505' returns 409 { error: COPY C-1 } before the existing error branch, with no audit entry and no console.error; every other error keeps its console.error (constant first argument, CodeQL) and the 500 'Couldn't restore item. Try again.'. The route's JSDoc body notes that a restore returns 409 when another item now holds that rank and slot. No pre-check query: the database decides, so there is no race between a check and the write, and on the current database (full constraint) this code path cannot raise 23505 for an update of removed_at alone.
- D-05 (officer review modal): domain/loot/list-row-updates.ts gains export function groupDetailRowsByRank<T extends DetailRow & { removed_at?: string | null }>(rows: readonly T[]): Array<{ rank: number; slot1?: T; slot2?: T }> (JSDoc; ranks descending; per rank and slot the first row with no removed_at, else the removed row with the latest removed_at, ties and unparsable values keeping input order; rank and slot compared with Number(); rows with another slot value are ignored; input never mutated). withoutDetailRow (used after an officer remove) prefers, among rows matching item, rank and slot, the first row with no removed_at and falls back to the first match; restoreDetailRow (used after a restore) prefers the matching removed row with the latest removed_at and falls back to the first match. Existing behaviour for rows without removed_at is unchanged. In LootSubmissionsContent.tsx, groupedSubmissionDetails becomes useMemo(() => groupDetailRowsByRank(submissionDetails), [submissionDetails]) with a one-line comment (one cell per rank and slot; a removed row and a live row can share a position since #354 and the live one is shown); the desktop table maps each group to a row keyed by group.rank with renderItemCell(group.slot1) and renderItemCell(group.slot2), and the mobile cards use renderMobileItem(group.slot1, 'Item #1') and renderMobileItem(group.slot2, 'Item #2'). A side effect, intended: a rank that has only a slot 2 row now shows it under Item #2 (today it shows under Item #1). Nothing else in the file changes (wtofc / PR #364 edits other regions of this file; the hunks do not overlap).
- D-06 (proof): PGlite scenario SP/pglite-354/scenarios-354.mjs (scratchpad only, never committed), run red before the migration file exists and green after; the migration shape test; route and helper unit tests; full vitest compared with a clean baseline; tsc; eslint. The planner probe SP/pglite-354/probe-planner.mjs (output run-output-probe-planner.txt, 6 of 6 PASS) already showed the failure and the fix inside a transaction; leave both files in place.
- D-07 (wording and delivery): commit messages, comments, test names and PGlite labels are neutral and specific (for example "removed loot list items no longer hold their rank and slot"). No em dash anywhere added. Each commit ends with the trailer "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>". The migration and its shape test are one commit that touches nothing else (Task 1); app commits touch nothing under supabase/ and not the shape test (Tasks 2 and 3). Per OD-2, the orchestrator ships the app commits as PR 1 first and the migration commit as a separate migration-only PR 2 (merged with --admin; it deploys about 12 seconds after merge) once PR 1's production deploy is live. Do not push, do not open a PR, no planning files in WT. Each task ends committed so a fresh executor can continue; if context runs long after a task, stop there, append a short neutral note to SP/354-handoff.txt (tasks done, commit hashes, latest PGlite output file and its PASS count, whether SP/baseline-354-vitest.txt has its EXIT line, next task) and return a checkpoint naming the next task. A fresh executor reads this plan, SP/354-handoff.txt and git log origin/main..HEAD in WT, and never re-runs Step 0 when the baseline file already has its EXIT line.

## Open decisions (the orchestrator records the user's answer in Resolution before execution)

| ID | Question | Recommendation | Resolution |
|----|----------|----------------|------------|
| OD-1 | After the fix a live item can sit at the rank and slot of a removed item. What should "Undo" (restore) of that removed item do? | Option A, as D-04: refuse with 409 and COPY C-1, nothing changes. The raider's editor never offers Undo at a position that shows a live item (it shows the live item instead), and after D-05 neither does the officer modal, so this answer is mostly reached from a page that was open before the change. Option B: restore it into the first free slot nearby (silently changes the raider's ranking; needs a placement rule and copy saying where it went). Option C: restore it and move the live item elsewhere (changes another item's rank without asking). If B or C, stop and return for a plan revision. | Option A (refuse with 409 and C-1, change nothing), user, 2026-10-03 |
| OD-2 | Delivery order of the two PRs. | App PR first (the Task 2 and Task 3 commits; they behave as today on the current database, where a position is never shared, apart from a slot-2-only rank now showing under Item #2), then the migration-only PR (Task 1 commit) once that production deploy is live. Alternative: migration first, so saves are fixed sooner; until the app PR ships, the officer modal can show a removed row in place of the live item or push a live slot 2 item out of view, a remove at a shared position can answer "Item already removed", and a blocked restore returns the 500 "Couldn't restore item. Try again.". | App PR first, migration-only PR after the app deploy is live, user, 2026-10-03 |
| OD-3 | Should the raider's list editor let a raider pick a new item in a slot that shows a removed item? Today such a slot shows the struck-through Removed card with Undo and no picker or drop target; BIS import, and a page opened before the item was removed, still place items there, and those are the saves that fail today. | Not in this task. The database fix makes those saves work, and the editor already shows a live item over a removed one. If wanted, a follow-up quick task (UI change, possibly new copy). If the user wants it here, stop and return for a plan revision. | Not in this task; follow-up, user, 2026-10-03 |

## COPY (needs user sign-off; no em dashes; the orchestrator records approval or edits here before execution)

SIGN-OFF 2026-10-03: the user approved C-1 as drafted and the reused texts listed below.

New text:
- C-1 (409 from POST /api/loot-submissions/remove-item when a restore targets a rank and slot that another live item now holds; the officer review modal shows the server text in its error toast; the raider page keeps its own existing "Couldn't restore item. Try again."): "Another item is now at this rank and slot. Remove or move it first, then try again."

Reused existing text (same wording, listed so the user can confirm the reuse):
- remove-item: "Item not found in this submission" (404), "Item already removed" (400), "Item is not removed" (400), "Couldn't restore item. Try again." (500, any other restore error).
- Officer modal and raider page toasts are unchanged.

Not user-facing (no sign-off needed): the COMMENT ON INDEX text in D-01 and the migration header.
</objective>

<execution_context>
@/Users/alexander.mayes/Code/personal/loot-list-plus/.claude/gsd-core/workflows/execute-plan.md
@/Users/alexander.mayes/Code/personal/loot-list-plus/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@/Users/alexander.mayes/Code/personal/loot-list-plus/.claude/CLAUDE.md
@/Users/alexander.mayes/Code/personal/loot-list-plus/.planning/workstreams/default/STATE.md
@/Users/alexander.mayes/Code/personal/loot-list-plus/.planning/workstreams/default/quick/261001-tv5-allow-a-second-award-of-the-same-item-on/261001-tv5-SUMMARY.md

Source files (WT-relative):
- supabase/migrations/20260101000000_baseline_schema.sql: loot_submission_items table 1948-1970 (slot CHECK 1 or 2, removed_at and removed_by nullable), pkey 2413-2414, the two UNIQUE constraints 2418-2419 and 2423-2424, idx_lsi_submission 2882, foreign keys 3290-3301, policies 3827-3836 and 4119-4150; delete_guild 194-205
- supabase/migrations/20260727000001_fix_save_submission_items_ownership.sql 28-70 (current save_submission_items); 20260930000200 117-118 (its grants)
- supabase/migrations/20260930000000_enforce_loot_list_status_rules.sql (item rules trigger: parent status only, no rank or slot)
- supabase/migrations/20261001120000_allow_second_same_night_award.sql (index swap precedent: header, lock_timeout, no CONCURRENTLY, create before drop)
- app/services/__tests__/second-same-night-award-migration.test.ts (shape test model: stripComments, splitStatements, blankStrings, q helper, anchored timestamp check)
- scripts/deploy-migrations.sh 20-28 (one Management API query per file)
- app/contexts/LootListContext.tsx: handleItemSelect 541-556, moveRanking 558-576, importBisItems 584-698, doAutoSave 722-835 (RPC at 808), saveSubmission 868-1016 (RPC at 935), removeApprovedItem 1025-1066, restoreRemovedItem 1069-1108
- app/api/loot-list/bootstrap/route.ts 181-198 and app/api/loot-submissions/route.ts 68-90 (live rows to rankings by rank-slot, removed rows to removedItems)
- app/(app)/loot-list/components/LootListContent.tsx: removedRankings 798-805, handleRestoreItem 830-841, RankRow removed card only when no live item 236-262 and 296-330, MobileRankCard 449-470
- app/api/loot-submissions/remove-item/route.ts (pickTargetRow 70-90, status gate 152, restore 193-229, remove 255-266) and __tests__/route.test.ts (recording fake makeClient 58-132, restoreUpdateError 47 and 97, two-copy describe block 344-418)
- domain/loot/list-row-updates.ts (positionKey, removeRankingAt, detailRowKey, withoutDetailRow 60-64, restoreDetailRow 67-73) and domain/loot/__tests__/list-row-updates.test.ts
- app/(app)/loot-submissions/components/LootSubmissionsContent.tsx: import from list-row-updates 39, SubmissionDetailItem 87-99, computeDiff 626-632, item and snapshot load 646-664, handleRemoveItem 734-776, handleRestoreItem 779-813, groupedSubmissionDetails 826-838, desktop rows 1271-1283, mobile cards 1290-1305
- app/api/loot-submissions/revert/route.ts 123-151, submit/route.ts 85-93, review/route.ts 88-91
- SP/pglite-all/README.md (harness API), SP/pglite-354/probe-planner.mjs (planner probe), SP/new-fails.sh

## Investigation findings (verified in WT at 412f2e32)

1. Constraints. The two UNIQUE ("submission_id", "rank", "slot") constraints are at baseline 2419 (loot_submission_items_submission_id_rank_slot_key) and 2424 (loot_submission_items_unique_submission_rank_slot). No later migration touches them (20260913000000 line 78 only mentions the rule in a comment). No table references loot_submission_items by these columns.

2. Every writer of loot_submission_items:

| Path | Client | Write | Effect of the change |
|------|--------|-------|----------------------|
| save_submission_items via LootListContext doAutoSave (808) and saveSubmission (935) | user session (owner or officer, SECURITY DEFINER) | DELETE live rows, INSERT payload | the failing insert today; fixed (D-02) |
| remove-item route, remove (257-261) | service role | set removed_at by row id, guarded by removed_at IS NULL | position pick per D-04 |
| remove-item route, restore (201-204; allowed for any list status, 152) | service role | clear removed_at by row id | can now collide with a live row: 409 per D-04 |
| revert route (123-151) | service role | DELETE every row of the list (removed rows too), INSERT snapshot rows | unaffected |
| characters/[id] DELETE (307-313), user/delete-account (111), delete_guild (baseline 200), cascades | service role or owner | delete | unaffected |
| scripts (seed-test-data, seed-test-data-multiuser, purge-test-characters) | service role (dev) | insert distinct ranks, delete | unaffected |
| enforce_loot_submission_item_rules (20260930000000) | trigger | reads the parent status only | unaffected; still fires (354-CTRL-2) |
| merge_phase_groups (20260729000001) | service role | updates loot_submissions.phase only | no item write |
| addon, companion, Discord bot | none | no write (companion/src and discord-bot have no reference; the addon lives in its own repo since #358 and reads exports) | none |

No un-receive or award-deletion flow clears removed_at: the only writer of removed_at is the remove-item route. Awards (loot_history) never touch list rows.

3. ON CONFLICT: no supabase-js upsert or SQL ON CONFLICT targets loot_submission_items anywhere (app, lib, scripts, supabase/seed.sql, migrations, companion, discord-bot), and nothing names either constraint. So the partial index needs no ON CONFLICT support.

4. Readers of removed rows' rank and slot:
- bootstrap route and GET /api/loot-submissions: live rows become rankings keyed rank-slot (still at most one per position), removed rows become removedItems.
- Raider editor: removedRankings map (last one per position wins); RankRow and MobileRankCard show the Removed card only when no live item is at that position, so a live item is shown over a removed one.
- Officer modal: loads every row (646-656), groups by rank and shows itemsArr[0] and itemsArr[1] (826-838, 1271-1305). With a live and a removed row at one position, a live slot 2 item can be pushed out of view: D-05.
- list-row-updates withoutDetailRow and restoreDetailRow take the first row matching item, rank and slot: D-05.
- remove-item pickTargetRow takes the first row at a position, so a remove could hit the removed copy of a re-listed item and answer "Item already removed": D-04.
- computeDiff (626-632) counts removed rows as current items; it compares per item by rank, so shared positions do not change it (pre-existing behaviour, follow-up only).
- Live-only readers (no change): submit 85-93, review approve snapshot 88-91 (snapshots are built from live rows, so a snapshot never holds two items at one position), master sheet 1067-1070, master-sheet visibility 258-261, item-counts 25-28, admin diagnose 86-89, dashboard, master-loot, lib/addon/member-ranked-items.ts 75 (addon exports), BLP recompute (20260721000001 75-80), research query scripts/analytics/queries/wow-classic-loot-systems-2026/02-median-list-length.sql 63-65 (removed_at IS NULL). The received skip counts loot_history awards against live ranking entries, not removed rows.

5. Production data and index build: the current full rule forbids any two rows at one position, so no two live rows can exist and the index build cannot fail on data. One transaction per file (deploy script), so no CONCURRENTLY (D-03).

6. Types: lib/database.types.ts has no constraint or index names for this table; no change.

7. Planner probe (SP/pglite-354/probe-planner.mjs, output SP/pglite-354/run-output-probe-planner.txt, PASS 6 FAIL 0): on the current migrations a raider session's save of a live item at a removed row's position fails 23505 on loot_submission_items_submission_id_rank_slot_key; with the partial index and both drops (applied inside the probe only) the same save passes and leaves one live and one removed row at 50-1, a restore of the removed row then fails 23505 on the new index, and two live rows at one position still fail.

8. UI paths: the raider editor gives a slot with only a removed row no picker and no drop target (LootListContent 236-262), but importBisItems builds new rankings without looking at removed rows, and a page opened before an item was removed still holds that item at its position; both save into removed positions and fail today. After the fix, a stale page can re-list an item that was removed while it was open; the removed row is kept, as if the raider had added the item again (accepted, T-fcg-01).

9. Other open work: wtofc (PR #364) edits LootSubmissionsContent.tsx around imports after line 40 and at 133-183, 496-766, 984-1038, 1501-1593; this plan edits the import at 39 and 826-838, 1268-1305. Whichever merges second rebases; the hunks do not overlap. wtbot (PR #363) touches none of these files.

## Production catalog check (read-only; aggregate counts and schema metadata only; the user runs it in the Supabase SQL editor)

```sql
-- 1. Before merging the migration PR: live rows sharing a rank and slot (expected 0; the current rule forbids them)
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
</context>

<tasks>

<task type="tracer">
  <name>Task 1: Tracer, a raider saves a new item on a removed row's rank and slot, end to end in the database (PGlite red, migration and shape test, PGlite green)</name>
  <files>supabase/migrations/20261003120000_unique_live_loot_list_item_positions.sql, app/services/__tests__/live-loot-list-item-positions-migration.test.ts</files>
  <precondition>WT is on fix/354-removed-items-keep-rank-slot at 412f2e32 with a clean git status; SP/pglite-all/run.mjs and SP/new-fails.sh exist.</precondition>
  <reversibility rating="costly">Once a removed row shares a rank and slot with another row, restoring the old full constraint needs those rows moved or deleted first (D-03 Rollback).</reversibility>
  <read_first>SP/pglite-all/README.md; SP/pglite-354/probe-planner.mjs; supabase/migrations/20260101000000_baseline_schema.sql lines 1948-1972 and 2413-2425; supabase/migrations/20260727000001_fix_save_submission_items_ownership.sql; supabase/migrations/20261001120000_allow_second_same_night_award.sql; app/services/__tests__/second-same-night-award-migration.test.ts</read_first>
  <behavior>
    - Before the migration file exists: 354-SAVE-1 fails with 23505 on one of the two old constraints; 354-CTRL-1 and 354-CTRL-2 pass.
    - After it: every SAVE, CTRL and CAT check passes.
    - Shape test: five statements in D-01 order; index before both drops; dropped names equal the baseline UNIQUE constraint names on loot_submission_items; predicate exactly WHERE ("removed_at" IS NULL); nothing forbidden.
  </behavior>
  <action>
Step 0, baselines (skip if SP/baseline-354-vitest.txt already has an EXIT= line): in WT confirm git status --porcelain is empty and git rev-parse HEAD starts with 412f2e32. Run the full suite in the foreground with a 600000 ms timeout, writing to SP/baseline-354-vitest.txt a first line HEAD=(git rev-parse HEAD), then the npx vitest run output, then a last line EXIT=(vitest exit code). Save npx tsc --noEmit output plus an EXIT= line to SP/baseline-354-tsc.txt (if it is not empty or not 0, stop and return a checkpoint naming the errors), and npx eslint on app/api/loot-submissions/remove-item, domain/loot/list-row-updates.ts, domain/loot/__tests__/list-row-updates.test.ts and the LootSubmissionsContent.tsx path plus an EXIT= line to SP/baseline-354-eslint.txt.

Step 1, PGlite scenario (per D-06), written before the migration: create SP/pglite-354/scenarios-354.mjs exporting async function runJoint(h). Header: scratchpad only, never committed, quick task 261003-fcg (GH #354), deviations are the harness's D1 to D10 plus fixture lists and items made by mkList and mkItem with triggers off, seed values synthetic. It imports only node:fs and node:path (the migration path is join(h.wt, 'supabase/migrations/20261003120000_unique_live_loot_list_item_positions.sql')). Constants: the new index name, the two old constraint names, the two D-03 rollback statements as strings, and the catalog queries copied verbatim from this plan's context section. Every label is unique and starts with 354-. Sections, in this order:

SAVE (guild A seed). L1 = mkList('CA1', 'approved', { reviewed_at: new Date(), review_notes: 'synthetic' }); row a = mkItem(L1, A1 at rank 50 slot 1); row b = mkItem(L1, A2 at rank 49 slot 1). 354-SAVE-0a: the service role runs the remove-item statement shape (UPDATE public.loot_submission_items SET removed_at = now(), removed_by = users.O_A WHERE id = a AND removed_at IS NULL) and affects 1 row. 354-SAVE-0b: R1's session sends the auto-save upsert shape (INSERT INTO public.loot_submissions with L1's id, character_id, guild_id, expansion_id and phase, status 'draft', the four review fields NULL and updated_at now(), ON CONFLICT (character_id, guild_id, expansion_id, phase) DO UPDATE SET status and the four review fields and updated_at from EXCLUDED) and L1 is draft afterwards. 354-SAVE-1: R1's session runs SELECT public.save_submission_items($1, $2::jsonb) for L1 with the payload [A2 at rank 50 slot 1] and gets 1 with no error (this is the GH #354 save; use h.expectOk so a failure prints the code and message). 354-SAVE-2: row a is unchanged (id, rank, slot, loot_item_id, removed_at, removed_by deep-equal to its state after SAVE-0a), L1 has exactly one row with removed_at NULL at (50, 1) and it is A2, and L1 has 2 rows in total. 354-SAVE-3: the same call again returns 1 and leaves the same two rows (a unchanged, one live A2 at 50-1). 354-SAVE-4: a payload with A2 and A1 both at rank 47 slot 1 fails 23505 with error.constraint equal to the new index name, and L1's rows equal those after SAVE-3. 354-SAVE-5: L2 = mkList('CA2', 'draft') with mkItem(L2, A2 at rank 40 slot 2, removed_at now); O_A's session (officer branch of save_submission_items) saves [A1 at rank 40 slot 2] and gets 1. 354-SAVE-6: the service role updates L1 to pending (1 row, R1 is active) and L1's live rows grouped by (rank, slot) have no group above 1.

CTRL. 354-CTRL-1: L3 = mkList('CA1', 'draft'); R2's session save on L3 raises code P0001 with message 'Not authorized to modify this submission' and L3 has 0 rows. 354-CTRL-2: R1's session save on L1 (now pending) fails 42501 and L1's rows are unchanged (the 20260930000000 item rules trigger still applies).

CAT. 354-CAT-1: pg_indexes.indexdef of the new index equals CREATE UNIQUE INDEX idx_loot_submission_items_unique_live_rank_slot ON public.loot_submission_items USING btree (submission_id, rank, slot) WHERE (removed_at IS NULL). 354-CAT-2: the table's pg_constraint rows with contype u or p are exactly loot_submission_items_pkey; its unique indexes are exactly the pkey and the new index; neither old name exists in pg_class. 354-CAT-3: h.exec of the migration file text raises nothing and CAT-1 and CAT-2 still hold. 354-CAT-4: each rollback statement string appears verbatim in the migration file text; then on h.db, inside BEGIN with ROLLBACK in a finally block, the ADD CONSTRAINT statement fails 23505 while L1's shared position exists. 354-CAT-5: L4 = mkList('CA2', 'draft') made first; then on h.db inside BEGIN (ROLLBACK in finally): delete every removed row that shares (submission_id, rank, slot) with another row; run both rollback statements; the old constraint exists and the new index does not; SAVEPOINT; superuser INSERT of a removed row for L4 at rank 30 slot 1, then of a live row at the same position, which fails 23505; ROLLBACK TO SAVEPOINT; after the final ROLLBACK, CAT-1 holds again. 354-CAT-6: the four catalog queries run verbatim as the superuser: query 1 returns 0, query 3 lists only loot_submission_items_pkey (contype p) and an index list that includes the new index with its WHERE clause, query 4 returns at least 1 (L1 shares a position), and query 2 returns a row.

Step 2, red run (per D-06): node SP/pglite-all/run.mjs --wt WT SP/pglite-354/scenarios-354.mjs with output to SP/pglite-354/run-output-354-before.txt (it exits 1). It must show a FAIL line for 354-SAVE-1 whose text includes 23505 and one of the old constraint names, and PASS lines for 354-CTRL-1 and 354-CTRL-2. If 354-SAVE-1 passes here, stop and return a checkpoint: the reproduction is wrong.

Step 3, shape test first (per D-01): create app/services/__tests__/live-loot-list-item-positions-migration.test.ts in the style of second-same-night-award-migration.test.ts (same helpers, header comment naming GH #354 and quick task 261003-fcg, neutral wording). Cases: (a) the file exists, MIGRATION_TIMESTAMP '20261003120000' is greater than 20261002120000 and no other file shares it; (b) exactly five statements in the D-01 order, matched by regex, and no dollar quoting; (c) the CREATE UNIQUE INDEX comes before both DROP CONSTRAINT statements; (d) the two dropped names equal exactly the set of names of the UNIQUE ("submission_id", "rank", "slot") constraints added to loot_submission_items in the baseline file (parsed from it, two names); (e) the index columns are ("submission_id", "rank", "slot") and its predicate is exactly WHERE ("removed_at" IS NULL); (f) over the string-blanked statements: no CONCURRENTLY, FUNCTION, TRIGGER, POLICY, ROW LEVEL SECURITY, GRANT, REVOKE, TRUNCATE, INSERT INTO, DELETE FROM, UPDATE ... SET, or DROP TABLE, COLUMN, INDEX, TRIGGER, FUNCTION or POLICY; exactly two statements contain DROP and both are ALTER TABLE ... DROP CONSTRAINT IF EXISTS. Run it: it fails because the file does not exist yet.

Step 4, migration (per D-01, D-03): write the file with the D-01 header and the five statements exactly as D-01 gives them. The Rollback section lists the count query (catalog query 4) and the two rollback statements verbatim, and says the rollback is costly once a removed row shares a position.

Step 5, green: run the shape test and npx vitest run app/services (the other migration tests, including the function grants ratchet, must keep passing), then the PGlite run with output to SP/pglite-354/run-output-354-task1.txt: exit 0 and no FAIL line.

Step 6, commit the migration side (per D-07): stage exactly the migration and the shape test; message for example "fix(db): removed loot list items no longer hold their rank and slot (#354)" with two or three neutral body lines (a partial unique index on rows that are not removed replaces the two identical unique constraints; a save that puts a new item where a removed item sits now succeeds; two live items still cannot share a rank and slot) and the trailer. Do not push.
  </action>
  <verify>
    <automated>WT=/private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/d08e3d4d-0791-40f5-b5d0-31ab44981efd/scratchpad/wt354; SP=/private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/d08e3d4d-0791-40f5-b5d0-31ab44981efd/scratchpad; cd "$WT" && grep -q '^EXIT=' "$SP/baseline-354-vitest.txt" && head -1 "$SP/baseline-354-vitest.txt" | grep -q '^HEAD=412f2e32' && grep -Eq '^FAIL 354-SAVE-1.*23505' "$SP/pglite-354/run-output-354-before.txt" && grep -Eq 'loot_submission_items_submission_id_rank_slot_key|loot_submission_items_unique_submission_rank_slot' "$SP/pglite-354/run-output-354-before.txt" && grep -q '^PASS 354-CTRL-2' "$SP/pglite-354/run-output-354-before.txt" && npx vitest run app/services && node "$SP/pglite-all/run.mjs" --wt "$WT" "$SP/pglite-354/scenarios-354.mjs" > "$SP/pglite-354/run-output-354-task1.txt" 2>&1 && ! grep -q '^FAIL' "$SP/pglite-354/run-output-354-task1.txt" && grep -q '^PASS 354-SAVE-1' "$SP/pglite-354/run-output-354-task1.txt" && grep -q '^PASS 354-CAT-6' "$SP/pglite-354/run-output-354-task1.txt" && test -z "$(git status --porcelain)" && [ "$(git show --name-only --format= HEAD | grep . | LC_ALL=C sort | tr '\n' ' ')" = "app/services/__tests__/live-loot-list-item-positions-migration.test.ts supabase/migrations/20261003120000_unique_live_loot_list_item_positions.sql " ] && git log -1 --format=%B | grep -q '^Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>$'</automated>
  </verify>
  <done>Baselines exist. The red run reproduces GH #354 (354-SAVE-1 fails with 23505 on an old constraint while the controls pass); after the migration a raider's save of a new item at a removed row's position succeeds and keeps the removed row, two live items still cannot share a position, the item rules trigger still applies, the migration re-applies cleanly and its documented rollback behaves as stated; the shape test and the other migration tests pass; one local commit holding exactly the migration and the shape test, with the trailer.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Remove and restore act on the right row when a removed and a live row share a rank and slot, and a blocked restore answers 409</name>
  <files>app/api/loot-submissions/remove-item/route.ts, app/api/loot-submissions/remove-item/__tests__/route.test.ts</files>
  <precondition>Task 1 is committed in WT (git log origin/main..HEAD shows the migration commit, git status is clean, SP/pglite-354/run-output-354-task1.txt has no FAIL line); OD-1 has a Resolution and COPY C-1 is signed off. If OD-1 is B or C, stop and return for a plan revision.</precondition>
  <read_first>app/api/loot-submissions/remove-item/route.ts; app/api/loot-submissions/remove-item/__tests__/route.test.ts (makeClient, baseFixture, the describe block 'one row of an item listed twice')</read_first>
  <behavior>
    - Remove at rank 50 slot 1 when the item has a removed row and a live row there (both input orders): the update filters id equal to the live row and removed_at null; 200.
    - Remove at a position whose only row of the item is removed: 400 'Item already removed' (existing test).
    - Restore at rank 50 slot 1 when the item has a live row and a removed row there (both orders): the update targets the removed row's id; 200.
    - Restore at a position holding two removed rows of the item: the update targets the one with the later removed_at.
    - Restore whose update returns { code: '23505' }: 409 with COPY C-1; logAudit not called.
    - Restore whose update returns another error: 500 'Couldn't restore item. Try again.' (unchanged).
    - Restore and remove without a position, and every existing test: unchanged.
  </behavior>
  <action>
Tests first (per D-04): in the test file, let the fixture's restoreUpdateError also carry an optional code (type { message: string; code?: string }), and add a describe block for rows that share a rank and slot covering the behavior list, asserting the id filter of the recorded update call and, for the 409 case, that logAudit (already mocked) was not called. Run them: the new cases fail.

Then change the route as D-04 says: the position branch of pickTargetRow filters the rows at the position, picks the live row for remove and the latest removed row for restore, and keeps the three existing error texts and statuses; add a constant for COPY C-1 next to the other error constants; in the restore branch return 409 with it when restoreError.code is '23505', before the existing console.error and 500; update the pickTargetRow and POST doc comments. Keep every console.error with a constant first argument (CodeQL).

PGlite (per D-06): append section REM to SP/pglite-354/scenarios-354.mjs, after CAT. L5 = mkList('CA2', 'approved') with row r1 = A1 at rank 45 slot 1; the service role removes r1 with the remove statement shape; R2's session sends the auto-save upsert to draft and saves [A1 at 45-1 and A2 at 44-1]. 354-REM-4 (first, it sets up the rest): the remove-item lookup shape (SELECT id, rank, slot, loot_item_id, removed_at FROM loot_submission_items WHERE submission_id = L5 AND loot_item_id = A1) returns two rows at (45, 1), one live and one removed (why the route picks by action). 354-REM-1: the restore shape (UPDATE ... SET removed_at = NULL, removed_by = NULL WHERE id = r1) fails 23505 naming the new index and r1 stays removed. 354-REM-2: the remove shape on the live A1 row affects 1 row, and two removed rows now share (45, 1). 354-REM-3: restoring the row removed in REM-2 affects 1 row; restoring r1 afterwards fails 23505. 354-REM-5: the revert shape (the service role deletes every row of L5, then inserts [A1 at 45-1, A2 at 44-1]) passes and leaves two live rows and no removed row. Run the scenario with output to SP/pglite-354/run-output-354-task2.txt: exit 0, no FAIL line.

Run the remove-item tests, npx tsc --noEmit and eslint on the two files. Commit (per D-07): message for example "fix(loot-lists): remove and restore act on the right row when a removed item shares its rank and slot (#354)" with neutral body lines (with a position, remove picks the live row and restore the latest removed row; a restore into a rank and slot another item holds returns 409) and the trailer.
  </action>
  <verify>
    <automated>WT=/private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/d08e3d4d-0791-40f5-b5d0-31ab44981efd/scratchpad/wt354; SP=/private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/d08e3d4d-0791-40f5-b5d0-31ab44981efd/scratchpad; cd "$WT" && npx vitest run app/api/loot-submissions/remove-item && node "$SP/pglite-all/run.mjs" --wt "$WT" "$SP/pglite-354/scenarios-354.mjs" > "$SP/pglite-354/run-output-354-task2.txt" 2>&1 && ! grep -q '^FAIL' "$SP/pglite-354/run-output-354-task2.txt" && grep -q '^PASS 354-REM-5' "$SP/pglite-354/run-output-354-task2.txt" && grep -q '^PASS 354-SAVE-1' "$SP/pglite-354/run-output-354-task2.txt" && npx tsc --noEmit > "$SP/task2-354-tsc.txt" 2>&1 && npx eslint app/api/loot-submissions/remove-item > "$SP/task2-354-eslint.txt" 2>&1 && test -z "$(git status --porcelain)" && test "$(git rev-list --count origin/main..HEAD)" -ge 2 && test -z "$(git show --name-only --format= HEAD | grep -E '^supabase/|live-loot-list-item-positions-migration')" && git log -1 --format=%B | grep -q '^Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>$'</automated>
  </verify>
  <done>With a rank and slot, remove acts on the live row and restore on the latest removed row of the item, also when both share the position; a restore into a position another live item holds returns 409 with COPY C-1 and writes nothing else; other errors keep their texts; the remove-item tests pass; PGlite SAVE, CTRL, CAT and REM pass with zero FAIL lines; tsc and eslint pass; one more local app commit with the trailer.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: The officer review modal shows the live item for each rank and slot, then full verification</name>
  <files>domain/loot/list-row-updates.ts, domain/loot/__tests__/list-row-updates.test.ts, app/(app)/loot-submissions/components/LootSubmissionsContent.tsx</files>
  <precondition>Tasks 1 and 2 are committed in WT (git status clean, SP/pglite-354/run-output-354-task2.txt has no FAIL line); OD-2 and OD-3 have a Resolution. If OD-3 asks for a picker on removed slots, stop and return for a plan revision.</precondition>
  <read_first>domain/loot/list-row-updates.ts; domain/loot/__tests__/list-row-updates.test.ts; app/(app)/loot-submissions/components/LootSubmissionsContent.tsx lines 35-45, 80-100, 640-680, 730-840 and 1100-1310</read_first>
  <behavior>
    - groupDetailRowsByRank: rows at rank 50 slots 1 and 2 and rank 49 slot 2 only give [{ rank 50, slot1, slot2 }, { rank 49, slot1 undefined, slot2 }], ranks descending.
    - A live and a removed row at 50-1 (either order): slot1 is the live row.
    - Two removed rows at 50-1 and no live row: the later removed_at; equal or unparsable values keep input order.
    - Rows without removed_at count as live; string rank and slot compare as numbers; input not mutated; empty input gives [].
    - withoutDetailRow with a removed and a live row of the item at the position drops the live row (either order); existing cases unchanged.
    - restoreDetailRow with a live and a removed row there clears removed_at on the removed one only; with two removed rows, on the later one; existing cases unchanged.
  </behavior>
  <action>
Tests first (per D-05): extend domain/loot/__tests__/list-row-updates.test.ts with the behavior cases (keep every existing test), run them (red), then implement groupDetailRowsByRank and the two preference changes in domain/loot/list-row-updates.ts with JSDoc and a short update to the module header (a removed row and a live row can share a rank and slot since #354).

Page (per D-05): in LootSubmissionsContent.tsx import groupDetailRowsByRank with the existing list-row-updates import, replace the body of groupedSubmissionDetails with the helper call and its one-line comment, and change the desktop table and mobile card maps to use group.rank, group.slot1 and group.slot2 as D-05 says. No other change in the file; no new text.

Commit (per D-07): message for example "fix(loot-submissions): the review modal shows the live item for each rank and slot (#354)" with neutral body lines and the trailer.

Full verification (per D-06, D-07), in this order so any fixup commit lands before the long run:
(1) Text gate over the lines this branch adds (git diff origin/main...HEAD -U0 saved to SP/final-354-diff.txt, added lines only) and its commit messages: both non-empty and no em dash. If it fails, reword and add a fixup commit now.
(2) eslint on every changed or added lintable file to SP/final-354-eslint.txt (exit 0; compare warnings with SP/baseline-354-eslint.txt by hand: LootSubmissionsContent.tsx may keep its baseline warnings, nothing new) and npx tsc --noEmit to SP/final-354-tsc.txt (exit 0).
(3) Final PGlite run of all sections to SP/pglite-354/run-output-354.txt (exit 0, no FAIL line).
(4) Last, after the final commit and with no change in WT while it runs: the full suite to SP/final-354-vitest.txt in the Step 0 layout (first line HEAD=, last line EXIT=), foreground with a 600000 ms timeout. Gate it with sh SP/new-fails.sh SP/baseline-354-vitest.txt SP/final-354-vitest.txt run from WT (a new FAIL counts as flaky only if its file passes alone). Any later commit means running the suite again.
(5) Confirm WT is clean, the diff file set equals files_modified, lib/database.types.ts is unchanged, no planning files are in WT, the branch has no upstream and nothing was pushed.

SUMMARY (main checkout, not WT): see output.
  </action>
  <verify>
    <automated>WT=/private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/d08e3d4d-0791-40f5-b5d0-31ab44981efd/scratchpad/wt354; SP=/private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/d08e3d4d-0791-40f5-b5d0-31ab44981efd/scratchpad; cd "$WT" && npx vitest run domain/loot/__tests__/list-row-updates.test.ts app/api/loot-submissions/remove-item app/services/__tests__/live-loot-list-item-positions-migration.test.ts && node "$SP/pglite-all/run.mjs" --wt "$WT" "$SP/pglite-354/scenarios-354.mjs" > "$SP/pglite-354/run-output-354.txt" 2>&1 && ! grep -q '^FAIL' "$SP/pglite-354/run-output-354.txt" && grep -q '^PASS 354-SAVE-1' "$SP/pglite-354/run-output-354.txt" && grep -q '^PASS 354-CTRL-2' "$SP/pglite-354/run-output-354.txt" && grep -q '^PASS 354-CAT-6' "$SP/pglite-354/run-output-354.txt" && grep -q '^PASS 354-REM-5' "$SP/pglite-354/run-output-354.txt" && npx eslint app/api/loot-submissions/remove-item domain/loot/list-row-updates.ts domain/loot/__tests__/list-row-updates.test.ts "app/(app)/loot-submissions/components/LootSubmissionsContent.tsx" app/services/__tests__/live-loot-list-item-positions-migration.test.ts > "$SP/final-354-eslint.txt" 2>&1 && npx tsc --noEmit > "$SP/final-354-tsc.txt" 2>&1 && grep -q '^EXIT=' "$SP/baseline-354-vitest.txt" && grep -q '^EXIT=' "$SP/final-354-vitest.txt" && test "$SP/final-354-vitest.txt" -nt "$(git rev-parse --git-path logs/HEAD)" && sh "$SP/new-fails.sh" "$SP/baseline-354-vitest.txt" "$SP/final-354-vitest.txt" && git rev-parse --verify origin/main > /dev/null && git diff origin/main...HEAD -U0 > "$SP/final-354-diff.txt" && ADDED=$(grep '^+' "$SP/final-354-diff.txt" | grep -v '^+++') && [ -n "$ADDED" ] && MSGS=$(git log origin/main..HEAD --format=%B) && [ -n "$MSGS" ] && EMDASH=$(printf '\342\200\224') && ! printf '%s\n%s\n' "$ADDED" "$MSGS" | grep -qF "$EMDASH" && N=$(git rev-list --count origin/main..HEAD) && test "$N" -ge 3 && [ "$(git log origin/main..HEAD --format=%B | grep -c '^Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>$')" = "$N" ] && ( for c in $(git rev-list origin/main..HEAD); do F=$(git show --name-only --format= "$c" | grep .); M=$(printf '%s\n' "$F" | grep -cE '^supabase/|^app/services/__tests__/live-loot-list-item-positions-migration\.test\.ts$'); T=$(printf '%s\n' "$F" | grep -c .); [ "$M" -eq 0 ] || [ "$M" -eq "$T" ] || exit 1; done ) && [ "$(git diff --name-only origin/main...HEAD | LC_ALL=C sort | tr '\n' ' ')" = "app/(app)/loot-submissions/components/LootSubmissionsContent.tsx app/api/loot-submissions/remove-item/__tests__/route.test.ts app/api/loot-submissions/remove-item/route.ts app/services/__tests__/live-loot-list-item-positions-migration.test.ts domain/loot/__tests__/list-row-updates.test.ts domain/loot/list-row-updates.ts supabase/migrations/20261003120000_unique_live_loot_list_item_positions.sql " ] && test -z "$(git status --porcelain)" && ! git rev-parse --abbrev-ref --symbolic-full-name '@{u}' > /dev/null 2>&1 && test -f /Users/alexander.mayes/Code/personal/loot-list-plus/.planning/workstreams/default/quick/261003-fcg-fix-gh-354-saving-a-list-fails-when-a-ne/261003-fcg-SUMMARY.md</automated>
    <human-check>After both PRs are live (not blocking execution): on a test list with a removed (received) item, run BIS import or another edit that puts a new item at that rank and slot, and confirm the list saves and shows the new item; in the officer review modal, confirm the new item shows in its own slot column; restoring the removed item at that position shows COPY C-1 and changes nothing.</human-check>
  </verify>
  <done>The officer review modal shows one cell per rank and slot, the live row first, each slot in its own column; officer remove and restore update the matching row; helper tests pass; the full suite has no new FAIL line against the baseline; tsc and eslint pass with no new warning; the final PGlite run has zero FAIL lines; no em dash in added lines or commit messages; three or more local commits, each with the trailer, migration side and app side never mixed; the diff file set equals files_modified; WT clean, no upstream, nothing pushed; the SUMMARY exists in the main checkout.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| browser (raider or officer session) to save_submission_items RPC | Untrusted payload of items, ranks and slots; the function deletes the list's live rows and inserts the payload as the table owner after its own owner or officer check |
| browser to POST /api/loot-submissions/remove-item | Untrusted submission_id, loot_item_id, rank, slot and restore flag; the route writes with the service role after its owner or officer check |
| migration deploy to production database | One transaction per file; locks on loot_submission_items while the index is built and the constraints are dropped |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-fcg-01 | Tampering | save_submission_items after the change | low | accept | A live item can now sit at a removed row's position, including the same item again; the removed row is kept unchanged (354-SAVE-2), live positions stay unique (354-SAVE-4), the RPC's owner or officer check and the item rules trigger for pending and approved lists are unchanged (354-CTRL-1, 354-CTRL-2), and the received skip counts loot_history awards, not removed rows |
| T-fcg-02 | Denial of service | migration lock on loot_submission_items | medium | mitigate | lock_timeout 5s, index built before the drops, idempotent statements, whole file in one transaction (a timeout rolls back and re-runs on the next deploy); catalog query 2 sizes the table before merge |
| T-fcg-03 | Denial of service | migration failing on deploy because existing rows break the new index | low | mitigate | Impossible by construction (the current full rule is stricter); catalog query 1 confirms 0 before merge; PGlite 354-CAT-3 re-apply |
| T-fcg-04 | Tampering | restore into an occupied rank and slot | low | mitigate | The partial index refuses it (23505, 354-REM-1, 354-REM-3); the route returns 409 COPY C-1 with nothing written (route test) |
| T-fcg-05 | Tampering | remove or restore acting on the wrong row at a shared position | medium | mitigate | D-04 mode-aware pick (route tests); D-05 local state updates the matching row (helper tests) |
| T-fcg-06 | Repudiation | remove and restore audit entries | low | accept | Unchanged: both paths still log the row's rank; a refused restore writes nothing, so there is nothing to log |
| T-fcg-07 | Denial of service | rollback after shared positions exist | low | accept | Rollback is costly by design; the header gives the count query and the order of statements, proven in PGlite 354-CAT-4 and 354-CAT-5 |
| T-fcg-08 | Information disclosure | COPY C-1 | low | accept | Names nothing beyond the list the caller is already allowed to edit |

No package installs: the proof reuses the existing SP/pglite-all node_modules, so there is no supply-chain gate.
</threat_model>

<verification>
- PGlite: SP/pglite-354/run-output-354-before.txt shows the red run (FAIL 354-SAVE-1 with 23505 on an old constraint; controls pass); run-output-354-task1.txt, run-output-354-task2.txt and run-output-354.txt have zero FAIL lines, with SAVE, CTRL, CAT and REM sections.
- vitest: the shape test, the other migration tests, the remove-item tests and the list-row-updates tests pass; the full run has no new FAIL line against SP/baseline-354-vitest.txt (flaky only if the file passes alone).
- npx tsc --noEmit exits 0; eslint exits 0 on the changed files with no warning beyond the baseline.
- Text gate: no em dash in added lines or commit messages, on a non-empty diff.
- Git: three or more local commits on fix/354-removed-items-keep-rank-slot with the trailer; the migration commit holds exactly the migration and its shape test; app commits touch nothing under supabase/; clean status, nothing pushed, no PR, no planning files in WT.
</verification>

<success_criteria>
- A raider whose list has a removed (received) item can save a new item at that rank and slot; the removed row stays as it was.
- Two live items still cannot share a rank and slot.
- Remove and restore act on the right row at a shared position, and a blocked restore says why with COPY C-1.
- The officer review modal shows the live item for each rank and slot, each slot in its own column.
- OD-1 to OD-3 resolutions and the signed-off COPY are applied exactly; the migration ships in its own commit for a separate migration-only PR, after the app PR per OD-2.
</success_criteria>

<output>
Create /Users/alexander.mayes/Code/personal/loot-list-plus/.planning/workstreams/default/quick/261003-fcg-fix-gh-354-saving-a-list-fails-when-a-ne/261003-fcg-SUMMARY.md when done (main checkout, not WT). Include: every commit hash with its message, split into "PR 1, app code (works on the current database)" and "PR 2, migration-only (after PR 1 is live; merge with --admin)" per OD-2; the final migration statement list and its Rollback; the OD resolutions as applied; COPY C-1 as shipped; the remove-item pick and 409 rules; the officer modal grouping (including the slot-2-only rank now under Item #2); PGlite PASS counts per section for the before, task 1, task 2 and final runs; baseline versus final vitest, tsc and eslint results, with any FLAKY lines; the production catalog queries with the instruction to run 1 and 2 before merging PR 2, 3 after the deploy, and 4 any time; any handoff notes from SP/354-handoff.txt; and follow-ups in neutral wording: the raider page shows a generic error and does not refresh after a refused restore (restoreRemovedItem returns only a boolean); with two removed rows at one position the raider page shows whichever the API returns last (the removed rows are unordered); the revert route deletes removed rows along with live ones before restoring the snapshot; the officer review diff counts removed rows as current items; OD-3 (a picker on removed slots) if the user wants it.
</output>

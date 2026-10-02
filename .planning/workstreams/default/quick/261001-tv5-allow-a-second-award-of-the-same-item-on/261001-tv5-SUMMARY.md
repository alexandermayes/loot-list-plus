---
phase: quick-261001-tv5
plan: 01
subsystem: loot-history
status: complete
tags: [loot-history, addon, master-sheet, gargul, migration, idempotency]
requires:
  - PR #337 (08dd6fb6, item copy limits, pickReceivedEntries)
  - 20260929180000 (#313 guild reference trigger)
provides:
  - loot_history.award_copy and loot_history.source_award_key
  - copy-aware per-night unique index and per-guild award key index
  - addonAwardKey and the keyed addon insert path
  - second-copy prompt on the master sheet award modal
affects:
  - POST /api/addon/import-string
  - POST /api/addon/loot-award
  - POST and PATCH /api/loot-history/bulk
  - master sheet ItemCandidateModal
tech-stack:
  added: []
  patterns:
    - per-award idempotency key with claim-or-insert retry loop
    - explicit copy number on a unique index instead of relaxing it
key-files:
  created:
    - supabase/migrations/20261001120000_allow_second_same_night_award.sql
    - app/services/__tests__/second-same-night-award-migration.test.ts
    - domain/loot/award-copies.ts
    - domain/loot/__tests__/award-copies.test.ts
    - app/(app)/master-sheet/components/__tests__/ItemCandidateModal.test.tsx
  modified:
    - lib/database.types.ts
    - lib/loot/addon-award-insert.ts
    - lib/loot/__tests__/addon-award-insert.test.ts
    - lib/loot/loot-history-rows.ts
    - lib/loot/__tests__/loot-history-rows.test.ts
    - app/api/addon/import-string/route.ts
    - app/api/addon/import-string/__tests__/route.test.ts
    - app/api/loot-history/bulk/route.ts
    - app/api/loot-history/bulk/__tests__/route.test.ts
    - app/(app)/master-sheet/components/ItemCandidateModal.tsx
    - app/api/addon/loot-award/route.ts
    - app/api/addon/loot-award/__tests__/route.test.ts
decisions:
  - "OD-1 to OD-8 implemented as recommended (user decision 2026-10-02); COPY C-1 to C-4 verbatim"
  - "A-1: a duplicate answer to an explicit award_copy counts as success in the modal (M5)"
  - "PATCH bulk: a failed next-copy lookup leaves award_copy out instead of failing the request"
  - "PATCH bulk: the audit log keeps the same three before fields as today even though the before-read now selects more columns"
metrics:
  duration: about 85 minutes
  completed: 2026-10-02
actuals:
  tokens: 30400
  tasks: 3
  commits: 4
---

# Phase quick-261001-tv5 Plan 01: Second same-night award of one item Summary

A raider can now receive one item twice on one raid night: loot_history gains award_copy (1 to 10) and source_award_key, the per-night unique index becomes copy-aware, addon awards are keyed by awardedAt, item and name with a claim-or-insert retry loop, the bulk route numbers repeats and answers duplicates with next_award_copy, and the master sheet modal asks before recording another copy.

## Commits (WT branch fix/second-same-night-award, base origin/main 2d668d01, not pushed)

| # | Hash | Message | Notes |
|---|------|---------|-------|
| 1 | 2632b48f | feat(db): let a raider receive a second copy of an item on one raid night (FU-1 of #331, #293) | MIGRATION-ONLY: exactly the migration and its shape test |
| 2 | b398fae3 | fix(addon): record a second same-night award from an addon export without duplicating re-imports (FU-1 of #331, #293) | Task 1 rest |
| 3 | f39c901d | fix(master-sheet): award a second copy of an item on one raid night after asking, and number repeated Gargul lines (FU-1 of #331, #293) | Task 2 |
| 4 | 0fc72271 | feat(addon): accept awarded_at on loot-award so a companion can send per-award keys (FU-1 of #331, #293) | Task 3 |

All four carry the "Co-Authored-By: Claude Opus 5.5" trailer.

## Baseline vs final

| Check | Baseline (origin/main 2d668d01) | Final (0fc72271) |
|---|---|---|
| vitest full run | 159 files, 2792 tests, all passed, exit 0 | 162 files, 2860 tests, all passed, exit 0 (no flake seen in either run) |
| tsc --noEmit | clean | clean |
| eslint, changed files | ItemCandidateModal.tsx 0 errors / 2 warnings, all others 0 | identical: ItemCandidateModal.tsx 0 / 2 (same two pre-existing warnings), all others and all new files 0 |
| Diff file set vs files_modified | n/a | equal (17 files) |
| Added em dashes | n/a | none (perl gate over git diff -U0) |
| .planning/ in WT diff | n/a | none |
| console.* added | n/a | none |

Outputs: SCRATCH/baseline-tv5-{vitest,tsc,eslint}.txt and SCRATCH/final-tv5-{vitest,tsc,eslint}.txt.

## PGlite proof (SCRATCH/pglite-tv5, never committed)

scenarios-tv5.mts builds loot_history from the real baseline statements (22 copied: table, pkey, every baseline index including the old unique index, FKs, updated_at function and trigger, is_guild_officer), applies the real 20260929180000 migration, seeds pre-migration rows (linked, unlinked, unmatched name), applies the real new migration from WT, then drives the real insertAddonAward and addonAwardKey from WT through a PostgREST-shaped adapter. Result: 27 of 27 passed (run-output-tv5.txt), re-run on the final HEAD.

- P1: old rows are copy 1 with no key; the two new indexes exist and the old one is gone; both CHECKs exist; re-applying the file succeeds.
- P2: a plain re-insert of the pre-migration award (old app code) raises 23505.
- P3: copy 2 inserts; copy 2 again 23505; copy 0, copy 11 and an empty key 23514.
- P4: copy 2 on another guild's night raises the #313 23514; re-pointing a row at an inactive raider still raises 23514 (control); stamping source_award_key on a row whose raider is now inactive succeeds.
- P5a to P5h: legacy linked row claimed and stamped; repeat is already_recorded; later awardedAt inserts copy 2; repeat already_recorded; Promise.all of two identical new awards gives one insert and one already_recorded (trace shows real interleaving: e2's insert hit 23505, then found e1's key); Promise.all of two different awards gives copies 4 and 5 (f2's insert hit 23505, recomputed the copy); unlinked keyed award twice leaves one row; unmatched name claims the matching name row and a second key inserts a new row. The night ends with copies 1 to 5, each once.
- P6: the same key in the other guild inserts.
- P7: the keyless path re-sending the pre-migration award is already_recorded.
- Final row count 13, as predicted.

The adapter reproduced both interleavings, so no SQL-level fallback sequence was needed.

## D-09 check (no code change)

- recompute_blp_for_item (last defined in 20260721000001, later migrations only change grants): award_events GROUP BY raid_event_id, raid_date; winners SELECT DISTINCT raid_event_id, character_id. A second copy neither double-resets nor adds passes.
- MasterSheetContent counts loot_history rows per character_id and wowhead_id into receivedItemCounts and passes them to pickReceivedEntries, so each award row skips one more listed copy.
- Confirmed by reading; all assumptions held.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] PATCH next-copy lookup failure would have turned a reassign into a 500**
- Found during: Task 2
- Issue: the plan did not say what a failed next-copy lookup should do; throwing would reach the outer 500.
- Fix: catch it and leave award_copy out, so the update itself decides (same as the cap case). Covered by test P2b.
- Files: app/api/loot-history/bulk/route.ts
- Commit: f39c901d

**2. [Rule 2 - Correctness] PATCH audit oldData kept unchanged**
- The before-read now selects loot_item_id, raid_event_id and award_copy; the audit oldData still records only character_id, character_name and notes, as before. Covered by a test.
- Commit: f39c901d

### Other notes

- Extra tests beyond the plan's lists: K5b (different concurrent award retries with the next copy), K9b, a keyed non-duplicate error test, M2b (duplicate without next_award_copy), P2b, PATCH audit test, B4 also asserts null is allowed and no loot_items query runs.
- The existing bulk duplicate test kept its exact expectation (that request is unlinked, so no next_award_copy); B5 covers the linked case with 2, null and a failed lookup.
- The migration COMMENT text first contained a semicolon, which the shape test's splitter counted as a statement break; reworded to a full stop before the first commit.
- A transient full disk (ENOSPC on the tool output dir) interrupted two commands during Task 3; both were re-run once space returned. No file was left half written.
- STATE.md was not updated and nothing was committed in MAIN, per the orchestrator's instructions (only this SUMMARY is written there).

## Known Stubs

None.

## Threat Flags

None beyond the plan's threat model (T-tv5-01 to T-tv5-08 mitigations are in place: award_copy validation plus CHECK, both unique indexes and the retry loop, key validation and length cap, lock_timeout and idempotent statements, migration-only first commit, #313 trigger proven in P4).

## PR body drafts (not opened)

- SCRATCH/pr-tv5-migration-body.md (migration-only PR; merge with --admin; confirm Deploy Migrations green before the app PR)
- SCRATCH/pr-tv5-body.md (app PR; depends on the migration PR)

SCRATCH = /private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/231d8fc6-02b5-498f-83b0-d947fb328259/scratchpad

## Human checks after deploy

- Award the same Bindings twice to one raider in the master sheet modal: the notice and "Award another copy" appear, then two rows exist.
- Paste a Gargul export with a repeated line: two rows; paste it again in a fresh import: both lines reported as already having the item.
- Import an addon export twice: the second import reports everything as already recorded.

## Follow-up plan (in-game, separate releases)

- FU-A, companion: readPendingFromSavedVars also sends awarded_at (the raw awardedAt); convertMembersToLuaFormat writes items[wowheadId] = best rank plus itemRanks[wowheadId] = every rank, best first.
- FU-B, addon (reconcile with addon/LootListPlus/Modules/ScoreEngine.lua first): Sync:ProcessImport builds itemRanks; ScoreEngine uses the best rank not yet awarded this session; LootDistribution adds an awardId.
- FU-C, server: addonAwardKey prefers awardId ('addon2:' + awardId) while matching legacy keys; FU-3 from x3l; optional pre-skip of received entries in exports (user decision).
- FU-T5 (note): scripts/backfill-team-event-routing.ts deletes a "clash" row when moving loot between team nights, which would now delete a real second copy; retire it or compare counts before reuse.
- Release order: this server work (migration PR, then app PR), then FU-A, FU-B, FU-C.

## Self-Check: PASSED

- Created files exist in WT: migration, shape test, award-copies and its test, modal test (FOUND).
- Commits exist on fix/second-same-night-award: 2632b48f, b398fae3, f39c901d, 0fc72271 (FOUND).
- PGlite output and PR drafts exist in SCRATCH (FOUND).

## Delivery (orchestrator, 2026-10-02)

- Migration-only PR #341 (commit 2632b48f alone) squash-merged as 22e370b0 after every CI check passed. Deploy Migrations applied 20261001120000_allow_second_same_night_award.sql in production at 19:06 UTC.
- The app branch was rebased onto that main (the migration commit dropped as already applied); tsc clean.
- App PR #342 squash-merged as 4b3f66e6 after every CI check passed on aba015e7.
- Still open: the manual checks in the verification report (master sheet second copy with the C-1 prompt, Gargul repeated lines and re-paste, addon export string imported twice), and the in-game follow-ups FU-A (companion release), FU-B (addon release) and FU-C (server), which the user asked to plan right after this ships.

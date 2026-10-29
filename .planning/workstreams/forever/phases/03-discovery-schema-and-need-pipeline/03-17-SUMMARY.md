---
phase: 03-discovery-schema-and-need-pipeline
plan: 17
subsystem: api
tags: [need-rows, review, revert, remove-item, item-counts, master-sheet-visibility, discovery, vitest]
status: complete

requires:
  - phase: 03-discovery-schema-and-need-pipeline
    provides: "03-02 Discovery migration deployed and types regenerated; 03-04 need-aware domain helpers"
provides:
  - "Proof that approval snapshots a need-ranked list by need row id with its display name"
  - "Proof that revert re-inserts a snapshotted need row by loot_item_id with rank and slot"
  - "Proof that remove-item with already_obtained on a need row writes a loot_history row keyed by the need id with no awarded_item_id (D-15)"
  - "Proof that item-counts counts a need row like an item row"
  - "Proof that master-sheet visibility returns need rankings to an officer and to a raider with an approved list in the phase, and hides them otherwise"
affects: [03-12 reader inventory, 03-19 need awards, 04 picker]

tech-stack:
  added: []
  patterns:
    - "Need-row fixture (kind 'need', need_key trinket.healing, Needs boss, Reserved classification) shared across route tests; the literal kind: 'need' is what the 03-12 inventory checks"
    - "Additive fake extension: an optional fixture field read before the old hardcoded return, so no existing test line is removed"

key-files:
  created: []
  modified:
    - app/api/loot-submissions/review/__tests__/route.test.ts
    - app/api/loot-submissions/revert/__tests__/route.test.ts
    - app/api/loot-submissions/remove-item/__tests__/route.test.ts
    - app/api/loot-submissions/item-counts/__tests__/route.test.ts
    - app/api/master-sheet/visibility/__tests__/route.test.ts

key-decisions:
  - "No reader needed a fix: all five readers work by id, as research B6, B7, B9, B10 and C6 predicted, so the plan is tests only"
  - "The item-counts case asserts the route never reads loot_items and selects only submission_id, which is the reason a need row needs no branch there"

patterns-established:
  - "Visibility earned-phase proof for need ids: the same loot_items id -> raid_tier_id lookup gates a need as an item, and a denied raider causes no loot_submission_items read at all"

requirements-completed: [DISC-06]

duration: 15 min
completed: 2026-10-21
actuals:
  tokens: 14000
  tasks: 2
  commits: 2
---

# Phase 3 Plan 17: Need-Ranked List Lifecycle After Submit Summary

**Approval, revert, removal, item counts and master-sheet visibility all carry a need row by id, proven with fixtures that stand past the D-22 hold, and no reader needed a fix.**

## Performance

- **Duration:** about 15 min
- **Tasks:** 2 of 2
- **Files:** 5 test files modified, 0 source files

## Accomplishments

- Review approve of a list holding the need fixture and an item snapshots `{ loot_item_id: need id, item_name: 'Trinket, Healing' }` next to the item row. The review fake gained an optional `itemsRead` field read before the old hardcoded response, so the existing cases are untouched.
- Revert of a snapshot holding the need re-inserts both rows by `loot_item_id` with rank and slot as snapshotted.
- Remove-item with `already_obtained` on the need row inserts a `loot_history` row with `loot_item_id` = need id, the need's tier and the guild expansion, and no `awarded_item_id` key (D-15, T-03-17-02). The fix point if this had failed would have been the remove-item route, not `lib/loot/loot-history-rows.ts` (03-19 owns it).
- Item-counts counts a list holding a live need row and a live item as 2 and counts a removed need row out; the route selects `submission_id` only and never touches `loot_items`.
- Visibility: an officer (creator bypass) posting the need id gets its rankings; a raider with an approved list in the need's phase gets them through the earned-phase filter, which resolves the need through `loot_items` by id and reads its `raid_tier_id`. Three denial cases (T-03-17-01): approved list only in another phase, no approved list at all, and a need in a tier that is not `master_sheet_visible`. Denied raiders cause no `loot_submission_items` read.

## Task Commits

1. **Task 1 (tracer): need-ranked list snapshotted and reverted by id** - `56ab293b` (test)
2. **Task 2: remove-item, item-counts and visibility by id** - `e9fa71c2` (test)

## Tracer gate

Auto mode was not active and `human_verify_mode` is `end-of-phase`, so the tracer's human-verify stop is deferred to phase end. The tracer `<verify>` (`npx vitest run app/api/loot-submissions/review app/api/loot-submissions/revert && npm run typecheck`) passed before task 2 started.

## Reader fixes for 03-12

none. No source file in the conditional list changed, so there is no `Reader-fix-for-03-12` line in either commit message. All five readers can be listed as ok by 03-12, citing these test files (each carries the `kind: 'need'` literal):

- `app/api/loot-submissions/review/route.ts`: ok, `review/__tests__/route.test.ts`
- `app/api/loot-submissions/revert/route.ts`: ok, `revert/__tests__/route.test.ts`
- `app/api/loot-submissions/remove-item/route.ts`: ok, `remove-item/__tests__/route.test.ts`
- `app/api/loot-submissions/item-counts/route.ts`: ok, `item-counts/__tests__/route.test.ts`
- `app/api/master-sheet/visibility/route.ts`: ok, `visibility/__tests__/route.test.ts`

## Verification

- `npx vitest run app/api/loot-submissions/review app/api/loot-submissions/revert app/api/loot-submissions/remove-item app/api/loot-submissions/item-counts app/api/master-sheet/visibility` : 5 files, 110 tests pass
- `npm run typecheck` : exit 0
- `npm run lint` : 0 errors (375 pre-existing warnings, none in these files)
- Acceptance greps: `kind: 'need'` present in all five test files (at least 1 each); `awarded_item_id` in the remove-item test 2 (needs at least 1)
- `git diff --numstat HEAD~2` on review and revert tests shows 0 deleted lines; the other three edits changed one existing line each, a type or interface widening (`wowhead_id: number | null` in remove-item, an optional `loot_item_id` field on the item-counts `ItemRow`) that adds no behaviour
- Reader-fix record check: no conditional source file differs from the merge base, so the loop passes trivially

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

See key-decisions above.

## Issues Encountered

None.

## Size and effort

The plan sat at the 10-file threshold on paper (five tests plus five conditional source files), but no source file changed, so the real footprint was five test files and about 250 added lines. Context use was well under the 50k-token, low-confidence estimate (about 14k tokens of written output by chars/4) and neither task ran long. The size risk did not materialise because every reader worked by id, as research predicted. Had a reader needed a fix the estimate would have held, since each fix is a small branch.

## Known Stubs

None.

## Threat Flags

None. T-03-17-01 (earned-phase filter applies to need ids by raid_tier_id), T-03-17-02 (need-keyed history row with no awarded_item_id) and T-03-17-03 (no unrecorded reader fix) are mitigated as planned and covered by tests.

## Carry-forward from 03-10

The 03-10 carry-forward (T-03-10-01: the visibility route's earned-phase filter applies to need ids sent in the POST body) is covered by the three denial cases and the raider-with-list case in `app/api/master-sheet/visibility/__tests__/route.test.ts`.

## Next Phase Readiness

PR 3 (need readers) lifecycle half is ready. Plan 03-19 owns need awards, history rows and Discord, and reuses the same need fixture shape.

## Self-Check: PASSED

- All five test files exist and carry `kind: 'need'`; commits `56ab293b` and `e9fa71c2` exist

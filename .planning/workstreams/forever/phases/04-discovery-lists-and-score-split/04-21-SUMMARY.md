---
phase: 04-discovery-lists-and-score-split
plan: 21
subsystem: ui
tags: [need-lines, discovery, review-modal, overview, vitest, d-28]

requires:
  - phase: 04-discovery-lists-and-score-split
    provides: "04-03 groupNeedRowsByRank and describeNeedGroupTiers in domain/loot/need-picks.ts"
  - phase: 03-discovery-schema-and-need-rows
    provides: "loot_items.kind, need_key and raid_tier_id (live)"
provides:
  - "lib/loot/need-lines.ts: toNeedLines, needGroupSuffix, bestScoringRow, buildTierContext"
  - "Officer review modal shows a Discovery list as one line per need with the 'all N raids' or tier-name suffix"
  - "Overview loot priority groups before the top-five cut, one line per need scored by its best tier row"
affects: [04-13, 04-19]

actuals:
  tokens: 10000
  tasks: 2
  commits: 6

tech-stack:
  added: []
  patterns:
    - "One pure helper groups fan-out rows for both the raider's and the officer's views; the master sheet, Summary and Raid Mode never call it"
    - "The component shape work (nested loot_item embed to flat rows, live and removed split) lives in a small testable helper next to the component"

key-files:
  created:
    - lib/loot/need-lines.ts
    - lib/loot/__tests__/need-lines.test.ts
    - app/(app)/loot-submissions/components/review-need-lines.ts
    - app/(app)/loot-submissions/components/__tests__/review-need-lines.test.ts
  modified:
    - app/(app)/loot-submissions/components/LootSubmissionsContent.tsx
    - app/(app)/overview/components/DashboardContent.tsx

key-decisions:
  - "The tiers a list covers are the tiers its own need rows sit in (review modal: the embedded tier; Overview: the raid_tiers read the page already makes, taken before the visibility filter), so no new query is made"
  - "A one-tier list shows the tier name instead of 'all 1 raids'; a tier with no name is left out of the suffix rather than shown as an id"
  - "A need row with no need_key is kept as an item row so it can never vanish from an officer's review (T-04-21-02)"
  - "Need lines in the review modal are read-only: a removal acts on one (rank, slot) row and would leave the tier fan-out uneven"

patterns-established:
  - "Group first, cut second: any top-N over fan-out rows runs over need lines, not rows"

requirements-completed: []  # DISC-05 and DISC-02 stay open: sibling plans declare them and have no SUMMARY yet (ready-ids returned 0 of 2)

coverage:
  - id: D1
    description: "A 15-row Discovery list (five needs, three tiers each) shows as exactly five need lines and keeps all 15 rows, each line reading 'all 3 raids'; a need in two of three tiers names the two tiers in list order"
    requirement: DISC-05
    verification:
      - kind: unit
        ref: "lib/loot/__tests__/need-lines.test.ts#toNeedLines (D-28, DISC-05)"
        status: pass
      - kind: unit
        ref: "app/(app)/loot-submissions/components/__tests__/review-need-lines.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "On the Overview the top-five cut runs after grouping: five different needs fill five lines and each line keeps the best score among its tier rows; item rows pass through unchanged and in order"
    requirement: DISC-02
    verification:
      - kind: unit
        ref: "lib/loot/__tests__/need-lines.test.ts#bestScoringRow and the cut (D-28)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The review modal and the Overview render the lines correctly (layout, suffix placement, read-only need lines, phone cards)"
    verification: []
    human_judgment: true
    rationale: "No component render test covers either screen; the grouping and wiring are tested, the markup was typechecked and linted but not seen in a browser"
  - id: D4
    description: "The 'all 3 raids' wording and the 'Need' card label read right to the owner"
    verification: []
    human_judgment: true
    rationale: "All copy is DRAFT for the owner's 04-19 sign-off"

duration: 8min
completed: 2026-11-11
status: complete
---

# Phase 4 Plan 21: One Line per Need Summary

**A shared pure helper (toNeedLines) that shows a Discovery list's 15 fan-out rows as five need lines, with an 'all 3 raids' or tier-name suffix, in the officer review modal and the Overview loot priority, grouped before the top-five cut**

## Performance

- **Duration:** 8 min
- **Started:** 2026-11-11T05:30Z
- **Completed:** 2026-11-11T05:38Z
- **Tasks:** 2 (a tracer and an auto task)
- **Files modified:** 6 (4 created, 2 edited)

## Accomplishments

- `lib/loot/need-lines.ts`: `toNeedLines` returns item rows unchanged and in order plus one line per need and rank (built on `groupNeedRowsByRank`); `needGroupSuffix` gives 'all N raids' or the names in list tier order; `bestScoringRow` and `buildTierContext` (sort_order then id by plain comparison, the same order `assignTierSlots` uses) serve both screens. 20 tests.
- Review modal (Task 1, tracer): the items read adds `kind`, `need_key`, `raid_tier_id` and `raid_tier:raid_tiers(name, sort_order)`; `buildReviewRows` splits item rows from need lines (live and removed grouped apart so a struck line never pads a live suffix); the table and the phone cards render need lines through `ItemLink` with a null Wowhead id (a `NeedLabel`) plus the suffix. Item rows, removals, undo and the change history are untouched. Locks still show on a need line when any of its rows is locked. 8 tests.
- Overview (Task 2): `LootPriorityItem` carries `kind`, `need_key` and `need_suffix`; the loot items select adds `need_key`, the tier read adds `name` and `sort_order`; rows pass through `toNeedLines` before `.slice(0, 5)`, a need line scores as its best tier row and shows the suffix after the need name. A Known raider's list takes the same path with item rows only, in the same order.
- Tracer gate: the Task 1 verify (need-lines, loot-submissions, reader inventory) was re-run after the commit and passed before Task 2 started.

## Task Commits

1. **Task 1: Tracer, 15 rows as five lines in the review modal**
   - `05510f62` (test, RED): need-lines tests, including the Task 2 group-before-cut and best-score cases
   - `1e6c654e` (feat, GREEN): `need-lines.ts`
   - `42683967` (test, RED): review modal helper tests
   - `34de295d` (feat, GREEN): `review-need-lines.ts` and the modal wiring
   - `fad30509` (fix): keep `boss_name` out of the helper's row type (see Deviations)
2. **Task 2: One loot priority line per need on the Overview** - `5d97adab` (feat). Its tests were written and committed first with Task 1's RED commit, so the RED commit covers both tasks.

**Plan metadata:** committed with this SUMMARY (docs).

## Decisions Made

- **Tier set for "all N raids".** The plan says "every Discovery tier the list covers". Both screens take that from the list's own need rows (modal: the embedded tier on each need row; Overview: the tiers of the raider's need items, read before the master-sheet visibility filter). If a tier's sheet is not open yet, every need then names the visible tiers instead of reading "all N", which is accurate for what the raider can see. The owner may prefer the other reading at the 04-19 review.
- **Read-only need lines.** The review modal's remove and undo buttons act on one (rank, slot) row. A need line is up to eight rows, and removing one tier's row would break the fan-out, so need lines have no remove button. No Discovery list could be created before the picker (04-11), so no officer workflow is lost today; if officers need to prune a pick, that is a follow-up (remove the whole line, three calls and one confirm).
- **Slot 3 rows are no longer dropped.** `groupDetailRowsByRank` keeps only slots 1 and 2, so a three-tier fan-out would have lost its third tier in the old table; need rows now never go through it.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical] Extra helper file `review-need-lines.ts` and its test**
- **Found during:** Task 1
- **Issue:** the plan lists only `LootSubmissionsContent.tsx` for the modal, but its rows are a nested `loot_item` embed with live and removed rows, and the plan's behaviour ("the review modal for a 15-row list shows five need lines") could not be tested without rendering a 1,600-line component.
- **Fix:** moved the flatten, live and removed split and tier-context build into `app/(app)/loot-submissions/components/review-need-lines.ts` (same folder as `review-notification.ts`, the precedent for this split) with 8 tests.
- **Files modified:** the helper and `__tests__/review-need-lines.test.ts`
- **Commit:** 42683967, 34de295d

**2. [Rule 1 - Bug] boss_name reader inventory failed on the new helper**
- **Found during:** Task 2 verification (`lib/loot/__tests__/needs-boss-sentinel.test.ts`)
- **Issue:** the helper's row type named `boss_name`, so the inventory scan wanted an entry for a file that never reads the column.
- **Fix:** dropped `boss_name` and `item_slot` from the helper's type (the component reads neither; its select string is unchanged and `LootSubmissionsContent.tsx` is already listed).
- **Commit:** fad30509

**3. Acceptance grep wording.** `grep -c "toNeedLines(" LootSubmissionsContent.tsx` prints 1, but that match is the comment naming `toNeedLines()` inside `buildReviewRows`; the call itself sits in `review-need-lines.ts` because of deviation 1. `DashboardContent.tsx` calls it directly.

**Total deviations:** 2 auto-fixed (1 Rule 2, 1 Rule 1) plus 1 wording note. **Impact:** none on behavior or scope; the reader inventories needed no new entries.

## Authentication Gates

None.

## Issues Encountered

None beyond the inventory failure above.

## Verification

- `npx vitest run lib/loot "app/(app)/overview" "app/(app)/loot-submissions"`: 17 files, 345 tests pass (includes `need-reader-inventory` and `needs-boss-sentinel`)
- `npm run typecheck`: clean. `npm run lint`: 0 errors (375 warnings, all pre-existing; none in the new files)
- Known guild golden fixtures and Lua parity fixtures: not touched

## Known Stubs

None.

## Threat Flags

None. No new endpoint, query or table: the review read gains columns it already may select, and the Overview adds columns to reads it already makes.

## Next Phase Readiness

- 04-13 can now edit `DashboardContent.tsx` (this plan no longer shares the file with it). 04-19 reviews the DRAFT 'all N raids', tier-name suffix and 'Need' card label.
- Not seen in a browser: the review modal and Overview markup is typechecked and linted only (D3 in coverage).
- Shipping: PR 3 (Discovery lists) with 04-13. No migration dependency; the commits wait on the branch until PR 3 opens after 04-02 records the deploy.

## Self-Check: PASSED

All four created files and both edited files exist; commits 05510f62, 1e6c654e, 42683967, 34de295d, fad30509 and 5d97adab are on `work/forever-phase-04`.

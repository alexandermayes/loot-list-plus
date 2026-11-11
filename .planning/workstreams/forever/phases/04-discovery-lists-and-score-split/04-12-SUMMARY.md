---
phase: 04-discovery-lists-and-score-split
plan: 12
subsystem: ui
tags: [react, vitest, score-split, standing, interest, master-sheet, officer-voice]

requires:
  - phase: 04-discovery-lists-and-score-split
    provides: "04-05: toScoreResult, explainScore with voice and decimalPlaces, standing and interest sentences"
provides:
  - "app/components/ScoreSplit.tsx: ScoreSplit (variants tiles, compact, rows), ScoreSplitProps, formatScoreValue"
  - "Master sheet score popover: name and total header, compact split in officer voice, component lines without Item rank, notes unchanged"
  - "Candidate modal: Standing column after Score, Rank renamed Interest, two officer-voice sentences for the top three"
affects: [04-13, 04-14, 04-19]

actuals:
  tokens: 7800
  tasks: 2
  commits: 5

tech-stack:
  added: []
  patterns:
    - "ScoreSplit renders the values and sentences it is handed and never recomputes; the rows variant is just the two sentences, for table cells that already show the numbers"
    - "A column that sits beside ScoreSplit sentences formats through formatScoreValue so a tiny negative never prints as -0.00"
    - "Officer surfaces pass { voice: 'other', decimalPlaces } to explainScore (UI-12)"

key-files:
  created:
    - app/components/ScoreSplit.tsx
    - app/components/__tests__/ScoreSplit.test.tsx
  modified:
    - app/(app)/master-sheet/components/BossSection.tsx
    - app/(app)/master-sheet/components/ItemCandidateModal.tsx
    - app/(app)/master-sheet/components/__tests__/BossSection.test.tsx
    - app/(app)/master-sheet/components/__tests__/ItemCandidateModal.test.tsx

key-decisions:
  - "The rows variant renders only the two sentences as two lines: each sentence already starts with its word label and carries its number, and the candidate modal shows the numbers in their own columns, so a number-and-label row would print every value twice"
  - "The raider bonus reason and end date (GH #357) survives the chip removal as its own muted line under the sentences ('Officer bonus (Full enchants: +2 until Oct 12)'), because the standing sentence only carries the amount"
  - "The Standing column is computed for every row from toScoreResult over the same components the award snapshot records, not only for the top three, so the column and the sentence cannot disagree"
  - "The popover widens from w-64 to w-72 as the UI spec's compact variant states"

patterns-established:
  - "Interest equals the existing item rank column's value (derived by subtraction in the modal), so renaming Rank to Interest changes no number"

requirements-completed: []  # DISC-08 stays open: 04-13, 04-14 and 04-19 declare it and have no SUMMARY yet

coverage:
  - id: D1
    description: "ScoreSplit shows the given standing, interest and total in tiles, compact and rows variants with word labels, tabular-nums, no destructive class, a minus sign in text-foreground for a negative standing, and no recomputation"
    requirement: DISC-08
    verification:
      - kind: unit
        ref: "app/components/__tests__/ScoreSplit.test.tsx#ScoreSplit tiles"
        status: pass
      - kind: unit
        ref: "app/components/__tests__/ScoreSplit.test.tsx#ScoreSplit compact"
        status: pass
      - kind: unit
        ref: "app/components/__tests__/ScoreSplit.test.tsx#ScoreSplit rows"
        status: pass
    human_judgment: false
  - id: D2
    description: "The master sheet popover shows name and total, then the compact split with 'their number' sentences, then the component lines without Item rank, then the trial and ineligible notes"
    requirement: DISC-08
    verification:
      - kind: unit
        ref: "app/(app)/master-sheet/components/__tests__/BossSection.test.tsx#BossSection score popover standing and interest (D-21)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The candidate modal header reads Score, Standing, Interest (titled 'How much they want this item'), every row shows total, standing and interest, and the top three show the two officer-voice sentences"
    requirement: DISC-08
    verification:
      - kind: unit
        ref: "app/(app)/master-sheet/components/__tests__/ItemCandidateModal.test.tsx#ItemCandidateModal standing and interest (D-21)"
        status: pass
    human_judgment: false
  - id: D4
    description: "An award records exactly what it did before: the same nine component keys for winner_components and each top candidate (T-04-12-01)"
    requirement: DISC-08
    verification:
      - kind: unit
        ref: "app/(app)/master-sheet/components/__tests__/ItemCandidateModal.test.tsx#D5 the award request still records the same nine components and the winner components"
        status: pass
    human_judgment: false
  - id: D5
    description: "The standing sentence with all eight parts wraps under the tile and inside the popover at 288px and 343px without clipping (UI-SPEC E5 long-text backstop)"
    verification: []
    human_judgment: true
    rationale: "jsdom has no layout, so wrapping and clipping cannot be asserted. The sentences are plain paragraphs with no truncate or nowrap class and every tile column is min-w-0, but someone must look at the popover and the tiles with every component non-zero at those widths"

duration: 22min
completed: 2026-11-11
status: complete
---

# Phase 4 Plan 12: Score Split on the Master Sheet Summary

**One shared ScoreSplit component and two officer surfaces (the master sheet score popover and the candidate modal) now show standing and interest in officer voice beside an unchanged total, with the award body proven unchanged**

## Performance

- **Duration:** about 22 min
- **Tasks:** 2 (a tracer and an auto task, both TDD)
- **Files:** 6 (2 created, 4 modified)

## Accomplishments

- `ScoreSplit` renders `tiles` (three columns with 8px insets, Standing and Interest as nested tiles, Total behind a border), `compact` (two columns for the popover, whose header owns the total) and `rows` (the two sentences as two lines). Labels are words, numbers are `tabular-nums` to the guild's decimal places, a negative standing keeps its minus in `text-foreground`, and no `destructive` class appears.
- The master sheet popover calls `explainScore` with `{ voice: 'other', decimalPlaces }`, shows the name and total, the compact split, the existing lines minus the `itemRank` line, then the trial, ineligible and lead notes untouched. It is now `w-72`.
- The candidate modal adds a Standing column after Score for every row, renames Rank to Interest (title 'How much they want this item', same position, same value), and shows the two officer-voice sentences for the top three in place of the label and value chips.
- Tracer gate: the tracer's `<verify>` passed after its commit and again before expanding.

## Task Commits

1. **Task 1: Tracer, ScoreSplit and the popover** - `86622e10` (test, RED), `68f74f67` (feat, GREEN)
2. **Task 2: Candidate modal** - `61ee67cb` (test, RED), `2fd31a36` (feat, GREEN)

**Plan metadata:** committed with this SUMMARY (docs).

## Decisions Made

See `key-decisions` above. The two that matter for review: `rows` is sentences only (no duplicated numbers in the modal), and the #357 raider bonus reason is kept on its own line even though the plan says the chips are replaced.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] Keep the raider bonus reason in the candidate modal**
- **Found during:** Task 2 (RED tests)
- **Issue:** Replacing the label and value chips with two sentences would silently remove the raider bonus reason and end date that GH #357 added to the modal; the standing sentence only says 'officer bonus 2'. Officers use that line to see why a bonus exists and when it ends.
- **Fix:** Kept it as a muted 11px line under the sentences, `Officer bonus (Full enchants: +2 until Oct 12)`, shown only when the entry's detail is not the generic text. The popover is unaffected, since the plan keeps its component lines.
- **Files modified:** `app/(app)/master-sheet/components/ItemCandidateModal.tsx`, `app/(app)/master-sheet/components/__tests__/ItemCandidateModal.test.tsx` (M6 and M7 re-pointed from the chip span to this line; they still assert the reason and its absence for another raider's entry)
- **Commit:** `61ee67cb` (tests), `2fd31a36` (code)

**2. [Rule 1 - Bug] Negative zero in the Standing column**
- **Found during:** Task 2
- **Issue:** The modal derives the item rank by subtraction, so standing can come out as a tiny negative number and `toFixed` would print `-0.00`.
- **Fix:** Exported `formatScoreValue` from ScoreSplit (already used for the tiles) and used it for the column.
- **Commit:** `2fd31a36`

**3. [Rule 3 - Blocking] useMemo dependency lint warning**
- **Found during:** Task 2
- **Issue:** `rankingToExplanation` now takes `decimalPlaces`, so the two memos that call it needed it in their dependency lists; without it lint rose from 375 to 376 warnings.
- **Fix:** Added `decimalPlaces` to both dependency arrays. Lint is back to the 375 pre-existing warnings.
- **Commit:** `2fd31a36`

**Total deviations:** 3 auto-fixed (1 missing functionality, 1 bug, 1 lint). **Impact:** none on any number or on what an award records.

## Authentication Gates

None.

## Issues Encountered

None. `npm run typecheck` is clean; `npm run lint` reports 0 errors and 375 warnings, the same count as before this plan, none new in the touched files. `npx vitest run app/components "app/(app)/master-sheet" lib/loot/__tests__/need-reader-inventory.test.ts` passes (19 files, 184 tests); the inventory test needed no change because no new reader of `loot_items`, `loot_submission_items` or `loot_history` was added.

## Known Stubs

None.

## Threat Flags

None. No endpoints, schema or data reads were added; both surfaces render the same officer-only data as before, split into two numbers. T-04-12-01 is mitigated by test D5 (nine component keys and the winner components asserted on the recorded request body). T-04-12-02 accepted as planned.

## Next Phase Readiness

- 04-13 and 04-14 can use `ScoreSplit` `tiles` and `formatScoreValue`; the comparison modal should pass the standing sentence part order from 04-05 (attendance, guild rank, role, officer priority, bad luck protection, officer bonus, trial penalty, bank donations).
- Owner items for 04-19 sign-off: the new reason line wording 'Officer bonus (...)' in the candidate modal, and the Standing column title text ('Standing: attendance, bad luck protection and officer bonuses'). All DRAFT.
- Visual check still owed (D5 above): the eight-part standing sentence in the popover at 288px and the tiles at 343px.
- Shipping: PR 2 (need primitives and score split); no new column is read.

## Self-Check: PASSED

`app/components/ScoreSplit.tsx` and `app/components/__tests__/ScoreSplit.test.tsx` exist, and commits 86622e10, 68f74f67, 61ee67cb and 2fd31a36 are on `work/forever-phase-04`. Acceptance greps: `voice: 'other'` in BossSection 1, `tabular-nums` in ScoreSplit 6, `destructive` in ScoreSplit 0, 'How much they want this item' in the modal 1, `winner_components` in the modal test 3.

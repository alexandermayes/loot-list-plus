---
phase: 04-discovery-lists-and-score-split
plan: 14
subsystem: ui
tags: [react, vitest, score-split, standing, interest, comparison-modal, need-label, accessibility]

requires:
  - phase: 04-discovery-lists-and-score-split
    provides: "04-12: ScoreSplit (tiles, compact, rows) and formatScoreValue"
  - phase: 04-discovery-lists-and-score-split
    provides: "04-05: toScoreResult and explainScore with voice and decimalPlaces"
provides:
  - "ScoreComparisonModal: Your score and Winner's score as ScoreSplit tiles (your voice, their voice), flex-col sm:flex-row, breakdown grouped under Standing and Interest with subtotals in You, Winner and Diff"
  - "ScoreComparisonModal props decimalPlaces and config, wired from MasterSheetContent"
  - "ScoreBreakdownModal: the standing and interest paragraphs at the top"
  - "NeedLabel: hover underline, shared focus ring and text-left on the button branch only"
affects: [04-19]

actuals:
  tokens: 4900
  tasks: 2
  commits: 4

tech-stack:
  added: []
  patterns:
    - "A comparison table built from divs carries ARIA table, rowgroup, row, rowheader, cell and columnheader roles, so group header rows are testable and readable by name"
    - "A diff that rounds to zero at the guild's places prints a plain 0 in the muted colour instead of +0.00 or -0.00"

key-files:
  created:
    - app/components/__tests__/ScoreComparisonModal.test.tsx
  modified:
    - app/components/ScoreComparisonModal.tsx
    - app/components/ScoreBreakdownModal.tsx
    - app/components/NeedLabel.tsx
    - app/components/__tests__/ScoreBreakdownModal.test.tsx
    - app/components/__tests__/NeedLabel.test.tsx
    - app/(app)/master-sheet/components/MasterSheetContent.tsx

key-decisions:
  - "The modal takes optional decimalPlaces (default 2) and config props instead of hard-coding toFixed(1), so every number follows the guild's setting and the standing sentence can say 'attendance 3 of 10' for a guild whose maximum is not the default"
  - "Component rows keep the order the existing merge produces (your lines first, then any line only the winner has), because the plan says the rows stay unchanged; the groups only partition that order"
  - "Group subtotals are the explainScore standing and interest values, not a sum of the visible rows, so the header, the tile and the sentence cannot disagree"
  - "Each card is a labelled region (Your score breakdown, Winner's score breakdown) with the player name above the tiles, so the 'Your score' and 'Winner's score' words live in the Total tile via totalLabel"

patterns-established:
  - "NeedLabel's button branch adds its interaction classes locally; the span branch shares only the base classes, so a non-clickable label can never pick up hover styling"

requirements-completed: []  # DISC-08 and DISC-02 stay open: sibling plans (04-13, 04-19 for DISC-08; 04-09, 04-11, 04-13, 04-19, 04-20, 04-21 for DISC-02) have no SUMMARY yet

coverage:
  - id: D1
    description: "The comparison modal renders each person as ScoreSplit tiles with the Your score and Winner's score labels, your sentences in your voice and the winner's in their voice, stacked on a phone and side by side from sm"
    requirement: DISC-08
    verification:
      - kind: unit
        ref: "app/components/__tests__/ScoreComparisonModal.test.tsx#ScoreComparisonModal split tiles"
        status: pass
    human_judgment: false
  - id: D2
    description: "The breakdown groups rows under Standing (every component except item rank) and Interest (the item rank row), each header showing its subtotal in You, Winner and Diff at the guild's decimal places, with zero diffs as 0 and a negative standing keeping its minus"
    requirement: DISC-08
    verification:
      - kind: unit
        ref: "app/components/__tests__/ScoreComparisonModal.test.tsx#ScoreComparisonModal grouped breakdown"
        status: pass
    human_judgment: false
  - id: D3
    description: "How loot scores work opens with the two standing and interest paragraphs, before the formula and the component cards, in text-foreground-secondary, with no em dash"
    requirement: DISC-08
    verification:
      - kind: unit
        ref: "app/components/__tests__/ScoreBreakdownModal.test.tsx#ScoreBreakdownModal standing and interest explainer (D-21)"
        status: pass
    human_judgment: false
  - id: D4
    description: "A clickable NeedLabel is a button with hover:underline, underline-offset-2, the shared focus ring, rounded-sm and text-left; without onClick it is a span with none of those; neither renders an anchor, href or Wowhead attribute; the name keeps truncate min-w-0 (T-04-14-02)"
    requirement: DISC-02
    verification:
      - kind: unit
        ref: "app/components/__tests__/NeedLabel.test.tsx#NeedLabel"
        status: pass
    human_judgment: false
  - id: D5
    description: "The 'Winner's score' and 'Your score' tile labels, the three tile columns and the 31-character need name (UI-SPEC E7 long-text) fit at 343px and in a 160px cell without clipping"
    verification: []
    human_judgment: true
    rationale: "jsdom has no layout, so wrapping, clipping and ellipsis cannot be asserted. At 343px each tile column is roughly 85px inside the p-3 card, so the uppercase 'WINNER'S SCORE' label probably wraps to two lines (it has no truncate or nowrap class and every column is min-w-0). Someone must look at the comparison modal at 343px and the NeedLabel in a 160px table cell"

duration: 15min
completed: 2026-11-11
status: complete
---

# Phase 4 Plan 14: Raider Score Explainers and NeedLabel Look Summary

**The comparison modal now shows you and the winner as split Standing, Interest and Total tiles with a Standing and Interest grouped breakdown, the "How loot scores work" modal opens with the two-paragraph explainer, and a clickable NeedLabel reads as clickable with an underline and focus ring**

## Performance

- **Duration:** about 15 min
- **Started:** 2026-11-11T05:49:00Z
- **Completed:** 2026-11-11T06:04:03Z
- **Tasks:** 2 (a tracer and an auto task, both TDD)
- **Files:** 7 (1 created, 6 modified)

## Accomplishments

- `ScoreComparisonModal` builds both explanations with `explainScore(rankingToScoreResult(r), config, { voice, decimalPlaces })` (self for you, other for the winner), renders each as a labelled region with the player name and `ScoreSplit` tiles (`totalLabel` "Your score" and "Winner's score"), and lays the two out `flex-col sm:flex-row`. The breakdown is an ARIA table with a Standing group header (all components except item rank) and an Interest group header (the item rank row), each showing the subtotal for You, Winner and Diff. The behind badge, the diff column and every value now use the guild's decimal places through `formatScoreValue`. The Tip block is untouched.
- `ScoreBreakdownModal` opens with the two paragraphs (draft copy, 04-19 signs it off) in `text-md text-foreground-secondary`, ahead of the formula box.
- `NeedLabel` adds `text-left rounded-sm hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` on the button branch only; the span, the neutral icon and the truncation are unchanged, and it still never renders an anchor.
- Tracer gate: the tracer's `<verify>` passed after its GREEN commit and again before expanding (12 of 12), then the whole `app/components` suite (145 tests) and the master sheet suite passed.

## Task Commits

1. **Task 1: Tracer, comparison modal** - `3d8ae675` (test, RED: 10 of 12 failing), `d4e6b06b` (feat, GREEN)
2. **Task 2: Explainer paragraphs and NeedLabel** - `b0c30401` (test, RED: 4 failing), `9b55b852` (feat, GREEN)

**Plan metadata:** committed with this SUMMARY (docs), then STATE and ROADMAP in a second docs commit.

## Decisions Made

See `key-decisions` above. The one worth a reviewer's eye: `decimalPlaces` and `config` are new optional props on the modal, because the plan says "the guild's decimal places" but the modal had no way to receive them.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] Pass the guild's decimal places and scoring config into the comparison modal**
- **Found during:** Task 1 (reading the modal)
- **Issue:** The modal printed every number with a fixed `toFixed(1)` and called `explainScore` with no config. The plan asks for the guild's decimal places, and without the config the standing sentence would print the default attendance maximum (4) for every guild, which would misstate "attendance 3 of 10" for a guild with a different maximum.
- **Fix:** Added optional `decimalPlaces` (default 2, the guild default) and `config` props, and passed `guildSettings?.decimal_places` and `guildSettings` from the one call site, the same way BossSection already passes `guildSettings` as the scoring config.
- **Files modified:** `app/components/ScoreComparisonModal.tsx`, `app/(app)/master-sheet/components/MasterSheetContent.tsx` (two added lines; the file is not in the plan's list but it is the only caller)
- **Verification:** tests C4 and C5; `npm run typecheck` passes
- **Commit:** `d4e6b06b`

**2. [Rule 1 - Bug] A diff that rounds to zero printed as +0.00 or -0.00**
- **Found during:** Task 1 (writing the grouped rows)
- **Issue:** The old row only treated an exact 0 as zero, so a tiny difference would print with a sign and a destructive or success colour while looking like zero.
- **Fix:** One `formatDiff` helper used by both the component rows and the group headers; a diff that rounds to zero shows a plain 0 in the muted colour.
- **Files modified:** `app/components/ScoreComparisonModal.tsx`
- **Verification:** test C9
- **Commit:** `d4e6b06b`

**Total deviations:** 2 auto-fixed (1 missing functionality, 1 bug). **Impact:** none on scope; both keep the numbers honest for guilds that are not on the defaults.

## Authentication Gates

None.

## Issues Encountered

None. Lint reports 0 errors (375 warnings, all pre-existing and outside this plan's files).

## Known Stubs

None.

## Threat Flags

None. No new request, endpoint or data path; T-04-14-02 (NeedLabel never links) is asserted by two tests.

## Next Phase Readiness

Ready for the next plan. 04-19 owns the sign-off of the standing and interest paragraphs and the sentences; the explainer copy is draft until then.

## Self-Check: PASSED

- Created and modified files exist on disk; commits `3d8ae675`, `d4e6b06b`, `b0c30401`, `9b55b852` are on `work/forever-phase-04`.
- Acceptance criteria re-run: `ScoreComparisonModal` tests 12 of 12; `grep -c 'variant="tiles"'` prints 2; `grep -c "voice: 'other'"` prints 1; `ScoreBreakdownModal` and `NeedLabel` tests 17 of 17; `grep -c "Standing is what you bring to the raid"` prints 1; `grep -c "hover:underline"` prints 1; `grep -c "<a "` prints 0.
- Plan verification: `npx vitest run app/components` 145 of 145; `npm run typecheck` clean; `npm run lint` 0 errors; the need-reader inventory test still passes (30 of 30). No file deleted by any commit.

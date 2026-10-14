---
phase: quick-261013-ngb
plan: 01
subsystem: master-sheet
tags: [master-sheet, scoring, raider-bonus, gh-357]
requirements: [GH-357]
key-files:
  created:
    - app/(app)/master-sheet/components/__tests__/BossSection.test.tsx
  modified:
    - domain/scoring/explain.ts
    - domain/scoring/__tests__/engine.test.ts
    - app/(app)/master-sheet/components/BossSection.tsx
    - app/(app)/master-sheet/components/ItemCandidateModal.tsx
    - app/(app)/master-sheet/components/__tests__/ItemCandidateModal.test.tsx
status: complete
completed: 2026-10-13
---

# Quick 261013-ngb: Master sheet hovers show the raider bonus reason and end date (GH #357)

The officer score popover on the master sheet and the inline explanation in the item candidate modal now list each active raider bonus entry's reason and end date (the text `describeRaiderBonusEntries` already produced for the overview page), instead of only the total.

## Commits (branch fix/357-master-sheet-bonus-reasons, PR #409)

- `667f8d5d` fix(master-sheet): show raider bonus reason and end date in score hovers (GH #357)

## What changed

- `domain/scoring/explain.ts`: `explainScore` takes an optional third argument `ExplainScoreOptions { characterId?, asOfDate? }`. Config-only callers that pass it get the same raider bonus detail the `ScoreInput` path already produced; without it the generic detail stays. The generic text is exported as `RAIDER_BONUS_GENERIC_DETAIL` so the UI can tell the two apart. `ScoreInput` path, `ScoreLine` shape and `context` are unchanged.
- `BossSection.tsx`: `ScoreBreakdownPopover` passes `characterId: ranking.character_id` and `asOfDate: toDateString(new Date())` (the date the master sheet scores with) and renders the detail under the Raider bonus line only when it is not the generic text. Card widened from `w-56` to `w-64` so a 60-character reason plus "+N until Mon D" fits on two lines.
- `ItemCandidateModal.tsx`: `rankingToExplanation` passes the same options; the inline top-3 explanation appends ` (reason: +N until Mon D)` to the Raider bonus line under the same condition.
- Tests: 4 in `engine.test.ts` (config-only call with character id lists reasons; no id keeps generic; `single_raider_overall_bonus: false` keeps generic; dated entries need `asOfDate`), 2 in the new `BossSection.test.tsx` (popover shows the reason line; generic case shows no extra line), 2 in `ItemCandidateModal.test.tsx` (inline line carries the reason; generic case does not).

## Verification

- `npx vitest run domain/scoring "app/(app)/master-sheet"`: 10 files, 368 tests passed (RED first per task: 4, then 1, then 1 failing before each change).
- `npm run typecheck`: clean. `npx eslint` on the 6 touched files: 0 errors, 5 pre-existing warnings on untouched lines.
- No em dashes in added lines; the one in the old popover docstring was replaced with a colon.

## Deviations from Plan

- `asOfDate` is required for dated entries (the planner caught that omitting it marks them inactive); both components pass today's date, matching `MasterSheetContent`.
- BossSection test scopes the name lookup to the desktop table with `within`, because the mobile card list renders the name too.

## Flags for the user

- No new copy: the only text shown is the existing signed-off `describeRaiderBonusEntries` output, for example "Full enchants: +2 until Oct 12".
- Pre-existing quirk left alone: the candidate modal's inline explanation renders `line.context` with a template string, which would print "[object Object]" if any line ever set `context` (none does on this path).
- With PR #399 (items 1 and 3) this covers all of #357; close the issue once both are merged.

## Known Stubs

None.

## Threat Flags

None. The reason text is officer-entered, already shown on the overview page, and rendered as text.

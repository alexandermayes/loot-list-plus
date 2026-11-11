---
phase: 04-discovery-lists-and-score-split
plan: 20
subsystem: ui
tags: [react, vitest, need-picker, loot-list, context, accessibility, error-states]

requires:
  - phase: 04-discovery-lists-and-score-split
    provides: "04-08 submit route 422 refusals (NEED_BUDGET_EXCEEDED, NEED_NOT_ELIGIBLE); 04-11 picker, rows, footer and explicit-rankings save; 04-03 readNeedPositions and buildNeedRankings"
provides:
  - "LootListContext: saveSubmission resolves a SaveSubmissionResult ({ ok: true } or { ok: false, code, message, details }), SaveSubmissionOptions.quiet, reopenForEdit in the actions context, loadFailed in the data context"
  - "NeedPicker: status block (one badge and sentence per list status, officer note), approved read-only state with the Change your 5? confirm, budget and eligibility refusals, save error Alert with retry, load ErrorState with retry, success announcement; NEED_PICKER_STATUS_COPY"
  - "NeedPickerRow: readOnly state (plain content, no tap target, no Move up); the warning line now carries the eligibility refusal"
  - "ErrorState: optional retryLabel"
affects: [04-19]

actuals:
  tokens: 11900
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "The picker saves with quiet: true and renders every outcome itself; the editor passes no options and keeps its toasts, so one save path serves both"
    - "Server refusals are read by code only: the budget sentence comes from the 422 body's error (the fixed sentence), the eligibility refusal contributes need keys and nothing else, and any other failure shows a fixed sentence, never the server text"
    - "An approved list's Change my 5 confirm only unlocks rows locally; the audited reopen stays inside saveSubmission at save time"

key-files:
  created:
    - components/ui/__tests__/error-state.test.tsx
  modified:
    - app/contexts/LootListContext.tsx
    - app/contexts/__tests__/LootListContext-save.test.tsx
    - app/(app)/loot-list/components/NeedPicker.tsx
    - app/(app)/loot-list/components/NeedPickerRow.tsx
    - app/(app)/loot-list/components/__tests__/NeedPicker.test.tsx
    - app/(app)/loot-list/components/LootListContent.tsx
    - components/ui/error-state.tsx

key-decisions:
  - "Unsaved edits show the Draft sentence ('You changed your 5...') except on a list the officers sent back (needs revision or rejected): there the officer note and send-back sentence stay in view while the raider fixes the list, because the note says what to change. Still exactly one badge and sentence"
  - "Right after a successful save the status region shows Pending plus 'Saved. Officers will review your 5.' in place of the pending sentence (one line, not two), takes focus, and clears at the next edit"
  - "A read-only approved row is a plain div, not a disabled button: UI-SPEC says no tap target, and a disabled button reads to a screen reader as a dimmed control. The Change my 5 / Save my 5 button is one element whose label and variant change, so focus returning from the confirm lands on the primary action"
  - "The eligibility sentence also shows in the footer (UI-SPEC E1 error row: 'in the footer and on the row'), which gives screen readers the polite announcement the row warning alone would not"
  - "The save error Alert is the destructive variant (it is an error) but its text uses text-foreground, per the UI-SPEC contrast rule against status colours as text on light surfaces; budget and eligibility guidance never use the danger palette"
  - "A refusal of code NEED_NOT_ELIGIBLE that names no readable row falls through to the save error Alert with retry, so the raider is never left with nothing"

patterns-established:
  - "Edits clear the last save's outcome (footer sentence, save error, success line); a refused need's mark clears only when that row changes, and Move up carries it with the row"
  - "Retry saving re-sends the stored payload of the failed attempt; any edit drops the Alert so a retry can never re-send an old list"

requirements-completed: []  # DISC-02, DISC-03, DISC-04, DISC-05 stay open: requirements.ready-ids returned 0 of 4 because 04-19 still declares them

coverage:
  - id: D1
    description: "saveSubmission resolves { ok: true } on success and { ok: false, code, message, details } carrying the submit route's code and body (non-JSON body gives no code and the fallback message, a failed items save gives the message only); quiet shows no notification either way; without options today's notifications are unchanged; reopenForEdit is in the actions context"
    requirement: DISC-05
    verification:
      - kind: unit
        ref: "app/contexts/__tests__/LootListContext-save.test.tsx#LootListContext save result (D-27, D-07, D-10)"
        status: pass
      - kind: unit
        ref: "app/contexts/__tests__/LootListContext-save.test.tsx#without options saves the editor state and shows today's messages (T-04-11-03)"
        status: pass
    human_judgment: false
  - id: D2
    description: "A 422 NEED_BUDGET_EXCEEDED shows the server's over-budget sentence in the footer warning panel until the next edit; a 422 NEED_NOT_ELIGIBLE marks each refused row (and the footer) with the shared sentence until that row changes; neither renders in the danger palette"
    requirement: DISC-03
    verification:
      - kind: unit
        ref: "app/(app)/loot-list/components/__tests__/NeedPicker.test.tsx#NeedPicker server budget refusal (D-07, DISC-03)"
        status: pass
      - kind: unit
        ref: "app/(app)/loot-list/components/__tests__/NeedPicker.test.tsx#NeedPicker eligibility refusal (D-10, DISC-04)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Pending, Approved, Needs revision and Rejected each show one badge and sentence, Rejected shows 'Officer note: ...', an approved list with change_rejected_at shows the recent-change sentence, unsaved edits show the Draft sentence, three picks read 'Pick all 5 to save. 3 of 5 picked.' under each editable status"
    requirement: DISC-04
    verification:
      - kind: unit
        ref: "app/(app)/loot-list/components/__tests__/NeedPicker.test.tsx#NeedPicker status block (D-11, D-27)"
        status: pass
    human_judgment: false
  - id: D4
    description: "A draft or pending list whose saved rows read back short of a Discovery tier's rows opens as changed with Save my 5 and one save writes the missing tier's rows; an approved list with the same gap keeps Change my 5 and the Approved sentence"
    requirement: DISC-05
    verification:
      - kind: unit
        ref: "app/(app)/loot-list/components/__tests__/NeedPicker.test.tsx#a pending list with a Discovery tier short of rows opens as changed and one save sends it"
        status: pass
      - kind: unit
        ref: "app/(app)/loot-list/components/__tests__/NeedPicker.test.tsx#an approved list with the same gap keeps Change my 5 and the Approved sentence"
        status: pass
    human_judgment: false
  - id: D5
    description: "An approved list renders read-only rows with no tap target and no Move up and an outline Change my 5; Keep it leaves it read-only; confirming unlocks the rows with no server call (no fetch, no reopenForEdit, no save) and the next Save my 5 calls saveSubmission"
    requirement: DISC-04
    verification:
      - kind: unit
        ref: "app/(app)/loot-list/components/__tests__/NeedPicker.test.tsx#NeedPicker approved list (D-05, D-27)"
        status: pass
    human_judgment: false
  - id: D6
    description: "A save failure keeps the list on screen and shows the Alert 'Couldn't save your 5. Try again.' with Retry saving my 5 (same rankings, never the server text); a failed load or a gap in the need rows shows the ErrorState with Retry loading my 5 calling refreshData; a successful save moves focus to the status region reading 'Saved. Officers will review your 5.'"
    requirement: DISC-02
    verification:
      - kind: unit
        ref: "app/(app)/loot-list/components/__tests__/NeedPicker.test.tsx#NeedPicker save error (UI-SPEC E1 error)"
        status: pass
      - kind: unit
        ref: "app/(app)/loot-list/components/__tests__/NeedPicker.test.tsx#NeedPicker load error (UI-SPEC E1 error)"
        status: pass
      - kind: unit
        ref: "app/(app)/loot-list/components/__tests__/NeedPicker.test.tsx#NeedPicker save success (D-27)"
        status: pass
      - kind: unit
        ref: "app/contexts/__tests__/LootListContext-save.test.tsx#reports loadFailed when the list read failed and no list came back"
        status: pass
    human_judgment: false
  - id: D7
    description: "A 300 character officer note on a rejected list wraps in the status block with no max height at 320px and 375px"
    requirement: DISC-04
    verification:
      - kind: unit
        ref: "app/(app)/loot-list/components/__tests__/NeedPicker.test.tsx#wraps a 300 character officer note with no height cap"
        status: pass
    human_judgment: true
    rationale: "The test pins break-words and the absence of any height cap; whether the block looks right at 320px needs a real browser (UI-SPEC E1 long-text backstop)"
  - id: D8
    description: "On a throwaway Forever guild whose tiers are Discovery, at 375x667: submit as a raider, approve as an officer, then as the raider tap Change my 5, confirm, change one row, tap Save my 5. The first save announces the saved line, the approved list shows read-only rows and Change my 5, and after the change the list shows Pending and the officer review list shows it again"
    requirement: DISC-04
    verification: []
    human_judgment: true
    rationale: "The audited reopen and the officer approval need a real session and Supabase; jsdom has neither"
  - id: D9
    description: "The status, refusal, error, confirm and success strings read right in the Big Yikes voice"
    verification: []
    human_judgment: true
    rationale: "All strings in NEED_PICKER_STATUS_COPY are DRAFT for the owner's 04-19 sign-off; a test can pin the words but not whether they are the right words"

duration: 18min
completed: 2026-11-11
status: complete
---

# Phase 4 Plan 20: Need picker statuses, approved state, refusals and error screens Summary

**One save path that returns the server's refusal code, so the need picker shows budget and eligibility refusals where they belong, a badge and sentence for every list status, an approved list that changes only through a confirm and a new officer review, and clear load and save errors with retries.**

## Performance

- **Duration:** 18 min
- **Started:** 2026-11-11T07:10Z
- **Completed:** 2026-11-11T07:28Z
- **Tasks:** 3 (tracer, two auto)
- **Files modified:** 8 (1 created)

## Accomplishments

- `saveSubmission` now resolves a `SaveSubmissionResult` with the submit route's `code` and parsed body, takes `quiet`, and `reopenForEdit` is in the actions context. The editor passes no options, ignores the value and keeps today's toasts (pinned by the existing T-04-11-03 test).
- The picker saves quietly and renders every outcome: the budget sentence in the footer warning panel, each refused need on its row, a fixed-sentence Alert with `Retry saving my 5`, and a success line that takes focus.
- Every list status has one badge and sentence above the rows; a rejected list also shows the officer note, wrapping with no height cap.
- An approved list is read-only (rows are plain content, no Move up) with an outline `Change my 5`; the `Change your 5?` confirm only unlocks the rows and the audited reopen runs at save time (T-04-20-01, asserted by test: no fetch, no `reopenForEdit`, no save on confirm).
- A draft or pending list that reads back short of a tier's rows opens as changed, so one `Save my 5` writes the missing rows; an approved list with the same gap keeps `Change my 5`.

## Task Commits

1. **Task 1 (tracer): refusal reaches the footer through SaveSubmissionResult** - `a3a91de2` (feat). Tracer verify re-run at the commit: `npx vitest run "app/(app)/loot-list/components/__tests__"` and `npm run typecheck` pass, so expansion continued without a checkpoint.
2. **Task 2: status block and approved read-only state** - `f189de61` (feat)
3. **Task 3a: loadFailed and ErrorState retryLabel** - `afc3868d` (feat)
4. **Task 3b: eligibility refusal, save and load errors, success announcement** - `6ede1a3a` (feat)

Tests and implementation share a commit per task (tests were written and run red first; the type-level additions would not have typechecked at a test-only commit).

## Files Created/Modified

- `app/contexts/LootListContext.tsx` - SaveSubmissionResult, quiet, SubmitRefusal, reopenForEdit exposure, loadFailed
- `app/(app)/loot-list/components/NeedPicker.tsx` - status block, approved state, refusals, errors, success; NEED_PICKER_STATUS_COPY
- `app/(app)/loot-list/components/NeedPickerRow.tsx` - readOnly row state
- `app/(app)/loot-list/components/LootListContent.tsx` - the submit confirm discards the new return value (type fix)
- `components/ui/error-state.tsx` - optional retryLabel
- Tests: `NeedPicker.test.tsx`, `LootListContext-save.test.tsx`, new `components/ui/__tests__/error-state.test.tsx`

## Decisions Made

See `key-decisions` above. The two worth the owner's eye at the 04-19 copy review: the audited reopen still runs at save time rather than on confirm (flagged in the plan), and edits on a sent-back list keep the officer note instead of switching to the Draft sentence.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] LootListContent's confirm callback did not typecheck**
- **Found during:** Task 1
- **Issue:** `onConfirm: () => saveSubmission(true)` returns the new result type where `useConfirm` wants `void | Promise<void>`.
- **Fix:** wrapped in an async callback that awaits and discards the value.
- **Files modified:** `app/(app)/loot-list/components/LootListContent.tsx`
- **Commit:** `a3a91de2`

**2. [Rule 2 - Missing critical functionality] Failed list read showed a default list**
- **Found during:** Task 3
- **Issue:** the plan asks for a load error on "a load failure" but the context exposed no load error. With the submission read failed, the picker would show the spec default with `Looks right`, inviting a save over a list that exists but did not load.
- **Fix:** `loadFailed` in the data context (submission read errored and returned nothing; a failed revalidation that keeps its data does not count), shown by the picker gate before the body mounts.
- **Files modified:** `app/contexts/LootListContext.tsx`, `NeedPicker.tsx`, context test
- **Commit:** `afc3868d`, `6ede1a3a`

**3. [Rule 3 - Blocking] ErrorState's retry button text was fixed**
- **Found during:** Task 3
- **Issue:** the spec requires the button `Retry loading my 5`; `ErrorState` always said `Try again`.
- **Fix:** optional `retryLabel` (default unchanged) with its own small test file.
- **Files modified:** `components/ui/error-state.tsx`, `components/ui/__tests__/error-state.test.tsx`
- **Commit:** `afc3868d`

**4. [Variance] Read-only rows are plain divs**, not disabled buttons (see key-decisions); the plan text said "non-interactive row button".

**5. [Variance] Eligibility sentence also shown in the footer** per the UI-SPEC E1 error row; the plan's behaviour list named only the row.

**6. [Variance] Non-JSON refusal body** now yields the fallback "Couldn't submit list" instead of a JSON SyntaxError message in the editor's error toast. The plan asks for "no code and the existing message"; the old message for that case was a parser error string, so this is the only visible change to the editor and it is for the better.

## Authentication Gates

None.

## Issues Encountered

- A new describe block that reused the previous block's leftover mocked context (the success tests ran against a failing `saveSubmission` mock) failed on focus; fixed with a `beforeEach(setContexts)`. Test-only.

## Known Stubs

None. `NeedPickerRow`'s `warning` prop and `BudgetLine`'s `overSentence` are now both wired to the server refusals.

## Known Limitations (for the end-of-phase check)

- **Retry loading after a gap in the need rows.** `Retry loading my 5` calls `refreshData`, which revalidates the submission only (plan-specified). If the need rows themselves are missing from the items response, the retry cannot fill them and the raider needs a page reload. Revalidating the items key as well would fix it but changes `refreshData` for the editor, so it is left for the owner to decide.
- **Human checks outstanding (D7, D8, D9):** the 300 character note at 320px and 375px, the approve-then-Change-my-5 flow on a throwaway Discovery guild, and copy sign-off at 04-19.
- **Success line vs cache.** The success line shows right after the save regardless of what the status cache has caught up to; in the real provider the optimistic cache update makes the status Pending in the same render.

## Threat Flags

None beyond the plan's register. T-04-20-01 (confirm makes no server call) and T-04-20-03 (server text never shown: a test asserts a raw failure message is absent from the document) are mitigated and tested; T-04-20-02 and T-04-20-04 hold because the picker acts only on the active character's submission and every save submits to pending through the existing authorised routes.

## Next Phase Readiness

- 04-19 can sign off the strings in `NEED_PICKER_STATUS_COPY` and `NEED_PICKER_COPY`, and mark DISC-02 to DISC-05 complete once its own work lands.
- Ships in PR 3 with 04-11, after 04-02 records the deploy.

## Self-Check: PASSED

Created and modified files exist, and commits a3a91de2, f189de61, afc3868d and 6ede1a3a are on `work/forever-phase-04`. `npx vitest run __tests__ lib/loot` (315 files, including the PRIM-01 hand-rolled-cards guard and the need-reader inventory), the loot-list, contexts, components/ui and need-picker suites (152 tests), `npm run typecheck` and `npm run lint` (0 errors, warning count unchanged at 375) all pass.

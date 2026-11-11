---
phase: 04-discovery-lists-and-score-split
plan: 11
subsystem: ui
tags: [react, vitest, need-picker, loot-list, context, accessibility, skeleton]

requires:
  - phase: 04-discovery-lists-and-score-split
    provides: "04-03 need-picks, need-budget, need-eligibility; 04-04 need-defaults; 04-08 submit route; 04-09 need_tier_slots; 04-10 NeedQuestionSheet"
provides:
  - "LootListContext: needTierSlots in the data context, seeded from the bootstrap; saveSubmission(submit, { rankings?, successMessage? }) with exported SaveSubmissionOptions"
  - "LootListContent switches to <NeedPicker /> exactly when needTierSlots is non-null; the Known editor path keeps its markup"
  - "app/(app)/loot-list/components/NeedPicker.tsx: five-row picker, spec chip, helpers, scope line, sticky budget footer, Looks right / Save my 5 through one saveSubmission(true) call; NEED_PICKER_COPY draft strings"
  - "NeedPickerRow, NeedCostMarker, BudgetLine, NeedPickerSkeleton"
  - "NeedQuestionSheet now forwards optionState to the flow"
affects: [04-20, 04-19, 04-13]

actuals:
  tokens: 16300
  tasks: 3
  commits: 7

tech-stack:
  added: []
  patterns:
    - "Picker edits live in local state as null until the first change; the saved or default list shows until then, so no sync effect is needed and a failed save keeps the edits on screen"
    - "The picker builds rows only for active tiers (need rows are served for those) and carries every saved row it cannot see over unchanged, so a turned-off tier's rows survive a save"
    - "A needs-gap (buildNeedRankings missing) blocks the save instead of writing fewer rows"
    - "cn() with text-12 beside a text colour drops text-12 (tailwind-merge reads it as a colour), so 12px text sits on its own inner span"

key-files:
  created:
    - app/(app)/loot-list/components/NeedPicker.tsx
    - app/(app)/loot-list/components/NeedPickerRow.tsx
    - app/components/need-picker/BudgetLine.tsx
    - app/components/need-picker/NeedCostMarker.tsx
    - app/(app)/loot-list/components/__tests__/NeedPicker.test.tsx
    - app/(app)/loot-list/components/__tests__/LootListContent-mode.test.tsx
    - app/contexts/__tests__/LootListContext-save.test.tsx
  modified:
    - app/contexts/LootListContext.tsx
    - app/(app)/loot-list/components/LootListContent.tsx
    - app/components/need-picker/NeedQuestionSheet.tsx
    - app/hooks/use-api.ts
    - components/ui/skeletons.tsx
    - components/ui/__tests__/skeletons.test.tsx

key-decisions:
  - "The picker is mounted in place of the editor's main content column; on the picker page the editor-only status banner, resubmit nudge, duplicate warning, first-time guidance and the How to rank button are not rendered, because they act on the editor's rankings and describe the 50-level editor. 04-20 puts the picker's own status block where the banner was"
  - "Rows are built for the guild-active tiers only (need_tier_slots counts turned-off tiers so locks never move, but the server serves need rows for active tiers); rankings entries at a turned-off tier's slot are left out of readNeedPositions and carried over on save"
  - "Primary button label: Looks right only when the list equals the spec default, nothing changed, the saved list reads back cleanly and the status is none or draft; otherwise Save my 5. Disabled until five picks and while over budget"
  - "A row is locked when any tier's (rank, slot), turned-off tiers included, holds an award lock; Move up is disabled for the row and for the row below a locked one"
  - "The NeedPicker key carries character id, spec id and phase, so changing spec drops local edits and shows the new spec's default"
  - "NEED_PICKER_COPY (title, helpers, third-copy and duplicate sentences, button labels, no-character state) is exported from NeedPicker.tsx so 04-20 and the 04-19 copy review find one table"

patterns-established:
  - "Budget is judged on the slot question (costForSlot and wouldGoOver with the row's own pick excluded) and the sentence uses the bigPicks of the list the tap would create; duplicates and copy caps are judged on context.need"
  - "NeedPickerRow takes a warning prop and BudgetLine an overSentence, which is where 04-20 renders the server's 422 refusals"

requirements-completed: []  # DISC-02, DISC-03, DISC-04, DISC-05 stay open: sibling plans declare them (04-20 completes the picker; ready-ids returned 0 of 4)

coverage:
  - id: D1
    description: "A Mage with no saved list sees the five default rows with the default-list helper, and one Looks right tap calls saveSubmission once with (true, { rankings }) holding the 15 fan-out rows 50-1 to 46-3"
    requirement: DISC-02
    verification:
      - kind: unit
        ref: "app/(app)/loot-list/components/__tests__/NeedPicker.test.tsx#NeedPicker tracer (D-11, D-27)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The page renders NeedPicker for a non-null need_tier_slots and the unchanged editor for null; the context exposes needTierSlots and seeds it from the bootstrap"
    requirement: DISC-05
    verification:
      - kind: unit
        ref: "app/(app)/loot-list/components/__tests__/LootListContent-mode.test.tsx"
        status: pass
      - kind: unit
        ref: "app/contexts/__tests__/LootListContext-save.test.tsx#exposes needTierSlots from the phase items and null without a map"
        status: pass
    human_judgment: false
  - id: D3
    description: "saveSubmission with explicit rankings saves them (not the editor state) and keeps them as the new state; without options it saves the state with today's messages; a turned-off tier's saved rows are carried over and a missing need row blocks the save"
    requirement: DISC-05
    verification:
      - kind: unit
        ref: "app/contexts/__tests__/LootListContext-save.test.tsx"
        status: pass
      - kind: unit
        ref: "app/(app)/loot-list/components/__tests__/NeedPicker.test.tsx#NeedPicker tracer (D-11, D-27)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Five rows in one ol, row names with number, sentence and cost word, Move up with swap, focus and polite announcement, locked rows that never move or receive a swap, no off-spec toggle, neutral cost markers, tappable controls, scope line for one and many raids"
    requirement: DISC-04
    verification:
      - kind: unit
        ref: "app/(app)/loot-list/components/__tests__/NeedPicker.test.tsx#NeedPicker rows (D-16, D-04)"
        status: pass
      - kind: unit
        ref: "app/(app)/loot-list/components/__tests__/NeedPicker.test.tsx#NeedPicker Move up (UI-02, D-05)"
        status: pass
    human_judgment: false
  - id: D5
    description: "The footer reads 'n of 10 points used.' as a polite atomic live region with a 10-segment meter, shows the over-budget sentence in a warning panel and disables the button when over, and the sheet refuses an over-budget slot or a duplicate at the tap"
    requirement: DISC-03
    verification:
      - kind: unit
        ref: "app/(app)/loot-list/components/__tests__/NeedPicker.test.tsx#NeedPicker budget footer (D-07, DISC-03)"
        status: pass
      - kind: unit
        ref: "app/(app)/loot-list/components/__tests__/NeedPicker.test.tsx#NeedPicker question sheet (D-07, D-29)"
        status: pass
    human_judgment: false
  - id: D6
    description: "NeedPickerSkeleton (title block, exactly five row shapes) shows while the list loads with no footer, and the rows and footer replace it once the list is in"
    requirement: DISC-02
    verification:
      - kind: unit
        ref: "app/(app)/loot-list/components/__tests__/NeedPicker.test.tsx#NeedPicker loading (UI-SPEC E1 loading)"
        status: pass
      - kind: unit
        ref: "components/ui/__tests__/skeletons.test.tsx#NeedPickerSkeleton renders exactly five row shapes"
        status: pass
    human_judgment: false
  - id: D7
    description: "Fill the picker in under 60 seconds on a phone: 375px and 320px layout, no horizontal scroll, the footer never covering row 5, the longest need sentence wrapping to two lines at 375px and three at 200% zoom, keyboard-only and screen-reader pass, sticky footer behaving inside the app shell, and the default flow on a throwaway Discovery guild ending in a pending submission"
    requirement: DISC-02
    verification: []
    human_judgment: true
    rationale: "jsdom loads no Tailwind stylesheet and has no layout or assistive technology; the 60-second target is the unclassified DISC-02 edge probe and is an end-of-phase human check"
  - id: D8
    description: "The picker copy (title, helpers, button labels, no-character state, third-copy and duplicate sentences) reads right in the Big Yikes voice"
    verification: []
    human_judgment: true
    rationale: "All copy is DRAFT for the owner's 04-19 sign-off; a test can pin the words but not whether they are the right words"

duration: 15min
completed: 2026-11-11
status: complete
---

# Phase 4 Plan 11: Need Picker Page, Rows and Budget Footer Summary

**/loot-list swaps the 50-rank editor for a five-row need picker in all-Discovery groups: one Looks right tap saves the spec default as 15 fan-out rows through saveSubmission and submits to officer review, with the question sheet, Move up, a 10-point budget footer and a skeleton**

## Performance

- **Duration:** 15 min
- **Started:** 2026-11-11T06:29Z
- **Completed:** 2026-11-11T06:44Z
- **Tasks:** 3 (tracer, rows and footer, skeleton)
- **Files:** 7 created, 6 modified

## Accomplishments

- Context: `needTierSlots` is read from the phase items data and the bootstrap seeds it into the items key (null when absent). `saveSubmission(submit, options?)` takes `SaveSubmissionOptions { rankings?, successMessage? }`; explicit rankings are what is written, become `rankings` and `initialRankings`, and are recorded in `lastSavedRankingsRef` so autosave never rewrites them. Without options the code path and both messages are as before.
- Page switch: `LootListContent` renders `<NeedPicker />` for a non-null slot map. The mode test proves the editor (and no picker) for null.
- `NeedPicker`: derives the list (saved need rows, else the spec default, else five empty rows), builds `buildNeedRankings` over the active tiers' slots, carries over saved rows it cannot see, and refuses to save when a need row is missing. Looks right versus Save my 5, the spec chip that opens `EditCharacterModal`, the helpers, the scope line, the sticky footer (list padded by the footer's measured height) and the no-character `EmptyState`.
- `NeedPickerRow`, `NeedCostMarker` (word plus three dots, neutral), `BudgetLine` (polite atomic sentence, 10 segments, warning panel when over): no classification badge, no danger palette, no `grid-cols-2` or `flex-row`.
- Sheet: `optionState` judges budget on the slot question and duplicates and copy caps on `context.need`, so a Big slot at 10 of 10 over a Standard row is disabled with the over-budget sentence and a repeated need is refused at the tap.
- Move up swaps without drag, keeps focus on the moved row (its main button at number 1), announces "Moved to number n." and never moves a locked row or swaps another into one.
- `NeedPickerSkeleton` (five row shapes, count coupled to the picker) replaces title, rows and footer until the list is in.
- Verification: `npm run typecheck` clean, `npm run lint` 0 errors (375 warnings, the same count as before), `npm test` 312 files and 6313 tests passed. The tracer's `<verify>` and acceptance greps were re-run after its GREEN commit and passed, so the plan continued into the expansion tasks without a checkpoint.

## Task Commits

1. **Task 1: Tracer, a Mage's default is accepted with one Looks right tap and saved as 15 rows** - `92682b40` (test, RED), `020eb834` (feat, GREEN)
2. **Task 2: Rows, sheet, Move up, budget footer, scope line** - `218cdcc8` (test, RED), `bb3231b3` (feat, GREEN)
3. **Task 3: NeedPickerSkeleton while the list loads** - `c064f7dd` (test, RED), `9149dd36` (feat, GREEN)
4. **Follow-up** - `f2252224` (fix: picker key includes the spec id so a spec change drops local edits)

**Plan metadata:** committed with this SUMMARY (docs).

## Files Created/Modified

- `app/contexts/LootListContext.tsx` - `needTierSlots`, `SaveSubmissionOptions`, explicit-rankings save, bootstrap seeding
- `app/(app)/loot-list/components/LootListContent.tsx` - the switch and the editor-only chrome gated off for the picker
- `app/(app)/loot-list/components/NeedPicker.tsx`, `NeedPickerRow.tsx` - the picker
- `app/components/need-picker/BudgetLine.tsx`, `NeedCostMarker.tsx` - footer sentence and meter, cost marker
- `app/components/need-picker/NeedQuestionSheet.tsx` - forwards `optionState`
- `app/hooks/use-api.ts` - optional `kind` and `need_key` on `LootItem`
- `components/ui/skeletons.tsx` - `NeedPickerSkeleton`
- Tests: `NeedPicker.test.tsx` (29), `LootListContent-mode.test.tsx` (2), `LootListContext-save.test.tsx` (5), `skeletons.test.tsx` (+1)

## Decisions Made

See `key-decisions` above. The planner decisions in the plan (picker edits stay local, no autosave; a missing need row blocks the save; Known editor path unchanged) were implemented as written.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] NeedQuestionSheet did not forward optionState**
- **Found during:** Task 2
- **Issue:** The plan's interface says the sheet takes `optionState`, but 04-10's `NeedQuestionSheet` only forwarded `eligibility`, `currentNeedKey` and `onComplete`, so the picker could not block an over-budget slot or a duplicate.
- **Fix:** Added `optionState` to the sheet's props and passed it to the flow (additive, no behaviour change when absent).
- **Files modified:** `app/components/need-picker/NeedQuestionSheet.tsx`
- **Commit:** `bb3231b3`

**2. [Rule 3 - Blocking] LootItem had no kind or need_key**
- **Found during:** Task 1
- **Issue:** The items route already selects `kind` and `need_key`, but the client `LootItem` type lacked them, so the picker could not find need rows.
- **Fix:** Two optional fields on `LootItem` in `use-api.ts`.
- **Files modified:** `app/hooks/use-api.ts`
- **Commit:** `020eb834`

**3. [Rule 2 - Missing critical functionality] Context test file added**
- **Found during:** Task 1
- **Issue:** T-04-11-03 says saveSubmission without options keeps today's behaviour, "tested", but the plan lists no context test and none existed.
- **Fix:** `app/contexts/__tests__/LootListContext-save.test.tsx` (provider with mocked hooks and a stable Supabase stub); a mutation of `toSave` to the old behaviour makes it fail.
- **Commit:** `020eb834`

**4. [Rule 1 - Bug] Editor chrome acted on the editor's state in picker mode**
- **Found during:** Task 1
- **Issue:** The status banner (Save draft, Submit, Resubmit buttons), the resubmit nudge, the duplicate warning, the first-time guidance ("Click any empty slot...") and the How to rank button all belong to the 50-rank editor; left in place the picker page would offer a second, conflicting submit path and wrong instructions.
- **Fix:** Those six blocks render only when not in picker mode; with a null slot map every condition is unchanged, so the editor's markup is identical. 04-20 adds the picker's own status block.
- **Files modified:** `app/(app)/loot-list/components/LootListContent.tsx`
- **Commit:** `020eb834`

**5. [Variance] Spec change resets local edits**
- The picker key includes the character's spec id, so a new spec shows its own default instead of the old spec's edits (`f2252224`).

Otherwise the plan was executed as written.

## Authentication Gates

None.

## Issues Encountered

- `cn('text-12 text-foreground-secondary')` silently drops `text-12` (tailwind-merge reads `text-12` as a colour), so the 12px text in the cost marker, spec chip and helpers sits on its own element or in a plain class string.
- The first mutation check of the context test used `sed -i` (BSD), which failed; redone with a short script. No production code was affected.

## Known Stubs

None. `NeedPickerRow`'s `warning` prop and the `BudgetLine` over sentence are wired (client-side over-budget) and are where 04-20 will render the server refusals.

## Known Limitations (for 04-20 and the end-of-phase check)

- **Phase switch flash.** The switch keys on `need_tier_slots` only (plan truth D-12), and that field is undefined while a newly selected phase group's items load. If a Discovery guild ever has more than one phase group, switching between them can show the editor body for a frame before the picker. A Forever guild with one group is unaffected; deriving the mode from `phaseTiers` list_mode while loading would remove it but breaks the "keys on need_tier_slots only" rule, so it is left for the owner to decide.
- **No character.** The `Create a character first` state is built and tested in `NeedPicker`, but `LootListContent` cannot reach it today: the bootstrap needs a character, so with none the slot map stays null and the page shows the editor path. A page-level gate belongs with 04-20 or the Overview card.
- **Save failure.** `saveSubmission` still swallows errors into the notification and returns void. The picker keeps the raider's edits on screen after a failed save (nothing is reset), and 04-20 adds the result value, the Alert and the retry.
- **Needs human checks** (D7 above): 320px and 375px layout, the footer over row 5 and the sticky behaviour inside the app shell, 200% zoom, keyboard and screen reader, and the Looks right path on a throwaway Discovery guild.

## Threat Flags

None beyond the plan's register. T-04-11-02 holds: the picker only uses `activeCharacter` from GuildContext and every save goes through `save_submission_items` and the submit route, which authorise owner or officer. T-04-11-03 is mitigated and tested: the editor renders for a null slot map and `saveSubmission` without options is pinned by the context test.

## Next Phase Readiness

- 04-20 can extend `saveSubmission`'s options (`quiet`, result value, `reopenForEdit` exposure), fill `NeedPickerRow.warning` and the footer from the 422 refusals, and add the status block, the approved read-only state and the load and save error screens on this picker.
- 04-13 mounts its Set your 5 entry beside the picker; the `?picker=1` parameter changes nothing here.
- Shipping: PR 3 with 04-08, 04-09 and 04-20, after 04-02 records the deploy.

## Self-Check: PASSED

All created files exist and commits 92682b40, 020eb834, 218cdcc8, bb3231b3, c064f7dd, 9149dd36 and f2252224 are on `work/forever-phase-04`.

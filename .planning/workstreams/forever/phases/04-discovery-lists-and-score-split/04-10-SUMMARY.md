---
phase: 04-discovery-lists-and-score-split
plan: 10
subsystem: ui
tags: [react, vitest, modal, bottom-sheet, need-picker, accessibility, pure-functions]

requires:
  - phase: 04-discovery-lists-and-score-split
    provides: "04-03: eligibleNeedsFor, costForSlot, wouldGoOver, needCopyViolation, needOverBudgetSentence"
provides:
  - "domain/loot/need-questions.ts: questionsFor, optionsFor, resolveNeed, applyNeedAnswer, pruneNeedValue, nextNeedQuestion, topArmourFor, NEED_SLOT_GROUPS and the slot, armour and stat label tables"
  - "app/components/need-picker/NeedQuestionFlow.tsx: controlled, reusable question flow (sheet or inline), optionState blocking"
  - "app/components/need-picker/NeedQuestionSheet.tsx: the flow in Modal placement='sheet' with title, step line, step dots, Back and Close"
  - "app/components/need-picker/need-slot-icons.ts: NEED_SLOT_ICONS for all 19 slots, Target02Icon fallback"
  - "components/ui/modal.tsx: additive placement prop ('center' default, 'sheet')"
affects: [04-11, 04-20, 04-21, 04-19, phase-05-drop-desk]

actuals:
  tokens: 19000
  tasks: 3
  commits: 7

tech-stack:
  added: []
  patterns:
    - "Flow owns the step and history, the host owns the answers; the host judges an option through optionState(question, option, { value, need })"
    - "A reason is a description (aria-describedby on a sibling element), never part of the option's accessible name"
    - "Modal placement is an additive prop whose default class strings are pinned exactly in modal.test.tsx"

key-files:
  created:
    - domain/loot/need-questions.ts
    - domain/loot/__tests__/need-questions.test.ts
    - app/components/need-picker/NeedQuestionFlow.tsx
    - app/components/need-picker/NeedQuestionSheet.tsx
    - app/components/need-picker/need-slot-icons.ts
    - app/components/need-picker/__tests__/NeedQuestionFlow.test.tsx
  modified:
    - components/ui/modal.tsx
    - components/ui/__tests__/modal.test.tsx

key-decisions:
  - "optionState gets a third argument { value, need } (the answers as the tap would leave them, and the need the tap would finish with, else null) so the host can tell a duplicate need from a budget problem without re-deriving the flow"
  - "Answers decided before an open question are kept; changing an answer already given clears the ones after it, and pruneNeedValue drops any the eligibility no longer allows"
  - "The picker (04-11) opens the sheet with an empty value and passes currentNeedKey, so Chest, Plate and Tank are asked again instead of being skipped as decided"
  - "'In your 5' is a tag beside the option label, not a replacement for it, so Healing and Tank rows stay tell-apart-able when one is blocked"
  - "A blocked slot tile's reason is sr-only text beside the button (the alert panel shows it); a blocked armour or stat row prints its reason under the row"
  - "Slot, armour and stat words live in need-questions.ts as label tables, with a test that joins them back into every NEED_DEFINITIONS name, because needs.ts does not export its display tables and is outside this plan's files"

patterns-established:
  - "The step line reads 'Question n' until a slot is chosen and 'Question n of m' after, because m is only knowable once the slot is"

requirements-completed: []  # DISC-02, DISC-03 stay open: sibling plans declare them (04-11 is the plan that makes the flow reachable)

coverage:
  - id: D1
    description: "A Protection Warrior answers Chest then Plate and onComplete fires once with chest.plate.tank; the flow asks at most three questions, skips decided and single-choice ones, and has no weapon type or lighter armour control"
    requirement: DISC-02
    verification:
      - kind: unit
        ref: "domain/loot/__tests__/need-questions.test.ts"
        status: pass
      - kind: unit
        ref: "app/components/need-picker/__tests__/NeedQuestionFlow.test.tsx#NeedQuestionFlow tracer (D-16)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Only eligible slots, armour classes and stat families are offered, in Weapons, Armour and Accessories with an empty group hidden; eligibility null offers all 19 slots, 4 armour classes and the taxonomy's stats"
    requirement: DISC-04
    verification:
      - kind: unit
        ref: "domain/loot/__tests__/need-questions.test.ts#optionsFor (D-10)"
        status: pass
    human_judgment: false
  - id: D3
    description: "An over-budget slot stays focusable and aria-disabled with its reason as description, tapping it shows the reason in a role='alert' warning panel without advancing, and the panel clears on the next slot tap"
    requirement: DISC-03
    verification:
      - kind: unit
        ref: "app/components/need-picker/__tests__/NeedQuestionFlow.test.tsx#blocking at the tap (D-07, D-29, UI-04)"
        status: pass
    human_judgment: false
  - id: D4
    description: "A third Ring or Trinket and a duplicate need are refused at the tap that makes them: the final option shows 'In your 5' and cannot commit, and a slot with no questions left is disabled with the reason"
    requirement: DISC-03
    verification:
      - kind: unit
        ref: "app/components/need-picker/__tests__/NeedQuestionFlow.test.tsx#blocking at the tap (D-07, D-29, UI-04)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Modal placement 'sheet' anchors to the bottom edge below 640px, full width, rounded top, 85vh, slides up with duration-normal, stays the centred size sm from 640px, and keeps focus trap, Escape and focus return; every existing dialog renders the same classes"
    verification:
      - kind: unit
        ref: "components/ui/__tests__/modal.test.tsx#placement (UI-01)"
        status: pass
    human_judgment: false
  - id: D6
    description: "Auto-advance after 150ms with focus on the next title, no delay under prefers-reduced-motion, Back keeps earlier answers pressed, Close discards without onComplete, and the sheet reopens fresh"
    verification:
      - kind: unit
        ref: "app/components/need-picker/__tests__/NeedQuestionFlow.test.tsx#NeedQuestionSheet (D-16, UI-01)"
        status: pass
    human_judgment: false
  - id: D7
    description: "The sheet looks right on a real phone: tile grid at 320px and 375px, labels wrapping to two lines before clipping, the bottom sheet slide, safe-area padding, the warning panel at the top, and the slot glyphs reading well at 24px"
    verification: []
    human_judgment: true
    rationale: "jsdom loads no Tailwind stylesheet, so layout, the slide and glyph quality can only be judged by eye; the picker page that mounts the sheet arrives in 04-11"
  - id: D8
    description: "The question titles, group labels, tags, step line and building sentence read right in the Big Yikes voice"
    verification: []
    human_judgment: true
    rationale: "All copy is DRAFT for the owner's 04-19 sign-off; a test can pin the words but not whether they are the right words"

duration: 14min
completed: 2026-11-11
status: complete
---

# Phase 4 Plan 10: Need Question Flow and Bottom Sheet Summary

**A controlled need question flow (at most three auto-advancing taps, eligible options only, over-budget and duplicate picks refused at the tap through a host-supplied optionState), a phone bottom sheet on a new additive Modal `placement="sheet"`, and the 19-slot icon map**

## Performance

- **Duration:** 14 min
- **Started:** 2026-11-11T04:47Z
- **Completed:** 2026-11-11T05:01Z
- **Tasks:** 3 (tracer, sheet, blocking)
- **Files modified:** 8 (6 created, 2 modified)

## Accomplishments

- `need-questions.ts`: pure question logic. `questionsFor` lists the applicable questions (slot always, armour only for an armour slot with more than one wearable class, stat only when a family choice exists), `optionsFor` returns eligible options (slots grouped, empty groups dropped), `resolveNeed` returns the definition once every remaining question has a single answer, so a mage taps Chest once. `applyNeedAnswer`, `pruneNeedValue` and `nextNeedQuestion` keep the answers consistent. 29 tests.
- `NeedQuestionFlow`: controlled, `variant` 'sheet' or 'inline', eligibility null for the Drop Desk. Tiles at three columns (four from 640px), rows for armour and stat, `aria-pressed` everywhere, Current and Your armour tags, 150ms auto-advance (immediate under reduced motion) with focus on the next title, a polite building sentence that follows the resolved need. 32 tests across the flow, icon map, reduced motion and sheet.
- Blocking (D-07, D-29): `optionState` makes an option `aria-disabled` but focusable, a blocked slot shows its reason in a `bg-warning/10` `role="alert"` panel and does not advance, and the final question's blocked option carries an In your 5 tag and cannot commit. No danger palette or traffic-light colours.
- `Modal placement`: additive prop. The default class strings of the backdrop, panel and dialog are pinned exactly in `modal.test.tsx` (T-04-10-02), so every existing dialog is provably unchanged. `'sheet'` is bottom-anchored below 640px with safe-area padding and a `duration-normal` slide, and the centred size sm from 640px.
- `NeedQuestionSheet`: ModalTitle is the question (16px 600) and labels the dialog, with the step line, step dots (current dot accent), a 44px Back from the second question, and the standard Close. It closes itself on the last answer; any other close discards the change.
- `need-slot-icons.ts`: all 19 slots mapped, `Target02Icon` fallback.
- Verification: `npx vitest run domain/loot components/ui app/components/need-picker` (36 files, 682 tests), `npm run typecheck` and `npm run lint` (0 errors) pass. The full suite (301 files, 6090 tests) passed apart from one guard this plan tripped and fixed (see Deviations).

## Task Commits

1. **Task 1: Tracer, Protection Warrior Chest, Plate completes chest.plate.tank** - `80f7d2c2` (test, RED), `6645244f` (feat, GREEN)
2. **Task 2: Modal placement, slot icons, sheet, Back and close** - `c3e1978a` (test, RED), `d9613878` (feat, GREEN)
3. **Task 3: Blocking at the slot step** - `2630ca16` (test, RED), `4acfb4dd` (feat, GREEN), `0424c772` (fix, shared Card)

**Plan metadata:** committed with this SUMMARY (docs).

Tracer gate: the tracer's `<verify>` (`npx vitest run domain/loot/__tests__/need-questions.test.ts app/components/need-picker`) and acceptance greps were re-run after its GREEN commit and passed, so the plan continued straight into the expansion tasks as the orchestrator directed.

## Files Created/Modified

- `domain/loot/need-questions.ts` and `__tests__/need-questions.test.ts` - question logic, label tables, slot groups
- `app/components/need-picker/NeedQuestionFlow.tsx` - the controlled flow
- `app/components/need-picker/NeedQuestionSheet.tsx` - Modal sheet wrapper
- `app/components/need-picker/need-slot-icons.ts` - slot icon map
- `app/components/need-picker/__tests__/NeedQuestionFlow.test.tsx` - flow, icons, reduced motion, sheet, blocking
- `components/ui/modal.tsx` and `__tests__/modal.test.tsx` - the placement prop and its tests

## Decisions Made

See `key-decisions` above. The three that later plans must honour:

- **04-11 picker:** mount `NeedQuestionSheet` with an empty flow value and pass the row's need as `currentNeedKey`. Pre-filling the value would make the flow treat those answers as decided and skip straight to completion.
- **04-11 and 04-20 optionState:** supply budget, copy cap and duplicate rules through `optionState(question, option, { value, need })`. Judge budget on `question === 'slot'` (cost depends only on the slot, so use `costForSlot(slot)` and `wouldGoOver` with the position being changed excluded) and judge a duplicate or copy cap on `context.need` (non-null exactly when the tap would finish a need, so it also covers a slot with no armour or stat question left).
- **Phase 5 Desk:** mount `NeedQuestionFlow variant="inline" eligibility={null}`. Inline renders its own heading, step line and Back; the sheet variant hands those to its dialog header.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Inline variant tripped the hand-rolled card guard**
- **Found during:** Task 3, full-suite run before the SUMMARY
- **Issue:** `__tests__/hand-rolled-cards.test.ts` (PRIM-01) flagged the inline variant's own `rounded-xl border border-border bg-card` div.
- **Fix:** the inline variant now renders on the shared `Card`; the sheet variant stays a plain div.
- **Files modified:** `app/components/need-picker/NeedQuestionFlow.tsx`
- **Commit:** `0424c772`

### Plan interpretations (no code deviation, recorded so 04-19 and later plans see them)

- **optionState signature:** the plan and UI-SPEC give `optionState(question, option)`; it takes a third `context` argument. Without it the host cannot know whether a tap finishes a need, which the duplicate rule ("at Q1 when no question is left, otherwise at the last question") needs.
- **'In your 5' as a tag:** the plan says the option's label becomes 'In your 5'. Replacing the label would leave two blocked rows indistinguishable, so the option keeps its word and gains the tag.
- **Icon names:** the UI-SPEC candidates `AxeIcon` and `BowArrowIcon` are not in the installed `@hugeicons/core-free-icons`. Weapons use `Sword01Icon` (main hand) and `Sword02Icon` (two-hand); off-hand weapon, ranged weapon, trinket, back, relic, shoulders, wrist and legs use `Target02Icon`. This is the plan's own fallback rule (flagged assumption), not a new decision.
- **Stat default highlight:** UI-SPEC says the spec's own family is highlighted on the stat question. The eligible list does not say which family is the spec's, and no copy exists for a highlight, so none is drawn. The class's top armour is tagged Your armour (highest class among the eligible needs). The owner can add a stat hint at 04-19 if wanted.
- **Step line before a slot is chosen:** reads `Question 1` (no total), because the number of applicable questions depends on the slot. After a slot it reads `Question n of m`. Armour-then-stat can still announce m as an upper bound when armour is open.
- **Extra flow props:** `showHeading`, `headingRef`, `onStepChange` and a `ref` handle (`goBack`) exist so the sheet can put the question in its dialog header and own the Back button while the flow keeps the step and history.
- **Slot tile reason text:** a blocked slot tile carries its reason as sr-only text beside the button (a 100px tile cannot show a sentence); the alert panel shows it on tap. Armour and stat rows print theirs under the row.
- **Label tables:** `needs.ts` does not export its display tables and is outside this plan's files, so the slot, armour and stat words are repeated in `need-questions.ts` with a test that joins them back into every `NEED_DEFINITIONS` name.
- **Sheet unmount delay:** 200ms for `placement="sheet"` (matches `duration-normal`), 150ms unchanged for the default.

## Authentication Gates

None.

## Issues Encountered

- `userEvent` waits on timers and hangs under `vi.useFakeTimers()`; the two fake-timer tests use `fireEvent`, noted in a comment.
- The accessible name of a tile came out as "TrinketBig" in jsdom because adjacent block spans have no whitespace; a whitespace text node between the label and cost keeps the name "Trinket Big" without changing layout (a flex container does not draw it).
- `.claude/CLAUDE.md` exists in this checkout (the 04-03 summary recorded it missing); conventions came from it, the plan and the UI-SPEC. The project design skills (impeccable, design-loop, gauntlet-loop) were not run: the UI-SPEC is the verified contract and this plan has no builder and critic loop.

## Known Stubs

None. Every component renders real data; the sheet is not reachable from any page until 04-11 mounts it (the plan's shipping note), which is by design and not a stub.

## Threat Flags

None. The flow makes no request and renders taxonomy words only. T-04-10-02 (Modal placement breaking existing dialogs) is mitigated by the exact default class assertions in `modal.test.tsx`; T-04-10-01 is accepted as planned, since the submit route repeats every rule (04-08).

## Next Phase Readiness

- 04-11 can mount `NeedQuestionSheet` and wire `optionState`; 04-20 supplies the refusal and status wording through the same prop.
- Owner items carried to 04-19: all copy in `NEED_QUESTION_TITLES`, the group labels, the Current, Your armour and In your 5 tags, the step line and the building sentence is DRAFT. The owner may also want to review the slot glyph choices (most weapon and trinket slots show the neutral target icon).
- Shipping: PR 2 (need primitives and score split). Not reachable from any page until 04-11, and it reads no table or column, so it can open before the 04-02 deploy.

## Self-Check: PASSED

All eight created or modified files exist, and commits 80f7d2c2, 6645244f, c3e1978a, d9613878, 2630ca16, 4acfb4dd and 0424c772 are on `work/forever-phase-04`.

---
phase: 04-discovery-lists-and-score-split
plan: 16
subsystem: ui
tags: [loot-style, presets, loot-settings, guild-creation, radix-radio-group, autosave, vitest]

requires:
  - phase: 04-discovery-lists-and-score-split
    provides: "04-06: LOOT_STYLE_PRESETS, applyLootStyle, presetDiff, lootStyleStatus and isLootStyleId"
  - phase: 04-discovery-lists-and-score-split
    provides: "04-15: PUT /api/guild-settings takes loot_style with the knobs in one update; POST /api/guilds takes loot_style and merges the preset knobs into the creation insert"
provides:
  - "LootStylePicker (variants settings and create): three preset cards in a RadioGroup, Custom and Customised states, the Replace your settings? confirm with the presetDiff count, load and load-error states"
  - "Loot system settings modal opens with a Loot style card; General, Attendance and Advanced sit behind a Fine-tune disclosure with aria-expanded and aria-controls"
  - "loot_style in LootSettingsContent state and the autosaved safeSettings object, plus a lootStyleLoad state with a Retry"
  - "CreateGuildModal Finalize settings step: presets with Reward attendance preselected, a read-only Fine-tune (What this sets), the footnote, a Summary line, and loot_style in the POST body"
affects: [04-19, 04-20]

actuals:
  tokens: 14400
  tasks: 3
  commits: 6

tech-stack:
  added: []
  patterns:
    - "A label is the card and wraps the shared RadioGroupItem, so the whole card is the hit area and the radio stays on the first line"
    - "A confirm is asked only when the preset would change at least one setting the officer set; presetDiff(...).length is both the gate and the {n}"
    - "Starting state of a disclosure is fixed once a load settles (render-time state adjustment), after that only the officer moves it"
    - "Collapsed disclosure uses the hidden attribute, not unmounting, so aria-controls always resolves and the controls keep their state"

key-files:
  created:
    - app/components/LootStylePicker.tsx
    - app/components/__tests__/LootStylePicker.test.tsx
    - app/components/__tests__/CreateGuildModal-loot-style.test.tsx
    - app/(app)/loot-management/components/__tests__/LootSettingsContent-loot-style.test.tsx
    - app/(app)/loot-management/components/__tests__/SettingsModal-loot-style.test.tsx
  modified:
    - app/(app)/loot-management/components/SettingsModal.tsx
    - app/(app)/loot-management/components/LootSettingsContent.tsx
    - app/components/CreateGuildModal.tsx

key-decisions:
  - "The confirm is skipped when presetDiff is empty, even with loot_style null: nothing would change, so 'will change 0 settings' would only confuse"
  - "While the settings row is loading or failed to load, the picker shows no status at all (no Custom row, nothing selected, cards disabled) because Custom would be a claim about a row we have not read"
  - "Retry loading it re-runs loadSettings (per the plan, not the UI-SPEC's loot-style-only reload); a successful retry also re-arms autosave, which stays off after a failed load so defaults cannot be written over the stored row"
  - "The creation step's Fine-tune is collapsed by default with the footnote always visible below it, so the two-tap path is unchanged and the reassurance is not hidden"
  - "Singular copy: '1 setting you set yourself' when exactly one setting changes (UI-SPEC string is plural only)"

patterns-established:
  - "No new reader of loot_items, loot_submission_items or loot_history, so the need-reader inventory is unchanged"

requirements-completed: []  # DISC-10 stays open: requirements.ready-ids reports 0/1 ready because a sibling plan that declares it has no SUMMARY yet

coverage:
  - id: D1
    description: "The settings modal opens with a Loot style card of three preset cards and every existing card sits inside a Fine-tune region controlled by a button with aria-expanded and aria-controls"
    requirement: DISC-10
    verification:
      - kind: unit
        ref: "app/(app)/loot-management/components/__tests__/SettingsModal-loot-style.test.tsx#puts the Loot style card first and the General, Attendance and Advanced cards inside the controlled region"
        status: pass
    human_judgment: false
  - id: D2
    description: "Fine-tune starts expanded for loot_style null, Customised and a load error, and collapsed when a preset matches; the starting state is decided once the load settles"
    requirement: DISC-10
    verification:
      - kind: unit
        ref: "app/(app)/loot-management/components/__tests__/SettingsModal-loot-style.test.tsx#SettingsModal Fine-tune disclosure"
        status: pass
    human_judgment: false
  - id: D3
    description: "Picking over matching knobs applies at once; picking over Custom or Customised knobs asks Replace your settings? with the presetDiff count and Keep my settings changes nothing (T-04-16-01)"
    requirement: DISC-10
    verification:
      - kind: unit
        ref: "app/components/__tests__/LootStylePicker.test.tsx#LootStylePicker (settings variant)"
        status: pass
    human_judgment: false
  - id: D4
    description: "loot_style is in state and safeSettings: one autosaved PUT carries the preset knobs and loot_style, and a later knob edit still carries the stored choice (T-04-16-02)"
    requirement: DISC-10
    verification:
      - kind: unit
        ref: "app/(app)/loot-management/components/__tests__/LootSettingsContent-loot-style.test.tsx#LootSettingsContent loot style autosave"
        status: pass
    human_judgment: false
  - id: D5
    description: "Loading disables the cards with nothing selected; a load error shows the alert with Retry loading it, saves nothing, and a retry restores the stored selection"
    requirement: DISC-10
    verification:
      - kind: unit
        ref: "app/components/__tests__/LootStylePicker.test.tsx#LootStylePicker load states"
        status: pass
      - kind: unit
        ref: "app/(app)/loot-management/components/__tests__/LootSettingsContent-loot-style.test.tsx#shows the load error, saves nothing, and Retry loading it loads the stored style"
        status: pass
    human_judgment: false
  - id: D6
    description: "Creation shows the three presets after Faction with Reward attendance preselected, the read-only Fine-tune list and footnote, the Summary line, and sends loot_style in POST /api/guilds with no settings PUT (T-04-16-03)"
    requirement: DISC-10
    verification:
      - kind: unit
        ref: "app/components/__tests__/CreateGuildModal-loot-style.test.tsx#CreateGuildModal loot style step"
        status: pass
    human_judgment: false
  - id: D7
    description: "The card layout reads right at 343px (radio staying on the first line when the line wraps) and at 768px and wider (three columns), and the preset cards, Customised badge row and Fine-tune button look right in light and dark"
    verification: []
    human_judgment: true
    rationale: "jsdom has no layout; the classes follow UI-SPEC surface 3 but nobody has looked at the rendered modal. Open Loot system settings and the Create a guild modal at 343px and 1024px before the PR."
  - id: D8
    description: "Every preset name, line, summary line, the section description, the Custom and Customised copy, the confirm text and the creation footnote read right to the owner"
    verification: []
    human_judgment: true
    rationale: "All of it is DRAFT for the owner's 04-19 sign-off; tests pin the strings, not whether they are the right strings. UI-09 (read-only Fine-tune in creation, collapsed by default) also needs the owner's confirmation."

duration: 22min
completed: 2026-11-11
status: complete
---

# Phase 4 Plan 16: Loot Style Picker Summary

**Three loot style preset cards in Loot system settings and guild creation, with the existing settings behind a Fine-tune disclosure and a confirm before any customised setting is replaced**

## Performance

- **Duration:** 22 min
- **Started:** 2026-11-11T06:37Z (approx, from the previous plan's close-out commit)
- **Completed:** 2026-11-11T06:59Z
- **Tasks:** 3
- **Files modified:** 8 (5 created, 3 modified)

## Accomplishments

- `LootStylePicker` renders the three presets as a RadioGroup of label-cards (name 16px 600, line 14px secondary, radio on the right, `min-h-[72px] p-4`, selected `border-accent bg-accent/5`). One column in creation and on a phone, three columns from 768px in settings.
- Custom (no preset recorded) shows an outline badge and "Your settings don't match a preset. Pick one to replace them." Customised (live knobs differ from the preset) shows a badge beside the name, "You changed some settings from this preset." and a ghost default-size "Reset to {preset name}". Both are computed through `lootStyleStatus`, never stored.
- Replacing settings an officer set is never silent: picking or resetting over Custom or Customised knobs opens "Replace your settings?" naming `presetDiff(...).length`. Keep my settings leaves the settings untouched. When nothing would change (matching knobs, or loot_style null with knobs that already equal the preset) it applies at once.
- `SettingsModal` opens with a "Loot style" card. General, Attendance and the existing Advanced disclosure moved, otherwise unchanged, into a region behind a "Fine-tune" button styled like the Advanced one. Fine-tune starts open for no preset, Customised, and a load error, and closed when a preset matches, so an existing guild sees today's settings until it picks one.
- `loot_style` joined `LootSettingsContent`'s state and `safeSettings`. A test drives the real page (mocked fetch): pick, confirm, wait out the 800 ms debounce, and assert one PUT carrying `loot_style` and all 20 knobs. A mutation check (removing `loot_style` from `safeSettings`) made it fail with "expected undefined to be 'officers_decide'".
- `lootStyleLoad` ('loading', 'ready', 'error') tracks the settings request: cards disabled and nothing selected while loading; on failure the alert "Couldn't load your loot style." with "Retry loading it" and "The settings below still work." Autosave stays off after a failed read (the existing `settingsLoadedRef` gate), and a test asserts no PUT is sent until Retry succeeds.
- `CreateGuildModal`'s Finalize settings step shows the presets after Faction with Reward attendance preselected, a collapsed read-only Fine-tune listing the preset's `summary` under "What this sets", the footnote "You can change this any time in Loot system settings.", a "Loot style: {name}" Summary line, and `loot_style` in the POST body. `/api/guild-settings` appears zero times in the file, and a test asserts no request to it.
- The tracer gate held: Task 1's verify and acceptance criteria were re-run after its GREEN commit and passed before Task 2 started.

## Task Commits

Each task was committed atomically (TDD: failing test, then implementation):

1. **Task 1: Tracer, an officer picks Even rotation (or Officers decide) and one autosaved PUT carries the knobs and loot_style** - `acc7b518` (test), `a1c9e516` (feat)
2. **Task 2: The Fine-tune disclosure and the loading and load-error states** - `e3a60245` (test), `b649c427` (feat)
3. **Task 3: The preset step in guild creation sends loot_style with POST /api/guilds** - `c54db0d1` (test), `58a98b99` (feat)

**Plan metadata:** recorded by the docs commit that follows this summary.

## Files Created/Modified

- `app/components/LootStylePicker.tsx` - the picker (settings and create variants), status row, confirm, load alert
- `app/components/__tests__/LootStylePicker.test.tsx` - 13 tests: match, apply at once, confirm with count and singular, Keep my settings, Custom, Customised and Reset, numeric strings, create variant, loading, load error
- `app/(app)/loot-management/components/SettingsModal.tsx` - Loot style card, Fine-tune button and region, `lootStyleLoad` and `onRetryLootStyleLoad` props
- `app/(app)/loot-management/components/LootSettingsContent.tsx` - `loot_style` in state and `safeSettings`, `lootStyleLoad` state set by `loadSettings`, props passed to the modal
- `app/(app)/loot-management/components/__tests__/SettingsModal-loot-style.test.tsx` - disclosure wiring, starting states, load and error states
- `app/(app)/loot-management/components/__tests__/LootSettingsContent-loot-style.test.tsx` - page-level autosave PUT body, later edit keeps loot_style, load error saves nothing and Retry recovers
- `app/components/CreateGuildModal.tsx` - lootStyle state, picker, read-only Fine-tune, footnote, Summary line, POST body field
- `app/components/__tests__/CreateGuildModal-loot-style.test.tsx` - walks the three steps and covers the block, list, Summary, POST body, default, and creation failure

## Decisions Made

- The confirm's gate and its `{n}` are the same number (`presetDiff(...).length > 0`), so a confirm never says "0 settings".
- No status is shown until the settings row has loaded: no Custom row, no selection, cards disabled. After a failed load the same applies, because Custom would assert something we did not read.
- Retry re-runs `loadSettings` as the plan says. It also re-arms autosave, which a failed load deliberately leaves off.
- The creation Fine-tune is collapsed by default and the footnote sits below it, always visible. This is the reading of UI-09 that keeps creation at two taps; the owner confirms it at 04-19.
- Copy is singular for one changed setting ("1 setting you set yourself").

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Plural-only confirm copy reads "1 settings"**
- **Found during:** Task 1
- **Issue:** The UI-SPEC string "will change {n} settings you set yourself" is wrong for n = 1, which a single moved knob produces.
- **Fix:** The picker says "setting" when n is 1 and "settings" otherwise; a test pins both.
- **Files modified:** `app/components/LootStylePicker.tsx`, `app/components/__tests__/LootStylePicker.test.tsx`
- **Commit:** `a1c9e516`

**2. [Rule 2 - Missing critical] No confirm and no claim when the preset would change nothing**
- **Found during:** Task 1
- **Issue:** Following the plan literally, a guild with loot_style null whose knobs already equal a preset would be asked "Replace your settings?" naming 0 settings.
- **Fix:** The confirm opens only when `presetDiff(...).length > 0`; otherwise the pick applies at once and records loot_style. The prohibition (never overwrite customised settings unasked) is untouched, since nothing is overwritten.
- **Files modified:** `app/components/LootStylePicker.tsx`
- **Commit:** `a1c9e516`

**3. [Rule 2 - Missing critical] Cards disabled and status hidden on a load error, and a PUT guard**
- **Found during:** Task 2
- **Issue:** The plan lists disabled cards for loading only. After a failed load the picker would otherwise show a Custom row for a row it never read and allow a pick that diffs against defaults.
- **Fix:** Cards are disabled and no status renders for both loading and error. Autosave was already off after a failed read; a test asserts no PUT is sent until a retry succeeds.
- **Files modified:** `app/components/LootStylePicker.tsx`, `app/(app)/loot-management/components/LootSettingsContent.tsx`
- **Commit:** `b649c427`

**4. [Rule 1 - Bug] A late failure must not read as a load error**
- **Found during:** Task 2
- **Issue:** `loadSettings` continues after the settings row is read (guild roles lookup); a throw there would have flipped `lootStyleLoad` to 'error' for a row that loaded.
- **Fix:** A local `settingsRead` flag; the catch sets 'error' only when the row was not read.
- **Files modified:** `app/(app)/loot-management/components/LootSettingsContent.tsx`
- **Commit:** `b649c427`

**Total deviations:** 4 auto-fixed (2 bugs, 2 missing critical). **Impact:** copy grammar and edge-case robustness only; every named behaviour and string is as planned.

## Authentication Gates

None.

## Issues Encountered

- The first run of the page-level test crashed the worker with out-of-memory: the mocked `useGuildContext` returned a fresh `activeGuild` object each render, and `LootSettingsContent` reloads whenever that identity changes. The mock now returns one stable object (commented in the test).
- The mutation check initially used BSD `sed -i` without a suffix and did nothing; it was redone with a short script and the file restored from a copy.
- `npm run lint` reports 0 errors and 375 warnings, the same count as before this plan; the warnings under `LootSettingsContent.tsx` are pre-existing unused-variable and hook-dependency warnings.

## Known Stubs

None. No placeholder values flow to rendering; all strings are real DRAFT copy tracked as D8.

## Threat Flags

None. No new endpoint, auth path, file access or schema change: the picker only sends values the 04-15 routes already validate. T-04-16-01 (silent overwrite) is mitigated by the presetDiff-gated confirm and tested; T-04-16-02 (loot_style dropped by autosave) by `loot_style` in state and `safeSettings`, tested on the PUT body, including a later edit; T-04-16-03 (creation marking the milestone) by sending the preset in the POST body and never calling the settings PUT, tested by asserting no `/api/guild-settings` request.

## Next Phase Readiness

- DISC-10 stays open. `requirements.ready-ids` reports 0/1 ready because a sibling plan declaring it has no SUMMARY yet.
- Owner items for 04-19: every preset name, line, summary line, the section description, Custom and Customised copy, confirm text and footnote are DRAFT; confirm UI-09 (read-only Fine-tune in creation, collapsed by default here) and UI-08.
- Before the PR: look at Loot system settings and the Create a guild modal at 343px and 1024px in light and dark (coverage D7).
- Shipping: PR 4 with 04-15.

## Self-Check: PASSED

- Files exist: `app/components/LootStylePicker.tsx` and the four test files created by this plan; the three modified files are in the diff
- Commits `acc7b518`, `a1c9e516`, `e3a60245`, `b649c427`, `c54db0d1` and `58a98b99` are on `work/forever-phase-04`
- `npx vitest run app/components "app/(app)/loot-management" lib/loot/__tests__/need-reader-inventory.test.ts domain/guild` passes (32 files, 370 tests); `npm run typecheck` is clean; `npm run lint` reports 0 errors
- Acceptance greps: `loot_style` appears twice in `LootSettingsContent.tsx` before the later edits (now more), `<LootStylePicker` once in `SettingsModal.tsx`, `presetDiff(` once in the picker, `aria-expanded` and `Fine-tune` in `SettingsModal.tsx`, `loot_style` in `CreateGuildModal.tsx`, and `/api/guild-settings` zero times there

## Post-wave gate fix

- 34e7f768 fix(04-16): the creation Fine-tune trigger copied SettingsModal's disclosure button verbatim, and its `hover:bg-background-elevated` matched the PRIM-01 hand-rolled card guard (SettingsModal carries the same trigger only because that file is on the guard's approved exclusion list). The hover token was dropped so the ghost button's own hover applies; the guard, both 04-16 test files, eslint and typecheck pass. Found by the wave 5 post-merge gate (full suite), which the plan-level test set does not cover. Visual check of the trigger hover is part of the owed 343px and 768px pass.

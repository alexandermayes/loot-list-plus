---
phase: 09-type-and-card-migration
plan: 07
subsystem: ui
tags: [typescript-compiler-api, jsx-ancestry, card-primitive, tailwind]

requires:
  - phase: 09-type-and-card-migration
    provides: "09-05's nested CardVariant contract (D-10/D-11) and card.test.tsx's variant assertions; 09-06's closed hand-rolled-card guard (zero-total)"
provides:
  - "scripts/codemods/nested-card-ancestry.mjs: a read-only JSX parent-chain check enumerating every Card rendered inside another Card, split into DIRECT/INDIRECT, resolving the Card import specifier before walking so a locally-named Card is never counted"
  - "A live, reconciled enumeration: 0 DIRECT, 8 INDIRECT hits (SettingsModal.tsx x7, DashboardContent.tsx x1) after DI-1's fix removed a 9th hit that was itself a regression, not a real card-in-card"
  - "The checkpoint's decision recorded verbatim: convert SettingsModal's 7 sites only; leave DashboardContent.tsx:2365 unconverted, routed forward by name; suppress the first-child divider in the primitive"
  - "SettingsModal.tsx's 7 sub-panel sites (lines 200, 219, 306, 760, 805, 907, 948) converted to variant=\"nested\", accepting the named loss of the border-border-strong emphasis token"
  - "components/ui/card.tsx's nested variant gains a first:border-t-0 modifier so the divider is suppressed in the primitive when nested is a first child, with a card.test.tsx assertion covering it"
  - "DI-1 (a live functional regression from 09-06's codemod: a real <form onSubmit> mis-converted to <Card onSubmit>, breaking the character-edit Save button) found and fixed during this plan's checkpoint prep, unrelated to this plan's own conversion decision"
affects: [09-08-evidence, 10-inset-surface-migration]

actuals:
  tokens: 5759
  tasks: 3
  commits: 6

tech-stack:
  added: []
  patterns:
    - "A checkpoint gate that surfaces a live functional regression during its own prep (DI-1) gets fixed inline as a Rule 1 deviation before the checkpoint is presented, and the checkpoint document is corrected to reflect the post-fix state rather than presenting a stale enumeration"
    - "A card-in-card conversion checkpoint separates a per-category rule (every DIRECT hit) from a per-site judgment (each INDIRECT hit gets its own before/after and disposition), because an intermediate JSX element's own visual weight determines whether an indirect ancestry hit is actually a double border"
    - "A first-child divider suppression baked into the primitive (first:border-t-0) costs nothing on sites where it doesn't apply yet, and is decided against the real enumerated site count rather than in the abstract, so a later phase migrating more sites onto the same variant inherits the edge case for free"

key-files:
  created:
    - scripts/codemods/nested-card-ancestry.mjs
  modified:
    - app/(app)/loot-management/components/SettingsModal.tsx
    - components/ui/card.tsx
    - components/ui/__tests__/card.test.tsx
    - app/(app)/characters/[id]/edit/_client.tsx
    - scripts/codemods/hand-rolled-cards.mjs
    - scripts/codemods/hand-rolled-card-pattern.json

key-decisions:
  - "Checkpoint decision (recorded verbatim from the user's answer): convert exactly SettingsModal.tsx's 7 INDIRECT sites (lines 200, 219, 306, 760, 805, 907, 948) to variant=\"nested\", accepting that nested has no border-border-strong equivalent -- those 7 sites lose that emphasis token, replaced by the standard border-border top divider. Leave DashboardContent.tsx:2365 (the 'Recently received' list-of-item-cards site) unconverted this plan, routed forward by name: it is a repeating .map() list-row pattern, not a single fixed sub-panel, and converting it would turn a stack of boxed rows into a divided list -- a bigger structural change than removing a second border, deserving its own explicit call rather than inheriting this plan's panel-conversion default."
  - "Checkpoint decision, item 5 (first-child divider policy): suppress it in the primitive. components/ui/card.tsx's nested variant class string gains a first:border-t-0 modifier, so no call site has to remember to turn off the divider when nested is the first child of its parent Card. None of today's 8 enumerated sites are first children, so this changes nothing about their current rendering; it exists so Phase 10's 12 inset-surface sites, migrating onto this same contract next, inherit the correct behavior by default."
  - "DI-1, found and fixed before this checkpoint's answer arrived (not part of the checkpoint's own decision): 09-06 Task 2's hand-rolled-cards.mjs codemod had renamed a real <form onSubmit={handleSubmit}> at app/(app)/characters/[id]/edit/_client.tsx:386 to <Card onSubmit={handleSubmit}>, which renders a plain div, so the type=\"submit\" Save button did nothing when clicked. Reverted to <form>, added 'form' to the codemod's interactive-intrinsic-tag denylist, and widened scanExclusions to 17 entries so the guard does not re-flag the restored form. This removed a 9th ancestry hit (characters/[id]/edit/_client.tsx:474) that only existed because of the regression; the corrected live count is 8, not 9."

patterns-established:
  - "Ancestry-check conversions distinguish DIRECT hits (a rule) from INDIRECT hits (a per-site judgment), and the checkpoint proposes a disposition per INDIRECT hit rather than converting the whole category by default."

requirements-completed: [PRIM-01]

coverage:
  - id: D1
    description: "scripts/codemods/nested-card-ancestry.mjs enumerates every Card rendered inside another Card via a real JSX parent-chain walk (not a regex), split into DIRECT/INDIRECT, writing nothing"
    requirement: PRIM-01
    verification:
      - kind: other
        ref: "node scripts/codemods/nested-card-ancestry.mjs app && node scripts/codemods/nested-card-ancestry.mjs components -- both exit 0, git status --porcelain app components empty after both runs"
        status: pass
    human_judgment: false
  - id: D2
    description: "The blocking checkpoint (Task 2) presented the enumerated list, the reconciliation, before/after per candidate, an INDIRECT-hit disposition table, and the first-child question, and the user's answer (convert SettingsModal only; suppress-first-child) is recorded verbatim in this SUMMARY's key-decisions"
    requirement: PRIM-01
    verification:
      - kind: other
        ref: "Verbatim user response recorded in key-decisions above, matching the <user_response> block in this continuation's own prompt exactly"
        status: pass
    human_judgment: true
    rationale: "A recorded go-ahead cannot be verified by an automated check; it is a transcript of what the user actually said, checked against the source message for fidelity."
  - id: D3
    description: "SettingsModal.tsx's 7 confirmed sites render variant=\"nested\" with border-border-strong removed and every padding/gap/layout class unchanged; DashboardContent.tsx:2365 is untouched and no other site gained the variant"
    requirement: PRIM-01
    verification:
      - kind: other
        ref: "node scripts/codemods/nested-card-ancestry.mjs app -- all 7 confirmed lines report variant=present; grep -rc 'variant=\"nested\"' app components lists only SettingsModal.tsx (7) and card.test.tsx (its own test assertions, 8); git diff shows only the className/variant swap, no text or spacing change"
        status: pass
    human_judgment: false
  - id: D4
    description: "components/ui/card.tsx's nested variant class string gains first:border-t-0; card.test.tsx asserts nested renders it and default does not"
    requirement: PRIM-01
    verification:
      - kind: unit
        ref: "npx vitest run components/ui/__tests__/card.test.tsx -- 6 tests pass, including the new first-child assertion"
        status: pass
    human_judgment: false
  - id: D5
    description: "Full gate green after the conversion: hand-rolled-cards.test.ts and arbitrary-text-sizes.test.ts both still pass with no ceiling constant reintroduced, full test suite green, typecheck and lint clean at the pre-existing 397-warning/0-error baseline"
    requirement: PRIM-01
    verification:
      - kind: unit
        ref: "npx vitest run components/ui/__tests__/card.test.tsx __tests__/hand-rolled-cards.test.ts __tests__/arbitrary-text-sizes.test.ts (10 tests pass); npm run test (67 files / 1199 tests pass); npm run typecheck (exit 0); npm run lint (0 errors, 397 warnings, unchanged baseline)"
        status: pass
    human_judgment: false
  - id: D6
    description: "Visual/functional human-check of the converted SettingsModal panels and the DashboardContent site left unconverted is deferred to end-of-phase UAT, per this workstream's D-17 fallback (no authenticated screenshot baseline exists for these screens)"
    verification: []
    human_judgment: true
    rationale: "The plan's own <human-check> asks for a live browser comparison against a committed before/after baseline at both widths and themes; no such baseline exists for guild-settings/loot-management (WINDOWS.md entry 10, D-17 Home-only fallback), so this is deferred to the phase's end-of-phase UAT walkthrough rather than fabricated here."

duration: 25min
completed: 2026-09-19
status: complete
---

# Phase 09 Plan 07: Cards-in-Cards Ancestry Enumeration and Conversion Summary

**A JSX parent-chain ancestry check enumerated every Card-inside-Card in the tree (8 live hits, all INDIRECT), a blocking checkpoint resolved which to convert, and SettingsModal's 7 confirmed sub-panels now render `variant="nested"` with a first-child divider suppression baked into the primitive for Phase 10.**

## Performance

- **Duration:** 25 min (this continuation session; Task 1 and checkpoint prep ran in a prior session -- see below)
- **Started:** 2026-09-19T21:44:00Z (approx, per STATE.md session continuity)
- **Completed:** 2026-09-19T21:51:00Z
- **Tasks:** 3 of 3 completed (Task 1 committed in a prior session; Task 2 checkpoint answered and Task 3 converted in this continuation)
- **Files modified:** 6 across the plan's full arc (3 in this continuation's Task 3 commit: SettingsModal.tsx, card.tsx, card.test.tsx; 3 more from the DI-1 deviation fixed during checkpoint prep: characters/[id]/edit/_client.tsx, hand-rolled-cards.mjs, hand-rolled-card-pattern.json)

## Accomplishments
- Built `scripts/codemods/nested-card-ancestry.mjs`, a read-only JSX parent-chain ancestry check that resolves the `Card` import specifier before walking, splits DIRECT from INDIRECT hits, and produces a stable, byte-identical report across runs
- Found and fixed DI-1, a live functional regression from a prior plan's codemod (a real `<form onSubmit>` mis-converted to `<Card onSubmit>`, silently breaking a Save button), discovered while reconciling the ancestry script's output
- Presented and resolved the plan's single blocking checkpoint: converted SettingsModal.tsx's 7 sub-panel sites to `variant="nested"`, left DashboardContent.tsx's list-of-item-cards site unconverted and routed forward by name, and decided the first-child divider question in the primitive's favor
- Extended `components/ui/card.tsx`'s `nested` variant with a `first:border-t-0` modifier and covered it with a new `card.test.tsx` assertion

## Task Commits

Each task was committed atomically:

1. **Task 1: Build the JSX parent-chain ancestry check and enumerate every card-in-card** - `f1a5dfe6` (feat) -- prior session
2. **Task 2: BLOCKING GATE - card-in-card conversion list and the first-child divider question** - no code commit (decision recorded in this SUMMARY per this workstream's checkpoint-recording convention); checkpoint document corrected at `9604f3bc` (docs) after the DI-1 fix at `e002f947` (fix) and the ledger repair at `8789e391` (fix) -- prior session
3. **Task 3: Convert the confirmed sites to variant="nested"** - `dd1ac252` (feat) -- this continuation

**Plan metadata:** (this commit, immediately following)

## Files Created/Modified
- `scripts/codemods/nested-card-ancestry.mjs` - Read-only JSX parent-chain ancestry check (Task 1)
- `app/(app)/loot-management/components/SettingsModal.tsx` - 7 sites converted to `variant="nested"`, `border-border-strong` removed, padding unchanged (Task 3)
- `components/ui/card.tsx` - `nested` variant gains `first:border-t-0` (Task 3)
- `components/ui/__tests__/card.test.tsx` - New assertion covering the first-child modifier (Task 3)
- `app/(app)/characters/[id]/edit/_client.tsx` - DI-1 fix: reverted `<Card onSubmit>` to `<form onSubmit>` (deviation, prior session)
- `scripts/codemods/hand-rolled-cards.mjs` - DI-1 fix: `form` added to the interactive-intrinsic-tag denylist (deviation, prior session)
- `scripts/codemods/hand-rolled-card-pattern.json` - DI-1 fix: `scanExclusions` widened to 17 entries (deviation, prior session)

## Decisions Made

See `key-decisions` in the frontmatter above for the verbatim checkpoint answer (conversion scope and first-child policy) and DI-1's fix.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] DI-1: reverted a codemod-introduced `<form>`-to-`<Card>` mis-conversion that broke a Save button**
- **Found during:** Checkpoint preparation for Task 2 (reconciling the ancestry script's output against the three named screens)
- **Issue:** 09-06 Task 2's `hand-rolled-cards.mjs` codemod had renamed `app/(app)/characters/[id]/edit/_client.tsx:386`'s real `<form onSubmit={handleSubmit}>` to `<Card onSubmit={handleSubmit}>`. `Card` renders a plain `<div>`, which never fires a `submit` event, so the page's "Save changes" button (a bare `type="submit"` with no `onClick`) silently did nothing.
- **Fix:** Reverted the element to `<form>` with its original surface classes; added `form` to `hand-rolled-cards.mjs`'s interactive-intrinsic-tag denylist so a future run cannot reintroduce this; widened `hand-rolled-card-pattern.json`'s `scanExclusions` to 17 entries so the guard does not re-flag the restored form.
- **Files modified:** `app/(app)/characters/[id]/edit/_client.tsx`, `scripts/codemods/hand-rolled-cards.mjs`, `scripts/codemods/hand-rolled-card-pattern.json`
- **Verification:** Full suite (67 files / 1199 tests), typecheck and lint all green after the fix; the ancestry script's live count dropped from 9 to 8 hits, removing exactly the one hit that existed only because of this regression.
- **Committed in:** `e002f947` (fix, prior session)

---

**Total deviations:** 1 auto-fixed (1 bug, Rule 1)
**Impact on plan:** Necessary correctness fix, unrelated to this plan's own card-in-card conversion decision. No scope creep: it did not change which sites this plan's checkpoint proposed or confirmed for conversion.

## Issues Encountered
None beyond DI-1 above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 10 inherits the `nested` contract exactly as this plan left it, including the first-child suppression now baked into the primitive, so its 12 `bg-background-inset` sites migrate without rediscovering the first-child edge case.
- `DashboardContent.tsx:2365` (the "Recently received" list-of-item-cards site) is named here as carried forward, not scheduled to any phase; it needs its own conversion decision if and when the workstream returns to it, since converting a repeating list pattern is a bigger structural call than the single-fixed-panel case this plan resolved.
- The visual/functional human-check of the 7 converted SettingsModal panels (both themes, both widths) is deferred to Phase 09's end-of-phase UAT walkthrough, per the D-17 Home-only baseline fallback already recorded at `.planning/WINDOWS.md` entry 10 -- no new ledger entry needed, this plan's conversion is additional scope on top of that same, already-open gap.

---
*Phase: 09-type-and-card-migration*
*Completed: 2026-09-19*

## Self-Check: PASSED

All created/modified files verified present on disk; all cited commit hashes (`f1a5dfe6`, `e002f947`, `8789e391`, `9604f3bc`, `dd1ac252`) verified present in git history.

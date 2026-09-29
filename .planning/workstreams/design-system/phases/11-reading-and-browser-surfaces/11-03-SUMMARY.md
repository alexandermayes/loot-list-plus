---
phase: 11-reading-and-browser-surfaces
plan: 03
subsystem: ui
tags: [css, tailwind, scrollbar, selection, caret, vitest, presence-guard]

requires:
  - phase: 11-01
    provides: the blocking-human gate's Section 2 (.sidebar-scrollable disposition -- delete) and Section 3 (::selection alpha -- 0.3, no foreground override) answers this plan implements
provides:
  - "::selection themed from --accent at 0.3 alpha, no foreground override, in app/globals.css @layer base"
  - "caret-color: hsl(var(--accent)) added to the existing html rule in @layer base"
  - "A universal scrollbar rule set (Firefox scrollbar-width/scrollbar-color, webkit track/thumb/thumb-hover, width+height) themed from --border/--border-strong, reaching every scrollable region in the app, not only the sidebar"
  - "The five now-redundant .sidebar-scrollable rules deleted per the gate's Section 2 answer; the sidebar-scrollable className left as an inert marker"
  - "__tests__/browser-surface-theming.test.ts, this repo's first presence-direction guard"
affects: [11-05-after-capture-and-evidence]

actuals:
  tokens: 1788
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Presence-direction guard: matchesIn/sourceFiles reused with an inverted assertion (toBeGreaterThan(0) instead of toHaveLength(0)) to prove a CSS rule exists and resolves against a named token, rather than proving a pattern is absent -- this repo's first guard built this direction"

key-files:
  created:
    - __tests__/browser-surface-theming.test.ts
  modified:
    - app/globals.css

key-decisions:
  - "Selection alpha: 0.3 (hsl(var(--accent) / 0.3)), no explicit foreground override -- per 11-01 gate Section 3, no override from that recorded answer"
  - "Sidebar-scrollable disposition: deleted all five .sidebar-scrollable rules, left the sidebar-scrollable className on its element as an inert marker -- per 11-01 gate Section 2"
  - "Universal scrollbar rule adds height alongside width on the webkit pseudo-element (a real addition beyond the sidebar's prior vertical-only rule), because D-06 explicitly puts horizontally-scrolling tables in scope"

patterns-established:
  - "Presence-direction guard (inverted matchesIn assertion): see tech-stack.patterns above"

requirements-completed: []

coverage:
  - id: D1
    description: "::selection themed from --accent at 0.3 alpha with no foreground override, and caret-color set to the bare accent token on the existing html rule"
    requirement: "SURF-01"
    verification:
      - kind: unit
        ref: "__tests__/browser-surface-theming.test.ts#themes ::selection from --accent with a slash-alpha background expression"
        status: pass
      - kind: unit
        ref: "__tests__/browser-surface-theming.test.ts#sets caret-color to the bare accent token (no alpha) on html"
        status: pass
      - kind: other
        ref: "node -e rendered-CSS proof in 11-03-PLAN.md Task 1 <verify><automated> (Tailwind compile of app/globals.css emits both rules)"
        status: pass
    human_judgment: true
    rationale: "The plan's own <verify><human-check> requires a human to open a running dev server, select text on a public and an app page in both themes, and confirm the wash reads as the brand accent with legible selected text, and confirm the caret is accent-coloured in both themes. This executor has no way to render a browser and make that visual-legibility judgment; it is deferred to 11-05's screenshot gate per this plan's own <output> instruction."
  - id: D2
    description: "A universal scrollbar rule set inside @layer base themes every scrollable region (main content, modals, dropdowns, horizontally-scrolling tables) using the sidebar's exact prior values plus a height declaration for horizontal scroll; the five redundant .sidebar-scrollable rules were deleted per the gate's Section 2 answer"
    requirement: "SURF-01"
    verification:
      - kind: unit
        ref: "__tests__/browser-surface-theming.test.ts#themes the universal scrollbar rule from --border and --border-strong"
        status: pass
      - kind: other
        ref: "node -e rendered-CSS proof in 11-03-PLAN.md Task 2 <verify><automated> (Tailwind compile emits all five universal scrollbar rules); sidebar-scrollable count = 0 confirmed by grep"
        status: pass
    human_judgment: true
    rationale: "The plan's own <verify><human-check> requires a human to scroll main content, a modal, a dropdown and a horizontally-scrolling table (master-sheet or attendance) in both themes and confirm the thumb darkens on hover and the horizontal scrollbar is visibly correct -- a rendering/appearance judgment this executor cannot make without a browser. Deferred to 11-05's screenshot gate."
  - id: D3
    description: "__tests__/browser-surface-theming.test.ts stood up as this repo's first presence-direction guard, proven non-vacuous via a fail-first run with the missing rule named, then restored to green"
    requirement: "SURF-01"
    verification:
      - kind: unit
        ref: "npx vitest run __tests__/browser-surface-theming.test.ts (4/4 tests pass)"
        status: pass
      - kind: other
        ref: "Fail-first proof: ::selection rule temporarily removed, guard failed exactly that assertion (see Fail-First Proof section below), file restored byte-identical (git diff --stat -- app/globals.css returned no output)"
        status: pass
    human_judgment: false

duration: 24min
completed: 2026-09-21
status: complete
---

# Phase 11 Plan 03: Browser Surface Theming (SURF-01) Summary

**Text selection, the caret and every content-area scrollbar (not just the sidebar) now theme from --accent/--border/--border-strong via three new rules in app/globals.css's @layer base, guarded by this repo's first presence-direction test.**

## Performance

- **Duration:** ~24 min across two sessions (Tasks 1-2 executed and committed in a prior session terminated by a transient infrastructure connection error; this continuation session verified Tasks 1-2, then executed and committed Task 3)
- **Started:** 2026-09-21T22:52:24Z (Task 1 commit)
- **Completed:** 2026-09-21T23:11:19Z (Task 3 commit)
- **Tasks:** 3 (all `type="auto"`)
- **Files modified:** 2 (`app/globals.css`, `__tests__/browser-surface-theming.test.ts`)

## Accomplishments

- `::selection` themed from `hsl(var(--accent) / 0.3)` with no foreground override, and `caret-color: hsl(var(--accent))` added to the existing `html` rule -- both non-class selectors, so both are always emitted regardless of Tailwind's content-based tree-shaking
- A universal scrollbar rule set (five rules: Firefox `scrollbar-width`/`scrollbar-color`, webkit track/thumb/thumb-hover, width+height sizing) added to `@layer base`, reaching every scrollable region app-wide -- main content, modals, dropdowns, horizontally-scrolling tables -- not only the sidebar
- The five now-redundant `.sidebar-scrollable` rules deleted per the 11-01 gate's Section 2 answer; the `sidebar-scrollable` className left untouched on its element as an inert marker
- `__tests__/browser-surface-theming.test.ts` stood up as this repo's first presence-direction guard, reusing the shared `matchesIn`/`sourceFiles` primitives with an inverted assertion direction, proven non-vacuous via a fail-first run

## Task Commits

Each task was committed atomically:

1. **Task 1: Theme text selection and the caret from the accent token** - `3cf2e5f2` (feat) -- completed in the prior (interrupted) session
2. **Task 2: Generalize the sidebar's scrollbar treatment to every scrollable region** - `37a5b0d3` (feat) -- completed in the prior (interrupted) session
3. **Task 3: Stand up the SURF-01 presence guard and prove it fails without the rules** - `894be786` (test) -- executed in this continuation session

**Plan metadata:** (this SUMMARY's own commit, made immediately after this file)

## Files Created/Modified

- `app/globals.css` - Added `::selection` (accent, 0.3 alpha, no foreground), extended the existing `html` rule with `caret-color`, added the five-rule universal scrollbar set, deleted the five `.sidebar-scrollable` rules
- `__tests__/browser-surface-theming.test.ts` - New presence-direction guard: asserts the selection rule, caret declaration and universal scrollbar rule each exist and resolve against `--accent`/`--border`/`--border-strong`, plus the shared fail-loud-on-missing-path defensive test

## Selection Alpha and Sidebar Disposition (per plan's `<output>` instructions)

**Selection alpha used:** `0.3` -- `hsl(var(--accent) / 0.3)`, exactly UI-SPEC's locked value. 11-01's gate Section 3 confirmed this value with no override ("Confirmed 0.3 -- `hsl(var(--accent) / 0.3)` with no explicit foreground/`color` override, as UI-SPEC already locked" -- `11-01-SUMMARY.md`). No foreground/`color` declaration was added.

**Sidebar-rule disposition:** Deleted. 11-01's gate Section 2 recorded: "Delete the five now-redundant `.sidebar-scrollable` rules once 11-03 lands the universal scrollbar rule; leave the `sidebar-scrollable` className on its element as an inert marker." `grep -c '\.sidebar-scrollable' app/globals.css` on the current tree returns `0`, confirming the deletion; the className itself was not chased down in any component file, per the plan's explicit instruction not to touch call-site files this plan does not own.

## Fail-First Proof (Task 3, recorded verbatim)

The `::selection` rule was temporarily removed from `app/globals.css` (a scripted, verified single-block removal, not a manual edit), the guard was re-run, and the corresponding assertion failed while the other three stayed green:

```
❯ __tests__/browser-surface-theming.test.ts (4 tests | 1 failed)
  × themes ::selection from --accent with a slash-alpha background expression

FAIL __tests__/browser-surface-theming.test.ts > browser surface theming (SURF-01) > themes ::selection from --accent with a slash-alpha background expression
AssertionError: expected a ::selection rule in app/globals.css: expected 0 to be greater than 0

 Test Files  1 failed (1)
      Tests  1 failed | 3 passed (4)
```

The file was then restored from a pre-edit backup. `git diff --stat -- app/globals.css` returned no output afterward, confirming a byte-identical restoration to the committed state before Task 3's commit was made. Re-running the guard afterward showed 4/4 green again.

## Decisions Made

See "Selection Alpha and Sidebar Disposition" above -- both were 11-01 gate answers this plan implemented, not new decisions made during this plan's own execution. No additional implementation decisions were needed beyond the plan's own `<action>` text for Task 3 (the presence-guard's exact regex patterns were composed from the plan's own assertion descriptions and the `11-PATTERNS.md`/`11-RESEARCH.md` sketches, which is normal task execution, not a deviation).

## Deviations from Plan

None - plan executed exactly as written across all three tasks.

## Issues Encountered

**Prior session terminated by infrastructure error, not an implementation problem.** The executor session that completed and committed Tasks 1 and 2 (`3cf2e5f2`, `37a5b0d3`) was cut off by a transient API connection error partway through the plan -- not by any task failure, bad implementation, or verification gap. This continuation agent independently re-verified both prior tasks against their own `<acceptance_criteria>` and `<verify>` blocks before proceeding (all criteria re-run and passing: `::selection` count 1, `caret-color` count 1 resolving to the bare accent token, `html` rule count unchanged at 1, zero new tokens introduced across the full plan diff, zero `focus-visible` lines touched, the rendered-CSS proof via a live Tailwind compile emitting all eight SURF-01 rules, `sidebar-scrollable` count 0 matching the gate's recorded answer, `npm run typecheck` exit 0, `npm run lint` zero errors, and the full Vitest suite green at 1223/1223 before Task 3 was added). No gap was found; both tasks were genuinely complete and correct, not merely committed. This is recorded here for an honest record, not as a deviation requiring a fix.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- SURF-01's three rules and its presence guard are complete, live-verified, and committed; the full test suite is green at 1227/1227 (1223 pre-existing + 4 new)
- **SURF-01 requirement is not yet marked complete.** `11-01`, `11-03` (this plan) and `11-05` all declare `SURF-01` in their frontmatter; `11-05` has not yet produced a `*-SUMMARY.md`. Per the shared-ID gate (`requirements.ready-ids`), the requirement stays `blocked` until `11-05` finishes -- this plan does not mark it, consistent with `gsd-tools query requirements.ready-ids` returning `{"ready": [], "blocked": ["SURF-01"]}` when checked against this plan.
- The human-judgment visual checks this plan's own `<verify><human-check>` calls for (selection legibility in both themes, caret visibility, every scrollable region including a horizontally-scrolling table, in light and dark) were not performed in this non-interactive execution and are explicitly deferred to 11-05's screenshot gate, per this plan's `<output>` instruction and per the `human_judgment: true` coverage entries above
- 11-05 can proceed: the `.prose-measure` migration (11-02), the SURF-01 rules (this plan) and the pending `[data-score]` deletion (11-04) are the full set of CSS changes 11-05's after-capture needs to diff against the `pre-phase-11` baseline

## Self-Check: PASSED

- `app/globals.css` contains exactly one `::selection` rule: FOUND (`grep -c '::selection'` = 1)
- `app/globals.css` contains exactly one `caret-color` declaration resolving to `hsl(var(--accent))`: FOUND
- `app/globals.css` contains the five universal scrollbar rules resolving against `--border`/`--border-strong`: FOUND (confirmed via live Tailwind compile emitting all five)
- `app/globals.css` contains zero `.sidebar-scrollable` rules: FOUND (`grep -c '\.sidebar-scrollable'` = 0)
- `__tests__/browser-surface-theming.test.ts` exists and passes 4/4: FOUND
- Commit `3cf2e5f2` (Task 1): FOUND in `git log --oneline --all`
- Commit `37a5b0d3` (Task 2): FOUND in `git log --oneline --all`
- Commit `894be786` (Task 3): FOUND in `git log --oneline --all`
- `git diff --name-only HEAD~1 HEAD` from Task 3's commit lists exactly `__tests__/browser-surface-theming.test.ts`: CONFIRMED
- Full suite `npx vitest run --maxWorkers=2`: 75 files, 1227/1227 tests passing, zero regressions from the pre-Task-3 baseline of 1223

---
*Phase: 11-reading-and-browser-surfaces*
*Completed: 2026-09-21*

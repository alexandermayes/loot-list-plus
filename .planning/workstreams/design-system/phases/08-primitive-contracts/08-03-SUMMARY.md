---
phase: 08-primitive-contracts
plan: 03
subsystem: ui
tags: [tailwind, focus-visible, accessibility, contrast, design-tokens, cva]

# Dependency graph
requires:
  - phase: 08-primitive-contracts
    provides: "08-01's blocking GO-AHEAD checkpoint clearance; 08-02's Modal accessibility tracer establishing the phase's edit pattern"
provides:
  - "Input, Textarea and Select all carry the same keyboard-only focus-visible ring Button/Switch/Checkbox/Radio already ship"
  - "A third, additive PRIM03_RING_ROWS table in report.ts making the --ring contrast claim reproducible from a committed script"
affects: [08-04, 08-05, 08-06, phase-09-primitive-density]

# Actuals (#2632)
actuals:
  tokens: 1168
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Additive report.ts tables (ROWS -> D11_EXTRA_ROWS -> PRIM03_RING_ROWS): each new contrast concern gets its own parallel Row[]/print function rather than editing an existing table, so no prior commit-body citation of row order ever drifts."
    - "Stacked focus treatment: focus:border-accent (fires on every focus) plus focus-visible:ring-* (keyboard-only) coexist in the same class string rather than one replacing the other."

key-files:
  created: []
  modified:
    - components/ui/input.tsx
    - components/ui/textarea.tsx
    - components/ui/select.tsx
    - __tests__/design-tokens/report.ts

key-decisions:
  - "Copied the OI-2-corrected four-utility focus-visible ring string (ring-2, ring-ring, ring-offset-2, ring-offset-background) verbatim from Button/Switch/Checkbox/RadioGroup onto Input/Textarea/Select, not the three-utility string D-06 originally abbreviated."
  - "Left focus:outline-none unchanged on all three primitives (did not force focus-visible:outline-none parity with Button) per D-07's minimal-diff choice."
  - "Recorded the light-mode --ring shortfall against --background (2.913) and --background-subtle (2.726) as an accepted, pre-existing characteristic per OI-3, not silently fixed in this plan."

requirements-completed: [PRIM-03]

coverage:
  - id: D1
    description: "Input, Textarea and Select each carry the corrected four-utility focus-visible ring stacked on their existing focus:border-accent treatment"
    requirement: "PRIM-03"
    verification:
      - kind: unit
        ref: "grep -c 'focus:border-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background' components/ui/{input,textarea,select}.tsx"
        status: pass
      - kind: unit
        ref: "npm run typecheck"
        status: pass
      - kind: unit
        ref: "npm run lint"
        status: pass
      - kind: integration
        ref: "npm run test (full suite, 1182 tests)"
        status: pass
    human_judgment: true
    rationale: "A grep/typecheck/lint/test pass proves the class string is present and nothing broke, but whether the ring is actually visible and correctly scoped to keyboard-only focus (not mouse click) in the real browser is a visual/interaction judgment. The plan's own <verification> explicitly defers this manual keyboard Tab walk to the phase-level checkpoint per 08-VALIDATION.md's Manual-Only Verifications, so it is not re-asserted here as automated."
  - id: D2
    description: "report.ts prints a reproducible, committed record of the --ring contrast numbers (including the accepted light-mode shortfall) via a new, additive PRIM03_RING_ROWS table"
    requirement: "PRIM-03"
    verification:
      - kind: unit
        ref: "npx tsx __tests__/design-tokens/report.ts (stdout: 3 rows starting '| focus ring vs ', values matching 08-DECISIONS.md's measured 7.984/2.913, 7.753/2.726, 6.530/3.093)"
        status: pass
    human_judgment: false

# Metrics
duration: 12min
completed: 2026-09-17
status: complete
---

# Phase 08 Plan 03: Input/Textarea/Select Focus-Visible Ring Summary

**Input, Textarea and Select gained the same OI-2-corrected keyboard-only focus-visible ring Button/Switch/Checkbox/Radio already carry, and report.ts now prints a reproducible, committed --ring contrast table matching 08-DECISIONS.md's measured numbers exactly.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-09-17T20:38:00Z (approx.)
- **Completed:** 2026-09-17T20:44:29Z
- **Tasks:** 2 completed
- **Files modified:** 4

## Accomplishments
- `components/ui/input.tsx`'s `inputVariants` base string now carries `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background` stacked immediately after `focus:outline-none focus:border-accent` — a pure append, `focus:outline-none` untouched.
- `components/ui/textarea.tsx` and `components/ui/select.tsx` received the byte-identical suffix, verified with a direct diff against `input.tsx`'s class string.
- `__tests__/design-tokens/report.ts` gained a third, additive table (`PRIM03_RING_ROWS` / `printPrim03Report()`) mirroring the existing `ROWS`/`D11_EXTRA_ROWS` pattern — the primary `ROWS` array and `D11_EXTRA_ROWS` were not touched.
- Ran the report script: printed numbers (dark 7.984/7.753/6.530, light 2.913/2.726/3.093) match 08-DECISIONS.md's re-measured values exactly, confirming the evidence script is now the reproducible source of truth for this claim.

## Task Commits

Each task was committed atomically:

1. **Task 1 (tracer): Corrected focus-visible ring on Input, plus the report.ts evidence rows** - `ded52a58` (feat)
2. **Task 2: Apply the identical corrected ring class to Textarea and Select** - `83e5c840` (feat)

**Plan metadata:** committed via `docs(08-03)` (this SUMMARY + STATE/ROADMAP/REQUIREMENTS update)

## Files Created/Modified
- `components/ui/input.tsx` - Base cva string gains the four-utility focus-visible ring suffix on line 23
- `components/ui/textarea.tsx` - Identical suffix applied to `textareaVariants`'s base string
- `components/ui/select.tsx` - Identical suffix applied to `selectVariants`'s base string
- `__tests__/design-tokens/report.ts` - New `PRIM03_RING_ROWS` constant and `printPrim03Report()` function, called after the existing two report functions

## Decisions Made
- Used the OI-2-corrected four-utility string (`ring-2`, `ring-ring`, `ring-offset-2`, `ring-offset-background`), not D-06's abbreviated three-utility draft.
- Kept `focus:outline-none` unchanged on all three primitives per D-07's minimal-diff choice — no forced parity with Button's `focus-visible:outline-none`.
- Documented the light-mode `--ring` contrast shortfall (page 2.913, modal surface 2.726, both below 3.0) as an accepted, pre-existing gap per OI-3 rather than attempting a token fix in this plan.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

One `app/components/__tests__/LoginPage.test.tsx` test ("renders the approved H1") timed out on the first full-suite `npm run test` run. `LoginPage.tsx` does not import `Input`, `Textarea`, or `Select` (confirmed via grep), so this failure could not be caused by this plan's changes. Re-ran the isolated test file (5/5 passed) and the full suite again (62 files / 1182 tests, all passed) — confirmed as a pre-existing flaky timeout under parallel-suite load, not a regression from this plan. No fix applied (out of scope per SCOPE BOUNDARY: pre-existing, unrelated-file flakiness).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- PRIM-03 is fully satisfied for the Input/Textarea/Select file set; all five focusable primitives in this phase (Button, Switch, Checkbox, Radio, and now Input/Textarea/Select) share the identical keyboard-only focus-visible ring.
- The manual keyboard Tab walk (visible ring on focus, absent on mouse click, both light/dark) remains deferred to the phase-level checkpoint per 08-VALIDATION.md, as the plan's own `<verification>` specifies.
- The light-mode `--ring` contrast shortfall against `--background` and `--background-subtle` is now committed evidence (not just a quoted number) and is available as a named finding for a future phase's token work.
- Ready for 08-04.

## Self-Check: PASSED

- `[ -f components/ui/input.tsx ]` -> FOUND
- `[ -f components/ui/textarea.tsx ]` -> FOUND
- `[ -f components/ui/select.tsx ]` -> FOUND
- `[ -f __tests__/design-tokens/report.ts ]` -> FOUND
- `git log --oneline --all | grep -q ded52a58` -> FOUND
- `git log --oneline --all | grep -q 83e5c840` -> FOUND
- All task `<acceptance_criteria>` re-verified: PASS
- Plan-level `<verification>` re-run: PASS (ring class present in all 3 files at count 1; report.ts prints exactly the 3 expected rows with values matching 08-DECISIONS.md; lint/typecheck/test all exit 0)

---
*Phase: 08-primitive-contracts*
*Completed: 2026-09-17*

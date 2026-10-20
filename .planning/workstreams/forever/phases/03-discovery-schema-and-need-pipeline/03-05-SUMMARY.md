---
phase: 03-discovery-schema-and-need-pipeline
plan: 05
subsystem: ui
tags: [react, vitest, need-rows, wowhead, itemlink, logging, discovery]
status: complete

requires:
  - phase: 03-discovery-schema-and-need-pipeline
    provides: plans 03-03 and 03-04 need taxonomy and pure need branches (no database column read here)
provides:
  - NeedLabel and NeedLabelProps in app/components/NeedLabel.tsx (neutral label for a need row, D-13)
  - ItemLink as a hooks-free wrapper with wowheadId widened to number | null, delegating to NeedLabel or the module-private WowheadItemLink
  - NeedSkipScope, NeedReaderName, createNeedSkipScope and noteNeedSkipped in lib/loot/need-skip.ts (warn once per request, D-16)
affects: [03-07, 03-10, 03-11, 03-12, 03-13, phase-04]

actuals:
  tokens: 3500
  tasks: 2
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Hooks cannot sit behind an early return, so a guard on a hooks component lives in a hooks-free memo wrapper and the old body moves unchanged into an inner component"
    - "Log helpers pass a module-constant message as the first console argument and request-scoped values only as data (CodeQL tainted format string)"

key-files:
  created:
    - app/components/NeedLabel.tsx
    - app/components/__tests__/NeedLabel.test.tsx
    - app/components/__tests__/ItemLink.render.test.tsx
    - lib/loot/need-skip.ts
    - lib/loot/__tests__/need-skip.test.ts
  modified:
    - app/components/ItemLink.tsx

key-decisions:
  - "NeedLabel uses text-foreground for the name and text-muted-foreground for the Target02Icon, never QUALITY_COLORS.epic, so a need never looks like a Wowhead item; its look goes to the owner with the Phase 4 copy review (Oct 26)"
  - "ItemLink forwards showIcon to NeedLabel as well as name, className and onClick, so a call site that hides icons also hides the need icon"
  - "noteNeedSkipped logs the running total at the time of the first warning; later skips only raise scope.skipped, so a reader that wants the final count reads the scope"
  - "A count that is not a positive integer (0, negatives, 1.5, NaN, Infinity) is ignored and does not use up the one warning"

patterns-established:
  - "One ItemLink guard covers all 43 call sites in 21 files; no call site changed and npm run typecheck stays clean"

requirements-completed: [DISC-06]

coverage:
  - id: D1
    description: "NeedLabel renders the need name with a neutral icon, no anchor, no href, no data-wowhead and no Wowhead text; with an onClick it renders a button that calls the handler once"
    requirement: DISC-06
    verification:
      - kind: unit
        ref: "app/components/__tests__/NeedLabel.test.tsx"
        status: pass
    human_judgment: false
  - id: D2
    description: "ItemLink with a null or undefined wowheadId renders a need label (click kept), and a numeric wowheadId renders the same Wowhead anchor as before (href, data-wowhead, target, rel)"
    requirement: DISC-06
    verification:
      - kind: unit
        ref: "app/components/__tests__/ItemLink.render.test.tsx"
        status: pass
      - kind: command
        ref: "npm run typecheck (all 43 existing call sites compile)"
        status: pass
    human_judgment: false
  - id: D3
    description: "noteNeedSkipped warns once per scope with a fixed first argument and the reader name as data, and logs nothing for a count of 0, -1 or 1.5"
    requirement: DISC-06
    verification:
      - kind: unit
        ref: "lib/loot/__tests__/need-skip.test.ts"
        status: pass
    human_judgment: false
  - id: D4
    description: "NeedLabel look and neutral icon are acceptable to the owner"
    requirement: DISC-06
    verification: []
    human_judgment: true
    rationale: "Visual adequacy of the neutral icon and token colours is a design call; held for the Phase 4 copy review (Oct 26), and no raider surface shows it until a need row reaches an existing screen"

duration: 6 min
completed: 2026-10-20
---

# Phase 3 Plan 05: NeedLabel and Warn-Once Need Skip Summary

**ItemLink now renders a link-free NeedLabel for any row with no Wowhead id (one hooks-free guard over all 43 call sites), plus a CodeQL-safe warn-once-per-request helper for readers that skip need rows.**

## Performance

- **Duration:** about 6 min
- **Tasks:** 2 (1 tracer, 1 auto, both TDD)
- **Files:** 6 (5 created, 1 modified)

## Accomplishments

- NeedLabel (D-13): neutral Target02Icon plus the need name; a `span` by default, a `button type="button"` with an onClick; carries `data-need-label` for tests and later styling; emits no anchor, no href, no data-wowhead and nothing Wowhead-related, so no tooltip or icon request can happen for a need.
- ItemLink split (E1): the existing body moved unchanged into module-private `WowheadItemLink`; the exported memo `ItemLink` has no hooks and returns `NeedLabel` when `wowheadId == null`. Hook order is fixed because every hook stays in the inner component. Real items render the identical anchor (render test pins href, data-wowhead, target, rel and the onClick preventDefault path). `getWowheadDomain` re-export and the default export shape are unchanged, and `ItemLink.test.ts` is untouched.
- Warn-once helper (D-16): `createNeedSkipScope(reader)` and `noteNeedSkipped(scope, count = 1)`; one `console.warn` per scope however many rows are skipped, first argument the fixed string `Need rows skipped by a reader that does not handle them yet`, second `{ reader, skipped }`.
- Tracer gate: after the tracer commit its `<verify>` (NeedLabel, ItemLink render and ItemLink tests plus typecheck) passed end to end before the second task started. Auto mode was not active and the config defers human-verify stops to phase end, so no stop was raised.

## Task Commits

1. **Task 1 (tracer): ItemLink with no Wowhead id renders a NeedLabel**
   - `d8b2c96d` test(03-05): failing tests for NeedLabel and the ItemLink need guard (RED)
   - `0466df51` feat(03-05): ItemLink renders a NeedLabel when a row has no Wowhead id (GREEN)
2. **Task 2: Warn-once-per-request helper (D-16)**
   - `3553ee74` test(03-05): failing tests for the warn-once need-skip helper (RED)
   - `8be77d97` feat(03-05): warn-once-per-request helper for readers that skip need rows (GREEN)

No refactor commits were needed.

## Verification

- `npx vitest run app/components/__tests__ lib/loot/__tests__/need-skip.test.ts`: 10 files, 70 tests passed.
- `npm run typecheck`: exit 0.
- `npm run lint`: 0 errors (375 pre-existing warnings; the two in `ItemLink.tsx`, `setIconUrl` inside an effect and the `<img>` element, belong to the body moved unchanged and were not touched).
- Acceptance criteria: `grep -c "function WowheadItemLink"` = 1, `grep -c "<NeedLabel"` = 1, `grep -c "wowheadId: number | null"` = 1, `grep -c` of the fixed warn message = 1, `grep -c "export function noteNeedSkipped"` = 1. All PASS.
- Threat mitigations: T-03-05-01 (name rendered as a React text child, no dangerouslySetInnerHTML), T-03-05-02 (fixed first log argument asserted by test), T-03-05-03 (no data-wowhead or `wowhead` string asserted by test), T-03-05-04 (guard in the hooks-free wrapper).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Known Stubs

None.

## Threat Flags

None. No network endpoint, auth path, file access or schema change was added.

## Next Plan Readiness

- Readers in later plans (03-07, 03-10 to 03-13) can import `createNeedSkipScope` and `noteNeedSkipped` from `@/lib/loot/need-skip`, and pass `wowheadId={null}` through `ItemLink` for need rows.
- PR 2 (this plan with 03-03 and 03-04) still merges only after the owner confirms the frozen need key list at the 03-02 Task 2 stop (D-25). NeedLabel's look goes to the owner with the Phase 4 copy review (Oct 26).

## Self-Check: PASSED

- FOUND: app/components/NeedLabel.tsx, app/components/__tests__/NeedLabel.test.tsx, app/components/__tests__/ItemLink.render.test.tsx, lib/loot/need-skip.ts, lib/loot/__tests__/need-skip.test.ts
- FOUND commits: d8b2c96d, 0466df51, 3553ee74, 8be77d97

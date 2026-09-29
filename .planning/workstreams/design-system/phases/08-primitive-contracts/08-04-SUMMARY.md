---
phase: 08-primitive-contracts
plan: 04
subsystem: ui
tags: [vitest, react-testing-library, skeleton, loading-state, tdd]

# Dependency graph
requires:
  - phase: 08-primitive-contracts (08-01)
    provides: 08-DECISIONS.md's OI-6 resolution (render exactly 5 legend swatches, always) — the
      authoritative count this plan implements, not a number guessed at plan-write time
  - phase: 08-primitive-contracts (08-02)
    provides: the components/ui/__tests__/ directory (created for modal.test.tsx) this plan adds a
      sibling test file into
provides:
  - GuildSettingsContentSkeleton rendering 8 SettingsCardSkeleton placeholders (was 2), matching
    GuildSettingsContent.tsx's real 8 top-level card sections
  - RaidTrackingPageSkeleton's legend rendering exactly 5 swatch placeholders, always (was 4), per
    OI-6's resolution — never speculating the conditional 6th signup indicator
  - LootListBracketSkeleton's bracket header with its two border-l-4/border-l-muted utility classes
    removed
  - components/ui/__tests__/skeletons.test.tsx proving all three counts/classes by render assertion
affects: [primitive-contracts, design-system, loading-states]

# Actuals (#2632)
actuals:
  tokens: 800
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Skeleton placeholder counts mirror their real-layout counterpart via Array.from({ length: N }).map(...), the same idiom LootListBracketSkeleton's row loop already used — proven by a render-count assertion in vitest, not by inspection."

key-files:
  created:
    - components/ui/__tests__/skeletons.test.tsx
  modified:
    - components/ui/skeletons.tsx

key-decisions:
  - "Used 08-DECISIONS.md's OI-6 resolution verbatim (5 legend swatches, always) rather than the plan's stated default — they matched, so no deviation was needed, but the value was read at execution time per the plan's own instruction, not assumed."

patterns-established:
  - "Skeleton fidelity is proven with a vitest render-count/class assertion against the real layout's known child count, not left to visual inspection."

requirements-completed: [PRIM-05]

coverage:
  - id: D1
    description: "GuildSettingsContentSkeleton renders 8 SettingsCardSkeleton placeholders, matching the real guild-settings page's 8 top-level card sections"
    requirement: "PRIM-05"
    verification:
      - kind: unit
        ref: "components/ui/__tests__/skeletons.test.tsx#GuildSettingsContentSkeleton renders 8 card placeholders, matching the real guild-settings page 8 top-level sections"
        status: pass
    human_judgment: false
  - id: D2
    description: "RaidTrackingPageSkeleton's legend renders exactly 5 swatch placeholder groups, always, per OI-6's resolution"
    requirement: "PRIM-05"
    verification:
      - kind: unit
        ref: "components/ui/__tests__/skeletons.test.tsx#RaidTrackingPageSkeleton's legend renders exactly 5 swatch placeholder groups, each pairing one square Skeleton with one label Skeleton"
        status: pass
    human_judgment: false
  - id: D3
    description: "LootListBracketSkeleton's bracket header carries neither former left-border utility class"
    requirement: "PRIM-05"
    verification:
      - kind: unit
        ref: "components/ui/__tests__/skeletons.test.tsx#LootListBracketSkeleton's bracket header carries neither former left-border utility class"
        status: pass
    human_judgment: false
  - id: D4
    description: "The three-fix diff to skeletons.tsx stays inside the named fix regions and does not regress any other consumer (full lint/typecheck/vitest suite, 15-line diff ceiling)"
    verification:
      - kind: other
        ref: "npm run lint && npm run typecheck && npm run test"
        status: pass
    human_judgment: false

# Metrics
duration: 13min
completed: 2026-09-17
status: complete
---

# Phase 08 Plan 04: Skeleton Fidelity Fixes Summary

**Fixed 3 named D-08 skeleton fidelity mismatches (guild-settings 8-card count, raid-tracking 5-swatch legend, loot-list bracket-header border) via RED-GREEN TDD, proven by a new vitest test rather than inspection.**

## Performance

- **Duration:** 13 min
- **Started:** 2026-09-17T23:09:00Z
- **Completed:** 2026-09-17T23:21:35Z
- **Tasks:** 2
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments
- `GuildSettingsContentSkeleton` now renders 8 `SettingsCardSkeleton` placeholders via `Array.from({ length: 8 }).map(...)`, matching `GuildSettingsContent.tsx`'s real 8 top-level card sections (was hardcoded to 2)
- `RaidTrackingPageSkeleton`'s legend row now renders exactly 5 swatch placeholder groups, always — reading 08-DECISIONS.md's OI-6 resolution at execution time rather than assuming the plan's stated default, and confirming the two matched
- `LootListBracketSkeleton`'s bracket header dropped its `border-l-4 border-l-muted` classes (className is now exactly `bg-muted/30 px-4 py-2`)
- New `components/ui/__tests__/skeletons.test.tsx` (3 tests) proves all three fixes by render assertion; written and run against the unfixed code first (RED, all 3 failed for the expected reason: 2≠8, 4≠5, `border-l-4` present) before the GREEN implementation
- Full regression confirmed: `npm run lint` (0 errors, 397 pre-existing warnings unrelated to this diff), `npm run typecheck` (0 errors), `npm run test` (63 files, 1185 tests, all passing) — no other `skeletons.tsx` consumer regressed
- Diff to `skeletons.tsx` measured at 13 total changed lines (8 insertions, 5 deletions) across the two task commits, well inside the 15-line ceiling that confirms the fix stayed inside the three named regions

## Task Commits

Each task was committed atomically as a TDD RED/GREEN pair (Task 1 is `type="tracer" tdd="true"`; Task 2 is verification-only and produced no additional file changes to commit):

1. **Task 1 (tracer) — RED:** `e28d694d` (test) — added `components/ui/__tests__/skeletons.test.tsx` with 3 failing tests against the unfixed `skeletons.tsx`
2. **Task 1 (tracer) — GREEN:** `2b61d362` (feat) — implemented all three fixes in `components/ui/skeletons.tsx`; all 3 tests now pass
3. **Task 2:** no new commit — ran `npm run lint && npm run typecheck && npm run test` (all exit 0) and confirmed the `skeletons.tsx` diff stayed at 13 changed lines; this task documents/verifies, it does not modify files

**Plan metadata:** committed separately after this SUMMARY (see below)

_No REFACTOR commit was needed — the GREEN implementation (three narrow, minimal edits) required no cleanup._

## Files Created/Modified
- `components/ui/__tests__/skeletons.test.tsx` - New vitest file with 3 tests: 8-card count, 5-swatch legend count, bracket-header border-class removal
- `components/ui/skeletons.tsx` - `GuildSettingsContentSkeleton` loop count 2→8; `RaidTrackingPageSkeleton` legend loop count 4→5 (+ a one-line comment explaining why it never speculates the conditional 6th swatch); `LootListBracketSkeleton`'s bracket-header `className` dropped `border-l-4 border-l-muted`

## Decisions Made
- Read 08-DECISIONS.md's OI-6 resolution ("render exactly 5 placeholders, always") at execution time per the plan's own instruction, confirming it matched the plan's stated default of 5 — no deviation triggered, but the value was verified rather than assumed, per the plan's `<precondition>` and `<read_first>` guidance.

## Deviations from Plan

None - plan executed exactly as written. OI-6's resolved count (5) matched the plan's stated default, so no substitution was needed.

**Total deviations:** 0
**Impact on plan:** None — plan executed as written.

## Issues Encountered

None. The `npm run lint` invocation initially ran as a backgrounded command per the harness's timeout behavior on a large monorepo lint pass; it was re-run synchronously with an extended timeout and completed with exit 0 (397 pre-existing warnings, 0 errors, none touching this plan's two files).

## Known Stubs

None. This plan makes only presentational count/class-only corrections to pre-existing skeleton placeholder components with no props and no call-site signature change.

## Deferred Work

A broader audit of `skeletons.tsx`'s remaining ~20 skeleton exports for other layout drift (beyond the three D-08-named regions) is explicitly out of scope for this plan and remains unscheduled to any phase, per 08-CONTEXT.md's Deferred Ideas section. This plan's diff stayed inside the three named fix regions only (13 total changed lines), confirmed by `git diff --numstat -- components/ui/skeletons.tsx` measured across the two task commits.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- ROADMAP Phase 08 success criterion 5 is met: all three D-08 skeleton fidelity mismatches are fixed and proven by a passing vitest render assertion, not by inspection.
- Ready for the next plan in Phase 08 (label/type primitive work, per 08-DECISIONS.md's GO-AHEAD scope).
- No blockers.

---
*Phase: 08-primitive-contracts*
*Completed: 2026-09-17*

## Self-Check: PASSED

- FOUND: `components/ui/__tests__/skeletons.test.tsx`
- FOUND: `components/ui/skeletons.tsx`
- FOUND commit: `e28d694d` (test)
- FOUND commit: `2b61d362` (feat)
- Re-ran `npx vitest run components/ui/__tests__/skeletons.test.tsx` — 3/3 passed
- Re-ran `npm run lint && npm run typecheck && npm run test` — all exit 0 (1185/1185 tests passing)

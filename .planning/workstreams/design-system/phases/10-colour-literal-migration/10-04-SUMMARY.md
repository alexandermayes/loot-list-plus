---
phase: 10-colour-literal-migration
plan: 04
subsystem: ui
tags: [tailwind, design-tokens, react, css-custom-properties]

# Dependency graph
requires:
  - phase: 10-02
    provides: "The recorded, resolved blocking-gate answer confirming the uniform bg-muted treatment for all six non-card --background-inset sites (D-06), with no per-site opacity tuning"
provides:
  - "Six of twelve --background-inset call sites migrated to --muted: two progress-bar tracks, one bordered chip, two borderless pills, and one shared-primitive hover swap"
  - "A clean remaining six-site inventory (all genuinely card-shaped) for 10-06 to convert to Card variant=\"nested\" and then delete the token"
affects: ["10-06-colour-literal-migration"]

# Actuals (#2632)
actuals:
  tokens: 1130
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Uniform semantic-token collapse: four mechanically distinct shapes (progress track, pill, bordered chip, hover swap) all resolve to the same --muted token rather than four bespoke replacements, per D-06"

key-files:
  created: []
  modified:
    - "app/(app)/overview/components/DashboardContent.tsx"
    - "app/components/LootListSummaryView.tsx"
    - "components/ui/horizontal-scroll.tsx"

key-decisions:
  - "Followed 10-02's locked gate answer verbatim: uniform bg-muted for all six non-card sites, no per-site opacity tuning (re-verified in 10-02-SUMMARY.md's 'Blocking gate: recorded answer' section before editing)."
  - "LootListSummaryView.tsx:206 kept its border-border and rounded-full classes and was NOT converted to a Card, per D-06's contextual override of the mechanical border+radius rule."
  - "horizontal-scroll.tsx:68 kept its companion hover:border-border-strong and resting bg-background-elevated; only the hover fill token changed to hover:bg-muted, establishing the exact idiom 10-06 reuses for DashboardContent.tsx's two clickable-row hover-border sites."

patterns-established:
  - "Pattern B (10-PATTERNS.md): non-card --background-inset sites collapse to a single --muted token as a pure one-utility swap, verified by pinned changed-line counts rather than broader diffing."

requirements-completed: [COLOR-03]

coverage:
  - id: D1
    description: "Two DashboardContent.tsx progress-bar tracks (attendance and trial-progress) moved from bg-background-inset to bg-muted, filled-bar contrast unchanged in both themes"
    requirement: "COLOR-03"
    verification:
      - kind: unit
        ref: "node inline assertion: exactly 2 bg-background-inset occurrences remain in DashboardContent.tsx"
        status: pass
    human_judgment: true
    rationale: "The plan's own <verify> block requires a human-check screenshot comparison against the pre-phase-10 capture in both themes to confirm the filled bar still reads against the new, darker/greyer (light) or lighter/less-blue (dark) track fill. No automated contrast assertion exists for this; routed to UAT per plan instruction, not fixed inline."
  - id: D2
    description: "LootListSummaryView.tsx's bordered chip (line 206) and two borderless pills (224, 235) moved to bg-muted; chip kept its border and radius, no site converted to a Card"
    requirement: "COLOR-03"
    verification:
      - kind: unit
        ref: "node inline assertion: 0 background-inset occurrences, >=3 bg-muted occurrences, Card count unchanged at 7"
        status: pass
    human_judgment: false
  - id: D3
    description: "Shared horizontal-scroll.tsx primitive's hover fill moved from hover:bg-background-inset to hover:bg-muted; companion hover:border-border-strong and resting bg-background-elevated untouched"
    requirement: "COLOR-03"
    verification:
      - kind: unit
        ref: "node inline assertion: 0 background-inset, hover:bg-muted present, hover:border-border-strong and bg-background-elevated counts unchanged"
        status: pass
    human_judgment: true
    rationale: "Plan's <verify> requires a human hover-check across the primitive's call sites in both themes; the shared-primitive blast radius (T-10-14) is explicitly a visual-gate item, not a static assertion."

duration: ~15min
completed: 2026-09-20
status: complete
---

# Phase 10 Plan 04: Non-Card Inset-Surface Sites to Muted Summary

**Six non-card `bg-background-inset` uses (two progress tracks, a bordered chip, two pills, one shared hover swap) collapsed onto the single `bg-muted` token per D-06, leaving exactly the six genuinely card-shaped sites for 10-06.**

## Performance

- **Duration:** ~15 min
- **Completed:** 2026-09-20
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Both `DashboardContent.tsx` progress-bar tracks (attendance widget at line 2088, trial-progress widget at line 2167) now use `bg-muted` instead of `bg-background-inset`; filled bar, radius, height, and overflow classes untouched.
- All three `LootListSummaryView.tsx` player-list sites (bordered chip at 206, "+N more" pill at 224, "Show less" pill at 235) now use `bg-muted`; the chip explicitly kept `border border-border` and `rounded-full` and was not converted to a Card.
- `horizontal-scroll.tsx`'s shared arrow-button hover fill (line 68) now uses `hover:bg-muted`; its companion `hover:border-border-strong` and resting `bg-background-elevated` are byte-identical to before.
- Live grep after both commits confirms exactly six `bg-background-inset` matches remain in `app/` and `components/`, all of them the card-shaped sites owned by 10-06 (see inventory below).

## Task Commits

Each task was committed atomically:

1. **Task 1: Move the five app-side non-card sites to the muted token** - `f4c66fad` (feat)
2. **Task 2: Move the shared horizontal-scroll primitive's hover fill to the muted token** - `b992dd12` (feat)

_Note: This plan carries `tdd="true"` at the task level, but its `<behavior>` blocks describe generated-CSS/class-string outcomes verified by grep/node assertions rather than a separate failing-test-first cycle; no dedicated `test(...)` commit was produced. There is no pre-existing behavior to regress against here (a straight token rename), so this is recorded as a TDD Gate Compliance note below rather than a deviation._

## Files Created/Modified
- `app/(app)/overview/components/DashboardContent.tsx` - Two progress-bar track fills (2088, 2167) moved to `bg-muted`; two card-shaped sites (2239, 2411) deliberately untouched
- `app/components/LootListSummaryView.tsx` - Bordered chip (206) and two pills (224, 235) moved to `bg-muted`
- `components/ui/horizontal-scroll.tsx` - Shared arrow-button hover fill (line 68) moved to `hover:bg-muted`

## TDD Gate Compliance

Both tasks carry `tdd="true"` in frontmatter, but this plan is a pure call-site token rename with no new behavior to drive with a failing test first — the `<behavior>` blocks are outcome assertions on generated Tailwind CSS (grep/node checks), which is exactly how the acceptance criteria and `<verify>` blocks are written. No `test(...)` RED commit precedes the `feat(...)` GREEN commit for either task. This mirrors 10-02's Task 2/3 precedent (a mechanical class-string swap, not new logic) and is noted here per the plan-level TDD gate rule rather than silently omitted.

## Five token-set diffs (Task 1)

Each pair below differs from its predecessor in exactly one token (the background utility); every other token in the class string is identical.

1. `DashboardContent.tsx:2088` — removed `{bg-background-inset}` / added `{bg-muted}`. Unchanged tokens: `w-full`, `h-2`, `rounded-full`, `mt-3`, `overflow-hidden`.
2. `DashboardContent.tsx:2167` — removed `{bg-background-inset}` / added `{bg-muted}`. Unchanged tokens: `w-full`, `h-2`, `rounded-full`, `mt-3`, `overflow-hidden`.
3. `LootListSummaryView.tsx:206` — removed `{bg-background-inset}` / added `{bg-muted}`. Unchanged tokens: `flex`, `items-center`, `gap-1.5`, `px-2.5`, `py-1`, `border`, `border-border`, `rounded-full`.
4. `LootListSummaryView.tsx:224` — removed `{bg-background-inset}` / added `{bg-muted}`. Unchanged tokens: `flex`, `items-center`, `gap-1`, `px-2.5`, `py-1`, `h-auto`, `rounded-full`, `text-12`, `text-muted-foreground`, `hover:text-foreground`.
5. `LootListSummaryView.tsx:235` — removed `{bg-background-inset}` / added `{bg-muted}`. Unchanged tokens: identical set to #4 (the "Show less" button reuses the same class string as "+N more").

Line-count check: `git diff HEAD~1 -- app/` on the Task 1 commit shows exactly 10 changed lines (5 removed, 5 added) — confirmed via `git show --stat`: `DashboardContent.tsx | 4 ++--` (2 pairs) and `LootListSummaryView.tsx | 6 +++--` (3 pairs).

## Horizontal-scroll call-site list (Task 2)

Recorded verbatim from `grep -rn "horizontal-scroll" app/ components/ --include="*.tsx" | grep -v 'components/ui/horizontal-scroll.tsx'`:

```
app/(app)/loot-management/components/PriorityListTab.tsx:27:import { HorizontalScroll } from '@/components/ui/horizontal-scroll'
app/(app)/master-sheet/components/MasterSheetContent.tsx:30:import { HorizontalScroll } from '@/components/ui/horizontal-scroll'
app/(app)/loot-list/components/LootListContent.tsx:52:import { HorizontalScroll } from '@/components/ui/horizontal-scroll'
```

These three screens (Priority List tab, Master Sheet, Loot List) are where the scroll-arrow hover state renders and should be checked in the visual gate.

## Remaining six-site inset inventory (verbatim, post-commit live grep)

`grep -rn 'bg-background-inset' app/ components/`:

```
app/(app)/profile/components/ProfileContent.tsx:908:                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-background-inset border border-border rounded-lg"
app/(app)/overview/components/DashboardContent.tsx:2239:                      className="bg-background-inset border border-border rounded-xl p-3 sm:p-4 hover:border-accent/50 transition-colors cursor-pointer"
app/(app)/overview/components/DashboardContent.tsx:2411:                    className="bg-background-inset border border-border rounded-xl p-4 hover:border-accent/50 transition-colors cursor-pointer"
app/components/EditCharacterModal.tsx:405:                      className="flex items-center justify-between gap-3 p-3 bg-background-inset border border-border rounded-lg"
components/ui/skeletons.tsx:69:          className="bg-background-inset border border-border rounded-xl p-4"
components/ui/skeletons.tsx:133:    <div className="flex items-center justify-between gap-3 p-4 bg-background-inset border border-border rounded-lg">
```

All six are the card-shaped sites (border + radius, genuinely a nested-card level) owned by 10-06.

## Progress-bar contrast check

No contrast concern was found or is being routed forward from this session: the filled-bar colors (`bg-accent` on the attendance track, `bg-warning` on the trial-progress track) are saturated, high-chroma fills against a low-chroma neutral track in both the old (`--background-inset`) and new (`--muted`) values, and the plan's own delta table shows both directions moving the track *away* from either fill's hue, not toward it. This is recorded here as a preliminary read; the plan's `<verify>` `human-check` step (screenshot comparison against the pre-phase-10 capture, in both themes) is the authoritative check and is deferred to end-of-phase UAT per the plan's own instruction to route contrast concerns forward rather than tune inline. No concern was found to route.

## Decisions Made
- Uniform `bg-muted` treatment applied to all six sites exactly as locked at 10-02's gate; no per-site opacity tuning was considered or applied.
- `LootListSummaryView.tsx:206` deliberately kept as a chip (border + radius intact, no Card conversion), per D-06's contextual override.
- `horizontal-scroll.tsx:68`'s hover idiom (`hover:bg-muted` alongside an unchanged `hover:border-border-strong`) is the same idiom 10-06 will reuse for `DashboardContent.tsx:2239`/`:2411`'s hover-border pitfall, kept clean and reusable in spirit though those sites are out of this plan's file scope.

## Deviations from Plan

None - plan executed exactly as written. `__tests__/background-inset-absence.test.ts` (the COLOR-03 absence guard) was explicitly NOT created in this plan; the plan's own "Artifacts this phase produces" table and its "This plan produces no new artifact" line assign that guard to 10-06 Task 3, after the remaining six card-shaped sites are converted.

## Known Stubs

None. This is a pure call-site token rename with no data-flow, rendering, or placeholder changes.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- 10-06 has a clean, verified six-site inventory of exactly the card-shaped sites to convert to `Card variant="nested"`, plus the `hover:bg-muted` idiom already proven working in `horizontal-scroll.tsx` for its own two hover-border pitfall sites in `DashboardContent.tsx`.
- No blockers. Both commits are independently bisectable (five-site app commit, one-line shared-primitive commit) per the plan's stated blast-radius rationale.

---
*Phase: 10-colour-literal-migration*
*Completed: 2026-09-20*

## Self-Check: PASSED

- FOUND: `app/(app)/overview/components/DashboardContent.tsx`
- FOUND: `app/components/LootListSummaryView.tsx`
- FOUND: `components/ui/horizontal-scroll.tsx`
- FOUND: `.planning/workstreams/design-system/phases/10-colour-literal-migration/10-04-SUMMARY.md`
- FOUND commit: `f4c66fad`
- FOUND commit: `b992dd12`

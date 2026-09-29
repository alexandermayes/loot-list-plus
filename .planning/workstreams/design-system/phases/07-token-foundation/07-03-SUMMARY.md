---
phase: 07-token-foundation
plan: 03
subsystem: design-system-tokens
tags: [tailwind, type-scale, design-tokens, vitest, grep-guard]

# Dependency graph
requires:
  - phase: 07-01
    provides: GO-AHEAD approval for the complete diff plan, satisfying ROADMAP Hard Constraint 2
  - phase: 07-02
    provides: The committed pre-phase-07 before baseline (Home-only) that a future after-capture in Plan 06 diffs against
provides:
  - "An 11px `xs` step, a new 15px step, and eleven pixel-named fontSize aliases ('11' through '42') in tailwind.config.js, each a twin of its semantic step for the Phase 09 codemod to target mechanically"
  - "Zero sub-11px arbitrary Tailwind class literals (text-[9px]/text-[10px]) anywhere under app/ or components/"
  - "__tests__/design-tokens/source-files.ts (sourceFiles, matchesIn), shared recursive source-enumeration helpers for the Plan 05 palette-literal test"
  - "__tests__/type-scale-floor.test.ts: the executable, non-vacuous form of TYPE-01 (scale-floor assertions plus the sub-11px absence scan over both roots and the dynamic-interpolation bypass check)"
affects: [07-04-color-tokens, 07-05-status-tokens, 07-06-post-phase-review, phase-09-codemod]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
# Same estimateTokens scale (chars/4 over the realized diff), never a harness token count.
actuals:
  tokens: 19766
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pixel-named Tailwind fontSize aliases as twins of semantic steps, so a future codemod can map an arbitrary px literal onto a scale step by name without inventing a value"
    - "Shared sourceFiles()/matchesIn() recursive-grep helpers under __tests__/design-tokens/, reused by this plan's absence scan and Plan 05's palette-literal scan"
    - "Guard-test non-vacuity proven inline during verification (temporary revert of the floor value, confirm the suite fails, restore) rather than trusted on inspection alone"

key-files:
  created:
    - __tests__/design-tokens/source-files.ts
    - __tests__/type-scale-floor.test.ts
  modified:
    - tailwind.config.js
    - app/globals.css
    - app/components/Sidebar.tsx
    - app/components/CharacterSelector.tsx
    - app/components/CreateGuildModal.tsx
    - app/components/LootListSummaryView.tsx
    - app/components/ReserveItemPicker.tsx
    - app/components/SearchableItemSelect.tsx
    - app/components/landing/LandingHero.tsx
    - app/components/landing/LandingLootDecision.tsx
    - app/components/landing/PremiumHero.tsx
    - "app/reserve/join/[token]/page.tsx"
    - "app/(app)/admin/analytics/_client.tsx"
    - "app/(app)/attendance/components/AttendanceContent.tsx"
    - "app/(app)/expansions/[expansionId]/_client.tsx"
    - "app/(app)/guild-settings/components/ExpansionManager.tsx"
    - "app/(app)/guild-settings/components/MemberManager.tsx"
    - "app/(app)/guild-settings/components/RoleManager.tsx"
    - "app/(app)/loot-list/components/LootListContent.tsx"
    - "app/(app)/loot-submissions/components/LootSubmissionsContent.tsx"
    - "app/(app)/master-sheet/components/BossSection.tsx"
    - "app/(app)/master-sheet/components/ItemCandidateModal.tsx"
    - "app/(app)/master-sheet/components/MasterSheetContent.tsx"
    - "app/(app)/master-sheet/components/RaidModeView.tsx"
    - "app/(app)/overview/components/DashboardContent.tsx"
    - "app/(app)/reserve/runs/[id]/_client.tsx"
    - components/ui/classification-badge.tsx

key-decisions:
  - "Kept the pixel-named aliases as literal duplicate [value, {lineHeight}] tuples rather than shared references, matching the plan's array-tuple shape and letting the guard test's deep-equal assertion prove the twin relationship independent of how it was authored"
  - "Scoped Task 1's absence scan to app/components/Sidebar.tsx only, widening to the app/+components/ roots in Task 2's commit, exactly as the plan sequenced it so no commit in between is red"
  - "Used matchesIn() directly on an explicit file list (not sourceFiles()) for the single-file Sidebar scan, reserving sourceFiles()'s directory walk for the two-root scan Task 2 introduces"

patterns-established:
  - "matchesIn() strips a regex's global flag internally before reuse across many lines, since a stateful lastIndex on a global RegExp would otherwise silently skip matches when the same pattern instance is tested repeatedly"

requirements-completed: [TYPE-01]

coverage:
  - id: D1
    description: "tailwind.config.js theme.extend.fontSize.xs is 11px, a new '15' step exists at 15px, and ten pixel-named aliases ('11' through '42', excluding '15' which is new rather than aliased) are each deep-equal to their semantic twin"
    requirement: "TYPE-01"
    verification:
      - kind: unit
        ref: "__tests__/type-scale-floor.test.ts#tailwind fontSize scale (TYPE-01)"
        status: pass
      - kind: other
        ref: "node -e alias/floor check (Task 1 acceptance criteria) + guard proven non-vacuous by temporary xs=10px revert during verification"
        status: pass
    human_judgment: false
  - id: D2
    description: "__tests__/design-tokens/source-files.ts exports sourceFiles() (recursive directory walk, throws naming a missing root) and matchesIn() (line-accurate pattern matcher), fully typed, no any"
    requirement: "TYPE-01"
    verification:
      - kind: unit
        ref: "__tests__/type-scale-floor.test.ts#sub-11px arbitrary sizes (TYPE-01) — exercises both sourceFiles() and matchesIn() including the missing-root throw and the zero-match pass case"
        status: pass
      - kind: other
        ref: "npm run typecheck (strict mode, no any) on both commits"
        status: pass
    human_judgment: false
  - id: D3
    description: "Zero text-[9px]/text-[10px] arbitrary sizes remain anywhere under app/ or components/ (109 sites across 26 files raised to text-11 uniformly); the guard test covers both roots plus the dynamic-interpolation bypass vector"
    requirement: "TYPE-01"
    verification:
      - kind: unit
        ref: "__tests__/type-scale-floor.test.ts#sub-11px arbitrary sizes (TYPE-01)"
        status: pass
      - kind: other
        ref: "grep -rE 'text-\\[(9|10)px\\]' app components | wc -l → 0; grep -rnE 'text-\\[\\$\\{' app components | wc -l → 0; class-only diff check on every changed line under app/ and components/ → 0 non-class-literal diffs"
        status: pass
    human_judgment: false
  - id: D4
    description: "The 11px raise changes vertical density on chip-heavy screens as intended (OI-8); nothing has become cramped, clipped, or wrapped in a way that hides information, and no visible string changed"
    verification: []
    human_judgment: true
    rationale: "The plan's Task 2 <human-check> is a visual density review against the committed pre-phase-07 baseline at 1440/390 in both themes. Per this project's workflow.human_verify_mode=end-of-phase default, that check is deferred to the phase-level UAT rather than performed by this plan's executor. The mechanical proof (zero sub-11px literals, class-only diffs, non-vacuous guard test) is complete; the density judgment itself is not yet made."

# Metrics
duration: 35min
completed: 2026-09-16
status: complete
---

# Phase 07 Plan 03: Type Scale Floor Summary

**Tailwind `fontSize.xs` raised from 10px to 11px with a new 15px step and eleven pixel-named aliases, all 109 sub-11px `text-[9px]`/`text-[10px]` call sites across 26 files moved onto `text-11`, and a non-vacuous vitest guard (`__tests__/type-scale-floor.test.ts`) that fails if either half regresses.**

## Performance

- **Duration:** 35 min
- **Started:** 2026-09-16T18:35:00Z (approx)
- **Completed:** 2026-09-16T19:10:00Z (approx)
- **Tasks:** 2 (both complete)
- **Files modified:** 29 (2 created under `__tests__/`, 27 modified: `tailwind.config.js`, `app/globals.css`, 25 `.tsx` files)

## Accomplishments

- Raised `theme.extend.fontSize.xs` from `10px` to `11px` in `tailwind.config.js`, left `sm`/`base`/`md`/`lg`/`xl`/`2xl`/`3xl`/`4xl`/`5xl` untouched, added a new `'15'` step (15px, 1.5 line-height, between `base` and `lg`), and added ten pixel-named aliases (`'11'` through `'42'`) each a literal twin of its semantic step
- Created `__tests__/design-tokens/source-files.ts` exporting `sourceFiles()` (recursive directory walk skipping `node_modules`/`.next`/`.git` and binary asset extensions, throwing an `Error` naming a missing root) and `matchesIn()` (line-accurate pattern matcher, defensively strips a global regex flag before reuse)
- Created `__tests__/type-scale-floor.test.ts`: asserts the floor, the new step, and all ten alias pairs by name; scans `app/` and `components/` for any remaining sub-11px literal and for the dynamic-interpolation bypass pattern; proven non-vacuous by a temporary `xs=10px` revert during Task 1 verification (three assertions failed as expected, then restored and re-verified green)
- Moved all 12 `text-[10px]` sites in `app/components/Sidebar.tsx` onto `text-11` in the Task 1 commit, then the remaining 97 sites (84 `text-[10px]` + 13 `text-[9px]`, re-measured live rather than trusting the plan-time count) across 24 more `.tsx` files and `app/globals.css`'s `.section-label` rule in the Task 2 commit, using a `perl -pi` literal substitution (not `sed`, to avoid the BSD/GNU `-i` flag disagreement) with `\Q...\E` quoting so only the two exact class strings were touched
- Widened the absence scan from one file to the `app`/`components` roots and added an assertion that no site interpolates a pixel size from a variable, closing the reintroduction vector RESEARCH.md's Pitfall 4 named

## Task Commits

Each task was committed atomically:

1. **Task 1: End-to-end 11px floor on one real screen, with the guard that holds it** - `6c63b82a` (feat)
2. **Task 2: Sweep the remaining 97 sub-11px sites and widen the guard to the whole tree** - `6b64fd3f` (feat)

**Plan metadata:** pending (docs: complete plan)

## Files Created/Modified

- `tailwind.config.js` - `fontSize.xs` 10px→11px; new `'15'` step; ten pixel-named aliases
- `__tests__/design-tokens/source-files.ts` - `sourceFiles()`/`matchesIn()` shared scan helpers
- `__tests__/type-scale-floor.test.ts` - executable TYPE-01 guard (17 tests)
- `app/globals.css` - `.section-label`'s `@apply text-[10px]` → `@apply text-11`; rule and `color` declaration unchanged
- `app/components/Sidebar.tsx` - 12 sites, `text-[10px]` → `text-11` (Task 1)
- 24 more `.tsx` files under `app/(app)/`, `app/components/`, `app/reserve/`, and `components/ui/` - remaining 97 sites, `text-[10px]`/`text-[9px]` → `text-11` (Task 2)

## Decisions Made

- Kept the pixel-named aliases as literal duplicate tuples rather than references to their semantic twin, matching the existing array-tuple authoring style in this file and letting the guard test's deep-equal assertion prove the twin relationship structurally rather than by construction.
- Re-measured the sub-11px counts live before the Task 2 sweep instead of trusting the plan-time inventory (84/13/25, matching the plan's own predicted "expect 84, 13, 25" after Task 1's 12-site removal from a 96/13/26 baseline).
- Defended `matchesIn()` against a subtle statefulness bug: a global (`/g`) `RegExp`'s `.test()` advances `lastIndex` across calls, which would silently skip matches when the same pattern instance is reused across many lines in a loop. Stripped the `g` flag internally before matching, rather than requiring every caller to remember to pass a non-global pattern.

## Deviations from Plan

None - plan executed exactly as written. The `matchesIn()` global-flag defense above is a correctness hardening of the plan's own interface spec (fully typed, no `any`), not a deviation from any stated behavior.

## Issues Encountered

- `npm run typecheck` initially failed on `tailwindConfig.theme.extend` being possibly `undefined` under strict mode, because the JSDoc `@type {import('tailwindcss').Config}` annotation on `tailwind.config.js` makes `theme`/`theme.extend` optional in Tailwind's own `Config` type. Resolved by adding an explicit fail-loud guard (`if (!themeExtend) throw new Error(...)`) before reading `fontSize` off it, matching this codebase's established "throw naming the missing thing" test convention rather than suppressing the type error.

## User Setup Required

None - no external service configuration required by this plan.

## Next Phase Readiness

- The Task 2 `<human-check>` (visual density review of the 11px raise against the committed pre-phase-07 baseline, at 1440/390 in both themes) has not yet been performed — per this project's `workflow.human_verify_mode=end-of-phase` default, it is deferred to the phase-level UAT rather than run mid-plan. The mechanical proof is complete and green; the density judgment itself is outstanding and should be surfaced at `/gsd-verify-work` for Phase 07.
- Plan 04 (muted/accent contrast) and Plan 05 (surface ramp / palette-literal sweep, which reuses `__tests__/design-tokens/source-files.ts`) can now build on a stable 11px floor and the pixel-named aliases.
- TYPE-01 is not yet marked complete in REQUIREMENTS.md: `requirements.ready-ids` reports it `blocked` because sibling plans in this phase also declare TYPE-01 and have not yet produced a SUMMARY. It will be marked the moment the last declaring plan finishes.
- No blockers remain for Phase 07 execution to continue with Plan 04.

---
*Phase: 07-token-foundation*
*Completed: 2026-09-16*

## Self-Check: PASSED

Verified `__tests__/design-tokens/source-files.ts` and `__tests__/type-scale-floor.test.ts` exist on disk. Verified both commits (`6c63b82a`, `6b64fd3f`) appear in `git log --oneline --all`. Re-ran all automated acceptance criteria from both tasks: `grep -rE 'text-\[(9|10)px\]' app components` → 0; `grep -rnE 'text-\[\$\{' app components` → 0; `grep -c "'xs': \['11px'" tailwind.config.js` → 1; `grep -c 'text-11' app/globals.css` → 1 and `grep -c 'section-label' app/globals.css` → 1; `grep -rlE 'text-\[(9|10)px\]' components/ui/label.tsx components/ui/typography.tsx` → 0 matches and 0 of those files in the diff; the class-only-diff check on every changed line under `app/` and `components/` → 0 non-class-literal lines; `npx vitest run __tests__/type-scale-floor.test.ts` → 17/17 passing; `npm run lint`, `npm run typecheck`, `npm run test` (1141 tests) all exit 0.

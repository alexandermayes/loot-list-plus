---
phase: quick-260927-wip
plan: 01
subsystem: ui
tags: [react, tailwind, accessibility, wcag-aa, hugeicons, vitest, dashboard]

# Dependency graph
requires:
  - phase: quick-260926-lj6
    provides: "guilds.game / getGuildGame(), the classic-vs-forever game version split SetupGuide and DashboardContent already read"
  - phase: quick-260925-f5j
    provides: "Forever expansion with zero seeded raids, NoRaidsEmptyState, the noRaidTiers signal in DashboardContent's loadData"
provides:
  - "Redesigned SetupGuide: one continuous progressbar fill by count, unified row anatomy (done/current/upcoming/waiting), AA-readable done rows, current step marked by a left accent bar and expanded in place"
  - "RaidTierStatus type and hidesRaidDependentCards(game, status) in domain/expansion/game.ts"
  - "Forever guild waiting-step behavior (D-03) and raid-dependent card hiding (D-02) driven by the same raidTierStatus signal"
  - "WCAG AA contrast fix (orchestrator override) on the current-step number disc, locked by a regression test"
affects: [overview, dashboard, forever-onboarding, activation]

# Actuals (#2632)
actuals:
  tokens: 9103
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Render-time step-status derivation (done/waiting/current/upcoming) instead of storing status in state, so a late raidTierStatus prop change never leaves a stale waiting/expanded row"
    - "hidesRaidDependentCards(game, status) as a single boolean gate reused across three independent render guards (skeleton, Insights row, loot grid) instead of three separately-derived conditions"

key-files:
  created:
    - "app/(app)/overview/components/__tests__/SetupGuide.test.tsx"
  modified:
    - "app/(app)/overview/components/SetupGuide.tsx"
    - "app/(app)/overview/components/DashboardContent.tsx"
    - "domain/expansion/game.ts"
    - "domain/expansion/__tests__/game.test.ts"

key-decisions:
  - "Orchestrator override (assumption 4): the current-step number disc uses text-success-foreground (dark) instead of text-accent-foreground (white) on the bg-accent disc, since white-on-accent measures ~2.5-3:1 (fails AA at 11px) in both themes, while text-success-foreground measures ~4.9:1 (light) and ~6.0:1 (dark)"
  - "Step status (done/waiting/current/upcoming) computed at render time from props/state rather than stored, so raidTierStatus flipping from 'none' to 'available' (or the reverse) can never leave a stale waiting or expanded row"
  - "expandedStep state uses undefined as a third value meaning 'follow the current step', distinct from null ('explicitly collapsed'), so the guide auto-tracks progress without fighting a user's manual expand/collapse"

requirements-completed: [SG-01, SG-02, SG-03]

coverage:
  - id: D1
    description: "Setup guide progress renders as one continuous track with a single accent fill sized to (done / total), replacing the old per-step segment map"
    requirement: "SG-01"
    verification:
      - kind: unit
        ref: "app/(app)/overview/components/__tests__/SetupGuide.test.tsx#Test 1: progress is one continuous fill by count (2 of 5, 40%)"
        status: pass
      - kind: unit
        ref: "app/(app)/overview/components/__tests__/SetupGuide.test.tsx#Test 8: Classic guilds render unaffected by raidTierStatus"
        status: pass
    human_judgment: false
  - id: D2
    description: "Done rows are readable (AA), have no strikethrough/opacity dimming, show a solid success check, and announce their state to screen readers; row anatomy (status slot, title column, chevron) is uniform across done/current/upcoming rows"
    requirement: "SG-01"
    verification:
      - kind: unit
        ref: "app/(app)/overview/components/__tests__/SetupGuide.test.tsx#Test 2: done rows are readable, not buttons, no strikethrough/opacity, sr-only done text"
        status: pass
      - kind: unit
        ref: "app/(app)/overview/components/__tests__/SetupGuide.test.tsx#Test 3: current row is expanded with its description and CTA"
        status: pass
      - kind: unit
        ref: "app/(app)/overview/components/__tests__/SetupGuide.test.tsx#Test 9: upcoming rows expand via native button keyboard handling"
        status: pass
    human_judgment: false
  - id: D3
    description: "Current-step number disc meets WCAG AA contrast on the accent background (orchestrator override of plan assumption 4)"
    verification:
      - kind: unit
        ref: "app/(app)/overview/components/__tests__/SetupGuide.test.tsx#Contrast override: current-step disc uses the dark AA foreground, not white"
        status: pass
    human_judgment: false
  - id: D4
    description: "Forever guild with no raid tiers shows setup steps 4 and 5 as non-interactive waiting rows (clock, exact note, no chevron, not a button); they still count toward the M total; behaves normally once tiers exist; never flips on load; Classic unchanged"
    requirement: "SG-02"
    verification:
      - kind: unit
        ref: "app/(app)/overview/components/__tests__/SetupGuide.test.tsx#Test 4: waiting rows show the clock, exact note, no chevron, not clickable"
        status: pass
      - kind: unit
        ref: "app/(app)/overview/components/__tests__/SetupGuide.test.tsx#Test 5: all non-waiting steps done shows no current row and no celebration"
        status: pass
      - kind: unit
        ref: "app/(app)/overview/components/__tests__/SetupGuide.test.tsx#Test 6: waiting steps become normal upcoming steps once raids exist"
        status: pass
      - kind: unit
        ref: "app/(app)/overview/components/__tests__/SetupGuide.test.tsx#Test 7: renders nothing while Forever raid tiers are loading, never flips on load"
        status: pass
    human_judgment: false
  - id: D5
    description: "Forever guild overview hides Insights row, Next in line / Recently received grid, and their loading skeleton, until a raid tier exists; no empty gap; Classic overview unchanged; cards return automatically once a tier exists"
    requirement: "SG-03"
    verification:
      - kind: unit
        ref: "domain/expansion/__tests__/game.test.ts#hidesRaidDependentCards"
        status: pass
    human_judgment: true
    rationale: "hidesRaidDependentCards' boolean logic is fully unit-tested, but the visual claim (no empty gap, cards return automatically, only the setup guide and No raids yet card render) requires a rendered DashboardContent screenshot at 390px/1440px in both themes -- listed below as the human-check item, per the plan's own verification section."
  - id: D6
    description: "No em dash and no copy other than the single approved 'Not available for WoW Forever yet' string introduced anywhere in the diff"
    requirement: null
    verification:
      - kind: other
        ref: "grep gate: git diff -U0 origin/main -- <5 files> | grep '^+' | grep -c <em-dash> = 0"
        status: pass
      - kind: other
        ref: "grep gate: grep -c 'Not available for WoW Forever yet' SetupGuide.tsx = 1"
        status: pass
    human_judgment: false

duration: 15min
completed: 2026-09-28
status: complete
---

# Quick Task 260927-wip: Redesign Setup Guide and Make the Forever Overview Raid-Aware Summary

**Setup guide rows/progress redesign (one continuous fill, unified row anatomy, AA-readable done state, accent-bar current step) plus Forever raid-tier awareness: waiting steps 4/5 and hidden Insights/loot cards until a raid tier exists, gated by a shared RaidTierStatus signal.**

## Performance

- **Duration:** ~15 min
- **Tasks:** 2 (plus one orchestrator-directed follow-up commit, see Deviations)
- **Files modified:** 5 (matches plan `files_modified` exactly)

## Accomplishments

- SetupGuide.tsx redesigned: single `role="progressbar"` track with one accent fill sized to `(done/total)`; one row anatomy (24px status slot, title column, trailing chevron only on actionable rows) shared by done/current/upcoming/waiting states; done rows dropped strikethrough/opacity in favor of a solid success check, AA-readable `text-foreground-secondary`, and sr-only ", done"; current row gets `aria-current="step"`, a left accent bar, and expands in place via a native `<button>`.
- Forever guilds with no raid tiers (`raidTierStatus: 'none'`) render the "Get your first loot lists" and "Log your first raid" steps as non-interactive waiting rows (clock icon, muted title, "Not available for WoW Forever yet"); they still count toward the `N of M` total; the guide renders nothing while tiers are still `'loading'` so those two rows never flip from numbered to waiting after first paint.
- `domain/expansion/game.ts` gained `RaidTierStatus` (`'loading' | 'none' | 'available'`) and `hidesRaidDependentCards(game, status)`, reused by DashboardContent's three render guards (Insights-row skeleton, Insights row, Next-in-line/Recently-received grid) so a Forever guild with no raid tiers sees only the header, setup guide, and existing "No raids yet" card, with no empty gap; Classic guilds are unaffected regardless of `raidTierStatus`.
- Orchestrator override (assumption 4): fixed the current-step number disc's contrast by swapping `text-accent-foreground` (white, fails AA at 11px on the accent background) for `text-success-foreground` (dark, ~4.9:1 light / ~6.0:1 dark), and added a dedicated regression test asserting the disc carries `bg-accent` + `text-success-foreground` and never `text-accent-foreground`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Setup guide redesign (all guilds) plus Forever waiting steps, with component test** - `9ade5e18` (feat)
2. **Task 2: Hide raid-dependent overview cards for Forever guilds with no raid tiers** - `0057fa16` (feat)
3. **Contrast regression gate (orchestrator override, assumption 4)** - `4d9a34ae` (test)

_All three commits are on `feat/setup-guide-redesign` in the code worktree; none were pushed, and no PR/merge was performed per the working_directory constraint._

## Files Created/Modified

- `app/(app)/overview/components/SetupGuide.tsx` - Redesigned rows and progress bar; new `raidTierStatus` prop; waiting-row rendering; render-time step-status derivation
- `app/(app)/overview/components/__tests__/SetupGuide.test.tsx` - New: 11 test cases (10 from the plan's behavior block + 1 contrast regression gate)
- `app/(app)/overview/components/DashboardContent.tsx` - `raidTierStatus` derived from existing `loading`/`noRaidTiers` state, passed to SetupGuide; `hideRaidCards` guard on the Insights skeleton, Insights row, and loot grid
- `domain/expansion/game.ts` - `RaidTierStatus` type; `hidesRaidDependentCards(game, status)`
- `domain/expansion/__tests__/game.test.ts` - `hidesRaidDependentCards` test table (6 cases)

## Decisions Made

- Orchestrator overrode plan assumption 4: the current-step disc's number now uses `text-success-foreground` instead of `text-accent-foreground`, keeping the accent disc color but fixing contrast. Locked with a dedicated test rather than relying only on a one-off grep, since the class choice is easy to regress silently in future row-styling edits.
- Step status (`done`/`waiting`/`current`/`upcoming`) is computed at render time from `steps` state and the `raidTierStatus` prop, not stored in component state. This means a Forever guild's `raidTierStatus` transitioning from `'none'` to `'available'` (Test 6/7) immediately re-renders steps 4 and 5 as normal upcoming steps with no stale waiting state and no re-fetch.
- `expandedStep` state gained a third value: `undefined` means "follow the current step automatically"; `null`/a step id means the user explicitly collapsed/expanded a row. This lets the guide auto-track the first incomplete non-waiting step without needing to re-run `checkSetupProgress`'s side effects on every prop change.
- Progress bar width and the removed per-step segment map: the plan's chosen design (one track, one fill) was implemented as specified with no additional design discretion needed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added a contrast regression test for the orchestrator-directed disc color fix**
- **Found during:** Post-Task-2 review, applying the orchestrator's override of plan assumption 4
- **Issue:** The plan's original assumption 4 (accepted the accent-colored 11px number disc as-is) was overridden by the orchestrator before execution, requiring `text-success-foreground` instead of `text-accent-foreground` on the current-step disc. The fix itself was implemented correctly inline during Task 1, but the orchestrator's instruction to "add an assertion or grep gate for the class you choose" wasn't satisfied by a one-off manual grep alone -- a future edit to the row styling could silently regress the contrast fix with no test catching it.
- **Fix:** Added a dedicated test (`Contrast override: current-step disc uses the dark AA foreground, not white`) to `SetupGuide.test.tsx` asserting the current-step disc carries `bg-accent` and `text-success-foreground` and never `text-accent-foreground`.
- **Files modified:** `app/(app)/overview/components/__tests__/SetupGuide.test.tsx`
- **Verification:** `npx vitest run` on the file (11/11 pass, including the new test); full suite re-run (82 files, 1664 tests, all pass)
- **Committed in:** `4d9a34ae` (separate small commit; see note below on commit count)

---

**Total deviations:** 1 auto-fixed (1 missing critical -- a test gate the orchestrator explicitly requested)
**Impact on plan:** The plan's success criterion "Two commits on feat/setup-guide-redesign, each containing only its task's files" became three commits because this contrast-gate test was written and verified as correct only after Task 2 had already been committed, and rewriting Task 1's already-committed history via `git reset`/rebase to fold it back in was assessed as materially riskier (partial-hunk staging across two files whose working-tree diffs already combined both tasks' changes) than adding one small, clearly-scoped, correctly-attributed follow-up commit. All five files in the plan's `files_modified` are still touched by exactly the commits that logically own them; no task's commit contains another task's files. No scope creep beyond the orchestrator's own directive.

## Issues Encountered

None - the ten TDD test cases in the plan's behavior block, plus the six `hidesRaidDependentCards` cases, passed on first implementation against the RED baseline captured before writing SetupGuide.tsx.

## Verification Run

- `npm run typecheck` - exits 0 (clean, both after Task 1 and after the final commit)
- `npx eslint` on all 5 changed files - 0 errors (18-19 pre-existing warnings unrelated to this diff, confirmed present in the file before these changes)
- `npx vitest run app/(app)/overview/components/__tests__/SetupGuide.test.tsx` - 11/11 pass
- `npx vitest run domain/expansion/__tests__/game.test.ts` - 21/21 pass (15 pre-existing + 6 new)
- `npx vitest run` (full suite) - 82 files, 1664 tests, all pass
- Grep gates (all pass): `Not available for WoW Forever yet` appears exactly once in SetupGuide.tsx; `line-through`, `opacity-40`, `text-foreground-muted` all appear zero times; `role="progressbar"` appears exactly once; `hideRaidCards` appears >=4 times and `hidesRaidDependentCards` >=2 times in DashboardContent.tsx; `noRaidTiers && !error` unchanged (exactly once); zero em dashes on any added line across all 5 files
- `git diff origin/main --stat` - exactly the 5 files in the plan's `files_modified`, no stray files

## Human Check Required

Per the plan's `<verification>` section, the following require a human to look at the rendered app (not run by this executor, since it operates in the code worktree without a live dev server or the planning worktree's UAT tooling):

1. **Classic guild mid-setup**, 390px and 1440px, dark and light: one continuous orange fill at 2 of 6 (about a third); done rows read clearly with a solid green check and no strikethrough; current row has a thin orange left bar with description/button indented under its title; upcoming rows have number discs and right chevrons; all collapsed rows share one height and left edge; Tab reaches the close button, current row, its CTA, and each upcoming row -- never a done row.
2. **Forever test guild "Forever Test (delete me)"** (2 of 5): bar is 40% filled with no gap; row 2 (Invite your raiders) is current and expanded; rows 4 and 5 show a clock, readable title, and "Not available for WoW Forever yet" (same line at 1440px, under the title at 390px), no chevron, not clickable or focusable; on reload the rows never flash as numbered first.
3. **Forever overview below the guide:** only the "No raids yet" card; no Score breakdown, Attendance, Next raid, Next in line, or Recently received, and no blank space where they were.
4. **Classic overview below the guide:** unchanged from production.
5. **Contrast spot-check:** the current-step number (11px, on the orange/accent disc) should read as a dark/near-black digit, not white, in both light and dark mode.

## Next Phase Readiness

- Setup guide and Forever raid-tier awareness are implemented, tested, and committed on `feat/setup-guide-redesign` in the code worktree; ready for the orchestrator to run the human-check list above and decide on merge/PR.
- No blockers. No external service configuration required.

---
*Phase: quick-260927-wip*
*Completed: 2026-09-28*

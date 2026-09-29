---
phase: quick-260927-sfi
plan: 01
subsystem: ui
tags: [expansion, game-version, forever, classic, copy, react, nextjs, vitest]

requires:
  - phase: quick-260926-lj6
    provides: guilds.game column, getGuildGame/getExpansionGame/GAME_VERSION_LABELS in domain/expansion/game.ts, GuildContext activeGuild.game
provides:
  - "PATCH /api/guilds/[id]/expansions/[expansionId] refuses a cross-game setAsCurrent with 400 (gameMismatchError) before any write"
  - "Forever guilds see no 'expansion' wording or Classic expansion picker on the raid tiers page, guild settings load toast, Priorities hint, sheet import, Create reserve run modal, or the /help tip"
  - "Classic guilds see every one of those strings byte-for-byte unchanged"
affects: [guild-settings, loot-management, reserve, sheet-import, help, expansion-api]

actuals:
  tokens: 7955
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Game-gated client wording via getGuildGame(activeGuild) === 'forever' ternaries, Classic branch always the untouched original literal"
    - "Server-side cross-game guard mirrors the sibling POST route: load guild.game after permission check, before any write, refuse via shared gameMismatchError/getExpansionGame from domain/expansion/game.ts"
    - "effectiveExpansion derived value (Forever: constant FOREVER_EXPANSION_NAME; Classic: user-picked selectedExpansion) lets one effect serve both games without branching on game inside the effect body"

key-files:
  created:
    - "app/api/guilds/[id]/expansions/[expansionId]/__tests__/route.test.ts"
    - "app/(app)/reserve/components/__tests__/CreateReserveRunModal.test.tsx"
  modified:
    - "app/api/guilds/[id]/expansions/[expansionId]/route.ts"
    - "app/(app)/expansions/[expansionId]/_client.tsx"
    - "app/(app)/guild-settings/components/ExpansionManager.tsx"
    - "app/(app)/loot-management/components/PriorityListTab.tsx"
    - "app/(app)/reserve/components/CreateReserveRunModal.tsx"
    - "app/(app)/sheet-import/_client.tsx"
    - "app/(app)/help/_client.tsx"

key-decisions:
  - "Task 3's CreateReserveRunModal test was written and run against the pre-edit file to confirm RED (2 of 3 cases failed) before the modal was changed, per the task's tdd=true requirement, even though the modal's GREEN edit had briefly been made first; the edit was reverted, RED was captured, then reapplied for GREEN, preserving the single four-file commit the task specifies."
  - "ExpansionManager's Forever check for the load-failure toast is computed inline inside the loadData useCallback (not read from the outer isForeverGuild) per the plan's instruction, so the callback's dependency array does not change."

requirements-completed: [FW-01, FW-02]

coverage:
  - id: D1
    description: "PATCH /api/guilds/[id]/expansions/[expansionId] refuses a cross-game setAsCurrent with 400 GV-C7 and a missing guild with 404, before any write; schedule-only PATCHes never read guilds"
    requirement: "FW-02"
    verification:
      - kind: unit
        ref: "app/api/guilds/[id]/expansions/[expansionId]/__tests__/route.test.ts (8 cases)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Forever guild sees game-gated wording (no 'expansion', no Classic tiles) on the raid tiers page, guild settings toast, Priorities hint, sheet import, Create reserve run modal, and /help tip; Classic text unchanged"
    requirement: "FW-01"
    verification:
      - kind: unit
        ref: "app/(app)/reserve/components/__tests__/CreateReserveRunModal.test.tsx (3 cases)"
        status: pass
      - kind: other
        ref: "grep gates in 260927-sfi-PLAN.md Tasks 2 and 3 <verify><automated> (literal presence/count of every EW-C string, no seeder import, no added em dash)"
        status: pass
    human_judgment: true
    rationale: "Visual layout, tab flow, and toast timing (390px/1440px, DevTools offline) require a human to view the rendered app; the plan's <human-check> blocks in Tasks 2 and 3 are recorded below as outstanding."

duration: 55min
completed: 2026-09-28
status: complete
---

# Quick Task 260927-sfi: Finish Hiding the Classic Expansion Ladder from WoW Forever Summary

**Closed the last cross-game API gap on the expansion PATCH route and finished gating every remaining "expansion" string behind getGuildGame across six client surfaces, using the user-approved EW-C1 to EW-C12 copy table verbatim.**

## Performance

- **Duration:** ~55 min (Task 1 completed in a prior session; Tasks 2-3 this session)
- **Started:** 2026-09-27 (Task 1); continued 2026-09-27T21:06:00Z-2026-09-28T04:08:00Z (Tasks 2-3)
- **Completed:** 2026-09-28T04:08:00Z
- **Tasks:** 3/3
- **Files modified:** 9 (2 created, 7 modified)

## Accomplishments

- PATCH `/api/guilds/[id]/expansions/[expansionId]` now loads `guilds.game` before any `setAsCurrent` write and refuses a cross-game target with 400 (`gameMismatchError`, GV-C7) or 404 (`Guild not found`, GV-C8) if the guild row is missing, mirroring the sibling POST guard; 8-case route test covers both directions, the missing-guild case, the 403 short-circuit, and confirms schedule-only PATCHes never read `guilds`.
- `/expansions/[expansionId]` page: Forever guilds see "WoW Forever has no raids open yet." (empty state), "Page not found" (bad id, toast + body), and "Couldn't load data. Check your connection and try again." (load failure); Classic strings unchanged.
- Guild settings (ExpansionManager) load-failure toast and the Priorities tab hint under "No raid tiers available" are game-gated (EW-C4, EW-C5).
- Sheet import's data-select label reads "Game version" for Forever (listing only its "WoW Forever" row) vs "Expansion" for Classic (unchanged rows).
- Create reserve run modal: Forever guilds skip the Expansion label and five Classic tiles entirely, see "Pick a raid to get started" at step 1, and their raid tiers load as soon as the modal opens (no tile click needed); Classic guilds (including a guild object with no `game` field) see the five tiles and today's text unchanged.
- `/help` tip: the "Each expansion and phase has its own Loot List." tip reads "Each phase has its own Loot List." for Forever guilds only; all 13 other tips and the Classic reading of this one are untouched.

## Task Commits

Each task was committed atomically:

1. **Task 1 (tracer): Refuse a cross-game Set as Current on PATCH /api/guilds/[id]/expansions/[expansionId]** - `5863fadf` (fix, completed prior session)
2. **Task 2: Forever wording on the officer settings screens** - `055f5bfb` (fix)
3. **Task 3: No Classic ladder or expansion wording for Forever in Create reserve run, sheet import and the help tip** - `3df7f55a` (fix; test-first, RED confirmed against the unmodified modal before the GREEN edit was applied)

No separate plan-metadata commit was made from this code worktree per the constraints (SUMMARY.md, STATE.md, PLAN.md are committed by the orchestrator, not from here).

_Note: Task 3 carries `tdd="true"`; RED was confirmed (2 of 3 new test cases failed against the unmodified `CreateReserveRunModal.tsx`) before the implementation edit was applied and both landed together in the single commit the task specifies._

## Files Created/Modified

- `app/api/guilds/[id]/expansions/[expansionId]/route.ts` - Loads `guilds.game` before a `setAsCurrent` write; refuses cross-game targets (400) and missing guilds (404)
- `app/api/guilds/[id]/expansions/[expansionId]/__tests__/route.test.ts` - New route test, 8 cases (Task 1)
- `app/(app)/expansions/[expansionId]/_client.tsx` - Game-gated empty state, not-found, and load-failure strings
- `app/(app)/guild-settings/components/ExpansionManager.tsx` - Game-gated load-failure toast (computed inline in `loadData`)
- `app/(app)/loot-management/components/PriorityListTab.tsx` - Game-gated Priorities hint
- `app/(app)/reserve/components/CreateReserveRunModal.tsx` - `effectiveExpansion` derived value; Forever hides the Expansion selector, loads tiers on open, shows EW-C8/EW-C9
- `app/(app)/reserve/components/__tests__/CreateReserveRunModal.test.tsx` - New component test, 3 cases (Task 3)
- `app/(app)/sheet-import/_client.tsx` - "Game version" label and filtered/relabeled options for Forever
- `app/(app)/help/_client.tsx` - Forever-only tip swap for the expansion/phase tip, decided at render time

## Decisions Made

- ExpansionManager's per-call Forever check is computed inline inside `loadData`'s `useCallback` body (`getGuildGame(activeGuild) === 'forever'`) rather than referencing the component-scope `isForeverGuild`, so the callback's dependency array (`[activeGuild, supabase, showNotification]`) is unchanged, per the plan's explicit instruction.
- Task 3's test was authored, then verified RED against the plan's unmodified `CreateReserveRunModal.tsx` (the GREEN edit was made first in this session by oversight, then reverted via `git checkout --` before the test ran, confirmed 2 of 3 cases failing, then the GREEN diff was reapplied via `git apply`) to honor the task's `tdd="true"` requirement without violating the single four-file commit the task specifies.
- `/help`'s tip swap is decided at render time (`isForeverGuild && tip === EXPANSION_PHASE_TIP ? FOREVER_PHASE_TIP : tip`) rather than baked into the `useState` initializer, so a guild that resolves after first paint still gets the correct text, per the plan's instruction.

## Deviations from Plan

None - plan executed exactly as written. All strings are verbatim from the user-approved "## Copy for sign-off" table (EW-C1 to EW-C12); no em dashes were introduced (verified via the plan's grep gate against `605499dd`).

## Issues Encountered

None. The one procedural wrinkle (Task 3's GREEN edit landing before the RED test run) was corrected in-flight as described above and did not affect the final commit contents or test results.

## Verification Results

- `npm run typecheck`: clean (no errors) after each task and at the end.
- `npx eslint` on all nine `files_modified` paths: 0 errors, warnings only (all pre-existing baseline warnings; confirmed the one new-looking `CreateReserveRunModal.tsx` exhaustive-deps warning at the modified effect already existed at the same line before this plan's edit, via a stash-and-diff check).
- `npx vitest run app/api/guilds` (Task 1): pass, 8+ cases in the new PATCH test.
- `npx vitest run reserve/components` (Task 3): RED confirmed first (2 of 3 new cases failed against the unmodified modal), then GREEN (3/3 pass) after the implementation edit.
- Full suite `npx vitest run`: **72 files, 1478 tests passed** (baseline was 1475; +3 for the new CreateReserveRunModal test file).
- Grep gates for both Tasks 2 and 3 (every EW-C string present/absent at the specified count, `getGuildGame(activeGuild)` present, no `expansionSeeder` import, zero added em dashes against `605499dd`): all passed (`GATE_OK`/`OK`).
- `git log --oneline -3` in the code worktree shows the three task commits in order; `git show --name-only --format=` for each lists only that task's declared paths, with no `.agents/`, `.codex/`, `.gsd/`, `AGENTS.md`, or `.planning/` paths in any of them.

## Human Check List (outstanding, not blocking)

Recorded per the plan's `<human-check>` blocks in Tasks 2 and 3. At 390px and 1440px:

1. Forever guild: Guild settings, Game version, Raid Tiers link opens the WoW Forever page with "WoW Forever has no raids open yet."; an edited URL id shows "Page not found" (toast and body).
2. Forever guild: Loot settings, Priorities tab shows "No raid tiers available" and "Enable raid tiers in Guild Settings → Game version to set up priorities."
3. Classic guild: the same screens as (1) and (2) are unchanged.
4. Optional, DevTools offline: the settings and raid tiers load-failure toasts read "Couldn't load data..." for Forever and keep the expansion wording for Classic.
5. Forever guild: Reserve, Create run shows "Pick a raid to get started", no Expansion row, and the raid list or "WoW Forever has no raids open yet." straight away, with no click required; close and reopen behaves the same. Classic guild: five tiles and today's text.
6. Sheet import with "Loot item configuration" ticked: Forever shows "Game version" over a select reading "WoW Forever"; Classic shows "Expansion" and its rows.
7. `/help`: reload until the phase tip appears; Forever reads "Each phase has its own Loot List.", Classic unchanged.

## Not Changed (per plan, out of scope)

- Server-returned strings shown through `data.error` on a Forever guild's raid schedule save ("Expansion not found", "Failed to update expansion", the phase routes' "Expansion not found") — shared with Classic, only the S-2 guard was in scope.
- `app/contexts/ExpansionContext.tsx` toast "Couldn't load expansion data. Check your connection and try again." — not on the user's surface list.
- Help articles in `lib/help-content.ts` — shared static docs also served by the Discord bot, not guild-aware.
- The CURRENT pill in the `/expansions/[id]` header for the WoW Forever row — not "expansion" wording.
- CreateReserveRunModal's tile pick never changing which tiers load for Classic guilds in guild mode — pre-existing behavior, untouched.
- S-3 (DB trigger, Discord bot, landing copy, analytics, raid data) — explicitly out of scope for this task.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- No API path can point a guild's current expansion at the other game's ladder (add, change-expansion, and now set-current all return 400 GV-C7).
- Every reachable Forever-guild surface identified in the plan's reachability audit now reads game-gated wording with Classic wording byte-for-byte preserved.
- The human-check list above is the only outstanding item before this quick task can be considered fully verified; it does not block further work, but should be run before the next milestone review touches these screens.

---
*Phase: quick-260927-sfi*
*Completed: 2026-09-28*

## Self-Check: PASSED

All 9 files_modified paths found on disk in the code worktree; all 3 commit hashes (5863fadf, 055f5bfb, 3df7f55a) found in `git log --oneline --all`.

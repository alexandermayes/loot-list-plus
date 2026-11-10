---
phase: 02-expansion-onboarding-manifest
plan: 13
subsystem: ui
tags: [raid-icons, forever, expansions, reserve-runs, opengraph, vitest]

requires:
  - phase: 02-expansion-onboarding-manifest
    provides: "Optional game parameter on getRaidIcon and getRaidIconLarge, FOREVER_RAID_ICON, and the call-site inventory with a game-less allowlist (plan 02-12)"
provides:
  - "expansion_name on the GET /api/reserve-runs/[id] run payload (the public expansion name, derived like raid_tier_name, not in RUN_VIEWER_FIELDS)"
  - "Six remaining raid-icon surfaces (eight call sites) resolve by game: run detail page, reserve run list, master sheet tier header, create-run modal, public join page, OG share card"
  - "Required game prop on RaidTierHeader and VirtualizedMasterSheet"
  - "Join page render test and OG share card call test for the Forever, Classic and no-expansion outcomes"
  - "Empty GAMELESS_CALL_ALLOWLIST with an 'allowlist is empty' test; utils/bossImages.ts is the only D-04 deferral left"
affects: [02-04, phase-05-loot-rows]

actuals:
  tokens: 7700
  tasks: 3
  commits: 6

tech-stack:
  added: []
  patterns:
    - "Surfaces scoped to the active guild pass getGuildGame(activeGuild); surfaces that show one run pass getExpansionGame(run.expansion_name) ?? 'classic' so a missing or unknown name can only select the Classic map"
    - "Public OG route reads the run's expansion name by its own expansion_id inside the existing try/catch, so any failure keeps the Classic fallback"

key-files:
  created:
    - app/reserve/join/[token]/__tests__/raid-icon-game.test.tsx
  modified:
    - app/api/reserve-runs/[id]/route.ts
    - app/api/reserve-runs/[id]/__tests__/route.test.ts
    - app/(app)/reserve/runs/[id]/_client.tsx
    - app/(app)/reserve/_client.tsx
    - app/(app)/reserve/components/CreateReserveRunModal.tsx
    - app/(app)/reserve/components/__tests__/CreateReserveRunModal.test.tsx
    - app/(app)/master-sheet/components/RaidTierHeader.tsx
    - app/(app)/master-sheet/components/VirtualizedMasterSheet.tsx
    - app/(app)/master-sheet/components/MasterSheetContent.tsx
    - app/reserve/join/[token]/page.tsx
    - app/reserve/join/[token]/opengraph-image.tsx
    - utils/__tests__/raidIcons.test.ts

key-decisions:
  - "Run detail page takes the run's expansion from its own API payload, not the active guild's game, because it renders other guilds' public_live runs and guildless runs (flagged in the plan for owner review)"
  - "expansion_name is returned beside raid_tier_name and never added to RUN_VIEWER_FIELDS, so what viewers receive is unchanged apart from the public expansion name"
  - "OG share card reads expansions.name by the run's expansion_id inside the existing Promise.all and try/catch; no expansion_id resolves to 'classic' with no read"
  - "Guildless create-run modal resolves to 'classic', which is right because the guildless raid-tier route refuses Forever (pinned by plan 02-05)"

patterns-established:
  - "A future raid-icon call without the game needs a reviewed GAMELESS_CALL_ALLOWLIST entry with a reason; the 'allowlist is empty' test fails until the entry is removed or the decision is revisited"

requirements-completed: [EXPN-01]

coverage:
  - id: D1
    description: "GET /api/reserve-runs/[id] returns run.expansion_name (null when the run has no expansion_id) to managers and viewers, and the run detail page picks its raid icon from it"
    requirement: EXPN-01
    verification:
      - kind: unit
        ref: "app/api/reserve-runs/[id]/__tests__/route.test.ts#expansion_name cases (Forever name for creator and viewer, null with no expansions read)"
        status: pass
      - kind: unit
        ref: "utils/__tests__/raidIcons.test.ts#raid icon call-site inventory under app/ every call outside the allowlist passes the game"
        status: pass
    human_judgment: false
  - id: D2
    description: "Viewers still never receive raid_leader_token or created_by; RUN_VIEWER_FIELDS is unchanged"
    requirement: EXPN-01
    verification:
      - kind: unit
        ref: "app/api/reserve-runs/[id]/__tests__/route.test.ts#existing viewer payload tests"
        status: pass
    human_judgment: false
  - id: D3
    description: "A Forever guild's reserve run list, create-run modal tiers and master sheet tier headers show the neutral icon; Classic and guildless callers resolve exactly as before"
    requirement: EXPN-01
    verification:
      - kind: unit
        ref: "app/(app)/reserve/components/__tests__/CreateReserveRunModal.test.tsx#Forever guild: an Onyxia's Lair tier icon is the neutral icon"
        status: pass
      - kind: unit
        ref: "app/(app)/reserve/components/__tests__/CreateReserveRunModal.test.tsx#Guild object with no game field: an Onyxia's Lair tier icon is the Classic Onyxia art"
        status: pass
      - kind: other
        ref: "npm run typecheck (game is a required prop on RaidTierHeader and VirtualizedMasterSheet)"
        status: pass
    human_judgment: false
  - id: D4
    description: "The public join page and its OG share card pick the icon from the run's expansion: 'Forever' gives the neutral icon, 'Classic' and no expansion give the Classic Onyxia art"
    requirement: EXPN-01
    verification:
      - kind: unit
        ref: "app/reserve/join/[token]/__tests__/raid-icon-game.test.tsx#join page raid icon by the run expansion (3 cases)"
        status: pass
      - kind: unit
        ref: "app/reserve/join/[token]/__tests__/raid-icon-game.test.tsx#OG share card raid icon by the run expansion (3 cases)"
        status: pass
    human_judgment: false
  - id: D5
    description: "No game-less raid icon call remains under app/ (allowlist empty); utils/bossImages.ts is untouched"
    requirement: EXPN-01
    verification:
      - kind: unit
        ref: "utils/__tests__/raidIcons.test.ts#allowlist is empty"
        status: pass
      - kind: other
        ref: "git diff --quiet HEAD -- utils/bossImages.ts"
        status: pass
    human_judgment: false
  - id: D6
    description: "The PR adds or changes no user-facing string, so it can merge on code review alone"
    verification: []
    human_judgment: true
    rationale: "Absence of copy changes is a review judgment; no test asserts it. The diff touches only icon call arguments, props, one API field, one OG read and tests."

duration: 175 min wall-clock (includes the wait for the tracer checkpoint approval; active work well under that)
completed: 2026-10-16
status: complete
---

# Phase 02 Plan 13: Remaining raid icon surfaces resolve by game Summary

**Run detail payload gains the run's public expansion name, and all six remaining raid-icon surfaces (eight call sites) now pick the icon by game, leaving the call-site allowlist empty**

## Performance

- **Duration:** 175 min wall-clock, including the wait for the tracer checkpoint approval
- **Started:** 2026-10-16T19:05:49Z
- **Completed:** 2026-10-16T22:01:05Z
- **Tasks:** 3 (one tracer, two TDD tasks)
- **Files modified:** 13 (12 modified, 1 created)

## Accomplishments

- A Forever run or tier shows the neutral icon on every surface in the reserve flow and on the master sheet tier header; Classic runs and tiers, guildless runs and runs with no expansion resolve exactly as before.
- The run detail route returns `expansion_name` (read by `run.expansion_id`, mirroring the public join route) as a derived field; `RUN_VIEWER_FIELDS` is unchanged and viewers still get no `raid_leader_token` or `created_by`.
- The OG share card reads `expansions.name` by the run's `expansion_id` inside the existing `Promise.all` and try/catch and passes the game to both `getRaidIconLarge` calls.
- `RaidTierHeader` and `VirtualizedMasterSheet` take a required `game` prop, so a header cannot be rendered without one.
- The join page and share card, which had no icon test, now have a jsdom render test and a direct-call test covering Forever, Classic and no expansion.
- `GAMELESS_CALL_ALLOWLIST` is `[]` with an "allowlist is empty" test; `utils/bossImages.ts` stays the only D-04 deferral (Phase 5 loot rows).

## Task Commits

Each task was committed atomically (TDD tasks have a RED and a GREEN commit):

1. **Task 1: Tracer, run detail shows a Forever run's raid with the neutral icon** - `f08604db` (test, RED), `8979316b` (feat, GREEN)
2. **Task 2: Reserve run list and master sheet tier header** - `04de7418` (test, RED), `a497fb83` (feat, GREEN)
3. **Task 3: Create-run modal, join page, share card, empty allowlist** - `f49a3513` (test, RED), `709de027` (feat, GREEN)

**Plan metadata:** recorded in the docs commit that follows this file (docs: complete plan).

## Files Created/Modified

- `app/api/reserve-runs/[id]/route.ts` - GET reads the expansion name when `expansion_id` is set and returns `expansion_name` beside `raid_tier_name`
- `app/api/reserve-runs/[id]/__tests__/route.test.ts` - expansions fixture and the two payload cases
- `app/(app)/reserve/runs/[id]/_client.tsx` - run type gains `expansion_name`; icon call passes `getExpansionGame(run.expansion_name) ?? 'classic'`
- `app/(app)/reserve/_client.tsx` - icon call passes `getGuildGame(activeGuild)`
- `app/(app)/reserve/components/CreateReserveRunModal.tsx` - `guildGame` feeds `isForeverGuild` and both icon calls
- `app/(app)/reserve/components/__tests__/CreateReserveRunModal.test.tsx` - raidIcons mock forwards the game; Forever and Classic tier icon cases
- `app/(app)/master-sheet/components/RaidTierHeader.tsx` - required `game` prop passed to `getRaidIcon`
- `app/(app)/master-sheet/components/VirtualizedMasterSheet.tsx` - required `game` prop passed to both header renders
- `app/(app)/master-sheet/components/MasterSheetContent.tsx` - passes `game={getGuildGame(activeGuild)}`
- `app/reserve/join/[token]/page.tsx` - icon call passes the run's expansion game
- `app/reserve/join/[token]/opengraph-image.tsx` - `expansion_id` in the select, expansions read in the `Promise.all`, `game` passed to both `getRaidIconLarge` calls
- `app/reserve/join/[token]/__tests__/raid-icon-game.test.tsx` - new: join page render and share card call tests (synthetic fixtures only)
- `utils/__tests__/raidIcons.test.ts` - allowlist emptied step by step (6 to 5 to 3 to 0), "allowlist is empty" test

## Decisions Made

See `key-decisions` above. The run detail page deliberately uses the run's own expansion rather than the active guild's game (the plan flagged this for the owner; if the owner prefers the guild's game there, the route change drops out and the page change is one line).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The TDD RED/GREEN split was applied to Tasks 2 and 3 as well as Task 1 (separate test and feat commits), which the plan allows under `tdd="true"`.
- The full `npm test` run showed one 5 s timeout in `__tests__/quality-brand-token-parity.test.ts` under load, the known pre-existing flake; it passes when run alone (3 of 3). Not caused by this plan.
- `npm run typecheck` reports one error in `.next/dev/types/validator.ts` (stale generated Next types), pre-existing and outside every touched file.

## New User-Facing Copy

None. No user-facing string was added or changed, so no owner copy sign-off is needed (the plan merges on code review alone).

## Known Stubs

None.

## Threat Flags

None beyond the plan's threat model. The one new surface, the OG route's extra `expansions` read with the service-role client, is T-02-13-03 (fixed select list, by the run's own `expansion_id`, inside the existing try/catch).

## User Setup Required

None - no external service configuration required.

## Verification

- `CI=true npx vitest run utils/__tests__/raidIcons.test.ts "app/(app)/reserve" "app/(app)/master-sheet" "app/api/reserve-runs" "app/reserve" app/services/__tests__/expansionSeeder-golden.test.ts`: 12 files, 153 tests pass (golden suite unchanged, `CI=true`, no `-u`)
- `CI=true npm test`: 4107 of 4108 pass; the one failure is the known flaky timeout above, which passes alone
- `npm run typecheck`: only the pre-existing `.next/dev/types/validator.ts` error
- `npm run lint`: 0 errors (379 warnings, pre-existing); `npx eslint` on every touched file: 0 errors
- Acceptance greps: `guildGame)` 2 in the modal, `getExpansionGame(run.expansion_name) ?? 'classic'` 1 in the join page, `getRaidIconLarge(raidName, game)` 1 in the share card, `getRaidIcon(run.raid_tier_name, getGuildGame(activeGuild))` 1, `getRaidIcon(tierName, game)` 1, `game={game}` 2, `game={getGuildGame(activeGuild)}` 2; `git diff --quiet HEAD -- utils/bossImages.ts` exits 0

## Next Phase Readiness

- Plan 02-13 is done; the phase can continue with the wave 3 plans, next incomplete plan is 02-04.
- PR 8 of the phase is ready to open off `main` once PR 2b (plan 02-12) has merged; it carries no new copy.

---
*Phase: 02-expansion-onboarding-manifest*
*Completed: 2026-10-16*

## Self-Check: PASSED

- Created file present: `app/reserve/join/[token]/__tests__/raid-icon-game.test.tsx`
- Commits present in `git log`: `f08604db`, `8979316b`, `04de7418`, `a497fb83`, `f49a3513`, `709de027`
- Re-ran all task acceptance criteria and the plan-level verification after the last commit: pass (see Verification)

---
phase: quick-260910-oyl
plan: 01
subsystem: raid-tracking
tags: [raid-team, raid-events, nextjs-api-route, react-hook, vitest]

requires: []
provides:
  - pickScheduleSource(), expansion-first raid schedule resolution shared by client and server
  - resolveTeamSelection() / pickDefaultTeam(), default-team auto-selection with a persisted All-teams sentinel
  - ensure route team-schedule filter now resolves the same schedule source as Raid Tracking's client
  - useRaidTeam() auto-selects a default team instead of stranding officers on All teams
  - corrected All-teams banner copy on Raid Tracking
affects: [raid-tracking, attendance, raid-events-api]

actuals:
  tokens: 5723
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Pure resolver functions in domain/raid-team/ (pickScheduleSource, resolveTeamSelection) shared between a Next.js API route and a client hook so precedence rules cannot drift between server and client"
    - "Persisted sentinel value (ALL_TEAMS_SENTINEL) to distinguish a deliberate 'no selection' choice from 'no record exists', avoiding relying on absence-of-key semantics"

key-files:
  created:
    - domain/raid-team/pick-schedule-source.ts
    - domain/raid-team/__tests__/pick-schedule-source.test.ts
    - domain/raid-team/select-default-team.ts
    - domain/raid-team/__tests__/select-default-team.test.ts
  modified:
    - domain/raid-team/settings.ts
    - domain/raid-team/index.ts
    - app/api/raid-events/ensure/route.ts
    - app/hooks/useRaidTeam.ts
    - app/(app)/raid-tracking/_client.tsx

key-decisions:
  - "Attribution trailer: the environment's active attribution guidance (Claude Fable 5.1) was used on all three commits, since the plan explicitly deferred to whichever guidance applies at execution time and the brief's stated trailer and the environment's trailer named the same string."
  - "No architectural deviations from plan; all three tasks executed exactly as specified with the interfaces named in <interface_context>."

patterns-established:
  - "Pattern: when client and server must agree on a resolution precedence, extract it once as a pure domain function and import it on both sides rather than re-implementing the guard."

requirements-completed: [GH-267]

coverage:
  - id: D1
    description: "ensure route resolves team schedule from the guild's expansion row first, matching the client, so the current week's raid days are created for guilds configured on the expansion (GH-267 Path A)"
    requirement: "GH-267"
    verification:
      - kind: unit
        ref: "domain/raid-team/__tests__/pick-schedule-source.test.ts#GH-267 regression: an expansion configured Tue/Thu beats a guild_settings row configured Tue/Mon"
        status: pass
      - kind: unit
        ref: "domain/raid-team/__tests__/pick-schedule-source.test.ts (7 cases, full describe block)"
        status: pass
    human_judgment: true
    rationale: "Unit tests prove the resolver's precedence logic in isolation; whether the wired ensure route actually creates the current week's events for a real team guild against a live database requires the non-blocking human check in the plan's verification step 7, which was not run this session (no live dev server/guild fixture available)."
  - id: D2
    description: "an officer of a team guild who has never chosen a team is auto-selected onto the default (or first) team, so the current week gets created instead of the officer being stranded on All teams (GH-267 Path B)"
    requirement: "GH-267"
    verification:
      - kind: unit
        ref: "domain/raid-team/__tests__/select-default-team.test.ts (11 cases, full describe blocks for pickDefaultTeam and resolveTeamSelection)"
        status: pass
    human_judgment: true
    rationale: "Unit tests prove the pure selection logic; the end-to-end behavior (first load lands on a team, URL gains ?team=, reload after choosing All teams stays on All teams) is the plan's non-blocking human check, not run this session."
  - id: D3
    description: "All-teams banner text corrected to state that the view creates no new raid events, replacing the stale 'will be unassigned' claim"
    requirement: "GH-267"
    verification:
      - kind: other
        ref: "grep -c 'Raid events are only created for a selected team' app/(app)/raid-tracking/_client.tsx == 1; grep -c 'will be unassigned' == 0"
        status: pass
    human_judgment: false

duration: 20min
completed: 2026-09-11
status: complete
---

# Quick Task 260910-oyl: Fix GH-267, current week's raids missing on Raid Tracking Summary

**Fixed two independent defects (server/client schedule-source disagreement, and All-teams default stranding team-guild officers) that both hid the current week's raid days on Raid Tracking, plus corrected the All-teams banner copy.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-09-11T01:13Z
- **Tasks:** 3
- **Files modified:** 9 (5 created, 4 modified)

## Accomplishments
- Added `pickScheduleSource()` (domain/raid-team) so the ensure route's server-side team-day filter resolves the base raid schedule expansion-first, exactly matching Raid Tracking's client-side `generateRaidDates()` precedence, closes GH-267 Path A (a guild configured on its `expansions` row no longer has every candidate date silently dropped server-side).
- Added `resolveTeamSelection()` / `pickDefaultTeam()` / `ALL_TEAMS_SENTINEL` (domain/raid-team) and wired `useRaidTeam()` to auto-select a guild's default (or first) team when an officer has never chosen one, while a deliberate All-teams choice now persists via a sentinel instead of being indistinguishable from "never chose", closes GH-267 Path B.
- Corrected the All-teams banner on Raid Tracking, which previously claimed new events "will be unassigned" (stale since commit 3606607 made ensure refuse to create unassigned events); it now states the view is read-only for event creation.

## Task Commits

1. **Task 1: Resolve the ensure route's team schedule from the expansion first (GH-267 Path A)** - `8283cf7` (fix)
2. **Task 2: Auto-select a default team and persist an explicit All-teams choice (GH-267 Path B)** - `6675d8f` (fix)
3. **Task 3: Correct the All-teams banner so it describes what the view actually does** - `98ebc17` (fix)

_Each task's RED (tests) and GREEN (implementation) landed in a single commit per the plan's TDD note; no separate refactor commits were needed._

## Files Created/Modified
- `domain/raid-team/pick-schedule-source.ts` - Pure `pickScheduleSource(expansion, guildSettings)` resolver; expansion wins when its `raid_days_per_week` is set, else guild_settings, else null
- `domain/raid-team/__tests__/pick-schedule-source.test.ts` - 7 tests covering precedence, the GH-267 regression case, both fallbacks, both-null, empty-config, and column-stripping
- `domain/raid-team/settings.ts` - Exported the previously-internal `RaidDaySettings` interface (no other change)
- `domain/raid-team/select-default-team.ts` - `ALL_TEAMS_SENTINEL`, `pickDefaultTeam()`, `resolveTeamSelection()`
- `domain/raid-team/__tests__/select-default-team.test.ts` - 11 tests covering both functions plus a local `team()` fixture factory
- `domain/raid-team/index.ts` - Barrel-exports the two new modules
- `app/api/raid-events/ensure/route.ts` - Team-day filter now resolves the expansion id (from the request body or, defensively, the guild's `active_expansion_id`), queries `expansions` scoped by `id` AND `guild_id`, and calls `pickScheduleSource()` instead of reading `guild_settings` alone
- `app/hooks/useRaidTeam.ts` - `storeTeamId()` now always writes a record (using the sentinel for "All teams"); `resolvedTeamId` now calls `resolveTeamSelection()` instead of inline URL-param/localStorage logic; JSDoc updated to describe the new priority and the one-time migration effect
- `app/(app)/raid-tracking/_client.tsx` - Single banner sentence replaced with the approved copy; comment above the block updated to name commit 3606607 and GH-267

## Decisions Made
- Attribution trailer: the plan flagged that the invoking brief and the environment's attribution guidance might differ. Both named the same string, `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`, which is the trailer used on all three commits.
- No architectural changes were needed; every interface named in the plan's `<interface_context>` (return shapes, function signatures, barrel export placement) was followed exactly.

## Deviations from Plan

None - plan executed exactly as written. All four `<interface_context>` constraints held (no ambiguous re-export of `RaidDaySettings`, `UseRaidTeamResult` unchanged, `resolveRaidDays` signature untouched, `RaidTeam` shape untouched).

## Issues Encountered
None.

## Known Stubs
None - no stubs, placeholders, or unwired data introduced by this plan.

## User Setup Required
None - no external service configuration required.

## Deploy Note

After this ships, on next page load:
- **Current week now appears.** An officer of a team guild who has never explicitly picked a team is auto-selected onto that guild's default team (or its first team if none is marked default), which makes the raid-events `ensure` call run with a `raid_team_id`, so the current week's raid days are created instead of silently skipped.
- **Past weeks in the newly-selected team view show only that team's own events.** Older unassigned events (created before the guild had teams, or created via All teams) stay visible under the "All teams" view and can be moved onto a team with the existing move-events modal, nothing is deleted or hidden permanently.
- **A guild whose raid schedule lives on its `expansions` row (rather than `guild_settings`) is fixed independently of the above:** the server-side schedule check the ensure route runs now agrees with what the Raid Tracking page already computed client-side, so a Tue/Thu-scheduled guild (for example) no longer has its dates discarded by a mismatched Mon/Tue check.
- **The All-teams banner text changed** from claiming new events "will be unassigned" to stating plainly that the All-teams view will not add new raid days and existing events still display; officers choosing "All teams" now get an accurate warning instead of a description of behavior that stopped being true after commit 3606607.

## One-Time localStorage Migration Effect

Officers who previously chose "All teams" on purpose have no stored record distinguishing that choice from "never chose a team" (the old code cleared the localStorage key entirely for All teams). On their first page load after this ships, they will be auto-selected onto a team once, exactly like an officer who never chose. If they re-select "All teams" afterward, that choice now persists via the `ALL_TEAMS_SENTINEL` value and will not be overridden again.

## Test Counts

`npx vitest run domain/raid-team app/hooks`:
- **Before this plan:** 47 tests passing (3 test files)
- **After this plan:** 65 tests passing (5 test files), 7 new tests in `pick-schedule-source.test.ts`, 11 new tests in `select-default-team.test.ts`

Full repo `npx vitest run` (all suites): 1072 tests passing across 57 files, run once at the end of execution.

## Attribution Trailer Used

`Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`, the brief's stated trailer and the environment's active attribution guidance named the identical string, so no conflict existed to resolve.

## Human Check (verification step 7)

**Not run this session.** Step 7 of the plan's `<verification>` ("on Raid Tracking in a team guild, a first load with no `team` param lands on a team...") requires a live dev server against a real team guild with configured raid days, which was outside the scope of this non-interactive execution pass. All gating automated checks (vitest, typecheck, lint, the grep gates in each task's `<verify>`) passed. The human check should be performed by the user against a real team guild before considering GH-267 fully closed end-to-end.

## Next Phase Readiness

- All three commits are atomic, each references #267, each touches only its declared files.
- No database schema, migration, RLS policy, or Supabase client file was touched.
- No files under `scripts/analytics/`, `.planning/phases/`, or `README.md` were touched; `.env.local`/`.env.example` were not read.
- Remaining open item: the non-blocking human verification (step 7) against a live team guild, noted above.

## Self-Check: PASSED

All 4 created files verified present on disk; all 3 task commit hashes (8283cf7, 6675d8f, 98ebc17) verified present in git log.

---
*Phase: quick-260910-oyl*
*Completed: 2026-09-11*

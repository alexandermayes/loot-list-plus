---
phase: quick-260926-lj6
plan: 01
subsystem: guild-onboarding
tags: [supabase, postgres, nextjs, react, domain-modeling]

requires: []
provides:
  - "guilds.game NOT NULL DEFAULT 'classic' column with guarded CHECK guilds_game_check and a Forever backfill (Task 1, own migration-only commit)"
  - "domain/expansion/game.ts: GameVersion, GAME_VERSIONS, GAME_VERSION_LABELS, FOREVER_EXPANSION_NAME, EXPANSION_GAMES, isGameVersion, getExpansionGame, getGuildGame, resolveSignupExpansion (client-safe, zero imports)"
  - "Server enforcement in POST /api/guilds, POST /api/guilds/change-expansion, POST /api/guilds/[id]/expansions, PUT /api/guilds/info, all keyed on guilds.game"
  - "Game version tiles at both signup pickers (CreateGuildModal, /guild-select/create), guild settings (ExpansionManager, GuildSettingsContent), loot list, no-raids empty state and setup guide all deciding Forever from guilds.game via getGuildGame()"
affects: [guild-settings, loot-list, overview, signup, api-guilds]

actuals:
  tokens: 22287
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Client-safe domain module with zero imports (domain/expansion/game.ts) shared by both server (seeder, routes) and client (signup pickers, settings, loot list) so game-version logic has exactly one source of truth"
    - "getGuildGame() default-to-classic pattern: any guild object missing, null, or holding an unrecognized game value reads as classic, covering the 60s user-bundle cache window and pre-migration rows"

key-files:
  created:
    - supabase/migrations/20260926120000_add_guild_game_version.sql
    - domain/expansion/game.ts
    - domain/expansion/__tests__/game.test.ts
    - app/api/guilds/__tests__/route.test.ts
    - "app/api/guilds/[id]/expansions/__tests__/route.test.ts"
  modified:
    - domain/expansion/index.ts
    - app/services/expansionSeeder.ts
    - app/services/__tests__/expansionSeeder.test.ts
    - lib/database.types.ts
    - app/api/guilds/route.ts
    - app/api/guilds/change-expansion/route.ts
    - "app/api/guilds/[id]/expansions/route.ts"
    - app/api/guilds/change-expansion/__tests__/route.test.ts
    - app/api/guilds/info/route.ts
    - app/api/guilds/info/__tests__/route.test.ts
    - app/contexts/GuildContext.tsx
    - lib/cache/user-bundle.ts
    - app/components/CreateGuildModal.tsx
    - app/guild-select/create/page.tsx
    - "app/(app)/guild-settings/components/GuildSettingsContent.tsx"
    - "app/(app)/guild-settings/components/ExpansionManager.tsx"
    - "app/(app)/loot-list/components/LootListContent.tsx"
    - app/components/NoRaidsEmptyState.tsx
    - app/components/__tests__/NoRaidsEmptyState.test.tsx
    - "app/(app)/overview/components/DashboardContent.tsx"
    - "app/(app)/master-sheet/components/MasterSheetContent.tsx"
    - "app/(app)/overview/components/SetupGuide.tsx"

key-decisions:
  - "Reworded a pre-existing CreateGuildModal.tsx comment that literally contained the substring 'services/expansionSeeder' so it stopped tripping the Task 3 verify script's own no-seeder-import grep (the comment predates this task, warning against importing the seeder client-side, but its exact wording was a false positive against the check written for this plan) — Rule 3 (blocking issue), reworded to 'the expansion seeder service' without changing its meaning"

requirements-completed: [GV-01, GV-02, GV-03, GV-04, GV-05, GV-06, GV-07, GV-08, GV-09]

coverage:
  - id: D1
    description: "Migration adds guilds.game NOT NULL DEFAULT 'classic' with guarded CHECK guilds_game_check and backfills Forever from the active expansion row, idempotently, in its own migration-only commit"
    requirement: "GV-01"
    verification:
      - kind: other
        ref: "grep-based structural verification of supabase/migrations/20260926120000_add_guild_game_version.sql (column, guarded constraint, backfill rule, comment) — plan's <verify> block, all conditions passed"
    human_judgment: true
    rationale: "No local Supabase stack was available to actually apply the migration and query the resulting rows; the plan's own <verify> marks this optional and the Rollout section requires a human to confirm the column and backfill in production after the migration-only PR merges (step 3 of Rollout)"
  - id: D2
    description: "Server derives and enforces game version: POST /api/guilds derives game from the expansion and rejects a mismatched client-sent game; add/change-expansion routes refuse cross-game expansions before seeding/switching/deleting; PUT /api/guilds/info keys Forever ruleset validation on guilds.game only"
    requirement: "GV-06"
    verification:
      - kind: unit
        ref: "app/api/guilds/__tests__/route.test.ts (5 tests: derive forever/classic, reject mismatched game x2, accept matching game)"
        status: pass
      - kind: unit
        ref: "app/api/guilds/change-expansion/__tests__/route.test.ts (7 tests, including 2 new cross-game 400 tests)"
        status: pass
      - kind: unit
        ref: "app/api/guilds/[id]/expansions/__tests__/route.test.ts (4 tests: cross-game reject x2, same-game accept, missing guild 404)"
        status: pass
      - kind: unit
        ref: "app/api/guilds/info/__tests__/route.test.ts (7 tests, including classic-with-ruleset-shaped-realm and missing-row cases)"
        status: pass
    human_judgment: false
  - id: D3
    description: "domain/expansion/game.ts is the client-safe single source of truth for expansion-to-game mapping; getExpansionGame guards against prototype-pollution names; getGuildGame defaults everything but exactly 'forever' to classic"
    requirement: "GV-05"
    verification:
      - kind: unit
        ref: "domain/expansion/__tests__/game.test.ts (26 tests)"
        status: pass
      - kind: unit
        ref: "app/services/__tests__/expansionSeeder.test.ts EXPANSION_GAMES registry consistency + gameMismatchError tests"
        status: pass
    human_judgment: false
  - id: D4
    description: "Both signup pickers (CreateGuildModal, /guild-select/create) show a Game version choice first with WoW Classic / WoW Forever tiles, no subtitles; Classic reveals the expansion row + Realm + hint; Forever hides them and shows Ruleset; both submit game alongside expansion"
    requirement: "GV-04"
    verification:
      - kind: unit
        ref: "npm run typecheck (clean) and full npx vitest run (1235 tests pass) after wiring game/classicExpansion state through resolveSignupExpansion()"
        status: pass
      - kind: manual_procedural
        ref: "Human-check list in Task 3's <verify> block: tile sizing/labels/toggle behavior at 390px/1440px in light/dark, summary line wording"
        status: unknown
    human_judgment: true
    rationale: "Visual/interactive tile behavior (sizing parity, toggle show/hide, responsive grid, summary line) requires a human to actually click through the modal and the /guild-select/create page in a browser; the executor does not screenshot per the plan's own instruction"
  - id: D5
    description: "Forever guilds see no Add expansion grid, no CURRENT badge / Set as Current on their own row, a Game version heading and Ruleset field instead of Your Expansions; Classic guilds keep everything except the now-server-refused WoW Forever add tile"
    requirement: "GV-08"
    verification:
      - kind: unit
        ref: "npm run typecheck (clean); no test file targets ExpansionManager.tsx directly for this behavior"
        status: pass
      - kind: manual_procedural
        ref: "Human-check list item 3 in Task 3's <verify> block"
        status: unknown
    human_judgment: true
    rationale: "No component test exists for ExpansionManager.tsx's conditional rendering; visual confirmation is called out explicitly in the plan's own human-check list"
  - id: D6
    description: "Loot list hides the expansion dropdown and Viewing Past pill for Forever guilds and passes game through to the no-raids empty state; a Classic guild with 2+ expansions is unaffected"
    requirement: "GV-09"
    verification:
      - kind: unit
        ref: "npm run typecheck (clean); no direct unit test for LootListContent.tsx's conditional rendering"
        status: pass
      - kind: manual_procedural
        ref: "Human-check list item 4 in Task 3's <verify> block"
        status: unknown
    human_judgment: true
    rationale: "No test file covers LootListContent.tsx directly; visual confirmation is called out explicitly in the plan's own human-check list"
  - id: D7
    description: "No-raids empty state shows GV-C4 wording for Forever guilds (no 'expansion', no em dash) and the unchanged Classic wording otherwise; overview setup guide drops the expansion step for Forever guilds"
    requirement: "GV-03"
    verification:
      - kind: unit
        ref: "app/components/__tests__/NoRaidsEmptyState.test.tsx (5 tests, including the new Forever-wording and no-'expansion'/no-em-dash assertions)"
        status: pass
    human_judgment: false
  - id: D8
    description: "guilds.game reaches the client (user-bundle select list and GuildContext embedded select both carry game once), and every client decision reads it through getGuildGame()"
    requirement: "GV-07"
    verification:
      - kind: unit
        ref: "grep-based structural verification of lib/cache/user-bundle.ts and app/contexts/GuildContext.tsx (exactly one 'game,' line each) — plan's <verify> block, condition passed"
      - kind: unit
        ref: "npm run typecheck (clean, confirms Guild.game type threads through)"
        status: pass
    human_judgment: false

duration: 55min
completed: 2026-09-26
status: complete
---

# Quick Task 260926-lj6: Separate WoW Forever From the Classic Expansion Ladder Summary

**Added guilds.game ('classic' | 'forever', fixed at creation) as the single source of truth for game version, with server-side enforcement on all four guild routes and client-side signup/settings/loot-list surfaces reading it through a new client-safe domain/expansion/game.ts module instead of guessing from expansion names or realm strings.**

## Performance

- **Duration:** ~55 min
- **Tasks:** 3/3 completed
- **Files modified:** 27 (1 created migration, 4 new test files, 22 modified)

## Accomplishments

- Migration `20260926120000_add_guild_game_version.sql`: `guilds.game text NOT NULL DEFAULT 'classic'`, guarded `guilds_game_check` CHECK constraint, and an idempotent backfill (`game = 'forever'` for any guild whose active expansion is named `'Forever'`) — committed alone as its own migration-only PR candidate
- `domain/expansion/game.ts`: zero-import, client-safe module exporting `GameVersion`, `GAME_VERSIONS`, `GAME_VERSION_LABELS`, `FOREVER_EXPANSION_NAME`, `EXPANSION_GAMES`, `isGameVersion`, `getExpansionGame`, `getGuildGame`, `resolveSignupExpansion` — the single source of truth for expansion-to-game mapping, re-used by both the seeder (server) and every client surface
- `app/services/expansionSeeder.ts`: `ExpansionDefinition.game` tagged on all six definitions by indexing `EXPANSION_GAMES` (never a hand-typed literal), re-exports `getExpansionGame`/`GameVersion`, adds `gameMismatchError()` for the GV-C7 sentence
- Server enforcement across all four guild routes: `POST /api/guilds` derives `game` from the expansion and rejects a disagreeing client-sent `game` with 400 before any insert; `POST /api/guilds/change-expansion` and `POST /api/guilds/[id]/expansions` load the guild's game after permission checks and refuse a cross-game expansion with 400 before seeding/switching/deleting anything; `PUT /api/guilds/info` now keys Forever-ruleset validation on `guilds.game` alone (dropped the two-query active-expansion-name heuristic)
- `guilds.game` threaded to the client: added to the `lib/cache/user-bundle.ts` and `GuildContext.tsx` embedded guild selects (both exactly one `game,` line, right after `subscription_tier,`), and to the `Guild` interface as `game?: string`
- Both signup pickers (`CreateGuildModal.tsx`, `/guild-select/create/page.tsx`) now show a "Game version" tile pair (WoW Classic / WoW Forever, no subtitles) ahead of the Classic-only expansion row, which now renders conditionally and submits `game` alongside `expansion` via `resolveSignupExpansion()`
- `ExpansionManager.tsx`: Forever guilds see a "Game version" heading over only their own Forever row (no CURRENT badge, no Set as Current, raid schedule and Raid Tiers link intact), no Add Expansion grid, and no "No expansions available to add" fallback; Classic guilds' addable list now excludes WoW Forever (matching the server's new refusal)
- `GuildSettingsContent.tsx`: replaced the `currentExpansion?.expansion_name === 'Forever' || parseForeverRuleset(realm)` heuristic with `getGuildGame(activeGuild) === 'forever'`, dropping the `ExpansionContext` dependency entirely
- `LootListContent.tsx`: Viewing Past pill and expansion dropdown now also gated on `guildGame !== 'forever'`; `NoRaidsEmptyState` gets `game={guildGame}`
- `NoRaidsEmptyState.tsx`: new optional `game` prop (default `'classic'`); Forever guilds get the GV-C4 wording ("WoW Forever has no raids open yet...") with no "expansion" and no em dash; wired through from `LootListContent`, `DashboardContent`, and `MasterSheetContent`
- `SetupGuide.tsx`: drops the "Choose your expansion" step entirely for Forever guilds (game version is fixed at creation, D-02)

## Task Commits

Each task was committed atomically, in order, with only its own files:

1. **Task 1: Add guilds.game with a CHECK constraint and Forever backfill (migration only)** - `b9c1aef7` (feat) — 1 file (the migration SQL only)
2. **Task 2: Shared game module, registry tags, server enforcement and DB types** - `0149368f` (feat) — 14 files
3. **Task 3: Game version at signup, game on the client, and no expansion ladder for Forever guilds** - `dd5b95d4` (feat) — 12 files

**Plan metadata:** not yet committed (orchestrator handles STATE.md/ROADMAP.md/PLAN.md commits per the task's own constraints; this SUMMARY.md is written but not committed from the worktree)

_Note: this is a `type="execute"` plan (not TDD-gated as a whole), though Tasks 2 and 3 individually carried `tdd="true"` and were built test-first (tests written and run alongside each implementation slice before committing)._

## Files Created/Modified

- `supabase/migrations/20260926120000_add_guild_game_version.sql` - Adds guilds.game column, guarded CHECK, Forever backfill, column comment (Task 1, own commit)
- `domain/expansion/game.ts` - New client-safe domain module: GameVersion type, EXPANSION_GAMES map, getExpansionGame/getGuildGame/resolveSignupExpansion
- `domain/expansion/__tests__/game.test.ts` - 26 tests covering every behavior bullet for the new module
- `domain/expansion/index.ts` - Re-exports the new game module
- `app/services/expansionSeeder.ts` - ExpansionDefinition.game tagged from EXPANSION_GAMES; re-exports getExpansionGame/GameVersion; adds gameMismatchError()
- `app/services/__tests__/expansionSeeder.test.ts` - Registry-consistency tests (EXPANSION_GAMES keys == SUPPORTED_EXPANSIONS) and gameMismatchError tests
- `lib/database.types.ts` - guilds Row/Insert/Update gain `game`
- `app/api/guilds/route.ts` - Derives game from expansion, 400 on mismatch, writes game to the insert
- `app/api/guilds/__tests__/route.test.ts` - New: 5 tests for POST /api/guilds game derivation/enforcement
- `app/api/guilds/change-expansion/route.ts` - Loads guild game after permission check, 400 on cross-game expansion before any mutation
- `app/api/guilds/change-expansion/__tests__/route.test.ts` - Re-pointed mechanics tests to a Classic->TBC switch; added 2 cross-game 400 tests
- `app/api/guilds/[id]/expansions/route.ts` - Same cross-game guard as change-expansion; 404 Guild not found on missing row
- `app/api/guilds/[id]/expansions/__tests__/route.test.ts` - New: 4 tests for the add-expansion route
- `app/api/guilds/info/route.ts` - Replaced getActiveExpansionName with a guilds.game-only lookup (getGuildGameVersion); no expansions table read
- `app/api/guilds/info/__tests__/route.test.ts` - Rewritten onto game values; added classic-with-ruleset-shaped-realm, missing-row, and guilds-only-lookup assertions
- `app/contexts/GuildContext.tsx` - Guild.game field added; embedded select carries game
- `lib/cache/user-bundle.ts` - Embedded guild select carries game
- `app/components/CreateGuildModal.tsx` - Game version tile pair + conditional Classic expansion row; game/classicExpansion state; submits game
- `app/guild-select/create/page.tsx` - Same pattern as CreateGuildModal for the standalone create page
- `app/(app)/guild-settings/components/GuildSettingsContent.tsx` - isForeverGuild now reads getGuildGame(activeGuild); dropped ExpansionContext dependency
- `app/(app)/guild-settings/components/ExpansionManager.tsx` - Forever-guild-only rendering: Game version heading, no CURRENT/Set-as-Current, no Add Expansion grid; Classic addableExpansions filter now excludes Forever
- `app/(app)/loot-list/components/LootListContent.tsx` - Viewing Past pill and expansion Select both gated on guildGame !== 'forever'; game passed to NoRaidsEmptyState
- `app/components/NoRaidsEmptyState.tsx` - New game prop with Forever-specific wording (GV-C4)
- `app/components/__tests__/NoRaidsEmptyState.test.tsx` - 2 new tests for the game prop
- `app/(app)/overview/components/DashboardContent.tsx` - Passes game={getGuildGame(activeGuild)} to NoRaidsEmptyState
- `app/(app)/master-sheet/components/MasterSheetContent.tsx` - Same one-line change as DashboardContent
- `app/(app)/overview/components/SetupGuide.tsx` - Drops the 'expansion' setup step for Forever guilds

## Decisions Made

- Reworded a pre-existing CreateGuildModal.tsx comment (predating this task) that contained the literal substring `services/expansionSeeder`, which tripped Task 3's own verify grep for "no client file imports the seeder." The comment's *meaning* (never import the seeder client-side) is unchanged; only its wording moved to "the expansion seeder service" to stop matching the check's regex. This is a Rule 3 (blocking-issue) auto-fix — the verify command as literally written could not pass otherwise, and rewording a comment carries no behavioral risk.
- No other deviations. All three tasks matched their `<action>` specs; every `<verify>` automated check passed as written (after the one comment reword above).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Reworded a pre-existing comment that false-positived Task 3's verify script**
- **Found during:** Task 3 (final verify grep pass)
- **Issue:** `app/components/CreateGuildModal.tsx` already had a comment reading "never import app/services/expansionSeeder.ts here... registry keys in app/services/expansionSeeder.ts" (from prior PR #274 work, unrelated to this task). Task 3's `<verify>` includes `! grep -nE "services/expansion[S]eeder" ... app/components/CreateGuildModal.tsx ...`, which matches that comment's literal path text even though no import exists.
- **Fix:** Reworded the comment to "never import the expansion seeder service here... Ids must match the seeder's registry keys" — same warning, no literal path substring.
- **Files modified:** app/components/CreateGuildModal.tsx (comment only, 2 lines)
- **Verification:** Re-ran the full Task 3 verify grep chain; all conditions passed (`ALL_GREP_OK`). Re-ran `npm run typecheck` and `npx eslint app/components/CreateGuildModal.tsx` — both clean.
- **Committed in:** dd5b95d4 (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking, Rule 3)
**Impact on plan:** Cosmetic comment change only; no scope creep, no behavior change.

## Issues Encountered

None beyond the deviation documented above.

## Verification Results

- `npm run typecheck` — clean after every task (re-verified at the end): **PASS**
- `npx eslint` on every file in `files_modified` except the `.sql`: **0 errors** (pre-existing warnings only — unused vars, exhaustive-deps, `<img>` LCP hints — none introduced by this task's edits)
- `npx vitest run` (full suite): **1235/1235 tests passed**, 69 test files
- `git log --oneline -3` shows three commits in order — migration only (`b9c1aef7`), server (`0149368f`), client (`dd5b95d4`); `git show --name-only` on each lists only that task's paths (confirmed above)
- Task-level `<verify>` automated checks: all passed, including the structural greps for the migration SQL (Task 1), the "no `=== 'Forever'`" and "game.ts has zero imports" checks (Task 2), and the tile-count / "Game version" / single-`game,`-line / no-em-dash / no-seeder-import checks (Task 3)

## Human-Check List (outstanding, not run by this executor)

Per Task 3's `<human-check>` block — visual/interactive verification at 390px and 1440px, light and dark themes:

1. **Create a guild modal:** Game version tiles are the same size as the Starting expansion tiles, read "WoW Classic" and "WoW Forever" with no subtitles, and toggling hides/reveals the Starting expansion row and its hint; the settings step shows Ruleset for Forever and the summary reads "WoW Forever • PvP (EU) • Horde".
2. **/guild-select/create:** Same behavior, tiles aligned on the 5-column grid, Realm vs Ruleset switches with the game.
3. **Guild settings for a Forever guild:** "Game version" heading over the WoW Forever card with no CURRENT badge, raid schedule and Raid Tiers link intact, Ruleset field in Guild information, no Add expansion grid. For a Classic guild: unchanged except no WoW Forever tile in Add expansion.
4. **Loot list:** Forever guild shows no expansion dropdown and no Viewing Past pill, and the empty state reads "WoW Forever has no raids open yet..."; a Classic guild with 2+ expansions still shows both.
5. **Overview for a new Forever guild:** setup guide has no expansion step.

## Known Stubs

None — no stubs, placeholders, or unwired data introduced by this task.

## Rollout Reminder (from PLAN.md, not yet executed by this session)

Per the plan's `<worktree_metadata>`-adjacent `## Rollout` section, the orchestrator (not this executor) still needs to:

1. Open PR A from the Task 1 commit alone (migration only), merge with `gh pr merge --admin`, and confirm in production that `guilds.game` exists and the backfill ran (e.g. `select game, count(*) from guilds group by 1`).
2. Only after PR A is confirmed live, open PR B (Task 2 + Task 3 commits, rebased onto main so the Task 1 commit drops out as already applied) and merge it.

This executor did not push, open PRs, or merge anything, per its constraints — that is explicitly the orchestrator's job.

## User Setup Required

None — no external service configuration required. (The Rollout sequencing above is a deploy-order requirement, not a manual environment-variable/dashboard setup step.)

## Next Phase Readiness

- All three tasks complete, committed atomically, fully passing typecheck/eslint/vitest.
- Ready for the orchestrator to run the two-PR rollout sequence described above.
- The human-check visual list is the only remaining verification gap before this can be considered fully proven end-to-end.

## Self-Check: PASSED

- All 5 spot-checked created files found on disk in the worktree (migration SQL, domain/expansion/game.ts, domain/expansion/__tests__/game.test.ts, app/api/guilds/__tests__/route.test.ts, app/api/guilds/[id]/expansions/__tests__/route.test.ts)
- All 3 task commit hashes (`b9c1aef7`, `0149368f`, `dd5b95d4`) found in `git log --oneline --all`

---
*Quick task: 260926-lj6*
*Completed: 2026-09-26*

---
phase: quick-261004-u8w
plan: 01
subsystem: api
tags: [raid-events, supabase, service-role, raid-tiers, raid-teams, vitest]

requires:
  - phase: quick-261003-she
    provides: "lib/attendance/guild-attendance-refs.ts pattern (guild-scoped lookups, thrown errors) and finding 8/FU-1 that named this follow-up"
provides:
  - "lib/raid-events/guild-raid-refs.ts: findGuildExpansion, isGuildRaidTeam, resolveGuildRaidTierId shared guild-scoped checks for raid-event creation"
  - "POST /api/raid-events/bonus refuses another guild's/detached/unknown/malformed expansion (C-1) and another guild's/unknown raid team (C-2) before any tier lookup or write, and fails closed (500) on any lookup error including the collision read"
  - "POST /api/raid-events/ensure refuses another guild's/detached/unknown/malformed expansion the same way (OD-1 resolution A) before the team count or any read, and fails closed on the expansion, team-count or tier lookup"
affects: [raid-tracking, attendance, raid-teams]

actuals:
  tokens: 16446
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Guild-scoped reference guard module (lib/raid-events/guild-raid-refs.ts) mirroring lib/loot/guild-award-refs.ts and lib/attendance/guild-attendance-refs.ts: UUID-shape pre-check with no query, every query error thrown (never swallowed), service-role callers stay the only gate"

key-files:
  created:
    - lib/raid-events/guild-raid-refs.ts
    - app/api/raid-events/bonus/__tests__/route.test.ts
    - app/api/raid-events/ensure/__tests__/route.test.ts
  modified:
    - app/api/raid-events/bonus/route.ts
    - app/api/raid-events/ensure/route.ts

key-decisions:
  - "OD-1 resolved A (refuse): ensure returns 400 C-1 for another guild's/detached/unknown/malformed expansion, and 500 for a failed lookup, creating nothing in either case, matching the bonus route and the 261003-she bulk attendance route"
  - "COPY C-1 and C-2 approved as drafted by the user 2026-10-04, no changes"
  - "Orchestrator amendment A1 (was FU-3): ensure's raid-team count lookup now fails closed (500, nothing created) instead of treating a count error as \"no teams\""
  - "Orchestrator amendment A2 (was FU-4): bonus's collision read (the 409 check) now fails closed (500, nothing written) instead of treating a read error as \"no scheduled raid\""

requirements-completed: [U8W-R1, U8W-R2, U8W-R3, DELIVERY-R1]

coverage:
  - id: D1
    description: "Bonus raid events take their tier only from the request guild's own expansion, and raid_team_id only from the guild's own raid team; a detached expansion (guild_id NULL) is refused the same as another guild's"
    requirement: U8W-R1
    verification:
      - kind: unit
        ref: "app/api/raid-events/bonus/__tests__/route.test.ts#B-1 through B-9 (27 tests)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Missing raid days created by ensure take their tier only from the verified expansion; a given expansion not belonging to the guild (foreign, detached, unknown, malformed) is refused (OD-1 A); a failed lookup creates nothing"
    requirement: U8W-R2
    verification:
      - kind: unit
        ref: "app/api/raid-events/ensure/__tests__/route.test.ts#E-1 through E-8 (19 tests)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Sibling raid-team and raid-event routes scanned in code; no unchecked tier/team/event reference found; gaps outside this family listed as follow-ups below"
    requirement: U8W-R3
    verification: []
    human_judgment: true
    rationale: "A negative finding (no change needed) from a manual code scan; nothing to assert mechanically beyond the follow-ups list already recorded"
  - id: D4
    description: "Route tests pass, full suite has no new non-flaky FAIL line against the pre-change baseline, tsc and eslint clean, no em dash anywhere added, three local commits with the trailer, nothing pushed"
    requirement: DELIVERY-R1
    verification:
      - kind: unit
        ref: "npx vitest run app/api/raid-events/bonus app/api/raid-events/ensure (46 tests)"
        status: pass
      - kind: other
        ref: "sh SP/new-fails.sh SP/baseline-u8w-vitest.txt SP/final-u8w-vitest.txt (exit 0)"
        status: pass
      - kind: other
        ref: "npx tsc --noEmit; npx eslint --max-warnings 0 lib/raid-events app/api/raid-events"
        status: pass
    human_judgment: false

duration: 25min
completed: 2026-10-05
status: complete
---

# Phase quick-261004-u8w: Raid event ensure and bonus routes use only the guild's own tiers and teams Summary

**New `lib/raid-events/guild-raid-refs.ts` guard module plus route changes so POST /api/raid-events/bonus and POST /api/raid-events/ensure can only create a raid event with a tier from the verified guild's own expansion (never another guild's, never a detached one), bonus events can only carry that guild's own raid team, and every lookup a route needs fails closed (500, nothing written) instead of silently falling through or treating an error as "not found."**

## Performance

- **Duration:** 25 min
- **Tasks:** 2 (plus one orchestrator-approved fixup commit, folded into Task 1's scope)
- **Files modified:** 5 (1 created module, 2 created test files, 2 modified routes)

## Accomplishments

- `lib/raid-events/guild-raid-refs.ts`: `findGuildExpansion` (expansion scoped to a guild, UUID-shape pre-check, no query on a malformed id), `isGuildRaidTeam` (same pattern for raid teams), and `resolveGuildRaidTierId` (the existing four-step tier fallback chain, reused by both routes, each step throwing on a query error instead of falling through to a different tier).
- `POST /api/raid-events/bonus`: checks the sent expansion and (when present) the sent raid team against the guild right after the permission check and before any tier lookup, the collision read, or the insert. The tier comes only from the verified expansion via the shared fallback chain. The existing-event collision read (the 409 check) now also fails closed.
- `POST /api/raid-events/ensure`: checks a given `expansion_id` against the member's guild right after the membership check and before the raid-team count or any read (OD-1 resolution A). New raid days take their tier only from that verified expansion. The raid-team count lookup now also fails closed.
- 46 new route tests (27 bonus, 19 ensure) with a recording fake Supabase client in the style of `app/api/attendance/bulk/__tests__/route.test.ts`.
- Sibling `app/api/raid-teams/**` routes and the rest of `app/api/raid-events/**` scanned in code; no change needed (finding D-05/6/7 below).

## Request rules per route (as shipped)

### POST /api/raid-events/bonus

Order of checks: 401 Unauthorized -> required-fields 400 -> `raid_date` format 400 -> 403 "Officers only" -> **expansion check** (new) -> **raid-team check** (new, only when `raid_team_id` is neither undefined nor null) -> tier resolution via the shared fallback chain -> 400 "No raid tier configured for this expansion" if none found -> the existing-event collision read -> 409 on a non-bonus collision -> insert -> 500 on an insert error -> `logAudit` -> 200 `{ event }`.

- An expansion whose `guild_id` is not the verified guild, or whose `guild_id` is NULL (detached, from a deleted guild per `20261004020000_delete_guild_with_reserve_runs.sql`), or an unknown or malformed `expansion_id`, returns 400 `{ error: "This expansion isn't in this guild. Refresh the page, then try again." }` (COPY C-1) with no further lookup or write.
- A `raid_team_id` that is not a raid team of the verified guild (another guild's, unknown, empty string, or malformed) returns 400 `{ error: "This raid team isn't in this guild. Refresh the page, then try again." }` (COPY C-2) with no further lookup or write. `raid_team_id` absent or null is unchanged (no team check, inserted as null).
- Any lookup error (expansion, raid team, tier, or the collision read) returns 500 `{ error: "Internal server error" }` with nothing written.
- Every previously existing response (403, the two pre-existing 400s, 409, the insert 500, 200) is unchanged in wording and status code.

### POST /api/raid-events/ensure

Order of checks: 401 Unauthorized -> "guild_id and dates are required" 400 -> "No characters found" 403 -> "Not a member of this guild" 403 -> **expansion check** (new, only when `expansion_id` is truthy; absent/null/empty string still mean "create nothing" and skip the check) -> raid-team count lookup (now fails closed) -> existing-events read -> the team schedule filter (unchanged, including its own 404 and its own guild-scoped expansion read) -> tier resolution via the shared fallback chain (only when there are new dates, a verified expansion, and team-count allows creation) -> insert -> reload -> 200 `{ events }`.

- Per OD-1 (resolved A, "refuse"): an expansion whose `guild_id` is not the verified guild, is NULL (detached), or an unknown or malformed `expansion_id`, returns 400 `{ error: "This expansion isn't in this guild. Refresh the page, then try again." }` (COPY C-1) with no raid-team count lookup, no existing-events read, and nothing created.
- Any lookup error (expansion check, raid-team count, or tier resolution) returns 500 `{ error: "Internal server error" }` with nothing created.
- The team check (404 "Raid team not found in this guild") and the `{ events }` response shape are unchanged.
- The "no tier found" log line changed from a tainted format string (`` `No raid tier found for expansion ${expansion_id}, phase ${currentPhase}` ``, CodeQL-flagged) to a constant first argument: `console.error('No raid tier found for expansion:', { expansion_id, phase })`.

## OD-1 resolution and COPY as shipped

- **OD-1:** Option A (refuse), chosen by the user, 2026-10-04. `/api/raid-events/ensure` refuses the whole request (400 C-1, or 500 on a failed lookup) rather than silently creating nothing but still returning 200. This matches the bonus route and the 261003-she bulk attendance route's fail-closed pattern.
- **COPY sign-off:** 2026-10-04, user approved C-1 and C-2 exactly as drafted:
  - C-1: "This expansion isn't in this guild. Refresh the page, then try again."
  - C-2: "This raid team isn't in this guild. Refresh the page, then try again."

## Investigation findings (1-9, from planning, verified unchanged in execution)

1. Bonus previously read the body's `expansion_id` with no guild filter and ignored tier-lookup errors (falling through to the next fallback step); `raid_team_id` went unchecked into the collision read, the insert, and the audit row. Fixed.
2. Ensure's creation branch previously read the body's `expansion_id` with no guild filter and ran the same four-step chain with ignored errors. The existing team check (404) and its own guild-scoped expansion read for the schedule filter were already correct and are unchanged.
3. Callers: ensure from `raid-tracking/_client.tsx` and `AttendanceContent.tsx`; bonus from `_client.tsx`'s bonus modal. Nothing in the Discord bot, companion, addon, or scripts calls either route.
4. Every page already sends one of the guild's own expansions, via `get_guild_expansions` (guild-scoped) or `guilds.active_expansion_id` (server-set to the guild's own expansion). The one exception is the moment right after a guild switch, which OD-1's resolution now handles safely (refuses instead of creating with a stale expansion).
5. Detached expansions (`guild_id` NULL) keep their raid tiers and loot items but are never listed in the app; `findGuildExpansion`'s `eq('guild_id', guildId)` filter means a NULL `guild_id` never matches, so they are refused the same as another guild's expansion.
6. `app/api/raid-teams/route.ts`, `[id]/route.ts`, and `[id]/members/route.ts` were scanned: every write is already scoped to the calling team or guild; no unchecked-reference pattern found.
7. `app/api/raid-events/route.ts` (the old create route) no longer exists (removed by 261003-she); `app/api/raid-events` now holds only `ensure` and `bonus`.
8. Outside this family (follow-ups, see below): `raid_events` INSERT/UPDATE RLS policies check only `is_guild_officer(guild_id)`, not the tier/team references; ensure's and bonus's other lookups (raid-team count, collision read) previously fell open on error, now fixed closed by amendments A1 and A2 below, so this finding no longer applies to those two lookups; the raid-tracking page load has no guard against a stale run (from a previous guild/expansion/team) finishing last.
9. Baselines at `4484e9b0`: `npx eslint app/api/raid-events` exits 0 with no warnings; neither route had tests; the full suite takes about 5-9 minutes depending on concurrent worktree load.

## Orchestrator amendments applied (2026-10-04, user-approved)

- **A1** (was FU-3): ensure's raid-team count lookup (`select('id', { count: 'exact', head: true })`) now checks its `error` and throws, reaching the outer `catch` for a 500 with nothing created, instead of silently treating a failed count as "no teams" (which could create unassigned raid days). Covered by test `E-6 (OD-1 A, A1)`.
- **A2** (was FU-4): bonus's existing-event collision read (the 409 check) now checks its `error` and returns 500 "Internal server error" with nothing written, instead of silently treating a failed read as "no scheduled raid" (which would write a duplicate). Covered by test `B-8 (A2)`.
- Both are recorded as done, not as follow-ups, in this SUMMARY and in the PR body.

## Test counts

- `app/api/raid-events/bonus/__tests__/route.test.ts`: 27 tests (B-1 through B-9, including the A2 collision-read-error test).
- `app/api/raid-events/ensure/__tests__/route.test.ts`: 19 tests (E-1 through E-8, including the A1 team-count-error test).
- Combined: 46 tests, all passing.

## Baseline vs. final results

| Check | Baseline (`4484e9b0`) | Final (after 3 commits) |
|---|---|---|
| `npx vitest run` (full suite) | 13 failed test files / 26 failed tests / 192 passed files / 3513 passed tests; exit 1 | 2 failed test files / 2 failed tests / 205 passed files / 3583 passed tests; exit 1 |
| `sh SP/new-fails.sh` | n/a | exit 0. 2 NEW FAIL lines (`__tests__/arbitrary-text-sizes.test.ts`, `__tests__/hand-rolled-cards.test.ts`), both reported **FLAKY** (pass alone, timeouts under concurrent worktree load, unrelated to this change's files). Errors: baseline 0, final 0. Test Files total: baseline 205, final 207 (no drop). |
| `npx tsc --noEmit` | exit 0 | exit 0 |
| `npx eslint --max-warnings 0 lib/raid-events app/api/raid-events` | exit 0, no warnings | exit 0, no warnings |

No new real (non-flaky) test failure was introduced by this change.

## Task Commits

1. **Task 1 (tracer): bonus raid days use only the guild's own tiers and teams** - `bc16f6a1` (fix): guard module, bonus route, bonus route tests (26 tests at this point).
2. **Fixup (orchestrator amendment A2): bonus raid days stop when the collision check fails** - `29c5c410` (fix): added the collision-read error check and its test (27 tests total for bonus).
3. **Task 2: missing raid days are created only with the guild's own tiers** - `74b2997a` (fix): ensure route (including amendment A1) and ensure route tests (19 tests).

All three commits end with the trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Nothing was pushed; no PR was opened; no GitHub issue was filed.

## Files Created/Modified

- `lib/raid-events/guild-raid-refs.ts` - new guard module: `findGuildExpansion`, `isGuildRaidTeam`, `resolveGuildRaidTierId`, and the two COPY constants.
- `app/api/raid-events/bonus/route.ts` - expansion/team checks before the tier lookup; tier resolution via the shared module; collision read fails closed (A2).
- `app/api/raid-events/bonus/__tests__/route.test.ts` - new, 27 tests.
- `app/api/raid-events/ensure/route.ts` - expansion check before the team count (OD-1 A); tier resolution via the shared module; team-count lookup fails closed (A1); tainted log line fixed.
- `app/api/raid-events/ensure/__tests__/route.test.ts` - new, 19 tests.

## PR body draft

Path: `/private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/d08e3d4d-0791-40f5-b5d0-31ab44981efd/scratchpad/pr-body-u8w.md` (unpushed, no PR opened; title, Summary, Changes, Tests, Deploy, and Rollback sections, ending with the Claude Code attribution line; no em dash).

## Handoff notes

None. No `SP/u8w-handoff.txt` was created. The plan's context-budget trigger for writing one ("if context runs long after Task 1") was never reached; both tasks, the orchestrator-approved A2 fixup, and full verification completed in a single pass.

## Decisions Made

- OD-1 resolved A (refuse) and COPY C-1/C-2 approved as drafted, both recorded above, both user decisions from 2026-10-04 per the plan's own Resolution column and SIGN-OFF line, applied as given.
- Orchestrator amendments A1 and A2 applied as specified, each with its own test, and recorded as done (not follow-ups) per the amendment's own instruction.

## Deviations from Plan

None beyond the plan's own pre-approved ORCHESTRATOR AMENDMENT (A1, A2), which the plan explicitly names as already user-approved and instructs to apply and record as done rather than as a follow-up. No Rule 1-4 deviations were needed: the plan's own action steps, as written, produced passing tests, clean tsc/eslint, and no new real test failures on the first implementation pass.

## Known Stubs

None. No hardcoded empty values, placeholder text, or unwired data sources were introduced.

## Follow-ups (neutral wording, stated as the rule to adopt)

- **FU-1:** The `raid_events` INSERT/UPDATE rules in the database should require `raid_tier_id` to be a tier of an expansion of the row's guild and `raid_team_id` a team of the row's guild (as `enforce_loot_history_guild_refs` does for loot history), checking only changed columns so existing rows stay writable.
- **FU-2:** Before adding FU-1, count (read-only, aggregate) the raid events whose tier is not from an expansion of their own guild or whose team is not of their own guild.
- **FU-5:** The raid-tracking page load should ignore the result of a run started for a previous guild, expansion, or team.

(FU-3 and FU-4 from the original plan are no longer follow-ups. They were applied in this execution as orchestrator amendments A1 and A2, described above.)

## Issues Encountered

None. The full-suite baseline and final runs both showed pre-existing, load-related test timeouts unrelated to this change's files (13 FAIL test files at baseline, 2 at final, both confirmed FLAKY by `new-fails.sh`'s pass-alone re-run), consistent with the orchestrator's note that some tests time out under concurrent worktree load.

## User Setup Required

None - no external service configuration required. App-only change; no migration, no SQL, no client (web, addon, companion, Discord bot) change.

## Next Phase Readiness

This closes follow-up FU-1 of quick task 261003-she (finding 8). The three follow-ups above (FU-1, FU-2, FU-5) remain open and are candidates for a future quick task. No blockers for other in-flight work.

---
*Phase: quick-261004-u8w*
*Completed: 2026-10-05*

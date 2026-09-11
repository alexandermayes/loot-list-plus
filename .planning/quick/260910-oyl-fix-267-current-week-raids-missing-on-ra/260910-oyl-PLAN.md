---
phase: quick-260910-oyl
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - domain/raid-team/pick-schedule-source.ts
  - domain/raid-team/settings.ts
  - domain/raid-team/index.ts
  - domain/raid-team/__tests__/pick-schedule-source.test.ts
  - app/api/raid-events/ensure/route.ts
  - domain/raid-team/select-default-team.ts
  - domain/raid-team/__tests__/select-default-team.test.ts
  - app/hooks/useRaidTeam.ts
  - app/(app)/raid-tracking/_client.tsx
autonomous: true
requirements:
  - GH-267

estimate:
  tokens: 66000
  raw_tokens: 33000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "In a guild whose raid schedule lives on its `expansions` row, POST /api/raid-events/ensure with a `raid_team_id` no longer discards the client's scheduled dates, so the current week's raid days are created and appear on Raid Tracking (GH-267 Path A)"
    - "`pickScheduleSource` resolves the same precedence the Raid Tracking client already uses: the guild's expansions row wins when its `raid_days_per_week` is set, otherwise guild_settings, otherwise nothing"
    - "An officer of a team guild who has never chosen a team is placed on a team automatically (the `is_default` team, else the first team in sort order), so ensure is called with a `raid_team_id` and the current week gets created (GH-267 Path B)"
    - "An officer who deliberately chooses All teams stays on All teams across reloads and page navigations"
    - "The Raid Tracking All-teams banner states that the view creates no new raid events, instead of claiming new events are created without a team"
    - "`npm run typecheck`, `npm run lint`, and `npx vitest run domain/raid-team app/hooks` all pass"
  artifacts:
    - domain/raid-team/pick-schedule-source.ts (pure expansion-first schedule source resolution)
    - domain/raid-team/__tests__/pick-schedule-source.test.ts
    - domain/raid-team/select-default-team.ts (pure team selection resolution + all-teams sentinel)
    - domain/raid-team/__tests__/select-default-team.test.ts
    - app/api/raid-events/ensure/route.ts (team schedule filter resolved expansion-first)
    - app/hooks/useRaidTeam.ts (default team auto-selection, persisted All-teams choice)
    - app/(app)/raid-tracking/_client.tsx (corrected All-teams banner copy)
  key_links:
    - "The ensure route's server-side schedule filter must resolve the same day set the client used to build `dates`. If it resolves a different day set, every candidate date is dropped and no event is created, which is the GH-267 Path A failure mode introduced by PR #249."
    - "`getStoredTeamId` returning null must mean 'no record for this guild' and nothing else. The explicit All-teams choice therefore needs its own persisted sentinel value rather than a removed localStorage key, or auto-selection would override a deliberate choice on every reload."
    - "The existing URL-sync effect in useRaidTeam already pushes `activeTeamId` into the `team` search param, so the auto-selected team reaches the URL with no new effect."
    - "`domain/raid-team/index.ts` is star-exported by `domain/index.ts`. `RaidDaySettings` must stay exported from exactly one module or the barrel produces an ambiguous re-export."
    - "`expansions` rows are per guild (`get_guild_expansions` filters `e.guild_id = p_guild_id`), so the route's new expansions lookup can and must be scoped by `guild_id` as well as `id`."
---

<objective>
Fix GitHub issue #267, "Missing Raid tracking for this week." An officer of a Tue/Thu
team guild sees Coming up, then Last week, then the week before, with the current week's
raid days absent entirely. Two independent, already-diagnosed defects produce that exact
symptom, and production data could not identify which one hit the reporter, so both get
fixed.

Path A, server and client disagree about where the raid schedule lives. Raid Tracking's
`generateRaidDates()` resolves the schedule from the guild's `expansions` row first and
falls back to `guild_settings`. Since PR #249, the ensure route re-filters every candidate
date server side using days read only from `guild_settings`. When a guild's schedule lives
on the expansion row, the server filter drops dates the client legitimately generated and
creates nothing. The schema makes this concrete: `expansions` defaults to days 2 and 4
(Tue/Thu) while `guild_settings` defaults to days 2 and 1 (Tue/Mon), and a missing
`guild_settings` row drops every date.

Path B, a team guild viewed as All teams. Commit 3606607 made ensure refuse to auto-create
unassigned events once a guild has any raid team. `useRaidTeam()` resolves the active team
as URL param, then localStorage, then null. So the moment an officer creates their first
team, if they never explicitly pick one, every page load runs as All teams and the current
week is never created, while older weeks keep showing because they predate the team.

Purpose: restore the current week on Raid Tracking for team guilds, and stop the All-teams
banner from describing behavior that has not existed since 3606607.
Output: two pure, unit-tested resolution functions in `domain/raid-team/`, the ensure route
and the team hook wired to them, and honest banner copy.

Tracer-first decomposition does not apply. These are two independent defects plus a copy
correction inside an already-shipped end-to-end path, not layers of one new capability, so
each task is a self-contained `auto` fix with its own atomic commit.

Commit trailer note: the invoking brief named the trailer
`Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`, while this environment's
current attribution guidance specifies
`Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. The executor must
use whichever trailer its own attribution guidance specifies at execution time, and must
not omit the trailer.
</objective>

<execution_context>
@/Users/alexander.mayes/Code/personal/loot-list-plus/.claude/gsd-core/workflows/execute-plan.md
@/Users/alexander.mayes/Code/personal/loot-list-plus/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.claude/CLAUDE.md

# Task 1 source
@app/api/raid-events/ensure/route.ts
@domain/raid-team/settings.ts
@domain/raid-team/schedule-history.ts
@domain/raid-team/types.ts
@domain/raid-team/index.ts

# Task 2 source
@app/hooks/useRaidTeam.ts

# The two client callers whose behavior the server must match (read, do not edit in tasks 1 and 2)
@app/(app)/raid-tracking/_client.tsx
@app/(app)/attendance/components/AttendanceContent.tsx

# Test convention reference for this domain
@domain/raid-team/__tests__/settings.test.ts
</context>

<interface_context>
Shapes the executor must preserve exactly.

`RaidDaySettings` is currently a non-exported interface at the top of
`domain/raid-team/settings.ts`:

  { raid_days_per_week: number, first_raid_day: number | null, second_raid_day: number | null,
    third_raid_day: number | null, fourth_raid_day: number | null, fifth_raid_day: number | null }

`resolveRaidDays(guildSettings: RaidDaySettings, teamOverride: RaidDaysOverride | null | undefined): number[]`
merges the override over the base with a spread, slices the five day fields to
`raid_days_per_week`, and drops nulls. A base whose `raid_days_per_week` is 0 therefore
yields `[]` unless the team override supplies its own count.

`isDateScheduled(dateString, dayOfWeek, currentRaidDays, scheduleHistory)` returns
`currentRaidDays.includes(dayOfWeek)` when history is null or empty, otherwise consults
the latest history entry whose `effective_from <= dateString`.

Client precedence that the server must mirror, from
`app/(app)/raid-tracking/_client.tsx` line 390:
`const raidScheduleSource = expansion?.raid_days_per_week != null ? expansion : settings`.
Note the guard is on the expansion's `raid_days_per_week` alone, so a non-null expansion
count wins even when guild_settings is fully populated, and a null expansion count falls
through to guild_settings even when guild_settings is itself empty.

The `expansions` table carries `id, guild_id, raid_days_per_week, first_raid_day,
second_raid_day, third_raid_day, fourth_raid_day, fifth_raid_day` plus unrelated columns.
`guilds.active_expansion_id` names the guild's current expansion.

`RaidTeam` from `domain/raid-team/types.ts` carries `id, guild_id, name, color_hex,
is_default, sort_order, raid_days_override, rolling_weeks_override, schedule_history,
created_at, updated_at`. The hook already loads teams ordered by `sort_order` ascending
then `created_at` ascending, so `teams[0]` is the first team in display order.

`useRaidTeam()` returns `{ activeTeamId, activeTeam, teams, hasTeams, isPro, loading,
setTeam, resolvedRollingWeeks, resolvedRaidDays }`. That return shape must not change.

`domain/raid-team/index.ts` currently star-exports `./types`, `./settings`, and
`./schedule-history`, and `domain/index.ts` star-exports `./raid-team`.
</interface_context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Resolve the ensure route's team schedule from the expansion first (GH-267 Path A)</name>
  <files>domain/raid-team/pick-schedule-source.ts, domain/raid-team/settings.ts, domain/raid-team/index.ts, domain/raid-team/__tests__/pick-schedule-source.test.ts, app/api/raid-events/ensure/route.ts</files>
  <precondition>`node_modules/vitest` exists (dependencies installed). Halt and report if absent, since every gate in this task runs vitest or tsc.</precondition>
  <behavior>
Unit tests for `pickScheduleSource`, written before the route is touched:
- Returns the expansion's six schedule fields when the expansion row's `raid_days_per_week` is not null, even when a fully populated guild_settings row is also supplied.
- The GH-267 regression case: expansion configured Tue/Thu (days 2 and 4, count 2) plus guild_settings configured Tue/Mon (days 2 and 1, count 2) feeds `resolveRaidDays(result, null)` and yields the expansion's two days, not the guild_settings days.
- Falls back to guild_settings when the expansion row exists but its `raid_days_per_week` is null.
- Falls back to guild_settings when the expansion row is null (absent).
- Returns null when both rows are null.
- A guild_settings row whose `raid_days_per_week` is null produces a result that feeds `resolveRaidDays` to an empty array, matching today's behavior for an unconfigured guild.
- The returned object exposes only the six schedule fields, so extra columns present on a real expansion row (for example `current_phase`, `timezone`, `id`, `guild_id`) are not carried through.
  </behavior>
  <action>
Create `domain/raid-team/pick-schedule-source.ts`.

First, in `domain/raid-team/settings.ts`, add the `export` keyword to the existing
`RaidDaySettings` interface and nothing else in that file. Do not re-export the type from
the new module: `domain/raid-team/index.ts` star-exports both files and `domain/index.ts`
star-exports that barrel, so a second export of the same name would be an ambiguous
re-export. The new module imports it with `import type { RaidDaySettings } from './settings'`.

In the new module define and export a single function
`pickScheduleSource(expansion, guildSettings)`. Both parameters accept a partial,
nullable row shape: an object that may carry `raid_days_per_week` plus the five
`first_raid_day` through `fifth_raid_day` fields, each `number | null | undefined`, or
`null` when the row does not exist. Declare that parameter shape as an exported interface
named `RaidScheduleRow` so both callers and tests can name it. The return type is
`RaidDaySettings | null`.

Resolution rules, which must mirror the client guard quoted in `<interface_context>`
exactly:
1. If `expansion` is non-null and its `raid_days_per_week` is neither null nor undefined,
   normalize the expansion row and return it.
2. Otherwise, if `guildSettings` is non-null, normalize the guild_settings row and return
   it. Do this even when its own `raid_days_per_week` is null, because that is what the
   client does.
3. Otherwise return null.

Normalization builds a fresh object carrying only the six `RaidDaySettings` fields.
Coerce a null or undefined `raid_days_per_week` to 0 so the result still satisfies
`RaidDaySettings`; `resolveRaidDays` then yields an empty array, which is the behavior an
unconfigured guild already gets today. Coerce each undefined day field to null.

Write a JSDoc header on the module and on the function, in the voice of
`domain/raid-team/settings.ts`. The function comment must record why the precedence
exists: Raid Tracking generates its candidate dates from the expansion row first, so any
server-side recheck that reads a different source silently discards legitimate dates and
creates no events, which is GH-267. Reference the issue number.

Add `export * from './pick-schedule-source'` to `domain/raid-team/index.ts`.

Write `domain/raid-team/__tests__/pick-schedule-source.test.ts` covering every case in
`<behavior>`, following the conventions in `domain/raid-team/__tests__/settings.test.ts`:
explicit named imports from vitest, one `describe` per function, `it` names that state
the rule rather than the mechanics, and a short comment above any test whose reason is not
obvious from its name.

Then rewrite the team schedule filter in `app/api/raid-events/ensure/route.ts`, the block
guarded by `if (raid_team_id && newDates.length > 0)` around line 100.

Before the existing `Promise.all`, resolve the expansion id to read. Use the request
body's `expansion_id` when present. When it is absent, read `active_expansion_id` from the
`guilds` row for `guild_id` with a `maybeSingle()` select. Add a short comment stating that
this fallback is defensive: both current clients always send `expansion_id`, and the
creation branch below requires it, but the filter's schedule source should be resolvable
from the guild's active expansion on its own so the two stop being able to disagree.

Extend the `Promise.all` to three queries. Keep the existing `raid_teams` query and the
existing `guild_settings` query exactly as they are. Add a third that selects
`raid_days_per_week, first_raid_day, second_raid_day, third_raid_day, fourth_raid_day,
fifth_raid_day` from `expansions`, filtered by `.eq('id', resolvedExpansionId)` AND
`.eq('guild_id', guild_id)`, with `maybeSingle()`. The `guild_id` filter is mandatory:
this is a service role client that bypasses RLS, and `expansion_id` is attacker-controlled
request input. Skip the query entirely and treat the row as null when the resolved
expansion id is falsy.

Replace the line that computes `teamDays` from `guild_settings` alone. Call
`pickScheduleSource(expansionRow, gs)`; when it returns null, `teamDays` is an empty array,
preserving today's behavior when neither row exists. Otherwise pass its result to
`resolveRaidDays` together with `team.raid_days_override`, exactly as today. Leave the
`isDateScheduled` filter, the team-not-found 404, and everything below untouched.

Update the block comment above that filter so it still explains the phantom-event problem
from GH-248 that the filter exists for, and adds one sentence recording that the source of
the base schedule is resolved expansion-first to match the client, per GH-267.

Commit only these five files, with the message
`fix(raid-events): resolve team schedule from the expansion first in ensure (#267)` plus
the attribution trailer described in the objective.
  </action>
  <verify>
    <automated>npx vitest run domain/raid-team</automated>
    <automated>npm run typecheck</automated>
    <automated>grep -v '^[[:space:]]*[/*]' app/api/raid-events/ensure/route.ts | grep -c 'pickScheduleSource'</automated>
    <automated>grep -v '^[[:space:]]*[/*]' app/api/raid-events/ensure/route.ts | grep -c "eq('guild_id', guild_id)"</automated>
  </verify>
  <done>
`npx vitest run domain/raid-team` passes with strictly more than the 47 tests that passed
before this task. `npm run typecheck` exits 0. The `pickScheduleSource` count gate returns
at least 2 (the import and the call site). The `guild_id` scoping gate returns at least 4,
covering the pre-existing membership, raid_teams, and guild_settings filters plus the new
expansions filter. The regression test proves that an expansion configured Tue/Thu beats a
guild_settings row configured Tue/Mon.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Auto-select a default team and persist an explicit All-teams choice (GH-267 Path B)</name>
  <files>domain/raid-team/select-default-team.ts, domain/raid-team/index.ts, domain/raid-team/__tests__/select-default-team.test.ts, app/hooks/useRaidTeam.ts</files>
  <behavior>
Unit tests for the pure selection logic, written before the hook is touched:
- `pickDefaultTeam` returns the team whose `is_default` is true when one exists, even when it is not first in the array.
- `pickDefaultTeam` returns the first team when no team is marked default, since the hook already loads teams in display order.
- `pickDefaultTeam` returns null for an empty array.
- `resolveTeamSelection` returns the URL param when one is present, ahead of both a stored id and the default team.
- `resolveTeamSelection` returns null when the URL param is the all-teams sentinel.
- `resolveTeamSelection` returns null when the stored value is the all-teams sentinel, even though teams exist, because that records a deliberate choice.
- `resolveTeamSelection` returns the stored id when it matches a team that still exists.
- `resolveTeamSelection` returns the default team's id when there is no stored record at all and teams exist.
- `resolveTeamSelection` returns the first team's id when there is no stored record and no team is marked default.
- `resolveTeamSelection` returns the default team's id when the stored id names a team that no longer exists, so a deleted team does not strand the officer on All teams.
- `resolveTeamSelection` returns null when there are no teams, whatever the stored value.
  </behavior>
  <action>
Create `domain/raid-team/select-default-team.ts` exporting three things.

`ALL_TEAMS_SENTINEL`, a string constant with the value `all`. Its JSDoc must state that it
is the persisted marker for a deliberate All-teams choice, and that it exists because an
absent localStorage record has to keep meaning "never chose" for auto-selection to be safe.
Note that no team id can collide with it because team ids are UUIDs.

`pickDefaultTeam(teams: RaidTeam[]): RaidTeam | null`, returning the first team whose
`is_default` is true, else the first element, else null.

`resolveTeamSelection(input: { urlParam: string | null | undefined, stored: string | null |
undefined, teams: RaidTeam[] }): string | null`, applying, in order: an all-teams sentinel
in the URL param yields null; any other non-empty URL param is returned as-is; an empty
teams array yields null; a stored sentinel yields null; a stored id that matches a team in
`teams` is returned; anything else falls through to `pickDefaultTeam(teams)?.id ?? null`.

Give the module a JSDoc header recording the rule this encodes: in a guild that has teams,
the ensure route refuses to create unassigned events (commit 3606607), so an officer left
on All teams by default never gets the current week created at all. Reference GH-267.

Add `export * from './select-default-team'` to `domain/raid-team/index.ts`.

Write `domain/raid-team/__tests__/select-default-team.test.ts` covering every case in
`<behavior>`. Follow `domain/raid-team/__tests__/settings.test.ts` conventions, and add a
local `team(overrides)` factory helper that returns a complete `RaidTeam` with sensible
defaults, matching the codebase's factory-helper convention for test fixtures.

Then wire `app/hooks/useRaidTeam.ts`. Import `resolveTeamSelection` and
`ALL_TEAMS_SENTINEL` from `@/domain/raid-team/select-default-team`.

Change `storeTeamId(guildId, teamId)` so it always writes a record for the guild. When
`teamId` is a string it stores that id, as today. When `teamId` is null it stores
`ALL_TEAMS_SENTINEL` as the `teamId` field instead of clearing the key, so the record now
distinguishes a deliberate All-teams choice from no choice at all. Keep the existing
`typeof window` guard, the `STORAGE_KEY`, the JSON shape `{ guildId, teamId }`, and the
swallowing try/catch untouched.

Leave `getStoredTeamId` behavior as is. It already returns `parsed.teamId` on a guild match
and null otherwise, so it now returns the sentinel for a persisted All-teams choice and null
for no record, which is exactly the input `resolveTeamSelection` expects. Update its JSDoc
or add a one-line comment stating that a null return means "no record for this guild" and
must not be conflated with an All-teams choice.

Replace the body of the `resolvedTeamId` `useMemo` with a single call to
`resolveTeamSelection({ urlParam: teamIdParam, stored: guildId ? getStoredTeamId(guildId) :
null, teams })`. Keep the dependency array as `[teamIdParam, guildId, teams]`. Do not add
an effect, do not call `setTeam` from the memo, and do not persist the auto-selected team:
auto-selection stays derived so that it never masquerades as a user choice. The existing
effect that pushes `activeTeamId` into the `team` search param already carries the
auto-selected team into the URL.

Update the hook's top-level JSDoc, which currently states the priority as
"URL param > localStorage > null (All teams)", to describe the new rule: URL param, then a
stored choice including a stored All-teams choice, then the guild's default team when the
guild has teams and the officer has never chosen, then null.

Add a short comment at the `resolvedTeamId` memo recording the one-time migration effect:
officers who chose All teams before this change have no stored record, are indistinguishable
from officers who never chose, and will be auto-selected onto a team once. Re-choosing All
teams then persists.

Do not change the `UseRaidTeamResult` shape, the teams fetch effect, the URL-sync effect,
`setTeam`'s URL handling, or the two resolver callbacks.

Commit only these four files, with the message
`fix(raid-teams): default to a team instead of All teams when none was chosen (#267)` plus
the attribution trailer described in the objective.
  </action>
  <verify>
    <automated>npx vitest run domain/raid-team app/hooks</automated>
    <automated>npm run typecheck</automated>
    <automated>grep -v '^[[:space:]]*[/*]' app/hooks/useRaidTeam.ts | grep -c 'resolveTeamSelection'</automated>
    <automated>grep -v '^[[:space:]]*[/*]' app/hooks/useRaidTeam.ts | grep -c 'ALL_TEAMS_SENTINEL'</automated>
  </verify>
  <done>
`npx vitest run domain/raid-team app/hooks` passes, including the new
`select-default-team` suite. `npm run typecheck` exits 0. Both wiring gates return at least
2 (import plus use). The hook still returns the same nine-key object. `app/hooks` matching
no test files is expected and does not fail the run, since the pure logic under test lives
in `domain/raid-team`.
  </done>
</task>

<task type="auto">
  <name>Task 3: Correct the All-teams banner so it describes what the view actually does</name>
  <files>app/(app)/raid-tracking/_client.tsx</files>
  <action>
In `app/(app)/raid-tracking/_client.tsx`, find the single `Alert variant="warning"` block
rendered when `hasTeams && !activeTeamId && activeTab === 'tracking'`, around line 2501.
Replace the text inside its `AlertDescription` with exactly this sentence, and change
nothing else in the file:

No team selected. Raid events are only created for a selected team, so this view shows
existing events but will not add new raid days. Select a team above to track this week.

Render it as a single continuous sentence group in the JSX; line wrapping in the source is
fine, but the rendered text must match the copy above word for word, including punctuation.
No em dashes.

Update the short JSX comment directly above the block so it names why the warning exists
rather than only who sees it: since commit 3606607 the ensure route refuses to create
unassigned events in a guild that has teams, so the All-teams view is read-only for event
creation. Reference GH-267.

Leave the `Alert` variant, the render condition, the component imports, and every other
line of the file untouched. In particular do not modify `generateRaidDates` in this task;
its expansion-first precedence already matches what task 1 taught the server, and the
shared `pickScheduleSource` helper is the definition a later client refactor can adopt.

Commit only this file, with the message
`fix(raid-tracking): describe what All teams view actually does (#267)` plus the
attribution trailer described in the objective.
  </action>
  <verify>
    <automated>grep -c 'Raid events are only created for a selected team' "app/(app)/raid-tracking/_client.tsx"</automated>
    <automated>grep -c 'will be unassigned' "app/(app)/raid-tracking/_client.tsx"</automated>
    <automated>npm run typecheck</automated>
    <automated>npm run lint</automated>
  </verify>
  <done>
The first gate returns 1. The second gate returns 0, proving the stale claim is gone.
`npm run typecheck` and `npm run lint` both exit 0. `git diff HEAD~1 --stat` shows exactly
one file changed.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| browser to POST /api/raid-events/ensure | `guild_id`, `dates`, `expansion_id`, and `raid_team_id` are attacker-controlled JSON. The handler runs a service role Supabase client that bypasses RLS. |
| browser localStorage to useRaidTeam | The stored `{ guildId, teamId }` record is user-writable and is read back to decide which team the UI scopes to. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-QUICK-01 | Information Disclosure | new `expansions` lookup in app/api/raid-events/ensure/route.ts | medium | mitigate | The select is scoped `.eq('id', resolvedExpansionId).eq('guild_id', guild_id)`, so a forged `expansion_id` cannot read another guild's schedule row. Only the six schedule columns are selected, and none of them are echoed in the response body. |
| T-QUICK-02 | Tampering | ensure route event creation path | medium | mitigate | Widening the schedule source must not widen what can be created. The pre-existing membership check, the `raid_teams` lookup scoped by `guild_id`, the `isDateScheduled` recheck against the team's `schedule_history`, and the `allowCreate` guard from 3606607 all stay exactly as they are. The only change is which row supplies the base day set. |
| T-QUICK-03 | Spoofing | localStorage team record | low | accept | A user editing their own localStorage can only name a team id; `resolveTeamSelection` discards any id not present in the `teams` array the guild's own Pro-gated query returned, and every downstream query is still RLS-scoped. The stored value is not a credential and is already stored today. |
| T-QUICK-04 | Denial of Service | ensure route extra round trips | low | accept | The team-filter branch gains one parallel `expansions` select, and a `guilds` select only on the rare path where `expansion_id` is absent. Both are indexed primary-key or foreign-key lookups inside an already multi-query handler, and they run only when `raid_team_id` is set and new dates exist. |
| T-QUICK-05 | Information Disclosure | GH-267 artifacts | low | accept | No guild name, character name, or user id appears in any file this plan writes. The reporter's guild was never identified, so nothing identifying can leak into the commit history. |
| T-QUICK-SC | Tampering | npm/pip/cargo installs | low | accept | This plan installs no packages and adds no dependencies, so the package legitimacy gate does not apply. An executor that finds itself needing an install must stop and escalate rather than install. |
</threat_model>

<verification>
Run from the repo root after all three tasks:

1. `npx vitest run domain/raid-team app/hooks` passes, with strictly more tests than the
   47 that passed before this plan.
2. `npm run typecheck` exits 0.
3. `npm run lint` exits 0.
4. `git log --oneline -3` shows exactly three commits, each referencing #267, each
   touching only its own declared files, each carrying the attribution trailer.
5. `git status --short` shows no edits to `supabase/migrations/`, `utils/supabase/`,
   `scripts/analytics/`, `.planning/phases/`, or `README.md`.
6. `grep -rn 'guild_settings' app/api/raid-events/ensure/route.ts` still shows the
   guild_settings query, proving the fallback source was widened rather than swapped.
7. Human check, non-blocking, recorded in the SUMMARY rather than gating the commits: on
   Raid Tracking in a team guild, a first load with no `team` param lands on a team, the
   URL gains `?team=`, and the current week's scheduled dates render. Choosing All teams
   then reloading stays on All teams and shows the corrected banner.
</verification>

<success_criteria>
- The ensure route and the Raid Tracking client resolve the same base raid schedule for a
  given guild and expansion, so a guild configured on its expansion row can no longer have
  every candidate date silently discarded server side.
- An officer of a team guild who has never picked a team is placed on one automatically,
  so the current week is created on the next page load.
- An officer who picks All teams on purpose stays there across reloads.
- The All-teams banner no longer claims that new raid events are created unassigned.
- Three atomic commits exist, each naming GH-267.
- No database schema, migration, RLS policy, or Supabase client file was touched.
</success_criteria>

<output>
Create `.planning/quick/260910-oyl-fix-267-current-week-raids-missing-on-ra/260910-oyl-SUMMARY.md` when done.

Record in it:
- The deploy note for affected officers: after this ships, the current week appears on the
  next page load because the auto-selected team makes ensure run for that team. Past weeks
  in the auto-selected team view show only events assigned to that team; unassigned older
  events stay visible under All teams and can be moved to the team with the existing
  move-events modal.
- The one-time localStorage migration effect: officers who previously chose All teams have
  no stored record and will be auto-selected onto a team once before their next explicit
  choice persists.
- The final test count for `npx vitest run domain/raid-team app/hooks`, before and after.
- Which attribution trailer was actually used, since the brief and the environment
  specified different ones.
- Whether the human check in step 7 of `<verification>` was run, and its result.
</output>

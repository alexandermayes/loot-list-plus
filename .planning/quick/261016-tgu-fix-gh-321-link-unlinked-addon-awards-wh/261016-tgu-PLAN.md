---
phase: quick
plan: 261016-tgu
type: execute
status: complete
wave: 1
depends_on: [261016-tbo for Task 3 only]
files_modified:
  - utils/raid-events/link-unlinked-awards.ts (new)
  - utils/raid-events/__tests__/link-unlinked-awards.test.ts (new)
  - app/api/addon/attendance/route.ts
  - app/api/addon/attendance/__tests__/route.test.ts (new)
  - app/api/addon/import-string/route.ts
  - app/api/addon/import-string/__tests__/route.test.ts
  - companion/src/main/addon-format.ts
  - companion/src/main/__tests__/addon-format.test.ts
  - (addon repo, Task 3) Modules/LootDistribution.lua, Modules/LootHook.lua, tests/test_live_context.lua, CHANGELOG.md
autonomous: true
requirements: [GH-321]
---

<objective>
Fix GH #321: an addon or companion award is linked to its raid night only if the night already exists when the award arrives (GH #295). Two cases stay unlinked: attendance synced after the award, and awards whose UTC date differs from the session's date (sessions crossing midnight UTC). Unlinked awards miss BLP credit and the night's loot summary.

Two mechanisms, both from the issue:
1. Server: when the addon attendance paths create or update a raid night, link that guild's unlinked addon awards from the same date to that night, team-aware, following the GH #295 rules.
2. Date at the source: the addon stamps each award with its session's raidDate (sessionDate); the companion sends it as awarded_date; the paste import uses it when no session matched. The companion also matches an award to a pending session in the same SavedVariables file for awards from addon 1.1.0, which carry no sessionDate.
</objective>

<context>
Night linking today: utils/raid-events/team-routing.ts has pickAwardRaidEvent(events, routing) (pure, GH #295 rules), findAwardRaidEvent (find-only), getGuildTeamRouting, importAttendanceByTeam (creates or updates the night's events, returns eventIds). The addon attendance route (app/api/addon/attendance/route.ts) and import-string processAttendance both call importAttendanceByTeam, then `after(() => recomputeBlpForEvents(...))`.

loot_history: raid_event_id nullable, source 'addon' for addon and companion awards (buildAddonAwardRow), award_copy smallint 1..10, source_award_key. Unique index idx_loot_history_unique_award_copy on (guild_id, loot_item_id, character_id, raid_event_id, award_copy) WHERE raid_event_id IS NOT NULL AND character_id IS NOT NULL. Linking an unlinked row can therefore collide with a row already on that night for the same raider and item: the relink must pick the next free award_copy (see nextAwardCopy and the award_copy lookups in lib/loot/addon-award-insert.ts lines 270-300) and give up on that row (leave it unlinked, log) if copy would exceed 10. Rows with character_id null are outside the index and link freely.

Dates: the addon stamps everything in UTC (Core/Utils.lua: GetTimestamp date("!...Z"), GetDateString date("!%Y-%m-%d")); a session's raidDate is the UTC date at session start; an award's awarded_date from the companion is awardedAt.split('T')[0]. lib/addon/award-session.ts matchAwardSession(awardedAt, sessions) is the pure matcher the import-string route uses; the companion cannot import it (companion tsconfig maps @/* to companion/src/*), so a small copy lives in the companion.

Test fixtures: app/api/addon/import-string/__tests__/route.test.ts has a fake Supabase builder supporting select/insert/update/eq/in/is/order/limit/single/maybeSingle and records calls with filters; copy its shape for the new attendance route test and the helper test. The loot-award fake has no update; do not use it.

Conventions: no em dashes; comments say why; `// regression for #321` markers; commit trailer exactly `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`; `git -c core.hooksPath=/dev/null commit`; PR bodies end with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`. Decision to surface in the PR body (not to decide alone): back-linking runs only on the two addon attendance paths, not when an officer creates a night on the website (/api/raid-events/ensure, /api/attendance/bulk); those can follow if the owner wants.
</context>

<tasks>

<task id="1" repo="loot-list-plus">
<name>Server: link unlinked addon awards when a night's attendance arrives; honour sessionDate in paste imports</name>
<files>utils/raid-events/link-unlinked-awards.ts, utils/raid-events/__tests__/link-unlinked-awards.test.ts, app/api/addon/attendance/route.ts, app/api/addon/attendance/__tests__/route.test.ts, app/api/addon/import-string/route.ts, app/api/addon/import-string/__tests__/route.test.ts</files>
<action>
New utils/raid-events/link-unlinked-awards.ts:
- `export function planAwardLinks(rows, events, routing, existingCopies)` pure: for each unlinked row {id, character_id, loot_item_id} run pickAwardRaidEvent(events, { hasTeams, teamId: routing for that character }) and, when linked, assign award_copy = next free copy for (loot_item_id, character_id, raid_event_id) given existingCopies (a Map keyed by `${itemId}|${charId}|${eventId}` of the highest copy already on the night) plus the copies assigned earlier in the same plan; skip (and report) rows whose copy would exceed 10. Rows with null character_id get award_copy 1 and no collision check. Return { links: Array<{id, raidEventId, awardCopy}>, skipped: Array<{id, reason}> }.
- `export async function linkUnlinkedAddonAwards(service, guildId, raidDate)`: query loot_history where guild_id = guildId, source = 'addon', raid_event_id is null, awarded_date = raidDate, select id, character_id, loot_item_id (one query); if none, return { linked: [], itemIds: [] } with no further queries. Load raid_events for (guild, date) (id, raid_team_id) and getGuildTeamRouting once. Load the highest award_copy per (item, character, event) among the night's linked rows for the unlinked rows' items (one query on loot_history filtered by guild_id, in raid_event_id, in loot_item_id, not null character_id). Apply planAwardLinks; for each link `update({ raid_event_id, award_copy }).eq('id', id).eq('guild_id', guildId).is('raid_event_id', null)` (the guild filter and the null guard make a concurrent link or an officer edit harmless); on error code 23505 skip that row and log. Return { linked: ids, itemIds: distinct loot_item_ids linked }. Any query error throws; callers catch.
- `// regression for #321` on the helper and a header comment explaining why rows are never created and why the update is guarded.

app/api/addon/attendance/route.ts: replace `after(() => recomputeBlpForEvents(...))` with an after callback that first awaits linkUnlinkedAddonAwards(supabase, guild_id, raid_date) inside try/catch (log + trackApiError, never fail the response), then recomputeBlpForEvents(eventIds) (a newly linked award now belongs to one of those events, so one recompute covers it). Update the route JSDoc.

app/api/addon/import-string/route.ts:
- After the attendance loop (all records processed, before awards), for each distinct raidDate processed call linkUnlinkedAddonAwards in try/catch, collecting linked itemIds into the set the route already recomputes BLP for (linkedItemIds or equivalent; read the code). Awards in the same import still link themselves through findAwardRaidEvent as today.
- AddonAward gets `sessionDate?: string` (JSDoc: the addon session's raidDate at award time, addon 1.2.0 and later). In processAward the night date becomes `session?.raidDate ?? toRaidNightDate(award.sessionDate) ?? award.awardedAt` (findAwardRaidEvent already validates; pass sessionDate raw when it is a string and let findAwardRaidEvent fall back when invalid, or validate with toRaidNightDate first; either way a bad sessionDate must fall back to awardedAt, never 400). Note: if GH #319's PR (fix/319-live-boss-and-raid-name) has already merged, processAward also reads award.instanceName; keep both.

Tests:
- utils/raid-events/__tests__/link-unlinked-awards.test.ts: planAwardLinks cases: no-team guild links to the null-team night; team guild links a teamed raider to the team night and leaves an unassigned raider unlinked when two nights exist; second copy of an item for the same raider gets award_copy 2 when copy 1 is already on the night; two unlinked copies in the same plan get 2 and 3; copy 11 is skipped with a reason; null character_id links with copy 1. linkUnlinkedAddonAwards with the fake client: no unlinked rows means exactly one query; a link issues update with raid_event_id, award_copy and the is:raid_event_id null guard; a 23505 on update is skipped and the rest still link; a select error throws.
- New app/api/addon/attendance/__tests__/route.test.ts (model on import-string's test setup: mock auth, service client, team-routing's importAttendanceByTeam or the fake tables, recomputeBlpForEvents, and `after` from next/server to run the callback immediately): attendance for a date links the guild's unlinked addon award from that date and recomputes BLP for the event; a linking failure still returns 200 with the attendance counts.
- import-string tests: an award with sessionDate 2026-09-20 and awardedAt 2026-09-21T01:00:00Z outside any session links to the 2026-09-20 night; a malformed sessionDate falls back to the awardedAt date; after an import whose attendance creates a night, a previously unlinked addon award on that date (fixture row with raid_event_id null) receives an update.

Run `npm run lint`, `npm run typecheck`, `npm test`.
</action>
<verify>New tests pass; existing #295/#307 import-string tests unchanged; lint and typecheck clean.</verify>
<done>Attendance arriving after an award links that award to the night (team-aware, copy-safe) and recomputes BLP; paste imports honour sessionDate.</done>
</task>

<task id="2" repo="loot-list-plus">
<name>Companion: awarded_date from the session, not the UTC clock</name>
<files>companion/src/main/addon-format.ts, companion/src/main/__tests__/addon-format.test.ts</files>
<action>
- Add a small pure `matchPendingSession(awardedAt, pendingAttendance)` in addon-format.ts (or a new companion/src/main/session-match.ts): returns the raidDate (YYYY-MM-DD) of the pending attendance record whose [startTime, endTime] contains awardedAt, latest start wins, skipping records with unparseable times or an invalid raidDate; null otherwise. Mirror lib/addon/award-session.ts matchAwardSession's rules in a comment and say why it is a copy (the companion cannot import the website's lib).
- toPendingAwardRequests takes the raw pending attendance list as a second optional argument. awarded_date resolution order: a string `sessionDate` matching /^\d{4}-\d{2}-\d{2}$/ on the award (addon 1.2.0); else matchPendingSession(awardedAt, attendance); else awardedAt.split('T')[0] as today. `// regression for #321`.
- Update the sync engine call site (companion/src/main/sync-engine.ts reads pending lists via readPendingLists; pass pending.attendance through). Do not change what gets removed from SavedVariables.
- Tests: sessionDate wins over the UTC date; an addon 1.1.0 award at 2026-09-21T01:00:00Z inside a pending session that started 2026-09-20T19:00:00Z gets awarded_date 2026-09-20; with no matching session the UTC date is used; a malformed sessionDate is ignored.
- `cd companion && npx vitest run` and the companion typecheck script.
</action>
<verify>Companion tests pass; typecheck clean.</verify>
<done>The companion sends the session's date as awarded_date whenever it can know it.</done>
</task>

<task id="3" repo="loot-list-plus-addon" blocked_on="PR from 261016-tbo merged">
<name>Addon: stamp sessionDate on each award</name>
<files>Modules/LootDistribution.lua, Modules/LootHook.lua, tests/test_live_context.lua (or a new test file), CHANGELOG.md</files>
<action>
Start from origin/main after the #319 addon PR has merged, branch fix/321-session-date. In the same place OnLootOpened and LootHook build current items (where #319 added instanceName), add `sessionDate = (LLP.Attendance and LLP.Attendance.currentSession and LLP.Attendance.currentSession.raidDate) or nil`; AwardItem and ManualAward copy it onto the pending award. Attendance.lua is not loaded by the test harness, so tests set `h.LLP.Attendance = { currentSession = { raidDate = "2026-09-20" } }` directly. Tests: award inside a session carries sessionDate; award with no session has no sessionDate key; export string carries it. CHANGELOG Unreleased bullet (copy needs sign-off, no em dashes): "Awards made after midnight server time are now filed on the raid night they belong to, not the next day." Open a PR "fix: stamp the session date on each award (#321)" with "Part of alexandermayes/loot-list-plus#321". Do not merge.
</action>
<verify>`luajit tests/run.lua` exits 0.</verify>
<done>Addon awards carry their session's raidDate.</done>
</task>

</tasks>

<verification>
- `npm run lint && npm run typecheck && npm test` green; companion tests green; addon tests green.
- Trace A (attendance late): companion syncs award on 2026-09-20 with no night (unlinked); attendance for 2026-09-20 arrives next pass; the attendance route links the award and recomputes BLP for the event.
- Trace B (midnight UTC): award at 01:00Z on 09-21 inside a session that started 19:00Z on 09-20: companion sends awarded_date 09-20 (sessionDate or local match); the award links to the 09-20 night at insert time.
</verification>

<output>
PR in loot-list-plus on branch fix/321-backlink-addon-awards (Tasks 1 and 2); later PR in loot-list-plus-addon (Task 3). Report PR numbers, test counts before/after, deviations, and the back-link scope decision for the owner.
</output>

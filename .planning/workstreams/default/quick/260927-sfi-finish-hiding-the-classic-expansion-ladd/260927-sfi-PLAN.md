---
phase: quick-260927-sfi
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - "app/api/guilds/[id]/expansions/[expansionId]/route.ts"
  - "app/api/guilds/[id]/expansions/[expansionId]/__tests__/route.test.ts"
  - "app/(app)/expansions/[expansionId]/_client.tsx"
  - "app/(app)/guild-settings/components/ExpansionManager.tsx"
  - "app/(app)/loot-management/components/PriorityListTab.tsx"
  - "app/(app)/reserve/components/CreateReserveRunModal.tsx"
  - "app/(app)/reserve/components/__tests__/CreateReserveRunModal.test.tsx"
  - "app/(app)/sheet-import/_client.tsx"
  - "app/(app)/help/_client.tsx"
autonomous: true
requirements:
  - FW-01
  - FW-02

estimate:
  # No estimation-calibration.json in the default workstream: factor 1,
  # 0 samples, confidence low, so tokens equals raw_tokens. The comparable
  # quick task 260926-lj6 (27 files, 3 tasks) actually used ~22k.
  tokens: 90000
  raw_tokens: 90000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "PATCH /api/guilds/[id]/expansions/[expansionId] with setAsCurrent true returns 400 with the GV-C7 message from gameMismatchError when the target expansion's game differs from guilds.game, and 404 'Guild not found' when the guild row is missing, before any write to guilds or expansions (S-2). A same-game set-current still succeeds. A PATCH without setAsCurrent (raid schedule, timezone, phase deadlines) never reads guilds and behaves exactly as today."
    - "Permission is checked before the guild game lookup: a non-officer gets 403 and the route makes no table reads (S-2, T-sfi-02)."
    - "On /expansions/[expansionId] a Forever guild sees 'WoW Forever has no raids open yet.' as the empty state, 'Page not found' for an id that is not one of its rows, and 'Couldn't load data. Check your connection and try again.' on load failure. A Classic guild sees the current strings byte-for-byte (S-1)."
    - "A Forever guild's Priorities tab hint reads 'Enable raid tiers in Guild Settings → Game version to set up priorities.' and its guild settings load-failure toast reads 'Couldn't load data. Check your connection and try again.'; Classic text is unchanged (S-1)."
    - "Sheet import for a Forever guild labels the data select 'Game version' and lists only its WoW Forever row, shown as 'WoW Forever'; Classic keeps 'Expansion' and every row by raw name (S-1)."
    - "The Create reserve run modal for a Forever guild shows no Expansion label and no Classic tiles, describes step 1 as 'Pick a raid to get started', loads the guild's own raid tiers as soon as it opens, and shows 'WoW Forever has no raids open yet.' when there are none. A Classic guild (including a cached guild object with no game) sees the five Classic tiles and today's text (S-1)."
    - "The /help tip 'Each expansion and phase has its own Loot List.' reads 'Each phase has its own Loot List.' for a Forever guild; every other tip and every Classic tip is unchanged (S-1)."
    - "Every Forever decision in these files reads getGuildGame(activeGuild) from domain/expansion/game.ts (missing game reads classic, per 260926-lj6 D-07); no client file imports the expansion seeder; no added line contains an em dash."
  artifacts:
    - "app/api/guilds/[id]/expansions/[expansionId]/route.ts: set-current game guard (Task 1)"
    - "app/api/guilds/[id]/expansions/[expansionId]/__tests__/route.test.ts: new route test, 8 cases (Task 1)"
    - "app/(app)/reserve/components/__tests__/CreateReserveRunModal.test.tsx: new component test, 3 cases (Task 3)"
    - "Game-gated strings in the six client files listed in files_modified (Tasks 2 and 3)"
  key_links:
    - "guilds.game (shipped in PR #280) -> activeGuild.game on GuildContext (PR #281) -> getGuildGame(activeGuild) -> the ternaries in Tasks 2 and 3"
    - "PATCH route: expansions row (id, name) already loaded -> getExpansionGame(expansion.name) vs getGuildGame(guilds row) -> gameMismatchError(expansion.name) 400"
    - "ExpansionManager.handleSetCurrent already toasts data.error, so the Task 1 400 reaches the officer with no client change"
---

<objective>
Finish hiding the Classic expansion ladder from WoW Forever guilds (follow-up to quick task 260926-lj6, todo 2026-09-26-forever-follow-ups item 2). Two parts, both locked by the user:

- S-1 (FW-01): gate the remaining "expansion" wording on the guild's game version through getGuildGame (and GAME_VERSION_LABELS where a label is needed) from domain/expansion/game.ts, on the surfaces that a Forever guild can actually reach: the /expansions/[expansionId] page, the PriorityListTab hint, the sheet-import label, CreateReserveRunModal, the /help tip, and the ExpansionManager load-failure toast. Classic guilds keep today's wording byte-for-byte.
- S-2 (FW-02): close the last server gap: PATCH /api/guilds/[id]/expansions/[expansionId] with setAsCurrent can still point a guild at an expansion from the other game. Refuse it with 400 and the approved GV-C7 message via the existing gameMismatchError, before any write, with a route test.
- S-3 (out of scope, do not touch): DB trigger, Discord bot, landing copy, analytics, raid data.

Purpose: a Forever officer should never meet the word "expansion" or a Classic expansion picker, and no API path should be able to move a guild onto the other game's ladder.

Output: one server guard plus route test (Task 1, no copy, may run immediately), then client wording in two tasks (Tasks 2 and 3, blocked on copy sign-off).

Working directory for ALL code work: /private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/8235b620-ae38-4661-a5c0-23f69fed77f3/scratchpad/wt-forever-wording (branch fix/forever-expansion-wording, based on origin/main 605499dd, which contains PRs #274, #280, #281, #283). Every path in this plan is relative to that worktree (abbreviated WT). Do not read or edit /Users/alexander.mayes/Code/personal/loot-list-plus (main checkout, in use by another session; its application code is stale). Styling: match origin/main's neighbouring Tailwind classes (text-[11px], text-[13px], etc.); no design-system tokens from local main. WT has no .claude/skills or .agents/skills.

Tracer-first: Task 1 is the tracer. It is a complete vertical slice on its own: an officer clicks Set as Current, the PATCH route loads both games, refuses with 400, and the existing ExpansionManager toast shows the message (no client change needed). Tasks 2 and 3 expand the wording across the client once the copy is signed off.

Execution gate: Task 1 carries no new copy and may run at once. The orchestrator obtains the user's sign-off on "## Copy for sign-off" before dispatching Tasks 2 and 3. If a string is edited at sign-off, the edited string wins, and the matching grep gate and test assertion change with it.
</objective>

<execution_context>
@/Users/alexander.mayes/Code/personal/loot-list-plus/.claude/gsd-core/workflows/execute-plan.md
@/Users/alexander.mayes/Code/personal/loot-list-plus/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
Project rules (read-only, outside WT): /Users/alexander.mayes/Code/personal/loot-list-plus/.claude/CLAUDE.md: no em dashes in user-facing copy; user signs off copy.
Prior task (planning worktree, read only if needed): /private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/8235b620-ae38-4661-a5c0-23f69fed77f3/scratchpad/wt-phase06/.planning/workstreams/default/quick/260926-lj6-separate-wow-forever-from-the-classic-ex/260926-lj6-PLAN.md (approved copy table GV-C1 to GV-C8).

Facts verified at plan time in WT (no need to re-check):
- domain/expansion/game.ts (zero imports, client-safe) exports GameVersion, GAME_VERSION_LABELS (classic 'WoW Classic', forever 'WoW Forever'), FOREVER_EXPANSION_NAME ('Forever'), getExpansionGame(name) (null for unknown names), getGuildGame(guild) ('forever' only when guild.game is exactly 'forever', else 'classic').
- app/services/expansionSeeder.ts re-exports getExpansionGame and exports gameMismatchError(expansionName) returning "{display name} isn't available for this guild's game version." (GV-C7). FOREVER_DATA has raids: [] so a Forever guild has no raid tiers today.
- Sibling guard to copy: app/api/guilds/[id]/expansions/route.ts POST imports getExpansionGame and gameMismatchError from '@/app/services/expansionSeeder' and getGuildGame from '@/domain/expansion/game'; after verifyPermission it runs serviceSupabase.from('guilds').select('game').eq('id', guildId).single(), returns 404 { error: 'Guild not found' } on error or no row, then 400 { error: gameMismatchError(name) } when getExpansionGame(name) is non-null and differs from getGuildGame(guildRow). Its test app/api/guilds/[id]/expansions/__tests__/route.test.ts is the harness pattern (node pragma, vi.mock of '@/utils/supabase/server', '@/utils/supabase/service-role', '@/utils/server-roles', plain Request cast to any, params as Promise.resolve).
- PATCH route app/api/guilds/[id]/expansions/[expansionId]/route.ts (136 lines): auth (401), verifyPermission 'manage_settings' (403 'Officer permissions required'), then loads the row with .from('expansions').select('id, name').eq('id', expansionId).eq('guild_id', guildId).single() (404 'Expansion not found'), then if setAsCurrent === true updates guilds.active_expansion_id (lines 66-77), then optionally updates the expansions row with schedule/timezone/phaseDeadlines fields (lines 79-121), then returns { success: true, message } where message is `${expansion.name} is now your current expansion` or 'Expansion updated successfully'. Callers: ExpansionManager handleSetCurrent (Set as Current button, hidden for Forever guilds) and handleSaveAllSettings (raid schedule, all guilds), and the /expansions/[id] page's phase-deadline save.
- GuildContext: activeGuild carries game (PR #281); useGuildContext is available on every (app) page (GuildContextProvider wraps the root layout). ExpansionContext's GuildExpansion has expansion_id and expansion_name.
- eslint: react-hooks/set-state-in-effect is an error for most files (warn for app/(app)/help/_client.tsx). Baseline eslint on all six client files and the PATCH route is 0 errors (warnings only). Add no new effects.
- Baseline counts for gates: in app/(app)/expansions/[expansionId]/_client.tsx "Expansion not found" appears on 2 lines, "load data. Check your connection and try again." on 1 line, "Page not found" on 0; in ExpansionManager.tsx "load data. Check your connection and try again." on 1 line. None of the six client files mentions expansionSeeder.
- Tests: vitest (jsdom default). Component tests under app/(app)/**/components/__tests__/ are picked up (e.g. app/(app)/raid-tracking/components/__tests__/). app/components/__tests__/LoginPage.test.tsx shows the vi.mock('@/utils/supabase/client') stub pattern. components/ui/modal.tsx renders through createPortal when open is true (works in jsdom). CreateReserveRunModal tile labels come from getExpansionVisuals(name).shortName: 'Classic', 'TBC', 'WotLK', 'Cata', 'MoP'.

Reachability audit (S-1 asks to verify each surface before changing it):

| Surface / string | Reachable by a Forever guild? | Plan |
|---|---|---|
| /expansions/[id] "No raid tiers found for this expansion" | Yes, and it is the default view: the settings Raid Tiers link opens this page and Forever has no raid tiers | EW-C1 |
| /expansions/[id] "Expansion not found" (toast + body) | Yes: stale link, bad URL, or switching guild while on the page | EW-C2 |
| /expansions/[id] "Couldn't load expansion. Check your connection and try again." | Yes, on network failure (same page; not named in the todo but it is page wording) | EW-C3 |
| /expansions/[id] phase, merge and visibility toasts | No: Forever has no phases, so none of that UI renders (and none says "expansion") | none |
| ExpansionManager "Couldn't load expansions. Check your connection and try again." | Yes: loadData runs for every guild | EW-C4 |
| ExpansionManager add toasts ("Couldn't add expansion. Try again.", "Expansion added", "Adding expansion... This may take a moment.") | No: the Add Expansion section renders only when !isForeverGuild | dropped |
| ExpansionManager set-current toasts ("Couldn't set current expansion. Try again.", "Expansion updated", "Couldn't update expansion. Try again.") and the PATCH success "{name} is now your current expansion" | No: Set as Current renders only when !isForeverGuild | dropped |
| PriorityListTab "Enable raid tiers in Guild Settings → Expansions to set up priorities." | Yes: no guild-active tiers gives this state, and the Import/Priorities tabs are open to all guilds | EW-C5 |
| Sheet import "Expansion" label and option names | Yes: the Import button on Loot settings links to /sheet-import for every guild | EW-C6, EW-C7 |
| CreateReserveRunModal description, "Expansion" label and five Classic tiles, "No raid data available for this expansion yet." | Yes: Reserve is in the sidebar and Create run is always shown | EW-C8, hidden tiles, EW-C9 |
| /help tip "Each expansion and phase has its own Loot List." | Yes: one of 14 random tips on /help | EW-C10 |
</context>

## Copy for sign-off

**STATUS: APPROVED by the user 2026-09-27, all strings verbatim (EW-C1 to EW-C12).** (was: PENDING SIGN-OFF) Tasks 2 and 3 must not start until the user approves this table. Task 1 uses only already-approved strings (GV-C7, GV-C8).

Strings are verbatim; `{...}` marks a runtime value. No em dashes. The Classic column is today's text and stays byte-for-byte; only Forever guilds see the Forever column.

| ID | Location | Classic text (unchanged) | Forever text | Source |
|----|----------|--------------------------|--------------|--------|
| EW-C1 | /expansions/[id] page empty state (every Forever guild sees this today: WoW Forever has no raid tiers yet) | No raid tiers found for this expansion | WoW Forever has no raids open yet. | New; the first sentence of approved GV-C4 |
| EW-C2 | /expansions/[id] page, toast and page body when the id is not one of the guild's rows (stale link, guild switch) | Expansion not found | Page not found | New |
| EW-C3 | /expansions/[id] page, load-failure toast | Couldn't load expansion. Check your connection and try again. | Couldn't load data. Check your connection and try again. | Existing string on the same page, reused |
| EW-C4 | Guild settings (ExpansionManager), load-failure toast | Couldn't load expansions. Check your connection and try again. | Couldn't load data. Check your connection and try again. | Existing string in the same file, reused |
| EW-C5 | Loot settings, Priorities tab, hint under "No raid tiers available" | Enable raid tiers in Guild Settings → Expansions to set up priorities. | Enable raid tiers in Guild Settings → Game version to set up priorities. | New; points at the approved GV-C1 settings heading |
| EW-C6 | Sheet import, label above the data select (shown when "Loot item configuration" is ticked) | Expansion | Game version | Approved GV-C1, reused |
| EW-C7 | Sheet import, the select's option text | {expansion name}, one per guild row (e.g. Classic, The Burning Crusade) | WoW Forever (only the guild's WoW Forever row is listed) | Approved GV-C3, reused |
| EW-C8 | Create reserve run modal, step 1 description | Pick an expansion and raid to get started | Pick a raid to get started | New |
| EW-C9 | Create reserve run modal, raid list when the guild has no raid tiers | No raid data available for this expansion yet. | WoW Forever has no raids open yet. | Same as EW-C1 |
| EW-C10 | /help page tip (one of 14, drawn at random) | Each expansion and phase has its own Loot List. | Each phase has its own Loot List. | New |
| EW-C11 | Set as Current error toast, both games (PATCH refusal of an expansion from the other game; in practice a Classic guild with a leftover WoW Forever row, or a hand-crafted request) | {display name} isn't available for this guild's game version. | same | Approved GV-C7, reused |
| EW-C12 | Set as Current error toast, both games, guild row missing | Guild not found | same | Approved GV-C8, reused |

Hidden (not reworded) for Forever guilds: the Create reserve run modal's "Expansion" label and its five Classic tiles (Classic, TBC, WotLK, Cata, MoP). Picking a tile never changed what a guild loads (guild mode always reads the guild's active expansion), so a Forever guild goes straight to its raid list.

New strings needing approval: EW-C1/EW-C9, EW-C2, EW-C5, EW-C8, EW-C10. Everything else is reused.

<tasks>

<task type="tracer" tdd="true">
  <name>Task 1 (tracer): Refuse a cross-game Set as Current on PATCH /api/guilds/[id]/expansions/[expansionId]</name>
  <files>app/api/guilds/[id]/expansions/[expansionId]/route.ts, app/api/guilds/[id]/expansions/[expansionId]/__tests__/route.test.ts</files>
  <read_first>
    - app/api/guilds/[id]/expansions/[expansionId]/route.ts (whole file, 136 lines)
    - app/api/guilds/[id]/expansions/route.ts lines 1-8 and 95-125 (the sibling POST guard to mirror)
    - app/api/guilds/[id]/expansions/__tests__/route.test.ts (harness pattern)
  </read_first>
  <behavior>
    - Forever guild, body { setAsCurrent: true }, row { id: 'exp-1', name: 'The Burning Crusade' }: 400 { error: "The Burning Crusade isn't available for this guild's game version." }; no update on any table.
    - Classic guild, body { setAsCurrent: true, raidDaysPerWeek: 3 }, row { id: 'exp-1', name: 'Forever' }: 400 { error: "WoW Forever isn't available for this guild's game version." }; no update on guilds and no update on expansions (the guard runs before any write).
    - Classic guild, body { setAsCurrent: true }, row { id: 'exp-1', name: 'The Burning Crusade' }: 200 { success: true, message: 'The Burning Crusade is now your current expansion' }; one guilds update with payload { active_expansion_id: 'exp-1' }.
    - Forever guild, body { setAsCurrent: true }, row { id: 'exp-1', name: 'Forever' }: 200; one guilds update recorded (do not assert the message text).
    - Guild row missing, body { setAsCurrent: true }, any row: 404 { error: 'Guild not found' }; no update on any table.
    - Classic guild, body { raidDaysPerWeek: 3 } (no setAsCurrent), row { id: 'exp-1', name: 'Forever' }: 200 { success: true, message: 'Expansion updated successfully' }; the table list never contains 'guilds'; one expansions update with payload { raid_days_per_week: 3 }.
    - verifyPermission resolves { hasPermission: false }: 403 { error: 'Officer permissions required' }; no from() call at all.
    - Expansion row missing, body { setAsCurrent: true }: 404 { error: 'Expansion not found' }; the table list never contains 'guilds'.
  </behavior>
  <action>
Per S-2 (FW-02). Write the test first (RED against today's route: the two cross-game cases and the missing-guild case fail), then the guard (GREEN).

A. Test, new file app/api/guilds/[id]/expansions/[expansionId]/__tests__/route.test.ts. First line is the `// @vitest-environment node` pragma with the same two-line reason comment as the sibling test. vi.mock '@/utils/supabase/server' (getAuthenticatedUser, plus createClient as vi.fn), '@/utils/supabase/service-role' (createServiceRoleClient) and '@/utils/server-roles' (verifyPermission). Do not mock the seeder; the route needs the real gameMismatchError and getExpansionGame. Write a makeClient({ game, expansion }) helper where game is string or null (null means no guild row) and expansion is { id, name } or null. It returns a client plus two recorders: tables (every table name passed to from, in order) and updates (an array of { table, payload } for every update call). from(table) returns a chainable builder: select, eq and update return the builder (update also records); single() resolves { data: game === null ? null : { game }, error: null } for 'guilds' and { data: expansion, error: expansion ? null : { message: 'not found' } } for 'expansions'; the builder is thenable (a then method resolving { data: null, error: null }) so awaited update chains resolve. A patch(body) helper builds a plain Request to http://localhost/api/guilds/g1/expansions/exp-1 with method PATCH and the JSON body and calls PATCH(request as any, { params: Promise.resolve({ id: 'g1', expansionId: 'exp-1' }) }). In beforeEach: getAuthenticatedUser resolves { user: { id: 'user-1' }, error: null }, verifyPermission resolves { hasPermission: true }. Cover all eight behavior bullets.

B. Route, app/api/guilds/[id]/expansions/[expansionId]/route.ts. Add imports mirroring the sibling POST: getExpansionGame and gameMismatchError from '@/app/services/expansionSeeder', getGuildGame from '@/domain/expansion/game'. Directly after the existing "Expansion not found" check and before the existing setAsCurrent write, add a block that runs only when setAsCurrent === true: load the guild with serviceSupabase.from('guilds').select('game').eq('id', guildId).single(); on error or no row return 404 { error: 'Guild not found' } (GV-C8); compute getExpansionGame(expansion.name); when it is non-null and differs from getGuildGame(guildRow) return 400 { error: gameMismatchError(expansion.name) } (GV-C7). Nothing is written before this block, so a refused request with schedule fields writes nothing either. A null game (legacy or unknown name) falls through, as in the sibling POST. Leave the rest of the route unchanged: the schedule/timezone/phaseDeadlines path does not read guilds, and both success messages stay as they are. Extend the header doc comment with one line: setAsCurrent refuses an expansion from the other game version (400) before any write; other fields are not game-checked.

Why only on setAsCurrent: it is the only branch that moves the guild onto a different expansion. Schedule, timezone and phase-deadline edits do not change the ladder, and a Classic guild that added WoW Forever in the window between PR #274 and PR #281 still sees that row in its unchanged Classic settings list. Gating every PATCH would stop it from saving that row's raid schedule. This also keeps the extra query off the frequent schedule saves.

No client change: ExpansionManager.handleSetCurrent already toasts data.error, so the 400 reaches the officer as EW-C11.

Commit ONLY these two paths (quote the bracketed paths): `git add "app/api/guilds/[id]/expansions/[expansionId]/route.ts" "app/api/guilds/[id]/expansions/[expansionId]/__tests__/route.test.ts"`, then `git commit -m "fix(260927-sfi): refuse a cross-game Set as Current on the expansion PATCH route"`. Never stage .agents/, .codex/, .gsd/, AGENTS.md or .planning/.
  </action>
  <verify>
    <automated>cd /private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/8235b620-ae38-4661-a5c0-23f69fed77f3/scratchpad/wt-forever-wording && npx vitest run app/api/guilds && npm run typecheck && npx eslint "app/api/guilds/[id]/expansions/[expansionId]/route.ts" "app/api/guilds/[id]/expansions/[expansionId]/__tests__/route.test.ts" && grep -qF "gameMismatchError(expansion.name)" "app/api/guilds/[id]/expansions/[expansionId]/route.ts" && grep -qF "Guild not found" "app/api/guilds/[id]/expansions/[expansionId]/route.ts" && [ "$(grep -c "^[[:space:]]*it(" "app/api/guilds/[id]/expansions/[expansionId]/__tests__/route.test.ts")" -ge 8 ] && echo OK</automated>
  </verify>
  <done>All tests under app/api/guilds pass, including 8 or more cases in the new PATCH test; typecheck clean; eslint 0 errors on both files; the route refuses a cross-game set-current with 400 GV-C7 and a missing guild with 404 before any write, and schedule-only PATCHes never read guilds; one commit with exactly the two paths.</done>
</task>

<task type="auto">
  <name>Task 2: Forever wording on the officer settings screens (raid tiers page, guild settings toast, Priorities hint)</name>
  <files>app/(app)/expansions/[expansionId]/_client.tsx, app/(app)/guild-settings/components/ExpansionManager.tsx, app/(app)/loot-management/components/PriorityListTab.tsx</files>
  <precondition>"## Copy for sign-off" in this plan is marked approved by the user (the orchestrator confirms before dispatch).</precondition>
  <read_first>
    - app/(app)/expansions/[expansionId]/_client.tsx lines 1-20, 194-235, 272-296, 621-634, 950-960
    - app/(app)/guild-settings/components/ExpansionManager.tsx lines 1-20 and 107-125
    - app/(app)/loot-management/components/PriorityListTab.tsx lines 1-17, 160-170, 638-648
  </read_first>
  <action>
Per S-1 (FW-01), strings EW-C1 to EW-C5 verbatim from the signed-off table. The game comes from getGuildGame(activeGuild) imported from '@/domain/expansion/game' (a missing game reads classic, 260926-lj6 D-07). Never import the expansion seeder in these client files. Every Classic string stays exactly as it is today: write each change as a ternary whose Classic branch is the current literal, untouched. Change nothing else in these files (the CURRENT pill, headings, layout and classes stay as they are).

A. app/(app)/expansions/[expansionId]/_client.tsx. Import getGuildGame. Right after the useGuildContext destructure (around line 211) derive isForeverGuild as getGuildGame(activeGuild) === 'forever'. In loadData: the get_guild_expansions error toast (line 283) uses EW-C3 for Forever; the not-found toast (line 290) uses EW-C2 for Forever. In the render: the not-found body paragraph (line 632) uses EW-C2 for Forever; the empty-state paragraph (line 955) uses EW-C1 for Forever. loadData is a plain function recreated each render and called from the effect that already depends on activeGuild, so the closure always sees the current game; do not memoize anything.

B. app/(app)/guild-settings/components/ExpansionManager.tsx. The get_guild_expansions error toast (line 123) sits inside the loadData useCallback, whose deps are activeGuild, supabase and showNotification. Compute the game inside the callback with getGuildGame(activeGuild) === 'forever' (activeGuild is already a dependency, so the dependency list does not change) and use EW-C4 for Forever. getGuildGame is already imported in this file. The add and set-current toasts stay as they are: those buttons never render for a Forever guild (see the reachability audit).

C. app/(app)/loot-management/components/PriorityListTab.tsx. Import getGuildGame. After the useGuildContext destructure (line 167) derive isForeverGuild the same way. The hint paragraph under "No raid tiers available" (line 645) uses EW-C5 for Forever. The "No raid tiers available" heading stays.

Commit ONLY these three paths (quote each, they contain parentheses and brackets) with `git commit -m "fix(260927-sfi): drop expansion wording from Forever guild settings screens"`. Never stage .agents/, .codex/, .gsd/, AGENTS.md or .planning/.
  </action>
  <verify>
    <automated>cd /private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/8235b620-ae38-4661-a5c0-23f69fed77f3/scratchpad/wt-forever-wording && D="app/(app)/expansions/[expansionId]/_client.tsx" && E="app/(app)/guild-settings/components/ExpansionManager.tsx" && P="app/(app)/loot-management/components/PriorityListTab.tsx" && npm run typecheck && npx eslint "$D" "$E" "$P" && grep -qF "No raid tiers found for this expansion" "$D" && grep -qF "WoW Forever has no raids open yet." "$D" && [ "$(grep -cF "Expansion not found" "$D")" = "2" ] && [ "$(grep -cF "Page not found" "$D")" = "2" ] && grep -qF "load expansion. Check your connection and try again." "$D" && [ "$(grep -cF "load data. Check your connection and try again." "$D")" = "2" ] && grep -qF "load expansions. Check your connection and try again." "$E" && [ "$(grep -cF "load data. Check your connection and try again." "$E")" = "2" ] && grep -qF "Enable raid tiers in Guild Settings → Expansions to set up priorities." "$P" && grep -qF "Enable raid tiers in Guild Settings → Game version to set up priorities." "$P" && grep -qF "getGuildGame(activeGuild)" "$D" && grep -qF "getGuildGame(activeGuild)" "$P" && ! grep -n "expansion[S]eeder" "$D" "$E" "$P" && [ "$(git diff -U0 605499dd -- "$D" "$E" "$P" | grep '^+' | grep -c '—')" = "0" ] && echo OK</automated>
    <human-check>Not blocking, recorded in the SUMMARY: at 390px and 1440px, (1) Forever guild: Guild settings, Game version, Raid Tiers link opens the WoW Forever page with "WoW Forever has no raids open yet."; an edited URL id shows "Page not found" (toast and body). (2) Forever guild: Loot settings, Priorities tab shows "No raid tiers available" and "Enable raid tiers in Guild Settings → Game version to set up priorities." (3) Classic guild: same screens unchanged. (4) Optional, DevTools offline: the settings and raid tiers load-failure toasts read "Couldn't load data..." for Forever and keep the expansion wording for Classic.</human-check>
  </verify>
  <done>Typecheck clean; eslint 0 errors on the three files; each Classic literal still present (both "Expansion not found" lines kept); each Forever string present; getGuildGame drives the choice; no seeder import; no added line contains an em dash; one commit with exactly the three paths.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: No Classic ladder or expansion wording for Forever in Create reserve run, sheet import and the help tip</name>
  <files>app/(app)/reserve/components/CreateReserveRunModal.tsx, app/(app)/reserve/components/__tests__/CreateReserveRunModal.test.tsx, app/(app)/sheet-import/_client.tsx, app/(app)/help/_client.tsx</files>
  <precondition>"## Copy for sign-off" in this plan is marked approved by the user (the orchestrator confirms before dispatch).</precondition>
  <read_first>
    - app/(app)/reserve/components/CreateReserveRunModal.tsx lines 1-20, 69-170, 262-352
    - app/components/__tests__/LoginPage.test.tsx lines 1-25 (supabase client mock pattern)
    - app/(app)/sheet-import/_client.tsx lines 1-20, 43-86, 254-272
    - app/(app)/help/_client.tsx lines 1-20, 84-112, 188-195
  </read_first>
  <behavior>
    - Forever guild (activeGuild { id: 'g1', game: 'forever', active_expansion_id: 'exp-f' }), raid_tiers query returns []: the modal renders "Pick a raid to get started" and "WoW Forever has no raids open yet." without any click; raid_tiers was queried with expansion_id 'exp-f'; none of the tile labels Classic, TBC, WotLK, Cata or MoP render; document.body text contains no "expansion" (case-insensitive).
    - Forever guild, raid_tiers returns [{ id: 't1', name: 'Test Raid', phase: 1 }]: "Test Raid" renders without clicking any tile.
    - Guild object with no game field ({ id: 'g1', active_expansion_id: 'exp-c' }), raid_tiers returns []: "Pick an expansion and raid to get started", the "Expansion" label and all five tiles (Classic, TBC, WotLK, Cata, MoP) render; raid_tiers is not queried before a click; after clicking "Classic", "No raid data available for this expansion yet." renders.
  </behavior>
  <action>
Per S-1 (FW-01), strings EW-C6 to EW-C10 verbatim from the signed-off table. The game comes from getGuildGame(activeGuild) imported from '@/domain/expansion/game'. Never import the expansion seeder. Classic branches keep today's literals untouched. Add no new effects (react-hooks/set-state-in-effect is an error in these files except help).

A. Test first (RED), new file app/(app)/reserve/components/__tests__/CreateReserveRunModal.test.tsx (jsdom default, no pragma). vi.mock 'next/navigation' (useRouter returning { push: vi.fn() }), '@/utils/supabase/client' (createClient returning a client whose from('raid_tiers') builder has select and eq returning the builder, with eq recording its arguments, and order resolving { data: tiers, error: null }, where tiers is a per-test variable), '@/app/contexts/GuildContext' (useGuildContext as vi.fn returning { activeGuild } per test), '@/app/contexts/NotificationContext' (useNotification returning { showNotification: vi.fn() }), '@/utils/analytics/client' (trackClientEvent: vi.fn()) and '@/app/components/ReserveItemPicker' (a default stub component). Stub global fetch with vi.stubGlobal so the items effect resolves { success: true, items: [] }. Render the named export CreateReserveRunModal with open true and onClose vi.fn(); use findBy queries for text that appears after the async tier load, and userEvent to click the "Classic" tile. Cover the three behavior bullets. Run it and confirm the two Forever cases fail before B.

B. app/(app)/reserve/components/CreateReserveRunModal.tsx (GREEN). Import getGuildGame and FOREVER_EXPANSION_NAME. After `const isGuildMode = !!activeGuild` derive isForeverGuild (getGuildGame(activeGuild) === 'forever') and effectiveExpansion (FOREVER_EXPANSION_NAME for Forever, otherwise selectedExpansion). In the tier-loading effect: the early-return guard becomes "not open or no effectiveExpansion" (the same clearing body as today); the non-guild fetch URL uses effectiveExpansion; the dependency list becomes effectiveExpansion and open. For Classic this is the same behaviour as today (selectedExpansion is always empty while the modal is closed). For Forever it loads the guild's tiers (guild mode already reads activeGuild.active_expansion_id) each time the modal opens, which also covers close-then-reopen after the reset effect clears the tiers. In the render: the step-1 ModalDescription uses EW-C8 for Forever; wrap the whole "Expansion selector" block (the space-y-3 div holding the Expansion label and the tile grid) so it renders only when not Forever; the "Raid tier selector" condition changes from selectedExpansion to effectiveExpansion; the raidTiers-empty Text uses EW-C9 for Forever. Leave handleSubmit, the payload and trackClientEvent unchanged (S-3).

C. app/(app)/sheet-import/_client.tsx. Import getGuildGame, getExpansionGame and GAME_VERSION_LABELS. Derive isForeverGuild, and an options list: for Forever, guildExpansions filtered to rows whose getExpansionGame(expansion_name) is 'forever'; for Classic, guildExpansions unchanged. The Label children become the expression isForeverGuild ? 'Game version' : 'Expansion' (EW-C6). The Select maps the options list; each option's text is GAME_VERSION_LABELS.forever for Forever and exp.expansion_name for Classic (EW-C7). Option values, the selectedExpansionId default from currentExpansion, and the import requests stay unchanged.

D. app/(app)/help/_client.tsx. Import useGuildContext from '@/app/contexts/GuildContext' and getGuildGame. Pull the tip "Each expansion and phase has its own Loot List." into a module constant used in its existing TIPS slot (the Classic text stays byte-identical and in the same position), and add a second constant holding EW-C10. In HelpPage take activeGuild from useGuildContext and derive isForeverGuild. At render (the "Tip:" paragraph) show the EW-C10 constant when isForeverGuild and the drawn tip is the expansion tip; otherwise the drawn tip. Decide at render time, not in the useState initializer, so a guild that loads after first paint still gets the right text. Do not touch the other tips, the article search, or lib/help-content.ts.

Commit ONLY these four paths (quote each) with `git commit -m "fix(260927-sfi): drop the Classic ladder and expansion wording from reserve, sheet import and help for Forever guilds"`. Never stage .agents/, .codex/, .gsd/, AGENTS.md or .planning/.
  </action>
  <verify>
    <automated>cd /private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/8235b620-ae38-4661-a5c0-23f69fed77f3/scratchpad/wt-forever-wording && R="app/(app)/reserve/components/CreateReserveRunModal.tsx" && T="app/(app)/reserve/components/__tests__/CreateReserveRunModal.test.tsx" && S="app/(app)/sheet-import/_client.tsx" && H="app/(app)/help/_client.tsx" && npx vitest run reserve/components && npm run typecheck && npx eslint "$R" "$T" "$S" "$H" && grep -qF "Pick an expansion and raid to get started" "$R" && grep -qF "Pick a raid to get started" "$R" && grep -qF "No raid data available for this expansion yet." "$R" && grep -qF "WoW Forever has no raids open yet." "$R" && grep -qF "'Game version' : 'Expansion'" "$S" && grep -qF "GAME_VERSION_LABELS.forever" "$S" && grep -qF "Each expansion and phase has its own Loot List." "$H" && grep -qF "Each phase has its own Loot List." "$H" && grep -qF "getGuildGame(activeGuild)" "$R" && grep -qF "getGuildGame(activeGuild)" "$S" && grep -qF "getGuildGame(activeGuild)" "$H" && ! grep -n "expansion[S]eeder" "$R" "$S" "$H" && [ "$(git diff -U0 605499dd -- "$R" "$T" "$S" "$H" | grep '^+' | grep -c '—')" = "0" ] && npx vitest run && echo OK</automated>
    <human-check>Not blocking, recorded in the SUMMARY: at 390px and 1440px, (1) Forever guild: Reserve, Create run shows "Pick a raid to get started", no Expansion row, and the raid list or "WoW Forever has no raids open yet." straight away; close and reopen behaves the same. Classic guild: five tiles and today's text. (2) Sheet import with "Loot item configuration" ticked: Forever shows "Game version" over a select reading "WoW Forever"; Classic shows "Expansion" and its rows. (3) /help: reload until the phase tip appears; Forever reads "Each phase has its own Loot List.", Classic unchanged.</human-check>
  </verify>
  <done>The new modal test passes (3 cases), the full vitest suite passes, typecheck clean, eslint 0 errors on the four files; the Classic literals are all still present; the Forever strings and getGuildGame gating are in place; no seeder import; no added em dash; one commit with exactly the four paths.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| officer -> PATCH /api/guilds/[id]/expansions/[expansionId] | Authenticated officer supplies an expansion id and setAsCurrent for a guild |
| browser -> Supabase (PostgREST, RLS) | Direct table writes with the user's session, outside the API routes |
| client wording (Tasks 2, 3) | Display-only; reads activeGuild.game already on the client; no new data crosses a boundary |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-sfi-01 | Tampering / Elevation | PATCH setAsCurrent pointing a guild at a row from the other game (e.g. a Forever guild making a leftover The Burning Crusade row current) | medium | mitigate | Task 1 guard: guild game loaded after verifyPermission; a cross-game set-current returns 400 GV-C7 before any write, including bundled schedule fields; tested both directions |
| T-sfi-02 | Information Disclosure | Game lookup revealing a guild's game version | low | mitigate | verifyPermission runs first; the 403 test asserts no table reads for a non-officer |
| T-sfi-03 | Tampering | Schedule, timezone and phase-deadline PATCHes on a cross-game row stay allowed | low | accept | They do not change guilds.active_expansion_id or guilds.game; the row already belongs to the guild; blocking them would stop Classic guilds with a leftover WoW Forever row from saving its schedule |
| T-sfi-04 | Tampering | Direct RLS update of guilds.active_expansion_id bypassing the API | low | accept | Same accepted risk as T-lj6-04: it affects only the actor's own guild's view and crosses no tenant boundary; a DB trigger is out of scope (S-3) |
| T-sfi-05 | Tampering | getExpansionGame on a stored row name such as 'constructor' | low | mitigate | getExpansionGame's own-property guard returns null, so the request falls through like the sibling POST (covered by lj6 tests) |

No package installs, env vars or external services, so no supply-chain entry.
</threat_model>

## Not changed (reported for the orchestrator)

- Server-returned strings shown through data.error on a Forever guild's raid schedule save: 'Expansion not found', 'Failed to update expansion' (PATCH route) and the phase routes' 'Expansion not found'. A Forever guild only sees them if its row disappears mid-session or the database write fails. They are shared with Classic, and the only server change in scope is the S-2 guard.
- app/contexts/ExpansionContext.tsx toast "Couldn't load expansion data. Check your connection and try again." Any page can show it on a network failure. It is not on the user's surface list.
- Help articles in lib/help-content.ts (for example "Enter your guild name, realm, faction and expansion", "Joining mid-expansion"). They are shared static docs that the Discord bot (discord-bot/help.js, S-3) also serves, and they are not guild-aware. "The help page" is taken to mean the /help landing tip.
- The CURRENT pill in the /expansions/[id] header for the WoW Forever row. It is not "expansion" wording (ExpansionManager already hides CURRENT for Forever).
- Pre-existing: in guild mode, CreateReserveRunModal's tile pick never changes which tiers load for Classic guilds either. Not touched.

<verification>
From WT after all three tasks:
- `npm run typecheck` clean.
- `npx eslint` on the nine files in files_modified: 0 errors (existing warnings only).
- `npx vitest run` full suite green, including the new PATCH route test (8 or more cases) and the CreateReserveRunModal test (3 cases).
- `git log --oneline -3` shows the three task commits in order; `git show --name-only --format= <sha>` for each lists only that task's paths; none includes .agents/, .codex/, .gsd/, AGENTS.md or .planning/.
- The human-check lists from Tasks 2 and 3 are recorded as outstanding in the SUMMARY.
</verification>

<success_criteria>
- No API path can make a guild's current expansion one from the other game: add, change-expansion (PR #281) and now PATCH set-current all return 400 GV-C7.
- A Forever officer no longer sees "expansion" or a Classic expansion picker on the raid tiers page, the guild settings load toast, the Priorities hint, sheet import, Create reserve run or the /help tip.
- Classic guilds see every one of those strings exactly as before.
- New user-facing strings are exactly the signed-off EW table; no em dashes.
</success_criteria>

<output>
Create /private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/8235b620-ae38-4661-a5c0-23f69fed77f3/scratchpad/wt-phase06/.planning/workstreams/default/quick/260927-sfi-finish-hiding-the-classic-expansion-ladd/260927-sfi-SUMMARY.md when done (planning worktree; do not commit it from the code worktree).
</output>

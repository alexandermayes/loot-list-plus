---
phase: quick
plan: 261016-tbo
type: execute
status: complete
wave: 1
depends_on: []
files_modified:
  - app/api/addon/loot-award/route.ts
  - app/api/addon/loot-award/__tests__/route.test.ts
  - app/api/addon/import-string/route.ts
  - app/api/addon/import-string/__tests__/route.test.ts
  - companion/src/main/addon-format.ts
  - companion/src/main/__tests__/addon-format.test.ts
  - companion/README.md
  - (addon repo) Modules/LootDistribution.lua
  - (addon repo) Modules/LootHook.lua
  - (addon repo) Core/VersionCompat.lua
  - (addon repo) tests/harness.lua
  - (addon repo) tests/run.lua
  - (addon repo) tests/test_live_context.lua
  - (addon repo) CHANGELOG.md
autonomous: true
requirements: [GH-319]
---

<objective>
Fix GH #319 so an award for an item that drops in more than one of a guild's raid tiers is filed under the tier it actually dropped in, when it arrives through the companion (POST /api/addon/loot-award) or through a paste import with no attendance session.

Purpose: GH #307 taught the server to pick the tier from the award's boss and raid, but the addon sends the cached catalog label ("Shared Boss Loot", "Trash") as the boss and the companion drops the instance name, so the server's hints are empty and the fallback tier wins.

Output: addon stamps the live boss and instance name on each award; companion forwards the instance name as raid_name; server uses it. Two PRs: one in alexandermayes/loot-list-plus (server + companion), one in alexandermayes/loot-list-plus-addon.
</objective>

<context>
Server tier selection already exists: lib/loot/guild-scoped-lookup.ts resolveGuildLootItem(supabase, guildId, wowheadId, hints: LootItemHints) with hints.bossName and hints.raidName; the 'raid' step matches a tier by its name or one of its in-game instance names in data/raid-catalog-names.ts RAID_INSTANCE_NAMES (e.g. "Temple of Ahn'Qiraj" <- "Ahn'Qiraj Temple"). Only the loot-award route never passes raidName, and the import-string route only passes it from a matched attendance session (lib/addon/award-session.ts matchAwardSession).

Addon award construction: Modules/LootDistribution.lua OnLootOpened (line ~97: bossName = item.itemData.bossName or self.currentBossName or "Unknown"; raidName = item.itemData.raidName) and Modules/LootHook.lua (line ~168, same shape for roll-off items). AwardItem (~line 150) and ManualAward (~line 250) copy item.bossName/raidName into the pending award. LD.currentBossName is set by Attendance:OnBossKill via LD:SetBossName(name) and never cleared. VC:GetInstanceInfo() (Core/VersionCompat.lua) returns { name, type, ... }. Attendance sessions already record the live instance name as session.raidName.

Backward compatibility rules:
- raidName on the award stays the catalog raid (History UI and History:GetByRaid filter on it). The live instance goes in a NEW field instanceName so the server can tell a live value from an old cached one. The companion must map instanceName -> raid_name and never raidName -> raid_name (an addon 1.1.0 award's raidName is the last-written cached row, which would steer the 'raid' step wrong).
- The addon export string serialises every pending-award field (Sync:ToJSON), so instanceName also reaches POST /api/addon/import-string; the AddonAward interface there must accept it.
- Missing or malformed raid_name/instanceName is never rejected anywhere; the award takes the old path.

Test infrastructure: addon tests are plain Lua 5.1 run with `luajit tests/run.lua` from the addon repo root; tests/harness.lua installs WoW API stubs (no GetInstanceInfo stub yet) and loads the files in H.MODULE_FILES (LootHook.lua and Attendance.lua are not loaded); h:openLoot(n) builds recognized items from H.WOWHEAD_ID. Main repo: Vitest, `npm test`; companion tests `cd companion && npx vitest run`.

Conventions: no em dashes anywhere; comments say why; keep `// regression for #319` / `-- regression for #319` markers; commit trailer exactly `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`; `git -c core.hooksPath=/dev/null commit`; PR bodies end with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`. User-facing copy (the addon CHANGELOG entry) needs user sign-off: write it, flag it in the PR body, do not merge.
</context>

<tasks>

<task id="1" repo="loot-list-plus">
<name>Server: loot-award accepts raid_name; import-string uses award.instanceName when no session matches</name>
<files>app/api/addon/loot-award/route.ts, app/api/addon/loot-award/__tests__/route.test.ts, app/api/addon/import-string/route.ts, app/api/addon/import-string/__tests__/route.test.ts</files>
<action>
loot-award route:
- Add `raid_name?: string` to LootAwardRequest with a JSDoc: the live instance name from GetInstanceInfo, sent by companion 1.2.0 for awards from addon 1.2.0 (field instanceName); older clients send none.
- Destructure raid_name and pass `{ bossName: boss_name ?? null, raidName: typeof raid_name === 'string' ? raid_name : null }` to resolveGuildLootItem. Add `// regression for #319` at that call.
- Rewrite the GH #307 paragraph of the route JSDoc: the award's boss_name picks the tier first; raid_name (live instance) decides when the boss does not; before #319 no raid name was passed and the addon's boss was the cached catalog label.
- Tests, in the existing `describe('GH #307: multi-tier items follow the award boss')` block using aqFixture(): (a) boss_name 'Shared Boss Loot' + raid_name "Ahn'Qiraj Temple" files 20727 under tier-b-aq40 (matched through RAID_INSTANCE_NAMES); (b) boss_name 'Shared Boss Loot' + raid_name "Ruins of Ahn'Qiraj" files under tier-a-aq20 (tier's own name); (c) boss_name "C'Thun" + raid_name "Ruins of Ahn'Qiraj" still files under tier-b-aq40 (boss wins over raid); (d) raid_name 42 (non-string) is ignored and gets the fallback tier with status 200. Rename the describe to mention #319 alongside #307.

import-string route:
- Add `instanceName?: string` to AddonAward (JSDoc: live instance from GetInstanceInfo, addon 1.2.0 and later).
- In processAward, when matchAwardSession returns null, hints become `{ bossName: award.bossName ?? null, raidName: typeof award.instanceName === 'string' ? award.instanceName : null }`. When a session matched keep the session hints unchanged (its boss kill is time-matched and more precise). Update the comment above: the session is preferred; an award with no session falls back to its own bossName and instanceName, which addon 1.2.0 stamps live (older awards echo the catalog row and carry no instanceName). Add `// regression for #319`.
- Test in the `GH #295 / #307` describe: an award outside any session with bossName 'Shared Boss Loot' and instanceName "Ahn'Qiraj Temple" resolves to the AQ40 row; the same award without instanceName keeps the old behaviour (mirror the existing 'keeps the cached lootItemId when there is no session' test and assert the tier-resolution outcome the fixture allows).

Run `npm run lint`, `npm run typecheck`, `npx vitest run app/api/addon` and the full `npm test`.
</action>
<verify>All four new loot-award tests and the import-string tests pass; existing #307 tests unchanged; lint and typecheck clean.</verify>
<done>POST /api/addon/loot-award files a multi-tier item by raid_name when boss_name is a group label; import-string does the same from award.instanceName when no session matches.</done>
</task>

<task id="2" repo="loot-list-plus">
<name>Companion: forward the addon's instanceName as raid_name</name>
<files>companion/src/main/addon-format.ts, companion/src/main/__tests__/addon-format.test.ts, companion/README.md</files>
<action>
- Add `raid_name?: string` to PendingAwardRequest (JSDoc: the live instance name the addon stamped as instanceName; never the award's raidName, which is the cached catalog raid).
- In toPendingAwardRequests set `raid_name: typeof a['instanceName'] === 'string' && a['instanceName'].trim() !== '' ? a['instanceName'] : undefined`. `// regression for #319`.
- Tests: an award with instanceName "Ahn'Qiraj Temple" and raidName "Temple of Ahn'Qiraj" produces raid_name "Ahn'Qiraj Temple"; an addon 1.1.0 award (raidName only) produces no raid_name key (use toEqual on the whole request object or `expect(req).not.toHaveProperty('raid_name')`); a non-string instanceName is dropped.
- companion/README.md: if it documents the loot-award payload or the addon fields it reads, add raid_name/instanceName there in one sentence; if it does not, leave it.
- `cd companion && npx vitest run && npm run typecheck` (or the companion's equivalent scripts; check companion/package.json). Also `npm run lint` at the root if it covers companion.
</action>
<verify>Companion tests pass including the three new ones; typecheck clean.</verify>
<done>The companion sends raid_name only when the addon stamped a live instance name.</done>
</task>

<task id="3" repo="loot-list-plus-addon">
<name>Addon: live boss and instance name on every award</name>
<files>Modules/LootDistribution.lua, Modules/LootHook.lua, Core/VersionCompat.lua, tests/harness.lua, tests/run.lua, tests/test_live_context.lua, CHANGELOG.md</files>
<action>
Work in the clone at /Users/alexander.mayes/Code/personal/loot-list-plus-addon on a new branch fix/319-live-boss-and-instance from origin/main (currently aa3915d).

Core/VersionCompat.lua: add `function VC:GetLiveInstanceName()` returning GetInstanceInfo()'s name when the instance type is "raid" or "party", else nil (open world and nil names give nil). Guard `type(GetInstanceInfo) == "function"`.

Modules/LootDistribution.lua:
- `LD:SetBossName(name)` also records `self.currentBossInstance = VC:GetLiveInstanceName()` so the boss context is tied to the instance it was killed in. `-- regression for #319`.
- Add `function LD:LiveContext()` returning `instanceName, bossName` where instanceName = VC:GetLiveInstanceName() and bossName = self.currentBossName only when `self.currentBossInstance == instanceName` (both may be nil), else nil. Why: a boss killed in Molten Core must not label trash looted in Blackwing Lair after a zone change.
- In OnLootOpened: `local instanceName, liveBoss = self:LiveContext()`; each current item gets `bossName = liveBoss or item.itemData.bossName or "Unknown"`, `raidName = item.itemData.raidName or "Unknown"` (unchanged), and a new `instanceName = instanceName`.
- AwardItem and ManualAward copy `instanceName = item.instanceName` into the pending award record (and the history record, if the history entry copies item fields the same way; keep both consistent).
- Keep Comms:BroadcastAward as is (it now carries the live boss).

Modules/LootHook.lua (~line 168): same three lines as OnLootOpened, via `LD:LiveContext()`.

Tests:
- tests/harness.lua: stub `GetInstanceInfo = function() return H.instance.name, H.instance.type end` with `H.instance = { name = nil, type = "none" }` reset in installStubs, and `function H:setInstance(name, type)`.
- New tests/test_live_context.lua (add to TEST_FILES in run.lua), Lua 5.1, following test_award_id.lua's shape:
  L1 in a raid with a boss killed there, awards carry bossName = the live boss and instanceName = the instance ("Ahn'Qiraj Temple" after SetBossName("C'Thun")), for both AwardItem and ManualAward, and the export string's awards carry instanceName (decode with h:decodeExport(h.Sync:EncodeExportString())).
  L2 no boss killed yet: bossName falls back to the catalog label ("Shared Boss Loot" or whatever H.sampleGuild() gives H.WOWHEAD_ID), instanceName is still the live instance.
  L3 boss killed in one instance, loot opened in another: the stale boss is ignored, the catalog label is used, instanceName is the new instance.
  L4 outside any instance (type "none"): instanceName is nil and the award record has no instanceName key; raidName is still the catalog raid.
- Run `luajit tests/run.lua` from the addon root; all tests pass.

CHANGELOG.md, under `## Unreleased`, one bullet (user-facing, needs sign-off, no em dashes): "Awards now record the boss you actually killed and the raid you are standing in, so an item that drops in more than one raid is filed under the right one on the website." Do not bump the .toc versions.

Commit, push, open a PR against alexandermayes/loot-list-plus-addon main titled "fix: stamp the live boss and instance on each award (#319)" whose body links alexandermayes/loot-list-plus#319, lists the new instanceName field and the behaviour change, quotes the changelog line as "copy needs sign-off", and ends with the Claude Code line.
</action>
<verify>`luajit tests/run.lua` exits 0 with the four new tests passing; existing tests unchanged.</verify>
<done>Addon awards carry the live boss (when killed in the current instance) and a new instanceName; export strings include it.</done>
</task>

</tasks>

<verification>
- Main repo: `npm run lint && npm run typecheck && npm test` green; companion vitest green.
- Addon: `luajit tests/run.lua` green.
- Manual trace: addon 1.2.0 award {bossName "Shared Boss Loot", instanceName "Ahn'Qiraj Temple"} -> companion {boss_name, raid_name "Ahn'Qiraj Temple"} -> loot-award resolves tier "Temple of Ahn'Qiraj" via 'raid'. Addon 1.1.0 award -> no raid_name -> fallback, as today.
</verification>

<success_criteria>
- Both PRs open with green CI, each body flagging what needs user sign-off (addon changelog copy) and the compatibility matrix (old addon + new companion, new addon + old companion, paste import).
- No SavedVariables field renamed; raidName unchanged.
</success_criteria>

<output>
PR in loot-list-plus on branch fix/319-live-boss-and-raid-name; PR in loot-list-plus-addon on branch fix/319-live-boss-and-instance. Report both PR numbers, test counts before/after, and any deviation.
</output>

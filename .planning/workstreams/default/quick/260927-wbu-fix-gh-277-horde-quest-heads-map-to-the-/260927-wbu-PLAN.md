---
phase: quick-260927-wbu
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - domain/loot/faction-item-aliases.ts
  - domain/loot/__tests__/faction-item-aliases.test.ts
  - app/api/addon/loot-award/route.ts
  - app/api/addon/loot-award/__tests__/route.test.ts
  - app/api/addon/import-string/route.ts
  - app/api/addon/import-string/__tests__/route.test.ts
  - app/(app)/raid-tracking/_client.tsx
  - app/(app)/raid-tracking/__tests__/faction-alias-lookups.test.ts
  - data/__tests__/classic-catalog-completeness.test.ts
autonomous: true
requirements:
  - GH-277-R1
  - GH-277-R2
  - GH-277-R3
  - GH-277-R4
  - GH-277-R5

estimate:
  # estimate-calibration: factor 1, applied false, 0 samples, confidence low,
  # so tokens equals raw_tokens.
  tokens: 75000
  raw_tokens: 75000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "D-02: domain/loot/faction-item-aliases.ts maps each Horde id to its Alliance catalog id: 19002 to 19003 (Head of Nefarian) and 18422 to 18423 (Head of Onyxia). The plan-time audit of wow-classic-items found no other Classic raid faction-variant pair (GH-277-R1)."
    - "D-01: no Horde rows are added to data/classic-wow-raids.ts and no file under supabase/migrations/ is added or changed (GH-277-R1, GH-277-R5)."
    - "D-03: POST /api/addon/loot-award with wowhead_id 19002 or 18422 resolves to the guild catalog's 19003 or 18423 row and records the award instead of returning 404. The companion app's pending-award ingest posts to this route, so it is fixed by the same change (GH-277-R2)."
    - "D-03: POST /api/addon/import-string resolves a Horde quest-head award (no lootItemId) to the Alliance catalog row instead of counting it as an error (GH-277-R2)."
    - "D-03: the raid-tracking loot import (Gargul-format DATE;[ITEM_ID];NAME lines; the issue calls it the RCLootCouncil import) matches Horde ids in all three parse sites: preview, direct import and pending-import parsing. Its not-in-current-expansion fallback query also searches the alias candidates (GH-277-R2)."
    - "Exact id is always tried first and the alias second, so a catalog id is never rewritten and a guild that added the Horde copy by hand still matches its own row (GH-277-R2)."
    - "D-04: data/__tests__/classic-catalog-completeness.test.ts no longer lists 19002 in DELIBERATELY_EXCLUDED. It asserts 19002 is covered by the alias map, that every alias maps a package-only id to a catalog id with the same package name, and that the set of same-name faction siblings of catalog items equals the alias keys exactly (GH-277-R3)."
    - "D-05: each lookup path has a test: helper unit tests, a loot-award route test, an import-string route test and a raid-tracking source guard (GH-277-R4)."
    - "Full vitest suite, npx tsc --noEmit and eslint on the nine touched files pass in the worktree. Branch fix/277-horde-heads is pushed and a DRAFT PR whose body contains 'Fixes #277' is open against main. Nothing is merged, nothing is pushed to main, no --admin is used and no SQL is run against any database (GH-277-R5)."
  artifacts:
    - path: "domain/loot/faction-item-aliases.ts"
      provides: "FACTION_ITEM_ALIASES map plus wowheadIdCandidates, findByWowheadId and resolveByWowheadId helpers"
      contains: "FACTION_ITEM_ALIASES"
    - path: "domain/loot/__tests__/faction-item-aliases.test.ts"
      provides: "Unit tests for the map contents and the exact-first resolution order"
    - path: "app/api/addon/loot-award/__tests__/route.test.ts"
      provides: "Tracer test: Horde id through POST, the alias and the loot_items lookup, to the loot_history insert"
    - path: "app/api/addon/import-string/__tests__/route.test.ts"
      provides: "Route test for addon import-string awards carrying Horde ids"
    - path: "app/(app)/raid-tracking/__tests__/faction-alias-lookups.test.ts"
      provides: "Source guard proving every raid-tracking wowhead lookup goes through the alias helpers"
    - path: "data/__tests__/classic-catalog-completeness.test.ts"
      provides: "Alias-aware completeness gate and alias integrity checks against wow-classic-items"
      contains: "FACTION_ITEM_ALIASES"
  key_links:
    - from: "app/api/addon/loot-award/route.ts"
      to: "domain/loot/faction-item-aliases.ts resolveByWowheadId"
      via: "per-candidate loot_items lookup, exact id first"
      pattern: "resolveByWowheadId"
    - from: "app/api/addon/import-string/route.ts processAward"
      to: "domain/loot/faction-item-aliases.ts resolveByWowheadId"
      via: "same per-candidate lookup when the award has no lootItemId"
      pattern: "resolveByWowheadId"
    - from: "app/(app)/raid-tracking/_client.tsx"
      to: "domain/loot/faction-item-aliases.ts findByWowheadId and wowheadIdCandidates"
      via: "three in-memory matches plus the fallback query's candidate list"
      pattern: "findByWowheadId\\("
    - from: "companion/src/main/sync-engine.ts readPendingFromSavedVars"
      to: "app/api/addon/loot-award/route.ts"
      via: "companion api-client POSTs each pending award's wowhead_id; no companion change is needed"
      pattern: "api/addon/loot-award"
    - from: "data/__tests__/classic-catalog-completeness.test.ts"
      to: "domain/loot/faction-item-aliases.ts FACTION_ITEM_ALIASES"
      via: "alias-aware missing check and sibling-set equality against the package"
      pattern: "FACTION_ITEM_ALIASES"
---

<objective>
Fix GH #277. The Classic catalog (data/classic-wow-raids.ts) lists only the Alliance quest heads: Head of Nefarian 19003 (Blackwing Lair, Nefarian) and Head of Onyxia 18423 (Onyxia's Lair, Onyxia). Horde guilds loot the Horde copies, 19002 and 18422. Every path that turns an external wowhead_id into a guild's loot_items row therefore fails for Horde guilds. The addon loot-award route returns 404 "No loot item found", and the raid-tracking loot import reports "Item #19002 not in database".

User decisions (locked, do not revisit). They are numbered here for traceability:
- D-01: do NOT add Horde rows to the catalog and do NOT add a migration.
- D-02: add a faction-variant alias map from the Horde id to the Alliance catalog id: 19002 to 19003 and 18422 to 18423, plus any other Classic raid faction-variant pair in wow-classic-items. The plan-time audit (recorded below) found no others.
- D-03: apply the alias at EVERY place that resolves an external wowhead_id to a loot_items row.
- D-04: in data/__tests__/classic-catalog-completeness.test.ts, remove 19002 from the deliberate-exclusions list and replace it with an assertion that the alias map covers it.
- D-05: add tests for each lookup path.

Purpose: Horde officers can record quest-head awards from the addon, the companion app and the raid-tracking import, just like Alliance officers.
Output: one new domain module, edits to two API routes and the raid-tracking client, one updated and four new test files, a pushed branch and one DRAFT PR "Fixes #277".
</objective>

<lookup_path_inventory>
Every site on origin/main 21853a3f that touches wowhead_id was checked. The result:

FIXED by this plan (inbound: an external id resolved to a loot_items row):
1. app/api/addon/loot-award/route.ts lines 48-58. A loot_items select filtered by equality on wowhead_id, then limit(1).single(). Callers are the in-game addon and the companion app.
2. companion/src/main/sync-engine.ts readPendingFromSavedVars (line 285), then companion/src/main/api-client.ts line 120, which POSTs to /api/addon/loot-award. The companion does not resolve ids itself for ingest, so path 1 fixes it. No companion code changes.
3. app/api/addon/import-string/route.ts processAward, lines 164-178. The same equality lookup, used when an award has no lootItemId.
4. app/(app)/raid-tracking/_client.tsx, all fed by the Gargul-format paste import (DATE;[ITEM_ID];NAME, notes "Imported from Gargul"). This is the path the issue calls the RCLootCouncil import. No RCLootCouncil-specific importer exists in the repo.
   - 4a. parseLootPreview, line 1347: an in-memory find over lootItems.
   - 4b. The import handler, line 1807: an in-memory find over itemsToUse.
   - 4c. The same handler's fallback query, lines 1812-1822. On a miss it queries loot_items by wowhead_id to choose between "exists but not in current expansion" and "not in database". This is the source of the issue's error message.
   - 4d. parseLootImportData, line 2006: an in-memory find over lootItems. It feeds pendingLootImports and the manual LootItemSelectionModal.

CHECKED, NOT AFFECTED (no external id to loot_items resolution, or quest heads cannot occur):
- app/api/bot/priority/route.ts (Discord bot): matches items by name with ilike. Both copies share the name. discord-bot/interactions.js only renders item_wowhead_id as a link.
- app/api/admin/sheet-import/route.ts with lib/sheet-import/items-parser.ts: matches by name.
- app/(app)/raid-tracking/import/_client.tsx: a loot-table CSV import that creates catalog rows from a wowhead_id column. It resolves nothing.
- app/api/loot-history/route.ts and bulk/route.ts: take loot_item_id (uuid) only.
- app/api/prio-list/route.ts item_id: set internally from catalog rows, never external.
- app/api/character-gear/route.ts and app/contexts/LootListContext.tsx equipped-id matching: equipped gear only, and quest heads cannot be equipped.
- Reserve runs (app/(app)/reserve/runs/[id]/_client.tsx, app/reserve/join/[token]/page.tsx, app/api/reserve-runs/join/[token]/route.ts): keyed by loot_item uuid.
- SQL side: no migration function or RPC matches on an external wowhead id. The only loot RPC is save_submission_items, which takes loot_item ids.

NOT FIXED, EXPLICIT NOTE (the alias cannot be applied cleanly in this repo). See OD-01:
- Outbound exports keyed by catalog id, which in-game tools then match against the dropped item id:
  - the Gargul DFT prio export (domain/loot/gargul-dft.ts);
  - the Gargul soft-reserve export (domain/reserve/gargul-export.ts);
  - the addon payloads from app/api/addon/guild-data/route.ts and app/api/addon/export-string/route.ts;
  - the companion's SavedVariables tables (companion/src/main/sync-engine.ts convertItemsToLuaFormat and convertMembersToLuaFormat), read in-game by addon/LootListPlus/Modules/ScoreEngine.lua through member.items[tostring(wowheadId)].
  When a Horde head drops, those in-game lookups use 19002 or 18422 and find no entry. The resolution happens in Lua, outside this code base, and only ScoreEngine.lua of the addon is in the repo. So no server-side alias lookup can fix it.
</lookup_path_inventory>

<alias_audit>
Plan-time audit of wow-classic-items (node against the main checkout's node_modules). It covered every package item with id below 25000 whose name equals a Classic catalog item's name:
- Head of Nefarian: 19002 (Horde) and 19003 (Alliance, catalog). Both are Epic Boss Drops from Nefarian, zone 2677. This is a faction pair, so it is aliased.
- Head of Onyxia: 18422 (Horde) and 18423 (Alliance, catalog). Both are Epic; the package gives neither a source zone. This is a faction pair, so it is aliased.
- Bindings of the Windseeker: 18563 and 18564. These are the left and right halves, both already in the catalog under Baron Geddon and Garr. Not a faction pair.
- Warblade of the Hakkari: 19865 (Main Hand) and 19866 (Off Hand), both already in the catalog. Not a faction pair.
- Draconic for Dummies (21103-21110): chapters of a quest item. 21110 is deliberately excluded and none is in the catalog, so no catalog name matches.
The package has no faction field (the item keys are itemId, name, icon, class, subclass, sellPrice, quality, itemLevel, requiredLevel, slot, tooltip, itemLink, vendorPrice, contentPhase, source, uniqueName). So "same name as a catalog item, id not in the catalog" is the detection rule. On this package version it yields exactly [18422, 19002]. The new sibling-set test enforces the rule, so a future package pair fails loudly.
Out of scope: TBC's Magtheridon's Head. The TBC catalog lists neither variant, so it has no lookup to alias.
</alias_audit>

<open_decisions>
## OD-01 (OPEN, not implemented): alias keys in outbound exports for in-game tools?
When a Horde officer's in-game tool (Gargul prio tooltip, Gargul soft-reserve, the LootListPlus addon's score preview) sees 19002 or 18422 drop, it finds no entry, because every export is keyed by the catalog's Alliance id. Options:
(a) Leave it to a follow-up issue. This is recommended. It is outside D-03's "external id to loot_items row" definition, and the addon Lua that does the lookup is mostly not in this repo, so the result cannot be verified here.
(b) Emit a duplicate block keyed by the Horde id in the Gargul DFT export. This is a clean, testable pure-function change in domain/loot/gargul-dft.ts. Soft-reserve duplication and the addon/companion tables need someone to check the addon's behaviour first.
The PR body states OD-01 so the user can decide.

## OD-02 (OPEN, pre-existing, not introduced here): addon lookups are not scoped to the guild
loot_items has no guild_id; rows belong to a guild through raid_tier_id, then expansions.guild_id. Both addon routes resolve wowhead_id with the service-role client and limit(1), with no guild or expansion filter. They can pick another guild's catalog row for ANY item, not only the heads. The loot-award comment "Maps wowhead_id to loot_items.id via the guild's raid tiers" does not match what the code does. This plan keeps the existing query shape and only adds the alias candidate. Tests assert only on the wowhead_id filter values, so a later scoping fix does not have to rewrite them. Recommend a separate issue. The PR body states OD-02.
</open_decisions>

<execution_context>
@/Users/alexander.mayes/Code/personal/loot-list-plus/.claude/gsd-core/workflows/execute-plan.md
@/Users/alexander.mayes/Code/personal/loot-list-plus/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@/Users/alexander.mayes/Code/personal/loot-list-plus/.claude/CLAUDE.md
@/Users/alexander.mayes/Code/personal/loot-list-plus/.planning/workstreams/default/STATE.md

WORKTREE: all code work happens in /private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/231d8fc6-02b5-498f-83b0-d947fb328259/scratchpad/wt277, called WT below. It is on the new branch fix/277-horde-heads, created from origin/main, and every repo-relative path in this plan is relative to WT.

The main checkout at /Users/alexander.mayes/Code/personal/loot-list-plus is on docs/273-debug-resolved. Its local main has diverged from origin/main and is checked out in another session's worktree. Do NOT read application code from the main checkout, and do NOT edit or commit code there. Read source from WT, or with `git show origin/main:<path>`. Shell cwd resets between Bash calls, so prefix every command with `cd WT &&` or use `git -C WT`.

Facts verified at plan time against origin/main 21853a3f (no need to re-check):
- The loot_items Row has id, name, raid_tier_id and wowhead_id (number | null), and no guild_id. The raid-tracking LootItem type (app/(app)/raid-tracking/components/types.ts) is { id, name, wowhead_id: number, boss_name, raid_tier_id }. lootItems is useState<LootItem[]> at _client.tsx line 146, and itemsToUse is set at line 1758.
- The loot-award route imports NextRequest, NextResponse and after from next/server, getAuthenticatedUser from @/utils/supabase/server, createServiceRoleClient from @/utils/supabase/service-role, verifyOfficerPermissions from @/utils/server-roles, trackApiError and trackEvent from @/utils/analytics/server, evaluateGuildFunnel from @/utils/analytics/funnel, and notifyLootAward from @/lib/discord-loot-announcements. Its Supabase sequence after the officer check:
  - loot_items select('id, name, raid_tier_id') with a wowhead_id equality filter, limit(1), single();
  - raid_tiers select('expansion_id') eq id, single();
  - character_guild_memberships select eq eq, awaited as a thenable;
  - loot_history insert(payload).select('id').single().
  It then calls after(() => notifyLootAward(...)) unconditionally on success, and returns data { id, item_name, character_name, character_id }. The 404 body is "No loot item found for wowhead_id <id>".
- The import-string route adds recomputeBlpForEvents (@/utils/blp/recompute), importAttendanceByTeam (@/utils/raid-events/team-routing) and inflateRawSync (zlib). The input format is the string "LLP1E:" + "1:" + base64(deflateRaw(JSON)). The JSON is { guildId, exportedAt, awards: [{ wowheadId, lootItemId?, characterName, awardedAt, manual? }], attendance: [] }. processAward is not exported, so test it through POST. Do NOT export helpers from route.ts, because Next's route export check rejects non-handler exports. The response is { data: { awards: { processed, errors }, attendance: { processed, errors } } }. processAward inserts into loot_history, awaited as a thenable that resolves { error }. after() is only called when announceQueue is non-empty.
- Route test pattern to copy: app/api/guilds/change-expansion/__tests__/route.test.ts. It has the `// @vitest-environment node` header, vi.mock of each server module, and a chainable, thenable recording fake Supabase client with eslint-disable comments for any. next/server's after() must be mocked in these tests, via vi.mock('next/server') with importOriginal spread and after: vi.fn().
- Source-reading test precedent: app/__tests__/sitemap.test.ts reads source with fs.readFileSync and path.join(__dirname, ...).
- domain/loot/index.ts is a partial barrel and does not need the new module. Import it directly from '@/domain/loot/faction-item-aliases'.
- Test runner: vitest 4 (globals, jsdom by default, alias '@' maps to the repo root). Scripts: npm test (vitest run), npm run typecheck (tsc --noEmit), npm run lint (eslint).
- No package install, no env var, no external service, no migration, no user-facing copy change. Error strings stay byte-identical.

<interfaces>
New module domain/loot/faction-item-aliases.ts (pure, no imports):
- FACTION_ITEM_ALIASES: Readonly<Record<number, number>>. Horde wowhead id to Alliance catalog wowhead id. Exactly { 18422: 18423, 19002: 19003 }, frozen, with one comment per entry naming the item.
- wowheadIdCandidates(wowheadId: number): number[]. Returns the given id first, then its alias target if one exists. Otherwise returns only the given id.
- findByWowheadId<T extends { wowhead_id: number | null }>(items: readonly T[], wowheadId: number): T | undefined. Returns the first item whose wowhead_id equals the first candidate, else the second candidate.
- resolveByWowheadId<T>(wowheadId: number, lookup: (candidate: number) => PromiseLike<T | null | undefined>): Promise<T | null>. Awaits lookup for each candidate in order and returns the first non-null result without calling lookup again. Returns null when every candidate misses.
</interfaces>
</context>

<tasks>

<task type="tracer" tdd="true">
  <name>Task 1: Tracer, Horde quest head recorded through the addon loot-award route (alias module, route, tests)</name>
  <files>domain/loot/faction-item-aliases.ts, domain/loot/__tests__/faction-item-aliases.test.ts, app/api/addon/loot-award/route.ts, app/api/addon/loot-award/__tests__/route.test.ts</files>
  <read_first>WT/app/api/addon/loot-award/route.ts (whole file, 137 lines), WT/app/api/guilds/change-expansion/__tests__/route.test.ts (lines 1-60 for the mock and fake pattern), WT/data/classic-wow-raids.ts (lines 536-570 and 590-620, to confirm 19003 sits under Nefarian and 18423 under Onyxia)</read_first>
  <behavior>
    - FACTION_ITEM_ALIASES deep-equals { 18422: 18423, 19002: 19003 } (D-02).
    - wowheadIdCandidates(19002) is [19002, 19003]; wowheadIdCandidates(18422) is [18422, 18423]; wowheadIdCandidates(19003) is [19003]; wowheadIdCandidates(12345) is [12345]. Alliance ids never alias back.
    - findByWowheadId over rows holding only a 19003 row, given 19002, returns the 19003 row. Given rows holding both 19002 and 19003, it returns the 19002 row (exact first). It returns undefined on no match and ignores rows whose wowhead_id is null.
    - resolveByWowheadId(19002, lookup) calls lookup with 19002 then 19003 and returns the 19003 hit. When the 19002 lookup hits, lookup is called exactly once. A non-alias id calls lookup exactly once. It returns null when all candidates miss.
    - Route: POST wowhead_id 19002 against a fake whose loot_items holds only a 19003 row returns 200. data.item_name is 'Head of Nefarian', the loot_history insert payload's loot_item_id is the 19003 row id, and the recorded loot_items wowhead_id filter values are [19002, 19003] in that order.
    - Route: POST 18422 resolves the 18423 row the same way.
    - Route: when the fake holds both 19002 and 19003 rows, POST 19002 inserts the 19002 row id after one loot_items lookup.
    - Route: POST 19003 makes one loot_items lookup and returns 200.
    - Route: POST 99999 returns 404, the error contains 99999, there is exactly one loot_items lookup and no loot_history insert.
  </behavior>
  <action>
Step 0, worktree setup (once, before anything else):
- Run `git -C /Users/alexander.mayes/Code/personal/loot-list-plus fetch origin main`.
- Run `git -C /Users/alexander.mayes/Code/personal/loot-list-plus worktree add -b fix/277-horde-heads WT origin/main`, with WT as the absolute scratchpad path from the context block. If the branch or directory already exists, STOP and report. Do not reset, delete or reuse either one.
- Symlink the dependencies with `ln -s /Users/alexander.mayes/Code/personal/loot-list-plus/node_modules WT/node_modules`.
- Record a baseline with `cd WT && npx vitest run 2>&1 | tail -30`. Note any failing test names for the SUMMARY, so Task 3 can tell pre-existing failures from new ones. If vitest cannot start because the symlinked node_modules does not match origin/main's package-lock.json, STOP and report. Do not run npm install in the main checkout.

RED 1: create domain/loot/__tests__/faction-item-aliases.test.ts covering the helper bullets in the behavior block. Run it and see it fail, because the module does not exist.

GREEN 1: create domain/loot/faction-item-aliases.ts exactly as the interfaces block specifies. Give it a file header comment covering four points:
- GH #277: the Classic catalog lists only the Alliance quest heads.
- The user decision (D-01): no Horde rows and no migration. Instead, map Horde ids onto the catalog ids at every lookup (D-02, D-03).
- Why the exact id comes first: a catalog id is never rewritten, and a guild that added the Horde copy by hand keeps matching its own row.
- The completeness test enforces that the map is complete.
Keep it pure, with no imports. Add JSDoc on each export, per the repo conventions. Run the unit test green.

RED 2: create app/api/addon/loot-award/__tests__/route.test.ts.
- Use the `// @vitest-environment node` header.
- vi.mock getAuthenticatedUser (resolve user id 'user-1'), verifyOfficerPermissions (hasPermission true), createServiceRoleClient, trackEvent, trackApiError, evaluateGuildFunnel, notifyLootAward, and next/server's after, keeping the rest of next/server through importOriginal.
- Build a recording fake modelled on the change-expansion test: every builder method returns the builder, and each eq call records its column and value.
  - loot_items single() resolves { data: row } when the recorded wowhead_id value is in the fake's catalog map (keyed by wowhead id; rows look like { id: 'item-19003', name: 'Head of Nefarian', raid_tier_id: 'tier-bwl' }). Otherwise it resolves { data: null, error: { code: 'PGRST116' } }.
  - raid_tiers single() resolves { data: { expansion_id: 'exp-1' } }.
  - character_guild_memberships resolves an empty data array through then.
  - loot_history insert records its payload, and single() resolves { data: { id: 'hist-1' } }.
- Assert on the wowhead_id filter values only, not on the absence of any other filter, so a later OD-02 guild-scoping fix does not need to rewrite these tests.
- Run it. The 19002 and 18422 cases must fail with 404 against the unmodified route. Record that RED evidence for the SUMMARY.

GREEN 2 (D-03): in app/api/addon/loot-award/route.ts, import resolveByWowheadId. Replace the single lootItem query with a resolveByWowheadId call whose lookup runs the same select('id, name, raid_tier_id') with the wowhead_id equality filter on the candidate, then limit(1) and single(), and returns data. Keep these unchanged:
- the auth, officer check and 400 validation, which all still run before the lookup;
- the 404 status and message, which still interpolate the submitted wowhead_id;
- the raid_tiers check and everything after it.
Update the JSDoc line about mapping wowhead_id so it mentions faction aliases (GH #277). Do not add guild scoping (OD-02). Run both test files green.

Commit only these four files in WT with a message like "fix(277): resolve Horde quest heads through a faction alias map in addon loot-award". End the message with a blank line and the trailer: Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  </action>
  <verify>
    <automated>cd /private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/231d8fc6-02b5-498f-83b0-d947fb328259/scratchpad/wt277 && npx vitest run domain/loot/__tests__/faction-item-aliases.test.ts app/api/addon/loot-award/__tests__/route.test.ts && git log -1 --format=%B | grep -c "Co-Authored-By: Claude Opus 5.5"</automated>
  </verify>
  <done>WT exists on fix/277-horde-heads from origin/main, with node_modules symlinked, and baseline vitest failures (if any) are recorded. The helper tests and the loot-award route tests pass. The route tests' Horde cases failed before the route change, and that RED evidence is recorded. The route diff against origin/main touches only the import, the lookup block and the JSDoc line. One commit carries the four files and the Co-Authored-By trailer.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Apply the alias to addon import-string and the raid-tracking loot import, and make the completeness gate alias-aware</name>
  <files>app/api/addon/import-string/route.ts, app/api/addon/import-string/__tests__/route.test.ts, app/(app)/raid-tracking/_client.tsx, app/(app)/raid-tracking/__tests__/faction-alias-lookups.test.ts, data/__tests__/classic-catalog-completeness.test.ts</files>
  <read_first>WT/app/api/addon/import-string/route.ts (lines 1-215), WT/app/api/addon/loot-award/__tests__/route.test.ts (the Task 1 fake, to reuse its shape), WT/app/(app)/raid-tracking/_client.tsx (lines 1-45 for imports, 1318-1368, 1790-1840 and 1962-2020), WT/app/__tests__/sitemap.test.ts (lines 100-115, for the fs source-reading pattern), WT/data/__tests__/classic-catalog-completeness.test.ts (whole file, 252 lines)</read_first>
  <behavior>
    - import-string: a payload with one award { wowheadId: 19002, characterName: 'Thrall', awardedAt: '2026-09-20T20:00:00Z' } and a fake catalog holding only the 19003 row returns 200 with data.awards { processed: 1, errors: 0 }. The loot_history insert has loot_item_id 'item-19003', and the recorded wowhead_id filter values are [19002, 19003].
    - import-string: an award that carries lootItemId makes no loot_items lookup (unchanged behaviour).
    - import-string: an award with wowheadId 99999 gives data.awards { processed: 0, errors: 1 } and no loot_history insert.
    - Raid-tracking source guard: _client.tsx imports findByWowheadId and wowheadIdCandidates from '@/domain/loot/faction-item-aliases' and calls findByWowheadId( exactly 3 times. It has zero strict-equality comparisons of a row's wowhead_id with itemId, zero Supabase equality filters on the wowhead_id column, and one fallback query filtering wowhead_id with the in operator over wowheadIdCandidates(itemId).
    - Raid-tracking behaviour: a Gargul line for item 19002, parsed with the component's bracket regex and matched with findByWowheadId against a lootItems list holding only the 19003 row, returns that row.
    - Completeness (D-04): DELIBERATELY_EXCLUDED has no 19002 key, and the Epic/Legendary missing-items test still passes because it counts an aliased package id as present when its alias target is listed under the same raid.
    - Completeness (D-04): FACTION_ITEM_ALIASES maps 19002 to 19003, and the catalog lists 19003 under Blackwing Lair, Nefarian. It maps 18422 to 18423, and the catalog lists 18423 under Onyxia's Lair, Onyxia.
    - Completeness: for every alias entry, both ids exist in the package with the same name, the target is a catalog id, the key is not a catalog id, the key is not in DELIBERATELY_EXCLUDED, and no target is itself an alias key.
    - Completeness: the sorted ids of package items (id below MAX_CLASSIC_ITEM_ID) that share a name with a catalog item but are not catalog ids equal the sorted alias keys, which is [18422, 19002] today.
  </behavior>
  <action>
RED first, then GREEN, per file group. Record each RED run for the SUMMARY.

(a) Addon import-string (D-03, D-05)
- RED: create app/api/addon/import-string/__tests__/route.test.ts. Use the node environment header and the same mocks as the Task 1 route test, plus recomputeBlpForEvents and importAttendanceByTeam.
- Build the request body's importString from the "LLP1E:" and "1:" prefixes followed by base64 of zlib deflateRawSync of the JSON payload, with guildId 'g1' and an empty attendance array.
- Reuse the Task 1 fake shape. The loot_history insert here is awaited as a thenable resolving { error: null }. Cover the three import-string bullets. The 19002 case fails against the unmodified route.
- GREEN: in processAward, keep the lootItemId short-circuit. When it is absent and award.wowheadId is set, resolve through resolveByWowheadId, whose lookup runs the existing select('id') query on the candidate and returns data. Assign the result's id to lootItemId. Keep the thrown "Could not resolve item for wowhead_id" message unchanged. Do not export anything new from route.ts. Do not add guild scoping (OD-02).

(b) Raid-tracking loot import (D-03, D-05)
- RED: create app/(app)/raid-tracking/__tests__/faction-alias-lookups.test.ts, reading ../_client.tsx with fs and path.join(__dirname, ...). Cover the source-guard bullet and the behaviour bullet. Add a header comment explaining that the component is too large to render in a test, so this guard proves every wowhead lookup in it goes through the alias helpers. Note there that the component's pasted format is Gargul's, and that GH #277 calls this the RCLootCouncil import. It fails against the unmodified component.
- GREEN: in app/(app)/raid-tracking/_client.tsx, import findByWowheadId and wowheadIdCandidates from '@/domain/loot/faction-item-aliases', placed with the other '@/domain/...' imports. Then:
  - Replace the in-memory lootItems or itemsToUse find at each of the three parse sites (parseLootPreview, the import handler and parseLootImportData) with findByWowheadId over the same array and itemId.
  - In the import handler's not-matched fallback query, replace the wowhead_id equality filter with the in operator over wowheadIdCandidates(itemId). Keep limit(1) and both error strings exactly as they are.
  - Change nothing else in the file.

(c) Completeness gate (D-04)
- Import FACTION_ITEM_ALIASES from '@/domain/loot/faction-item-aliases'.
- Delete the 19002 entry from DELIBERATELY_EXCLUDED. Run the suite and see the missing-items test fail on 19002 (RED).
- In that test, compute each package item's catalog id as its alias target when the id is an alias key, otherwise the id itself. Check the raid key with that id, and rename the test to say "unless deliberately excluded or covered by a faction alias".
- Add a describe block 'Classic faction-variant aliases (#277)' holding the three remaining completeness bullets: the two named-head assertions, the per-alias integrity check and the sibling-set equality.
- Add a comment on the sibling-set test with the audit facts from the alias_audit block. Windseeker halves and the Warblade main-hand and off-hand pair are both listed, so they are not siblings. The package has no faction field, so the same-name rule is the detector.
- Leave the historical RED-evidence header comment and every other test unchanged.

Run the three test files green. Commit these five files in WT with a message like "fix(277): apply the faction alias to addon import-string and the raid-tracking loot import". End the message with the Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com> trailer.
  </action>
  <verify>
    <automated>cd /private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/231d8fc6-02b5-498f-83b0-d947fb328259/scratchpad/wt277 && npx vitest run app/api/addon/import-string/__tests__/route.test.ts "app/(app)/raid-tracking/__tests__/faction-alias-lookups.test.ts" data/__tests__/classic-catalog-completeness.test.ts domain/loot/__tests__/faction-item-aliases.test.ts app/api/addon/loot-award/__tests__/route.test.ts</automated>
  </verify>
  <done>All five listed test files pass. Each new test failed against the unmodified code first, and that RED evidence is recorded. `git -C WT diff HEAD~1 -- "app/(app)/raid-tracking/_client.tsx"` shows only the one import line, the three find replacements and the one fallback-filter change. DELIBERATELY_EXCLUDED no longer contains 19002. One commit carries the five files and the Co-Authored-By trailer.</done>
</task>

<task type="auto">
  <name>Task 3: Full verification in the worktree, push the branch, open the DRAFT PR "Fixes #277"</name>
  <files>(no source changes; git push and gh pr create only)</files>
  <read_first>WT/.github/pull_request_template.md if it exists (follow its headings), and the SUMMARY notes from Tasks 1 and 2 (baseline and RED evidence)</read_first>
  <action>
1. Run `cd WT && npx vitest run`. Compare the result with the Task 1 baseline. There must be no new failures. If a baseline failure remains, name it in the PR body and SUMMARY as pre-existing.
2. Run `cd WT && npx tsc --noEmit`. It must be clean.
3. Run eslint on the nine touched files, quoting the paths with parentheses: `cd WT && npx eslint domain/loot/faction-item-aliases.ts domain/loot/__tests__/faction-item-aliases.test.ts app/api/addon/loot-award/route.ts app/api/addon/loot-award/__tests__/route.test.ts app/api/addon/import-string/route.ts app/api/addon/import-string/__tests__/route.test.ts "app/(app)/raid-tracking/_client.tsx" "app/(app)/raid-tracking/__tests__/faction-alias-lookups.test.ts" data/__tests__/classic-catalog-completeness.test.ts`. It must be clean. If something fails, fix it, re-run, and commit the fix with the trailer.
4. Scope checks. `git -C WT diff --name-only origin/main...HEAD` lists exactly the nine files in files_modified. `git -C WT diff --name-only origin/main...HEAD -- supabase data/classic-wow-raids.ts` prints nothing (D-01: no migration, no Horde rows).
5. Push only the fix branch: `git -C WT push -u origin fix/277-horde-heads`.
6. Write the PR body to a file in the scratchpad directory (not in WT), with these sections:
   - Summary: Horde quest heads 19002 and 18422 now resolve to the catalog's 19003 and 18423 through FACTION_ITEM_ALIASES, with no new rows and no migration. The exact id is tried first.
   - Lookup paths fixed: the lookup_path_inventory FIXED list, covering the addon loot-award route (which also fixes companion ingest), addon import-string, and the raid-tracking Gargul-format import with its four sites. Say that this last one is the import the issue calls RCLootCouncil.
   - Checked and not affected: the short list from the inventory.
   - Alias audit: only these two Classic faction pairs exist in wow-classic-items. Windseeker and Warblade are distinct items, and both are listed.
   - Not changed, needs a decision: OD-01 (outbound exports and in-game lookups) and OD-02 (the pre-existing unscoped addon lookup), each with its options and recommendation.
   - Tests: the new and updated test files, the RED evidence, and the full suite, tsc and eslint results.
   - The line "Fixes #277".
   - Last line exactly: 🤖 Generated with [Claude Code](https://claude.com/claude-code)
   Use no em dashes anywhere in the title or body.
7. Open the PR from WT: `gh pr create --draft --base main --head fix/277-horde-heads --title "fix: resolve Horde quest heads to the Classic catalog ids (#277)" --body-file <body file>`.
8. Hard limits. Do NOT merge. Do NOT use --admin. Do NOT push to main. Do NOT run SQL, supabase db push, psql or any Management API call against any database. Do NOT edit or commit anything in the main checkout.
  </action>
  <verify>
    <automated>cd /private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/231d8fc6-02b5-498f-83b0-d947fb328259/scratchpad/wt277 && npx tsc --noEmit && test -z "$(git diff --name-only origin/main...HEAD -- supabase data/classic-wow-raids.ts)" && gh pr view fix/277-horde-heads --json isDraft,baseRefName,headRefName,title,body --jq '[.isDraft, .baseRefName, .headRefName, (.body | contains("Fixes #277")), ((.title + .body) | contains("—") | not), (.body | endswith("🤖 Generated with [Claude Code](https://claude.com/claude-code)"))]'</automated>
  </verify>
  <done>The full vitest run shows no failures beyond the recorded baseline, and tsc and eslint are clean. The branch diff is exactly the nine planned files, with nothing under supabase/ and no change to data/classic-wow-raids.ts. origin/fix/277-horde-heads exists. The gh check prints [true, "main", "fix/277-horde-heads", true, true, true]. The draft PR presents the lookup-path inventory, the alias audit, OD-01 and OD-02. origin/main is unchanged and no database was touched.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| addon / companion to API | wowhead_id and awards arrive from officer-controlled clients (JSON body or an encoded import string) |
| browser to Supabase (raid-tracking) | pasted Gargul lines are parsed client-side, and queries run under the user's RLS session |
| executor to shared infrastructure | the executor holds git and gh credentials that could reach main or production |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-277-01 | Tampering | FACTION_ITEM_ALIASES | medium | mitigate | An alias could send an award to the wrong item. The completeness test asserts that each alias key and target share the same package name, that the target is a catalog id and the key is not, that there are no chains, and that the key set equals the detected same-name siblings exactly. The exact id is always tried first, so no catalog id is ever rewritten |
| T-277-02 | Elevation of Privilege | loot-award and import-string routes | high | mitigate | The alias lookup is inserted where the existing lookup sits, after getAuthenticatedUser and verifyOfficerPermissions. Task 1 and Task 2 actions forbid reordering. The route tests run with the officer mock and assert the 404 and error paths still behave |
| T-277-03 | Information Disclosure | unscoped service-role wowhead lookup (OD-02) | medium | accept | Pre-existing for every item and not introduced or widened by this change: the same query shape runs with one extra candidate id. It is documented as OD-02 in the plan and the PR for a separate issue |
| T-277-04 | Denial of Service | per-candidate lookups | low | accept | At most one extra indexed query, and only for the two alias keys after an exact miss. Every other id makes one query, as before |
| T-277-05 | Tampering | executor actions against main and production | high | mitigate | The plan forbids merging, --admin, pushing to main, SQL, db push, psql and Management API calls. Only fix/277-horde-heads is pushed and the PR is a draft. No migration exists (Task 3 scope check) |
| T-277-SC | Tampering | package installs | low | accept | No npm, pip or cargo install is performed. node_modules is symlinked from the main checkout |
</threat_model>

<verification>
- `npx vitest run` in WT shows no failures beyond the Task 1 baseline.
- `npx tsc --noEmit` and eslint on the nine touched files are clean.
- The branch diff equals files_modified. Nothing under supabase/ changed, and data/classic-wow-raids.ts is unchanged (D-01).
- The draft PR is open against main with "Fixes #277", no em dashes, and the Claude Code closing line.
</verification>

<success_criteria>
- A Horde officer's addon or companion award for 19002 or 18422 is recorded against the guild catalog's Alliance quest-head row (D-02, D-03).
- Addon import-string awards and raid-tracking Gargul-format imports carrying Horde head ids match instead of failing (D-03).
- The completeness suite proves the alias map covers 19002 and 18422 and fails loudly if a new faction pair appears (D-04).
- Every fixed lookup path has a test that failed before the change (D-05).
- OD-01 and OD-02 are presented to the user, unimplemented.
</success_criteria>

<output>
Create `/Users/alexander.mayes/Code/personal/loot-list-plus/.planning/workstreams/default/quick/260927-wbu-fix-gh-277-horde-quest-heads-map-to-the-/260927-wbu-SUMMARY.md` when done. The planning directory lives in the main checkout, not in WT; do not commit it from WT. Include:
- the PR URL;
- the baseline vitest result and the RED evidence for each new test;
- the final lookup-path inventory, if execution found anything the plan missed;
- OD-01 and OD-02, restated as still open.
</output>

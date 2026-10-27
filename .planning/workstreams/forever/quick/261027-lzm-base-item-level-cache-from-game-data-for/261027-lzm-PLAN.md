---
phase: quick-261027-lzm
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  # feat/equipped-item-level-migration branch (worktree loot-list-plus-wt-ilvl-migration), migration-only PR
  - supabase/migrations/20261027120000_item_base_levels.sql
  - app/services/__tests__/item-base-levels-migration.test.ts
  - supabase/migrations/20261026120000_equipped_item_level.sql
  # feat/armory-item-level branch (worktree loot-list-plus-wt-ilvl-code), code PR
  - lib/battlenet-item-levels.ts
  - lib/__tests__/battlenet-item-levels.test.ts
  - lib/battlenet.ts
  - lib/database.types.ts
  - app/api/battlenet/characters/sync-gear/route.ts
  - app/api/battlenet/characters/import/route.ts
  - app/api/battlenet/characters/import/__tests__/route.test.ts
  - app/api/characters/[id]/link-battlenet/route.ts
  - app/(app)/master-sheet/components/ItemCandidateModal.tsx
  - scripts/spikes/item-base-level-spike.ts
  # gsd/quick-261027-lzm-... branch (main checkout, planning docs only)
  - .planning/workstreams/forever/quick/261027-lzm-base-item-level-cache-from-game-data-for/261027-lzm-SUMMARY.md
autonomous: true
requirements: [LZM-R1, LZM-R2, LZM-R3, LZM-R4, LZM-R5, DELIVERY-R1]
user_setup:
  - service: battle-net
    why: "Owner-run Game Data probe; the agent may not materialise production credentials (auto-mode classifier)"
    env_vars:
      - name: BLIZZARD_CLIENT_ID
        source: "Vercel production environment, pulled by the owner to a temporary file outside the repo"
      - name: BLIZZARD_CLIENT_SECRET
        source: "Vercel production environment, same file"

estimate:
  tokens: 120000
  raw_tokens: 120000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "public.item_base_levels exists with wowhead_id integer primary key, item_level integer not null and between 1 and 1999, fetched_at timestamptz not null default now(); RLS is enabled with no policies; anon and authenticated sessions get 42501 on select and insert; the service_role role and the superuser read and write it; re-applying the file is a no-op"
    - "resolveBaseItemLevels(serviceClient, region, token, wowheadIds) dedupes the ids, reads item_base_levels for them through the service-role client, fetches only the misses from GET /data/wow/item/{id}?locale=en_US in namespace static-classic-{region} with at most 4 requests in flight, upserts the hits, and resolves to a Map holding only ids with an integer level from 1 to 1999; a 404, a non-OK status, a network error, a timeout, a bad level, a cache read error or an upsert error never rejects"
    - "sync-gear, the Battle.net import and link-battlenet each call resolveBaseItemLevels once per sync after the equipment fetch and store item_level as the profile level first, else the base level, else null; the delete-then-insert flow and every error string are unchanged"
    - "The Equipped column header title reads exactly: Base item level of what this player has equipped in the slot this item fills, from their last Battle.net gear sync. Every other EQUIPPED_COPY string is unchanged, and owner sign-off is recorded as pending"
    - "scripts/spikes/item-base-level-spike.ts prints labels, numbers, booleans and key names only, ending in a levelFieldPresentOnAll verdict; it exits 2 naming only missing variables or rejecting bad inputs, 3 when its privacy self-check trips, and 1 with a generic message on any other error; the owner's exact run command is in this plan and repeated in the SUMMARY"
    - "No LootScore change: domain/scoring has no diff against origin/main, and no added line on either branch contains an em dash"
    - "Both migrations sit on feat/equipped-item-level-migration for one migration-only PR; 20261027120000 is unique across origin/main and every branch and orders after 20261026120000"
  artifacts:
    - path: "supabase/migrations/20261027120000_item_base_levels.sql"
      provides: "Service-role-only cache of base item level per wowhead id"
      contains: "CREATE TABLE IF NOT EXISTS \"public\".\"item_base_levels\""
    - path: "app/services/__tests__/item-base-levels-migration.test.ts"
      provides: "Shape test plus PGlite chain test (columns, CHECK, RLS and grants matrix, service role, idempotency)"
    - path: "lib/battlenet-item-levels.ts"
      provides: "Cached Game Data base item level lookup"
      exports: ["resolveBaseItemLevels", "readBaseItemLevel"]
    - path: "lib/__tests__/battlenet-item-levels.test.ts"
      provides: "Unit tests with mocked fetch and a mocked service client"
    - path: "scripts/spikes/item-base-level-spike.ts"
      provides: "Owner-run, privacy-safe probe of the Game Data item level field"
  key_links:
    - from: "app/api/battlenet/characters/sync-gear/route.ts"
      to: "lib/battlenet-item-levels.ts resolveBaseItemLevels"
      via: "one call per sync after the equipment fetch, then the insert map falls back to the base level"
      pattern: "baseLevels\\.get\\(item\\.item\\.id\\)"
    - from: "app/api/battlenet/characters/import/route.ts"
      to: "lib/battlenet-item-levels.ts resolveBaseItemLevels"
      via: "same call and fallback in the gear import block"
      pattern: "baseLevels\\.get\\(item\\.item\\.id\\)"
    - from: "app/api/characters/[id]/link-battlenet/route.ts"
      to: "lib/battlenet-item-levels.ts resolveBaseItemLevels"
      via: "same call and fallback, placed before its delete"
      pattern: "baseLevels\\.get\\(item\\.item\\.id\\)"
    - from: "lib/battlenet-item-levels.ts"
      to: "public.item_base_levels"
      via: "service-role select by wowhead_id, upsert on conflict wowhead_id"
      pattern: "item_base_levels"
    - from: "lib/battlenet-item-levels.ts"
      to: "lib/battlenet.ts REGION_API_HOSTS"
      via: "region allowlist for the Game Data host and namespace"
      pattern: "REGION_API_HOSTS"
---

<objective>
Fill character_equipped_items.item_level from the Battle.net Game Data item endpoint, because the 261026-wpw spike found the Classic profile equipment response carries no per-item level (0 of 90 items, verdict NO-GO). The owner chose option 1: the base item level per item id, cached in a new service-role-only table, with the profile level still taking precedence if Blizzard ever adds it. The built migration, domain slot rules, read route and panel from 261026-wpw are unchanged except for one header title string.

Purpose: officers see a real item level in the Equipped column instead of No ilvl for every candidate. The number is the base level, so a MoP upgrade (up to 8 levels) is not counted, and the header title says Base. LootScore does not change.

Requirements (quick task scope):
- LZM-R1: item_base_levels table, expand-only, service role only, on the migration branch (Task 1).
- LZM-R2: resolveBaseItemLevels helper with cache, bounded concurrency and failure tolerance (Task 2).
- LZM-R3: the three Battle.net writers store profile level, else base level, else null (Task 2).
- LZM-R4: owner-run probe that confirms the Game Data level field before the code PR merges (Task 3).
- LZM-R5: Equipped header title copy proposal, owner sign-off (Task 2).
- DELIVERY-R1: nothing pushed, the SUMMARY carries the merge order, the owner's probe command, worktrees to detach and the open follow-up.

What exists (verified at planning, origin/main 1b8c5b0a, `git fetch origin` run 2026-10-27):
- feat/equipped-item-level-migration at 8e865ed6 in /Users/alexander.mayes/Code/personal/loot-list-plus-wt-ilvl-migration: 82221093 test anchor, 8e865ed6 migration 20261026120000_equipped_item_level.sql (12 statements) and its test.
- feat/armory-item-level at 8f75416a in /Users/alexander.mayes/Code/personal/loot-list-plus-wt-ilvl-code: a11e3d86 probe, 46ea1f6a writers, db7d4dca domain, f7f511ce link-battlenet writer, 8f75416a route and panel. Each writer's insert map has `item_level: readEquippedItemLevel(item)`.
- Newest migration on origin/main is 20261020120000_discovery_schema.sql. No ref (local or origin) has any supabase/migrations/20261027* file and no planning doc reserves one.
- No route test exists for sync-gear or link-battlenet (grep of every test file for either path found none). The ItemCandidateModal test does not assert the header title string (it finds the header by its text, Equipped).
- tsconfig.json includes every **/*.ts, so `npm run typecheck` covers scripts/spikes.

Task layout and worktrees:
- Task 1 runs in the migration worktree; Task 2 runs in the code worktree. They touch different worktrees and may run in parallel.
- Task 3 runs in the code worktree after Task 2 commits (same branch, one task per worktree at a time).
- The main checkout /Users/alexander.mayes/Code/personal/loot-list-plus stays on gsd/quick-261027-lzm-base-item-level-cache-from-game-data-for and receives only the SUMMARY.
- No tracer task: the coordinator fixed three tasks across two worktrees that run in parallel, so no single task can wire the database and the code together. The end-to-end proof is the owner's probe (Task 3) plus the post-merge human check listed in the SUMMARY, the same approach 261026-wpw took with its spike.
- Task 2 touches 9 files, above the usual 5-file split line. The coordinator fixed this split, and 6 of the 9 edits are one to five lines each (three call sites, one export keyword, one type entry, one copy string).

Rules for every task:
- The shell cwd resets between Bash calls: start every command with cd and an absolute path.
- Nothing is pushed and no PR is opened.
- Never read, cat or print .env.local or any env file.
- Avoid delete commands (they put the command on a 10 minute hold); nothing in this plan needs one.
- This repo is public: counts and aggregates only in docs and commit messages; synthetic ids and generic names in tests.
- No em dash in any added line, in code, comments, copy, SQL, docs or commit messages.
- Every commit message ends with the line `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` (coordinator instruction for this task).
- CodeQL blocks tainted format strings: every console call keeps a constant first argument and passes data as later arguments.
</objective>

<execution_context>
@/Users/alexander.mayes/Code/personal/loot-list-plus/.claude/gsd-core/workflows/execute-plan.md
@/Users/alexander.mayes/Code/personal/loot-list-plus/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/workstreams/forever/STATE.md
@.claude/CLAUDE.md

Predecessor docs live on branch gsd/quick-261026-wpw-v1-armory-gear-sync-spike-battle-net-cla (read with git show, path .planning/workstreams/forever/quick/261026-wpw-v1-armory-gear-sync-spike-battle-net-cla/): 261026-wpw-SUMMARY.md sections "Owner decision: what next" and "Merge order if option 1 is chosen".

Read only the cited ranges. Paths are relative to the worktree the task runs in.

Task 1 (migration worktree):
- supabase/migrations/20261026120000_equipped_item_level.sql lines 1-85 (header layout to copy: Problem, Fix, Readers and writers checked, Production safety, Deploy, Not changed, Rollback) and 87-95 (statement style)
- supabase/migrations/20260930100000_create_guild_join_grants.sql lines 23-27 and 70-77 (service-role-only table precedent: RLS on with no policies, REVOKE from PUBLIC, anon, authenticated, explicit GRANT ALL to service_role, COMMENT ON TABLE)
- app/services/__tests__/equipped-item-level-migration.test.ts lines 1-130 (stripComments, splitStatements, blankStrings, blankIdentifiers, esc, rollbackStatements), 131-144 (ordering anchored to a constant, #309), 146-175 (exact statement list), 188-204 (re-runnable by form), 237-261 (header sections and Rollback block), 300-355 (beforeAll on the full chain, 180000 ms hook timeout), 395-431 (re-apply twice), 543-553 (SET role service_role)
- app/services/__tests__/guild-join-grants-migration.test.ts lines 109-114 (grant assertion) and 178-185 (no em dash, no string literal with two hyphens)
- app/services/__tests__/helpers/pglite-chain.ts lines 24-38 (roles; service_role is BYPASSRLS) and 60-148 (asRole, resetRole, query, inRolledBackTransaction, expectRejected returning the SQLSTATE code)
- supabase/migrations/20260101000000_baseline_schema.sql lines 4849-4852 (default privileges grant ALL on new public tables to anon, authenticated and service_role, which is why the REVOKE is needed)

Task 2 (code worktree):
- lib/battlenet.ts lines 23-26 (REGION_API_HOSTS, not exported yet), 180-224 (battlenetFetch: Bearer header, Battlenet-Namespace header, region host fallback to us), 281-292 (readEquippedItemLevel)
- domain/guild/join-grants.ts line 23 and lines 168-171 (a helper taking `supabase: SupabaseClient` from @supabase/supabase-js, the type the untyped createServiceRoleClient satisfies)
- lib/__tests__/warcraftlogs.test.ts lines 66-96 (vi.fn fetch mock, vi.stubGlobal, afterEach restore)
- app/api/battlenet/characters/sync-gear/route.ts lines 1-11 (imports), 152-196 (equipment JSON, delete, insert map)
- app/api/battlenet/characters/import/route.ts lines 1-15 (imports), 386-433 (gear block, no delete: new character)
- app/api/characters/[id]/link-battlenet/route.ts lines 1-12 (imports), 282-334 (gear block, delete inside the non-empty branch)
- app/api/battlenet/characters/import/__tests__/route.test.ts lines 1-46 (vi.mock set, partial mock of @/lib/battlenet), 123-155 (setup and beforeEach; the account fixture at line 146 is `{ region: 'us' }` with no token), 296-317 (the item level case to rewrite)
- lib/database.types.ts lines 1109-1165 (the guilds entry ends at 1164, loot_deadlines starts at 1165; item_base_levels goes between them) and line 210 (`Relationships: []` form)
- app/(app)/master-sheet/components/ItemCandidateModal.tsx lines 58-71 (EQUIPPED_COPY)

Task 3 (code worktree):
- scripts/spikes/armory-item-level-spike.ts lines 1-20 (doc header, PAUSE_MS), 50-74 (sleep, missingEnv, getAppToken with status-only error), 232-247 (missing variables, exit 2), 290-318 (privacy self-check, exit 3, generic error, exit 1)
- data/mop-raids.ts lines 39 (85979, Mogu'shan Vaults, Tier 14), 674 (94722, Throne of Thunder, Tier 15), 1378 (104425, Siege of Orgrimmar, Tier 16, Heroic)
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: item_base_levels migration and its shape plus PGlite test, on the migration branch</name>
  <files>supabase/migrations/20261027120000_item_base_levels.sql, app/services/__tests__/item-base-levels-migration.test.ts, supabase/migrations/20261026120000_equipped_item_level.sql</files>
  <precondition>/Users/alexander.mayes/Code/personal/loot-list-plus-wt-ilvl-migration is on feat/equipped-item-level-migration at 8e865ed6 with a clean tree and a node_modules symlink (git -C that path status --short --branch shows no changes; git -C that path rev-parse --short HEAD prints 8e865ed6).</precondition>
  <behavior>
    - Shape: the file exists, its timestamp is unique in supabase/migrations and greater than the constant 20261026120000 (anchored, never a live directory scan, #309).
    - Shape: exactly 7 executable statements, in this order: CREATE TABLE IF NOT EXISTS item_base_levels; DROP CONSTRAINT IF EXISTS item_base_levels_item_level_range; ADD CONSTRAINT item_base_levels_item_level_range CHECK (item_level BETWEEN 1 AND 1999); ENABLE ROW LEVEL SECURITY; REVOKE ALL ON TABLE FROM PUBLIC, anon, authenticated; GRANT ALL ON TABLE TO service_role; COMMENT ON TABLE.
    - Shape: the CREATE TABLE column set is exactly wowhead_id integer NOT NULL, item_level integer NOT NULL, fetched_at timestamptz DEFAULT now() NOT NULL, plus the primary key constraint item_base_levels_pkey on wowhead_id.
    - Shape: outside the header there is no POLICY, FUNCTION, TRIGGER, VIEW, DROP TABLE or DROP COLUMN, and the only REVOKE and GRANT are the two on item_base_levels; every statement is re-runnable by its form.
    - Shape: the header has the seven section headings of 20261026120000, names sync-gear, import, link-battlenet, migration-only, --admin, 12 seconds and 20261026120000, and its Rollback block is the single statement DROP TABLE IF EXISTS on item_base_levels; no em dash anywhere and no string literal containing two consecutive hyphens.
    - PGlite: information_schema shows the three columns with the stated types, nullability and default; the primary key is on wowhead_id.
    - PGlite, superuser in rolled-back transactions: item_level 0, -1 and 2000 rejected with 23514; 1, 489 and 1999 accepted; a null item_level rejected with 23502; a duplicate wowhead_id rejected with 23505; INSERT ... ON CONFLICT (wowhead_id) DO UPDATE replaces the level (the helper's upsert path).
    - PGlite: pg_class.relrowsecurity is true and pg_policies has zero rows for the table; has_table_privilege is false for anon and authenticated on SELECT, INSERT, UPDATE and DELETE and true for service_role on SELECT, INSERT and UPDATE.
    - PGlite: as anon and as authenticated (asRole), SELECT and INSERT on item_base_levels are each rejected with 42501 (expectRejected with fragment "permission denied", code checked); positive control for each role in the same test: a SELECT count from guilds succeeds, so the rejection is the table privilege and not a broken session.
    - PGlite: after SET role service_role, SELECT returns the seeded row and an upsert succeeds (rolled back).
    - PGlite: re-applying the file twice more succeeds, and afterwards there is still one table, one item_base_levels_item_level_range CHECK, RLS on, zero policies, and anon still has no SELECT privilege.
  </behavior>
  <action>
Step 1, collision check (in the migration worktree): run git fetch origin, then confirm that git log --all over the path pattern supabase/migrations/20261027* prints nothing, and that no origin ref lists any supabase/migrations/2026102[1-9]* file other than this branch's 20261026120000. At planning time both checks were empty. If 20261027120000 is taken, use the next free timestamp and update the file name and the test constant together.

Step 2, test first (RED). Write app/services/__tests__/item-base-levels-migration.test.ts covering every behavior bullet. Copy the helper functions from equipped-item-level-migration.test.ts lines 1-130 (file-local copies, as that file does) and the beforeAll pattern from lines 300-355 with the 180000 ms hook timeout, using createChainedDb(listMigrationFiles()) and asserting the list contains the new file. Seed one row as the superuser (wowhead_id 85979, item_level 463) for the read tests. Constants: MIGRATION_TIMESTAMP '20261027120000', PRECEDING_TIMESTAMP 20261026120000 with a #309 comment saying why it is a constant. The file header comment says why the table exists (quick task 261027-lzm: Classic profile equipment has no level, the writers cache base levels per item id) and that every rejection has a positive control for the same role. Run it and see it fail on the missing file.

Step 3, the migration (GREEN). Write supabase/migrations/20261027120000_item_base_levels.sql.

Header comment, section layout of 20261026120000 lines 1-85:
- Problem: the Classic profile equipment response carries no per-item level (quick task 261026-wpw spike, 0 of 90 items), so character_equipped_items.item_level (20261026120000) would stay null.
- Fix: one table keyed by wowhead id holding the base item level from GET /data/wow/item/{id} in namespace static-classic-{region}, filled on a cache miss during a gear sync. Base level never changes for an item id, so a row never needs refreshing; fetched_at records when it was cached. MoP upgrades are not included.
- Readers and writers checked: only lib/battlenet-item-levels.ts reads and writes it, through the service-role client, called by sync-gear, the Battle.net import and link-battlenet. No browser path, view, function, trigger or publication touches it. The WowSims import does not use it.
- Access (inside Readers and writers or as its own paragraph): service role only. RLS on with no policies, all privileges revoked from PUBLIC, anon and authenticated because the baseline default privileges grant them on every new public table, and an explicit GRANT ALL to service_role as in 20260930100000. Why it matters: a browser session that could write here would set the level officers read for every guild holding that item.
- Production safety: a new empty table, no lock on any existing table, no data change; every statement re-runnable (CREATE TABLE IF NOT EXISTS, DROP CONSTRAINT IF EXISTS then ADD, ENABLE ROW LEVEL SECURITY, REVOKE, GRANT, COMMENT ON).
- Deploy: ships in the same migration-only PR as 20261026120000, merged with --admin on a non-raid day; deploys about 12 seconds after merge; live before the feat/armory-item-level code PR.
- Not changed: character_equipped_items and every other table, policy, grant and function.
- Rollback: the single line DROP TABLE IF EXISTS "public"."item_base_levels"; in the '--   ' indented form the rollback parser reads. Note that only cached levels are lost, and that the helper treats a missing table as a cache miss, so syncs keep working and simply fetch every item.

Statements, quoted-identifier style of 20261026120000 lines 87-95, in the behavior order above. The COMMENT ON TABLE text: base item level per wowhead id from the Battle.net Game Data item endpoint (static-classic namespace), cached by the server gear sync, service role only, MoP upgrades not included. No semicolon, no two consecutive hyphens and no em dash inside any string literal.

Step 4, discretion item (planner's choice, owner may veto in the SUMMARY): 20261026120000 has never been deployed, and two of its statements of fact are now wrong. Its header says the profile equipment response carries a level per item and that only sync-gear and the import set item_level (link-battlenet does since f7f511ce). Its COMMENT ON COLUMN, which lands in the production catalog, says the level comes from the profile equipment API. Correct only comment text in that file:
- Problem: no profile level on Classic, so the writers take the profile level when present, else the Game Data base level cached in item_base_levels (20261027120000).
- Readers and writers checked: three writers set item_level (sync-gear, the import, link-battlenet); the WowSims import leaves it null.
- Deploy: name all three insert maps.
- COMMENT ON COLUMN string: equipped item level at the last Battle.net gear sync, the profile level when Blizzard returns one, else the base item level from the Game Data item endpoint (MoP upgrades not counted), null when neither is known; keep its closing reference to the guard function.
Keep the statement count at 12, every heading, and the needles its test checks (sync-gear, import, WowSims, migration-only, --admin, 12 seconds). Run equipped-item-level-migration.test.ts after the edit.

Step 5, broader run. Run the whole app/services/__tests__ directory. If an older test fails only because it assumes its own migration is the newest file on disk, anchor it to its preceding constant in a separate test-only commit before the migration commit, as 82221093 did. The function-execute-grants ratchet scans later files for functions; this migration adds none.

Commits on feat/equipped-item-level-migration, in this order:
1. docs(db): item_level comments name the Game Data base level source (Step 4 only; body says the file is not yet deployed, so editing it in place is safe).
2. Any anchoring test commit from Step 5.
3. feat(db): cache base item levels per wowhead id (the new migration and its test). The body states: service role only; it joins the migration-only PR with 20261026120000; merge with --admin on a non-raid day; deploys about 12 seconds after merge; the feat/armory-item-level code PR merges only after both are live.
Each message ends with the Co-Authored-By line from the objective.
  </action>
  <verify>
    <automated>cd /Users/alexander.mayes/Code/personal/loot-list-plus-wt-ilvl-migration && npx vitest run app/services/__tests__/item-base-levels-migration.test.ts app/services/__tests__/equipped-item-level-migration.test.ts && npx vitest run app/services/__tests__ && npx eslint app/services/__tests__/item-base-levels-migration.test.ts && npm run typecheck && test "$(git diff origin/main...HEAD | grep '^+' | grep -c $'\xe2\x80\x94')" = "0" && test -z "$(git log --remotes --format=%h -- 'supabase/migrations/20261027*')" && test "$(git log --format=%h origin/main..HEAD -- 'supabase/migrations/20261027*' | wc -l | tr -d ' ')" = "1"</automated>
  </verify>
  <done>
- The new test passes every behavior bullet; equipped-item-level-migration.test.ts still passes after the comment correction; the whole app/services/__tests__ directory passes; eslint and typecheck are clean.
- git diff --stat origin/main...HEAD in the migration worktree lists only the two migrations, their two tests and any anchored older test.
- No added line contains an em dash, and only this branch's commits touch a 20261027 migration path.
- Commits are in the order above, each ending with the required Co-Authored-By line.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: resolveBaseItemLevels helper, the three writers, types and the header title, on the code branch</name>
  <files>lib/battlenet-item-levels.ts, lib/__tests__/battlenet-item-levels.test.ts, lib/battlenet.ts, lib/database.types.ts, app/api/battlenet/characters/sync-gear/route.ts, app/api/battlenet/characters/import/route.ts, app/api/battlenet/characters/import/__tests__/route.test.ts, app/api/characters/[id]/link-battlenet/route.ts, app/(app)/master-sheet/components/ItemCandidateModal.tsx</files>
  <precondition>/Users/alexander.mayes/Code/personal/loot-list-plus-wt-ilvl-code is on feat/armory-item-level at 8f75416a with a clean tree and a node_modules symlink (git -C that path rev-parse --short HEAD prints 8f75416a).</precondition>
  <behavior>
    - Cache hit: ids all present in item_base_levels resolve from the cache, fetch is never called and nothing is upserted.
    - Miss: a missing id is fetched once from https://us.api.blizzard.com/data/wow/item/{id}?locale=en_US with headers Authorization Bearer {token} and Battlenet-Namespace static-classic-us; a top-level level of 489 lands in the Map and is upserted as one row with wowhead_id, item_level 489 and an ISO fetched_at, with onConflict wowhead_id.
    - Mixed: cached ids come from the cache and only the misses are fetched; the Map holds both.
    - 404 and any non-OK status give no Map entry and no upserted row.
    - Bad level: 0, 2000, 489.5, the string "489", null or a missing level each give no entry.
    - Duplicate ids (for example 101, 101, 102) are read and fetched once each.
    - A fetch that throws (network error or timeout abort) does not reject; that id has no entry and the other ids still resolve.
    - A cache read error is treated as all misses (the ids are fetched); an upsert error, returned or thrown, does not reject and the fetched levels are still returned.
    - Invalid ids (0, -1, 1.5, NaN) are skipped with no request; an empty or all-invalid list resolves to an empty Map with no read and no fetch.
    - Region eu uses the eu host and static-classic-eu; an unknown region falls back to us for both host and namespace.
    - With 9 missing ids, no more than 4 requests are in flight at once.
    - Import route: an equipment response with two items carrying no level, whose base levels resolve to 489 and null (helper mocked to return a Map with only the first id), inserts rows with item_level 489 and null; the helper is called once with the service client, the account region, the account token and both item ids.
    - Import route: an item whose profile level.value is 496 and whose base level is 489 stores 496 (profile level first).
  </behavior>
  <action>
Part A, the helper (test first). Write lib/__tests__/battlenet-item-levels.test.ts with a `// @vitest-environment node` header (jsdom lacks the Response global, as the import route test notes at lines 1-3). Mock fetch with vi.fn plus vi.stubGlobal and restore in afterEach (warcraftlogs.test.ts lines 66-96, also call vi.unstubAllGlobals). Build the mocked service client as a small fake whose from('item_base_levels') returns a builder with select(...).in(...) resolving to a configurable data and error pair, and upsert(rows, options) recording its arguments and resolving to a configurable error; cast it to SupabaseClient through unknown. Cover every helper behavior bullet; the concurrency case counts in-flight calls inside the fetch mock. Use synthetic ids and the token string test-token. Run it and see it fail.

Then lib/battlenet.ts: add the export keyword to REGION_API_HOSTS (line 23), value unchanged. Extend the readEquippedItemLevel doc comment (lines 281-286) with why it stays: Classic profile equipment returned no level in the 261026-wpw spike, so the writers fall back to the Game Data base level, and this reader keeps a profile level first should Blizzard add one.

Then write lib/battlenet-item-levels.ts (kebab-case, imports through the @/ alias):
- Imports: the SupabaseClient type from @supabase/supabase-js (the type join-grants.ts takes, which the untyped createServiceRoleClient satisfies) and REGION_API_HOSTS from @/lib/battlenet.
- Constants, each with a why comment: FETCH_CONCURRENCY 4; BATCH_PAUSE_MS 100 (a short pause between batches keeps a first sync of about 19 items far under Blizzard's per-second limit); REQUEST_TIMEOUT_MS 3000 (a slow Blizzard response must not hold the sync route open; at most about 5 sequential batches); MIN_ITEM_LEVEL 1 and MAX_ITEM_LEVEL 1999 (match the CHECK on item_base_levels and character_equipped_items, so a bad value becomes null instead of failing a write); MAX_ITEM_ID 2147483647 (the integer column).
- Export readBaseItemLevel(json: unknown): number | null. It returns the top-level level only when json is an object and level is an integer within the bounds, else null.
- Export async resolveBaseItemLevels(serviceClient: SupabaseClient, region: string, token: string, wowheadIds: readonly number[]): Promise<Map<number, number>>. Steps:
  1. Dedupe and keep only integer ids from 1 to MAX_ITEM_ID. If none remain, return an empty Map with no read or fetch.
  2. Region allowlist: use the region when it is an own key of REGION_API_HOSTS, else us. Use the same value for the host and for the namespace static-classic-{region}, so no stored string reaches a URL or header unchecked.
  3. Read the cache: select wowhead_id and item_level from item_base_levels where wowhead_id is in the ids. On an error (returned or thrown), log a constant message with the error code and treat every id as a miss.
  4. Fetch the misses in batches of FETCH_CONCURRENCY with Promise.all. Pause BATCH_PAUSE_MS between batches, not after the last. Each request goes to `${REGION_API_HOSTS[apiRegion]}/data/wow/item/${id}?locale=en_US` with the Authorization Bearer header and the Battlenet-Namespace header built the way battlenetFetch builds them (lib/battlenet.ts lines 199-205), and signal AbortSignal.timeout(REQUEST_TIMEOUT_MS). A non-OK status, a thrown fetch, a JSON parse failure or a readBaseItemLevel null each give null for that id. Never log the token or the response body.
  5. Upsert the fetched hits, if any, as rows of wowhead_id, item_level and fetched_at (new Date().toISOString()) with onConflict wowhead_id. On an error, returned or thrown, log a constant message with the error code and carry on.
  6. Return a Map of cache hits plus fetched hits. Wrap the whole body so the promise never rejects. Comment why: a missing base level must never fail a gear sync, it only leaves that slot's item_level null.
- The token is the linked account's access token, the same one the equipment fetch just used. battlenetFetch swaps tokens only when the stored token expired and a refresh token exists. A 401 here degrades to null levels for that sync, so the writers do not re-read the account.

Part B, the writers. In each of the three routes, import resolveBaseItemLevels from @/lib/battlenet-item-levels. Call it once per sync after the equipment JSON is parsed, with (supabase, account.region, account.access_token, the item.item.id of every equipped item). Change the insert map line to item_level: readEquippedItemLevel(item) ?? baseLevels.get(item.item.id) ?? null. Add one why comment at each call site: Classic profile equipment carries no level (261026-wpw), so the Game Data base level fills it, and the profile level wins if Blizzard adds one.
- sync-gear (lines 152-196): place the call between the equipment JSON line and the delete, passing (equipment.equipped_items ?? []) mapped to ids. The helper returns an empty Map for an empty list. Resolving before the delete keeps the window with no gear rows as short as before.
- Import (lines 386-433): inside the branch where equipped_items is non-empty, before itemsToInsert. There is no delete here.
- link-battlenet (lines 282-334): inside the non-empty branch, before its delete, for the same reason as sync-gear.
- Do not change the delete-then-insert flow, the try/catch structure, the status codes or any error string in any route.

Part C, the import route test. Add vi.mock for @/lib/battlenet-item-levels exposing resolveBaseItemLevels as vi.fn. In beforeEach (line 142 onward), default it to resolve an empty Map. Extend the account fixture at line 146 with access_token: 'test-token' (synthetic). Rewrite the case at lines 296-317 to the two import route behavior bullets: the 489 and null case asserting the payload and the single helper call, and the 496-over-489 precedence case as its own test. Keep the existing partial mock of @/lib/battlenet so the real readEquippedItemLevel and SLOT_MAPPING run. No sync-gear or link-battlenet route test exists. Do not create one; record this in the SUMMARY.

Part D, types. In lib/database.types.ts, insert an item_base_levels entry between the end of guilds (line 1164) and loot_deadlines (line 1165):
- Row: fetched_at string, item_level number, wowhead_id number.
- Insert: fetched_at optional string, item_level number, wowhead_id number.
- Update: all three optional.
- Relationships: [] in the form at line 210.
- Keys in alphabetical order, as the generator writes them.

Part E, copy (LZM-R5, owner sign-off pending). In ItemCandidateModal.tsx EQUIPPED_COPY (lines 58-71), change only headerTitle to exactly: Base item level of what this player has equipped in the slot this item fills, from their last Battle.net gear sync
Leave every other string as is. In the JSDoc above it, add that the title says Base because MoP upgrades are not counted, and name quick task 261027-lzm. The modal test does not assert the title (verified at planning), so it needs no change. If it does assert it when you run it, update that assertion.

Run the targeted tests, then the full checks in the verify block. Commit everything in one commit on feat/armory-item-level: feat(gear): resolve equipped item level from Game Data base levels. The body lists the helper, the three writers, the types and the header title, and states the code PR merges only after both migrations are live and the probe confirms the level field. End with the Co-Authored-By line.
  </action>
  <verify>
    <automated>cd /Users/alexander.mayes/Code/personal/loot-list-plus-wt-ilvl-code && npx vitest run lib/__tests__/battlenet-item-levels.test.ts app/api/battlenet "app/(app)/master-sheet/components/__tests__/ItemCandidateModal.test.tsx" && ( for f in app/api/battlenet/characters/sync-gear/route.ts app/api/battlenet/characters/import/route.ts "app/api/characters/[id]/link-battlenet/route.ts"; do test "$(grep -c -F 'baseLevels.get(item.item.id)' "$f")" = "1" || exit 1; done ) && grep -c -F "Base item level of what this player has equipped" "app/(app)/master-sheet/components/ItemCandidateModal.tsx" && npm run lint && npm run typecheck && npm test && git diff --quiet origin/main -- domain/scoring && test "$(git diff origin/main...HEAD | grep '^+' | grep -c $'\xe2\x80\x94')" = "0"</automated>
    <human-check>Owner: sign off the header title "Base item level of what this player has equipped in the slot this item fills, from their last Battle.net gear sync" before the code PR merges (Standing Constraint 2). The rest of the Equipped copy is unchanged and still awaits the sign-off recorded in 261026-wpw.</human-check>
  </verify>
  <done>
- Every helper behavior bullet passes in lib/__tests__/battlenet-item-levels.test.ts. The import route test proves 489 and null, the single helper call, and profile-level precedence.
- Each of the three routes contains the fallback once (grep count 1 per file), with the call placed as specified and no change to flow or error strings.
- lib/database.types.ts has item_base_levels in alphabetical position. The header title is the proposed string, and no other EQUIPPED_COPY string changed.
- npm run lint reports 0 errors, npm run typecheck is clean and npm test passes. If quality-brand-token-parity times out under load, rerun it once on its own and record both runs, as 261026-wpw did.
- domain/scoring has no diff against origin/main, and the branch diff has no added em dash.
- One commit, ending with the required Co-Authored-By line.
  </done>
</task>

<task type="auto">
  <name>Task 3: Owner-run Game Data base item level probe, on the code branch</name>
  <files>scripts/spikes/item-base-level-spike.ts</files>
  <precondition>Task 2's commit is on feat/armory-item-level and the code worktree tree is clean.</precondition>
  <action>
Write scripts/spikes/item-base-level-spike.ts, a self-contained tsx script modelled on scripts/spikes/armory-item-level-spike.ts. It imports no dotenv and reads process.env only: the owner supplies the variables through node --env-file, and nothing loads .env.local.

Doc header: what it answers (does the Game Data item endpoint in static-classic-{region} return an integer top-level level for MoP raid items), the owner's exact command below, and the privacy rule (labels, numbers, booleans and key names only).

Order of checks, so the input errors are testable without network or credentials:
1. Inputs. SPIKE_ITEM_IDS is a comma list of positive integers, default "85979,94722,104425": Mogu'shan Vaults (Tier 14, Back), Throne of Thunder (Tier 15, One-Hand) and Siege of Orgrimmar (Tier 16, Back, Heroic), all from data/mop-raids.ts. Dedupe it and cap it at 20 ids. SPIKE_REGION must be us or eu, default us. On a bad value, print a fixed message naming the variable but never its value, and exit 2.
2. Variables. If BLIZZARD_CLIENT_ID or BLIZZARD_CLIENT_SECRET is missing, print only the missing names and exit 2 (existing probe lines 232-247).
3. Token. Copy getAppToken (existing probe lines 56-74): client-credentials grant, Basic auth, status-only error. The token stays in memory and is never printed.
4. Requests, sequential, with PAUSE_MS 150 between them: GET https://{region}.api.blizzard.com/data/wow/item/{id}?locale=en_US with Authorization Bearer and Battlenet-Namespace static-classic-{region}.
5. Per item, labelled i1, i2 and so on in input order, never by id or name: status, latencyMs, levelPresent (top-level level is a number), levelIsInteger, level (the number or null), levelInRange (integer from 1 to 1999).

Report, one JSON object on stdout:
- probe: item-base-level
- endpoint: /data/wow/item/{id}
- namespace: static-classic-{region}
- fieldPathChecked: level
- itemsTried and itemsFetched (status 200)
- items: the per-item records
- topLevelKeys: the sorted union of top-level key names across fetched items
- levelFieldPresentOnAll: true only when every item returned 200 with an in-range integer level, false otherwise, including when nothing was fetched

Privacy self-check before printing, as in the existing probe lines 290-310. Collect needles: every string found in a fetched item's name (a plain string, or the values of a localized object), each lowercased and at least 3 characters, plus the token. If the lowercased serialized report contains any needle, print only "privacy self-check failed" and exit 3.

Any other failure: print a generic "probe failed" and exit 1 (existing probe lines 312-318). Error text can carry URLs and response bodies.

Checks the agent can run (no credentials, no network):
- In the code worktree, run the script with node --import tsx and BLIZZARD_CLIENT_ID and BLIZZARD_CLIENT_SECRET unset. It exits 2, and its output names BLIZZARD_CLIENT_ID.
- Run it with SPIKE_ITEM_IDS set to abc and the two variables still unset. It exits 2 with the fixed input message, which names SPIKE_ITEM_IDS and not BLIZZARD_CLIENT_ID. That proves the input check runs before the variable check and before any request.
The agent must not run the probe with real credentials, pull env files or read production. The auto-mode classifier denies it, and the owner runs it.

The owner's command, to be written verbatim into the SUMMARY. Run it from the main checkout, where tsx resolves through node_modules; it pulls production env to a temporary file outside the repo, runs the probe, then removes the file:

cd /Users/alexander.mayes/Code/personal/loot-list-plus && vercel env pull /tmp/llp-prod.env --environment=production --yes && node --env-file=/tmp/llp-prod.env --import tsx /Users/alexander.mayes/Code/personal/loot-list-plus-wt-ilvl-code/scripts/spikes/item-base-level-spike.ts; rm -f /tmp/llp-prod.env

Optional prefix for other items: SPIKE_ITEM_IDS="id1,id2,id3" before node. Add SPIKE_REGION=eu for EU. The owner pastes the printed JSON back. It contains no names. Building does not wait on the probe; merging the code PR does. Expected result: levelFieldPresentOnAll true, with levels in the MoP raid range.

Commit on feat/armory-item-level: chore(spike): Game Data base item level probe, ending with the Co-Authored-By line.

Then write the SUMMARY described in the output section, in the main checkout.
  </action>
  <verify>
    <automated>cd /Users/alexander.mayes/Code/personal/loot-list-plus-wt-ilvl-code && npx eslint scripts/spikes/item-base-level-spike.ts && npm run typecheck && ( out="$(env -u BLIZZARD_CLIENT_ID -u BLIZZARD_CLIENT_SECRET node --import tsx scripts/spikes/item-base-level-spike.ts 2>&1)"; test $? -eq 2 && printf '%s' "$out" | grep -q BLIZZARD_CLIENT_ID ) && ( out="$(env -u BLIZZARD_CLIENT_ID -u BLIZZARD_CLIENT_SECRET SPIKE_ITEM_IDS=abc node --import tsx scripts/spikes/item-base-level-spike.ts 2>&1)"; test $? -eq 2 && printf '%s' "$out" | grep -q SPIKE_ITEM_IDS && ! printf '%s' "$out" | grep -q BLIZZARD_CLIENT_ID ) && test "$(git diff origin/main...HEAD -- scripts/spikes/item-base-level-spike.ts | grep '^+' | grep -c $'\xe2\x80\x94')" = "0"</automated>
    <human-check>Owner: run the command above from the main checkout and paste the JSON. The code PR merges only when levelFieldPresentOnAll is true. If it is false, the SUMMARY's merge order stops before the code PR and the field path in readBaseItemLevel is revisited.</human-check>
  </verify>
  <done>
- The probe lints and typechecks, exits 2 naming only the missing variables, and exits 2 on bad input before any request. Its report shape and privacy self-check follow the spec.
- The owner's command is written verbatim in the SUMMARY.
- One commit on feat/armory-item-level, ending with the required Co-Authored-By line.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| browser session to item_base_levels (PostgREST) | Baseline default privileges would grant anon and authenticated full rights on a new public table |
| server to Battle.net Game Data API | External JSON (item level) enters storage that officers read; the user's access token goes out in a header |
| stored strings to URL and header | battlenet_accounts.region and item ids from the equipment response are used to build the request |
| gear sync route to Blizzard latency | Up to about 19 extra requests on a first sync, inside a user-facing request |
| probe output to public repo | Owner pastes the probe's stdout into chat and the SUMMARY |
| migration PR to production | Migrations auto-deploy about 12 seconds after merge |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-lzm-01 | Tampering | item_base_levels written from a browser session (one poisoned row would mislead officers in every guild holding that item) | high | mitigate | RLS enabled with no policies; REVOKE ALL from PUBLIC, anon and authenticated; GRANT ALL only to service_role; PGlite tests prove 42501 on select and insert for anon and authenticated beside a positive control, and that service_role reads and writes |
| T-lzm-02 | Tampering | Game Data level value stored and shown | medium | mitigate | readBaseItemLevel accepts only an integer from 1 to 1999; the table CHECK enforces the same bounds; anything else becomes null, never a failed sync |
| T-lzm-03 | Spoofing / Tampering | Region and item id used to build the Game Data URL and namespace header | medium | mitigate | Region allowlisted to the REGION_API_HOSTS keys (fallback us) for both host and namespace; ids must be integers from 1 to 2147483647 before any request, so no path or header injection |
| T-lzm-04 | Denial of service | Slow or failing Blizzard during a sync | medium | mitigate | 4 requests in flight, 100 ms between batches, 3 s timeout per request via AbortSignal.timeout, every failure resolves to null; cache hits make repeat syncs zero extra requests; call placed before the delete so the empty-gear window does not grow |
| T-lzm-05 | Information disclosure | User access token sent to Game Data and possibly logged | medium | mitigate | Sent only to the allowlisted Blizzard host already used for profile calls; helper logs constant messages with error codes only, never the token, URL or body (constant first argument, CodeQL format-string rule) |
| T-lzm-06 | Information disclosure | Probe stdout and SUMMARY in a public repo | medium | mitigate | Report holds labels, numbers, booleans and key names only; self-check exits 3 if any item name string or the token appears; missing variables print names only (exit 2); errors print a generic message (exit 1); no dotenv, never reads .env.local; owner's command removes the pulled env file |
| T-lzm-07 | Tampering | Code PR deployed before the migrations (insert names item_level, helper reads item_base_levels) | medium | mitigate | Both migrations in one migration-only PR merged and deployed first; commit bodies and SUMMARY state the order; the helper treats a missing table as a cache miss, so only the 20261026120000 column is a hard dependency |
| T-lzm-08 | Repudiation | Base level shown as if it were the equipped level, hiding MoP upgrades of up to 8 levels | low | accept | Header title says Base item level; display only, no LootScore effect; the probe and SUMMARY document the field |
| T-lzm-09 | Information disclosure | A global cache shared across guilds | low | accept | The table holds only public game data (item id to base level), no user, character or guild data |
| T-lzm-10 | Tampering | Migration timestamp collision | low | mitigate | Collision check across all local and origin refs before commit (none at planning); ordering test anchored to the constant 20261026120000 (#309) |

No package installs: @supabase/supabase-js, tsx and @electric-sql/pglite are already dependencies, so no supply-chain gate applies.
</threat_model>

<verification>
Migration worktree /Users/alexander.mayes/Code/personal/loot-list-plus-wt-ilvl-migration:
- npx vitest run app/services/__tests__ passes.
- npx eslint on the new test is clean, and npm run typecheck is clean.
- git diff --stat origin/main...HEAD lists only the two migrations, their tests and the earlier anchor test (82221093).
- Zero added lines contain the UTF-8 bytes e2 80 94.

Code worktree /Users/alexander.mayes/Code/personal/loot-list-plus-wt-ilvl-code:
- The targeted vitest runs pass.
- npm run lint reports 0 errors, npm run typecheck is clean and npm test passes.
- git diff --quiet origin/main -- domain/scoring exits 0.
- Zero added lines contain e2 80 94.

Privacy sweep on both branches:
- grep the added lines of git diff origin/main...HEAD for email-like strings, Bearer followed by a long token, and realm or character names.
- Only synthetic test values (example.test addresses, test-token, generic names, synthetic UUIDs) may appear.
- Commit messages hold counts and aggregates only.

Main checkout: only the SUMMARY is added; no code, no env file.

Nothing pushed, no PR opened.
</verification>

<success_criteria>
- A service-role-only base item level cache is ready to ship in the same migration-only PR as the item_level column.
- Every Battle.net gear write stores the profile level when present, else the cached or fetched Game Data base level, else null, without ever failing a sync because of a missing level.
- Officers will see a number in the Equipped column once both PRs are live, labelled as base item level.
- The owner has one command that confirms the Game Data level field before the code PR merges.
- LootScore and its golden fixtures are untouched.
</success_criteria>

<output>
Create /Users/alexander.mayes/Code/personal/loot-list-plus/.planning/workstreams/forever/quick/261027-lzm-base-item-level-cache-from-game-data-for/261027-lzm-SUMMARY.md in the main checkout. Do not commit or push it; the quick workflow handles the docs commit. It must list:
- Commits per branch with SHAs, oldest first: feat/equipped-item-level-migration (82221093, 8e865ed6, then this task's commits) and feat/armory-item-level (a11e3d86 through 8f75416a, then this task's commits). Include the final migration timestamp and any anchored older test.
- The owner's probe command, verbatim from Task 3, plus the optional SPIKE_ITEM_IDS and SPIKE_REGION prefixes, and the rule that the code PR merges only on levelFieldPresentOnAll true.
- Merge order:
  1. Push feat/equipped-item-level-migration and open one migration-only PR carrying both 20261026120000 and 20261027120000. Merge with --admin on a non-raid day and confirm the deploy about 12 seconds after merge.
  2. Push feat/armory-item-level and open the code PR. Merge only after the owner's copy sign-off (the new header title plus the 261026-wpw Equipped copy) and after the probe confirms the level field. Then run the 261026-wpw human check: as a manage_loot officer, open a ring, a trinket, a two-hand weapon, a tier token and a mount on the master sheet.
  3. Push the gsd/quick branches and open the docs PR.
- The worktrees to detach after merge, with the git worktree command, not by deleting folders (each holds a node_modules symlink): /Users/alexander.mayes/Code/personal/loot-list-plus-wt-ilvl-code and /Users/alexander.mayes/Code/personal/loot-list-plus-wt-ilvl-migration.
- Test gaps: no sync-gear or link-battlenet route test exists, so only the import route test covers the writer change. Say whether the modal test needed a change.
- Discretion items the owner may veto: the comment-only correction to 20261026120000 (Task 1 Step 4); the explicit GRANT ALL to service_role; the 3 s request timeout and 100 ms batch pause; the probe's 20-id cap.
- The open follow-up, out of scope here: when a character returns 404 during a sync, keep the last stored rows rather than delete them (the 261026-wpw sample had 4 of 10 characters no longer resolving).
- A privacy check line: counts and aggregates only, no names, ids or tokens.
</output>

---
phase: quick-261026-wpw
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  # gsd/quick-261026-wpw-... branch (main checkout, planning docs only)
  - .planning/workstreams/forever/quick/261026-wpw-v1-armory-gear-sync-spike-battle-net-cla/261026-wpw-SPIKE.md
  # feat/equipped-item-level-migration branch (worktree loot-list-plus-wt-ilvl-migration), migration-only PR
  - supabase/migrations/20261026120000_equipped_item_level.sql
  - app/services/__tests__/equipped-item-level-migration.test.ts
  # feat/armory-item-level branch (worktree loot-list-plus-wt-ilvl-code), code PR
  - scripts/spikes/armory-item-level-spike.ts
  - lib/battlenet.ts
  - lib/database.types.ts
  - app/api/battlenet/characters/sync-gear/route.ts
  - app/api/battlenet/characters/import/route.ts
  - app/api/battlenet/characters/import/__tests__/route.test.ts
  - domain/loot/equipped-item-level.ts
  - domain/loot/__tests__/equipped-item-level.test.ts
  - app/api/guilds/[id]/equipped-item-levels/route.ts
  - app/api/guilds/[id]/equipped-item-levels/__tests__/route.test.ts
  - app/(app)/master-sheet/components/ItemCandidateModal.tsx
  - app/(app)/master-sheet/components/__tests__/ItemCandidateModal.test.tsx
autonomous: true
requirements: [WPW-R1, WPW-R2, WPW-R3, WPW-R4, WPW-R5, DELIVERY-R1]

estimate:
  tokens: 130000
  raw_tokens: 130000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "261026-wpw-SPIKE.md states what the Battle.net Classic (MoP) equipment endpoint returns for per-slot item level: endpoint, namespace, field path, coverage percentage, item level range, staleness (last login and Last-Modified ages), documented rate limits, and exactly one verdict line (GO, NO-GO or INCONCLUSIVE); Tasks 2 and 3 run only on GO"
    - "character_equipped_items has a nullable integer item_level bounded 1 to 1999; existing rows read null; RLS read rules are unchanged (owner, active guildmates); an anon or authenticated session cannot set or change item_level, the service role can"
    - "A Battle.net gear sync (POST /api/battlenet/characters/sync-gear) or character import stores each equipped slot's item level from the field path the spike recorded, and null when the response has none"
    - "Pure rules in domain/loot/equipped-item-level.ts map a loot item's slot to the equipped slots it is compared against: rings and trinkets compare against the lower of both slots, one-hand and two-hand weapons against the main hand, off-hand items against the off hand, ranged against Ranged or else Main Hand, tier tokens by the slot word in their name; every MoP, Cata, Wrath, TBC and Classic token in data/*-raids.ts resolves or is on a named not-comparable list"
    - "An officer opening an item's candidate panel on the master sheet sees an Equipped column with each ranked player's item level for that item's slot, or Empty, No ilvl or Not synced; an item with no comparable slot, or a failed read, shows no Equipped column"
    - "No LootScore change: domain/scoring is untouched and the Loot Score golden fixtures pass byte-identical"
    - "The migration is on its own branch for a migration-only PR, timestamped after every migration on origin/main and every open branch, and the code branch is documented to merge only after the migration is live"
  artifacts:
    - path: ".planning/workstreams/forever/quick/261026-wpw-v1-armory-gear-sync-spike-battle-net-cla/261026-wpw-SPIKE.md"
      provides: "Spike finding and go/no-go verdict"
      contains: "**Verdict:**"
    - path: "scripts/spikes/armory-item-level-spike.ts"
      provides: "Re-runnable, privacy-safe Battle.net Classic equipment probe"
    - path: "supabase/migrations/20261026120000_equipped_item_level.sql"
      provides: "item_level column, range CHECK, server-only guard trigger"
      contains: "ADD COLUMN IF NOT EXISTS \"item_level\" integer"
    - path: "app/services/__tests__/equipped-item-level-migration.test.ts"
      provides: "Shape test plus PGlite chain test (column, CHECK, guard, RLS read matrix, idempotency)"
    - path: "domain/loot/equipped-item-level.ts"
      provides: "equippedSlotsForLootItem, tierTokenSlot, summarizeEquippedItemLevel, daysSinceSync"
      exports: ["equippedSlotsForLootItem", "tierTokenSlot", "summarizeEquippedItemLevel", "daysSinceSync"]
    - path: "app/api/guilds/[id]/equipped-item-levels/route.ts"
      provides: "GET equipped item levels for a guild's ranked characters (manage_loot only)"
      exports: ["GET"]
  key_links:
    - from: "app/api/battlenet/characters/sync-gear/route.ts"
      to: "lib/battlenet.ts readEquippedItemLevel"
      via: "item_level field in the character_equipped_items insert map"
      pattern: "item_level: readEquippedItemLevel\\("
    - from: "app/(app)/master-sheet/components/ItemCandidateModal.tsx"
      to: "/api/guilds/[id]/equipped-item-levels"
      via: "fetch on open when the item has a comparable slot"
      pattern: "equipped-item-levels"
    - from: "app/(app)/master-sheet/components/ItemCandidateModal.tsx"
      to: "domain/loot/equipped-item-level.ts"
      via: "equippedSlotsForLootItem and summarizeEquippedItemLevel per ranked row"
      pattern: "summarizeEquippedItemLevel\\("
    - from: "app/api/guilds/[id]/equipped-item-levels/route.ts"
      to: "verifyPermission manage_loot + RLS-scoped createClient read"
      via: "permission gate, active-membership filter, then RLS read of character_equipped_items"
      pattern: "verifyPermission\\(.*'manage_loot'\\)"
---

<objective>
v1 armory gear sync. First prove that the Battle.net Classic (MoP) character equipment API returns per-slot equipped item level, and measure how stale it is. Only on GO: store that item level per slot for each linked character, and show it next to each ranked player in the officer item candidate panel on the master sheet. The panel is read-only display; LootScore does not change.

Purpose: officers settling a drop see whether the item is a real upgrade for each candidate, from data they can check, without a scoring change. The later v2 (an officer-weighted LootScore component, default weight 0, shown as its own breakdown line) is out of scope for this plan. No task touches domain/scoring.

What already exists (verified at planning, origin/main 1b8c5b0a): sync-gear and the Battle.net import already fetch /profile/wow/character/{realm}/{name}/equipment in namespace profile-classic-{region}. That namespace is MoP Classic since MoP replaced Cata Classic in it. Both routes write one character_equipped_items row per slot (slot names from SLOT_MAPPING in lib/battlenet.ts) but drop the item level. RLS on that table is owner plus active guildmates (migration 20261003200000). So this plan adds one column, a server-only write guard, the writers, the slot rules, a batched read route and the panel column. It needs no new table.

Task order: Task 1 is the spike and go/no-go gate the task description asked for, in place of a tracer, because the riskiest unknown is the external API. Task 2 is storage (migration-only branch, plus the writers on the code branch). Task 3 is the end-to-end officer-facing slice (slot rules, read route, panel).

Branches and worktrees (repo convention, see `git worktree list`):
- Main checkout /Users/alexander.mayes/Code/personal/loot-list-plus stays on gsd/quick-261026-wpw-v1-armory-gear-sync-spike-battle-net-cla and holds planning docs only.
- /Users/alexander.mayes/Code/personal/loot-list-plus-wt-ilvl-code on branch feat/armory-item-level from origin/main holds all app code and the spike script.
- /Users/alexander.mayes/Code/personal/loot-list-plus-wt-ilvl-migration on branch feat/equipped-item-level-migration from origin/main holds the migration and its test only.
- In each worktree, symlink node_modules to /Users/alexander.mayes/Code/personal/loot-list-plus/node_modules so vitest, tsc and eslint run. The shell cwd resets between Bash calls, so prefix every command with cd and an absolute path.
- Nothing is pushed and no PR is opened without the user's go-ahead. The SUMMARY lists the owner's merge steps.

Output: SPIKE finding; migration and test; writers; domain slot rules and tests; read route and test; panel column and test.
</objective>

<execution_context>
@/Users/alexander.mayes/Code/personal/loot-list-plus/.claude/gsd-core/workflows/execute-plan.md
@/Users/alexander.mayes/Code/personal/loot-list-plus/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/workstreams/forever/STATE.md
@.claude/CLAUDE.md
@lib/battlenet.ts
@app/api/battlenet/characters/sync-gear/route.ts
@supabase/migrations/20261003200000_equipped_item_rules_require_active_membership.sql
@app/services/__tests__/helpers/pglite-chain.ts
@domain/loot/slot-normalization.ts

Read only the cited ranges of these larger files:
- supabase/migrations/20261020120000_discovery_schema.sql lines 479-507 (invoker-rights, role-gated guard function and WHEN-gated trigger pattern to copy for the item_level guard)
- supabase/migrations/20260101000000_baseline_schema.sql lines 1455-1470 (character_equipped_items columns)
- app/services/__tests__/equipped-item-rules-migration.test.ts lines 1-137 (stripComments, splitStatements with dollar-quote handling, anchored ordering check per #309)
- app/services/__tests__/discovery-schema-pglite.test.ts lines 1-210 (beforeAll fixture style: auth.users, guilds, characters, character_guild_memberships inserts; asRole, resetRole, expectRejected, inRolledBackTransaction)
- app/api/battlenet/characters/import/route.ts lines 380-430 (second writer of character_equipped_items; find its EquipmentResponse interface with grep)
- app/api/guilds/[id]/feral-conversion-count/route.ts lines 1-40 (Next 16 params Promise, verifyPermission gate, 401/403 shapes)
- app/api/character-gear/__tests__/route.test.ts lines 1-40 (vi.mock pattern for service-role and server clients)
- app/(app)/master-sheet/components/ItemCandidateModal.tsx lines 82-96 (props), 148-230 (state and recent-awards fetch pattern with cancelled flag), 560-640 (table header with Candidate column at line 575, row render from line 589)
- app/(app)/master-sheet/components/__tests__/ItemCandidateModal.test.tsx lines 1-120 (ranking() factory, base item with item_slot Wrist, stubbed fetch at lines 60-73, renderModal)
- app/(app)/master-sheet/components/BossSection.tsx lines 22-53 (LootItem has name and item_slot; PlayerRanking has character_id)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Spike the Battle.net Classic equipment API for per-slot item level and staleness, then gate GO / NO-GO</name>
  <files>scripts/spikes/armory-item-level-spike.ts, .planning/workstreams/forever/quick/261026-wpw-v1-armory-gear-sync-spike-battle-net-cla/261026-wpw-SPIKE.md</files>
  <precondition>BLIZZARD_CLIENT_ID and BLIZZARD_CLIENT_SECRET are set in /Users/alexander.mayes/Code/personal/loot-list-plus/.env.local, and so is either NEXT_PUBLIC_SUPABASE_URL plus SUPABASE_SERVICE_ROLE_KEY (for --from-db sampling) or a SPIKE_CHARACTERS value supplied in the shell environment. Check this by running the script, which names any missing variable and never prints values. Never cat or print .env.local.</precondition>
  <action>
Setup: run git fetch origin. Create the code worktree with git worktree add at /Users/alexander.mayes/Code/personal/loot-list-plus-wt-ilvl-code, new branch feat/armory-item-level from origin/main. Symlink its node_modules to the main checkout's node_modules.

Write scripts/spikes/armory-item-level-spike.ts in the code worktree. It is a tsx script that follows the dotenv convention of scripts/check-items.ts: dotenv.config with path.resolve(process.cwd(), '.env.local'). Behaviour:
- Env check. If BLIZZARD_CLIENT_ID or BLIZZARD_CLIENT_SECRET is missing, print only the missing variable names and exit with code 2.
- Token. Get an app token with the client-credentials grant: POST https://oauth.battle.net/token with form body grant_type=client_credentials and HTTP Basic auth from the client id and secret, the same header construction as exchangeCodeForTokens in lib/battlenet.ts lines 54-87. Keep the token in memory only. Never log or write it.
- Sample. If SPIKE_CHARACTERS is set, parse it as a semicolon list of region/realm-slug/name. Otherwise use --from-db N (default 10): build a supabase-js client from NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY and select id, name, realm, user_id from characters where battle_net_id and realm are not null, limited to N. Read battlenet_accounts.region for those user_ids, defaulting to us. Derive realm slug and lowercase name exactly as sync-gear lines 117-119.
- Requests. For each sample, run sequentially with a 150 ms pause: GET https://{region}.api.blizzard.com/profile/wow/character/{realmSlug}/{name}/equipment?locale=en_US with header Battlenet-Namespace profile-classic-{region}. Retry once in profile-classic1x-{region} only on a 404, and record which namespace answered. Then GET the character summary /profile/wow/character/{realmSlug}/{name}?locale=en_US in the namespace that answered.
- Per-character record, keyed by label c1, c2 and so on, never by name. Record:
  - status codes and latency in ms;
  - whether a last-modified header is present, and its age in hours;
  - the summary's last_login_timestamp age in hours;
  - whether the summary carries numeric equipped_item_level or average_item_level;
  - the count of equipped items excluding slot types SHIRT and TABARD, and how many of them carry a positive integer at level.value;
  - any other numeric item-level-like field found at an item's top level (key name only);
  - the union of item key names (keys only, never values);
  - the union of slot.type values seen;
  - min and max of the level values;
  - whether inventory_type.type is present.
- Totals: samples tried, samples fetched (200), the overall coverage percentage of items with a level value, and median and max staleness hours.
- Privacy self-check before printing. Serialize the report and make sure no sampled name or realm string (lowercased, length 3 or more) appears in it. If one does, print only "privacy self-check failed" and exit 3. Otherwise print the report as one JSON object to stdout. The report holds labels, numbers, booleans, status codes and key names only.

Run it from the main checkout so .env.local resolves: cd /Users/alexander.mayes/Code/personal/loot-list-plus and run npx tsx with the worktree script path and --from-db 10. Read the documented API rate limits from https://develop.battle.net/documentation/guides/getting-started with WebFetch. If the fetch fails, write the limits as unverified.

Write 261026-wpw-SPIKE.md in the quick directory in the main checkout. Sections, in this order:
- Question.
- Method: endpoint, namespace, token type, sample size and sample source type. Never list characters.
- Results: a table of the aggregates.
- Item level field path: the exact JSON path, expected level.value.
- Staleness: Blizzard profile data reflects the character's last logout. Report the measured last-login and Last-Modified ages. Note that sync-gear is user-triggered, and the panel shows the sync age.
- Rate limits.
- User token vs app token: same endpoint and response shape, because production sync uses the user's token through battlenetFetch.
- Verdict: one line, exactly **Verdict:** followed by GO, NO-GO or INCONCLUSIVE.
- Consequences.

Gate rules:
- GO when at least 3 samples return 200 and at least 90 percent of their non-cosmetic equipped items carry a positive integer at the recorded field path.
- NO-GO when at least 3 samples return 200 and coverage is below 90 percent. Then stop the plan: Tasks 2 and 3 are not executed. Under Consequences, record them as blocked and name the alternative as an owner decision without implementing it. The alternative is the Game Data item endpoint in static-classic-{region}, which gives the base item level per item id; it ignores upgrades, and the spike's level range shows whether that matters.
- INCONCLUSIVE when the precondition is unmet or fewer than 3 samples return 200. Halt. Give the owner the exact command to run from the main checkout with SPIKE_CHARACTERS set to their own characters, and ask them to paste the printed JSON (it contains no names). Do not guess a verdict.

Commits:
- On feat/armory-item-level, commit the script as chore(spike): Battle.net Classic equipped item level probe.
- On the gsd/quick branch in the main checkout, commit only the SPIKE.md path as docs(quick-261026-wpw): armory item level spike finding.
The repo is public. SPIKE.md and every commit contain counts and aggregates only: no guild, character or realm names, no ids, no tokens and no URLs carrying them.
  </action>
  <verify>
    <automated>cd /Users/alexander.mayes/Code/personal/loot-list-plus && test -f .planning/workstreams/forever/quick/261026-wpw-v1-armory-gear-sync-spike-battle-net-cla/261026-wpw-SPIKE.md && grep -E -c '^\*\*Verdict:\*\* (GO|NO-GO|INCONCLUSIVE)$' .planning/workstreams/forever/quick/261026-wpw-v1-armory-gear-sync-spike-battle-net-cla/261026-wpw-SPIKE.md && cd /Users/alexander.mayes/Code/personal/loot-list-plus-wt-ilvl-code && npx eslint scripts/spikes/armory-item-level-spike.ts</automated>
  </verify>
  <done>The spike ran against live Battle.net Classic data and exited 0 with a JSON report that passed its own privacy self-check. SPIKE.md records the endpoint, namespace, item level field path, coverage percentage, level range, staleness numbers and rate limits, plus exactly one verdict line. The verdict count from the grep is 1. On NO-GO or INCONCLUSIVE, execution stops here and the SUMMARY says why and what the owner must do next.</done>
</task>

<task type="auto">
  <name>Task 2: Store item level per equipped slot: migration-only branch, then the two Battle.net writers on the code branch</name>
  <files>supabase/migrations/20261026120000_equipped_item_level.sql, app/services/__tests__/equipped-item-level-migration.test.ts, lib/battlenet.ts, lib/database.types.ts, app/api/battlenet/characters/sync-gear/route.ts, app/api/battlenet/characters/import/route.ts, app/api/battlenet/characters/import/__tests__/route.test.ts</files>
  <precondition>261026-wpw-SPIKE.md has the line **Verdict:** GO and records the item level field path.</precondition>
  <action>
Part A: migration-only branch (Standing Constraint 1: expand-only, its own PR, live before any code that reads it).

Collision check. Run git fetch origin, then create the migration worktree with git worktree add at /Users/alexander.mayes/Code/personal/loot-list-plus-wt-ilvl-migration, new branch feat/equipped-item-level-migration from origin/main, and symlink node_modules. Confirm that no file named supabase/migrations/20261026* exists on origin/main or on any origin branch (git log --all over that path), and that gsd/v2.0-forever-loot still adds no migration over origin/main. At planning time the newest migration on main was 20261020120000_discovery_schema.sql, no branch or Forever plan touched character_equipped_items, and there was no collision. If the 20261026120000 timestamp is taken, use the next free one and update the file name and the test constant to match.

Write supabase/migrations/20261026120000_equipped_item_level.sql.

Header comment: copy the section layout of 20261003200000 (Problem, Fix, Readers and writers checked, Production safety, Deploy, Not changed, Rollback). Explain:
- that sync-gear and the Battle.net import are the only writers that set item_level, both on the service role;
- that WowSims imports leave it null;
- that the owner RLS policy plus the table-level GRANT ALL would otherwise let a browser session write its own item level, which officers will read as evidence; hence the guard;
- that RLS policies and grants are unchanged.
Rollback lists: drop both triggers, drop the function, drop the constraint, drop the column. Only stored item levels are lost, and a resync restores them.

Statements, in this order:
1. SET LOCAL lock_timeout to 5s.
2. ALTER TABLE public.character_equipped_items ADD COLUMN IF NOT EXISTS item_level integer. Nullable, no default.
3. DROP CONSTRAINT IF EXISTS character_equipped_items_item_level_range.
4. ADD CONSTRAINT character_equipped_items_item_level_range CHECK (item_level IS NULL OR item_level between 1 and 1999).
5. COMMENT ON COLUMN item_level: equipped item level from the Battle.net profile equipment API at the last gear sync; null when the source gave none.
6. CREATE OR REPLACE FUNCTION public.enforce_equipped_item_level_server_only(), copying enforce_expansion_forever_name_lock at discovery lines 479-503. It is invoker rights (it reads no table), with search_path set to public and pg_temp. When coalesce(current_setting('role', true), '') is anon or authenticated, it raises insufficient_privilege with message "equipped item levels are written only by the server gear sync"; otherwise it returns NEW.
7. COMMENT ON FUNCTION.
8. REVOKE ALL ON FUNCTION from PUBLIC, anon and authenticated.
9. CREATE OR REPLACE TRIGGER enforce_equipped_item_level_insert: BEFORE INSERT, FOR EACH ROW, WHEN NEW.item_level IS NOT NULL.
10. COMMENT ON TRIGGER for the insert trigger.
11. CREATE OR REPLACE TRIGGER enforce_equipped_item_level_update: BEFORE UPDATE OF item_level, FOR EACH ROW, WHEN NEW.item_level IS DISTINCT FROM OLD.item_level.
12. COMMENT ON TRIGGER for the update trigger.

Every statement must be re-runnable.

Write app/services/__tests__/equipped-item-level-migration.test.ts with two describe blocks.

The shape block. Copy stripComments and splitStatements from equipped-item-rules-migration.test.ts, then check that:
- the file exists, has a unique timestamp, and sorts after 20261020120000. Anchor the ordering to that constant, never to a live directory scan (#309);
- there are exactly the 12 executable statements above, in order;
- outside the header comment there is no DROP TABLE, DROP COLUMN, DROP POLICY, CREATE POLICY, ALTER POLICY or GRANT;
- the only REVOKE is the one on the new function.

The PGlite block uses createChainedDb(listMigrationFiles()) and the fixture style of discovery-schema-pglite.test.ts. Fixtures:
- one guild with an owner user and character with an active membership;
- a guildmate user and character with an active membership;
- an ex-member user and character with an inactive membership;
- a non-member user whose character is active in another guild;
- one equipped row for the owner's character, inserted by the superuser with item_level 489, and one inserted without an item_level.

Tests:
- information_schema reports item_level as a nullable integer with no default, and the row inserted without one reads null;
- under the superuser, the CHECK rejects 0, -1 and 2000 and accepts 1, 489 and 1999 (in rolled-back transactions);
- re-applying the file twice more succeeds;
- RLS read of item_level: the owner and the active guildmate each read the 489 row; the ex-member, the non-member and anon read zero rows;
- the guard, using asRole as the owner: an insert of an own-character row with item_level 500 is rejected with insufficient_privilege (42501); an insert with null item_level succeeds; an update changing item_level is rejected; an update changing only enchant_id succeeds. Run all of these in rolled-back transactions;
- the superuser can insert and update item_level.

Run the new test, then the whole app/services/__tests__ directory. If an older shape test fails only because it scans the live directory for the newest migration, anchor that test to its own preceding migration in a separate test-only commit before the migration commit, as quick task 261003-kfj did.

Commit on feat/equipped-item-level-migration as feat(db): store equipped item level per slot. The message states: migration-only PR, merge with --admin on a non-raid day, deploys about 12 seconds after merge, and the feat/armory-item-level code PR merges only after this is live.

Part B: writers, in the code worktree on feat/armory-item-level.

lib/battlenet.ts: next to SLOT_MAPPING, export readEquippedItemLevel(item). It reads the field path the spike recorded (expected level.value) and returns the value only when it is an integer from 1 to 1999, else null. The bounds match the CHECK, so a bad value becomes null instead of failing the whole insert.

sync-gear route: add an optional level object (value, display_string) to the equipped item type in the EquipmentResponse interface, and add item_level: readEquippedItemLevel(item) to the insert map at lines 163-173.

Import route: make the same two changes to its own EquipmentResponse interface (find it with grep) and to its insert map near lines 395-411.

lib/database.types.ts, character_equipped_items, in alphabetical position after imported_at: Row gets item_level: number | null; Insert and Update get optional item_level: number | null.

Import route test: add one case, following the file's existing mocks. An equipment response with one item at level.value 489 and one without a level inserts rows carrying item_level 489 and null.

Do not change the delete-then-insert flow or any error copy in either route. Commit as feat(gear): store item level from Battle.net gear sync and import.
  </action>
  <verify>
    <automated>cd /Users/alexander.mayes/Code/personal/loot-list-plus-wt-ilvl-migration && npx vitest run app/services/__tests__/equipped-item-level-migration.test.ts && npx vitest run app/services/__tests__ && cd /Users/alexander.mayes/Code/personal/loot-list-plus-wt-ilvl-code && npx vitest run app/api/battlenet && grep -c "item_level: readEquippedItemLevel(" app/api/battlenet/characters/sync-gear/route.ts app/api/battlenet/characters/import/route.ts && npm run typecheck</automated>
  </verify>
  <done>
- The migration branch holds exactly the migration and its test, plus an optional anchoring test commit.
- The PGlite chain proves: the column, CHECK and guard behave as specified; RLS reads match the owner, guildmate, ex-member, non-member and anon matrix; re-applying is a no-op.
- All app/services migration tests pass.
- On the code branch, both writers store item_level (the grep finds 1 per route), the import test proves 489 and null, and typecheck passes.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Slot rules in domain and the Equipped column in the officer item candidate panel</name>
  <files>domain/loot/equipped-item-level.ts, domain/loot/__tests__/equipped-item-level.test.ts, app/api/guilds/[id]/equipped-item-levels/route.ts, app/api/guilds/[id]/equipped-item-levels/__tests__/route.test.ts, app/(app)/master-sheet/components/ItemCandidateModal.tsx, app/(app)/master-sheet/components/__tests__/ItemCandidateModal.test.tsx</files>
  <precondition>Task 2 Part B is committed on feat/armory-item-level, so lib/database.types.ts has item_level.</precondition>
  <behavior>
    - equippedSlotsForLootItem('Finger', any name) gives primary [Finger 1, Finger 2] with basis lowest. Trinket gives primary [Trinket 1, Trinket 2] with basis lowest.
    - One-Hand and Two-Hand give primary [Main Hand] and context [Off Hand]. Main Hand and Weapon give primary [Main Hand]. Off-Hand, Off Hand, Shield and Held In Off-hand give primary [Off Hand].
    - Ranged, Wand and Thrown give primary [Ranged] with fallback [Main Hand]; the fallback applies when the character's synced gear has no Ranged row, as for MoP characters. Relic, Idol, Totem, Libram and Sigil give primary [Ranged] with no fallback.
    - The ten single armor slots (Head, Neck, Shoulder, Back, Chest, Wrist, Hands, Waist, Legs, Feet) map to themselves. Matching is trimmed and case-insensitive.
    - Token resolves through tierTokenSlot(name). Mount, Recipe, Quest, Crafting, Enchant, Legendary, Bag, Book, an empty slot and unknown values are not comparable.
    - tierTokenSlot finds the slot word in the token name. Head: Helm, Helmet, Crown, Circlet, Headpiece. Shoulder: Shoulders, Shoulderpads, Mantle, Pauldrons, Spaulders. Chest: Chest, Chestguard, Breastplate, Robe, Tunic. Hands: Gauntlets, Gloves, Handguards. Legs: Leggings, Legguards, Legplates. Wrist: Bracers, Bindings, Wristguards, Armsplint. Waist: Belt, Girdle, Waistguard, Sash. Feet: Boots, Sabatons, Sandals. Names containing Qiraji or Primal Hakkari resolve to null, because those tokens map to different slots per class.
    - Data-driven test: read data/mop-raids.ts, cata-raids.ts, wrath-raids.ts, tbc-raids.ts and classic-wow-raids.ts as text, collect every name paired with slot 'Token', and strip a trailing " (Heroic)". Every name resolves to a slot except this explicit expected-null list, which must match exactly: Essence of the Cursed Conqueror, Protector and Vanquisher; Elementium Gem Cluster; Eternal Ember; Seething Cinder; Husk of the Old God; Carapace of the Old God; Skin of the Great Sandworm; Mature Black Dragon Sinew; Trophy of the Crusade; Regalia of the Grand Conqueror, Protector and Vanquisher; Imperial Qiraji Armaments; Imperial Qiraji Regalia; Qiraji Bindings of Command and of Dominance; and every Primal Hakkari name. Also spot-check: Helm of the Shadowy Conqueror gives Head; Desecrated Robe gives Chest; Gauntlets of the Shadowy Vanquisher (Heroic) gives Hands.
    - summarizeEquippedItemLevel takes itemSlot, itemName and equipped (null, or synced_at plus a slots map from slot name to number or null, where key presence means a row exists). Stored slot keys are normalized so that WowSims forms Finger1, Finger2, Trinket1 and Trinket2 equal Finger 1 and so on. It returns:
      - not-comparable when the item has no slots;
      - not-synced when equipped is null or has no slots at all;
      - empty-slot when any primary slot (after the ranged fallback) has no row;
      - no-item-level when any primary row has a null level;
      - otherwise ok, with itemLevel the minimum over the primary slots, perSlot listing primary then context slots with their levels, and syncedAt.
      Examples: Finger with Finger 1 at 489 and Finger 2 at 476 gives ok 476. Finger with only Finger 1 gives empty-slot. Two-Hand with Main Hand 496 and Off Hand 483 gives ok 496, with both slots listed. Ranged with no Ranged row and Main Hand 489 gives ok 489.
    - daysSinceSync(syncedAt, now) returns null for null input, else the floor of the elapsed days, never below 0.
    - Route GET /api/guilds/[id]/equipped-item-levels?character_ids=a,b answers:
      - 401 without a user;
      - 403 Officers only when verifyPermission(serviceSupabase, user.id, guildId, 'manage_loot') fails;
      - 400 when character_ids is missing or empty, has more than 200 ids, or any id is not a UUID;
      - ids without an active membership in this guild are silently dropped and never queried;
      - 500 when either read errors, never an empty success;
      - 200 with characters keyed by id, each holding synced_at (the max imported_at) and slots (slot to item_level), with characters that have no rows omitted, and Cache-Control private, no-store.
    - Panel: a Finger item with candidate A (Finger 1 489, Finger 2 476) and candidate B (no data) shows an Equipped header, 476 in A's row and Not synced in B's row. A Mount item makes no equipped-item-levels request and shows no Equipped header. A 500 from the route shows no Equipped header. Existing ItemCandidateModal tests stay green.
  </behavior>
  <action>
RED first. Write domain/loot/__tests__/equipped-item-level.test.ts covering every behavior bullet for the domain functions, and run it failing. Then implement domain/loot/equipped-item-level.ts as pure functions with no imports from app, lib or utils, in kebab-case and imported with the @/ alias:
- EquippedSlotName is a union of the stored slot values from SLOT_MAPPING in lib/battlenet.ts, without Shirt and Tabard.
- The exports are equippedSlotsForLootItem (returning primary, context, fallback and basis), tierTokenSlot, summarizeEquippedItemLevel and daysSinceSync.

These are Claude's discretion choices for the rules:
- One-Hand compares against the main hand, with the off hand as context. Tanks and casters replace the main hand, and the off hand can be a shield or frill.
- Paired rings and trinkets use the lower slot, the one the item most likely replaces.
- An empty paired slot reads Empty instead of the other slot's level.
- Keep a comment on the One-Hand rule saying why, and do not re-export through domain/index.ts.

Route: create app/api/guilds/[id]/equipped-item-levels/route.ts by following feral-conversion-count lines 1-40 (await params, getAuthenticatedUser, createServiceRoleClient, verifyPermission with 'manage_loot', which is the permission behind canManageLoot in MasterSheetContent line 166).
- Validate character_ids with a UUID regex. Dedupe the ids and cap them at 200.
- Filter the ids through character_guild_memberships with eq guild_id, eq is_active true and in character_id, on the service role client.
- Read character_equipped_items (character_id, slot, item_level, imported_at) for the remaining ids through the RLS-scoped createClient from @/utils/supabase/server. The policy "Users can view equipped items for guild characters" then stays the final boundary even if the membership filter regresses.
- Return 500 on any read error. This follows owner decision 7 in STATE.md: a failed read is never presented as a complete list.

Write the route test with vi.mock for @/utils/supabase/server (getAuthenticatedUser and createClient), @/utils/supabase/service-role and @/utils/server-roles, in the style of character-gear's route test, covering every route bullet.

Panel, in ItemCandidateModal.tsx:
- Compute the slot rule from item.item_slot and item.name with useMemo.
- When open, item, guildId and isOfficer are set and the rule is comparable, fetch /api/guilds/{guildId}/equipped-item-levels with the deduped character_ids of sortedRankings (first 200), encoded with encodeURIComponent. Use the cancelled-flag pattern of the recent-awards effect at lines 201-230. Keep state as loading, ready or error, plus the characters map.
- Render an Equipped th directly after the Candidate th at line 575, and a matching td after the candidate cell, only when the rule is comparable and the state is ready. While loading or on error, render no column, so a failed read never shows Not synced for everyone.

Cell content comes from summarizeEquippedItemLevel and daysSinceSync. The copy is proposed and needs owner sign-off before the code PR merges (Standing Constraint 2):
- ok: the number in tabular-nums. Title attribute: each listed slot as "{slot}: {level}", joined with ", ", then " Synced today." or " Synced 1 day ago." or " Synced {n} days ago."
- empty-slot: muted Empty, titled "Nothing equipped in this slot at the last sync."
- no-item-level: muted No ilvl, titled "This gear has no item level yet. A Battle.net gear sync fills it in."
- not-synced: muted Not synced, titled "No Battle.net gear sync for this character yet."
- A row whose character was beyond the 200 requested ids renders an empty cell.
- Header title: "Item level this player has equipped in the slot this item fills, from their last Battle.net gear sync".

Styling:
- Use the existing token classes in this table (px-4 py-2 text-right tabular-nums, text-11, text-muted-foreground), with no colour literals.
- Use no em dash characters (U+2014) in any added copy.
- Do not touch the score columns, explainScore or anything under domain/scoring.

In ItemCandidateModal.test.tsx, extend the stubbed fetch at lines 60-73 so URLs containing equipped-item-levels answer a configurable payload or status, defaulting to 200 with an empty characters map. Add the three panel cases from the behavior list.

Commit as feat(loot): equipped slot rules for item level comparison (domain and its test), then as feat(master-sheet): show equipped item level in the item candidate panel (route, panel and their tests).
  </action>
  <verify>
    <automated>cd /Users/alexander.mayes/Code/personal/loot-list-plus-wt-ilvl-code && npx vitest run domain/loot/__tests__/equipped-item-level.test.ts "app/api/guilds/[id]/equipped-item-levels" "app/(app)/master-sheet/components/__tests__/ItemCandidateModal.test.tsx" && npm run lint && npm run typecheck && npm test && git diff --quiet origin/main -- domain/scoring && test "$(git diff origin/main -- 'app/(app)/master-sheet/components/ItemCandidateModal.tsx' | grep '^+' | grep -c $'\xe2\x80\x94')" = "0"</automated>
    <human-check>Owner: run the code branch locally against a database where the migration is applied, open the master sheet as a manage_loot officer and open a ring, a trinket, a two-hand weapon, a tier token and a mount. The Equipped column shows sensible levels for synced raiders and is absent for the mount. Owner signs off the Equipped header, cell words (Empty, No ilvl, Not synced) and title copy before the code PR merges.</human-check>
  </verify>
  <done>
- Domain tests pass, including the data-driven token sweep across all five raid data files.
- The route returns 401, 403, 400, 500 and 200 exactly as specified, and drops cross-guild and inactive ids.
- The panel shows the Equipped column only for comparable slots on a successful read.
- Full lint, typecheck and npm test pass; Loot Score golden fixtures are unchanged; domain/scoring has no diff against origin/main; added modal lines contain no em dash.
- The owner copy sign-off is recorded in the SUMMARY as pending until given.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| browser to GET /api/guilds/[id]/equipped-item-levels | Untrusted guild id and character id list; the response exposes other players' gear |
| browser session to character_equipped_items (PostgREST) | Owner RLS policy plus table GRANT ALL let a raider write their own rows directly |
| server to Battle.net API | External data (item level) enters storage; app token or user token in transit |
| spike output to public repo | Script output and SPIKE.md land in a public repository |
| migration PR to production | Migrations auto-deploy about 12 seconds after merge with no CI on the SQL |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-wpw-01 | Information disclosure | GET /api/guilds/[id]/equipped-item-levels | high | mitigate | verifyPermission manage_loot (403 otherwise); ids filtered to active memberships of this guild; rows read through the RLS-scoped createClient so policy "Users can view equipped items for guild characters" (active on both sides) is the final boundary; route tests for 401, 403 and dropped cross-guild and inactive ids |
| T-wpw-02 | Tampering | character_equipped_items.item_level written from a browser session | medium | mitigate | Role-gated guard trigger enforce_equipped_item_level_server_only rejects anon or authenticated inserts with a non-null level and updates that change it (42501); CHECK 1 to 1999; PGlite tests prove the owner session is rejected and the service role stand-in is allowed |
| T-wpw-03 | Information disclosure | Spike script stdout and 261026-wpw-SPIKE.md | medium | mitigate | Report built from labels c1..cN, numbers, booleans and key names only; privacy self-check exits 3 if any sampled name or realm appears in the serialized report; SPIKE.md lists aggregates only |
| T-wpw-04 | Information disclosure | Battle.net app token and Supabase service role key in the spike | medium | mitigate | Read from .env.local into memory only; never logged, written or committed; missing-variable errors print names, never values |
| T-wpw-05 | Denial of service | character_ids query parameter | low | mitigate | UUID regex, dedupe, cap 200, 400 otherwise |
| T-wpw-06 | Repudiation | A failed read shown as Not synced for every candidate | low | mitigate | Route answers 500 on read error; the panel hides the column on non-OK (owner decision 7 pattern) |
| T-wpw-07 | Tampering | Code PR deployed before the migration (sync insert names a missing column) | medium | mitigate | Migration-only PR merges and deploys first (Standing Constraint 1); commit message and SUMMARY state the order; nothing pushed without the user's go-ahead |
| T-wpw-08 | Information disclosure | Stale armory data read as current | low | accept | Battle.net reflects last logout; the panel title shows the sync age and SPIKE.md documents measured lag; display-only, no scoring effect |
| T-wpw-09 | Tampering | Migration timestamp collision with an unmerged branch | low | mitigate | Pre-commit check across origin/main, every origin branch and gsd/v2.0-forever-loot (none found at planning); bump the timestamp if taken; ordering test anchored to 20261020120000 (#309) |

No package installs: dotenv, tsx, @supabase/supabase-js and @electric-sql/pglite are already dependencies, so no supply-chain gate applies.
</threat_model>

<verification>
- Spike: SPIKE.md has exactly one verdict line. On anything but GO, execution stopped after Task 1 and the SUMMARY records the blocked tasks and the owner's next step.
- Migration branch: npx vitest run app/services/__tests__ passes in /Users/alexander.mayes/Code/personal/loot-list-plus-wt-ilvl-migration; git diff --stat origin/main lists only the migration, its test and any anchored older test.
- Code branch: npm run lint, npm run typecheck and npm test pass in /Users/alexander.mayes/Code/personal/loot-list-plus-wt-ilvl-code; git diff --quiet origin/main -- domain/scoring exits 0.
- Privacy: no guild, character or realm names, ids or tokens in any committed file or commit message.
</verification>

<success_criteria>
- The go/no-go question is answered with live evidence, recorded with aggregates only.
- On GO: item level is stored per equipped slot by both Battle.net writers, browser sessions cannot forge it, and RLS is unchanged.
- Pure slot rules (rings, trinkets, weapons, ranged, tier tokens) live in domain/loot with tests, including a sweep of every token in the raid data.
- Officers see equipped item level for the item's slot next to each ranked player in the item candidate panel; LootScore is untouched.
- The migration is ready as a migration-only PR, and the code branch merges only after it is live.
</success_criteria>

<output>
Create /Users/alexander.mayes/Code/personal/loot-list-plus/.planning/workstreams/forever/quick/261026-wpw-v1-armory-gear-sync-spike-battle-net-cla/261026-wpw-SUMMARY.md when done. Include:
- the verdict;
- per-branch commit lists with SHAs;
- the final migration timestamp;
- the anchored older test, if any;
- the owner's ordered steps: push feat/equipped-item-level-migration and open the migration-only PR; merge with --admin on a non-raid day and confirm the deploy; then push feat/armory-item-level and open the code PR; give copy sign-off on the Equipped column; open the docs PR for the gsd/quick branch;
- the worktree paths to remove after merge.
</output>

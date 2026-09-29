-- Add the Classic raid profession recipes that were never seeded (GH #284).
--
-- A Classic guild could not find Pattern: Core Armor Kit, the AQ glove and
-- cloak formulas, or any of the other 21 raid-specific profession recipes
-- from Molten Core, Ruins of Ahn'Qiraj or Temple of Ahn'Qiraj, in the raider
-- item picker or the officer item table. The recipes were never rows in
-- loot_items: data/classic-wow-raids.ts, which app/services/expansionSeeder.ts
-- copies into every guild when it adds Classic, never listed them. The
-- companion data change (PR #308, "fix: add the Classic raid profession
-- recipes to the loot tables (#284)") adds 28 recipe rows (21 unique ids) to
-- that file for new guilds; this migration gives existing guilds the same
-- rows.
--
-- DEPLOY ORDER: merge this only after PR #308 is live in production (Vercel
-- deploy finished). Migrations apply about 12 seconds after merge while the
-- app deploy takes minutes, so merging both together would let a guild
-- created in between get neither the backfill nor the new catalog rows.
-- Merged after the deploy, guilds seeded by the new code already have every
-- recipe and the guards below skip them.
--
-- Same shape as 20260926233000_add_classic_missing_loot.sql: every guild owns
-- its own copy of each raid_tier and its loot_items, so one row is inserted
-- PER GUILD TIER by joining the recipe list against every matching tier.
-- Tiers are matched on name AND on belonging to a Classic expansion ('Classic'
-- or 'Classic WoW', an older name for the same expansion the app still
-- recognises).
--
-- Rows match what expansionSeeder writes for a new guild, column for column,
-- the same way the TBC Tier 6 recipes (20260729000002_add_tbc_p3_crafting_recipes.sql)
-- do:
--   - name, item_slot ('Recipe'), wowhead_id, boss_name: from
--     data/classic-wow-raids.ts.
--   - classification 'Unlimited', allocation_cost 0: none of these 21 names
--     is in data/classic-wow-item-classifications.ts, so the seeder's default
--     applies to every one.
--   - is_available true, roles '{}': none of these names is in
--     data/classic-item-roles.ts either.
--   - No loot_item_classes rows: only Token-slot items get one, and every row
--     below is slot 'Recipe'.
-- app/services/__tests__/classic-recipe-backfill-migration.test.ts runs the
-- real seeder and fails if any value below drifts from what it writes.
--
-- Multi-boss recipes are listed once under 'Shared Boss Loot' per raid (D-01);
-- the four single-boss recipes are listed under their boss (Moam; The Prophet
-- Skeram; Twin Emperors, for both Emperor Vek'nilash and Emperor Vek'lor,
-- since the catalog has one boss group for both). Only the 21 raid-specific
-- recipes are included; the 69 generic world-drop recipes are not (D-02).
--
-- The 7 AQ enchanting formulas that drop in both Ruins of Ahn'Qiraj and
-- Temple of Ahn'Qiraj are listed once per raid below (14 rows, 7 unique ids).
-- Both guards are scoped to the tier being inserted into (rt.id), so an
-- existing Temple of Ahn'Qiraj row can never block the Ruins of Ahn'Qiraj
-- insert for the same id, and each AQ tier gets its own row.
--
-- Two NOT EXISTS guards make this idempotent and keep it from duplicating
-- anything a tier already has. A recipe is skipped for a tier that already
-- has a row with:
--   1. the same wowhead_id (a second run, or an officer added it by hand), or
--   2. the same name, compared case-insensitively, under the same boss_name.
-- No recipe name has ever appeared in the catalog's git history under
-- another id, so guard 2 is not known to catch anything today; it is kept
-- for parity with the #273 and #279 backfills, in case an officer added one
-- of these recipes by hand before this migration ran.
--
-- A single statement, and the parity suite enforces it.

WITH items (raid_name, boss_name, name, wowhead_id, item_slot, classification, allocation_cost) AS (
  VALUES
    -- Molten Core (10): Shared Boss Loot, drops from Lucifron through
    -- Golemagg the Incinerator.
    ('Molten Core', 'Shared Boss Loot', 'Pattern: Core Armor Kit', 18252, 'Recipe', 'Unlimited', 0),
    ('Molten Core', 'Shared Boss Loot', 'Recipe: Major Rejuvenation Potion', 18257, 'Recipe', 'Unlimited', 0),
    ('Molten Core', 'Shared Boss Loot', 'Formula: Enchant Weapon - Spell Power', 18259, 'Recipe', 'Unlimited', 0),
    ('Molten Core', 'Shared Boss Loot', 'Formula: Enchant Weapon - Healing Power', 18260, 'Recipe', 'Unlimited', 0),
    ('Molten Core', 'Shared Boss Loot', 'Plans: Elemental Sharpening Stone', 18264, 'Recipe', 'Unlimited', 0),
    ('Molten Core', 'Shared Boss Loot', 'Pattern: Flarecore Wraps', 18265, 'Recipe', 'Unlimited', 0),
    ('Molten Core', 'Shared Boss Loot', 'Schematic: Biznicks 247x128 Accurascope', 18290, 'Recipe', 'Unlimited', 0),
    ('Molten Core', 'Shared Boss Loot', 'Schematic: Force Reactive Disk', 18291, 'Recipe', 'Unlimited', 0),
    ('Molten Core', 'Shared Boss Loot', 'Schematic: Core Marksman Rifle', 18292, 'Recipe', 'Unlimited', 0),
    ('Molten Core', 'Shared Boss Loot', 'Pattern: Core Felcloth Bag', 21371, 'Recipe', 'Unlimited', 0),
    -- Ruins of Ahn'Qiraj (8): 7 shared formulas plus 1 single-boss recipe.
    ('Ruins of Ahn''Qiraj', 'Shared Boss Loot', 'Formula: Enchant Gloves - Shadow Power', 20727, 'Recipe', 'Unlimited', 0),
    ('Ruins of Ahn''Qiraj', 'Shared Boss Loot', 'Formula: Enchant Gloves - Frost Power', 20728, 'Recipe', 'Unlimited', 0),
    ('Ruins of Ahn''Qiraj', 'Shared Boss Loot', 'Formula: Enchant Gloves - Fire Power', 20729, 'Recipe', 'Unlimited', 0),
    ('Ruins of Ahn''Qiraj', 'Shared Boss Loot', 'Formula: Enchant Gloves - Healing Power', 20730, 'Recipe', 'Unlimited', 0),
    ('Ruins of Ahn''Qiraj', 'Shared Boss Loot', 'Formula: Enchant Gloves - Superior Agility', 20731, 'Recipe', 'Unlimited', 0),
    ('Ruins of Ahn''Qiraj', 'Shared Boss Loot', 'Formula: Enchant Cloak - Stealth', 20734, 'Recipe', 'Unlimited', 0),
    ('Ruins of Ahn''Qiraj', 'Shared Boss Loot', 'Formula: Enchant Cloak - Dodge', 20736, 'Recipe', 'Unlimited', 0),
    ('Ruins of Ahn''Qiraj', 'Moam', 'Plans: Black Grasp of the Destroyer', 22220, 'Recipe', 'Unlimited', 0),
    -- Temple of Ahn'Qiraj (10): the same 7 shared formulas plus 3 single-boss
    -- recipes.
    ('Temple of Ahn''Qiraj', 'Shared Boss Loot', 'Formula: Enchant Gloves - Shadow Power', 20727, 'Recipe', 'Unlimited', 0),
    ('Temple of Ahn''Qiraj', 'Shared Boss Loot', 'Formula: Enchant Gloves - Frost Power', 20728, 'Recipe', 'Unlimited', 0),
    ('Temple of Ahn''Qiraj', 'Shared Boss Loot', 'Formula: Enchant Gloves - Fire Power', 20729, 'Recipe', 'Unlimited', 0),
    ('Temple of Ahn''Qiraj', 'Shared Boss Loot', 'Formula: Enchant Gloves - Healing Power', 20730, 'Recipe', 'Unlimited', 0),
    ('Temple of Ahn''Qiraj', 'Shared Boss Loot', 'Formula: Enchant Gloves - Superior Agility', 20731, 'Recipe', 'Unlimited', 0),
    ('Temple of Ahn''Qiraj', 'Shared Boss Loot', 'Formula: Enchant Cloak - Stealth', 20734, 'Recipe', 'Unlimited', 0),
    ('Temple of Ahn''Qiraj', 'Shared Boss Loot', 'Formula: Enchant Cloak - Dodge', 20736, 'Recipe', 'Unlimited', 0),
    ('Temple of Ahn''Qiraj', 'The Prophet Skeram', 'Plans: Thick Obsidian Breastplate', 22222, 'Recipe', 'Unlimited', 0),
    ('Temple of Ahn''Qiraj', 'Twin Emperors', 'Formula: Enchant Gloves - Threat', 20726, 'Recipe', 'Unlimited', 0),
    ('Temple of Ahn''Qiraj', 'Twin Emperors', 'Formula: Enchant Cloak - Subtlety', 20735, 'Recipe', 'Unlimited', 0)
)
INSERT INTO loot_items (raid_tier_id, name, item_slot, wowhead_id, boss_name, is_available, classification, allocation_cost, roles)
SELECT rt.id, i.name, i.item_slot, i.wowhead_id, i.boss_name, true, i.classification, i.allocation_cost, '{}'::text[]
FROM raid_tiers rt
JOIN expansions e ON e.id = rt.expansion_id
JOIN items i ON i.raid_name = rt.name
WHERE e.name IN ('Classic', 'Classic WoW')
  -- Guard 1: the tier already has this recipe's id.
  AND NOT EXISTS (
    SELECT 1 FROM loot_items li
    WHERE li.raid_tier_id = rt.id
      AND li.wowhead_id = i.wowhead_id
  )
  -- Guard 2: the tier already has this name under this boss (any id).
  AND NOT EXISTS (
    SELECT 1 FROM loot_items li
    WHERE li.raid_tier_id = rt.id
      AND lower(li.name) = lower(i.name)
      AND li.boss_name = i.boss_name
  );

-- Verification only, NOT executed. Run in Supabase Studio after deploy. All
-- three are read-only and return aggregate counts per item or per raid,
-- never per guild; do not pull guild, player or character data into a chat,
-- a commit or any artifact. The migration suite checks that the id lists
-- below match the statement above.
--
-- 1. Recipe rows present per Classic raid. Expect min_items = max_items for
--    every raid: Molten Core 10, Ruins of Ahn'Qiraj 8, Temple of Ahn'Qiraj 10;
--    Blackwing Lair, Onyxia's Lair, Zul'Gurub and Naxxramas 0. A tier can show
--    fewer only where guard 2 kept an older, differently-id'd copy of a
--    recipe under the same name and boss (an officer hand-add before this
--    migration ran); query 2 finds any such tier by its per-id row count.
--
-- select rt.name, count(distinct rt.id) as tiers,
--        min(c.n) as min_items, max(c.n) as max_items
-- from raid_tiers rt
-- join expansions e on e.id = rt.expansion_id
-- cross join lateral (
--   select count(*) as n from loot_items li
--   where li.raid_tier_id = rt.id
--     and li.wowhead_id in (18252, 18257, 18259, 18260, 18264, 18265, 18290,
--       18291, 18292, 21371, 20726, 20727, 20728, 20729, 20730, 20731, 20734,
--       20735, 20736, 22220, 22222)
-- ) c
-- where e.name in ('Classic', 'Classic WoW')
-- group by rt.name
-- order by rt.name;
--
-- 2. Per wowhead_id: row count, rows_off_expected (item_slot other than
--    'Recipe', classification other than 'Unlimited', or allocation_cost
--    other than 0) and rows_with_class_rows (rows with any loot_item_classes
--    row). Expect 0 and 0 for every id.
--
-- select li.wowhead_id, li.name, count(*) as rows,
--        count(*) filter (
--          where li.item_slot <> 'Recipe'
--             or li.classification <> 'Unlimited'
--             or li.allocation_cost <> 0
--        ) as rows_off_expected,
--        count(*) filter (
--          where exists (
--            select 1 from loot_item_classes lic where lic.loot_item_id = li.id
--          )
--        ) as rows_with_class_rows
-- from loot_items li
-- join raid_tiers rt on rt.id = li.raid_tier_id
-- join expansions e on e.id = rt.expansion_id
-- where e.name in ('Classic', 'Classic WoW')
--   and li.wowhead_id in (18252, 18257, 18259, 18260, 18264, 18265, 18290,
--     18291, 18292, 21371, 20726, 20727, 20728, 20729, 20730, 20731, 20734,
--     20735, 20736, 22220, 22222)
-- group by li.wowhead_id, li.name
-- order by li.wowhead_id;
--
-- 3. Names a tier now holds under more than one id. Expect no rows.
--
-- select d.item, count(*) as tiers
-- from (
--   select li.raid_tier_id, lower(li.name) as item
--   from loot_items li
--   join raid_tiers rt on rt.id = li.raid_tier_id
--   join expansions e on e.id = rt.expansion_id
--   where e.name in ('Classic', 'Classic WoW')
--     and exists (
--       select 1 from loot_items n
--       where n.raid_tier_id = li.raid_tier_id
--         and lower(n.name) = lower(li.name)
--         and n.wowhead_id in (18252, 18257, 18259, 18260, 18264, 18265, 18290,
--           18291, 18292, 21371, 20726, 20727, 20728, 20729, 20730, 20731,
--           20734, 20735, 20736, 22220, 22222)
--     )
--   group by li.raid_tier_id, lower(li.name)
--   having count(distinct li.wowhead_id) > 1
-- ) d
-- group by d.item
-- order by d.item;

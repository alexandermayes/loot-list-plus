-- Add the Classic raid loot that was never seeded (GH #273).
--
-- An Era guild could not find Carapace of the Old God, Ring of the Martyr or
-- Boots of Pure Thought, in the raider item picker or the officer item table.
-- The items were never rows in loot_items: data/classic-wow-raids.ts, which
-- app/services/expansionSeeder.ts copies into every guild when it adds
-- Classic, has lacked them since its 2026-01-09 rewrite. That rewrite kept only
-- equippable, single-boss epics, so tier tokens (non-equippable), trash drops
-- (no boss) and several plain boss drops were missing from all seven Classic
-- raids. The companion data change (PR #275) adds 67 items to that file for
-- new guilds; this migration gives existing guilds the same rows.
--
-- DEPLOY ORDER: merge this only after PR #275 is live in production (Vercel
-- deploy finished). Migrations apply about 12 seconds after merge while the
-- app deploy takes minutes, so merging both together would let a guild created
-- in between get neither the backfill nor the new catalog rows. Merged after
-- the deploy, guilds seeded by the new code already have every item and the
-- guards below skip them.
--
-- Same shape as 20260715000001_add_bt_hyjal_trash_loot.sql and
-- 20260728000001_add_tbc_p3_missing_loot.sql: every guild owns its own copy of
-- each raid_tier and its loot_items, so one row is inserted PER GUILD TIER by
-- joining the item list against every matching tier. Tiers are matched on
-- name AND on belonging to a Classic expansion, because "Onyxia's Lair" and
-- "Naxxramas" names also exist outside Classic in older data. 'Classic WoW' is
-- an older name for the same expansion that the app still recognises
-- (ExpansionManager, ItemLink); including it is harmless if no row uses it.
--
-- Rows match what expansionSeeder writes for a new guild, column for column:
--   - name, item_slot, wowhead_id, boss_name: from data/classic-wow-raids.ts.
--   - classification: data/classic-wow-item-classifications.ts, defaulting to
--     Unlimited. Three of these items are listed there (Boots of Pure Thought
--     Reserved, Band of Dark Dominion Limited, Cauterizing Band Reserved).
--   - allocation_cost: 1 for Reserved or Limited, otherwise 0.
--   - is_available true, roles '{}' (none of these names are in
--     data/classic-item-roles.ts).
--   - loot_item_classes for Token rows: one row per allowed class from
--     data/token-class-mapping.ts, spec_id NULL, spec_type 'primary'. Mature
--     Black Dragon Sinew is a Hunter-only quest item carried as slot 'Token'
--     so it gets a Hunter row and the picker hides it from other classes.
-- app/services/__tests__/classic-loot-backfill-migration.test.ts runs the real
-- seeder and fails if any value below drifts from what it writes.
--
-- Multi-boss drops are listed once under 'Shared Boss Loot' (the group
-- 20260729000003 introduced for Hyjal and MoP already uses), and trash drops
-- under 'Trash', so every item is one row per tier.
--
-- Two NOT EXISTS guards make this idempotent and keep it from duplicating
-- anything a tier already has. An item is skipped for a tier that already has
-- a row with:
--   1. the same wowhead_id (a second run, or an officer added it by hand), or
--   2. the same name, compared case-insensitively, under the same boss_name.
--      The earliest catalogs (2026-01-09) listed some of these names under
--      other ids, e.g. Carapace of the Old God as 21680 and Ring of the Martyr
--      as 21627; such a tier keeps its row rather than gaining a second one.
--      The guard needs the boss as well as the name because the two Bindings
--      of the Windseeker halves share a name: 18564 (Garr) is already seeded
--      and 18563 (Baron Geddon) must still be added.
-- An old copy filed under a different boss than the one below is not caught
-- and would gain a second row. In the 2026-01-09 catalogs that applies to
-- Boots of Pure Thought and Ringo's Blizzard Boots (Vaelastrasz the Corrupt),
-- Seal of the Gurubashi Berserker (Hakkar), Qiraji Ornate Hilt (Kurinnaxx) and
-- Imperial Qiraji Regalia (Twin Emperors). The per-guild seeder arrived on
-- 2026-01-10 with the corrected catalog, so such rows should be rare or
-- absent; the third verification query below finds any.
--
-- A single statement. The data-modifying CTE inserts the loot_items rows and
-- returns them, and the outer INSERT adds class rows ONLY for tokens this run
-- inserted, never for rows a guild already had.

WITH items (raid_name, boss_name, name, wowhead_id, item_slot, classification, allocation_cost) AS (
  VALUES
    ('Temple of Ahn''Qiraj', 'C''Thun', 'Carapace of the Old God', 20929, 'Token', 'Unlimited', 0),
    ('Temple of Ahn''Qiraj', 'C''Thun', 'Husk of the Old God', 20933, 'Token', 'Unlimited', 0),
    ('Temple of Ahn''Qiraj', 'Twin Emperors', 'Vek''lor''s Diadem', 20930, 'Token', 'Unlimited', 0),
    ('Temple of Ahn''Qiraj', 'Twin Emperors', 'Vek''nilash''s Circlet', 20926, 'Token', 'Unlimited', 0),
    ('Temple of Ahn''Qiraj', 'Ouro', 'Ouro''s Intact Hide', 20927, 'Token', 'Unlimited', 0),
    ('Temple of Ahn''Qiraj', 'Ouro', 'Skin of the Great Sandworm', 20931, 'Token', 'Unlimited', 0),
    ('Temple of Ahn''Qiraj', 'Shared Boss Loot', 'Qiraji Bindings of Command', 20928, 'Token', 'Unlimited', 0),
    ('Temple of Ahn''Qiraj', 'Shared Boss Loot', 'Qiraji Bindings of Dominance', 20932, 'Token', 'Unlimited', 0),
    ('Temple of Ahn''Qiraj', 'Shared Boss Loot', 'Imperial Qiraji Armaments', 21232, 'Token', 'Unlimited', 0),
    ('Temple of Ahn''Qiraj', 'Shared Boss Loot', 'Imperial Qiraji Regalia', 21237, 'Token', 'Unlimited', 0),
    ('Temple of Ahn''Qiraj', 'Princess Huhuran', 'Ring of the Martyr', 21620, 'Finger', 'Unlimited', 0),
    ('Temple of Ahn''Qiraj', 'Battleguard Sartura', 'Thick Qirajihide Belt', 21675, 'Waist', 'Unlimited', 0),
    ('Temple of Ahn''Qiraj', 'The Prophet Skeram', 'Boots of the Fallen Prophet', 21705, 'Feet', 'Unlimited', 0),
    ('Temple of Ahn''Qiraj', 'Silithid Royalty', 'Guise of the Devourer', 21693, 'Head', 'Unlimited', 0),
    ('Temple of Ahn''Qiraj', 'Silithid Royalty', 'Bile-Covered Gauntlets', 21682, 'Hands', 'Unlimited', 0),
    ('Temple of Ahn''Qiraj', 'Silithid Royalty', 'Mantle of the Desert''s Fury', 21684, 'Shoulder', 'Unlimited', 0),
    ('Temple of Ahn''Qiraj', 'Trash', 'Garb of Royal Ascension', 21838, 'Chest', 'Unlimited', 0),
    ('Temple of Ahn''Qiraj', 'Trash', 'Gloves of the Immortal', 21888, 'Hands', 'Unlimited', 0),
    ('Temple of Ahn''Qiraj', 'Trash', 'Gloves of the Redeemed Prophecy', 21889, 'Hands', 'Unlimited', 0),
    ('Temple of Ahn''Qiraj', 'Trash', 'Neretzek, The Blood Drinker', 21856, 'Two-Hand', 'Unlimited', 0),
    ('Temple of Ahn''Qiraj', 'Trash', 'Anubisath Warhammer', 21837, 'Weapon', 'Unlimited', 0),
    ('Temple of Ahn''Qiraj', 'Trash', 'Ritssyn''s Ring of Chaos', 21836, 'Finger', 'Unlimited', 0),
    ('Temple of Ahn''Qiraj', 'Trash', 'Shard of the Fallen Star', 21891, 'Trinket', 'Unlimited', 0),
    ('Blackwing Lair', 'Trash', 'Boots of Pure Thought', 19437, 'Feet', 'Reserved', 1),
    ('Blackwing Lair', 'Trash', 'Cloak of Draconic Might', 19436, 'Back', 'Unlimited', 0),
    ('Blackwing Lair', 'Trash', 'Band of Dark Dominion', 19434, 'Finger', 'Limited', 1),
    ('Blackwing Lair', 'Trash', 'Essence Gatherer', 19435, 'Wand', 'Unlimited', 0),
    ('Blackwing Lair', 'Trash', 'Doom''s Edge', 19362, 'Weapon', 'Unlimited', 0),
    ('Blackwing Lair', 'Trash', 'Draconic Maul', 19358, 'Two-Hand', 'Unlimited', 0),
    ('Blackwing Lair', 'Trash', 'Draconic Avenger', 19354, 'Two-Hand', 'Unlimited', 0),
    ('Blackwing Lair', 'Trash', 'Ringo''s Blizzard Boots', 19438, 'Feet', 'Unlimited', 0),
    ('Blackwing Lair', 'Trash', 'Interlaced Shadow Jerkin', 19439, 'Chest', 'Unlimited', 0),
    ('Molten Core', 'Trash', 'Arcanist Bindings', 16799, 'Wrist', 'Unlimited', 0),
    ('Molten Core', 'Trash', 'Arcanist Belt', 16802, 'Waist', 'Unlimited', 0),
    ('Molten Core', 'Trash', 'Felheart Bracers', 16804, 'Wrist', 'Unlimited', 0),
    ('Molten Core', 'Trash', 'Felheart Belt', 16806, 'Waist', 'Unlimited', 0),
    ('Molten Core', 'Trash', 'Girdle of Prophecy', 16817, 'Waist', 'Unlimited', 0),
    ('Molten Core', 'Trash', 'Vambraces of Prophecy', 16819, 'Wrist', 'Unlimited', 0),
    ('Molten Core', 'Trash', 'Nightslayer Bracelets', 16825, 'Wrist', 'Unlimited', 0),
    ('Molten Core', 'Trash', 'Nightslayer Belt', 16827, 'Waist', 'Unlimited', 0),
    ('Molten Core', 'Trash', 'Cenarion Belt', 16828, 'Waist', 'Unlimited', 0),
    ('Molten Core', 'Trash', 'Cenarion Bracers', 16830, 'Wrist', 'Unlimited', 0),
    ('Molten Core', 'Trash', 'Earthfury Belt', 16838, 'Waist', 'Unlimited', 0),
    ('Molten Core', 'Trash', 'Earthfury Bracers', 16840, 'Wrist', 'Unlimited', 0),
    ('Molten Core', 'Trash', 'Giantstalker''s Bracers', 16850, 'Wrist', 'Unlimited', 0),
    ('Molten Core', 'Trash', 'Giantstalker''s Belt', 16851, 'Waist', 'Unlimited', 0),
    ('Molten Core', 'Trash', 'Lawbringer Bracers', 16857, 'Wrist', 'Unlimited', 0),
    ('Molten Core', 'Trash', 'Lawbringer Belt', 16858, 'Waist', 'Unlimited', 0),
    ('Molten Core', 'Trash', 'Bracers of Might', 16861, 'Wrist', 'Unlimited', 0),
    ('Molten Core', 'Trash', 'Belt of Might', 16864, 'Waist', 'Unlimited', 0),
    ('Molten Core', 'Majordomo Executus', 'Fireguard Shoulders', 19139, 'Shoulder', 'Unlimited', 0),
    ('Molten Core', 'Majordomo Executus', 'Gloves of the Hypnotic Flame', 18808, 'Hands', 'Unlimited', 0),
    ('Molten Core', 'Majordomo Executus', 'Cauterizing Band', 19140, 'Finger', 'Reserved', 1),
    ('Molten Core', 'Baron Geddon', 'Bindings of the Windseeker', 18563, 'Quest', 'Unlimited', 0),
    ('Zul''Gurub', 'Shared Boss Loot', 'Primal Hakkari Bindings', 19716, 'Token', 'Unlimited', 0),
    ('Zul''Gurub', 'Shared Boss Loot', 'Primal Hakkari Armsplint', 19717, 'Token', 'Unlimited', 0),
    ('Zul''Gurub', 'Shared Boss Loot', 'Primal Hakkari Stanchion', 19718, 'Token', 'Unlimited', 0),
    ('Zul''Gurub', 'Shared Boss Loot', 'Primal Hakkari Girdle', 19719, 'Token', 'Unlimited', 0),
    ('Zul''Gurub', 'Shared Boss Loot', 'Primal Hakkari Sash', 19720, 'Token', 'Unlimited', 0),
    ('Zul''Gurub', 'Shared Boss Loot', 'Primal Hakkari Shawl', 19721, 'Token', 'Unlimited', 0),
    ('Zul''Gurub', 'Shared Boss Loot', 'Primal Hakkari Tabard', 19722, 'Token', 'Unlimited', 0),
    ('Zul''Gurub', 'Shared Boss Loot', 'Primal Hakkari Kossack', 19723, 'Token', 'Unlimited', 0),
    ('Zul''Gurub', 'Shared Boss Loot', 'Primal Hakkari Aegis', 19724, 'Token', 'Unlimited', 0),
    ('Zul''Gurub', 'Shared Boss Loot', 'Seal of the Gurubashi Berserker', 22722, 'Finger', 'Unlimited', 0),
    ('Ruins of Ahn''Qiraj', 'Shared Boss Loot', 'Qiraji Spiked Hilt', 20886, 'Quest', 'Unlimited', 0),
    ('Ruins of Ahn''Qiraj', 'Shared Boss Loot', 'Qiraji Ornate Hilt', 20890, 'Quest', 'Unlimited', 0),
    ('Onyxia''s Lair', 'Onyxia', 'Mature Black Dragon Sinew', 18705, 'Token', 'Unlimited', 0)
),
-- Allowed classes per Token-slot item, as in data/token-class-mapping.ts.
-- Imperial Qiraji Armaments and Regalia list every Classic class because each
-- rewards a choice of weapons that together every class can use. Mature Black
-- Dragon Sinew is Hunter-only.
token_classes (wowhead_id, classes) AS (
  VALUES
    (20929, ARRAY['Warrior', 'Paladin', 'Hunter', 'Rogue', 'Shaman']),
    (20933, ARRAY['Priest', 'Mage', 'Warlock', 'Druid']),
    (20930, ARRAY['Paladin', 'Hunter', 'Rogue', 'Shaman', 'Druid']),
    (20926, ARRAY['Warrior', 'Priest', 'Mage', 'Warlock']),
    (20927, ARRAY['Warrior', 'Rogue', 'Priest', 'Mage']),
    (20931, ARRAY['Paladin', 'Hunter', 'Shaman', 'Warlock', 'Druid']),
    (20928, ARRAY['Warrior', 'Hunter', 'Rogue', 'Priest']),
    (20932, ARRAY['Paladin', 'Shaman', 'Mage', 'Warlock', 'Druid']),
    (21232, ARRAY['Warrior', 'Paladin', 'Hunter', 'Rogue', 'Priest', 'Shaman', 'Mage', 'Warlock', 'Druid']),
    (21237, ARRAY['Warrior', 'Paladin', 'Hunter', 'Rogue', 'Priest', 'Shaman', 'Mage', 'Warlock', 'Druid']),
    (19716, ARRAY['Paladin', 'Hunter', 'Mage']),
    (19717, ARRAY['Warrior', 'Rogue', 'Shaman']),
    (19718, ARRAY['Priest', 'Warlock', 'Druid']),
    (19719, ARRAY['Warrior', 'Rogue', 'Shaman']),
    (19720, ARRAY['Priest', 'Warlock', 'Druid']),
    (19721, ARRAY['Paladin', 'Hunter', 'Mage']),
    (19722, ARRAY['Paladin', 'Shaman', 'Druid']),
    (19723, ARRAY['Warrior', 'Mage', 'Warlock']),
    (19724, ARRAY['Hunter', 'Rogue', 'Priest']),
    (18705, ARRAY['Hunter'])
),
inserted AS (
  INSERT INTO loot_items (raid_tier_id, name, item_slot, wowhead_id, boss_name, is_available, classification, allocation_cost, roles)
  SELECT rt.id, i.name, i.item_slot, i.wowhead_id, i.boss_name, true, i.classification, i.allocation_cost, '{}'::text[]
  FROM raid_tiers rt
  JOIN expansions e ON e.id = rt.expansion_id
  JOIN items i ON i.raid_name = rt.name
  WHERE e.name IN ('Classic', 'Classic WoW')
    -- Guard 1: the tier already has this item's id.
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
    )
  RETURNING id, wowhead_id, item_slot
)
INSERT INTO loot_item_classes (loot_item_id, class_id, spec_id, spec_type)
SELECT ins.id, wc.id, NULL, 'primary'
FROM inserted ins
JOIN token_classes tc ON tc.wowhead_id = ins.wowhead_id
JOIN wow_classes wc ON wc.name = ANY (tc.classes)
WHERE ins.item_slot = 'Token';

-- Verification only, NOT executed. Run in Supabase Studio after deploy. All
-- three are read-only and return aggregate counts per item or per raid, never
-- per guild; do not pull guild, player or character data into a chat, a
-- commit or any artifact. The migration suite checks that the id lists and
-- class lists below match the statement above.
--
-- 1. Items present per Classic raid. Expect min_items = max_items = the full
--    count for every raid (AQ40 23, MC 22, ZG 10, BWL 9, AQ20 2, Onyxia 1,
--    Naxxramas 0). A tier can show fewer only where guard 2 kept an older copy
--    of an item under another id; query 3 and the header explain those.
--
-- select rt.name, count(distinct rt.id) as tiers,
--        min(c.n) as min_items, max(c.n) as max_items
-- from raid_tiers rt
-- join expansions e on e.id = rt.expansion_id
-- cross join lateral (
--   select count(*) as n from loot_items li
--   where li.raid_tier_id = rt.id
--     and li.wowhead_id in (20929, 20933, 20930, 20926, 20927, 20931, 20928, 20932,
--       21232, 21237, 21620, 21675, 21705, 21693, 21682, 21684, 21838, 21888, 21889,
--       21856, 21837, 21836, 21891, 19437, 19436, 19434, 19435, 19362, 19358, 19354,
--       19438, 19439, 16799, 16802, 16804, 16806, 16817, 16819, 16825, 16827, 16828,
--       16830, 16838, 16840, 16850, 16851, 16857, 16858, 16861, 16864, 19139, 18808,
--       19140, 18563, 19716, 19717, 19718, 19719, 19720, 19721, 19722, 19723, 19724,
--       22722, 20886, 20890, 18705)
-- ) c
-- where e.name in ('Classic', 'Classic WoW')
-- group by rt.name
-- order by rt.name;
--
-- 2. Class rows for every Token-slot item, checked row by row across guilds.
--    Each guild tier has its own row per token, so the lateral join computes
--    each row's own class set and the outer query reports the spread per
--    token. Expect, for every token: min_class_rows = max_class_rows =
--    expected_classes, rows_off_expected 0 and rows_not_token_slot 0.
--    rows_off_expected counts rows whose class set differs from the expected
--    set (missing, extra or duplicated classes), so a guild with a partial set
--    shows up here instead of vanishing into an average.
--
-- with expected (wowhead_id, classes) as (
--   values
--     (20929, ARRAY['Warrior', 'Paladin', 'Hunter', 'Rogue', 'Shaman']),
--     (20933, ARRAY['Priest', 'Mage', 'Warlock', 'Druid']),
--     (20930, ARRAY['Paladin', 'Hunter', 'Rogue', 'Shaman', 'Druid']),
--     (20926, ARRAY['Warrior', 'Priest', 'Mage', 'Warlock']),
--     (20927, ARRAY['Warrior', 'Rogue', 'Priest', 'Mage']),
--     (20931, ARRAY['Paladin', 'Hunter', 'Shaman', 'Warlock', 'Druid']),
--     (20928, ARRAY['Warrior', 'Hunter', 'Rogue', 'Priest']),
--     (20932, ARRAY['Paladin', 'Shaman', 'Mage', 'Warlock', 'Druid']),
--     (21232, ARRAY['Warrior', 'Paladin', 'Hunter', 'Rogue', 'Priest', 'Shaman', 'Mage', 'Warlock', 'Druid']),
--     (21237, ARRAY['Warrior', 'Paladin', 'Hunter', 'Rogue', 'Priest', 'Shaman', 'Mage', 'Warlock', 'Druid']),
--     (19716, ARRAY['Paladin', 'Hunter', 'Mage']),
--     (19717, ARRAY['Warrior', 'Rogue', 'Shaman']),
--     (19718, ARRAY['Priest', 'Warlock', 'Druid']),
--     (19719, ARRAY['Warrior', 'Rogue', 'Shaman']),
--     (19720, ARRAY['Priest', 'Warlock', 'Druid']),
--     (19721, ARRAY['Paladin', 'Hunter', 'Mage']),
--     (19722, ARRAY['Paladin', 'Shaman', 'Druid']),
--     (19723, ARRAY['Warrior', 'Mage', 'Warlock']),
--     (19724, ARRAY['Hunter', 'Rogue', 'Priest']),
--     (18705, ARRAY['Hunter'])
-- ),
-- expected_sorted as (
--   select x.wowhead_id,
--          (select array_agg(v order by v) from unnest(x.classes) as v) as classes
--   from expected x
-- )
-- select li.wowhead_id, li.name,
--        cardinality(x.classes) as expected_classes,
--        count(*) as token_rows,
--        min(c.n) as min_class_rows,
--        max(c.n) as max_class_rows,
--        count(*) filter (where c.classes is distinct from x.classes) as rows_off_expected,
--        count(*) filter (where li.item_slot <> 'Token') as rows_not_token_slot
-- from expected_sorted x
-- join loot_items li on li.wowhead_id = x.wowhead_id
-- join raid_tiers rt on rt.id = li.raid_tier_id
-- join expansions e on e.id = rt.expansion_id
-- cross join lateral (
--   select count(*) as n,
--          coalesce(array_agg(wc.name::text order by wc.name::text), '{}'::text[]) as classes
--   from loot_item_classes lic
--   join wow_classes wc on wc.id = lic.class_id
--   where lic.loot_item_id = li.id
-- ) c
-- where e.name in ('Classic', 'Classic WoW')
-- group by li.wowhead_id, li.name, x.classes
-- order by li.wowhead_id;
--
-- 3. Names a tier now holds under more than one id. Expect no rows. A row
--    means some tiers had an older copy of that item filed under a different
--    boss than the one guard 2 checks, and gained a second row; the tiers
--    column says how many. The two Bindings of the Windseeker halves are the
--    one legitimate same-name pair, so that name is flagged only above two ids.
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
--         and n.wowhead_id in (20929, 20933, 20930, 20926, 20927, 20931, 20928, 20932,
--           21232, 21237, 21620, 21675, 21705, 21693, 21682, 21684, 21838, 21888, 21889,
--           21856, 21837, 21836, 21891, 19437, 19436, 19434, 19435, 19362, 19358, 19354,
--           19438, 19439, 16799, 16802, 16804, 16806, 16817, 16819, 16825, 16827, 16828,
--           16830, 16838, 16840, 16850, 16851, 16857, 16858, 16861, 16864, 19139, 18808,
--           19140, 18563, 19716, 19717, 19718, 19719, 19720, 19721, 19722, 19723, 19724,
--           22722, 20886, 20890, 18705)
--     )
--   group by li.raid_tier_id, lower(li.name)
--   having count(distinct li.wowhead_id) >
--     case when lower(li.name) = 'bindings of the windseeker' then 2 else 1 end
-- ) d
-- group by d.item
-- order by d.item;

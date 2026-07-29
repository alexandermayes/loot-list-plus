-- Add the Tier 6 crafting recipes to Black Temple and Hyjal Summit (GH #200).
--
-- Completes 20260728000001, which only added Hyjal's jewelcrafting designs
-- because the drop zones for this block could not be confirmed at the time:
-- the wow-classic-items dataset files them under "Rare Drop" with no zone, and
-- Wowhead's drop tables are rendered client-side so they aren't in the fetched
-- HTML. Rendering the pages in a browser exposes them.
--
-- Verified per item against Wowhead's TBC drop tables, two ways:
--
--   1. Item side — each item's "dropped by" list, matching Black Temple by
--      zone id 3959.
--   2. NPC side — the inverse lookup on a Hyjal wave mob (npc 17895), whose
--      epic drops match the Hyjal trash loot already seeded here
--      (Hellfire-Encased Pendant, Nethervoid Cloak, Chestguard of Relentless
--      Storms), confirming its identity. It yields exactly the same 8 recipes
--      the item-side pass flagged as Hyjal.
--
-- The Hyjal wave mobs are event-spawned and carry no zone tag on Wowhead, so
-- they are identified by NPC id: 17895 Ghoul, 17897 Crypt Fiend, 17898
-- Abomination, 17899 Shadowy Necromancer, 17905 Banshee, 17906 Gargoyle,
-- 17907 Frost Wyrm, 17908 Giant Infernal, 17916 Fel Stalker.
--
-- All 16 drop in Black Temple, off both bosses and trash. 8 of those also drop
-- from Hyjal trash, so they are listed under both raids — a raider in either
-- can win one. Recipes are 'Unlimited' + cost 0, matching the Karazhan and
-- Tempest Keep recipe rows.
--
-- Per-guild insert with a NOT EXISTS guard on (wowhead_id, raid_tier_id), same
-- as 20260715000001 and 20260728000001: every guild owns its own copy of each
-- tier's loot_items, and re-running is a no-op.

-- ---------------------------------------------------------------------------
-- Black Temple — all 16.
-- ---------------------------------------------------------------------------
INSERT INTO loot_items (raid_tier_id, name, wowhead_id, item_slot, boss_name, classification, allocation_cost, is_available)
SELECT rt.id, v.name, v.wowhead_id, v.item_slot, 'Trash', 'Unlimited', 0, true
FROM raid_tiers rt
CROSS JOIN (VALUES
  ('Plans: Swiftsteel Bracers', 32736, 'Recipe'),
  ('Plans: Swiftsteel Shoulders', 32737, 'Recipe'),
  ('Plans: Dawnsteel Bracers', 32738, 'Recipe'),
  ('Plans: Dawnsteel Shoulders', 32739, 'Recipe'),
  ('Pattern: Bracers of Renewed Life', 32744, 'Recipe'),
  ('Pattern: Shoulderpads of Renewed Life', 32745, 'Recipe'),
  ('Pattern: Swiftstrike Bracers', 32746, 'Recipe'),
  ('Pattern: Swiftstrike Shoulders', 32747, 'Recipe'),
  ('Pattern: Bindings of Lightning Reflexes', 32748, 'Recipe'),
  ('Pattern: Shoulders of Lightning Reflexes', 32749, 'Recipe'),
  ('Pattern: Living Earth Bindings', 32750, 'Recipe'),
  ('Pattern: Living Earth Shoulders', 32751, 'Recipe'),
  ('Pattern: Swiftheal Wraps', 32752, 'Recipe'),
  ('Pattern: Swiftheal Mantle', 32753, 'Recipe'),
  ('Pattern: Bracers of Nimble Thought', 32754, 'Recipe'),
  ('Pattern: Mantle of Nimble Thought', 32755, 'Recipe')
) AS v(name, wowhead_id, item_slot)
WHERE rt.name = 'Black Temple'
  AND NOT EXISTS (
    SELECT 1 FROM loot_items li
    WHERE li.raid_tier_id = rt.id
      AND li.wowhead_id = v.wowhead_id
  );

-- ---------------------------------------------------------------------------
-- Hyjal Summit — the 8 that also drop from the wave trash.
-- ---------------------------------------------------------------------------
INSERT INTO loot_items (raid_tier_id, name, wowhead_id, item_slot, boss_name, classification, allocation_cost, is_available)
SELECT rt.id, v.name, v.wowhead_id, v.item_slot, 'Trash', 'Unlimited', 0, true
FROM raid_tiers rt
CROSS JOIN (VALUES
  ('Plans: Swiftsteel Bracers', 32736, 'Recipe'),
  ('Plans: Dawnsteel Shoulders', 32739, 'Recipe'),
  ('Pattern: Shoulderpads of Renewed Life', 32745, 'Recipe'),
  ('Pattern: Swiftstrike Bracers', 32746, 'Recipe'),
  ('Pattern: Bindings of Lightning Reflexes', 32748, 'Recipe'),
  ('Pattern: Living Earth Shoulders', 32751, 'Recipe'),
  ('Pattern: Swiftheal Wraps', 32752, 'Recipe'),
  ('Pattern: Mantle of Nimble Thought', 32755, 'Recipe')
) AS v(name, wowhead_id, item_slot)
WHERE rt.name = 'Hyjal Summit'
  AND NOT EXISTS (
    SELECT 1 FROM loot_items li
    WHERE li.raid_tier_id = rt.id
      AND li.wowhead_id = v.wowhead_id
  );

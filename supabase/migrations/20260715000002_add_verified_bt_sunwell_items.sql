-- Backfill verified-missing Black Temple and Sunwell Plateau loot.
-- Follow-up to #171. A content audit found 15 items absent from the seed whose
-- wowhead_ids, slots (Wowhead XML inventoryType) and boss sources (cross-checked
-- against warcraft.wiki.gg) are all confirmed. As with the #171 trash backfill,
-- loot_items are per-guild copies, so we insert one row per guild by joining the
-- item list against every matching tier, with a NOT EXISTS guard on
-- (wowhead_id, raid_tier_id) for idempotency. These match the groups added to
-- data/tbc-raids.ts so seeded and existing guilds converge.

-- Black Temple
INSERT INTO loot_items (raid_tier_id, name, wowhead_id, item_slot, boss_name, classification, allocation_cost, is_available)
SELECT rt.id, v.name, v.wowhead_id, v.item_slot, v.boss_name, 'Unlimited', 0, true
FROM raid_tiers rt
CROSS JOIN (VALUES
  ('Cowl of Benevolence', 32329, 'Head', 'Teron Gorefiend')
) AS v(name, wowhead_id, item_slot, boss_name)
WHERE rt.name = 'Black Temple'
  AND NOT EXISTS (
    SELECT 1 FROM loot_items li
    WHERE li.raid_tier_id = rt.id
      AND li.wowhead_id = v.wowhead_id
  );

-- Sunwell Plateau
INSERT INTO loot_items (raid_tier_id, name, wowhead_id, item_slot, boss_name, classification, allocation_cost, is_available)
SELECT rt.id, v.name, v.wowhead_id, v.item_slot, v.boss_name, 'Unlimited', 0, true
FROM raid_tiers rt
CROSS JOIN (VALUES
  ('Amulet of Unfettered Magics', 34204, 'Neck', 'Eredar Twins'),
  ('Archon''s Gavel', 34199, 'Main Hand', 'Eredar Twins'),
  ('Stanchion of Primal Instinct', 34198, 'Two-Hand', 'Eredar Twins'),
  ('Amice of the Convoker', 34210, 'Shoulder', 'Eredar Twins'),
  ('Shawl of Wonderment', 34202, 'Shoulder', 'Eredar Twins'),
  ('Ring of Hardened Resolve', 34213, 'Finger', 'M''uru'),
  ('Ring of Omnipotence', 34230, 'Finger', 'M''uru'),
  ('Blackened Naaru Sliver', 34427, 'Trinket', 'M''uru'),
  ('Steely Naaru Sliver', 34428, 'Trinket', 'M''uru'),
  ('Muramasa', 34214, 'One-Hand', 'M''uru'),
  ('Breeches of Natural Aggression', 34169, 'Legs', 'Kalecgos'),
  ('Legplates of the Holy Juggernaut', 34167, 'Legs', 'Kalecgos'),
  ('Gauntlets of the Ancient Shadowmoon', 34350, 'Hands', 'Trash'),
  ('Tranquil Majesty Wraps', 34351, 'Hands', 'Trash')
) AS v(name, wowhead_id, item_slot, boss_name)
WHERE rt.name = 'Sunwell Plateau'
  AND NOT EXISTS (
    SELECT 1 FROM loot_items li
    WHERE li.raid_tier_id = rt.id
      AND li.wowhead_id = v.wowhead_id
  );

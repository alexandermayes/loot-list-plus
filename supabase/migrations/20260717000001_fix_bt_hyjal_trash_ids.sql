-- Correct Black Temple and Hyjal Summit trash loot IDs (GH #171, reopened).
-- The trash rows inserted by 20260715000001 used wrong wowhead_ids (taken from
-- a since-removed script), so in the app they rendered the wrong Wowhead
-- tooltip/link and a broken icon (e.g. "Pillager's Gauntlets" resolved to
-- "Blessed Band of Karabor"). Correct ids were re-verified against
-- warcraft.wiki.gg and the Wowhead item XML.
--
-- Approach: delete the wrong rows and insert the corrected canonical trash
-- sets. Scoped to boss_name = 'Trash' in the matching tiers. The two already-
-- correct rows (Ring of Ancient Knowledge 32527, Hellfire-Encased Pendant
-- 32589) are left untouched. Inserts are idempotent via NOT EXISTS, so this is
-- a no-op for guilds seeded after the corrected data/tbc-raids.ts. Rankings on
-- the old broken rows are reset — they pointed at the wrong items, and this is
-- pre-launch planning data.

-- Remove wrong Black Temple trash rows
DELETE FROM loot_items li
USING raid_tiers rt
WHERE li.raid_tier_id = rt.id
  AND rt.name = 'Black Temple'
  AND li.boss_name = 'Trash'
  AND li.wowhead_id IN (32590, 32528, 32523);

-- Remove wrong Hyjal Summit trash rows
DELETE FROM loot_items li
USING raid_tiers rt
WHERE li.raid_tier_id = rt.id
  AND rt.name = 'Hyjal Summit'
  AND li.boss_name = 'Trash'
  AND li.wowhead_id IN (32611, 32945, 32946, 32947, 32593);

-- Insert corrected Black Temple trash
INSERT INTO loot_items (raid_tier_id, name, wowhead_id, item_slot, boss_name, classification, allocation_cost, is_available)
SELECT rt.id, v.name, v.wowhead_id, v.item_slot, 'Trash', 'Unlimited', 0, true
FROM raid_tiers rt
CROSS JOIN (VALUES
  ('Band of Devastation', 32526, 'Finger'),
  ('Blessed Band of Karabor', 32528, 'Finger'),
  ('Pillager''s Gauntlets', 32608, 'Hands'),
  ('Treads of the Den Mother', 32593, 'Feet'),
  ('Shroud of the Final Stand', 34012, 'Back'),
  ('Swiftsteel Bludgeon', 32943, 'One-Hand'),
  ('Illidari Runeshield', 34011, 'Off Hand')
) AS v(name, wowhead_id, item_slot)
WHERE rt.name = 'Black Temple'
  AND NOT EXISTS (
    SELECT 1 FROM loot_items li
    WHERE li.raid_tier_id = rt.id AND li.wowhead_id = v.wowhead_id
  );

-- Insert corrected Hyjal Summit trash
INSERT INTO loot_items (raid_tier_id, name, wowhead_id, item_slot, boss_name, classification, allocation_cost, is_available)
SELECT rt.id, v.name, v.wowhead_id, v.item_slot, 'Trash', 'Unlimited', 0, true
FROM raid_tiers rt
CROSS JOIN (VALUES
  ('Pepe''s Shroud of Pacification', 34010, 'Back'),
  ('Claw of Molten Fury', 32946, 'One-Hand'),
  ('Fist of Molten Fury', 32945, 'One-Hand'),
  ('Hammer of Judgement', 34009, 'One-Hand'),
  ('Chestguard of Relentless Storms', 32592, 'Chest'),
  ('Nethervoid Cloak', 32590, 'Back')
) AS v(name, wowhead_id, item_slot)
WHERE rt.name = 'Hyjal Summit'
  AND NOT EXISTS (
    SELECT 1 FROM loot_items li
    WHERE li.raid_tier_id = rt.id AND li.wowhead_id = v.wowhead_id
  );

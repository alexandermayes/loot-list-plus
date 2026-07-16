-- Add Black Temple and Hyjal Summit trash loot (GH #171).
-- Both raids were seeded with no "Trash" boss group, so their trash-mob BoP
-- epics never appeared under Loot Management. Every guild has its own copy of
-- each raid_tier and its loot_items (there is no shared/global item row and no
-- guild_id on raid_tiers), so we insert one row PER GUILD by joining the trash
-- item list against every "Black Temple" / "Hyjal Summit" tier. Those tier
-- names are unique to TBC, so matching on name alone is safe.
--
-- The NOT EXISTS guard (wowhead_id + raid_tier_id) makes this idempotent and
-- skips any guild that already had these items added by an earlier one-off
-- script. Item names/ids/slots match the "Trash" groups added to
-- data/tbc-raids.ts, so newly-seeded and existing guilds converge.
--
-- Deliberately excluded: 32517, 32524, 32609. Each already exists in the TBC
-- seed under a different name, so inserting them here would create duplicate
-- wowhead_id rows within the tier. Those pre-existing discrepancies are tracked
-- separately rather than papered over here.

-- Black Temple trash
INSERT INTO loot_items (raid_tier_id, name, wowhead_id, item_slot, boss_name, classification, allocation_cost, is_available)
SELECT rt.id, v.name, v.wowhead_id, v.item_slot, 'Trash', 'Unlimited', 0, true
FROM raid_tiers rt
CROSS JOIN (VALUES
  ('Ring of Ancient Knowledge', 32527, 'Finger'),
  ('Cloak of Fiends', 32590, 'Back'),
  ('Pillager''s Gauntlets', 32528, 'Hands'),
  ('Illidari Runeshield', 32523, 'Off Hand')
) AS v(name, wowhead_id, item_slot)
WHERE rt.name = 'Black Temple'
  AND NOT EXISTS (
    SELECT 1 FROM loot_items li
    WHERE li.raid_tier_id = rt.id
      AND li.wowhead_id = v.wowhead_id
  );

-- Hyjal Summit trash
INSERT INTO loot_items (raid_tier_id, name, wowhead_id, item_slot, boss_name, classification, allocation_cost, is_available)
SELECT rt.id, v.name, v.wowhead_id, v.item_slot, 'Trash', 'Unlimited', 0, true
FROM raid_tiers rt
CROSS JOIN (VALUES
  ('Pepe''s Shroud of Pacification', 32611, 'Back'),
  ('Hellfire-Encased Pendant', 32589, 'Neck'),
  ('Claw of Molten Fury', 32945, 'Main Hand'),
  ('Fist of Molten Fury', 32946, 'Off Hand'),
  ('Hammer of Judgement', 32947, 'Main Hand'),
  ('Chestguard of Relentless Storms', 32593, 'Chest')
) AS v(name, wowhead_id, item_slot)
WHERE rt.name = 'Hyjal Summit'
  AND NOT EXISTS (
    SELECT 1 FROM loot_items li
    WHERE li.raid_tier_id = rt.id
      AND li.wowhead_id = v.wowhead_id
  );

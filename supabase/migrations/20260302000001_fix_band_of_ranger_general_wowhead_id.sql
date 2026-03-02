-- Fix Band of the Ranger-General wowhead_id for guilds seeded with wrong ID (30102 = Krakken-Heart Breastplate)
-- Previous migration only caught the 33495 case. Use name match with != correct ID to catch any variant.
UPDATE loot_items
SET wowhead_id = 29997
WHERE name = 'Band of the Ranger-General'
  AND wowhead_id != 29997;

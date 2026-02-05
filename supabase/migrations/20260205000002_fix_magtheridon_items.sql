-- Fix Pit Lord's Satchel wowhead_id (was incorrectly set)
UPDATE loot_items
SET wowhead_id = 34845
WHERE name = 'Pit Lord''s Satchel' AND wowhead_id != 34845;

-- Add Magtheridon's Head if it doesn't exist
INSERT INTO loot_items (name, item_slot, wowhead_id, raid_tier_id, boss_name, is_available, allocation_cost, classification, roles)
SELECT
  'Magtheridon''s Head',
  'Quest',
  32385,
  rt.id,
  'Magtheridon',
  true,
  0,
  'Unlimited',
  ARRAY[]::text[]
FROM raid_tiers rt
WHERE rt.name = 'Magtheridon''s Lair'
AND NOT EXISTS (
  SELECT 1 FROM loot_items WHERE name = 'Magtheridon''s Head' AND raid_tier_id = rt.id
);

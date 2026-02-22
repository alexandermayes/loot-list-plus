-- Fix Serpentshrine Shuriken wowhead_id: 30029 is Bark-Gloves of Ancient Wisdom,
-- the correct ID for Serpentshrine Shuriken is 30025.
UPDATE loot_items
SET wowhead_id = 30025
WHERE name = 'Serpentshrine Shuriken'
  AND wowhead_id = 30029;

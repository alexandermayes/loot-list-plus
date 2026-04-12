-- Fix Wildfury Greatstaff boss assignment: Leotheras the Blind → Trash
-- This is a SSC trash drop, not a Leotheras drop.
UPDATE loot_items
SET boss_name = 'Trash'
WHERE wowhead_id = 30021
  AND boss_name = 'Leotheras the Blind';

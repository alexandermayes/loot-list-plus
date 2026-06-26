-- Fix Serpentshrine Cavern trash drops misassigned to bosses (GH #147).
-- Five SSC trash-mob BoP epics were seeded onto boss loot lists instead of
-- the "Trash" group, so they appear nested under bosses on the master sheet.
-- Verified SSC trash pool: 30021 (Wildfury, already Trash), 30022, 30023,
-- 30025, 30027, 30620. Match on wowhead_id + current boss_name so we only
-- move rows that are actually misassigned, leaving any hand-edited rows alone.

-- Hydross the Unstable → Trash
UPDATE loot_items
SET boss_name = 'Trash'
WHERE wowhead_id IN (30022, 30023, 30025)
  AND boss_name = 'Hydross the Unstable';

-- The Lurker Below → Trash
UPDATE loot_items
SET boss_name = 'Trash'
WHERE wowhead_id IN (30027, 30620)
  AND boss_name = 'The Lurker Below';

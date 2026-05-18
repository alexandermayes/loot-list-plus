-- Fix Twinblade of the Phoenix (wowhead_id 29993) slot from 'One-Hand' to 'Two-Hand'.
-- The seed data in data/tbc-raids.ts had this wrong, so every guild that
-- imported TBC raids has the wrong slot. Fix existing rows for all guilds.

UPDATE loot_items
SET item_slot = 'Two-Hand'
WHERE wowhead_id = 29993
  AND item_slot = 'One-Hand';

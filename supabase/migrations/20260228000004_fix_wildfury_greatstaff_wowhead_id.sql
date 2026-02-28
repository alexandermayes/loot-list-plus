-- Fix Wildfury Greatstaff (SSC/Leotheras) - was using Pillar of Ferocity's ID
UPDATE loot_items SET wowhead_id = 30021
WHERE name = 'Wildfury Greatstaff' AND wowhead_id = 30883;

-- Fix remaining wrong wowhead_ids in SSC and TK across ALL guilds

-- SSC: Spyglass of the Hidden Fleet (was 30001 = Doc's Belt)
UPDATE loot_items SET wowhead_id = 30620
WHERE name = 'Spyglass of the Hidden Fleet' AND wowhead_id = 30001;

-- SSC: Vashj's Vial Remnant (was 31544 = Clefthoof Hide Leggings)
UPDATE loot_items SET wowhead_id = 29906
WHERE name = 'Vashj''s Vial Remnant' AND wowhead_id = 31544;

-- TK: Sunhawk Leggings (was 30134 = Crystalforge Chestpiece)
UPDATE loot_items SET wowhead_id = 29991
WHERE name = 'Sunhawk Leggings' AND wowhead_id = 30134;

-- TK: Thalassian Wildercloak (was 30135 = Crystalforge Gloves)
UPDATE loot_items SET wowhead_id = 29994
WHERE name = 'Thalassian Wildercloak' AND wowhead_id = 30135;

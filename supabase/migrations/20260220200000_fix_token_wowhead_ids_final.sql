-- =====================================================
-- FIX TOKEN WOWHEAD IDS (FINAL CORRECTION)
-- =====================================================
-- Previous migrations (20260219210000 and 20260220100000)
-- applied WRONG wowhead_ids due to a 3-way cyclic shift
-- in the original data. This migration sets the correct
-- IDs verified against wowhead.com.
--
-- Correct pattern for T5 tokens:
--   Champion = lowest ID, Defender = middle, Hero = highest
--   (alphabetical variant name = ascending wowhead_id)
--
-- T4 Chestguard of the Fallen:
--   Defender = 29753, Champion = 29754, Hero = 29755
-- =====================================================

-- T4: Chestguard of the Fallen (Magtheridon)
UPDATE loot_items SET wowhead_id = 29753 WHERE name = 'Chestguard of the Fallen Defender';
UPDATE loot_items SET wowhead_id = 29754 WHERE name = 'Chestguard of the Fallen Champion';
UPDATE loot_items SET wowhead_id = 29755 WHERE name = 'Chestguard of the Fallen Hero';

-- T5: Chestguard of the Vanquished (Kael'thas Sunstrider)
-- Champion = 30236, Defender = 30237, Hero = 30238
UPDATE loot_items SET wowhead_id = 30236 WHERE name = 'Chestguard of the Vanquished Champion';
UPDATE loot_items SET wowhead_id = 30237 WHERE name = 'Chestguard of the Vanquished Defender';
UPDATE loot_items SET wowhead_id = 30238 WHERE name = 'Chestguard of the Vanquished Hero';

-- T5: Gloves of the Vanquished (Leotheras the Blind)
-- Champion = 30239, Defender = 30240, Hero = 30241
UPDATE loot_items SET wowhead_id = 30239 WHERE name = 'Gloves of the Vanquished Champion';
UPDATE loot_items SET wowhead_id = 30240 WHERE name = 'Gloves of the Vanquished Defender';
UPDATE loot_items SET wowhead_id = 30241 WHERE name = 'Gloves of the Vanquished Hero';

-- T5: Helm of the Vanquished (Lady Vashj)
-- Champion = 30242, Defender = 30243, Hero = 30244
UPDATE loot_items SET wowhead_id = 30242 WHERE name = 'Helm of the Vanquished Champion';
UPDATE loot_items SET wowhead_id = 30243 WHERE name = 'Helm of the Vanquished Defender';
UPDATE loot_items SET wowhead_id = 30244 WHERE name = 'Helm of the Vanquished Hero';

-- T5: Leggings of the Vanquished (Fathom-Lord Karathress)
-- Champion = 30245, Defender = 30246, Hero = 30247
UPDATE loot_items SET wowhead_id = 30245 WHERE name = 'Leggings of the Vanquished Champion';
UPDATE loot_items SET wowhead_id = 30246 WHERE name = 'Leggings of the Vanquished Defender';
UPDATE loot_items SET wowhead_id = 30247 WHERE name = 'Leggings of the Vanquished Hero';

-- T5: Pauldrons of the Vanquished (Void Reaver)
-- Champion = 30248, Defender = 30249, Hero = 30250
UPDATE loot_items SET wowhead_id = 30248 WHERE name = 'Pauldrons of the Vanquished Champion';
UPDATE loot_items SET wowhead_id = 30249 WHERE name = 'Pauldrons of the Vanquished Defender';
UPDATE loot_items SET wowhead_id = 30250 WHERE name = 'Pauldrons of the Vanquished Hero';

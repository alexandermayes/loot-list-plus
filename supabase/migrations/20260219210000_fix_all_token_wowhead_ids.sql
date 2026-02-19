-- =====================================================
-- FIX ALL TOKEN WOWHEAD IDS
-- =====================================================
-- The original complete_tbc_raid_loot.sql migration had
-- rotated wowhead_ids for ALL T5 tokens and swapped T4
-- Chestguard tokens. The previous fix (20260209000000)
-- only corrected T4 Chestguard and T5 Chestguard.
--
-- This migration sets correct wowhead_ids by name,
-- unconditionally, for all affected tokens.
-- =====================================================

-- T4: Chestguard of the Fallen (Magtheridon)
-- Hero = 29753, Champion = 29754, Defender = 29755
UPDATE loot_items SET wowhead_id = 29753 WHERE name = 'Chestguard of the Fallen Hero';
UPDATE loot_items SET wowhead_id = 29754 WHERE name = 'Chestguard of the Fallen Champion';
UPDATE loot_items SET wowhead_id = 29755 WHERE name = 'Chestguard of the Fallen Defender';

-- T5: Gloves of the Vanquished (Leotheras the Blind)
-- Hero = 30240, Champion = 30241, Defender = 30239
UPDATE loot_items SET wowhead_id = 30240 WHERE name = 'Gloves of the Vanquished Hero';
UPDATE loot_items SET wowhead_id = 30241 WHERE name = 'Gloves of the Vanquished Champion';
UPDATE loot_items SET wowhead_id = 30239 WHERE name = 'Gloves of the Vanquished Defender';

-- T5: Leggings of the Vanquished (Fathom-Lord Karathress)
-- Hero = 30246, Champion = 30247, Defender = 30245
UPDATE loot_items SET wowhead_id = 30246 WHERE name = 'Leggings of the Vanquished Hero';
UPDATE loot_items SET wowhead_id = 30247 WHERE name = 'Leggings of the Vanquished Champion';
UPDATE loot_items SET wowhead_id = 30245 WHERE name = 'Leggings of the Vanquished Defender';

-- T5: Helm of the Vanquished (Lady Vashj)
-- Hero = 30243, Champion = 30244, Defender = 30242
UPDATE loot_items SET wowhead_id = 30243 WHERE name = 'Helm of the Vanquished Hero';
UPDATE loot_items SET wowhead_id = 30244 WHERE name = 'Helm of the Vanquished Champion';
UPDATE loot_items SET wowhead_id = 30242 WHERE name = 'Helm of the Vanquished Defender';

-- T5: Pauldrons of the Vanquished (Void Reaver)
-- Hero = 30249, Champion = 30250, Defender = 30248
UPDATE loot_items SET wowhead_id = 30249 WHERE name = 'Pauldrons of the Vanquished Hero';
UPDATE loot_items SET wowhead_id = 30250 WHERE name = 'Pauldrons of the Vanquished Champion';
UPDATE loot_items SET wowhead_id = 30248 WHERE name = 'Pauldrons of the Vanquished Defender';

-- T5: Chestguard of the Vanquished (Kael'thas Sunstrider)
-- Hero = 30237, Champion = 30238, Defender = 30236
UPDATE loot_items SET wowhead_id = 30237 WHERE name = 'Chestguard of the Vanquished Hero';
UPDATE loot_items SET wowhead_id = 30238 WHERE name = 'Chestguard of the Vanquished Champion';
UPDATE loot_items SET wowhead_id = 30236 WHERE name = 'Chestguard of the Vanquished Defender';

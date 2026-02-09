-- Fix swapped wowhead_ids for Magtheridon tier tokens
-- The migration had Hero and Defender IDs swapped

-- Correct mappings:
-- 29753 = Chestguard of the Fallen Hero (Hunter, Mage, Warlock)
-- 29754 = Chestguard of the Fallen Champion (Paladin, Rogue, Shaman)
-- 29755 = Chestguard of the Fallen Defender (Warrior, Priest, Druid)

UPDATE loot_items
SET wowhead_id = 29753
WHERE name = 'Chestguard of the Fallen Hero' AND wowhead_id = 29755;

UPDATE loot_items
SET wowhead_id = 29755
WHERE name = 'Chestguard of the Fallen Defender' AND wowhead_id = 29753;

-- Also check SSC/TK tokens (T5)
-- Correct mappings:
-- 30237 = Chestguard of the Vanquished Hero (Hunter, Mage, Warlock)
-- 30238 = Chestguard of the Vanquished Champion (Paladin, Rogue, Shaman)
-- 30236 = Chestguard of the Vanquished Defender (Warrior, Priest, Druid)

UPDATE loot_items
SET wowhead_id = 30237
WHERE name = 'Chestguard of the Vanquished Hero' AND wowhead_id = 30238;

UPDATE loot_items
SET wowhead_id = 30238
WHERE name = 'Chestguard of the Vanquished Champion' AND wowhead_id = 30236;

UPDATE loot_items
SET wowhead_id = 30236
WHERE name = 'Chestguard of the Vanquished Defender' AND wowhead_id = 30237;

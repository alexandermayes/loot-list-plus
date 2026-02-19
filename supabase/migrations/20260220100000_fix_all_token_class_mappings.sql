-- =====================================================
-- FIX ALL TOKEN CLASS MAPPINGS
-- =====================================================
-- The loot_item_classes entries for tier tokens have been
-- incorrect for many guilds. This migration:
-- 1. Deletes ALL existing token class mappings
-- 2. Re-inserts them correctly based on token name
--
-- Token -> Class mappings (source of truth):
--   Fallen Hero       -> Hunter, Mage, Warlock
--   Fallen Champion   -> Paladin, Rogue, Shaman
--   Fallen Defender   -> Warrior, Priest, Druid
--   Vanquished Hero   -> Hunter, Mage, Warlock
--   Vanquished Champion -> Paladin, Rogue, Shaman
--   Vanquished Defender -> Warrior, Priest, Druid
--   Forgotten Conqueror -> Paladin, Priest, Warlock
--   Forgotten Protector -> Hunter, Shaman, Warrior
--   Forgotten Vanquisher -> Mage, Druid, Rogue
-- =====================================================

-- Step 1: Delete all existing token class mappings
DELETE FROM loot_item_classes
WHERE loot_item_id IN (
    SELECT id FROM loot_items WHERE item_slot = 'Token'
);

-- Step 2: Re-insert correct mappings for ALL tokens across ALL guilds
-- Uses item name matching to determine the correct class mapping

-- T4: Fallen Hero -> Hunter, Mage, Warlock
INSERT INTO loot_item_classes (loot_item_id, class_id, spec_id, spec_type)
SELECT li.id, wc.id, NULL, 'primary'
FROM loot_items li
CROSS JOIN wow_classes wc
WHERE li.item_slot = 'Token'
  AND li.name LIKE '%Fallen Hero%'
  AND wc.name IN ('Hunter', 'Mage', 'Warlock');

-- T4: Fallen Champion -> Paladin, Rogue, Shaman
INSERT INTO loot_item_classes (loot_item_id, class_id, spec_id, spec_type)
SELECT li.id, wc.id, NULL, 'primary'
FROM loot_items li
CROSS JOIN wow_classes wc
WHERE li.item_slot = 'Token'
  AND li.name LIKE '%Fallen Champion%'
  AND wc.name IN ('Paladin', 'Rogue', 'Shaman');

-- T4: Fallen Defender -> Warrior, Priest, Druid
INSERT INTO loot_item_classes (loot_item_id, class_id, spec_id, spec_type)
SELECT li.id, wc.id, NULL, 'primary'
FROM loot_items li
CROSS JOIN wow_classes wc
WHERE li.item_slot = 'Token'
  AND li.name LIKE '%Fallen Defender%'
  AND wc.name IN ('Warrior', 'Priest', 'Druid');

-- T5: Vanquished Hero -> Hunter, Mage, Warlock
INSERT INTO loot_item_classes (loot_item_id, class_id, spec_id, spec_type)
SELECT li.id, wc.id, NULL, 'primary'
FROM loot_items li
CROSS JOIN wow_classes wc
WHERE li.item_slot = 'Token'
  AND li.name LIKE '%Vanquished Hero%'
  AND wc.name IN ('Hunter', 'Mage', 'Warlock');

-- T5: Vanquished Champion -> Paladin, Rogue, Shaman
INSERT INTO loot_item_classes (loot_item_id, class_id, spec_id, spec_type)
SELECT li.id, wc.id, NULL, 'primary'
FROM loot_items li
CROSS JOIN wow_classes wc
WHERE li.item_slot = 'Token'
  AND li.name LIKE '%Vanquished Champion%'
  AND wc.name IN ('Paladin', 'Rogue', 'Shaman');

-- T5: Vanquished Defender -> Warrior, Priest, Druid
INSERT INTO loot_item_classes (loot_item_id, class_id, spec_id, spec_type)
SELECT li.id, wc.id, NULL, 'primary'
FROM loot_items li
CROSS JOIN wow_classes wc
WHERE li.item_slot = 'Token'
  AND li.name LIKE '%Vanquished Defender%'
  AND wc.name IN ('Warrior', 'Priest', 'Druid');

-- T6: Forgotten Conqueror -> Paladin, Priest, Warlock
INSERT INTO loot_item_classes (loot_item_id, class_id, spec_id, spec_type)
SELECT li.id, wc.id, NULL, 'primary'
FROM loot_items li
CROSS JOIN wow_classes wc
WHERE li.item_slot = 'Token'
  AND li.name LIKE '%Forgotten Conqueror%'
  AND wc.name IN ('Paladin', 'Priest', 'Warlock');

-- T6: Forgotten Protector -> Hunter, Shaman, Warrior
INSERT INTO loot_item_classes (loot_item_id, class_id, spec_id, spec_type)
SELECT li.id, wc.id, NULL, 'primary'
FROM loot_items li
CROSS JOIN wow_classes wc
WHERE li.item_slot = 'Token'
  AND li.name LIKE '%Forgotten Protector%'
  AND wc.name IN ('Hunter', 'Shaman', 'Warrior');

-- T6: Forgotten Vanquisher -> Mage, Druid, Rogue
INSERT INTO loot_item_classes (loot_item_id, class_id, spec_id, spec_type)
SELECT li.id, wc.id, NULL, 'primary'
FROM loot_items li
CROSS JOIN wow_classes wc
WHERE li.item_slot = 'Token'
  AND li.name LIKE '%Forgotten Vanquisher%'
  AND wc.name IN ('Mage', 'Druid', 'Rogue');

-- Classic Naxx Desecrated tokens
-- Desecrated Breastplate/Pauldrons/Helmet/Gauntlets/Legplates/Waistguard/Wristguards/Sabatons -> Warrior
INSERT INTO loot_item_classes (loot_item_id, class_id, spec_id, spec_type)
SELECT li.id, wc.id, NULL, 'primary'
FROM loot_items li
CROSS JOIN wow_classes wc
WHERE li.item_slot = 'Token'
  AND (li.name LIKE 'Desecrated Breastplate%' OR li.name LIKE 'Desecrated Pauldrons%'
    OR li.name LIKE 'Desecrated Helmet%' OR li.name LIKE 'Desecrated Gauntlets%'
    OR li.name LIKE 'Desecrated Legplates%' OR li.name LIKE 'Desecrated Waistguard%'
    OR li.name LIKE 'Desecrated Wristguards%' OR li.name LIKE 'Desecrated Sabatons%')
  AND wc.name = 'Warrior';

-- Desecrated Tunic/Spaulders/Headpiece/Handguards/Leggings/Belt/Bracers/Boots -> Rogue
INSERT INTO loot_item_classes (loot_item_id, class_id, spec_id, spec_type)
SELECT li.id, wc.id, NULL, 'primary'
FROM loot_items li
CROSS JOIN wow_classes wc
WHERE li.item_slot = 'Token'
  AND (li.name LIKE 'Desecrated Tunic%' OR li.name LIKE 'Desecrated Spaulders%'
    OR li.name LIKE 'Desecrated Headpiece%' OR li.name LIKE 'Desecrated Handguards%'
    OR li.name LIKE 'Desecrated Leggings%' OR li.name LIKE 'Desecrated Belt%'
    OR li.name LIKE 'Desecrated Bracers%' OR li.name LIKE 'Desecrated Boots%')
  AND wc.name = 'Rogue';

-- Desecrated Robe/Mantle/Circlet/Gloves/Pants/Bindings/Sandals/Girdle -> Priest, Mage, Warlock
INSERT INTO loot_item_classes (loot_item_id, class_id, spec_id, spec_type)
SELECT li.id, wc.id, NULL, 'primary'
FROM loot_items li
CROSS JOIN wow_classes wc
WHERE li.item_slot = 'Token'
  AND (li.name LIKE 'Desecrated Robe%' OR li.name LIKE 'Desecrated Mantle%'
    OR li.name LIKE 'Desecrated Circlet%' OR li.name LIKE 'Desecrated Gloves%'
    OR li.name LIKE 'Desecrated Pants%' OR li.name LIKE 'Desecrated Bindings%'
    OR li.name LIKE 'Desecrated Sandals%' OR li.name LIKE 'Desecrated Girdle%')
  AND wc.name IN ('Priest', 'Mage', 'Warlock');

-- Classic AQ40 tokens
-- Imperial Qiraji Armaments -> Warrior, Paladin, Hunter, Rogue
INSERT INTO loot_item_classes (loot_item_id, class_id, spec_id, spec_type)
SELECT li.id, wc.id, NULL, 'primary'
FROM loot_items li
CROSS JOIN wow_classes wc
WHERE li.item_slot = 'Token'
  AND li.name = 'Imperial Qiraji Armaments'
  AND wc.name IN ('Warrior', 'Paladin', 'Hunter', 'Rogue');

-- Imperial Qiraji Regalia -> Priest, Mage, Warlock, Druid, Shaman
INSERT INTO loot_item_classes (loot_item_id, class_id, spec_id, spec_type)
SELECT li.id, wc.id, NULL, 'primary'
FROM loot_items li
CROSS JOIN wow_classes wc
WHERE li.item_slot = 'Token'
  AND li.name = 'Imperial Qiraji Regalia'
  AND wc.name IN ('Priest', 'Mage', 'Warlock', 'Druid', 'Shaman');

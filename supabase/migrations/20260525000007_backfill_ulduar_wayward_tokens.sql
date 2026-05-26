-- Ulduar T8 tokens use the "Wayward Conqueror/Protector/Vanquisher" naming in
-- the seed, but the mapping file keyed them as "X of Ulduar" — so the substring
-- match never fired and every Wayward token in every Wrath guild was seeded
-- with zero class restrictions. Backfill the correct class assignments here.

-- Wayward Conqueror → Paladin, Priest, Warlock
INSERT INTO loot_item_classes (loot_item_id, class_id, spec_id, spec_type)
SELECT li.id, wc.id, NULL, 'primary'
FROM loot_items li
CROSS JOIN wow_classes wc
WHERE li.item_slot = 'Token'
  AND li.name LIKE '%Wayward Conqueror%'
  AND wc.name IN ('Paladin', 'Priest', 'Warlock')
  AND NOT EXISTS (
    SELECT 1 FROM loot_item_classes lic
    WHERE lic.loot_item_id = li.id
      AND lic.class_id = wc.id
      AND lic.spec_id IS NULL
  );

-- Wayward Protector → Hunter, Shaman, Warrior
INSERT INTO loot_item_classes (loot_item_id, class_id, spec_id, spec_type)
SELECT li.id, wc.id, NULL, 'primary'
FROM loot_items li
CROSS JOIN wow_classes wc
WHERE li.item_slot = 'Token'
  AND li.name LIKE '%Wayward Protector%'
  AND wc.name IN ('Hunter', 'Shaman', 'Warrior')
  AND NOT EXISTS (
    SELECT 1 FROM loot_item_classes lic
    WHERE lic.loot_item_id = li.id
      AND lic.class_id = wc.id
      AND lic.spec_id IS NULL
  );

-- Wayward Vanquisher → Death Knight, Druid, Mage, Rogue
INSERT INTO loot_item_classes (loot_item_id, class_id, spec_id, spec_type)
SELECT li.id, wc.id, NULL, 'primary'
FROM loot_items li
CROSS JOIN wow_classes wc
WHERE li.item_slot = 'Token'
  AND li.name LIKE '%Wayward Vanquisher%'
  AND wc.name IN ('Death Knight', 'Druid', 'Mage', 'Rogue')
  AND NOT EXISTS (
    SELECT 1 FROM loot_item_classes lic
    WHERE lic.loot_item_id = li.id
      AND lic.class_id = wc.id
      AND lic.spec_id IS NULL
  );

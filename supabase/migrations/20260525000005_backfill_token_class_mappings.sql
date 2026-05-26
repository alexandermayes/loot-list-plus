-- Backfill missing token class mappings uncovered by a wider token audit:
--
-- 1. MoP Vanquisher tokens (Shadowy/Crackling/Cursed) missing Death Knight.
--    DK is in the mapping, but loot_item_classes was seeded without DK for
--    guilds whose MoP expansion predates the fix.
--
-- 2. Wrath T7 "Lost" tokens (Naxxramas, Obsidian Sanctum, Eye of Eternity)
--    were not in data/token-class-mapping.ts, so the seeder never inserted
--    any class rows. Result: nobody can bracket these tokens.
--
-- 3. ICC T10 "X's Mark of Sanctification" tokens were keyed in the mapping
--    file without an apostrophe ("Conquerors"), but DB item names include the
--    apostrophe ("Conqueror's"). The substring match failed, so the seeder
--    never inserted class rows.
--
-- 4. Desecrated Legguards (Classic Naxx T3 mail leg piece, Hunter/Shaman)
--    was missing from the mapping file.

-- ---------------------------------------------------------------------------
-- 1. MoP Vanquisher tokens → add Death Knight
-- ---------------------------------------------------------------------------
INSERT INTO loot_item_classes (loot_item_id, class_id, spec_id, spec_type)
SELECT li.id, wc.id, NULL, 'primary'
FROM loot_items li
CROSS JOIN wow_classes wc
WHERE li.item_slot = 'Token'
  AND wc.name = 'Death Knight'
  AND (
    li.name LIKE '%of the Shadowy Vanquisher%'
    OR li.name LIKE '%of the Crackling Vanquisher%'
    OR li.name LIKE '%of the Cursed Vanquisher%'
  )
  AND NOT EXISTS (
    SELECT 1 FROM loot_item_classes lic
    WHERE lic.loot_item_id = li.id
      AND lic.class_id = wc.id
      AND lic.spec_id IS NULL
  );

-- ---------------------------------------------------------------------------
-- 2. Wrath T7 Lost tokens → seed class mappings
--    Lost Conqueror: Paladin, Priest, Warlock
--    Lost Protector: Hunter, Shaman, Warrior
--    Lost Vanquisher: Druid, Mage, Rogue
-- ---------------------------------------------------------------------------
INSERT INTO loot_item_classes (loot_item_id, class_id, spec_id, spec_type)
SELECT li.id, wc.id, NULL, 'primary'
FROM loot_items li
CROSS JOIN wow_classes wc
WHERE li.item_slot = 'Token'
  AND li.name LIKE '%Lost Conqueror%'
  AND wc.name IN ('Paladin', 'Priest', 'Warlock')
  AND NOT EXISTS (
    SELECT 1 FROM loot_item_classes lic
    WHERE lic.loot_item_id = li.id
      AND lic.class_id = wc.id
      AND lic.spec_id IS NULL
  );

INSERT INTO loot_item_classes (loot_item_id, class_id, spec_id, spec_type)
SELECT li.id, wc.id, NULL, 'primary'
FROM loot_items li
CROSS JOIN wow_classes wc
WHERE li.item_slot = 'Token'
  AND li.name LIKE '%Lost Protector%'
  AND wc.name IN ('Hunter', 'Shaman', 'Warrior')
  AND NOT EXISTS (
    SELECT 1 FROM loot_item_classes lic
    WHERE lic.loot_item_id = li.id
      AND lic.class_id = wc.id
      AND lic.spec_id IS NULL
  );

INSERT INTO loot_item_classes (loot_item_id, class_id, spec_id, spec_type)
SELECT li.id, wc.id, NULL, 'primary'
FROM loot_items li
CROSS JOIN wow_classes wc
WHERE li.item_slot = 'Token'
  AND li.name LIKE '%Lost Vanquisher%'
  AND wc.name IN ('Druid', 'Mage', 'Rogue')
  AND NOT EXISTS (
    SELECT 1 FROM loot_item_classes lic
    WHERE lic.loot_item_id = li.id
      AND lic.class_id = wc.id
      AND lic.spec_id IS NULL
  );

-- ---------------------------------------------------------------------------
-- 3. ICC T10 Mark of Sanctification tokens → seed class mappings
-- ---------------------------------------------------------------------------
INSERT INTO loot_item_classes (loot_item_id, class_id, spec_id, spec_type)
SELECT li.id, wc.id, NULL, 'primary'
FROM loot_items li
CROSS JOIN wow_classes wc
WHERE li.item_slot = 'Token'
  AND li.name LIKE '%Conqueror''s Mark of Sanctification%'
  AND wc.name IN ('Paladin', 'Priest', 'Warlock')
  AND NOT EXISTS (
    SELECT 1 FROM loot_item_classes lic
    WHERE lic.loot_item_id = li.id
      AND lic.class_id = wc.id
      AND lic.spec_id IS NULL
  );

INSERT INTO loot_item_classes (loot_item_id, class_id, spec_id, spec_type)
SELECT li.id, wc.id, NULL, 'primary'
FROM loot_items li
CROSS JOIN wow_classes wc
WHERE li.item_slot = 'Token'
  AND li.name LIKE '%Protector''s Mark of Sanctification%'
  AND wc.name IN ('Hunter', 'Shaman', 'Warrior')
  AND NOT EXISTS (
    SELECT 1 FROM loot_item_classes lic
    WHERE lic.loot_item_id = li.id
      AND lic.class_id = wc.id
      AND lic.spec_id IS NULL
  );

INSERT INTO loot_item_classes (loot_item_id, class_id, spec_id, spec_type)
SELECT li.id, wc.id, NULL, 'primary'
FROM loot_items li
CROSS JOIN wow_classes wc
WHERE li.item_slot = 'Token'
  AND li.name LIKE '%Vanquisher''s Mark of Sanctification%'
  AND wc.name IN ('Druid', 'Mage', 'Rogue')
  AND NOT EXISTS (
    SELECT 1 FROM loot_item_classes lic
    WHERE lic.loot_item_id = li.id
      AND lic.class_id = wc.id
      AND lic.spec_id IS NULL
  );

-- ---------------------------------------------------------------------------
-- 4. Desecrated Legguards (Classic Naxx T3 mail leg) → Hunter, Shaman
-- ---------------------------------------------------------------------------
INSERT INTO loot_item_classes (loot_item_id, class_id, spec_id, spec_type)
SELECT li.id, wc.id, NULL, 'primary'
FROM loot_items li
CROSS JOIN wow_classes wc
WHERE li.item_slot = 'Token'
  AND li.name = 'Desecrated Legguards'
  AND wc.name IN ('Hunter', 'Shaman')
  AND NOT EXISTS (
    SELECT 1 FROM loot_item_classes lic
    WHERE lic.loot_item_id = li.id
      AND lic.class_id = wc.id
      AND lic.spec_id IS NULL
  );

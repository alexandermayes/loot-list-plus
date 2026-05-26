-- Backfill missing MoP loot items into every existing guild's raid tiers.
--
-- The original MoP scraper (scripts/generate-mop-raids.ts) was boss-NPC-indexed
-- and never picked up trash drops or Garrosh bonus-roll-only tokens, so they
-- were absent from data/mop-raids.ts and therefore from every guild's seeded
-- loot tables. Users reported "shared boss loot or trash mob loot not appearing
-- as selectable options" on MoP Classic guilds. PR 1 added these entries to
-- data/mop-raids.ts for new guilds; this migration brings existing guilds
-- forward.
--
-- Items added per raid:
--
--   Heart of Fear / Trash — 10 Mantid trash bracers (Wrist):
--     86183 Shining Cicada Bracers
--     86184 Luminescent Firefly Wristguards
--     86185 Smooth Beetle Wristbands
--     86186 Gleaming Moth Cuffs
--     86187 Pearlescent Butterfly Wristbands
--     86188 Inlaid Cricket Bracers
--     86189 Jagged Hornet Bracers
--     86190 Serrated Wasp Bracers
--     86191 Plated Locust Bracers
--     86192 Darting Damselfly Cuffs
--
--   Throne of Thunder / Trash — 23 items:
--     Feet: 95216..95224 (9 boots)
--     Neck: 95202..95206 (5 Terra-Cotta necklaces)
--     Waist: 95207..95215 (9 Abandoned Zandalari belts)
--
--   Siege of Orgrimmar / Garrosh Hellscream — 6 bonus-roll tier essence tokens:
--     105857 Essence of the Cursed Protector
--     105858 Essence of the Cursed Conqueror
--     105859 Essence of the Cursed Vanquisher
--     105866 Essence of the Cursed Protector (Heroic)
--     105867 Essence of the Cursed Conqueror (Heroic)
--     105868 Essence of the Cursed Vanquisher (Heroic)
--
-- For the 6 Essence tokens, this migration also seeds loot_item_classes rows
-- using the standard "of the Cursed X" mapping from data/token-class-mapping.ts.
-- Non-token items (the 33 trash drops) intentionally get no loot_item_classes
-- rows here — per existing convention, non-token class restrictions are set
-- by the sheet-import admin endpoint, not the seeder/migration.

BEGIN;

-- ---------------------------------------------------------------------------
-- Heart of Fear: 10 Mantid trash bracers
-- ---------------------------------------------------------------------------
WITH new_items(name, boss_name, item_slot, wowhead_id) AS (
  VALUES
    ('Shining Cicada Bracers',         'Trash', 'Wrist', 86183),
    ('Luminescent Firefly Wristguards','Trash', 'Wrist', 86184),
    ('Smooth Beetle Wristbands',       'Trash', 'Wrist', 86185),
    ('Gleaming Moth Cuffs',            'Trash', 'Wrist', 86186),
    ('Pearlescent Butterfly Wristbands','Trash','Wrist', 86187),
    ('Inlaid Cricket Bracers',         'Trash', 'Wrist', 86188),
    ('Jagged Hornet Bracers',          'Trash', 'Wrist', 86189),
    ('Serrated Wasp Bracers',          'Trash', 'Wrist', 86190),
    ('Plated Locust Bracers',          'Trash', 'Wrist', 86191),
    ('Darting Damselfly Cuffs',        'Trash', 'Wrist', 86192)
)
INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
SELECT rt.id, ni.name, ni.boss_name, ni.item_slot, ni.wowhead_id, true
FROM new_items ni
CROSS JOIN raid_tiers rt
INNER JOIN expansions e ON e.id = rt.expansion_id
WHERE e.name = 'Mists of Pandaria'
  AND rt.name = 'Heart of Fear'
  AND NOT EXISTS (
    SELECT 1 FROM loot_items li
    WHERE li.raid_tier_id = rt.id AND li.wowhead_id = ni.wowhead_id
  );

-- ---------------------------------------------------------------------------
-- Throne of Thunder: 23 trash items (9 boots + 5 necklaces + 9 belts)
-- ---------------------------------------------------------------------------
WITH new_items(name, boss_name, item_slot, wowhead_id) AS (
  VALUES
    -- Feet
    ('Vaultwalker Sabatons',     'Trash', 'Feet', 95216),
    ('Locksmasher Greaves',      'Trash', 'Feet', 95217),
    ('Columnbreaker Stompers',   'Trash', 'Feet', 95218),
    ('Spiderweb Tabi',           'Trash', 'Feet', 95219),
    ('Scalehide Spurs',          'Trash', 'Feet', 95220),
    ('Deeproot Treads',          'Trash', 'Feet', 95221),
    ('Spiritbound Boots',        'Trash', 'Feet', 95222),
    ('Silentflame Sandals',      'Trash', 'Feet', 95223),
    ('Home-Warding Slippers',    'Trash', 'Feet', 95224),
    -- Neck (Terra-Cotta archetype necklaces)
    ('Necklace of the Terra-Cotta Archer',    'Trash', 'Neck', 95202),
    ('Necklace of the Terra-Cotta Invoker',   'Trash', 'Neck', 95203),
    ('Necklace of the Terra-Cotta Mender',    'Trash', 'Neck', 95204),
    ('Necklace of the Terra-Cotta Vanquisher','Trash', 'Neck', 95205),
    ('Necklace of the Terra-Cotta Protector', 'Trash', 'Neck', 95206),
    -- Waist (Abandoned Zandalari belts)
    ('Abandoned Zandalari Firecord',     'Trash', 'Waist', 95207),
    ('Abandoned Zandalari Shadowgirdle', 'Trash', 'Waist', 95208),
    ('Abandoned Zandalari Silentbelt',   'Trash', 'Waist', 95209),
    ('Abandoned Zandalari Moonstrap',    'Trash', 'Waist', 95210),
    ('Abandoned Zandalari Arrowlinks',   'Trash', 'Waist', 95211),
    ('Abandoned Zandalari Waterchain',   'Trash', 'Waist', 95212),
    ('Abandoned Zandalari Greatbelt',    'Trash', 'Waist', 95213),
    ('Abandoned Zandalari Goreplate',    'Trash', 'Waist', 95214),
    ('Abandoned Zandalari Bucklebreaker','Trash', 'Waist', 95215)
)
INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
SELECT rt.id, ni.name, ni.boss_name, ni.item_slot, ni.wowhead_id, true
FROM new_items ni
CROSS JOIN raid_tiers rt
INNER JOIN expansions e ON e.id = rt.expansion_id
WHERE e.name = 'Mists of Pandaria'
  AND rt.name = 'Throne of Thunder'
  AND NOT EXISTS (
    SELECT 1 FROM loot_items li
    WHERE li.raid_tier_id = rt.id AND li.wowhead_id = ni.wowhead_id
  );

-- ---------------------------------------------------------------------------
-- Siege of Orgrimmar: 6 Garrosh bonus-roll Essence tokens
-- ---------------------------------------------------------------------------
WITH new_items(name, boss_name, item_slot, wowhead_id) AS (
  VALUES
    ('Essence of the Cursed Protector',           'Garrosh Hellscream', 'Token', 105857),
    ('Essence of the Cursed Conqueror',           'Garrosh Hellscream', 'Token', 105858),
    ('Essence of the Cursed Vanquisher',          'Garrosh Hellscream', 'Token', 105859),
    ('Essence of the Cursed Protector (Heroic)',  'Garrosh Hellscream', 'Token', 105866),
    ('Essence of the Cursed Conqueror (Heroic)',  'Garrosh Hellscream', 'Token', 105867),
    ('Essence of the Cursed Vanquisher (Heroic)', 'Garrosh Hellscream', 'Token', 105868)
)
INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
SELECT rt.id, ni.name, ni.boss_name, ni.item_slot, ni.wowhead_id, true
FROM new_items ni
CROSS JOIN raid_tiers rt
INNER JOIN expansions e ON e.id = rt.expansion_id
WHERE e.name = 'Mists of Pandaria'
  AND rt.name = 'Siege of Orgrimmar'
  AND NOT EXISTS (
    SELECT 1 FROM loot_items li
    WHERE li.raid_tier_id = rt.id AND li.wowhead_id = ni.wowhead_id
  );

-- ---------------------------------------------------------------------------
-- Token class mappings for the 6 Essence tokens.
-- Mapping mirrors data/token-class-mapping.ts entries for "of the Cursed X".
-- Pattern matches both normal and (Heroic) variants via LIKE.
-- ---------------------------------------------------------------------------

-- Essence of the Cursed Conqueror -> Paladin, Priest, Warlock
INSERT INTO loot_item_classes (loot_item_id, class_id, spec_id, spec_type)
SELECT li.id, wc.id, NULL, 'primary'
FROM loot_items li
CROSS JOIN wow_classes wc
WHERE li.item_slot = 'Token'
  AND li.name LIKE 'Essence of the Cursed Conqueror%'
  AND wc.name IN ('Paladin', 'Priest', 'Warlock')
  AND NOT EXISTS (
    SELECT 1 FROM loot_item_classes lic
    WHERE lic.loot_item_id = li.id
      AND lic.class_id = wc.id
      AND lic.spec_id IS NULL
  );

-- Essence of the Cursed Protector -> Hunter, Monk, Shaman, Warrior
INSERT INTO loot_item_classes (loot_item_id, class_id, spec_id, spec_type)
SELECT li.id, wc.id, NULL, 'primary'
FROM loot_items li
CROSS JOIN wow_classes wc
WHERE li.item_slot = 'Token'
  AND li.name LIKE 'Essence of the Cursed Protector%'
  AND wc.name IN ('Hunter', 'Monk', 'Shaman', 'Warrior')
  AND NOT EXISTS (
    SELECT 1 FROM loot_item_classes lic
    WHERE lic.loot_item_id = li.id
      AND lic.class_id = wc.id
      AND lic.spec_id IS NULL
  );

-- Essence of the Cursed Vanquisher -> Death Knight, Druid, Mage, Rogue
INSERT INTO loot_item_classes (loot_item_id, class_id, spec_id, spec_type)
SELECT li.id, wc.id, NULL, 'primary'
FROM loot_items li
CROSS JOIN wow_classes wc
WHERE li.item_slot = 'Token'
  AND li.name LIKE 'Essence of the Cursed Vanquisher%'
  AND wc.name IN ('Death Knight', 'Druid', 'Mage', 'Rogue')
  AND NOT EXISTS (
    SELECT 1 FROM loot_item_classes lic
    WHERE lic.loot_item_id = li.id
      AND lic.class_id = wc.id
      AND lic.spec_id IS NULL
  );

COMMIT;

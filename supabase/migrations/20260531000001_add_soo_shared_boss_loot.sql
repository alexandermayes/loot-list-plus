-- Backfill Siege of Orgrimmar "Shared Boss Loot" into every existing MoP guild.
--
-- The original MoP scraper (scripts/generate-mop-raids.ts) is boss-NPC-indexed:
-- it pulls each boss's drop table by npcId. SoO's "Shared Boss Loot" pool is not
-- attributed to any single boss NPC, so the scraper never captured it and it was
-- absent from data/mop-raids.ts and therefore from every guild's seed.
--
-- GH #65: "shared boss loot is not appearing as selectable options". The earlier
-- fix (#67) paginated the picker and migration 20260525000009 added trash drops
-- and Garrosh essences, but both missed this shared-loot pool entirely.
--
-- Items added (Siege of Orgrimmar / Shared Boss Loot), Normal + Heroic:
--   Cloaks (Back): Aeth's Swiftcinder Cloak, Brave Niunai's Cloak,
--                  Cape of the Alpha, Drape of the Omega, Turtleshell Greatcloak
--   Gloves (Hands), one per armor type:
--     Cloth:   Kalaena's Arcane Handwraps, Seebo's Sainted Touch
--     Leather: Crimson Gauntlets of Death, Siid's Silent Stranglers
--     Mail:    Keengrip Arrowpullers, Marco's Crackling Gloves
--     Plate:   Gauntlets of Discarded Time, Romy's Reliable Grips, Zoid's Molten Gauntlets
--
-- Names/slots/armor types verified against MoP Classic + retail Wowhead and the
-- AtlasLoot MoP shared-loot table (three datamined sources agree). armor_type is
-- set here so the proficiency filter is correct for existing guilds; the cloaks
-- are class-agnostic (Back) and intentionally get NULL. New guilds get the items
-- from data/mop-raids.ts and resolve armor_type via data/item-types.ts.
--
-- LFR (528) and Flexible (540) variants are intentionally excluded: loot_items
-- has no difficulty column, so they would appear as indistinguishable duplicate
-- names in the picker. This mirrors how the rest of SoO is modeled (Normal +
-- Heroic only). The "(Heroic)" suffix is the model's sole difficulty marker.

WITH new_items(name, boss_name, item_slot, wowhead_id, armor_type) AS (
  VALUES
    ('Aeth''s Swiftcinder Cloak',            'Shared Boss Loot', 'Back',  103846, NULL::text),
    ('Aeth''s Swiftcinder Cloak (Heroic)',   'Shared Boss Loot', 'Back',  105852, NULL),
    ('Brave Niunai''s Cloak',                'Shared Boss Loot', 'Back',  103960, NULL),
    ('Brave Niunai''s Cloak (Heroic)',       'Shared Boss Loot', 'Back',  105844, NULL),
    ('Cape of the Alpha',                    'Shared Boss Loot', 'Back',  103935, NULL),
    ('Cape of the Alpha (Heroic)',           'Shared Boss Loot', 'Back',  105840, NULL),
    ('Drape of the Omega',                   'Shared Boss Loot', 'Back',  103770, NULL),
    ('Drape of the Omega (Heroic)',          'Shared Boss Loot', 'Back',  105843, NULL),
    ('Turtleshell Greatcloak',               'Shared Boss Loot', 'Back',  103800, NULL),
    ('Turtleshell Greatcloak (Heroic)',      'Shared Boss Loot', 'Back',  105853, NULL),
    ('Kalaena''s Arcane Handwraps',          'Shared Boss Loot', 'Hands', 103854, 'Cloth'),
    ('Kalaena''s Arcane Handwraps (Heroic)', 'Shared Boss Loot', 'Hands', 105841, 'Cloth'),
    ('Seebo''s Sainted Touch',               'Shared Boss Loot', 'Hands', 103753, 'Cloth'),
    ('Seebo''s Sainted Touch (Heroic)',      'Shared Boss Loot', 'Hands', 105842, 'Cloth'),
    ('Crimson Gauntlets of Death',           'Shared Boss Loot', 'Hands', 103859, 'Leather'),
    ('Crimson Gauntlets of Death (Heroic)',  'Shared Boss Loot', 'Hands', 105846, 'Leather'),
    ('Siid''s Silent Stranglers',            'Shared Boss Loot', 'Hands', 103832, 'Leather'),
    ('Siid''s Silent Stranglers (Heroic)',   'Shared Boss Loot', 'Hands', 105845, 'Leather'),
    ('Keengrip Arrowpullers',                'Shared Boss Loot', 'Hands', 103781, 'Mail'),
    ('Keengrip Arrowpullers (Heroic)',       'Shared Boss Loot', 'Hands', 105847, 'Mail'),
    ('Marco''s Crackling Gloves',            'Shared Boss Loot', 'Hands', 103764, 'Mail'),
    ('Marco''s Crackling Gloves (Heroic)',   'Shared Boss Loot', 'Hands', 105848, 'Mail'),
    ('Gauntlets of Discarded Time',          'Shared Boss Loot', 'Hands', 103791, 'Plate'),
    ('Gauntlets of Discarded Time (Heroic)', 'Shared Boss Loot', 'Hands', 105851, 'Plate'),
    ('Romy''s Reliable Grips',               'Shared Boss Loot', 'Hands', 103818, 'Plate'),
    ('Romy''s Reliable Grips (Heroic)',      'Shared Boss Loot', 'Hands', 105849, 'Plate'),
    ('Zoid''s Molten Gauntlets',             'Shared Boss Loot', 'Hands', 103734, 'Plate'),
    ('Zoid''s Molten Gauntlets (Heroic)',    'Shared Boss Loot', 'Hands', 105850, 'Plate')
)
INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, armor_type, is_available)
SELECT rt.id, ni.name, ni.boss_name, ni.item_slot, ni.wowhead_id, ni.armor_type, true
FROM new_items ni
CROSS JOIN raid_tiers rt
INNER JOIN expansions e ON e.id = rt.expansion_id
WHERE e.name = 'Mists of Pandaria'
  AND rt.name = 'Siege of Orgrimmar'
  AND NOT EXISTS (
    SELECT 1 FROM loot_items li
    WHERE li.raid_tier_id = rt.id AND li.wowhead_id = ni.wowhead_id
  );

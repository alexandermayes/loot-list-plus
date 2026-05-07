-- Backfill missing Tempest Keep items for all TBC guilds.
-- Reported: Mindstorm Wristbands, Thalassian Wildercloak, The Nexus Key missing from master sheet.
-- Mindstorm Wristbands was never included in any previous backfill migration.
-- Rather than patching just the 3, this inserts ALL TK items that are missing for any guild.

DO $$
DECLARE
    v_guild_record RECORD;
    v_raid_tier_id UUID;
    v_inserted INT := 0;
BEGIN
    FOR v_guild_record IN
        SELECT DISTINCT e.guild_id, rt.id AS raid_tier_id
        FROM raid_tiers rt
        INNER JOIN expansions e ON e.id = rt.expansion_id
        WHERE rt.name = 'Tempest Keep: The Eye'
    LOOP
        v_raid_tier_id := v_guild_record.raid_tier_id;

        -- ===================
        -- Al'ar
        -- ===================
        INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
        SELECT v_raid_tier_id, v.name, v.boss_name, v.item_slot, v.wowhead_id, true
        FROM (VALUES
            ('Mindstorm Wristbands',     'Al''ar', 'Wrist',           29918),
            ('Fire Crest Breastplate',   'Al''ar', 'Chest',           29921),
            ('Phoenix-Ring of Rebirth',  'Al''ar', 'Finger',          29920),
            ('Talisman of the Sun King', 'Al''ar', 'Held In Off-hand',29923),
            ('Band of Al''ar',           'Al''ar', 'Finger',          29922),
            ('Phoenix-Wing Cloak',       'Al''ar', 'Back',            29925),
            ('Netherbane',               'Al''ar', 'One-Hand',        29924),
            ('Gloves of the Searing Grip','Al''ar','Hands',           29947),
            ('Claw of the Phoenix',      'Al''ar', 'Off Hand',        29948),
            ('Arcanite Steam-Pistol',    'Al''ar', 'Ranged',          29949),
            ('Tome of Fiery Redemption', 'Al''ar', 'Trinket',         30447),
            ('Talon of Al''ar',          'Al''ar', 'Trinket',         30448),
            ('Talon of the Phoenix',     'Al''ar', 'Main Hand',       32944)
        ) AS v(name, boss_name, item_slot, wowhead_id)
        WHERE NOT EXISTS (
            SELECT 1 FROM loot_items li
            WHERE li.raid_tier_id = v_raid_tier_id AND li.wowhead_id = v.wowhead_id
        );

        GET DIAGNOSTICS v_inserted = ROW_COUNT;
        IF v_inserted > 0 THEN
            RAISE NOTICE 'Guild %: inserted % Al''ar items', v_guild_record.guild_id, v_inserted;
        END IF;

        -- ===================
        -- Void Reaver
        -- ===================
        INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
        SELECT v_raid_tier_id, v.name, v.boss_name, v.item_slot, v.wowhead_id, true
        FROM (VALUES
            ('Fel-Steel Warhelm',          'Void Reaver', 'Head',    29983),
            ('Girdle of Zaetar',           'Void Reaver', 'Waist',   29984),
            ('Void Reaver Greaves',        'Void Reaver', 'Legs',    29985),
            ('Cowl of the Grand Engineer', 'Void Reaver', 'Head',    29986),
            ('Warp-Spring Coil',           'Void Reaver', 'Trinket', 30450),
            ('Fel Reaver''s Piston',       'Void Reaver', 'Trinket', 30619),
            ('Wristguards of Determination','Void Reaver','Wrist',   32515),
            ('Pauldrons of the Vanquished Hero',     'Void Reaver', 'Token', 30250),
            ('Pauldrons of the Vanquished Champion', 'Void Reaver', 'Token', 30248),
            ('Pauldrons of the Vanquished Defender', 'Void Reaver', 'Token', 30249)
        ) AS v(name, boss_name, item_slot, wowhead_id)
        WHERE NOT EXISTS (
            SELECT 1 FROM loot_items li
            WHERE li.raid_tier_id = v_raid_tier_id AND li.wowhead_id = v.wowhead_id
        );

        GET DIAGNOSTICS v_inserted = ROW_COUNT;
        IF v_inserted > 0 THEN
            RAISE NOTICE 'Guild %: inserted % Void Reaver items', v_guild_record.guild_id, v_inserted;
        END IF;

        -- ===================
        -- High Astromancer Solarian
        -- ===================
        INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
        SELECT v_raid_tier_id, v.name, v.boss_name, v.item_slot, v.wowhead_id, true
        FROM (VALUES
            ('Greaves of the Bloodwarder',  'High Astromancer Solarian', 'Legs',          29950),
            ('Star-Strider Boots',          'High Astromancer Solarian', 'Feet',          29951),
            ('Heartrazor',                  'High Astromancer Solarian', 'One-Hand',      29962),
            ('Girdle of the Righteous Path','High Astromancer Solarian', 'Waist',         29965),
            ('Vambraces of Ending',         'High Astromancer Solarian', 'Wrist',         29966),
            ('Trousers of the Astromancer', 'High Astromancer Solarian', 'Legs',          29972),
            ('Worldstorm Gauntlets',        'High Astromancer Solarian', 'Hands',         29976),
            ('Star-Soul Breeches',          'High Astromancer Solarian', 'Legs',          29977),
            ('Ethereum Life-Staff',         'High Astromancer Solarian', 'Two-Hand',      29981),
            ('Wand of the Forgotten Star',  'High Astromancer Solarian', 'Ranged',        29982),
            ('Solarian''s Sapphire',        'High Astromancer Solarian', 'Trinket',       30446),
            ('Void Star Talisman',          'High Astromancer Solarian', 'Trinket',       30449),
            ('Boots of the Resilient',      'High Astromancer Solarian', 'Feet',          32267)
        ) AS v(name, boss_name, item_slot, wowhead_id)
        WHERE NOT EXISTS (
            SELECT 1 FROM loot_items li
            WHERE li.raid_tier_id = v_raid_tier_id AND li.wowhead_id = v.wowhead_id
        );

        GET DIAGNOSTICS v_inserted = ROW_COUNT;
        IF v_inserted > 0 THEN
            RAISE NOTICE 'Guild %: inserted % Solarian items', v_guild_record.guild_id, v_inserted;
        END IF;

        -- ===================
        -- Kael'thas Sunstrider
        -- ===================
        INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
        SELECT v_raid_tier_id, v.name, v.boss_name, v.item_slot, v.wowhead_id, true
        FROM (VALUES
            ('Ashes of Al''ar',              'Kael''thas Sunstrider', 'Mount',     32458),
            ('Sunhawk Leggings',             'Kael''thas Sunstrider', 'Legs',      29991),
            ('Thalassian Wildercloak',       'Kael''thas Sunstrider', 'Back',      29994),
            ('Crown of the Sun',             'Kael''thas Sunstrider', 'Head',      29990),
            ('Gauntlets of the Sun King',    'Kael''thas Sunstrider', 'Hands',     29987),
            ('Royal Cloak of the Sunstriders','Kael''thas Sunstrider','Back',      29992),
            ('Leggings of Murderous Intent', 'Kael''thas Sunstrider', 'Legs',      29995),
            ('Sunshower Light Cloak',        'Kael''thas Sunstrider', 'Back',      29989),
            ('Rod of the Sun King',          'Kael''thas Sunstrider', 'Main Hand', 29996),
            ('The Nexus Key',                'Kael''thas Sunstrider', 'Main Hand', 29988),
            ('Royal Gauntlets of Silvermoon','Kael''thas Sunstrider', 'Hands',     29998),
            ('Twinblade of the Phoenix',     'Kael''thas Sunstrider', 'One-Hand',  29993),
            ('Band of the Ranger-General',   'Kael''thas Sunstrider', 'Finger',    29997),
            ('Verdant Sphere',               'Kael''thas Sunstrider', 'Quest',     32405),
            ('Chestguard of the Vanquished Hero',     'Kael''thas Sunstrider', 'Token', 30238),
            ('Chestguard of the Vanquished Champion', 'Kael''thas Sunstrider', 'Token', 30236),
            ('Chestguard of the Vanquished Defender', 'Kael''thas Sunstrider', 'Token', 30237)
        ) AS v(name, boss_name, item_slot, wowhead_id)
        WHERE NOT EXISTS (
            SELECT 1 FROM loot_items li
            WHERE li.raid_tier_id = v_raid_tier_id AND li.wowhead_id = v.wowhead_id
        );

        GET DIAGNOSTICS v_inserted = ROW_COUNT;
        IF v_inserted > 0 THEN
            RAISE NOTICE 'Guild %: inserted % Kael''thas items', v_guild_record.guild_id, v_inserted;
        END IF;

        -- ===================
        -- Trash
        -- ===================
        INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
        SELECT v_raid_tier_id, v.name, v.boss_name, v.item_slot, v.wowhead_id, true
        FROM (VALUES
            ('Wildfury Greatstaff',          'Trash', 'Two-Hand',  30021),
            ('Seventh Ring of the Tirisfalen','Trash', 'Finger',   30028),
            ('Mantle of the Elven Kings',    'Trash', 'Shoulder',  30024),
            ('Fire-Cord of the Magus',       'Trash', 'Waist',     30020),
            ('Bark-Gloves of Ancient Wisdom','Trash', 'Hands',     30029),
            ('Girdle of Fallen Stars',       'Trash', 'Waist',     30030),
            ('Bands of the Celestial Archer','Trash', 'Wrist',     30026),
            ('Plans: Belt of the Guardian',  'Trash', 'Recipe',    30321),
            ('Plans: Boots of the Protector','Trash', 'Recipe',    30323),
            ('Plans: Red Belt of Battle',    'Trash', 'Recipe',    30322),
            ('Plans: Red Havoc Boots',       'Trash', 'Recipe',    30324),
            ('Pattern: Belt of Deep Shadow', 'Trash', 'Recipe',    30302),
            ('Pattern: Belt of Natural Power','Trash','Recipe',    30301),
            ('Pattern: Belt of the Black Eagle','Trash','Recipe',  30303),
            ('Pattern: Boots of Natural Grace','Trash','Recipe',   30305),
            ('Pattern: Boots of the Crimson Hawk','Trash','Recipe',30307),
            ('Pattern: Boots of Utter Darkness','Trash','Recipe',  30306),
            ('Pattern: Hurricane Boots',     'Trash', 'Recipe',    30308),
            ('Pattern: Monsoon Belt',        'Trash', 'Recipe',    30304),
            ('Pattern: Belt of Blasting',    'Trash', 'Recipe',    30280),
            ('Pattern: Belt of the Long Road','Trash','Recipe',    30281),
            ('Pattern: Boots of Blasting',   'Trash', 'Recipe',    30282),
            ('Pattern: Boots of the Long Road','Trash','Recipe',   30283)
        ) AS v(name, boss_name, item_slot, wowhead_id)
        WHERE NOT EXISTS (
            SELECT 1 FROM loot_items li
            WHERE li.raid_tier_id = v_raid_tier_id AND li.wowhead_id = v.wowhead_id
        );

        GET DIAGNOSTICS v_inserted = ROW_COUNT;
        IF v_inserted > 0 THEN
            RAISE NOTICE 'Guild %: inserted % Trash items', v_guild_record.guild_id, v_inserted;
        END IF;

        -- ===================
        -- Crafting Materials
        -- ===================
        INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
        SELECT v_raid_tier_id, v.name, v.boss_name, v.item_slot, v.wowhead_id, true
        FROM (VALUES
            ('Nether Vortex', 'Crafting Materials', 'Crafting', 30183)
        ) AS v(name, boss_name, item_slot, wowhead_id)
        WHERE NOT EXISTS (
            SELECT 1 FROM loot_items li
            WHERE li.raid_tier_id = v_raid_tier_id AND li.wowhead_id = v.wowhead_id
        );

    END LOOP;

    RAISE NOTICE 'TK backfill complete for all TBC guilds';
END;
$$;

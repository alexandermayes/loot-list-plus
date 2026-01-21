-- =====================================================
-- FIX KARAZHAN LOOT ITEMS
-- =====================================================
-- This migration fixes incorrect Wowhead IDs and adds missing items
-- including tier tokens, recipes, and Servant's Quarters
-- =====================================================

DO $$
DECLARE
    v_raid_tier_id UUID;
    v_guild_record RECORD;
BEGIN
    -- Loop through all guilds that have Karazhan
    FOR v_guild_record IN
        SELECT rt.id as raid_tier_id, g.name as guild_name
        FROM raid_tiers rt
        INNER JOIN expansions e ON e.id = rt.expansion_id
        INNER JOIN guilds g ON g.id = e.guild_id
        WHERE rt.name = 'Karazhan'
    LOOP
        v_raid_tier_id := v_guild_record.raid_tier_id;

        RAISE NOTICE 'Fixing Karazhan items for guild: %', v_guild_record.guild_name;

        -- =====================================================
        -- SERVANT'S QUARTERS - New boss combining 3 rare spawns
        -- =====================================================

        -- Delete any existing Servant's Quarters items (and individual boss names)
        DELETE FROM loot_items
        WHERE raid_tier_id = v_raid_tier_id
        AND boss_name IN ('Servant''s Quarters', 'Hyakiss the Lurker', 'Rokad the Ravager', 'Shadikith the Glider');

        -- Insert all Servant's Quarters items
        INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
        VALUES
            -- Hyakiss the Lurker - Waist items
            (v_raid_tier_id, 'Lurker''s Cord', 'Servant''s Quarters', 'Waist', 30675, true),
            (v_raid_tier_id, 'Lurker''s Grasp', 'Servant''s Quarters', 'Waist', 30676, true),
            (v_raid_tier_id, 'Lurker''s Belt', 'Servant''s Quarters', 'Waist', 30677, true),
            (v_raid_tier_id, 'Lurker''s Girdle', 'Servant''s Quarters', 'Waist', 30678, true),
            -- Rokad the Ravager - Wrist items
            (v_raid_tier_id, 'Ravager''s Cuffs', 'Servant''s Quarters', 'Wrist', 30684, true),
            (v_raid_tier_id, 'Ravager''s Wrist-Wraps', 'Servant''s Quarters', 'Wrist', 30685, true),
            (v_raid_tier_id, 'Ravager''s Bands', 'Servant''s Quarters', 'Wrist', 30686, true),
            (v_raid_tier_id, 'Ravager''s Bracers', 'Servant''s Quarters', 'Wrist', 30687, true),
            -- Shadikith the Glider - Feet items
            (v_raid_tier_id, 'Glider''s Foot-Wraps', 'Servant''s Quarters', 'Feet', 30680, true),
            (v_raid_tier_id, 'Glider''s Boots', 'Servant''s Quarters', 'Feet', 30681, true),
            (v_raid_tier_id, 'Glider''s Sabatons', 'Servant''s Quarters', 'Feet', 30682, true),
            (v_raid_tier_id, 'Glider''s Greaves', 'Servant''s Quarters', 'Feet', 30683, true)
        ON CONFLICT DO NOTHING;

        -- =====================================================
        -- ATTUMEN THE HUNTSMAN - Fix existing and add missing
        -- =====================================================

        DELETE FROM loot_items
        WHERE raid_tier_id = v_raid_tier_id
        AND boss_name = 'Attumen the Huntsman';

        INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
        VALUES
            -- Rings & Amulets
            (v_raid_tier_id, 'Spectral Band of Innervation', 'Attumen the Huntsman', 'Finger', 28510, true),
            (v_raid_tier_id, 'Worgen Claw Necklace', 'Attumen the Huntsman', 'Neck', 28509, true),
            -- Cloth
            (v_raid_tier_id, 'Gloves of Saintly Blessings', 'Attumen the Huntsman', 'Hands', 28508, true),
            (v_raid_tier_id, 'Handwraps of Flowing Thought', 'Attumen the Huntsman', 'Hands', 28507, true),
            (v_raid_tier_id, 'Harbinger Bands', 'Attumen the Huntsman', 'Wrist', 28477, true),
            -- Leather
            (v_raid_tier_id, 'Gloves of Dexterous Manipulation', 'Attumen the Huntsman', 'Hands', 28506, true),
            (v_raid_tier_id, 'Bracers of the White Stag', 'Attumen the Huntsman', 'Wrist', 28453, true),
            -- Mail
            (v_raid_tier_id, 'Whirlwind Bracers', 'Attumen the Huntsman', 'Wrist', 28503, true),
            (v_raid_tier_id, 'Stalker''s War Bands', 'Attumen the Huntsman', 'Wrist', 28454, true),
            -- Plate
            (v_raid_tier_id, 'Gauntlets of Renewed Hope', 'Attumen the Huntsman', 'Hands', 28505, true),
            (v_raid_tier_id, 'Vambraces of Courage', 'Attumen the Huntsman', 'Wrist', 28502, true),
            -- Weapons & Other
            (v_raid_tier_id, 'Steelhawk Crossbow', 'Attumen the Huntsman', 'Ranged', 28504, true),
            (v_raid_tier_id, 'Fiery Warhorse''s Reins', 'Attumen the Huntsman', 'Mount', 30480, true),
            -- Recipe
            (v_raid_tier_id, 'Schematic: Stabilized Eternium Scope', 'Attumen the Huntsman', 'Recipe', 23809, true)
        ON CONFLICT DO NOTHING;

        -- =====================================================
        -- MOROES - Add Mongoose recipe
        -- =====================================================

        INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
        VALUES
            (v_raid_tier_id, 'Formula: Enchant Weapon - Mongoose', 'Moroes', 'Recipe', 22559, true)
        ON CONFLICT DO NOTHING;

        -- =====================================================
        -- THE CURATOR - Add Tier 4 Glove Tokens
        -- =====================================================

        INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
        VALUES
            (v_raid_tier_id, 'Gloves of the Fallen Hero', 'The Curator', 'Token', 29756, true),
            (v_raid_tier_id, 'Gloves of the Fallen Champion', 'The Curator', 'Token', 29757, true),
            (v_raid_tier_id, 'Gloves of the Fallen Defender', 'The Curator', 'Token', 29758, true)
        ON CONFLICT DO NOTHING;

        -- =====================================================
        -- TERESTIAN ILLHOOF - Add Soulfrost recipe
        -- =====================================================

        INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
        VALUES
            (v_raid_tier_id, 'Formula: Enchant Weapon - Soulfrost', 'Terestian Illhoof', 'Recipe', 22561, true)
        ON CONFLICT DO NOTHING;

        -- =====================================================
        -- SHADE OF ARAN - Add Sunfire recipe
        -- =====================================================

        INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
        VALUES
            (v_raid_tier_id, 'Formula: Enchant Weapon - Sunfire', 'Shade of Aran', 'Recipe', 22560, true)
        ON CONFLICT DO NOTHING;

        -- =====================================================
        -- CHESS EVENT - Fix existing and add missing
        -- =====================================================

        DELETE FROM loot_items
        WHERE raid_tier_id = v_raid_tier_id
        AND boss_name IN ('Chess Event', 'Echo of Medivh');

        INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
        VALUES
            -- Rings & Amulets
            (v_raid_tier_id, 'Ring of Recurrence', 'Chess Event', 'Finger', 28753, true),
            (v_raid_tier_id, 'Mithril Chain of Heroism', 'Chess Event', 'Neck', 28745, true),
            -- Cloth
            (v_raid_tier_id, 'Headdress of the High Potentate', 'Chess Event', 'Head', 28756, true),
            -- Leather
            (v_raid_tier_id, 'Bladed Shoulderpads of the Merciless', 'Chess Event', 'Shoulder', 28755, true),
            (v_raid_tier_id, 'Forestlord Striders', 'Chess Event', 'Feet', 28752, true),
            (v_raid_tier_id, 'Girdle of Treachery', 'Chess Event', 'Waist', 28750, true),
            -- Mail
            (v_raid_tier_id, 'Fiend Slayer Boots', 'Chess Event', 'Feet', 28746, true),
            (v_raid_tier_id, 'Heart-Flame Leggings', 'Chess Event', 'Legs', 28751, true),
            -- Plate
            (v_raid_tier_id, 'Legplates of the Innocent', 'Chess Event', 'Legs', 28748, true),
            (v_raid_tier_id, 'Battlescar Boots', 'Chess Event', 'Feet', 28747, true),
            -- Weapons & Shields
            (v_raid_tier_id, 'Triptych Shield of the Ancients', 'Chess Event', 'Off Hand', 28754, true),
            (v_raid_tier_id, 'King''s Defender', 'Chess Event', 'One-Hand', 28749, true)
        ON CONFLICT DO NOTHING;

        -- =====================================================
        -- PRINCE MALCHEZAAR - Add Tier 4 Head Tokens
        -- =====================================================

        INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
        VALUES
            (v_raid_tier_id, 'Helm of the Fallen Hero', 'Prince Malchezaar', 'Token', 29759, true),
            (v_raid_tier_id, 'Helm of the Fallen Champion', 'Prince Malchezaar', 'Token', 29760, true),
            (v_raid_tier_id, 'Helm of the Fallen Defender', 'Prince Malchezaar', 'Token', 29761, true)
        ON CONFLICT DO NOTHING;

        -- =====================================================
        -- REMOVE PRINCE TENRIS (if exists)
        -- =====================================================

        DELETE FROM loot_items
        WHERE raid_tier_id = v_raid_tier_id
        AND boss_name LIKE '%Prince Tenris%';

        RAISE NOTICE 'Completed fixing Karazhan items for guild: %', v_guild_record.guild_name;
    END LOOP;
END $$;

-- Verify the changes
SELECT
    g.name as guild_name,
    li.boss_name,
    COUNT(*) as item_count
FROM loot_items li
INNER JOIN raid_tiers rt ON rt.id = li.raid_tier_id
INNER JOIN expansions e ON e.id = rt.expansion_id
INNER JOIN guilds g ON g.id = e.guild_id
WHERE rt.name = 'Karazhan'
GROUP BY g.name, li.boss_name
ORDER BY g.name, li.boss_name;

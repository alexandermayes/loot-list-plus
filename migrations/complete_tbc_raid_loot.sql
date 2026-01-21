-- =====================================================
-- COMPLETE TBC RAID LOOT UPDATE
-- =====================================================
-- This migration adds all tier tokens, legendaries, and
-- key missing items to all TBC raids
-- =====================================================

DO $$
DECLARE
    v_guild_record RECORD;
    v_raid_tier_id UUID;
BEGIN
    -- Loop through all guilds
    FOR v_guild_record IN
        SELECT g.id as guild_id, g.name as guild_name
        FROM guilds g
    LOOP
        RAISE NOTICE 'Processing guild: %', v_guild_record.guild_name;

        -- =====================================================
        -- GRUUL'S LAIR - Tier 4 Shoulder & Leg Tokens
        -- =====================================================

        SELECT rt.id INTO v_raid_tier_id
        FROM raid_tiers rt
        INNER JOIN expansions e ON e.id = rt.expansion_id
        WHERE e.guild_id = v_guild_record.guild_id
        AND rt.name = 'Gruul''s Lair';

        IF v_raid_tier_id IS NOT NULL THEN
            -- High King Maulgar - T4 Shoulder Tokens
            INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
            VALUES
                (v_raid_tier_id, 'Pauldrons of the Fallen Hero', 'High King Maulgar', 'Token', 29762, true),
                (v_raid_tier_id, 'Pauldrons of the Fallen Champion', 'High King Maulgar', 'Token', 29763, true),
                (v_raid_tier_id, 'Pauldrons of the Fallen Defender', 'High King Maulgar', 'Token', 29764, true)
            ON CONFLICT DO NOTHING;

            -- Gruul - T4 Leg Tokens
            INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
            VALUES
                (v_raid_tier_id, 'Leggings of the Fallen Hero', 'Gruul the Dragonkiller', 'Token', 29765, true),
                (v_raid_tier_id, 'Leggings of the Fallen Champion', 'Gruul the Dragonkiller', 'Token', 29766, true),
                (v_raid_tier_id, 'Leggings of the Fallen Defender', 'Gruul the Dragonkiller', 'Token', 29767, true),
                -- Missing Gruul items
                (v_raid_tier_id, 'Shuriken of Negation', 'Gruul the Dragonkiller', 'Thrown', 28826, true)
            ON CONFLICT DO NOTHING;
        END IF;

        -- =====================================================
        -- MAGTHERIDON'S LAIR - Tier 4 Chest Tokens
        -- =====================================================

        SELECT rt.id INTO v_raid_tier_id
        FROM raid_tiers rt
        INNER JOIN expansions e ON e.id = rt.expansion_id
        WHERE e.guild_id = v_guild_record.guild_id
        AND rt.name = 'Magtheridon''s Lair';

        IF v_raid_tier_id IS NOT NULL THEN
            INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
            VALUES
                (v_raid_tier_id, 'Chestguard of the Fallen Hero', 'Magtheridon', 'Token', 29755, true),
                (v_raid_tier_id, 'Chestguard of the Fallen Champion', 'Magtheridon', 'Token', 29754, true),
                (v_raid_tier_id, 'Chestguard of the Fallen Defender', 'Magtheridon', 'Token', 29753, true),
                -- Pit Lord's Satchel (bag)
                (v_raid_tier_id, 'Pit Lord''s Satchel', 'Magtheridon', 'Bag', 34845, true)
            ON CONFLICT DO NOTHING;
        END IF;

        -- =====================================================
        -- SERPENTSHRINE CAVERN - Tier 5 Tokens
        -- =====================================================

        SELECT rt.id INTO v_raid_tier_id
        FROM raid_tiers rt
        INNER JOIN expansions e ON e.id = rt.expansion_id
        WHERE e.guild_id = v_guild_record.guild_id
        AND rt.name = 'Serpentshrine Cavern';

        IF v_raid_tier_id IS NOT NULL THEN
            -- Leotheras - T5 Glove Tokens
            INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
            VALUES
                (v_raid_tier_id, 'Gloves of the Vanquished Hero', 'Leotheras the Blind', 'Token', 30241, true),
                (v_raid_tier_id, 'Gloves of the Vanquished Champion', 'Leotheras the Blind', 'Token', 30239, true),
                (v_raid_tier_id, 'Gloves of the Vanquished Defender', 'Leotheras the Blind', 'Token', 30240, true)
            ON CONFLICT DO NOTHING;

            -- Karathress - T5 Leg Tokens
            INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
            VALUES
                (v_raid_tier_id, 'Leggings of the Vanquished Hero', 'Fathom-Lord Karathress', 'Token', 30247, true),
                (v_raid_tier_id, 'Leggings of the Vanquished Champion', 'Fathom-Lord Karathress', 'Token', 30245, true),
                (v_raid_tier_id, 'Leggings of the Vanquished Defender', 'Fathom-Lord Karathress', 'Token', 30246, true)
            ON CONFLICT DO NOTHING;

            -- Lady Vashj - T5 Helm Tokens + Quest Item
            INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
            VALUES
                (v_raid_tier_id, 'Helm of the Vanquished Hero', 'Lady Vashj', 'Token', 30244, true),
                (v_raid_tier_id, 'Helm of the Vanquished Champion', 'Lady Vashj', 'Token', 30242, true),
                (v_raid_tier_id, 'Helm of the Vanquished Defender', 'Lady Vashj', 'Token', 30243, true),
                (v_raid_tier_id, 'Vashj''s Vial Remnant', 'Lady Vashj', 'Quest', 31544, true)
            ON CONFLICT DO NOTHING;
        END IF;

        -- =====================================================
        -- TEMPEST KEEP: THE EYE - Tier 5 Tokens + Legendaries
        -- =====================================================

        SELECT rt.id INTO v_raid_tier_id
        FROM raid_tiers rt
        INNER JOIN expansions e ON e.id = rt.expansion_id
        WHERE e.guild_id = v_guild_record.guild_id
        AND rt.name IN ('Tempest Keep', 'Tempest Keep: The Eye', 'The Eye');

        IF v_raid_tier_id IS NOT NULL THEN
            -- Void Reaver - T5 Shoulder Tokens
            INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
            VALUES
                (v_raid_tier_id, 'Pauldrons of the Vanquished Hero', 'Void Reaver', 'Token', 30250, true),
                (v_raid_tier_id, 'Pauldrons of the Vanquished Champion', 'Void Reaver', 'Token', 30248, true),
                (v_raid_tier_id, 'Pauldrons of the Vanquished Defender', 'Void Reaver', 'Token', 30249, true)
            ON CONFLICT DO NOTHING;

            -- Kael'thas - T5 Chest Tokens + Ashes of Al'ar + Quest Items
            INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
            VALUES
                (v_raid_tier_id, 'Chestguard of the Vanquished Hero', 'Kael''thas Sunstrider', 'Token', 30238, true),
                (v_raid_tier_id, 'Chestguard of the Vanquished Champion', 'Kael''thas Sunstrider', 'Token', 30236, true),
                (v_raid_tier_id, 'Chestguard of the Vanquished Defender', 'Kael''thas Sunstrider', 'Token', 30237, true),
                -- Legendary Mount
                (v_raid_tier_id, 'Ashes of Al''ar', 'Kael''thas Sunstrider', 'Mount', 32458, true),
                -- Quest Items
                (v_raid_tier_id, 'Verdant Sphere', 'Kael''thas Sunstrider', 'Quest', 32405, true),
                (v_raid_tier_id, 'Kael''s Vial Remnant', 'Kael''thas Sunstrider', 'Quest', 29905, true)
            ON CONFLICT DO NOTHING;
        END IF;

        -- =====================================================
        -- HYJAL SUMMIT - Tier 6 Tokens
        -- =====================================================

        SELECT rt.id INTO v_raid_tier_id
        FROM raid_tiers rt
        INNER JOIN expansions e ON e.id = rt.expansion_id
        WHERE e.guild_id = v_guild_record.guild_id
        AND rt.name IN ('Hyjal Summit', 'Mount Hyjal', 'Hyjal');

        IF v_raid_tier_id IS NOT NULL THEN
            -- Azgalor - T6 Glove Tokens
            INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
            VALUES
                (v_raid_tier_id, 'Gloves of the Forgotten Conqueror', 'Azgalor', 'Token', 31092, true),
                (v_raid_tier_id, 'Gloves of the Forgotten Vanquisher', 'Azgalor', 'Token', 31093, true),
                (v_raid_tier_id, 'Gloves of the Forgotten Protector', 'Azgalor', 'Token', 31094, true)
            ON CONFLICT DO NOTHING;

            -- Archimonde - T6 Helm Tokens
            INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
            VALUES
                (v_raid_tier_id, 'Helm of the Forgotten Conqueror', 'Archimonde', 'Token', 31097, true),
                (v_raid_tier_id, 'Helm of the Forgotten Protector', 'Archimonde', 'Token', 31095, true),
                (v_raid_tier_id, 'Helm of the Forgotten Vanquisher', 'Archimonde', 'Token', 31096, true)
            ON CONFLICT DO NOTHING;
        END IF;

        -- =====================================================
        -- BLACK TEMPLE - Tier 6 Tokens + Warglaives
        -- =====================================================

        SELECT rt.id INTO v_raid_tier_id
        FROM raid_tiers rt
        INNER JOIN expansions e ON e.id = rt.expansion_id
        WHERE e.guild_id = v_guild_record.guild_id
        AND rt.name = 'Black Temple';

        IF v_raid_tier_id IS NOT NULL THEN
            -- Mother Shahraz - T6 Shoulder Tokens
            INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
            VALUES
                (v_raid_tier_id, 'Shoulders of the Forgotten Conqueror', 'Mother Shahraz', 'Token', 31101, true),
                (v_raid_tier_id, 'Shoulders of the Forgotten Vanquisher', 'Mother Shahraz', 'Token', 31102, true),
                (v_raid_tier_id, 'Shoulders of the Forgotten Protector', 'Mother Shahraz', 'Token', 31103, true)
            ON CONFLICT DO NOTHING;

            -- Illidari Council - T6 Leg Tokens
            INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
            VALUES
                (v_raid_tier_id, 'Leggings of the Forgotten Conqueror', 'The Illidari Council', 'Token', 31098, true),
                (v_raid_tier_id, 'Leggings of the Forgotten Vanquisher', 'The Illidari Council', 'Token', 31099, true),
                (v_raid_tier_id, 'Leggings of the Forgotten Protector', 'The Illidari Council', 'Token', 31100, true)
            ON CONFLICT DO NOTHING;

            -- Illidan - T6 Chest Tokens + Warglaives
            INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
            VALUES
                (v_raid_tier_id, 'Chestguard of the Forgotten Conqueror', 'Illidan Stormrage', 'Token', 31089, true),
                (v_raid_tier_id, 'Chestguard of the Forgotten Vanquisher', 'Illidan Stormrage', 'Token', 31090, true),
                (v_raid_tier_id, 'Chestguard of the Forgotten Protector', 'Illidan Stormrage', 'Token', 31091, true),
                -- Warglaives of Azzinoth (Legendary)
                (v_raid_tier_id, 'Warglaive of Azzinoth (Main Hand)', 'Illidan Stormrage', 'Main Hand', 32837, true),
                (v_raid_tier_id, 'Warglaive of Azzinoth (Off Hand)', 'Illidan Stormrage', 'Off Hand', 32838, true)
            ON CONFLICT DO NOTHING;
        END IF;

        -- =====================================================
        -- ZUL'AMAN - Timed Event Items + Bear Mount
        -- =====================================================

        SELECT rt.id INTO v_raid_tier_id
        FROM raid_tiers rt
        INNER JOIN expansions e ON e.id = rt.expansion_id
        WHERE e.guild_id = v_guild_record.guild_id
        AND rt.name = 'Zul''Aman';

        IF v_raid_tier_id IS NOT NULL THEN
            -- Akil'zon Recipe
            INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
            VALUES
                (v_raid_tier_id, 'Formula: Enchant Weapon - Executioner', 'Akil''zon', 'Recipe', 33307, true)
            ON CONFLICT DO NOTHING;

            -- Timed Event Rewards (from hostage chests)
            INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
            VALUES
                -- Bear Mount
                (v_raid_tier_id, 'Amani War Bear', 'Timed Event', 'Mount', 33809, true),
                -- First Chest
                (v_raid_tier_id, 'Cloak of Fiends', 'Timed Event', 'Back', 33590, true),
                (v_raid_tier_id, 'Shadowcaster''s Drape', 'Timed Event', 'Back', 33591, true),
                (v_raid_tier_id, 'Mantle of Ill Intent', 'Timed Event', 'Shoulder', 33489, true),
                (v_raid_tier_id, 'Cord of Braided Troll Hair', 'Timed Event', 'Waist', 33480, true),
                (v_raid_tier_id, 'Elunite Imbued Leggings', 'Timed Event', 'Legs', 33971, true),
                (v_raid_tier_id, 'Life-Step Belt', 'Timed Event', 'Waist', 33483, true),
                (v_raid_tier_id, 'Shadowhunter''s Treads', 'Timed Event', 'Feet', 33805, true),
                (v_raid_tier_id, 'Pauldrons of Stone Resolve', 'Timed Event', 'Shoulder', 33481, true),
                -- Second Chest
                (v_raid_tier_id, 'Umbral Shiv', 'Timed Event', 'One-Hand', 33493, true),
                (v_raid_tier_id, 'Rage', 'Timed Event', 'Off Hand', 33495, true),
                (v_raid_tier_id, 'Tuskbreaker', 'Timed Event', 'Ranged', 33491, true),
                (v_raid_tier_id, 'Trollbane', 'Timed Event', 'Two-Hand', 33492, true),
                (v_raid_tier_id, 'Amani Divining Staff', 'Timed Event', 'Two-Hand', 33494, true),
                (v_raid_tier_id, 'Staff of Dark Mending', 'Timed Event', 'Two-Hand', 33490, true),
                -- Ring Chests
                (v_raid_tier_id, 'Mana Attuned Band', 'Timed Event', 'Finger', 33497, true),
                (v_raid_tier_id, 'Signet of Eternal Life', 'Timed Event', 'Finger', 33500, true),
                (v_raid_tier_id, 'Signet of Primal Wrath', 'Timed Event', 'Finger', 33496, true),
                (v_raid_tier_id, 'Signet of the Last Defender', 'Timed Event', 'Finger', 33499, true),
                (v_raid_tier_id, 'Signet of the Quiet Forest', 'Timed Event', 'Finger', 33498, true)
            ON CONFLICT DO NOTHING;
        END IF;

        -- =====================================================
        -- SUNWELL PLATEAU - Tier 6 Tokens + Thori'dal
        -- =====================================================

        SELECT rt.id INTO v_raid_tier_id
        FROM raid_tiers rt
        INNER JOIN expansions e ON e.id = rt.expansion_id
        WHERE e.guild_id = v_guild_record.guild_id
        AND rt.name = 'Sunwell Plateau';

        IF v_raid_tier_id IS NOT NULL THEN
            -- Kalecgos - T6 Wrist Tokens
            INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
            VALUES
                (v_raid_tier_id, 'Bracers of the Forgotten Conqueror', 'Kalecgos', 'Token', 34848, true),
                (v_raid_tier_id, 'Bracers of the Forgotten Protector', 'Kalecgos', 'Token', 34851, true),
                (v_raid_tier_id, 'Bracers of the Forgotten Vanquisher', 'Kalecgos', 'Token', 34852, true)
            ON CONFLICT DO NOTHING;

            -- Brutallus - T6 Belt Tokens
            INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
            VALUES
                (v_raid_tier_id, 'Belt of the Forgotten Conqueror', 'Brutallus', 'Token', 34853, true),
                (v_raid_tier_id, 'Belt of the Forgotten Protector', 'Brutallus', 'Token', 34854, true),
                (v_raid_tier_id, 'Belt of the Forgotten Vanquisher', 'Brutallus', 'Token', 34855, true)
            ON CONFLICT DO NOTHING;

            -- Felmyst - T6 Boot Tokens
            INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
            VALUES
                (v_raid_tier_id, 'Boots of the Forgotten Conqueror', 'Felmyst', 'Token', 34856, true),
                (v_raid_tier_id, 'Boots of the Forgotten Protector', 'Felmyst', 'Token', 34857, true),
                (v_raid_tier_id, 'Boots of the Forgotten Vanquisher', 'Felmyst', 'Token', 34858, true)
            ON CONFLICT DO NOTHING;

            -- M'uru - Trinkets
            INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
            VALUES
                (v_raid_tier_id, 'Blackened Naaru Sliver', 'M''uru', 'Trinket', 34427, true),
                (v_raid_tier_id, 'Steely Naaru Sliver', 'M''uru', 'Trinket', 34428, true),
                (v_raid_tier_id, 'Shifting Naaru Sliver', 'M''uru', 'Trinket', 34429, true),
                (v_raid_tier_id, 'Glimmering Naaru Sliver', 'M''uru', 'Trinket', 34430, true)
            ON CONFLICT DO NOTHING;

            -- Kil'jaeden - Thori'dal Legendary
            INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
            VALUES
                (v_raid_tier_id, 'Thori''dal, the Stars'' Fury', 'Kil''jaeden', 'Ranged', 34334, true)
            ON CONFLICT DO NOTHING;
        END IF;

        RAISE NOTICE 'Completed processing guild: %', v_guild_record.guild_name;
    END LOOP;
END $$;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Show tier token counts by raid
SELECT
    rt.name as raid_name,
    COUNT(*) FILTER (WHERE li.item_slot = 'Token') as tier_tokens,
    COUNT(*) FILTER (WHERE li.item_slot IN ('Mount', 'Main Hand', 'Off Hand', 'Ranged') AND li.wowhead_id IN (32458, 32837, 32838, 34334, 33809)) as legendaries_mounts,
    COUNT(*) as total_items
FROM loot_items li
INNER JOIN raid_tiers rt ON rt.id = li.raid_tier_id
INNER JOIN expansions e ON e.id = rt.expansion_id
WHERE e.name = 'The Burning Crusade'
GROUP BY rt.name
ORDER BY rt.name;

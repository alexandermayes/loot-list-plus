-- =====================================================
-- BACKFILL MISSING TBC ITEMS
-- =====================================================
-- Adds 10 items that were in the one-off migration script
-- but missing from the seed data. This backfills them for
-- all existing guilds. New guilds get them from tbc-raids.ts.
-- =====================================================

DO $$
DECLARE
    v_guild_record RECORD;
    v_raid_tier_id UUID;
BEGIN
    FOR v_guild_record IN
        SELECT g.id as guild_id, g.name as guild_name
        FROM guilds g
    LOOP
        RAISE NOTICE 'Processing guild: %', v_guild_record.guild_name;

        -- =====================================================
        -- GRUUL'S LAIR
        -- =====================================================

        SELECT rt.id INTO v_raid_tier_id
        FROM raid_tiers rt
        INNER JOIN expansions e ON e.id = rt.expansion_id
        WHERE e.guild_id = v_guild_record.guild_id
        AND rt.name = 'Gruul''s Lair';

        IF v_raid_tier_id IS NOT NULL THEN
            INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
            SELECT v_raid_tier_id, 'Shuriken of Negation', 'Gruul the Dragonkiller', 'Thrown', 28826, true
            WHERE NOT EXISTS (
                SELECT 1 FROM loot_items
                WHERE raid_tier_id = v_raid_tier_id AND name = 'Shuriken of Negation'
            );
        END IF;

        -- =====================================================
        -- SERPENTSHRINE CAVERN
        -- =====================================================

        SELECT rt.id INTO v_raid_tier_id
        FROM raid_tiers rt
        INNER JOIN expansions e ON e.id = rt.expansion_id
        WHERE e.guild_id = v_guild_record.guild_id
        AND rt.name = 'Serpentshrine Cavern';

        IF v_raid_tier_id IS NOT NULL THEN
            -- Hydross the Unstable
            INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
            SELECT v_raid_tier_id, 'Pendant of the Perilous', 'Hydross the Unstable', 'Neck', 30022, true
            WHERE NOT EXISTS (
                SELECT 1 FROM loot_items
                WHERE raid_tier_id = v_raid_tier_id AND name = 'Pendant of the Perilous'
            );

            INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
            SELECT v_raid_tier_id, 'Totem of the Maelstrom', 'Hydross the Unstable', 'Relic', 30023, true
            WHERE NOT EXISTS (
                SELECT 1 FROM loot_items
                WHERE raid_tier_id = v_raid_tier_id AND name = 'Totem of the Maelstrom'
            );

            INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
            SELECT v_raid_tier_id, 'Serpentshrine Shuriken', 'Hydross the Unstable', 'Thrown', 30029, true
            WHERE NOT EXISTS (
                SELECT 1 FROM loot_items
                WHERE raid_tier_id = v_raid_tier_id AND name = 'Serpentshrine Shuriken'
            );

            -- The Lurker Below
            INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
            SELECT v_raid_tier_id, 'Boots of Courage Unending', 'The Lurker Below', 'Feet', 30098, true
            WHERE NOT EXISTS (
                SELECT 1 FROM loot_items
                WHERE raid_tier_id = v_raid_tier_id AND name = 'Boots of Courage Unending'
            );

            INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
            SELECT v_raid_tier_id, 'Spyglass of the Hidden Fleet', 'The Lurker Below', 'Trinket', 30001, true
            WHERE NOT EXISTS (
                SELECT 1 FROM loot_items
                WHERE raid_tier_id = v_raid_tier_id AND name = 'Spyglass of the Hidden Fleet'
            );

            -- Leotheras the Blind
            INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
            SELECT v_raid_tier_id, 'Wildfury Greatstaff', 'Leotheras the Blind', 'Two-Hand', 30883, true
            WHERE NOT EXISTS (
                SELECT 1 FROM loot_items
                WHERE raid_tier_id = v_raid_tier_id AND name = 'Wildfury Greatstaff'
            );
        END IF;

        -- =====================================================
        -- TEMPEST KEEP
        -- =====================================================

        SELECT rt.id INTO v_raid_tier_id
        FROM raid_tiers rt
        INNER JOIN expansions e ON e.id = rt.expansion_id
        WHERE e.guild_id = v_guild_record.guild_id
        AND rt.name = 'Tempest Keep';

        IF v_raid_tier_id IS NOT NULL THEN
            -- High Astromancer Solarian
            INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
            SELECT v_raid_tier_id, 'Sunhawk Leggings', 'High Astromancer Solarian', 'Legs', 30134, true
            WHERE NOT EXISTS (
                SELECT 1 FROM loot_items
                WHERE raid_tier_id = v_raid_tier_id AND name = 'Sunhawk Leggings'
            );

            INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
            SELECT v_raid_tier_id, 'Thalassian Wildercloak', 'High Astromancer Solarian', 'Back', 30135, true
            WHERE NOT EXISTS (
                SELECT 1 FROM loot_items
                WHERE raid_tier_id = v_raid_tier_id AND name = 'Thalassian Wildercloak'
            );

            -- Kael'thas Sunstrider
            INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
            SELECT v_raid_tier_id, 'The Nexus Key', 'Kael''thas Sunstrider', 'Main Hand', 30095, true
            WHERE NOT EXISTS (
                SELECT 1 FROM loot_items
                WHERE raid_tier_id = v_raid_tier_id AND name = 'The Nexus Key'
            );

            INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
            SELECT v_raid_tier_id, 'Royal Gauntlets of Silvermoon', 'Kael''thas Sunstrider', 'Hands', 30106, true
            WHERE NOT EXISTS (
                SELECT 1 FROM loot_items
                WHERE raid_tier_id = v_raid_tier_id AND name = 'Royal Gauntlets of Silvermoon'
            );
        END IF;

    END LOOP;

    RAISE NOTICE 'Backfill complete for all guilds';
END;
$$;

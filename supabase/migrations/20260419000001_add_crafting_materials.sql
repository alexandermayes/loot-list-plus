-- =====================================================
-- ADD CRAFTING MATERIALS TO RAID LOOT TABLES
-- =====================================================
-- Adds BoP crafting materials that drop from raid bosses
-- to the loot tables for all existing guilds. New guilds
-- get them from the updated seed data files.
--
-- Items added:
--   TBC: Nether Vortex (SSC, TK), Heart of Darkness (Hyjal, BT), Sunmote (SWP)
--   WotLK: Runed Orb (Ulduar), Crusader Orb (ToC), Primordial Saronite (ICC)
--   Cata: Living Ember (Firelands), Essence of Destruction (Dragon Soul)
--   MoP: Haunting Spirit (Throne of Thunder), Spirit of War (Siege of Orgrimmar)
-- =====================================================

DO $$
DECLARE
    v_guild RECORD;
    v_tier_id UUID;
BEGIN
    FOR v_guild IN SELECT g.id AS guild_id FROM guilds g
    LOOP
        -- =====================================================
        -- TBC: Nether Vortex → SSC + TK
        -- =====================================================

        SELECT rt.id INTO v_tier_id
        FROM raid_tiers rt
        INNER JOIN expansions e ON e.id = rt.expansion_id
        WHERE e.guild_id = v_guild.guild_id AND rt.name = 'Serpentshrine Cavern';

        IF v_tier_id IS NOT NULL THEN
            INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
            SELECT v_tier_id, 'Nether Vortex', 'Crafting Materials', 'Crafting', 30183, true
            WHERE NOT EXISTS (
                SELECT 1 FROM loot_items WHERE raid_tier_id = v_tier_id AND wowhead_id = 30183
            );
        END IF;

        SELECT rt.id INTO v_tier_id
        FROM raid_tiers rt
        INNER JOIN expansions e ON e.id = rt.expansion_id
        WHERE e.guild_id = v_guild.guild_id AND rt.name = 'Tempest Keep: The Eye';

        IF v_tier_id IS NOT NULL THEN
            INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
            SELECT v_tier_id, 'Nether Vortex', 'Crafting Materials', 'Crafting', 30183, true
            WHERE NOT EXISTS (
                SELECT 1 FROM loot_items WHERE raid_tier_id = v_tier_id AND wowhead_id = 30183
            );
        END IF;

        -- =====================================================
        -- TBC: Heart of Darkness → Hyjal + BT
        -- =====================================================

        SELECT rt.id INTO v_tier_id
        FROM raid_tiers rt
        INNER JOIN expansions e ON e.id = rt.expansion_id
        WHERE e.guild_id = v_guild.guild_id AND rt.name = 'Hyjal Summit';

        IF v_tier_id IS NOT NULL THEN
            INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
            SELECT v_tier_id, 'Heart of Darkness', 'Crafting Materials', 'Crafting', 32428, true
            WHERE NOT EXISTS (
                SELECT 1 FROM loot_items WHERE raid_tier_id = v_tier_id AND wowhead_id = 32428
            );
        END IF;

        SELECT rt.id INTO v_tier_id
        FROM raid_tiers rt
        INNER JOIN expansions e ON e.id = rt.expansion_id
        WHERE e.guild_id = v_guild.guild_id AND rt.name = 'Black Temple';

        IF v_tier_id IS NOT NULL THEN
            INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
            SELECT v_tier_id, 'Heart of Darkness', 'Crafting Materials', 'Crafting', 32428, true
            WHERE NOT EXISTS (
                SELECT 1 FROM loot_items WHERE raid_tier_id = v_tier_id AND wowhead_id = 32428
            );
        END IF;

        -- =====================================================
        -- TBC: Sunmote → Sunwell Plateau
        -- =====================================================

        SELECT rt.id INTO v_tier_id
        FROM raid_tiers rt
        INNER JOIN expansions e ON e.id = rt.expansion_id
        WHERE e.guild_id = v_guild.guild_id AND rt.name = 'Sunwell Plateau';

        IF v_tier_id IS NOT NULL THEN
            INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
            SELECT v_tier_id, 'Sunmote', 'Crafting Materials', 'Crafting', 34664, true
            WHERE NOT EXISTS (
                SELECT 1 FROM loot_items WHERE raid_tier_id = v_tier_id AND wowhead_id = 34664
            );
        END IF;

        -- =====================================================
        -- WotLK: Runed Orb → Ulduar
        -- =====================================================

        SELECT rt.id INTO v_tier_id
        FROM raid_tiers rt
        INNER JOIN expansions e ON e.id = rt.expansion_id
        WHERE e.guild_id = v_guild.guild_id AND rt.name = 'Ulduar';

        IF v_tier_id IS NOT NULL THEN
            INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
            SELECT v_tier_id, 'Runed Orb', 'Crafting Materials', 'Crafting', 45087, true
            WHERE NOT EXISTS (
                SELECT 1 FROM loot_items WHERE raid_tier_id = v_tier_id AND wowhead_id = 45087
            );
        END IF;

        -- =====================================================
        -- WotLK: Crusader Orb → ToC
        -- =====================================================

        SELECT rt.id INTO v_tier_id
        FROM raid_tiers rt
        INNER JOIN expansions e ON e.id = rt.expansion_id
        WHERE e.guild_id = v_guild.guild_id AND rt.name = 'Trial of the Crusader';

        IF v_tier_id IS NOT NULL THEN
            INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
            SELECT v_tier_id, 'Crusader Orb', 'Crafting Materials', 'Crafting', 47556, true
            WHERE NOT EXISTS (
                SELECT 1 FROM loot_items WHERE raid_tier_id = v_tier_id AND wowhead_id = 47556
            );
        END IF;

        -- =====================================================
        -- WotLK: Primordial Saronite → ICC
        -- =====================================================

        SELECT rt.id INTO v_tier_id
        FROM raid_tiers rt
        INNER JOIN expansions e ON e.id = rt.expansion_id
        WHERE e.guild_id = v_guild.guild_id AND rt.name = 'Icecrown Citadel';

        IF v_tier_id IS NOT NULL THEN
            INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
            SELECT v_tier_id, 'Primordial Saronite', 'Crafting Materials', 'Crafting', 49908, true
            WHERE NOT EXISTS (
                SELECT 1 FROM loot_items WHERE raid_tier_id = v_tier_id AND wowhead_id = 49908
            );
        END IF;

        -- =====================================================
        -- Cata: Living Ember → Firelands
        -- =====================================================

        SELECT rt.id INTO v_tier_id
        FROM raid_tiers rt
        INNER JOIN expansions e ON e.id = rt.expansion_id
        WHERE e.guild_id = v_guild.guild_id AND rt.name = 'Firelands';

        IF v_tier_id IS NOT NULL THEN
            INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
            SELECT v_tier_id, 'Living Ember', 'Crafting Materials', 'Crafting', 69237, true
            WHERE NOT EXISTS (
                SELECT 1 FROM loot_items WHERE raid_tier_id = v_tier_id AND wowhead_id = 69237
            );
        END IF;

        -- =====================================================
        -- Cata: Essence of Destruction → Dragon Soul
        -- =====================================================

        SELECT rt.id INTO v_tier_id
        FROM raid_tiers rt
        INNER JOIN expansions e ON e.id = rt.expansion_id
        WHERE e.guild_id = v_guild.guild_id AND rt.name = 'Dragon Soul';

        IF v_tier_id IS NOT NULL THEN
            INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
            SELECT v_tier_id, 'Essence of Destruction', 'Crafting Materials', 'Crafting', 71998, true
            WHERE NOT EXISTS (
                SELECT 1 FROM loot_items WHERE raid_tier_id = v_tier_id AND wowhead_id = 71998
            );
        END IF;

        -- =====================================================
        -- MoP: Haunting Spirit → Throne of Thunder
        -- =====================================================

        SELECT rt.id INTO v_tier_id
        FROM raid_tiers rt
        INNER JOIN expansions e ON e.id = rt.expansion_id
        WHERE e.guild_id = v_guild.guild_id AND rt.name = 'Throne of Thunder';

        IF v_tier_id IS NOT NULL THEN
            INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
            SELECT v_tier_id, 'Haunting Spirit', 'Crafting Materials', 'Crafting', 94289, true
            WHERE NOT EXISTS (
                SELECT 1 FROM loot_items WHERE raid_tier_id = v_tier_id AND wowhead_id = 94289
            );
        END IF;

        -- =====================================================
        -- MoP: Spirit of War → Siege of Orgrimmar
        -- =====================================================

        SELECT rt.id INTO v_tier_id
        FROM raid_tiers rt
        INNER JOIN expansions e ON e.id = rt.expansion_id
        WHERE e.guild_id = v_guild.guild_id AND rt.name = 'Siege of Orgrimmar';

        IF v_tier_id IS NOT NULL THEN
            INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
            SELECT v_tier_id, 'Spirit of War', 'Crafting Materials', 'Crafting', 98717, true
            WHERE NOT EXISTS (
                SELECT 1 FROM loot_items WHERE raid_tier_id = v_tier_id AND wowhead_id = 98717
            );
        END IF;

    END LOOP;
END $$;

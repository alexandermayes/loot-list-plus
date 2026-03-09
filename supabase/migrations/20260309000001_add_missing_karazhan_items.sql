-- =====================================================
-- ADD MISSING KARAZHAN ITEMS
-- =====================================================
-- Adds 19 missing items to Karazhan for all existing guilds:
-- - 6 Opera Event shared drops
-- - 1 Terestian Illhoof drop (Xavian Stiletto)
-- - 12 Karazhan trash drops
-- New guilds get them from tbc-raids.ts.
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

        SELECT rt.id INTO v_raid_tier_id
        FROM raid_tiers rt
        INNER JOIN expansions e ON e.id = rt.expansion_id
        WHERE e.guild_id = v_guild_record.guild_id
        AND rt.name = 'Karazhan';

        IF v_raid_tier_id IS NOT NULL THEN

            -- =====================================================
            -- OPERA EVENT - Shared drops (all variants)
            -- =====================================================

            INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
            SELECT v_raid_tier_id, 'Ribbon of Sacrifice', 'Opera Event', 'Trinket', 28590, true
            WHERE NOT EXISTS (
                SELECT 1 FROM loot_items
                WHERE raid_tier_id = v_raid_tier_id AND wowhead_id = 28590
            );

            INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
            SELECT v_raid_tier_id, 'Trial-Fire Trousers', 'Opera Event', 'Legs', 28594, true
            WHERE NOT EXISTS (
                SELECT 1 FROM loot_items
                WHERE raid_tier_id = v_raid_tier_id AND wowhead_id = 28594
            );

            INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
            SELECT v_raid_tier_id, 'Earthsoul Leggings', 'Opera Event', 'Legs', 28591, true
            WHERE NOT EXISTS (
                SELECT 1 FROM loot_items
                WHERE raid_tier_id = v_raid_tier_id AND wowhead_id = 28591
            );

            INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
            SELECT v_raid_tier_id, 'Beastmaw Pauldrons', 'Opera Event', 'Shoulder', 28589, true
            WHERE NOT EXISTS (
                SELECT 1 FROM loot_items
                WHERE raid_tier_id = v_raid_tier_id AND wowhead_id = 28589
            );

            INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
            SELECT v_raid_tier_id, 'Eternium Greathelm', 'Opera Event', 'Head', 28593, true
            WHERE NOT EXISTS (
                SELECT 1 FROM loot_items
                WHERE raid_tier_id = v_raid_tier_id AND wowhead_id = 28593
            );

            INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
            SELECT v_raid_tier_id, 'Libram of Souls Redeemed', 'Opera Event', 'Relic', 28592, true
            WHERE NOT EXISTS (
                SELECT 1 FROM loot_items
                WHERE raid_tier_id = v_raid_tier_id AND wowhead_id = 28592
            );

            -- =====================================================
            -- TERESTIAN ILLHOOF
            -- =====================================================

            INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
            SELECT v_raid_tier_id, 'Xavian Stiletto', 'Terestian Illhoof', 'One-Hand', 28659, true
            WHERE NOT EXISTS (
                SELECT 1 FROM loot_items
                WHERE raid_tier_id = v_raid_tier_id AND wowhead_id = 28659
            );

            -- =====================================================
            -- TRASH DROPS
            -- =====================================================

            INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
            SELECT v_raid_tier_id, 'Ring of Unrelenting Storms', 'Trash', 'Finger', 30667, true
            WHERE NOT EXISTS (
                SELECT 1 FROM loot_items
                WHERE raid_tier_id = v_raid_tier_id AND wowhead_id = 30667
            );

            INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
            SELECT v_raid_tier_id, 'Ritssyn''s Lost Pendant', 'Trash', 'Neck', 30666, true
            WHERE NOT EXISTS (
                SELECT 1 FROM loot_items
                WHERE raid_tier_id = v_raid_tier_id AND wowhead_id = 30666
            );

            INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
            SELECT v_raid_tier_id, 'Drape of the Righteous', 'Trash', 'Back', 30642, true
            WHERE NOT EXISTS (
                SELECT 1 FROM loot_items
                WHERE raid_tier_id = v_raid_tier_id AND wowhead_id = 30642
            );

            INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
            SELECT v_raid_tier_id, 'Grasp of the Dead', 'Trash', 'Hands', 30668, true
            WHERE NOT EXISTS (
                SELECT 1 FROM loot_items
                WHERE raid_tier_id = v_raid_tier_id AND wowhead_id = 30668
            );

            INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
            SELECT v_raid_tier_id, 'Inferno Waist Cord', 'Trash', 'Waist', 30673, true
            WHERE NOT EXISTS (
                SELECT 1 FROM loot_items
                WHERE raid_tier_id = v_raid_tier_id AND wowhead_id = 30673
            );

            INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
            SELECT v_raid_tier_id, 'Grips of Deftness', 'Trash', 'Hands', 30644, true
            WHERE NOT EXISTS (
                SELECT 1 FROM loot_items
                WHERE raid_tier_id = v_raid_tier_id AND wowhead_id = 30644
            );

            INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
            SELECT v_raid_tier_id, 'Zierhut''s Lost Treads', 'Trash', 'Feet', 30674, true
            WHERE NOT EXISTS (
                SELECT 1 FROM loot_items
                WHERE raid_tier_id = v_raid_tier_id AND wowhead_id = 30674
            );

            INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
            SELECT v_raid_tier_id, 'Belt of the Tracker', 'Trash', 'Waist', 30643, true
            WHERE NOT EXISTS (
                SELECT 1 FROM loot_items
                WHERE raid_tier_id = v_raid_tier_id AND wowhead_id = 30643
            );

            INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
            SELECT v_raid_tier_id, 'Boots of Elusion', 'Trash', 'Feet', 30641, true
            WHERE NOT EXISTS (
                SELECT 1 FROM loot_items
                WHERE raid_tier_id = v_raid_tier_id AND wowhead_id = 30641
            );

            INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
            SELECT v_raid_tier_id, 'Pattern: Soulcloth Shoulders', 'Trash', 'Recipe', 21903, true
            WHERE NOT EXISTS (
                SELECT 1 FROM loot_items
                WHERE raid_tier_id = v_raid_tier_id AND wowhead_id = 21903
            );

            INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
            SELECT v_raid_tier_id, 'Pattern: Soulcloth Vest', 'Trash', 'Recipe', 21904, true
            WHERE NOT EXISTS (
                SELECT 1 FROM loot_items
                WHERE raid_tier_id = v_raid_tier_id AND wowhead_id = 21904
            );

            INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
            SELECT v_raid_tier_id, 'Formula: Enchant Boots - Surefooted', 'Trash', 'Recipe', 22545, true
            WHERE NOT EXISTS (
                SELECT 1 FROM loot_items
                WHERE raid_tier_id = v_raid_tier_id AND wowhead_id = 22545
            );

        END IF;

    END LOOP;

    RAISE NOTICE 'Migration complete: added missing Karazhan items to all guilds';
END $$;

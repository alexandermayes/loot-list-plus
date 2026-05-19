-- Migration: Fix Spirit of War wowhead_id and add Balanced Trillium Ingot
--
-- Migration 20260419000001 added "Spirit of War" with wowhead_id=98717. That ID
-- is wrong: on Wowhead, 98717 is "Balanced Trillium Ingot". The correct ID for
-- Spirit of War is 102218.
--
-- This migration:
--   1. Corrects the existing Spirit of War row in every guild's SoO tier:
--      wowhead_id 98717 -> 102218.
--   2. Adds a new Balanced Trillium Ingot row (wowhead_id 98717) to every SoO
--      tier so the original ID stays bound to its real item rather than being
--      orphaned.

DO $$
DECLARE
    v_guild RECORD;
    v_tier_id UUID;
BEGIN
    FOR v_guild IN
        SELECT DISTINCT e.guild_id
        FROM expansions e
        WHERE e.name = 'Mists of Pandaria'
    LOOP
        SELECT rt.id INTO v_tier_id
        FROM raid_tiers rt
        INNER JOIN expansions e ON e.id = rt.expansion_id
        WHERE e.guild_id = v_guild.guild_id AND rt.name = 'Siege of Orgrimmar';

        IF v_tier_id IS NULL THEN
            CONTINUE;
        END IF;

        -- Step 1: relabel the existing row from 98717 to 102218. Done before
        -- the INSERT so we don't collide on (raid_tier_id, wowhead_id) if
        -- there's a unique index on that pair.
        UPDATE loot_items
        SET wowhead_id = 102218
        WHERE raid_tier_id = v_tier_id
          AND name = 'Spirit of War'
          AND wowhead_id = 98717;

        -- Step 2: add Balanced Trillium Ingot under the original 98717 ID.
        INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
        SELECT v_tier_id, 'Balanced Trillium Ingot', 'Crafting Materials', 'Crafting', 98717, true
        WHERE NOT EXISTS (
            SELECT 1 FROM loot_items
            WHERE raid_tier_id = v_tier_id AND wowhead_id = 98717
        );
    END LOOP;
END $$;

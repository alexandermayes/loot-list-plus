-- Fix loot_item_classes RLS to also allow guild creators (not just Officer/GM role)
-- The client-side isOfficer check grants access to guild creators,
-- but the RLS policy only checked character_guild_memberships role.

DROP POLICY IF EXISTS "Officers can insert loot item classes" ON loot_item_classes;
DROP POLICY IF EXISTS "Officers can update loot item classes" ON loot_item_classes;
DROP POLICY IF EXISTS "Officers can delete loot item classes" ON loot_item_classes;

-- INSERT: allow officers, GMs, and guild creators
CREATE POLICY "Officers can insert loot item classes" ON loot_item_classes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM loot_items li
      INNER JOIN raid_tiers rt ON rt.id = li.raid_tier_id
      INNER JOIN expansions e ON e.id = rt.expansion_id
      INNER JOIN guilds g ON g.id = e.guild_id
      WHERE li.id = loot_item_classes.loot_item_id
      AND (
        -- Guild creator always has access
        g.created_by = auth.uid()
        OR
        -- Officers and GMs via character memberships
        EXISTS (
          SELECT 1
          FROM characters c
          INNER JOIN character_guild_memberships cgm ON cgm.character_id = c.id AND cgm.guild_id = g.id
          WHERE c.user_id = auth.uid()
          AND cgm.role IN ('Officer', 'Guild Master')
          AND cgm.is_active = true
        )
      )
    )
  );

-- UPDATE: same logic
CREATE POLICY "Officers can update loot item classes" ON loot_item_classes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1
      FROM loot_items li
      INNER JOIN raid_tiers rt ON rt.id = li.raid_tier_id
      INNER JOIN expansions e ON e.id = rt.expansion_id
      INNER JOIN guilds g ON g.id = e.guild_id
      WHERE li.id = loot_item_classes.loot_item_id
      AND (
        g.created_by = auth.uid()
        OR
        EXISTS (
          SELECT 1
          FROM characters c
          INNER JOIN character_guild_memberships cgm ON cgm.character_id = c.id AND cgm.guild_id = g.id
          WHERE c.user_id = auth.uid()
          AND cgm.role IN ('Officer', 'Guild Master')
          AND cgm.is_active = true
        )
      )
    )
  );

-- DELETE: same logic
CREATE POLICY "Officers can delete loot item classes" ON loot_item_classes
  FOR DELETE USING (
    EXISTS (
      SELECT 1
      FROM loot_items li
      INNER JOIN raid_tiers rt ON rt.id = li.raid_tier_id
      INNER JOIN expansions e ON e.id = rt.expansion_id
      INNER JOIN guilds g ON g.id = e.guild_id
      WHERE li.id = loot_item_classes.loot_item_id
      AND (
        g.created_by = auth.uid()
        OR
        EXISTS (
          SELECT 1
          FROM characters c
          INNER JOIN character_guild_memberships cgm ON cgm.character_id = c.id AND cgm.guild_id = g.id
          WHERE c.user_id = auth.uid()
          AND cgm.role IN ('Officer', 'Guild Master')
          AND cgm.is_active = true
        )
      )
    )
  );

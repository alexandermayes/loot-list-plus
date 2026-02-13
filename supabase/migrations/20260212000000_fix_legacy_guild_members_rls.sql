-- =============================================================================
-- Fix legacy RLS policies referencing guild_members table
-- =============================================================================
-- The app uses character_guild_memberships (character -> guild) instead of
-- guild_members (user -> guild). This migration updates all remaining RLS
-- policies that still reference the legacy guild_members table.
--
-- Join path: auth.uid() -> characters.user_id -> character_guild_memberships
--
-- Tables affected:
--   1. raid_tiers (4 policies)
--   2. loot_history (4 policies)
--   3. character_equipped_items (2 policies)
--   4. guild_settings (1 policy)
--   5. blp_tracking (4 policies)
--   6. audit_logs (1 policy)
-- =============================================================================


-- =============================================================================
-- 1. raid_tiers
-- =============================================================================
-- raid_tiers links to guilds via: raid_tiers.expansion_id -> expansions.guild_id

DROP POLICY IF EXISTS "Members can view raid tiers for their guild" ON raid_tiers;
DROP POLICY IF EXISTS "Officers can view raid tiers for their guild" ON raid_tiers;
DROP POLICY IF EXISTS "Officers can insert raid tiers" ON raid_tiers;
DROP POLICY IF EXISTS "Officers can update raid tiers" ON raid_tiers;
DROP POLICY IF EXISTS "Officers can delete raid tiers" ON raid_tiers;

-- SELECT: Guild members can view raid tiers
CREATE POLICY "Members can view raid tiers for their guild"
ON raid_tiers
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM expansions e
    JOIN character_guild_memberships cgm ON cgm.guild_id = e.guild_id
    JOIN characters c ON c.id = cgm.character_id
    WHERE e.id = raid_tiers.expansion_id
    AND c.user_id = auth.uid()
    AND cgm.is_active = true
  )
  OR
  EXISTS (
    SELECT 1 FROM expansions e
    JOIN guilds g ON g.id = e.guild_id
    WHERE e.id = raid_tiers.expansion_id
    AND g.created_by = auth.uid()
  )
);

-- INSERT: Officers can insert raid tiers
CREATE POLICY "Officers can insert raid tiers"
ON raid_tiers
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM expansions e
    JOIN character_guild_memberships cgm ON cgm.guild_id = e.guild_id
    JOIN characters c ON c.id = cgm.character_id
    WHERE e.id = raid_tiers.expansion_id
    AND c.user_id = auth.uid()
    AND cgm.is_active = true
    AND cgm.role IN ('officer', 'guild_master')
  )
  OR
  EXISTS (
    SELECT 1 FROM expansions e
    JOIN guilds g ON g.id = e.guild_id
    WHERE e.id = raid_tiers.expansion_id
    AND g.created_by = auth.uid()
  )
);

-- UPDATE: Officers can update raid tiers
CREATE POLICY "Officers can update raid tiers"
ON raid_tiers
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM expansions e
    JOIN character_guild_memberships cgm ON cgm.guild_id = e.guild_id
    JOIN characters c ON c.id = cgm.character_id
    WHERE e.id = raid_tiers.expansion_id
    AND c.user_id = auth.uid()
    AND cgm.is_active = true
    AND cgm.role IN ('officer', 'guild_master')
  )
  OR
  EXISTS (
    SELECT 1 FROM expansions e
    JOIN guilds g ON g.id = e.guild_id
    WHERE e.id = raid_tiers.expansion_id
    AND g.created_by = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM expansions e
    JOIN character_guild_memberships cgm ON cgm.guild_id = e.guild_id
    JOIN characters c ON c.id = cgm.character_id
    WHERE e.id = raid_tiers.expansion_id
    AND c.user_id = auth.uid()
    AND cgm.is_active = true
    AND cgm.role IN ('officer', 'guild_master')
  )
  OR
  EXISTS (
    SELECT 1 FROM expansions e
    JOIN guilds g ON g.id = e.guild_id
    WHERE e.id = raid_tiers.expansion_id
    AND g.created_by = auth.uid()
  )
);

-- DELETE: Officers can delete raid tiers
CREATE POLICY "Officers can delete raid tiers"
ON raid_tiers
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM expansions e
    JOIN character_guild_memberships cgm ON cgm.guild_id = e.guild_id
    JOIN characters c ON c.id = cgm.character_id
    WHERE e.id = raid_tiers.expansion_id
    AND c.user_id = auth.uid()
    AND cgm.is_active = true
    AND cgm.role IN ('officer', 'guild_master')
  )
  OR
  EXISTS (
    SELECT 1 FROM expansions e
    JOIN guilds g ON g.id = e.guild_id
    WHERE e.id = raid_tiers.expansion_id
    AND g.created_by = auth.uid()
  )
);


-- =============================================================================
-- 2. loot_history
-- =============================================================================
-- loot_history has a direct guild_id column

DROP POLICY IF EXISTS "Guild members can view loot history" ON loot_history;
DROP POLICY IF EXISTS "Officers can insert loot history" ON loot_history;
DROP POLICY IF EXISTS "Officers can update loot history" ON loot_history;
DROP POLICY IF EXISTS "Officers can delete loot history" ON loot_history;

-- SELECT: Guild members can view loot history
CREATE POLICY "Guild members can view loot history"
ON loot_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM character_guild_memberships cgm
    JOIN characters c ON c.id = cgm.character_id
    WHERE cgm.guild_id = loot_history.guild_id
    AND c.user_id = auth.uid()
    AND cgm.is_active = true
  )
  OR
  EXISTS (
    SELECT 1 FROM guilds g
    WHERE g.id = loot_history.guild_id
    AND g.created_by = auth.uid()
  )
);

-- INSERT: Officers can insert loot history
CREATE POLICY "Officers can insert loot history"
ON loot_history
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM character_guild_memberships cgm
    JOIN characters c ON c.id = cgm.character_id
    WHERE cgm.guild_id = loot_history.guild_id
    AND c.user_id = auth.uid()
    AND cgm.is_active = true
    AND cgm.role IN ('officer', 'guild_master')
  )
  OR
  EXISTS (
    SELECT 1 FROM guilds g
    WHERE g.id = loot_history.guild_id
    AND g.created_by = auth.uid()
  )
);

-- UPDATE: Officers can update loot history
CREATE POLICY "Officers can update loot history"
ON loot_history
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM character_guild_memberships cgm
    JOIN characters c ON c.id = cgm.character_id
    WHERE cgm.guild_id = loot_history.guild_id
    AND c.user_id = auth.uid()
    AND cgm.is_active = true
    AND cgm.role IN ('officer', 'guild_master')
  )
  OR
  EXISTS (
    SELECT 1 FROM guilds g
    WHERE g.id = loot_history.guild_id
    AND g.created_by = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM character_guild_memberships cgm
    JOIN characters c ON c.id = cgm.character_id
    WHERE cgm.guild_id = loot_history.guild_id
    AND c.user_id = auth.uid()
    AND cgm.is_active = true
    AND cgm.role IN ('officer', 'guild_master')
  )
  OR
  EXISTS (
    SELECT 1 FROM guilds g
    WHERE g.id = loot_history.guild_id
    AND g.created_by = auth.uid()
  )
);

-- DELETE: Officers can delete loot history
CREATE POLICY "Officers can delete loot history"
ON loot_history
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM character_guild_memberships cgm
    JOIN characters c ON c.id = cgm.character_id
    WHERE cgm.guild_id = loot_history.guild_id
    AND c.user_id = auth.uid()
    AND cgm.is_active = true
    AND cgm.role IN ('officer', 'guild_master')
  )
  OR
  EXISTS (
    SELECT 1 FROM guilds g
    WHERE g.id = loot_history.guild_id
    AND g.created_by = auth.uid()
  )
);


-- =============================================================================
-- 3. character_equipped_items
-- =============================================================================
-- character_equipped_items links via: character_id -> characters -> character_guild_memberships
-- The "Users can manage their own characters' equipped items" policy is fine (uses characters.user_id directly)
-- Only need to fix the two policies that reference guild_members

DROP POLICY IF EXISTS "Users can view equipped items for guild characters" ON character_equipped_items;
DROP POLICY IF EXISTS "Officers can manage guild characters' equipped items" ON character_equipped_items;

-- SELECT: Users can view equipped items for characters in their guilds
CREATE POLICY "Users can view equipped items for guild characters"
ON character_equipped_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM characters c
    JOIN character_guild_memberships cgm ON cgm.character_id = c.id
    JOIN character_guild_memberships my_cgm ON my_cgm.guild_id = cgm.guild_id
    JOIN characters my_c ON my_c.id = my_cgm.character_id
    WHERE c.id = character_equipped_items.character_id
    AND my_c.user_id = auth.uid()
    AND my_cgm.is_active = true
  )
);

-- ALL: Officers can manage any character's equipped items in their guild
CREATE POLICY "Officers can manage guild characters' equipped items"
ON character_equipped_items
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM characters c
    JOIN character_guild_memberships cgm ON cgm.character_id = c.id
    JOIN character_guild_memberships my_cgm ON my_cgm.guild_id = cgm.guild_id
    JOIN characters my_c ON my_c.id = my_cgm.character_id
    WHERE c.id = character_equipped_items.character_id
    AND my_c.user_id = auth.uid()
    AND my_cgm.is_active = true
    AND my_cgm.role IN ('officer', 'guild_master')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM characters c
    JOIN character_guild_memberships cgm ON cgm.character_id = c.id
    JOIN character_guild_memberships my_cgm ON my_cgm.guild_id = cgm.guild_id
    JOIN characters my_c ON my_c.id = my_cgm.character_id
    WHERE c.id = character_equipped_items.character_id
    AND my_c.user_id = auth.uid()
    AND my_cgm.is_active = true
    AND my_cgm.role IN ('officer', 'guild_master')
  )
);


-- =============================================================================
-- 4. guild_settings
-- =============================================================================
-- Only the INSERT policy references guild_members (the Guild Master insert check)

DROP POLICY IF EXISTS "Guild Master can insert guild settings" ON guild_settings;

-- INSERT: Guild creator or Guild Master can insert guild settings
CREATE POLICY "Guild Master can insert guild settings"
ON guild_settings
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM guilds g
    WHERE g.id = guild_settings.guild_id
    AND g.created_by = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM character_guild_memberships cgm
    JOIN characters c ON c.id = cgm.character_id
    WHERE cgm.guild_id = guild_settings.guild_id
    AND c.user_id = auth.uid()
    AND cgm.is_active = true
    AND cgm.role = 'guild_master'
  )
);


-- =============================================================================
-- 5. blp_tracking
-- =============================================================================
-- blp_tracking has a direct guild_id column

DROP POLICY IF EXISTS "Guild members can view BLP" ON blp_tracking;
DROP POLICY IF EXISTS "Officers can insert BLP" ON blp_tracking;
DROP POLICY IF EXISTS "Officers can update BLP" ON blp_tracking;
DROP POLICY IF EXISTS "Officers can delete BLP" ON blp_tracking;

-- SELECT: Guild members can view BLP data
CREATE POLICY "Guild members can view BLP"
ON blp_tracking
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM character_guild_memberships cgm
    JOIN characters c ON c.id = cgm.character_id
    WHERE cgm.guild_id = blp_tracking.guild_id
    AND c.user_id = auth.uid()
    AND cgm.is_active = true
  )
  OR
  EXISTS (
    SELECT 1 FROM guilds g
    WHERE g.id = blp_tracking.guild_id
    AND g.created_by = auth.uid()
  )
);

-- INSERT: Officers can insert BLP records
CREATE POLICY "Officers can insert BLP"
ON blp_tracking
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM character_guild_memberships cgm
    JOIN characters c ON c.id = cgm.character_id
    WHERE cgm.guild_id = blp_tracking.guild_id
    AND c.user_id = auth.uid()
    AND cgm.is_active = true
    AND cgm.role IN ('officer', 'guild_master')
  )
  OR
  EXISTS (
    SELECT 1 FROM guilds g
    WHERE g.id = blp_tracking.guild_id
    AND g.created_by = auth.uid()
  )
);

-- UPDATE: Officers can update BLP records
CREATE POLICY "Officers can update BLP"
ON blp_tracking
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM character_guild_memberships cgm
    JOIN characters c ON c.id = cgm.character_id
    WHERE cgm.guild_id = blp_tracking.guild_id
    AND c.user_id = auth.uid()
    AND cgm.is_active = true
    AND cgm.role IN ('officer', 'guild_master')
  )
  OR
  EXISTS (
    SELECT 1 FROM guilds g
    WHERE g.id = blp_tracking.guild_id
    AND g.created_by = auth.uid()
  )
);

-- DELETE: Officers can delete BLP records
CREATE POLICY "Officers can delete BLP"
ON blp_tracking
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM character_guild_memberships cgm
    JOIN characters c ON c.id = cgm.character_id
    WHERE cgm.guild_id = blp_tracking.guild_id
    AND c.user_id = auth.uid()
    AND cgm.is_active = true
    AND cgm.role IN ('officer', 'guild_master')
  )
  OR
  EXISTS (
    SELECT 1 FROM guilds g
    WHERE g.id = blp_tracking.guild_id
    AND g.created_by = auth.uid()
  )
);


-- =============================================================================
-- 6. audit_logs
-- =============================================================================
-- Only the SELECT policy references guild_members

DROP POLICY IF EXISTS "Officers can view guild audit logs" ON audit_logs;

-- SELECT: Officers or guild creators can view guild audit logs
CREATE POLICY "Officers can view guild audit logs"
ON audit_logs
FOR SELECT
USING (
  -- Guild-specific logs: require officer role via character_guild_memberships
  (
    guild_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      JOIN characters c ON c.id = cgm.character_id
      WHERE cgm.guild_id = audit_logs.guild_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
      AND cgm.role IN ('officer', 'guild_master')
    )
  )
  OR
  -- Guild-specific logs: guild creator
  (
    guild_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM guilds
      WHERE guilds.id = audit_logs.guild_id
        AND guilds.created_by = auth.uid()
    )
  )
  OR
  -- User's own actions (non-guild-specific)
  (guild_id IS NULL AND user_id = auth.uid())
);


-- =============================================================================
-- Verification
-- =============================================================================
DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Legacy guild_members RLS references fixed!';
  RAISE NOTICE 'Updated tables:';
  RAISE NOTICE '  - raid_tiers (4 policies)';
  RAISE NOTICE '  - loot_history (4 policies)';
  RAISE NOTICE '  - character_equipped_items (2 policies)';
  RAISE NOTICE '  - guild_settings (1 policy)';
  RAISE NOTICE '  - blp_tracking (4 policies)';
  RAISE NOTICE '  - audit_logs (1 policy)';
  RAISE NOTICE 'All now use character_guild_memberships';
  RAISE NOTICE '==============================================';
END $$;

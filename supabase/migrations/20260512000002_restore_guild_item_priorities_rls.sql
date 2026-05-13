-- =============================================================================
-- Restore RLS policies on guild_item_priorities
-- =============================================================================
-- The May 12 migration (20260512000001_drop_guild_members_and_user_active_guilds.sql)
-- dropped the four original RLS policies because they referenced the dropped
-- guild_members table, but never recreated them. RLS remained enabled with zero
-- policies, so every read/write through the user-scoped Supabase client was
-- silently denied. The /api/prio-list routes now use the service client after
-- manual permission checks, but RLS still needs proper policies as defense in
-- depth for any direct table access.
--
-- These policies mirror the pattern used by other guild tables (e.g.
-- attendance_records, loot_submissions) and reference character_guild_memberships
-- instead of the dropped guild_members table.
-- =============================================================================

-- Drop any leftover policies defensively (no-ops if already gone)
DROP POLICY IF EXISTS "guild_item_priorities_select" ON guild_item_priorities;
DROP POLICY IF EXISTS "guild_item_priorities_insert" ON guild_item_priorities;
DROP POLICY IF EXISTS "guild_item_priorities_update" ON guild_item_priorities;
DROP POLICY IF EXISTS "guild_item_priorities_delete" ON guild_item_priorities;

-- Guild members can view priorities in their guild
CREATE POLICY "guild_item_priorities_select" ON guild_item_priorities
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      JOIN characters c ON c.id = cgm.character_id
      WHERE cgm.guild_id = guild_item_priorities.guild_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
    )
    OR
    EXISTS (
      SELECT 1 FROM guilds g
      WHERE g.id = guild_item_priorities.guild_id
      AND g.created_by = auth.uid()
    )
  );

-- Officers and Guild Masters can create priorities
CREATE POLICY "guild_item_priorities_insert" ON guild_item_priorities
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      JOIN characters c ON c.id = cgm.character_id
      WHERE cgm.guild_id = guild_item_priorities.guild_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
      AND cgm.role IN ('Officer', 'Guild Master')
    )
    OR
    EXISTS (
      SELECT 1 FROM guilds g
      WHERE g.id = guild_item_priorities.guild_id
      AND g.created_by = auth.uid()
    )
  );

-- Officers and Guild Masters can update priorities
CREATE POLICY "guild_item_priorities_update" ON guild_item_priorities
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      JOIN characters c ON c.id = cgm.character_id
      WHERE cgm.guild_id = guild_item_priorities.guild_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
      AND cgm.role IN ('Officer', 'Guild Master')
    )
    OR
    EXISTS (
      SELECT 1 FROM guilds g
      WHERE g.id = guild_item_priorities.guild_id
      AND g.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      JOIN characters c ON c.id = cgm.character_id
      WHERE cgm.guild_id = guild_item_priorities.guild_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
      AND cgm.role IN ('Officer', 'Guild Master')
    )
    OR
    EXISTS (
      SELECT 1 FROM guilds g
      WHERE g.id = guild_item_priorities.guild_id
      AND g.created_by = auth.uid()
    )
  );

-- Officers and Guild Masters can delete priorities
CREATE POLICY "guild_item_priorities_delete" ON guild_item_priorities
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      JOIN characters c ON c.id = cgm.character_id
      WHERE cgm.guild_id = guild_item_priorities.guild_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
      AND cgm.role IN ('Officer', 'Guild Master')
    )
    OR
    EXISTS (
      SELECT 1 FROM guilds g
      WHERE g.id = guild_item_priorities.guild_id
      AND g.created_by = auth.uid()
    )
  );

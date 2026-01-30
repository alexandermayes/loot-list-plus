-- =====================================================
-- FIX: Guild Roles RLS - Avoid Infinite Recursion
-- =====================================================
-- Previous migration caused infinite recursion because
-- INSERT/UPDATE/DELETE policies joined to guild_roles
-- to check officer position. This version checks for
-- known officer role names instead.
-- =====================================================

BEGIN;

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Guild members can view guild roles" ON guild_roles;
DROP POLICY IF EXISTS "Officers can create guild roles" ON guild_roles;
DROP POLICY IF EXISTS "Officers can update guild roles" ON guild_roles;
DROP POLICY IF EXISTS "Officers can delete guild roles" ON guild_roles;

-- Policy 1: Guild members can view roles in their guild
-- This one is fine - no self-reference needed
CREATE POLICY "Guild members can view guild roles" ON guild_roles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM character_guild_memberships cgm
      INNER JOIN characters c ON c.id = cgm.character_id
      WHERE cgm.guild_id = guild_roles.guild_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
    )
  );

-- Policy 2: Officers can INSERT new roles
-- Check for officer role by name instead of position lookup
CREATE POLICY "Officers can create guild roles" ON guild_roles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM character_guild_memberships cgm
      INNER JOIN characters c ON c.id = cgm.character_id
      WHERE cgm.guild_id = guild_roles.guild_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
      AND cgm.role IN ('Guild Master', 'Officer')
    )
  );

-- Policy 3: Officers can UPDATE roles
CREATE POLICY "Officers can update guild roles" ON guild_roles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM character_guild_memberships cgm
      INNER JOIN characters c ON c.id = cgm.character_id
      WHERE cgm.guild_id = guild_roles.guild_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
      AND cgm.role IN ('Guild Master', 'Officer')
    )
  );

-- Policy 4: Officers can DELETE non-default roles
CREATE POLICY "Officers can delete guild roles" ON guild_roles
  FOR DELETE
  USING (
    is_default = false
    AND EXISTS (
      SELECT 1
      FROM character_guild_memberships cgm
      INNER JOIN characters c ON c.id = cgm.character_id
      WHERE cgm.guild_id = guild_roles.guild_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
      AND cgm.role IN ('Guild Master', 'Officer')
    )
  );

COMMIT;

-- Confirmation
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Guild Roles RLS Fixed (No Recursion)!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Officer check now uses role name';
  RAISE NOTICE 'instead of position lookup.';
  RAISE NOTICE '========================================';
END $$;

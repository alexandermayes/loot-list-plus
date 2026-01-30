-- =====================================================
-- FIX: Update guild_roles RLS to use position-based permissions
-- =====================================================
-- Officers (position >= 50) can manage guild roles
-- Fixes issue where custom role names prevent role management
-- =====================================================

BEGIN;

-- Drop existing policies
DROP POLICY IF EXISTS "Guild members can view guild roles" ON guild_roles;
DROP POLICY IF EXISTS "Officers can create guild roles" ON guild_roles;
DROP POLICY IF EXISTS "Officers can update guild roles" ON guild_roles;
DROP POLICY IF EXISTS "Officers can delete guild roles" ON guild_roles;
DROP POLICY IF EXISTS "Officers can manage guild roles" ON guild_roles;

-- Policy 1: Guild members can view roles in their guild
CREATE POLICY "Guild members can view guild roles" ON guild_roles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM guild_members gm
      WHERE gm.guild_id = guild_roles.guild_id
      AND gm.user_id = auth.uid()
      AND gm.is_active = true
    )
  );

-- Policy 2: Officers (position >= 50) can INSERT new roles
CREATE POLICY "Officers can create guild roles" ON guild_roles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM guild_members gm
      INNER JOIN guild_roles gr ON gr.guild_id = gm.guild_id AND gr.name = gm.role
      WHERE gm.guild_id = guild_roles.guild_id
      AND gm.user_id = auth.uid()
      AND gm.is_active = true
      AND gr.position >= 50
    )
  );

-- Policy 3: Officers (position >= 50) can UPDATE roles
CREATE POLICY "Officers can update guild roles" ON guild_roles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM guild_members gm
      INNER JOIN guild_roles gr ON gr.guild_id = gm.guild_id AND gr.name = gm.role
      WHERE gm.guild_id = guild_roles.guild_id
      AND gm.user_id = auth.uid()
      AND gm.is_active = true
      AND gr.position >= 50
    )
  );

-- Policy 4: Officers (position >= 50) can DELETE non-default roles
CREATE POLICY "Officers can delete guild roles" ON guild_roles
  FOR DELETE
  USING (
    is_default = false
    AND EXISTS (
      SELECT 1 FROM guild_members gm
      INNER JOIN guild_roles gr ON gr.guild_id = gm.guild_id AND gr.name = gm.role
      WHERE gm.guild_id = guild_roles.guild_id
      AND gm.user_id = auth.uid()
      AND gm.is_active = true
      AND gr.position >= 50
    )
  );

COMMIT;

-- Confirmation
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Guild Roles RLS Fixed!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Officers (position >= 50) can now:';
  RAISE NOTICE '- Create new roles';
  RAISE NOTICE '- Update existing roles';
  RAISE NOTICE '- Delete non-default roles';
  RAISE NOTICE 'Works with custom role names!';
  RAISE NOTICE '========================================';
END $$;

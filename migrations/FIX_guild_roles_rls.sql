-- =====================================================
-- FIX: Add RLS policies for guild_roles table
-- =====================================================
-- The isOfficer check needs to read guild_roles.position
-- but users couldn't access the table (406 errors)
-- =====================================================

BEGIN;

-- Enable RLS on guild_roles if not already enabled
ALTER TABLE guild_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Guild members can view guild roles" ON guild_roles;
DROP POLICY IF EXISTS "Officers can manage guild roles" ON guild_roles;

-- Allow guild members to VIEW roles in their guild
CREATE POLICY "Guild members can view guild roles" ON guild_roles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      INNER JOIN characters c ON c.id = cgm.character_id
      WHERE c.user_id = auth.uid()
      AND cgm.guild_id = guild_roles.guild_id
    )
    OR EXISTS (
      SELECT 1 FROM guild_members gm
      WHERE gm.user_id = auth.uid()
      AND gm.guild_id = guild_roles.guild_id
      AND gm.is_active = true
    )
  );

-- Allow officers to INSERT/UPDATE/DELETE guild roles
CREATE POLICY "Officers can manage guild roles" ON guild_roles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      INNER JOIN characters c ON c.id = cgm.character_id
      INNER JOIN guild_roles gr ON gr.guild_id = cgm.guild_id AND gr.name = cgm.role
      WHERE c.user_id = auth.uid()
      AND cgm.guild_id = guild_roles.guild_id
      AND gr.position >= 50
    )
    OR EXISTS (
      SELECT 1 FROM guild_members gm
      INNER JOIN guild_roles gr ON gr.guild_id = gm.guild_id AND gr.name = gm.role
      WHERE gm.user_id = auth.uid()
      AND gm.guild_id = guild_roles.guild_id
      AND gm.is_active = true
      AND gr.position >= 50
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      INNER JOIN characters c ON c.id = cgm.character_id
      INNER JOIN guild_roles gr ON gr.guild_id = cgm.guild_id AND gr.name = cgm.role
      WHERE c.user_id = auth.uid()
      AND cgm.guild_id = guild_roles.guild_id
      AND gr.position >= 50
    )
    OR EXISTS (
      SELECT 1 FROM guild_members gm
      INNER JOIN guild_roles gr ON gr.guild_id = gm.guild_id AND gr.name = gm.role
      WHERE gm.user_id = auth.uid()
      AND gm.guild_id = guild_roles.guild_id
      AND gm.is_active = true
      AND gr.position >= 50
    )
  );

COMMIT;

-- Confirmation message
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Guild Roles RLS Policies Added!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Users can now read guild roles.';
  RAISE NOTICE 'Officers can manage guild roles.';
  RAISE NOTICE 'Refresh browser to see admin settings.';
  RAISE NOTICE '========================================';
END $$;

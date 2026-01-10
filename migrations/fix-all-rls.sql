-- Comprehensive RLS fix for multi-guild architecture
-- This adds policies for all tables accessed by the Guild Context

-- =============================================================================
-- 1. GUILD_MEMBERS TABLE
-- =============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own memberships" ON guild_members;
DROP POLICY IF EXISTS "Users can view members of their guilds" ON guild_members;

-- Allow users to view their own memberships
CREATE POLICY "Users can view their own memberships"
  ON guild_members FOR SELECT
  USING (user_id = auth.uid());

-- Allow users to view other members of guilds they're in
CREATE POLICY "Users can view members of their guilds"
  ON guild_members FOR SELECT
  USING (
    guild_id IN (
      SELECT guild_id
      FROM guild_members
      WHERE user_id = auth.uid()
    )
  );

-- =============================================================================
-- 2. WOW_CLASSES TABLE (global data - everyone can read)
-- =============================================================================

-- Check if RLS is enabled on wow_classes
DO $$
BEGIN
  -- Disable RLS on wow_classes if it's enabled (it's global data)
  ALTER TABLE wow_classes DISABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

-- =============================================================================
-- 3. CLASS_SPECS TABLE (global data - everyone can read)
-- =============================================================================

-- Check if class_specs table exists and disable RLS
DO $$
BEGIN
  ALTER TABLE class_specs DISABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

-- =============================================================================
-- 4. VERIFY POLICIES
-- =============================================================================

-- List all policies for verification
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('guilds', 'guild_members', 'guild_invite_codes', 'user_active_guilds')
ORDER BY tablename, policyname;

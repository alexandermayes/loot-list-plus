-- =============================================================================
-- Re-enable RLS on characters table with correct policies
-- =============================================================================
-- Previous attempts had circular reference issues. This migration uses a
-- SECURITY DEFINER function to get the user's guild IDs, avoiding the
-- circular reference problem.
-- =============================================================================

-- Step 1: Create helper function to get guild IDs for current user
-- This function is SECURITY DEFINER so it bypasses RLS and avoids circular refs
CREATE OR REPLACE FUNCTION get_current_user_guild_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT DISTINCT cgm.guild_id
  FROM character_guild_memberships cgm
  INNER JOIN characters c ON c.id = cgm.character_id
  WHERE c.user_id = auth.uid()
    AND cgm.is_active = true;
$$;

-- Step 2: Enable RLS on characters table
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;

-- Step 3: Policy for users to view their own characters
CREATE POLICY "Users can view own characters" ON characters
  FOR SELECT
  USING (user_id = auth.uid());

-- Step 4: Policy for guild members to view characters in shared guilds
-- Uses the helper function to avoid circular reference
CREATE POLICY "Guild members can view guild characters" ON characters
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM character_guild_memberships cgm
      WHERE cgm.character_id = characters.id
        AND cgm.is_active = true
        AND cgm.guild_id IN (SELECT get_current_user_guild_ids())
    )
  );

-- Step 5: Policy for users to insert their own characters
CREATE POLICY "Users can insert own characters" ON characters
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Step 6: Policy for users to update their own characters
CREATE POLICY "Users can update own characters" ON characters
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Step 7: Policy for users to delete their own characters
CREATE POLICY "Users can delete own characters" ON characters
  FOR DELETE
  USING (user_id = auth.uid());

-- Confirmation
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Characters RLS re-enabled successfully';
  RAISE NOTICE 'Using helper function to avoid circular refs';
  RAISE NOTICE '========================================';
END $$;

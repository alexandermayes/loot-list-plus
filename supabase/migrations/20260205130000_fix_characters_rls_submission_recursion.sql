-- =============================================================================
-- Fix characters RLS infinite recursion by replacing problematic policy
-- =============================================================================
-- The previous policy "Guild members can view submitting characters" caused
-- infinite recursion when combined with the existing "Guild members can view
-- guild characters" policy. Both policies had subqueries that referenced
-- characters, creating a circular dependency.
--
-- Solution: Use a SECURITY DEFINER function that completely bypasses RLS
-- to check if a character has submitted to any of the user's guilds.
-- =============================================================================

-- Step 1: Drop the problematic policy
DROP POLICY IF EXISTS "Guild members can view submitting characters" ON characters;

-- Step 2: Create a helper function to check if a character has submitted to user's guilds
-- This function is SECURITY DEFINER and uses a direct query approach to avoid recursion
CREATE OR REPLACE FUNCTION character_has_submission_to_user_guilds(p_character_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM loot_submissions ls
    WHERE ls.character_id = p_character_id
      AND ls.guild_id IN (
        SELECT cgm.guild_id
        FROM character_guild_memberships cgm
        INNER JOIN characters c ON c.id = cgm.character_id
        WHERE c.user_id = auth.uid()
          AND cgm.is_active = true
      )
  );
$$;

-- Step 3: Create the policy using the helper function
-- The function is SECURITY DEFINER so it bypasses RLS entirely when called
CREATE POLICY "Guild members can view submitting characters" ON characters
  FOR SELECT
  USING (character_has_submission_to_user_guilds(id));

-- Confirmation
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Fixed characters RLS recursion issue';
  RAISE NOTICE 'Using SECURITY DEFINER function approach';
  RAISE NOTICE '========================================';
END $$;

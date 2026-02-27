-- =============================================================================
-- Fix expansion phase issues
-- =============================================================================
-- 1. Set current_phase = 1 on expansions where it's NULL
-- 2. Fix Tempest Keep: The Eye raid tiers that have NULL phase (should be 2)
-- 3. Update create_expansion_for_guild function to default current_phase to 1
-- =============================================================================

-- Fix existing expansions with NULL current_phase
UPDATE expansions
SET current_phase = 1
WHERE current_phase IS NULL;

-- Fix Tempest Keep: The Eye raid tiers with NULL phase
UPDATE raid_tiers
SET phase = 2
WHERE name = 'Tempest Keep: The Eye'
  AND phase IS NULL;

-- Update the RPC function to set current_phase = 1 by default
CREATE OR REPLACE FUNCTION create_expansion_for_guild(
  p_guild_id UUID,
  p_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expansion_id UUID;
BEGIN
  -- Verify the caller is either the guild creator or a member of the guild
  IF NOT EXISTS (
    SELECT 1 FROM guilds
    WHERE id = p_guild_id
    AND created_by = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM guild_members
    WHERE guild_id = p_guild_id
    AND user_id = auth.uid()
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Not authorized to create expansion for this guild';
  END IF;

  -- Create the expansion with current_phase defaulting to 1
  INSERT INTO expansions (guild_id, name, current_phase)
  VALUES (p_guild_id, p_name, 1)
  RETURNING id INTO v_expansion_id;

  RETURN v_expansion_id;
END;
$$;

-- Confirmation
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Fixed expansion phase issues:';
  RAISE NOTICE '- Set current_phase=1 on NULL expansions';
  RAISE NOTICE '- Fixed TK phase from NULL to 2';
  RAISE NOTICE '- Updated RPC to default current_phase=1';
  RAISE NOTICE '========================================';
END $$;

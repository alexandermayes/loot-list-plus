-- =====================================================
-- UPDATE EXPANSION SYSTEM: Multi-Expansion Support
-- =====================================================
-- This migration updates the expansion system to support:
-- 1. Multiple expansions per guild (keep all data)
-- 2. Per-expansion raid start dates for attendance
-- 3. Master sheet visibility control per raid tier
-- 4. Submission deadlines per raid tier
-- 5. All submissions require officer approval (no auto-approve)
-- =====================================================

BEGIN;

-- =====================================================
-- STEP 1: Update expansions table
-- =====================================================

-- Add raid_start_date for per-expansion attendance tracking
ALTER TABLE expansions
  ADD COLUMN IF NOT EXISTS raid_start_date DATE;

-- Add comment to document the column
COMMENT ON COLUMN expansions.raid_start_date IS 'The date when this guild started raiding this expansion. Used for weekly attendance calculations.';

-- =====================================================
-- STEP 2: Update raid_tiers table
-- =====================================================

-- Add master_sheet_visible to control when players can see rankings
ALTER TABLE raid_tiers
  ADD COLUMN IF NOT EXISTS master_sheet_visible BOOLEAN DEFAULT false;

-- Add submission_deadline for marking when "late" submissions require approval warnings
ALTER TABLE raid_tiers
  ADD COLUMN IF NOT EXISTS submission_deadline TIMESTAMPTZ;

-- Add comments
COMMENT ON COLUMN raid_tiers.master_sheet_visible IS 'When false, players cannot see the master sheet/rankings for this tier. Officers can toggle this to prevent gaming the loot system.';
COMMENT ON COLUMN raid_tiers.submission_deadline IS 'Optional deadline for submissions. After this time, players see a warning that submissions require officer approval (though all submissions require approval).';

-- =====================================================
-- STEP 3: Verify loot_submissions table has status
-- =====================================================

-- Ensure status column exists (should already exist from previous migrations)
-- Status values: 'pending', 'approved', 'rejected'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'loot_submissions'
    AND column_name = 'status'
  ) THEN
    ALTER TABLE loot_submissions
      ADD COLUMN status VARCHAR(20) DEFAULT 'pending';
  END IF;
END $$;

-- Ensure all existing submissions without status are marked as approved (legacy data)
UPDATE loot_submissions
SET status = 'approved'
WHERE status IS NULL;

-- Add check constraint for valid status values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'loot_submissions_status_check'
  ) THEN
    ALTER TABLE loot_submissions
      ADD CONSTRAINT loot_submissions_status_check
      CHECK (status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

-- =====================================================
-- STEP 4: Create helper functions
-- =====================================================

-- Function to check if a user can view master sheet for a raid tier
CREATE OR REPLACE FUNCTION can_view_master_sheet(p_raid_tier_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_visible BOOLEAN;
  v_is_officer BOOLEAN;
BEGIN
  -- Get master sheet visibility
  SELECT master_sheet_visible INTO v_visible
  FROM raid_tiers
  WHERE id = p_raid_tier_id;

  -- If visible to all, return true
  IF v_visible THEN
    RETURN true;
  END IF;

  -- Check if user is an officer in the guild
  SELECT EXISTS (
    SELECT 1
    FROM raid_tiers rt
    INNER JOIN expansions e ON e.id = rt.expansion_id
    INNER JOIN character_guild_memberships cgm ON cgm.guild_id = e.guild_id
    INNER JOIN characters c ON c.id = cgm.character_id
    INNER JOIN guild_roles gr ON gr.guild_id = cgm.guild_id AND gr.name = cgm.role
    WHERE rt.id = p_raid_tier_id
    AND c.user_id = p_user_id
    AND gr.position >= 50
  ) INTO v_is_officer;

  RETURN v_is_officer;
END;
$$;

-- Function to check if submission is past deadline
CREATE OR REPLACE FUNCTION is_past_deadline(p_raid_tier_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_deadline TIMESTAMPTZ;
BEGIN
  SELECT submission_deadline INTO v_deadline
  FROM raid_tiers
  WHERE id = p_raid_tier_id;

  -- If no deadline set, never past deadline
  IF v_deadline IS NULL THEN
    RETURN false;
  END IF;

  -- Check if current time is past deadline
  RETURN NOW() > v_deadline;
END;
$$;

-- Function to get guild's current expansion
CREATE OR REPLACE FUNCTION get_guild_current_expansion(p_guild_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_expansion_id UUID;
BEGIN
  SELECT active_expansion_id INTO v_expansion_id
  FROM guilds
  WHERE id = p_guild_id;

  RETURN v_expansion_id;
END;
$$;

-- Function to get all expansions for a guild
CREATE OR REPLACE FUNCTION get_guild_expansions(p_guild_id UUID)
RETURNS TABLE (
  expansion_id UUID,
  expansion_name VARCHAR,
  raid_start_date DATE,
  is_current BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_current_expansion_id UUID;
BEGIN
  -- Get current expansion
  SELECT active_expansion_id INTO v_current_expansion_id
  FROM guilds
  WHERE id = p_guild_id;

  -- Return all expansions for this guild
  RETURN QUERY
  SELECT
    e.id,
    e.name,
    e.raid_start_date,
    (e.id = v_current_expansion_id) as is_current,
    e.created_at
  FROM expansions e
  WHERE e.guild_id = p_guild_id
  ORDER BY e.created_at ASC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION can_view_master_sheet TO authenticated;
GRANT EXECUTE ON FUNCTION is_past_deadline TO authenticated;
GRANT EXECUTE ON FUNCTION get_guild_current_expansion TO authenticated;
GRANT EXECUTE ON FUNCTION get_guild_expansions TO authenticated;

-- =====================================================
-- STEP 5: Create indexes for performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_raid_tiers_master_sheet_visible
  ON raid_tiers(master_sheet_visible);

CREATE INDEX IF NOT EXISTS idx_raid_tiers_submission_deadline
  ON raid_tiers(submission_deadline);

CREATE INDEX IF NOT EXISTS idx_loot_submissions_status
  ON loot_submissions(status);

CREATE INDEX IF NOT EXISTS idx_expansions_raid_start_date
  ON expansions(raid_start_date);

COMMIT;

-- Confirmation message
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Expansion System Updated!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'New Features:';
  RAISE NOTICE '✅ Multiple expansions per guild';
  RAISE NOTICE '✅ Per-expansion raid start dates';
  RAISE NOTICE '✅ Master sheet visibility control';
  RAISE NOTICE '✅ Submission deadlines';
  RAISE NOTICE '✅ All submissions require approval';
  RAISE NOTICE '';
  RAISE NOTICE 'New Functions:';
  RAISE NOTICE '- can_view_master_sheet(raid_tier_id, user_id)';
  RAISE NOTICE '- is_past_deadline(raid_tier_id)';
  RAISE NOTICE '- get_guild_current_expansion(guild_id)';
  RAISE NOTICE '- get_guild_expansions(guild_id)';
  RAISE NOTICE '========================================';
END $$;

-- =====================================================
-- ADD RAID SCHEDULE TO EXPANSIONS
-- =====================================================
-- This migration adds raid schedule settings to expansions:
-- - raid_days_per_week: how many days the guild raids
-- - first_raid_day through fifth_raid_day: which days (0=Sunday, 6=Saturday)
-- =====================================================

BEGIN;

-- Add raid schedule columns to expansions table
ALTER TABLE expansions
  ADD COLUMN IF NOT EXISTS raid_days_per_week INTEGER DEFAULT 2,
  ADD COLUMN IF NOT EXISTS first_raid_day INTEGER DEFAULT 2,  -- Tuesday
  ADD COLUMN IF NOT EXISTS second_raid_day INTEGER DEFAULT 4, -- Thursday
  ADD COLUMN IF NOT EXISTS third_raid_day INTEGER,
  ADD COLUMN IF NOT EXISTS fourth_raid_day INTEGER,
  ADD COLUMN IF NOT EXISTS fifth_raid_day INTEGER;

-- Add comments
COMMENT ON COLUMN expansions.raid_days_per_week IS 'Number of raid days per week for this expansion (1-5)';
COMMENT ON COLUMN expansions.first_raid_day IS 'First raid day of the week (0=Sunday, 1=Monday, ..., 6=Saturday)';
COMMENT ON COLUMN expansions.second_raid_day IS 'Second raid day of the week, nullable';
COMMENT ON COLUMN expansions.third_raid_day IS 'Third raid day of the week, nullable';
COMMENT ON COLUMN expansions.fourth_raid_day IS 'Fourth raid day of the week, nullable';
COMMENT ON COLUMN expansions.fifth_raid_day IS 'Fifth raid day of the week, nullable';

-- Add check constraints
ALTER TABLE expansions
  ADD CONSTRAINT chk_raid_days_per_week CHECK (raid_days_per_week >= 1 AND raid_days_per_week <= 5),
  ADD CONSTRAINT chk_first_raid_day CHECK (first_raid_day >= 0 AND first_raid_day <= 6),
  ADD CONSTRAINT chk_second_raid_day CHECK (second_raid_day IS NULL OR (second_raid_day >= 0 AND second_raid_day <= 6)),
  ADD CONSTRAINT chk_third_raid_day CHECK (third_raid_day IS NULL OR (third_raid_day >= 0 AND third_raid_day <= 6)),
  ADD CONSTRAINT chk_fourth_raid_day CHECK (fourth_raid_day IS NULL OR (fourth_raid_day >= 0 AND fourth_raid_day <= 6)),
  ADD CONSTRAINT chk_fifth_raid_day CHECK (fifth_raid_day IS NULL OR (fifth_raid_day >= 0 AND fifth_raid_day <= 6));

-- Drop and recreate get_guild_expansions function to return these new columns
DROP FUNCTION IF EXISTS get_guild_expansions(UUID);
CREATE OR REPLACE FUNCTION get_guild_expansions(p_guild_id UUID)
RETURNS TABLE (
  expansion_id UUID,
  expansion_name VARCHAR,
  raid_start_date DATE,
  is_current BOOLEAN,
  created_at TIMESTAMPTZ,
  raid_days_per_week INTEGER,
  first_raid_day INTEGER,
  second_raid_day INTEGER,
  third_raid_day INTEGER,
  fourth_raid_day INTEGER,
  fifth_raid_day INTEGER
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
    e.created_at,
    e.raid_days_per_week,
    e.first_raid_day,
    e.second_raid_day,
    e.third_raid_day,
    e.fourth_raid_day,
    e.fifth_raid_day
  FROM expansions e
  WHERE e.guild_id = p_guild_id
  ORDER BY e.created_at ASC;
END;
$$;

COMMIT;

-- Confirmation
DO $$
BEGIN
  RAISE NOTICE 'Raid schedule columns added to expansions table';
  RAISE NOTICE 'get_guild_expansions function updated to return schedule';
END $$;

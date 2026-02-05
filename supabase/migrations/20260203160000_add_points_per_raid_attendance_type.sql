-- =====================================================
-- Add 'points-per-raid' as a valid attendance_type
-- =====================================================
-- This model gives flat points per raid action:
-- - Default: 0.75 pts per attended raid
-- - Default: 0.25 pts per signup
-- - Each raid contributes up to 1.0 points total
-- - Capped at max_attendance_bonus
-- =====================================================

-- Update the CHECK constraint on guild_settings to include the new type
-- First drop the existing constraint, then add the new one
DO $$
BEGIN
  -- Check if the constraint exists and drop it
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'guild_settings_attendance_type_check'
  ) THEN
    ALTER TABLE guild_settings
    DROP CONSTRAINT guild_settings_attendance_type_check;
  END IF;

  -- Add the updated constraint with points-per-raid option
  ALTER TABLE guild_settings
  ADD CONSTRAINT guild_settings_attendance_type_check
  CHECK (attendance_type IN ('linear', 'breakpoint', 'points-per-raid'));
END $$;

-- Confirmation
DO $$
BEGIN
  RAISE NOTICE '======================================';
  RAISE NOTICE 'Added points-per-raid attendance type!';
  RAISE NOTICE 'Options: linear, breakpoint, points-per-raid';
  RAISE NOTICE '======================================';
END $$;

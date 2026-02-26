-- Change default attendance_type from 'linear' to 'points-per-raid'
-- Points-per-raid gives 1 flat point per attended raid (0.75 attend + 0.25 signup)
-- which is more intuitive than the linear percentage-based model.

-- Update existing guilds that were using the old default
UPDATE guild_settings
SET attendance_type = 'points-per-raid'
WHERE attendance_type = 'linear';

-- Change the column default for new guilds
ALTER TABLE guild_settings
  ALTER COLUMN attendance_type SET DEFAULT 'points-per-raid';

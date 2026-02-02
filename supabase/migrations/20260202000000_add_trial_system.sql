-- Add trial system columns to character_guild_memberships
ALTER TABLE character_guild_memberships
  ADD COLUMN IF NOT EXISTS membership_status VARCHAR(20) DEFAULT 'full';

ALTER TABLE character_guild_memberships
  ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ;

ALTER TABLE character_guild_memberships
  ADD COLUMN IF NOT EXISTS promoted_at TIMESTAMPTZ;

-- Add check constraint for membership_status
ALTER TABLE character_guild_memberships
  ADD CONSTRAINT membership_status_check
  CHECK (membership_status IN ('trial', 'full'));

-- Create index for efficient filtering by membership status
CREATE INDEX IF NOT EXISTS idx_char_guild_membership_status
  ON character_guild_memberships(membership_status);

-- Backfill: Set all existing memberships to 'full' status with promoted_at = joined_at
UPDATE character_guild_memberships
SET
  membership_status = 'full',
  promoted_at = joined_at
WHERE membership_status IS NULL;

-- Add trial settings columns to guild_settings
ALTER TABLE guild_settings
  ADD COLUMN IF NOT EXISTS trial_penalty_enabled BOOLEAN DEFAULT false;

ALTER TABLE guild_settings
  ADD COLUMN IF NOT EXISTS trial_penalty_value NUMERIC(4,2) DEFAULT -2.0;

ALTER TABLE guild_settings
  ADD COLUMN IF NOT EXISTS trial_auto_promote_enabled BOOLEAN DEFAULT false;

ALTER TABLE guild_settings
  ADD COLUMN IF NOT EXISTS trial_auto_promote_weeks INTEGER DEFAULT 4;

ALTER TABLE guild_settings
  ADD COLUMN IF NOT EXISTS new_members_start_as_trial BOOLEAN DEFAULT false;

-- Add new_member_mode setting to guild_settings
-- Controls how new members' attendance is calculated for loot priority

-- Add the column with default 'raw' for backwards compatibility
ALTER TABLE guild_settings
ADD COLUMN IF NOT EXISTS new_member_mode TEXT DEFAULT 'raw';

-- Add check constraint for valid values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'guild_settings_new_member_mode_check'
  ) THEN
    ALTER TABLE guild_settings
    ADD CONSTRAINT guild_settings_new_member_mode_check
    CHECK (new_member_mode IN ('raw', 'fair', 'minimum_gate'));
  END IF;
END $$;

-- Add comment explaining the options
COMMENT ON COLUMN guild_settings.new_member_mode IS
'Controls new member loot eligibility:
- raw: Score calculated against full rolling window (new members have lower scores)
- fair: Score only counts raids since member joined guild
- minimum_gate: Members must attend minimum_raid_days before eligible for loot';

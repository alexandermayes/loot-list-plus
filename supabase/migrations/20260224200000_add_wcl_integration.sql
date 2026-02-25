-- Add Warcraft Logs integration fields.
-- wcl_guild_url: the guild's WCL page URL (configured in guild settings)
-- wcl_report_code: the WCL report code linked to a specific raid event

ALTER TABLE guild_settings
  ADD COLUMN IF NOT EXISTS wcl_guild_url TEXT DEFAULT NULL;

ALTER TABLE raid_events
  ADD COLUMN IF NOT EXISTS wcl_report_code TEXT DEFAULT NULL;

ALTER TABLE guild_settings
  ADD COLUMN IF NOT EXISTS raid_summary_channel_id TEXT DEFAULT NULL;

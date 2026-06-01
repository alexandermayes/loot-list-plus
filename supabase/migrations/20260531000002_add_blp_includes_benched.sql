-- BLP: optionally accrue Bad Luck Protection for benched raiders.
-- When enabled, a raider who was benched (showed up, in the pool, but sat by
-- officers) accrues a BLP point when an item they ranked drops and they don't
-- win it, same as if they had attended. Off by default to preserve existing
-- behavior (only actual attendees accrue BLP).

ALTER TABLE guild_settings
  ADD COLUMN IF NOT EXISTS blp_includes_benched BOOLEAN DEFAULT false;

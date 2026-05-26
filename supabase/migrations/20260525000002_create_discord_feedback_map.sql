-- Migration: Create discord_feedback_map dedupe table
--
-- The LootList+ Discord bot watches a feedback channel and a reaction emoji
-- in any channel. Each captured message becomes a GitHub Issue. This table
-- stores the mapping so that:
--   1. We never file the same Discord message twice (bot restarts, retries,
--      reaction added after message is already filed via channel listener).
--   2. The daily digest cron can backfill messages the bot missed while
--      offline by scanning channel history and skipping anything already
--      mapped here.
--
-- The bot writes with the service role key. No RLS policies needed since
-- this table is bot-only and never read from the client.

CREATE TABLE IF NOT EXISTS discord_feedback_map (
  discord_message_id TEXT PRIMARY KEY,
  discord_channel_id TEXT NOT NULL,
  discord_guild_id TEXT NOT NULL,
  github_issue_number INTEGER NOT NULL,
  github_repo TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('channel', 'reaction')),
  triggered_by_discord_id TEXT,
  author_discord_id TEXT NOT NULL,
  author_display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE discord_feedback_map IS
  'Maps Discord message IDs to GitHub issue numbers filed by the LootList+ feedback bot. Used for dedupe and daily digest backfill.';

COMMENT ON COLUMN discord_feedback_map.source IS
  'How the message was captured: "channel" = posted in the watched feedback channel, "reaction" = officer reacted with the trigger emoji.';

COMMENT ON COLUMN discord_feedback_map.triggered_by_discord_id IS
  'For reaction-sourced rows, the Discord user ID of the officer who reacted. NULL for channel-sourced rows.';

-- Digest cron groups by created_at to count "filed today"
CREATE INDEX IF NOT EXISTS idx_discord_feedback_map_created
  ON discord_feedback_map (created_at DESC);

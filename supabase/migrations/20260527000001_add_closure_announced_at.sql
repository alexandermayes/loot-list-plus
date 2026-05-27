-- Migration: Track when a closure has been announced back to Discord
--
-- The feedback bot runs a 10-minute sweep that looks up recently-closed
-- discord-source issues on GitHub and posts a follow-up in the original
-- Discord thread. This column prevents double-announcements when a sweep
-- sees the same closed issue twice.

ALTER TABLE discord_feedback_map
  ADD COLUMN closure_announced_at TIMESTAMPTZ;

COMMENT ON COLUMN discord_feedback_map.closure_announced_at IS
  'Set the moment the bot posts the closure follow-up in the original Discord thread. NULL means the close has not been announced yet (or the issue is still open).';

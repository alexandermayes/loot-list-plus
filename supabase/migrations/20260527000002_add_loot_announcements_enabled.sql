-- Migration: Per-guild toggle for Discord loot-award announcements
--
-- When a guild has a linked Discord server and a raid_summary_channel_id,
-- the loot-award endpoints fire a post to that channel announcing what
-- was awarded. This column lets officers turn that off without unlinking
-- their server or removing the channel setting.
--
-- Default true so guilds that already configured raid summary posts also
-- start getting per-item award announcements when this ships.

ALTER TABLE guild_settings
  ADD COLUMN loot_announcements_enabled BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN guild_settings.loot_announcements_enabled IS
  'When true and raid_summary_channel_id + guilds.discord_server_id are set, the loot-award endpoints post an embed to Discord for each award (or one batched embed for bulk imports).';

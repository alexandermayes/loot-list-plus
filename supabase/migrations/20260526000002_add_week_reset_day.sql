-- =============================================================================
-- Week reset day (WoW raid lockout reset)
-- -----------------------------------------------------------------------------
-- Anchors the attendance "reset week" to a configurable day of week so that
-- in-progress raid days don't shift loot priorities mid-evening.
--
-- The attendance engine treats the current reset week as in-progress: events
-- from that week are excluded from scoring until the next reset, giving
-- officers a buffer to finish entering attendance without affecting prios.
--
-- 0 = Sunday, 6 = Saturday. Default 2 (Tuesday = NA reset).
-- =============================================================================

ALTER TABLE guild_settings
  ADD COLUMN IF NOT EXISTS week_reset_day SMALLINT NOT NULL DEFAULT 2;

ALTER TABLE guild_settings
  ADD CONSTRAINT chk_week_reset_day
    CHECK (week_reset_day BETWEEN 0 AND 6);

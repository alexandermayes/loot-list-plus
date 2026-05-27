-- =============================================================================
-- Weekly attendance minimum
-- -----------------------------------------------------------------------------
-- Adds a threshold for how many raids per week count as full weekly credit.
-- When a raider attends >= weekly_attendance_minimum raids in a calendar week,
-- the week's denominator (and numerator contribution) is capped at the
-- minimum, effectively granting them full credit for that week.
--
-- NULL = disabled, defaults to the team's effective raid_days_per_week
-- (preserves current behavior).
--
-- Applied at use sites via min(setting, effective_raid_days_per_week) so
-- teams with shorter schedules naturally clamp.
-- =============================================================================

ALTER TABLE guild_settings
  ADD COLUMN IF NOT EXISTS weekly_attendance_minimum INTEGER;

ALTER TABLE guild_settings
  ADD CONSTRAINT chk_weekly_attendance_minimum
    CHECK (weekly_attendance_minimum IS NULL OR weekly_attendance_minimum BETWEEN 1 AND 7);

-- =============================================================================
-- LootList+ Donations: settings columns
-- -----------------------------------------------------------------------------
-- Existing columns (already on guild_settings):
--   donation_bonuses_enabled  BOOLEAN   — master toggle
--   donation_cap_enabled      BOOLEAN   — whether to cap the sum
--   donation_bonus_type       TEXT      — permanent | rolling | hard-reset
--
-- New columns this migration adds:
--   donation_cap_points       NUMERIC   — the actual cap value (boolean alone unusable)
--   donation_rolling_weeks    INTEGER   — window for rolling decay (nullable, falls
--                                         back to rolling_attendance_weeks)
--   donation_reset_at         DATE      — anchor date for hard-reset mode (NULL = no reset yet)
-- =============================================================================

ALTER TABLE guild_settings
  ADD COLUMN IF NOT EXISTS donation_cap_points NUMERIC(6, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS donation_rolling_weeks INTEGER,
  ADD COLUMN IF NOT EXISTS donation_reset_at DATE;

ALTER TABLE guild_settings
  ADD CONSTRAINT chk_donation_cap_points
    CHECK (donation_cap_points BETWEEN 0 AND 1000),
  ADD CONSTRAINT chk_donation_rolling_weeks
    CHECK (donation_rolling_weeks IS NULL OR donation_rolling_weeks BETWEEN 1 AND 52);

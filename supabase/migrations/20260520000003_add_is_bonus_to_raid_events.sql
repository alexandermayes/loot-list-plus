-- Migration: Add is_bonus flag to raid_events
--
-- Bonus raid events are officer-created off-schedule raids (e.g., a Saturday
-- bonus pull when the team normally raids Tue/Thu). They count toward
-- attendance scoring identically to scheduled events but bypass the
-- day-of-week filter in domain/scoring/attendance.ts.
--
-- Default false keeps all existing rows behaving exactly as before.

ALTER TABLE raid_events
  ADD COLUMN is_bonus BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN raid_events.is_bonus IS
  'True for officer-created off-schedule (bonus) raids. Bonus events count toward attendance scoring like scheduled events but bypass the day-of-week filter.';

-- Partial index: most queries won't care about bonus events, but the
-- raid-tracking UI needs to surface them per team, and master sheet needs
-- to include them in the engine. Keep the index narrow.
CREATE INDEX IF NOT EXISTS idx_raid_events_guild_bonus
  ON raid_events (guild_id, raid_date)
  WHERE is_bonus = TRUE;

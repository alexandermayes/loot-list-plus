-- Add schedule_history to raid_teams for tracking when raid days changed.
-- NULL = no history (backward compat: current schedule treated as always-active).
-- Format: [{ "days": [1, 3], "effective_from": "2026-03-01" }, ...]
ALTER TABLE raid_teams ADD COLUMN schedule_history JSONB;

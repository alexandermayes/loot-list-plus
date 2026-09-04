-- metric-id: attendance-weighting
-- label: Share of active guilds whose attendance configuration differs from the shipped defaults
-- columns: guilds_with_tuned_attendance,active_guilds
-- window: 2026-06-01..2026-08-31
--
-- Pitfall 3: guild_settings.attendance_type is a required (non-null)
-- column whose shipped application default is 'points-per-raid' with a
-- nonzero max_attendance_bonus (domain/scoring/defaults.ts). A presence
-- check on attendance_type would return effectively every guild and would
-- say nothing. This query instead counts a guild as "tuned" only when at
-- least one of its seven confirmed guild_settings attendance columns
-- differs from the shipped default:
--   attendance_type <> 'points-per-raid'
--   max_attendance_bonus <> 4
--   max_attendance_threshold <> 0.9
--   middle_attendance_bonus <> 2
--   middle_attendance_threshold <> 0.5
--   bottom_attendance_bonus <> 1
--   bottom_attendance_threshold <> 0.25
-- A guild with no guild_settings row is treated as not tuned -- it is
-- still running the shipped defaults by construction.
--
-- The active-guild CTE below is the identical OR-definition every query in
-- this report reuses (at least one non-skipped raid, OR one loot award, OR
-- five approved lists in the window), inlined here because the Management
-- API executes one statement at a time.

WITH active_guilds AS (
  SELECT DISTINCT g.id AS guild_id
  FROM guilds g
  WHERE g.id IS NOT NULL
    AND (
      EXISTS (
        SELECT 1
        FROM raid_events re
        WHERE re.guild_id = g.id
          AND COALESCE(re.is_skipped, false) = false
          AND re.raid_date >= DATE '2026-06-01'
          AND re.raid_date < DATE '2026-08-31' + INTERVAL '1 day'
      )
      OR EXISTS (
        SELECT 1
        FROM loot_history lh
        WHERE lh.guild_id = g.id
          AND lh.awarded_date >= DATE '2026-06-01'
          AND lh.awarded_date < DATE '2026-08-31' + INTERVAL '1 day'
      )
      OR (
        SELECT COUNT(*)
        FROM loot_submissions ls
        WHERE ls.guild_id = g.id
          AND ls.status = 'approved'
          AND COALESCE(ls.reviewed_at, ls.submitted_at) >= DATE '2026-06-01'
          AND COALESCE(ls.reviewed_at, ls.submitted_at) < DATE '2026-08-31' + INTERVAL '1 day'
      ) >= 5
    )
)
SELECT
  COUNT(*) FILTER (
    WHERE gs.guild_id IS NOT NULL
      AND (
        gs.attendance_type IS DISTINCT FROM 'points-per-raid'
        OR gs.max_attendance_bonus IS DISTINCT FROM 4
        OR gs.max_attendance_threshold IS DISTINCT FROM 0.9
        OR gs.middle_attendance_bonus IS DISTINCT FROM 2
        OR gs.middle_attendance_threshold IS DISTINCT FROM 0.5
        OR gs.bottom_attendance_bonus IS DISTINCT FROM 1
        OR gs.bottom_attendance_threshold IS DISTINCT FROM 0.25
      )
  ) AS guilds_with_tuned_attendance,
  (SELECT COUNT(*) FROM active_guilds) AS active_guilds
FROM active_guilds ag
LEFT JOIN guild_settings gs ON gs.guild_id = ag.guild_id;

-- metric-id: blp-usage
-- label: Percentage of active guilds using bad-luck protection
-- columns: guilds_with_blp,active_guilds
-- window: 2026-06-01..2026-08-31
--
-- guild_settings.blp_enabled is a real opt-in boolean (default false in
-- domain/scoring/defaults.ts; a guild must actively turn it on), unlike
-- attendance_type, so this is safe to compute as a direct presence/true
-- check with no threshold argument needed (contrast with Pitfall 3 in
-- 03-attendance-weighting.sql).
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
  COUNT(*) FILTER (WHERE gs.blp_enabled IS TRUE) AS guilds_with_blp,
  (SELECT COUNT(*) FROM active_guilds) AS active_guilds
FROM active_guilds ag
LEFT JOIN guild_settings gs ON gs.guild_id = ag.guild_id;

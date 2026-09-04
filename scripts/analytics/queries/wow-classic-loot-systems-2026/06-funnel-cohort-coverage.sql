-- metric-id: funnel-cohort-coverage
-- label: Active guilds created on or after the funnel-instrumentation date (support measurement, not a finding)
-- columns: active_guilds_created_after_instrumentation,active_guilds
-- window: 2026-06-01..2026-08-31
--
-- Pitfall 1: guild_funnel_milestones (qualified_at/activated_at) shipped
-- via migration 20260827000000, four days before this report's window
-- closes (2026-08-31) and about three months after it opens (2026-06-01).
-- The evaluator (utils/analytics/funnel.ts) only stamps a column with the
-- time it happens to re-run and observe the condition newly true, not the
-- historical time the condition became true, so a guild that qualified or
-- activated before 2026-08-27 carries a timestamp reflecting an incidental
-- later mutation. This query puts a real, measured number behind that
-- grey-out reason instead of an assumption: it counts how many active
-- guilds (by this report's own D-13 definition) were created on or after
-- the instrumentation date, out of all active guilds. This is a support
-- measurement (kind: support in metrics.json) -- it is evidence for the
-- time-to-qualified/time-to-activated grey-out reasons, never a pickable
-- finding on its own.
--
-- The active-guild CTE below is the identical OR-definition every query in
-- this report reuses (at least one non-skipped raid, OR one loot award, OR
-- five approved lists in the window), inlined here because the Management
-- API executes one statement at a time.

WITH active_guilds AS (
  SELECT DISTINCT g.id AS guild_id, g.created_at
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
  COUNT(*) FILTER (WHERE created_at >= DATE '2026-08-27') AS active_guilds_created_after_instrumentation,
  COUNT(*) AS active_guilds
FROM active_guilds;

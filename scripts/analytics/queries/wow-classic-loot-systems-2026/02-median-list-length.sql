-- metric-id: median-list-length
-- label: Median list length
-- columns: median_list_length,lists_measured
-- window: 2026-06-01..2026-08-31
--
-- Counts only non-removed items (removed_at IS NULL) per approved list: a
-- list whose owner deleted five entries has the length the owner kept, not
-- the length they ever typed. Measured over loot_submissions rows
-- belonging to an active guild with status = 'approved' and
-- COALESCE(reviewed_at, submitted_at) inside the window, matching the
-- window rule every other query in this report uses.
--
-- percentile_cont was confirmed to execute through the Management API
-- endpoint in plan 03-01 (SUMMARY: "Confirmed percentile_cont works
-- through the Management API endpoint with a trivial live query").
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
),
approved_lists AS (
  SELECT ls.id AS submission_id
  FROM loot_submissions ls
  JOIN active_guilds ag ON ag.guild_id = ls.guild_id
  WHERE ls.status = 'approved'
    AND COALESCE(ls.reviewed_at, ls.submitted_at) >= DATE '2026-06-01'
    AND COALESCE(ls.reviewed_at, ls.submitted_at) < DATE '2026-08-31' + INTERVAL '1 day'
),
list_lengths AS (
  SELECT al.submission_id, COUNT(lsi.id) AS item_count
  FROM approved_lists al
  LEFT JOIN loot_submission_items lsi
    ON lsi.submission_id = al.submission_id
    AND lsi.removed_at IS NULL
  GROUP BY al.submission_id
)
SELECT
  percentile_cont(0.5) WITHIN GROUP (ORDER BY item_count) AS median_list_length,
  COUNT(*) AS lists_measured
FROM list_lengths;

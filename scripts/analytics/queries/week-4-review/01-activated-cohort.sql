-- metric-id: activated-7d
-- label: Guilds activated within 7 days of creation, per weekly creation cohort, recomputed from source rows
-- columns: cohort,guilds_created,activated_7d
-- window: 2026-08-24..2026-08-30,2026-09-18..2026-09-24
--
-- D-02: this headline metric is recomputed from source rows only, never
-- from the funnel-instrumentation table that records when its own
-- evaluator (utils/analytics/funnel.ts) last re-observed a guild's
-- activation condition. That table's stamp reflects the incidental
-- moment of a later re-run, not the moment the condition actually became
-- true, so it cannot be trusted for a fixed 7-day window measured from
-- each guild's own created_at. This query reconstructs the same
-- condition directly from the rows that define it.
--
-- Raid activity is checked as existence-only: any attendance_records row
-- joined to one of the guild's raid_events rows, with no filter on
-- attended, excused, signed_up or is_skipped -- exactly what the live
-- evaluator checks, and nothing stricter. Loot activity is likewise
-- existence-only against loot_history.
--
-- Every activity row is bounded by its own insertion timestamp
-- (COALESCE(created_at, <business-date column>::timestamptz)) rather
-- than its business date alone, so a later re-run of this query cannot
-- count a row that was backdated into the window after the fact; a
-- business-date bound alone would not catch that.
--
-- Cohorts: baseline is guilds created 2026-08-24 through 2026-08-30
-- inclusive (UTC), week4 is guilds created 2026-09-18 through 2026-09-24
-- inclusive (UTC). Both bounds are written as an inclusive lower bound
-- and a strictly-less-than upper bound one day past the last day, so a
-- guild created at 23:59 on the last day counts and one created at
-- 00:00 the next day does not.

WITH cohort_guilds AS (
  SELECT guild_id, created_at, cohort
  FROM (
    SELECT
      g.id AS guild_id,
      g.created_at,
      CASE
        WHEN g.created_at >= TIMESTAMPTZ '2026-08-24 00:00:00+00'
         AND g.created_at <  TIMESTAMPTZ '2026-08-30 00:00:00+00' + INTERVAL '1 day'
          THEN 'baseline'
        WHEN g.created_at >= TIMESTAMPTZ '2026-09-18 00:00:00+00'
         AND g.created_at <  TIMESTAMPTZ '2026-09-24 00:00:00+00' + INTERVAL '1 day'
          THEN 'week4'
      END AS cohort
    FROM guilds g
  ) labeled
  WHERE cohort IS NOT NULL
),
activation AS (
  SELECT
    cg.guild_id,
    cg.cohort,
    (
      (
        SELECT COUNT(DISTINCT ls.character_id)
        FROM loot_submissions ls
        WHERE ls.guild_id = cg.guild_id
          AND ls.status = 'approved'
          AND COALESCE(ls.reviewed_at, ls.submitted_at) <= cg.created_at + INTERVAL '7 days'
      ) >= 5
      AND (
        EXISTS (
          SELECT 1
          FROM attendance_records ar
          JOIN raid_events re ON re.id = ar.raid_event_id
          WHERE re.guild_id = cg.guild_id
            AND COALESCE(ar.created_at, re.raid_date::timestamptz) <= cg.created_at + INTERVAL '7 days'
        )
        OR EXISTS (
          SELECT 1
          FROM loot_history lh
          WHERE lh.guild_id = cg.guild_id
            AND COALESCE(lh.created_at, lh.awarded_date::timestamptz) <= cg.created_at + INTERVAL '7 days'
        )
      )
    ) AS activated
  FROM cohort_guilds cg
)
SELECT
  v.cohort,
  COUNT(a.guild_id)::int AS guilds_created,
  COUNT(*) FILTER (WHERE a.activated)::int AS activated_7d
FROM (VALUES ('baseline'), ('week4')) AS v(cohort)
LEFT JOIN activation a ON a.cohort = v.cohort
GROUP BY v.cohort
ORDER BY CASE v.cohort WHEN 'baseline' THEN 1 WHEN 'week4' THEN 2 END;

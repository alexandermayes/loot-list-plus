-- metric-id: qualified-7d-proxy
-- label: Guilds qualified within 7 days of creation, per weekly creation cohort, as a conservative lower and upper bound proxy
-- columns: cohort,guilds_created,qualified_7d_lower_bound,qualified_7d_upper_bound
-- window: 2026-08-24..2026-08-30,2026-09-18..2026-09-24
--
-- D-02/D-03: this secondary metric is deliberately a proxy, not a precise
-- count, and must never be presented with the same precision as the
-- activated headline. guilds.active_expansion_id has no per-column
-- timestamp, so the moment a guild set its active expansion cannot be
-- pinned and is instead read at its current value (a creation-time proxy
-- true for nearly every guild). guild_settings.updated_at is bumped by a
-- whole-row trigger on a write to any column of that row, so it cannot
-- distinguish "the raid schedule was configured on day 3" from "some
-- unrelated setting was touched on day 40" -- the single stamp does not
-- tell us which column changed or when the schedule fields specifically
-- became true.
--
-- Because of that, qualification is reported as a lower and upper bound
-- rather than one number. Both bounds share the same base condition
-- (current active expansion set, at least 5 active-or-not memberships
-- joined within 7 days, current raid schedule fields both set). The
-- lower bound additionally requires the settings row's own last-write
-- stamp to fall within the 7-day window, which undercounts any guild
-- that touched its settings again after day 7. The upper bound omits
-- that requirement, which overcounts any guild whose schedule was
-- actually configured after day 7. The true 7-day qualified count lies
-- somewhere between the two, and is never collapsed to a single figure.
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
qualification AS (
  SELECT
    cg.guild_id,
    cg.cohort,
    (
      g.active_expansion_id IS NOT NULL
      AND (
        SELECT COUNT(*)
        FROM character_guild_memberships cgm
        WHERE cgm.guild_id = cg.guild_id
          AND cgm.joined_at <= cg.created_at + INTERVAL '7 days'
      ) >= 5
      AND gs.raid_days_per_week > 0
      AND gs.first_raid_day IS NOT NULL
    ) AS qualifies_base,
    (gs.updated_at <= cg.created_at + INTERVAL '7 days') AS settings_touched_within_7d
  FROM cohort_guilds cg
  JOIN guilds g ON g.id = cg.guild_id
  LEFT JOIN guild_settings gs ON gs.guild_id = cg.guild_id
)
SELECT
  v.cohort,
  COUNT(q.guild_id)::int AS guilds_created,
  COUNT(*) FILTER (WHERE q.qualifies_base AND q.settings_touched_within_7d)::int AS qualified_7d_lower_bound,
  COUNT(*) FILTER (WHERE q.qualifies_base)::int AS qualified_7d_upper_bound
FROM (VALUES ('baseline'), ('week4')) AS v(cohort)
LEFT JOIN qualification q ON q.cohort = v.cohort
GROUP BY v.cohort
ORDER BY CASE v.cohort WHEN 'baseline' THEN 1 WHEN 'week4' THEN 2 END;

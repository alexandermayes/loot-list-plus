-- metric-id: top-bracket-coverage
-- label: Snapshot coverage for the top-priority-bracket metric (support measurement, not a finding)
-- columns: awards_in_window,awards_with_prior_snapshot,active_guilds_with_usable_snapshots
-- window: 2026-06-01..2026-08-31
--
-- RESEARCH.md Assumption A4/Open Question 2 concluded no point-in-time
-- rank snapshot exists and the top-priority-bracket metric is likely
-- uncomputable. That is wrong: loot_submission_snapshots
-- (lib/database.types.ts:1459) is a point-in-time record of a list's
-- items (id, items Json, snapshot_at, submission_id, version). This
-- correction is recorded verbatim in the plan SUMMARY.
--
-- This query only measures coverage -- it never computes the metric
-- itself. For every loot award in the window, it checks whether the
-- winning character has any loot_submissions row in that guild (via
-- loot_history.character_id -> loot_submissions.character_id, matched on
-- guild_id -- never the winner's display name column) whose committed
-- loot_submission_snapshots row predates the award's awarded_date.
--
-- loot_submissions.raid_tier_id is populated on only 6 of 1331 rows
-- [measured live this session], so matching an award to a submission by
-- raid tier would silently exclude nearly every award; this query matches
-- on character + guild only, which over-counts a winner's other
-- submissions in the same guild as "usable" without pinpointing the exact
-- list active at award time. That imprecision is the coverage measure's
-- own limitation, carried into the publish-branch definition_note if the
-- metric ships, and into the withhold reason otherwise.
--
-- Aggregates only:
--   awards_in_window                    -- every loot award in the window
--   awards_with_prior_snapshot          -- of those, how many have a
--                                           snapshot taken before the award
--   active_guilds_with_usable_snapshots -- how many distinct active guilds
--                                           contribute at least one such award
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
awards AS (
  SELECT lh.id AS award_id, lh.guild_id, lh.character_id, lh.awarded_date
  FROM loot_history lh
  JOIN active_guilds ag ON ag.guild_id = lh.guild_id
  WHERE lh.awarded_date >= DATE '2026-06-01'
    AND lh.awarded_date < DATE '2026-08-31' + INTERVAL '1 day'
    AND lh.character_id IS NOT NULL
),
awards_with_prior_snapshot AS (
  SELECT DISTINCT a.award_id, a.guild_id
  FROM awards a
  WHERE EXISTS (
    SELECT 1
    FROM loot_submissions ls
    JOIN loot_submission_snapshots lss ON lss.submission_id = ls.id
    WHERE ls.character_id = a.character_id
      AND ls.guild_id = a.guild_id
      AND lss.snapshot_at < a.awarded_date
  )
)
SELECT
  (SELECT COUNT(*) FROM awards) AS awards_in_window,
  (SELECT COUNT(*) FROM awards_with_prior_snapshot) AS awards_with_prior_snapshot,
  (SELECT COUNT(DISTINCT guild_id) FROM awards_with_prior_snapshot) AS active_guilds_with_usable_snapshots;

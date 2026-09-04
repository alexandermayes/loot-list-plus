-- metric-id: sample-definition
-- label: Active guilds, raid events, loot awards, and raiders with approved lists during the report window
-- columns: active_guilds,raid_events,loot_awards,raiders_with_approved_lists
-- window: 2026-06-01..2026-08-31
--
-- D-13 active-guild OR-definition: a guild qualifies if, during the
-- window, it has at least one non-skipped raid event, OR at least one
-- loot award, OR at least five approved loot lists. Every upper bound is
-- written as strictly-less-than DATE '2026-08-31' + INTERVAL '1 day', so a
-- row dated 2026-08-31 23:59 counts and a row dated 2026-09-01 00:00 does
-- not (EVID-02 boundary), and this keeps the 2026-08-31 literal present
-- in the text for the window guard.
--
-- Planner-resolved edges (both recorded verbatim in the artifact's
-- definitions block so the published methodology states them):
--   - a raid_events row with is_skipped = true is excluded (not a
--     recorded raid);
--   - an approved list counts when
--     COALESCE(reviewed_at, submitted_at) falls inside the window.
--
-- D-15: raiders are counted as distinct characters holding an approved
-- list in the window, with no alt de-duplication.

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
raid_event_count AS (
  SELECT COUNT(*) AS n
  FROM raid_events re
  JOIN active_guilds ag ON ag.guild_id = re.guild_id
  WHERE COALESCE(re.is_skipped, false) = false
    AND re.raid_date >= DATE '2026-06-01'
    AND re.raid_date < DATE '2026-08-31' + INTERVAL '1 day'
),
loot_award_count AS (
  SELECT COUNT(*) AS n
  FROM loot_history lh
  JOIN active_guilds ag ON ag.guild_id = lh.guild_id
  WHERE lh.awarded_date >= DATE '2026-06-01'
    AND lh.awarded_date < DATE '2026-08-31' + INTERVAL '1 day'
),
raider_count AS (
  SELECT COUNT(DISTINCT ls.character_id) AS n
  FROM loot_submissions ls
  JOIN active_guilds ag ON ag.guild_id = ls.guild_id
  WHERE ls.status = 'approved'
    AND ls.character_id IS NOT NULL
    AND COALESCE(ls.reviewed_at, ls.submitted_at) >= DATE '2026-06-01'
    AND COALESCE(ls.reviewed_at, ls.submitted_at) < DATE '2026-08-31' + INTERVAL '1 day'
)
SELECT
  (SELECT COUNT(*) FROM active_guilds)      AS active_guilds,
  (SELECT n FROM raid_event_count)          AS raid_events,
  (SELECT n FROM loot_award_count)          AS loot_awards,
  (SELECT n FROM raider_count)              AS raiders_with_approved_lists;

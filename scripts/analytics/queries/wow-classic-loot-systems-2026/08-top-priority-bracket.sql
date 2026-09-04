-- metric-id: top-priority-bracket
-- label: Share of awarded items that were in the winner's top priority bracket
-- columns: awards_in_top_bracket,awards_measured
-- window: 2026-06-01..2026-08-31
--
-- Ships because 07-top-bracket-coverage.sql measured, live against
-- production, 16 active guilds with at least one usable snapshot (clears
-- the 10-guild floor) and 4292 of 4853 awards in the window (88.5%) with a
-- prior snapshot (clears the 80% coverage bar). Recorded verbatim in the
-- plan SUMMARY alongside the decision.
--
-- For each award, this query takes the winning character's most recent
-- loot_submission_snapshots row whose snapshot_at precedes the award's
-- awarded_date (matched on character_id + guild_id, never the winner's
-- display name column -- see 07-top-bracket-coverage.sql's header for why
-- this does not additionally match on raid_tier_id), reads the awarded
-- loot_item_id's rank out of that snapshot's items jsonb array (each
-- element: rank, slot, loot_item_id, item_name -- confirmed from the
-- writer at app/api/loot-submissions/review/route.ts), and counts the
-- award as top-bracket when that rank is 48, 49, or 50: Bracket 1's fixed
-- rank set from domain/loot/bracket-validation.ts's BRACKET_CONFIG, which
-- is constant across every guild (not derived from any guild_settings
-- column). awards_measured counts only awards where the winning item was
-- actually found, with a rank, in that prior snapshot -- an award whose
-- winner has a prior snapshot but whose awarded item is absent from it
-- (e.g. removed from the list before the award) is not counted in either
-- column, so the published share is a share of awards with a determinable
-- rank, not of every award in the window.
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
  SELECT lh.id AS award_id, lh.guild_id, lh.character_id, lh.loot_item_id, lh.awarded_date
  FROM loot_history lh
  JOIN active_guilds ag ON ag.guild_id = lh.guild_id
  WHERE lh.awarded_date >= DATE '2026-06-01'
    AND lh.awarded_date < DATE '2026-08-31' + INTERVAL '1 day'
    AND lh.character_id IS NOT NULL
),
prior_snapshots AS (
  SELECT
    a.award_id,
    a.loot_item_id,
    lss.items,
    ROW_NUMBER() OVER (PARTITION BY a.award_id ORDER BY lss.snapshot_at DESC) AS rn
  FROM awards a
  JOIN loot_submissions ls
    ON ls.character_id = a.character_id
    AND ls.guild_id = a.guild_id
  JOIN loot_submission_snapshots lss
    ON lss.submission_id = ls.id
    AND lss.snapshot_at < a.awarded_date
),
latest_snapshot AS (
  SELECT award_id, loot_item_id, items
  FROM prior_snapshots
  WHERE rn = 1
),
ranked_awards AS (
  SELECT DISTINCT ON (ls.award_id)
    ls.award_id,
    (item ->> 'rank')::int AS item_rank
  FROM latest_snapshot ls
  CROSS JOIN LATERAL jsonb_array_elements(ls.items) AS item
  WHERE item ->> 'loot_item_id' = ls.loot_item_id::text
  ORDER BY ls.award_id
)
SELECT
  COUNT(*) FILTER (WHERE item_rank IN (48, 49, 50)) AS awards_in_top_bracket,
  COUNT(*) AS awards_measured
FROM ranked_awards;

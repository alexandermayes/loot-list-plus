-- metric-id: expansion-distribution
-- label: Distribution of expansions active guilds raided in
-- columns: expansion,guild_count
-- window: 2026-06-01..2026-08-31
--
-- Pitfall 2/D-14: loot_history.expansion_id is known-unreliable, and
-- expansions itself is guild-scoped (expansions.guild_id), so every guild
-- owns its own expansion rows -- grouping by expansion_id would split one
-- expansion (e.g. "MoP") into as many buckets as there are guilds. This
-- query instead routes raid_events -> raid_tiers -> expansions and groups
-- by expansions.name text, the one name column the forbidden-column guard
-- deliberately allows (it is product taxonomy, not anybody's identity).
-- COUNT(DISTINCT active_guilds.id) de-duplicates a guild that reached the
-- same expansion through two different raid tiers. A guild active in more
-- than one expansion during the window is counted in more than one
-- bucket, so the segment shares do not sum to 100% (D-14).
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
  expansions.name AS expansion,
  COUNT(DISTINCT active_guilds.guild_id) AS guild_count
FROM active_guilds
JOIN raid_events re ON re.guild_id = active_guilds.guild_id
  AND COALESCE(re.is_skipped, false) = false
  AND re.raid_date >= DATE '2026-06-01'
  AND re.raid_date < DATE '2026-08-31' + INTERVAL '1 day'
JOIN raid_tiers ON raid_tiers.id = re.raid_tier_id
JOIN expansions ON expansions.id = raid_tiers.expansion_id
GROUP BY expansions.name
ORDER BY guild_count DESC, expansion ASC;

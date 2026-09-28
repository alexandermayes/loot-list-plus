-- Re-point loot_history awards linked to another guild's catalog rows (GH #289).
--
-- (1) Cause: before #292 (d06516a1), the addon loot-award route (which the
-- companion app also uses) and the import-string route resolved wowhead_id
-- to loot_items on the service-role client with no guild filter, taking the
-- first row. The bulk award route trusts client-supplied ids outright. Every
-- guild has its own catalog copy (loot_items to raid_tiers.expansion_id to
-- expansions.guild_id), so an award could end up linked to another guild's
-- row.
--
-- (2) Why it matters: loot_history.loot_item_id is ON DELETE CASCADE, and the
-- catalog chain cascades from guilds down. If the other guild removes the
-- item, its tier, its expansion or itself, this guild's award is silently
-- deleted. Item-keyed views (history by item, received status, loot-score
-- adjustments) also miss these awards.
--
-- (3) What it does: re-points each mis-linked row, meaning the linked item's
-- expansions.guild_id IS DISTINCT FROM loot_history.guild_id (checked via
-- LEFT JOINs, so a broken tier or expansion chain counts as mis-linked too),
-- to the row guild's own item with the same wowhead_id. Match order: (a) the
-- same raid tier name as the linked item's tier, (b) the same expansion name
-- as the linked item's expansion, (c) the guild's active expansion. The
-- first level with exactly one candidate wins.
--
-- (4) What it leaves alone: rows with no candidate at any level, or with more
-- than one candidate at every level. Rows whose re-point would duplicate an
-- award the guild already has for the same character and raid night
-- (idx_loot_history_unique_award); a unique violation would abort the whole
-- statement and block the deploy pipeline, so these rows are skipped and
-- reported by verification query 2 instead. Every other column, including
-- raid_tier_id and expansion_id, is left untouched, see OD-01 in the pull
-- request. The update_loot_history_updated_at trigger stamps updated_at on
-- every changed row with the migration's own transaction time, that is the
-- trigger's doing, not this statement's.
--
-- (5) Idempotency: a repaired row now links to its own guild's item, so it no
-- longer satisfies the mis-linked definition in "linked". Every row this
-- statement leaves alone depends only on catalog rows and its own columns,
-- none of which this statement changes, so it gets the same outcome on every
-- run. A second run changes zero rows.
--
-- (6) Deploy gate: do not merge this migration until verification query 1
-- has been run in production. If it returns no rows, there is nothing to
-- repair, close #289 without merging.
--
-- (7) app/services/__tests__/relink-cross-guild-loot-history-migration.test.ts
-- locks this statement's shape and the verification queries below, so this
-- file cannot drift from its own contract without the test failing.

WITH linked AS (
  SELECT h.id AS history_id,
         h.guild_id,
         h.character_id,
         h.raid_event_id,
         h.source,
         cur.wowhead_id,
         cur_rt.name AS tier_name,
         cur_e.name AS expansion_name
  FROM public.loot_history h
  JOIN public.loot_items cur ON cur.id = h.loot_item_id
  LEFT JOIN public.raid_tiers cur_rt ON cur_rt.id = cur.raid_tier_id
  LEFT JOIN public.expansions cur_e ON cur_e.id = cur_rt.expansion_id
  WHERE cur_e.guild_id IS DISTINCT FROM h.guild_id
),
candidates AS (
  SELECT l.history_id,
         li.id AS item_id,
         (rt.name = l.tier_name) AS tier_match,
         (e.name = l.expansion_name) AS expansion_match,
         (e.id = g.active_expansion_id) AS active_match
  FROM linked l
  JOIN public.guilds g ON g.id = l.guild_id
  JOIN public.expansions e ON e.guild_id = l.guild_id
  JOIN public.raid_tiers rt ON rt.expansion_id = e.id
  JOIN public.loot_items li ON li.raid_tier_id = rt.id AND li.wowhead_id = l.wowhead_id
),
level_counts AS (
  SELECT history_id,
         count(*) AS candidate_n,
         count(*) FILTER (WHERE tier_match) AS tier_n,
         count(*) FILTER (WHERE expansion_match) AS expansion_n,
         count(*) FILTER (WHERE active_match) AS active_n
  FROM candidates
  GROUP BY history_id
),
chosen AS (
  SELECT c.history_id, c.item_id
  FROM candidates c
  JOIN level_counts n ON n.history_id = c.history_id
  WHERE (n.tier_n = 1 AND c.tier_match)
     OR (n.tier_n <> 1 AND n.expansion_n = 1 AND c.expansion_match)
     OR (n.tier_n <> 1 AND n.expansion_n <> 1 AND n.active_n = 1 AND c.active_match)
),
targets AS (
  SELECT ch.history_id, ch.item_id, l.guild_id, l.character_id, l.raid_event_id,
         count(*) OVER (PARTITION BY l.guild_id, ch.item_id, l.character_id, l.raid_event_id) AS same_target_n
  FROM chosen ch
  JOIN linked l ON l.history_id = ch.history_id
),
safe AS (
  SELECT t.history_id, t.item_id
  FROM targets t
  WHERE t.character_id IS NULL
     OR t.raid_event_id IS NULL
     OR (t.same_target_n = 1
         AND NOT EXISTS (
           SELECT 1 FROM public.loot_history k
           WHERE k.guild_id = t.guild_id
             AND k.loot_item_id = t.item_id
             AND k.character_id = t.character_id
             AND k.raid_event_id = t.raid_event_id))
)
UPDATE public.loot_history lh
SET loot_item_id = s.item_id
FROM safe s
WHERE lh.id = s.history_id;

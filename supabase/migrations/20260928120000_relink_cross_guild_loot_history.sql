-- Re-point loot_history awards linked to another guild's catalog rows (GH #289).
--
-- (1) Cause: before #292 (d06516a1), the addon loot-award route (which the
-- companion app also uses) and the import-string route resolved wowhead_id
-- to loot_items on the service-role client with no guild filter, taking the
-- first row. The bulk award route trusts client-supplied ids outright, and
-- it also copies raid_tier_id and derives expansion_id straight from
-- whatever loot_item_id it was given. Every guild has its own catalog copy
-- (loot_items to raid_tiers.expansion_id to expansions.guild_id), so an
-- award could end up with loot_item_id, raid_tier_id and expansion_id each
-- independently pointing at another guild's rows.
--
-- (2) Why it matters: loot_history.loot_item_id and loot_history.raid_tier_id
-- are both ON DELETE CASCADE, and the catalog chain cascades from guilds
-- down. If the other guild removes the item, the tier, the expansion or
-- itself, this guild's award is silently deleted, whether the foreign link
-- is on loot_item_id or on raid_tier_id. Item-keyed views (history by item,
-- received status, loot-score adjustments) also miss these awards.
--
-- (3) What it does (OD-01, decided, all three columns): a row is mis-linked
-- when any of the following belongs to another guild: (a) the linked item's
-- own expansion, (b) the row's own raid_tier_id's expansion, or (c) the
-- row's own expansion_id. For a mis-linked row whose item is itself the
-- foreign part, the statement finds the row guild's own item with the same
-- wowhead_id, using this match order: same raid tier name as the linked
-- item's tier, then same expansion name as the linked item's expansion,
-- then the guild's active expansion. The first level with exactly one
-- candidate wins. For a mis-linked row whose item is already the guild's
-- own (only raid_tier_id or expansion_id is foreign), no candidate search
-- is needed: the chosen item is the row's own current item. Either way, the
-- statement re-points loot_item_id, raid_tier_id and expansion_id together,
-- all three taken from the one chosen item (its own raid_tier_id, and that
-- tier's own expansion_id), so the three columns can never disagree with
-- each other afterward.
--
-- (4) What it leaves alone: rows with no candidate at any level, or with
-- more than one candidate at every level (only possible when the item
-- itself is mis-linked). Rows whose re-point would duplicate an award the
-- guild already has for the same character and raid night
-- (idx_loot_history_unique_award); a unique violation would abort the whole
-- statement and block the deploy pipeline, so these rows are skipped and
-- reported by verification query 2 instead. Every other column is left
-- untouched. The update_loot_history_updated_at trigger stamps updated_at
-- on every changed row with the migration's own transaction time, that is
-- the trigger's doing, not this statement's.
--
-- (5) Idempotency: a repaired row's loot_item_id, raid_tier_id and
-- expansion_id all now belong to its own guild and agree with each other,
-- so none of the three "linked" conditions can be true for it again. Every
-- row this statement leaves alone depends only on catalog rows and its own
-- columns, none of which this statement changes, so it gets the same
-- outcome on every run. A second run changes zero rows.
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
         h.loot_item_id AS cur_item_id,
         cur.wowhead_id,
         cur_rt.name AS tier_name,
         cur_e.name AS expansion_name,
         (cur_e.guild_id IS DISTINCT FROM h.guild_id) AS item_mislinked
  FROM public.loot_history h
  JOIN public.loot_items cur ON cur.id = h.loot_item_id
  LEFT JOIN public.raid_tiers cur_rt ON cur_rt.id = cur.raid_tier_id
  LEFT JOIN public.expansions cur_e ON cur_e.id = cur_rt.expansion_id
  LEFT JOIN public.raid_tiers h_rt ON h_rt.id = h.raid_tier_id
  LEFT JOIN public.expansions h_e ON h_e.id = h_rt.expansion_id
  LEFT JOIN public.expansions h_x ON h_x.id = h.expansion_id
  WHERE cur_e.guild_id IS DISTINCT FROM h.guild_id
     OR h_e.guild_id IS DISTINCT FROM h.guild_id
     OR (h.expansion_id IS NOT NULL AND h_x.guild_id IS DISTINCT FROM h.guild_id)
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
  WHERE l.item_mislinked
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
chosen_item AS (
  SELECT c.history_id, c.item_id
  FROM candidates c
  JOIN level_counts n ON n.history_id = c.history_id
  WHERE (n.tier_n = 1 AND c.tier_match)
     OR (n.tier_n <> 1 AND n.expansion_n = 1 AND c.expansion_match)
     OR (n.tier_n <> 1 AND n.expansion_n <> 1 AND n.active_n = 1 AND c.active_match)
  UNION ALL
  SELECT l.history_id, l.cur_item_id AS item_id
  FROM linked l
  WHERE NOT l.item_mislinked
),
chosen AS (
  SELECT ci.history_id, ci.item_id, fi.raid_tier_id, frt.expansion_id
  FROM chosen_item ci
  JOIN public.loot_items fi ON fi.id = ci.item_id
  LEFT JOIN public.raid_tiers frt ON frt.id = fi.raid_tier_id
),
targets AS (
  SELECT ch.history_id, ch.item_id, ch.raid_tier_id, ch.expansion_id,
         l.guild_id, l.character_id, l.raid_event_id,
         count(*) OVER (PARTITION BY l.guild_id, ch.item_id, l.character_id, l.raid_event_id) AS same_target_n
  FROM chosen ch
  JOIN linked l ON l.history_id = ch.history_id
),
safe AS (
  SELECT t.history_id, t.item_id, t.raid_tier_id, t.expansion_id
  FROM targets t
  WHERE t.character_id IS NULL
     OR t.raid_event_id IS NULL
     OR (t.same_target_n = 1
         AND NOT EXISTS (
           SELECT 1 FROM public.loot_history k
           WHERE k.id <> t.history_id
             AND k.guild_id = t.guild_id
             AND k.loot_item_id = t.item_id
             AND k.character_id = t.character_id
             AND k.raid_event_id = t.raid_event_id))
)
UPDATE public.loot_history lh
SET loot_item_id = s.item_id,
    raid_tier_id = s.raid_tier_id,
    expansion_id = s.expansion_id
FROM safe s
WHERE lh.id = s.history_id;

-- Verification only, NOT executed. Run these read-only queries by hand in
-- Supabase Studio or via the Management API; do not run them from this
-- executor. Every query below returns aggregate counts, uuids and a
-- wowhead id, never character names or notes.
--
-- Query 1: mis-linked count by source, before and after, split by which of
-- the three columns is foreign
-- Run this in production before merging, as the deploy gate. No rows found
-- means there is nothing left to repair; close #289 without merging this
-- pull request. After the migration applies, mislinked_rows per source
-- should equal query 2's row count for that source, and every one of the
-- three foreign columns should be at zero (all three are always corrected
-- together).
-- SELECT h.source,
--        count(*) AS mislinked_rows,
--        count(*) FILTER (WHERE cur_e.guild_id IS DISTINCT FROM h.guild_id) AS item_foreign,
--        count(*) FILTER (WHERE h_e.guild_id IS DISTINCT FROM h.guild_id) AS raid_tier_foreign,
--        count(*) FILTER (WHERE h.expansion_id IS NOT NULL AND h_x.guild_id IS DISTINCT FROM h.guild_id) AS expansion_foreign
-- FROM public.loot_history h
-- JOIN public.loot_items cur ON cur.id = h.loot_item_id
-- LEFT JOIN public.raid_tiers cur_rt ON cur_rt.id = cur.raid_tier_id
-- LEFT JOIN public.expansions cur_e ON cur_e.id = cur_rt.expansion_id
-- LEFT JOIN public.raid_tiers h_rt ON h_rt.id = h.raid_tier_id
-- LEFT JOIN public.expansions h_e ON h_e.id = h_rt.expansion_id
-- LEFT JOIN public.expansions h_x ON h_x.id = h.expansion_id
-- WHERE cur_e.guild_id IS DISTINCT FROM h.guild_id
--    OR h_e.guild_id IS DISTINCT FROM h.guild_id
--    OR (h.expansion_id IS NOT NULL AND h_x.guild_id IS DISTINCT FROM h.guild_id)
-- GROUP BY h.source
-- ORDER BY h.source;
--
-- Query 2: rows the repair statement leaves unmatched, with a reason
-- Run this as a preview before merging and again after the migration
-- applies; the same rows should appear both times. It returns ids, the
-- wowhead id and candidate counts only, never character names or notes.
-- WITH linked AS (
--   SELECT h.id AS history_id,
--          h.guild_id,
--          h.character_id,
--          h.raid_event_id,
--          h.source,
--          h.loot_item_id AS cur_item_id,
--          cur.wowhead_id,
--          cur_rt.name AS tier_name,
--          cur_e.name AS expansion_name,
--          (cur_e.guild_id IS DISTINCT FROM h.guild_id) AS item_mislinked
--   FROM public.loot_history h
--   JOIN public.loot_items cur ON cur.id = h.loot_item_id
--   LEFT JOIN public.raid_tiers cur_rt ON cur_rt.id = cur.raid_tier_id
--   LEFT JOIN public.expansions cur_e ON cur_e.id = cur_rt.expansion_id
--   LEFT JOIN public.raid_tiers h_rt ON h_rt.id = h.raid_tier_id
--   LEFT JOIN public.expansions h_e ON h_e.id = h_rt.expansion_id
--   LEFT JOIN public.expansions h_x ON h_x.id = h.expansion_id
--   WHERE cur_e.guild_id IS DISTINCT FROM h.guild_id
--      OR h_e.guild_id IS DISTINCT FROM h.guild_id
--      OR (h.expansion_id IS NOT NULL AND h_x.guild_id IS DISTINCT FROM h.guild_id)
-- ),
-- candidates AS (
--   SELECT l.history_id,
--          li.id AS item_id,
--          (rt.name = l.tier_name) AS tier_match,
--          (e.name = l.expansion_name) AS expansion_match,
--          (e.id = g.active_expansion_id) AS active_match
--   FROM linked l
--   JOIN public.guilds g ON g.id = l.guild_id
--   JOIN public.expansions e ON e.guild_id = l.guild_id
--   JOIN public.raid_tiers rt ON rt.expansion_id = e.id
--   JOIN public.loot_items li ON li.raid_tier_id = rt.id AND li.wowhead_id = l.wowhead_id
--   WHERE l.item_mislinked
-- ),
-- level_counts AS (
--   SELECT history_id,
--          count(*) AS candidate_n,
--          count(*) FILTER (WHERE tier_match) AS tier_n,
--          count(*) FILTER (WHERE expansion_match) AS expansion_n,
--          count(*) FILTER (WHERE active_match) AS active_n
--   FROM candidates
--   GROUP BY history_id
-- ),
-- chosen_item AS (
--   SELECT c.history_id, c.item_id
--   FROM candidates c
--   JOIN level_counts n ON n.history_id = c.history_id
--   WHERE (n.tier_n = 1 AND c.tier_match)
--      OR (n.tier_n <> 1 AND n.expansion_n = 1 AND c.expansion_match)
--      OR (n.tier_n <> 1 AND n.expansion_n <> 1 AND n.active_n = 1 AND c.active_match)
--   UNION ALL
--   SELECT l.history_id, l.cur_item_id AS item_id
--   FROM linked l
--   WHERE NOT l.item_mislinked
-- ),
-- chosen AS (
--   SELECT ci.history_id, ci.item_id, fi.raid_tier_id, frt.expansion_id
--   FROM chosen_item ci
--   JOIN public.loot_items fi ON fi.id = ci.item_id
--   LEFT JOIN public.raid_tiers frt ON frt.id = fi.raid_tier_id
-- ),
-- targets AS (
--   SELECT ch.history_id, ch.item_id, ch.raid_tier_id, ch.expansion_id,
--          l.guild_id, l.character_id, l.raid_event_id,
--          count(*) OVER (PARTITION BY l.guild_id, ch.item_id, l.character_id, l.raid_event_id) AS same_target_n
--   FROM chosen ch
--   JOIN linked l ON l.history_id = ch.history_id
-- ),
-- safe AS (
--   SELECT t.history_id, t.item_id, t.raid_tier_id, t.expansion_id
--   FROM targets t
--   WHERE t.character_id IS NULL
--      OR t.raid_event_id IS NULL
--      OR (t.same_target_n = 1
--          AND NOT EXISTS (
--            SELECT 1 FROM public.loot_history k
--            WHERE k.id <> t.history_id
--              AND k.guild_id = t.guild_id
--              AND k.loot_item_id = t.item_id
--              AND k.character_id = t.character_id
--              AND k.raid_event_id = t.raid_event_id))
-- )
-- SELECT l.history_id, l.source, l.wowhead_id, l.item_mislinked,
--        coalesce(n.candidate_n, 0) AS candidate_n, n.tier_n, n.expansion_n, n.active_n,
--        CASE WHEN l.item_mislinked AND n.history_id IS NULL THEN 'no item in the guild'
--             WHEN l.item_mislinked AND ci.history_id IS NULL THEN 'ambiguous'
--             ELSE 'would duplicate an existing award' END AS reason
-- FROM linked l
-- LEFT JOIN level_counts n ON n.history_id = l.history_id
-- LEFT JOIN chosen_item ci ON ci.history_id = l.history_id
-- WHERE NOT EXISTS (SELECT 1 FROM safe s WHERE s.history_id = l.history_id)
-- ORDER BY reason, l.source, l.history_id;
--
-- Query 3: confirmation that nothing else changed
-- Run this immediately before merging and again right after the migration
-- applies; all three values must match. Every row this repair changes
-- shares one identical updated_at value, stamped by the
-- update_loot_history_updated_at trigger at the migration's transaction
-- time; a row with any other recent updated_at was an app edit between the
-- two runs, not this repair. The first hash excludes loot_item_id,
-- raid_tier_id, expansion_id and updated_at, the three columns this
-- statement changes plus the trigger-owned timestamp; the second hash
-- proves the awarded item's real-world identity (its wowhead id) never
-- changes even when loot_item_id does.
-- SELECT count(*) AS row_count,
--        md5(string_agg(ROW(h.id, h.character_id, h.guild_id, h.awarded_date, h.awarded_by, h.notes, h.created_at, h.raid_event_id, h.character_name, h.source)::text, ',' ORDER BY h.id)) AS other_columns_md5,
--        md5(string_agg(ROW(h.id, cur.wowhead_id)::text, ',' ORDER BY h.id)) AS awarded_wowhead_md5
-- FROM public.loot_history h
-- JOIN public.loot_items cur ON cur.id = h.loot_item_id
-- WHERE h.created_at IS NULL OR h.created_at < '2026-09-28 00:00:00+00';
--
-- Query 4: optional undo map (OD-03), old and new values for all three
-- re-pointed columns
-- Run this before merging only, and save the output; it is the only
-- record of each row's previous loot_item_id, raid_tier_id and
-- expansion_id. After the migration applies it returns no rows, since safe
-- no longer selects any already-repaired row.
-- WITH linked AS (
--   SELECT h.id AS history_id,
--          h.guild_id,
--          h.character_id,
--          h.raid_event_id,
--          h.source,
--          h.loot_item_id AS cur_item_id,
--          cur.wowhead_id,
--          cur_rt.name AS tier_name,
--          cur_e.name AS expansion_name,
--          (cur_e.guild_id IS DISTINCT FROM h.guild_id) AS item_mislinked
--   FROM public.loot_history h
--   JOIN public.loot_items cur ON cur.id = h.loot_item_id
--   LEFT JOIN public.raid_tiers cur_rt ON cur_rt.id = cur.raid_tier_id
--   LEFT JOIN public.expansions cur_e ON cur_e.id = cur_rt.expansion_id
--   LEFT JOIN public.raid_tiers h_rt ON h_rt.id = h.raid_tier_id
--   LEFT JOIN public.expansions h_e ON h_e.id = h_rt.expansion_id
--   LEFT JOIN public.expansions h_x ON h_x.id = h.expansion_id
--   WHERE cur_e.guild_id IS DISTINCT FROM h.guild_id
--      OR h_e.guild_id IS DISTINCT FROM h.guild_id
--      OR (h.expansion_id IS NOT NULL AND h_x.guild_id IS DISTINCT FROM h.guild_id)
-- ),
-- candidates AS (
--   SELECT l.history_id,
--          li.id AS item_id,
--          (rt.name = l.tier_name) AS tier_match,
--          (e.name = l.expansion_name) AS expansion_match,
--          (e.id = g.active_expansion_id) AS active_match
--   FROM linked l
--   JOIN public.guilds g ON g.id = l.guild_id
--   JOIN public.expansions e ON e.guild_id = l.guild_id
--   JOIN public.raid_tiers rt ON rt.expansion_id = e.id
--   JOIN public.loot_items li ON li.raid_tier_id = rt.id AND li.wowhead_id = l.wowhead_id
--   WHERE l.item_mislinked
-- ),
-- level_counts AS (
--   SELECT history_id,
--          count(*) AS candidate_n,
--          count(*) FILTER (WHERE tier_match) AS tier_n,
--          count(*) FILTER (WHERE expansion_match) AS expansion_n,
--          count(*) FILTER (WHERE active_match) AS active_n
--   FROM candidates
--   GROUP BY history_id
-- ),
-- chosen_item AS (
--   SELECT c.history_id, c.item_id
--   FROM candidates c
--   JOIN level_counts n ON n.history_id = c.history_id
--   WHERE (n.tier_n = 1 AND c.tier_match)
--      OR (n.tier_n <> 1 AND n.expansion_n = 1 AND c.expansion_match)
--      OR (n.tier_n <> 1 AND n.expansion_n <> 1 AND n.active_n = 1 AND c.active_match)
--   UNION ALL
--   SELECT l.history_id, l.cur_item_id AS item_id
--   FROM linked l
--   WHERE NOT l.item_mislinked
-- ),
-- chosen AS (
--   SELECT ci.history_id, ci.item_id, fi.raid_tier_id, frt.expansion_id
--   FROM chosen_item ci
--   JOIN public.loot_items fi ON fi.id = ci.item_id
--   LEFT JOIN public.raid_tiers frt ON frt.id = fi.raid_tier_id
-- ),
-- targets AS (
--   SELECT ch.history_id, ch.item_id, ch.raid_tier_id, ch.expansion_id,
--          l.guild_id, l.character_id, l.raid_event_id,
--          count(*) OVER (PARTITION BY l.guild_id, ch.item_id, l.character_id, l.raid_event_id) AS same_target_n
--   FROM chosen ch
--   JOIN linked l ON l.history_id = ch.history_id
-- ),
-- safe AS (
--   SELECT t.history_id, t.item_id, t.raid_tier_id, t.expansion_id
--   FROM targets t
--   WHERE t.character_id IS NULL
--      OR t.raid_event_id IS NULL
--      OR (t.same_target_n = 1
--          AND NOT EXISTS (
--            SELECT 1 FROM public.loot_history k
--            WHERE k.id <> t.history_id
--              AND k.guild_id = t.guild_id
--              AND k.loot_item_id = t.item_id
--              AND k.character_id = t.character_id
--              AND k.raid_event_id = t.raid_event_id))
-- )
-- SELECT s.history_id,
--        h.loot_item_id AS old_loot_item_id, s.item_id AS new_loot_item_id,
--        h.raid_tier_id AS old_raid_tier_id, s.raid_tier_id AS new_raid_tier_id,
--        h.expansion_id AS old_expansion_id, s.expansion_id AS new_expansion_id
-- FROM safe s
-- JOIN public.loot_history h ON h.id = s.history_id
-- ORDER BY s.history_id;

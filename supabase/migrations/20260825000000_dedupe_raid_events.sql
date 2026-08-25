-- Fix #230: guilds ended up with duplicate raid_events rows for the same
-- (guild_id, raid_date, raid_team_id) because /api/raid-events/ensure does a
-- check-then-insert with no unique constraint — two concurrent requests (e.g.
-- the raid-tracking and attendance pages racing) both saw the date missing and
-- both inserted. Skipping a raid then only flips one copy, so the raid keeps
-- showing as unskipped (Addendum's 2026-08-13 twins, created 137ms apart).
--
-- This migration merges the duplicates onto a single keeper row, re-points the
-- three referencing tables, and adds a unique index so it cannot recur.

-- 1. Identify duplicates. Keeper = the copy with the most child references,
--    breaking ties by oldest created_at, then id.
CREATE TEMP TABLE _re_dupes ON COMMIT DROP AS
WITH refs AS (
  SELECT re.id,
         (SELECT count(*) FROM attendance_records ar WHERE ar.raid_event_id = re.id)
       + (SELECT count(*) FROM loot_history lh WHERE lh.raid_event_id = re.id)
       + (SELECT count(*) FROM blp_credits bc WHERE bc.raid_event_id = re.id) AS ref_ct
  FROM raid_events re
  WHERE NOT re.is_bonus
),
ranked AS (
  SELECT re.id,
         row_number() OVER w AS rn,
         first_value(re.id) OVER w AS keeper_id
  FROM raid_events re
  JOIN refs ON refs.id = re.id
  WHERE NOT re.is_bonus
  WINDOW w AS (
    PARTITION BY re.guild_id, re.raid_date, re.raid_team_id
    ORDER BY refs.ref_ct DESC, re.created_at ASC, re.id
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
  )
)
SELECT id AS dupe_id, keeper_id FROM ranked WHERE rn > 1;

-- 2. Merge state onto the keeper: a raid is skipped if ANY copy was skipped
--    (officers marked it skipped and the UI lost the update to a twin), and
--    keep whatever reason/notes/report code exists.
UPDATE raid_events k
SET is_skipped      = k.is_skipped OR d.any_skipped,
    skip_reason     = COALESCE(k.skip_reason, d.merged_reason),
    notes           = COALESCE(k.notes, d.merged_notes),
    wcl_report_code = COALESCE(k.wcl_report_code, d.merged_wcl)
FROM (
  SELECT dd.keeper_id,
         bool_or(re.is_skipped)  AS any_skipped,
         max(re.skip_reason)     AS merged_reason,
         max(re.notes)           AS merged_notes,
         max(re.wcl_report_code) AS merged_wcl
  FROM _re_dupes dd
  JOIN raid_events re ON re.id = dd.dupe_id
  GROUP BY dd.keeper_id
) d
WHERE k.id = d.keeper_id;

-- 3. Re-point child rows. Each child table has a uniqueness rule involving
--    raid_event_id, so first drop dupe-side rows that already exist on the
--    keeper, then move the rest.
DELETE FROM attendance_records ar
USING _re_dupes dd
WHERE ar.raid_event_id = dd.dupe_id
  AND EXISTS (
    SELECT 1 FROM attendance_records k
    WHERE k.raid_event_id = dd.keeper_id AND k.character_id = ar.character_id
  );

UPDATE attendance_records ar
SET raid_event_id = dd.keeper_id
FROM _re_dupes dd
WHERE ar.raid_event_id = dd.dupe_id;

DELETE FROM loot_history lh
USING _re_dupes dd
WHERE lh.raid_event_id = dd.dupe_id
  AND lh.character_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM loot_history k
    WHERE k.raid_event_id = dd.keeper_id
      AND k.guild_id = lh.guild_id
      AND k.loot_item_id = lh.loot_item_id
      AND k.character_id = lh.character_id
  );

UPDATE loot_history lh
SET raid_event_id = dd.keeper_id
FROM _re_dupes dd
WHERE lh.raid_event_id = dd.dupe_id;

DELETE FROM blp_credits bc
USING _re_dupes dd
WHERE bc.raid_event_id = dd.dupe_id
  AND EXISTS (
    SELECT 1 FROM blp_credits k
    WHERE k.raid_event_id = dd.keeper_id
      AND k.character_id = bc.character_id
      AND k.loot_item_id = bc.loot_item_id
  );

UPDATE blp_credits bc
SET raid_event_id = dd.keeper_id
FROM _re_dupes dd
WHERE bc.raid_event_id = dd.dupe_id;

-- 4. Remove the duplicate events.
DELETE FROM raid_events re
USING _re_dupes dd
WHERE re.id = dd.dupe_id;

-- 5. Prevent recurrence. NULLS NOT DISTINCT so two null-team events on the
--    same date also conflict (the common case). Bonus events are exempt —
--    they may legitimately share a date with a scheduled raid.
CREATE UNIQUE INDEX IF NOT EXISTS raid_events_guild_date_team_key
  ON raid_events (guild_id, raid_date, raid_team_id) NULLS NOT DISTINCT
  WHERE NOT is_bonus;

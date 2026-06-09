-- BLP recompute-from-history (fixes the award-before-attendance race).
--
-- Background
-- ----------
-- BLP was credited as a one-shot side effect at loot-award time: updateBLP read
-- attendance_records for the raid, +1'd the non-winners, reset the winner. That
-- makes the credit depend on attendance EXISTING at the instant of the award.
-- Officers routinely award loot during/right after the raid and import
-- attendance afterward (and the addon importer literally processes every award
-- before any attendance). When the award lands first, the eligible set is empty
-- and nobody gets credited, with no retry. Across one affected guild, 91 of 167
-- awards (54%) were made before their attendance synced, silently dropping BLP.
--
-- Fix
-- ---
-- Make times_passed a DERIVED value. recompute_blp_for_item rebuilds the counter
-- (and the blp_credits journal) for one (guild, item) straight from history, so
-- it is order-independent and self-healing. It is called from BOTH the award
-- path and every attendance-write path, so whichever lands second fills in the
-- credits. recompute_blp_for_event fans that out over the items awarded at a
-- raid event (used by the attendance-write paths).
--
-- BLP semantics preserved from the incremental implementation:
--   * A contender = ranked the item in an approved, non-removed submission.
--   * They pass at a raid event when the item was awarded there to someone else
--     and they attended (or were benched, when blp_includes_benched is on).
--   * A win resets BLP, so only passes AFTER a contender's most recent win of
--     the item count. Per-event grain (one credit per raid_event) is unchanged.

CREATE OR REPLACE FUNCTION "public"."recompute_blp_for_item"(
  "p_guild_id" "uuid",
  "p_loot_item_id" "uuid"
) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_enabled boolean;
  v_includes_benched boolean;
  v_expansion_id uuid;
  v_rows integer;
BEGIN
  -- Read the guild's BLP settings. When BLP is disabled, leave existing rows
  -- untouched (the read path returns 0 regardless) and bail.
  SELECT blp_enabled, COALESCE(blp_includes_benched, false)
    INTO v_enabled, v_includes_benched
  FROM guild_settings
  WHERE guild_id = p_guild_id;

  IF v_enabled IS NOT TRUE THEN
    RETURN 0;
  END IF;

  -- expansion_id for the rebuilt rows (nullable, best-effort, matches the
  -- incremental functions).
  SELECT rt.expansion_id INTO v_expansion_id
  FROM loot_items li
  JOIN raid_tiers rt ON rt.id = li.raid_tier_id
  WHERE li.id = p_loot_item_id
  LIMIT 1;

  -- Clear prior derived state for this (guild, item); rebuilt below from history.
  DELETE FROM blp_credits  WHERE guild_id = p_guild_id AND loot_item_id = p_loot_item_id;
  DELETE FROM blp_tracking WHERE guild_id = p_guild_id AND loot_item_id = p_loot_item_id;

  -- Rebuild journal + counter in one statement. No deletes here (done above), so
  -- there is no same-statement delete/insert hazard on the unique constraints.
  WITH contenders AS (
    SELECT DISTINCT ls.character_id
    FROM loot_submission_items lsi
    JOIN loot_submissions ls ON ls.id = lsi.submission_id
    WHERE lsi.loot_item_id = p_loot_item_id
      AND lsi.removed_at IS NULL
      AND ls.guild_id = p_guild_id
      AND ls.status = 'approved'
      AND ls.character_id IS NOT NULL
  ),
  -- Raid events where this item was awarded to someone (one row per event).
  award_events AS (
    SELECT lh.raid_event_id, re.raid_date
    FROM loot_history lh
    JOIN raid_events re ON re.id = lh.raid_event_id
    WHERE lh.guild_id = p_guild_id
      AND lh.loot_item_id = p_loot_item_id
      AND lh.raid_event_id IS NOT NULL
    GROUP BY lh.raid_event_id, re.raid_date
  ),
  -- Who won the item at each event (an item can drop more than once a night).
  winners AS (
    SELECT DISTINCT lh.raid_event_id, lh.character_id
    FROM loot_history lh
    WHERE lh.guild_id = p_guild_id
      AND lh.loot_item_id = p_loot_item_id
      AND lh.raid_event_id IS NOT NULL
      AND lh.character_id IS NOT NULL
  ),
  -- Each contender's most recent win date for this item (NULL = never won).
  last_win AS (
    SELECT w.character_id, MAX(ae.raid_date) AS last_win_date
    FROM winners w
    JOIN award_events ae ON ae.raid_event_id = w.raid_event_id
    JOIN contenders c ON c.character_id = w.character_id
    GROUP BY w.character_id
  ),
  -- Qualifying pass-events: contender was eligible at the event, did not win the
  -- item there, and the event falls after their most recent win of it.
  passes AS (
    SELECT c.character_id, ae.raid_event_id
    FROM contenders c
    CROSS JOIN award_events ae
    JOIN attendance_records ar
      ON ar.raid_event_id = ae.raid_event_id
     AND ar.character_id = c.character_id
     AND (ar.attended = true OR (v_includes_benched AND ar.was_benched = true))
    LEFT JOIN winners w
      ON w.raid_event_id = ae.raid_event_id
     AND w.character_id = c.character_id
    LEFT JOIN last_win lw
      ON lw.character_id = c.character_id
    WHERE w.character_id IS NULL
      AND (lw.last_win_date IS NULL OR ae.raid_date > lw.last_win_date)
  ),
  counts AS (
    SELECT character_id, count(*)::int AS times_passed
    FROM passes
    GROUP BY character_id
  ),
  ins_credits AS (
    INSERT INTO blp_credits (guild_id, character_id, loot_item_id, raid_event_id, expansion_id)
    SELECT p_guild_id, character_id, p_loot_item_id, raid_event_id, v_expansion_id
    FROM passes
    RETURNING 1
  )
  INSERT INTO blp_tracking (guild_id, character_id, loot_item_id, times_passed, expansion_id, last_updated_at)
  SELECT p_guild_id, character_id, p_loot_item_id, times_passed, v_expansion_id, NOW()
  FROM counts;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows;
END;
$$;

ALTER FUNCTION "public"."recompute_blp_for_item"("p_guild_id" "uuid", "p_loot_item_id" "uuid") OWNER TO "postgres";


-- Recompute every item awarded at a raid event. Called by the attendance-write
-- paths so syncing/editing attendance fills in (or corrects) BLP for that night.
CREATE OR REPLACE FUNCTION "public"."recompute_blp_for_event"(
  "p_guild_id" "uuid",
  "p_raid_event_id" "uuid"
) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_item uuid;
  v_items integer := 0;
BEGIN
  FOR v_item IN
    SELECT DISTINCT loot_item_id
    FROM loot_history
    WHERE guild_id = p_guild_id
      AND raid_event_id = p_raid_event_id
      AND loot_item_id IS NOT NULL
  LOOP
    PERFORM recompute_blp_for_item(p_guild_id, v_item);
    v_items := v_items + 1;
  END LOOP;

  RETURN v_items;
END;
$$;

ALTER FUNCTION "public"."recompute_blp_for_event"("p_guild_id" "uuid", "p_raid_event_id" "uuid") OWNER TO "postgres";


-- One-time backfill: repair every (guild, item) that has award history. Idempotent
-- and order-independent, so it both fills in dropped credits and corrects any
-- values left inflated by earlier incremental bugs. Disabled guilds are no-ops.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT DISTINCT guild_id, loot_item_id
    FROM loot_history
    WHERE raid_event_id IS NOT NULL
      AND loot_item_id IS NOT NULL
      AND guild_id IS NOT NULL
  LOOP
    PERFORM public.recompute_blp_for_item(r.guild_id, r.loot_item_id);
  END LOOP;
END;
$$;

-- BLP hard reset anchor (GH #148).
--
-- Background
-- ----------
-- Guilds that trial the loot system before going live end up with BLP already
-- accrued from those test raids, and there is no way to zero it. Deleting rows
-- from blp_tracking / blp_credits does NOT work: since migration 20260609000001
-- times_passed is a DERIVED value, rebuilt from award + attendance history by
-- recompute_blp_for_item on every award and every attendance write. Any manual
-- delete is silently undone by the next recompute of that item.
--
-- Fix
-- ---
-- A durable reset has to be a filter inside the recompute, not a delete. Add
-- guild_settings.blp_reset_at — an anchor date, mirroring donation_reset_at —
-- and hide award events dated before it from the rebuild. BLP then behaves as
-- if the guild started raiding on the anchor date.
--
-- The filter lands on the award_events CTE only. Everything downstream
-- (winners, last_win, passes) is already bounded by award_events, so one clause
-- covers the whole computation: pre-anchor passes stop counting AND pre-anchor
-- wins stop suppressing post-anchor passes.
--
-- Non-destructive and reversible: no history is deleted, and clearing the
-- anchor restores the previous values on the next recompute.

ALTER TABLE "public"."guild_settings"
  ADD COLUMN IF NOT EXISTS "blp_reset_at" "date";

COMMENT ON COLUMN "public"."guild_settings"."blp_reset_at" IS
  'Hard reset anchor for bad luck protection. Raid events before this date are excluded from the BLP recompute, so accrued BLP restarts from zero. NULL = count all history. Non-destructive: loot and attendance history are untouched.';


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
  v_reset_at date;
  v_expansion_id uuid;
  v_rows integer;
BEGIN
  -- Read the guild's BLP settings. When BLP is disabled, leave existing rows
  -- untouched (the read path returns 0 regardless) and bail.
  SELECT blp_enabled, COALESCE(blp_includes_benched, false), blp_reset_at
    INTO v_enabled, v_includes_benched, v_reset_at
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
  -- Events before the guild's BLP reset anchor are invisible to the whole
  -- computation — that is what makes the reset stick across recomputes.
  award_events AS (
    SELECT lh.raid_event_id, re.raid_date
    FROM loot_history lh
    JOIN raid_events re ON re.id = lh.raid_event_id
    WHERE lh.guild_id = p_guild_id
      AND lh.loot_item_id = p_loot_item_id
      AND lh.raid_event_id IS NOT NULL
      AND (v_reset_at IS NULL OR re.raid_date >= v_reset_at)
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


-- Recompute every item the guild has ever awarded. Called when blp_reset_at
-- changes so the new anchor takes effect immediately instead of trickling in
-- as items happen to be re-awarded.
CREATE OR REPLACE FUNCTION "public"."recompute_blp_for_guild"(
  "p_guild_id" "uuid"
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
      AND loot_item_id IS NOT NULL
  LOOP
    PERFORM recompute_blp_for_item(p_guild_id, v_item);
    v_items := v_items + 1;
  END LOOP;

  RETURN v_items;
END;
$$;

ALTER FUNCTION "public"."recompute_blp_for_guild"("p_guild_id" "uuid") OWNER TO "postgres";

-- Called only via the service-role client (guild-settings route, after()). Revoke
-- the default PUBLIC EXECUTE so it isn't reachable with the anon key, and grant
-- service_role explicitly. See migration 20260722000001 for the same treatment of
-- the sibling recompute_* functions.
REVOKE ALL ON FUNCTION "public"."recompute_blp_for_guild"("p_guild_id" "uuid") FROM PUBLIC, "anon", "authenticated";
GRANT EXECUTE ON FUNCTION "public"."recompute_blp_for_guild"("p_guild_id" "uuid") TO "service_role";

-- Season reset — wipe accrued raid data without deleting the guild (GH #148).
--
-- Guilds that trial the system before going live want the test raids gone, not
-- the guild. delete_guild is too blunt (it takes the roster, loot lists, roles
-- and settings with it) and there is nothing in between.
--
-- reset_guild_season deletes the history that raider scores are computed from —
-- raid events, attendance, loot awards, donations — and preserves everything
-- that makes the guild a guild: members, their loot lists, roles, raid teams,
-- expansions/tiers, and settings.
--
-- Each category is opt-in so an officer can, say, reset attendance while
-- keeping loot award history. BLP is always rebuilt afterwards because it is a
-- derived value (see 20260609000001) computed from both loot and attendance.
--
-- Returns a jsonb summary of what was removed, for the audit log.

CREATE OR REPLACE FUNCTION "public"."reset_guild_season"(
  "p_guild_id" "uuid",
  "p_clear_raids" boolean DEFAULT false,
  "p_clear_loot" boolean DEFAULT false,
  "p_clear_donations" boolean DEFAULT false
) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_raid_events integer := 0;
  v_attendance integer := 0;
  v_loot integer := 0;
  v_donations integer := 0;
BEGIN
  IF p_guild_id IS NULL THEN
    RAISE EXCEPTION 'p_guild_id is required';
  END IF;

  -- Loot awards first. The flags are independent — loot_history.raid_event_id
  -- is ON DELETE SET NULL, so clearing raids alone leaves the awards in place
  -- but orphaned from the night they dropped (and invisible to BLP, which only
  -- counts awards that still have a raid event).
  IF p_clear_loot THEN
    DELETE FROM loot_history WHERE guild_id = p_guild_id;
    GET DIAGNOSTICS v_loot = ROW_COUNT;
  END IF;

  IF p_clear_raids THEN
    DELETE FROM attendance_records
    WHERE raid_event_id IN (SELECT id FROM raid_events WHERE guild_id = p_guild_id);
    GET DIAGNOSTICS v_attendance = ROW_COUNT;

    DELETE FROM raid_events WHERE guild_id = p_guild_id;
    GET DIAGNOSTICS v_raid_events = ROW_COUNT;
  END IF;

  IF p_clear_donations THEN
    DELETE FROM donation_records WHERE guild_id = p_guild_id;
    GET DIAGNOSTICS v_donations = ROW_COUNT;
  END IF;

  -- BLP is derived from loot + attendance history, so it has to be rebuilt from
  -- whatever survived. With loot history gone this empties it entirely; with
  -- only attendance gone it drops the passes that attendance was proving.
  DELETE FROM blp_credits  WHERE guild_id = p_guild_id;
  DELETE FROM blp_tracking WHERE guild_id = p_guild_id;
  PERFORM recompute_blp_for_guild(p_guild_id);

  RETURN jsonb_build_object(
    'raid_events_deleted', v_raid_events,
    'attendance_records_deleted', v_attendance,
    'loot_awards_deleted', v_loot,
    'donation_records_deleted', v_donations
  );
END;
$$;

ALTER FUNCTION "public"."reset_guild_season"("p_guild_id" "uuid", "p_clear_raids" boolean, "p_clear_loot" boolean, "p_clear_donations" boolean) OWNER TO "postgres";

-- Called only from the API route, which checks guild ownership first. Revoke the
-- default PUBLIC/anon/authenticated EXECUTE and grant service_role explicitly, so
-- the route's service-role client keeps access regardless of what the PUBLIC
-- default was.
REVOKE ALL ON FUNCTION "public"."reset_guild_season"("uuid", boolean, boolean, boolean) FROM PUBLIC, "anon", "authenticated";
GRANT EXECUTE ON FUNCTION "public"."reset_guild_season"("uuid", boolean, boolean, boolean) TO "service_role";

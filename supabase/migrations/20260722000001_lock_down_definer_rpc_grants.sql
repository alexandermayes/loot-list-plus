-- Lock down SECURITY DEFINER RPCs that were callable by anon (security audit).
--
-- Problem
-- -------
-- A cluster of SECURITY DEFINER functions in the public schema were GRANTed to
-- the anon role and carried no in-function authorization — they trusted the
-- Next.js API route to gate them. But public-schema functions are exposed by
-- PostgREST at POST /rest/v1/rpc/<name>, callable directly with the publishable
-- anon key that ships in the browser bundle. The route checks are bypassed.
--
-- Worst case: delete_guild took only a guild id, ran 20 unconditional DELETEs as
-- the definer (bypassing RLS), and was granted to anon. Guild ids are
-- world-readable (guilds SELECT policy is USING(true)), so any visitor could
-- enumerate every guild and delete each one. reset_blp, save_submission_items,
-- merge_phase_groups, increment_blp*, and the seed_* helpers were all reachable
-- the same way.
--
-- Fix strategy (per function, by who legitimately calls it)
-- --------------------------------------------------------
--   * Called by the service-role client, or uncalled  -> REVOKE from anon AND
--     authenticated. Service role keeps EXECUTE; the API route stays the only
--     way in and already authorizes.
--   * Called by a USER-scoped client (browser or SSR session)  -> keep the
--     authenticated grant (revoking would break the app) and instead add an
--     in-function auth guard, so an authenticated caller can only act where they
--     are actually allowed. Also revoke anon.
--
-- Guards use the existing auth.uid()-bound helpers is_guild_master /
-- is_guild_officer, which return false when auth.uid() is null (e.g. anon), so
-- they fail closed.

-- ---------------------------------------------------------------------------
-- 1. delete_guild — called by the guild delete routes via a USER-scoped client
--    (app/api/guilds/delete/route.ts, app/api/guilds/route.ts). Add a GM guard
--    (this also closes app/api/guilds/route.ts, which had NO owner check and
--    relied on a "verifies creator" claim the function never honored). Keep the
--    authenticated grant; revoke anon.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION "public"."delete_guild"("p_guild_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  -- Only the guild master (creator or a role at position >= 100) may delete.
  IF NOT public.is_guild_master(p_guild_id) THEN
    RAISE EXCEPTION 'Only the guild master can delete this guild';
  END IF;

  -- Delete in dependency order
  DELETE FROM loot_submission_items WHERE submission_id IN (
    SELECT id FROM loot_submissions WHERE guild_id = p_guild_id
  );
  DELETE FROM loot_submissions WHERE guild_id = p_guild_id;
  DELETE FROM loot_history WHERE guild_id = p_guild_id;
  DELETE FROM attendance_records WHERE raid_event_id IN (
    SELECT id FROM raid_events WHERE guild_id = p_guild_id
  );
  DELETE FROM raid_events WHERE guild_id = p_guild_id;
  DELETE FROM character_guild_memberships WHERE guild_id = p_guild_id;
  DELETE FROM guild_invite_codes WHERE guild_id = p_guild_id;
  DELETE FROM guild_settings WHERE guild_id = p_guild_id;
  DELETE FROM guild_roles WHERE guild_id = p_guild_id;
  DELETE FROM audit_logs WHERE guild_id = p_guild_id;
  DELETE FROM blp_tracking WHERE guild_id = p_guild_id;
  DELETE FROM character_aliases WHERE guild_id = p_guild_id;
  DELETE FROM guild_item_priorities WHERE guild_id = p_guild_id;

  -- Clear active guild references
  UPDATE user_active_characters
  SET active_guild_id = NULL
  WHERE active_guild_id = p_guild_id;

  -- Delete raid teams and members
  DELETE FROM raid_team_members WHERE raid_team_id IN (
    SELECT id FROM raid_teams WHERE guild_id = p_guild_id
  );
  DELETE FROM raid_teams WHERE guild_id = p_guild_id;

  -- Delete expansions
  DELETE FROM expansions WHERE guild_id = p_guild_id;

  -- Finally delete the guild
  DELETE FROM guilds WHERE id = p_guild_id;
END;
$$;

ALTER FUNCTION "public"."delete_guild"("p_guild_id" "uuid") OWNER TO "postgres";
REVOKE ALL ON FUNCTION "public"."delete_guild"("p_guild_id" "uuid") FROM "anon";

-- ---------------------------------------------------------------------------
-- 2. save_submission_items — called from the browser (LootListContext) via the
--    user-scoped client. Mirror the loot_submissions RLS: the submission's owner
--    OR an officer of its guild may rewrite its items. Keep authenticated grant;
--    revoke anon.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION "public"."save_submission_items"("p_submission_id" "uuid", "p_items" "jsonb") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  item_count INTEGER;
BEGIN
  -- Authorize: caller must own the submission, or be an officer of its guild.
  IF NOT EXISTS (
    SELECT 1 FROM loot_submissions s
    WHERE s.id = p_submission_id
      AND (s.user_id = auth.uid() OR public.is_guild_officer(s.guild_id))
  ) THEN
    RAISE EXCEPTION 'Not authorized to modify this submission';
  END IF;

  -- Delete existing active items (preserve soft-deleted/removed items)
  DELETE FROM loot_submission_items
  WHERE submission_id = p_submission_id
    AND removed_at IS NULL;

  -- Insert new items
  INSERT INTO loot_submission_items (submission_id, loot_item_id, rank, slot)
  SELECT
    p_submission_id,
    (item->>'loot_item_id')::UUID,
    (item->>'rank')::INTEGER,
    (item->>'slot')::INTEGER
  FROM jsonb_array_elements(p_items) AS item;

  GET DIAGNOSTICS item_count = ROW_COUNT;
  RETURN item_count;
END;
$$;

ALTER FUNCTION "public"."save_submission_items"("p_submission_id" "uuid", "p_items" "jsonb") OWNER TO "postgres";
REVOKE ALL ON FUNCTION "public"."save_submission_items"("p_submission_id" "uuid", "p_items" "jsonb") FROM "anon";

-- ---------------------------------------------------------------------------
-- 3. Service-role-only or unused RPCs — revoke from BOTH anon and authenticated.
--    service_role retains EXECUTE, so the API routes (which authorize first)
--    keep working. No in-function guard needed.
--
--    merge_phase_groups        -> called via service role in phase-groups route
--    reset_blp                 -> not called from app code
--    increment_blp / _bulk     -> legacy, superseded by recompute_* (uncalled)
--    seed_tbc_expansion*       -> not called from app code
--    recompute_blp_for_item /  -> called via service role (utils/blp/recompute);
--      _for_event                 had no explicit grant, so defaulted to PUBLIC
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION "public"."merge_phase_groups"("p_expansion_id" "uuid", "p_guild_id" "uuid", "p_phase_groups" "jsonb", "p_merged_groups" "jsonb") FROM "anon", "authenticated";
REVOKE ALL ON FUNCTION "public"."reset_blp"("p_guild_id" "uuid", "p_character_id" "uuid", "p_loot_item_id" "uuid") FROM "anon", "authenticated";
REVOKE ALL ON FUNCTION "public"."increment_blp"("p_guild_id" "uuid", "p_character_id" "uuid", "p_loot_item_id" "uuid", "p_raid_event_id" "uuid") FROM "anon", "authenticated";
REVOKE ALL ON FUNCTION "public"."increment_blp_bulk"("p_guild_id" "uuid", "p_loot_item_id" "uuid", "p_raid_event_id" "uuid", "p_character_ids" "uuid"[]) FROM "anon", "authenticated";
REVOKE ALL ON FUNCTION "public"."seed_tbc_expansion"("p_guild_id" "uuid") FROM "anon", "authenticated";
REVOKE ALL ON FUNCTION "public"."seed_tbc_expansion_for_guild"("p_guild_id" "uuid") FROM "anon", "authenticated";
-- recompute_* had no explicit grants, so service_role may have reached them only
-- via the PUBLIC default being revoked here. Re-grant service_role explicitly so
-- the attendance/loot API routes (service-role client) keep working. Internal
-- PERFORM calls from other DEFINER functions run as the owner and are unaffected.
REVOKE ALL ON FUNCTION "public"."recompute_blp_for_item"("p_guild_id" "uuid", "p_loot_item_id" "uuid") FROM PUBLIC, "anon", "authenticated";
REVOKE ALL ON FUNCTION "public"."recompute_blp_for_event"("p_guild_id" "uuid", "p_raid_event_id" "uuid") FROM PUBLIC, "anon", "authenticated";
GRANT EXECUTE ON FUNCTION "public"."recompute_blp_for_item"("p_guild_id" "uuid", "p_loot_item_id" "uuid") TO "service_role";
GRANT EXECUTE ON FUNCTION "public"."recompute_blp_for_event"("p_guild_id" "uuid", "p_raid_event_id" "uuid") TO "service_role";

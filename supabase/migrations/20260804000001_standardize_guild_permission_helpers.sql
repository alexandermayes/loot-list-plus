-- Standardize guild permission checks on the auth.uid()-bound helpers (GH #193).
--
-- Problem
-- -------
-- Two parallel families of guild-permission helpers existed:
--
--   * Session-bound (safe): is_guild_officer(target_guild_id) and
--     is_guild_master(target_guild_id) derive the caller from auth.uid()
--     internally, so there is nothing for a client to substitute.
--
--   * Caller-supplied id (fragile): is_officer_of_guild(user_id, guild_id),
--     user_is_in_guild(user_id, guild_id) and user_is_officer_in_guild(user_id,
--     guild_id) take the identity as an argument and trust it.
--
-- The explicit-id family is not exploitable as currently wired: the only two
-- call sites are RLS policies on guild_settings that pass auth.uid() themselves,
-- and RLS quals are evaluated server-side where a client cannot substitute a
-- different uid. This migration is therefore hardening, not an incident fix —
-- it removes the footgun so a future policy or RPC cannot pick up the fragile
-- variant and hand it a client-controlled id.
--
-- Two adjacent defects surfaced while auditing the call sites, and are fixed
-- here because they are the same code:
--
--   1. guild_members does not exist. is_officer_of_guild, create_expansion_for_guild
--      and set_guild_active_expansion all query a `guild_members` table that is
--      present in no schema. PL/pgSQL plans a statement as a whole on first
--      execution, so the missing relation makes the entire guard expression fail
--      to plan — these functions raise `relation "guild_members" does not exist`
--      for every caller, including ones that should have been authorized. The
--      live blast radius is nil today (all three seedExpansionForGuild call sites
--      pass useServiceRole=true and take the direct-insert path; the other two
--      functions have no callers), but they fail *loudly*, not closed by design.
--
--   2. Hardcoded role-name literals. user_is_officer_in_guild matched
--      cgm.role IN ('Officer', 'Guild Master'), so a guild that renamed its
--      officer rank lost the ability to update guild_settings. is_guild_officer
--      resolves rank through guild_roles.position >= 50 instead, which is the
--      fix already applied elsewhere for GH #60.
--
-- All five functions are additionally granted to anon and hold a PUBLIC EXECUTE
-- bit, so they are reachable at POST /rest/v1/rpc/<name> with the publishable
-- anon key. The lockdown in 20260722000001 did not cover them.
--
-- Ordering note: the guild_settings policies are repointed before the helpers
-- they reference are dropped.

-- ---------------------------------------------------------------------------
-- 1. Repoint the guild_settings policies onto the session-bound helpers
-- ---------------------------------------------------------------------------

-- SELECT: active members of the guild. get_current_user_guild_ids() is the
-- auth.uid()-bound equivalent of user_is_in_guild(auth.uid(), guild_id). The
-- is_guild_officer() arm additionally admits the guild creator, who may not
-- hold a character_guild_memberships row of their own — the same creator clause
-- is_guild_master/is_guild_officer already carry.
DROP POLICY IF EXISTS "Guild members can view their guild settings" ON "public"."guild_settings";

CREATE POLICY "Guild members can view their guild settings"
  ON "public"."guild_settings"
  FOR SELECT
  USING (
    "guild_id" IN (SELECT "public"."get_current_user_guild_ids"())
    OR "public"."is_guild_officer"("guild_id")
  );

-- UPDATE: officers and above. Switching to is_guild_officer() also restores
-- access for guilds using custom role names (defect 2 above).
DROP POLICY IF EXISTS "Officers can update guild settings" ON "public"."guild_settings";

CREATE POLICY "Officers can update guild settings"
  ON "public"."guild_settings"
  FOR UPDATE
  USING ("public"."is_guild_officer"("guild_id"))
  WITH CHECK ("public"."is_guild_officer"("guild_id"));

-- ---------------------------------------------------------------------------
-- 2. Repair create_expansion_for_guild
-- ---------------------------------------------------------------------------
-- Reachable from app/services/expansionSeeder.ts when seedExpansionForGuild is
-- called with useServiceRole=false, so it is repaired rather than dropped.
--
-- The old guard admitted "creator OR any active member". It has never actually
-- run (see defect 1), so tightening it to officer-and-above cannot regress any
-- working behavior, and it matches the permission level of the sibling
-- set_guild_active_expansion. is_guild_officer() already covers the creator,
-- which is what the guild-creation flow needs.
CREATE OR REPLACE FUNCTION "public"."create_expansion_for_guild"("p_guild_id" "uuid", "p_name" "text")
    RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_expansion_id UUID;
BEGIN
  IF NOT public.is_guild_officer(p_guild_id) THEN
    RAISE EXCEPTION 'Not authorized to create expansion for this guild';
  END IF;

  INSERT INTO expansions (guild_id, name, current_phase)
  VALUES (p_guild_id, p_name, 1)
  RETURNING id INTO v_expansion_id;

  RETURN v_expansion_id;
END;
$$;

COMMENT ON FUNCTION "public"."create_expansion_for_guild"("p_guild_id" "uuid", "p_name" "text") IS
  'Creates an expansion for a guild. Authorized via the auth.uid()-bound is_guild_officer(), which fails closed for anon (GH #193).';

-- CREATE OR REPLACE preserves the existing ACL, so revoke explicitly. The
-- function is only reached through a user-scoped client, so authenticated keeps
-- EXECUTE and the in-function guard does the authorization.
REVOKE ALL ON FUNCTION "public"."create_expansion_for_guild"("p_guild_id" "uuid", "p_name" "text") FROM PUBLIC;
REVOKE ALL ON FUNCTION "public"."create_expansion_for_guild"("p_guild_id" "uuid", "p_name" "text") FROM "anon";
GRANT EXECUTE ON FUNCTION "public"."create_expansion_for_guild"("p_guild_id" "uuid", "p_name" "text") TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."create_expansion_for_guild"("p_guild_id" "uuid", "p_name" "text") TO "service_role";

-- ---------------------------------------------------------------------------
-- 3. Drop the dead / superseded functions
-- ---------------------------------------------------------------------------
-- Verified against production before writing this migration: no RLS policy, no
-- function body, and no view references any of these, and the repo contains no
-- .rpc() call for them (app, discord-bot, addon and companion all checked).
--
-- set_guild_active_expansion is a mutating SECURITY DEFINER function granted to
-- anon whose only authorization guard is the broken guild_members lookup. It has
-- no callers and its job is a one-line UPDATE already performed directly by
-- app/services/expansionSeeder.ts under RLS, so it is removed rather than
-- repaired — leaving a repaired-but-unused mutating RPC exposed to anon is
-- strictly more surface for no benefit.
DROP FUNCTION IF EXISTS "public"."set_guild_active_expansion"("p_guild_id" "uuid", "p_expansion_id" "uuid");

-- The spoofable-by-construction helper from GH #193. Also broken (guild_members)
-- and carrying no SET search_path despite being SECURITY DEFINER.
DROP FUNCTION IF EXISTS "public"."is_officer_of_guild"("user_id_to_check" "uuid", "guild_id_to_check" "uuid");

-- Superseded by get_current_user_guild_ids() / is_guild_officer() in step 1.
DROP FUNCTION IF EXISTS "public"."user_is_in_guild"("p_user_id" "uuid", "p_guild_id" "uuid");
DROP FUNCTION IF EXISTS "public"."user_is_officer_in_guild"("p_user_id" "uuid", "p_guild_id" "uuid");

-- Guild Discord server links and guild helper rules: a Discord server is
-- linked to a guild only by the server, guild helpers used by policies read
-- the signed-in user, invite redemption is server-only, and character
-- aliases point only at active members of their guild.
--
-- Background
-- ----------
-- guilds.discord_server_id ties a guild to a Discord server. The Discord bot
-- (resolveGuildFromDiscord), joining a guild through Discord, the channel
-- picker and the raid summary and loot announcement posts all act on the
-- guild that names a server.
--
-- The app writes the link in two places: PUT /api/guilds/info (guild
-- settings, with the service role) and POST /api/guilds (guild creation).
-- Both now check, with the signed-in user's own Discord sign-in, that the
-- user owns the server or has Administrator or Manage Server in it, and
-- guild creation writes the verified link with the service role after the
-- insert. The guilds policies decide who may write a guild row (INSERT: the
-- creator; UPDATE: any officer), not which values its columns may hold.
--
-- Two SELECT policies call get_user_guild_ids(p_user_id): "Guild members
-- can view guild memberships" on character_guild_memberships (passing
-- auth.uid()) and "Profiles viewable by self or guildmates" on profiles
-- (passing the row's user id). The other guild helpers that policies call
-- read the signed-in user themselves (get_current_user_guild_ids,
-- is_guild_officer, is_guild_master; see 20260804000001). No app, bot,
-- script or companion code calls get_user_guild_ids.
--
-- redeem_invite_code is called only by POST /api/guild-invites/[code]. That
-- route used the user's session for the call, so authenticated kept EXECUTE
-- (class b in 20260930000200). The route now calls it with the service role.
--
-- character_aliases maps a name seen in raid logs to a character of the
-- guild. It is written by POST /api/character-aliases (the service role,
-- after a manage_members check) and by officer sessions through PostgREST.
-- Its INSERT and UPDATE policies check only is_guild_officer(guild_id), not
-- which character a row points at. Both app callers pick characters from
-- the guild's active roster.
--
-- Fix
-- ---
-- 1. Guild Discord server link. One BEFORE INSERT OR UPDATE OF
-- discord_server_id trigger on guilds, enforce_guild_discord_link_rules,
-- holds anon and authenticated sessions to:
--
--   * INSERT only with discord_server_id NULL (the column default). Guild
--     creation inserts the guild with the user's session and no link, then
--     the server writes the verified link with the service role.
--   * UPDATE only when discord_server_id is unchanged. Edits of the other
--     guild columns by officers are not affected, including an UPDATE that
--     sets discord_server_id to its stored value.
--
-- The guard is the one in 20260930000100: the function reads
-- current_setting('role', true) and checks only 'anon' and 'authenticated',
-- and writes made by another trigger function (pg_trigger_depth() > 1) pass.
-- The service role, postgres and migrations are not checked. This is a
-- separate function and trigger, so enforce_guild_owner_write_rules from
-- 20260930000100 is unchanged.
--
-- 2. Guild helpers read the signed-in user. A new helper,
-- get_current_user_guildmate_ids(), takes no argument and returns the user
-- ids of the signed-in user's guildmates: users with an active membership in
-- one of the signed-in user's active guilds (get_current_user_guild_ids, so
-- "the signed-in user's active guilds" stays defined in one place). It
-- returns no rows for anon. It is SECURITY DEFINER with a pinned search_path,
-- EXECUTE revoked from PUBLIC and granted to anon, authenticated and
-- service_role (class d in 20260930000200), since policies call it.
--
-- The two policies are rebuilt with the same names and commands:
--
--   * memberships: guild_id IN (SELECT get_current_user_guild_ids()), which
--     has the same body as get_user_guild_ids with auth.uid() in place of
--     the argument, and the old policy passed auth.uid().
--   * profiles: auth.uid() = id OR id IN (SELECT
--     get_current_user_guildmate_ids()). The old policy asked, per row,
--     whether the row's user shares an active guild with the signed-in user;
--     the new one asks whether the row's user is in the signed-in user's
--     guildmate set, which is the same question, computed once per query.
--
-- Then get_user_guild_ids is dropped, without CASCADE. Postgres records
-- policy expressions as dependencies, so the drop refuses (SQLSTATE 2BP01)
-- while any policy, view or function still depends on it, and the whole
-- migration then rolls back.
--
-- 3. Invite redemption is server-only. redeem_invite_code moves to class a
-- of 20260930000200: EXECUTE is revoked from PUBLIC, anon and authenticated
-- and granted to service_role only. The function reads no auth.uid(), so
-- its results do not change.
--
-- 4. Character aliases stay inside their guild. One BEFORE INSERT OR UPDATE
-- OF guild_id, character_id trigger on character_aliases,
-- enforce_character_alias_guild_refs, accepts a row only when its
-- character_id has an active character_guild_memberships row in its
-- guild_id (is_active = true, the rule the loot_history trigger of
-- 20260929180000 uses). It applies to every role, the service role
-- included, and to the insert phase of an upsert. On UPDATE it checks only
-- a write that changes guild_id or character_id, so existing rows stay
-- editable (for example an alias_name change). A NULL guild_id or
-- character_id is left to the NOT NULL constraints. POST
-- /api/character-aliases makes the same check first and answers with a 400.
--
-- Why triggers
-- ------------
-- A policy WITH CHECK sees only the new row. It cannot compare NEW with OLD,
-- so it cannot express "discord_server_id is unchanged", and it cannot tell
-- the server's write from a user session's write to the same column. The
-- trigger reads the role setting for that.
--
-- The policies decide who may write a row, not what a row may point at, and
-- the server routes write with the service role, which bypasses RLS. A
-- trigger applies to every writer, so the alias rule holds for the routes
-- and for PostgREST alike.
--
-- Security: each trigger function is SECURITY DEFINER with a pinned
-- search_path, and EXECUTE is revoked from PUBLIC, anon and authenticated
-- (the 20260722000001 pattern). Triggers still fire for those roles, but the
-- functions cannot be called directly. Neither function writes anything.
--
-- Error contract
-- --------------
-- enforce_guild_discord_link_rules: a refused write raises SQLSTATE 42501
-- (insufficient_privilege) with the message RLS gives,
-- 'new row violates row-level security policy for table "guilds"', and no
-- DETAIL. The message is passed with RAISE USING MESSAGE, never as a format
-- string. The body reads only NEW, OLD, TG_OP, the role setting and the
-- trigger depth; it never reads table data.
--
-- enforce_character_alias_guild_refs: a refused write raises SQLSTATE 23514
-- (check_violation) with the message
-- 'character_aliases.character_id is not an active member of this guild'
-- and DETAIL 'character_id <id>, guild_id <id>' (the ids the write sent).
-- As in 20260929180000, an anon or authenticated caller who is not an
-- officer of the row's guild, and whom RLS would refuse anyway, gets the
-- RLS error instead (42501, 'new row violates row-level security policy
-- for table "character_aliases"', no DETAIL), so the check reveals nothing
-- to them.
--
-- Not changed
-- -----------
-- Existing Discord server links are kept as they are; the rule governs new
-- links only. Existing character_aliases rows are not validated or changed;
-- the rule applies to new rows and to changes of guild_id or character_id. Several guilds may still share one Discord server (for example
-- a Classic guild and a Forever guild in one community server); there is no
-- unique constraint on discord_server_id. The file is safe to re-run: every
-- statement is CREATE OR REPLACE, COMMENT, REVOKE, GRANT, DROP POLICY IF
-- EXISTS followed by CREATE POLICY, or DROP FUNCTION IF EXISTS.
--
-- Deploy order
-- ------------
-- The app code ships first and must be live before this migration runs: it
-- writes the Discord server link with the service role and calls
-- redeem_invite_code with the service role. Otherwise guild creation with a
-- Discord server would be refused by the trigger, and invite redemption
-- would be refused for lack of EXECUTE.
--
-- Rollback
-- --------
-- A forward migration with these statements, in this order, restores the
-- previous behaviour. No data changes either way. get_user_guild_ids is
-- recreated before the policies that use it, and its REVOKE comes before
-- its GRANT (a new function starts with the PUBLIC default). The guildmate
-- helper is dropped only after the profiles policy stops using it:
--
--   DROP TRIGGER IF EXISTS "enforce_guild_discord_link_rules" ON "public"."guilds";
--   DROP FUNCTION IF EXISTS "public"."enforce_guild_discord_link_rules"();
--   CREATE OR REPLACE FUNCTION "public"."get_user_guild_ids"("p_user_id" "uuid") RETURNS TABLE("guild_id" "uuid")
--       LANGUAGE "sql" STABLE SECURITY DEFINER
--       SET "search_path" TO 'public', 'pg_temp'
--       AS $$
--       SELECT DISTINCT cgm.guild_id
--       FROM character_guild_memberships cgm
--       INNER JOIN characters c ON c.id = cgm.character_id
--       WHERE c.user_id = p_user_id
--       AND cgm.is_active = true;
--     $$;
--   REVOKE ALL ON FUNCTION "public"."get_user_guild_ids"("p_user_id" "uuid") FROM PUBLIC;
--   GRANT EXECUTE ON FUNCTION "public"."get_user_guild_ids"("p_user_id" "uuid") TO "anon", "authenticated", "service_role";
--   DROP POLICY IF EXISTS "Guild members can view guild memberships" ON "public"."character_guild_memberships";
--   CREATE POLICY "Guild members can view guild memberships" ON "public"."character_guild_memberships" FOR SELECT USING (("guild_id" IN ( SELECT "public"."get_user_guild_ids"("auth"."uid"()) AS "get_user_guild_ids")));
--   DROP POLICY IF EXISTS "Profiles viewable by self or guildmates" ON "public"."profiles";
--   CREATE POLICY "Profiles viewable by self or guildmates" ON "public"."profiles"
--     FOR SELECT USING (
--       "auth"."uid"() = "id"
--       OR EXISTS (
--         SELECT 1
--         FROM "public"."get_user_guild_ids"("profiles"."id") AS "target"("guild_id")
--         WHERE "target"."guild_id" IN (SELECT "public"."get_current_user_guild_ids"())
--       )
--     );
--   DROP FUNCTION IF EXISTS "public"."get_current_user_guildmate_ids"();
--   GRANT EXECUTE ON FUNCTION "public"."redeem_invite_code"("code_input" "text") TO "authenticated";
--   DROP TRIGGER IF EXISTS "enforce_character_alias_guild_refs" ON "public"."character_aliases";
--   DROP FUNCTION IF EXISTS "public"."enforce_character_alias_guild_refs"();

-- ---------------------------------------------------------------------------
-- 1. guilds: the Discord server link is written only by the server
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION "public"."enforce_guild_discord_link_rules"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  -- Only user sessions are checked. The service role, postgres, migrations
  -- and writes made by another trigger function pass unchanged.
  IF coalesce(current_setting('role', true), '') NOT IN ('anon', 'authenticated')
     OR pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  -- A user session may create a guild without a Discord server link, and
  -- may not set or change the link of a guild.
  IF TG_OP = 'INSERT' THEN
    IF NEW.discord_server_id IS NULL THEN
      RETURN NEW;
    END IF;
  ELSIF NEW.discord_server_id IS NOT DISTINCT FROM OLD.discord_server_id THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION USING
    MESSAGE = 'new row violates row-level security policy for table "guilds"',
    ERRCODE = 'insufficient_privilege';
END;
$$;

COMMENT ON FUNCTION "public"."enforce_guild_discord_link_rules"() IS 'A guild''s Discord server link is written only by the server. For anon and authenticated sessions an INSERT is accepted only with discord_server_id NULL, and an UPDATE only when discord_server_id is unchanged. The service role, postgres, migrations and writes made by another trigger are not checked. A refused write gets the RLS error. SECURITY DEFINER with EXECUTE revoked from PUBLIC, anon and authenticated.';

REVOKE ALL ON FUNCTION "public"."enforce_guild_discord_link_rules"() FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE TRIGGER "enforce_guild_discord_link_rules" BEFORE INSERT OR UPDATE OF "discord_server_id" ON "public"."guilds" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_guild_discord_link_rules"();

COMMENT ON TRIGGER "enforce_guild_discord_link_rules" ON "public"."guilds" IS 'A guild''s Discord server link is set or changed only by the server. See public.enforce_guild_discord_link_rules().';

-- ---------------------------------------------------------------------------
-- 2. Guild helpers read the signed-in user
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION "public"."get_current_user_guildmate_ids"() RETURNS SETOF "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  SELECT DISTINCT c.user_id
  FROM public.character_guild_memberships cgm
  JOIN public.characters c ON c.id = cgm.character_id
  WHERE cgm.is_active = true
    AND c.user_id IS NOT NULL
    AND cgm.guild_id IN (SELECT public.get_current_user_guild_ids());
$$;

COMMENT ON FUNCTION "public"."get_current_user_guildmate_ids"() IS 'User ids of the signed-in user''s guildmates: users with an active membership in one of the signed-in user''s active guilds (get_current_user_guild_ids). No rows for anon. Used by the profiles SELECT policy. SECURITY DEFINER with EXECUTE for anon, authenticated and service_role only.';

REVOKE ALL ON FUNCTION "public"."get_current_user_guildmate_ids"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."get_current_user_guildmate_ids"() TO "anon", "authenticated", "service_role";

-- The two policies that called get_user_guild_ids, rebuilt on the helpers
-- that read the signed-in user (same names and commands).
DROP POLICY IF EXISTS "Guild members can view guild memberships" ON "public"."character_guild_memberships";

CREATE POLICY "Guild members can view guild memberships" ON "public"."character_guild_memberships" FOR SELECT USING ("guild_id" IN (SELECT "public"."get_current_user_guild_ids"()));

DROP POLICY IF EXISTS "Profiles viewable by self or guildmates" ON "public"."profiles";

CREATE POLICY "Profiles viewable by self or guildmates" ON "public"."profiles" FOR SELECT USING ("auth"."uid"() = "id" OR "id" IN (SELECT "public"."get_current_user_guildmate_ids"()));

-- No policy uses get_user_guild_ids any more. No CASCADE: the drop refuses
-- if anything else still depends on it.
DROP FUNCTION IF EXISTS "public"."get_user_guild_ids"("p_user_id" "uuid");

-- ---------------------------------------------------------------------------
-- 3. Invite redemption is server-only
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION "public"."redeem_invite_code"("code_input" "text") FROM PUBLIC, "anon", "authenticated";

GRANT EXECUTE ON FUNCTION "public"."redeem_invite_code"("code_input" "text") TO "service_role";

-- ---------------------------------------------------------------------------
-- 4. character_aliases: aliases point only at active members of their guild
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION "public"."enforce_character_alias_guild_refs"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  -- A NULL reference is left to the NOT NULL constraints.
  IF NEW.guild_id IS NULL OR NEW.character_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- On UPDATE only a changed guild_id or character_id is checked, so
  -- existing rows stay editable.
  IF TG_OP = 'UPDATE'
     AND NEW.guild_id IS NOT DISTINCT FROM OLD.guild_id
     AND NEW.character_id IS NOT DISTINCT FROM OLD.character_id THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.character_guild_memberships cgm
    WHERE cgm.character_id = NEW.character_id
      AND cgm.guild_id = NEW.guild_id
      AND cgm.is_active = true
  ) THEN
    RETURN NEW;
  END IF;

  -- A BEFORE trigger runs before the RLS WITH CHECK. A user session that RLS
  -- refuses anyway gets the error RLS gives, so the check reveals nothing.
  IF coalesce(current_setting('role', true), '') IN ('anon', 'authenticated')
     AND NOT public.is_guild_officer(NEW.guild_id) THEN
    RAISE EXCEPTION USING
      MESSAGE = 'new row violates row-level security policy for table "character_aliases"',
      ERRCODE = 'insufficient_privilege';
  END IF;

  RAISE EXCEPTION USING
    MESSAGE = 'character_aliases.character_id is not an active member of this guild',
    DETAIL = format('character_id %s, guild_id %s', NEW.character_id, NEW.guild_id),
    ERRCODE = 'check_violation';
END;
$$;

COMMENT ON FUNCTION "public"."enforce_character_alias_guild_refs"() IS 'Character aliases point only at characters with an active membership in the alias''s guild, for every role including service_role. On UPDATE only a change of guild_id or character_id is checked, so existing rows stay editable. When the check fails for an anon or authenticated caller who is not an officer of the guild, the RLS error is raised instead. SECURITY DEFINER with EXECUTE revoked from PUBLIC, anon and authenticated.';

REVOKE ALL ON FUNCTION "public"."enforce_character_alias_guild_refs"() FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE TRIGGER "enforce_character_alias_guild_refs" BEFORE INSERT OR UPDATE OF "guild_id", "character_id" ON "public"."character_aliases" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_character_alias_guild_refs"();

COMMENT ON TRIGGER "enforce_character_alias_guild_refs" ON "public"."character_aliases" IS 'Keeps character aliases pointing at active members of the alias''s own guild. See public.enforce_character_alias_guild_refs().';

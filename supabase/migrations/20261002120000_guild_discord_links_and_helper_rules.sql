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
-- [Parts 2 to 4: background added in later steps.]
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
-- [Part 2: guild helpers read the signed-in user. Added in a later step.]
--
-- [Part 3: invite redemption is server-only. Added in a later step.]
--
-- [Part 4: character aliases stay inside their guild. Added in a later step.]
--
-- Why triggers
-- ------------
-- A policy WITH CHECK sees only the new row. It cannot compare NEW with OLD,
-- so it cannot express "discord_server_id is unchanged", and it cannot tell
-- the server's write from a user session's write to the same column. The
-- trigger reads the role setting for that.
--
-- Security: each trigger function is SECURITY DEFINER with a pinned
-- search_path, and EXECUTE is revoked from PUBLIC, anon and authenticated
-- (the 20260722000001 pattern). Triggers still fire for those roles, but the
-- functions cannot be called directly.
--
-- Error contract
-- --------------
-- enforce_guild_discord_link_rules: a refused write raises SQLSTATE 42501
-- (insufficient_privilege) with the message RLS gives,
-- 'new row violates row-level security policy for table "guilds"', and no
-- DETAIL. The message is passed with RAISE USING MESSAGE, never as a format
-- string. The body reads only NEW, OLD, TG_OP, the role setting and the
-- trigger depth; it never reads table data and writes nothing.
--
-- Not changed
-- -----------
-- Existing Discord server links are kept as they are; the rule governs new
-- links only. Several guilds may still share one Discord server (for example
-- a Classic guild and a Forever guild in one community server); there is no
-- unique constraint on discord_server_id. The file is safe to re-run: every
-- statement is CREATE OR REPLACE, COMMENT, REVOKE, GRANT, DROP POLICY IF
-- EXISTS or DROP FUNCTION IF EXISTS.
--
-- Deploy order
-- ------------
-- The app code that writes the link with the service role ships first and
-- must be live before this migration runs; otherwise guild creation with a
-- Discord server would be refused by the trigger.
--
-- Rollback
-- --------
-- A forward migration with these statements restores the previous behaviour.
-- No data changes either way:
--
--   DROP TRIGGER IF EXISTS "enforce_guild_discord_link_rules" ON "public"."guilds";
--   DROP FUNCTION IF EXISTS "public"."enforce_guild_discord_link_rules"();

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

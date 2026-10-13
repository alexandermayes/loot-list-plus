-- Drop the unused guild update functions update_guild_icon and update_guild_info.
--
-- Problem
-- -------
-- Both are SECURITY DEFINER functions from the baseline that let the guild
-- creator change icon_url, or name, realm, faction and discord_server_id.
-- Nothing in the app, the Discord bot, the companion or scripts calls them,
-- and since 20260930000200 only service_role can execute them, so they are
-- dead code with write power over guilds (GH #351).
--
-- Fix
-- ---
-- Drop both by exact signature. No CASCADE, so the drop refuses if anything
-- still depends on them. The DO block at the end stops the migration if
-- either name still exists in schema public.
--
-- Error contract
-- --------------
-- Any call to either function, by any role including service_role, now gets
-- PostgreSQL 42883 (function does not exist); through PostgREST it is
-- PGRST202. anon and authenticated already got 42501. No app path is
-- affected because none calls them.
--
-- Production safety
-- -----------------
-- DROP FUNCTION locks only the function objects, not the guilds table. SET
-- LOCAL lock_timeout gives up after 5 seconds instead of queueing, and a
-- timeout rolls the whole file back so the next deploy runs it again. IF
-- EXISTS makes it idempotent; no data changes. Their grants and comments go
-- with them.
--
-- Not changed
-- -----------
-- The guilds table, its rows, policies and triggers
-- (enforce_guild_discord_link_rules still guards discord_server_id). Every
-- other function. 20260930000200, which stays as shipped (forward-only). The
-- #361 helpers get_current_user_guild_ids and get_current_user_guildmate_ids.
--
-- Deploy
-- ------
-- Normal PR. It also changes lib/database.types.ts and adds a test, so CI
-- runs and no admin override is needed. The migration deploys about 12
-- seconds after merge.
--
-- Rollback
-- --------
-- A forward migration that re-creates both functions from the baseline
-- definition (the CREATE OR REPLACE FUNCTION, ALTER FUNCTION OWNER and
-- COMMENT statements at 20260101000000 lines 1124-1195), then applies the
-- 20260930000200 REVOKE and GRANT pairs and the search_path pin on
-- update_guild_info, restores them exactly (the REVOKE is required, CREATE
-- grants EXECUTE to PUBLIC by default). Nothing in the app or in the #361
-- helpers references them, so the app never needs the rollback.

SET LOCAL lock_timeout = '5s';

DROP FUNCTION IF EXISTS "public"."update_guild_icon"("p_guild_id" "uuid", "p_icon_url" "text");

DROP FUNCTION IF EXISTS "public"."update_guild_info"("p_guild_id" "uuid", "p_name" "text", "p_realm" "text", "p_faction" "text", "p_discord_server_id" "text");

DO $$
DECLARE
  v_name text;
BEGIN
  FOR v_name IN
    SELECT p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname IN ('update_guild_icon', 'update_guild_info')
  LOOP
    RAISE EXCEPTION 'public.% still exists after the drop', v_name;
  END LOOP;
END
$$;

-- Raid team rows point only at active members of their guild.
--
-- Problem
-- -------
-- The raid_team_members INSERT and UPDATE policies check only
-- is_guild_officer(guild_id). They decide who may write a guild's raid team
-- roster, not which character a row may name. An officer of guild A calling
-- PostgREST directly with their own session can save a raid_team_members row
-- for another guild's character, or for a raider who has left guild A. The
-- app route already checks this (POST /api/raid-teams/[id]/members refuses a
-- non-active character before writing), but it writes with the service role,
-- which bypasses RLS, and the database itself has no guard. loot_history
-- (20260929180000) and character_aliases (20261002120000) already have this
-- rule as a BEFORE INSERT OR UPDATE trigger; this migration follows that
-- pattern.
--
-- Fix
-- ---
-- One BEFORE INSERT OR UPDATE OF guild_id, character_id trigger,
-- enforce_guild_character_refs, accepts a raid_team_members row only when
-- its character_id has an active (is_active = true) character_guild_memberships
-- row in its guild_id. It applies to every role, the service role included.
-- On UPDATE it checks only a write that changes guild_id or character_id, so
-- existing rows stay editable. The function is SECURITY DEFINER with a
-- pinned search_path and EXECUTE revoked from PUBLIC, anon and authenticated.
-- The body is read-only.
--
-- Membership rule
-- ---------------
-- raid_team_members: a current roster concerns current members, and the
-- members route already requires an active membership in the guild before it
-- writes, so the character needs an active character_guild_memberships row
-- in the row's own guild_id. An active membership in another guild does not
-- count.
--
-- Readers and writers checked
-- ----------------------------
-- Every app writer of raid_team_members (the raid-teams members route) sends
-- only characters with an active membership in the guild, or changes no
-- reference column. Readers are unchanged: the trigger adds no policy.
--
-- Error contract
-- --------------
-- A refused write raises SQLSTATE 23514 (check_violation, PostgREST 400)
-- with a fixed message and a DETAIL naming the ids the write sent. An anon or
-- authenticated caller who is not an officer of the row's guild gets the RLS
-- error instead (42501, 'new row violates row-level security policy for
-- table "raid_team_members"', no DETAIL), so the check reveals nothing to
-- them. A row that passes every check is always handed on, so RLS alone
-- decides who may write it. service_role, postgres and migrations are never
-- anon or authenticated, so they always get the 23514.
--
-- Production safety
-- ------------------
-- CREATE OR REPLACE TRIGGER takes a SHARE ROW EXCLUSIVE lock on the table for
-- the rest of the transaction; SET LOCAL lock_timeout gives up after 5
-- seconds instead of queueing behind a long query, and a timeout rolls the
-- whole file back so the next deploy runs it again. Every statement is
-- idempotent (CREATE OR REPLACE, COMMENT, REVOKE) and no existing row can
-- make the file fail. Per-row cost: one indexed lookup on
-- character_guild_memberships (unique_character_guild).
--
-- Not changed
-- -----------
-- Every policy, every other trigger, function and grant, lib/database.types.ts
-- and every existing row. Existing rows are not validated or changed: the
-- trigger checks only new writes and reference changes.
--
-- Deploy
-- ------
-- One migration-only PR, merged with --admin; it deploys about 12 seconds
-- after merge. No app PR is needed first.
--
-- Rollback
-- --------
-- A forward migration with these statements, in this order, restores the
-- previous behaviour. No data changes either way.
--
--   DROP TRIGGER IF EXISTS "enforce_guild_character_refs" ON "public"."raid_team_members";
--   DROP FUNCTION IF EXISTS "public"."enforce_guild_character_refs"();

SET LOCAL lock_timeout = '5s';

CREATE OR REPLACE FUNCTION "public"."enforce_guild_character_refs"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  -- A NULL reference is left to the NOT NULL or CHECK constraints.
  IF NEW.guild_id IS NULL OR NEW.character_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- On UPDATE only a changed guild_id or character_id is checked, so
  -- existing rows, including rows of raiders who have left, stay editable.
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

  -- A BEFORE trigger runs before the RLS WITH CHECK. A caller RLS would
  -- refuse anyway gets the error RLS gives, so the check reveals nothing.
  IF coalesce(current_setting('role', true), '') IN ('anon', 'authenticated')
     AND NOT public.is_guild_officer(NEW.guild_id) THEN
    RAISE EXCEPTION USING
      MESSAGE = 'new row violates row-level security policy for table "' || TG_TABLE_NAME || '"',
      ERRCODE = 'insufficient_privilege';
  END IF;

  RAISE EXCEPTION USING
    MESSAGE = TG_TABLE_NAME || '.character_id is not an active member of this guild',
    DETAIL = format('character_id %s, guild_id %s', NEW.character_id, NEW.guild_id),
    ERRCODE = 'check_violation';
END;
$$;

COMMENT ON FUNCTION "public"."enforce_guild_character_refs"() IS 'Keeps a row''s character_id pointing at a character with an active membership in the row''s guild_id, for every role including service_role. On UPDATE only a change of guild_id or character_id is checked, so existing rows stay editable. When the check fails for an anon or authenticated caller who is not an officer of the guild, the RLS error is raised instead. SECURITY DEFINER with EXECUTE revoked from PUBLIC, anon and authenticated.';

REVOKE ALL ON FUNCTION "public"."enforce_guild_character_refs"() FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE TRIGGER "enforce_guild_character_refs" BEFORE INSERT OR UPDATE OF "guild_id", "character_id" ON "public"."raid_team_members" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_guild_character_refs"();

COMMENT ON TRIGGER "enforce_guild_character_refs" ON "public"."raid_team_members" IS 'Keeps raid team rows pointing at active members of the row''s own guild. See public.enforce_guild_character_refs().';

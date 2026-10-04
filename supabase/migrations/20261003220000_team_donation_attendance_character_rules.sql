-- Raid team, donation and attendance rows point only at characters of their guild.
--
-- Problem
-- -------
-- The raid_team_members and donation_records INSERT and UPDATE policies
-- check only is_guild_officer(guild_id); the attendance_records policies
-- check only that the caller is an officer of the raid event's guild. They
-- decide who may write a guild's rows, not which character a row may name.
-- An officer of guild A calling PostgREST directly with their own session
-- can save a row for another guild's character, or for a raider who has left
-- guild A. The app routes already check this before writing (the raid-teams
-- members route, POST /api/donations, the raid-tracking attendance paths),
-- but they write with the service role, which bypasses RLS, and the
-- database itself has no guard. loot_history (20260929180000) and
-- character_aliases (20261002120000) already have this rule as a BEFORE
-- INSERT OR UPDATE trigger; this migration follows that pattern.
--
-- Fix
-- ---
-- enforce_guild_character_refs is a BEFORE INSERT OR UPDATE OF guild_id,
-- character_id trigger on raid_team_members and donation_records: it
-- accepts a row only when its character_id has an active (is_active = true)
-- character_guild_memberships row in its guild_id. enforce_attendance_character_refs
-- is a BEFORE INSERT OR UPDATE OF raid_event_id, character_id trigger on
-- attendance_records: it accepts a row only when its character_id has a
-- membership row (any status) in the guild of its raid_event_id. Both apply
-- to every role, the service role included. On UPDATE each checks only a
-- write that changes its reference columns, so existing rows stay editable.
-- Both functions are SECURITY DEFINER with a pinned search_path and EXECUTE
-- revoked from PUBLIC, anon and authenticated. Both bodies are read-only.
--
-- Membership rule
-- ---------------
-- raid_team_members and donation_records: a current roster and a donation
-- logged now both concern current members, and the members route and POST
-- /api/donations already require an active membership in the guild before
-- they write, so the character needs an active character_guild_memberships
-- row in the row's own guild_id. An active membership in another guild does
-- not count.
-- attendance_records: an attendance row has no guild_id of its own; its
-- guild is raid_events.guild_id of its raid_event_id. Attendance records a
-- raid night that has already happened, and the raid-tracking import sends a
-- whole night in one upsert from a roster loaded earlier without checking
-- the response, so the rule accepts any membership row of the character in
-- that guild, active or not; a character who was never in the guild is
-- still refused.
--
-- Readers and writers checked
-- ----------------------------
-- Every app writer of the three tables (the raid-teams members route, the
-- donations routes, the attendance bulk and auto-link routes, the
-- raid-tracking import, the companion and addon imports, and the backfill
-- script) sends only characters with an active or, for attendance, any
-- membership in the guild, or changes no reference column, or moves an
-- attendance row inside one guild. Readers are unchanged: the triggers add
-- no policy.
--
-- Error contract
-- --------------
-- A refused write raises SQLSTATE 23514 (check_violation, PostgREST 400)
-- with a fixed message and a DETAIL naming the ids the write sent. An anon
-- or authenticated caller who is not an officer of the row's guild (or of
-- the raid event's guild, for attendance) gets the RLS error instead (42501,
-- 'new row violates row-level security policy for table "<table>"', no
-- DETAIL), so the check reveals nothing to them. A row that passes every
-- check is always handed on, so RLS alone decides who may write it.
-- service_role, postgres and migrations are never anon or authenticated, so
-- they always get the 23514.
--
-- Production safety
-- ------------------
-- CREATE OR REPLACE TRIGGER takes a SHARE ROW EXCLUSIVE lock on each table
-- for the rest of the transaction; SET LOCAL lock_timeout gives up after 5
-- seconds instead of queueing behind a long query, and a timeout rolls the
-- whole file back so the next deploy runs it again. Every statement is
-- idempotent (CREATE OR REPLACE, COMMENT, REVOKE) and no existing row can
-- make the file fail. Per-row cost: one primary-key lookup on raid_events
-- (attendance only) and one indexed lookup on character_guild_memberships
-- (unique_character_guild).
--
-- Not changed
-- -----------
-- Every policy, every other trigger, function and grant, lib/database.types.ts
-- and every existing row. Existing rows are not validated or changed: the
-- triggers check only new writes and reference changes.
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
--   DROP TRIGGER IF EXISTS "enforce_guild_character_refs" ON "public"."donation_records";
--   DROP FUNCTION IF EXISTS "public"."enforce_guild_character_refs"();
--   DROP TRIGGER IF EXISTS "enforce_attendance_character_refs" ON "public"."attendance_records";
--   DROP FUNCTION IF EXISTS "public"."enforce_attendance_character_refs"();

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

CREATE OR REPLACE TRIGGER "enforce_guild_character_refs" BEFORE INSERT OR UPDATE OF "guild_id", "character_id" ON "public"."donation_records" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_guild_character_refs"();

COMMENT ON TRIGGER "enforce_guild_character_refs" ON "public"."donation_records" IS 'Keeps donation rows pointing at active members of the row''s own guild. See public.enforce_guild_character_refs().';

CREATE OR REPLACE FUNCTION "public"."enforce_attendance_character_refs"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_guild uuid;
  v_old_guild uuid;
BEGIN
  -- A NULL reference is left to the character identifier CHECK constraint.
  IF NEW.character_id IS NULL OR NEW.raid_event_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT re.guild_id INTO v_guild FROM public.raid_events re WHERE re.id = NEW.raid_event_id;

  -- A missing raid event is left to the foreign key, and to RLS for
  -- sessions; a raid event without a guild names no guild.
  IF v_guild IS NULL THEN
    RETURN NEW;
  END IF;

  -- A move to another raid event of the same guild keeps every existing row
  -- working, as the backfill script and routeRecordsToTeamEvents do.
  IF TG_OP = 'UPDATE' AND NEW.character_id IS NOT DISTINCT FROM OLD.character_id THEN
    SELECT re.guild_id INTO v_old_guild FROM public.raid_events re WHERE re.id = OLD.raid_event_id;
    IF v_old_guild IS NOT DISTINCT FROM v_guild THEN
      RETURN NEW;
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.character_guild_memberships cgm
    WHERE cgm.character_id = NEW.character_id
      AND cgm.guild_id = v_guild
  ) THEN
    RETURN NEW;
  END IF;

  -- A BEFORE trigger runs before the RLS WITH CHECK. A caller RLS would
  -- refuse anyway gets the error RLS gives, so the check reveals nothing.
  IF coalesce(current_setting('role', true), '') IN ('anon', 'authenticated')
     AND NOT public.is_guild_officer(v_guild) THEN
    RAISE EXCEPTION USING
      MESSAGE = 'new row violates row-level security policy for table "attendance_records"',
      ERRCODE = 'insufficient_privilege';
  END IF;

  RAISE EXCEPTION USING
    MESSAGE = 'attendance_records.character_id is not a member of this guild',
    DETAIL = format('character_id %s, raid_event_id %s', NEW.character_id, NEW.raid_event_id),
    ERRCODE = 'check_violation';
END;
$$;

COMMENT ON FUNCTION "public"."enforce_attendance_character_refs"() IS 'Keeps an attendance row''s character_id pointing at a character with a membership in the guild of the row''s raid event, for every role including service_role. On UPDATE only a new character or a move to another guild''s raid event is checked, so existing rows stay editable. When the check fails for an anon or authenticated caller who is not an officer of the guild, the RLS error is raised instead. SECURITY DEFINER with EXECUTE revoked from PUBLIC, anon and authenticated.';

REVOKE ALL ON FUNCTION "public"."enforce_attendance_character_refs"() FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE TRIGGER "enforce_attendance_character_refs" BEFORE INSERT OR UPDATE OF "raid_event_id", "character_id" ON "public"."attendance_records" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_attendance_character_refs"();

COMMENT ON TRIGGER "enforce_attendance_character_refs" ON "public"."attendance_records" IS 'Keeps attendance rows pointing at members of the guild of their raid event. See public.enforce_attendance_character_refs().';

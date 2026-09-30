-- Guild membership write rules: membership rows are written by the server,
-- and a user session can only leave a guild. Guild roles written by a user
-- session stay below officer level, and guild ownership and the
-- subscription tier are server-managed.
--
-- Problem
-- -------
-- Officer rights are read from character_guild_memberships.role and
-- is_active (joined to guild_roles.position) and from guilds.created_by:
-- is_guild_officer (position >= 50), is_guild_master (position >= 100), the
-- "Officers can update guild settings" policy, every policy that calls
-- is_guild_officer, and verifyPermission on the server.
--
-- The character_guild_memberships policies check only character ownership.
-- The guild_roles INSERT and UPDATE policies check only is_guild_officer, and
-- the guilds policies check only the creator (INSERT) or an officer
-- (UPDATE). They decide whose rows a session may write, not which values
-- those rows may hold.
--
-- The app writes memberships through the server with the service role:
-- joining by invite or Discord, guild creation, adding a character, role
-- changes, kicks, trial changes, the auto-promote cron, ownership transfer,
-- the Battle.net import, character removal and account deletion. The one
-- write made with the user's own session is leaving a guild
-- (POST /api/guilds/leave), an UPDATE of is_active to false on the caller's
-- own rows.
--
-- Guild roles are managed in the app by RoleManager, which inserts custom
-- roles below every existing custom role under 50 (never is_default) and
-- swaps positions only among roles other than 50 and 100. Renames and
-- permission edits go through PUT /api/guild-roles with the service role.
-- The default roles (Guild Master 100, Officer 50, Member 0) are inserted by
-- the create_default_guild_roles trigger when a guild is created.
--
-- guilds.created_by is changed only by /api/guilds/transfer-ownership and
-- guilds.subscription_tier only by the Stripe webhook sync
-- (lib/billing/sync.ts), both with the service role.
--
-- Fix
-- ---
-- 1. One BEFORE INSERT OR UPDATE trigger on character_guild_memberships,
-- enforce_guild_membership_write_rules, holds anon and authenticated
-- sessions to leaving a guild:
--
--   * INSERT is refused. A BEFORE INSERT trigger also fires on the insert
--     phase of INSERT ... ON CONFLICT DO UPDATE, so an upsert is refused too,
--     even when the row then conflicts and would update.
--   * UPDATE is accepted only when every column other than is_active is
--     unchanged, and is_active is unchanged or set to false. The comparison
--     is over the whole row (to_jsonb(NEW) - 'is_active' against
--     to_jsonb(OLD) - 'is_active'), so a column added later is covered
--     without changing this function.
--   * DELETE is not handled by the trigger (see below).
--
-- The "Users can insert own character memberships" policy is dropped, since
-- no user-session flow inserts memberships. The "Users can delete own
-- character memberships" policy is dropped as well: leaving is an UPDATE, and
-- no flow deletes a membership with the user's session. The UPDATE policy
-- stays (the leave route needs it) and the SELECT policies stay.
--
-- 2. One BEFORE INSERT OR UPDATE trigger on guild_roles,
-- enforce_guild_role_write_rules, holds anon and authenticated sessions to
-- what RoleManager does:
--
--   * INSERT is accepted only when position is below 50 and is_default is
--     not true.
--   * UPDATE is accepted only when every column other than position is
--     unchanged, and position is unchanged or moves between two values
--     below 50.
--
-- 50 is the officer threshold used by is_guild_officer (gr.position >= 50)
-- and ROLE_POSITIONS.OFFICER. DELETE is unchanged: the policy already
-- requires is_default = false and an officer. A custom role at position 50
-- or above (which the current UI cannot create) can then be moved only by
-- the service role.
--
-- 3. One BEFORE INSERT OR UPDATE OF created_by, subscription_tier trigger on
-- guilds, enforce_guild_owner_write_rules, holds anon and authenticated
-- sessions to:
--
--   * INSERT only with subscription_tier 'free'. Column defaults are applied
--     before BEFORE triggers run, so POST /api/guilds, which never sends the
--     column, gets the default 'free' and passes.
--   * UPDATE only when created_by and subscription_tier are both unchanged.
--
-- The other officer-editable guild columns are not affected.
--
-- Callers that are never checked, in all three functions:
--
--   * service_role, postgres and migrations. Each function reads
--     current_setting('role', true), which keeps the session role inside
--     SECURITY DEFINER functions, and checks only 'anon' and 'authenticated'.
--   * writes made by another trigger function (pg_trigger_depth() > 1).
--     Trigger functions only ship in reviewed migrations. None writes
--     character_guild_memberships or guilds today, and this exemption is
--     what lets create_default_guild_roles insert the three default roles
--     when a guild is created with the user's session (POST /api/guilds): the
--     guild INSERT fires it, and its nested INSERT runs at trigger depth 2.
--
-- No DELETE rule: delete_guild is a SECURITY DEFINER function that the guild
-- delete routes call with the user's session (role setting 'authenticated',
-- trigger depth 0). A DELETE rule in the trigger would stop guild deletion.
-- User-session deletes are governed by the policies, and with the DELETE
-- policy dropped a session deletes no membership rows directly. Foreign key
-- cascades (character deletion, guild deletion) are not subject to RLS and
-- keep working.
--
-- reject_submissions_on_cgm_loss (AFTER UPDATE OR DELETE) still fires on
-- leave, because the leave UPDATE is accepted, so the raider's pending and
-- approved lists in that guild are still moved to rejected.
--
-- Why a trigger
-- -------------
-- A policy WITH CHECK sees only the new row. It cannot compare NEW with OLD,
-- so it cannot express "only is_active may change, and only to false", "the
-- position may move only below 50" or "created_by is unchanged". A policy
-- also cannot tell the default roles, inserted by a nested trigger in the
-- user's own session, from a role the session inserts directly; the trigger
-- depth can.
--
-- Security: each function is SECURITY DEFINER with a pinned search_path, and
-- EXECUTE is revoked from PUBLIC, anon and authenticated (the 20260722000001
-- pattern). Triggers still fire for those roles, but the functions cannot be
-- called directly. The bodies read only NEW, OLD, TG_OP, the trigger depth
-- and the role setting. They never read table data and write nothing.
--
-- Error contract
-- --------------
-- A refused write raises SQLSTATE 42501 (insufficient_privilege) with the
-- same message RLS gives, 'new row violates row-level security policy for
-- table "<table>"' (character_guild_memberships, guild_roles or guilds), and
-- no DETAIL. The message is passed with RAISE USING MESSAGE, never as a
-- format string. Callers that are not checked never reach a RAISE.
--
-- Existing rows are not validated or changed by this migration. Legacy rows
-- (a role that names no guild_roles row, is_active NULL) stay readable and
-- stay writable by the service role, and so do custom roles at position 50
-- or above. The file is safe to re-run: every statement is CREATE OR
-- REPLACE, COMMENT, REVOKE or DROP POLICY IF EXISTS.
--
-- Rollback
-- --------
-- A forward migration with these statements restores the previous behaviour
-- exactly. No data changes either way:
--
--   DROP TRIGGER IF EXISTS "enforce_guild_owner_write_rules" ON "public"."guilds";
--   DROP FUNCTION IF EXISTS "public"."enforce_guild_owner_write_rules"();
--   DROP TRIGGER IF EXISTS "enforce_guild_role_write_rules" ON "public"."guild_roles";
--   DROP FUNCTION IF EXISTS "public"."enforce_guild_role_write_rules"();
--   DROP TRIGGER IF EXISTS "enforce_guild_membership_write_rules" ON "public"."character_guild_memberships";
--   DROP FUNCTION IF EXISTS "public"."enforce_guild_membership_write_rules"();
--   CREATE POLICY "Users can insert own character memberships" ON "public"."character_guild_memberships" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
--      FROM "public"."characters"
--     WHERE (("characters"."id" = "character_guild_memberships"."character_id") AND ("characters"."user_id" = "auth"."uid"())))));
--   CREATE POLICY "Users can delete own character memberships" ON "public"."character_guild_memberships" FOR DELETE USING ((EXISTS ( SELECT 1
--      FROM "public"."characters"
--     WHERE (("characters"."id" = "character_guild_memberships"."character_id") AND ("characters"."user_id" = "auth"."uid"())))));

-- ---------------------------------------------------------------------------
-- 1. character_guild_memberships
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION "public"."enforce_guild_membership_write_rules"() RETURNS "trigger"
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

  -- A user session may leave a guild: is_active unchanged or set to false,
  -- every other column unchanged. Every INSERT (including the insert phase
  -- of an upsert) and every other UPDATE is refused.
  IF TG_OP = 'UPDATE'
     AND (to_jsonb(NEW) - 'is_active') IS NOT DISTINCT FROM (to_jsonb(OLD) - 'is_active')
     AND (NEW.is_active IS NOT DISTINCT FROM OLD.is_active OR NEW.is_active = false) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION USING
    MESSAGE = 'new row violates row-level security policy for table "character_guild_memberships"',
    ERRCODE = 'insufficient_privilege';
END;
$$;

COMMENT ON FUNCTION "public"."enforce_guild_membership_write_rules"() IS 'Membership rows are written by the server. For anon and authenticated sessions every INSERT is refused, and an UPDATE is accepted only when every column other than is_active is unchanged and is_active is unchanged or set to false (leaving a guild). The service role, postgres, migrations and writes made by another trigger are not checked. A refused write gets the RLS error. SECURITY DEFINER with EXECUTE revoked from PUBLIC, anon and authenticated.';

REVOKE ALL ON FUNCTION "public"."enforce_guild_membership_write_rules"() FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE TRIGGER "enforce_guild_membership_write_rules" BEFORE INSERT OR UPDATE ON "public"."character_guild_memberships" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_guild_membership_write_rules"();

COMMENT ON TRIGGER "enforce_guild_membership_write_rules" ON "public"."character_guild_memberships" IS 'A user session can only leave a guild: set is_active to false on its own rows. See public.enforce_guild_membership_write_rules().';

DROP POLICY IF EXISTS "Users can insert own character memberships" ON "public"."character_guild_memberships";

DROP POLICY IF EXISTS "Users can delete own character memberships" ON "public"."character_guild_memberships";

-- ---------------------------------------------------------------------------
-- 2. guild_roles
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION "public"."enforce_guild_role_write_rules"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  -- Only user sessions are checked. The service role, postgres, migrations
  -- and writes made by another trigger function (the default roles inserted
  -- by create_default_guild_roles) pass unchanged.
  IF coalesce(current_setting('role', true), '') NOT IN ('anon', 'authenticated')
     OR pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  -- A user session may add a custom role below officer level, and may move a
  -- role only between positions below officer level, changing nothing else.
  IF TG_OP = 'INSERT' THEN
    IF NEW.position < 50 AND NEW.is_default IS NOT TRUE THEN
      RETURN NEW;
    END IF;
  ELSIF (to_jsonb(NEW) - 'position') IS NOT DISTINCT FROM (to_jsonb(OLD) - 'position')
     AND (NEW.position IS NOT DISTINCT FROM OLD.position OR (OLD.position < 50 AND NEW.position < 50)) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION USING
    MESSAGE = 'new row violates row-level security policy for table "guild_roles"',
    ERRCODE = 'insufficient_privilege';
END;
$$;

COMMENT ON FUNCTION "public"."enforce_guild_role_write_rules"() IS 'Guild roles written by a user session stay below officer level. For anon and authenticated sessions an INSERT is accepted only with position below 50 and is_default not true, and an UPDATE only when every column other than position is unchanged and position is unchanged or moves between two values below 50. The service role, postgres, migrations and writes made by another trigger (the default roles) are not checked. A refused write gets the RLS error. SECURITY DEFINER with EXECUTE revoked from PUBLIC, anon and authenticated.';

REVOKE ALL ON FUNCTION "public"."enforce_guild_role_write_rules"() FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE TRIGGER "enforce_guild_role_write_rules" BEFORE INSERT OR UPDATE ON "public"."guild_roles" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_guild_role_write_rules"();

COMMENT ON TRIGGER "enforce_guild_role_write_rules" ON "public"."guild_roles" IS 'Guild roles written by a user session stay below position 50. See public.enforce_guild_role_write_rules().';

-- ---------------------------------------------------------------------------
-- 3. guilds
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION "public"."enforce_guild_owner_write_rules"() RETURNS "trigger"
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

  -- A user session may create a guild on the free tier, and may not change
  -- who owns a guild or its tier.
  IF TG_OP = 'INSERT' THEN
    IF NEW.subscription_tier = 'free' THEN
      RETURN NEW;
    END IF;
  ELSIF NEW.created_by IS NOT DISTINCT FROM OLD.created_by
     AND NEW.subscription_tier IS NOT DISTINCT FROM OLD.subscription_tier THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION USING
    MESSAGE = 'new row violates row-level security policy for table "guilds"',
    ERRCODE = 'insufficient_privilege';
END;
$$;

COMMENT ON FUNCTION "public"."enforce_guild_owner_write_rules"() IS 'Guild ownership and the subscription tier are server-managed. For anon and authenticated sessions an INSERT is accepted only with subscription_tier free, and an UPDATE only when created_by and subscription_tier are unchanged. The service role, postgres, migrations and writes made by another trigger are not checked. A refused write gets the RLS error. SECURITY DEFINER with EXECUTE revoked from PUBLIC, anon and authenticated.';

REVOKE ALL ON FUNCTION "public"."enforce_guild_owner_write_rules"() FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE TRIGGER "enforce_guild_owner_write_rules" BEFORE INSERT OR UPDATE OF "created_by", "subscription_tier" ON "public"."guilds" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_guild_owner_write_rules"();

COMMENT ON TRIGGER "enforce_guild_owner_write_rules" ON "public"."guilds" IS 'Guild ownership and the subscription tier are changed only by the server. See public.enforce_guild_owner_write_rules().';

-- Reject loot_history rows that point at another guild's data (GH #313).
--
-- Problem
-- -------
-- The loot_history policies "Officers can insert loot history" and "Officers
-- can update loot history" check only is_guild_officer(guild_id). They decide
-- who may write a guild's history, but not what the row may point at. An
-- officer of guild A calling PostgREST directly with their own session can
-- therefore save a guild A award whose raid_event_id is guild B's raid night,
-- whose character_id is a raider of another guild, or whose loot item, raid
-- tier or expansion belongs to another guild's catalog.
--
-- The API routes already validate these references (#294, #296, #297), but
-- they write through the service role, which bypasses RLS, and the database
-- itself has no guard. #277, #294 and #296 were all route-level bugs of
-- exactly this kind.
--
-- Fix
-- ---
-- One BEFORE INSERT OR UPDATE trigger, enforce_loot_history_guild_refs, checks
-- the references of each written row against the row's own guild_id:
--
--   * raid_event_id, when not NULL, must be a raid_events row of this guild.
--   * character_id, when not NULL, must have an active (is_active = true)
--     character_guild_memberships row in this guild. A NULL character_id with
--     a character_name (a pug or an unmatched addon name) is allowed.
--   * (added in the next step of this change: the loot item group)
--
-- Why a trigger and not tighter RLS policies:
--
--   1. A policy WITH CHECK sees only the new row. It cannot compare NEW with
--      OLD, so it would re-validate every reference on every UPDATE, and a
--      notes edit on a legacy mislinked row, or on an award to a raider who
--      has since left the guild (a normal state), would start failing.
--   2. A trigger fires for every role, including service_role, which bypasses
--      RLS. The same rule therefore also catches a future bug in a
--      service-role route, a script or a migration.
--   3. There is one definition instead of two policy copies (INSERT and
--      UPDATE) that must be kept in sync.
--
-- The existing policies are left exactly as they are. They keep gating who
-- may write, and the trigger gates what the row may point at.
--
-- Changed columns only on UPDATE: INSERT checks every reference. UPDATE checks
-- a reference only when the write changes it (the raid event when
-- raid_event_id changes, the raider when character_id changes). If guild_id
-- changes, every reference is checked. The trigger is declared UPDATE OF the
-- six reference columns, so a notes-only or awarded_date-only UPDATE does not
-- call the function at all, and the NEW vs OLD comparison inside covers a
-- PATCH that re-sends unchanged values. The rule's job is to stop a write from
-- creating a new foreign link, and a column the write did not change creates
-- no new link. This also keeps raid event deletion working: its ON DELETE SET
-- NULL action is an UPDATE of raid_event_id to NULL, on rows that may point at
-- departed raiders.
--
-- Security: the function is SECURITY DEFINER with a pinned search_path and
-- schema-qualified table names, so its lookups never depend on the caller's
-- RLS view of raid_events, character_guild_memberships or the catalog tables.
-- EXECUTE is revoked from PUBLIC, anon and authenticated (the 20260722000001
-- lockdown pattern). Triggers still fire for those roles, but the function
-- cannot be called directly. The body is read-only.
--
-- NULL handling: if guild_id is NULL the function returns at once and the
-- column's NOT NULL constraint rejects the row with its usual 23502.
--
-- Error contract: a violation raises SQLSTATE 23514 (check_violation), which
-- PostgREST returns as 400. Each message is a fixed string with no ids. The
-- caller-supplied id and the row's own guild_id go in DETAIL only. A
-- nonexistent id and another guild's id get the same message, and because
-- this is a BEFORE trigger it runs before the raid_event_id foreign key check,
-- so there is no existence oracle and no message names the guild that owns a
-- foreign row.
--
-- Existing rows are not validated or changed by this migration.
--
-- Rollback
-- --------
-- A forward migration that drops the trigger, then the function, restores
-- today's behaviour exactly. No data changes either way:
--
--   DROP TRIGGER IF EXISTS "enforce_loot_history_guild_refs" ON "public"."loot_history";
--   DROP FUNCTION IF EXISTS "public"."enforce_loot_history_guild_refs"();

CREATE OR REPLACE FUNCTION "public"."enforce_loot_history_guild_refs"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_check_event boolean := true;
  v_check_character boolean := true;
  v_check_item boolean := true;
  v_item_tier uuid;
  v_tier_expansion uuid;
  v_item_guild uuid;
BEGIN
  IF NEW.guild_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.guild_id IS NOT DISTINCT FROM OLD.guild_id THEN
      v_check_event := NEW.raid_event_id IS DISTINCT FROM OLD.raid_event_id;
      v_check_character := NEW.character_id IS DISTINCT FROM OLD.character_id;
      v_check_item := NEW.loot_item_id IS DISTINCT FROM OLD.loot_item_id
        OR NEW.raid_tier_id IS DISTINCT FROM OLD.raid_tier_id
        OR NEW.expansion_id IS DISTINCT FROM OLD.expansion_id;
    END IF;
  END IF;

  IF v_check_event AND NEW.raid_event_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.raid_events re
    WHERE re.id = NEW.raid_event_id AND re.guild_id = NEW.guild_id
  ) THEN
    RAISE EXCEPTION 'loot_history.raid_event_id is not a raid event of this guild'
      USING ERRCODE = 'check_violation',
            DETAIL = format('raid_event_id %s, guild_id %s', NEW.raid_event_id, NEW.guild_id);
  END IF;

  -- insertion point: raider rule (GH #313 step 2)

  -- insertion point: loot item group rule (GH #313 step 2)

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION "public"."enforce_loot_history_guild_refs"() IS 'GH #313. Rejects a loot_history row whose raid_event_id, character_id or loot item points outside the row''s own guild_id, for every role including service_role. On UPDATE only references the write changes are checked, so existing rows stay editable. SECURITY DEFINER with EXECUTE revoked from PUBLIC, anon and authenticated.';

REVOKE ALL ON FUNCTION "public"."enforce_loot_history_guild_refs"() FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE TRIGGER "enforce_loot_history_guild_refs" BEFORE INSERT OR UPDATE OF "guild_id", "raid_event_id", "character_id", "loot_item_id", "raid_tier_id", "expansion_id" ON "public"."loot_history" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_loot_history_guild_refs"();

COMMENT ON TRIGGER "enforce_loot_history_guild_refs" ON "public"."loot_history" IS 'GH #313. Keeps loot_history raid events, raiders and loot items inside the row''s own guild. See public.enforce_loot_history_guild_refs().';

-- Enforce loot list status rules for loot_submissions writes.
--
-- Problem
-- -------
-- The loot_submissions write policies decide who may write a row (the
-- character's owner or an officer of the guild). They do not decide which
-- status the row may take, whether the row's character is an active member
-- of the row's guild, or who may write the review fields and the items of a
-- pending or approved list. The submit and review routes apply those rules,
-- but they write through the service role, and the database itself holds no
-- rule for a loot list's status.
--
-- Fix
-- ---
-- A BEFORE INSERT OR UPDATE trigger, enforce_loot_submission_status_rules,
-- applies these rules to every written loot_submissions row:
--
--   R1 (every caller, including service_role): a row may only enter status
--      pending or approved when character_guild_memberships has a row for
--      (character_id, guild_id) with is_active = true. "Enter" means an INSERT
--      in pending or approved, or an UPDATE that leaves the row in pending or
--      approved and changes status, guild_id or character_id. A NULL
--      character_id or guild_id counts as no membership. A move into draft or
--      rejected is never blocked. Changes of phase, original_phase,
--      expansion_id or raid_tier_id are not R1 checks, so service-role phase
--      group merges keep moving approved lists, including legacy lists of
--      raiders who have left.
--   R2 (anon and authenticated): only an officer of the row's guild
--      (is_guild_officer) may do an R1-type entry, or change guild_id,
--      character_id, expansion_id, phase, original_phase or raid_tier_id of a
--      row that is pending or approved after the write. original_phase is
--      included because merge_phase_groups restores phase from it.
--   R3 (anon and authenticated): only an officer may set reviewed_at,
--      reviewed_by, review_notes or change_rejected_at to a non-NULL value
--      (on INSERT each must be NULL; on UPDATE each must be NULL or
--      unchanged). Auto-save clears all four when an edit moves a reviewed
--      list back to draft, which stays allowed. R3 is skipped for writes made
--      by another trigger (pg_trigger_depth() > 1): when a raider leaves a
--      guild from their own session, reject_submissions_on_cgm_loss writes
--      review_notes and reviewed_at inside that same session.
--   R4 (anon and authenticated): an INSERT (this includes the insert phase of
--      every PostgREST upsert), and any UPDATE that changes guild_id or
--      character_id, needs a character owned by the caller (characters.user_id
--      = auth.uid()) with an active membership in the row's guild. Officers
--      of the guild may pass R2, R3 and R4. Nobody skips R1.
--
-- A BEFORE INSERT OR UPDATE OR DELETE trigger, enforce_loot_submission_item_rules,
-- keeps the items of a pending or approved list for officers: for anon and
-- authenticated callers who are not officers of the parent list's guild, no
-- loot_submission_items row can be inserted, updated or deleted while its
-- parent list (the old and the new parent, for an UPDATE that moves an item)
-- is pending or approved. This includes writes made through
-- save_submission_items, because the role setting is unchanged inside a
-- SECURITY DEFINER function. Items of draft and rejected lists stay writable.
-- A parent that cannot be found (a NULL submission_id, or a parent already
-- removed by a cascading delete) does not block; the foreign key and RLS
-- decide. Other callers (service_role routes, account and character deletes)
-- are not checked. The app writes the parent list first (to draft, or keeping
-- rejected) and its items in a later request, so its own saves pass.
--
-- The "loot_submission_snapshots_insert" policy is dropped. Snapshots record
-- the approved list that revert restores and officers compare against; the
-- review route writes them and the revert route reads them through the
-- service role, and no user session writes them. There is no UPDATE or DELETE
-- policy on the table, so after the drop only the service role writes
-- snapshots. The SELECT policy is unchanged.
--
-- Why triggers and not tighter RLS policies:
--
--   1. A policy WITH CHECK sees only the new row. It cannot compare NEW with
--      OLD, so it cannot tell an approval (a status change) from an unrelated
--      edit of an approved row, and legacy approved rows of raiders who have
--      left would stop being editable at all.
--   2. A trigger fires for every role, including service_role, which bypasses
--      RLS, so R1 also holds for the API routes, scripts and migrations.
--   3. There is one definition instead of several permissive policies that
--      would all need the same extra conditions, and the items rule needs the
--      parent row's status, which the item policies would each have to join.
--
-- The existing policies are left as they are. They keep gating who may write
-- a row, and the triggers gate the status rules.
--
-- Changed columns only on UPDATE: the loot_submissions trigger is declared
-- UPDATE OF the eleven columns the rules read, so an UPDATE of any other
-- column (updated_at, submitted_at, resubmission_count, the resubmit reminder
-- fields) does not call the function, and every rule compares NEW with OLD,
-- so a PATCH that re-sends unchanged values is never blocked.
--
-- Security: both functions are SECURITY DEFINER with a pinned search_path and
-- schema-qualified names, so their lookups never depend on the caller's RLS
-- view of character_guild_memberships, characters or loot_submissions.
-- EXECUTE is revoked from PUBLIC, anon and authenticated (the 20260722000001
-- lockdown pattern). Triggers still fire for those roles, but the functions
-- cannot be called directly. Both bodies are read-only. SECURITY DEFINER does
-- not change the role setting, so current_setting('role', true) still names
-- the session role, and is_guild_officer still reads the caller's
-- auth.uid().
--
-- Error contract: for anon and authenticated callers any rule failure raises
-- the error RLS gives, with no DETAIL, so the rules reveal nothing about
-- memberships to them: SQLSTATE 42501 (insufficient_privilege) with 'new row
-- violates row-level security policy for table "loot_submissions"' (or
-- "loot_submission_items"), and 'permission denied for table
-- loot_submission_items' for an item DELETE, which has no new row. The
-- officer lookup only runs when a rule that officers may pass has failed.
-- Any other caller (service_role, postgres, migrations) can only fail R1 and
-- gets SQLSTATE 23514 (check_violation), which PostgREST returns as 400, with
-- the fixed MESSAGE 'loot_submissions: a pending or approved list needs an
-- active guild membership' and a DETAIL naming the rule, character_id,
-- guild_id and status. Every message is passed with RAISE USING MESSAGE, so
-- none is a format string.
--
-- Existing rows are not validated or changed by this migration. The migration
-- is safe to re-run (CREATE OR REPLACE, DROP POLICY IF EXISTS).
--
-- Rollback
-- --------
-- A forward migration with these statements restores today's behaviour
-- exactly. No data changes either way:
--
--   DROP TRIGGER IF EXISTS "enforce_loot_submission_item_rules" ON "public"."loot_submission_items";
--   DROP FUNCTION IF EXISTS "public"."enforce_loot_submission_item_rules"();
--   DROP TRIGGER IF EXISTS "enforce_loot_submission_status_rules" ON "public"."loot_submissions";
--   DROP FUNCTION IF EXISTS "public"."enforce_loot_submission_status_rules"();
--   CREATE POLICY "loot_submission_snapshots_insert" ON "public"."loot_submission_snapshots" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
--      FROM ("public"."loot_submissions" "ls"
--        JOIN "public"."characters" "c" ON (("c"."id" = "ls"."character_id")))
--     WHERE (("ls"."id" = "loot_submission_snapshots"."submission_id") AND ("c"."user_id" = "auth"."uid"())))));

CREATE OR REPLACE FUNCTION "public"."enforce_loot_submission_status_rules"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_is_client boolean := COALESCE(current_setting('role', true) IN ('anon', 'authenticated'), false);
  v_live boolean := COALESCE(NEW.status IN ('pending', 'approved'), false);
  v_enters boolean := false;
  v_moved boolean := false;
  v_rescoped boolean := false;
  v_needs_officer boolean := false;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_enters := v_live;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    v_moved := NEW.guild_id IS DISTINCT FROM OLD.guild_id
      OR NEW.character_id IS DISTINCT FROM OLD.character_id;
    IF v_live THEN
      v_enters := v_moved OR NEW.status IS DISTINCT FROM OLD.status;
      v_rescoped := v_moved
        OR NEW.expansion_id IS DISTINCT FROM OLD.expansion_id
        OR NEW.phase IS DISTINCT FROM OLD.phase
        OR NEW.original_phase IS DISTINCT FROM OLD.original_phase
        OR NEW.raid_tier_id IS DISTINCT FROM OLD.raid_tier_id;
    END IF;
  END IF;

  -- R1: a pending or approved list needs an active membership, for every caller.
  IF v_enters AND NOT EXISTS (
    SELECT 1 FROM public.character_guild_memberships cgm
    WHERE cgm.character_id = NEW.character_id
      AND cgm.guild_id = NEW.guild_id
      AND cgm.is_active = true
  ) THEN
    IF v_is_client THEN
      RAISE EXCEPTION USING
        MESSAGE = 'new row violates row-level security policy for table "loot_submissions"',
        ERRCODE = 'insufficient_privilege';
    END IF;
    RAISE EXCEPTION USING
      MESSAGE = 'loot_submissions: a pending or approved list needs an active guild membership',
      ERRCODE = 'check_violation',
      DETAIL = format('rule R1, character_id %s, guild_id %s, status %s', NEW.character_id, NEW.guild_id, NEW.status);
  END IF;

  IF NOT v_is_client THEN
    RETURN NEW;
  END IF;

  -- R2: only an officer may move a list into pending or approved, or move a
  -- pending or approved list to another guild, character, expansion, phase,
  -- original phase or raid tier.
  v_needs_officer := v_enters OR v_rescoped;

  -- R3: only an officer may write the review trail. Skipped for writes made
  -- by another trigger (the membership-loss auto-reject).
  IF NOT v_needs_officer AND pg_trigger_depth() <= 1 THEN
    IF TG_OP = 'INSERT' THEN
      v_needs_officer := NEW.reviewed_at IS NOT NULL
        OR NEW.reviewed_by IS NOT NULL
        OR NEW.review_notes IS NOT NULL
        OR NEW.change_rejected_at IS NOT NULL;
    ELSIF TG_OP = 'UPDATE' THEN
      v_needs_officer := (NEW.reviewed_at IS NOT NULL AND NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at)
        OR (NEW.reviewed_by IS NOT NULL AND NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by)
        OR (NEW.review_notes IS NOT NULL AND NEW.review_notes IS DISTINCT FROM OLD.review_notes)
        OR (NEW.change_rejected_at IS NOT NULL AND NEW.change_rejected_at IS DISTINCT FROM OLD.change_rejected_at);
    END IF;
  END IF;

  -- R4: a new row, or a row moved to another guild or character, needs the
  -- caller's own character with an active membership in the row's guild.
  IF NOT v_needs_officer AND (TG_OP = 'INSERT' OR v_moved) AND NOT EXISTS (
    SELECT 1 FROM public.characters c
    JOIN public.character_guild_memberships cgm ON cgm.character_id = c.id
    WHERE c.id = NEW.character_id
      AND c.user_id = auth.uid()
      AND cgm.guild_id = NEW.guild_id
      AND cgm.is_active = true
  ) THEN
    v_needs_officer := true;
  END IF;

  IF v_needs_officer AND NOT public.is_guild_officer(NEW.guild_id) THEN
    RAISE EXCEPTION USING
      MESSAGE = 'new row violates row-level security policy for table "loot_submissions"',
      ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION "public"."enforce_loot_submission_status_rules"() IS 'Loot list status rules. R1 (every role, including service_role): a loot_submissions row may only enter pending or approved with an active character_guild_memberships row for its character and guild. For anon and authenticated callers who are not officers of the guild: R2, no move into pending or approved and no change of guild, character, expansion, phase, original phase or raid tier of a pending or approved list. R3, review fields only set to NULL or left unchanged (skipped for writes made by another trigger). R4, a new or moved row needs the caller''s own character with an active membership. Client callers get the RLS error, other callers get 23514 with DETAIL. SECURITY DEFINER with EXECUTE revoked from PUBLIC, anon and authenticated.';

REVOKE ALL ON FUNCTION "public"."enforce_loot_submission_status_rules"() FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE TRIGGER "enforce_loot_submission_status_rules" BEFORE INSERT OR UPDATE OF "status", "guild_id", "character_id", "expansion_id", "phase", "original_phase", "raid_tier_id", "reviewed_at", "reviewed_by", "review_notes", "change_rejected_at" ON "public"."loot_submissions" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_loot_submission_status_rules"();

COMMENT ON TRIGGER "enforce_loot_submission_status_rules" ON "public"."loot_submissions" IS 'Loot list status rules: who may move a list to pending or approved and write its review trail, and an active membership for every pending or approved list. See public.enforce_loot_submission_status_rules().';

CREATE OR REPLACE FUNCTION "public"."enforce_loot_submission_item_rules"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_is_client boolean := COALESCE(current_setting('role', true) IN ('anon', 'authenticated'), false);
  v_new_submission uuid;
  v_old_submission uuid;
  v_parent_guild uuid;
BEGIN
  IF NOT v_is_client THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_new_submission := NEW.submission_id;
  ELSIF TG_OP = 'UPDATE' THEN
    v_new_submission := NEW.submission_id;
    IF OLD.submission_id IS DISTINCT FROM NEW.submission_id THEN
      v_old_submission := OLD.submission_id;
    END IF;
  ELSE
    v_old_submission := OLD.submission_id;
  END IF;

  -- Only a pending or approved parent that still exists can block.
  FOR v_parent_guild IN
    SELECT ls.guild_id FROM public.loot_submissions ls
    WHERE ls.id IN (v_new_submission, v_old_submission)
      AND ls.status IN ('pending', 'approved')
  LOOP
    IF NOT public.is_guild_officer(v_parent_guild) THEN
      IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION USING
          MESSAGE = 'permission denied for table loot_submission_items',
          ERRCODE = 'insufficient_privilege';
      END IF;
      RAISE EXCEPTION USING
        MESSAGE = 'new row violates row-level security policy for table "loot_submission_items"',
        ERRCODE = 'insufficient_privilege';
    END IF;
  END LOOP;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION "public"."enforce_loot_submission_item_rules"() IS 'Loot list status rules for items: for anon and authenticated callers who are not officers of the parent list''s guild, no loot_submission_items row can be inserted, updated or deleted while its parent list is pending or approved, including through save_submission_items. Items of draft and rejected lists stay writable, a parent that no longer exists does not block, and other roles are not checked. SECURITY DEFINER with EXECUTE revoked from PUBLIC, anon and authenticated.';

REVOKE ALL ON FUNCTION "public"."enforce_loot_submission_item_rules"() FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE TRIGGER "enforce_loot_submission_item_rules" BEFORE INSERT OR UPDATE OR DELETE ON "public"."loot_submission_items" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_loot_submission_item_rules"();

COMMENT ON TRIGGER "enforce_loot_submission_item_rules" ON "public"."loot_submission_items" IS 'Loot list status rules: the items of a pending or approved list are written only by officers or the service role. See public.enforce_loot_submission_item_rules().';

DROP POLICY IF EXISTS "loot_submission_snapshots_insert" ON "public"."loot_submission_snapshots";

-- BLP and reserve award rules stay inside the guild.
--
-- Problem
-- -------
-- The blp_credits and blp_tracking officer INSERT, UPDATE and DELETE
-- policies check only is_guild_officer(guild_id). They decide who may write
-- a guild's BLP rows, not what they hold, while BLP (Bad Luck Protection) is
-- a derived value: the server rebuilds it from a guild's approved loot
-- lists, awards and attendance (20260609000001, 20260721000001). No app
-- path writes these tables with a user session.
--
-- The reserve_awards INSERT policy decides who may award in a reserve run
-- (an officer of the run guild), not which submission or loot item the
-- award names. The awards route writes with the service role, which
-- bypasses RLS, so neither the policy nor the service role catches a wrong
-- reference. loot_history (20260929180000) and the raid team, donation and
-- attendance tables (20261003220000) already have reference rules of this
-- kind.
--
-- Fix
-- ---
-- Every writer of blp_credits and blp_tracking is a SECURITY DEFINER
-- function owned by postgres, or a referential action: the table owner is
-- not subject to RLS (RLS is enabled, not forced, on both tables), and
-- referential actions never apply it. So the six officer write policies
-- have never been used by any writer, and dropping them leaves exactly the
-- server writers in place, the same pattern 20260930000100 used for
-- membership rows. A trigger was considered instead and rejected: an
-- active-member check would fail a whole item's recompute on one legacy
-- approved list of a raider who has left, since the recompute functions run
-- every item of a guild in one transaction; a check would also add work to
-- every recompute for writes the app never makes, and neither would cover
-- the item, raid event or times_passed a row holds.
--
-- enforce_reserve_award_refs is a BEFORE INSERT OR UPDATE OF reserve_run_id,
-- submission_id, loot_item_id trigger on reserve_awards: it accepts a row
-- only when its submission_id, when set, is a reserve_submissions row of
-- the same reserve_run_id, and its loot_item_id, when set, is a loot item
-- in the raid tier of that run. It applies to every role, the service role
-- included. On UPDATE it checks only a reference the write changes, so
-- existing rows, including rows of a submission that has since left the
-- run, stay editable. The function is SECURITY DEFINER with a pinned
-- search_path and EXECUTE revoked from PUBLIC, anon and authenticated; the
-- body is read-only.
--
-- The item rule follows the run raid tier rather than the run guild:
-- GET /api/reserve-runs/raid-tiers lists raid tiers from any guild data, so
-- a guild run often uses a raid tier, and items, seeded by another guild. A
-- same-guild item rule would refuse normal awards. The run page already
-- offers only the items of the run raid tier and sends a submission of the
-- same run, so no app award is affected.
--
-- Readers and writers checked
-- ----------------------------
-- Every BLP writer (the three recompute functions, increment_blp,
-- increment_blp_bulk, reset_blp, reset_guild_season, delete_guild, and the
-- referential actions of character, guild, loot item and raid event
-- deletes) keeps working, since none of them ever depended on these
-- policies. Every reader (the dashboard, GET /api/blp, the addon exports)
-- is unchanged: the two SELECT policies are not touched.
--
-- The reserve awards route sends a submission of the same run and an item
-- of the run raid tier, so every app award keeps working; a guild-less run,
-- a run on another guild raid tier, the submission delete (ON DELETE SET
-- NULL) and the run delete (ON DELETE CASCADE) are unaffected.
-- reserve_submissions needs no change: it has only a SELECT policy, so no
-- session writes it; its own writers (the join route, the officer edit and
-- delete routes) never change character_id or reserve_run_id.
--
-- Error contract
-- --------------
-- On the BLP tables, unchanged: a user session's INSERT (and the insert
-- half of an upsert) gets PostgreSQL's own row-level security error, 'new
-- row violates row-level security policy for table "blp_credits"' (or
-- "blp_tracking"); its UPDATE and DELETE affect 0 rows with no error.
--
-- A refused reserve award raises SQLSTATE 23514 (check_violation) with a
-- fixed message naming the offending column and a DETAIL naming the ids the
-- write sent. Because the trigger runs before the foreign key check, a
-- nonexistent submission id gets the same 23514 as another run submission.
-- An anon or authenticated caller who is not an officer of the run guild
-- gets the RLS error instead (42501, 'new row violates row-level security
-- policy for table "reserve_awards"', no DETAIL), whether the references
-- are valid or not, so the check reveals nothing to them. A row that passes
-- every check is always handed on, so RLS alone decides who may write it.
-- service_role, postgres and migrations are never anon or authenticated, so
-- they always get the 23514.
--
-- Production safety
-- -----------------
-- DROP POLICY takes an ACCESS EXCLUSIVE lock on blp_credits and
-- blp_tracking, and CREATE OR REPLACE TRIGGER a SHARE ROW EXCLUSIVE lock on
-- reserve_awards, for the rest of the transaction; SET LOCAL lock_timeout
-- gives up after 5 seconds instead of queueing behind a long query (a BLP
-- recompute runs in an after() hook of several routes), and a timeout rolls
-- the whole file back so the next deploy runs it again. Every statement is
-- idempotent (DROP POLICY IF EXISTS, CREATE OR REPLACE, COMMENT, REVOKE)
-- and no existing row can make the file fail. Per-award cost: two
-- primary-key lookups (reserve_runs, reserve_submissions) and one indexed
-- lookup (loot_items joined to reserve_runs by raid_tier_id).
--
-- Not changed
-- -----------
-- The two BLP SELECT policies ("Guild members can view BLP", "Guild
-- members can view BLP credits"), every reserve policy, every other policy,
-- trigger, function and grant, lib/database.types.ts, and every existing
-- row. Table grants are not changed either. Existing reserve_awards rows
-- are not validated or changed by this migration.
--
-- Deploy
-- ------
-- One migration-only PR, merged with --admin after the PR carrying
-- 20261003220000; it deploys about 12 seconds after merge. No app PR is
-- needed first.
--
-- Rollback
-- --------
-- A forward migration with these statements, in this order, restores the
-- previous behaviour, and no data changes either way:
--
--   DROP POLICY IF EXISTS "Officers can insert BLP credits" ON "public"."blp_credits";
--   CREATE POLICY "Officers can insert BLP credits" ON "public"."blp_credits" FOR INSERT WITH CHECK ("public"."is_guild_officer"("guild_id"));
--   DROP POLICY IF EXISTS "Officers can update BLP credits" ON "public"."blp_credits";
--   CREATE POLICY "Officers can update BLP credits" ON "public"."blp_credits" FOR UPDATE USING ("public"."is_guild_officer"("guild_id")) WITH CHECK ("public"."is_guild_officer"("guild_id"));
--   DROP POLICY IF EXISTS "Officers can delete BLP credits" ON "public"."blp_credits";
--   CREATE POLICY "Officers can delete BLP credits" ON "public"."blp_credits" FOR DELETE USING ("public"."is_guild_officer"("guild_id"));
--   DROP POLICY IF EXISTS "Officers can insert BLP" ON "public"."blp_tracking";
--   CREATE POLICY "Officers can insert BLP" ON "public"."blp_tracking" FOR INSERT WITH CHECK ("public"."is_guild_officer"("guild_id"));
--   DROP POLICY IF EXISTS "Officers can update BLP" ON "public"."blp_tracking";
--   CREATE POLICY "Officers can update BLP" ON "public"."blp_tracking" FOR UPDATE USING ("public"."is_guild_officer"("guild_id")) WITH CHECK ("public"."is_guild_officer"("guild_id"));
--   DROP POLICY IF EXISTS "Officers can delete BLP" ON "public"."blp_tracking";
--   CREATE POLICY "Officers can delete BLP" ON "public"."blp_tracking" FOR DELETE USING ("public"."is_guild_officer"("guild_id"));
--   DROP TRIGGER IF EXISTS "enforce_reserve_award_refs" ON "public"."reserve_awards";
--   DROP FUNCTION IF EXISTS "public"."enforce_reserve_award_refs"();

SET LOCAL lock_timeout = '5s';

DROP POLICY IF EXISTS "Officers can insert BLP credits" ON "public"."blp_credits";

DROP POLICY IF EXISTS "Officers can update BLP credits" ON "public"."blp_credits";

DROP POLICY IF EXISTS "Officers can delete BLP credits" ON "public"."blp_credits";

DROP POLICY IF EXISTS "Officers can insert BLP" ON "public"."blp_tracking";

DROP POLICY IF EXISTS "Officers can update BLP" ON "public"."blp_tracking";

DROP POLICY IF EXISTS "Officers can delete BLP" ON "public"."blp_tracking";

CREATE OR REPLACE FUNCTION "public"."enforce_reserve_award_refs"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_check_submission boolean := true;
  v_check_item boolean := true;
  v_error text;
  v_detail text;
BEGIN
  -- A NULL reserve_run_id is left to the NOT NULL constraint.
  IF NEW.reserve_run_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- On UPDATE, within the same run, check only a reference the write
  -- changes, so existing rows stay editable and ON DELETE SET NULL of a
  -- removed submission passes.
  IF TG_OP = 'UPDATE' AND NEW.reserve_run_id IS NOT DISTINCT FROM OLD.reserve_run_id THEN
    v_check_submission := NEW.submission_id IS DISTINCT FROM OLD.submission_id;
    v_check_item := NEW.loot_item_id IS DISTINCT FROM OLD.loot_item_id;
  END IF;

  -- A missing run is left to the foreign key, and to RLS for sessions.
  IF NOT EXISTS (SELECT 1 FROM public.reserve_runs rr WHERE rr.id = NEW.reserve_run_id) THEN
    RETURN NEW;
  END IF;

  IF v_check_submission AND NEW.submission_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.reserve_submissions rs
    WHERE rs.id = NEW.submission_id AND rs.reserve_run_id = NEW.reserve_run_id
  ) THEN
    v_error := 'reserve_awards.submission_id is not a submission of this reserve run';
    v_detail := format('submission_id %s, reserve_run_id %s', NEW.submission_id, NEW.reserve_run_id);
  END IF;

  IF v_error IS NULL AND v_check_item AND NEW.loot_item_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.loot_items li
    JOIN public.reserve_runs rr ON rr.raid_tier_id = li.raid_tier_id
    WHERE li.id = NEW.loot_item_id AND rr.id = NEW.reserve_run_id
  ) THEN
    v_error := 'reserve_awards.loot_item_id is not in the raid tier of this reserve run';
    v_detail := format('loot_item_id %s, reserve_run_id %s', NEW.loot_item_id, NEW.reserve_run_id);
  END IF;

  IF v_error IS NULL THEN
    RETURN NEW;
  END IF;

  -- A BEFORE trigger runs before the RLS WITH CHECK. A caller RLS would
  -- refuse anyway gets the error RLS gives, so the check reveals nothing.
  -- The EXISTS form also masks a run with no guild, where is_guild_officer
  -- of NULL is false.
  IF coalesce(current_setting('role', true), '') IN ('anon', 'authenticated') AND NOT EXISTS (
    SELECT 1 FROM public.reserve_runs rr
    WHERE rr.id = NEW.reserve_run_id AND public.is_guild_officer(rr.guild_id)
  ) THEN
    RAISE EXCEPTION USING
      MESSAGE = 'new row violates row-level security policy for table "reserve_awards"',
      ERRCODE = 'insufficient_privilege';
  END IF;

  RAISE EXCEPTION USING MESSAGE = v_error, ERRCODE = 'check_violation', DETAIL = v_detail;
END;
$$;

COMMENT ON FUNCTION "public"."enforce_reserve_award_refs"() IS 'Keeps a reserve_awards row pointing at a submission of its own reserve run and at a loot item in the raid tier of that run, for every role including service_role. On UPDATE only a reference the write changes is checked, so existing rows stay editable. When a check fails for an anon or authenticated caller who is not an officer of the run guild, the RLS error is raised instead. SECURITY DEFINER with EXECUTE revoked from PUBLIC, anon and authenticated.';

REVOKE ALL ON FUNCTION "public"."enforce_reserve_award_refs"() FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE TRIGGER "enforce_reserve_award_refs" BEFORE INSERT OR UPDATE OF "reserve_run_id", "submission_id", "loot_item_id" ON "public"."reserve_awards" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_reserve_award_refs"();

COMMENT ON TRIGGER "enforce_reserve_award_refs" ON "public"."reserve_awards" IS 'Keeps reserve awards pointing at a submission and a loot item of their own run. See public.enforce_reserve_award_refs().';

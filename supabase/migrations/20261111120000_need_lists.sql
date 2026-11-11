-- Phase 4 schema for Discovery need lists (D-02, D-08, D-18, D-25, WR-04).
--
-- Problem
-- -------
-- The need-ranking hold added in Phase 3 (D-22) refuses every ranking of a
-- need row from a browser session, so the Phase 4 picker cannot save. Two
-- slots per rank cannot hold one need for every Discovery tier either: a
-- raider ranks five needs, and each need is stored once per Discovery tier,
-- which is up to eight rows at one rank. Loot style presets need a stored id
-- to show which preset a guild chose. And an officer can still delete a
-- Discovery raid tier, or the expansion that holds it, with a direct
-- statement, which cascades away every need ranking, every need award and the
-- bad luck protection credit that hangs off them (Phase 3 review finding
-- WR-04).
--
-- Fix
-- ---
-- Drop the hold: its trigger and then its function (D-08). Replace the
-- loot_submission_items slot check, which only allowed 1 and 2, with a range
-- check from 1 to 8 under a new name (D-02), validate it, then drop the old
-- check. Add guild_settings.loot_style, a nullable text column whose check
-- allows null and the three preset ids (D-18). Add one guard on raid_tiers: a
-- BEFORE DELETE trigger, gated by a WHEN clause so it runs only for Discovery
-- tiers, whose function refuses a delete from an anon or authenticated
-- session while any need row of the tier has a ranking (removed or not) or an
-- award. The guard looks at data, not at trigger depth, so it needs no depth
-- rule: delete_guild removes list items, lists and loot history before it
-- removes expansions, so by the time the tier rows go there is nothing left
-- for the guard to find and the guild master can still delete the guild.
--
-- Guards on existing tables
-- -------------------------
-- raid_tiers gets enforce_raid_tier_need_delete_lock, BEFORE DELETE FOR EACH
-- ROW with a WHEN clause on list_mode, so deleting a Known tier never calls
-- it. The function has definer rights and a pinned search_path because the
-- rows it reads (other raiders' lists, the award history) are not all visible
-- to the officer under row level security. EXECUTE is revoked from PUBLIC,
-- anon and authenticated. It returns OLD, never NULL, because a BEFORE DELETE
-- trigger that returned NULL would silently skip the delete for the service
-- role and for migrations, which are trusted and not checked.
--
-- Readers and writers checked
-- ---------------------------
-- Writers of loot_submission_items: save_submission_items (the raider's save,
-- it never checks the slot value, so the table check is the whole rule), the
-- submit, revert and remove-item routes (service role) and the officer
-- tooling. Every reader resolves a need's tier through
-- loot_items.raid_tier_id, never through the slot number (D-02), so a wider
-- range changes nothing for them. Readers of guild_settings that select every
-- column (the guild-settings route, the addon payloads, the sheet import and
-- the dashboard cache) gain one nullable text key and ignore it until the
-- code PRs of this phase read it. Deleters of raid_tiers and expansions: the
-- expansion and raid tier officer screens (a browser session, now guarded for
-- Discovery tiers), the catalog sync and delete_guild (trusted, pass).
--
-- Error contract
-- --------------
-- A slot outside 1 to 8 fails with SQLSTATE 23514 and the constraint name
-- loot_submission_items_slot_range_check. A loot_style outside the three ids
-- fails the same way with guild_settings_loot_style_check. A browser delete of
-- a Discovery tier that has a need ranking or a need award fails with SQLSTATE
-- 23514, the message raid tiers with ranked or awarded needs are deleted only
-- by the server and the tier id in DETAIL. Deleting the expansion that holds
-- such a tier fails the same way, because the cascade reaches the tier row.
--
-- Production safety
-- -----------------
-- SET LOCAL lock_timeout gives up after 5 seconds instead of queueing, and a
-- timeout rolls the whole file back so the next deploy runs it again. Each
-- ADD CONSTRAINT takes a brief exclusive lock on its table, and the lock is
-- held through the VALIDATE that follows because the whole file is one
-- transaction. Both tables, loot_submission_items and guild_settings, are
-- small, so the validation scan is short, and the lock timeout is the
-- safeguard if something else holds either table. Every constraint is added
-- NOT VALID and then validated. Dropping the old slot check last means every
-- insert is covered by one of the two checks throughout. No statement writes
-- a row: loot_style stays null for every existing guild, so no guild's
-- scoring or settings change when this deploys (D-18). Every statement is
-- re-runnable.
--
-- Not changed
-- -----------
-- save_submission_items (it never checks the slot), every existing
-- guild_settings row and knob, the D-27 need-row delete lock on loot_items
-- and the D-17, D-03, D-24 and D-26 guards from the Discovery migration,
-- loot_history, and the Loot Score engine.
--
-- Deploy
-- ------
-- Migration-only PR, merged with --admin on a non-raid day, deployed about 12
-- seconds after merge. The code PRs of this phase merge only after this is
-- live, because their routes read the widened slot range and loot_style.
-- Until the submit route ships its budget and eligibility checks it keeps
-- refusing any list with a need row, so after this deploy a raider can at most
-- save a draft holding need rows (D-08 amended).
--
-- Rollback
-- --------
-- Revert the code PRs first. Then, in this order:
--
--   DROP TRIGGER IF EXISTS "enforce_raid_tier_need_delete_lock" ON "public"."raid_tiers";
--   DROP FUNCTION IF EXISTS "public"."enforce_raid_tier_need_delete_lock"();
--   ALTER TABLE "public"."guild_settings" DROP CONSTRAINT IF EXISTS "guild_settings_loot_style_check";
--   ALTER TABLE "public"."guild_settings" DROP COLUMN IF EXISTS "loot_style";
--
-- Restoring the two slot check needs every loot_submission_items row with a
-- slot above 2 removed first (the need rows saved since this deploy), then
-- ADD CONSTRAINT "loot_submission_items_slot_check" CHECK (("slot" = ANY
-- (ARRAY[1, 2]))) and drop loot_submission_items_slot_range_check. The hold
-- comes back by running the CREATE OR REPLACE FUNCTION and CREATE OR REPLACE
-- TRIGGER statements for enforce_need_ranking_hold from 20261020120000 again.
-- Every stored loot_style is lost.

SET LOCAL lock_timeout = '5s';

DROP TRIGGER IF EXISTS "enforce_need_ranking_hold" ON "public"."loot_submission_items";

DROP FUNCTION IF EXISTS "public"."enforce_need_ranking_hold"();

ALTER TABLE "public"."loot_submission_items" DROP CONSTRAINT IF EXISTS "loot_submission_items_slot_range_check";

ALTER TABLE "public"."loot_submission_items" ADD CONSTRAINT "loot_submission_items_slot_range_check" CHECK (("slot" >= 1 AND "slot" <= 8)) NOT VALID;

ALTER TABLE "public"."loot_submission_items" VALIDATE CONSTRAINT "loot_submission_items_slot_range_check";

ALTER TABLE "public"."loot_submission_items" DROP CONSTRAINT IF EXISTS "loot_submission_items_slot_check";

COMMENT ON COLUMN "public"."loot_submission_items"."slot" IS 'Slot within the rank: 1 or 2 on item lists; 1 to 8 on Discovery need lists, one per Discovery tier in (sort_order, id) order (D-02). Readers resolve a need''s tier through loot_items.raid_tier_id, never through slot.';

ALTER TABLE "public"."guild_settings" ADD COLUMN IF NOT EXISTS "loot_style" "text";

ALTER TABLE "public"."guild_settings" DROP CONSTRAINT IF EXISTS "guild_settings_loot_style_check";

ALTER TABLE "public"."guild_settings" ADD CONSTRAINT "guild_settings_loot_style_check" CHECK (("loot_style" IS NULL OR "loot_style" = ANY (ARRAY['reward_attendance'::"text", 'even_rotation'::"text", 'officers_decide'::"text"]))) NOT VALID;

ALTER TABLE "public"."guild_settings" VALIDATE CONSTRAINT "guild_settings_loot_style_check";

COMMENT ON COLUMN "public"."guild_settings"."loot_style" IS 'The loot style preset the officers chose: reward_attendance, even_rotation or officers_decide. Null means Custom. Customised is computed by comparing the live knobs to the preset and is never stored (D-18).';

CREATE OR REPLACE FUNCTION "public"."enforce_raid_tier_need_delete_lock"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  -- Client only, like the other need guards: the service role and migrations
  -- are trusted writers. The role setting is unchanged inside a function with
  -- definer rights, so the check sees the caller's role. A removed ranking
  -- still counts, because the cascade deletes removed rows too.
  IF coalesce(current_setting('role', true), '') IN ('anon', 'authenticated')
     AND (
       EXISTS (
         SELECT 1
         FROM public.loot_submission_items lsi
         JOIN public.loot_items li ON li.id = lsi.loot_item_id
         WHERE li.raid_tier_id = OLD.id AND li.kind = 'need'
       )
       OR EXISTS (
         SELECT 1
         FROM public.loot_history lh
         JOIN public.loot_items li ON li.id = lh.loot_item_id
         WHERE li.raid_tier_id = OLD.id AND li.kind = 'need'
       )
     ) THEN
    RAISE EXCEPTION USING
      MESSAGE = 'raid tiers with ranked or awarded needs are deleted only by the server',
      ERRCODE = 'check_violation',
      DETAIL = format('raid_tier_id %s', OLD.id);
  END IF;

  -- OLD, not NULL: a BEFORE DELETE trigger that returned NULL would silently
  -- skip the delete for the trusted writers.
  RETURN OLD;
END;
$$;

REVOKE ALL ON FUNCTION "public"."enforce_raid_tier_need_delete_lock"() FROM PUBLIC, "anon", "authenticated";

COMMENT ON FUNCTION "public"."enforce_raid_tier_need_delete_lock"() IS 'D-25 and WR-04: an anon or authenticated session cannot delete a Discovery raid tier while a need row of the tier has a ranking or an award, directly or through the expansion cascade. A plain predicate with no trigger depth rule, because delete_guild removes list items, lists and loot history before expansions, so the guild master can still delete the guild. The service role and migrations are not checked. Definer rights with a pinned search_path, EXECUTE revoked from PUBLIC, anon and authenticated.';

CREATE OR REPLACE TRIGGER "enforce_raid_tier_need_delete_lock" BEFORE DELETE ON "public"."raid_tiers" FOR EACH ROW WHEN (OLD.list_mode = 'discovery') EXECUTE FUNCTION "public"."enforce_raid_tier_need_delete_lock"();

COMMENT ON TRIGGER "enforce_raid_tier_need_delete_lock" ON "public"."raid_tiers" IS 'D-25 and WR-04: browser sessions cannot delete a Discovery tier that has ranked or awarded needs. Runs only for Discovery tiers, so a Known tier delete never calls it. See public.enforce_raid_tier_need_delete_lock().';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'enforce_need_ranking_hold'
  ) THEN
    RAISE EXCEPTION 'function enforce_need_ranking_hold still exists';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger tg
    WHERE tg.tgname = 'enforce_raid_tier_need_delete_lock'
      AND tg.tgrelid = 'public.raid_tiers'::regclass
      AND NOT tg.tgisinternal
  ) THEN
    RAISE EXCEPTION 'trigger enforce_raid_tier_need_delete_lock is missing on raid_tiers';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    WHERE c.conname = 'loot_submission_items_slot_range_check'
      AND c.conrelid = 'public.loot_submission_items'::regclass
      AND c.convalidated
  ) THEN
    RAISE EXCEPTION 'constraint loot_submission_items_slot_range_check is missing or not validated';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint c
    WHERE c.conname = 'loot_submission_items_slot_check'
      AND c.conrelid = 'public.loot_submission_items'::regclass
  ) THEN
    RAISE EXCEPTION 'constraint loot_submission_items_slot_check still exists';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'guild_settings' AND column_name = 'loot_style'
  ) THEN
    RAISE EXCEPTION 'column guild_settings.loot_style is missing';
  END IF;
END
$$;

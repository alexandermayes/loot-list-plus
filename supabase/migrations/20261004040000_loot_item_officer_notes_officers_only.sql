-- Loot item officer notes are readable only by the guild's officers.
--
-- Problem
-- -------
-- officer_notes holds notes a guild's officers keep about an item, and the
-- app shows them only on Loot Management. Read access to loot_items is
-- granted per table and its rows are readable by every session, so the
-- column followed the rule of the public item data.
--
-- Fix
-- ---
-- Column privileges replace the table privilege for anon and authenticated:
-- every column but officer_notes. The app reads notes only through
-- GET /api/loot-items/officer-notes after the Manage loot check, and writes
-- them through PATCH /api/loot-items as before. The check at the end of
-- this file stops the migration when the result is not exactly that.
--
-- Readers and writers checked
-- ---------------------------
-- Every session read in the app names its columns and none names
-- officer_notes. No session select of every column or returned row exists on
-- this table. Server routes use the service role. The six SECURITY DEFINER
-- functions that read the table run as its owner. No view, trigger or
-- publication reads it.
--
-- Error contract
-- --------------
-- A session query that names officer_notes, selects every column or uses
-- the whole row gets PostgreSQL's permission denied for table loot_items
-- (42501). Every other column reads as before. Writes are unchanged. The
-- service role and definer functions are unaffected.
--
-- Production safety
-- -----------------
-- REVOKE and GRANT take an ACCESS EXCLUSIVE lock on loot_items for the rest
-- of the transaction. SET LOCAL lock_timeout gives up after 5 seconds
-- instead of queueing, and a timeout rolls the whole file back so the next
-- deploy runs it again. Every statement is idempotent, no data changes, and
-- no existing row can make the file fail. The DO block stops the deploy
-- rather than shipping without effect when another grantor keeps
-- officer_notes readable or when a live column is missing from the grant
-- list.
--
-- Not changed
-- -----------
-- Rows. Every policy, including Loot items are viewable by everyone. Row
-- level security (enabled, not forced). INSERT, UPDATE and DELETE
-- privileges of anon and authenticated. Every service_role privilege. Every
-- function, including delete_guild, which still clears officer_notes on
-- kept items. lib/database.types.ts. PATCH /api/loot-items and every other
-- route.
--
-- Deploy
-- ------
-- One migration-only PR, merged with the admin merge override after the PR
-- carrying the app change is deployed. It deploys about 12 seconds after
-- merge.
--
-- Rollback
-- --------
-- A forward migration with these two statements restores the previous
-- table privilege and removes the column grants. No data changes either
-- way. The app change keeps working either way.
--
--   GRANT SELECT ON TABLE "public"."loot_items" TO "anon", "authenticated";
--   REVOKE SELECT ("id", "raid_tier_id", "name", "boss_name", "item_slot", "wowhead_id", "icon_url", "notes", "created_at", "classification", "item_type", "allocation_cost", "is_available", "roles", "armor_type", "weapon_type", "is_loot_council", "primary_stat") ON TABLE "public"."loot_items" FROM "anon", "authenticated";

SET LOCAL lock_timeout = '5s';

REVOKE SELECT ON TABLE "public"."loot_items" FROM "anon", "authenticated";

GRANT SELECT ("id", "raid_tier_id", "name", "boss_name", "item_slot", "wowhead_id", "icon_url", "notes", "created_at", "classification", "item_type", "allocation_cost", "is_available", "roles", "armor_type", "weapon_type", "is_loot_council", "primary_stat") ON TABLE "public"."loot_items" TO "anon", "authenticated";

DO $$
DECLARE
  v_role text;
  v_column text;
BEGIN
  FOREACH v_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF has_column_privilege(v_role, 'public.loot_items', 'officer_notes', 'SELECT') THEN
      RAISE EXCEPTION 'loot_items.officer_notes is still readable by %', v_role;
    END IF;
    FOR v_column IN
      SELECT a.attname FROM pg_attribute a
      WHERE a.attrelid = 'public.loot_items'::regclass AND a.attnum > 0 AND NOT a.attisdropped AND a.attname <> 'officer_notes'
    LOOP
      IF NOT has_column_privilege(v_role, 'public.loot_items', v_column, 'SELECT') THEN
        RAISE EXCEPTION 'loot_items.% is not readable by %', v_column, v_role;
      END IF;
    END LOOP;
  END LOOP;
END
$$;

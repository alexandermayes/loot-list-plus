-- Store the equipped item level per slot.
--
-- Problem
-- -------
-- Officers settling a drop want to see the item level each candidate has
-- equipped in the slot the item fills, from data they can check. The
-- Battle.net gear sync and the Battle.net character import already fetch
-- the profile equipment endpoint, which carries a level per equipped item,
-- but character_equipped_items has no column for it, so both writers drop
-- the value.
--
-- Fix
-- ---
-- One nullable integer column, item_level, with no default, so every
-- existing row reads null until its next sync. A CHECK keeps a stored level
-- between 1 and 1999 and allows null. A server-only guard, the function
-- enforce_equipped_item_level_server_only() and two WHEN gated triggers that
-- call it, rejects an insert that carries a level and an update that changes
-- one when the session role is anon or authenticated, with
-- insufficient_privilege (42501). The service role and migrations are not
-- checked.
--
-- Readers and writers checked
-- ---------------------------
-- Three service-role routes write character_equipped_items from Battle.net:
-- POST /api/battlenet/characters/sync-gear, the Battle.net character import
-- and the link-battlenet route. Only sync-gear and the import are changed on
-- the code branch to set item_level, and they are the only writers that set
-- it. The link-battlenet route and the WowSims import (character-gear) name
-- no item_level in their insert maps, so their rows read null, which the
-- CHECK and the guard both allow. The code branch adds a read route that
-- reads item_level through the RLS-scoped client, so the guildmate read
-- policy stays the boundary. No SECURITY DEFINER function, view, trigger or
-- publication touches the table.
--
-- Why the guard: the owner policy "Users can manage their own characters'
-- equipped items" lets a session insert and update rows of its own
-- characters, and the baseline grants the whole table to anon and
-- authenticated. Without the guard a raider could set an item level from
-- the browser, and officers would read it as evidence of what the raider
-- has equipped. The guard is invoker rights because it reads no table. It
-- keys on the session role setting, which survives SECURITY DEFINER, so a
-- definer function called from a browser session is covered too. The WHEN
-- clauses limit it to an insert that carries a level and an update that
-- changes one, so an owner editing enchants or gems through the owner
-- policy is untouched.
--
-- Production safety
-- -----------------
-- ADD COLUMN with no default is a catalog-only change. ADD CONSTRAINT scans
-- the table once to validate the CHECK; every existing row has a null
-- item_level, so no row can fail it, and the table is small. Each ALTER
-- TABLE takes an ACCESS EXCLUSIVE lock and CREATE OR REPLACE TRIGGER a
-- SHARE ROW EXCLUSIVE lock on character_equipped_items for the rest of the
-- transaction. SET LOCAL lock_timeout gives up after 5 seconds instead of
-- queueing behind a long-running query; a timeout rolls the whole file
-- back, and the next deploy attempt simply runs it again. Every statement
-- is re-runnable (ADD COLUMN IF NOT EXISTS, DROP CONSTRAINT IF EXISTS then
-- ADD, CREATE OR REPLACE, COMMENT ON, REVOKE), and no data changes.
--
-- Deploy
-- ------
-- One migration-only PR, merged with --admin on a non-raid day; it deploys
-- about 12 seconds after merge. It must be live before the
-- feat/armory-item-level code PR merges, because that PR names item_level
-- in the sync-gear and import insert maps, which fail against a table
-- without the column.
--
-- Not changed
-- -----------
-- Every RLS policy on character_equipped_items, every grant, every other
-- column, the delete-then-insert flow of the three Battle.net writers, the
-- WowSims import, and lib/database.types.ts (updated on the code branch).
--
-- Rollback
-- --------
-- A forward migration with these statements removes the guard, the CHECK
-- and the column. Only stored item levels are lost, and the next gear sync
-- restores them:
--
--   DROP TRIGGER IF EXISTS "enforce_equipped_item_level_insert" ON "public"."character_equipped_items";
--   DROP TRIGGER IF EXISTS "enforce_equipped_item_level_update" ON "public"."character_equipped_items";
--   DROP FUNCTION IF EXISTS "public"."enforce_equipped_item_level_server_only"();
--   ALTER TABLE "public"."character_equipped_items" DROP CONSTRAINT IF EXISTS "character_equipped_items_item_level_range";
--   ALTER TABLE "public"."character_equipped_items" DROP COLUMN IF EXISTS "item_level";

SET LOCAL lock_timeout = '5s';

ALTER TABLE "public"."character_equipped_items" ADD COLUMN IF NOT EXISTS "item_level" integer;

ALTER TABLE "public"."character_equipped_items" DROP CONSTRAINT IF EXISTS "character_equipped_items_item_level_range";

ALTER TABLE "public"."character_equipped_items" ADD CONSTRAINT "character_equipped_items_item_level_range" CHECK ("item_level" IS NULL OR "item_level" BETWEEN 1 AND 1999);

COMMENT ON COLUMN "public"."character_equipped_items"."item_level" IS 'Equipped item level from the Battle.net profile equipment API at the last gear sync, or null when the source gave none. Written only by the server gear sync, see public.enforce_equipped_item_level_server_only().';

CREATE OR REPLACE FUNCTION "public"."enforce_equipped_item_level_server_only"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  -- Officers read item_level as evidence of what a raider has equipped, so
  -- only the server gear sync may write it. The owner policy and the table
  -- rights would otherwise let a browser session set its own. The role
  -- setting survives SECURITY DEFINER, so a definer function called from a
  -- browser session is covered too. The service role and migrations are
  -- trusted and not checked.
  IF coalesce(current_setting('role', true), '') IN ('anon', 'authenticated') THEN
    RAISE EXCEPTION USING
      MESSAGE = 'equipped item levels are written only by the server gear sync',
      ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION "public"."enforce_equipped_item_level_server_only"() IS 'An anon or authenticated session cannot insert a character_equipped_items row that carries an item_level, or change a stored one, directly or through a SECURITY DEFINER function. Called by two WHEN gated triggers on character_equipped_items. The service role, which the Battle.net gear sync and import use, is not checked. Invoker rights because it reads no table, EXECUTE revoked from PUBLIC, anon and authenticated.';

REVOKE ALL ON FUNCTION "public"."enforce_equipped_item_level_server_only"() FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE TRIGGER "enforce_equipped_item_level_insert" BEFORE INSERT ON "public"."character_equipped_items" FOR EACH ROW WHEN (NEW.item_level IS NOT NULL) EXECUTE FUNCTION "public"."enforce_equipped_item_level_server_only"();

COMMENT ON TRIGGER "enforce_equipped_item_level_insert" ON "public"."character_equipped_items" IS 'Browser sessions cannot insert an equipped item row that carries an item_level. Runs only when the new row has one, so owner inserts without a level pass. See public.enforce_equipped_item_level_server_only().';

CREATE OR REPLACE TRIGGER "enforce_equipped_item_level_update" BEFORE UPDATE OF "item_level" ON "public"."character_equipped_items" FOR EACH ROW WHEN (NEW.item_level IS DISTINCT FROM OLD.item_level) EXECUTE FUNCTION "public"."enforce_equipped_item_level_server_only"();

COMMENT ON TRIGGER "enforce_equipped_item_level_update" ON "public"."character_equipped_items" IS 'Browser sessions cannot change or clear a stored item_level. Runs only when the level changes, so owner edits of enchants and gems pass. See public.enforce_equipped_item_level_server_only().';

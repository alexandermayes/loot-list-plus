-- Cache the base item level per wowhead id, for the equipped item level.
--
-- Problem
-- -------
-- The Classic profile equipment response carries no per-item level (quick
-- task 261026-wpw spike, 0 of 90 items), so the item_level column that
-- 20261026120000 adds to character_equipped_items would stay null for every
-- row. Officers would see no level in the Equipped column of the master
-- sheet candidate panel.
--
-- Fix
-- ---
-- One table keyed by wowhead id that holds the base item level from the
-- Battle.net Game Data item endpoint (GET /data/wow/item/{id} in namespace
-- static-classic-{region}). A row is written on a cache miss during a gear
-- sync. The base level never changes for an item id, so a row never needs
-- refreshing; fetched_at records when it was cached. A CHECK keeps the level
-- between 1 and 1999, the same bounds as character_equipped_items. MoP
-- upgrades are not included in a base level.
--
-- Readers and writers checked
-- ---------------------------
-- Only lib/battlenet-item-levels.ts reads and writes this table, through the
-- service-role client. It is called by three routes after they fetch the
-- profile equipment: POST /api/battlenet/characters/sync-gear, the
-- Battle.net character import and link-battlenet. No browser path, view,
-- function, trigger or publication touches it. The WowSims import does not
-- use it.
--
-- Access: service role only. RLS is enabled with no policies, and all
-- privileges are revoked from PUBLIC, anon and authenticated, because the
-- baseline default privileges on the public schema grant them on every new
-- table. The service role gets an explicit GRANT ALL, as in 20260930100000.
-- It matters because a browser session that could write here would set the
-- level officers read for every guild that holds that item.
--
-- Production safety
-- -----------------
-- A new empty table: no lock on any existing table and no data change.
-- Every statement is re-runnable (CREATE TABLE IF NOT EXISTS, DROP
-- CONSTRAINT IF EXISTS then ADD CONSTRAINT, ENABLE ROW LEVEL SECURITY,
-- REVOKE, GRANT, COMMENT ON).
--
-- Deploy
-- ------
-- It ships in the same migration-only PR as 20261026120000, merged with
-- --admin on a non-raid day; it deploys about 12 seconds after merge. Both
-- must be live before the feat/armory-item-level code PR merges, because
-- that PR names item_level in three insert maps and reads this table.
--
-- Not changed
-- -----------
-- character_equipped_items and every other table, policy, grant and
-- function.
--
-- Rollback
-- --------
-- A forward migration with this statement removes the table. Only cached
-- levels are lost, and the helper treats a missing table as a cache miss, so
-- gear syncs keep working and simply fetch every item again:
--
--   DROP TABLE IF EXISTS "public"."item_base_levels";

CREATE TABLE IF NOT EXISTS "public"."item_base_levels" (
    "wowhead_id" integer NOT NULL,
    "item_level" integer NOT NULL,
    "fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "item_base_levels_pkey" PRIMARY KEY ("wowhead_id")
);

ALTER TABLE "public"."item_base_levels" DROP CONSTRAINT IF EXISTS "item_base_levels_item_level_range";

ALTER TABLE "public"."item_base_levels" ADD CONSTRAINT "item_base_levels_item_level_range" CHECK ("item_level" BETWEEN 1 AND 1999);

-- Service role only: RLS on with no policies.
ALTER TABLE "public"."item_base_levels" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."item_base_levels" FROM PUBLIC, "anon", "authenticated";

GRANT ALL ON TABLE "public"."item_base_levels" TO "service_role";

COMMENT ON TABLE "public"."item_base_levels" IS 'Base item level per wowhead id from the Battle.net Game Data item endpoint (static-classic namespace), cached by the server gear sync, service role only, MoP upgrades not included.';

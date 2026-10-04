-- BLP tables are written only by the BLP functions.
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
-- Readers and writers checked
-- ----------------------------
-- Every BLP writer (the three recompute functions, increment_blp,
-- increment_blp_bulk, reset_blp, reset_guild_season, delete_guild, and the
-- referential actions of character, guild, loot item and raid event
-- deletes) keeps working, since none of them ever depended on these
-- policies. Every reader (the dashboard, GET /api/blp, the addon exports)
-- is unchanged: the two SELECT policies are not touched.
--
-- Error contract
-- --------------
-- Unchanged: a user session's INSERT (and the insert half of an upsert)
-- gets PostgreSQL's own row-level security error, 'new row violates
-- row-level security policy for table "blp_credits"' (or "blp_tracking");
-- its UPDATE and DELETE affect 0 rows with no error.
--
-- Production safety
-- -----------------
-- DROP POLICY takes an ACCESS EXCLUSIVE lock on blp_credits and
-- blp_tracking for the rest of the transaction; SET LOCAL lock_timeout
-- gives up after 5 seconds instead of queueing behind a long query (a BLP
-- recompute runs in an after() hook of several routes), and a timeout rolls
-- the whole file back so the next deploy runs it again. Every statement is
-- idempotent (DROP POLICY IF EXISTS) and no existing row can make the file
-- fail.
--
-- Not changed
-- -----------
-- The two BLP SELECT policies ("Guild members can view BLP", "Guild
-- members can view BLP credits"), every other policy, trigger, function and
-- grant, lib/database.types.ts, and every existing row. Table grants are
-- not changed either.
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

SET LOCAL lock_timeout = '5s';

DROP POLICY IF EXISTS "Officers can insert BLP credits" ON "public"."blp_credits";

DROP POLICY IF EXISTS "Officers can update BLP credits" ON "public"."blp_credits";

DROP POLICY IF EXISTS "Officers can delete BLP credits" ON "public"."blp_credits";

DROP POLICY IF EXISTS "Officers can insert BLP" ON "public"."blp_tracking";

DROP POLICY IF EXISTS "Officers can update BLP" ON "public"."blp_tracking";

DROP POLICY IF EXISTS "Officers can delete BLP" ON "public"."blp_tracking";

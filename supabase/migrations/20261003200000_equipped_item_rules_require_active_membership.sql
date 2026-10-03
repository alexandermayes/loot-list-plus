-- Equipped item rules require an active guild membership.
--
-- Problem
-- -------
-- The officer policy on character_equipped_items, and the guildmate read
-- policy on the same table, match a membership row of the item's character
-- in the guild without requiring it to be active, unlike the characters
-- read policy "Guild members can view guild characters" and the app's gear
-- routes, which require the character's membership to be active.
--
-- Fix
-- ---
-- "Officers can manage guild characters' equipped items" is recreated with
-- one added conjunct in both its USING and WITH CHECK clauses, so the one
-- membership row an officer's write relies on must be both active and in a
-- guild where the caller is an officer. "Users can view equipped items for
-- guild characters" is recreated with one added conjunct, so a guildmate
-- reads the equipped items of a character only while that character's
-- membership in the shared guild is active. The owner policy is unchanged,
-- so a character's owner keeps managing its own equipped items whatever its
-- memberships.
--
-- Readers and writers checked
-- ---------------------------
-- No app, bot, companion or script change accompanies this migration. Every
-- reader and writer of character_equipped_items is a service-role route
-- that already checks ownership or an active membership itself before the
-- query; no SECURITY DEFINER function, view, trigger or publication touches
-- the table. Deleting a character still removes its rows through the
-- existing ON DELETE CASCADE foreign key, which RLS does not apply to.
--
-- Production safety
-- -----------------
-- DROP POLICY and CREATE POLICY take an ACCESS EXCLUSIVE lock on
-- character_equipped_items for the rest of the transaction. SET LOCAL
-- lock_timeout gives up after 5 seconds instead of queueing behind a
-- long-running query; a timeout rolls the whole file back, and the next
-- deploy attempt simply runs it again. Every statement is idempotent (DROP
-- POLICY IF EXISTS, then CREATE POLICY in the same transaction), no data
-- changes, and no existing row can make any statement fail.
--
-- Deploy
-- ------
-- One migration-only PR, merged with --admin; it deploys about 12 seconds
-- after merge. No app PR needs to land first, because no app path relies on
-- the rules being narrowed.
--
-- Not changed
-- -----------
-- "Users can manage their own characters' equipped items", every other
-- policy, trigger, function and grant, and lib/database.types.ts.
--
-- Rollback
-- --------
-- A forward migration with these statements restores the previous policies
-- exactly. No data changes either way:
--
--   DROP POLICY IF EXISTS "Officers can manage guild characters' equipped items" ON "public"."character_equipped_items";
--   CREATE POLICY "Officers can manage guild characters' equipped items" ON "public"."character_equipped_items" USING ((EXISTS ( SELECT 1
--      FROM "public"."character_guild_memberships" "cgm"
--     WHERE (("cgm"."character_id" = "character_equipped_items"."character_id") AND "public"."is_guild_officer"("cgm"."guild_id"))))) WITH CHECK ((EXISTS ( SELECT 1
--      FROM "public"."character_guild_memberships" "cgm"
--     WHERE (("cgm"."character_id" = "character_equipped_items"."character_id") AND "public"."is_guild_officer"("cgm"."guild_id")))));
--   DROP POLICY IF EXISTS "Users can view equipped items for guild characters" ON "public"."character_equipped_items";
--   CREATE POLICY "Users can view equipped items for guild characters" ON "public"."character_equipped_items" FOR SELECT USING ((EXISTS ( SELECT 1
--      FROM ((("public"."characters" "c"
--        JOIN "public"."character_guild_memberships" "cgm" ON (("cgm"."character_id" = "c"."id")))
--        JOIN "public"."character_guild_memberships" "my_cgm" ON (("my_cgm"."guild_id" = "cgm"."guild_id")))
--        JOIN "public"."characters" "my_c" ON (("my_c"."id" = "my_cgm"."character_id")))
--     WHERE (("c"."id" = "character_equipped_items"."character_id") AND ("my_c"."user_id" = "auth"."uid"()) AND ("my_cgm"."is_active" = true)))));

SET LOCAL lock_timeout = '5s';

DROP POLICY IF EXISTS "Officers can manage guild characters' equipped items" ON "public"."character_equipped_items";

CREATE POLICY "Officers can manage guild characters' equipped items" ON "public"."character_equipped_items" USING ((EXISTS ( SELECT 1
   FROM "public"."character_guild_memberships" "cgm"
  WHERE (("cgm"."character_id" = "character_equipped_items"."character_id") AND ("cgm"."is_active" = true) AND "public"."is_guild_officer"("cgm"."guild_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."character_guild_memberships" "cgm"
  WHERE (("cgm"."character_id" = "character_equipped_items"."character_id") AND ("cgm"."is_active" = true) AND "public"."is_guild_officer"("cgm"."guild_id")))));

DROP POLICY IF EXISTS "Users can view equipped items for guild characters" ON "public"."character_equipped_items";

CREATE POLICY "Users can view equipped items for guild characters" ON "public"."character_equipped_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ((("public"."characters" "c"
     JOIN "public"."character_guild_memberships" "cgm" ON (("cgm"."character_id" = "c"."id")))
     JOIN "public"."character_guild_memberships" "my_cgm" ON (("my_cgm"."guild_id" = "cgm"."guild_id")))
     JOIN "public"."characters" "my_c" ON (("my_c"."id" = "my_cgm"."character_id")))
  WHERE (("c"."id" = "character_equipped_items"."character_id") AND ("my_c"."user_id" = "auth"."uid"()) AND ("cgm"."is_active" = true) AND ("my_cgm"."is_active" = true)))));

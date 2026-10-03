-- Loot list and expansion rules require an active guild membership.
--
-- Problem
-- -------
-- Two policies on loot_submissions and, with the same shape, three officer
-- write policies on expansions check for a membership row of the caller in
-- the guild without requiring it to be active: "Guild members can view guild
-- submissions" (SELECT), "Officers can manage submissions" (UPDATE),
-- "Officers can insert expansions", "Officers can update expansions" and
-- "Officers can delete expansions". Every other guild-member rule in this
-- family already requires an active membership: loot_submissions_select,
-- loot_submission_items_select, loot_submission_snapshots_select, the
-- characters policy helper and is_guild_officer.
--
-- Fix
-- ---
-- "Guild members can view guild submissions" is dropped. Its USING clause,
-- once an active-membership condition is added, is the same condition
-- loot_submissions_select already enforces, so after the drop the
-- loot_submissions SELECT policies are loot_submissions_select (active member
-- of the list's guild) and "Users can view own character submissions" (owner
-- of the list's character). A member whose membership in a guild goes
-- inactive keeps reading their own lists and stops reading the rest of that
-- guild's lists.
--
-- "Officers can manage submissions" is dropped. loot_submissions_update
-- already allows the owner or is_guild_officer(guild_id) (the guild creator,
-- or an active officer-rank membership), so an active officer keeps the same
-- UPDATE access this policy gave and loses nothing; only an inactive
-- officer-rank membership next to another active membership in the same
-- guild loses the extra UPDATE access it granted.
--
-- "Officers can insert expansions", "Officers can update expansions" and
-- "Officers can delete expansions" are recreated with one added conjunct,
-- ("cgm"."is_active" = true), joined by AND between the existing
-- ("c"."user_id" = "auth"."uid"()) and ("gr"."position" >= 50) conditions.
-- Each recreated policy keeps its name, command, USING or WITH CHECK clause
-- and has no TO clause, matching the baseline text exactly apart from that
-- one conjunct.
--
-- Readers and writers checked
-- ---------------------------
-- No app, bot, companion or script change accompanies this migration. Every
-- user-session reader of loot_submissions filters to the signed-in user's
-- active guild (the user bundle lists active memberships only) or to the
-- caller's own character; every other reader is a service-role route or a
-- SECURITY DEFINER function. Nothing writes expansions through a user
-- session except the two dropped and the three recreated policies: every app
-- write to expansions goes through a service-role route or a SECURITY
-- DEFINER function, so only a direct API call by someone whose officer-rank
-- membership is inactive changes behaviour. lib/database.types.ts has no
-- policy names, so it is unaffected.
--
-- Production safety
-- -----------------
-- DROP POLICY and CREATE POLICY take an ACCESS EXCLUSIVE lock on their table
-- for the rest of the transaction. SET LOCAL lock_timeout gives up after 5
-- seconds instead of queueing behind a long-running query on loot_submissions
-- or expansions; a timeout rolls the whole file back, and the next deploy
-- attempt simply runs it again. Every statement is idempotent (DROP POLICY IF
-- EXISTS, then CREATE POLICY in the same transaction), no data changes, and
-- no existing row can make any statement fail.
--
-- Deploy
-- ------
-- One migration-only PR, merged with --admin; it deploys about 12 seconds
-- after merge. No app PR needs to land first, because no app path relies on
-- the dropped or narrowed rules.
--
-- Not changed
-- -----------
-- Every other policy, every trigger, function and grant, and
-- lib/database.types.ts.
--
-- Rollback
-- --------
-- A forward migration with these statements restores the previous policies
-- exactly. No data changes either way:
--
--   DROP POLICY IF EXISTS "Guild members can view guild submissions" ON "public"."loot_submissions";
--   CREATE POLICY "Guild members can view guild submissions" ON "public"."loot_submissions" FOR SELECT USING ((EXISTS ( SELECT 1
--      FROM ("public"."character_guild_memberships" "cgm"
--        JOIN "public"."characters" "c" ON (("c"."id" = "cgm"."character_id")))
--     WHERE (("c"."user_id" = "auth"."uid"()) AND ("cgm"."guild_id" = "loot_submissions"."guild_id")))));
--   DROP POLICY IF EXISTS "Officers can manage submissions" ON "public"."loot_submissions";
--   CREATE POLICY "Officers can manage submissions" ON "public"."loot_submissions" FOR UPDATE USING ((EXISTS ( SELECT 1
--      FROM (("public"."character_guild_memberships" "cgm"
--        JOIN "public"."characters" "c" ON (("c"."id" = "cgm"."character_id")))
--        JOIN "public"."guild_roles" "gr" ON ((("gr"."guild_id" = "cgm"."guild_id") AND (("gr"."name")::"text" = ("cgm"."role")::"text"))))
--     WHERE (("c"."user_id" = "auth"."uid"()) AND ("cgm"."guild_id" = "loot_submissions"."guild_id") AND ("gr"."position" >= 50)))));
--   DROP POLICY IF EXISTS "Officers can insert expansions" ON "public"."expansions";
--   CREATE POLICY "Officers can insert expansions" ON "public"."expansions" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
--      FROM (("public"."character_guild_memberships" "cgm"
--        JOIN "public"."characters" "c" ON (("c"."id" = "cgm"."character_id")))
--        JOIN "public"."guild_roles" "gr" ON ((("gr"."guild_id" = "cgm"."guild_id") AND (("gr"."name")::"text" = ("cgm"."role")::"text"))))
--     WHERE (("cgm"."guild_id" = "expansions"."guild_id") AND ("c"."user_id" = "auth"."uid"()) AND ("gr"."position" >= 50)))));
--   DROP POLICY IF EXISTS "Officers can update expansions" ON "public"."expansions";
--   CREATE POLICY "Officers can update expansions" ON "public"."expansions" FOR UPDATE USING ((EXISTS ( SELECT 1
--      FROM (("public"."character_guild_memberships" "cgm"
--        JOIN "public"."characters" "c" ON (("c"."id" = "cgm"."character_id")))
--        JOIN "public"."guild_roles" "gr" ON ((("gr"."guild_id" = "cgm"."guild_id") AND (("gr"."name")::"text" = ("cgm"."role")::"text"))))
--     WHERE (("cgm"."guild_id" = "expansions"."guild_id") AND ("c"."user_id" = "auth"."uid"()) AND ("gr"."position" >= 50)))));
--   DROP POLICY IF EXISTS "Officers can delete expansions" ON "public"."expansions";
--   CREATE POLICY "Officers can delete expansions" ON "public"."expansions" FOR DELETE USING ((EXISTS ( SELECT 1
--      FROM (("public"."character_guild_memberships" "cgm"
--        JOIN "public"."characters" "c" ON (("c"."id" = "cgm"."character_id")))
--        JOIN "public"."guild_roles" "gr" ON ((("gr"."guild_id" = "cgm"."guild_id") AND (("gr"."name")::"text" = ("cgm"."role")::"text"))))
--     WHERE (("cgm"."guild_id" = "expansions"."guild_id") AND ("c"."user_id" = "auth"."uid"()) AND ("gr"."position" >= 50)))));

SET LOCAL lock_timeout = '5s';

DROP POLICY IF EXISTS "Guild members can view guild submissions" ON "public"."loot_submissions";

DROP POLICY IF EXISTS "Officers can manage submissions" ON "public"."loot_submissions";

DROP POLICY IF EXISTS "Officers can insert expansions" ON "public"."expansions";

CREATE POLICY "Officers can insert expansions" ON "public"."expansions" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (("public"."character_guild_memberships" "cgm"
     JOIN "public"."characters" "c" ON (("c"."id" = "cgm"."character_id")))
     JOIN "public"."guild_roles" "gr" ON ((("gr"."guild_id" = "cgm"."guild_id") AND (("gr"."name")::"text" = ("cgm"."role")::"text"))))
  WHERE (("cgm"."guild_id" = "expansions"."guild_id") AND ("c"."user_id" = "auth"."uid"()) AND ("cgm"."is_active" = true) AND ("gr"."position" >= 50)))));

DROP POLICY IF EXISTS "Officers can update expansions" ON "public"."expansions";

CREATE POLICY "Officers can update expansions" ON "public"."expansions" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM (("public"."character_guild_memberships" "cgm"
     JOIN "public"."characters" "c" ON (("c"."id" = "cgm"."character_id")))
     JOIN "public"."guild_roles" "gr" ON ((("gr"."guild_id" = "cgm"."guild_id") AND (("gr"."name")::"text" = ("cgm"."role")::"text"))))
  WHERE (("cgm"."guild_id" = "expansions"."guild_id") AND ("c"."user_id" = "auth"."uid"()) AND ("cgm"."is_active" = true) AND ("gr"."position" >= 50)))));

DROP POLICY IF EXISTS "Officers can delete expansions" ON "public"."expansions";

CREATE POLICY "Officers can delete expansions" ON "public"."expansions" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM (("public"."character_guild_memberships" "cgm"
     JOIN "public"."characters" "c" ON (("c"."id" = "cgm"."character_id")))
     JOIN "public"."guild_roles" "gr" ON ((("gr"."guild_id" = "cgm"."guild_id") AND (("gr"."name")::"text" = ("cgm"."role")::"text"))))
  WHERE (("cgm"."guild_id" = "expansions"."guild_id") AND ("c"."user_id" = "auth"."uid"()) AND ("cgm"."is_active" = true) AND ("gr"."position" >= 50)))));

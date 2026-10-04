-- Reserve tables are read and written only by the server.
--
-- Problem
-- -------
-- The baseline gives reserve_runs an INSERT policy that requires only a
-- signed-in caller, and UPDATE and DELETE policies for the run's creator or
-- an officer of its guild. It gives reserve_awards INSERT and DELETE
-- policies for an officer of the run's guild. These policies decide who may
-- write a row, not what it holds (its guild, creator, raid tier or
-- awarded_by), while the app writes these tables only from server routes
-- with the service role after its own checks (signed-in user, active
-- membership, Premium access, run management), so no app path uses them.
-- The four SELECT policies give members of a run's guild, and its creator,
-- a direct read of every row and column of that guild's reserve runs,
-- sign-ups, awards and run history, while the app reads these tables only
-- from server routes, which decide what each caller sees.
--
-- Fix
-- ---
-- The policies are dropped. RLS stays enabled on the tables, so a user
-- session can no longer insert, update or delete a reserve run or award, or
-- read any reserve row. The service role, which every app route uses,
-- bypasses RLS and is unchanged. Foreign key actions (guild delete, raid
-- team delete, character delete, run delete, sign-up delete) are not
-- subject to RLS. This follows 20260930000100, which dropped unused session
-- write policies on membership rows.
--
-- Readers and writers checked
-- ---------------------------
-- Every reader and writer is a server route on the service role, including
-- the public join page, its link preview and guest sign-up. No page,
-- browser code, bot, companion app, addon, script, view or database
-- function uses these tables with a user session.
--
-- Error contract
-- --------------
-- A user session's INSERT gets PostgreSQL's RLS error (42501, new row
-- violates row-level security policy for table "<table>"), unless a BEFORE
-- trigger on the table refuses the row first with its own error. Its UPDATE
-- and DELETE affect 0 rows. Its SELECT returns no rows. The service role
-- and database functions are unaffected.
--
-- Production safety
-- -----------------
-- DROP POLICY takes an ACCESS EXCLUSIVE lock on each table it names for the
-- rest of the transaction. SET LOCAL lock_timeout gives up after 5 seconds
-- instead of queueing behind a long query, and a timeout rolls the whole
-- file back so the next deploy runs it again. Every statement is idempotent
-- (DROP POLICY IF EXISTS), no data changes, and no existing row can make
-- the file fail.
--
-- Not changed
-- -----------
-- RLS enabled, not forced, on the four tables. Table grants (GRANT ALL to
-- anon, authenticated and service_role). The token default functions
-- generate_reserve_token and generate_reserve_leader_token and their
-- grants. Every trigger, including trg_reserve_runs_updated_at and
-- trg_reserve_submissions_updated_at. Every other policy and function,
-- lib/database.types.ts and every existing row.
--
-- Deploy
-- ------
-- One migration-only PR, merged with --admin after the PR carrying
-- 20261003230000. It deploys about 12 seconds after merge. No app PR is
-- needed first.
--
-- Rollback
-- --------
-- A forward migration with these statements, in this order, restores the
-- previous policies exactly, and no data changes either way.
--
--   DROP POLICY IF EXISTS "reserve_runs_insert" ON "public"."reserve_runs";
--   CREATE POLICY "reserve_runs_insert" ON "public"."reserve_runs" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));
--   DROP POLICY IF EXISTS "reserve_runs_update" ON "public"."reserve_runs";
--   CREATE POLICY "reserve_runs_update" ON "public"."reserve_runs" FOR UPDATE USING ((("created_by" = "auth"."uid"()) OR (("guild_id" IS NOT NULL) AND "public"."is_guild_officer"("guild_id"))));
--   DROP POLICY IF EXISTS "reserve_runs_delete" ON "public"."reserve_runs";
--   CREATE POLICY "reserve_runs_delete" ON "public"."reserve_runs" FOR DELETE USING ((("created_by" = "auth"."uid"()) OR (("guild_id" IS NOT NULL) AND "public"."is_guild_officer"("guild_id"))));
--   DROP POLICY IF EXISTS "reserve_awards_insert" ON "public"."reserve_awards";
--   CREATE POLICY "reserve_awards_insert" ON "public"."reserve_awards" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
--      FROM "public"."reserve_runs" "rr"
--     WHERE (("rr"."id" = "reserve_awards"."reserve_run_id") AND "public"."is_guild_officer"("rr"."guild_id")))));
--   DROP POLICY IF EXISTS "reserve_awards_delete" ON "public"."reserve_awards";
--   CREATE POLICY "reserve_awards_delete" ON "public"."reserve_awards" FOR DELETE USING ((EXISTS ( SELECT 1
--      FROM "public"."reserve_runs" "rr"
--     WHERE (("rr"."id" = "reserve_awards"."reserve_run_id") AND "public"."is_guild_officer"("rr"."guild_id")))));
--   DROP POLICY IF EXISTS "reserve_runs_select" ON "public"."reserve_runs";
--   CREATE POLICY "reserve_runs_select" ON "public"."reserve_runs" FOR SELECT USING ((("created_by" = "auth"."uid"()) OR (("guild_id" IS NOT NULL) AND (EXISTS ( SELECT 1
--      FROM ("public"."character_guild_memberships" "cgm"
--        JOIN "public"."characters" "c" ON (("c"."id" = "cgm"."character_id")))
--     WHERE (("cgm"."guild_id" = "reserve_runs"."guild_id") AND ("c"."user_id" = "auth"."uid"()) AND ("cgm"."is_active" = true)))))));
--   DROP POLICY IF EXISTS "reserve_awards_select" ON "public"."reserve_awards";
--   CREATE POLICY "reserve_awards_select" ON "public"."reserve_awards" FOR SELECT USING ((EXISTS ( SELECT 1
--      FROM (("public"."reserve_runs" "rr"
--        JOIN "public"."character_guild_memberships" "cgm" ON (("cgm"."guild_id" = "rr"."guild_id")))
--        JOIN "public"."characters" "c" ON (("c"."id" = "cgm"."character_id")))
--     WHERE (("rr"."id" = "reserve_awards"."reserve_run_id") AND ("c"."user_id" = "auth"."uid"()) AND ("cgm"."is_active" = true)))));
--   DROP POLICY IF EXISTS "reserve_submissions_select" ON "public"."reserve_submissions";
--   CREATE POLICY "reserve_submissions_select" ON "public"."reserve_submissions" FOR SELECT USING ((EXISTS ( SELECT 1
--      FROM (("public"."reserve_runs" "rr"
--        JOIN "public"."character_guild_memberships" "cgm" ON (("cgm"."guild_id" = "rr"."guild_id")))
--        JOIN "public"."characters" "c" ON (("c"."id" = "cgm"."character_id")))
--     WHERE (("rr"."id" = "reserve_submissions"."reserve_run_id") AND ("c"."user_id" = "auth"."uid"()) AND ("cgm"."is_active" = true)))));
--   DROP POLICY IF EXISTS "reserve_audit_log_select" ON "public"."reserve_audit_log";
--   CREATE POLICY "reserve_audit_log_select" ON "public"."reserve_audit_log" FOR SELECT USING ((EXISTS ( SELECT 1
--      FROM (("public"."reserve_runs" "rr"
--        JOIN "public"."character_guild_memberships" "cgm" ON (("cgm"."guild_id" = "rr"."guild_id")))
--        JOIN "public"."characters" "c" ON (("c"."id" = "cgm"."character_id")))
--     WHERE (("rr"."id" = "reserve_audit_log"."reserve_run_id") AND ("c"."user_id" = "auth"."uid"()) AND ("cgm"."is_active" = true)))));

SET LOCAL lock_timeout = '5s';

DROP POLICY IF EXISTS "reserve_runs_insert" ON "public"."reserve_runs";

DROP POLICY IF EXISTS "reserve_runs_update" ON "public"."reserve_runs";

DROP POLICY IF EXISTS "reserve_runs_delete" ON "public"."reserve_runs";

DROP POLICY IF EXISTS "reserve_awards_insert" ON "public"."reserve_awards";

DROP POLICY IF EXISTS "reserve_awards_delete" ON "public"."reserve_awards";

DROP POLICY IF EXISTS "reserve_runs_select" ON "public"."reserve_runs";

DROP POLICY IF EXISTS "reserve_awards_select" ON "public"."reserve_awards";

DROP POLICY IF EXISTS "reserve_submissions_select" ON "public"."reserve_submissions";

DROP POLICY IF EXISTS "reserve_audit_log_select" ON "public"."reserve_audit_log";

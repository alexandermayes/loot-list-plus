-- Scope cross-guild read exposure (GH #191, security audit finding M-1).
--
-- Problem
-- -------
-- Four user/guild-scoped tables carried a blanket `FOR SELECT USING (true)` RLS
-- policy, so anyone with the publishable anon key could read them across EVERY
-- guild — not just their own:
--   * profiles              — Discord id / username / avatar / display name
--   * attendance_records    — every guild's full attendance history
--   * loot_submissions      — every guild's loot lists
--   * loot_submission_items — the ranked items on them
--
-- RLS policies are OR'd, so the permissive policy overrode the correctly-scoped
-- ones that already exist on three of these tables. Dropping the `USING (true)`
-- policies leaves the guild-scoped policies in force. profiles is the exception:
-- its only SELECT policy was the permissive one, so it gets a scoped replacement.
--
-- App impact: none expected.
--   * profiles is never read through an RLS-governed (anon/user) client — display
--     names come from auth.admin.getUserById via the service role. The exposure
--     was purely a raw PostgREST query to /rest/v1/profiles.
--   * attendance_records / loot_submissions / loot_submission_items are read from
--     browser components only within the user's own guild, which the surviving
--     scoped policies (active guild membership) already permit. Service-role reads
--     in API routes bypass RLS and are unaffected either way.
--
-- Non-destructive; only tightens read visibility.

-- ---------------------------------------------------------------------------
-- attendance_records — keep "attendance_records_select" (active member of the
-- raid's guild, or guild creator). Drop the blanket policy.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Attendance is viewable by everyone" ON "public"."attendance_records";

-- ---------------------------------------------------------------------------
-- loot_submissions — keep "loot_submissions_select" / "Guild members can view
-- guild submissions" / "Users can view own character submissions". Drop the
-- blanket policy.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view all submissions" ON "public"."loot_submissions";

-- ---------------------------------------------------------------------------
-- loot_submission_items — keep "loot_submission_items_select" (active member of
-- the submission's guild). Drop the blanket policy.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view all submission items" ON "public"."loot_submission_items";

-- ---------------------------------------------------------------------------
-- profiles — no scoped SELECT policy existed, so replace the blanket one. A
-- profile is visible to its owner, or to anyone who shares an active guild
-- membership with the owner. Anonymous callers (auth.uid() IS NULL) match
-- neither branch and see nothing, which closes the enumeration.
--
-- The shared-guild check goes through the existing SECURITY DEFINER helpers
-- get_current_user_guild_ids() (the viewer's active guilds) and
-- get_user_guild_ids(id) (the target's active guilds). An inline join on
-- characters/character_guild_memberships would NOT work here: RLS on those
-- tables is enforced inside a policy's USING expression, and the characters
-- SELECT policy (user_id = auth.uid()) would hide the *other* user's rows,
-- silently making the guildmate branch always false. The DEFINER helpers bypass
-- that, which is why the baseline uses helpers for every cross-user RLS check.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON "public"."profiles";

CREATE POLICY "Profiles viewable by self or guildmates" ON "public"."profiles"
  FOR SELECT USING (
    "auth"."uid"() = "id"
    OR EXISTS (
      SELECT 1
      FROM "public"."get_user_guild_ids"("profiles"."id") AS "target"("guild_id")
      WHERE "target"."guild_id" IN (SELECT "public"."get_current_user_guild_ids"())
    )
  );

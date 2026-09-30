-- Set explicit EXECUTE grants on public-schema functions, by caller.
--
-- Background
-- ----------
-- Postgres grants EXECUTE on every new function to PUBLIC, and every role,
-- anon and authenticated included, is a member of PUBLIC. A REVOKE from anon
-- and authenticated alone therefore leaves the PUBLIC entry in place.
-- 20260722000001 and 20260729000001 revoked six functions from anon and
-- authenticated only, intending them to be service-role only, so PUBLIC still
-- grants them. Most baseline functions also keep the PUBLIC default next to
-- their explicit anon and authenticated grants.
--
-- Rule per class
-- --------------
--   a. Called only by the service role, or not called: REVOKE from PUBLIC,
--      anon and authenticated, then GRANT EXECUTE to service_role.
--   b. Called with a user session and checked inside the function: REVOKE from
--      PUBLIC and anon, then GRANT EXECUTE to authenticated and service_role.
--   c. Trigger functions: REVOKE from PUBLIC, anon and authenticated, with no
--      GRANT. Firing a trigger does not check EXECUTE.
--   d. RLS helpers: REVOKE from PUBLIC, then GRANT EXECUTE to anon,
--      authenticated and service_role. No policy names a role, so policies
--      apply to every role that queries the table, and a policy expression
--      runs as the querying role: without EXECUTE the query fails instead of
--      returning no rows.
--   e. Read functions that return only rows RLS already shows to anon: the
--      same statements as class d.
--
-- Invite codes
-- ------------
-- Every read and write of guild_invite_codes in the app goes through the
-- service role, and redeem_invite_code runs as the table owner, so client
-- roles need no SELECT policy on the table. Its only policy is dropped; RLS
-- stays enabled, so anon and authenticated read no rows.
--
-- search_path
-- -----------
-- can_view_master_sheet, get_guild_expansions, get_user_guild_ids and
-- update_guild_info were the only SECURITY DEFINER functions in public without
-- a fixed search_path. Their bodies reference only public tables, pg_catalog
-- built-ins and auth.uid(), so pinning search_path to public, pg_temp keeps
-- their results the same.
--
-- Not changed
-- -----------
-- generate_reserve_token and generate_reserve_leader_token are SECURITY
-- INVOKER column defaults on reserve_runs, so any role that inserts a run
-- must be able to execute them. They keep their current grants.
--
-- CREATE OR REPLACE FUNCTION keeps a function's grants, while DROP FUNCTION
-- followed by CREATE resets them to the PUBLIC default. A later migration that
-- recreates one of these functions must restate its grants.
--
-- Rollback
-- --------
-- GRANT EXECUTE ON FUNCTION ... TO PUBLIC (or to "anon" or "authenticated")
-- restores the previous access for a function. To restore the invite code
-- policy:
-- CREATE POLICY "Anyone can view active invite codes" ON "public"."guild_invite_codes" FOR SELECT USING (("is_active" = true));
-- ALTER FUNCTION ... RESET search_path on the four functions above restores
-- their previous configuration.

-- Class a. Service-role only, as 20260722000001 intended.
REVOKE ALL ON FUNCTION "public"."merge_phase_groups"("p_expansion_id" "uuid", "p_guild_id" "uuid", "p_phase_groups" "jsonb", "p_merged_groups" "jsonb") FROM PUBLIC, "anon", "authenticated";
GRANT EXECUTE ON FUNCTION "public"."merge_phase_groups"("p_expansion_id" "uuid", "p_guild_id" "uuid", "p_phase_groups" "jsonb", "p_merged_groups" "jsonb") TO "service_role";
REVOKE ALL ON FUNCTION "public"."reset_blp"("p_guild_id" "uuid", "p_character_id" "uuid", "p_loot_item_id" "uuid") FROM PUBLIC, "anon", "authenticated";
GRANT EXECUTE ON FUNCTION "public"."reset_blp"("p_guild_id" "uuid", "p_character_id" "uuid", "p_loot_item_id" "uuid") TO "service_role";
REVOKE ALL ON FUNCTION "public"."increment_blp"("p_guild_id" "uuid", "p_character_id" "uuid", "p_loot_item_id" "uuid", "p_raid_event_id" "uuid") FROM PUBLIC, "anon", "authenticated";
GRANT EXECUTE ON FUNCTION "public"."increment_blp"("p_guild_id" "uuid", "p_character_id" "uuid", "p_loot_item_id" "uuid", "p_raid_event_id" "uuid") TO "service_role";
REVOKE ALL ON FUNCTION "public"."increment_blp_bulk"("p_guild_id" "uuid", "p_loot_item_id" "uuid", "p_raid_event_id" "uuid", "p_character_ids" "uuid"[]) FROM PUBLIC, "anon", "authenticated";
GRANT EXECUTE ON FUNCTION "public"."increment_blp_bulk"("p_guild_id" "uuid", "p_loot_item_id" "uuid", "p_raid_event_id" "uuid", "p_character_ids" "uuid"[]) TO "service_role";
REVOKE ALL ON FUNCTION "public"."seed_tbc_expansion"("p_guild_id" "uuid") FROM PUBLIC, "anon", "authenticated";
GRANT EXECUTE ON FUNCTION "public"."seed_tbc_expansion"("p_guild_id" "uuid") TO "service_role";
REVOKE ALL ON FUNCTION "public"."seed_tbc_expansion_for_guild"("p_guild_id" "uuid") FROM PUBLIC, "anon", "authenticated";
GRANT EXECUTE ON FUNCTION "public"."seed_tbc_expansion_for_guild"("p_guild_id" "uuid") TO "service_role";

-- Class a, continued. Called only by the service role, or not called.
REVOKE ALL ON FUNCTION "public"."can_view_master_sheet"("p_raid_tier_id" "uuid", "p_user_id" "uuid") FROM PUBLIC, "anon", "authenticated";
GRANT EXECUTE ON FUNCTION "public"."can_view_master_sheet"("p_raid_tier_id" "uuid", "p_user_id" "uuid") TO "service_role";
REVOKE ALL ON FUNCTION "public"."generate_invite_code"() FROM PUBLIC, "anon", "authenticated";
GRANT EXECUTE ON FUNCTION "public"."generate_invite_code"() TO "service_role";
REVOKE ALL ON FUNCTION "public"."get_character_guilds"("p_character_id" "uuid") FROM PUBLIC, "anon", "authenticated";
GRANT EXECUTE ON FUNCTION "public"."get_character_guilds"("p_character_id" "uuid") TO "service_role";
REVOKE ALL ON FUNCTION "public"."get_guild_current_expansion"("p_guild_id" "uuid") FROM PUBLIC, "anon", "authenticated";
GRANT EXECUTE ON FUNCTION "public"."get_guild_current_expansion"("p_guild_id" "uuid") TO "service_role";
REVOKE ALL ON FUNCTION "public"."get_guild_submissions"("p_guild_id" "uuid", "p_raid_tier_id" "uuid") FROM PUBLIC, "anon", "authenticated";
GRANT EXECUTE ON FUNCTION "public"."get_guild_submissions"("p_guild_id" "uuid", "p_raid_tier_id" "uuid") TO "service_role";
REVOKE ALL ON FUNCTION "public"."get_user_characters_in_guild"("p_user_id" "uuid", "p_guild_id" "uuid") FROM PUBLIC, "anon", "authenticated";
GRANT EXECUTE ON FUNCTION "public"."get_user_characters_in_guild"("p_user_id" "uuid", "p_guild_id" "uuid") TO "service_role";
REVOKE ALL ON FUNCTION "public"."is_past_deadline"("p_raid_tier_id" "uuid") FROM PUBLIC, "anon", "authenticated";
GRANT EXECUTE ON FUNCTION "public"."is_past_deadline"("p_raid_tier_id" "uuid") TO "service_role";
REVOKE ALL ON FUNCTION "public"."update_guild_icon"("p_guild_id" "uuid", "p_icon_url" "text") FROM PUBLIC, "anon", "authenticated";
GRANT EXECUTE ON FUNCTION "public"."update_guild_icon"("p_guild_id" "uuid", "p_icon_url" "text") TO "service_role";
REVOKE ALL ON FUNCTION "public"."update_guild_info"("p_guild_id" "uuid", "p_name" "text", "p_realm" "text", "p_faction" "text", "p_discord_server_id" "text") FROM PUBLIC, "anon", "authenticated";
GRANT EXECUTE ON FUNCTION "public"."update_guild_info"("p_guild_id" "uuid", "p_name" "text", "p_realm" "text", "p_faction" "text", "p_discord_server_id" "text") TO "service_role";

-- Class a, continued. is_invite_code_valid has no callers, and its table has no
-- client read policy after this migration (see Invite codes), so it becomes
-- service-role only.
REVOKE ALL ON FUNCTION "public"."is_invite_code_valid"("code_input" character varying) FROM PUBLIC, "anon", "authenticated";
GRANT EXECUTE ON FUNCTION "public"."is_invite_code_valid"("code_input" character varying) TO "service_role";

-- Class a, continued. Already service-role only; restated unchanged.
REVOKE ALL ON FUNCTION "public"."recompute_blp_for_item"("p_guild_id" "uuid", "p_loot_item_id" "uuid") FROM PUBLIC, "anon", "authenticated";
GRANT EXECUTE ON FUNCTION "public"."recompute_blp_for_item"("p_guild_id" "uuid", "p_loot_item_id" "uuid") TO "service_role";
REVOKE ALL ON FUNCTION "public"."recompute_blp_for_event"("p_guild_id" "uuid", "p_raid_event_id" "uuid") FROM PUBLIC, "anon", "authenticated";
GRANT EXECUTE ON FUNCTION "public"."recompute_blp_for_event"("p_guild_id" "uuid", "p_raid_event_id" "uuid") TO "service_role";
REVOKE ALL ON FUNCTION "public"."recompute_blp_for_guild"("p_guild_id" "uuid") FROM PUBLIC, "anon", "authenticated";
GRANT EXECUTE ON FUNCTION "public"."recompute_blp_for_guild"("p_guild_id" "uuid") TO "service_role";
REVOKE ALL ON FUNCTION "public"."reset_guild_season"("p_guild_id" "uuid", "p_clear_raids" boolean, "p_clear_loot" boolean, "p_clear_donations" boolean) FROM PUBLIC, "anon", "authenticated";
GRANT EXECUTE ON FUNCTION "public"."reset_guild_season"("p_guild_id" "uuid", "p_clear_raids" boolean, "p_clear_loot" boolean, "p_clear_donations" boolean) TO "service_role";

-- Class b. Called with a user session; each checks the caller inside the
-- function: save_submission_items (submission owner or is_guild_officer),
-- delete_guild (is_guild_master), create_expansion_for_guild
-- (is_guild_officer), redeem_invite_code (a valid invite code).
REVOKE ALL ON FUNCTION "public"."save_submission_items"("p_submission_id" "uuid", "p_items" "jsonb") FROM PUBLIC, "anon";
GRANT EXECUTE ON FUNCTION "public"."save_submission_items"("p_submission_id" "uuid", "p_items" "jsonb") TO "authenticated", "service_role";
REVOKE ALL ON FUNCTION "public"."delete_guild"("p_guild_id" "uuid") FROM PUBLIC, "anon";
GRANT EXECUTE ON FUNCTION "public"."delete_guild"("p_guild_id" "uuid") TO "authenticated", "service_role";
REVOKE ALL ON FUNCTION "public"."create_expansion_for_guild"("p_guild_id" "uuid", "p_name" "text") FROM PUBLIC, "anon";
GRANT EXECUTE ON FUNCTION "public"."create_expansion_for_guild"("p_guild_id" "uuid", "p_name" "text") TO "authenticated", "service_role";
REVOKE ALL ON FUNCTION "public"."redeem_invite_code"("code_input" "text") FROM PUBLIC, "anon";
GRANT EXECUTE ON FUNCTION "public"."redeem_invite_code"("code_input" "text") TO "authenticated", "service_role";

-- Class c. Trigger functions. Firing a trigger does not check EXECUTE, so no
-- role needs a grant.
REVOKE ALL ON FUNCTION "public"."check_max_roles_per_guild"() FROM PUBLIC, "anon", "authenticated";
REVOKE ALL ON FUNCTION "public"."create_default_guild_roles"() FROM PUBLIC, "anon", "authenticated";
REVOKE ALL ON FUNCTION "public"."create_user_preferences"() FROM PUBLIC, "anon", "authenticated";
REVOKE ALL ON FUNCTION "public"."reject_submissions_on_cgm_loss"() FROM PUBLIC, "anon", "authenticated";
REVOKE ALL ON FUNCTION "public"."update_guild_item_priorities_updated_at"() FROM PUBLIC, "anon", "authenticated";
REVOKE ALL ON FUNCTION "public"."update_guild_settings_updated_at"() FROM PUBLIC, "anon", "authenticated";
REVOKE ALL ON FUNCTION "public"."update_updated_at_column"() FROM PUBLIC, "anon", "authenticated";
REVOKE ALL ON FUNCTION "public"."enforce_loot_history_guild_refs"() FROM PUBLIC, "anon", "authenticated";

-- Class d. RLS helpers. Policy expressions run as the querying role, so anon,
-- authenticated and service_role each keep an explicit grant.
REVOKE ALL ON FUNCTION "public"."character_belongs_to_user"("p_character_id" "uuid") FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."character_belongs_to_user"("p_character_id" "uuid") TO "anon", "authenticated", "service_role";
REVOKE ALL ON FUNCTION "public"."character_has_submission_to_user_guilds"("p_character_id" "uuid") FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."character_has_submission_to_user_guilds"("p_character_id" "uuid") TO "anon", "authenticated", "service_role";
REVOKE ALL ON FUNCTION "public"."get_current_user_guild_ids"() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."get_current_user_guild_ids"() TO "anon", "authenticated", "service_role";
REVOKE ALL ON FUNCTION "public"."get_user_guild_ids"("p_user_id" "uuid") FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."get_user_guild_ids"("p_user_id" "uuid") TO "anon", "authenticated", "service_role";
REVOKE ALL ON FUNCTION "public"."is_guild_master"("target_guild_id" "uuid") FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."is_guild_master"("target_guild_id" "uuid") TO "anon", "authenticated", "service_role";
REVOKE ALL ON FUNCTION "public"."is_guild_officer"("target_guild_id" "uuid") FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."is_guild_officer"("target_guild_id" "uuid") TO "anon", "authenticated", "service_role";

-- Class e. Read functions that return only rows RLS already shows to anon.
REVOKE ALL ON FUNCTION "public"."get_guild_expansions"("p_guild_id" "uuid") FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."get_guild_expansions"("p_guild_id" "uuid") TO "anon", "authenticated", "service_role";
REVOKE ALL ON FUNCTION "public"."search_help_articles"("p_query" text, "p_limit" integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."search_help_articles"("p_query" text, "p_limit" integer) TO "anon", "authenticated", "service_role";

-- search_path. These were the only SECURITY DEFINER functions without a fixed
-- search_path; their bodies reference only public tables.
ALTER FUNCTION "public"."can_view_master_sheet"("p_raid_tier_id" "uuid", "p_user_id" "uuid") SET search_path TO 'public', 'pg_temp';
ALTER FUNCTION "public"."get_guild_expansions"("p_guild_id" "uuid") SET search_path TO 'public', 'pg_temp';
ALTER FUNCTION "public"."get_user_guild_ids"("p_user_id" "uuid") SET search_path TO 'public', 'pg_temp';
ALTER FUNCTION "public"."update_guild_info"("p_guild_id" "uuid", "p_name" "text", "p_realm" "text", "p_faction" "text", "p_discord_server_id" "text") SET search_path TO 'public', 'pg_temp';

-- Invite codes. Every read of guild_invite_codes goes through the service
-- role, so client roles need no SELECT policy.
DROP POLICY IF EXISTS "Anyone can view active invite codes" ON "public"."guild_invite_codes";




SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."can_view_master_sheet"("p_raid_tier_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
DECLARE
  v_visible BOOLEAN;
  v_is_officer BOOLEAN;
BEGIN
  -- Get master sheet visibility
  SELECT master_sheet_visible INTO v_visible
  FROM raid_tiers
  WHERE id = p_raid_tier_id;

  -- If visible to all, return true
  IF v_visible THEN
    RETURN true;
  END IF;

  -- Check if user is an officer in the guild
  SELECT EXISTS (
    SELECT 1
    FROM raid_tiers rt
    INNER JOIN expansions e ON e.id = rt.expansion_id
    INNER JOIN character_guild_memberships cgm ON cgm.guild_id = e.guild_id
    INNER JOIN characters c ON c.id = cgm.character_id
    INNER JOIN guild_roles gr ON gr.guild_id = cgm.guild_id AND gr.name = cgm.role
    WHERE rt.id = p_raid_tier_id
    AND c.user_id = p_user_id
    AND gr.position >= 50
  ) INTO v_is_officer;

  RETURN v_is_officer;
END;
$$;


ALTER FUNCTION "public"."can_view_master_sheet"("p_raid_tier_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."character_belongs_to_user"("p_character_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  BEGIN
    RETURN EXISTS (
      SELECT 1 FROM characters
      WHERE id = p_character_id
      AND user_id = auth.uid()
    );
  END;
  $$;


ALTER FUNCTION "public"."character_belongs_to_user"("p_character_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."character_has_submission_to_user_guilds"("p_character_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM loot_submissions ls
    WHERE ls.character_id = p_character_id
      AND ls.guild_id IN (
        SELECT cgm.guild_id
        FROM character_guild_memberships cgm
        INNER JOIN characters c ON c.id = cgm.character_id
        WHERE c.user_id = auth.uid()
          AND cgm.is_active = true
      )
  );
$$;


ALTER FUNCTION "public"."character_has_submission_to_user_guilds"("p_character_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_max_roles_per_guild"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  role_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO role_count
  FROM guild_roles
  WHERE guild_id = NEW.guild_id;

  IF role_count >= 10 THEN
    RAISE EXCEPTION 'Guild cannot have more than 10 roles';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_max_roles_per_guild"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_default_guild_roles"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  BEGIN
    INSERT INTO guild_roles (guild_id, name, color_hex, position, is_default)
    VALUES
      (NEW.id, 'Guild Master', '#ff8000', 100, true),
      (NEW.id, 'Officer', '#fbbf24', 50, true),
      (NEW.id, 'Member', '#a1a1a1', 0, true);
    RETURN NEW;
  END;
  $$;


ALTER FUNCTION "public"."create_default_guild_roles"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_expansion_for_guild"("p_guild_id" "uuid", "p_name" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_expansion_id UUID;
BEGIN
  -- Verify the caller is either the guild creator or a member of the guild
  IF NOT EXISTS (
    SELECT 1 FROM guilds
    WHERE id = p_guild_id
    AND created_by = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM guild_members
    WHERE guild_id = p_guild_id
    AND user_id = auth.uid()
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Not authorized to create expansion for this guild';
  END IF;

  -- Create the expansion with current_phase defaulting to 1
  INSERT INTO expansions (guild_id, name, current_phase)
  VALUES (p_guild_id, p_name, 1)
  RETURNING id INTO v_expansion_id;

  RETURN v_expansion_id;
END;
$$;


ALTER FUNCTION "public"."create_expansion_for_guild"("p_guild_id" "uuid", "p_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_user_preferences"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  BEGIN
    -- When triggered from guild_members, use NEW.user_id
    -- When triggered from auth.users, use NEW.id
    INSERT INTO user_preferences (user_id)
    VALUES (COALESCE(NEW.user_id, NEW.id))
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
  END;
  $$;


ALTER FUNCTION "public"."create_user_preferences"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_guild"("p_guild_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Delete in dependency order
  DELETE FROM loot_submission_items WHERE submission_id IN (
    SELECT id FROM loot_submissions WHERE guild_id = p_guild_id
  );
  DELETE FROM loot_submissions WHERE guild_id = p_guild_id;
  DELETE FROM loot_history WHERE guild_id = p_guild_id;
  DELETE FROM attendance_records WHERE raid_event_id IN (
    SELECT id FROM raid_events WHERE guild_id = p_guild_id
  );
  DELETE FROM raid_events WHERE guild_id = p_guild_id;
  DELETE FROM character_guild_memberships WHERE guild_id = p_guild_id;
  DELETE FROM guild_invite_codes WHERE guild_id = p_guild_id;
  DELETE FROM guild_settings WHERE guild_id = p_guild_id;
  DELETE FROM guild_roles WHERE guild_id = p_guild_id;
  DELETE FROM audit_logs WHERE guild_id = p_guild_id;
  DELETE FROM blp_tracking WHERE guild_id = p_guild_id;
  DELETE FROM character_aliases WHERE guild_id = p_guild_id;
  DELETE FROM guild_item_priorities WHERE guild_id = p_guild_id;

  -- Clear active guild references
  UPDATE user_active_characters
  SET active_guild_id = NULL
  WHERE active_guild_id = p_guild_id;

  -- Delete raid teams and members
  DELETE FROM raid_team_members WHERE raid_team_id IN (
    SELECT id FROM raid_teams WHERE guild_id = p_guild_id
  );
  DELETE FROM raid_teams WHERE guild_id = p_guild_id;

  -- Delete expansions
  DELETE FROM expansions WHERE guild_id = p_guild_id;

  -- Finally delete the guild
  DELETE FROM guilds WHERE id = p_guild_id;
END;
$$;


ALTER FUNCTION "public"."delete_guild"("p_guild_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_invite_code"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Exclude similar looking chars (I, O, 0, 1)
  result TEXT := '';
  -- Note: Removed explicit `i INTEGER;` declaration since FOR loop creates it
BEGIN
  FOR i IN 1..12 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;


ALTER FUNCTION "public"."generate_invite_code"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_reserve_leader_token"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  chars TEXT := 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..32 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;


ALTER FUNCTION "public"."generate_reserve_leader_token"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_reserve_token"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  chars TEXT := 'abcdefghjkmnpqrstuvwxyz23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;


ALTER FUNCTION "public"."generate_reserve_token"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_character_guilds"("p_character_id" "uuid") RETURNS TABLE("guild_id" "uuid", "guild_name" "text", "guild_icon_url" "text", "membership_role" character varying, "joined_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    g.id,
    g.name,
    g.icon_url,
    cgm.role,
    cgm.joined_at
  FROM guilds g
  INNER JOIN character_guild_memberships cgm ON cgm.guild_id = g.id
  WHERE cgm.character_id = p_character_id
  AND cgm.is_active = true
  ORDER BY cgm.joined_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_character_guilds"("p_character_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_user_guild_ids"() RETURNS SETOF "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT DISTINCT cgm.guild_id
  FROM character_guild_memberships cgm
  INNER JOIN characters c ON c.id = cgm.character_id
  WHERE c.user_id = auth.uid()
    AND cgm.is_active = true;
$$;


ALTER FUNCTION "public"."get_current_user_guild_ids"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_guild_current_expansion"("p_guild_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_expansion_id UUID;
BEGIN
  SELECT active_expansion_id INTO v_expansion_id
  FROM guilds
  WHERE id = p_guild_id;

  RETURN v_expansion_id;
END;
$$;


ALTER FUNCTION "public"."get_guild_current_expansion"("p_guild_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_guild_expansions"("p_guild_id" "uuid") RETURNS TABLE("expansion_id" "uuid", "expansion_name" "text", "raid_start_date" "date", "is_current" boolean, "created_at" timestamp with time zone, "raid_days_per_week" integer, "first_raid_day" integer, "second_raid_day" integer, "third_raid_day" integer, "fourth_raid_day" integer, "fifth_raid_day" integer, "timezone" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
DECLARE
  v_current_expansion_id UUID;
BEGIN
  -- Get current expansion
  SELECT active_expansion_id INTO v_current_expansion_id
  FROM guilds
  WHERE id = p_guild_id;

  -- Return all expansions for this guild
  RETURN QUERY
  SELECT
    e.id,
    e.name,
    e.raid_start_date,
    (e.id = v_current_expansion_id) as is_current,
    e.created_at,
    e.raid_days_per_week,
    e.first_raid_day,
    e.second_raid_day,
    e.third_raid_day,
    e.fourth_raid_day,
    e.fifth_raid_day,
    COALESCE(e.timezone, 'America/New_York') as timezone
  FROM expansions e
  WHERE e.guild_id = p_guild_id
  ORDER BY e.created_at ASC;
END;
$$;


ALTER FUNCTION "public"."get_guild_expansions"("p_guild_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_guild_submissions"("p_guild_id" "uuid", "p_raid_tier_id" "uuid") RETURNS TABLE("id" "uuid", "status" character varying, "submitted_at" timestamp with time zone, "review_notes" "text", "character_id" "uuid", "character_name" character varying, "character_class_name" character varying, "character_class_color" character varying, "user_id" "uuid", "item_count" bigint)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Return submissions with character data
  RETURN QUERY
  SELECT
    ls.id,
    ls.status::VARCHAR(255),
    ls.submitted_at,
    ls.review_notes,
    ls.character_id,
    c.name::VARCHAR(255) as character_name,
    wc.name::VARCHAR(255) as character_class_name,
    wc.color_hex::VARCHAR(255) as character_class_color,
    c.user_id,
    (SELECT COUNT(*) FROM loot_submission_items WHERE submission_id = ls.id)::BIGINT as item_count
  FROM loot_submissions ls
  LEFT JOIN characters c ON c.id = ls.character_id
  LEFT JOIN wow_classes wc ON wc.id = c.class_id
  WHERE ls.guild_id = p_guild_id
    AND ls.raid_tier_id = p_raid_tier_id
    AND ls.status != 'draft'
  ORDER BY ls.submitted_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_guild_submissions"("p_guild_id" "uuid", "p_raid_tier_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_characters_in_guild"("p_user_id" "uuid", "p_guild_id" "uuid") RETURNS TABLE("character_id" "uuid", "character_name" "text", "character_realm" "text", "character_level" integer, "character_is_main" boolean, "membership_role" "text", "class_name" "text", "class_color" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name::TEXT,
    c.realm::TEXT,
    c.level,
    c.is_main,
    cgm.role::TEXT,
    wc.name::TEXT,
    wc.color_hex::TEXT
  FROM characters c
  INNER JOIN character_guild_memberships cgm ON cgm.character_id = c.id
  LEFT JOIN wow_classes wc ON wc.id = c.class_id
  WHERE c.user_id = p_user_id
  AND cgm.guild_id = p_guild_id
  AND cgm.is_active = true
  ORDER BY c.is_main DESC, c.created_at ASC;
END;
$$;


ALTER FUNCTION "public"."get_user_characters_in_guild"("p_user_id" "uuid", "p_guild_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_guild_ids"("p_user_id" "uuid") RETURNS TABLE("guild_id" "uuid")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
    SELECT DISTINCT cgm.guild_id
    FROM character_guild_memberships cgm
    INNER JOIN characters c ON c.id = cgm.character_id
    WHERE c.user_id = p_user_id
    AND cgm.is_active = true;
  $$;


ALTER FUNCTION "public"."get_user_guild_ids"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_blp"("p_guild_id" "uuid", "p_character_id" "uuid", "p_loot_item_id" "uuid", "p_raid_event_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_expansion_id UUID;
  v_times_passed INTEGER;
  v_inserted BOOLEAN;
BEGIN
  -- Look up expansion_id for the new credit row.
  SELECT rt.expansion_id INTO v_expansion_id
  FROM loot_items li
  JOIN raid_tiers rt ON rt.id = li.raid_tier_id
  WHERE li.id = p_loot_item_id
  LIMIT 1;

  -- Idempotent journal: one row per (character, loot_item, raid_event).
  INSERT INTO blp_credits (guild_id, character_id, loot_item_id, raid_event_id, expansion_id)
  VALUES (p_guild_id, p_character_id, p_loot_item_id, p_raid_event_id, v_expansion_id)
  ON CONFLICT (character_id, loot_item_id, raid_event_id) DO NOTHING;

  -- Only bump the denormalized counter if we actually inserted a credit.
  -- FOUND reflects whether the INSERT affected a row (i.e. no conflict).
  v_inserted := FOUND;

  IF v_inserted THEN
    INSERT INTO blp_tracking (guild_id, character_id, loot_item_id, times_passed, last_updated_at)
    VALUES (p_guild_id, p_character_id, p_loot_item_id, 1, NOW())
    ON CONFLICT (guild_id, character_id, loot_item_id) DO UPDATE
    SET times_passed = blp_tracking.times_passed + 1,
        last_updated_at = NOW()
    RETURNING times_passed INTO v_times_passed;
  ELSE
    SELECT times_passed INTO v_times_passed
    FROM blp_tracking
    WHERE guild_id = p_guild_id
      AND character_id = p_character_id
      AND loot_item_id = p_loot_item_id;
  END IF;

  RETURN COALESCE(v_times_passed, 0);
END;
$$;


ALTER FUNCTION "public"."increment_blp"("p_guild_id" "uuid", "p_character_id" "uuid", "p_loot_item_id" "uuid", "p_raid_event_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_blp_bulk"("p_guild_id" "uuid", "p_loot_item_id" "uuid", "p_raid_event_id" "uuid", "p_character_ids" "uuid"[]) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_expansion_id UUID;
  v_count INTEGER;
BEGIN
  -- Look up expansion_id once for all credit rows (same pattern as
  -- increment_blp). NULL is acceptable — column is nullable.
  SELECT rt.expansion_id INTO v_expansion_id
  FROM loot_items li
  JOIN raid_tiers rt ON rt.id = li.raid_tier_id
  WHERE li.id = p_loot_item_id
  LIMIT 1;

  -- Journal first: idempotent per (character, loot_item, raid_event).
  -- Only the characters whose row actually inserted (no conflict) flow
  -- into the blp_tracking bump, so re-imports stop compounding.
  WITH inserted_credits AS (
    INSERT INTO blp_credits (guild_id, character_id, loot_item_id, raid_event_id, expansion_id)
    SELECT p_guild_id, cid, p_loot_item_id, p_raid_event_id, v_expansion_id
    FROM (SELECT DISTINCT unnest(p_character_ids) AS cid) AS chars
    ON CONFLICT (character_id, loot_item_id, raid_event_id) DO NOTHING
    RETURNING character_id
  ),
  bumped AS (
    INSERT INTO blp_tracking (guild_id, character_id, loot_item_id, times_passed, last_updated_at)
    SELECT p_guild_id, character_id, p_loot_item_id, 1, NOW()
    FROM inserted_credits
    ON CONFLICT (guild_id, character_id, loot_item_id) DO UPDATE
    SET times_passed = blp_tracking.times_passed + 1,
        last_updated_at = NOW()
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM bumped;

  RETURN v_count;
END;
$$;


ALTER FUNCTION "public"."increment_blp_bulk"("p_guild_id" "uuid", "p_loot_item_id" "uuid", "p_raid_event_id" "uuid", "p_character_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_guild_master"("target_guild_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  SELECT (target_guild_id IS NOT NULL) AND (
    EXISTS (
      SELECT 1 FROM guilds g
      WHERE g.id = target_guild_id AND g.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM character_guild_memberships cgm
      JOIN characters c    ON c.id = cgm.character_id
      JOIN guild_roles  gr ON gr.guild_id = cgm.guild_id AND gr.name = cgm.role
      WHERE cgm.guild_id = target_guild_id
        AND c.user_id    = auth.uid()
        AND cgm.is_active = true
        AND gr.position >= 100
    )
  );
$$;


ALTER FUNCTION "public"."is_guild_master"("target_guild_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_guild_master"("target_guild_id" "uuid") IS 'True if auth.uid() is the guild creator or has an active CGM with role.position >= 100. Use for GM-only RLS policies.';



CREATE OR REPLACE FUNCTION "public"."is_guild_officer"("target_guild_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  SELECT (target_guild_id IS NOT NULL) AND (
    EXISTS (
      SELECT 1 FROM guilds g
      WHERE g.id = target_guild_id AND g.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM character_guild_memberships cgm
      JOIN characters c       ON c.id = cgm.character_id
      JOIN guild_roles  gr    ON gr.guild_id = cgm.guild_id AND gr.name = cgm.role
      WHERE cgm.guild_id = target_guild_id
        AND c.user_id    = auth.uid()
        AND cgm.is_active = true
        AND gr.position >= 50
    )
  );
$$;


ALTER FUNCTION "public"."is_guild_officer"("target_guild_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_guild_officer"("target_guild_id" "uuid") IS 'True if auth.uid() is the guild creator or has an active CGM with role.position >= 50. SECURITY DEFINER — pairs guild_roles.name with cgm.role to resolve position regardless of custom role names. Used by RLS policies in place of hardcoded ''Officer''/''Guild Master'' literals (GH #60).';



CREATE OR REPLACE FUNCTION "public"."is_invite_code_valid"("code_input" character varying) RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  code_record RECORD;
BEGIN
  SELECT * INTO code_record
  FROM guild_invite_codes
  WHERE code = code_input
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Check expiration
  IF code_record.expires_at IS NOT NULL AND code_record.expires_at < NOW() THEN
    RETURN false;
  END IF;

  -- Check max uses
  IF code_record.max_uses IS NOT NULL AND code_record.current_uses >= code_record.max_uses THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;


ALTER FUNCTION "public"."is_invite_code_valid"("code_input" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_officer_of_guild"("user_id_to_check" "uuid", "guild_id_to_check" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM guild_members gm
    INNER JOIN guild_roles gr ON gr.guild_id = gm.guild_id AND gr.name = gm.role
    WHERE gm.user_id = user_id_to_check
      AND gm.guild_id = guild_id_to_check
      AND gm.is_active = true
      AND gr.position >= 50  -- Position-based: 50=Officer, 100=Guild Master
  );
END;
$$;


ALTER FUNCTION "public"."is_officer_of_guild"("user_id_to_check" "uuid", "guild_id_to_check" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_past_deadline"("p_raid_tier_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_deadline TIMESTAMPTZ;
BEGIN
  SELECT submission_deadline INTO v_deadline
  FROM raid_tiers
  WHERE id = p_raid_tier_id;

  -- If no deadline set, never past deadline
  IF v_deadline IS NULL THEN
    RETURN false;
  END IF;

  -- Check if current time is past deadline
  RETURN NOW() > v_deadline;
END;
$$;


ALTER FUNCTION "public"."is_past_deadline"("p_raid_tier_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."merge_phase_groups"("p_expansion_id" "uuid", "p_guild_id" "uuid", "p_phase_groups" "jsonb", "p_merged_groups" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  group_arr JSONB;
  canonical_phase INTEGER;
  other_phase INTEGER;
  conflict_count INTEGER;
BEGIN
  -- Save the config
  UPDATE expansions
  SET phase_groups = p_phase_groups
  WHERE id = p_expansion_id AND guild_id = p_guild_id;

  -- Migrate submissions for each merged group
  FOR group_arr IN SELECT jsonb_array_elements(p_merged_groups)
  LOOP
    -- Canonical phase = min in group
    SELECT MIN(value::INTEGER) INTO canonical_phase
    FROM jsonb_array_elements_text(group_arr);

    -- Check for conflicts one more time (within transaction)
    SELECT COUNT(*) INTO conflict_count
    FROM (
      SELECT character_id
      FROM loot_submissions
      WHERE expansion_id = p_expansion_id
        AND guild_id = p_guild_id
        AND phase IN (SELECT (value::INTEGER) FROM jsonb_array_elements_text(group_arr))
      GROUP BY character_id
      HAVING COUNT(DISTINCT phase) > 1
    ) conflicts;

    IF conflict_count > 0 THEN
      RAISE EXCEPTION 'CONFLICT: % characters have submissions in multiple phases being merged', conflict_count;
    END IF;

    -- Migrate non-canonical phases to canonical
    UPDATE loot_submissions
    SET phase = canonical_phase
    WHERE expansion_id = p_expansion_id
      AND guild_id = p_guild_id
      AND phase IN (SELECT (value::INTEGER) FROM jsonb_array_elements_text(group_arr))
      AND phase != canonical_phase;
  END LOOP;

  RETURN p_phase_groups;
END;
$$;


ALTER FUNCTION "public"."merge_phase_groups"("p_expansion_id" "uuid", "p_guild_id" "uuid", "p_phase_groups" "jsonb", "p_merged_groups" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."redeem_invite_code"("code_input" "text") RETURNS TABLE("invite_code_id" "uuid", "invite_guild_id" "uuid", "invite_current_uses" integer, "invite_max_uses" integer, "invite_expires_at" timestamp with time zone, "invite_is_active" boolean, "error_code" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_record RECORD;
  v_updated_count INTEGER;
BEGIN
  -- First, look up the invite code and lock the row for update
  SELECT ic.id, ic.guild_id, ic.current_uses, ic.max_uses, ic.expires_at, ic.is_active
  INTO v_record
  FROM guild_invite_codes ic
  WHERE ic.code = code_input
  FOR UPDATE;

  -- Code not found
  IF NOT FOUND THEN
    error_code := 'NOT_FOUND';
    RETURN NEXT;
    RETURN;
  END IF;

  -- Code is deactivated
  IF NOT v_record.is_active THEN
    invite_code_id := v_record.id;
    invite_guild_id := v_record.guild_id;
    invite_current_uses := v_record.current_uses;
    invite_max_uses := v_record.max_uses;
    invite_expires_at := v_record.expires_at;
    invite_is_active := v_record.is_active;
    error_code := 'DEACTIVATED';
    RETURN NEXT;
    RETURN;
  END IF;

  -- Code is expired
  IF v_record.expires_at IS NOT NULL AND v_record.expires_at < NOW() THEN
    invite_code_id := v_record.id;
    invite_guild_id := v_record.guild_id;
    invite_current_uses := v_record.current_uses;
    invite_max_uses := v_record.max_uses;
    invite_expires_at := v_record.expires_at;
    invite_is_active := v_record.is_active;
    error_code := 'EXPIRED';
    RETURN NEXT;
    RETURN;
  END IF;

  -- Code has reached max uses
  IF v_record.max_uses IS NOT NULL AND v_record.current_uses >= v_record.max_uses THEN
    invite_code_id := v_record.id;
    invite_guild_id := v_record.guild_id;
    invite_current_uses := v_record.current_uses;
    invite_max_uses := v_record.max_uses;
    invite_expires_at := v_record.expires_at;
    invite_is_active := v_record.is_active;
    error_code := 'MAX_USES_REACHED';
    RETURN NEXT;
    RETURN;
  END IF;

  -- Atomically increment current_uses with the max_uses guard
  -- This WHERE clause ensures no race: if another transaction already
  -- incremented past max_uses, this UPDATE will affect 0 rows.
  UPDATE guild_invite_codes
  SET current_uses = current_uses + 1
  WHERE id = v_record.id
    AND is_active = true
    AND (max_uses IS NULL OR current_uses < max_uses)
    AND (expires_at IS NULL OR expires_at >= NOW());

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  IF v_updated_count = 0 THEN
    -- Another concurrent request used the last slot
    invite_code_id := v_record.id;
    invite_guild_id := v_record.guild_id;
    invite_current_uses := v_record.current_uses;
    invite_max_uses := v_record.max_uses;
    invite_expires_at := v_record.expires_at;
    invite_is_active := v_record.is_active;
    error_code := 'MAX_USES_REACHED';
    RETURN NEXT;
    RETURN;
  END IF;

  -- Success: return the record with no error
  invite_code_id := v_record.id;
  invite_guild_id := v_record.guild_id;
  invite_current_uses := v_record.current_uses + 1;
  invite_max_uses := v_record.max_uses;
  invite_expires_at := v_record.expires_at;
  invite_is_active := v_record.is_active;
  error_code := NULL;
  RETURN NEXT;
  RETURN;
END;
$$;


ALTER FUNCTION "public"."redeem_invite_code"("code_input" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reject_submissions_on_cgm_loss"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  affected_count INT;
  target_character UUID;
  target_guild UUID;
BEGIN
  -- Determine the (character, guild) pair to clean up
  IF TG_OP = 'UPDATE' THEN
    -- Only fire on transition from active → not-active
    IF COALESCE(OLD.is_active, false) = true
       AND COALESCE(NEW.is_active, false) = false THEN
      target_character := NEW.character_id;
      target_guild := NEW.guild_id;
    ELSE
      RETURN NEW;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    -- Only matters if the row being deleted was active
    IF COALESCE(OLD.is_active, false) = true THEN
      target_character := OLD.character_id;
      target_guild := OLD.guild_id;
    ELSE
      RETURN OLD;
    END IF;
  END IF;

  UPDATE loot_submissions
  SET status = 'rejected',
      review_notes = COALESCE(review_notes, '') ||
        CASE WHEN review_notes IS NOT NULL AND review_notes <> '' THEN E'\n' ELSE '' END ||
        '[system] Auto-rejected: character removed from guild',
      reviewed_at = NOW(),
      updated_at = NOW()
  WHERE character_id = target_character
    AND guild_id = target_guild
    AND status IN ('pending', 'approved');

  GET DIAGNOSTICS affected_count = ROW_COUNT;
  IF affected_count > 0 THEN
    RAISE NOTICE 'Auto-rejected % submission(s) for character=% guild=%',
      affected_count, target_character, target_guild;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."reject_submissions_on_cgm_loss"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reset_blp"("p_guild_id" "uuid", "p_character_id" "uuid", "p_loot_item_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  DELETE FROM blp_credits
  WHERE character_id = p_character_id
    AND loot_item_id = p_loot_item_id;

  DELETE FROM blp_tracking
  WHERE guild_id = p_guild_id
    AND character_id = p_character_id
    AND loot_item_id = p_loot_item_id;
END;
$$;


ALTER FUNCTION "public"."reset_blp"("p_guild_id" "uuid", "p_character_id" "uuid", "p_loot_item_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_submission_items"("p_submission_id" "uuid", "p_items" "jsonb") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  item_count INTEGER;
BEGIN
  -- Delete existing active items (preserve soft-deleted/removed items)
  DELETE FROM loot_submission_items
  WHERE submission_id = p_submission_id
    AND removed_at IS NULL;

  -- Insert new items
  INSERT INTO loot_submission_items (submission_id, loot_item_id, rank, slot)
  SELECT
    p_submission_id,
    (item->>'loot_item_id')::UUID,
    (item->>'rank')::INTEGER,
    (item->>'slot')::INTEGER
  FROM jsonb_array_elements(p_items) AS item;

  GET DIAGNOSTICS item_count = ROW_COUNT;
  RETURN item_count;
END;
$$;


ALTER FUNCTION "public"."save_submission_items"("p_submission_id" "uuid", "p_items" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."seed_tbc_expansion"("p_guild_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_expansion_id UUID;
BEGIN
  -- Get or create the TBC expansion for this guild
  SELECT id INTO v_expansion_id FROM expansions
  WHERE guild_id = p_guild_id AND name = 'The Burning Crusade';

  IF v_expansion_id IS NULL THEN
    RETURN;
  END IF;

  -- Phase 1: Karazhan, Gruul, Magtheridon
  INSERT INTO raid_tiers (expansion_id, name, is_active, phase)
  SELECT v_expansion_id, 'Karazhan', false, 1
  WHERE NOT EXISTS (SELECT 1 FROM raid_tiers WHERE expansion_id = v_expansion_id AND name = 'Karazhan');

  INSERT INTO raid_tiers (expansion_id, name, is_active, phase)
  SELECT v_expansion_id, 'Gruul''s Lair', false, 1
  WHERE NOT EXISTS (SELECT 1 FROM raid_tiers WHERE expansion_id = v_expansion_id AND name = 'Gruul''s Lair');

  INSERT INTO raid_tiers (expansion_id, name, is_active, phase)
  SELECT v_expansion_id, 'Magtheridon''s Lair', false, 1
  WHERE NOT EXISTS (SELECT 1 FROM raid_tiers WHERE expansion_id = v_expansion_id AND name = 'Magtheridon''s Lair');

  -- Phase 2: Serpentshrine Cavern, Tempest Keep
  INSERT INTO raid_tiers (expansion_id, name, is_active, phase)
  SELECT v_expansion_id, 'Serpentshrine Cavern', false, 2
  WHERE NOT EXISTS (SELECT 1 FROM raid_tiers WHERE expansion_id = v_expansion_id AND name = 'Serpentshrine Cavern');

  INSERT INTO raid_tiers (expansion_id, name, is_active, phase)
  SELECT v_expansion_id, 'Tempest Keep', false, 2
  WHERE NOT EXISTS (SELECT 1 FROM raid_tiers WHERE expansion_id = v_expansion_id AND name = 'Tempest Keep');

  -- Phase 3: Mount Hyjal, Black Temple
  INSERT INTO raid_tiers (expansion_id, name, is_active, phase)
  SELECT v_expansion_id, 'Mount Hyjal', false, 3
  WHERE NOT EXISTS (SELECT 1 FROM raid_tiers WHERE expansion_id = v_expansion_id AND name = 'Mount Hyjal');

  INSERT INTO raid_tiers (expansion_id, name, is_active, phase)
  SELECT v_expansion_id, 'Black Temple', false, 3
  WHERE NOT EXISTS (SELECT 1 FROM raid_tiers WHERE expansion_id = v_expansion_id AND name = 'Black Temple');

  -- Phase 4: Zul'Aman
  INSERT INTO raid_tiers (expansion_id, name, is_active, phase)
  SELECT v_expansion_id, 'Zul''Aman', false, 4
  WHERE NOT EXISTS (SELECT 1 FROM raid_tiers WHERE expansion_id = v_expansion_id AND name = 'Zul''Aman');

  -- Phase 5: Sunwell Plateau
  INSERT INTO raid_tiers (expansion_id, name, is_active, phase)
  SELECT v_expansion_id, 'Sunwell Plateau', false, 5
  WHERE NOT EXISTS (SELECT 1 FROM raid_tiers WHERE expansion_id = v_expansion_id AND name = 'Sunwell Plateau');
END;
$$;


ALTER FUNCTION "public"."seed_tbc_expansion"("p_guild_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."seed_tbc_expansion_for_guild"("p_guild_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_expansion_id UUID;
BEGIN
  -- Check if TBC expansion already exists for this guild
  SELECT id INTO v_expansion_id
  FROM expansions
  WHERE guild_id = p_guild_id AND name = 'The Burning Crusade';

  -- If not found, insert it
  IF v_expansion_id IS NULL THEN
    INSERT INTO expansions (guild_id, name)
    VALUES (p_guild_id, 'The Burning Crusade')
    RETURNING id INTO v_expansion_id;
  END IF;

  -- Insert TBC raid tiers in progression order using conditional inserts
  -- Note: raid_tiers table doesn't have order_index column

  -- Phase 1: Karazhan, Gruul's Lair, Magtheridon's Lair
  INSERT INTO raid_tiers (expansion_id, name, is_active)
  SELECT v_expansion_id, 'Karazhan', false
  WHERE NOT EXISTS (SELECT 1 FROM raid_tiers WHERE expansion_id = v_expansion_id AND name = 'Karazhan');

  INSERT INTO raid_tiers (expansion_id, name, is_active)
  SELECT v_expansion_id, 'Gruul''s Lair', false
  WHERE NOT EXISTS (SELECT 1 FROM raid_tiers WHERE expansion_id = v_expansion_id AND name = 'Gruul''s Lair');

  INSERT INTO raid_tiers (expansion_id, name, is_active)
  SELECT v_expansion_id, 'Magtheridon''s Lair', false
  WHERE NOT EXISTS (SELECT 1 FROM raid_tiers WHERE expansion_id = v_expansion_id AND name = 'Magtheridon''s Lair');

  -- Phase 2: Serpentshrine Cavern, Tempest Keep
  INSERT INTO raid_tiers (expansion_id, name, is_active)
  SELECT v_expansion_id, 'Serpentshrine Cavern', false
  WHERE NOT EXISTS (SELECT 1 FROM raid_tiers WHERE expansion_id = v_expansion_id AND name = 'Serpentshrine Cavern');

  INSERT INTO raid_tiers (expansion_id, name, is_active)
  SELECT v_expansion_id, 'Tempest Keep', false
  WHERE NOT EXISTS (SELECT 1 FROM raid_tiers WHERE expansion_id = v_expansion_id AND name = 'Tempest Keep');

  -- Phase 3: Mount Hyjal, Black Temple
  INSERT INTO raid_tiers (expansion_id, name, is_active)
  SELECT v_expansion_id, 'Mount Hyjal', false
  WHERE NOT EXISTS (SELECT 1 FROM raid_tiers WHERE expansion_id = v_expansion_id AND name = 'Mount Hyjal');

  INSERT INTO raid_tiers (expansion_id, name, is_active)
  SELECT v_expansion_id, 'Black Temple', false
  WHERE NOT EXISTS (SELECT 1 FROM raid_tiers WHERE expansion_id = v_expansion_id AND name = 'Black Temple');

  -- Phase 4: Zul'Aman
  INSERT INTO raid_tiers (expansion_id, name, is_active)
  SELECT v_expansion_id, 'Zul''Aman', false
  WHERE NOT EXISTS (SELECT 1 FROM raid_tiers WHERE expansion_id = v_expansion_id AND name = 'Zul''Aman');

  -- Phase 5: Sunwell Plateau
  INSERT INTO raid_tiers (expansion_id, name, is_active)
  SELECT v_expansion_id, 'Sunwell Plateau', false
  WHERE NOT EXISTS (SELECT 1 FROM raid_tiers WHERE expansion_id = v_expansion_id AND name = 'Sunwell Plateau');

  RAISE NOTICE 'TBC expansion and raid tiers seeded for guild %', p_guild_id;
END;
$$;


ALTER FUNCTION "public"."seed_tbc_expansion_for_guild"("p_guild_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_guild_active_expansion"("p_guild_id" "uuid", "p_expansion_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
  BEGIN
    -- Verify the caller is either the guild creator or an officer
    IF NOT EXISTS (
      SELECT 1 FROM guilds
      WHERE id = p_guild_id
      AND created_by = auth.uid()
    ) AND NOT EXISTS (
      SELECT 1 FROM guild_members
      WHERE guild_id = p_guild_id
      AND user_id = auth.uid()
      AND role = 'Officer'
      AND is_active = true
    ) THEN
      RAISE EXCEPTION 'Not authorized to update this guild';
    END IF;

    -- Update the guild's active expansion
    UPDATE guilds
    SET active_expansion_id = p_expansion_id
    WHERE id = p_guild_id;
  END;
  $$;


ALTER FUNCTION "public"."set_guild_active_expansion"("p_guild_id" "uuid", "p_expansion_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_guild_icon"("p_guild_id" "uuid", "p_icon_url" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_guild_creator UUID;
BEGIN
  -- Get the guild creator
  SELECT created_by INTO v_guild_creator
  FROM guilds
  WHERE id = p_guild_id;

  IF v_guild_creator IS NULL THEN
    RAISE EXCEPTION 'Guild not found';
  END IF;

  -- Only the guild creator can update guild icon
  IF auth.uid() != v_guild_creator THEN
    RAISE EXCEPTION 'Only the guild owner can modify guild settings';
  END IF;

  -- Update the guild icon
  UPDATE guilds
  SET icon_url = p_icon_url
  WHERE id = p_guild_id;
END;
$$;


ALTER FUNCTION "public"."update_guild_icon"("p_guild_id" "uuid", "p_icon_url" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_guild_icon"("p_guild_id" "uuid", "p_icon_url" "text") IS 'Updates guild icon URL. Only the guild creator can call this function.';



CREATE OR REPLACE FUNCTION "public"."update_guild_info"("p_guild_id" "uuid", "p_name" "text", "p_realm" "text", "p_faction" "text", "p_discord_server_id" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_guild_creator UUID;
BEGIN
  -- Get the guild creator
  SELECT created_by INTO v_guild_creator
  FROM guilds
  WHERE id = p_guild_id;

  IF v_guild_creator IS NULL THEN
    RAISE EXCEPTION 'Guild not found';
  END IF;

  -- Only the guild creator can update guild info
  IF auth.uid() != v_guild_creator THEN
    RAISE EXCEPTION 'Only the guild owner can modify guild information';
  END IF;

  -- Update the guild basic info
  UPDATE guilds
  SET
    name = p_name,
    realm = p_realm,
    faction = p_faction,
    discord_server_id = p_discord_server_id
  WHERE id = p_guild_id;
END;
$$;


ALTER FUNCTION "public"."update_guild_info"("p_guild_id" "uuid", "p_name" "text", "p_realm" "text", "p_faction" "text", "p_discord_server_id" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_guild_info"("p_guild_id" "uuid", "p_name" "text", "p_realm" "text", "p_faction" "text", "p_discord_server_id" "text") IS 'Updates guild basic info (name, realm, faction, discord). Only the guild creator can call this function.';



CREATE OR REPLACE FUNCTION "public"."update_guild_item_priorities_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $$;


ALTER FUNCTION "public"."update_guild_item_priorities_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_guild_settings_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $$;


ALTER FUNCTION "public"."update_guild_settings_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_is_in_guild"("p_user_id" "uuid", "p_guild_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  BEGIN
    RETURN EXISTS (
      SELECT 1
      FROM character_guild_memberships cgm
      INNER JOIN characters c ON c.id = cgm.character_id
      WHERE c.user_id = p_user_id
      AND cgm.guild_id = p_guild_id
      AND cgm.is_active = true
    );
  END;
  $$;


ALTER FUNCTION "public"."user_is_in_guild"("p_user_id" "uuid", "p_guild_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_is_officer_in_guild"("p_user_id" "uuid", "p_guild_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  BEGIN
    RETURN EXISTS (
      SELECT 1
      FROM character_guild_memberships cgm
      INNER JOIN characters c ON c.id = cgm.character_id
      WHERE c.user_id = p_user_id
      AND cgm.guild_id = p_guild_id
      AND cgm.role IN ('Officer', 'Guild Master')
      AND cgm.is_active = true
    );
  END;
  $$;


ALTER FUNCTION "public"."user_is_officer_in_guild"("p_user_id" "uuid", "p_guild_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."addon_sync_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "guild_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "token_hash" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "last_used_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."addon_sync_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."attendance_records" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "raid_event_id" "uuid",
    "user_id" "uuid",
    "signed_up" boolean DEFAULT false,
    "attended" boolean DEFAULT false,
    "excused" boolean DEFAULT false,
    "no_call_no_show" boolean DEFAULT false,
    "character_id" "uuid",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "was_late" boolean DEFAULT false,
    "was_benched" boolean DEFAULT false,
    "character_name" character varying(255),
    "is_excused" boolean DEFAULT false,
    "points_override" numeric,
    "modified_by" "uuid",
    "status" "text" DEFAULT 'absent'::"text",
    CONSTRAINT "attendance_records_character_identifier_check" CHECK ((("character_id" IS NOT NULL) OR (("character_name" IS NOT NULL) AND (("character_name")::"text" <> ''::"text")))),
    CONSTRAINT "attendance_records_status_check" CHECK (("status" = ANY (ARRAY['attended'::"text", 'late'::"text", 'benched'::"text", 'no_show'::"text", 'excused'::"text", 'signed_up'::"text", 'absent'::"text"])))
);


ALTER TABLE "public"."attendance_records" OWNER TO "postgres";


COMMENT ON COLUMN "public"."attendance_records"."was_late" IS 'Player attended but was late';



COMMENT ON COLUMN "public"."attendance_records"."was_benched" IS 'Player was present but on bench';



COMMENT ON COLUMN "public"."attendance_records"."character_name" IS 'Character name for unlinked attendees (when character_id is NULL). Used to track attendance before user creates account.';



COMMENT ON COLUMN "public"."attendance_records"."is_excused" IS 'Excused absence (sick day, holiday). Excluded from attendance scoring denominator like NCNS.';



COMMENT ON COLUMN "public"."attendance_records"."points_override" IS 'Officer override for attendance points. NULL = use computed value from scoring engine.';



COMMENT ON COLUMN "public"."attendance_records"."modified_by" IS 'User ID of the officer who last modified this record.';



CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "guild_id" "uuid",
    "table_name" "text" NOT NULL,
    "record_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "user_id" "uuid",
    "old_data" "jsonb",
    "new_data" "jsonb",
    "changed_fields" "text"[],
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "audit_logs_action_check" CHECK (("action" = ANY (ARRAY['INSERT'::"text", 'UPDATE'::"text", 'DELETE'::"text"])))
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."audit_logs" IS 'Immutable audit trail for sensitive data changes. Tracks who changed what, when, and the before/after values.';



COMMENT ON COLUMN "public"."audit_logs"."table_name" IS 'The database table that was modified (e.g., loot_submissions, guild_settings)';



COMMENT ON COLUMN "public"."audit_logs"."record_id" IS 'The UUID of the record that was modified';



COMMENT ON COLUMN "public"."audit_logs"."action" IS 'The type of change: INSERT, UPDATE, or DELETE';



COMMENT ON COLUMN "public"."audit_logs"."old_data" IS 'The record state before the change (null for INSERTs)';



COMMENT ON COLUMN "public"."audit_logs"."new_data" IS 'The record state after the change (null for DELETEs)';



COMMENT ON COLUMN "public"."audit_logs"."changed_fields" IS 'Array of field names that were modified (for UPDATEs)';



CREATE TABLE IF NOT EXISTS "public"."battlenet_accounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "battlenet_id" bigint NOT NULL,
    "battletag" "text",
    "access_token" "text" NOT NULL,
    "refresh_token" "text",
    "token_expires_at" timestamp with time zone NOT NULL,
    "region" "text" DEFAULT 'us'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."battlenet_accounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."blp_credits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "guild_id" "uuid" NOT NULL,
    "character_id" "uuid" NOT NULL,
    "loot_item_id" "uuid" NOT NULL,
    "raid_event_id" "uuid" NOT NULL,
    "expansion_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."blp_credits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."blp_tracking" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "guild_id" "uuid" NOT NULL,
    "character_id" "uuid" NOT NULL,
    "loot_item_id" "uuid" NOT NULL,
    "times_passed" integer DEFAULT 0 NOT NULL,
    "last_updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expansion_id" "uuid"
);


ALTER TABLE "public"."blp_tracking" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."character_aliases" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "guild_id" "uuid" NOT NULL,
    "alias_name" "text" NOT NULL,
    "character_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."character_aliases" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."character_equipped_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "character_id" "uuid" NOT NULL,
    "slot" "text" NOT NULL,
    "wowhead_id" integer NOT NULL,
    "item_name" "text",
    "enchant_id" integer,
    "gem_ids" integer[],
    "imported_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."character_equipped_items" OWNER TO "postgres";


COMMENT ON TABLE "public"."character_equipped_items" IS 'Stores gear imported from WowSims for each character. Used to determine upgrade value when importing BIS lists.';



CREATE TABLE IF NOT EXISTS "public"."character_guild_memberships" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "character_id" "uuid" NOT NULL,
    "guild_id" "uuid" NOT NULL,
    "role" character varying(50) DEFAULT 'Member'::character varying,
    "is_active" boolean DEFAULT true,
    "joined_at" timestamp with time zone DEFAULT "now"(),
    "joined_via" character varying(50) DEFAULT 'manual'::character varying,
    "membership_status" character varying(20) DEFAULT 'full'::character varying,
    "trial_started_at" timestamp with time zone,
    "promoted_at" timestamp with time zone,
    CONSTRAINT "membership_status_check" CHECK ((("membership_status")::"text" = ANY ((ARRAY['trial'::character varying, 'full'::character varying])::"text"[])))
);


ALTER TABLE "public"."character_guild_memberships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."characters" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "realm" character varying(255),
    "class_id" "uuid",
    "spec_id" "uuid",
    "level" integer,
    "is_main" boolean DEFAULT false,
    "battle_net_id" bigint,
    "region" character varying(10),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "game_version" character varying(20) DEFAULT NULL::character varying,
    "guardian_conversion_dismissed" boolean DEFAULT false
);


ALTER TABLE "public"."characters" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."class_specs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "class_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."class_specs" OWNER TO "postgres";


COMMENT ON TABLE "public"."class_specs" IS 'Class specializations (e.g., Holy Paladin, Shadow Priest)';



CREATE TABLE IF NOT EXISTS "public"."discord_feedback_map" (
    "discord_message_id" "text" NOT NULL,
    "discord_channel_id" "text" NOT NULL,
    "discord_guild_id" "text" NOT NULL,
    "github_issue_number" integer NOT NULL,
    "github_repo" "text" NOT NULL,
    "source" "text" NOT NULL,
    "triggered_by_discord_id" "text",
    "author_discord_id" "text" NOT NULL,
    "author_display_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "closure_announced_at" timestamp with time zone,
    CONSTRAINT "discord_feedback_map_source_check" CHECK (("source" = ANY (ARRAY['channel'::"text", 'reaction'::"text"])))
);


ALTER TABLE "public"."discord_feedback_map" OWNER TO "postgres";


COMMENT ON TABLE "public"."discord_feedback_map" IS 'Maps Discord message IDs to GitHub issue numbers filed by the LootList+ feedback bot. Used for dedupe and daily digest backfill.';



COMMENT ON COLUMN "public"."discord_feedback_map"."source" IS 'How the message was captured: "channel" = posted in the watched feedback channel, "reaction" = officer reacted with the trigger emoji.';



COMMENT ON COLUMN "public"."discord_feedback_map"."triggered_by_discord_id" IS 'For reaction-sourced rows, the Discord user ID of the officer who reacted. NULL for channel-sourced rows.';



COMMENT ON COLUMN "public"."discord_feedback_map"."closure_announced_at" IS 'Set the moment the bot posts the closure follow-up in the original Discord thread. NULL means the close has not been announced yet (or the issue is still open).';



CREATE TABLE IF NOT EXISTS "public"."donation_records" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "guild_id" "uuid" NOT NULL,
    "character_id" "uuid",
    "character_name" "text" NOT NULL,
    "points" numeric(6,2) NOT NULL,
    "kind" "text" NOT NULL,
    "amount_text" "text",
    "note" "text",
    "awarded_at" "date" DEFAULT CURRENT_DATE NOT NULL,
    "awarded_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_donation_points_range" CHECK ((("points" >= ('-1000'::integer)::numeric) AND ("points" <= (1000)::numeric))),
    CONSTRAINT "donation_records_kind_check" CHECK (("kind" = ANY (ARRAY['gold'::"text", 'materials'::"text", 'consumables'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."donation_records" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."expansions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "guild_id" "uuid",
    "name" "text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "raid_start_date" "date",
    "raid_days_per_week" integer DEFAULT 2,
    "first_raid_day" integer DEFAULT 2,
    "second_raid_day" integer DEFAULT 4,
    "third_raid_day" integer,
    "fourth_raid_day" integer,
    "fifth_raid_day" integer,
    "timezone" "text" DEFAULT 'America/New_York'::"text",
    "phase_deadlines" "jsonb" DEFAULT '{}'::"jsonb",
    "current_phase" integer DEFAULT 1,
    "phase_groups" "jsonb",
    CONSTRAINT "chk_fifth_raid_day" CHECK ((("fifth_raid_day" IS NULL) OR (("fifth_raid_day" >= 0) AND ("fifth_raid_day" <= 6)))),
    CONSTRAINT "chk_first_raid_day" CHECK ((("first_raid_day" >= 0) AND ("first_raid_day" <= 6))),
    CONSTRAINT "chk_fourth_raid_day" CHECK ((("fourth_raid_day" IS NULL) OR (("fourth_raid_day" >= 0) AND ("fourth_raid_day" <= 6)))),
    CONSTRAINT "chk_raid_days_per_week" CHECK ((("raid_days_per_week" >= 1) AND ("raid_days_per_week" <= 5))),
    CONSTRAINT "chk_second_raid_day" CHECK ((("second_raid_day" IS NULL) OR (("second_raid_day" >= 0) AND ("second_raid_day" <= 6)))),
    CONSTRAINT "chk_third_raid_day" CHECK ((("third_raid_day" IS NULL) OR (("third_raid_day" >= 0) AND ("third_raid_day" <= 6))))
);


ALTER TABLE "public"."expansions" OWNER TO "postgres";


COMMENT ON COLUMN "public"."expansions"."raid_start_date" IS 'The date when this guild started raiding this expansion. Used for weekly attendance calculations.';



COMMENT ON COLUMN "public"."expansions"."raid_days_per_week" IS 'Number of raid days per week for this expansion (1-5)';



COMMENT ON COLUMN "public"."expansions"."first_raid_day" IS 'First raid day of the week (0=Sunday, 1=Monday, ..., 6=Saturday)';



COMMENT ON COLUMN "public"."expansions"."second_raid_day" IS 'Second raid day of the week, nullable';



COMMENT ON COLUMN "public"."expansions"."third_raid_day" IS 'Third raid day of the week, nullable';



COMMENT ON COLUMN "public"."expansions"."fourth_raid_day" IS 'Fourth raid day of the week, nullable';



COMMENT ON COLUMN "public"."expansions"."fifth_raid_day" IS 'Fifth raid day of the week, nullable';



COMMENT ON COLUMN "public"."expansions"."phase_groups" IS 'Optional phase merging config. JSONB array of arrays, e.g. [[1,2],[3]]. NULL = each phase independent (default).';



CREATE TABLE IF NOT EXISTS "public"."guild_invite_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "guild_id" "uuid" NOT NULL,
    "code" character varying(12) NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone,
    "max_uses" integer,
    "current_uses" integer DEFAULT 0,
    "is_active" boolean DEFAULT true
);


ALTER TABLE "public"."guild_invite_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."guild_item_priorities" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "guild_id" "uuid" NOT NULL,
    "item_id" "uuid" NOT NULL,
    "raid_tier_id" "uuid" NOT NULL,
    "role_priorities" "jsonb" DEFAULT '{}'::"jsonb",
    "class_priorities" "jsonb" DEFAULT '{}'::"jsonb",
    "character_priorities" "jsonb" DEFAULT '{}'::"jsonb",
    "priority_bonuses" "jsonb" DEFAULT '{"role": 5, "class": 3, "character": 2}'::"jsonb",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."guild_item_priorities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."guild_roles" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "guild_id" "uuid" NOT NULL,
    "name" character varying(50) NOT NULL,
    "color_hex" character varying(7) DEFAULT '#808080'::character varying,
    "position" integer DEFAULT 0 NOT NULL,
    "is_default" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "permissions" "text"[] DEFAULT '{}'::"text"[]
);


ALTER TABLE "public"."guild_roles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."guild_roles"."permissions" IS 'Array of permission codes granted to this role. Officers/GM get all permissions implicitly via position >= 50 check.';



CREATE TABLE IF NOT EXISTS "public"."guild_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "guild_id" "uuid" NOT NULL,
    "attendance_type" "text" DEFAULT 'points-per-raid'::"text" NOT NULL,
    "rolling_attendance_weeks" integer DEFAULT 4 NOT NULL,
    "use_signups" boolean DEFAULT true NOT NULL,
    "signup_weight" numeric(3,2) DEFAULT 0.25 NOT NULL,
    "max_attendance_bonus" numeric(5,2) DEFAULT 4 NOT NULL,
    "max_attendance_threshold" numeric(3,2) DEFAULT 0.9 NOT NULL,
    "middle_attendance_bonus" numeric(5,2) DEFAULT 2 NOT NULL,
    "middle_attendance_threshold" numeric(3,2) DEFAULT 0.5 NOT NULL,
    "bottom_attendance_bonus" numeric(5,2) DEFAULT 1 NOT NULL,
    "bottom_attendance_threshold" numeric(3,2) DEFAULT 0.25 NOT NULL,
    "see_item_bonus" boolean DEFAULT true NOT NULL,
    "see_item_bonus_value" numeric(5,2) DEFAULT 1 NOT NULL,
    "pass_item_bonus" boolean DEFAULT false NOT NULL,
    "pass_item_bonus_value" numeric(5,2) DEFAULT 0 NOT NULL,
    "rank_modifiers" "jsonb" DEFAULT '{"Member": 0, "Officer": 0, "Guild Master": 0}'::"jsonb" NOT NULL,
    "raid_days" "text"[] DEFAULT ARRAY['Sunday'::"text", 'Monday'::"text"],
    "first_raid_week_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "enforce_slot_restrictions" boolean DEFAULT false NOT NULL,
    "class_bonus_priority_single_item" boolean DEFAULT true,
    "raid_roles_overall_bonus_priority" boolean DEFAULT true,
    "single_raider_overall_bonus" boolean DEFAULT true,
    "single_raider_bonus_single_item" boolean DEFAULT true,
    "role_bonus_priority_single_item" boolean DEFAULT true,
    "raid_days_per_week" integer DEFAULT 2,
    "first_raid_day" integer DEFAULT 2,
    "second_raid_day" integer DEFAULT 1,
    "third_raid_day" integer,
    "fourth_raid_day" integer,
    "fifth_raid_day" integer,
    "reset_date" "date" DEFAULT '2025-01-14'::"date",
    "decimal_places" integer DEFAULT 2,
    "minimum_raid_days_enabled" boolean DEFAULT true,
    "minimum_raid_days" integer DEFAULT 2,
    "late_early_penalty_enabled" boolean DEFAULT true,
    "late_early_penalty_value" numeric DEFAULT 0.25,
    "guild_rank_bonuses_enabled" boolean DEFAULT true,
    "number_of_ranks" integer DEFAULT 5,
    "donation_bonuses_enabled" boolean DEFAULT false,
    "donation_cap_enabled" boolean DEFAULT false,
    "donation_bonus_type" character varying(20) DEFAULT 'rolling'::character varying,
    "trial_penalty_enabled" boolean DEFAULT false,
    "trial_penalty_value" numeric(4,2) DEFAULT '-2.0'::numeric,
    "trial_auto_promote_enabled" boolean DEFAULT false,
    "trial_auto_promote_weeks" integer DEFAULT 4,
    "new_members_start_as_trial" boolean DEFAULT false,
    "new_member_mode" "text" DEFAULT 'raw'::"text",
    "blp_enabled" boolean DEFAULT false,
    "blp_increment" numeric(5,2) DEFAULT 1.0,
    "blp_maximum" numeric(5,2) DEFAULT 5.0,
    "raid_summary_channel_id" "text",
    "wcl_guild_url" "text",
    "role_modifiers" "jsonb" DEFAULT '{}'::"jsonb",
    "max_allocation_points_per_bracket" integer DEFAULT 3 NOT NULL,
    "max_tokens_per_bracket" integer DEFAULT 1 NOT NULL,
    "max_category_per_bracket" integer DEFAULT 1 NOT NULL,
    "donation_cap_points" numeric(6,2) DEFAULT 0 NOT NULL,
    "donation_rolling_weeks" integer,
    "donation_reset_at" "date",
    "weekly_attendance_minimum" integer,
    "week_reset_day" smallint DEFAULT 2 NOT NULL,
    "loot_announcements_enabled" boolean DEFAULT true NOT NULL,
    "single_raider_modifiers" "jsonb" DEFAULT '{}'::"jsonb",
    "blp_includes_benched" boolean DEFAULT false,
    CONSTRAINT "chk_donation_cap_points" CHECK ((("donation_cap_points" >= (0)::numeric) AND ("donation_cap_points" <= (1000)::numeric))),
    CONSTRAINT "chk_donation_rolling_weeks" CHECK ((("donation_rolling_weeks" IS NULL) OR (("donation_rolling_weeks" >= 1) AND ("donation_rolling_weeks" <= 52)))),
    CONSTRAINT "chk_max_allocation_points" CHECK ((("max_allocation_points_per_bracket" >= 1) AND ("max_allocation_points_per_bracket" <= 6))),
    CONSTRAINT "chk_max_category" CHECK ((("max_category_per_bracket" >= 1) AND ("max_category_per_bracket" <= 6))),
    CONSTRAINT "chk_max_tokens" CHECK ((("max_tokens_per_bracket" >= 1) AND ("max_tokens_per_bracket" <= 6))),
    CONSTRAINT "chk_week_reset_day" CHECK ((("week_reset_day" >= 0) AND ("week_reset_day" <= 6))),
    CONSTRAINT "chk_weekly_attendance_minimum" CHECK ((("weekly_attendance_minimum" IS NULL) OR (("weekly_attendance_minimum" >= 1) AND ("weekly_attendance_minimum" <= 7)))),
    CONSTRAINT "guild_settings_attendance_type_check" CHECK (("attendance_type" = ANY (ARRAY['linear'::"text", 'breakpoint'::"text", 'points-per-raid'::"text"]))),
    CONSTRAINT "guild_settings_new_member_mode_check" CHECK (("new_member_mode" = ANY (ARRAY['raw'::"text", 'fair'::"text", 'minimum_gate'::"text"])))
);


ALTER TABLE "public"."guild_settings" OWNER TO "postgres";


COMMENT ON COLUMN "public"."guild_settings"."enforce_slot_restrictions" IS 'When enabled, players can only select one item per slot type (e.g., 1 ring, 1 weapon) in each loot bracket';



COMMENT ON COLUMN "public"."guild_settings"."new_member_mode" IS 'Controls new member loot eligibility:
- raw: Score calculated against full rolling window (new members have lower scores)
- fair: Score only counts raids since member joined guild
- minimum_gate: Members must attend minimum_raid_days before eligible for loot';



COMMENT ON COLUMN "public"."guild_settings"."loot_announcements_enabled" IS 'When true and raid_summary_channel_id + guilds.discord_server_id are set, the loot-award endpoints post an embed to Discord for each award (or one batched embed for bulk imports).';



CREATE TABLE IF NOT EXISTS "public"."guilds" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "realm" "text",
    "faction" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "discord_server_id" character varying(255),
    "is_active" boolean DEFAULT true,
    "require_discord_verification" boolean DEFAULT false,
    "active_expansion_id" "uuid",
    "icon_url" "text",
    "subscription_tier" "text" DEFAULT 'free'::"text" NOT NULL,
    CONSTRAINT "guilds_faction_check" CHECK (("faction" = ANY (ARRAY['Alliance'::"text", 'Horde'::"text"]))),
    CONSTRAINT "guilds_subscription_tier_check" CHECK (("subscription_tier" = ANY (ARRAY['free'::"text", 'pro'::"text"])))
);


ALTER TABLE "public"."guilds" OWNER TO "postgres";


COMMENT ON COLUMN "public"."guilds"."discord_server_id" IS 'Discord server (guild) ID for verification. Find this in Discord by enabling Developer Mode and right-clicking the server.';



COMMENT ON COLUMN "public"."guilds"."active_expansion_id" IS 'The currently active expansion for this guild. Determines which raid tiers and loot items are visible throughout the app.';



CREATE TABLE IF NOT EXISTS "public"."loot_deadlines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "raid_tier_id" "uuid",
    "guild_id" "uuid",
    "deadline_at" timestamp with time zone NOT NULL,
    "is_locked" boolean DEFAULT false,
    "allow_late" boolean DEFAULT false,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."loot_deadlines" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."loot_history" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "character_id" "uuid",
    "loot_item_id" "uuid" NOT NULL,
    "guild_id" "uuid" NOT NULL,
    "raid_tier_id" "uuid" NOT NULL,
    "awarded_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "awarded_by" "uuid",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "raid_event_id" "uuid",
    "character_name" character varying(50),
    "expansion_id" "uuid",
    "source" "text" DEFAULT 'web'::"text",
    CONSTRAINT "loot_history_character_check" CHECK ((("character_id" IS NOT NULL) OR ("character_name" IS NOT NULL))),
    CONSTRAINT "loot_history_source_check" CHECK (("source" = ANY (ARRAY['web'::"text", 'addon'::"text", 'import'::"text"])))
);


ALTER TABLE "public"."loot_history" OWNER TO "postgres";


COMMENT ON COLUMN "public"."loot_history"."raid_event_id" IS 'Links the awarded item to the specific raid event/day it was received on';



CREATE TABLE IF NOT EXISTS "public"."loot_item_classes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "loot_item_id" "uuid",
    "class_id" "uuid",
    "spec_type" "text" DEFAULT 'primary'::"text",
    "spec_id" "uuid",
    CONSTRAINT "loot_item_classes_spec_type_check" CHECK (("spec_type" = ANY (ARRAY['primary'::"text", 'secondary'::"text"])))
);


ALTER TABLE "public"."loot_item_classes" OWNER TO "postgres";


COMMENT ON COLUMN "public"."loot_item_classes"."spec_type" IS 'Whether this is a primary (main-spec) or secondary (off-spec) item for the class';



COMMENT ON COLUMN "public"."loot_item_classes"."spec_id" IS 'Optional specific spec restriction. If null, applies to entire class';



CREATE TABLE IF NOT EXISTS "public"."loot_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "raid_tier_id" "uuid",
    "name" "text" NOT NULL,
    "boss_name" "text",
    "item_slot" "text",
    "wowhead_id" integer,
    "icon_url" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "classification" "text" DEFAULT 'Unlimited'::"text",
    "item_type" "text",
    "allocation_cost" integer DEFAULT 0,
    "is_available" boolean DEFAULT true,
    "roles" "text"[] DEFAULT '{}'::"text"[],
    "armor_type" "text",
    "weapon_type" "text",
    "officer_notes" "text",
    "is_loot_council" boolean DEFAULT false NOT NULL,
    "primary_stat" "text",
    CONSTRAINT "loot_items_classification_check" CHECK (("classification" = ANY (ARRAY['Reserved'::"text", 'Limited'::"text", 'Unlimited'::"text"])))
);


ALTER TABLE "public"."loot_items" OWNER TO "postgres";


COMMENT ON COLUMN "public"."loot_items"."classification" IS 'Item rarity classification: Reserved (1 point), Limited (1 point), Unlimited (0 points)';



COMMENT ON COLUMN "public"."loot_items"."item_type" IS 'Item type for duplicate detection (e.g., "One-Handed Sword", "Plate Chest", etc.)';



COMMENT ON COLUMN "public"."loot_items"."allocation_cost" IS 'Bracket allocation point cost: Reserved/Limited = 1, Unlimited = 0';



COMMENT ON COLUMN "public"."loot_items"."is_available" IS 'Whether this item appears in loot list dropdowns';



COMMENT ON COLUMN "public"."loot_items"."roles" IS 'Array of roles that can use this item: tank, healer, physical, caster';



COMMENT ON COLUMN "public"."loot_items"."armor_type" IS 'Armor weight class: Cloth, Leather, Mail, or Plate. Used for class proficiency filtering.';



COMMENT ON COLUMN "public"."loot_items"."weapon_type" IS 'Weapon type (e.g., Dagger, One-Handed Sword, Staff). Used for class proficiency filtering.';



COMMENT ON COLUMN "public"."loot_items"."officer_notes" IS 'Optional notes added by officers about the item (e.g., priority info, restrictions)';



COMMENT ON COLUMN "public"."loot_items"."primary_stat" IS 'Primary stat on the item: Strength, Agility, Intellect, Stamina, or NULL if unknown/N-A. Used for spec-based filtering.';



CREATE TABLE IF NOT EXISTS "public"."loot_submission_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "submission_id" "uuid",
    "loot_item_id" "uuid",
    "rank" integer NOT NULL,
    "slot" integer DEFAULT 1 NOT NULL,
    "removed_at" timestamp with time zone,
    "removed_by" "uuid",
    CONSTRAINT "loot_submission_items_slot_check" CHECK (("slot" = ANY (ARRAY[1, 2])))
);


ALTER TABLE "public"."loot_submission_items" OWNER TO "postgres";


COMMENT ON TABLE "public"."loot_submission_items" IS 'Stores loot rankings for submissions. With the slot system, the same item can appear in different rank/slot positions.';



COMMENT ON COLUMN "public"."loot_submission_items"."slot" IS 'Item slot within the rank (1 or 2). Both slots have equal priority.';



CREATE TABLE IF NOT EXISTS "public"."loot_submission_snapshots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "submission_id" "uuid" NOT NULL,
    "version" integer NOT NULL,
    "items" "jsonb" NOT NULL,
    "snapshot_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."loot_submission_snapshots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."loot_submissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "guild_id" "uuid",
    "raid_tier_id" "uuid",
    "status" "text" DEFAULT 'draft'::"text",
    "submitted_at" timestamp with time zone,
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "review_notes" "text",
    "version" integer DEFAULT 1,
    "is_late" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "character_id" "uuid",
    "expansion_id" "uuid",
    "phase" integer,
    "resubmission_count" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "loot_submissions_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."loot_submissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "discord_id" "text",
    "discord_username" "text",
    "discord_avatar" "text",
    "display_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."raid_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "guild_id" "uuid",
    "raid_tier_id" "uuid",
    "raid_date" "date" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "is_skipped" boolean DEFAULT false,
    "skip_reason" "text",
    "wcl_report_code" "text",
    "raid_team_id" "uuid",
    "is_bonus" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."raid_events" OWNER TO "postgres";


COMMENT ON COLUMN "public"."raid_events"."is_skipped" IS 'Raid was skipped (holiday, cancelled, etc.)';



COMMENT ON COLUMN "public"."raid_events"."skip_reason" IS 'Reason the raid was skipped';



COMMENT ON COLUMN "public"."raid_events"."is_bonus" IS 'True for officer-created off-schedule (bonus) raids. Bonus events count toward attendance scoring like scheduled events but bypass the day-of-week filter.';



CREATE TABLE IF NOT EXISTS "public"."raid_team_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "raid_team_id" "uuid" NOT NULL,
    "character_id" "uuid" NOT NULL,
    "guild_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'Raider'::"text",
    "joined_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."raid_team_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."raid_teams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "guild_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "color_hex" "text" DEFAULT '#ff8000'::"text",
    "is_default" boolean DEFAULT false NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "raid_days_override" "jsonb",
    "rolling_weeks_override" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "schedule_history" "jsonb"
);


ALTER TABLE "public"."raid_teams" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."raid_tiers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "expansion_id" "uuid",
    "name" "text" NOT NULL,
    "sort_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "master_sheet_visible" boolean DEFAULT false,
    "submission_deadline" timestamp with time zone,
    "is_guild_active" boolean DEFAULT true NOT NULL,
    "phase" integer
);


ALTER TABLE "public"."raid_tiers" OWNER TO "postgres";


COMMENT ON COLUMN "public"."raid_tiers"."master_sheet_visible" IS 'When false, players cannot see the master sheet/rankings for this tier. Officers can toggle this to prevent gaming the loot system.';



COMMENT ON COLUMN "public"."raid_tiers"."submission_deadline" IS 'Optional deadline for submissions. After this time, players see a warning that submissions require officer approval (though all submissions require approval).';



CREATE TABLE IF NOT EXISTS "public"."reserve_audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reserve_run_id" "uuid" NOT NULL,
    "actor_user_id" "uuid",
    "actor_label" "text",
    "action" "text" NOT NULL,
    "details" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."reserve_audit_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reserve_awards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reserve_run_id" "uuid" NOT NULL,
    "loot_item_id" "uuid" NOT NULL,
    "submission_id" "uuid",
    "character_name" "text" NOT NULL,
    "awarded_by" "uuid" NOT NULL,
    "awarded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "notes" "text"
);


ALTER TABLE "public"."reserve_awards" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reserve_runs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid" NOT NULL,
    "guild_id" "uuid",
    "raid_team_id" "uuid",
    "expansion_id" "uuid",
    "raid_tier_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "share_token" "text" DEFAULT "public"."generate_reserve_token"() NOT NULL,
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "raid_at" timestamp with time zone NOT NULL,
    "lock_at" timestamp with time zone NOT NULL,
    "locked_at" timestamp with time zone,
    "max_reserves" integer DEFAULT 2 NOT NULL,
    "allow_duplicates" boolean DEFAULT false NOT NULL,
    "visibility" "text" DEFAULT 'hidden_until_lock'::"text" NOT NULL,
    "rules_note" "text",
    "hard_reserves" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "rule_snapshot" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "max_reserves_per_item" integer,
    "discord_invite_url" "text",
    "enforce_class_restrictions" boolean DEFAULT false NOT NULL,
    "raid_leader_token" "text" DEFAULT "public"."generate_reserve_leader_token"() NOT NULL,
    CONSTRAINT "reserve_runs_max_reserves_check" CHECK ((("max_reserves" >= 1) AND ("max_reserves" <= 10))),
    CONSTRAINT "reserve_runs_max_reserves_per_item_check" CHECK ((("max_reserves_per_item" IS NULL) OR ("max_reserves_per_item" > 0))),
    CONSTRAINT "reserve_runs_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'locked'::"text", 'completed'::"text"]))),
    CONSTRAINT "reserve_runs_visibility_check" CHECK (("visibility" = ANY (ARRAY['public_live'::"text", 'hidden_until_lock'::"text"])))
);


ALTER TABLE "public"."reserve_runs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reserve_submissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reserve_run_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "character_name" "text" NOT NULL,
    "character_class" "text" NOT NULL,
    "character_spec" "text",
    "items" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "status" "text" DEFAULT 'submitted'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "character_id" "uuid",
    CONSTRAINT "reserve_submissions_status_check" CHECK (("status" = ANY (ARRAY['submitted'::"text", 'withdrawn'::"text"])))
);


ALTER TABLE "public"."reserve_submissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_active_characters" (
    "user_id" "uuid" NOT NULL,
    "active_character_id" "uuid",
    "active_guild_id" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_active_characters" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "show_email" boolean DEFAULT false,
    "show_discord_username" boolean DEFAULT true,
    "show_attendance_stats" boolean DEFAULT true,
    "show_loot_history" boolean DEFAULT true,
    "notify_loot_deadline" boolean DEFAULT true,
    "notify_submission_status" boolean DEFAULT true,
    "notify_new_raids" boolean DEFAULT true,
    "preferred_display_name" character varying(255),
    "bio" "text",
    "discord_verified" boolean DEFAULT false,
    "discord_guild_member" boolean DEFAULT false,
    "last_verified_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "discord_id" "text",
    "accent_color" "text"
);


ALTER TABLE "public"."user_preferences" OWNER TO "postgres";


COMMENT ON COLUMN "public"."user_preferences"."accent_color" IS 'User-selected accent color in hex format (e.g., #ff8000). NULL means use default.';



CREATE TABLE IF NOT EXISTS "public"."wow_classes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "color_hex" "text"
);


ALTER TABLE "public"."wow_classes" OWNER TO "postgres";


ALTER TABLE ONLY "public"."addon_sync_tokens"
    ADD CONSTRAINT "addon_sync_tokens_guild_id_user_id_key" UNIQUE ("guild_id", "user_id");



ALTER TABLE ONLY "public"."addon_sync_tokens"
    ADD CONSTRAINT "addon_sync_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."attendance_records"
    ADD CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."attendance_records"
    ADD CONSTRAINT "attendance_records_raid_event_id_character_id_key" UNIQUE ("raid_event_id", "character_id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."battlenet_accounts"
    ADD CONSTRAINT "battlenet_accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."battlenet_accounts"
    ADD CONSTRAINT "battlenet_accounts_user_unique" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."blp_credits"
    ADD CONSTRAINT "blp_credits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."blp_credits"
    ADD CONSTRAINT "blp_credits_unique" UNIQUE ("character_id", "loot_item_id", "raid_event_id");



ALTER TABLE ONLY "public"."blp_tracking"
    ADD CONSTRAINT "blp_tracking_guild_id_character_id_loot_item_id_key" UNIQUE ("guild_id", "character_id", "loot_item_id");



ALTER TABLE ONLY "public"."blp_tracking"
    ADD CONSTRAINT "blp_tracking_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."character_aliases"
    ADD CONSTRAINT "character_aliases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."character_equipped_items"
    ADD CONSTRAINT "character_equipped_items_character_id_slot_key" UNIQUE ("character_id", "slot");



ALTER TABLE ONLY "public"."character_equipped_items"
    ADD CONSTRAINT "character_equipped_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."character_guild_memberships"
    ADD CONSTRAINT "character_guild_memberships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."characters"
    ADD CONSTRAINT "characters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."class_specs"
    ADD CONSTRAINT "class_specs_class_id_name_key" UNIQUE ("class_id", "name");



ALTER TABLE ONLY "public"."class_specs"
    ADD CONSTRAINT "class_specs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."discord_feedback_map"
    ADD CONSTRAINT "discord_feedback_map_pkey" PRIMARY KEY ("discord_message_id");



ALTER TABLE ONLY "public"."donation_records"
    ADD CONSTRAINT "donation_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."expansions"
    ADD CONSTRAINT "expansions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."guild_invite_codes"
    ADD CONSTRAINT "guild_invite_codes_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."guild_invite_codes"
    ADD CONSTRAINT "guild_invite_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."guild_item_priorities"
    ADD CONSTRAINT "guild_item_priorities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."guild_roles"
    ADD CONSTRAINT "guild_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."guild_settings"
    ADD CONSTRAINT "guild_settings_guild_id_key" UNIQUE ("guild_id");



ALTER TABLE ONLY "public"."guild_settings"
    ADD CONSTRAINT "guild_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."guilds"
    ADD CONSTRAINT "guilds_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."loot_deadlines"
    ADD CONSTRAINT "loot_deadlines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."loot_deadlines"
    ADD CONSTRAINT "loot_deadlines_raid_tier_id_guild_id_key" UNIQUE ("raid_tier_id", "guild_id");



ALTER TABLE ONLY "public"."loot_history"
    ADD CONSTRAINT "loot_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."loot_item_classes"
    ADD CONSTRAINT "loot_item_classes_loot_item_id_spec_id_spec_type_key" UNIQUE ("loot_item_id", "spec_id", "spec_type");



ALTER TABLE ONLY "public"."loot_item_classes"
    ADD CONSTRAINT "loot_item_classes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."loot_items"
    ADD CONSTRAINT "loot_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."loot_submission_items"
    ADD CONSTRAINT "loot_submission_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."loot_submission_items"
    ADD CONSTRAINT "loot_submission_items_submission_id_rank_slot_key" UNIQUE ("submission_id", "rank", "slot");



ALTER TABLE ONLY "public"."loot_submission_items"
    ADD CONSTRAINT "loot_submission_items_unique_submission_rank_slot" UNIQUE ("submission_id", "rank", "slot");



ALTER TABLE ONLY "public"."loot_submission_snapshots"
    ADD CONSTRAINT "loot_submission_snapshots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."loot_submissions"
    ADD CONSTRAINT "loot_submissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."loot_submissions"
    ADD CONSTRAINT "loot_submissions_unique_character_guild_expansion_phase" UNIQUE ("character_id", "guild_id", "expansion_id", "phase");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."raid_events"
    ADD CONSTRAINT "raid_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."raid_team_members"
    ADD CONSTRAINT "raid_team_members_guild_character_unique" UNIQUE ("guild_id", "character_id");



ALTER TABLE ONLY "public"."raid_team_members"
    ADD CONSTRAINT "raid_team_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."raid_team_members"
    ADD CONSTRAINT "raid_team_members_team_character_unique" UNIQUE ("raid_team_id", "character_id");



ALTER TABLE ONLY "public"."raid_teams"
    ADD CONSTRAINT "raid_teams_guild_id_name_key" UNIQUE ("guild_id", "name");



ALTER TABLE ONLY "public"."raid_teams"
    ADD CONSTRAINT "raid_teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."raid_tiers"
    ADD CONSTRAINT "raid_tiers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reserve_audit_log"
    ADD CONSTRAINT "reserve_audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reserve_awards"
    ADD CONSTRAINT "reserve_awards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reserve_runs"
    ADD CONSTRAINT "reserve_runs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reserve_runs"
    ADD CONSTRAINT "reserve_runs_share_token_key" UNIQUE ("share_token");



ALTER TABLE ONLY "public"."reserve_submissions"
    ADD CONSTRAINT "reserve_submissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."guild_invite_codes"
    ADD CONSTRAINT "unique_active_code" UNIQUE ("code", "is_active");



ALTER TABLE ONLY "public"."character_guild_memberships"
    ADD CONSTRAINT "unique_character_guild" UNIQUE ("character_id", "guild_id");



ALTER TABLE ONLY "public"."characters"
    ADD CONSTRAINT "unique_character_per_user" UNIQUE ("user_id", "name");



ALTER TABLE ONLY "public"."guild_item_priorities"
    ADD CONSTRAINT "unique_item_priority_per_guild" UNIQUE ("guild_id", "item_id", "raid_tier_id");



ALTER TABLE ONLY "public"."guild_roles"
    ADD CONSTRAINT "unique_role_per_guild" UNIQUE ("guild_id", "name");



ALTER TABLE ONLY "public"."user_active_characters"
    ADD CONSTRAINT "user_active_characters_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."wow_classes"
    ADD CONSTRAINT "wow_classes_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."wow_classes"
    ADD CONSTRAINT "wow_classes_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_addon_sync_tokens_guild" ON "public"."addon_sync_tokens" USING "btree" ("guild_id");



CREATE INDEX "idx_addon_sync_tokens_hash" ON "public"."addon_sync_tokens" USING "btree" ("token_hash");



CREATE INDEX "idx_ar_raid_event" ON "public"."attendance_records" USING "btree" ("raid_event_id");



CREATE INDEX "idx_attendance_records_character_id" ON "public"."attendance_records" USING "btree" ("character_id");



CREATE INDEX "idx_attendance_records_character_name" ON "public"."attendance_records" USING "btree" ("character_name") WHERE ("character_name" IS NOT NULL);



CREATE UNIQUE INDEX "idx_attendance_records_raid_character" ON "public"."attendance_records" USING "btree" ("raid_event_id", "character_id") WHERE ("character_id" IS NOT NULL);



CREATE INDEX "idx_attendance_records_status" ON "public"."attendance_records" USING "btree" ("status");



CREATE INDEX "idx_audit_logs_action" ON "public"."audit_logs" USING "btree" ("action");



CREATE INDEX "idx_audit_logs_created_at" ON "public"."audit_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_audit_logs_guild_created" ON "public"."audit_logs" USING "btree" ("guild_id", "created_at" DESC);



CREATE INDEX "idx_audit_logs_table_record" ON "public"."audit_logs" USING "btree" ("table_name", "record_id");



CREATE INDEX "idx_audit_logs_user" ON "public"."audit_logs" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_blp_credits_character_item" ON "public"."blp_credits" USING "btree" ("character_id", "loot_item_id");



CREATE INDEX "idx_blp_credits_guild" ON "public"."blp_credits" USING "btree" ("guild_id");



CREATE INDEX "idx_blp_credits_raid_item" ON "public"."blp_credits" USING "btree" ("raid_event_id", "loot_item_id");



CREATE INDEX "idx_blp_tracking_character" ON "public"."blp_tracking" USING "btree" ("character_id");



CREATE INDEX "idx_blp_tracking_expansion" ON "public"."blp_tracking" USING "btree" ("expansion_id");



CREATE INDEX "idx_blp_tracking_guild" ON "public"."blp_tracking" USING "btree" ("guild_id");



CREATE INDEX "idx_blp_tracking_guild_item" ON "public"."blp_tracking" USING "btree" ("guild_id", "loot_item_id");



CREATE INDEX "idx_blp_tracking_item" ON "public"."blp_tracking" USING "btree" ("loot_item_id");



CREATE INDEX "idx_cgm_guild_active" ON "public"."character_guild_memberships" USING "btree" ("guild_id", "is_active");



CREATE INDEX "idx_cgm_guild_char_active" ON "public"."character_guild_memberships" USING "btree" ("guild_id", "character_id", "is_active");



CREATE INDEX "idx_char_guild_character_id" ON "public"."character_guild_memberships" USING "btree" ("character_id");



CREATE INDEX "idx_char_guild_guild_id" ON "public"."character_guild_memberships" USING "btree" ("guild_id");



CREATE INDEX "idx_char_guild_is_active" ON "public"."character_guild_memberships" USING "btree" ("is_active");



CREATE INDEX "idx_char_guild_membership_status" ON "public"."character_guild_memberships" USING "btree" ("membership_status");



CREATE INDEX "idx_char_guild_role" ON "public"."character_guild_memberships" USING "btree" ("role");



CREATE INDEX "idx_character_aliases_guild" ON "public"."character_aliases" USING "btree" ("guild_id");



CREATE UNIQUE INDEX "idx_character_aliases_unique" ON "public"."character_aliases" USING "btree" ("guild_id", "alias_name");



CREATE INDEX "idx_character_equipped_items_character_id" ON "public"."character_equipped_items" USING "btree" ("character_id");



CREATE INDEX "idx_character_equipped_items_wowhead_id" ON "public"."character_equipped_items" USING "btree" ("wowhead_id");



CREATE INDEX "idx_characters_battle_net_id" ON "public"."characters" USING "btree" ("battle_net_id");



CREATE INDEX "idx_characters_is_main" ON "public"."characters" USING "btree" ("is_main");



CREATE INDEX "idx_characters_user_id" ON "public"."characters" USING "btree" ("user_id");



CREATE INDEX "idx_class_specs_class_id" ON "public"."class_specs" USING "btree" ("class_id");



CREATE INDEX "idx_discord_feedback_map_created" ON "public"."discord_feedback_map" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_donation_records_character_awarded" ON "public"."donation_records" USING "btree" ("character_id", "awarded_at" DESC) WHERE ("character_id" IS NOT NULL);



CREATE INDEX "idx_donation_records_guild_awarded" ON "public"."donation_records" USING "btree" ("guild_id", "awarded_at" DESC);



CREATE INDEX "idx_expansions_guild_id" ON "public"."expansions" USING "btree" ("guild_id");



CREATE INDEX "idx_expansions_name" ON "public"."expansions" USING "btree" ("name");



CREATE INDEX "idx_expansions_raid_start_date" ON "public"."expansions" USING "btree" ("raid_start_date");



CREATE INDEX "idx_gip_guild_item_tier" ON "public"."guild_item_priorities" USING "btree" ("guild_id", "item_id", "raid_tier_id");



CREATE INDEX "idx_gip_guild_tier" ON "public"."guild_item_priorities" USING "btree" ("guild_id", "raid_tier_id");



CREATE INDEX "idx_guild_item_priorities_guild_id" ON "public"."guild_item_priorities" USING "btree" ("guild_id");



CREATE INDEX "idx_guild_item_priorities_guild_tier" ON "public"."guild_item_priorities" USING "btree" ("guild_id", "raid_tier_id");



CREATE INDEX "idx_guild_item_priorities_item_id" ON "public"."guild_item_priorities" USING "btree" ("item_id");



CREATE INDEX "idx_guild_item_priorities_raid_tier_id" ON "public"."guild_item_priorities" USING "btree" ("raid_tier_id");



CREATE INDEX "idx_guild_roles_guild_id" ON "public"."guild_roles" USING "btree" ("guild_id");



CREATE INDEX "idx_guild_roles_position" ON "public"."guild_roles" USING "btree" ("position");



CREATE INDEX "idx_guild_settings_guild_id" ON "public"."guild_settings" USING "btree" ("guild_id");



CREATE INDEX "idx_guilds_active_expansion" ON "public"."guilds" USING "btree" ("active_expansion_id");



CREATE INDEX "idx_guilds_created_by" ON "public"."guilds" USING "btree" ("created_by");



CREATE INDEX "idx_guilds_discord_server_id" ON "public"."guilds" USING "btree" ("discord_server_id");



CREATE INDEX "idx_invite_codes_code" ON "public"."guild_invite_codes" USING "btree" ("code") WHERE ("is_active" = true);



CREATE INDEX "idx_invite_codes_created_by" ON "public"."guild_invite_codes" USING "btree" ("created_by");



CREATE INDEX "idx_invite_codes_guild" ON "public"."guild_invite_codes" USING "btree" ("guild_id");



CREATE INDEX "idx_lh_guild_date" ON "public"."loot_history" USING "btree" ("guild_id", "awarded_date" DESC);



CREATE INDEX "idx_lh_raid_event" ON "public"."loot_history" USING "btree" ("raid_event_id");



CREATE INDEX "idx_loot_history_awarded_date" ON "public"."loot_history" USING "btree" ("awarded_date");



CREATE INDEX "idx_loot_history_character_id" ON "public"."loot_history" USING "btree" ("character_id");



CREATE INDEX "idx_loot_history_character_name" ON "public"."loot_history" USING "btree" ("character_name") WHERE ("character_name" IS NOT NULL);



CREATE INDEX "idx_loot_history_expansion" ON "public"."loot_history" USING "btree" ("expansion_id");



CREATE INDEX "idx_loot_history_guild_date" ON "public"."loot_history" USING "btree" ("guild_id", "awarded_date" DESC);



CREATE INDEX "idx_loot_history_guild_id" ON "public"."loot_history" USING "btree" ("guild_id");



CREATE INDEX "idx_loot_history_loot_item_id" ON "public"."loot_history" USING "btree" ("loot_item_id");



CREATE INDEX "idx_loot_history_raid_event_id" ON "public"."loot_history" USING "btree" ("raid_event_id");



CREATE UNIQUE INDEX "idx_loot_history_unique_award" ON "public"."loot_history" USING "btree" ("guild_id", "loot_item_id", "character_id", "raid_event_id") WHERE (("raid_event_id" IS NOT NULL) AND ("character_id" IS NOT NULL));



CREATE INDEX "idx_loot_item_classes_item_spec_type" ON "public"."loot_item_classes" USING "btree" ("loot_item_id", "spec_type");



CREATE INDEX "idx_loot_item_classes_spec_id" ON "public"."loot_item_classes" USING "btree" ("spec_id");



CREATE INDEX "idx_loot_item_classes_spec_type" ON "public"."loot_item_classes" USING "btree" ("spec_type");



CREATE INDEX "idx_loot_items_armor_type" ON "public"."loot_items" USING "btree" ("armor_type");



CREATE INDEX "idx_loot_items_classification" ON "public"."loot_items" USING "btree" ("classification");



CREATE INDEX "idx_loot_items_is_available" ON "public"."loot_items" USING "btree" ("is_available");



CREATE INDEX "idx_loot_items_item_type" ON "public"."loot_items" USING "btree" ("item_type");



CREATE INDEX "idx_loot_items_primary_stat" ON "public"."loot_items" USING "btree" ("primary_stat");



CREATE INDEX "idx_loot_items_roles" ON "public"."loot_items" USING "gin" ("roles");



CREATE INDEX "idx_loot_items_weapon_type" ON "public"."loot_items" USING "btree" ("weapon_type");



CREATE INDEX "idx_loot_submissions_character_id" ON "public"."loot_submissions" USING "btree" ("character_id");



CREATE INDEX "idx_loot_submissions_phase" ON "public"."loot_submissions" USING "btree" ("character_id", "guild_id", "expansion_id", "phase");



CREATE INDEX "idx_loot_submissions_status" ON "public"."loot_submissions" USING "btree" ("status");



CREATE INDEX "idx_ls_status" ON "public"."loot_submissions" USING "btree" ("status");



CREATE INDEX "idx_lsi_submission" ON "public"."loot_submission_items" USING "btree" ("submission_id");



CREATE INDEX "idx_raid_events_guild_bonus" ON "public"."raid_events" USING "btree" ("guild_id", "raid_date") WHERE ("is_bonus" = true);



CREATE INDEX "idx_raid_events_raid_team_id" ON "public"."raid_events" USING "btree" ("raid_team_id");



CREATE INDEX "idx_raid_team_members_character_id" ON "public"."raid_team_members" USING "btree" ("character_id");



CREATE INDEX "idx_raid_team_members_guild_id" ON "public"."raid_team_members" USING "btree" ("guild_id");



CREATE INDEX "idx_raid_team_members_team_id" ON "public"."raid_team_members" USING "btree" ("raid_team_id");



CREATE INDEX "idx_raid_teams_guild_id" ON "public"."raid_teams" USING "btree" ("guild_id");



CREATE INDEX "idx_raid_tiers_expansion_id" ON "public"."raid_tiers" USING "btree" ("expansion_id");



CREATE INDEX "idx_raid_tiers_is_active" ON "public"."raid_tiers" USING "btree" ("is_active");



CREATE INDEX "idx_raid_tiers_master_sheet_visible" ON "public"."raid_tiers" USING "btree" ("master_sheet_visible");



CREATE INDEX "idx_raid_tiers_name" ON "public"."raid_tiers" USING "btree" ("name");



CREATE INDEX "idx_raid_tiers_phase" ON "public"."raid_tiers" USING "btree" ("phase");



CREATE INDEX "idx_raid_tiers_submission_deadline" ON "public"."raid_tiers" USING "btree" ("submission_deadline");



CREATE INDEX "idx_reserve_audit_log_created_at" ON "public"."reserve_audit_log" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_reserve_audit_log_run_id" ON "public"."reserve_audit_log" USING "btree" ("reserve_run_id");



CREATE INDEX "idx_reserve_awards_run_id" ON "public"."reserve_awards" USING "btree" ("reserve_run_id");



CREATE INDEX "idx_reserve_runs_created_by" ON "public"."reserve_runs" USING "btree" ("created_by");



CREATE INDEX "idx_reserve_runs_guild_id" ON "public"."reserve_runs" USING "btree" ("guild_id");



CREATE UNIQUE INDEX "idx_reserve_runs_raid_leader_token" ON "public"."reserve_runs" USING "btree" ("raid_leader_token");



CREATE INDEX "idx_reserve_submissions_character_id" ON "public"."reserve_submissions" USING "btree" ("character_id") WHERE ("character_id" IS NOT NULL);



CREATE INDEX "idx_reserve_submissions_run_id" ON "public"."reserve_submissions" USING "btree" ("reserve_run_id");



CREATE UNIQUE INDEX "idx_reserve_submissions_unique_char" ON "public"."reserve_submissions" USING "btree" ("reserve_run_id", "lower"("character_name"));



CREATE INDEX "idx_reserve_submissions_user_id" ON "public"."reserve_submissions" USING "btree" ("user_id") WHERE ("user_id" IS NOT NULL);



CREATE INDEX "idx_submission_snapshots_submission_id" ON "public"."loot_submission_snapshots" USING "btree" ("submission_id");



CREATE INDEX "idx_user_active_character" ON "public"."user_active_characters" USING "btree" ("active_character_id");



CREATE INDEX "idx_user_active_guild" ON "public"."user_active_characters" USING "btree" ("active_guild_id");



CREATE INDEX "idx_user_preferences_discord_id" ON "public"."user_preferences" USING "btree" ("discord_id");



CREATE OR REPLACE TRIGGER "create_guild_default_roles" AFTER INSERT ON "public"."guilds" FOR EACH ROW EXECUTE FUNCTION "public"."create_default_guild_roles"();



CREATE OR REPLACE TRIGGER "enforce_max_roles" BEFORE INSERT ON "public"."guild_roles" FOR EACH ROW EXECUTE FUNCTION "public"."check_max_roles_per_guild"();



CREATE OR REPLACE TRIGGER "set_guild_item_priorities_updated_at" BEFORE UPDATE ON "public"."guild_item_priorities" FOR EACH ROW EXECUTE FUNCTION "public"."update_guild_item_priorities_updated_at"();



CREATE OR REPLACE TRIGGER "trg_donation_records_updated_at" BEFORE UPDATE ON "public"."donation_records" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_reject_submissions_on_cgm_loss" AFTER DELETE OR UPDATE ON "public"."character_guild_memberships" FOR EACH ROW EXECUTE FUNCTION "public"."reject_submissions_on_cgm_loss"();



CREATE OR REPLACE TRIGGER "trg_reserve_runs_updated_at" BEFORE UPDATE ON "public"."reserve_runs" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_reserve_submissions_updated_at" BEFORE UPDATE ON "public"."reserve_submissions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_guild_settings_updated_at" BEFORE UPDATE ON "public"."guild_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_guild_settings_updated_at"();



CREATE OR REPLACE TRIGGER "update_loot_history_updated_at" BEFORE UPDATE ON "public"."loot_history" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_preferences_updated_at" BEFORE UPDATE ON "public"."user_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."addon_sync_tokens"
    ADD CONSTRAINT "addon_sync_tokens_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."addon_sync_tokens"
    ADD CONSTRAINT "addon_sync_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."attendance_records"
    ADD CONSTRAINT "attendance_records_modified_by_fkey" FOREIGN KEY ("modified_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."attendance_records"
    ADD CONSTRAINT "attendance_records_raid_event_id_fkey" FOREIGN KEY ("raid_event_id") REFERENCES "public"."raid_events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."attendance_records"
    ADD CONSTRAINT "attendance_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."battlenet_accounts"
    ADD CONSTRAINT "battlenet_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."blp_credits"
    ADD CONSTRAINT "blp_credits_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."blp_credits"
    ADD CONSTRAINT "blp_credits_expansion_id_fkey" FOREIGN KEY ("expansion_id") REFERENCES "public"."expansions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."blp_credits"
    ADD CONSTRAINT "blp_credits_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."blp_credits"
    ADD CONSTRAINT "blp_credits_loot_item_id_fkey" FOREIGN KEY ("loot_item_id") REFERENCES "public"."loot_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."blp_credits"
    ADD CONSTRAINT "blp_credits_raid_event_id_fkey" FOREIGN KEY ("raid_event_id") REFERENCES "public"."raid_events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."blp_tracking"
    ADD CONSTRAINT "blp_tracking_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."blp_tracking"
    ADD CONSTRAINT "blp_tracking_expansion_id_fkey" FOREIGN KEY ("expansion_id") REFERENCES "public"."expansions"("id");



ALTER TABLE ONLY "public"."blp_tracking"
    ADD CONSTRAINT "blp_tracking_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."blp_tracking"
    ADD CONSTRAINT "blp_tracking_loot_item_id_fkey" FOREIGN KEY ("loot_item_id") REFERENCES "public"."loot_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."character_aliases"
    ADD CONSTRAINT "character_aliases_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."character_aliases"
    ADD CONSTRAINT "character_aliases_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."character_equipped_items"
    ADD CONSTRAINT "character_equipped_items_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."character_guild_memberships"
    ADD CONSTRAINT "character_guild_memberships_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."character_guild_memberships"
    ADD CONSTRAINT "character_guild_memberships_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."characters"
    ADD CONSTRAINT "characters_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."wow_classes"("id");



ALTER TABLE ONLY "public"."characters"
    ADD CONSTRAINT "characters_spec_id_fkey" FOREIGN KEY ("spec_id") REFERENCES "public"."class_specs"("id");



ALTER TABLE ONLY "public"."characters"
    ADD CONSTRAINT "characters_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."class_specs"
    ADD CONSTRAINT "class_specs_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."wow_classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."donation_records"
    ADD CONSTRAINT "donation_records_awarded_by_fkey" FOREIGN KEY ("awarded_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."donation_records"
    ADD CONSTRAINT "donation_records_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."donation_records"
    ADD CONSTRAINT "donation_records_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expansions"
    ADD CONSTRAINT "expansions_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."guild_invite_codes"
    ADD CONSTRAINT "guild_invite_codes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."guild_invite_codes"
    ADD CONSTRAINT "guild_invite_codes_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."guild_item_priorities"
    ADD CONSTRAINT "guild_item_priorities_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."guild_item_priorities"
    ADD CONSTRAINT "guild_item_priorities_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."loot_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."guild_item_priorities"
    ADD CONSTRAINT "guild_item_priorities_raid_tier_id_fkey" FOREIGN KEY ("raid_tier_id") REFERENCES "public"."raid_tiers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."guild_roles"
    ADD CONSTRAINT "guild_roles_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."guild_settings"
    ADD CONSTRAINT "guild_settings_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."guilds"
    ADD CONSTRAINT "guilds_active_expansion_id_fkey" FOREIGN KEY ("active_expansion_id") REFERENCES "public"."expansions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."guilds"
    ADD CONSTRAINT "guilds_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."loot_deadlines"
    ADD CONSTRAINT "loot_deadlines_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."loot_deadlines"
    ADD CONSTRAINT "loot_deadlines_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."loot_deadlines"
    ADD CONSTRAINT "loot_deadlines_raid_tier_id_fkey" FOREIGN KEY ("raid_tier_id") REFERENCES "public"."raid_tiers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."loot_history"
    ADD CONSTRAINT "loot_history_awarded_by_fkey" FOREIGN KEY ("awarded_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."loot_history"
    ADD CONSTRAINT "loot_history_expansion_id_fkey" FOREIGN KEY ("expansion_id") REFERENCES "public"."expansions"("id");



ALTER TABLE ONLY "public"."loot_history"
    ADD CONSTRAINT "loot_history_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."loot_history"
    ADD CONSTRAINT "loot_history_loot_item_id_fkey" FOREIGN KEY ("loot_item_id") REFERENCES "public"."loot_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."loot_history"
    ADD CONSTRAINT "loot_history_raid_event_id_fkey" FOREIGN KEY ("raid_event_id") REFERENCES "public"."raid_events"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."loot_history"
    ADD CONSTRAINT "loot_history_raid_tier_id_fkey" FOREIGN KEY ("raid_tier_id") REFERENCES "public"."raid_tiers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."loot_item_classes"
    ADD CONSTRAINT "loot_item_classes_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."wow_classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."loot_item_classes"
    ADD CONSTRAINT "loot_item_classes_loot_item_id_fkey" FOREIGN KEY ("loot_item_id") REFERENCES "public"."loot_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."loot_item_classes"
    ADD CONSTRAINT "loot_item_classes_spec_id_fkey" FOREIGN KEY ("spec_id") REFERENCES "public"."class_specs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."loot_items"
    ADD CONSTRAINT "loot_items_raid_tier_id_fkey" FOREIGN KEY ("raid_tier_id") REFERENCES "public"."raid_tiers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."loot_submission_items"
    ADD CONSTRAINT "loot_submission_items_loot_item_id_fkey" FOREIGN KEY ("loot_item_id") REFERENCES "public"."loot_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."loot_submission_items"
    ADD CONSTRAINT "loot_submission_items_removed_by_fkey" FOREIGN KEY ("removed_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."loot_submission_items"
    ADD CONSTRAINT "loot_submission_items_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "public"."loot_submissions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."loot_submission_snapshots"
    ADD CONSTRAINT "loot_submission_snapshots_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "public"."loot_submissions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."loot_submissions"
    ADD CONSTRAINT "loot_submissions_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."loot_submissions"
    ADD CONSTRAINT "loot_submissions_expansion_id_fkey" FOREIGN KEY ("expansion_id") REFERENCES "public"."expansions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."loot_submissions"
    ADD CONSTRAINT "loot_submissions_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."loot_submissions"
    ADD CONSTRAINT "loot_submissions_raid_tier_id_fkey" FOREIGN KEY ("raid_tier_id") REFERENCES "public"."raid_tiers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."loot_submissions"
    ADD CONSTRAINT "loot_submissions_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."loot_submissions"
    ADD CONSTRAINT "loot_submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."raid_events"
    ADD CONSTRAINT "raid_events_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."raid_events"
    ADD CONSTRAINT "raid_events_raid_team_id_fkey" FOREIGN KEY ("raid_team_id") REFERENCES "public"."raid_teams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."raid_events"
    ADD CONSTRAINT "raid_events_raid_tier_id_fkey" FOREIGN KEY ("raid_tier_id") REFERENCES "public"."raid_tiers"("id");



ALTER TABLE ONLY "public"."raid_team_members"
    ADD CONSTRAINT "raid_team_members_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."raid_team_members"
    ADD CONSTRAINT "raid_team_members_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."raid_team_members"
    ADD CONSTRAINT "raid_team_members_raid_team_id_fkey" FOREIGN KEY ("raid_team_id") REFERENCES "public"."raid_teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."raid_teams"
    ADD CONSTRAINT "raid_teams_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."raid_tiers"
    ADD CONSTRAINT "raid_tiers_expansion_id_fkey" FOREIGN KEY ("expansion_id") REFERENCES "public"."expansions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reserve_audit_log"
    ADD CONSTRAINT "reserve_audit_log_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."reserve_audit_log"
    ADD CONSTRAINT "reserve_audit_log_reserve_run_id_fkey" FOREIGN KEY ("reserve_run_id") REFERENCES "public"."reserve_runs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reserve_awards"
    ADD CONSTRAINT "reserve_awards_awarded_by_fkey" FOREIGN KEY ("awarded_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."reserve_awards"
    ADD CONSTRAINT "reserve_awards_loot_item_id_fkey" FOREIGN KEY ("loot_item_id") REFERENCES "public"."loot_items"("id");



ALTER TABLE ONLY "public"."reserve_awards"
    ADD CONSTRAINT "reserve_awards_reserve_run_id_fkey" FOREIGN KEY ("reserve_run_id") REFERENCES "public"."reserve_runs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reserve_awards"
    ADD CONSTRAINT "reserve_awards_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "public"."reserve_submissions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."reserve_runs"
    ADD CONSTRAINT "reserve_runs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."reserve_runs"
    ADD CONSTRAINT "reserve_runs_expansion_id_fkey" FOREIGN KEY ("expansion_id") REFERENCES "public"."expansions"("id");



ALTER TABLE ONLY "public"."reserve_runs"
    ADD CONSTRAINT "reserve_runs_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reserve_runs"
    ADD CONSTRAINT "reserve_runs_raid_team_id_fkey" FOREIGN KEY ("raid_team_id") REFERENCES "public"."raid_teams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."reserve_runs"
    ADD CONSTRAINT "reserve_runs_raid_tier_id_fkey" FOREIGN KEY ("raid_tier_id") REFERENCES "public"."raid_tiers"("id");



ALTER TABLE ONLY "public"."reserve_submissions"
    ADD CONSTRAINT "reserve_submissions_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."reserve_submissions"
    ADD CONSTRAINT "reserve_submissions_reserve_run_id_fkey" FOREIGN KEY ("reserve_run_id") REFERENCES "public"."reserve_runs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reserve_submissions"
    ADD CONSTRAINT "reserve_submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_active_characters"
    ADD CONSTRAINT "user_active_characters_active_character_id_fkey" FOREIGN KEY ("active_character_id") REFERENCES "public"."characters"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_active_characters"
    ADD CONSTRAINT "user_active_characters_active_guild_id_fkey" FOREIGN KEY ("active_guild_id") REFERENCES "public"."guilds"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_active_characters"
    ADD CONSTRAINT "user_active_characters_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Anyone can view active invite codes" ON "public"."guild_invite_codes" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Attendance is viewable by everyone" ON "public"."attendance_records" FOR SELECT USING (true);



CREATE POLICY "Authenticated users can create guilds" ON "public"."guilds" FOR INSERT WITH CHECK (("auth"."uid"() = "created_by"));



CREATE POLICY "Authenticated users can insert own audit logs" ON "public"."audit_logs" FOR INSERT WITH CHECK ((("user_id" = "auth"."uid"()) AND ((("guild_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM ("public"."character_guild_memberships" "cgm"
     JOIN "public"."characters" "c" ON (("c"."id" = "cgm"."character_id")))
  WHERE (("cgm"."guild_id" = "audit_logs"."guild_id") AND ("c"."user_id" = "auth"."uid"()) AND ("cgm"."is_active" = true))))) OR (("guild_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."guilds"
  WHERE (("guilds"."id" = "audit_logs"."guild_id") AND ("guilds"."created_by" = "auth"."uid"()))))) OR ("guild_id" IS NULL))));



CREATE POLICY "Authenticated users can view loot item classes" ON "public"."loot_item_classes" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Class specs are viewable by everyone" ON "public"."class_specs" FOR SELECT USING (true);



CREATE POLICY "Classes are viewable by everyone" ON "public"."wow_classes" FOR SELECT USING (true);



CREATE POLICY "Expansions are viewable by everyone" ON "public"."expansions" FOR SELECT USING (true);



CREATE POLICY "Guild Master can insert guild settings" ON "public"."guild_settings" FOR INSERT WITH CHECK ("public"."is_guild_master"("guild_id"));



CREATE POLICY "Guild members can view BLP" ON "public"."blp_tracking" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM ("public"."character_guild_memberships" "cgm"
     JOIN "public"."characters" "c" ON (("c"."id" = "cgm"."character_id")))
  WHERE (("cgm"."guild_id" = "blp_tracking"."guild_id") AND ("c"."user_id" = "auth"."uid"()) AND ("cgm"."is_active" = true)))) OR (EXISTS ( SELECT 1
   FROM "public"."guilds" "g"
  WHERE (("g"."id" = "blp_tracking"."guild_id") AND ("g"."created_by" = "auth"."uid"()))))));



CREATE POLICY "Guild members can view BLP credits" ON "public"."blp_credits" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."character_guild_memberships" "cgm"
     JOIN "public"."characters" "c" ON (("c"."id" = "cgm"."character_id")))
  WHERE (("cgm"."guild_id" = "blp_credits"."guild_id") AND ("c"."user_id" = "auth"."uid"()) AND ("cgm"."is_active" = true)))));



CREATE POLICY "Guild members can view expansions" ON "public"."expansions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."character_guild_memberships" "cgm"
     JOIN "public"."characters" "c" ON (("c"."id" = "cgm"."character_id")))
  WHERE (("cgm"."guild_id" = "expansions"."guild_id") AND ("c"."user_id" = "auth"."uid"()) AND ("cgm"."is_active" = true)))));



CREATE POLICY "Guild members can view guild characters" ON "public"."characters" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."character_guild_memberships" "cgm"
  WHERE (("cgm"."character_id" = "characters"."id") AND ("cgm"."is_active" = true) AND ("cgm"."guild_id" IN ( SELECT "public"."get_current_user_guild_ids"() AS "get_current_user_guild_ids"))))));



CREATE POLICY "Guild members can view guild memberships" ON "public"."character_guild_memberships" FOR SELECT USING (("guild_id" IN ( SELECT "public"."get_user_guild_ids"("auth"."uid"()) AS "get_user_guild_ids")));



CREATE POLICY "Guild members can view guild roles" ON "public"."guild_roles" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."character_guild_memberships" "cgm"
     JOIN "public"."characters" "c" ON (("c"."id" = "cgm"."character_id")))
  WHERE (("cgm"."guild_id" = "guild_roles"."guild_id") AND ("c"."user_id" = "auth"."uid"()) AND ("cgm"."is_active" = true)))));



CREATE POLICY "Guild members can view guild submissions" ON "public"."loot_submissions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."character_guild_memberships" "cgm"
     JOIN "public"."characters" "c" ON (("c"."id" = "cgm"."character_id")))
  WHERE (("c"."user_id" = "auth"."uid"()) AND ("cgm"."guild_id" = "loot_submissions"."guild_id")))));



CREATE POLICY "Guild members can view loot history" ON "public"."loot_history" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM ("public"."character_guild_memberships" "cgm"
     JOIN "public"."characters" "c" ON (("c"."id" = "cgm"."character_id")))
  WHERE (("cgm"."guild_id" = "loot_history"."guild_id") AND ("c"."user_id" = "auth"."uid"()) AND ("cgm"."is_active" = true)))) OR (EXISTS ( SELECT 1
   FROM "public"."guilds" "g"
  WHERE (("g"."id" = "loot_history"."guild_id") AND ("g"."created_by" = "auth"."uid"()))))));



CREATE POLICY "Guild members can view raid tiers" ON "public"."raid_tiers" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (("public"."expansions" "e"
     JOIN "public"."character_guild_memberships" "cgm" ON (("cgm"."guild_id" = "e"."guild_id")))
     JOIN "public"."characters" "c" ON (("c"."id" = "cgm"."character_id")))
  WHERE (("e"."id" = "raid_tiers"."expansion_id") AND ("c"."user_id" = "auth"."uid"()) AND ("cgm"."is_active" = true)))));



CREATE POLICY "Guild members can view submitting characters" ON "public"."characters" FOR SELECT USING ("public"."character_has_submission_to_user_guilds"("id"));



CREATE POLICY "Guild members can view their guild settings" ON "public"."guild_settings" FOR SELECT USING ("public"."user_is_in_guild"("auth"."uid"(), "guild_id"));



CREATE POLICY "Guilds are viewable by everyone" ON "public"."guilds" FOR SELECT USING (true);



CREATE POLICY "Loot deadlines are viewable by everyone" ON "public"."loot_deadlines" FOR SELECT USING (true);



CREATE POLICY "Loot item classes are viewable by everyone" ON "public"."loot_item_classes" FOR SELECT USING (true);



CREATE POLICY "Loot items are viewable by everyone" ON "public"."loot_items" FOR SELECT USING (true);



CREATE POLICY "Members can view raid tiers for their guild" ON "public"."raid_tiers" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM (("public"."expansions" "e"
     JOIN "public"."character_guild_memberships" "cgm" ON (("cgm"."guild_id" = "e"."guild_id")))
     JOIN "public"."characters" "c" ON (("c"."id" = "cgm"."character_id")))
  WHERE (("e"."id" = "raid_tiers"."expansion_id") AND ("c"."user_id" = "auth"."uid"()) AND ("cgm"."is_active" = true)))) OR (EXISTS ( SELECT 1
   FROM ("public"."expansions" "e"
     JOIN "public"."guilds" "g" ON (("g"."id" = "e"."guild_id")))
  WHERE (("e"."id" = "raid_tiers"."expansion_id") AND ("g"."created_by" = "auth"."uid"()))))));



CREATE POLICY "Officers can create guild roles" ON "public"."guild_roles" FOR INSERT WITH CHECK ("public"."is_guild_officer"("guild_id"));



CREATE POLICY "Officers can delete BLP" ON "public"."blp_tracking" FOR DELETE USING ("public"."is_guild_officer"("guild_id"));



CREATE POLICY "Officers can delete BLP credits" ON "public"."blp_credits" FOR DELETE USING ("public"."is_guild_officer"("guild_id"));



CREATE POLICY "Officers can delete expansions" ON "public"."expansions" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM (("public"."character_guild_memberships" "cgm"
     JOIN "public"."characters" "c" ON (("c"."id" = "cgm"."character_id")))
     JOIN "public"."guild_roles" "gr" ON ((("gr"."guild_id" = "cgm"."guild_id") AND (("gr"."name")::"text" = ("cgm"."role")::"text"))))
  WHERE (("cgm"."guild_id" = "expansions"."guild_id") AND ("c"."user_id" = "auth"."uid"()) AND ("gr"."position" >= 50)))));



CREATE POLICY "Officers can delete guild roles" ON "public"."guild_roles" FOR DELETE USING ((("is_default" = false) AND "public"."is_guild_officer"("guild_id")));



CREATE POLICY "Officers can delete loot history" ON "public"."loot_history" FOR DELETE USING ("public"."is_guild_officer"("guild_id"));



CREATE POLICY "Officers can delete loot item classes" ON "public"."loot_item_classes" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM (("public"."loot_items" "li"
     JOIN "public"."raid_tiers" "rt" ON (("rt"."id" = "li"."raid_tier_id")))
     JOIN "public"."expansions" "e" ON (("e"."id" = "rt"."expansion_id")))
  WHERE (("li"."id" = "loot_item_classes"."loot_item_id") AND "public"."is_guild_officer"("e"."guild_id")))));



CREATE POLICY "Officers can delete raid tiers" ON "public"."raid_tiers" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."expansions" "e"
  WHERE (("e"."id" = "raid_tiers"."expansion_id") AND "public"."is_guild_officer"("e"."guild_id")))));



CREATE POLICY "Officers can insert BLP" ON "public"."blp_tracking" FOR INSERT WITH CHECK ("public"."is_guild_officer"("guild_id"));



CREATE POLICY "Officers can insert BLP credits" ON "public"."blp_credits" FOR INSERT WITH CHECK ("public"."is_guild_officer"("guild_id"));



CREATE POLICY "Officers can insert expansions" ON "public"."expansions" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (("public"."character_guild_memberships" "cgm"
     JOIN "public"."characters" "c" ON (("c"."id" = "cgm"."character_id")))
     JOIN "public"."guild_roles" "gr" ON ((("gr"."guild_id" = "cgm"."guild_id") AND (("gr"."name")::"text" = ("cgm"."role")::"text"))))
  WHERE (("cgm"."guild_id" = "expansions"."guild_id") AND ("c"."user_id" = "auth"."uid"()) AND ("gr"."position" >= 50)))));



CREATE POLICY "Officers can insert loot history" ON "public"."loot_history" FOR INSERT WITH CHECK ("public"."is_guild_officer"("guild_id"));



CREATE POLICY "Officers can insert loot item classes" ON "public"."loot_item_classes" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (("public"."loot_items" "li"
     JOIN "public"."raid_tiers" "rt" ON (("rt"."id" = "li"."raid_tier_id")))
     JOIN "public"."expansions" "e" ON (("e"."id" = "rt"."expansion_id")))
  WHERE (("li"."id" = "loot_item_classes"."loot_item_id") AND "public"."is_guild_officer"("e"."guild_id")))));



CREATE POLICY "Officers can insert raid tiers" ON "public"."raid_tiers" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."expansions" "e"
  WHERE (("e"."id" = "raid_tiers"."expansion_id") AND "public"."is_guild_officer"("e"."guild_id")))));



CREATE POLICY "Officers can manage guild characters' equipped items" ON "public"."character_equipped_items" USING ((EXISTS ( SELECT 1
   FROM "public"."character_guild_memberships" "cgm"
  WHERE (("cgm"."character_id" = "character_equipped_items"."character_id") AND "public"."is_guild_officer"("cgm"."guild_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."character_guild_memberships" "cgm"
  WHERE (("cgm"."character_id" = "character_equipped_items"."character_id") AND "public"."is_guild_officer"("cgm"."guild_id")))));



CREATE POLICY "Officers can manage submissions" ON "public"."loot_submissions" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM (("public"."character_guild_memberships" "cgm"
     JOIN "public"."characters" "c" ON (("c"."id" = "cgm"."character_id")))
     JOIN "public"."guild_roles" "gr" ON ((("gr"."guild_id" = "cgm"."guild_id") AND (("gr"."name")::"text" = ("cgm"."role")::"text"))))
  WHERE (("c"."user_id" = "auth"."uid"()) AND ("cgm"."guild_id" = "loot_submissions"."guild_id") AND ("gr"."position" >= 50)))));



CREATE POLICY "Officers can update BLP" ON "public"."blp_tracking" FOR UPDATE USING ("public"."is_guild_officer"("guild_id")) WITH CHECK ("public"."is_guild_officer"("guild_id"));



CREATE POLICY "Officers can update BLP credits" ON "public"."blp_credits" FOR UPDATE USING ("public"."is_guild_officer"("guild_id")) WITH CHECK ("public"."is_guild_officer"("guild_id"));



CREATE POLICY "Officers can update expansions" ON "public"."expansions" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM (("public"."character_guild_memberships" "cgm"
     JOIN "public"."characters" "c" ON (("c"."id" = "cgm"."character_id")))
     JOIN "public"."guild_roles" "gr" ON ((("gr"."guild_id" = "cgm"."guild_id") AND (("gr"."name")::"text" = ("cgm"."role")::"text"))))
  WHERE (("cgm"."guild_id" = "expansions"."guild_id") AND ("c"."user_id" = "auth"."uid"()) AND ("gr"."position" >= 50)))));



CREATE POLICY "Officers can update guild roles" ON "public"."guild_roles" FOR UPDATE USING ("public"."is_guild_officer"("guild_id"));



CREATE POLICY "Officers can update guild settings" ON "public"."guild_settings" FOR UPDATE USING ("public"."user_is_officer_in_guild"("auth"."uid"(), "guild_id")) WITH CHECK ("public"."user_is_officer_in_guild"("auth"."uid"(), "guild_id"));



CREATE POLICY "Officers can update guild settings" ON "public"."guilds" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM (("public"."character_guild_memberships" "cgm"
     JOIN "public"."characters" "c" ON (("c"."id" = "cgm"."character_id")))
     JOIN "public"."guild_roles" "gr" ON ((("gr"."guild_id" = "cgm"."guild_id") AND (("gr"."name")::"text" = ("cgm"."role")::"text"))))
  WHERE (("cgm"."guild_id" = "guilds"."id") AND ("c"."user_id" = "auth"."uid"()) AND ("cgm"."is_active" = true) AND ("gr"."position" >= 50))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (("public"."character_guild_memberships" "cgm"
     JOIN "public"."characters" "c" ON (("c"."id" = "cgm"."character_id")))
     JOIN "public"."guild_roles" "gr" ON ((("gr"."guild_id" = "cgm"."guild_id") AND (("gr"."name")::"text" = ("cgm"."role")::"text"))))
  WHERE (("cgm"."guild_id" = "guilds"."id") AND ("c"."user_id" = "auth"."uid"()) AND ("cgm"."is_active" = true) AND ("gr"."position" >= 50)))));



CREATE POLICY "Officers can update loot history" ON "public"."loot_history" FOR UPDATE USING ("public"."is_guild_officer"("guild_id")) WITH CHECK ("public"."is_guild_officer"("guild_id"));



CREATE POLICY "Officers can update loot item classes" ON "public"."loot_item_classes" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM (("public"."loot_items" "li"
     JOIN "public"."raid_tiers" "rt" ON (("rt"."id" = "li"."raid_tier_id")))
     JOIN "public"."expansions" "e" ON (("e"."id" = "rt"."expansion_id")))
  WHERE (("li"."id" = "loot_item_classes"."loot_item_id") AND "public"."is_guild_officer"("e"."guild_id")))));



CREATE POLICY "Officers can update raid tiers" ON "public"."raid_tiers" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."expansions" "e"
  WHERE (("e"."id" = "raid_tiers"."expansion_id") AND "public"."is_guild_officer"("e"."guild_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."expansions" "e"
  WHERE (("e"."id" = "raid_tiers"."expansion_id") AND "public"."is_guild_officer"("e"."guild_id")))));



CREATE POLICY "Officers can view guild audit logs" ON "public"."audit_logs" FOR SELECT USING (((("guild_id" IS NOT NULL) AND "public"."is_guild_officer"("guild_id")) OR (("guild_id" IS NULL) AND ("user_id" = "auth"."uid"()))));



CREATE POLICY "Profiles are viewable by everyone" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Raid events are viewable by everyone" ON "public"."raid_events" FOR SELECT USING (true);



CREATE POLICY "Raid tiers are viewable by everyone" ON "public"."raid_tiers" FOR SELECT USING (true);



CREATE POLICY "Users can create own submissions" ON "public"."loot_submissions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own active character" ON "public"."user_active_characters" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own battlenet account" ON "public"."battlenet_accounts" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own character memberships" ON "public"."character_guild_memberships" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."characters"
  WHERE (("characters"."id" = "character_guild_memberships"."character_id") AND ("characters"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can delete own characters" ON "public"."characters" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can delete own sync tokens" ON "public"."addon_sync_tokens" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert own active character" ON "public"."user_active_characters" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own battlenet account" ON "public"."battlenet_accounts" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own character memberships" ON "public"."character_guild_memberships" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."characters"
  WHERE (("characters"."id" = "character_guild_memberships"."character_id") AND ("characters"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert own characters" ON "public"."characters" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert own preferences" ON "public"."user_preferences" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own submission items" ON "public"."loot_submission_items" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."loot_submissions" "ls"
     JOIN "public"."characters" "c" ON (("c"."id" = "ls"."character_id")))
  WHERE (("ls"."id" = "loot_submission_items"."submission_id") AND ("c"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can manage own submission items" ON "public"."loot_submission_items" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."loot_submissions"
  WHERE (("loot_submissions"."id" = "loot_submission_items"."submission_id") AND ("loot_submissions"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can manage their own characters' equipped items" ON "public"."character_equipped_items" USING ((EXISTS ( SELECT 1
   FROM "public"."characters" "c"
  WHERE (("c"."id" = "character_equipped_items"."character_id") AND ("c"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."characters" "c"
  WHERE (("c"."id" = "character_equipped_items"."character_id") AND ("c"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update own active character" ON "public"."user_active_characters" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own battlenet account" ON "public"."battlenet_accounts" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own character memberships" ON "public"."character_guild_memberships" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."characters"
  WHERE (("characters"."id" = "character_guild_memberships"."character_id") AND ("characters"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update own characters" ON "public"."characters" FOR UPDATE USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update own preferences" ON "public"."user_preferences" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own submissions" ON "public"."loot_submissions" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view all submission items" ON "public"."loot_submission_items" FOR SELECT USING (true);



CREATE POLICY "Users can view all submissions" ON "public"."loot_submissions" FOR SELECT USING (true);



CREATE POLICY "Users can view equipped items for guild characters" ON "public"."character_equipped_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ((("public"."characters" "c"
     JOIN "public"."character_guild_memberships" "cgm" ON (("cgm"."character_id" = "c"."id")))
     JOIN "public"."character_guild_memberships" "my_cgm" ON (("my_cgm"."guild_id" = "cgm"."guild_id")))
     JOIN "public"."characters" "my_c" ON (("my_c"."id" = "my_cgm"."character_id")))
  WHERE (("c"."id" = "character_equipped_items"."character_id") AND ("my_c"."user_id" = "auth"."uid"()) AND ("my_cgm"."is_active" = true)))));



CREATE POLICY "Users can view own active character" ON "public"."user_active_characters" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own battlenet account" ON "public"."battlenet_accounts" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own character memberships" ON "public"."character_guild_memberships" FOR SELECT USING ("public"."character_belongs_to_user"("character_id"));



CREATE POLICY "Users can view own character submissions" ON "public"."loot_submissions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."characters" "c"
  WHERE (("c"."id" = "loot_submissions"."character_id") AND ("c"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view own characters" ON "public"."characters" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view own preferences" ON "public"."user_preferences" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own sync tokens" ON "public"."addon_sync_tokens" FOR SELECT USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."addon_sync_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."attendance_records" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "attendance_records_delete" ON "public"."attendance_records" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."raid_events" "re"
  WHERE (("re"."id" = "attendance_records"."raid_event_id") AND "public"."is_guild_officer"("re"."guild_id")))));



CREATE POLICY "attendance_records_insert" ON "public"."attendance_records" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."raid_events" "re"
  WHERE (("re"."id" = "attendance_records"."raid_event_id") AND "public"."is_guild_officer"("re"."guild_id")))));



CREATE POLICY "attendance_records_select" ON "public"."attendance_records" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM (("public"."raid_events" "re"
     JOIN "public"."character_guild_memberships" "cgm" ON (("cgm"."guild_id" = "re"."guild_id")))
     JOIN "public"."characters" "c" ON (("c"."id" = "cgm"."character_id")))
  WHERE (("re"."id" = "attendance_records"."raid_event_id") AND ("c"."user_id" = "auth"."uid"()) AND ("cgm"."is_active" = true)))) OR (EXISTS ( SELECT 1
   FROM ("public"."raid_events" "re"
     JOIN "public"."guilds" "g" ON (("g"."id" = "re"."guild_id")))
  WHERE (("re"."id" = "attendance_records"."raid_event_id") AND ("g"."created_by" = "auth"."uid"()))))));



CREATE POLICY "attendance_records_update" ON "public"."attendance_records" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."raid_events" "re"
  WHERE (("re"."id" = "attendance_records"."raid_event_id") AND "public"."is_guild_officer"("re"."guild_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."raid_events" "re"
  WHERE (("re"."id" = "attendance_records"."raid_event_id") AND "public"."is_guild_officer"("re"."guild_id")))));



ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."battlenet_accounts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."blp_credits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."blp_tracking" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."character_aliases" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "character_aliases_delete" ON "public"."character_aliases" FOR DELETE USING ("public"."is_guild_officer"("guild_id"));



CREATE POLICY "character_aliases_insert" ON "public"."character_aliases" FOR INSERT WITH CHECK ("public"."is_guild_officer"("guild_id"));



CREATE POLICY "character_aliases_select" ON "public"."character_aliases" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM ("public"."character_guild_memberships" "cgm"
     JOIN "public"."characters" "c" ON (("c"."id" = "cgm"."character_id")))
  WHERE (("cgm"."guild_id" = "character_aliases"."guild_id") AND ("c"."user_id" = "auth"."uid"()) AND ("cgm"."is_active" = true)))) OR (EXISTS ( SELECT 1
   FROM "public"."guilds" "g"
  WHERE (("g"."id" = "character_aliases"."guild_id") AND ("g"."created_by" = "auth"."uid"()))))));



CREATE POLICY "character_aliases_update" ON "public"."character_aliases" FOR UPDATE USING ("public"."is_guild_officer"("guild_id")) WITH CHECK ("public"."is_guild_officer"("guild_id"));



ALTER TABLE "public"."character_equipped_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."character_guild_memberships" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."characters" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."class_specs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."discord_feedback_map" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."donation_records" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "donation_records_delete" ON "public"."donation_records" FOR DELETE USING ("public"."is_guild_officer"("guild_id"));



CREATE POLICY "donation_records_insert" ON "public"."donation_records" FOR INSERT WITH CHECK ("public"."is_guild_officer"("guild_id"));



CREATE POLICY "donation_records_select" ON "public"."donation_records" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."character_guild_memberships" "cgm"
     JOIN "public"."characters" "c" ON (("c"."id" = "cgm"."character_id")))
  WHERE (("cgm"."guild_id" = "donation_records"."guild_id") AND ("c"."user_id" = "auth"."uid"()) AND ("cgm"."is_active" = true)))));



CREATE POLICY "donation_records_update" ON "public"."donation_records" FOR UPDATE USING ("public"."is_guild_officer"("guild_id")) WITH CHECK ("public"."is_guild_officer"("guild_id"));



ALTER TABLE "public"."expansions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."guild_invite_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."guild_item_priorities" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "guild_item_priorities_delete" ON "public"."guild_item_priorities" FOR DELETE USING ("public"."is_guild_officer"("guild_id"));



CREATE POLICY "guild_item_priorities_insert" ON "public"."guild_item_priorities" FOR INSERT WITH CHECK ("public"."is_guild_officer"("guild_id"));



CREATE POLICY "guild_item_priorities_select" ON "public"."guild_item_priorities" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM ("public"."character_guild_memberships" "cgm"
     JOIN "public"."characters" "c" ON (("c"."id" = "cgm"."character_id")))
  WHERE (("cgm"."guild_id" = "guild_item_priorities"."guild_id") AND ("c"."user_id" = "auth"."uid"()) AND ("cgm"."is_active" = true)))) OR (EXISTS ( SELECT 1
   FROM "public"."guilds" "g"
  WHERE (("g"."id" = "guild_item_priorities"."guild_id") AND ("g"."created_by" = "auth"."uid"()))))));



CREATE POLICY "guild_item_priorities_update" ON "public"."guild_item_priorities" FOR UPDATE USING ("public"."is_guild_officer"("guild_id")) WITH CHECK ("public"."is_guild_officer"("guild_id"));



ALTER TABLE "public"."guild_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."guild_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."guilds" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."loot_deadlines" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."loot_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."loot_item_classes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."loot_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "loot_items_delete" ON "public"."loot_items" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM ("public"."raid_tiers" "rt"
     JOIN "public"."expansions" "e" ON (("e"."id" = "rt"."expansion_id")))
  WHERE (("rt"."id" = "loot_items"."raid_tier_id") AND "public"."is_guild_officer"("e"."guild_id")))));



CREATE POLICY "loot_items_insert" ON "public"."loot_items" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."raid_tiers" "rt"
     JOIN "public"."expansions" "e" ON (("e"."id" = "rt"."expansion_id")))
  WHERE (("rt"."id" = "loot_items"."raid_tier_id") AND "public"."is_guild_officer"("e"."guild_id")))));



CREATE POLICY "loot_items_select" ON "public"."loot_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ((("public"."raid_tiers" "rt"
     JOIN "public"."expansions" "e" ON (("rt"."expansion_id" = "e"."id")))
     JOIN "public"."character_guild_memberships" "cgm" ON (("cgm"."guild_id" = "e"."guild_id")))
     JOIN "public"."characters" "c" ON (("c"."id" = "cgm"."character_id")))
  WHERE (("rt"."id" = "loot_items"."raid_tier_id") AND ("c"."user_id" = "auth"."uid"()) AND ("cgm"."is_active" = true)))));



CREATE POLICY "loot_items_update" ON "public"."loot_items" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM ("public"."raid_tiers" "rt"
     JOIN "public"."expansions" "e" ON (("e"."id" = "rt"."expansion_id")))
  WHERE (("rt"."id" = "loot_items"."raid_tier_id") AND "public"."is_guild_officer"("e"."guild_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."raid_tiers" "rt"
     JOIN "public"."expansions" "e" ON (("e"."id" = "rt"."expansion_id")))
  WHERE (("rt"."id" = "loot_items"."raid_tier_id") AND "public"."is_guild_officer"("e"."guild_id")))));



ALTER TABLE "public"."loot_submission_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "loot_submission_items_delete" ON "public"."loot_submission_items" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM ("public"."loot_submissions" "ls"
     JOIN "public"."characters" "c" ON (("c"."id" = "ls"."character_id")))
  WHERE (("ls"."id" = "loot_submission_items"."submission_id") AND ("c"."user_id" = "auth"."uid"())))));



CREATE POLICY "loot_submission_items_insert" ON "public"."loot_submission_items" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."loot_submissions" "ls"
     JOIN "public"."characters" "c" ON (("c"."id" = "ls"."character_id")))
  WHERE (("ls"."id" = "loot_submission_items"."submission_id") AND ("c"."user_id" = "auth"."uid"())))));



CREATE POLICY "loot_submission_items_select" ON "public"."loot_submission_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (("public"."loot_submissions" "ls"
     JOIN "public"."character_guild_memberships" "cgm" ON (("cgm"."guild_id" = "ls"."guild_id")))
     JOIN "public"."characters" "c" ON (("c"."id" = "cgm"."character_id")))
  WHERE (("ls"."id" = "loot_submission_items"."submission_id") AND ("c"."user_id" = "auth"."uid"()) AND ("cgm"."is_active" = true)))));



CREATE POLICY "loot_submission_items_update" ON "public"."loot_submission_items" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM ("public"."loot_submissions" "ls"
     JOIN "public"."characters" "c" ON (("c"."id" = "ls"."character_id")))
  WHERE (("ls"."id" = "loot_submission_items"."submission_id") AND ("c"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."loot_submissions" "ls"
     JOIN "public"."characters" "c" ON (("c"."id" = "ls"."character_id")))
  WHERE (("ls"."id" = "loot_submission_items"."submission_id") AND ("c"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."loot_submission_snapshots" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "loot_submission_snapshots_insert" ON "public"."loot_submission_snapshots" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."loot_submissions" "ls"
     JOIN "public"."characters" "c" ON (("c"."id" = "ls"."character_id")))
  WHERE (("ls"."id" = "loot_submission_snapshots"."submission_id") AND ("c"."user_id" = "auth"."uid"())))));



CREATE POLICY "loot_submission_snapshots_select" ON "public"."loot_submission_snapshots" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (("public"."loot_submissions" "ls"
     JOIN "public"."character_guild_memberships" "cgm" ON (("cgm"."guild_id" = "ls"."guild_id")))
     JOIN "public"."characters" "c" ON (("c"."id" = "cgm"."character_id")))
  WHERE (("ls"."id" = "loot_submission_snapshots"."submission_id") AND ("c"."user_id" = "auth"."uid"()) AND ("cgm"."is_active" = true)))));



ALTER TABLE "public"."loot_submissions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "loot_submissions_delete" ON "public"."loot_submissions" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."characters" "c"
  WHERE (("c"."id" = "loot_submissions"."character_id") AND ("c"."user_id" = "auth"."uid"())))));



CREATE POLICY "loot_submissions_insert" ON "public"."loot_submissions" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."characters" "c"
  WHERE (("c"."id" = "loot_submissions"."character_id") AND ("c"."user_id" = "auth"."uid"())))));



CREATE POLICY "loot_submissions_select" ON "public"."loot_submissions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."character_guild_memberships" "cgm"
     JOIN "public"."characters" "c" ON (("c"."id" = "cgm"."character_id")))
  WHERE (("cgm"."guild_id" = "loot_submissions"."guild_id") AND ("c"."user_id" = "auth"."uid"()) AND ("cgm"."is_active" = true)))));



CREATE POLICY "loot_submissions_update" ON "public"."loot_submissions" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM "public"."characters" "c"
  WHERE (("c"."id" = "loot_submissions"."character_id") AND ("c"."user_id" = "auth"."uid"())))) OR "public"."is_guild_officer"("guild_id"))) WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."characters" "c"
  WHERE (("c"."id" = "loot_submissions"."character_id") AND ("c"."user_id" = "auth"."uid"())))) OR "public"."is_guild_officer"("guild_id")));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."raid_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "raid_events_delete" ON "public"."raid_events" FOR DELETE USING ("public"."is_guild_officer"("guild_id"));



CREATE POLICY "raid_events_insert" ON "public"."raid_events" FOR INSERT WITH CHECK ("public"."is_guild_officer"("guild_id"));



CREATE POLICY "raid_events_select" ON "public"."raid_events" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM ("public"."character_guild_memberships" "cgm"
     JOIN "public"."characters" "c" ON (("c"."id" = "cgm"."character_id")))
  WHERE (("cgm"."guild_id" = "raid_events"."guild_id") AND ("c"."user_id" = "auth"."uid"()) AND ("cgm"."is_active" = true)))) OR (EXISTS ( SELECT 1
   FROM "public"."guilds" "g"
  WHERE (("g"."id" = "raid_events"."guild_id") AND ("g"."created_by" = "auth"."uid"()))))));



CREATE POLICY "raid_events_update" ON "public"."raid_events" FOR UPDATE USING ("public"."is_guild_officer"("guild_id")) WITH CHECK ("public"."is_guild_officer"("guild_id"));



ALTER TABLE "public"."raid_team_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "raid_team_members_delete" ON "public"."raid_team_members" FOR DELETE USING ("public"."is_guild_officer"("guild_id"));



CREATE POLICY "raid_team_members_insert" ON "public"."raid_team_members" FOR INSERT WITH CHECK ("public"."is_guild_officer"("guild_id"));



CREATE POLICY "raid_team_members_select" ON "public"."raid_team_members" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."character_guild_memberships" "cgm"
     JOIN "public"."characters" "c" ON (("c"."id" = "cgm"."character_id")))
  WHERE (("cgm"."guild_id" = "raid_team_members"."guild_id") AND ("c"."user_id" = "auth"."uid"()) AND ("cgm"."is_active" = true)))));



CREATE POLICY "raid_team_members_update" ON "public"."raid_team_members" FOR UPDATE USING ("public"."is_guild_officer"("guild_id")) WITH CHECK ("public"."is_guild_officer"("guild_id"));



ALTER TABLE "public"."raid_teams" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "raid_teams_delete" ON "public"."raid_teams" FOR DELETE USING ("public"."is_guild_officer"("guild_id"));



CREATE POLICY "raid_teams_insert" ON "public"."raid_teams" FOR INSERT WITH CHECK ("public"."is_guild_officer"("guild_id"));



CREATE POLICY "raid_teams_select" ON "public"."raid_teams" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."character_guild_memberships" "cgm"
     JOIN "public"."characters" "c" ON (("c"."id" = "cgm"."character_id")))
  WHERE (("cgm"."guild_id" = "raid_teams"."guild_id") AND ("c"."user_id" = "auth"."uid"()) AND ("cgm"."is_active" = true)))));



CREATE POLICY "raid_teams_update" ON "public"."raid_teams" FOR UPDATE USING ("public"."is_guild_officer"("guild_id")) WITH CHECK ("public"."is_guild_officer"("guild_id"));



ALTER TABLE "public"."raid_tiers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reserve_audit_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "reserve_audit_log_select" ON "public"."reserve_audit_log" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (("public"."reserve_runs" "rr"
     JOIN "public"."character_guild_memberships" "cgm" ON (("cgm"."guild_id" = "rr"."guild_id")))
     JOIN "public"."characters" "c" ON (("c"."id" = "cgm"."character_id")))
  WHERE (("rr"."id" = "reserve_audit_log"."reserve_run_id") AND ("c"."user_id" = "auth"."uid"()) AND ("cgm"."is_active" = true)))));



ALTER TABLE "public"."reserve_awards" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "reserve_awards_delete" ON "public"."reserve_awards" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."reserve_runs" "rr"
  WHERE (("rr"."id" = "reserve_awards"."reserve_run_id") AND "public"."is_guild_officer"("rr"."guild_id")))));



CREATE POLICY "reserve_awards_insert" ON "public"."reserve_awards" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."reserve_runs" "rr"
  WHERE (("rr"."id" = "reserve_awards"."reserve_run_id") AND "public"."is_guild_officer"("rr"."guild_id")))));



CREATE POLICY "reserve_awards_select" ON "public"."reserve_awards" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (("public"."reserve_runs" "rr"
     JOIN "public"."character_guild_memberships" "cgm" ON (("cgm"."guild_id" = "rr"."guild_id")))
     JOIN "public"."characters" "c" ON (("c"."id" = "cgm"."character_id")))
  WHERE (("rr"."id" = "reserve_awards"."reserve_run_id") AND ("c"."user_id" = "auth"."uid"()) AND ("cgm"."is_active" = true)))));



ALTER TABLE "public"."reserve_runs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "reserve_runs_delete" ON "public"."reserve_runs" FOR DELETE USING ((("created_by" = "auth"."uid"()) OR (("guild_id" IS NOT NULL) AND "public"."is_guild_officer"("guild_id"))));



CREATE POLICY "reserve_runs_insert" ON "public"."reserve_runs" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "reserve_runs_select" ON "public"."reserve_runs" FOR SELECT USING ((("created_by" = "auth"."uid"()) OR (("guild_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM ("public"."character_guild_memberships" "cgm"
     JOIN "public"."characters" "c" ON (("c"."id" = "cgm"."character_id")))
  WHERE (("cgm"."guild_id" = "reserve_runs"."guild_id") AND ("c"."user_id" = "auth"."uid"()) AND ("cgm"."is_active" = true)))))));



CREATE POLICY "reserve_runs_update" ON "public"."reserve_runs" FOR UPDATE USING ((("created_by" = "auth"."uid"()) OR (("guild_id" IS NOT NULL) AND "public"."is_guild_officer"("guild_id"))));



ALTER TABLE "public"."reserve_submissions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "reserve_submissions_select" ON "public"."reserve_submissions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (("public"."reserve_runs" "rr"
     JOIN "public"."character_guild_memberships" "cgm" ON (("cgm"."guild_id" = "rr"."guild_id")))
     JOIN "public"."characters" "c" ON (("c"."id" = "cgm"."character_id")))
  WHERE (("rr"."id" = "reserve_submissions"."reserve_run_id") AND ("c"."user_id" = "auth"."uid"()) AND ("cgm"."is_active" = true)))));



ALTER TABLE "public"."user_active_characters" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."wow_classes" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."can_view_master_sheet"("p_raid_tier_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_view_master_sheet"("p_raid_tier_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_view_master_sheet"("p_raid_tier_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."character_belongs_to_user"("p_character_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."character_belongs_to_user"("p_character_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."character_belongs_to_user"("p_character_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."character_has_submission_to_user_guilds"("p_character_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."character_has_submission_to_user_guilds"("p_character_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."character_has_submission_to_user_guilds"("p_character_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_max_roles_per_guild"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_max_roles_per_guild"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_max_roles_per_guild"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_default_guild_roles"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_default_guild_roles"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_default_guild_roles"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_expansion_for_guild"("p_guild_id" "uuid", "p_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_expansion_for_guild"("p_guild_id" "uuid", "p_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_expansion_for_guild"("p_guild_id" "uuid", "p_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_user_preferences"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_user_preferences"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_user_preferences"() TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_guild"("p_guild_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_guild"("p_guild_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_guild"("p_guild_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_invite_code"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_invite_code"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_invite_code"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_reserve_leader_token"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_reserve_leader_token"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_reserve_leader_token"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_reserve_token"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_reserve_token"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_reserve_token"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_character_guilds"("p_character_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_character_guilds"("p_character_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_character_guilds"("p_character_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_user_guild_ids"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_user_guild_ids"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_user_guild_ids"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_guild_current_expansion"("p_guild_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_guild_current_expansion"("p_guild_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_guild_current_expansion"("p_guild_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_guild_expansions"("p_guild_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_guild_expansions"("p_guild_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_guild_expansions"("p_guild_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_guild_submissions"("p_guild_id" "uuid", "p_raid_tier_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_guild_submissions"("p_guild_id" "uuid", "p_raid_tier_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_guild_submissions"("p_guild_id" "uuid", "p_raid_tier_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_characters_in_guild"("p_user_id" "uuid", "p_guild_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_characters_in_guild"("p_user_id" "uuid", "p_guild_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_characters_in_guild"("p_user_id" "uuid", "p_guild_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_guild_ids"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_guild_ids"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_guild_ids"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_blp"("p_guild_id" "uuid", "p_character_id" "uuid", "p_loot_item_id" "uuid", "p_raid_event_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_blp"("p_guild_id" "uuid", "p_character_id" "uuid", "p_loot_item_id" "uuid", "p_raid_event_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_blp"("p_guild_id" "uuid", "p_character_id" "uuid", "p_loot_item_id" "uuid", "p_raid_event_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_blp_bulk"("p_guild_id" "uuid", "p_loot_item_id" "uuid", "p_raid_event_id" "uuid", "p_character_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."increment_blp_bulk"("p_guild_id" "uuid", "p_loot_item_id" "uuid", "p_raid_event_id" "uuid", "p_character_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_blp_bulk"("p_guild_id" "uuid", "p_loot_item_id" "uuid", "p_raid_event_id" "uuid", "p_character_ids" "uuid"[]) TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_guild_master"("target_guild_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_guild_master"("target_guild_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_guild_master"("target_guild_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_guild_master"("target_guild_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_guild_officer"("target_guild_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_guild_officer"("target_guild_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_guild_officer"("target_guild_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_guild_officer"("target_guild_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_invite_code_valid"("code_input" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."is_invite_code_valid"("code_input" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_invite_code_valid"("code_input" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."is_officer_of_guild"("user_id_to_check" "uuid", "guild_id_to_check" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_officer_of_guild"("user_id_to_check" "uuid", "guild_id_to_check" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_officer_of_guild"("user_id_to_check" "uuid", "guild_id_to_check" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_past_deadline"("p_raid_tier_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_past_deadline"("p_raid_tier_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_past_deadline"("p_raid_tier_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."merge_phase_groups"("p_expansion_id" "uuid", "p_guild_id" "uuid", "p_phase_groups" "jsonb", "p_merged_groups" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."merge_phase_groups"("p_expansion_id" "uuid", "p_guild_id" "uuid", "p_phase_groups" "jsonb", "p_merged_groups" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."merge_phase_groups"("p_expansion_id" "uuid", "p_guild_id" "uuid", "p_phase_groups" "jsonb", "p_merged_groups" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."redeem_invite_code"("code_input" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."redeem_invite_code"("code_input" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."redeem_invite_code"("code_input" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."reject_submissions_on_cgm_loss"() TO "anon";
GRANT ALL ON FUNCTION "public"."reject_submissions_on_cgm_loss"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."reject_submissions_on_cgm_loss"() TO "service_role";



GRANT ALL ON FUNCTION "public"."reset_blp"("p_guild_id" "uuid", "p_character_id" "uuid", "p_loot_item_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."reset_blp"("p_guild_id" "uuid", "p_character_id" "uuid", "p_loot_item_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reset_blp"("p_guild_id" "uuid", "p_character_id" "uuid", "p_loot_item_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."save_submission_items"("p_submission_id" "uuid", "p_items" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."save_submission_items"("p_submission_id" "uuid", "p_items" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_submission_items"("p_submission_id" "uuid", "p_items" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."seed_tbc_expansion"("p_guild_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."seed_tbc_expansion"("p_guild_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."seed_tbc_expansion"("p_guild_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."seed_tbc_expansion_for_guild"("p_guild_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."seed_tbc_expansion_for_guild"("p_guild_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."seed_tbc_expansion_for_guild"("p_guild_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_guild_active_expansion"("p_guild_id" "uuid", "p_expansion_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."set_guild_active_expansion"("p_guild_id" "uuid", "p_expansion_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_guild_active_expansion"("p_guild_id" "uuid", "p_expansion_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_guild_icon"("p_guild_id" "uuid", "p_icon_url" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_guild_icon"("p_guild_id" "uuid", "p_icon_url" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_guild_icon"("p_guild_id" "uuid", "p_icon_url" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_guild_info"("p_guild_id" "uuid", "p_name" "text", "p_realm" "text", "p_faction" "text", "p_discord_server_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_guild_info"("p_guild_id" "uuid", "p_name" "text", "p_realm" "text", "p_faction" "text", "p_discord_server_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_guild_info"("p_guild_id" "uuid", "p_name" "text", "p_realm" "text", "p_faction" "text", "p_discord_server_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_guild_item_priorities_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_guild_item_priorities_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_guild_item_priorities_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_guild_settings_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_guild_settings_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_guild_settings_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."user_is_in_guild"("p_user_id" "uuid", "p_guild_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_is_in_guild"("p_user_id" "uuid", "p_guild_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_is_in_guild"("p_user_id" "uuid", "p_guild_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."user_is_officer_in_guild"("p_user_id" "uuid", "p_guild_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_is_officer_in_guild"("p_user_id" "uuid", "p_guild_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_is_officer_in_guild"("p_user_id" "uuid", "p_guild_id" "uuid") TO "service_role";



GRANT ALL ON TABLE "public"."addon_sync_tokens" TO "anon";
GRANT ALL ON TABLE "public"."addon_sync_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."addon_sync_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."attendance_records" TO "anon";
GRANT ALL ON TABLE "public"."attendance_records" TO "authenticated";
GRANT ALL ON TABLE "public"."attendance_records" TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."battlenet_accounts" TO "anon";
GRANT ALL ON TABLE "public"."battlenet_accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."battlenet_accounts" TO "service_role";



GRANT ALL ON TABLE "public"."blp_credits" TO "anon";
GRANT ALL ON TABLE "public"."blp_credits" TO "authenticated";
GRANT ALL ON TABLE "public"."blp_credits" TO "service_role";



GRANT ALL ON TABLE "public"."blp_tracking" TO "anon";
GRANT ALL ON TABLE "public"."blp_tracking" TO "authenticated";
GRANT ALL ON TABLE "public"."blp_tracking" TO "service_role";



GRANT ALL ON TABLE "public"."character_aliases" TO "anon";
GRANT ALL ON TABLE "public"."character_aliases" TO "authenticated";
GRANT ALL ON TABLE "public"."character_aliases" TO "service_role";



GRANT ALL ON TABLE "public"."character_equipped_items" TO "anon";
GRANT ALL ON TABLE "public"."character_equipped_items" TO "authenticated";
GRANT ALL ON TABLE "public"."character_equipped_items" TO "service_role";



GRANT ALL ON TABLE "public"."character_guild_memberships" TO "anon";
GRANT ALL ON TABLE "public"."character_guild_memberships" TO "authenticated";
GRANT ALL ON TABLE "public"."character_guild_memberships" TO "service_role";



GRANT ALL ON TABLE "public"."characters" TO "anon";
GRANT ALL ON TABLE "public"."characters" TO "authenticated";
GRANT ALL ON TABLE "public"."characters" TO "service_role";



GRANT ALL ON TABLE "public"."class_specs" TO "anon";
GRANT ALL ON TABLE "public"."class_specs" TO "authenticated";
GRANT ALL ON TABLE "public"."class_specs" TO "service_role";



GRANT ALL ON TABLE "public"."discord_feedback_map" TO "anon";
GRANT ALL ON TABLE "public"."discord_feedback_map" TO "authenticated";
GRANT ALL ON TABLE "public"."discord_feedback_map" TO "service_role";



GRANT ALL ON TABLE "public"."donation_records" TO "anon";
GRANT ALL ON TABLE "public"."donation_records" TO "authenticated";
GRANT ALL ON TABLE "public"."donation_records" TO "service_role";



GRANT ALL ON TABLE "public"."expansions" TO "anon";
GRANT ALL ON TABLE "public"."expansions" TO "authenticated";
GRANT ALL ON TABLE "public"."expansions" TO "service_role";



GRANT ALL ON TABLE "public"."guild_invite_codes" TO "anon";
GRANT ALL ON TABLE "public"."guild_invite_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."guild_invite_codes" TO "service_role";



GRANT ALL ON TABLE "public"."guild_item_priorities" TO "anon";
GRANT ALL ON TABLE "public"."guild_item_priorities" TO "authenticated";
GRANT ALL ON TABLE "public"."guild_item_priorities" TO "service_role";



GRANT ALL ON TABLE "public"."guild_roles" TO "anon";
GRANT ALL ON TABLE "public"."guild_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."guild_roles" TO "service_role";



GRANT ALL ON TABLE "public"."guild_settings" TO "anon";
GRANT ALL ON TABLE "public"."guild_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."guild_settings" TO "service_role";



GRANT ALL ON TABLE "public"."guilds" TO "anon";
GRANT ALL ON TABLE "public"."guilds" TO "authenticated";
GRANT ALL ON TABLE "public"."guilds" TO "service_role";



GRANT ALL ON TABLE "public"."loot_deadlines" TO "anon";
GRANT ALL ON TABLE "public"."loot_deadlines" TO "authenticated";
GRANT ALL ON TABLE "public"."loot_deadlines" TO "service_role";



GRANT ALL ON TABLE "public"."loot_history" TO "anon";
GRANT ALL ON TABLE "public"."loot_history" TO "authenticated";
GRANT ALL ON TABLE "public"."loot_history" TO "service_role";



GRANT ALL ON TABLE "public"."loot_item_classes" TO "anon";
GRANT ALL ON TABLE "public"."loot_item_classes" TO "authenticated";
GRANT ALL ON TABLE "public"."loot_item_classes" TO "service_role";



GRANT ALL ON TABLE "public"."loot_items" TO "anon";
GRANT ALL ON TABLE "public"."loot_items" TO "authenticated";
GRANT ALL ON TABLE "public"."loot_items" TO "service_role";



GRANT ALL ON TABLE "public"."loot_submission_items" TO "anon";
GRANT ALL ON TABLE "public"."loot_submission_items" TO "authenticated";
GRANT ALL ON TABLE "public"."loot_submission_items" TO "service_role";



GRANT ALL ON TABLE "public"."loot_submission_snapshots" TO "anon";
GRANT ALL ON TABLE "public"."loot_submission_snapshots" TO "authenticated";
GRANT ALL ON TABLE "public"."loot_submission_snapshots" TO "service_role";



GRANT ALL ON TABLE "public"."loot_submissions" TO "anon";
GRANT ALL ON TABLE "public"."loot_submissions" TO "authenticated";
GRANT ALL ON TABLE "public"."loot_submissions" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."raid_events" TO "anon";
GRANT ALL ON TABLE "public"."raid_events" TO "authenticated";
GRANT ALL ON TABLE "public"."raid_events" TO "service_role";



GRANT ALL ON TABLE "public"."raid_team_members" TO "anon";
GRANT ALL ON TABLE "public"."raid_team_members" TO "authenticated";
GRANT ALL ON TABLE "public"."raid_team_members" TO "service_role";



GRANT ALL ON TABLE "public"."raid_teams" TO "anon";
GRANT ALL ON TABLE "public"."raid_teams" TO "authenticated";
GRANT ALL ON TABLE "public"."raid_teams" TO "service_role";



GRANT ALL ON TABLE "public"."raid_tiers" TO "anon";
GRANT ALL ON TABLE "public"."raid_tiers" TO "authenticated";
GRANT ALL ON TABLE "public"."raid_tiers" TO "service_role";



GRANT ALL ON TABLE "public"."reserve_audit_log" TO "anon";
GRANT ALL ON TABLE "public"."reserve_audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."reserve_audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."reserve_awards" TO "anon";
GRANT ALL ON TABLE "public"."reserve_awards" TO "authenticated";
GRANT ALL ON TABLE "public"."reserve_awards" TO "service_role";



GRANT ALL ON TABLE "public"."reserve_runs" TO "anon";
GRANT ALL ON TABLE "public"."reserve_runs" TO "authenticated";
GRANT ALL ON TABLE "public"."reserve_runs" TO "service_role";



GRANT ALL ON TABLE "public"."reserve_submissions" TO "anon";
GRANT ALL ON TABLE "public"."reserve_submissions" TO "authenticated";
GRANT ALL ON TABLE "public"."reserve_submissions" TO "service_role";



GRANT ALL ON TABLE "public"."user_active_characters" TO "anon";
GRANT ALL ON TABLE "public"."user_active_characters" TO "authenticated";
GRANT ALL ON TABLE "public"."user_active_characters" TO "service_role";



GRANT ALL ON TABLE "public"."user_preferences" TO "anon";
GRANT ALL ON TABLE "public"."user_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."user_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."wow_classes" TO "anon";
GRANT ALL ON TABLE "public"."wow_classes" TO "authenticated";
GRANT ALL ON TABLE "public"."wow_classes" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";








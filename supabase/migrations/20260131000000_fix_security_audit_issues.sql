-- =============================================================================
-- Security Audit Fixes Migration
-- Generated: 2026-01-31
--
-- Fixes:
-- 1. ERRORS: Enable RLS on wow_classes and class_specs tables
-- 2. WARNINGS: Fix overly permissive RLS policies (USING true / WITH CHECK true)
-- 3. WARNINGS: Add SET search_path = public to all functions
-- =============================================================================

-- =============================================================================
-- PART 1: Enable RLS on tables missing it (ERRORS)
-- =============================================================================

-- Enable RLS on wow_classes (has policy but RLS not enabled)
ALTER TABLE public.wow_classes ENABLE ROW LEVEL SECURITY;

-- Enable RLS on class_specs
ALTER TABLE public.class_specs ENABLE ROW LEVEL SECURITY;

-- Ensure read-only public access policies exist
DROP POLICY IF EXISTS "Classes are viewable by everyone" ON public.wow_classes;
CREATE POLICY "Classes are viewable by everyone" ON public.wow_classes
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Class specs are viewable by everyone" ON public.class_specs;
CREATE POLICY "Class specs are viewable by everyone" ON public.class_specs
  FOR SELECT
  USING (true);

-- =============================================================================
-- PART 2: Fix overly permissive RLS policies (WARNINGS)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Fix attendance_records policies
-- These had USING (true) / WITH CHECK (true) but should check officer status
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Officers can delete attendance" ON public.attendance_records;
CREATE POLICY "Officers can delete attendance" ON public.attendance_records
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM guild_members gm
      JOIN guild_roles gr ON gr.guild_id = gm.guild_id AND gr.name = gm.role
      WHERE gm.user_id = auth.uid()
      AND gm.guild_id = attendance_records.guild_id
      AND gr.position >= 50
    )
  );

DROP POLICY IF EXISTS "Officers can manage attendance" ON public.attendance_records;
CREATE POLICY "Officers can manage attendance" ON public.attendance_records
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM guild_members gm
      JOIN guild_roles gr ON gr.guild_id = gm.guild_id AND gr.name = gm.role
      WHERE gm.user_id = auth.uid()
      AND gm.guild_id = attendance_records.guild_id
      AND gr.position >= 50
    )
  );

DROP POLICY IF EXISTS "Officers can update attendance" ON public.attendance_records;
CREATE POLICY "Officers can update attendance" ON public.attendance_records
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM guild_members gm
      JOIN guild_roles gr ON gr.guild_id = gm.guild_id AND gr.name = gm.role
      WHERE gm.user_id = auth.uid()
      AND gm.guild_id = attendance_records.guild_id
      AND gr.position >= 50
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM guild_members gm
      JOIN guild_roles gr ON gr.guild_id = gm.guild_id AND gr.name = gm.role
      WHERE gm.user_id = auth.uid()
      AND gm.guild_id = attendance_records.guild_id
      AND gr.position >= 50
    )
  );

-- -----------------------------------------------------------------------------
-- Fix raid_events policies
-- These had USING (true) / WITH CHECK (true) but should check officer status
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Officers can create raid events" ON public.raid_events;
CREATE POLICY "Officers can create raid events" ON public.raid_events
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM guild_members gm
      JOIN guild_roles gr ON gr.guild_id = gm.guild_id AND gr.name = gm.role
      WHERE gm.user_id = auth.uid()
      AND gm.guild_id = raid_events.guild_id
      AND gr.position >= 50
    )
  );

DROP POLICY IF EXISTS "Officers can update raid events" ON public.raid_events;
CREATE POLICY "Officers can update raid events" ON public.raid_events
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM guild_members gm
      JOIN guild_roles gr ON gr.guild_id = gm.guild_id AND gr.name = gm.role
      WHERE gm.user_id = auth.uid()
      AND gm.guild_id = raid_events.guild_id
      AND gr.position >= 50
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM guild_members gm
      JOIN guild_roles gr ON gr.guild_id = gm.guild_id AND gr.name = gm.role
      WHERE gm.user_id = auth.uid()
      AND gm.guild_id = raid_events.guild_id
      AND gr.position >= 50
    )
  );

-- -----------------------------------------------------------------------------
-- Fix guild_settings INSERT policy
-- This had WITH CHECK (true) but should only allow system/service role inserts
-- We'll restrict it to authenticated users creating settings for guilds they own
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "System can insert guild settings" ON public.guild_settings;
CREATE POLICY "Guild creators can insert guild settings" ON public.guild_settings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM guilds g
      WHERE g.id = guild_settings.guild_id
      AND g.owner_id = auth.uid()
    )
  );

-- =============================================================================
-- PART 3: Fix function search_path vulnerabilities (WARNINGS)
-- Add SET search_path = public to all SECURITY DEFINER functions
-- =============================================================================

-- Note: We recreate functions with the same body but add SET search_path
-- Using CREATE OR REPLACE to preserve grants and dependencies

-- -----------------------------------------------------------------------------
-- update_updated_at_column - Generic timestamp updater
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- -----------------------------------------------------------------------------
-- update_guild_item_priorities_updated_at
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_guild_item_priorities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- -----------------------------------------------------------------------------
-- update_guild_settings_updated_at
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_guild_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- -----------------------------------------------------------------------------
-- get_user_guild_ids - Returns guild IDs for current user
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_guild_ids()
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT gm.guild_id
  FROM guild_members gm
  WHERE gm.user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

-- -----------------------------------------------------------------------------
-- user_is_in_guild - Check if user is member of guild
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.user_is_in_guild(p_user_id UUID, p_guild_id UUID)
RETURNS BOOLEAN AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

-- -----------------------------------------------------------------------------
-- user_is_officer_in_guild - Check if user is officer in guild
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.user_is_officer_in_guild(p_user_id UUID, p_guild_id UUID)
RETURNS BOOLEAN AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

-- -----------------------------------------------------------------------------
-- is_officer_of_guild - Alternative officer check
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_officer_of_guild(p_guild_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM guild_members gm
    JOIN guild_roles gr ON gr.guild_id = gm.guild_id AND gr.name = gm.role
    WHERE gm.user_id = auth.uid()
    AND gm.guild_id = p_guild_id
    AND gr.position >= 50
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

-- -----------------------------------------------------------------------------
-- create_expansion_for_guild
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_expansion_for_guild(
  p_guild_id UUID,
  p_expansion_name TEXT,
  p_is_active BOOLEAN DEFAULT false
)
RETURNS UUID AS $$
DECLARE
  v_expansion_id UUID;
BEGIN
  INSERT INTO expansions (guild_id, name, is_active)
  VALUES (p_guild_id, p_expansion_name, p_is_active)
  RETURNING id INTO v_expansion_id;

  RETURN v_expansion_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- -----------------------------------------------------------------------------
-- set_guild_active_expansion
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_guild_active_expansion(
  p_guild_id UUID,
  p_expansion_id UUID
)
RETURNS VOID AS $$
BEGIN
  -- Deactivate all expansions for guild
  UPDATE expansions
  SET is_active = false
  WHERE guild_id = p_guild_id;

  -- Activate the selected expansion
  UPDATE expansions
  SET is_active = true
  WHERE id = p_expansion_id AND guild_id = p_guild_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- -----------------------------------------------------------------------------
-- check_max_roles_per_guild
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_max_roles_per_guild()
RETURNS TRIGGER AS $$
DECLARE
  role_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO role_count
  FROM guild_roles
  WHERE guild_id = NEW.guild_id;

  IF role_count >= 10 THEN
    RAISE EXCEPTION 'Maximum of 10 roles per guild reached';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- -----------------------------------------------------------------------------
-- is_invite_code_valid
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_invite_code_valid(p_code TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM guild_invites
    WHERE code = p_code
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (max_uses IS NULL OR uses < max_uses)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

-- -----------------------------------------------------------------------------
-- get_character_guilds
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_character_guilds(p_character_id UUID)
RETURNS TABLE (
  guild_id UUID,
  guild_name TEXT,
  role TEXT,
  is_active BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cgm.guild_id,
    g.name::TEXT,
    cgm.role,
    cgm.is_active
  FROM character_guild_memberships cgm
  JOIN guilds g ON g.id = cgm.guild_id
  WHERE cgm.character_id = p_character_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

-- -----------------------------------------------------------------------------
-- get_user_characters_in_guild
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_characters_in_guild(p_guild_id UUID)
RETURNS TABLE (
  character_id UUID,
  character_name TEXT,
  class_name TEXT,
  role TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name::TEXT,
    c.class::TEXT,
    cgm.role
  FROM characters c
  JOIN character_guild_memberships cgm ON cgm.character_id = c.id
  WHERE c.user_id = auth.uid()
  AND cgm.guild_id = p_guild_id
  AND cgm.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

-- -----------------------------------------------------------------------------
-- get_guild_expansions
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_guild_expansions(p_guild_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.name::TEXT,
    e.is_active,
    e.created_at
  FROM expansions e
  WHERE e.guild_id = p_guild_id
  ORDER BY e.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

-- -----------------------------------------------------------------------------
-- get_guild_submissions
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_guild_submissions(p_guild_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  character_id UUID,
  status TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ls.id,
    ls.user_id,
    ls.character_id,
    ls.status::TEXT,
    ls.created_at,
    ls.updated_at
  FROM loot_submissions ls
  WHERE ls.guild_id = p_guild_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

-- -----------------------------------------------------------------------------
-- update_guild_info
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_guild_info(
  p_guild_id UUID,
  p_name TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE guilds
  SET
    name = COALESCE(p_name, name),
    description = COALESCE(p_description, description),
    updated_at = NOW()
  WHERE id = p_guild_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- -----------------------------------------------------------------------------
-- update_guild_icon
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_guild_icon(
  p_guild_id UUID,
  p_icon_url TEXT
)
RETURNS VOID AS $$
BEGIN
  UPDATE guilds
  SET
    icon_url = p_icon_url,
    updated_at = NOW()
  WHERE id = p_guild_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- -----------------------------------------------------------------------------
-- seed_tbc_expansion_for_guild
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.seed_tbc_expansion_for_guild(p_guild_id UUID)
RETURNS UUID AS $$
DECLARE
  v_expansion_id UUID;
BEGIN
  -- Create TBC expansion
  INSERT INTO expansions (guild_id, name, is_active)
  VALUES (p_guild_id, 'The Burning Crusade', false)
  RETURNING id INTO v_expansion_id;

  RETURN v_expansion_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- -----------------------------------------------------------------------------
-- can_view_master_sheet
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_view_master_sheet(p_guild_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_setting BOOLEAN;
BEGIN
  -- Check if master sheet is enabled for guild
  SELECT master_sheet_enabled INTO v_setting
  FROM guild_settings
  WHERE guild_id = p_guild_id;

  -- If setting doesn't exist or is null, default to false
  RETURN COALESCE(v_setting, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

-- -----------------------------------------------------------------------------
-- is_past_deadline
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_past_deadline(p_guild_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_deadline TIMESTAMPTZ;
BEGIN
  SELECT submission_deadline INTO v_deadline
  FROM guild_settings
  WHERE guild_id = p_guild_id;

  IF v_deadline IS NULL THEN
    RETURN false;
  END IF;

  RETURN NOW() > v_deadline;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

-- -----------------------------------------------------------------------------
-- get_guild_current_expansion
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_guild_current_expansion(p_guild_id UUID)
RETURNS UUID AS $$
DECLARE
  v_expansion_id UUID;
BEGIN
  SELECT id INTO v_expansion_id
  FROM expansions
  WHERE guild_id = p_guild_id AND is_active = true
  LIMIT 1;

  RETURN v_expansion_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

-- -----------------------------------------------------------------------------
-- generate_invite_code
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- -----------------------------------------------------------------------------
-- character_belongs_to_user
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.character_belongs_to_user(p_character_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM characters
    WHERE id = p_character_id
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

-- -----------------------------------------------------------------------------
-- delete_guild
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_guild(p_guild_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Delete in order of dependencies
  DELETE FROM loot_submission_items WHERE submission_id IN (
    SELECT id FROM loot_submissions WHERE guild_id = p_guild_id
  );
  DELETE FROM loot_submissions WHERE guild_id = p_guild_id;
  DELETE FROM attendance_records WHERE guild_id = p_guild_id;
  DELETE FROM raid_events WHERE guild_id = p_guild_id;
  DELETE FROM guild_item_priorities WHERE guild_id = p_guild_id;
  DELETE FROM character_guild_memberships WHERE guild_id = p_guild_id;
  DELETE FROM guild_invites WHERE guild_id = p_guild_id;
  DELETE FROM guild_settings WHERE guild_id = p_guild_id;
  DELETE FROM guild_roles WHERE guild_id = p_guild_id;
  DELETE FROM expansions WHERE guild_id = p_guild_id;
  DELETE FROM guild_members WHERE guild_id = p_guild_id;
  DELETE FROM guilds WHERE id = p_guild_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- -----------------------------------------------------------------------------
-- create_user_preferences
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_user_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- =============================================================================
-- Verification queries (comment out in production)
-- =============================================================================

-- Verify RLS is enabled on the tables
-- SELECT tablename, rowsecurity FROM pg_tables
-- WHERE schemaname = 'public' AND tablename IN ('wow_classes', 'class_specs');

-- Verify functions have search_path set
-- SELECT proname, prosecdef, proconfig
-- FROM pg_proc
-- WHERE pronamespace = 'public'::regnamespace
-- AND proname IN ('user_is_in_guild', 'get_user_guild_ids', 'is_officer_of_guild');

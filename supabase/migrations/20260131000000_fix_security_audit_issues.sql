-- =============================================================================
-- Security Audit Fixes Migration
-- Generated: 2026-01-31
--
-- Fixes:
-- 1. ERRORS: Enable RLS on wow_classes and class_specs tables
-- 2. WARNINGS: Fix overly permissive RLS policies (USING true / WITH CHECK true)
-- 3. WARNINGS: Add SET search_path = public to all SECURITY DEFINER functions
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
-- Note: attendance_records links to guild via raid_events.raid_event_id
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Officers can delete attendance" ON public.attendance_records;
CREATE POLICY "Officers can delete attendance" ON public.attendance_records
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM raid_events re
      JOIN guild_members gm ON gm.guild_id = re.guild_id
      JOIN guild_roles gr ON gr.guild_id = gm.guild_id AND gr.name = gm.role
      WHERE re.id = attendance_records.raid_event_id
      AND gm.user_id = auth.uid()
      AND gr.position >= 50
    )
  );

DROP POLICY IF EXISTS "Officers can manage attendance" ON public.attendance_records;
CREATE POLICY "Officers can manage attendance" ON public.attendance_records
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM raid_events re
      JOIN guild_members gm ON gm.guild_id = re.guild_id
      JOIN guild_roles gr ON gr.guild_id = gm.guild_id AND gr.name = gm.role
      WHERE re.id = attendance_records.raid_event_id
      AND gm.user_id = auth.uid()
      AND gr.position >= 50
    )
  );

DROP POLICY IF EXISTS "Officers can update attendance" ON public.attendance_records;
CREATE POLICY "Officers can update attendance" ON public.attendance_records
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM raid_events re
      JOIN guild_members gm ON gm.guild_id = re.guild_id
      JOIN guild_roles gr ON gr.guild_id = gm.guild_id AND gr.name = gm.role
      WHERE re.id = attendance_records.raid_event_id
      AND gm.user_id = auth.uid()
      AND gr.position >= 50
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM raid_events re
      JOIN guild_members gm ON gm.guild_id = re.guild_id
      JOIN guild_roles gr ON gr.guild_id = gm.guild_id AND gr.name = gm.role
      WHERE re.id = attendance_records.raid_event_id
      AND gm.user_id = auth.uid()
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
-- This had WITH CHECK (true) but should only allow guild creators or Guild Masters
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "System can insert guild settings" ON public.guild_settings;
CREATE POLICY "Guild Master can insert guild settings" ON public.guild_settings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM guilds g
      WHERE g.id = guild_settings.guild_id
      AND g.created_by = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM guild_members gm
      JOIN guild_roles gr ON gr.guild_id = gm.guild_id AND gr.name = gm.role
      WHERE gm.guild_id = guild_settings.guild_id
      AND gm.user_id = auth.uid()
      AND gr.position >= 100
    )
  );

-- =============================================================================
-- PART 3: Fix function search_path vulnerabilities (WARNINGS)
-- Use ALTER FUNCTION to add SET search_path without recreating functions
-- Wrap in DO block to handle functions that may not exist
-- =============================================================================

-- Helper function to safely alter function search_path (ignores if function doesn't exist)
CREATE OR REPLACE FUNCTION pg_temp.safe_alter_function_search_path(func_signature TEXT)
RETURNS VOID AS $$
BEGIN
  EXECUTE 'ALTER FUNCTION ' || func_signature || ' SET search_path = public';
EXCEPTION
  WHEN undefined_function THEN
    -- Function doesn't exist with this signature, skip it
    NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply search_path to all SECURITY DEFINER functions that exist
SELECT pg_temp.safe_alter_function_search_path('public.update_updated_at_column()');
SELECT pg_temp.safe_alter_function_search_path('public.update_guild_item_priorities_updated_at()');
SELECT pg_temp.safe_alter_function_search_path('public.update_guild_settings_updated_at()');
SELECT pg_temp.safe_alter_function_search_path('public.get_user_guild_ids()');
SELECT pg_temp.safe_alter_function_search_path('public.user_is_in_guild(UUID, UUID)');
SELECT pg_temp.safe_alter_function_search_path('public.user_is_officer_in_guild(UUID, UUID)');
SELECT pg_temp.safe_alter_function_search_path('public.is_officer_of_guild(UUID)');
SELECT pg_temp.safe_alter_function_search_path('public.character_belongs_to_user(UUID)');
SELECT pg_temp.safe_alter_function_search_path('public.create_expansion_for_guild(UUID, TEXT, BOOLEAN)');
SELECT pg_temp.safe_alter_function_search_path('public.update_guild_info(UUID, TEXT, TEXT)');
SELECT pg_temp.safe_alter_function_search_path('public.update_guild_icon(UUID, TEXT)');
SELECT pg_temp.safe_alter_function_search_path('public.delete_guild(UUID)');
SELECT pg_temp.safe_alter_function_search_path('public.seed_tbc_expansion_for_guild(UUID)');
SELECT pg_temp.safe_alter_function_search_path('public.generate_invite_code()');
SELECT pg_temp.safe_alter_function_search_path('public.get_character_guilds(UUID)');
SELECT pg_temp.safe_alter_function_search_path('public.get_user_characters_in_guild(UUID, UUID)');
SELECT pg_temp.safe_alter_function_search_path('public.get_guild_expansions(UUID)');
SELECT pg_temp.safe_alter_function_search_path('public.get_guild_submissions(UUID, UUID)');
SELECT pg_temp.safe_alter_function_search_path('public.get_guild_current_expansion(UUID)');
SELECT pg_temp.safe_alter_function_search_path('public.can_view_master_sheet(UUID)');
SELECT pg_temp.safe_alter_function_search_path('public.is_past_deadline(UUID)');
SELECT pg_temp.safe_alter_function_search_path('public.create_user_preferences()');

-- =============================================================================
-- Verification queries (comment out in production)
-- =============================================================================

-- Verify RLS is enabled on the tables
-- SELECT tablename, rowsecurity FROM pg_tables
-- WHERE schemaname = 'public' AND tablename IN ('wow_classes', 'class_specs');

-- Verify functions have search_path set
-- SELECT proname, prosecdef, proconfig
-- FROM pg_proc
-- WHERE pronamespace = 'public'::regnamespace;

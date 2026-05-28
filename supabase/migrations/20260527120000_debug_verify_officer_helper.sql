-- TEMPORARY verification helpers for the GH #60 follow-up audit.
-- 1) _debug_count_role_literal_policies(): how many policies still have
--    hardcoded 'Officer' / 'Guild Master' literals? Should be 0 after
--    20260528000000.
-- 2) _debug_is_officer_for(user_id, guild_id): runs the same logic as
--    public.is_guild_officer but with an explicit user_id, so we can probe
--    behavior from service role (where auth.uid() would be null).
CREATE OR REPLACE FUNCTION public._debug_count_role_literal_policies()
RETURNS TABLE (tablename NAME, policyname NAME, cmd TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT tablename, policyname, cmd
  FROM pg_policies
  WHERE schemaname = 'public'
    AND (
      COALESCE(qual, '')       LIKE '%''Officer''%'        OR
      COALESCE(qual, '')       LIKE '%''Guild Master''%'   OR
      COALESCE(qual, '')       LIKE '%''officer''%'        OR
      COALESCE(qual, '')       LIKE '%''guild_master''%'   OR
      COALESCE(with_check, '') LIKE '%''Officer''%'        OR
      COALESCE(with_check, '') LIKE '%''Guild Master''%'   OR
      COALESCE(with_check, '') LIKE '%''officer''%'        OR
      COALESCE(with_check, '') LIKE '%''guild_master''%'
    );
$$;

CREATE OR REPLACE FUNCTION public._debug_is_officer_for(probe_user_id UUID, probe_guild_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT (probe_guild_id IS NOT NULL) AND (
    EXISTS (
      SELECT 1 FROM guilds g
      WHERE g.id = probe_guild_id AND g.created_by = probe_user_id
    )
    OR EXISTS (
      SELECT 1
      FROM character_guild_memberships cgm
      JOIN characters c    ON c.id = cgm.character_id
      JOIN guild_roles  gr ON gr.guild_id = cgm.guild_id AND gr.name = cgm.role
      WHERE cgm.guild_id = probe_guild_id
        AND c.user_id    = probe_user_id
        AND cgm.is_active = true
        AND gr.position >= 50
    )
  );
$$;

REVOKE ALL ON FUNCTION public._debug_count_role_literal_policies() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._debug_count_role_literal_policies() TO service_role;
REVOKE ALL ON FUNCTION public._debug_is_officer_for(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._debug_is_officer_for(UUID, UUID) TO service_role;

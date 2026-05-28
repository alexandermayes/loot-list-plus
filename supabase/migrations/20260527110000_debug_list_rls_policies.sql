-- TEMPORARY (round 2): re-add the policy lister for the Option B drafting.
-- Dropped immediately after by 20260527110001.
CREATE OR REPLACE FUNCTION public._debug_list_rls_policies()
RETURNS TABLE (
  schemaname NAME,
  tablename NAME,
  policyname NAME,
  cmd TEXT,
  qual TEXT,
  with_check TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT schemaname, tablename, policyname, cmd, qual, with_check
  FROM pg_policies
  WHERE schemaname = 'public'
  ORDER BY tablename, policyname;
$$;

REVOKE ALL ON FUNCTION public._debug_list_rls_policies() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._debug_list_rls_policies() TO service_role;

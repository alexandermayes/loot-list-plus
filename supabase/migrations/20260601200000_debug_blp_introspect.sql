-- TEMP debug helper for #98 follow-up. Drops by next migration.
CREATE OR REPLACE FUNCTION public._debug_blp_function_body()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT prosrc FROM pg_proc
  WHERE proname = 'increment_blp' AND pronargs = 4
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public._debug_blp_function_body() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._debug_blp_function_body() TO service_role;

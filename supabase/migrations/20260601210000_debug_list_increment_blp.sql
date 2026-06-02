CREATE OR REPLACE FUNCTION public._debug_list_blp_fns()
RETURNS TABLE (function_oid OID, fn_name TEXT, n_args INT, arg_types TEXT)
LANGUAGE sql
AS $$
  SELECT oid, proname::text, pronargs, pg_get_function_identity_arguments(oid)
  FROM pg_proc
  WHERE proname IN ('increment_blp', 'reset_blp')
  ORDER BY proname, pronargs;
$$;
GRANT EXECUTE ON FUNCTION public._debug_list_blp_fns() TO service_role;

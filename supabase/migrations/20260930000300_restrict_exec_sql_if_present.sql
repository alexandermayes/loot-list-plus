-- Keep exec_sql service-role only, if it exists.
--
-- scripts/run-migration.ts calls an exec_sql function through the service
-- role, but no migration defines it. If any public exec_sql function exists
-- in the database, this revokes EXECUTE from PUBLIC, anon and authenticated
-- and grants it to service_role, matching the server-only functions in
-- 20260930000200. If none exists, nothing changes.
--
-- Safe to re-run: REVOKE and GRANT are idempotent, and the loop only visits
-- functions that exist.

DO $$
DECLARE
  fn regprocedure;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'exec_sql'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, "anon", "authenticated"', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO "service_role"', fn);
  END LOOP;
END
$$;

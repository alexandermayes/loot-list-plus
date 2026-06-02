-- TEMP: probe FOUND behavior after ON CONFLICT DO NOTHING.
CREATE OR REPLACE FUNCTION public._debug_test_found()
RETURNS TABLE (label TEXT, found_value BOOLEAN)
LANGUAGE plpgsql
AS $$
DECLARE
  v_inserted BOOLEAN;
BEGIN
  -- Use a temp scratch table so we don't pollute anything
  CREATE TEMP TABLE IF NOT EXISTS _t (id INT PRIMARY KEY) ON COMMIT DROP;
  TRUNCATE _t;
  INSERT INTO _t VALUES (1);

  -- First case: conflicting insert (should set FOUND = FALSE)
  INSERT INTO _t VALUES (1) ON CONFLICT DO NOTHING;
  v_inserted := FOUND;
  label := 'conflict';
  found_value := v_inserted;
  RETURN NEXT;

  -- Second case: new row (should set FOUND = TRUE)
  INSERT INTO _t VALUES (2) ON CONFLICT DO NOTHING;
  v_inserted := FOUND;
  label := 'new_row';
  found_value := v_inserted;
  RETURN NEXT;

  RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public._debug_test_found() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._debug_test_found() TO service_role;

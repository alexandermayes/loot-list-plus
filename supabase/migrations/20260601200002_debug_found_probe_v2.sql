CREATE OR REPLACE FUNCTION public._debug_test_found()
RETURNS TABLE (label TEXT, found_value BOOLEAN)
LANGUAGE plpgsql
AS $$
DECLARE
  v_inserted BOOLEAN;
BEGIN
  CREATE TEMP TABLE IF NOT EXISTS _t (id INT PRIMARY KEY);
  TRUNCATE _t;
  INSERT INTO _t VALUES (1);

  -- Case 1: conflict
  INSERT INTO _t VALUES (1) ON CONFLICT DO NOTHING;
  v_inserted := FOUND;
  label := 'conflict'; found_value := v_inserted; RETURN NEXT;

  -- Case 2: new row
  INSERT INTO _t VALUES (2) ON CONFLICT DO NOTHING;
  v_inserted := FOUND;
  label := 'new_row'; found_value := v_inserted; RETURN NEXT;

  RETURN;
END;
$$;
GRANT EXECUTE ON FUNCTION public._debug_test_found() TO service_role;

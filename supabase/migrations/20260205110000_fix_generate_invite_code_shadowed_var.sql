-- =============================================================================
-- Fix generate_invite_code function shadowed variable warning (LOW-01)
-- =============================================================================
-- The function declares `i INTEGER` but the FOR loop also creates an implicit
-- loop variable `i`, causing a shadowed variable warning from supabase db lint.
-- Fix: Remove the explicit declaration since FOR loop creates it automatically.
-- =============================================================================

CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Confirmation
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Fixed generate_invite_code shadowed var';
  RAISE NOTICE '========================================';
END $$;

-- =============================================================================
-- Atomic invite code redemption (fixes race condition)
-- =============================================================================
-- The previous invite code redemption flow used a read-then-write pattern:
--   1. SELECT current_uses FROM guild_invite_codes WHERE code = X
--   2. (validate current_uses < max_uses)
--   3. UPDATE guild_invite_codes SET current_uses = <stale_value> + 1
--
-- Concurrent requests could read the same current_uses value before either
-- writes, allowing both to succeed and exceed max_uses.
--
-- This migration creates an atomic RPC function that validates all conditions
-- and increments current_uses in a single statement, preventing the race.
-- =============================================================================

CREATE OR REPLACE FUNCTION redeem_invite_code(code_input TEXT)
RETURNS TABLE (
  invite_code_id UUID,
  invite_guild_id UUID,
  invite_current_uses INTEGER,
  invite_max_uses INTEGER,
  invite_expires_at TIMESTAMPTZ,
  invite_is_active BOOLEAN,
  error_code TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record RECORD;
  v_updated_count INTEGER;
BEGIN
  -- First, look up the invite code and lock the row for update
  SELECT ic.id, ic.guild_id, ic.current_uses, ic.max_uses, ic.expires_at, ic.is_active
  INTO v_record
  FROM guild_invite_codes ic
  WHERE ic.code = code_input
  FOR UPDATE;

  -- Code not found
  IF NOT FOUND THEN
    error_code := 'NOT_FOUND';
    RETURN NEXT;
    RETURN;
  END IF;

  -- Code is deactivated
  IF NOT v_record.is_active THEN
    invite_code_id := v_record.id;
    invite_guild_id := v_record.guild_id;
    invite_current_uses := v_record.current_uses;
    invite_max_uses := v_record.max_uses;
    invite_expires_at := v_record.expires_at;
    invite_is_active := v_record.is_active;
    error_code := 'DEACTIVATED';
    RETURN NEXT;
    RETURN;
  END IF;

  -- Code is expired
  IF v_record.expires_at IS NOT NULL AND v_record.expires_at < NOW() THEN
    invite_code_id := v_record.id;
    invite_guild_id := v_record.guild_id;
    invite_current_uses := v_record.current_uses;
    invite_max_uses := v_record.max_uses;
    invite_expires_at := v_record.expires_at;
    invite_is_active := v_record.is_active;
    error_code := 'EXPIRED';
    RETURN NEXT;
    RETURN;
  END IF;

  -- Code has reached max uses
  IF v_record.max_uses IS NOT NULL AND v_record.current_uses >= v_record.max_uses THEN
    invite_code_id := v_record.id;
    invite_guild_id := v_record.guild_id;
    invite_current_uses := v_record.current_uses;
    invite_max_uses := v_record.max_uses;
    invite_expires_at := v_record.expires_at;
    invite_is_active := v_record.is_active;
    error_code := 'MAX_USES_REACHED';
    RETURN NEXT;
    RETURN;
  END IF;

  -- Atomically increment current_uses with the max_uses guard
  -- This WHERE clause ensures no race: if another transaction already
  -- incremented past max_uses, this UPDATE will affect 0 rows.
  UPDATE guild_invite_codes
  SET current_uses = current_uses + 1
  WHERE id = v_record.id
    AND is_active = true
    AND (max_uses IS NULL OR current_uses < max_uses)
    AND (expires_at IS NULL OR expires_at >= NOW());

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  IF v_updated_count = 0 THEN
    -- Another concurrent request used the last slot
    invite_code_id := v_record.id;
    invite_guild_id := v_record.guild_id;
    invite_current_uses := v_record.current_uses;
    invite_max_uses := v_record.max_uses;
    invite_expires_at := v_record.expires_at;
    invite_is_active := v_record.is_active;
    error_code := 'MAX_USES_REACHED';
    RETURN NEXT;
    RETURN;
  END IF;

  -- Success: return the record with no error
  invite_code_id := v_record.id;
  invite_guild_id := v_record.guild_id;
  invite_current_uses := v_record.current_uses + 1;
  invite_max_uses := v_record.max_uses;
  invite_expires_at := v_record.expires_at;
  invite_is_active := v_record.is_active;
  error_code := NULL;
  RETURN NEXT;
  RETURN;
END;
$$;

-- Grant execute to authenticated users (they need to redeem invite codes)
GRANT EXECUTE ON FUNCTION redeem_invite_code(TEXT) TO authenticated;

-- Confirmation
DO $$
BEGIN
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'Created atomic redeem_invite_code() RPC function';
  RAISE NOTICE '=================================================';
END $$;

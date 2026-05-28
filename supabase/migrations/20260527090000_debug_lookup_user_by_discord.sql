-- TEMPORARY debug RPC for GH issue #60 investigation.
-- Drops after debug is complete (see 20260527090001).
-- Restricted to service_role only.
CREATE OR REPLACE FUNCTION public._debug_lookup_user_by_discord(discord_id TEXT)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  last_sign_in_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  identity_data JSONB
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT
    u.id AS user_id,
    u.email::TEXT,
    u.last_sign_in_at,
    u.created_at,
    i.identity_data
  FROM auth.identities i
  JOIN auth.users u ON u.id = i.user_id
  WHERE i.provider = 'discord'
    AND (
      i.provider_id = discord_id
      OR (i.identity_data ->> 'provider_id') = discord_id
      OR (i.identity_data ->> 'sub') = discord_id
    )
  LIMIT 5;
$$;

REVOKE ALL ON FUNCTION public._debug_lookup_user_by_discord(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._debug_lookup_user_by_discord(TEXT) TO service_role;

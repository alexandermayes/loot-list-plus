-- Fix: Change VARCHAR to TEXT to match actual column type
DROP FUNCTION IF EXISTS get_guild_expansions(UUID);

CREATE OR REPLACE FUNCTION get_guild_expansions(p_guild_id UUID)
RETURNS TABLE (
  expansion_id UUID,
  expansion_name TEXT,  -- Changed from VARCHAR to TEXT
  raid_start_date DATE,
  is_current BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_current_expansion_id UUID;
BEGIN
  -- Get current expansion
  SELECT active_expansion_id INTO v_current_expansion_id
  FROM guilds
  WHERE id = p_guild_id;

  -- Return all expansions for this guild
  RETURN QUERY
  SELECT
    e.id,
    e.name,
    e.raid_start_date,
    (e.id = v_current_expansion_id) as is_current,
    e.created_at
  FROM expansions e
  WHERE e.guild_id = p_guild_id
  ORDER BY e.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_guild_expansions TO authenticated;

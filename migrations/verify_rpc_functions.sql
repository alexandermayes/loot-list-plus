-- Verification script for RPC functions
-- Run this in Supabase SQL Editor to check if functions exist

-- Check if functions exist
SELECT
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_guild_expansions',
    'can_view_master_sheet',
    'is_past_deadline',
    'get_guild_current_expansion'
  )
ORDER BY routine_name;

-- If get_guild_expansions is missing, run this:
/*
CREATE OR REPLACE FUNCTION get_guild_expansions(p_guild_id UUID)
RETURNS TABLE (
  expansion_id UUID,
  expansion_name VARCHAR,
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
*/

-- Test the function (replace with your guild_id)
-- SELECT * FROM get_guild_expansions('your-guild-id-here');

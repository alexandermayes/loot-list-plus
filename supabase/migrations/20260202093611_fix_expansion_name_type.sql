-- Fix expansion_name type in get_guild_expansions RPC (VARCHAR -> TEXT)
DROP FUNCTION IF EXISTS get_guild_expansions(UUID);
CREATE OR REPLACE FUNCTION get_guild_expansions(p_guild_id UUID)
RETURNS TABLE (
  expansion_id UUID,
  expansion_name TEXT,
  raid_start_date DATE,
  is_current BOOLEAN,
  created_at TIMESTAMPTZ,
  raid_days_per_week INTEGER,
  first_raid_day INTEGER,
  second_raid_day INTEGER,
  third_raid_day INTEGER,
  fourth_raid_day INTEGER,
  fifth_raid_day INTEGER,
  timezone TEXT
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
    e.created_at,
    e.raid_days_per_week,
    e.first_raid_day,
    e.second_raid_day,
    e.third_raid_day,
    e.fourth_raid_day,
    e.fifth_raid_day,
    COALESCE(e.timezone, 'America/New_York') as timezone
  FROM expansions e
  WHERE e.guild_id = p_guild_id
  ORDER BY e.created_at ASC;
END;
$$;

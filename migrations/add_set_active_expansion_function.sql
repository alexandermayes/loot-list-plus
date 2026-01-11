-- Create a function to set active expansion for guild (bypasses RLS)
CREATE OR REPLACE FUNCTION set_guild_active_expansion(
  p_guild_id UUID,
  p_expansion_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- This runs with the privileges of the function owner, not the caller
AS $$
BEGIN
  -- Verify the caller is either the guild creator or an officer
  IF NOT EXISTS (
    SELECT 1 FROM guilds
    WHERE id = p_guild_id
    AND created_by = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM guild_members
    WHERE guild_id = p_guild_id
    AND user_id = auth.uid()
    AND role = 'Officer'
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Not authorized to update this guild';
  END IF;

  -- Update the guild's active expansion
  UPDATE guilds
  SET active_expansion_id = p_expansion_id
  WHERE id = p_guild_id;
END;
$$;

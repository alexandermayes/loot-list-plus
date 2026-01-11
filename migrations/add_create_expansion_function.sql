-- Create a function to create expansion for guild (bypasses RLS)
CREATE OR REPLACE FUNCTION create_expansion_for_guild(
  p_guild_id UUID,
  p_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER -- This runs with the privileges of the function owner, not the caller
AS $$
DECLARE
  v_expansion_id UUID;
BEGIN
  -- Verify the caller is either the guild creator or a member of the guild
  IF NOT EXISTS (
    SELECT 1 FROM guilds
    WHERE id = p_guild_id
    AND created_by = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM guild_members
    WHERE guild_id = p_guild_id
    AND user_id = auth.uid()
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Not authorized to create expansion for this guild';
  END IF;

  -- Create the expansion
  INSERT INTO expansions (guild_id, name)
  VALUES (p_guild_id, p_name)
  RETURNING id INTO v_expansion_id;

  RETURN v_expansion_id;
END;
$$;

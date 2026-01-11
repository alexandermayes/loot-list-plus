-- Create a function to delete a guild (bypasses RLS)
CREATE OR REPLACE FUNCTION delete_guild(
  p_guild_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- This runs with the privileges of the function owner, not the caller
AS $$
BEGIN
  -- Verify the caller is the guild creator
  IF NOT EXISTS (
    SELECT 1 FROM guilds
    WHERE id = p_guild_id
    AND created_by = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Only the guild creator can delete the guild';
  END IF;

  -- Delete all related data explicitly (in case cascade isn't set up)

  -- Delete user active guild entries
  DELETE FROM user_active_guilds WHERE active_guild_id = p_guild_id;

  -- Delete guild members
  DELETE FROM guild_members WHERE guild_id = p_guild_id;

  -- Delete guild settings
  DELETE FROM guild_settings WHERE guild_id = p_guild_id;

  -- Delete invite codes
  DELETE FROM guild_invite_codes WHERE guild_id = p_guild_id;

  -- Delete loot items for all raid tiers in this guild's expansions
  DELETE FROM loot_items
  WHERE raid_tier_id IN (
    SELECT rt.id FROM raid_tiers rt
    JOIN expansions e ON e.id = rt.expansion_id
    WHERE e.guild_id = p_guild_id
  );

  -- Delete loot submissions
  DELETE FROM loot_submissions WHERE guild_id = p_guild_id;

  -- Delete raid tiers for this guild's expansions
  DELETE FROM raid_tiers
  WHERE expansion_id IN (
    SELECT id FROM expansions WHERE guild_id = p_guild_id
  );

  -- Delete expansions
  DELETE FROM expansions WHERE guild_id = p_guild_id;

  -- Finally, delete the guild itself
  DELETE FROM guilds WHERE id = p_guild_id;
END;
$$;

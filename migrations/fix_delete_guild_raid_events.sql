-- Fix delete_guild function to delete raid_events before raid_tiers
-- raid_events has a foreign key to raid_tiers, so must be deleted first

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

  -- Delete user active guild entries (old system)
  DELETE FROM user_active_guilds WHERE active_guild_id = p_guild_id;

  -- Clear active_guild_id from user_active_characters (new system)
  UPDATE user_active_characters
  SET active_guild_id = NULL, updated_at = NOW()
  WHERE active_guild_id = p_guild_id;

  -- Delete character guild memberships (new system)
  DELETE FROM character_guild_memberships WHERE guild_id = p_guild_id;

  -- Delete guild members (old system)
  DELETE FROM guild_members WHERE guild_id = p_guild_id;

  -- Delete guild roles
  DELETE FROM guild_roles WHERE guild_id = p_guild_id;

  -- Delete guild settings
  DELETE FROM guild_settings WHERE guild_id = p_guild_id;

  -- Delete invite codes
  DELETE FROM guild_invite_codes WHERE guild_id = p_guild_id;

  -- Delete item priorities for this guild
  DELETE FROM guild_item_priorities WHERE guild_id = p_guild_id;

  -- Delete loot items for all raid tiers in this guild's expansions
  DELETE FROM loot_items
  WHERE raid_tier_id IN (
    SELECT rt.id FROM raid_tiers rt
    JOIN expansions e ON e.id = rt.expansion_id
    WHERE e.guild_id = p_guild_id
  );

  -- Delete loot submissions
  DELETE FROM loot_submissions WHERE guild_id = p_guild_id;

  -- Delete raid events (must be deleted before raid_tiers due to foreign key)
  DELETE FROM raid_events WHERE guild_id = p_guild_id;

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

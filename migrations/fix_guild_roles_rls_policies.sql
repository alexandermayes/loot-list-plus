-- Fix guild_roles RLS policies to work with character-based system
-- Drop old policies
DROP POLICY IF EXISTS "Guild members can view guild roles" ON guild_roles;
DROP POLICY IF EXISTS "Officers can create guild roles" ON guild_roles;
DROP POLICY IF EXISTS "Officers can update guild roles" ON guild_roles;
DROP POLICY IF EXISTS "Officers can delete guild roles" ON guild_roles;

-- Guild members can view roles in their guild
CREATE POLICY "Guild members can view guild roles" ON guild_roles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      INNER JOIN characters c ON c.id = cgm.character_id
      WHERE cgm.guild_id = guild_roles.guild_id
      AND c.user_id = auth.uid()
    )
  );

-- Officers can insert roles
CREATE POLICY "Officers can create guild roles" ON guild_roles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      INNER JOIN characters c ON c.id = cgm.character_id
      WHERE cgm.guild_id = guild_roles.guild_id
      AND c.user_id = auth.uid()
      AND cgm.role IN ('Officer', 'Guild Master')
    )
  );

-- Officers can update roles (including renaming defaults)
CREATE POLICY "Officers can update guild roles" ON guild_roles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      INNER JOIN characters c ON c.id = cgm.character_id
      WHERE cgm.guild_id = guild_roles.guild_id
      AND c.user_id = auth.uid()
      AND cgm.role IN ('Officer', 'Guild Master')
    )
  );

-- Officers can delete roles (except defaults)
CREATE POLICY "Officers can delete guild roles" ON guild_roles
  FOR DELETE
  USING (
    is_default = false
    AND EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      INNER JOIN characters c ON c.id = cgm.character_id
      WHERE cgm.guild_id = guild_roles.guild_id
      AND c.user_id = auth.uid()
      AND cgm.role IN ('Officer', 'Guild Master')
    )
  );

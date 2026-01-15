-- Create guild roles system
-- Allows guilds to define custom roles beyond Officer/Member

CREATE TABLE IF NOT EXISTS guild_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guild_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  color_hex VARCHAR(7) DEFAULT '#808080',
  position INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_role_per_guild UNIQUE(guild_id, name)
);

CREATE INDEX IF NOT EXISTS idx_guild_roles_guild_id ON guild_roles(guild_id);
CREATE INDEX IF NOT EXISTS idx_guild_roles_position ON guild_roles(position);

-- Enable RLS
ALTER TABLE guild_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Guild members can view roles in their guild
DROP POLICY IF EXISTS "Guild members can view guild roles" ON guild_roles;
CREATE POLICY "Guild members can view guild roles" ON guild_roles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM guild_members gm
      WHERE gm.guild_id = guild_roles.guild_id
      AND gm.user_id = auth.uid()
      AND gm.is_active = true
    )
  );

-- Officers can insert roles
DROP POLICY IF EXISTS "Officers can create guild roles" ON guild_roles;
CREATE POLICY "Officers can create guild roles" ON guild_roles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM guild_members gm
      WHERE gm.guild_id = guild_roles.guild_id
      AND gm.user_id = auth.uid()
      AND gm.role IN ('Officer', 'Guild Master')
      AND gm.is_active = true
    )
  );

-- Officers can update roles (including renaming defaults)
DROP POLICY IF EXISTS "Officers can update guild roles" ON guild_roles;
CREATE POLICY "Officers can update guild roles" ON guild_roles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM guild_members gm
      WHERE gm.guild_id = guild_roles.guild_id
      AND gm.user_id = auth.uid()
      AND gm.role IN ('Officer', 'Guild Master')
      AND gm.is_active = true
    )
  );

-- Officers can delete roles (except defaults)
DROP POLICY IF EXISTS "Officers can delete guild roles" ON guild_roles;
CREATE POLICY "Officers can delete guild roles" ON guild_roles
  FOR DELETE
  USING (
    is_default = false
    AND EXISTS (
      SELECT 1 FROM guild_members gm
      WHERE gm.guild_id = guild_roles.guild_id
      AND gm.user_id = auth.uid()
      AND gm.role IN ('Officer', 'Guild Master')
      AND gm.is_active = true
    )
  );

-- Seed default roles for all existing guilds (higher position = higher rank)
INSERT INTO guild_roles (guild_id, name, color_hex, position, is_default)
SELECT
  id,
  'Guild Master',
  '#ff8000',
  100,
  true
FROM guilds
WHERE NOT EXISTS (
  SELECT 1 FROM guild_roles WHERE guild_id = guilds.id AND name = 'Guild Master'
);

INSERT INTO guild_roles (guild_id, name, color_hex, position, is_default)
SELECT
  id,
  'Officer',
  '#fbbf24',
  50,
  true
FROM guilds
WHERE NOT EXISTS (
  SELECT 1 FROM guild_roles WHERE guild_id = guilds.id AND name = 'Officer'
);

INSERT INTO guild_roles (guild_id, name, color_hex, position, is_default)
SELECT
  id,
  'Member',
  '#a1a1a1',
  0,
  true
FROM guilds
WHERE NOT EXISTS (
  SELECT 1 FROM guild_roles WHERE guild_id = guilds.id AND name = 'Member'
);

-- Set guild creators to Guild Master role
UPDATE guild_members gm
SET role = 'Guild Master'
FROM guilds g
WHERE gm.guild_id = g.id
AND gm.user_id = g.created_by
AND gm.role != 'Guild Master';

-- Function to enforce max 10 roles per guild
CREATE OR REPLACE FUNCTION check_max_roles_per_guild()
RETURNS TRIGGER AS $$
DECLARE
  role_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO role_count
  FROM guild_roles
  WHERE guild_id = NEW.guild_id;

  IF role_count >= 10 THEN
    RAISE EXCEPTION 'Guild cannot have more than 10 roles';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to check role limit before insert
DROP TRIGGER IF EXISTS enforce_max_roles ON guild_roles;
CREATE TRIGGER enforce_max_roles
  BEFORE INSERT ON guild_roles
  FOR EACH ROW
  EXECUTE FUNCTION check_max_roles_per_guild();

-- Function to create default roles when a new guild is created
CREATE OR REPLACE FUNCTION create_default_guild_roles()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO guild_roles (guild_id, name, color_hex, position, is_default)
  VALUES
    (NEW.id, 'Guild Master', '#ff8000', 100, true),
    (NEW.id, 'Officer', '#fbbf24', 50, true),
    (NEW.id, 'Member', '#a1a1a1', 0, true);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create default roles for new guilds
DROP TRIGGER IF EXISTS create_guild_default_roles ON guilds;
CREATE TRIGGER create_guild_default_roles
  AFTER INSERT ON guilds
  FOR EACH ROW
  EXECUTE FUNCTION create_default_guild_roles();

-- Verify
SELECT
  g.name as guild_name,
  gr.name as role_name,
  gr.color_hex,
  gr.position,
  gr.is_default
FROM guilds g
LEFT JOIN guild_roles gr ON gr.guild_id = g.id
ORDER BY g.name, gr.position;

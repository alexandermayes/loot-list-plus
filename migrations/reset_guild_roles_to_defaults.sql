-- Reset all guild roles to default state
-- This removes all custom roles and ensures only the 3 default roles exist

-- Delete all custom roles (non-default)
DELETE FROM guild_roles WHERE is_default = false;

-- Update any members with custom roles to 'Member'
UPDATE guild_members gm
SET role = 'Member'
WHERE NOT EXISTS (
  SELECT 1 FROM guild_roles gr
  WHERE gr.guild_id = gm.guild_id
  AND gr.name = gm.role
);

-- Ensure all guilds have the 3 default roles
-- Guild Master
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

-- Officer
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

-- Member
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

-- Verify
SELECT
  g.name as guild_name,
  gr.name as role_name,
  gr.color_hex,
  gr.position,
  gr.is_default
FROM guilds g
LEFT JOIN guild_roles gr ON gr.guild_id = g.id
ORDER BY g.name, gr.position DESC;

-- Seed default guild_roles for any guilds that don't have them
-- This ensures all existing guilds have proper role entries for officer permission checks

-- Insert Member role for guilds missing it
INSERT INTO guild_roles (guild_id, name, color_hex, position, is_default)
SELECT g.id, 'Member', '#a1a1a1', 0, true
FROM guilds g
WHERE NOT EXISTS (
  SELECT 1 FROM guild_roles gr
  WHERE gr.guild_id = g.id AND gr.name = 'Member'
);

-- Insert Officer role for guilds missing it
INSERT INTO guild_roles (guild_id, name, color_hex, position, is_default)
SELECT g.id, 'Officer', '#fbbf24', 50, true
FROM guilds g
WHERE NOT EXISTS (
  SELECT 1 FROM guild_roles gr
  WHERE gr.guild_id = g.id AND gr.name = 'Officer'
);

-- Insert Guild Master role for guilds missing it
INSERT INTO guild_roles (guild_id, name, color_hex, position, is_default)
SELECT g.id, 'Guild Master', '#ff8000', 100, true
FROM guilds g
WHERE NOT EXISTS (
  SELECT 1 FROM guild_roles gr
  WHERE gr.guild_id = g.id AND gr.name = 'Guild Master'
);

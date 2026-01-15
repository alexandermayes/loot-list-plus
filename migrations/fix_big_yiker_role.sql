-- Fix "Big Yiker" role that was incorrectly marked as default
-- and delete it

-- First, update any members who have this role to "Member"
UPDATE guild_members
SET role = 'Member'
WHERE role = 'Big Yiker';

-- Delete the Big Yiker role
DELETE FROM guild_roles
WHERE name = 'Big Yiker';

-- Verify - should only show 3 default roles
SELECT
  g.name as guild_name,
  gr.name as role_name,
  gr.is_default,
  gr.position
FROM guilds g
LEFT JOIN guild_roles gr ON gr.guild_id = g.id
ORDER BY g.name, gr.position DESC;

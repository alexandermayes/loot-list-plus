-- Add permissions array to guild_roles for granular per-role permissions.
-- Officers (position >= 50) and Guild Master (position >= 100) get all
-- permissions implicitly via position checks. This column is used to grant
-- specific permissions to custom roles below Officer level.

ALTER TABLE guild_roles ADD COLUMN IF NOT EXISTS permissions TEXT[] DEFAULT '{}';

-- Add a comment for documentation
COMMENT ON COLUMN guild_roles.permissions IS 'Array of permission codes granted to this role. Officers/GM get all permissions implicitly via position >= 50 check.';

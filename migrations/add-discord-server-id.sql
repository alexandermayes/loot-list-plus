-- Add Discord server ID to guilds table for Discord verification
-- This allows us to verify if users are members of the guild's Discord server

ALTER TABLE guilds
ADD COLUMN IF NOT EXISTS discord_server_id VARCHAR(255);

-- Add an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_guilds_discord_server_id ON guilds(discord_server_id);

-- Comment explaining the column
COMMENT ON COLUMN guilds.discord_server_id IS 'Discord server (guild) ID for verification. Find this in Discord by enabling Developer Mode and right-clicking the server.';

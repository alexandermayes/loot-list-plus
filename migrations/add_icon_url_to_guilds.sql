-- Add icon_url column to guilds table
ALTER TABLE guilds ADD COLUMN IF NOT EXISTS icon_url TEXT;

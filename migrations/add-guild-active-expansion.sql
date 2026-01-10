-- Add active_expansion_id to guilds table
-- This migration adds support for tracking the currently active expansion per guild
-- Each guild can have multiple expansions, but only one is active at a time

-- Add the active_expansion_id column to guilds table
ALTER TABLE guilds
ADD COLUMN IF NOT EXISTS active_expansion_id UUID REFERENCES expansions(id) ON DELETE SET NULL;

-- Create index for performance when filtering by active expansion
CREATE INDEX IF NOT EXISTS idx_guilds_active_expansion ON guilds(active_expansion_id);

-- Note: We cannot add a CHECK constraint that references another table in PostgreSQL
-- The constraint ensuring active_expansion belongs to the guild must be enforced at the application level
-- or through triggers. For now, we'll handle this in the application code.

-- Add comment to document the column
COMMENT ON COLUMN guilds.active_expansion_id IS 'The currently active expansion for this guild. Determines which raid tiers and loot items are visible throughout the app.';

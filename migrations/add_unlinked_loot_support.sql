-- Add support for unlinked loot (loot awarded to characters not yet registered in the system)
-- This allows tracking loot history even when players haven't created accounts yet

-- Make character_id nullable to allow unlinked loot
ALTER TABLE loot_history
ALTER COLUMN character_id DROP NOT NULL;

-- Add character_name column for unlinked loot records
ALTER TABLE loot_history
ADD COLUMN IF NOT EXISTS character_name VARCHAR(50);

-- Add comment explaining the columns
COMMENT ON COLUMN loot_history.character_id IS 'References the character who received the item. NULL for unlinked loot.';
COMMENT ON COLUMN loot_history.character_name IS 'Character name for unlinked loot (when character_id is NULL). Used for display and future linking.';

-- Add index for character_name lookups
CREATE INDEX IF NOT EXISTS idx_loot_history_character_name ON loot_history(character_name) WHERE character_name IS NOT NULL;

-- Add constraint: must have either character_id OR character_name
ALTER TABLE loot_history
ADD CONSTRAINT loot_history_character_check
CHECK (character_id IS NOT NULL OR character_name IS NOT NULL);

-- Update RLS policy for viewing unlinked loot (guild members can see all guild loot including unlinked)
-- The existing "Guild members can view guild loot history" policy already covers this case
-- since it checks guild_id membership, not character ownership

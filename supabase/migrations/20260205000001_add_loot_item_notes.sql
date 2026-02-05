-- Add officer_notes column to loot_items table
-- Officers can add notes to items (e.g., "Reserved for tanks", "Priority for mains")

ALTER TABLE loot_items
ADD COLUMN IF NOT EXISTS officer_notes TEXT;

-- Add a comment describing the column
COMMENT ON COLUMN loot_items.officer_notes IS 'Optional notes added by officers about the item (e.g., priority info, restrictions)';

-- Add item classification and item_type columns to loot_items table

-- Add classification column (Reserved, Limited, Unlimited)
ALTER TABLE loot_items
ADD COLUMN IF NOT EXISTS classification TEXT DEFAULT 'Unlimited'
CHECK (classification IN ('Reserved', 'Limited', 'Unlimited'));

-- Add item_type column (for tracking weapon/armor types)
ALTER TABLE loot_items
ADD COLUMN IF NOT EXISTS item_type TEXT;

-- Add allocation_cost column (for calculating bracket points)
ALTER TABLE loot_items
ADD COLUMN IF NOT EXISTS allocation_cost INTEGER DEFAULT 0;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_loot_items_classification ON loot_items(classification);
CREATE INDEX IF NOT EXISTS idx_loot_items_item_type ON loot_items(item_type);

-- Add comments
COMMENT ON COLUMN loot_items.classification IS 'Item rarity classification: Reserved (1 point), Limited (1 point), Unlimited (0 points)';
COMMENT ON COLUMN loot_items.item_type IS 'Item type for duplicate detection (e.g., "One-Handed Sword", "Plate Chest", etc.)';
COMMENT ON COLUMN loot_items.allocation_cost IS 'Bracket allocation point cost: Reserved/Limited = 1, Unlimited = 0';

-- Add availability flag to loot_items table
ALTER TABLE loot_items
ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true;

-- Add spec_type to loot_item_classes for primary/secondary distinction
ALTER TABLE loot_item_classes
ADD COLUMN IF NOT EXISTS spec_type TEXT DEFAULT 'primary'
CHECK (spec_type IN ('primary', 'secondary'));

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_loot_items_is_available ON loot_items(is_available);
CREATE INDEX IF NOT EXISTS idx_loot_item_classes_spec_type ON loot_item_classes(spec_type);

-- Add comments
COMMENT ON COLUMN loot_items.is_available IS 'Whether this item appears in loot list dropdowns';
COMMENT ON COLUMN loot_item_classes.spec_type IS 'Whether this is a primary (main-spec) or secondary (off-spec) item for the class';

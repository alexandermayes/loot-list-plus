-- Add spec_type column to loot_item_classes
-- This column indicates whether the spec restriction is 'primary' or 'secondary'

ALTER TABLE loot_item_classes
ADD COLUMN IF NOT EXISTS spec_type TEXT DEFAULT 'primary'
CHECK (spec_type IN ('primary', 'secondary'));

-- Add index for faster filtering
CREATE INDEX IF NOT EXISTS idx_loot_item_classes_spec_type ON loot_item_classes(spec_type);

-- Add comment
COMMENT ON COLUMN loot_item_classes.spec_type IS 'Whether this is a primary (main-spec) or secondary (off-spec) restriction';

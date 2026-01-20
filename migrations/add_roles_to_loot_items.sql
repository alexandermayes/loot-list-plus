-- Add roles column to loot_items table
-- This column will store which roles (tank, healer, physical, caster) can use each item

DO $$
BEGIN
  -- Add roles column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='loot_items' AND column_name='roles') THEN
    ALTER TABLE loot_items ADD COLUMN roles TEXT[] DEFAULT '{}';
  END IF;
END $$;

-- Add index for roles array for faster filtering
CREATE INDEX IF NOT EXISTS idx_loot_items_roles ON loot_items USING GIN (roles);

-- Set default empty array for existing items (they can be configured in the UI)
UPDATE loot_items SET roles = '{}' WHERE roles IS NULL;

COMMENT ON COLUMN loot_items.roles IS 'Array of roles that can use this item: tank, healer, physical, caster';

-- Create class_specs table for specific class specializations
CREATE TABLE IF NOT EXISTS class_specs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES wow_classes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(class_id, name)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_class_specs_class_id ON class_specs(class_id);

-- Add spec_id column to loot_item_classes (can have both class and spec)
ALTER TABLE loot_item_classes
ADD COLUMN IF NOT EXISTS spec_id UUID REFERENCES class_specs(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_loot_item_classes_spec_id ON loot_item_classes(spec_id);

-- Add comment
COMMENT ON TABLE class_specs IS 'Class specializations (e.g., Holy Paladin, Shadow Priest)';
COMMENT ON COLUMN loot_item_classes.spec_id IS 'Optional specific spec restriction. If null, applies to entire class';

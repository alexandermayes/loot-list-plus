-- =====================================================
-- Add Guardian Druid spec + conversion tracking
-- =====================================================
-- Guardian Druid: separate tank spec (was combined with Feral)
-- Feral Druid: now physical DPS only
-- =====================================================

-- Insert Guardian spec for Druid
INSERT INTO class_specs (class_id, name)
SELECT wc.id, 'Guardian'
FROM wow_classes wc WHERE wc.name = 'Druid'
AND NOT EXISTS (
  SELECT 1 FROM class_specs cs WHERE cs.class_id = wc.id AND cs.name = 'Guardian'
);

-- Add column to track whether a Feral Druid player has seen the conversion prompt
ALTER TABLE characters
ADD COLUMN IF NOT EXISTS guardian_conversion_dismissed BOOLEAN DEFAULT FALSE;

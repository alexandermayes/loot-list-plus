-- =====================================================
-- Add Death Knight and Monk classes + specs
-- =====================================================
-- Death Knight: available from WotLK onwards
-- Monk: available from MoP onwards
-- =====================================================

-- Insert Death Knight if not exists
INSERT INTO wow_classes (name, color_hex)
SELECT 'Death Knight', '#C41E3A'
WHERE NOT EXISTS (SELECT 1 FROM wow_classes WHERE name = 'Death Knight');

-- Insert Monk if not exists
INSERT INTO wow_classes (name, color_hex)
SELECT 'Monk', '#00FF98'
WHERE NOT EXISTS (SELECT 1 FROM wow_classes WHERE name = 'Monk');

-- Insert Death Knight specs
INSERT INTO class_specs (class_id, name)
SELECT wc.id, 'Blood'
FROM wow_classes wc WHERE wc.name = 'Death Knight'
AND NOT EXISTS (
  SELECT 1 FROM class_specs cs WHERE cs.class_id = wc.id AND cs.name = 'Blood'
);

INSERT INTO class_specs (class_id, name)
SELECT wc.id, 'Frost/Unholy'
FROM wow_classes wc WHERE wc.name = 'Death Knight'
AND NOT EXISTS (
  SELECT 1 FROM class_specs cs WHERE cs.class_id = wc.id AND cs.name = 'Frost/Unholy'
);

-- Insert Monk specs
INSERT INTO class_specs (class_id, name)
SELECT wc.id, 'Brewmaster'
FROM wow_classes wc WHERE wc.name = 'Monk'
AND NOT EXISTS (
  SELECT 1 FROM class_specs cs WHERE cs.class_id = wc.id AND cs.name = 'Brewmaster'
);

INSERT INTO class_specs (class_id, name)
SELECT wc.id, 'Windwalker'
FROM wow_classes wc WHERE wc.name = 'Monk'
AND NOT EXISTS (
  SELECT 1 FROM class_specs cs WHERE cs.class_id = wc.id AND cs.name = 'Windwalker'
);

INSERT INTO class_specs (class_id, name)
SELECT wc.id, 'Mistweaver'
FROM wow_classes wc WHERE wc.name = 'Monk'
AND NOT EXISTS (
  SELECT 1 FROM class_specs cs WHERE cs.class_id = wc.id AND cs.name = 'Mistweaver'
);

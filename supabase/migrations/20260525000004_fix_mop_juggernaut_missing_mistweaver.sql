-- Follow-up to 20260525000003: the prior migration only UPDATEd existing Mistweaver
-- rows on Juggernaut's Power Core normal (103918) from secondary to primary. Two
-- of three guild copies have no Mistweaver row at all, so they were skipped.
-- Insert the missing rows here.

BEGIN;

DO $$
DECLARE
  monk_class_id UUID;
  mistweaver_spec_id UUID;
BEGIN
  SELECT id INTO monk_class_id FROM wow_classes WHERE name = 'Monk';
  SELECT id INTO mistweaver_spec_id FROM class_specs
    WHERE name = 'Mistweaver' AND class_id = monk_class_id;

  INSERT INTO loot_item_classes (loot_item_id, class_id, spec_id, spec_type)
  SELECT li.id, monk_class_id, mistweaver_spec_id, 'primary'
  FROM loot_items li
  WHERE li.wowhead_id = 103918
    AND NOT EXISTS (
      SELECT 1 FROM loot_item_classes lic
      WHERE lic.loot_item_id = li.id
        AND lic.spec_id = mistweaver_spec_id
    );
END $$;

COMMIT;

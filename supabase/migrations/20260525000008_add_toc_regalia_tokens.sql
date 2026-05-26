-- T9 25-Heroic (Trial of the Grand Crusader) "Regalia of the Grand X" tokens
-- drop from the Argent Crusade Tribute Chest after Anub'arak Heroic 25. They
-- were missing from the Trial of the Crusader seed, so Wrath guilds couldn't
-- bracket them. Insert the three tokens and their class mappings here for
-- every existing Wrath guild.

DO $$
DECLARE
  v_tier RECORD;
  v_paladin UUID;
  v_priest UUID;
  v_warlock UUID;
  v_hunter UUID;
  v_shaman UUID;
  v_warrior UUID;
  v_dk UUID;
  v_druid UUID;
  v_mage UUID;
  v_rogue UUID;
  v_conq_id UUID;
  v_prot_id UUID;
  v_vanq_id UUID;
BEGIN
  SELECT id INTO v_paladin FROM wow_classes WHERE name = 'Paladin';
  SELECT id INTO v_priest  FROM wow_classes WHERE name = 'Priest';
  SELECT id INTO v_warlock FROM wow_classes WHERE name = 'Warlock';
  SELECT id INTO v_hunter  FROM wow_classes WHERE name = 'Hunter';
  SELECT id INTO v_shaman  FROM wow_classes WHERE name = 'Shaman';
  SELECT id INTO v_warrior FROM wow_classes WHERE name = 'Warrior';
  SELECT id INTO v_dk      FROM wow_classes WHERE name = 'Death Knight';
  SELECT id INTO v_druid   FROM wow_classes WHERE name = 'Druid';
  SELECT id INTO v_mage    FROM wow_classes WHERE name = 'Mage';
  SELECT id INTO v_rogue   FROM wow_classes WHERE name = 'Rogue';

  FOR v_tier IN
    SELECT rt.id
    FROM raid_tiers rt
    JOIN expansions e ON e.id = rt.expansion_id
    WHERE rt.name = 'Trial of the Crusader'
      AND e.name = 'Wrath of the Lich King'
  LOOP
    -- Insert (or fetch) the three tokens.
    INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
      VALUES (v_tier.id, 'Regalia of the Grand Conqueror', 'Argent Crusade Tribute Chest', 'Token', 47557, true)
      ON CONFLICT DO NOTHING;
    INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
      VALUES (v_tier.id, 'Regalia of the Grand Protector', 'Argent Crusade Tribute Chest', 'Token', 47558, true)
      ON CONFLICT DO NOTHING;
    INSERT INTO loot_items (raid_tier_id, name, boss_name, item_slot, wowhead_id, is_available)
      VALUES (v_tier.id, 'Regalia of the Grand Vanquisher', 'Argent Crusade Tribute Chest', 'Token', 47559, true)
      ON CONFLICT DO NOTHING;

    SELECT id INTO v_conq_id FROM loot_items WHERE raid_tier_id = v_tier.id AND wowhead_id = 47557 LIMIT 1;
    SELECT id INTO v_prot_id FROM loot_items WHERE raid_tier_id = v_tier.id AND wowhead_id = 47558 LIMIT 1;
    SELECT id INTO v_vanq_id FROM loot_items WHERE raid_tier_id = v_tier.id AND wowhead_id = 47559 LIMIT 1;

    -- Conqueror → Paladin, Priest, Warlock
    INSERT INTO loot_item_classes (loot_item_id, class_id, spec_id, spec_type)
    SELECT v_conq_id, c, NULL, 'primary'
    FROM unnest(ARRAY[v_paladin, v_priest, v_warlock]) AS c
    WHERE NOT EXISTS (
      SELECT 1 FROM loot_item_classes lic
      WHERE lic.loot_item_id = v_conq_id AND lic.class_id = c AND lic.spec_id IS NULL
    );

    -- Protector → Hunter, Shaman, Warrior
    INSERT INTO loot_item_classes (loot_item_id, class_id, spec_id, spec_type)
    SELECT v_prot_id, c, NULL, 'primary'
    FROM unnest(ARRAY[v_hunter, v_shaman, v_warrior]) AS c
    WHERE NOT EXISTS (
      SELECT 1 FROM loot_item_classes lic
      WHERE lic.loot_item_id = v_prot_id AND lic.class_id = c AND lic.spec_id IS NULL
    );

    -- Vanquisher → Death Knight, Druid, Mage, Rogue
    INSERT INTO loot_item_classes (loot_item_id, class_id, spec_id, spec_type)
    SELECT v_vanq_id, c, NULL, 'primary'
    FROM unnest(ARRAY[v_dk, v_druid, v_mage, v_rogue]) AS c
    WHERE NOT EXISTS (
      SELECT 1 FROM loot_item_classes lic
      WHERE lic.loot_item_id = v_vanq_id AND lic.class_id = c AND lic.spec_id IS NULL
    );
  END LOOP;
END $$;

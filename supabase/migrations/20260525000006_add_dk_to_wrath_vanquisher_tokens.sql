-- Death Knights roll on Vanquisher tokens (alongside Druid/Mage/Rogue) across
-- all Wrath tiers, not just T10. Our mapping previously omitted DK from
-- T7 (Lost/Heroic/Valorous), T8 (Ulduar), T9 (ToC Grand + Trophy of the Crusade),
-- and T10 (Mark of Sanctification) Vanquisher tokens, so DKs in Wrath Classic
-- guilds couldn't bracket their own tier tokens. Backfill the missing rows.

INSERT INTO loot_item_classes (loot_item_id, class_id, spec_id, spec_type)
SELECT li.id, wc.id, NULL, 'primary'
FROM loot_items li
CROSS JOIN wow_classes wc
WHERE li.item_slot = 'Token'
  AND wc.name = 'Death Knight'
  AND (
    li.name LIKE '%Lost Vanquisher%'
    OR li.name LIKE '%Heroic Vanquisher%'
    OR li.name LIKE '%Valorous Vanquisher%'
    OR li.name LIKE '%Vanquisher of Ulduar%'
    OR li.name LIKE '%Regalia of the Grand Vanquisher%'
    OR li.name LIKE '%Vanquisher''s Mark of Sanctification%'
    OR li.name LIKE '%Trophy of the Crusade%'
  )
  AND NOT EXISTS (
    SELECT 1 FROM loot_item_classes lic
    WHERE lic.loot_item_id = li.id
      AND lic.class_id = wc.id
      AND lic.spec_id IS NULL
  );

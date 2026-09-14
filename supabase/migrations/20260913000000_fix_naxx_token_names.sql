-- Fix #269: Naxxramas Tier 3 token names and class restrictions are wrong.
--
-- The 24 Desecrated tokens were seeded with sequential wowhead_ids grouped by
-- armor slot instead of their real ids, so the row label an officer saw did
-- not match the tooltip and icon the id actually opened. TOKEN_CLASS_MAPPING
-- then compounded it by looking up class restrictions by NAME, landing single
-- classes on tokens Wowhead shares across two, four or three classes, so no
-- raider could add the token to a loot list.
--
-- The ids were always correct (loot_history and the addon award path resolve
-- by wowhead_id, not by name), so this migration relabels the 9 already-seeded
-- guild tiers in place, keeping every row's id, and rebuilds the class rows
-- from the corrected mapping. Names come from Wowhead and the wow-classic-items
-- package, the same authoritative table applied to the source data in the
-- companion data fix for #269.

-- Step 1. Authoritative mapping, scoped to this migration only. old_name is
-- the wrong label these rows currently carry (needed to re-point submissions
-- in step 2 before the rename in step 3 overwrites it).
CREATE TEMP TABLE _naxx_t3 (
  wowhead_id integer PRIMARY KEY,
  correct_name text NOT NULL,
  old_name text NOT NULL,
  classes text[] NOT NULL
) ON COMMIT DROP;

INSERT INTO _naxx_t3 (wowhead_id, correct_name, old_name, classes) VALUES
  (22349, 'Desecrated Breastplate', 'Desecrated Breastplate', ARRAY['Warrior','Rogue']),
  (22350, 'Desecrated Tunic', 'Desecrated Tunic', ARRAY['Paladin','Hunter','Shaman','Druid']),
  (22351, 'Desecrated Robe', 'Desecrated Robe', ARRAY['Priest','Mage','Warlock']),
  (22352, 'Desecrated Legplates', 'Desecrated Pauldrons', ARRAY['Warrior','Rogue']),
  (22353, 'Desecrated Helmet', 'Desecrated Spaulders', ARRAY['Warrior','Rogue']),
  (22354, 'Desecrated Pauldrons', 'Desecrated Mantle', ARRAY['Warrior','Rogue']),
  (22355, 'Desecrated Bracers', 'Desecrated Helmet', ARRAY['Warrior','Rogue']),
  (22356, 'Desecrated Waistguard', 'Desecrated Headpiece', ARRAY['Warrior','Rogue']),
  (22357, 'Desecrated Gauntlets', 'Desecrated Circlet', ARRAY['Warrior','Rogue']),
  (22358, 'Desecrated Sabatons', 'Desecrated Waistguard', ARRAY['Warrior','Rogue']),
  (22359, 'Desecrated Legguards', 'Desecrated Girdle', ARRAY['Paladin','Hunter','Shaman','Druid']),
  (22360, 'Desecrated Headpiece', 'Desecrated Belt', ARRAY['Paladin','Hunter','Shaman','Druid']),
  (22361, 'Desecrated Spaulders', 'Desecrated Gauntlets', ARRAY['Paladin','Hunter','Shaman','Druid']),
  (22362, 'Desecrated Wristguards', 'Desecrated Handguards', ARRAY['Paladin','Hunter','Shaman','Druid']),
  (22363, 'Desecrated Girdle', 'Desecrated Gloves', ARRAY['Paladin','Hunter','Shaman','Druid']),
  (22364, 'Desecrated Handguards', 'Desecrated Legplates', ARRAY['Paladin','Hunter','Shaman','Druid']),
  (22365, 'Desecrated Boots', 'Desecrated Legguards', ARRAY['Paladin','Hunter','Shaman','Druid']),
  (22366, 'Desecrated Leggings', 'Desecrated Leggings', ARRAY['Priest','Mage','Warlock']),
  (22367, 'Desecrated Circlet', 'Desecrated Sandals', ARRAY['Priest','Mage','Warlock']),
  (22368, 'Desecrated Shoulderpads', 'Desecrated Sabatons', ARRAY['Priest','Mage','Warlock']),
  (22369, 'Desecrated Bindings', 'Desecrated Boots', ARRAY['Priest','Mage','Warlock']),
  (22370, 'Desecrated Belt', 'Desecrated Bindings', ARRAY['Priest','Mage','Warlock']),
  (22371, 'Desecrated Gloves', 'Desecrated Wristguards', ARRAY['Priest','Mage','Warlock']),
  (22372, 'Desecrated Sandals', 'Desecrated Bracers', ARRAY['Priest','Mage','Warlock']);

-- Step 2. Re-point loot_submission_items BEFORE the rename, while each source
-- row still carries its stale label, to preserve what the player actually
-- picked. s is the source loot_items row a submission currently points at, m
-- is its mapping row (by wowhead_id), t is the mapping row whose correct_name
-- equals m.old_name (that is, the item that used to carry the label the
-- player saw), and target is the loot_items row for t's wowhead_id in the
-- SAME raid_tier_id as s.
--
-- Guards carry the whole safety argument:
--   - s.name = m.old_name makes this idempotent: on a second run the row
--     already carries correct_name, so this predicate is false and nothing
--     moves.
--   - m.old_name <> m.correct_name turns the four already-correct ids
--     (22349, 22350, 22351, 22366) into no-ops.
--   - Joining t on t.correct_name = m.old_name is what leaves submissions
--     pointing at 22354 unchanged: its old label was "Desecrated Mantle",
--     which is not a real item, so no t row has that correct_name, no target
--     is found, and the submission keeps pointing at 22354 (which step 3
--     relabels to its real name, "Desecrated Pauldrons").
--   - target.raid_tier_id = s.raid_tier_id, a plain equality and not a
--     null-tolerant comparison, confines every move to one guild's own tier.
--     Rows with a null raid_tier_id are deliberately skipped: there is no way
--     to scope them to a single guild, and a cross-guild move would be far
--     worse than a stale label.
--   - target.id <> s.id avoids a no-op self-update.
-- The unique constraint on loot_submission_items is (submission_id, rank,
-- slot), which loot_item_id is not part of, so re-pointing it cannot violate
-- that constraint, and the old-to-new name mapping is a bijection (aside from
-- the 22354/Shoulderpads exception handled above), so two items in the same
-- submission cannot collide on the same target.
UPDATE loot_submission_items lsi
SET loot_item_id = target.id
FROM loot_items s
JOIN _naxx_t3 m ON m.wowhead_id = s.wowhead_id
JOIN _naxx_t3 t ON t.correct_name = m.old_name
JOIN loot_items target ON target.wowhead_id = t.wowhead_id
  AND target.item_slot = 'Token'
  AND target.raid_tier_id = s.raid_tier_id
WHERE lsi.loot_item_id = s.id
  AND s.item_slot = 'Token'
  AND s.wowhead_id BETWEEN 22349 AND 22372
  AND s.name = m.old_name
  AND m.old_name <> m.correct_name
  AND target.id <> s.id;

-- Step 3. Rename in place. Only the name changes: wowhead_id, classification,
-- allocation_cost, icon_url, is_available and notes are left exactly as
-- guilds tuned them. Each row keeps its wowhead_id on purpose, because
-- loot_history and the addon award path resolve by id, so every historical
-- award already points at the item that was actually awarded and needs no
-- change here. Skipping rows whose name already equals correct_name makes
-- this a no-op on a second run.
UPDATE loot_items li
SET name = m.correct_name
FROM _naxx_t3 m
WHERE li.wowhead_id = m.wowhead_id
  AND li.item_slot = 'Token'
  AND li.wowhead_id BETWEEN 22349 AND 22372
  AND li.name <> m.correct_name;

-- Step 4. Rebuild the class rows. Delete every loot_item_classes row that
-- belongs to a token in scope, then reinsert one row per allowed class,
-- reproducing exactly what expansionSeeder writes at seed time: spec_id null
-- and spec_type 'primary', class id resolved by joining wow_classes on name.
-- Delete-then-insert is what makes this step idempotent, and the ANY form
-- against the classes array (rather than an unnest in the FROM clause) keeps
-- every statement in this file scoped to the five allowed tables. The unique
-- constraint on loot_item_classes is (loot_item_id, spec_id, spec_type) with
-- spec_id null; Postgres treats those nulls as distinct, so the 2 to 4 rows
-- per token do not collide and no ON CONFLICT clause is needed.
DELETE FROM loot_item_classes lic
USING loot_items li
JOIN _naxx_t3 m ON m.wowhead_id = li.wowhead_id
WHERE lic.loot_item_id = li.id
  AND li.item_slot = 'Token';

INSERT INTO loot_item_classes (loot_item_id, class_id, spec_id, spec_type)
SELECT li.id, wc.id, NULL, 'primary'
FROM loot_items li
JOIN _naxx_t3 m ON m.wowhead_id = li.wowhead_id
JOIN wow_classes wc ON wc.name = ANY (m.classes)
WHERE li.item_slot = 'Token';

-- Step 5. Verification only, NOT executed. Paste these into Supabase Studio
-- after deploy to confirm the repair. Both queries return aggregate counts
-- only; no player, character or guild identifying data is to be pulled into
-- a chat, a commit or any artifact.
--
-- Expect zero rows: in-scope loot_items whose name still disagrees with the
-- authoritative name.
--
-- select count(*)
-- from loot_items li
-- join _naxx_t3 m on m.wowhead_id = li.wowhead_id
-- where li.item_slot = 'Token'
--   and li.name <> m.correct_name;
--
-- Expect 2 per plate token, 4 per mail token, 3 per cloth token: a per-token
-- count of rebuilt loot_item_classes rows.
--
-- select li.wowhead_id, li.name, count(lic.*) as class_count
-- from loot_items li
-- join _naxx_t3 m on m.wowhead_id = li.wowhead_id
-- left join loot_item_classes lic on lic.loot_item_id = li.id
-- where li.item_slot = 'Token'
-- group by li.wowhead_id, li.name
-- order by li.wowhead_id;

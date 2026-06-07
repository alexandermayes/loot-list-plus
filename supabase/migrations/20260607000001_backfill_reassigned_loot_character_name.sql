-- Repair loot_history rows whose character_name was nulled out by the old
-- reassign behavior. Reassigning loot used to set character_id to the new owner
-- but blank the character_name, so any name-based view (master sheet, exports,
-- raid-tracking grouping) showed the wrong owner or "Unknown".
--
-- The reassign code now stores the new owner's name alongside character_id; this
-- backfills the rows already corrupted across every guild.

UPDATE public.loot_history AS lh
SET character_name = c.name
FROM public.characters AS c
WHERE lh.character_id = c.id
  AND lh.character_name IS NULL;

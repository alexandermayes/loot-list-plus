-- Re-group the Hyjal jewelcrafting designs under 'Shared Boss Loot'.
--
-- 20260728000001 seeded these 8 designs with boss_name 'Trash', which is
-- wrong: they drop from all five Hyjal Summit bosses (Rage Winterchill,
-- Anetheron, Kaz'rogal, Azgalor, Archimonde) and not from trash at all. That
-- was established while verifying the Tier 6 crafting recipes for #200 —
-- Wowhead's drop table for each design lists exactly those five bosses.
--
-- The consequence is display-only: raiders could always list the designs, but
-- an officer awarding loot after a boss kill wouldn't find them under that
-- boss. Still wrong, so fix it.
--
-- A loot_items row carries a single boss_name, so a five-boss drop can't be
-- attributed to one encounter. Duplicating each design under all five bosses
-- would also break the one-row-per-(wowhead_id, raid_tier_id) assumption the
-- backfill migrations' NOT EXISTS guards depend on. Hence a shared bucket,
-- matching the 'Shared Boss Loot' group added to data/tbc-raids.ts so newly
-- seeded and existing guilds converge.
--
-- 'Shared Boss Loot' is not a new convention: Siege of Orgrimmar already uses
-- that exact group name in data/mop-raids.ts for its multi-boss loot pool
-- (GH #65). Reusing it rather than inventing a parallel name.
--
-- Scoped to boss_name = 'Trash' so this only touches rows this project seeded
-- and leaves any guild's manual re-categorisation alone. Idempotent: a second
-- run matches nothing.

UPDATE loot_items li
SET boss_name = 'Shared Boss Loot'
FROM raid_tiers rt
WHERE li.raid_tier_id = rt.id
  AND rt.name = 'Hyjal Summit'
  AND li.boss_name = 'Trash'
  AND li.wowhead_id IN (32285, 32289, 32295, 32296, 32297, 32298, 32303, 32307);

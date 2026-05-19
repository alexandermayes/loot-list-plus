-- Roll back the per-character numeric override system shipped on 2026-05-18.
-- Per-character rank assignment is now expressed by setting each character's
-- own role via character_guild_memberships.role (which already exists).

ALTER TABLE guild_settings
  DROP COLUMN IF EXISTS character_rank_overrides;

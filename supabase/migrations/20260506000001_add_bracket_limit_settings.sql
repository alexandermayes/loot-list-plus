-- Add configurable bracket limit settings to guild_settings.
-- These were previously hardcoded: 3 allocation points, 1 token, 1 category per bracket.

ALTER TABLE guild_settings
  ADD COLUMN IF NOT EXISTS max_allocation_points_per_bracket integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS max_tokens_per_bracket integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_category_per_bracket integer NOT NULL DEFAULT 1;

-- Constrain to reasonable ranges
ALTER TABLE guild_settings
  ADD CONSTRAINT chk_max_allocation_points CHECK (max_allocation_points_per_bracket BETWEEN 1 AND 6),
  ADD CONSTRAINT chk_max_tokens CHECK (max_tokens_per_bracket BETWEEN 1 AND 6),
  ADD CONSTRAINT chk_max_category CHECK (max_category_per_bracket BETWEEN 1 AND 6);

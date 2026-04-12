-- =============================================================================
-- LootList+ Reserve: reserve_runs, reserve_submissions, reserve_awards
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Share token generator (8-char alphanumeric, no ambiguous chars)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION generate_reserve_token()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'abcdefghjkmnpqrstuvwxyz23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- -----------------------------------------------------------------------------
-- reserve_runs
-- -----------------------------------------------------------------------------
CREATE TABLE reserve_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  guild_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  raid_team_id UUID REFERENCES raid_teams(id) ON DELETE SET NULL,
  expansion_id UUID NOT NULL REFERENCES expansions(id),
  raid_tier_id UUID NOT NULL REFERENCES raid_tiers(id),
  title TEXT NOT NULL,
  share_token TEXT NOT NULL UNIQUE DEFAULT generate_reserve_token(),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'locked', 'completed')),
  raid_at TIMESTAMPTZ NOT NULL,
  lock_at TIMESTAMPTZ NOT NULL,
  locked_at TIMESTAMPTZ,
  max_reserves INTEGER NOT NULL DEFAULT 2 CHECK (max_reserves BETWEEN 1 AND 10),
  allow_duplicates BOOLEAN NOT NULL DEFAULT false,
  visibility TEXT NOT NULL DEFAULT 'hidden_until_lock' CHECK (visibility IN ('public_live', 'hidden_until_lock')),
  rules_note TEXT,
  hard_reserves JSONB NOT NULL DEFAULT '[]'::jsonb,
  rule_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE reserve_runs ENABLE ROW LEVEL SECURITY;

-- SELECT: guild members can view
CREATE POLICY "reserve_runs_select" ON reserve_runs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      JOIN characters c ON c.id = cgm.character_id
      WHERE cgm.guild_id = reserve_runs.guild_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
    )
  );

-- INSERT: officers + guild creator
CREATE POLICY "reserve_runs_insert" ON reserve_runs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      JOIN characters c ON c.id = cgm.character_id
      WHERE cgm.guild_id = reserve_runs.guild_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
      AND cgm.role IN ('Officer', 'Guild Master')
    )
    OR EXISTS (
      SELECT 1 FROM guilds g
      WHERE g.id = reserve_runs.guild_id
      AND g.created_by = auth.uid()
    )
  );

-- UPDATE: officers + guild creator
CREATE POLICY "reserve_runs_update" ON reserve_runs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      JOIN characters c ON c.id = cgm.character_id
      WHERE cgm.guild_id = reserve_runs.guild_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
      AND cgm.role IN ('Officer', 'Guild Master')
    )
    OR EXISTS (
      SELECT 1 FROM guilds g
      WHERE g.id = reserve_runs.guild_id
      AND g.created_by = auth.uid()
    )
  );

-- DELETE: officers + guild creator
CREATE POLICY "reserve_runs_delete" ON reserve_runs
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      JOIN characters c ON c.id = cgm.character_id
      WHERE cgm.guild_id = reserve_runs.guild_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
      AND cgm.role IN ('Officer', 'Guild Master')
    )
    OR EXISTS (
      SELECT 1 FROM guilds g
      WHERE g.id = reserve_runs.guild_id
      AND g.created_by = auth.uid()
    )
  );

-- Indexes
CREATE INDEX idx_reserve_runs_guild_id ON reserve_runs(guild_id);
CREATE INDEX idx_reserve_runs_created_by ON reserve_runs(created_by);

-- Updated_at trigger
CREATE TRIGGER trg_reserve_runs_updated_at
  BEFORE UPDATE ON reserve_runs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- reserve_submissions
-- -----------------------------------------------------------------------------
CREATE TABLE reserve_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reserve_run_id UUID NOT NULL REFERENCES reserve_runs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  character_name TEXT NOT NULL,
  character_class TEXT NOT NULL,
  character_spec TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'withdrawn')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One submission per character name per run
CREATE UNIQUE INDEX idx_reserve_submissions_unique_char
  ON reserve_submissions(reserve_run_id, lower(character_name));

ALTER TABLE reserve_submissions ENABLE ROW LEVEL SECURITY;

-- SELECT: guild members can view submissions for their guild's runs
CREATE POLICY "reserve_submissions_select" ON reserve_submissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM reserve_runs rr
      JOIN character_guild_memberships cgm ON cgm.guild_id = rr.guild_id
      JOIN characters c ON c.id = cgm.character_id
      WHERE rr.id = reserve_submissions.reserve_run_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
    )
  );

-- INSERT/UPDATE/DELETE: service role only (public API handles validation)
-- No user-facing policies for writes — all writes go through service role

-- Indexes
CREATE INDEX idx_reserve_submissions_run_id ON reserve_submissions(reserve_run_id);
CREATE INDEX idx_reserve_submissions_user_id ON reserve_submissions(user_id) WHERE user_id IS NOT NULL;

-- Updated_at trigger
CREATE TRIGGER trg_reserve_submissions_updated_at
  BEFORE UPDATE ON reserve_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- reserve_awards
-- -----------------------------------------------------------------------------
CREATE TABLE reserve_awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reserve_run_id UUID NOT NULL REFERENCES reserve_runs(id) ON DELETE CASCADE,
  loot_item_id UUID NOT NULL REFERENCES loot_items(id),
  submission_id UUID REFERENCES reserve_submissions(id) ON DELETE SET NULL,
  character_name TEXT NOT NULL,
  awarded_by UUID NOT NULL REFERENCES auth.users(id),
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

ALTER TABLE reserve_awards ENABLE ROW LEVEL SECURITY;

-- SELECT: guild members can view
CREATE POLICY "reserve_awards_select" ON reserve_awards
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM reserve_runs rr
      JOIN character_guild_memberships cgm ON cgm.guild_id = rr.guild_id
      JOIN characters c ON c.id = cgm.character_id
      WHERE rr.id = reserve_awards.reserve_run_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
    )
  );

-- INSERT: officers + guild creator
CREATE POLICY "reserve_awards_insert" ON reserve_awards
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM reserve_runs rr
      JOIN character_guild_memberships cgm ON cgm.guild_id = rr.guild_id
      JOIN characters c ON c.id = cgm.character_id
      WHERE rr.id = reserve_awards.reserve_run_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
      AND cgm.role IN ('Officer', 'Guild Master')
    )
    OR EXISTS (
      SELECT 1 FROM reserve_runs rr
      JOIN guilds g ON g.id = rr.guild_id
      WHERE rr.id = reserve_awards.reserve_run_id
      AND g.created_by = auth.uid()
    )
  );

-- DELETE: officers + guild creator
CREATE POLICY "reserve_awards_delete" ON reserve_awards
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM reserve_runs rr
      JOIN character_guild_memberships cgm ON cgm.guild_id = rr.guild_id
      JOIN characters c ON c.id = cgm.character_id
      WHERE rr.id = reserve_awards.reserve_run_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
      AND cgm.role IN ('Officer', 'Guild Master')
    )
    OR EXISTS (
      SELECT 1 FROM reserve_runs rr
      JOIN guilds g ON g.id = rr.guild_id
      WHERE rr.id = reserve_awards.reserve_run_id
      AND g.created_by = auth.uid()
    )
  );

-- Indexes
CREATE INDEX idx_reserve_awards_run_id ON reserve_awards(reserve_run_id);

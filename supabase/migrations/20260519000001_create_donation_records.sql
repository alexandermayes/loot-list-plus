-- =============================================================================
-- LootList+ Donations: donation_records
-- -----------------------------------------------------------------------------
-- Officers log bank donations (gold, materials, consumables) and award a signed
-- point value that feeds into the raider's Loot Score via the scoring engine.
--
-- Score impact is opt-in per guild via the existing donation_bonuses_enabled
-- setting. This migration creates the records table only; the engine wire-up
-- and API surface ship in subsequent PRs.
-- =============================================================================

CREATE TABLE donation_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,

  -- Character may be deleted; keep the donation row but null the FK.
  -- Denormalized character_name preserves the audit trail.
  character_id UUID REFERENCES characters(id) ON DELETE SET NULL,
  character_name TEXT NOT NULL,

  -- Signed score impact. Negative values are clawbacks / revocations.
  points NUMERIC(6, 2) NOT NULL,

  kind TEXT NOT NULL CHECK (kind IN ('gold', 'materials', 'consumables', 'other')),

  -- Free-form description ("50,000g", "200 flasks", "stack of saronite").
  -- Intentionally not normalized — donations are too heterogeneous.
  amount_text TEXT,

  note TEXT,

  awarded_at DATE NOT NULL DEFAULT CURRENT_DATE,
  awarded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_donation_points_range CHECK (points BETWEEN -1000 AND 1000)
);

CREATE INDEX idx_donation_records_guild_awarded
  ON donation_records(guild_id, awarded_at DESC);

CREATE INDEX idx_donation_records_character_awarded
  ON donation_records(character_id, awarded_at DESC)
  WHERE character_id IS NOT NULL;

CREATE TRIGGER trg_donation_records_updated_at
  BEFORE UPDATE ON donation_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- RLS — CGM-based (post-guild_members drop, matches reserve_runs pattern)
-- -----------------------------------------------------------------------------
ALTER TABLE donation_records ENABLE ROW LEVEL SECURITY;

-- SELECT: any active guild member
CREATE POLICY "donation_records_select" ON donation_records
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      JOIN characters c ON c.id = cgm.character_id
      WHERE cgm.guild_id = donation_records.guild_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
    )
  );

-- INSERT: officers + guild creator
CREATE POLICY "donation_records_insert" ON donation_records
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      JOIN characters c ON c.id = cgm.character_id
      WHERE cgm.guild_id = donation_records.guild_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
      AND cgm.role IN ('Officer', 'Guild Master')
    )
    OR EXISTS (
      SELECT 1 FROM guilds g
      WHERE g.id = donation_records.guild_id
      AND g.created_by = auth.uid()
    )
  );

-- UPDATE: officers + guild creator
CREATE POLICY "donation_records_update" ON donation_records
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      JOIN characters c ON c.id = cgm.character_id
      WHERE cgm.guild_id = donation_records.guild_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
      AND cgm.role IN ('Officer', 'Guild Master')
    )
    OR EXISTS (
      SELECT 1 FROM guilds g
      WHERE g.id = donation_records.guild_id
      AND g.created_by = auth.uid()
    )
  );

-- DELETE: officers + guild creator
-- Note: the API layer should prefer writing offsetting records over hard deletes
-- to preserve the audit trail. DELETE is exposed for cleanup of obvious mistakes.
CREATE POLICY "donation_records_delete" ON donation_records
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      JOIN characters c ON c.id = cgm.character_id
      WHERE cgm.guild_id = donation_records.guild_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
      AND cgm.role IN ('Officer', 'Guild Master')
    )
    OR EXISTS (
      SELECT 1 FROM guilds g
      WHERE g.id = donation_records.guild_id
      AND g.created_by = auth.uid()
    )
  );

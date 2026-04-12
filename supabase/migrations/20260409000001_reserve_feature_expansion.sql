-- =============================================================================
-- Reserve feature expansion: per-item cap, discord link, class restrict, audit
-- =============================================================================

-- -----------------------------------------------------------------------------
-- New columns on reserve_runs
-- -----------------------------------------------------------------------------
ALTER TABLE reserve_runs
  ADD COLUMN IF NOT EXISTS max_reserves_per_item INTEGER,
  ADD COLUMN IF NOT EXISTS discord_invite_url TEXT,
  ADD COLUMN IF NOT EXISTS enforce_class_restrictions BOOLEAN NOT NULL DEFAULT false;

-- max_reserves_per_item NULL means unlimited; positive integer means cap
ALTER TABLE reserve_runs
  ADD CONSTRAINT reserve_runs_max_reserves_per_item_check
  CHECK (max_reserves_per_item IS NULL OR max_reserves_per_item > 0);

-- -----------------------------------------------------------------------------
-- reserve_audit_log
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reserve_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reserve_run_id UUID NOT NULL REFERENCES reserve_runs(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES auth.users(id),
  actor_label TEXT,
  action TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reserve_audit_log_run_id ON reserve_audit_log(reserve_run_id);
CREATE INDEX IF NOT EXISTS idx_reserve_audit_log_created_at ON reserve_audit_log(created_at DESC);

ALTER TABLE reserve_audit_log ENABLE ROW LEVEL SECURITY;

-- SELECT: guild members of the run's guild can view
CREATE POLICY "reserve_audit_log_select" ON reserve_audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM reserve_runs rr
      JOIN character_guild_memberships cgm ON cgm.guild_id = rr.guild_id
      JOIN characters c ON c.id = cgm.character_id
      WHERE rr.id = reserve_audit_log.reserve_run_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
    )
  );

-- Writes via service role only

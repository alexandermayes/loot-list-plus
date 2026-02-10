-- Audit logging system for tracking sensitive data changes
-- Tracks who changed what, when, and the before/after values

-- Create audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID REFERENCES guilds(id) ON DELETE SET NULL,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  old_data JSONB,
  new_data JSONB,
  changed_fields TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_guild_created ON audit_logs(guild_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Officers can view audit logs for their guilds
CREATE POLICY "Officers can view guild audit logs"
  ON audit_logs
  FOR SELECT
  USING (
    -- Guild-specific logs: require officer role
    (
      guild_id IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM guild_members gm
        JOIN guild_roles gr ON gr.guild_id = gm.guild_id AND gr.name = gm.role
        WHERE gm.guild_id = audit_logs.guild_id
          AND gm.user_id = auth.uid()
          AND gr.position >= 50
      )
    )
    OR
    -- Guild-specific logs: guild creator
    (
      guild_id IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM guilds
        WHERE guilds.id = audit_logs.guild_id
          AND guilds.created_by = auth.uid()
      )
    )
    OR
    -- User's own actions (non-guild-specific)
    (guild_id IS NULL AND user_id = auth.uid())
  );

-- RLS Policy: Allow authenticated users to insert audit logs
-- (Actual insert is done via server-side code with service role)
CREATE POLICY "Service role can insert audit logs"
  ON audit_logs
  FOR INSERT
  WITH CHECK (true);

-- RLS Policy: No updates allowed (audit logs are immutable)
-- RLS Policy: No deletes allowed (audit logs are immutable)

-- Add comment for documentation
COMMENT ON TABLE audit_logs IS 'Immutable audit trail for sensitive data changes. Tracks who changed what, when, and the before/after values.';
COMMENT ON COLUMN audit_logs.table_name IS 'The database table that was modified (e.g., loot_submissions, guild_settings)';
COMMENT ON COLUMN audit_logs.record_id IS 'The UUID of the record that was modified';
COMMENT ON COLUMN audit_logs.action IS 'The type of change: INSERT, UPDATE, or DELETE';
COMMENT ON COLUMN audit_logs.old_data IS 'The record state before the change (null for INSERTs)';
COMMENT ON COLUMN audit_logs.new_data IS 'The record state after the change (null for DELETEs)';
COMMENT ON COLUMN audit_logs.changed_fields IS 'Array of field names that were modified (for UPDATEs)';

-- Add addon support: sync tokens table and source tracking on loot_history

-- Sync tokens for companion app authentication
CREATE TABLE IF NOT EXISTS addon_sync_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(guild_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_addon_sync_tokens_guild ON addon_sync_tokens(guild_id);
CREATE INDEX IF NOT EXISTS idx_addon_sync_tokens_hash ON addon_sync_tokens(token_hash);

-- Enable RLS
ALTER TABLE addon_sync_tokens ENABLE ROW LEVEL SECURITY;

-- Users can view their own tokens
CREATE POLICY "Users can view own sync tokens"
  ON addon_sync_tokens FOR SELECT
  USING (user_id = auth.uid());

-- Users can delete their own tokens
CREATE POLICY "Users can delete own sync tokens"
  ON addon_sync_tokens FOR DELETE
  USING (user_id = auth.uid());

-- Track award source on loot_history
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'loot_history' AND column_name = 'source'
  ) THEN
    ALTER TABLE loot_history
      ADD COLUMN source TEXT DEFAULT 'web'
      CHECK (source IN ('web', 'addon', 'import'));
  END IF;
END
$$;

-- =============================================================================
-- Raid Teams: Multi-team support for Pro guilds
-- =============================================================================
-- Adds:
--   1. subscription_tier column on guilds (feature gating)
--   2. raid_teams table (team definitions per guild)
--   3. raid_team_members table (character-to-team assignments)
--   4. raid_team_id column on raid_events (nullable, backward compat)
--   5. RLS policies for new tables
-- =============================================================================

-- 1. Feature gating column
ALTER TABLE guilds ADD COLUMN subscription_tier TEXT NOT NULL DEFAULT 'free'
  CHECK (subscription_tier IN ('free', 'pro'));

-- 2. Raid teams table
CREATE TABLE raid_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color_hex TEXT DEFAULT '#ff8000',
  is_default BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  raid_days_override JSONB,           -- NULL = inherit from guild_settings
  rolling_weeks_override INTEGER,     -- NULL = inherit from guild_settings
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(guild_id, name)
);

-- 3. Team membership (characters can be on multiple teams)
CREATE TABLE raid_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raid_team_id UUID NOT NULL REFERENCES raid_teams(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  guild_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'Raider',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(raid_team_id, character_id)
);

-- 4. Link raid events to teams (nullable = backward compat)
ALTER TABLE raid_events ADD COLUMN raid_team_id UUID REFERENCES raid_teams(id) ON DELETE SET NULL;

-- 5. Indexes
CREATE INDEX idx_raid_teams_guild_id ON raid_teams(guild_id);
CREATE INDEX idx_raid_team_members_team_id ON raid_team_members(raid_team_id);
CREATE INDEX idx_raid_team_members_character_id ON raid_team_members(character_id);
CREATE INDEX idx_raid_team_members_guild_id ON raid_team_members(guild_id);
CREATE INDEX idx_raid_events_raid_team_id ON raid_events(raid_team_id);

-- =============================================================================
-- 6. RLS policies for raid_teams
-- =============================================================================
ALTER TABLE raid_teams ENABLE ROW LEVEL SECURITY;

-- Guild members can view teams
CREATE POLICY "raid_teams_select" ON raid_teams
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      JOIN characters c ON c.id = cgm.character_id
      WHERE cgm.guild_id = raid_teams.guild_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
    )
  );

-- Officers can insert teams
CREATE POLICY "raid_teams_insert" ON raid_teams
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      JOIN characters c ON c.id = cgm.character_id
      WHERE cgm.guild_id = raid_teams.guild_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
      AND cgm.role IN ('Officer', 'Guild Master')
    )
    OR
    EXISTS (
      SELECT 1 FROM guilds g
      WHERE g.id = raid_teams.guild_id
      AND g.created_by = auth.uid()
    )
  );

-- Officers can update teams
CREATE POLICY "raid_teams_update" ON raid_teams
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      JOIN characters c ON c.id = cgm.character_id
      WHERE cgm.guild_id = raid_teams.guild_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
      AND cgm.role IN ('Officer', 'Guild Master')
    )
    OR
    EXISTS (
      SELECT 1 FROM guilds g
      WHERE g.id = raid_teams.guild_id
      AND g.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      JOIN characters c ON c.id = cgm.character_id
      WHERE cgm.guild_id = raid_teams.guild_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
      AND cgm.role IN ('Officer', 'Guild Master')
    )
    OR
    EXISTS (
      SELECT 1 FROM guilds g
      WHERE g.id = raid_teams.guild_id
      AND g.created_by = auth.uid()
    )
  );

-- Officers can delete teams
CREATE POLICY "raid_teams_delete" ON raid_teams
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      JOIN characters c ON c.id = cgm.character_id
      WHERE cgm.guild_id = raid_teams.guild_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
      AND cgm.role IN ('Officer', 'Guild Master')
    )
    OR
    EXISTS (
      SELECT 1 FROM guilds g
      WHERE g.id = raid_teams.guild_id
      AND g.created_by = auth.uid()
    )
  );

-- =============================================================================
-- 7. RLS policies for raid_team_members
-- =============================================================================
ALTER TABLE raid_team_members ENABLE ROW LEVEL SECURITY;

-- Guild members can view team members
CREATE POLICY "raid_team_members_select" ON raid_team_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      JOIN characters c ON c.id = cgm.character_id
      WHERE cgm.guild_id = raid_team_members.guild_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
    )
  );

-- Officers can insert team members
CREATE POLICY "raid_team_members_insert" ON raid_team_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      JOIN characters c ON c.id = cgm.character_id
      WHERE cgm.guild_id = raid_team_members.guild_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
      AND cgm.role IN ('Officer', 'Guild Master')
    )
    OR
    EXISTS (
      SELECT 1 FROM guilds g
      WHERE g.id = raid_team_members.guild_id
      AND g.created_by = auth.uid()
    )
  );

-- Officers can update team members
CREATE POLICY "raid_team_members_update" ON raid_team_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      JOIN characters c ON c.id = cgm.character_id
      WHERE cgm.guild_id = raid_team_members.guild_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
      AND cgm.role IN ('Officer', 'Guild Master')
    )
    OR
    EXISTS (
      SELECT 1 FROM guilds g
      WHERE g.id = raid_team_members.guild_id
      AND g.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      JOIN characters c ON c.id = cgm.character_id
      WHERE cgm.guild_id = raid_team_members.guild_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
      AND cgm.role IN ('Officer', 'Guild Master')
    )
    OR
    EXISTS (
      SELECT 1 FROM guilds g
      WHERE g.id = raid_team_members.guild_id
      AND g.created_by = auth.uid()
    )
  );

-- Officers can delete team members
CREATE POLICY "raid_team_members_delete" ON raid_team_members
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      JOIN characters c ON c.id = cgm.character_id
      WHERE cgm.guild_id = raid_team_members.guild_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
      AND cgm.role IN ('Officer', 'Guild Master')
    )
    OR
    EXISTS (
      SELECT 1 FROM guilds g
      WHERE g.id = raid_team_members.guild_id
      AND g.created_by = auth.uid()
    )
  );

-- =============================================================================
-- 8. Hardcode Big Yikes guilds as Pro
-- =============================================================================
UPDATE guilds SET subscription_tier = 'pro'
  WHERE name ILIKE '%big yikes%';

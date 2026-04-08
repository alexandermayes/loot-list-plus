-- Allow reserve runs without a guild (quick runs for pugs)
ALTER TABLE reserve_runs ALTER COLUMN guild_id DROP NOT NULL;
ALTER TABLE reserve_runs ALTER COLUMN expansion_id DROP NOT NULL;

-- Drop existing RLS policies that require guild membership
DROP POLICY IF EXISTS "reserve_runs_select" ON reserve_runs;
DROP POLICY IF EXISTS "reserve_runs_insert" ON reserve_runs;
DROP POLICY IF EXISTS "reserve_runs_update" ON reserve_runs;
DROP POLICY IF EXISTS "reserve_runs_delete" ON reserve_runs;

-- New SELECT policy: guild members OR run creator
CREATE POLICY "reserve_runs_select" ON reserve_runs
  FOR SELECT
  USING (
    created_by = auth.uid()
    OR (
      guild_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM character_guild_memberships cgm
        JOIN characters c ON c.id = cgm.character_id
        WHERE cgm.guild_id = reserve_runs.guild_id
        AND c.user_id = auth.uid()
        AND cgm.is_active = true
      )
    )
  );

-- New INSERT policy: any authenticated user
CREATE POLICY "reserve_runs_insert" ON reserve_runs
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- New UPDATE policy: creator OR guild officers
CREATE POLICY "reserve_runs_update" ON reserve_runs
  FOR UPDATE
  USING (
    created_by = auth.uid()
    OR (
      guild_id IS NOT NULL AND (
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
      )
    )
  );

-- New DELETE policy: creator OR guild officers
CREATE POLICY "reserve_runs_delete" ON reserve_runs
  FOR DELETE
  USING (
    created_by = auth.uid()
    OR (
      guild_id IS NOT NULL AND (
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
      )
    )
  );

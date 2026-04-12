-- =============================================================================
-- Fix RLS role case mismatch
-- =============================================================================
-- CRITICAL: All RLS policies checked for lowercase 'officer' and 'guild_master'
-- but the app stores Title Case 'Officer' and 'Guild Master'. Postgres string
-- comparison is case-sensitive, so the officer check NEVER matched.
--
-- This was masked by:
--   1. Guild creator fallback checks (most policies have OR g.created_by = auth.uid())
--   2. Server-side code using serviceSupabase (bypasses RLS entirely)
--   3. Character-owner checks passing for own-resource operations
--
-- This migration drops and recreates every affected policy with correct case.
-- Policy logic is unchanged — only the role string values are corrected.
--
-- Tables affected (10):
--   loot_submissions, attendance_records, raid_events, raid_tiers,
--   loot_history, character_equipped_items, guild_settings, blp_tracking,
--   audit_logs, character_aliases
-- =============================================================================


-- =============================================================================
-- 1. loot_submissions — UPDATE policy
-- =============================================================================

DROP POLICY IF EXISTS "loot_submissions_update" ON loot_submissions;

CREATE POLICY "loot_submissions_update" ON loot_submissions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM characters c
      WHERE c.id = loot_submissions.character_id
      AND c.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      JOIN characters c ON c.id = cgm.character_id
      WHERE cgm.guild_id = loot_submissions.guild_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
      AND cgm.role IN ('Officer', 'Guild Master')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM characters c
      WHERE c.id = loot_submissions.character_id
      AND c.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      JOIN characters c ON c.id = cgm.character_id
      WHERE cgm.guild_id = loot_submissions.guild_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
      AND cgm.role IN ('Officer', 'Guild Master')
    )
  );


-- =============================================================================
-- 2. attendance_records — INSERT, UPDATE, DELETE
-- =============================================================================

DROP POLICY IF EXISTS "attendance_records_insert" ON attendance_records;
DROP POLICY IF EXISTS "attendance_records_update" ON attendance_records;
DROP POLICY IF EXISTS "attendance_records_delete" ON attendance_records;

CREATE POLICY "attendance_records_insert" ON attendance_records
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM raid_events re
      JOIN character_guild_memberships cgm ON cgm.guild_id = re.guild_id
      JOIN characters c ON c.id = cgm.character_id
      WHERE re.id = raid_event_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
      AND cgm.role IN ('Officer', 'Guild Master')
    )
    OR
    EXISTS (
      SELECT 1 FROM raid_events re
      JOIN guilds g ON g.id = re.guild_id
      WHERE re.id = raid_event_id
      AND g.created_by = auth.uid()
    )
  );

CREATE POLICY "attendance_records_update" ON attendance_records
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM raid_events re
      JOIN character_guild_memberships cgm ON cgm.guild_id = re.guild_id
      JOIN characters c ON c.id = cgm.character_id
      WHERE re.id = attendance_records.raid_event_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
      AND cgm.role IN ('Officer', 'Guild Master')
    )
    OR
    EXISTS (
      SELECT 1 FROM raid_events re
      JOIN guilds g ON g.id = re.guild_id
      WHERE re.id = attendance_records.raid_event_id
      AND g.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM raid_events re
      JOIN character_guild_memberships cgm ON cgm.guild_id = re.guild_id
      JOIN characters c ON c.id = cgm.character_id
      WHERE re.id = attendance_records.raid_event_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
      AND cgm.role IN ('Officer', 'Guild Master')
    )
    OR
    EXISTS (
      SELECT 1 FROM raid_events re
      JOIN guilds g ON g.id = re.guild_id
      WHERE re.id = attendance_records.raid_event_id
      AND g.created_by = auth.uid()
    )
  );

CREATE POLICY "attendance_records_delete" ON attendance_records
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM raid_events re
      JOIN character_guild_memberships cgm ON cgm.guild_id = re.guild_id
      JOIN characters c ON c.id = cgm.character_id
      WHERE re.id = attendance_records.raid_event_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
      AND cgm.role IN ('Officer', 'Guild Master')
    )
    OR
    EXISTS (
      SELECT 1 FROM raid_events re
      JOIN guilds g ON g.id = re.guild_id
      WHERE re.id = attendance_records.raid_event_id
      AND g.created_by = auth.uid()
    )
  );


-- =============================================================================
-- 3. raid_events — INSERT, UPDATE, DELETE
-- =============================================================================

DROP POLICY IF EXISTS "raid_events_insert" ON raid_events;
DROP POLICY IF EXISTS "raid_events_update" ON raid_events;
DROP POLICY IF EXISTS "raid_events_delete" ON raid_events;

CREATE POLICY "raid_events_insert" ON raid_events
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      JOIN characters c ON c.id = cgm.character_id
      WHERE cgm.guild_id = guild_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
      AND cgm.role IN ('Officer', 'Guild Master')
    )
    OR
    EXISTS (
      SELECT 1 FROM guilds g
      WHERE g.id = guild_id
      AND g.created_by = auth.uid()
    )
  );

CREATE POLICY "raid_events_update" ON raid_events
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      JOIN characters c ON c.id = cgm.character_id
      WHERE cgm.guild_id = raid_events.guild_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
      AND cgm.role IN ('Officer', 'Guild Master')
    )
    OR
    EXISTS (
      SELECT 1 FROM guilds g
      WHERE g.id = raid_events.guild_id
      AND g.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      JOIN characters c ON c.id = cgm.character_id
      WHERE cgm.guild_id = raid_events.guild_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
      AND cgm.role IN ('Officer', 'Guild Master')
    )
    OR
    EXISTS (
      SELECT 1 FROM guilds g
      WHERE g.id = raid_events.guild_id
      AND g.created_by = auth.uid()
    )
  );

CREATE POLICY "raid_events_delete" ON raid_events
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      JOIN characters c ON c.id = cgm.character_id
      WHERE cgm.guild_id = raid_events.guild_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
      AND cgm.role IN ('Officer', 'Guild Master')
    )
    OR
    EXISTS (
      SELECT 1 FROM guilds g
      WHERE g.id = raid_events.guild_id
      AND g.created_by = auth.uid()
    )
  );


-- =============================================================================
-- 4. raid_tiers — INSERT, UPDATE, DELETE
-- =============================================================================

DROP POLICY IF EXISTS "Officers can insert raid tiers" ON raid_tiers;
DROP POLICY IF EXISTS "Officers can update raid tiers" ON raid_tiers;
DROP POLICY IF EXISTS "Officers can delete raid tiers" ON raid_tiers;

CREATE POLICY "Officers can insert raid tiers"
ON raid_tiers
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM expansions e
    JOIN character_guild_memberships cgm ON cgm.guild_id = e.guild_id
    JOIN characters c ON c.id = cgm.character_id
    WHERE e.id = raid_tiers.expansion_id
    AND c.user_id = auth.uid()
    AND cgm.is_active = true
    AND cgm.role IN ('Officer', 'Guild Master')
  )
  OR
  EXISTS (
    SELECT 1 FROM expansions e
    JOIN guilds g ON g.id = e.guild_id
    WHERE e.id = raid_tiers.expansion_id
    AND g.created_by = auth.uid()
  )
);

CREATE POLICY "Officers can update raid tiers"
ON raid_tiers
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM expansions e
    JOIN character_guild_memberships cgm ON cgm.guild_id = e.guild_id
    JOIN characters c ON c.id = cgm.character_id
    WHERE e.id = raid_tiers.expansion_id
    AND c.user_id = auth.uid()
    AND cgm.is_active = true
    AND cgm.role IN ('Officer', 'Guild Master')
  )
  OR
  EXISTS (
    SELECT 1 FROM expansions e
    JOIN guilds g ON g.id = e.guild_id
    WHERE e.id = raid_tiers.expansion_id
    AND g.created_by = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM expansions e
    JOIN character_guild_memberships cgm ON cgm.guild_id = e.guild_id
    JOIN characters c ON c.id = cgm.character_id
    WHERE e.id = raid_tiers.expansion_id
    AND c.user_id = auth.uid()
    AND cgm.is_active = true
    AND cgm.role IN ('Officer', 'Guild Master')
  )
  OR
  EXISTS (
    SELECT 1 FROM expansions e
    JOIN guilds g ON g.id = e.guild_id
    WHERE e.id = raid_tiers.expansion_id
    AND g.created_by = auth.uid()
  )
);

CREATE POLICY "Officers can delete raid tiers"
ON raid_tiers
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM expansions e
    JOIN character_guild_memberships cgm ON cgm.guild_id = e.guild_id
    JOIN characters c ON c.id = cgm.character_id
    WHERE e.id = raid_tiers.expansion_id
    AND c.user_id = auth.uid()
    AND cgm.is_active = true
    AND cgm.role IN ('Officer', 'Guild Master')
  )
  OR
  EXISTS (
    SELECT 1 FROM expansions e
    JOIN guilds g ON g.id = e.guild_id
    WHERE e.id = raid_tiers.expansion_id
    AND g.created_by = auth.uid()
  )
);


-- =============================================================================
-- 5. loot_history — INSERT, UPDATE, DELETE
-- =============================================================================

DROP POLICY IF EXISTS "Officers can insert loot history" ON loot_history;
DROP POLICY IF EXISTS "Officers can update loot history" ON loot_history;
DROP POLICY IF EXISTS "Officers can delete loot history" ON loot_history;

CREATE POLICY "Officers can insert loot history"
ON loot_history
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM character_guild_memberships cgm
    JOIN characters c ON c.id = cgm.character_id
    WHERE cgm.guild_id = loot_history.guild_id
    AND c.user_id = auth.uid()
    AND cgm.is_active = true
    AND cgm.role IN ('Officer', 'Guild Master')
  )
  OR
  EXISTS (
    SELECT 1 FROM guilds g
    WHERE g.id = loot_history.guild_id
    AND g.created_by = auth.uid()
  )
);

CREATE POLICY "Officers can update loot history"
ON loot_history
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM character_guild_memberships cgm
    JOIN characters c ON c.id = cgm.character_id
    WHERE cgm.guild_id = loot_history.guild_id
    AND c.user_id = auth.uid()
    AND cgm.is_active = true
    AND cgm.role IN ('Officer', 'Guild Master')
  )
  OR
  EXISTS (
    SELECT 1 FROM guilds g
    WHERE g.id = loot_history.guild_id
    AND g.created_by = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM character_guild_memberships cgm
    JOIN characters c ON c.id = cgm.character_id
    WHERE cgm.guild_id = loot_history.guild_id
    AND c.user_id = auth.uid()
    AND cgm.is_active = true
    AND cgm.role IN ('Officer', 'Guild Master')
  )
  OR
  EXISTS (
    SELECT 1 FROM guilds g
    WHERE g.id = loot_history.guild_id
    AND g.created_by = auth.uid()
  )
);

CREATE POLICY "Officers can delete loot history"
ON loot_history
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM character_guild_memberships cgm
    JOIN characters c ON c.id = cgm.character_id
    WHERE cgm.guild_id = loot_history.guild_id
    AND c.user_id = auth.uid()
    AND cgm.is_active = true
    AND cgm.role IN ('Officer', 'Guild Master')
  )
  OR
  EXISTS (
    SELECT 1 FROM guilds g
    WHERE g.id = loot_history.guild_id
    AND g.created_by = auth.uid()
  )
);


-- =============================================================================
-- 6. character_equipped_items — ALL policy
-- =============================================================================

DROP POLICY IF EXISTS "Officers can manage guild characters' equipped items" ON character_equipped_items;

CREATE POLICY "Officers can manage guild characters' equipped items"
ON character_equipped_items
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM characters c
    JOIN character_guild_memberships cgm ON cgm.character_id = c.id
    JOIN character_guild_memberships my_cgm ON my_cgm.guild_id = cgm.guild_id
    JOIN characters my_c ON my_c.id = my_cgm.character_id
    WHERE c.id = character_equipped_items.character_id
    AND my_c.user_id = auth.uid()
    AND my_cgm.is_active = true
    AND my_cgm.role IN ('Officer', 'Guild Master')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM characters c
    JOIN character_guild_memberships cgm ON cgm.character_id = c.id
    JOIN character_guild_memberships my_cgm ON my_cgm.guild_id = cgm.guild_id
    JOIN characters my_c ON my_c.id = my_cgm.character_id
    WHERE c.id = character_equipped_items.character_id
    AND my_c.user_id = auth.uid()
    AND my_cgm.is_active = true
    AND my_cgm.role IN ('Officer', 'Guild Master')
  )
);


-- =============================================================================
-- 7. guild_settings — INSERT
-- =============================================================================

DROP POLICY IF EXISTS "Guild Master can insert guild settings" ON guild_settings;

CREATE POLICY "Guild Master can insert guild settings"
ON guild_settings
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM guilds g
    WHERE g.id = guild_settings.guild_id
    AND g.created_by = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM character_guild_memberships cgm
    JOIN characters c ON c.id = cgm.character_id
    WHERE cgm.guild_id = guild_settings.guild_id
    AND c.user_id = auth.uid()
    AND cgm.is_active = true
    AND cgm.role = 'Guild Master'
  )
);


-- =============================================================================
-- 8. blp_tracking — INSERT, UPDATE, DELETE
-- =============================================================================

DROP POLICY IF EXISTS "Officers can insert BLP" ON blp_tracking;
DROP POLICY IF EXISTS "Officers can update BLP" ON blp_tracking;
DROP POLICY IF EXISTS "Officers can delete BLP" ON blp_tracking;

CREATE POLICY "Officers can insert BLP"
ON blp_tracking
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM character_guild_memberships cgm
    JOIN characters c ON c.id = cgm.character_id
    WHERE cgm.guild_id = blp_tracking.guild_id
    AND c.user_id = auth.uid()
    AND cgm.is_active = true
    AND cgm.role IN ('Officer', 'Guild Master')
  )
  OR
  EXISTS (
    SELECT 1 FROM guilds g
    WHERE g.id = blp_tracking.guild_id
    AND g.created_by = auth.uid()
  )
);

CREATE POLICY "Officers can update BLP"
ON blp_tracking
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM character_guild_memberships cgm
    JOIN characters c ON c.id = cgm.character_id
    WHERE cgm.guild_id = blp_tracking.guild_id
    AND c.user_id = auth.uid()
    AND cgm.is_active = true
    AND cgm.role IN ('Officer', 'Guild Master')
  )
  OR
  EXISTS (
    SELECT 1 FROM guilds g
    WHERE g.id = blp_tracking.guild_id
    AND g.created_by = auth.uid()
  )
);

CREATE POLICY "Officers can delete BLP"
ON blp_tracking
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM character_guild_memberships cgm
    JOIN characters c ON c.id = cgm.character_id
    WHERE cgm.guild_id = blp_tracking.guild_id
    AND c.user_id = auth.uid()
    AND cgm.is_active = true
    AND cgm.role IN ('Officer', 'Guild Master')
  )
  OR
  EXISTS (
    SELECT 1 FROM guilds g
    WHERE g.id = blp_tracking.guild_id
    AND g.created_by = auth.uid()
  )
);


-- =============================================================================
-- 9. audit_logs — SELECT
-- =============================================================================

DROP POLICY IF EXISTS "Officers can view guild audit logs" ON audit_logs;

CREATE POLICY "Officers can view guild audit logs"
ON audit_logs
FOR SELECT
USING (
  (
    guild_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      JOIN characters c ON c.id = cgm.character_id
      WHERE cgm.guild_id = audit_logs.guild_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
      AND cgm.role IN ('Officer', 'Guild Master')
    )
  )
  OR
  (
    guild_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM guilds
      WHERE guilds.id = audit_logs.guild_id
        AND guilds.created_by = auth.uid()
    )
  )
  OR
  (guild_id IS NULL AND user_id = auth.uid())
);


-- =============================================================================
-- 10. character_aliases — INSERT, UPDATE, DELETE
-- =============================================================================

DROP POLICY IF EXISTS "character_aliases_insert" ON character_aliases;
DROP POLICY IF EXISTS "character_aliases_update" ON character_aliases;
DROP POLICY IF EXISTS "character_aliases_delete" ON character_aliases;

CREATE POLICY "character_aliases_insert" ON character_aliases
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      JOIN characters c ON c.id = cgm.character_id
      WHERE cgm.guild_id = guild_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
      AND cgm.role IN ('Officer', 'Guild Master')
    )
    OR
    EXISTS (
      SELECT 1 FROM guilds g
      WHERE g.id = guild_id
      AND g.created_by = auth.uid()
    )
  );

CREATE POLICY "character_aliases_update" ON character_aliases
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      JOIN characters c ON c.id = cgm.character_id
      WHERE cgm.guild_id = character_aliases.guild_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
      AND cgm.role IN ('Officer', 'Guild Master')
    )
    OR
    EXISTS (
      SELECT 1 FROM guilds g
      WHERE g.id = character_aliases.guild_id
      AND g.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      JOIN characters c ON c.id = cgm.character_id
      WHERE cgm.guild_id = character_aliases.guild_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
      AND cgm.role IN ('Officer', 'Guild Master')
    )
    OR
    EXISTS (
      SELECT 1 FROM guilds g
      WHERE g.id = character_aliases.guild_id
      AND g.created_by = auth.uid()
    )
  );

CREATE POLICY "character_aliases_delete" ON character_aliases
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      JOIN characters c ON c.id = cgm.character_id
      WHERE cgm.guild_id = character_aliases.guild_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
      AND cgm.role IN ('Officer', 'Guild Master')
    )
    OR
    EXISTS (
      SELECT 1 FROM guilds g
      WHERE g.id = character_aliases.guild_id
      AND g.created_by = auth.uid()
    )
  );


-- =============================================================================
-- Verification
-- =============================================================================
DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'RLS role case mismatch fixed!';
  RAISE NOTICE 'Changed: officer -> Officer, guild_master -> Guild Master';
  RAISE NOTICE 'Tables fixed (10):';
  RAISE NOTICE '  - loot_submissions (1 policy)';
  RAISE NOTICE '  - attendance_records (3 policies)';
  RAISE NOTICE '  - raid_events (3 policies)';
  RAISE NOTICE '  - raid_tiers (3 policies)';
  RAISE NOTICE '  - loot_history (3 policies)';
  RAISE NOTICE '  - character_equipped_items (1 policy)';
  RAISE NOTICE '  - guild_settings (1 policy)';
  RAISE NOTICE '  - blp_tracking (3 policies)';
  RAISE NOTICE '  - audit_logs (1 policy)';
  RAISE NOTICE '  - character_aliases (3 policies)';
  RAISE NOTICE '================================================';
END $$;

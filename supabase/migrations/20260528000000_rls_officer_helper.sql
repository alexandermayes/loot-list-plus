-- =============================================================================
-- Replace hardcoded role-name RLS checks with role-position helpers.
-- =============================================================================
-- Background
-- ----------
-- 47 RLS policies across 19 tables gate writes by `cgm.role IN ('Officer',
-- 'Guild Master')`. This silently blocks any guild that renames their officer
-- or GM role (e.g. "Office Yiker", "Big Yiker"), even though the page-level
-- `verifyPermission()` check (which gates by role *position*) lets them in.
-- See GH #60. Two guilds in prod already hit this; every future renaming guild
-- will hit it too.
--
-- This migration adds two SECURITY DEFINER helpers — is_guild_officer and
-- is_guild_master — that gate by role position via a join through
-- guild_roles. Then it rewrites every affected policy to call them, dropping
-- the hardcoded literal role-name checks.
--
-- Semantics preserved:
--   - Officer-tier (position >= 50) and the guild creator can do the same
--     things they could before.
--   - The 'Guild Master can insert guild settings' policy is rewritten with
--     is_guild_master (position >= 100) to keep GM-only semantics.
--   - loot_submissions_update still allows the character owner OR an officer.
--   - reserve_runs update/delete still allow the row creator OR an officer.
--   - guild_roles delete still preserves `is_default = false`.
--   - audit_logs select still allows orphan (guild_id IS NULL) rows to the
--     row's user.
--
-- Legacy lowercase 'officer' / 'guild_master' literals (still listed in the
-- loot_items policies as defensive backstops) become obsolete — the
-- position check supersedes them.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helpers
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_guild_officer(target_guild_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT (target_guild_id IS NOT NULL) AND (
    EXISTS (
      SELECT 1 FROM guilds g
      WHERE g.id = target_guild_id AND g.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM character_guild_memberships cgm
      JOIN characters c       ON c.id = cgm.character_id
      JOIN guild_roles  gr    ON gr.guild_id = cgm.guild_id AND gr.name = cgm.role
      WHERE cgm.guild_id = target_guild_id
        AND c.user_id    = auth.uid()
        AND cgm.is_active = true
        AND gr.position >= 50
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_guild_master(target_guild_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT (target_guild_id IS NOT NULL) AND (
    EXISTS (
      SELECT 1 FROM guilds g
      WHERE g.id = target_guild_id AND g.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM character_guild_memberships cgm
      JOIN characters c    ON c.id = cgm.character_id
      JOIN guild_roles  gr ON gr.guild_id = cgm.guild_id AND gr.name = cgm.role
      WHERE cgm.guild_id = target_guild_id
        AND c.user_id    = auth.uid()
        AND cgm.is_active = true
        AND gr.position >= 100
    )
  );
$$;

REVOKE ALL ON FUNCTION public.is_guild_officer(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_guild_master(UUID)  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_guild_officer(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_guild_master(UUID)  TO authenticated, service_role;

COMMENT ON FUNCTION public.is_guild_officer(UUID) IS
  'True if auth.uid() is the guild creator or has an active CGM with role.position >= 50. SECURITY DEFINER — pairs guild_roles.name with cgm.role to resolve position regardless of custom role names. Used by RLS policies in place of hardcoded ''Officer''/''Guild Master'' literals (GH #60).';

COMMENT ON FUNCTION public.is_guild_master(UUID) IS
  'True if auth.uid() is the guild creator or has an active CGM with role.position >= 100. Use for GM-only RLS policies.';

-- -----------------------------------------------------------------------------
-- attendance_records — via raid_events FK
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS attendance_records_delete ON attendance_records;
DROP POLICY IF EXISTS attendance_records_insert ON attendance_records;
DROP POLICY IF EXISTS attendance_records_update ON attendance_records;

CREATE POLICY attendance_records_delete ON attendance_records FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM raid_events re
    WHERE re.id = attendance_records.raid_event_id
      AND public.is_guild_officer(re.guild_id)
  ));

CREATE POLICY attendance_records_insert ON attendance_records FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM raid_events re
    WHERE re.id = attendance_records.raid_event_id
      AND public.is_guild_officer(re.guild_id)
  ));

CREATE POLICY attendance_records_update ON attendance_records FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM raid_events re
    WHERE re.id = attendance_records.raid_event_id
      AND public.is_guild_officer(re.guild_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM raid_events re
    WHERE re.id = attendance_records.raid_event_id
      AND public.is_guild_officer(re.guild_id)
  ));

-- -----------------------------------------------------------------------------
-- audit_logs — SELECT only; preserve orphan-row visibility for the row's user
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Officers can view guild audit logs" ON audit_logs;

CREATE POLICY "Officers can view guild audit logs" ON audit_logs FOR SELECT
  USING (
    (guild_id IS NOT NULL AND public.is_guild_officer(guild_id))
    OR (guild_id IS NULL AND user_id = auth.uid())
  );

-- -----------------------------------------------------------------------------
-- blp_tracking — direct guild_id
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Officers can delete BLP" ON blp_tracking;
DROP POLICY IF EXISTS "Officers can insert BLP" ON blp_tracking;
DROP POLICY IF EXISTS "Officers can update BLP" ON blp_tracking;

CREATE POLICY "Officers can delete BLP" ON blp_tracking FOR DELETE
  USING (public.is_guild_officer(guild_id));
CREATE POLICY "Officers can insert BLP" ON blp_tracking FOR INSERT
  WITH CHECK (public.is_guild_officer(guild_id));
CREATE POLICY "Officers can update BLP" ON blp_tracking FOR UPDATE
  USING (public.is_guild_officer(guild_id))
  WITH CHECK (public.is_guild_officer(guild_id));

-- -----------------------------------------------------------------------------
-- character_aliases — direct guild_id
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS character_aliases_delete ON character_aliases;
DROP POLICY IF EXISTS character_aliases_insert ON character_aliases;
DROP POLICY IF EXISTS character_aliases_update ON character_aliases;

CREATE POLICY character_aliases_delete ON character_aliases FOR DELETE
  USING (public.is_guild_officer(guild_id));
CREATE POLICY character_aliases_insert ON character_aliases FOR INSERT
  WITH CHECK (public.is_guild_officer(guild_id));
CREATE POLICY character_aliases_update ON character_aliases FOR UPDATE
  USING (public.is_guild_officer(guild_id))
  WITH CHECK (public.is_guild_officer(guild_id));

-- -----------------------------------------------------------------------------
-- character_equipped_items — via the character's CGMs
--   (Officer in *any* guild that contains this character can manage their gear.)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Officers can manage guild characters' equipped items" ON character_equipped_items;

CREATE POLICY "Officers can manage guild characters' equipped items" ON character_equipped_items
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM character_guild_memberships cgm
    WHERE cgm.character_id = character_equipped_items.character_id
      AND public.is_guild_officer(cgm.guild_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM character_guild_memberships cgm
    WHERE cgm.character_id = character_equipped_items.character_id
      AND public.is_guild_officer(cgm.guild_id)
  ));

-- -----------------------------------------------------------------------------
-- donation_records — direct guild_id
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS donation_records_delete ON donation_records;
DROP POLICY IF EXISTS donation_records_insert ON donation_records;
DROP POLICY IF EXISTS donation_records_update ON donation_records;

CREATE POLICY donation_records_delete ON donation_records FOR DELETE
  USING (public.is_guild_officer(guild_id));
CREATE POLICY donation_records_insert ON donation_records FOR INSERT
  WITH CHECK (public.is_guild_officer(guild_id));
CREATE POLICY donation_records_update ON donation_records FOR UPDATE
  USING (public.is_guild_officer(guild_id))
  WITH CHECK (public.is_guild_officer(guild_id));

-- -----------------------------------------------------------------------------
-- guild_item_priorities — direct guild_id
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS guild_item_priorities_delete ON guild_item_priorities;
DROP POLICY IF EXISTS guild_item_priorities_insert ON guild_item_priorities;
DROP POLICY IF EXISTS guild_item_priorities_update ON guild_item_priorities;

CREATE POLICY guild_item_priorities_delete ON guild_item_priorities FOR DELETE
  USING (public.is_guild_officer(guild_id));
CREATE POLICY guild_item_priorities_insert ON guild_item_priorities FOR INSERT
  WITH CHECK (public.is_guild_officer(guild_id));
CREATE POLICY guild_item_priorities_update ON guild_item_priorities FOR UPDATE
  USING (public.is_guild_officer(guild_id))
  WITH CHECK (public.is_guild_officer(guild_id));

-- -----------------------------------------------------------------------------
-- guild_roles — direct guild_id; preserve is_default=false guard on DELETE
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Officers can create guild roles" ON guild_roles;
DROP POLICY IF EXISTS "Officers can delete guild roles" ON guild_roles;
DROP POLICY IF EXISTS "Officers can update guild roles" ON guild_roles;

CREATE POLICY "Officers can create guild roles" ON guild_roles FOR INSERT
  WITH CHECK (public.is_guild_officer(guild_id));

CREATE POLICY "Officers can delete guild roles" ON guild_roles FOR DELETE
  USING (is_default = false AND public.is_guild_officer(guild_id));

CREATE POLICY "Officers can update guild roles" ON guild_roles FOR UPDATE
  USING (public.is_guild_officer(guild_id));

-- -----------------------------------------------------------------------------
-- guild_settings — GM-only insert (uses is_guild_master)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Guild Master can insert guild settings" ON guild_settings;

CREATE POLICY "Guild Master can insert guild settings" ON guild_settings FOR INSERT
  WITH CHECK (public.is_guild_master(guild_id));

-- -----------------------------------------------------------------------------
-- loot_history — direct guild_id
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Officers can delete loot history" ON loot_history;
DROP POLICY IF EXISTS "Officers can insert loot history" ON loot_history;
DROP POLICY IF EXISTS "Officers can update loot history" ON loot_history;

CREATE POLICY "Officers can delete loot history" ON loot_history FOR DELETE
  USING (public.is_guild_officer(guild_id));
CREATE POLICY "Officers can insert loot history" ON loot_history FOR INSERT
  WITH CHECK (public.is_guild_officer(guild_id));
CREATE POLICY "Officers can update loot history" ON loot_history FOR UPDATE
  USING (public.is_guild_officer(guild_id))
  WITH CHECK (public.is_guild_officer(guild_id));

-- -----------------------------------------------------------------------------
-- loot_item_classes — via loot_items → raid_tiers → expansions
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Officers can delete loot item classes" ON loot_item_classes;
DROP POLICY IF EXISTS "Officers can insert loot item classes" ON loot_item_classes;
DROP POLICY IF EXISTS "Officers can update loot item classes" ON loot_item_classes;

CREATE POLICY "Officers can delete loot item classes" ON loot_item_classes FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM loot_items li
    JOIN raid_tiers rt ON rt.id = li.raid_tier_id
    JOIN expansions  e ON e.id  = rt.expansion_id
    WHERE li.id = loot_item_classes.loot_item_id
      AND public.is_guild_officer(e.guild_id)
  ));

CREATE POLICY "Officers can insert loot item classes" ON loot_item_classes FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM loot_items li
    JOIN raid_tiers rt ON rt.id = li.raid_tier_id
    JOIN expansions  e ON e.id  = rt.expansion_id
    WHERE li.id = loot_item_classes.loot_item_id
      AND public.is_guild_officer(e.guild_id)
  ));

CREATE POLICY "Officers can update loot item classes" ON loot_item_classes FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM loot_items li
    JOIN raid_tiers rt ON rt.id = li.raid_tier_id
    JOIN expansions  e ON e.id  = rt.expansion_id
    WHERE li.id = loot_item_classes.loot_item_id
      AND public.is_guild_officer(e.guild_id)
  ));

-- -----------------------------------------------------------------------------
-- loot_items — via raid_tiers → expansions; drop legacy lowercase backstops
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS loot_items_delete ON loot_items;
DROP POLICY IF EXISTS loot_items_insert ON loot_items;
DROP POLICY IF EXISTS loot_items_update ON loot_items;

CREATE POLICY loot_items_delete ON loot_items FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM raid_tiers rt
    JOIN expansions e ON e.id = rt.expansion_id
    WHERE rt.id = loot_items.raid_tier_id
      AND public.is_guild_officer(e.guild_id)
  ));

CREATE POLICY loot_items_insert ON loot_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM raid_tiers rt
    JOIN expansions e ON e.id = rt.expansion_id
    WHERE rt.id = loot_items.raid_tier_id
      AND public.is_guild_officer(e.guild_id)
  ));

CREATE POLICY loot_items_update ON loot_items FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM raid_tiers rt
    JOIN expansions e ON e.id = rt.expansion_id
    WHERE rt.id = loot_items.raid_tier_id
      AND public.is_guild_officer(e.guild_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM raid_tiers rt
    JOIN expansions e ON e.id = rt.expansion_id
    WHERE rt.id = loot_items.raid_tier_id
      AND public.is_guild_officer(e.guild_id)
  ));

-- -----------------------------------------------------------------------------
-- loot_submissions — UPDATE allowed for character owner OR officer
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS loot_submissions_update ON loot_submissions;

CREATE POLICY loot_submissions_update ON loot_submissions FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM characters c WHERE c.id = loot_submissions.character_id AND c.user_id = auth.uid())
    OR public.is_guild_officer(loot_submissions.guild_id)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM characters c WHERE c.id = loot_submissions.character_id AND c.user_id = auth.uid())
    OR public.is_guild_officer(loot_submissions.guild_id)
  );

-- -----------------------------------------------------------------------------
-- raid_events — direct guild_id
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS raid_events_delete ON raid_events;
DROP POLICY IF EXISTS raid_events_insert ON raid_events;
DROP POLICY IF EXISTS raid_events_update ON raid_events;

CREATE POLICY raid_events_delete ON raid_events FOR DELETE
  USING (public.is_guild_officer(guild_id));
CREATE POLICY raid_events_insert ON raid_events FOR INSERT
  WITH CHECK (public.is_guild_officer(guild_id));
CREATE POLICY raid_events_update ON raid_events FOR UPDATE
  USING (public.is_guild_officer(guild_id))
  WITH CHECK (public.is_guild_officer(guild_id));

-- -----------------------------------------------------------------------------
-- raid_team_members — direct guild_id
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS raid_team_members_delete ON raid_team_members;
DROP POLICY IF EXISTS raid_team_members_insert ON raid_team_members;
DROP POLICY IF EXISTS raid_team_members_update ON raid_team_members;

CREATE POLICY raid_team_members_delete ON raid_team_members FOR DELETE
  USING (public.is_guild_officer(guild_id));
CREATE POLICY raid_team_members_insert ON raid_team_members FOR INSERT
  WITH CHECK (public.is_guild_officer(guild_id));
CREATE POLICY raid_team_members_update ON raid_team_members FOR UPDATE
  USING (public.is_guild_officer(guild_id))
  WITH CHECK (public.is_guild_officer(guild_id));

-- -----------------------------------------------------------------------------
-- raid_teams — direct guild_id
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS raid_teams_delete ON raid_teams;
DROP POLICY IF EXISTS raid_teams_insert ON raid_teams;
DROP POLICY IF EXISTS raid_teams_update ON raid_teams;

CREATE POLICY raid_teams_delete ON raid_teams FOR DELETE
  USING (public.is_guild_officer(guild_id));
CREATE POLICY raid_teams_insert ON raid_teams FOR INSERT
  WITH CHECK (public.is_guild_officer(guild_id));
CREATE POLICY raid_teams_update ON raid_teams FOR UPDATE
  USING (public.is_guild_officer(guild_id))
  WITH CHECK (public.is_guild_officer(guild_id));

-- -----------------------------------------------------------------------------
-- raid_tiers — via expansions
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Officers can delete raid tiers" ON raid_tiers;
DROP POLICY IF EXISTS "Officers can insert raid tiers" ON raid_tiers;
DROP POLICY IF EXISTS "Officers can update raid tiers" ON raid_tiers;

CREATE POLICY "Officers can delete raid tiers" ON raid_tiers FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM expansions e
    WHERE e.id = raid_tiers.expansion_id AND public.is_guild_officer(e.guild_id)
  ));

CREATE POLICY "Officers can insert raid tiers" ON raid_tiers FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM expansions e
    WHERE e.id = raid_tiers.expansion_id AND public.is_guild_officer(e.guild_id)
  ));

CREATE POLICY "Officers can update raid tiers" ON raid_tiers FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM expansions e
    WHERE e.id = raid_tiers.expansion_id AND public.is_guild_officer(e.guild_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM expansions e
    WHERE e.id = raid_tiers.expansion_id AND public.is_guild_officer(e.guild_id)
  ));

-- -----------------------------------------------------------------------------
-- reserve_awards — via reserve_runs FK
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS reserve_awards_delete ON reserve_awards;
DROP POLICY IF EXISTS reserve_awards_insert ON reserve_awards;

CREATE POLICY reserve_awards_delete ON reserve_awards FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM reserve_runs rr
    WHERE rr.id = reserve_awards.reserve_run_id
      AND public.is_guild_officer(rr.guild_id)
  ));

CREATE POLICY reserve_awards_insert ON reserve_awards FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM reserve_runs rr
    WHERE rr.id = reserve_awards.reserve_run_id
      AND public.is_guild_officer(rr.guild_id)
  ));

-- -----------------------------------------------------------------------------
-- reserve_runs — created_by OR (guild_id NOT NULL AND officer)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS reserve_runs_delete ON reserve_runs;
DROP POLICY IF EXISTS reserve_runs_update ON reserve_runs;

CREATE POLICY reserve_runs_delete ON reserve_runs FOR DELETE
  USING (
    created_by = auth.uid()
    OR (guild_id IS NOT NULL AND public.is_guild_officer(guild_id))
  );

CREATE POLICY reserve_runs_update ON reserve_runs FOR UPDATE
  USING (
    created_by = auth.uid()
    OR (guild_id IS NOT NULL AND public.is_guild_officer(guild_id))
  );

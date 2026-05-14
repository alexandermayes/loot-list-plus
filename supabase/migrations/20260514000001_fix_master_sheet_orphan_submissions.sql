-- Fix master sheet hiding raiders with orphaned submissions
-- ============================================================
-- Bug: a raider's approved loot list could disappear from the master sheet
-- view for other raiders. The master sheet uses the user-bound Supabase
-- client and joins approved submissions → characters. The `characters` RLS
-- policy "Guild members can view guild characters" requires the target
-- character to have an *active* row in `character_guild_memberships` in a
-- guild the viewer shares. If that CGM row is missing or inactive (e.g. the
-- non-officer add-character API used to silently fail under RLS — fixed in
-- commit 8abee8a), the viewer can't see the character row, and the master
-- sheet silently drops every ranking for that raider.
--
-- This migration:
--   1. Backfills active CGM rows for any character that has a non-rejected
--      submission in a guild but no active CGM for that guild.
--   2. Adds a defensive `characters` RLS policy that also surfaces characters
--      with non-draft submissions in the viewer's guilds — so a future orphan
--      can't silently hide a raider from the master sheet again.
--
-- Both changes are idempotent.

-- =============================================================================
-- Step 1: Backfill active CGM rows for characters with non-rejected submissions
-- =============================================================================
-- For each distinct (character_id, guild_id) pair in loot_submissions where
-- status IN ('pending', 'approved'), ensure an active CGM row exists.
-- If a row exists but is inactive, flip it active. If no row exists, insert one
-- with the guild's default role (lowest-position role, falling back to 'Member').
DO $$
DECLARE
  orphan RECORD;
  default_role TEXT;
  reactivated_count INT := 0;
  created_count INT := 0;
BEGIN
  FOR orphan IN
    SELECT DISTINCT ls.character_id, ls.guild_id
    FROM loot_submissions ls
    WHERE ls.character_id IS NOT NULL
      AND ls.guild_id IS NOT NULL
      AND ls.status IN ('pending', 'approved')
      AND NOT EXISTS (
        SELECT 1
        FROM character_guild_memberships cgm
        WHERE cgm.character_id = ls.character_id
          AND cgm.guild_id = ls.guild_id
          AND cgm.is_active = true
      )
  LOOP
    -- Resolve the default role for this guild (lowest-position role, else 'Member')
    SELECT name INTO default_role
    FROM guild_roles
    WHERE guild_id = orphan.guild_id
    ORDER BY position ASC
    LIMIT 1;

    IF default_role IS NULL THEN
      default_role := 'Member';
    END IF;

    -- If an inactive row exists, reactivate it. Otherwise insert a new active row.
    IF EXISTS (
      SELECT 1 FROM character_guild_memberships
      WHERE character_id = orphan.character_id AND guild_id = orphan.guild_id
    ) THEN
      UPDATE character_guild_memberships
      SET is_active = true
      WHERE character_id = orphan.character_id AND guild_id = orphan.guild_id;
      reactivated_count := reactivated_count + 1;
    ELSE
      INSERT INTO character_guild_memberships
        (character_id, guild_id, role, is_active, joined_via, membership_status)
      VALUES
        (orphan.character_id, orphan.guild_id, default_role, true, 'backfill', 'full');
      created_count := created_count + 1;
    END IF;
  END LOOP;

  RAISE NOTICE 'CGM backfill: reactivated=%, created=%', reactivated_count, created_count;
END $$;

-- =============================================================================
-- Step 2: Defensive RLS — guild members can view characters that have
-- non-draft submissions in their shared guilds.
-- =============================================================================
-- This is additive to the existing "Guild members can view guild characters"
-- policy. Even if a future code path creates a non-draft submission without
-- creating a CGM, the character will still be visible to other guild members
-- via this policy, so the master sheet won't silently drop them.
DROP POLICY IF EXISTS "Guild members can view characters with submissions" ON characters;
CREATE POLICY "Guild members can view characters with submissions" ON characters
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM loot_submissions ls
      WHERE ls.character_id = characters.id
        AND ls.status IN ('pending', 'approved')
        AND ls.guild_id IN (SELECT get_current_user_guild_ids())
    )
  );

DO $$
BEGIN
  RAISE NOTICE 'Master sheet visibility fix applied';
END $$;

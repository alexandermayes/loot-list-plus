-- =====================================================
-- CREATE: Function to get guild submissions with character names
-- =====================================================
-- Security definer function that bypasses RLS
-- Officers can see all submissions with character names
-- =====================================================

BEGIN;

-- Create function to get submissions with character details
CREATE OR REPLACE FUNCTION get_guild_submissions(
  p_guild_id UUID,
  p_raid_tier_id UUID
)
RETURNS TABLE (
  id UUID,
  status TEXT,
  submitted_at TIMESTAMPTZ,
  review_notes TEXT,
  character_id UUID,
  character_name TEXT,
  character_class_name TEXT,
  character_class_color TEXT,
  user_id UUID,
  item_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- Return submissions with character data
  RETURN QUERY
  SELECT
    ls.id,
    ls.status,
    ls.submitted_at,
    ls.review_notes,
    ls.character_id,
    c.name as character_name,
    wc.name as character_class_name,
    wc.color_hex as character_class_color,
    c.user_id,
    (SELECT COUNT(*) FROM loot_submission_items WHERE submission_id = ls.id) as item_count
  FROM loot_submissions ls
  LEFT JOIN characters c ON c.id = ls.character_id
  LEFT JOIN wow_classes wc ON wc.id = c.class_id
  WHERE ls.guild_id = p_guild_id
    AND ls.raid_tier_id = p_raid_tier_id
    AND ls.status != 'draft'
  ORDER BY ls.submitted_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_guild_submissions(UUID, UUID) TO authenticated;

COMMIT;

-- Confirmation
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Submissions Function Created!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Officers can now fetch submissions with';
  RAISE NOTICE 'character names using get_guild_submissions().';
  RAISE NOTICE '========================================';
END $$;

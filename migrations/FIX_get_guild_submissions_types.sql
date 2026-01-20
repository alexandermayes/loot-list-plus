-- =====================================================
-- FIX: Update function with correct return types
-- =====================================================
-- Fix type mismatch between function definition and actual query
-- =====================================================

BEGIN;

-- Drop and recreate with correct types
DROP FUNCTION IF EXISTS get_guild_submissions(UUID, UUID);

CREATE OR REPLACE FUNCTION get_guild_submissions(
  p_guild_id UUID,
  p_raid_tier_id UUID
)
RETURNS TABLE (
  id UUID,
  status VARCHAR(255),
  submitted_at TIMESTAMPTZ,
  review_notes TEXT,
  character_id UUID,
  character_name VARCHAR(255),
  character_class_name VARCHAR(255),
  character_class_color VARCHAR(255),
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
    ls.status::VARCHAR(255),
    ls.submitted_at,
    ls.review_notes,
    ls.character_id,
    c.name::VARCHAR(255) as character_name,
    wc.name::VARCHAR(255) as character_class_name,
    wc.color_hex::VARCHAR(255) as character_class_color,
    c.user_id,
    (SELECT COUNT(*) FROM loot_submission_items WHERE submission_id = ls.id)::BIGINT as item_count
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
  RAISE NOTICE 'Function Fixed!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Type mismatches resolved.';
  RAISE NOTICE 'Character names should now display.';
  RAISE NOTICE '========================================';
END $$;

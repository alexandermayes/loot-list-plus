import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyPermission } from '@/utils/server-roles'
import { trackApiError } from '@/utils/analytics/server'
import { logAudit } from '@/utils/audit/log'

interface UpdateBLPRequest {
  guild_id: string
  loot_item_id: string
  winner_character_id: string
  raid_event_id: string
}

/**
 * POST /api/blp/update
 *
 * Updates BLP after a loot award:
 * 1. Finds all characters "in running" (had item ranked + attended raid)
 * 2. Increments BLP for eligible non-winners
 * 3. Resets BLP for the winner
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: UpdateBLPRequest = await request.json()
    const { guild_id, loot_item_id, winner_character_id, raid_event_id } = body

    if (!guild_id || !loot_item_id || !winner_character_id || !raid_event_id) {
      return NextResponse.json({
        error: 'guild_id, loot_item_id, winner_character_id, and raid_event_id are required'
      }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Verify user has officer permissions (uses character_guild_memberships)
    const verification = await verifyPermission(supabase, user.id, guild_id, 'manage_loot')
    if (!verification.hasPermission) {
      return NextResponse.json({ error: verification.error || 'Officer permissions required' }, { status: 403 })
    }

    // Check if BLP is enabled for this guild
    const { data: settings } = await supabase
      .from('guild_settings')
      .select('blp_enabled, blp_includes_benched')
      .eq('guild_id', guild_id)
      .single()

    if (!settings?.blp_enabled) {
      return NextResponse.json({ data: { updated: 0, message: 'BLP not enabled for this guild' } })
    }

    const includesBenched = settings.blp_includes_benched ?? false

    // BLP double-increment is prevented by the blp_credits journal — one row
    // per (character, loot_item, raid_event), with ON CONFLICT DO NOTHING in
    // increment_blp. The loot_history unique constraint catches the same-row
    // dup case; the journal catches the harder case where loot_history was
    // cleared and re-inserted (GH #98).

    // Find eligible characters: those who had the item ranked AND attended the raid
    // (or were benched, when the guild opts to include benched raiders).
    const eligibleCharacters = await getEligibleCharacters(supabase, guild_id, loot_item_id, raid_event_id, includesBenched)

    // Filter out the winner
    const nonWinners = eligibleCharacters.filter(charId => charId !== winner_character_id)

    let incrementedCount = 0

    // Increment BLP for non-winners in one set-based round-trip. The
    // raid_event_id pins each credit to a specific (character, item, raid)
    // so re-firing for the same combo — an officer adding a second
    // loot_history row, or a re-import — is a no-op (GH #98).
    if (nonWinners.length > 0) {
      const { data: bulkCount, error } = await supabase.rpc('increment_blp_bulk', {
        p_guild_id: guild_id,
        p_loot_item_id: loot_item_id,
        p_raid_event_id: raid_event_id,
        p_character_ids: nonWinners,
      })

      if (error) {
        console.error('Failed to increment BLP for non-winners:', error)
      } else {
        incrementedCount = typeof bulkCount === 'number' ? bulkCount : nonWinners.length
      }
    }

    // Reset winner's BLP
    const { error: resetError } = await supabase.rpc('reset_blp', {
      p_guild_id: guild_id,
      p_character_id: winner_character_id,
      p_loot_item_id: loot_item_id
    })

    if (resetError) {
      console.error('Failed to reset winner BLP:', resetError)
    }

    logAudit({
      supabase,
      guildId: guild_id,
      tableName: 'blp_tracking',
      recordId: loot_item_id,
      action: 'UPDATE',
      userId: user.id,
      newData: {
        loot_item_id,
        winner_character_id,
        raid_event_id,
        eligible_count: eligibleCharacters.length,
        incremented_count: incrementedCount,
      },
    })

    return NextResponse.json({
      data: {
        eligible_count: eligibleCharacters.length,
        incremented_count: incrementedCount,
        winner_reset: !resetError
      }
    })
  } catch (error) {
    console.error('Error in POST /api/blp/update:', error)
    trackApiError('unknown', 'POST /api/blp/update', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Get characters who are "in running" for an item at a specific raid
 * Criteria:
 * 1. Has item in an APPROVED loot submission
 * 2. Attended the raid (attendance_records.attended = true), or was benched
 *    when `includesBenched` is set. Benched raiders showed up and were in the
 *    pool but were sat by officers, so they're treated as in running.
 */
async function getEligibleCharacters(
  supabase: ReturnType<typeof createServiceRoleClient>,
  guildId: string,
  lootItemId: string,
  raidEventId: string,
  includesBenched: boolean
): Promise<string[]> {
  // Step 1: Get all characters who have this item in an approved submission
  const { data: submissionItems } = await supabase
    .from('loot_submission_items')
    .select(`
      loot_submissions!inner (
        character_id,
        status,
        guild_id
      )
    `)
    .eq('loot_item_id', lootItemId)
    .eq('loot_submissions.guild_id', guildId)
    .eq('loot_submissions.status', 'approved')
    .is('removed_at', null)

  if (!submissionItems || submissionItems.length === 0) {
    return []
  }

  // Extract unique character IDs
  type SubmissionItemWithJoin = {
    loot_submissions: {
      character_id: string
      status: string
      guild_id: string
    }
  }
  const charactersWithItem = new Set<string>()
  for (const item of submissionItems as unknown as SubmissionItemWithJoin[]) {
    if (item.loot_submissions?.character_id) {
      charactersWithItem.add(item.loot_submissions.character_id)
    }
  }

  if (charactersWithItem.size === 0) {
    return []
  }

  // Step 2: Filter to characters who attended this specific raid. When the guild
  // includes benched raiders, also count anyone marked benched for the raid.
  let query = supabase
    .from('attendance_records')
    .select('character_id')
    .eq('raid_event_id', raidEventId)
    .in('character_id', Array.from(charactersWithItem))

  query = includesBenched
    ? query.or('attended.eq.true,was_benched.eq.true')
    : query.eq('attended', true)

  const { data: attendanceRecords } = await query

  if (!attendanceRecords) {
    return []
  }

  return attendanceRecords.map(r => r.character_id)
}

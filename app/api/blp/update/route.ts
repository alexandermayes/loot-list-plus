import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { trackApiError } from '@/utils/analytics/server'

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

    // Verify user is an officer in the guild
    const { data: membership } = await supabase
      .from('guild_members')
      .select('role')
      .eq('guild_id', guild_id)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this guild' }, { status: 403 })
    }

    // Check if user is officer (position >= 50) or guild creator
    const { data: roleData } = await supabase
      .from('guild_roles')
      .select('position')
      .eq('guild_id', guild_id)
      .eq('name', membership.role)
      .single()

    const { data: guildData } = await supabase
      .from('guilds')
      .select('created_by')
      .eq('id', guild_id)
      .single()

    const isOfficer = (roleData?.position ?? 0) >= 50
    const isCreator = guildData?.created_by === user.id

    if (!isOfficer && !isCreator) {
      return NextResponse.json({ error: 'Officer permissions required' }, { status: 403 })
    }

    // Check if BLP is enabled for this guild
    const { data: settings } = await supabase
      .from('guild_settings')
      .select('blp_enabled')
      .eq('guild_id', guild_id)
      .single()

    if (!settings?.blp_enabled) {
      // BLP not enabled, skip silently
      return NextResponse.json({ data: { updated: 0, message: 'BLP not enabled for this guild' } })
    }

    // Find eligible characters: those who had the item ranked AND attended the raid
    const eligibleCharacters = await getEligibleCharacters(supabase, guild_id, loot_item_id, raid_event_id)

    // Filter out the winner
    const nonWinners = eligibleCharacters.filter(charId => charId !== winner_character_id)

    let incrementedCount = 0

    // Increment BLP for non-winners
    for (const characterId of nonWinners) {
      const { error } = await supabase.rpc('increment_blp', {
        p_guild_id: guild_id,
        p_character_id: characterId,
        p_loot_item_id: loot_item_id
      })

      if (error) {
        console.error(`Failed to increment BLP for character ${characterId}:`, error)
      } else {
        incrementedCount++
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
 * 2. Attended the raid (attendance_records.attended = true)
 */
async function getEligibleCharacters(
  supabase: ReturnType<typeof createServiceRoleClient>,
  guildId: string,
  lootItemId: string,
  raidEventId: string
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

  // Step 2: Filter to characters who attended this specific raid
  const { data: attendanceRecords } = await supabase
    .from('attendance_records')
    .select('character_id')
    .eq('raid_event_id', raidEventId)
    .eq('attended', true)
    .in('character_id', Array.from(charactersWithItem))

  if (!attendanceRecords) {
    return []
  }

  return attendanceRecords.map(r => r.character_id)
}

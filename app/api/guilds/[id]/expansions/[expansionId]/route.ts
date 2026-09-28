import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyPermission } from '@/utils/server-roles'
import { NextRequest, NextResponse } from 'next/server'
import { getExpansionGame, gameMismatchError } from '@/app/services/expansionSeeder'
import { getGuildGame } from '@/domain/expansion/game'

/**
 * PATCH /api/guilds/[id]/expansions/[expansionId]
 * Update an expansion (set as current, update raid_start_date, raid schedule, timezone)
 *
 * Body: {
 *   setAsCurrent?: boolean
 *   raidStartDate?: string (ISO date format)
 *   raidDaysPerWeek?: number (1-5)
 *   firstRaidDay?: number (0-6, 0=Sunday)
 *   secondRaidDay?: number | null
 *   thirdRaidDay?: number | null
 *   fourthRaidDay?: number | null
 *   fifthRaidDay?: number | null
 *   timezone?: string (IANA timezone, e.g. 'America/New_York')
 * }
 *
 * setAsCurrent refuses an expansion from the other game version (400) before
 * any write; other fields are not game-checked.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; expansionId: string }> }
) {
  try {
    const { id: guildId, expansionId } = await params
    const body = await request.json()
    const {
      setAsCurrent,
      raidStartDate,
      raidDaysPerWeek,
      firstRaidDay,
      secondRaidDay,
      thirdRaidDay,
      fourthRaidDay,
      fifthRaidDay,
      timezone,
      phaseDeadlines,
    } = body

    // Fast auth check using getSession (no network call)
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceSupabase = createServiceRoleClient()
    const { hasPermission } = await verifyPermission(serviceSupabase, user.id, guildId, 'manage_settings')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Officer permissions required' }, { status: 403 })
    }

    // Verify expansion belongs to this guild (use service role to bypass RLS)
    const { data: expansion, error: expError } = await serviceSupabase
      .from('expansions')
      .select('id, name')
      .eq('id', expansionId)
      .eq('guild_id', guildId)
      .single()

    if (expError || !expansion) {
      return NextResponse.json({ error: 'Expansion not found' }, { status: 404 })
    }

    // Update guild's active expansion if requested
    if (setAsCurrent === true) {
      // Refuse a cross-game set-current before any write (S-2, T-sfi-01):
      // load the guild's fixed game version and compare against the target
      // expansion's game. Schedule/timezone/phase-deadline edits below never
      // reach this block, so they are not game-checked (T-sfi-03).
      const { data: guildRow, error: guildError } = await serviceSupabase
        .from('guilds')
        .select('game')
        .eq('id', guildId)
        .single()

      if (guildError || !guildRow) {
        return NextResponse.json({ error: 'Guild not found' }, { status: 404 })
      }

      const expansionGame = getExpansionGame(expansion.name)
      if (expansionGame !== null && expansionGame !== getGuildGame(guildRow)) {
        return NextResponse.json({ error: gameMismatchError(expansion.name) }, { status: 400 })
      }

      const { error: updateGuildError } = await serviceSupabase
        .from('guilds')
        .update({ active_expansion_id: expansionId })
        .eq('id', guildId)

      if (updateGuildError) {
        console.error('Error updating active expansion:', updateGuildError)
        return NextResponse.json({ error: 'Failed to set current expansion' }, { status: 500 })
      }
    }

    // Build expansion update object
    const expansionUpdate: Record<string, string | number | null> = {}

    if (raidStartDate !== undefined) {
      expansionUpdate.raid_start_date = raidStartDate
    }
    if (raidDaysPerWeek !== undefined) {
      expansionUpdate.raid_days_per_week = raidDaysPerWeek
    }
    if (firstRaidDay !== undefined) {
      expansionUpdate.first_raid_day = firstRaidDay
    }
    if (secondRaidDay !== undefined) {
      expansionUpdate.second_raid_day = secondRaidDay
    }
    if (thirdRaidDay !== undefined) {
      expansionUpdate.third_raid_day = thirdRaidDay
    }
    if (fourthRaidDay !== undefined) {
      expansionUpdate.fourth_raid_day = fourthRaidDay
    }
    if (fifthRaidDay !== undefined) {
      expansionUpdate.fifth_raid_day = fifthRaidDay
    }
    if (timezone !== undefined) {
      expansionUpdate.timezone = timezone
    }
    if (phaseDeadlines !== undefined) {
      (expansionUpdate as Record<string, unknown>).phase_deadlines = phaseDeadlines
    }

    // Update expansion if any fields provided
    if (Object.keys(expansionUpdate).length > 0) {
      const { error: updateExpError } = await serviceSupabase
        .from('expansions')
        .update(expansionUpdate)
        .eq('id', expansionId)

      if (updateExpError) {
        console.error('Error updating expansion:', updateExpError)
        return NextResponse.json({ error: 'Failed to update expansion' }, { status: 500 })
      }
    }

    return NextResponse.json({
      success: true,
      message: setAsCurrent
        ? `${expansion.name} is now your current expansion`
        : 'Expansion updated successfully'
    })
  } catch (error) {
    console.error('Error in PATCH /api/guilds/[id]/expansions/[expansionId]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

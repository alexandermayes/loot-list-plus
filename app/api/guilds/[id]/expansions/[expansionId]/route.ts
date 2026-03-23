import { createClient, getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyOfficerPermissions } from '@/utils/server-roles'
import { NextRequest, NextResponse } from 'next/server'

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
    const { hasPermission } = await verifyOfficerPermissions(serviceSupabase, user.id, guildId)
    if (!hasPermission) {
      return NextResponse.json({ error: 'Officer permissions required' }, { status: 403 })
    }

    const supabase = await createClient()

    // Verify expansion belongs to this guild
    const { data: expansion, error: expError } = await supabase
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

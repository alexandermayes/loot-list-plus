import { createClient, getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
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
      timezone
    } = body

    // Fast auth check using getSession (no network call)
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Check if user is guild creator (always has officer permissions)
    const { data: guild } = await supabase
      .from('guilds')
      .select('created_by')
      .eq('id', guildId)
      .single()

    const isGuildCreator = guild?.created_by === user.id

    // If not guild creator, verify user is an officer via character membership
    if (!isGuildCreator) {
      // Get user's characters first
      const { data: userCharacters } = await supabase
        .from('characters')
        .select('id')
        .eq('user_id', user.id)

      if (!userCharacters || userCharacters.length === 0) {
        return NextResponse.json({ error: 'No characters found' }, { status: 403 })
      }

      const characterIds = userCharacters.map(c => c.id)

      // Get user's membership in this guild
      const { data: memberships } = await supabase
        .from('character_guild_memberships')
        .select('role')
        .eq('guild_id', guildId)
        .in('character_id', characterIds)
        .eq('is_active', true)

      if (!memberships || memberships.length === 0) {
        return NextResponse.json({ error: 'Not a member of this guild' }, { status: 403 })
      }

      const membership = memberships[0]

      // Check if user is an officer (position >= 50) using guild_roles
      const { data: roleData } = await supabase
        .from('guild_roles')
        .select('position')
        .eq('guild_id', guildId)
        .eq('name', membership.role)
        .single()

      // Fallback: if no guild_roles entry, check against default positions
      const position = roleData?.position ?? (
        membership.role === 'Guild Master' ? 100 :
        membership.role === 'Officer' ? 50 : 0
      )

      if (position < 50) {
        return NextResponse.json({ error: 'Officer permissions required' }, { status: 403 })
      }
    }

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

    // Use service role client to bypass RLS for updates
    const serviceSupabase = createServiceRoleClient()

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
    const expansionUpdate: Record<string, any> = {}

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

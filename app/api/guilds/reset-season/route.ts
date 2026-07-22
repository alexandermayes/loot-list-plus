import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { trackApiError, trackEvent } from '@/utils/analytics/server'
import { logAudit } from '@/utils/audit/log'

interface ResetSeasonRequest {
  guild_id: string
  clear_raids?: boolean
  clear_loot?: boolean
  clear_donations?: boolean
}

/**
 * POST /api/guilds/reset-season
 *
 * Wipes the history a raider's score is computed from — raid events,
 * attendance, loot awards, donations — while keeping the guild itself: members,
 * their loot lists, roles, raid teams and settings (GH #148). Each category is
 * opt-in; BLP is always rebuilt afterwards since it derives from the rest.
 *
 * Guild-creator only, matching /api/guilds/delete. Irreversible.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: ResetSeasonRequest = await request.json()
    const { guild_id } = body
    const clearRaids = body.clear_raids === true
    const clearLoot = body.clear_loot === true
    const clearDonations = body.clear_donations === true

    if (!guild_id) {
      return NextResponse.json({ error: 'guild_id is required' }, { status: 400 })
    }

    if (!clearRaids && !clearLoot && !clearDonations) {
      return NextResponse.json({ error: 'Select at least one category to reset' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Ownership check, not just officer: this is as destructive as deleting the
    // guild for everything it touches.
    const { data: guild, error: guildError } = await supabase
      .from('guilds')
      .select('id, created_by')
      .eq('id', guild_id)
      .single()

    if (guildError || !guild) {
      return NextResponse.json({ error: 'Guild not found' }, { status: 404 })
    }

    if (guild.created_by !== user.id) {
      return NextResponse.json(
        { error: 'Only the guild creator can reset guild data' },
        { status: 403 }
      )
    }

    const { data: summary, error: resetError } = await supabase.rpc('reset_guild_season', {
      p_guild_id: guild_id,
      p_clear_raids: clearRaids,
      p_clear_loot: clearLoot,
      p_clear_donations: clearDonations,
    })

    if (resetError) {
      console.error('Error calling reset_guild_season:', resetError)
      return NextResponse.json({ error: 'Failed to reset guild data' }, { status: 500 })
    }

    await logAudit({
      supabase,
      guildId: guild_id,
      tableName: 'guilds',
      recordId: guild_id,
      action: 'DELETE',
      userId: user.id,
      newData: {
        operation: 'reset_season',
        cleared: { raids: clearRaids, loot: clearLoot, donations: clearDonations },
        summary,
      },
    })

    await trackEvent({
      event: 'guild_season_reset',
      userId: user.id,
      guildId: guild_id,
      properties: {
        guild_id,
        clear_raids: clearRaids,
        clear_loot: clearLoot,
        clear_donations: clearDonations,
      },
    })

    return NextResponse.json({ success: true, summary })
  } catch (error) {
    console.error('Error in POST /api/guilds/reset-season:', error)
    trackApiError('unknown', 'POST /api/guilds/reset-season', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

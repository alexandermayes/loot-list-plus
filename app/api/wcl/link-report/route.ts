import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { trackApiError } from '@/utils/analytics/server'
import { fetchWclReportForDate, getWclReportUrl, isWclConfigured } from '@/lib/warcraftlogs'

/**
 * POST - Fetch and store a WCL report code for a raid event.
 *
 * Officers can trigger this manually when a WCL report wasn't available
 * at the time the raid summary was posted to Discord.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { guild_id, raid_event_id } = body

    if (!guild_id || !raid_event_id) {
      return NextResponse.json({ error: 'guild_id and raid_event_id are required' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Verify caller is an officer
    const { data: guild } = await supabase
      .from('guilds')
      .select('created_by')
      .eq('id', guild_id)
      .single()

    if (!guild) {
      return NextResponse.json({ error: 'Guild not found' }, { status: 404 })
    }

    const isGuildCreator = guild.created_by === user.id

    if (!isGuildCreator) {
      const { data: callerCharacters } = await supabase
        .from('characters')
        .select('id')
        .eq('user_id', user.id)

      if (!callerCharacters || callerCharacters.length === 0) {
        return NextResponse.json({ error: 'Not a member of this guild' }, { status: 403 })
      }

      const characterIds = callerCharacters.map((c: { id: string }) => c.id)

      const { data: membership } = await supabase
        .from('character_guild_memberships')
        .select('role')
        .eq('guild_id', guild_id)
        .in('character_id', characterIds)
        .eq('is_active', true)
        .limit(1)
        .single()

      if (!membership) {
        return NextResponse.json({ error: 'Not a member of this guild' }, { status: 403 })
      }

      const { data: roleData } = await supabase
        .from('guild_roles')
        .select('position')
        .eq('guild_id', guild_id)
        .eq('name', membership.role)
        .single()

      const position = roleData?.position ?? (
        membership.role === 'Guild Master' ? 100 :
        membership.role === 'Officer' ? 50 : 0
      )

      if (position < 50) {
        return NextResponse.json({ error: 'Only officers can link WCL reports' }, { status: 403 })
      }
    }

    // Load guild settings for WCL URL
    const { data: settings } = await supabase
      .from('guild_settings')
      .select('wcl_guild_url')
      .eq('guild_id', guild_id)
      .single()

    const wclGuildUrl = settings?.wcl_guild_url
    if (!wclGuildUrl) {
      return NextResponse.json({ error: 'No Warcraft Logs URL configured. Set one in guild settings.' }, { status: 400 })
    }

    // Load raid event
    const { data: raidEvent } = await supabase
      .from('raid_events')
      .select('id, raid_date')
      .eq('id', raid_event_id)
      .eq('guild_id', guild_id)
      .single()

    if (!raidEvent) {
      return NextResponse.json({ error: 'Raid event not found' }, { status: 404 })
    }

    // Verify WCL API credentials are configured
    if (!isWclConfigured()) {
      return NextResponse.json(
        { error: 'Warcraft Logs API credentials not configured. Add WARCRAFTLOGS_CLIENT_ID and WARCRAFTLOGS_CLIENT_SECRET to your environment.' },
        { status: 503 }
      )
    }

    // Look up current phase raid tier names to filter WCL reports by zone
    let raidTierNames: string[] | undefined
    const { data: guildExpansion } = await supabase
      .from('guilds')
      .select('active_expansion_id')
      .eq('id', guild_id)
      .single()

    if (guildExpansion?.active_expansion_id) {
      const { data: expansion } = await supabase
        .from('expansions')
        .select('current_phase')
        .eq('id', guildExpansion.active_expansion_id)
        .single()

      const currentPhase = expansion?.current_phase || 1

      const { data: phaseTiers } = await supabase
        .from('raid_tiers')
        .select('name')
        .eq('expansion_id', guildExpansion.active_expansion_id)
        .eq('phase', currentPhase)
        .or('is_guild_active.eq.true,is_guild_active.is.null')

      if (phaseTiers && phaseTiers.length > 0) {
        raidTierNames = phaseTiers.map(t => t.name)
      }
    }

    // Fetch WCL report
    const report = await fetchWclReportForDate(wclGuildUrl, raidEvent.raid_date, raidTierNames)

    if (!report) {
      return NextResponse.json({ linked: false, message: 'No matching report found for this date' })
    }

    // Store the report code on the raid event
    await supabase
      .from('raid_events')
      .update({ wcl_report_code: report.code })
      .eq('id', raid_event_id)

    const reportUrl = getWclReportUrl(report.code, wclGuildUrl)

    return NextResponse.json({
      linked: true,
      report_code: report.code,
      report_url: reportUrl,
    })
  } catch (error) {
    console.error('Error linking WCL report:', error)
    trackApiError('unknown', 'POST /api/wcl/link-report', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

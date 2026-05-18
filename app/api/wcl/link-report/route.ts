import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyPermission } from '@/utils/server-roles'
import { trackApiError } from '@/utils/analytics/server'
import { fetchWclReportForDate, getWclReportUrl, isWclConfigured, parseWclGuildUrl } from '@/lib/warcraftlogs'

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

    const { hasPermission } = await verifyPermission(supabase, user.id, guild_id, 'manage_settings')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Only officers can link WCL reports' }, { status: 403 })
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

    // Validate the URL parses to a guild ref before hitting WCL, otherwise
    // the user sees a misleading "no matching report found" message.
    if (!parseWclGuildUrl(wclGuildUrl)) {
      return NextResponse.json(
        { error: "Couldn't read your Warcraft Logs URL. Paste your guild page link from WCL into guild settings." },
        { status: 400 }
      )
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

    // Fetch WCL report — match by date only, no tier filtering.
    // Guilds run multiple raids per day across different tiers, so filtering
    // by tier name would miss valid reports.
    const report = await fetchWclReportForDate(wclGuildUrl, raidEvent.raid_date)

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

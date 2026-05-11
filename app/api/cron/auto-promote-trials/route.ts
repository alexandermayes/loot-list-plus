import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'

/**
 * GET - Cron job that auto-promotes trial members to full
 *
 * Runs daily. For each guild with trial_auto_promote_enabled,
 * finds trial members whose trial_started_at + weeks has elapsed,
 * and promotes them to full membership.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceRoleClient()

  // Find all guilds with auto-promote enabled
  const { data: guilds, error: guildsError } = await supabase
    .from('guild_settings')
    .select('guild_id, trial_auto_promote_weeks')
    .eq('trial_auto_promote_enabled', true)

  if (guildsError || !guilds || guilds.length === 0) {
    return NextResponse.json({ promoted: 0, guilds: 0 })
  }

  let totalPromoted = 0

  for (const guild of guilds) {
    const weeks = guild.trial_auto_promote_weeks || 4
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - weeks * 7)

    // Find trial members past the cutoff
    const { data: trials, error: trialsError } = await supabase
      .from('character_guild_memberships')
      .select('id')
      .eq('guild_id', guild.guild_id)
      .eq('membership_status', 'trial')
      .eq('is_active', true)
      .not('trial_started_at', 'is', null)
      .lte('trial_started_at', cutoff.toISOString())

    if (trialsError || !trials || trials.length === 0) continue

    const ids = trials.map(t => t.id)

    const { error: updateError } = await supabase
      .from('character_guild_memberships')
      .update({
        membership_status: 'full',
        promoted_at: new Date().toISOString(),
      })
      .in('id', ids)

    if (!updateError) {
      totalPromoted += ids.length
    }
  }

  return NextResponse.json({ promoted: totalPromoted, guilds: guilds.length })
}

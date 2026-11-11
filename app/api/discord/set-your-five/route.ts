import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyPermission } from '@/utils/server-roles'
import { selectAllPagesOrThrow } from '@/utils/supabase/paginate'
import { discordFetch, sendDirectMessage } from '@/lib/discord'
import {
  SET_YOUR_FIVE_NO_CHANNEL_ERROR,
  SET_YOUR_FIVE_NOT_OFFICER_ERROR,
  SET_YOUR_FIVE_POST_FAILED_ERROR,
  buildSetYourFiveMessage,
  buildSetYourFiveUrl,
  resolveAppOrigin,
} from '@/domain/loot/set-your-five'

// Ceiling for the whole request on the host; the DM loop gets its own, smaller
// budget in the next task.
export const maxDuration = 60

const PREFERENCE_CHUNK_SIZE = 500

interface MembershipRow {
  characters: { user_id: string | null } | null
}

interface PreferenceRow {
  user_id: string
  discord_id: string | null
}

/**
 * POST - Officer-only "Set your 5" send (D-23, D-24).
 *
 * Posts one link-button message to the guild's raid summary channel and DMs
 * every active member who has a Discord id on their profile. The response
 * carries counts only: the sender never learns who was messaged.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const guildId = typeof body?.guild_id === 'string' ? body.guild_id : ''
    if (!guildId) {
      return NextResponse.json({ error: 'guild_id is required' }, { status: 400 })
    }

    const botToken = process.env.DISCORD_BOT_TOKEN
    if (!botToken) {
      return NextResponse.json({ error: 'Discord notifications temporarily unavailable' }, { status: 503 })
    }

    const supabase = createServiceRoleClient()

    const { hasPermission } = await verifyPermission(supabase, user.id, guildId, 'manage_settings')
    if (!hasPermission) {
      return NextResponse.json({ error: SET_YOUR_FIVE_NOT_OFFICER_ERROR }, { status: 403 })
    }

    const { data: settings } = await supabase
      .from('guild_settings')
      .select('raid_summary_channel_id')
      .eq('guild_id', guildId)
      .single()
    const channelId = settings?.raid_summary_channel_id as string | null | undefined
    if (!channelId) {
      return NextResponse.json({ error: SET_YOUR_FIVE_NO_CHANNEL_ERROR }, { status: 400 })
    }

    // Active members, one entry per user however many characters they have;
    // the sender is not messaged about their own send.
    const memberships = await selectAllPagesOrThrow<MembershipRow>('guild memberships', (start, end) =>
      supabase
        .from('character_guild_memberships')
        .select('id, characters!inner(user_id)')
        .eq('guild_id', guildId)
        .eq('is_active', true)
        .order('id', { ascending: true })
        .range(start, end) as unknown as PromiseLike<{
        data: MembershipRow[] | null
        error: { message: string } | null
      }>,
    )
    const memberIds = [
      ...new Set(
        memberships
          .map((m) => m.characters?.user_id)
          .filter((id): id is string => typeof id === 'string' && id.length > 0 && id !== user.id),
      ),
    ]

    const discordIds: string[] = []
    for (let i = 0; i < memberIds.length; i += PREFERENCE_CHUNK_SIZE) {
      const chunk = memberIds.slice(i, i + PREFERENCE_CHUNK_SIZE)
      const rows = await selectAllPagesOrThrow<PreferenceRow>('member preferences', (start, end) =>
        supabase
          .from('user_preferences')
          .select('user_id, discord_id')
          .in('user_id', chunk)
          .not('discord_id', 'is', null)
          .order('user_id', { ascending: true })
          .range(start, end) as unknown as PromiseLike<{
          data: PreferenceRow[] | null
          error: { message: string } | null
        }>,
      )
      for (const row of rows) {
        if (row.discord_id) discordIds.push(row.discord_id)
      }
    }

    const message = buildSetYourFiveMessage(buildSetYourFiveUrl(resolveAppOrigin(), guildId))

    let channelPostOk = false
    try {
      const posted = await discordFetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      })
      channelPostOk = posted.ok
    } catch {
      channelPostOk = false
    }
    if (!channelPostOk) {
      return NextResponse.json({ error: SET_YOUR_FIVE_POST_FAILED_ERROR }, { status: 502 })
    }

    let sent = 0
    for (const discordId of discordIds) {
      const outcome = await sendDirectMessage(botToken, discordId, message as unknown as Record<string, unknown>)
      if (outcome.ok) sent += 1
    }

    return NextResponse.json({ posted: true, sent, skipped: memberIds.length - sent })
  } catch {
    // Fixed message: nothing from the request or from Discord goes in the log.
    console.error('[set-your-five] unexpected failure', { stage: 'handler' })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

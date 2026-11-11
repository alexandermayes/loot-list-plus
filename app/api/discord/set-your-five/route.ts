import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyPermission } from '@/utils/server-roles'
import { IN_FILTER_CHUNK_SIZE, selectAllPagesOrThrow } from '@/utils/supabase/paginate'
import { discordFetch, sendDirectMessage } from '@/lib/discord'
import {
  SET_YOUR_FIVE_COOLDOWN_ERROR,
  SET_YOUR_FIVE_NO_CHANNEL_ERROR,
  SET_YOUR_FIVE_NO_DISCOVERY_ERROR,
  SET_YOUR_FIVE_NOT_OFFICER_ERROR,
  SET_YOUR_FIVE_POST_FAILED_ERROR,
  buildSetYourFiveMessage,
  buildSetYourFiveUrl,
  resolveAppOrigin,
} from '@/domain/loot/set-your-five'

// Ceiling for the whole request on the host. The DM loop below keeps inside
// it: 5 DMs at a time, no new DM after 45 seconds (D-30), which fits a guild
// of about a hundred members at two Discord calls each, and every Discord
// call still in flight is cut off at 55 seconds, so a long Retry-After can
// never run the function past the ceiling once the channel post has landed.
// regression for WR-03 (Phase 4 review).
export const maxDuration = 60

const SET_YOUR_FIVE_DM_CONCURRENCY = 5
const SET_YOUR_FIVE_TIME_BUDGET_MS = 45_000
// The deadline every Discord call carries, from the start of the request:
// past it, discordFetch stops waiting on Retry-After and makes no new attempt,
// and the response is written with the counts so far.
const SET_YOUR_FIVE_DEADLINE_MS = 55_000
const SET_YOUR_FIVE_COOLDOWN_MINUTES = 60
// The send row's audit_logs table_name ('set_your_five_sends'); the cooldown
// reads the latest one for the guild.
const SEND_AUDIT_TABLE = 'set_your_five_sends'

// A Discord channel id is a snowflake: 17 to 20 digits and nothing else.
// regression for WR-02 (Phase 4 review): the stored id is officer text and is
// interpolated into a bot-token URL, where a value with a path in it would
// re-target the POST after fetch normalises the dot segments.
const DISCORD_SNOWFLAKE = /^\d{17,20}$/

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
  const startedAt = Date.now()
  const deadline = new AbortController()
  const deadlineTimer = setTimeout(() => deadline.abort(), SET_YOUR_FIVE_DEADLINE_MS)
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

    const supabase = createServiceRoleClient()

    const { hasPermission } = await verifyPermission(supabase, user.id, guildId, 'manage_settings')
    if (!hasPermission) {
      return NextResponse.json({ error: SET_YOUR_FIVE_NOT_OFFICER_ERROR }, { status: 403 })
    }

    // After the permission check, so a signed-in member cannot learn whether
    // the bot is configured: auth, input, permission, then the token.
    // regression for IN-04 (Phase 4 review).
    const botToken = process.env.DISCORD_BOT_TOKEN
    if (!botToken) {
      return NextResponse.json({ error: 'Discord notifications temporarily unavailable' }, { status: 503 })
    }

    // Discovery gate (D-23): the message only makes sense when raiders have a
    // picker to open, so a guild with no guild-active Discovery tier in a
    // phase at or below its active expansion's current phase is refused
    // before any Discord call. A Discovery tier in a locked phase has no list
    // to set, the same rule the Overview card and the guild settings row
    // apply. regression for WR-07 (Phase 4 review).
    const { data: guild, error: guildError } = await supabase
      .from('guilds')
      .select('active_expansion_id')
      .eq('id', guildId)
      .single()
    if (guildError && !guild) throw new Error('guild read failed')
    const expansionId = guild?.active_expansion_id as string | null | undefined

    let hasDiscoveryTier = false
    if (expansionId) {
      const { data: expansion, error: expansionError } = await supabase
        .from('expansions')
        .select('current_phase')
        .eq('id', expansionId)
        .single()
      if (expansionError && !expansion) throw new Error('expansion read failed')
      // A missing current_phase reads as phase 1, as the tier list endpoint does.
      const currentPhase = (expansion?.current_phase as number | null | undefined) ?? 1
      const { data: tiers, error: tiersError } = await supabase
        .from('raid_tiers')
        .select('id')
        .eq('expansion_id', expansionId)
        .eq('list_mode', 'discovery')
        .eq('is_guild_active', true)
        .lte('phase', currentPhase)
        .limit(1)
      if (tiersError) throw new Error('tier read failed')
      hasDiscoveryTier = (tiers?.length ?? 0) > 0
    }
    if (!hasDiscoveryTier) {
      return NextResponse.json({ error: SET_YOUR_FIVE_NO_DISCOVERY_ERROR }, { status: 400 })
    }

    const { data: settings } = await supabase
      .from('guild_settings')
      .select('raid_summary_channel_id')
      .eq('guild_id', guildId)
      .single()
    const channelId = settings?.raid_summary_channel_id as string | null | undefined
    // A malformed id is answered like a missing one: either way there is no
    // channel the bot can post to, and the officer's fix is the same.
    if (typeof channelId !== 'string' || !DISCORD_SNOWFLAKE.test(channelId)) {
      return NextResponse.json({ error: SET_YOUR_FIVE_NO_CHANNEL_ERROR }, { status: 400 })
    }

    // Cooldown (D-30): one send per guild per hour, read from the latest send
    // row. Two officers confirming within the same second can both pass; the
    // confirm modal and the 60-second client disable make that unlikely, and
    // the cost is one extra message, so no lock is taken.
    const { data: lastSends, error: cooldownError } = await supabase
      .from('audit_logs')
      .select('created_at')
      .eq('guild_id', guildId)
      .eq('table_name', SEND_AUDIT_TABLE)
      .order('created_at', { ascending: false })
      .limit(1)
    // Fail closed: if the cooldown cannot be read, nothing is sent.
    if (cooldownError) throw new Error('cooldown read failed')
    const lastSentAt = (lastSends as Array<{ created_at: string }> | null)?.[0]?.created_at
    if (lastSentAt) {
      const cooldownMs = SET_YOUR_FIVE_COOLDOWN_MINUTES * 60_000
      const elapsedMs = Date.now() - Date.parse(lastSentAt)
      if (elapsedMs < cooldownMs) {
        return NextResponse.json(
          {
            error: SET_YOUR_FIVE_COOLDOWN_ERROR,
            retry_after_minutes: Math.ceil((cooldownMs - elapsedMs) / 60_000),
          },
          { status: 429 },
        )
      }
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

    // The ids go in chunks of the shared size: PostgREST carries every .in()
    // id in the URL, and a few hundred members would overrun it in one read.
    // regression for WR-05 (Phase 4 review).
    const discordIds: string[] = []
    for (let i = 0; i < memberIds.length; i += IN_FILTER_CHUNK_SIZE) {
      const chunk = memberIds.slice(i, i + IN_FILTER_CHUNK_SIZE)
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

    // Cooldown reservation (D-30): the send row is written before the channel
    // post, with the insert's error checked, so a send can never happen
    // without the row that throttles the next one. The row is inserted here
    // rather than through logAudit, which swallows its insert error. Nothing
    // about who was messaged is stored: only that a send happened.
    // regression for WR-04 (Phase 4 review): written after the post and
    // best-effort, the cooldown failed open.
    const { data: sendRow, error: sendRowError } = await supabase
      .from('audit_logs')
      .insert({
        guild_id: guildId,
        table_name: SEND_AUDIT_TABLE,
        record_id: guildId,
        action: 'INSERT',
        user_id: user.id,
        old_data: null,
        new_data: { posted: true },
        changed_fields: null,
      })
      .select('id')
      .single()
    if (sendRowError || !sendRow) throw new Error('send row write failed')
    const sendRowId = sendRow.id as string

    const message = buildSetYourFiveMessage(buildSetYourFiveUrl(resolveAppOrigin(), guildId))

    let channelPostOk = false
    try {
      const posted = await discordFetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
        signal: deadline.signal,
      })
      channelPostOk = posted.ok
    } catch {
      channelPostOk = false
    }
    if (!channelPostOk) {
      // Nothing was sent, so the reservation is released and the officer can
      // retry at once. If the release itself fails, the cooldown stands for
      // an hour on a send that did not happen, which is the safe side.
      const { error: releaseError } = await supabase.from('audit_logs').delete().eq('id', sendRowId)
      if (releaseError) {
        console.error('[set-your-five] cooldown release failed', { stage: 'channel_post' })
      }
      return NextResponse.json({ error: SET_YOUR_FIVE_POST_FAILED_ERROR }, { status: 502 })
    }

    // Bounded DMs (D-30): a small worker pool, no new DM once the budget from
    // the start of the request is spent, and the deadline on every DM still
    // in flight after that. Recipients never reached are counted as skipped.
    let sent = 0
    let next = 0
    const worker = async () => {
      while (next < discordIds.length) {
        if (Date.now() - startedAt >= SET_YOUR_FIVE_TIME_BUDGET_MS) return
        const discordId = discordIds[next++]
        const outcome = await sendDirectMessage(botToken, discordId, message, { signal: deadline.signal })
        if (outcome.ok) {
          sent += 1
        } else if (deadline.signal.aborted) {
          // The deadline passed while this DM was in flight: the recipient
          // counts as never reached, and there is nothing to log.
          return
        } else if (outcome.status !== 403) {
          // 403 (DMs closed, no shared server, stale id) is a state of the
          // world and stays quiet. Anything else logs stage and status only,
          // never the recipient.
          console.error('[set-your-five] DM send failed', { stage: outcome.stage, status: outcome.status })
        }
      }
    }
    await Promise.all(
      Array.from({ length: Math.min(SET_YOUR_FIVE_DM_CONCURRENCY, discordIds.length) }, () => worker()),
    )

    return NextResponse.json({ posted: true, sent, skipped: memberIds.length - sent })
  } catch {
    // Fixed message: nothing from the request or from Discord goes in the log.
    console.error('[set-your-five] unexpected failure', { stage: 'handler' })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    clearTimeout(deadlineTimer)
  }
}

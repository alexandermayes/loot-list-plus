import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { paginatedSelect } from '@/utils/supabase/paginate'
import { discordFetch } from '@/lib/discord'
import { NEEDS_RESUBMISSION_OR_FILTER } from '@/domain/loot/resubmit'

/**
 * GET /api/cron/resubmit-reminders
 *
 * Daily cron. DMs raiders whose loot lists still need to be (re)submitted
 * (edited-after-submit drafts + rejected lists) so they don't sit unseen by
 * officers. Respects the per-user `notify_resubmit_reminder` preference and a
 * per-submission cooldown so we don't nag every run.
 *
 * One DM per raider (aggregated across all their needs-resubmit lists), then we
 * stamp `resubmit_reminded_at` on each of those submissions.
 */

// Re-remind at most once per this window while a list stays in the needs-resubmit state.
const REMINDER_COOLDOWN_HOURS = 72
// Stop reminding a list after this many DMs in one needs-resubmit episode.
// The count resets when the list is resubmitted or reviewed, so a fresh
// rejection starts a new run.
const MAX_REMINDERS_PER_LIST = 3

interface CandidateSub {
  id: string
  guild_id: string
  character_id: string
  resubmit_reminder_count: number
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const botToken = process.env.DISCORD_BOT_TOKEN
  if (!botToken) {
    return NextResponse.json({ error: 'DISCORD_BOT_TOKEN not configured' }, { status: 500 })
  }

  const supabase = createServiceRoleClient()
  const cutoffIso = new Date(Date.now() - REMINDER_COOLDOWN_HOURS * 3_600_000).toISOString()

  // 1) Candidate submissions: need resubmission AND not reminded within the cooldown.
  //    Two .or() filters AND together in PostgREST.
  const candidates = await paginatedSelect<CandidateSub>((start, end) =>
    supabase
      .from('loot_submissions')
      .select('id, guild_id, character_id, resubmit_reminder_count')
      .or(NEEDS_RESUBMISSION_OR_FILTER)
      .or(`resubmit_reminded_at.is.null,resubmit_reminded_at.lt.${cutoffIso}`)
      .lt('resubmit_reminder_count', MAX_REMINDERS_PER_LIST)
      .order('id', { ascending: true })
      .range(start, end),
  )

  if (candidates.length === 0) {
    return NextResponse.json({ reminded: 0, submissions: 0 })
  }

  // 2) Resolve characters -> user_id (+ name), then user prefs and guild names.
  const characterIds = [...new Set(candidates.map((c) => c.character_id))]
  const guildIds = [...new Set(candidates.map((c) => c.guild_id))]

  const characters = await paginatedSelect<{ id: string; user_id: string | null; name: string | null }>(
    (start, end) =>
      supabase.from('characters').select('id, user_id, name').in('id', characterIds).order('id', { ascending: true }).range(start, end),
  )
  const charById = new Map(characters.map((c) => [c.id, c]))

  const userIds = [...new Set(characters.map((c) => c.user_id).filter((u): u is string => !!u))]
  const prefs = await paginatedSelect<{ user_id: string; discord_id: string | null; notify_resubmit_reminder: boolean | null }>(
    (start, end) =>
      supabase
        .from('user_preferences')
        .select('user_id, discord_id, notify_resubmit_reminder')
        .in('user_id', userIds)
        .order('user_id', { ascending: true })
        .range(start, end),
  )
  const prefByUser = new Map(prefs.map((p) => [p.user_id, p]))

  const guilds = await paginatedSelect<{ id: string; name: string | null }>((start, end) =>
    supabase.from('guilds').select('id, name').in('id', guildIds).order('id', { ascending: true }).range(start, end),
  )
  const guildNameById = new Map(guilds.map((g) => [g.id, g.name]))

  // 3) Aggregate candidates per user, keeping only opted-in raiders with a linked Discord.
  interface Bucket {
    discordId: string
    submissions: Array<{ id: string; count: number }>
    guildNames: Set<string>
  }
  const byUser = new Map<string, Bucket>()
  for (const sub of candidates) {
    const char = charById.get(sub.character_id)
    if (!char?.user_id) continue
    const pref = prefByUser.get(char.user_id)
    // Default-on: only skip when the raider explicitly turned it off.
    if (!pref || pref.notify_resubmit_reminder === false || !pref.discord_id) continue

    let bucket = byUser.get(char.user_id)
    if (!bucket) {
      bucket = { discordId: pref.discord_id, submissions: [], guildNames: new Set() }
      byUser.set(char.user_id, bucket)
    }
    bucket.submissions.push({ id: sub.id, count: sub.resubmit_reminder_count })
    const gName = guildNameById.get(sub.guild_id)
    if (gName) bucket.guildNames.add(gName)
  }

  // 4) Send one DM per raider, then stamp the reminded submissions.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lootlistplus.com'
  let remindedUsers = 0
  // Successfully-reminded submissions, carrying the count they had before this run.
  const stamped: Array<{ id: string; count: number }> = []

  for (const bucket of byUser.values()) {
    const count = bucket.submissions.length
    const guildList = [...bucket.guildNames].join(', ')
    const embed = {
      title: '📋 Resubmit your loot list',
      description:
        `You have ${count} loot ${count === 1 ? 'list' : 'lists'} that ${count === 1 ? "isn't" : "aren't"} submitted` +
        `${guildList ? ` in ${guildList}` : ''}. Officers can't see your changes until you resubmit.\n\n` +
        `Open LootList+ to resubmit: ${appUrl}/loot-list`,
      color: 0xeab308,
    }

    try {
      const dmChannelResponse = await discordFetch('https://discord.com/api/v10/users/@me/channels', {
        method: 'POST',
        headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient_id: bucket.discordId }),
      })
      if (!dmChannelResponse.ok) {
        // DMs disabled / blocked bot / bad id — skip without stamping so we retry next run.
        continue
      }
      const dmChannel = await dmChannelResponse.json()
      const messageResponse = await discordFetch(`https://discord.com/api/v10/channels/${dmChannel.id}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds: [embed] }),
      })
      if (!messageResponse.ok) continue

      remindedUsers++
      stamped.push(...bucket.submissions)
    } catch (err) {
      console.error('[resubmit-reminders] DM failed:', err)
    }
  }

  // 5) Stamp the cooldown marker + bump the per-list count on everything we
  //    successfully reminded. Group by prior count so each row lands at count+1
  //    in a single bulk update per distinct value (0/1/2).
  if (stamped.length > 0) {
    const now = new Date().toISOString()
    const idsByCount = new Map<number, string[]>()
    for (const s of stamped) {
      const ids = idsByCount.get(s.count) ?? []
      ids.push(s.id)
      idsByCount.set(s.count, ids)
    }
    for (const [prevCount, ids] of idsByCount) {
      for (let i = 0; i < ids.length; i += 500) {
        const chunk = ids.slice(i, i + 500)
        await supabase
          .from('loot_submissions')
          .update({ resubmit_reminded_at: now, resubmit_reminder_count: prevCount + 1 })
          .in('id', chunk)
      }
    }
  }

  return NextResponse.json({ reminded: remindedUsers, submissions: stamped.length })
}

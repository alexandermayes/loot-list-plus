import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyOfficerPermissions } from '@/utils/server-roles'
import { trackApiError } from '@/utils/analytics/server'
import { discordFetch } from '@/lib/discord'
import { fetchWclReportForDate, getWclReportUrl } from '@/lib/warcraftlogs'
import { parseDate } from '@/utils/date'

const EMBED_FIELD_LIMIT = 1024

/**
 * Truncate a string to fit within Discord's embed field limit.
 * Appends "... and X more" if truncated.
 */
function truncateField(items: string[], separator: string, remaining: string): string {
  let result = items.join(separator)
  if (result.length <= EMBED_FIELD_LIMIT) return result

  // Binary search for how many items fit
  for (let i = items.length - 1; i >= 0; i--) {
    const subset = items.slice(0, i)
    const suffix = remaining.replace('{n}', String(items.length - i))
    result = subset.join(separator) + suffix
    if (result.length <= EMBED_FIELD_LIMIT) return result
  }

  return remaining.replace('{n}', String(items.length))
}

/**
 * POST - Post a raid summary to a Discord channel
 *
 * Fetches attendance + loot for a raid event and posts a rich embed
 * to the guild's configured raid summary channel.
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

    const botToken = process.env.DISCORD_BOT_TOKEN
    if (!botToken) {
      return NextResponse.json({ error: 'Discord notifications temporarily unavailable' }, { status: 503 })
    }

    const supabase = createServiceRoleClient()

    const { hasPermission } = await verifyOfficerPermissions(supabase, user.id, guild_id)
    if (!hasPermission) {
      return NextResponse.json({ error: 'Only officers can post raid summaries' }, { status: 403 })
    }

    const { data: guild } = await supabase
      .from('guilds')
      .select('name, discord_server_id, active_expansion_id')
      .eq('id', guild_id)
      .single()

    if (!guild) {
      return NextResponse.json({ error: 'Guild not found' }, { status: 404 })
    }

    // Parallelize independent queries: settings and raid event
    const [settingsResult, raidEventResult] = await Promise.all([
      supabase
        .from('guild_settings')
        .select('raid_summary_channel_id, wcl_guild_url')
        .eq('guild_id', guild_id)
        .single(),
      supabase
        .from('raid_events')
        .select('id, raid_date, notes, wcl_report_code')
        .eq('id', raid_event_id)
        .eq('guild_id', guild_id)
        .single(),
    ])

    const settings = settingsResult.data
    const channelId = settings?.raid_summary_channel_id
    if (!channelId) {
      return NextResponse.json({ error: 'No raid summary channel configured. Set one in guild settings.' }, { status: 400 })
    }

    const raidEvent = raidEventResult.data
    if (!raidEvent) {
      return NextResponse.json({ error: 'Raid event not found' }, { status: 404 })
    }

    // Get raid title from current phase tiers
    let raidTitle = 'Raid'
    let raidTierNames: string[] | undefined
    if (guild.active_expansion_id) {
      const { data: expansion } = await supabase
        .from('expansions')
        .select('current_phase')
        .eq('id', guild.active_expansion_id)
        .single()

      const currentPhase = expansion?.current_phase || 1

      const { data: phaseTiers } = await supabase
        .from('raid_tiers')
        .select('name')
        .eq('expansion_id', guild.active_expansion_id)
        .eq('phase', currentPhase)
        .eq('is_guild_active', true)
        .order('id')

      if (phaseTiers && phaseTiers.length > 0) {
        raidTitle = phaseTiers.map(t => t.name).join(' / ')
        raidTierNames = phaseTiers.map(t => t.name)
      }
    }

    // Parallelize attendance and loot queries
    const [attendanceResult, lootResult] = await Promise.all([
      supabase
        .from('attendance_records')
        .select('character_name, character_id, signed_up, attended, no_call_no_show, was_late, was_benched')
        .eq('raid_event_id', raid_event_id),
      supabase
        .from('loot_history')
        .select(`
          character_name,
          character_id,
          loot_items (
            name,
            wowhead_id
          )
        `)
        .eq('raid_event_id', raid_event_id),
    ])

    const attendance = attendanceResult.data
    const loot = lootResult.data

    // Build a character ID → name map for linked records
    const charIds = new Set<string>()
    if (attendance) {
      for (const r of attendance) {
        if (r.character_id) charIds.add(r.character_id)
      }
    }
    if (loot) {
      for (const r of loot as unknown as Array<{ character_id: string | null }>) {
        if (r.character_id) charIds.add(r.character_id)
      }
    }

    const charNameMap = new Map<string, string>()
    if (charIds.size > 0) {
      const { data: chars } = await supabase
        .from('characters')
        .select('id, name')
        .in('id', Array.from(charIds))

      if (chars) {
        for (const c of chars) {
          charNameMap.set(c.id, c.name)
        }
      }
    }

    // Categorize attendance
    const attended: string[] = []
    const late: string[] = []
    const benched: string[] = []
    const noShow: string[] = []
    const signedUp: string[] = []

    if (attendance) {
      for (const record of attendance) {
        const name = (record.character_id && charNameMap.get(record.character_id)) || record.character_name || 'Unknown'
        if (record.no_call_no_show) {
          noShow.push(name)
        } else if (record.was_benched) {
          benched.push(name)
        } else if (record.attended) {
          if (record.was_late) {
            late.push(name)
          } else {
            attended.push(name)
          }
        } else if (record.signed_up) {
          signedUp.push(name)
        }
      }
    }

    const totalRaiders = attended.length + late.length

    // Format raid date
    const raidDate = parseDate(raidEvent.raid_date)
    const formattedDate = raidDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })

    // Build embed fields
    const fields: Array<{ name: string; value: string; inline: boolean }> = []

    // Attended section
    if (attended.length > 0) {
      fields.push({
        name: `Attended (${attended.length})`,
        value: truncateField(attended, ', ', '\n... and {n} more'),
        inline: false,
      })
    }

    // Late section
    if (late.length > 0) {
      fields.push({
        name: `Late (${late.length})`,
        value: truncateField(late, ', ', '\n... and {n} more'),
        inline: false,
      })
    }

    // Benched section
    if (benched.length > 0) {
      fields.push({
        name: `Benched (${benched.length})`,
        value: truncateField(benched, ', ', '\n... and {n} more'),
        inline: false,
      })
    }

    // No-show section
    if (noShow.length > 0) {
      fields.push({
        name: `No-show (${noShow.length})`,
        value: truncateField(noShow, ', ', '\n... and {n} more'),
        inline: false,
      })
    }

    // Loot section
    interface LootRow {
      character_name: string | null
      character_id: string | null
      loot_items: { name: string; wowhead_id: number } | null
    }

    const lootRows = (loot as unknown as LootRow[] | null) || []
    if (lootRows.length > 0) {
      const lootLines = lootRows.map(row => {
        const item = row.loot_items
        const charName = (row.character_id && charNameMap.get(row.character_id)) || row.character_name || 'Unknown'
        if (item?.wowhead_id) {
          return `[${item.name}](https://www.wowhead.com/classic/item=${item.wowhead_id}) → ${charName}`
        }
        return `${item?.name || 'Unknown Item'} → ${charName}`
      })

      // Split loot into multiple fields if needed (Discord 1024 char limit per field)
      const lootFields: string[][] = [[]]
      let currentFieldLen = 0
      for (const line of lootLines) {
        const lineLen = line.length + 1 // +1 for newline separator
        if (currentFieldLen + lineLen > EMBED_FIELD_LIMIT && lootFields[lootFields.length - 1].length > 0) {
          lootFields.push([])
          currentFieldLen = 0
        }
        lootFields[lootFields.length - 1].push(line)
        currentFieldLen += lineLen
      }

      lootFields.forEach((chunk, i) => {
        fields.push({
          name: i === 0 ? `Loot (${lootRows.length})` : '\u200b', // invisible char for continuation fields
          value: chunk.join('\n'),
          inline: false,
        })
      })
    }

    // Auto-fetch WCL report if not already linked
    let wclReportCode = raidEvent.wcl_report_code as string | null
    const wclGuildUrl = settings?.wcl_guild_url as string | null

    if (!wclReportCode && wclGuildUrl) {
      try {
        const report = await fetchWclReportForDate(wclGuildUrl, raidEvent.raid_date, raidTierNames)
        if (report) {
          wclReportCode = report.code
          await supabase
            .from('raid_events')
            .update({ wcl_report_code: report.code })
            .eq('id', raid_event_id)
        }
      } catch {
        // WCL is best-effort, don't block the Discord post
      }
    }

    // Build description line
    const descParts: string[] = [formattedDate]
    if (totalRaiders > 0) {
      descParts.push(`${totalRaiders} raider${totalRaiders !== 1 ? 's' : ''}`)
    }
    if (wclReportCode && wclGuildUrl) {
      const reportUrl = getWclReportUrl(wclReportCode, wclGuildUrl)
      descParts.push(`[Warcraft Logs](${reportUrl})`)
    }
    const description = descParts.join(' · ')

    // Compose the embed
    const embed = {
      title: `Raid Summary — ${raidTitle}`,
      description,
      color: 0xff8000,
      fields,
      footer: {
        text: `${guild.name} · via LootList+`,
      },
      timestamp: new Date().toISOString(),
    }

    // Post to Discord
    const discordResponse = await discordFetch(
      `https://discord.com/api/v10/channels/${encodeURIComponent(channelId)}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bot ${botToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ embeds: [embed] }),
      }
    )

    if (!discordResponse.ok) {
      const status = discordResponse.status
      if (status === 404) {
        return NextResponse.json({ error: 'Channel not found. Update the raid summary channel in guild settings.' }, { status: 400 })
      }
      if (status === 403) {
        return NextResponse.json({ error: 'Bot can\'t post to this channel. Check its permissions in Discord.' }, { status: 400 })
      }
      const errorText = await discordResponse.text()
      console.error('Discord post failed:', status, errorText)
      return NextResponse.json({ error: 'Couldn\'t post to Discord. Try again.' }, { status: 502 })
    }

    return NextResponse.json({ sent: true, message: 'Raid summary posted to Discord' })
  } catch (error) {
    console.error('Error posting raid summary:', error)
    trackApiError('unknown', 'POST /api/discord/post-raid-summary', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

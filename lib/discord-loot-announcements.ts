/**
 * Discord loot-award announcements.
 *
 * Helper that posts to a guild's `raid_summary_channel_id` when officers
 * award loot. Single awards (live during raid via the addon) render as a
 * compact one-line embed; bulk awards (Gargul import string, app-UI bulk)
 * collapse into one embed listing every award.
 *
 * Gated by:
 *   - `guilds.discord_server_id` set
 *   - `guild_settings.raid_summary_channel_id` set
 *   - `guild_settings.loot_announcements_enabled` true
 * Any of those missing → no-op (returns null).
 *
 * Errors are caught and logged internally — the function never throws,
 * so callers don't have to guard against announcement failures breaking
 * the actual loot-award write path.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { discordFetch } from '@/lib/discord'

export interface LootAward {
  itemId: string // loot_items.id
  characterName: string
  raidEventId?: string | null
}

const EMBED_COLOR_ORANGE = 0xff8000
const EMBED_DESCRIPTION_LIMIT = 4096

function wowheadLink(itemName: string, wowheadId: number | null): string {
  if (!wowheadId) return `**${itemName}**`
  return `[**${itemName}**](https://www.wowhead.com/item=${wowheadId})`
}

function clampDescription(s: string): string {
  if (s.length <= EMBED_DESCRIPTION_LIMIT) return s
  return s.slice(0, EMBED_DESCRIPTION_LIMIT - 32) + '\n…(truncated)'
}

/**
 * Post a loot-award announcement to the guild's configured Discord channel.
 * Returns true on success, false if skipped (config missing) or failed.
 */
export async function notifyLootAward(
  supabase: SupabaseClient,
  guildId: string,
  awards: LootAward[]
): Promise<boolean> {
  if (!awards.length) return false

  const botToken = process.env.DISCORD_BOT_TOKEN
  if (!botToken) return false

  try {
    const [{ data: guild }, { data: settings }] = await Promise.all([
      supabase.from('guilds').select('name, discord_server_id').eq('id', guildId).single(),
      supabase
        .from('guild_settings')
        .select('raid_summary_channel_id, loot_announcements_enabled')
        .eq('guild_id', guildId)
        .single(),
    ])

    if (!guild?.discord_server_id) return false
    if (!settings?.raid_summary_channel_id) return false
    if (settings.loot_announcements_enabled === false) return false

    const itemIds = [...new Set(awards.map((a) => a.itemId))]
    const { data: items } = await supabase
      .from('loot_items')
      .select('id, name, wowhead_id')
      .in('id', itemIds)
    const itemById = new Map(
      (items || []).map((i) => [i.id, { name: i.name as string, wowheadId: (i.wowhead_id as number | null) ?? null }])
    )

    const lines = awards.map((a) => {
      const item = itemById.get(a.itemId)
      const itemText = item ? wowheadLink(item.name, item.wowheadId) : '*Unknown item*'
      return `🏆 ${itemText} → **${a.characterName}**`
    })

    const description = clampDescription(lines.join('\n'))
    const title =
      awards.length === 1
        ? 'Loot awarded'
        : `${awards.length} items awarded`

    const embed = {
      title,
      description,
      color: EMBED_COLOR_ORANGE,
      timestamp: new Date().toISOString(),
      footer: { text: 'LootList+' },
    }

    const res = await discordFetch(
      `https://discord.com/api/v10/channels/${settings.raid_summary_channel_id}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bot ${botToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ embeds: [embed] }),
      }
    )

    if (!res.ok) {
      const text = await res.text()
      console.error(`[loot-announce] discord post failed (${res.status}): ${text}`)
      return false
    }
    return true
  } catch (err) {
    console.error('[loot-announce] error:', err)
    return false
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { trackApiError } from '@/utils/analytics/server'
import { discordFetch } from '@/lib/discord'
import { roleHasPermission } from '@/domain/guild/roles'

interface NotifyOfficersPayload {
  guild_id: string
  character_id?: string
  character_name: string
  phase?: number
  guild_name?: string
}

/**
 * POST - Send Discord DMs to officers when a loot list is submitted
 *
 * This endpoint:
 * 1. Gets all officers/guild masters for the guild
 * 2. Gets their Discord IDs from user_preferences
 * 3. Sends each officer a DM about the new submission
 */
export async function POST(request: NextRequest) {
  try {
    // Verify the caller is authenticated
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload: NotifyOfficersPayload = await request.json()
    const { guild_id, character_id, character_name, phase, guild_name } = payload

    if (!guild_id || !character_name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const botToken = process.env.DISCORD_BOT_TOKEN
    if (!botToken) {
      console.error('DISCORD_BOT_TOKEN not configured')
      return NextResponse.json({
        sent: false,
        reason: 'Notifications temporarily unavailable'
      })
    }

    // Use service role client to bypass RLS - the authenticated user may be a
    // non-officer raider whose session can't query officer memberships
    const supabase = createServiceRoleClient()

    // Verify the caller is a member of this guild
    const { data: callerCharacters } = await supabase
      .from('characters')
      .select('id')
      .eq('user_id', user.id)

    if (!callerCharacters || callerCharacters.length === 0) {
      return NextResponse.json({ error: 'Not a member of this guild' }, { status: 403 })
    }

    const callerCharacterIds = callerCharacters.map((c: { id: string }) => c.id)

    const { data: callerMembership } = await supabase
      .from('character_guild_memberships')
      .select('id')
      .eq('guild_id', guild_id)
      .in('character_id', callerCharacterIds)
      .eq('is_active', true)
      .limit(1)

    if (!callerMembership || callerMembership.length === 0) {
      return NextResponse.json({ error: 'Not a member of this guild' }, { status: 403 })
    }

    // Find every role in this guild whose holders should be notified about new
    // submissions: officer-level positions get it implicitly, and any custom
    // role with the explicit manage_submissions permission gets it too.
    const { data: guildRoles, error: rolesError } = await supabase
      .from('guild_roles')
      .select('name, position, permissions')
      .eq('guild_id', guild_id)

    if (rolesError) {
      console.error('Error fetching guild roles:', rolesError)
      return NextResponse.json({ error: 'Failed to fetch guild roles' }, { status: 500 })
    }

    const notifiableRoleNames = (guildRoles || [])
      .filter(r => roleHasPermission(r.position ?? 0, r.permissions ?? [], 'manage_submissions'))
      .map(r => r.name)

    // Fall back to default role names so guilds that never seeded guild_roles still work
    if (notifiableRoleNames.length === 0) {
      notifiableRoleNames.push('Officer', 'Guild Master')
    }

    const { data: officers, error: officersError } = await supabase
      .from('character_guild_memberships')
      .select(`
        role,
        characters!inner(
          user_id
        )
      `)
      .eq('guild_id', guild_id)
      .in('role', notifiableRoleNames)
      .eq('is_active', true)

    if (officersError) {
      console.error('Error fetching officers:', officersError)
      return NextResponse.json({ error: 'Failed to fetch officers' }, { status: 500 })
    }

    if (!officers || officers.length === 0) {
      return NextResponse.json({
        sent: false,
        reason: 'No officers found'
      })
    }

    // Get unique user IDs from officers
    const officerUserIds = [...new Set(
      officers
        .map(o => {
          const char = o.characters as unknown as { user_id: string } | null
          return char?.user_id
        })
        .filter((id): id is string => Boolean(id))
    )]

    // Don't notify the submitter if they're an officer
    const filteredUserIds = officerUserIds.filter(id => id !== user.id)

    if (filteredUserIds.length === 0) {
      return NextResponse.json({
        sent: false,
        reason: 'No other officers to notify'
      })
    }

    // Get Discord IDs for these officers
    // First check user_preferences for manually verified Discord IDs
    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('user_id, discord_id')
      .in('user_id', filteredUserIds)

    // Build a map of user_id -> discord_id from preferences
    const discordIdMap = new Map<string, string>()
    if (preferences) {
      for (const pref of preferences) {
        if (pref.discord_id) {
          discordIdMap.set(pref.user_id, pref.discord_id)
        }
      }
    }

    // For officers without a discord_id in preferences, fall back to auth metadata (parallel)
    const missingIds = filteredUserIds.filter(id => !discordIdMap.has(id))
    if (missingIds.length > 0) {
      try {
        const results = await Promise.all(
          missingIds.map(id => supabase.auth.admin.getUserById(id))
        )
        for (const result of results) {
          if (result.data?.user) {
            const providerId = result.data.user.user_metadata?.provider_id
            if (providerId) {
              discordIdMap.set(result.data.user.id, providerId)
            }
          }
        }
      } catch (err) {
        console.error('Error fetching auth metadata for Discord IDs:', err)
      }
    }

    if (discordIdMap.size === 0) {
      return NextResponse.json({
        sent: false,
        reason: 'No officers with Discord linked'
      })
    }

    // Look up the submitter's class so the embed stripe matches their class
    // color — same pattern as the approval DM (commit c162ab4). Falls back to
    // the LootList+ accent when class data is missing.
    type WowClass = { name: string; color_hex: string }
    let charClass: WowClass | null = null
    if (character_id) {
      const { data: charRow } = await supabase
        .from('characters')
        .select('class:wow_classes(name, color_hex)')
        .eq('id', character_id)
        .maybeSingle()
      const raw = (charRow as { class?: WowClass | WowClass[] | null } | null)?.class
      charClass = Array.isArray(raw) ? raw[0] ?? null : raw ?? null
    }

    const FALLBACK_COLOR = 0xff8000 // LootList+ accent (legendary orange)
    const embedColor = charClass?.color_hex
      ? parseInt(charClass.color_hex.replace('#', ''), 16)
      : FALLBACK_COLOR

    const headerLine = `**${character_name}**${phase ? ` — Phase ${phase}` : ''}${guild_name ? ` in **${guild_name}**` : ''}`
    const footerParts = [charClass?.name, guild_name, 'LootList+'].filter(Boolean) as string[]
    const embed = {
      title: '📋 New loot list submission',
      url: 'https://lootlistplus.com/loot-submissions',
      description: `${headerLine}\n\nReview it when you get a chance.`,
      color: embedColor,
      footer: { text: footerParts.join(' • ') },
      timestamp: new Date().toISOString(),
    }

    // Send DMs to each officer
    let sentCount = 0
    let failedCount = 0

    for (const [, discordId] of discordIdMap) {
      try {
        // Create DM channel
        const dmChannelResponse = await discordFetch('https://discord.com/api/v10/users/@me/channels', {
          method: 'POST',
          headers: {
            'Authorization': `Bot ${botToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            recipient_id: discordId
          })
        })

        if (!dmChannelResponse.ok) {
          console.error(`Failed to create DM channel for ${discordId}:`, dmChannelResponse.status)
          failedCount++
          continue
        }

        const dmChannel = await dmChannelResponse.json()

        // Send the message
        const messageResponse = await discordFetch(`https://discord.com/api/v10/channels/${dmChannel.id}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bot ${botToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            embeds: [embed]
          })
        })

        if (messageResponse.ok) {
          sentCount++
        } else {
          console.error(`Failed to send DM to ${discordId}:`, messageResponse.status)
          failedCount++
        }
      } catch (err) {
        console.error(`Error sending DM to ${discordId}:`, err)
        failedCount++
      }
    }

    return NextResponse.json({
      sent: true,
      sentCount,
      failedCount,
      message: `Notified ${sentCount} officer(s)`
    })

  } catch (error) {
    console.error('Error notifying officers:', error)
    trackApiError('unknown', 'POST /api/discord/notify-officers', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

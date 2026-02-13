import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { trackApiError } from '@/utils/analytics/server'
import { discordFetch } from '@/lib/discord'

interface NotifyOfficersPayload {
  guild_id: string
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
    const { guild_id, character_name, phase, guild_name } = payload

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

    // Get all officers and guild masters for this guild with their Discord IDs
    const { data: officers, error: officersError } = await supabase
      .from('character_guild_memberships')
      .select(`
        role,
        characters!inner(
          user_id
        )
      `)
      .eq('guild_id', guild_id)
      .in('role', ['Officer', 'Guild Master'])
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

    // For officers without a discord_id in preferences, fall back to auth metadata
    const missingIds = filteredUserIds.filter(id => !discordIdMap.has(id))
    if (missingIds.length > 0) {
      try {
        for (const userId of missingIds) {
          const { data: { user: authUser } } = await supabase.auth.admin.getUserById(userId)
          const providerId = authUser?.user_metadata?.provider_id
          if (providerId) {
            discordIdMap.set(userId, providerId)
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

    // Build the notification message
    let message = `📋 **New Loot List Submission**\n\n`
    message += `**${character_name}** has submitted their loot list`
    if (phase) {
      message += ` for Phase ${phase}`
    }
    if (guild_name) {
      message += ` in **${guild_name}**`
    }
    message += `.\n\nReview it when you get a chance.`
    message += `\n\n[Review submissions](https://lootlistplus.com/loot-submissions)`

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
            content: message
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

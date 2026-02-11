import { NextRequest, NextResponse } from 'next/server'
import { createClient, getAuthenticatedUser } from '@/utils/supabase/server'

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

    const supabase = await createClient()

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
      console.log('No officers found for guild:', guild_id)
      return NextResponse.json({
        sent: false,
        reason: 'No officers found'
      })
    }

    // Get unique user IDs from officers
    const officerUserIds = [...new Set(
      officers
        .map(o => (o.characters as { user_id: string })?.user_id)
        .filter(Boolean)
    )]

    // Don't notify the submitter if they're an officer
    const filteredUserIds = officerUserIds.filter(id => id !== user.id)

    if (filteredUserIds.length === 0) {
      console.log('No other officers to notify (submitter is the only officer)')
      return NextResponse.json({
        sent: false,
        reason: 'No other officers to notify'
      })
    }

    // Get Discord IDs for these officers
    const { data: preferences, error: prefError } = await supabase
      .from('user_preferences')
      .select('user_id, discord_id')
      .in('user_id', filteredUserIds)
      .eq('discord_verified', true)
      .not('discord_id', 'is', null)

    if (prefError) {
      console.error('Error fetching officer preferences:', prefError)
      return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 })
    }

    if (!preferences || preferences.length === 0) {
      console.log('No officers with verified Discord IDs')
      return NextResponse.json({
        sent: false,
        reason: 'No officers with verified Discord'
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

    for (const pref of preferences) {
      try {
        // Create DM channel
        const dmChannelResponse = await fetch('https://discord.com/api/v10/users/@me/channels', {
          method: 'POST',
          headers: {
            'Authorization': `Bot ${botToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            recipient_id: pref.discord_id
          })
        })

        if (!dmChannelResponse.ok) {
          console.error(`Failed to create DM channel for ${pref.discord_id}:`, dmChannelResponse.status)
          failedCount++
          continue
        }

        const dmChannel = await dmChannelResponse.json()

        // Send the message
        const messageResponse = await fetch(`https://discord.com/api/v10/channels/${dmChannel.id}/messages`, {
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
          console.log(`Sent submission notification to officer ${pref.discord_id}`)
        } else {
          console.error(`Failed to send DM to ${pref.discord_id}:`, messageResponse.status)
          failedCount++
        }
      } catch (err) {
        console.error(`Error sending DM to ${pref.discord_id}:`, err)
        failedCount++
      }
    }

    console.log(`Notified ${sentCount} officers, ${failedCount} failed`)
    return NextResponse.json({
      sent: true,
      sentCount,
      failedCount,
      message: `Notified ${sentCount} officer(s)`
    })

  } catch (error) {
    console.error('Error notifying officers:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

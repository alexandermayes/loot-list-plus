import { NextRequest, NextResponse } from 'next/server'
import { createClient, getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { trackApiError } from '@/utils/analytics/server'
import { discordFetch } from '@/lib/discord'

interface NotificationPayload {
  submission_id: string
  status: 'approved' | 'rejected' | 'needs_revision'
  review_notes?: string
  guild_name?: string
  character_name?: string
  phase?: number
}

/**
 * POST - Send a Discord DM notification about loot submission status
 *
 * This endpoint:
 * 1. Looks up the submission to get the character
 * 2. Gets the user who owns the character
 * 3. Checks their notification preferences
 * 4. Sends a DM if they have notifications enabled
 */
export async function POST(request: NextRequest) {
  try {
    // Verify the caller is authenticated (should be an officer)
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload: NotificationPayload = await request.json()
    const { submission_id, status, review_notes, guild_name, character_name, phase } = payload

    if (!submission_id || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const botToken = process.env.DISCORD_BOT_TOKEN
    if (!botToken) {
      // MED-02 FIX: Return generic response to avoid configuration disclosure
      console.error('DISCORD_BOT_TOKEN not configured')
      return NextResponse.json({
        sent: false,
        reason: 'Notifications temporarily unavailable'
      })
    }

    const supabase = await createClient()

    // Get submission with character info
    const { data: submission, error: subError } = await supabase
      .from('loot_submissions')
      .select(`
        id,
        character_id,
        characters(id, name, user_id)
      `)
      .eq('id', submission_id)
      .single()

    if (subError || !submission) {
      console.error('Error fetching submission:', subError)
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    // Handle both array and object return types from Supabase relation
    const charactersData = submission.characters
    const character = (Array.isArray(charactersData) ? charactersData[0] : charactersData) as { id: string; name: string; user_id: string } | null
    if (!character?.user_id) {
      console.error('No character or user_id found for submission')
      return NextResponse.json({ error: 'Character not found' }, { status: 404 })
    }

    // Get user preferences including discord_id and notification settings
    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('discord_id, notify_submission_status')
      .eq('user_id', character.user_id)
      .single()

    // Check if user wants notifications
    if (preferences?.notify_submission_status === false) {
      console.log('User has notifications disabled')
      return NextResponse.json({
        sent: false,
        reason: 'User has notifications disabled'
      })
    }

    // Get Discord ID: prefer user_preferences, fall back to auth metadata
    let discordId = preferences?.discord_id
    if (!discordId) {
      try {
        const adminClient = createServiceRoleClient()
        const { data: { user: targetUser } } = await adminClient.auth.admin.getUserById(character.user_id)
        discordId = targetUser?.user_metadata?.provider_id || null
      } catch (err) {
        console.error('Error fetching auth metadata for Discord ID:', err)
      }
    }

    if (!discordId) {
      console.log('No Discord ID found for user:', character.user_id)
      return NextResponse.json({
        sent: false,
        reason: 'No Discord ID found'
      })
    }

    // Build the notification message
    const statusEmoji = status === 'approved' ? '✅' : status === 'rejected' ? '❌' : '📝'
    const statusText = status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'needs revision'

    let message = `${statusEmoji} **Loot List Update**\n\n`
    message += `Your loot list for **${character_name || character.name}**`
    if (phase) {
      message += ` (Phase ${phase})`
    }
    if (guild_name) {
      message += ` in **${guild_name}**`
    }
    message += ` has been **${statusText}**`

    if (status === 'approved') {
      message += `.\n\nYour rankings are now active on the Master Sheet.`
    } else if (status === 'rejected') {
      message += `.\n\nPlease review the feedback and resubmit.`
    } else {
      message += `.\n\nPlease review the feedback and make the requested changes.`
    }

    if (review_notes) {
      message += `\n\n**Officer Notes:**\n> ${review_notes.replace(/\n/g, '\n> ')}`
    }

    message += `\n\n[View your loot list](https://lootlistplus.com/loot-list)`

    // First, create a DM channel with the user
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
      const errorText = await dmChannelResponse.text()
      console.error('Failed to create DM channel:', dmChannelResponse.status, errorText)

      // User might have DMs disabled or blocked the bot
      if (dmChannelResponse.status === 403) {
        return NextResponse.json({
          sent: false,
          reason: 'User has DMs disabled or has blocked the bot'
        })
      }

      return NextResponse.json({
        sent: false,
        reason: 'Failed to create DM channel'
      })
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

    if (!messageResponse.ok) {
      const errorText = await messageResponse.text()
      console.error('Failed to send DM:', messageResponse.status, errorText)
      return NextResponse.json({
        sent: false,
        reason: 'Failed to send message'
      })
    }

    console.log(`Successfully sent DM to Discord user ${discordId}`)
    return NextResponse.json({
      sent: true,
      message: 'Notification sent successfully'
    })

  } catch (error) {
    console.error('Error sending Discord notification:', error)
    trackApiError('unknown', 'POST /api/discord/send-notification', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient, getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyPermission } from '@/utils/server-roles'
import { trackApiError } from '@/utils/analytics/server'
import { discordFetch } from '@/lib/discord'

interface NotificationPayload {
  submission_id: string
  status: 'approved' | 'rejected' | 'needs_revision' | 'changes_reverted'
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
    const serviceSupabase = createServiceRoleClient()

    // Get submission with character info (class included for embed color + footer)
    const { data: submission, error: subError } = await supabase
      .from('loot_submissions')
      .select(`
        id,
        guild_id,
        character_id,
        characters(
          id,
          name,
          user_id,
          class:wow_classes(name, color_hex)
        )
      `)
      .eq('id', submission_id)
      .single()

    if (subError || !submission) {
      console.error('Error fetching submission:', subError)
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    // Verify the caller is an officer in the submission's guild
    const verification = await verifyPermission(serviceSupabase, user.id, submission.guild_id, 'manage_submissions')
    if (!verification.hasPermission) {
      return NextResponse.json({ error: 'Only officers can send submission notifications' }, { status: 403 })
    }

    // Handle both array and object return types from Supabase relation
    const charactersData = submission.characters
    type WowClass = { name: string; color_hex: string }
    type CharRow = { id: string; name: string; user_id: string; class?: WowClass | WowClass[] | null }
    const character = (Array.isArray(charactersData) ? charactersData[0] : charactersData) as CharRow | null
    if (!character?.user_id) {
      console.error('No character or user_id found for submission')
      return NextResponse.json({ error: 'Character not found' }, { status: 404 })
    }

    // Get user preferences including discord_id and notification settings
    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('discord_id, notify_submission_status')
      .eq('user_id', character.user_id)
      .maybeSingle()

    // Check if user wants notifications
    if (preferences?.notify_submission_status === false) {
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
      return NextResponse.json({
        sent: false,
        reason: 'No Discord ID found'
      })
    }

    // Build a Discord rich embed. The color stripe matches the character's
    // class, so a raider seeing many of these DMs over a phase can tell at a
    // glance which alt got approved without reading the header — and we
    // sidestep Discord's URL-unfurl pulling the stale marketing OG card.
    const STATUS_META = {
      approved: {
        title: '✅ Loot list approved',
        tail: 'Your rankings are now active on the Master Sheet.',
        fallbackColor: 0x10b981, // emerald
      },
      rejected: {
        title: '❌ Loot list rejected',
        tail: 'Please review the feedback and resubmit.',
        fallbackColor: 0xef4444, // red
      },
      needs_revision: {
        title: '📝 Revisions requested',
        tail: 'Please review the feedback and make the requested changes.',
        fallbackColor: 0xf59e0b, // amber
      },
      changes_reverted: {
        title: '↩️ Recent changes rejected',
        tail: 'Your previously approved list is still active. Edit your list and resubmit to try again.',
        fallbackColor: 0xef4444, // red
      },
    } as const

    const meta = STATUS_META[status]
    const charClass = Array.isArray(character.class) ? character.class[0] : character.class
    const colorHex = charClass?.color_hex
    const embedColor = colorHex
      ? parseInt(colorHex.replace('#', ''), 16)
      : meta.fallbackColor

    const charName = character_name || character.name
    const headerLine = `**${charName}**${phase ? ` — Phase ${phase}` : ''}${guild_name ? ` in **${guild_name}**` : ''}`

    const fields: { name: string; value: string; inline?: boolean }[] = []
    if (review_notes) {
      // Discord embed field values cap at 1024 chars.
      const trimmed = review_notes.length > 1020 ? review_notes.slice(0, 1020) + '…' : review_notes
      fields.push({ name: 'Officer notes', value: trimmed })
    }

    const footerParts = [charClass?.name, guild_name, 'LootList+'].filter(Boolean) as string[]
    const embed = {
      title: meta.title,
      url: 'https://lootlistplus.com/loot-list',
      description: `${headerLine}\n\n${meta.tail}`,
      color: embedColor,
      fields,
      footer: { text: footerParts.join(' • ') },
      timestamp: new Date().toISOString(),
    }

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
        embeds: [embed],
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

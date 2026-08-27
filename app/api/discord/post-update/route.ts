import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { trackApiError } from '@/utils/analytics/server'
import { discordFetch } from '@/lib/discord'

interface UpdateItem {
  category: 'feature' | 'improvement' | 'fix'
  title: string
  description?: string
}

interface PostUpdatePayload {
  date: string
  version?: string
  items: UpdateItem[]
}

const categoryEmoji: Record<string, string> = {
  feature: '✨',
  improvement: '🔧',
  fix: '🐛',
}

const categoryLabel: Record<string, string> = {
  feature: 'New',
  improvement: 'Improved',
  fix: 'Fixed',
}

const SUPER_ADMIN_IDS = process.env.SUPER_ADMIN_IDS?.split(',').filter(Boolean) || []

/**
 * POST - Send an app update to the LootList+ Discord via webhook
 *
 * This endpoint formats update entries and posts them to a Discord channel
 * using a webhook URL configured in DISCORD_WEBHOOK_UPDATES_URL.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only super admins can post app updates to Discord
    if (!SUPER_ADMIN_IDS.includes(user.id)) {
      return NextResponse.json({ error: 'Only admins can post updates' }, { status: 403 })
    }

    const webhookUrl = process.env.DISCORD_WEBHOOK_UPDATES_URL
    if (!webhookUrl) {
      console.error('DISCORD_WEBHOOK_UPDATES_URL not configured')
      return NextResponse.json({
        sent: false,
        reason: 'Webhook not configured'
      })
    }

    const payload: PostUpdatePayload = await request.json()
    const { date, version, items } = payload

    if (!date || !items || items.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Build Discord embed
    const fields = items.map(item => ({
      name: `${categoryEmoji[item.category] || '📋'} ${categoryLabel[item.category] || item.category}: ${item.title}`,
      value: item.description || '*No description*',
      inline: false,
    }))

    const embed = {
      title: `📢 LootList+ Update: ${date}`,
      color: 0xff8000, // Accent orange
      fields,
      footer: {
        text: version ? `v${version} • lootlistplus.com` : 'lootlistplus.com',
      },
      timestamp: new Date().toISOString(),
    }

    const webhookResponse = await discordFetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [embed],
      }),
    })

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text()
      console.error('Failed to post update to Discord:', webhookResponse.status, errorText)
      return NextResponse.json({
        sent: false,
        reason: 'Failed to post to Discord'
      })
    }

    return NextResponse.json({
      sent: true,
      message: 'Update posted to Discord'
    })

  } catch (error) {
    console.error('Error posting update to Discord:', error)
    trackApiError('unknown', 'POST /api/discord/post-update', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { updates } from '@/lib/updates-data'
import { discordFetch } from '@/lib/discord'

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

/**
 * GET - Cron job that posts new app updates to Discord
 *
 * Called by Vercel Cron every hour. Checks Redis for the last posted
 * update date and posts to Discord if there's a new one.
 */
export async function GET(request: NextRequest) {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const webhookUrl = process.env.DISCORD_WEBHOOK_UPDATES_URL
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!webhookUrl) {
    return NextResponse.json({ skipped: true, reason: 'DISCORD_WEBHOOK_UPDATES_URL not configured' })
  }

  if (!redisUrl || !redisToken) {
    return NextResponse.json({ skipped: true, reason: 'Upstash Redis not configured' })
  }

  const latest = updates[0]
  if (!latest) {
    return NextResponse.json({ skipped: true, reason: 'No updates found' })
  }

  const redisKey = 'updates:last-posted-date'

  try {
    // Check what we last posted
    const getResponse = await fetch(`${redisUrl}/get/${redisKey}`, {
      headers: { Authorization: `Bearer ${redisToken}` },
    })
    const getData = await getResponse.json()
    const lastPostedDate = getData.result as string | null

    if (lastPostedDate === latest.date) {
      return NextResponse.json({ skipped: true, reason: `Already posted ${latest.date}` })
    }

    // Build Discord embed
    const fields = latest.items.map(item => ({
      name: `${categoryEmoji[item.category] || '📋'} ${categoryLabel[item.category] || item.category}: ${item.title}`,
      value: item.description || '*No description*',
      inline: false,
    }))

    const embed = {
      title: `📢 LootList+ Update — ${latest.date}`,
      color: 0xff8000,
      fields,
      footer: {
        text: latest.version ? `v${latest.version} • lootlistplus.com` : 'lootlistplus.com',
      },
      timestamp: new Date().toISOString(),
    }

    const webhookResponse = await discordFetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    })

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text()
      console.error(`[post-update] Discord webhook failed: ${webhookResponse.status}`, errorText)
      return NextResponse.json({ sent: false, reason: 'Discord webhook failed' }, { status: 502 })
    }

    // Record that we posted this update
    await fetch(`${redisUrl}/set/${redisKey}/${encodeURIComponent(latest.date)}`, {
      headers: { Authorization: `Bearer ${redisToken}` },
    })

    console.log(`[post-update] Posted to Discord: ${latest.date} (${latest.items.length} items)`)
    return NextResponse.json({ sent: true, date: latest.date, items: latest.items.length })
  } catch (error) {
    console.error('[post-update] Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

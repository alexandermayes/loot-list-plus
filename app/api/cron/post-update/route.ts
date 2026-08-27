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
 * Normalize a date string into a stable, URL-safe key.
 * "February 17, 2026" → "february-17-2026"
 */
function dateToKey(date: string): string {
  return date.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

/**
 * GET - Cron job that posts new app updates to Discord
 *
 * Called by Vercel Cron every hour. Uses per-update Redis keys so each
 * update can only ever be posted once, regardless of retries or failures.
 *
 * Redis key pattern: updates:posted:<date-slug>
 * Once this key exists, that update will never be posted again.
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

  // Per-update key: once this exists, that update is permanently marked as posted
  const redisKey = `updates:posted:${dateToKey(latest.date)}`

  try {
    // Use SETNX (set-if-not-exists) to atomically claim this update.
    // Returns 1 if key was set (we got the lock), 0 if it already existed (already posted).
    const setnxResponse = await fetch(`${redisUrl}/setnx/${redisKey}/1`, {
      headers: { Authorization: `Bearer ${redisToken}` },
    })

    if (!setnxResponse.ok) {
      console.error(`[post-update] Redis SETNX failed: ${setnxResponse.status}`)
      return NextResponse.json({ error: 'Redis write failed' }, { status: 502 })
    }

    const setnxData = await setnxResponse.json()

    // SETNX returns 0 if the key already existed (update was already posted)
    if (setnxData.result === 0) {
      return NextResponse.json({ skipped: true, reason: `Already posted ${latest.date}` })
    }

    // We claimed the lock. Now post to Discord.
    const fields = latest.items.map(item => ({
      name: `${categoryEmoji[item.category] || '📋'} ${categoryLabel[item.category] || item.category}: ${item.title}`,
      value: item.description || '*No description*',
      inline: false,
    }))

    const embed = {
      title: `📢 LootList+ Update: ${latest.date}`,
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

      // Roll back: delete the key so the next run can retry
      await fetch(`${redisUrl}/del/${redisKey}`, {
        headers: { Authorization: `Bearer ${redisToken}` },
      })

      return NextResponse.json({ sent: false, reason: 'Discord webhook failed' }, { status: 502 })
    }

    return NextResponse.json({ sent: true, date: latest.date, items: latest.items.length })
  } catch (error) {
    console.error('[post-update] Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

import { updates } from '@/lib/updates-data'

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

async function postLatestUpdateToDiscord() {
  const webhookUrl = process.env.DISCORD_WEBHOOK_UPDATES_URL
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!webhookUrl) {
    console.log('[updates] DISCORD_WEBHOOK_UPDATES_URL not configured, skipping')
    return
  }

  if (!redisUrl || !redisToken) {
    console.log('[updates] Upstash Redis not configured, skipping')
    return
  }

  const latest = updates[0]
  if (!latest) {
    console.log('[updates] No updates found')
    return
  }

  const redisKey = 'updates:last-posted-date'

  try {
    // Check what we last posted via Upstash REST API
    const getResponse = await fetch(`${redisUrl}/get/${redisKey}`, {
      headers: { Authorization: `Bearer ${redisToken}` },
    })
    const getData = await getResponse.json()
    const lastPostedDate = getData.result as string | null

    if (lastPostedDate === latest.date) {
      console.log(`[updates] Already posted update for ${latest.date}, skipping`)
      return
    }

    // Build Discord embed (same format as post-update route)
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

    // Post to Discord webhook
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    })

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text()
      console.error(`[updates] Failed to post to Discord: ${webhookResponse.status}`, errorText)
      return
    }

    // Record that we posted this update
    await fetch(`${redisUrl}/set/${redisKey}/${encodeURIComponent(latest.date)}`, {
      headers: { Authorization: `Bearer ${redisToken}` },
    })

    console.log(`[updates] Posted update to Discord: ${latest.date} (${latest.items.length} items)`)
  } catch (error) {
    console.error('[updates] Error posting update to Discord:', error)
  }
}

export async function register() {
  // Only run on the server (Node.js runtime), not on edge
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    postLatestUpdateToDiscord().catch(err => {
      console.error('[updates] Unhandled error in postLatestUpdateToDiscord:', err)
    })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { discordFetch } from '@/lib/discord'
import { diffPremiumRoleHolders } from '@/lib/billing/premium-role-diff'
import type { PremiumRoleDiff } from '@/lib/billing/premium-role-diff'

interface DiscordMember {
  user?: { id?: string }
  roles?: string[]
}

/**
 * GET - Daily reconciliation cron for the community Discord's Premium role.
 *
 * Runs at 06:30 UTC, half an hour after auto-promote-trials, so the two
 * daily jobs do not contend. Grants the Premium role to every current pro
 * purchaser (including comped guilds) and revokes it from holders who no
 * longer own any pro guild. The same run doubles as a one-time backfill on
 * first deploy, since granting is idempotent at Discord.
 *
 * Requires the privileged Server Members Intent (Discord Developer Portal
 * -> Applications -> bot -> Bot -> Privileged Gateway Intents) to list
 * current holders. Without it, revokes are skipped and only grants run.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const botToken = process.env.DISCORD_BOT_TOKEN
  const communityGuildId = process.env.DISCORD_COMMUNITY_GUILD_ID
  const premiumRoleId = process.env.DISCORD_PREMIUM_ROLE_ID
  if (!botToken || !communityGuildId || !premiumRoleId) {
    return NextResponse.json({ skipped: true, reason: 'Discord env vars not configured' })
  }

  const supabase = createServiceRoleClient()

  // Desired set: every discord id that should hold the role right now.
  // Filtering on subscription_tier alone includes comped guilds by design.
  const { data: proGuilds } = await supabase
    .from('guilds')
    .select('created_by')
    .eq('subscription_tier', 'pro')

  const creatorIds = [...new Set((proGuilds ?? []).map((g) => g.created_by).filter((id): id is string => !!id))]

  let desired: string[] = []
  if (creatorIds.length > 0) {
    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('discord_id')
      .in('user_id', creatorIds)
    desired = (prefs ?? []).map((p) => p.discord_id).filter((id): id is string => !!id)
  }

  const current = await listCurrentPremiumHolders(botToken, communityGuildId, premiumRoleId)
  const diff = diffPremiumRoleHolders(desired, current)

  const tally = await applyDiff(diff, botToken, communityGuildId, premiumRoleId)

  return NextResponse.json({
    granted: tally.granted,
    revoked: tally.revoked,
    notInServer: tally.notInServer,
    failures: tally.failures,
    revokesSkipped: current === null,
  })
}

/**
 * Pages through GET /guilds/{guild}/members and returns the discord ids
 * currently holding the premium role, or null when the listing could not
 * be read (missing Server Members Intent, or any other non-ok status).
 * Null is "unknown", not "empty" - that is what makes the diff refuse to
 * revoke.
 */
async function listCurrentPremiumHolders(
  botToken: string,
  communityGuildId: string,
  premiumRoleId: string
): Promise<string[] | null> {
  const holders: string[] = []
  let after: string | undefined

  for (;;) {
    const url = new URL(`https://discord.com/api/v10/guilds/${communityGuildId}/members`)
    url.searchParams.set('limit', '1000')
    if (after) url.searchParams.set('after', after)

    const res = await discordFetch(url.toString(), {
      headers: { Authorization: `Bot ${botToken}` },
    })

    if (res.status === 403) {
      console.error('Discord premium sync: cannot list guild members - missing Server Members Intent', {
        communityGuildId,
        location: 'Discord Developer Portal -> Applications -> bot -> Bot -> Privileged Gateway Intents -> Server Members Intent',
      })
      return null
    }
    if (!res.ok) {
      console.error('Discord premium sync: member listing failed', { communityGuildId, status: res.status })
      return null
    }

    const page = (await res.json()) as DiscordMember[]
    for (const member of page) {
      if (member.user?.id && member.roles?.includes(premiumRoleId)) {
        holders.push(member.user.id)
      }
    }

    if (page.length < 1000) break
    after = page[page.length - 1]?.user?.id
    if (!after) break
  }

  return holders
}

interface ApplyTally {
  granted: number
  revoked: number
  notInServer: number
  failures: number
}

/** Applies a computed diff sequentially - the wrapper backs off on 429 and the holder count is small. */
async function applyDiff(
  diff: PremiumRoleDiff,
  botToken: string,
  communityGuildId: string,
  premiumRoleId: string
): Promise<ApplyTally> {
  const tally: ApplyTally = { granted: 0, revoked: 0, notInServer: 0, failures: 0 }

  for (const discordId of diff.toGrant) {
    const res = await discordFetch(
      `https://discord.com/api/v10/guilds/${communityGuildId}/members/${discordId}/roles/${premiumRoleId}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bot ${botToken}`,
          'X-Audit-Log-Reason': 'LootList+ Premium reconciliation: grant',
        },
      }
    )
    if (res.ok) {
      tally.granted += 1
    } else if (res.status === 404) {
      tally.notInServer += 1
      console.warn('Discord premium sync: purchaser not in the community server', { discordId })
    } else {
      tally.failures += 1
      console.error('Discord premium sync: grant failed', { discordId, status: res.status })
    }
  }

  for (const discordId of diff.toRevoke) {
    const res = await discordFetch(
      `https://discord.com/api/v10/guilds/${communityGuildId}/members/${discordId}/roles/${premiumRoleId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bot ${botToken}`,
          'X-Audit-Log-Reason': 'LootList+ Premium reconciliation: revoke',
        },
      }
    )
    if (res.ok || res.status === 404) {
      tally.revoked += 1
    } else {
      tally.failures += 1
      console.error('Discord premium sync: revoke failed', { discordId, status: res.status })
    }
  }

  return tally
}

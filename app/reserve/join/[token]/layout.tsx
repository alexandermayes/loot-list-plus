import type { Metadata } from 'next'
import { createServiceRoleClient } from '@/utils/supabase/service-role'

/**
 * Discord/Twitter/etc. link unfurl metadata for a reserve run.
 * Runs server-side via the service role so we can read the run
 * even though this route is public.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>
}): Promise<Metadata> {
  const { token } = await params

  const fallback: Metadata = {
    title: 'Reserve your loot | LootList+',
    description: 'Soft reserve your items for this raid before it locks.',
  }

  try {
    const supabase = createServiceRoleClient()

    const { data: run } = await supabase
      .from('reserve_runs')
      .select('id, title, raid_at, status, max_reserves, raid_tier_id, guild_id')
      .eq('share_token', token)
      .single()

    if (!run) return fallback

    const [{ data: raidTier }, { data: guild }] = await Promise.all([
      supabase.from('raid_tiers').select('name').eq('id', run.raid_tier_id).single(),
      run.guild_id
        ? supabase.from('guilds').select('name').eq('id', run.guild_id).single()
        : Promise.resolve({ data: null }),
    ])

    const raidName = raidTier?.name || 'Raid'
    const guildName = guild?.name

    const raidDate = new Date(run.raid_at).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })

    const statusLabel =
      run.status === 'open'
        ? 'Open for reserves'
        : run.status === 'locked'
        ? 'Reserves locked'
        : 'Completed'

    const title = guildName
      ? `${guildName}: ${run.title}`
      : `${run.title} | LootList+ Reserve`

    const reserveCount = run.max_reserves
    const description = `${statusLabel} · ${raidName} · ${raidDate} · ${reserveCount} reserve${reserveCount !== 1 ? 's' : ''} per player`

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'website',
        siteName: 'LootList+ Reserve',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
      },
    }
  } catch {
    return fallback
  }
}

export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return children
}

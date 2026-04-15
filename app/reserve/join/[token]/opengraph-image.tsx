import { ImageResponse } from 'next/og'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { getRaidIconLarge } from '@/utils/raidIcons'

export const runtime = 'nodejs'
export const contentType = 'image/png'
export const size = { width: 1200, height: 630 }

export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const fontData = await fetch(
    'https://fonts.gstatic.com/s/poppins/v22/pxiByp8kv8JHgFVrLEj6Z1JlFd2JQEl8qw.woff2'
  ).then((res) => res.arrayBuffer())

  let title = 'Reserve your loot'
  let iconUrl = getRaidIconLarge('Unknown')

  try {
    const supabase = createServiceRoleClient()
    const { data: run } = await supabase
      .from('reserve_runs')
      .select('id, title, raid_tier_id')
      .eq('share_token', token)
      .single()

    if (run) {
      title = run.title
      const { data: raidTier } = await supabase
        .from('raid_tiers')
        .select('name')
        .eq('id', run.raid_tier_id)
        .single()
      iconUrl = getRaidIconLarge(raidTier?.name || 'Raid')
    }
  } catch {
    // fallback
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#111113',
          color: '#ffffff',
          fontSize: 48,
          fontFamily: 'Poppins',
          padding: '48px',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={iconUrl} width={150} height={150} style={{ borderRadius: '20px', marginRight: '40px' }} alt="" />
        <span>{title}</span>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: 'Poppins',
          data: fontData,
          weight: 600,
          style: 'normal' as const,
        },
      ],
    }
  )
}

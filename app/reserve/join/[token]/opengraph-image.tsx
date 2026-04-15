import { ImageResponse } from 'next/og'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { getRaidIconLarge } from '@/utils/raidIcons'

export const runtime = 'nodejs'
export const contentType = 'image/png'
export const size = { width: 1200, height: 630 }

export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  // Satori only supports TTF/WOFF — woff2 silently crashes.
  const [semiBoldFont, boldFont] = await Promise.all([
    fetch('https://fonts.gstatic.com/s/poppins/v24/pxiByp8kv8JHgFVrLEj6V1s.ttf').then((r) => r.arrayBuffer()),
    fetch('https://fonts.gstatic.com/s/poppins/v24/pxiByp8kv8JHgFVrLCz7V1s.ttf').then((r) => r.arrayBuffer()),
  ])

  let title = 'Reserve your loot'
  let raidName = 'Raid'
  let guildName = ''
  let raidDate = ''
  let statusLabel = 'Open for reserves'
  let maxReserves = 1
  let iconUrl = getRaidIconLarge('Unknown')

  try {
    const supabase = createServiceRoleClient()

    const { data: run } = await supabase
      .from('reserve_runs')
      .select('id, title, raid_at, status, max_reserves, raid_tier_id, guild_id')
      .eq('share_token', token)
      .single()

    if (run) {
      title = run.title
      maxReserves = run.max_reserves

      const [{ data: raidTier }, { data: guild }] = await Promise.all([
        supabase.from('raid_tiers').select('name').eq('id', run.raid_tier_id).single(),
        run.guild_id
          ? supabase.from('guilds').select('name').eq('id', run.guild_id).single()
          : Promise.resolve({ data: null }),
      ])

      raidName = raidTier?.name || 'Raid'
      guildName = guild?.name || ''
      iconUrl = getRaidIconLarge(raidName)

      raidDate = new Date(run.raid_at).toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })

      statusLabel =
        run.status === 'open'
          ? 'Open for reserves'
          : run.status === 'locked'
          ? 'Reserves locked'
          : 'Completed'
    }
  } catch {
    // Use fallback values
  }

  const statusColor =
    statusLabel === 'Open for reserves'
      ? '#22c55e'
      : statusLabel === 'Reserves locked'
      ? '#f59e0b'
      : '#6b7280'

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#111113',
          padding: '48px 56px',
          fontFamily: 'Poppins',
        }}
      >
        {/* Top row: branding + status */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '36px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://www.lootlistplus.com/favicon.png"
              width={36}
              height={36}
              style={{ borderRadius: '8px', marginRight: '14px' }}
              alt=""
            />
            <span style={{ fontSize: '22px', fontWeight: 600, color: '#a1a1aa' }}>
              LootList+ Reserve
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'rgba(255,255,255,0.06)',
              borderRadius: '24px',
              padding: '8px 20px',
            }}
          >
            <div
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: statusColor,
                marginRight: '8px',
              }}
            />
            <span style={{ fontSize: '18px', fontWeight: 600, color: statusColor }}>
              {statusLabel}
            </span>
          </div>
        </div>

        {/* Main content: text left, raid icon right */}
        <div
          style={{
            display: 'flex',
            flexGrow: 1,
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
            {guildName !== '' ? (
              <span style={{ fontSize: '24px', fontWeight: 600, color: '#ff8000', marginBottom: '12px' }}>
                {guildName}
              </span>
            ) : null}

            <span
              style={{
                fontSize: title.length > 35 ? '38px' : '48px',
                fontWeight: 700,
                color: '#fafafa',
                lineHeight: 1.2,
                marginBottom: '20px',
              }}
            >
              {title}
            </span>

            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '22px', color: '#a1a1aa', fontWeight: 600 }}>
                {raidName}
              </span>
              <span style={{ fontSize: '22px', color: '#52525b', marginLeft: '10px', marginRight: '10px' }}>/</span>
              <span style={{ fontSize: '22px', color: '#a1a1aa', fontWeight: 600 }}>
                {raidDate}
              </span>
            </div>
            <span style={{ fontSize: '20px', color: '#71717a', fontWeight: 600 }}>
              {maxReserves} reserve{maxReserves !== 1 ? 's' : ''} per player
            </span>
          </div>

          <div style={{ display: 'flex', marginLeft: '40px' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={iconUrl}
              width={200}
              height={200}
              style={{
                borderRadius: '24px',
                border: '3px solid rgba(255,255,255,0.1)',
              }}
              alt=""
            />
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginTop: '24px',
            paddingTop: '20px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <span style={{ fontSize: '18px', color: '#52525b', fontWeight: 600 }}>
            lootlistplus.com
          </span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: 'Poppins',
          data: semiBoldFont,
          weight: 600,
          style: 'normal' as const,
        },
        {
          name: 'Poppins',
          data: boldFont,
          weight: 700,
          style: 'normal' as const,
        },
      ],
    }
  )
}

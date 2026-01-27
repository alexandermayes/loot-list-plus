import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'LootList+ - WoW Classic Loot Management'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0d0e11 0%, #1a1a2e 50%, #0d0e11 100%)',
          position: 'relative',
        }}
      >
        {/* Background glow effects */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '800px',
            height: '800px',
            background: 'radial-gradient(circle, rgba(255, 128, 0, 0.15) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '20%',
            right: '10%',
            width: '300px',
            height: '300px',
            background: 'radial-gradient(circle, rgba(255, 128, 0, 0.1) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />

        {/* Main content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1,
          }}
        >
          {/* Logo text */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              marginBottom: '24px',
            }}
          >
            {/* Loot icon representation */}
            <div
              style={{
                width: '80px',
                height: '80px',
                background: 'linear-gradient(135deg, #ff8000 0%, #994d00 100%)',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 32px rgba(255, 128, 0, 0.3)',
              }}
            >
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                style={{ color: 'white' }}
              >
                <path
                  d="M12 2L2 7L12 12L22 7L12 2Z"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M2 17L12 22L22 17"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M2 12L12 17L22 12"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span
              style={{
                fontSize: '72px',
                fontWeight: 700,
                color: 'white',
                letterSpacing: '-2px',
              }}
            >
              LootList
              <span style={{ color: '#ff8000' }}>+</span>
            </span>
          </div>

          {/* Tagline */}
          <p
            style={{
              fontSize: '32px',
              color: '#a1a1a1',
              margin: 0,
              marginBottom: '48px',
              textAlign: 'center',
              maxWidth: '800px',
            }}
          >
            The Ultimate Loot Council Tool for WoW Classic Guilds
          </p>

          {/* Feature pills */}
          <div
            style={{
              display: 'flex',
              gap: '16px',
            }}
          >
            {['Attendance Tracking', 'Loot Management', 'Priority Lists'].map((feature) => (
              <div
                key={feature}
                style={{
                  padding: '12px 24px',
                  background: 'rgba(255, 128, 0, 0.15)',
                  border: '1px solid rgba(255, 128, 0, 0.3)',
                  borderRadius: '40px',
                  color: '#ff8000',
                  fontSize: '18px',
                  fontWeight: 500,
                }}
              >
                {feature}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom URL */}
        <div
          style={{
            position: 'absolute',
            bottom: '32px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span style={{ color: '#666', fontSize: '20px' }}>
            www.lootlistplus.com
          </span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}

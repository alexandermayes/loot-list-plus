import Image from 'next/image'
import ProfileContent from './components/ProfileContent'
import { Heading } from '@/components/ui/typography'
import { createClient } from '@/utils/supabase/server'

type ProfileHeader = {
  displayName: string
  avatarUrl: string
  memberSince: string | null
}

function buildAvatarUrl(meta: Record<string, unknown> | undefined): string {
  if (!meta) return 'https://cdn.discordapp.com/embed/avatars/0.png'
  const raw = meta.avatar_url
  if (typeof raw !== 'string' || !raw) {
    return 'https://cdn.discordapp.com/embed/avatars/0.png'
  }
  if (raw.startsWith('http')) {
    return raw.replace('.gif', '.png') + '?size=256'
  }
  const providerId = typeof meta.provider_id === 'string' ? meta.provider_id : ''
  return `https://cdn.discordapp.com/avatars/${providerId}/${raw}.png?size=256`
}

function buildDisplayName(meta: Record<string, unknown> | undefined): string {
  if (!meta) return 'User'
  const custom = meta.custom_claims as { global_name?: string } | undefined
  if (typeof custom?.global_name === 'string' && custom.global_name) return custom.global_name
  if (typeof meta.full_name === 'string' && meta.full_name) return meta.full_name
  return 'User'
}

async function resolveProfileHeader(): Promise<ProfileHeader | null> {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) return null

    return {
      displayName: buildDisplayName(user.user_metadata),
      avatarUrl: buildAvatarUrl(user.user_metadata),
      memberSince: user.created_at ?? null,
    }
  } catch {
    return null
  }
}

export default async function ProfilePage() {
  const header = await resolveProfileHeader()

  // Server-rendered profile header card lands in the initial HTML so the
  // LCP element (avatar + displayName) paints with TTFB instead of waiting
  // for client hydration. Discord-link status stays client-driven (it's an
  // async preferences fetch) and renders as a skeleton until ready.
  const serverHeading = header ? (
    <div className="bg-background-elevated border border-border rounded-xl p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
        <Image
          src={header.avatarUrl}
          alt="Avatar"
          width={80}
          height={80}
          priority
          className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-border shadow-md"
        />
        <div className="flex-1 min-w-0">
          <Heading level={2} className="text-xl sm:text-3xl">{header.displayName}</Heading>
          {header.memberSince && (
            <div className="flex items-center gap-1.5 mt-1 text-[13px] text-muted-foreground">
              <span>Member since {new Date(header.memberSince).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  ) : null

  return <ProfileContent serverHeading={serverHeading} />
}

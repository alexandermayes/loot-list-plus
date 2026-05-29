import { ReactNode } from 'react'
import DashboardContent from './components/DashboardContent'
import { Heading } from '@/components/ui/typography'
import { createClient } from '@/utils/supabase/server'
import { getCachedUserBundle } from '@/lib/cache/user-bundle'
import { getAttendanceSummary, type AttendanceSummary } from '@/lib/cache/dashboard-attendance'

interface ActiveContext {
  characterName: string
  characterColorHex: string | null
  characterId: string
  guildId: string | null
  memberJoinedAt: string | null
}

async function resolveActiveContext(): Promise<ActiveContext | null> {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) return null

    const bundle = await getCachedUserBundle(user.id)
    const activeCharId = bundle.activePreferences?.active_character_id
    const activeGuildId = bundle.activePreferences?.active_guild_id
    if (!activeCharId || !bundle.characters) return null

    type BundleCharacter = {
      id: string
      name: string
      class?: { color_hex: string | null } | null
    }
    const character = (bundle.characters as BundleCharacter[]).find(c => c.id === activeCharId)
    if (!character) return null

    // memberJoinedAt is needed for fair/minimum_gate attendance modes
    type BundleMembership = { character_id: string; guild_id: string; joined_at: string }
    const memberships = (bundle.memberships ?? []) as BundleMembership[]
    const membership = memberships.find(
      m => m.character_id === activeCharId && m.guild_id === activeGuildId,
    )

    return {
      characterName: character.name,
      characterColorHex: character.class?.color_hex ?? null,
      characterId: activeCharId,
      guildId: activeGuildId ?? null,
      memberJoinedAt: membership?.joined_at ?? null,
    }
  } catch {
    return null
  }
}

export default async function Dashboard() {
  const ctx = await resolveActiveContext()

  // Server-prefetch the attendance summary card (LCP element on /overview).
  // The hero number paints with TTFB instead of waiting for client hydration
  // + 3 sequential Supabase queries + computeAttendance.
  let initialAttendance: AttendanceSummary | null = null
  if (ctx?.guildId && ctx.characterId) {
    initialAttendance = await getAttendanceSummary({
      guildId: ctx.guildId,
      characterId: ctx.characterId,
      memberJoinedAt: ctx.memberJoinedAt,
    })
  }

  // Server-rendered heading. Appears immediately in the SSR HTML so the LCP
  // element paints with TTFB instead of waiting for client hydration +
  // GuildContext fetch. Once GuildContext loads, DashboardContent swaps
  // this out for its dynamic contextual greeting.
  const serverHeading: ReactNode = (
    <Heading level={1}>
      {ctx
        ? <>Hey, <span style={{ color: ctx.characterColorHex ?? undefined }}>{ctx.characterName}</span></>
        : 'Welcome back!'}
    </Heading>
  )

  return (
    <DashboardContent
      serverHeading={serverHeading}
      initialAttendance={initialAttendance}
    />
  )
}

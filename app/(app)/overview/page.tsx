import { ReactNode } from 'react'
import DashboardContent from './components/DashboardContent'
import { Heading } from '@/components/ui/typography'
import { createClient } from '@/utils/supabase/server'
import { getCachedUserBundle } from '@/lib/cache/user-bundle'

type ActiveCharacter = {
  name: string
  colorHex: string | null
}

async function resolveActiveCharacter(): Promise<ActiveCharacter | null> {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) return null

    const bundle = await getCachedUserBundle(user.id)
    const activeId = bundle.activePreferences?.active_character_id
    if (!activeId || !bundle.characters) return null

    type BundleCharacter = {
      id: string
      name: string
      class?: { color_hex: string | null } | null
    }
    const character = (bundle.characters as BundleCharacter[]).find(c => c.id === activeId)
    if (!character) return null

    return {
      name: character.name,
      colorHex: character.class?.color_hex ?? null,
    }
  } catch {
    return null
  }
}

export default async function Dashboard() {
  const activeCharacter = await resolveActiveCharacter()

  // Server-rendered heading. Appears immediately in the SSR HTML so the LCP
  // element paints with TTFB instead of waiting for client hydration +
  // GuildContext fetch. Once GuildContext loads, DashboardContent swaps
  // this out for its dynamic contextual greeting.
  const serverHeading: ReactNode = (
    <Heading level={1}>
      {activeCharacter
        ? <>Hey, <span style={{ color: activeCharacter.colorHex ?? undefined }}>{activeCharacter.name}</span></>
        : 'Welcome back!'}
    </Heading>
  )

  return <DashboardContent serverHeading={serverHeading} />
}

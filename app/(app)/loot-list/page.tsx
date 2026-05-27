import LootListContent from './components/LootListContent'
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

export default async function LootList() {
  const activeCharacter = await resolveActiveCharacter()

  const serverHeading = (
    <Heading level={1}>
      Loot Lists{activeCharacter && (
        <> for <span style={{ color: activeCharacter.colorHex ?? undefined }}>{activeCharacter.name}</span></>
      )}
    </Heading>
  )

  return <LootListContent serverHeading={serverHeading} />
}

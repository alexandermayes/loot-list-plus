import AppLayout from './AppLayout.client'
import { PrefetchProvider, type PrefetchedGuildData } from './PrefetchProvider'
import { createClient } from '@/utils/supabase/server'

export default async function Layout({ children }: { children: React.ReactNode }) {
  let prefetchedData: PrefetchedGuildData | null = null

  try {
    const supabase = await createClient()
    // Use getSession() instead of getUser() to avoid a network round-trip to
    // Supabase Auth. The middleware already validated the token, so local JWT
    // parsing is safe here. Saves ~200-400ms per page navigation.
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user

    if (user) {
      // Run characters and active preferences queries in parallel
      const [charactersResult, activeResult] = await Promise.all([
        supabase
          .from('characters')
          .select(`
            id,
            user_id,
            name,
            realm,
            class_id,
            spec_id,
            level,
            is_main,
            battle_net_id,
            region,
            created_at,
            updated_at,
            game_version,
            guardian_conversion_dismissed,
            class:wow_classes (
              id,
              name,
              color_hex
            ),
            spec:class_specs (
              id,
              name
            )
          `)
          .eq('user_id', user.id)
          .order('is_main', { ascending: false })
          .order('created_at', { ascending: true }),
        supabase
          .from('user_active_characters')
          .select('active_character_id, active_guild_id')
          .eq('user_id', user.id)
          .maybeSingle(),
      ])

      const characters = charactersResult.data
      const activePrefs = activeResult.data

      // Fetch memberships if we have characters. We omit nested character fields
      // (battle_net_id, region, level, timestamps) that aren't read at first
      // paint to shrink the payload — GuildContext re-joins to the full
      // characters list above when it needs them.
      let memberships = null
      if (characters && characters.length > 0) {
        const characterIds = characters.map((c: { id: string }) => c.id)
        const { data: membershipsData } = await supabase
          .from('character_guild_memberships')
          .select(`
            id,
            character_id,
            guild_id,
            role,
            is_active,
            joined_at,
            joined_via,
            character:characters (
              id,
              user_id,
              name,
              realm,
              class_id,
              spec_id,
              is_main,
              class:wow_classes (
                id,
                name,
                color_hex
              ),
              spec:class_specs (
                id,
                name
              )
            ),
            guild:guilds (
              id,
              name,
              realm,
              faction,
              icon_url,
              created_by,
              require_discord_verification,
              active_expansion_id,
              subscription_tier,
              guild_roles (
                name,
                position
              )
            )
          `)
          .in('character_id', characterIds)
          .eq('is_active', true)
        memberships = membershipsData
      }

      prefetchedData = {
        user: { id: user.id, email: user.email },
        characters,
        activePreferences: activePrefs ? {
          active_character_id: activePrefs.active_character_id,
          active_guild_id: activePrefs.active_guild_id,
        } : null,
        memberships,
      }
    }
  } catch {
    // Prefetch failed — GuildContext will fall back to client-side fetching
  }

  return (
    <PrefetchProvider data={prefetchedData}>
      <AppLayout>{children}</AppLayout>
    </PrefetchProvider>
  )
}

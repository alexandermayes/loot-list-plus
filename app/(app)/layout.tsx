import AppLayout from './AppLayout.client'
import { PrefetchProvider, type PrefetchedGuildData } from './PrefetchProvider'
import { createClient } from '@/utils/supabase/server'
import { getCachedUserBundle } from '@/lib/cache/user-bundle'

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
      // Cached, tag-invalidated bundle. Most navigations hit cache; writes
      // revalidate the user tag via revalidateUserBundle().
      const bundle = await getCachedUserBundle(user.id)
      prefetchedData = {
        user: { id: user.id, email: user.email },
        characters: bundle.characters as PrefetchedGuildData['characters'],
        activePreferences: bundle.activePreferences,
        memberships: bundle.memberships as PrefetchedGuildData['memberships'],
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

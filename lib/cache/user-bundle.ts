import { unstable_cache, revalidateTag } from 'next/cache'
import { createServiceRoleClient } from '@/utils/supabase/service-role'

/**
 * Cached prefetch bundle for the (app)/ layout.
 *
 * The (app) layout fires three Supabase queries on every page navigation
 * (characters, active prefs, memberships). Per-user data changes rarely
 * compared to navigation frequency, so we cache the bundle by user_id and
 * invalidate via tag when any write touches the underlying tables.
 *
 * The cached function uses the service-role client because the caller has
 * already verified the user_id via session JWT — RLS is not needed once
 * the user_id is trusted.
 */
function userTag(userId: string): string {
  return `user-bundle:${userId}`
}

export function revalidateUserBundle(userId: string): void {
  if (!userId) return
  try {
    // Next.js 16 requires a profile arg. 'default' purges immediately for
    // the named tag, matching the legacy single-arg behavior.
    revalidateTag(userTag(userId), 'default')
  } catch {
    // revalidateTag throws if called outside a request context (e.g. in
    // some test setups). Cache will fall back to its 60s TTL.
  }
}

interface FetchedBundle {
  characters: unknown[] | null
  activePreferences: { active_character_id: string | null; active_guild_id: string | null } | null
  memberships: unknown[] | null
}

async function fetchUserBundle(userId: string): Promise<FetchedBundle> {
  const supabase = createServiceRoleClient()

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
      .eq('user_id', userId)
      .order('is_main', { ascending: false })
      .order('created_at', { ascending: true }),
    supabase
      .from('user_active_characters')
      .select('active_character_id, active_guild_id')
      .eq('user_id', userId)
      .maybeSingle(),
  ])

  const characters = charactersResult.data
  const activePrefs = activeResult.data

  let memberships: unknown[] | null = null
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

  return {
    characters,
    activePreferences: activePrefs
      ? {
          active_character_id: activePrefs.active_character_id,
          active_guild_id: activePrefs.active_guild_id,
        }
      : null,
    memberships,
  }
}

// Per-user cached fetcher. unstable_cache options.tags is static at definition
// time, so we wrap in a closure to bind the user-specific tag dynamically.
export function getCachedUserBundle(userId: string): Promise<FetchedBundle> {
  return unstable_cache(
    () => fetchUserBundle(userId),
    ['user-bundle', userId],
    {
      tags: [userTag(userId)],
      revalidate: 60,
    },
  )()
}

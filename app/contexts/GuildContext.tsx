'use client'

import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo, ReactNode } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import { useNotification } from '@/app/contexts/NotificationContext'
import posthog from 'posthog-js'
import type { User, AuthChangeEvent, Session } from '@supabase/supabase-js'
import { usePrefetchedGuildData } from '@/app/(app)/PrefetchProvider'

// Re-export expansion types for backward compatibility
export type { GuildExpansion } from './ExpansionContext'

// Types
export interface Guild {
  id: string
  name: string
  realm: string | null
  faction: string
  discord_server_id: string | null
  icon_url: string | null
  created_by: string | null
  is_active: boolean
  require_discord_verification: boolean
  created_at: string
  active_expansion_id: string | null
  subscription_tier?: string
}

export interface GuildMember {
  id: string
  user_id: string
  guild_id: string
  character_name: string
  class_id: string
  role: string
  is_active: boolean
  joined_at: string
  joined_via: string
}

export interface GuildMembership {
  guild: Guild
  member: GuildMember
  class: {
    name: string
    color_hex: string
  }
}

// New Character System Types
export interface Character {
  id: string
  user_id: string
  name: string
  realm: string | null
  class_id: string | null
  spec_id: string | null
  level: number | null
  is_main: boolean
  battle_net_id: number | null
  region: string | null
  game_version: string | null
  created_at: string
  updated_at: string
  class?: {
    id: string
    name: string
    color_hex: string
  }
  spec?: {
    id: string
    name: string
  }
  guardian_conversion_dismissed?: boolean
}

export interface CharacterGuildMembership {
  id: string
  character_id: string
  guild_id: string
  role: string
  is_active: boolean
  joined_at: string
  joined_via: string
  character: Character
  guild: Guild
}

// Separate interface for data (changes frequently, triggers re-renders)
export interface GuildDataContextType {
  // Existing State
  user: User | null
  activeGuild: Guild | null
  activeMember: GuildMember | null
  userGuilds: GuildMembership[]
  loading: boolean

  // New Character State
  activeCharacter: Character | null
  userCharacters: Character[]
  characterMemberships: CharacterGuildMembership[]

  // Derived state
  isOfficer: boolean
  hasPermission: (permission: string) => boolean
  hasMultipleGuilds: boolean
  hasMultipleCharacters: boolean
}

// Separate interface for actions (stable functions, rarely trigger re-renders)
export interface GuildActionsContextType {
  switchGuild: (guildId: string, characterId?: string) => Promise<void>
  refreshGuilds: () => Promise<void>
  switchCharacter: (characterId: string) => Promise<void>
  refreshCharacters: () => Promise<void>
}

// Expansion imports for the combined facade (circular at module level but safe — both export only functions)
import { useExpansionData, useExpansionActions } from './ExpansionContext'
import type { ExpansionDataContextType, ExpansionActionsContextType } from './ExpansionContext'

// Combined type for backward compatibility (includes expansion fields)
export interface GuildContextType extends GuildDataContextType, GuildActionsContextType, ExpansionDataContextType, ExpansionActionsContextType {}

// Create separate contexts for data and actions
// This prevents components that only use actions from re-rendering when data changes
export const GuildDataContext = createContext<GuildDataContextType | undefined>(undefined)
const GuildActionsContext = createContext<GuildActionsContextType | undefined>(undefined)

// Provider component
export function GuildContextProvider({ children }: { children: ReactNode }) {
  // Server-side prefetched data (available when rendering under (app)/ layout)
  let prefetchedData: ReturnType<typeof usePrefetchedGuildData> = null
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    prefetchedData = usePrefetchedGuildData()
  } catch {
    // Not inside PrefetchProvider (e.g., guild-select, landing pages) — that's fine
  }
  const prefetchConsumed = useRef(false)
  // Existing State
  const [activeGuild, setActiveGuild] = useState<Guild | null>(null)
  const [activeMember, setActiveMember] = useState<GuildMember | null>(null)
  const [userGuilds, setUserGuilds] = useState<GuildMembership[]>([])

  // New Character State
  const [activeCharacter, setActiveCharacter] = useState<Character | null>(null)
  const [userCharacters, setUserCharacters] = useState<Character[]>([])
  const [characterMemberships, setCharacterMemberships] = useState<CharacterGuildMembership[]>([])

  // Cached role positions and permissions — avoids re-querying guild_roles on every check
  const [rolePositionCache, setRolePositionCache] = useState<Map<string, Map<string, number>>>(new Map())
  const [rolePermissionsCache, setRolePermissionsCache] = useState<Map<string, Map<string, string[]>>>(new Map())

  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)

  const supabase = createClient()
  const router = useRouter()
  const pathname = usePathname()
  const { showNotification } = useNotification()

  // Track if initial data load has completed to distinguish fresh login from token refresh
  // This prevents UI flashing when users tab away and return (Supabase fires SIGNED_IN on visibility change)
  const hasInitiallyLoaded = useRef(false)

  // Load user data: auth check, characters, guild memberships, active guild/character.
  // Single function replaces the old loadGuilds + loadCharacters two-phase pattern.
  // Auth check (getUser) runs first; if no user, bail early without redirect
  // (the SIGNED_OUT event handler redirects if truly signed out).
  const loadUserData = async () => {
    try {
      setLoading(true)

      // Use server-prefetched data if available (eliminates 400-800ms of network calls)
      const usePrefetch = prefetchedData?.user && !prefetchConsumed.current
      if (usePrefetch) {
        prefetchConsumed.current = true
      }

      // Authenticate first — skip network call if we have prefetched data
      let currentUser: User | null = null
      if (usePrefetch) {
        // Trust the server-side auth check — construct a minimal user object
        // The Supabase client will still have the session from cookies for subsequent calls
        currentUser = { id: prefetchedData!.user!.id, email: prefetchedData!.user!.email } as User
      } else {
        const { data: { user: fetchedUser } } = await supabase.auth.getUser()
        currentUser = fetchedUser
      }

      if (!currentUser) {
        setActiveGuild(null)
        setActiveMember(null)
        setUserGuilds([])
        setActiveCharacter(null)
        setUserCharacters([])
        setCharacterMemberships([])
        // Don't hard redirect here - auth session may still be initializing.
        // The SIGNED_OUT event handler will redirect if truly signed out.
        return
      }
      setUser(currentUser)

      // Use prefetched data or fetch from client
      let characters: any[] | null
      let charactersError: any = null
      let activeCharData: { active_character_id: string | null; active_guild_id: string | null } | null

      if (usePrefetch) {
        characters = prefetchedData!.characters
        activeCharData = prefetchedData!.activePreferences
      } else {
        // Fetch characters and active character preference in parallel
        // (both only need currentUser.id, no interdependency)
        const [charactersResult, activeCharResult] = await Promise.all([
          supabase
            .from('characters')
            .select(`
              *,
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
            .eq('user_id', currentUser.id)
            .order('is_main', { ascending: false })
            .order('created_at', { ascending: true }),
          supabase
            .from('user_active_characters')
            .select('active_character_id, active_guild_id')
            .eq('user_id', currentUser.id)
            .maybeSingle(),
        ])

        characters = charactersResult.data
        charactersError = charactersResult.error
        activeCharData = activeCharResult.data
      }

      if (charactersError) {
        console.error('Error loading characters:', charactersError)
        console.error('Error details:', JSON.stringify(charactersError, null, 2))
        console.error('Error code:', charactersError?.code)
        console.error('Error message:', charactersError?.message)
        console.error('Error hint:', charactersError?.hint)
        setUserCharacters([])
        setCharacterMemberships([])
        return
      }

      // Fetch specs and memberships in parallel for better performance
      let enrichedCharacters: typeof characters = []
      let transformedMemberships: any[] = []
      let derivedGuilds: GuildMembership[] = []

      if (characters && characters.length > 0) {
        type CharacterData = { id: string; spec_id: string | null; name: string; [key: string]: unknown }
        const characterIds = characters.map((c: CharacterData) => c.id)

        // Characters query already joins specs, so no separate specs query needed
        enrichedCharacters = characters
        setUserCharacters(enrichedCharacters)

        // Use prefetched memberships or fetch from client
        let memberships: any[] | null
        let membershipsError: any = null

        if (usePrefetch && prefetchedData!.memberships) {
          memberships = prefetchedData!.memberships
        } else {
          const membershipsResult = await supabase
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
                level,
                is_main,
                battle_net_id,
                region,
                created_at,
                updated_at,
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
                discord_server_id,
                icon_url,
                created_by,
                is_active,
                require_discord_verification,
                created_at,
                active_expansion_id,
                subscription_tier,
                guild_roles (
                  name,
                  position,
                  permissions
                )
              )
            `)
            .in('character_id', characterIds)
            .eq('is_active', true)
          memberships = membershipsResult.data
          membershipsError = membershipsResult.error
        }

        if (membershipsError) {
          console.error('Error loading character memberships:', membershipsError)
          console.error('Memberships error details:', JSON.stringify(membershipsError, null, 2))
          console.error('Memberships error code:', membershipsError?.code)
          console.error('Memberships error message:', membershipsError?.message)
          setCharacterMemberships([])
        } else {
          // Transform the data to handle arrays from Supabase joins
          // Also extract guild_roles from the embedded join and build the role position + permissions cache
          const guildRolePositions = new Map<string, Map<string, number>>()
          const guildRolePerms = new Map<string, Map<string, string[]>>()

          transformedMemberships = (memberships || []).map((m: { character: unknown; guild: unknown; [key: string]: unknown }) => {
            const char = Array.isArray(m.character) ? m.character[0] : m.character
            const rawGuild: any = Array.isArray(m.guild) ? m.guild[0] : m.guild

            // Extract guild_roles from the guild join and cache them
            if (rawGuild?.id && rawGuild.guild_roles) {
              if (!guildRolePositions.has(rawGuild.id)) {
                const posMap = new Map<string, number>()
                const permMap = new Map<string, string[]>()
                for (const role of rawGuild.guild_roles) {
                  posMap.set(role.name, role.position)
                  permMap.set(role.name, role.permissions || [])
                }
                guildRolePositions.set(rawGuild.id, posMap)
                guildRolePerms.set(rawGuild.id, permMap)
              }
            }

            // Strip guild_roles from the guild object before storing
            const { guild_roles: _, ...guild } = rawGuild || {}

            return {
              ...m,
              character: char ? {
                ...char,
                class: Array.isArray(char.class) ? char.class[0] : char.class,
                spec: Array.isArray(char.spec) ? char.spec[0] : char.spec
              } : char,
              guild
            }
          })
          setCharacterMemberships(transformedMemberships)

          // Default positions for guilds without custom roles
          const defaultPositions = new Map([['Guild Master', 100], ['Officer', 50], ['Member', 0]])

          // Group by guild and take the highest role for each guild
          const guildMap = new Map<string, { guild: any, role: string, membership: any }>()
          for (const m of transformedMemberships) {
            if (!m.guild) continue
            const existing = guildMap.get(m.guild.id)

            // Get role positions for this guild (or use defaults)
            const rolePositions = guildRolePositions.get(m.guild.id) || defaultPositions
            const getPosition = (roleName: string) => rolePositions.get(roleName) ?? defaultPositions.get(roleName) ?? 0

            if (!existing) {
              guildMap.set(m.guild.id, { guild: m.guild, role: m.role, membership: m })
            } else {
              // Keep the higher role based on position
              if (getPosition(m.role) > getPosition(existing.role)) {
                existing.role = m.role
                existing.membership = m
              }
            }
          }

          // Build userGuilds array from character memberships
          derivedGuilds = Array.from(guildMap.values()).map(({ guild, role, membership }) => ({
            guild: guild as Guild,
            member: {
              id: membership.id,
              user_id: currentUser.id,
              guild_id: guild.id,
              character_name: membership.character?.name || '',
              class_id: membership.character?.class_id || '',
              role: role,
              is_active: true,
              joined_at: membership.joined_at,
              joined_via: membership.joined_via
            } as GuildMember,
            class: membership.character?.class || { name: 'Unknown', color_hex: '#808080' }
          }))

          setUserGuilds(derivedGuilds)
          setRolePositionCache(guildRolePositions)
          setRolePermissionsCache(guildRolePerms)
        }
      } else {
        setUserCharacters([])
        setCharacterMemberships([])
        setUserGuilds([])
      }

      // Use the active character preference we fetched in parallel above
      if (activeCharData?.active_character_id) {
        // Find the character from our enriched characters (which have specs attached)
        const activeChar = enrichedCharacters.find((c: { id: string }) => c.id === activeCharData.active_character_id)
        if (activeChar) {
          setActiveCharacter(activeChar)
        }
      } else if (enrichedCharacters.length > 0) {
        // If no active character saved, use first character (main if available)
        setActiveCharacter(enrichedCharacters[0])
      }

      // Helper to set both activeGuild and activeMember from derived data
      const setActiveGuildAndMember = (guild: Guild) => {
        setActiveGuild(guild)
        const derived = derivedGuilds.find(g => g.guild.id === guild.id)
        setActiveMember(derived?.member || null)
      }

      // Set activeGuild from character memberships
      if (activeCharData?.active_guild_id) {
        // Find the guild from memberships
        const membershipWithGuild = transformedMemberships.find(m => m.guild_id === activeCharData.active_guild_id)
        if (membershipWithGuild?.guild) {
          setActiveGuildAndMember(membershipWithGuild.guild as Guild)
        } else {
          // No active membership found for this guild
          // This could mean: 1) User left the guild, or 2) User joined guild but hasn't created a character yet
          // Check if user has NO characters - if so, they're in the "pending character creation" state
          if (enrichedCharacters.length === 0) {
            // User has no characters - fetch the guild directly and show it
            // This is the "joined guild, needs to create character" state
            const { data: pendingGuild } = await supabase
              .from('guilds')
              .select('*')
              .eq('id', activeCharData.active_guild_id)
              .single()

            if (pendingGuild) {
              setActiveGuild(pendingGuild as Guild)
            } else {
              setActiveGuild(null)
              await supabase
                .from('user_active_characters')
                .update({
                  active_guild_id: null,
                  updated_at: new Date().toISOString()
                })
                .eq('user_id', currentUser.id)
            }
          } else {
            // User has characters but no membership in this guild - stale reference
            // Clear the stale active_guild_id
            await supabase
              .from('user_active_characters')
              .update({
                active_guild_id: null,
                updated_at: new Date().toISOString()
              })
              .eq('user_id', currentUser.id)

            // If user has other guild memberships, set the first one as active
            if (transformedMemberships.length > 0 && transformedMemberships[0]?.guild) {
              setActiveGuildAndMember(transformedMemberships[0].guild as Guild)

              await supabase
                .from('user_active_characters')
                .update({
                  active_guild_id: transformedMemberships[0].guild_id,
                  updated_at: new Date().toISOString()
                })
                .eq('user_id', currentUser.id)
            } else {
              // User has no guild memberships - set activeGuild to null
              setActiveGuild(null)
            }
          }
        }
      } else if (transformedMemberships.length > 0 && transformedMemberships[0]?.guild) {
        // If no saved active guild, use first guild from character memberships
        setActiveGuildAndMember(transformedMemberships[0].guild as Guild)

        // Also save this as the active guild
        await supabase
          .from('user_active_characters')
          .upsert({
            user_id: currentUser.id,
            active_character_id: enrichedCharacters[0]?.id || null,
            active_guild_id: transformedMemberships[0].guild_id,
            updated_at: new Date().toISOString()
          })
      } else {
        // No saved active guild and no memberships - explicitly set activeGuild to null
        setActiveGuild(null)
      }
    } catch (error) {
      console.error('Error in loadUserData:', error)
      showNotification('error', 'Couldn\'t load your data. Check your connection and try again.')
    } finally {
      setLoading(false)
      hasInitiallyLoaded.current = true
    }
  }

  // Switch to a different guild (with optional character)
  const switchGuild = useCallback(async (guildId: string, characterId?: string) => {
    if (!user) return

    try {
      // Verify user is a member of target guild
      const targetGuild = userGuilds.find(g => g.guild.id === guildId)
      if (!targetGuild) {
        console.error('User is not a member of guild:', guildId)
        return
      }

      // If characterId provided, verify character is in that guild
      if (characterId) {
        const charMembership = characterMemberships.find(
          m => m.character_id === characterId && m.guild_id === guildId
        )
        if (!charMembership) {
          console.error('Character is not in this guild:', characterId, guildId)
          return
        }

        // Update active character via API
        const charResponse = await fetch('/api/user/active-character', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ character_id: characterId, guild_id: guildId })
        })

        if (!charResponse.ok) {
          const data = await charResponse.json()
          console.error('Error switching character:', data.error)
          return
        }

        // Update local character state
        const activeChar = userCharacters.find(c => c.id === characterId)
        if (activeChar) {
          setActiveCharacter(activeChar)
        }
      }

      // Update active guild via API
      const response = await fetch('/api/user/active-guild', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ guild_id: guildId })
      })

      if (!response.ok) {
        const data = await response.json()
        console.error('Error switching guild:', data.error)
        return
      }

      // Update local state
      setActiveGuild(targetGuild.guild)
      setActiveMember(targetGuild.member)

      // Reload page to fetch guild-specific data
      router.refresh()
    } catch (error) {
      console.error('Error in switchGuild:', error)
      showNotification('error', 'Couldn\'t switch guilds. Check your connection and try again.')
    }
  }, [user, userGuilds, userCharacters, characterMemberships, supabase, router, showNotification])

  // Switch to a different character
  const switchCharacter = useCallback(async (characterId: string) => {
    if (!user) return

    try {
      // Verify character belongs to user
      const targetChar = userCharacters.find(c => c.id === characterId)
      if (!targetChar) {
        console.error('Character not found:', characterId)
        return
      }

      // Update active character via API
      const response = await fetch('/api/user/active-character', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          character_id: characterId,
          guild_id: activeGuild?.id || null
        })
      })

      if (!response.ok) {
        const data = await response.json()
        console.error('Error switching character:', data.error)
        return
      }

      // Update local state — the layout key includes activeCharacter.id,
      // so this triggers a full remount of page content (same as guild switch).
      setActiveCharacter(targetChar)
    } catch (error) {
      console.error('Error in switchCharacter:', error)
      showNotification('error', 'Couldn\'t switch characters. Check your connection and try again.')
    }
  }, [user, userCharacters, activeGuild, characterMemberships, router, showNotification])

  // Refresh all user data (guilds + characters). Both callbacks call the same
  // function because guild state is now derived entirely from character memberships.
  const refreshGuilds = useCallback(async () => {
    await loadUserData()
  }, [])

  const refreshCharacters = useCallback(async () => {
    await loadUserData()
  }, [])

  // Load all user data on mount (single call replaces old loadGuilds + loadCharacters chain)
  useEffect(() => {
    loadUserData()
  }, [])

  // Listen for auth changes
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, _session: Session | null) => {
      if (event === 'SIGNED_IN') {
        // Only reload guilds on fresh sign-in, not on token refresh/session restore
        // This prevents UI flashing when users tab away and return
        // (Supabase fires SIGNED_IN on visibility change when restoring session)
        if (!hasInitiallyLoaded.current) {
          loadUserData()
        }
      } else if (event === 'SIGNED_OUT') {
        // Supabase can fire spurious SIGNED_OUT events during session initialization
        // on a new device (e.g., before the browser client picks up cookies from the
        // server-side callback). Verify the session is truly gone before redirecting.
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        if (currentUser) {
          // Session is still valid — this was a false alarm. Reload data if needed.
          if (!hasInitiallyLoaded.current) {
            loadUserData()
          }
          return
        }
        hasInitiallyLoaded.current = false
        setActiveGuild(null)
        setActiveMember(null)
        setUserGuilds([])
        setActiveCharacter(null)
        setUserCharacters([])
        setCharacterMemberships([])
        setUser(null)
        window.location.href = '/'
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Recover from stale session when user returns to a backgrounded tab.
  // Supabase auto-refresh only works while the tab is active. If the token
  // expires while backgrounded, the user comes back to a broken app.
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && hasInitiallyLoaded.current) {
        // Validate session is still alive. Retry once after a short delay to
        // allow the Supabase client to finish any in-flight token refresh.
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        if (!currentUser && user) {
          // First check failed — wait briefly and retry before hard-redirecting.
          // The client may be mid-refresh after the tab was backgrounded.
          await new Promise(resolve => setTimeout(resolve, 1000))
          const { data: { user: retryUser } } = await supabase.auth.getUser()
          if (!retryUser) {
            // Session is genuinely gone — force re-login
            window.location.href = '/'
          }
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [user])

  // Derived state — officer check using cached role positions (zero DB queries)
  const defaultPositions = useMemo(() => new Map([['Guild Master', 100], ['Officer', 50], ['Member', 0]]), [])

  const isOfficer = useMemo(() => {
    if (!activeGuild) return false

    // Guild creator is always an officer (even without a character)
    if (user && activeGuild.created_by === user.id) return true

    // Helper to check role position from cache
    const getRolePosition = (roleName: string): number => {
      const guildPositions = rolePositionCache.get(activeGuild.id)
      if (guildPositions) return guildPositions.get(roleName) ?? defaultPositions.get(roleName) ?? 0
      return defaultPositions.get(roleName) ?? 0
    }

    // Check via activeMember (covers the no-character edge case)
    if (activeMember && getRolePosition(activeMember.role) >= 50) return true

    // Check via active character's membership
    if (activeCharacter) {
      const membership = characterMemberships.find(
        m => m.character_id === activeCharacter.id && m.guild_id === activeGuild.id
      )
      if (membership && getRolePosition(membership.role) >= 50) return true
    }

    return false
  }, [activeCharacter, activeGuild, characterMemberships, activeMember, user, rolePositionCache, defaultPositions])

  // Granular permission check — officers/GM get all permissions implicitly,
  // custom roles below Officer get only their granted permissions
  const hasPermission = useMemo(() => {
    return (permission: string): boolean => {
      // Officers already have all permissions
      if (isOfficer) return true
      if (!activeGuild) return false

      // Get user's role name
      const roleName = activeMember?.role
        || characterMemberships.find(
          m => activeCharacter && m.character_id === activeCharacter.id && m.guild_id === activeGuild.id
        )?.role

      if (!roleName) return false

      // Check the permissions cache for this role
      const guildPerms = rolePermissionsCache.get(activeGuild.id)
      let rolePerms = guildPerms?.get(roleName)

      // Fallback: if the role name doesn't match any guild_roles entry
      // (e.g., role was renamed after this member joined), use the
      // lowest-position role's permissions as a fallback
      if (!rolePerms && guildPerms && guildPerms.size > 0) {
        const guildPositions = rolePositionCache.get(activeGuild.id)
        if (guildPositions) {
          let lowestRole: string | null = null
          let lowestPos = Infinity
          for (const [name, pos] of guildPositions) {
            if (pos < lowestPos) { lowestPos = pos; lowestRole = name }
          }
          if (lowestRole) rolePerms = guildPerms.get(lowestRole)
        }
      }

      return (rolePerms || []).includes(permission)
    }
  }, [isOfficer, activeGuild, activeMember, activeCharacter, characterMemberships, rolePermissionsCache])

  const hasMultipleGuilds = userGuilds.length > 1
  const hasMultipleCharacters = userCharacters.length > 1

  // PostHog: group analytics, super properties, enriched identity, and session recording
  useEffect(() => {
    if (!activeGuild?.id) return
    try {
      // Group analytics — analyze metrics per-guild in PostHog
      posthog.group('guild', activeGuild.id, {
        name: activeGuild.name,
        realm: activeGuild.realm,
        faction: activeGuild.faction,
        subscription_tier: activeGuild.subscription_tier || 'free',
        expansion_id: activeGuild.active_expansion_id,
        created_at: activeGuild.created_at,
      })

      // Super properties — automatically attached to every event
      const role = isOfficer ? 'officer' : 'member'
      posthog.register({
        guild_id: activeGuild.id,
        guild_name: activeGuild.name,
        guild_role: role,
        expansion_id: activeGuild.active_expansion_id,
        guild_count: userGuilds.length,
        character_count: userCharacters.length,
      })

      // Enriched user identity — enables cohorts and segments
      if (user) {
        posthog.identify(user.id, {
          guild_count: userGuilds.length,
          character_count: userCharacters.length,
          primary_role: role,
          current_guild: activeGuild.name,
          current_expansion_id: activeGuild.active_expansion_id,
        })
      }
    } catch {
      // PostHog not initialized
    }
  }, [activeGuild?.id, activeGuild?.name, activeGuild?.realm, activeGuild?.faction,
      activeGuild?.active_expansion_id, activeGuild?.subscription_tier, activeGuild?.created_at,
      isOfficer, userGuilds.length, userCharacters.length, user])

  // Session recording targeting — only record high-value flows to save quota
  useEffect(() => {
    try {
      const highValuePaths = ['/loot-list', '/loot-submissions', '/master-sheet', '/overview']
      const isOnboarding = !activeGuild?.id && !loading
      const isHighValueFlow = highValuePaths.some(p => pathname?.startsWith(p))

      if (isOnboarding || isHighValueFlow) {
        posthog.startSessionRecording()
      }
    } catch {
      // PostHog not initialized
    }
  }, [pathname, activeGuild?.id, loading])

  // Memoize data value to prevent unnecessary re-renders
  // This object changes when data state changes
  const dataValue = useMemo<GuildDataContextType>(() => ({
    user,
    activeGuild,
    activeMember,
    userGuilds,
    loading,
    activeCharacter,
    userCharacters,
    characterMemberships,
    isOfficer,
    hasPermission,
    hasMultipleGuilds,
    hasMultipleCharacters
  }), [
    user,
    activeGuild,
    activeMember,
    userGuilds,
    loading,
    activeCharacter,
    userCharacters,
    characterMemberships,
    isOfficer,
    hasPermission,
    hasMultipleGuilds,
    hasMultipleCharacters
  ])

  // Memoize actions value - these are stable functions that rarely change
  // Components using only actions won't re-render when data changes
  const actionsValue = useMemo<GuildActionsContextType>(() => ({
    switchGuild,
    refreshGuilds,
    switchCharacter,
    refreshCharacters,
  }), [
    switchGuild,
    refreshGuilds,
    switchCharacter,
    refreshCharacters,
  ])

  return (
    <GuildDataContext.Provider value={dataValue}>
      <GuildActionsContext.Provider value={actionsValue}>
        {children}
      </GuildActionsContext.Provider>
    </GuildDataContext.Provider>
  )
}

// Hook for components that only need data (most common use case)
export function useGuildData() {
  const context = useContext(GuildDataContext)
  if (context === undefined) {
    throw new Error('useGuildData must be used within a GuildContextProvider')
  }
  return context
}

// Hook for components that only need actions (prevents re-renders from data changes)
export function useGuildActions() {
  const context = useContext(GuildActionsContext)
  if (context === undefined) {
    throw new Error('useGuildActions must be used within a GuildContextProvider')
  }
  return context
}

// Combined hook for backward compatibility
// Components using this will re-render on any context change
// Includes expansion data/actions so consumers don't need to change imports
export function useGuildContext(): GuildContextType {
  const data = useGuildData()
  const actions = useGuildActions()
  const expansionData = useExpansionData()
  const expansionActions = useExpansionActions()
  return { ...data, ...actions, ...expansionData, ...expansionActions }
}

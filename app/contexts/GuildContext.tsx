'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

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

export interface GuildExpansion {
  expansion_id: string
  expansion_name: string
  raid_start_date: string | null
  is_current: boolean
  created_at: string
  // Raid schedule settings
  raid_days_per_week: number
  first_raid_day: number | null
  second_raid_day: number | null
  third_raid_day: number | null
  fourth_raid_day: number | null
  fifth_raid_day: number | null
  timezone: string
}

export interface GuildContextType {
  // Existing State
  activeGuild: Guild | null
  activeMember: GuildMember | null
  userGuilds: GuildMembership[]
  loading: boolean

  // New Character State
  activeCharacter: Character | null
  userCharacters: Character[]
  characterMemberships: CharacterGuildMembership[]

  // Expansion State
  currentExpansion: GuildExpansion | null
  guildExpansions: GuildExpansion[]
  viewingExpansionId: string | null // For when users view past expansions

  // Methods
  switchGuild: (guildId: string, characterId?: string) => Promise<void>
  refreshGuilds: () => Promise<void>
  switchCharacter: (characterId: string) => Promise<void>
  refreshCharacters: () => Promise<void>
  setViewingExpansion: (expansionId: string | null) => void
  refreshExpansions: () => Promise<void>

  // Derived state
  isOfficer: boolean
  hasMultipleGuilds: boolean
  hasMultipleCharacters: boolean
}

// Create context
const GuildContext = createContext<GuildContextType | undefined>(undefined)

// Provider component
export function GuildContextProvider({ children }: { children: ReactNode }) {
  // Existing State
  const [activeGuild, setActiveGuild] = useState<Guild | null>(null)
  const [activeMember, setActiveMember] = useState<GuildMember | null>(null)
  const [userGuilds, setUserGuilds] = useState<GuildMembership[]>([])

  // New Character State
  const [activeCharacter, setActiveCharacter] = useState<Character | null>(null)
  const [userCharacters, setUserCharacters] = useState<Character[]>([])
  const [characterMemberships, setCharacterMemberships] = useState<CharacterGuildMembership[]>([])

  // Expansion State
  const [currentExpansion, setCurrentExpansion] = useState<GuildExpansion | null>(null)
  const [guildExpansions, setGuildExpansions] = useState<GuildExpansion[]>([])
  const [viewingExpansionId, setViewingExpansionId] = useState<string | null>(null)

  const [guildsLoading, setGuildsLoading] = useState(true)
  const [charactersLoading, setCharactersLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)

  // Combined loading state - only false when both guilds AND characters are loaded
  const loading = guildsLoading || charactersLoading

  const supabase = createClient()
  const router = useRouter()

  // Load user's guilds and active guild
  const loadGuilds = async () => {
    try {
      setGuildsLoading(true)

      // Get authenticated user
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) {
        setActiveGuild(null)
        setActiveMember(null)
        setUserGuilds([])
        setGuildsLoading(false)
        setCharactersLoading(false)
        return
      }
      setUser(currentUser)

      // Fetch memberships and active guild in parallel
      const [membershipsResult, activeGuildResult] = await Promise.all([
        supabase
          .from('guild_members')
          .select(`
            id,
            user_id,
            guild_id,
            character_name,
            class_id,
            role,
            is_active,
            joined_at,
            joined_via,
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
              active_expansion_id
            ),
            class:wow_classes (
              name,
              color_hex
            )
          `)
          .eq('user_id', currentUser.id)
          .eq('is_active', true)
          .order('joined_at', { ascending: true }),
        supabase
          .from('user_active_guilds')
          .select('active_guild_id')
          .eq('user_id', currentUser.id)
          .single()
      ])

      const { data: memberships, error: membershipsError } = membershipsResult
      const { data: activeGuildData } = activeGuildResult

      if (membershipsError) {
        console.error('Error loading guild memberships:', membershipsError)
        console.error('Error details:', JSON.stringify(membershipsError, null, 2))
        console.error('Error code:', membershipsError?.code)
        console.error('Error message:', membershipsError?.message)
        console.error('Error hint:', membershipsError?.hint)
        setUserGuilds([])
        setGuildsLoading(false)
        return
      }

      // Transform data into GuildMembership format
      const guilds: GuildMembership[] = (memberships || []).map((m: any) => ({
        guild: m.guild as Guild,
        member: {
          id: m.id,
          user_id: m.user_id,
          guild_id: m.guild_id,
          character_name: m.character_name,
          class_id: m.class_id,
          role: m.role,
          is_active: m.is_active,
          joined_at: m.joined_at,
          joined_via: m.joined_via
        } as GuildMember,
        class: m.class || { name: 'Unknown', color_hex: '#808080' }
      }))

      setUserGuilds(guilds)

      // If user has no guilds, redirect to guild selection
      if (guilds.length === 0) {
        setActiveGuild(null)
        setActiveMember(null)
        setGuildsLoading(false)
        // Don't redirect here - let pages handle it
        return
      }

      let targetGuildId: string | null = null

      if (activeGuildData?.active_guild_id) {
        // Verify user is still a member of the saved active guild
        const isStillMember = guilds.some(g => g.guild.id === activeGuildData.active_guild_id)
        if (isStillMember) {
          targetGuildId = activeGuildData.active_guild_id
        }
      }

      // If no valid active guild, use first guild
      if (!targetGuildId && guilds.length > 0) {
        targetGuildId = guilds[0].guild.id

        // Save as active guild
        await supabase
          .from('user_active_guilds')
          .upsert({
            user_id: currentUser.id,
            active_guild_id: targetGuildId,
            updated_at: new Date().toISOString()
          })
      }

      // Set active guild and member
      if (targetGuildId) {
        const activeGuildship = guilds.find(g => g.guild.id === targetGuildId)
        if (activeGuildship) {
          setActiveGuild(activeGuildship.guild)
          setActiveMember(activeGuildship.member)
        }
      }

    } catch (error) {
      console.error('Error in loadGuilds:', error)
    } finally {
      setGuildsLoading(false)
    }
  }

  // Load user's characters and their guild memberships
  const loadCharacters = async () => {
    try {
      setCharactersLoading(true)
      if (!user) {
        setCharactersLoading(false)
        return
      }

      // Fetch all user's characters
      const { data: characters, error: charactersError } = await supabase
        .from('characters')
        .select(`
          *,
          class:wow_classes (
            id,
            name,
            color_hex
          ),
          spec:class_specs (
            name
          )
        `)
        .eq('user_id', user.id)
        .order('is_main', { ascending: false })
        .order('created_at', { ascending: true })

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

      if (characters && characters.length > 0) {
        const characterIds = characters.map(c => c.id)
        const specIds = characters
          .map(c => c.spec_id)
          .filter(Boolean) as string[]

        console.log('[GUILD CONTEXT] Fetching memberships for character IDs:', characterIds)

        // Run specs and memberships queries in parallel
        const [specsResult, membershipsResult] = await Promise.all([
          specIds.length > 0
            ? supabase.from('class_specs').select('id, name').in('id', specIds)
            : Promise.resolve({ data: null, error: null }),
          supabase
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
                active_expansion_id
              )
            `)
            .in('character_id', characterIds)
            .eq('is_active', true)
        ])

        const { data: specs } = specsResult
        const { data: memberships, error: membershipsError } = membershipsResult

        // Attach specs to characters
        if (specs && specs.length > 0) {
          enrichedCharacters = characters.map(char => ({
            ...char,
            spec: specs.find(s => s.id === char.spec_id) || null
          }))
        } else {
          enrichedCharacters = characters
        }

        setUserCharacters(enrichedCharacters)

        console.log('[GUILD CONTEXT] Memberships query result:', { memberships, membershipsError })
        console.log('[GUILD CONTEXT] Memberships count:', memberships?.length || 0)

        if (membershipsError) {
          console.error('Error loading character memberships:', membershipsError)
          console.error('Memberships error details:', JSON.stringify(membershipsError, null, 2))
          console.error('Memberships error code:', membershipsError?.code)
          console.error('Memberships error message:', membershipsError?.message)
          setCharacterMemberships([])
        } else {
          // Transform the data to handle arrays from Supabase joins
          transformedMemberships = (memberships || []).map(m => {
            const char = Array.isArray(m.character) ? m.character[0] : m.character
            return {
              ...m,
              character: char ? {
                ...char,
                class: Array.isArray(char.class) ? char.class[0] : char.class,
                spec: Array.isArray(char.spec) ? char.spec[0] : char.spec
              } : char,
              guild: Array.isArray(m.guild) ? m.guild[0] : m.guild
            }
          })
          setCharacterMemberships(transformedMemberships)

          // Derive userGuilds from character memberships (new system)
          // First, fetch guild_roles for position-based role comparison
          const uniqueGuildIds = [...new Set(transformedMemberships.map(m => m.guild?.id).filter(Boolean))]
          const guildRolePositions = new Map<string, Map<string, number>>()

          if (uniqueGuildIds.length > 0) {
            const { data: allGuildRoles } = await supabase
              .from('guild_roles')
              .select('guild_id, name, position')
              .in('guild_id', uniqueGuildIds)

            if (allGuildRoles) {
              for (const role of allGuildRoles) {
                if (!guildRolePositions.has(role.guild_id)) {
                  guildRolePositions.set(role.guild_id, new Map())
                }
                guildRolePositions.get(role.guild_id)!.set(role.name, role.position)
              }
            }
          }

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
          const derivedGuilds: GuildMembership[] = Array.from(guildMap.values()).map(({ guild, role, membership }) => ({
            guild: guild as Guild,
            member: {
              id: membership.id,
              user_id: user.id,
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

          console.log('[GUILD CONTEXT] Derived userGuilds from character memberships:', derivedGuilds.length)
          setUserGuilds(derivedGuilds)
        }
      } else {
        setUserCharacters([])
        setCharacterMemberships([])
        setUserGuilds([])
      }

      // Check for saved active character (just get IDs, we already have character data)
      const { data: activeCharData } = await supabase
        .from('user_active_characters')
        .select('active_character_id, active_guild_id')
        .eq('user_id', user.id)
        .maybeSingle()

      console.log('[GUILD CONTEXT] Active char data:', activeCharData)
      console.log('[GUILD CONTEXT] Transformed memberships for active guild check:', transformedMemberships.length)

      if (activeCharData?.active_character_id) {
        // Find the character from our enriched characters (which have specs attached)
        const activeChar = enrichedCharacters.find(c => c.id === activeCharData.active_character_id)
        if (activeChar) {
          setActiveCharacter(activeChar)
        }
      } else if (enrichedCharacters.length > 0) {
        // If no active character saved, use first character (main if available)
        setActiveCharacter(enrichedCharacters[0])
      }

      // Set activeGuild from character memberships (new system)
      // This is critical - the old loadGuilds uses guild_members table which may be empty
      if (activeCharData?.active_guild_id) {
        // Find the guild from memberships
        const membershipWithGuild = transformedMemberships.find(m => m.guild_id === activeCharData.active_guild_id)
        if (membershipWithGuild?.guild) {
          console.log('[GUILD CONTEXT] Setting activeGuild from user_active_characters:', membershipWithGuild.guild.name)
          setActiveGuild(membershipWithGuild.guild as Guild)
        } else {
          // No active membership found for this guild
          // This could mean: 1) User left the guild, or 2) User joined guild but hasn't created a character yet
          // Check if user has NO characters - if so, they're in the "pending character creation" state
          if (enrichedCharacters.length === 0) {
            // User has no characters - fetch the guild directly and show it
            // This is the "joined guild, needs to create character" state
            console.log('[GUILD CONTEXT] User has no characters but has active_guild_id, fetching guild directly')
            const { data: pendingGuild } = await supabase
              .from('guilds')
              .select('*')
              .eq('id', activeCharData.active_guild_id)
              .single()

            if (pendingGuild) {
              console.log('[GUILD CONTEXT] Setting activeGuild from pending state:', pendingGuild.name)
              setActiveGuild(pendingGuild as Guild)
            } else {
              console.log('[GUILD CONTEXT] Pending guild not found, clearing')
              setActiveGuild(null)
              await supabase
                .from('user_active_characters')
                .update({
                  active_guild_id: null,
                  updated_at: new Date().toISOString()
                })
                .eq('user_id', user.id)
            }
          } else {
            // User has characters but no membership in this guild - stale reference
            console.log('[GUILD CONTEXT] No active membership found for active_guild_id, clearing stale reference:', activeCharData.active_guild_id)

            // Clear the stale active_guild_id
            await supabase
              .from('user_active_characters')
              .update({
                active_guild_id: null,
                updated_at: new Date().toISOString()
              })
              .eq('user_id', user.id)

            // If user has other guild memberships, set the first one as active
            if (transformedMemberships.length > 0 && transformedMemberships[0]?.guild) {
              console.log('[GUILD CONTEXT] Setting activeGuild to first available membership:', transformedMemberships[0].guild.name)
              setActiveGuild(transformedMemberships[0].guild as Guild)

              await supabase
                .from('user_active_characters')
                .update({
                  active_guild_id: transformedMemberships[0].guild_id,
                  updated_at: new Date().toISOString()
                })
                .eq('user_id', user.id)
            } else {
              // User has no guild memberships - set activeGuild to null
              console.log('[GUILD CONTEXT] User has no guild memberships, setting activeGuild to null')
              setActiveGuild(null)
            }
          }
        }
      } else if (transformedMemberships.length > 0 && transformedMemberships[0]?.guild) {
        // If no saved active guild, use first guild from character memberships
        console.log('[GUILD CONTEXT] Setting activeGuild to first membership guild:', transformedMemberships[0].guild.name)
        setActiveGuild(transformedMemberships[0].guild as Guild)

        // Also save this as the active guild
        await supabase
          .from('user_active_characters')
          .upsert({
            user_id: user.id,
            active_character_id: enrichedCharacters[0]?.id || null,
            active_guild_id: transformedMemberships[0].guild_id,
            updated_at: new Date().toISOString()
          })
      } else {
        // No saved active guild and no memberships - explicitly set activeGuild to null
        console.log('[GUILD CONTEXT] No active guild and no memberships, setting activeGuild to null')
        setActiveGuild(null)
      }
    } catch (error) {
      console.error('Error in loadCharacters:', error)
    } finally {
      setCharactersLoading(false)
    }
  }

  // Load expansions for active guild
  const loadExpansions = async (guildId: string) => {
    try {
      const { data, error } = await supabase
        .rpc('get_guild_expansions', { p_guild_id: guildId })

      if (error) {
        console.error('Error loading expansions:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
        console.error('Error code:', error?.code)
        console.error('Error message:', error?.message)
        console.error('Error hint:', error?.hint)
        setGuildExpansions([])
        setCurrentExpansion(null)
        return
      }

      setGuildExpansions(data || [])

      // Set current expansion
      const current = (data || []).find((exp: GuildExpansion) => exp.is_current)
      setCurrentExpansion(current || null)

      // Reset viewing expansion when guild changes
      setViewingExpansionId(null)
    } catch (error) {
      console.error('Error in loadExpansions:', error)
      setGuildExpansions([])
      setCurrentExpansion(null)
    }
  }

  const refreshExpansions = async () => {
    if (activeGuild) {
      await loadExpansions(activeGuild.id)
    }
  }

  const setViewingExpansion = (expansionId: string | null) => {
    setViewingExpansionId(expansionId)
  }

  // Switch to a different guild (with optional character)
  const switchGuild = async (guildId: string, characterId?: string) => {
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

      // Also update user_active_characters to keep both tables in sync
      await supabase
        .from('user_active_characters')
        .upsert({
          user_id: user.id,
          active_guild_id: guildId,
          updated_at: new Date().toISOString()
        })

      // Update local state
      setActiveGuild(targetGuild.guild)
      setActiveMember(targetGuild.member)

      // Reload page to fetch guild-specific data
      router.refresh()
    } catch (error) {
      console.error('Error in switchGuild:', error)
    }
  }

  // Switch to a different character
  const switchCharacter = async (characterId: string) => {
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

      // Update local state
      setActiveCharacter(targetChar)

      // If switching to a character in active guild, update isOfficer
      if (activeGuild) {
        const membership = characterMemberships.find(
          m => m.character_id === characterId && m.guild_id === activeGuild.id
        )
        if (membership) {
          // Character is in current guild, refresh to update permissions
          router.refresh()
        }
      }
    } catch (error) {
      console.error('Error in switchCharacter:', error)
    }
  }

  // Refresh guilds (useful after joining a new guild)
  const refreshGuilds = async () => {
    await loadGuilds()
  }

  // Refresh characters (useful after creating a new character)
  const refreshCharacters = async () => {
    await loadCharacters()
  }

  // Load guilds and characters on mount
  useEffect(() => {
    loadGuilds()
  }, [])

  // Load characters when user is set
  useEffect(() => {
    if (user) {
      loadCharacters()
    }
  }, [user])

  // Load expansions when active guild changes
  useEffect(() => {
    if (activeGuild) {
      loadExpansions(activeGuild.id)
    } else {
      setGuildExpansions([])
      setCurrentExpansion(null)
      setViewingExpansionId(null)
    }
  }, [activeGuild?.id])

  // Listen for auth changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        loadGuilds()
      } else if (event === 'SIGNED_OUT') {
        setActiveGuild(null)
        setActiveMember(null)
        setUserGuilds([])
        setActiveCharacter(null)
        setUserCharacters([])
        setCharacterMemberships([])
        setGuildExpansions([])
        setCurrentExpansion(null)
        setViewingExpansionId(null)
        setUser(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Derived state
  // Check if user has officer role via position (>= 50) instead of hardcoded names
  // This allows guilds to customize role names while maintaining permissions
  const [isOfficer, setIsOfficer] = useState(false)

  useEffect(() => {
    const checkOfficerStatus = async () => {
      // No guild = not an officer
      if (!activeGuild) {
        setIsOfficer(false)
        return
      }

      // Guild creator is always an officer (even without a character)
      // First check from cached activeGuild
      if (user && activeGuild.created_by && activeGuild.created_by === user.id) {
        console.log('[GUILD CONTEXT] User is guild creator (cached), setting isOfficer=true')
        setIsOfficer(true)
        return
      }

      // Fallback: query guild directly to verify created_by (in case cached data is stale)
      if (user) {
        const { data: guildCheck } = await supabase
          .from('guilds')
          .select('created_by')
          .eq('id', activeGuild.id)
          .single()

        console.log('[GUILD CONTEXT] Guild creator check:', {
          userId: user.id,
          guildCreatedBy: guildCheck?.created_by,
          match: guildCheck?.created_by === user.id
        })

        if (guildCheck?.created_by === user.id) {
          console.log('[GUILD CONTEXT] User is guild creator (verified), setting isOfficer=true')
          setIsOfficer(true)
          return
        }
      }

      // Check old system (backwards compatibility)
      if (activeMember) {
        const { data: roleData } = await supabase
          .from('guild_roles')
          .select('position')
          .eq('guild_id', activeGuild.id)
          .eq('name', activeMember.role)
          .single()

        if (roleData && roleData.position >= 50) {
          setIsOfficer(true)
          return
        }
      }

      // Check new character system
      if (!activeCharacter) {
        setIsOfficer(false)
        return
      }

      // Find the membership for the active character in the active guild
      const membership = characterMemberships.find(
        m => m.character_id === activeCharacter.id && m.guild_id === activeGuild.id
      )

      if (!membership) {
        setIsOfficer(false)
        return
      }

      // Fetch the role position from guild_roles
      const { data: roleData } = await supabase
        .from('guild_roles')
        .select('position')
        .eq('guild_id', activeGuild.id)
        .eq('name', membership.role)
        .single()

      // Position >= 50 means officer or guild master
      setIsOfficer(!!(roleData && roleData.position >= 50))
    }

    checkOfficerStatus()
  }, [activeCharacter, activeGuild, characterMemberships, activeMember, user])

  const hasMultipleGuilds = userGuilds.length > 1
  const hasMultipleCharacters = userCharacters.length > 1

  const value: GuildContextType = {
    // Existing
    activeGuild,
    activeMember,
    userGuilds,
    loading,

    // New Character System
    activeCharacter,
    userCharacters,
    characterMemberships,

    // Expansion State
    currentExpansion,
    guildExpansions,
    viewingExpansionId,

    // Methods
    switchGuild,
    refreshGuilds,
    switchCharacter,
    refreshCharacters,
    setViewingExpansion,
    refreshExpansions,

    // Derived state
    isOfficer,
    hasMultipleGuilds,
    hasMultipleCharacters
  }

  return (
    <GuildContext.Provider value={value}>
      {children}
    </GuildContext.Provider>
  )
}

// Custom hook to use guild context
export function useGuildContext() {
  const context = useContext(GuildContext)
  if (context === undefined) {
    throw new Error('useGuildContext must be used within a GuildContextProvider')
  }
  return context
}

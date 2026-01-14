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

  // Methods
  switchGuild: (guildId: string, characterId?: string) => Promise<void>
  refreshGuilds: () => Promise<void>
  switchCharacter: (characterId: string) => Promise<void>
  refreshCharacters: () => Promise<void>

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

  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)

  const supabase = createClient()
  const router = useRouter()

  // Load user's guilds and active guild
  const loadGuilds = async () => {
    try {
      setLoading(true)

      // Get authenticated user
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) {
        setActiveGuild(null)
        setActiveMember(null)
        setUserGuilds([])
        setLoading(false)
        return
      }
      setUser(currentUser)

      // Fetch all guilds user is a member of
      const { data: memberships, error: membershipsError } = await supabase
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
        .order('joined_at', { ascending: true })

      if (membershipsError) {
        console.error('Error loading guild memberships:', membershipsError)
        console.error('Error details:', JSON.stringify(membershipsError, null, 2))
        console.error('Error code:', membershipsError?.code)
        console.error('Error message:', membershipsError?.message)
        console.error('Error hint:', membershipsError?.hint)
        setUserGuilds([])
        setLoading(false)
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
        setLoading(false)
        // Don't redirect here - let pages handle it
        return
      }

      // Check for saved active guild
      const { data: activeGuildData } = await supabase
        .from('user_active_guilds')
        .select('active_guild_id')
        .eq('user_id', currentUser.id)
        .single()

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
      setLoading(false)
    }
  }

  // Load user's characters and their guild memberships
  const loadCharacters = async () => {
    try {
      if (!user) return

      // Fetch all user's characters (without embedded spec to avoid PostgREST relationship issues)
      const { data: characters, error: charactersError } = await supabase
        .from('characters')
        .select(`
          *,
          class:wow_classes (
            id,
            name,
            color_hex
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

      // Fetch specs separately for characters that have spec_id
      let enrichedCharacters: typeof characters = []

      if (characters && characters.length > 0) {
        const specIds = characters
          .map(c => c.spec_id)
          .filter(Boolean) as string[]

        if (specIds.length > 0) {
          const { data: specs } = await supabase
            .from('class_specs')
            .select('id, name')
            .in('id', specIds)

          // Attach specs to characters
          enrichedCharacters = characters.map(char => ({
            ...char,
            spec: specs?.find(s => s.id === char.spec_id) || null
          }))
        } else {
          enrichedCharacters = characters
        }

        setUserCharacters(enrichedCharacters)
      } else {
        setUserCharacters([])
      }

      // Fetch all character guild memberships
      if (characters && characters.length > 0) {
        const characterIds = characters.map(c => c.id)
        const { data: memberships, error: membershipsError } = await supabase
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
              name,
              realm,
              level,
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

        if (membershipsError) {
          console.error('Error loading character memberships:', membershipsError)
          console.error('Memberships error details:', JSON.stringify(membershipsError, null, 2))
          console.error('Memberships error code:', membershipsError?.code)
          console.error('Memberships error message:', membershipsError?.message)
          setCharacterMemberships([])
        } else {
          setCharacterMemberships(memberships || [])
        }
      }

      // Check for saved active character (just get IDs, we already have character data)
      const { data: activeCharData } = await supabase
        .from('user_active_characters')
        .select('active_character_id, active_guild_id')
        .eq('user_id', user.id)
        .maybeSingle()

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
    } catch (error) {
      console.error('Error in loadCharacters:', error)
    }
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
        setUser(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Derived state
  // Check if user has officer role via either old system or new character system
  const isOfficer =
    activeMember?.role === 'Officer' ||
    activeMember?.role === 'Guild Master' ||
    (activeCharacter && activeGuild &&
      characterMemberships.some(
        m => m.character_id === activeCharacter.id &&
             m.guild_id === activeGuild.id &&
             (m.role === 'Officer' || m.role === 'Guild Master')
      )
    )

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

    // Methods
    switchGuild,
    refreshGuilds,
    switchCharacter,
    refreshCharacters,

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

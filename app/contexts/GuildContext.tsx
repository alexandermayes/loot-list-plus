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

export interface GuildContextType {
  // State
  activeGuild: Guild | null
  activeMember: GuildMember | null
  userGuilds: GuildMembership[]
  loading: boolean

  // Methods
  switchGuild: (guildId: string) => Promise<void>
  refreshGuilds: () => Promise<void>

  // Derived state
  isOfficer: boolean
  hasMultipleGuilds: boolean
}

// Create context
const GuildContext = createContext<GuildContextType | undefined>(undefined)

// Provider component
export function GuildContextProvider({ children }: { children: ReactNode }) {
  const [activeGuild, setActiveGuild] = useState<Guild | null>(null)
  const [activeMember, setActiveMember] = useState<GuildMember | null>(null)
  const [userGuilds, setUserGuilds] = useState<GuildMembership[]>([])
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

  // Switch to a different guild
  const switchGuild = async (guildId: string) => {
    if (!user) return

    try {
      // Verify user is a member of target guild
      const targetGuild = userGuilds.find(g => g.guild.id === guildId)
      if (!targetGuild) {
        console.error('User is not a member of guild:', guildId)
        return
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

  // Refresh guilds (useful after joining a new guild)
  const refreshGuilds = async () => {
    await loadGuilds()
  }

  // Load guilds on mount
  useEffect(() => {
    loadGuilds()
  }, [])

  // Listen for auth changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        loadGuilds()
      } else if (event === 'SIGNED_OUT') {
        setActiveGuild(null)
        setActiveMember(null)
        setUserGuilds([])
        setUser(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Derived state
  const isOfficer = activeMember?.role === 'Officer'
  const hasMultipleGuilds = userGuilds.length > 1

  const value: GuildContextType = {
    activeGuild,
    activeMember,
    userGuilds,
    loading,
    switchGuild,
    refreshGuilds,
    isOfficer,
    hasMultipleGuilds
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

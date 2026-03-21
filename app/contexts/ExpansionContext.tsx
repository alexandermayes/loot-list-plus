'use client'

import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useNotification } from '@/app/contexts/NotificationContext'
import { useGuildData } from '@/app/contexts/GuildContext'

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

export interface ExpansionDataContextType {
  currentExpansion: GuildExpansion | null
  guildExpansions: GuildExpansion[]
  viewingExpansionId: string | null
}

export interface ExpansionActionsContextType {
  setViewingExpansion: (expansionId: string | null) => void
  refreshExpansions: () => Promise<void>
}

export type ExpansionContextType = ExpansionDataContextType & ExpansionActionsContextType

export const ExpansionDataContext = createContext<ExpansionDataContextType | undefined>(undefined)
const ExpansionActionsContext = createContext<ExpansionActionsContextType | undefined>(undefined)

export function ExpansionProvider({ children }: { children: ReactNode }) {
  const { activeGuild } = useGuildData()
  const { showNotification } = useNotification()
  const supabase = createClient()

  const [currentExpansion, setCurrentExpansion] = useState<GuildExpansion | null>(null)
  const [guildExpansions, setGuildExpansions] = useState<GuildExpansion[]>([])
  const [viewingExpansionId, setViewingExpansionId] = useState<string | null>(null)

  const loadExpansions = async (guildId: string) => {
    try {
      const { data, error } = await supabase
        .rpc('get_guild_expansions', { p_guild_id: guildId })

      if (error) {
        console.error('Error loading expansions:', error)
        showNotification('error', 'Couldn\'t load expansion data. Check your connection and try again.')
        setGuildExpansions([])
        setCurrentExpansion(null)
        return
      }

      setGuildExpansions(data || [])

      const current = (data || []).find((exp: GuildExpansion) => exp.is_current)
      setCurrentExpansion(current || null)

      // Reset viewing expansion when guild changes
      setViewingExpansionId(null)
    } catch (error) {
      console.error('Error in loadExpansions:', error)
      showNotification('error', 'Couldn\'t load expansion data. Check your connection and try again.')
      setGuildExpansions([])
      setCurrentExpansion(null)
    }
  }

  const refreshExpansions = useCallback(async () => {
    if (activeGuild) {
      await loadExpansions(activeGuild.id)
    }
  }, [activeGuild])

  const setViewingExpansionCb = useCallback((expansionId: string | null) => {
    setViewingExpansionId(expansionId)
  }, [])

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

  const dataValue = useMemo<ExpansionDataContextType>(() => ({
    currentExpansion,
    guildExpansions,
    viewingExpansionId,
  }), [currentExpansion, guildExpansions, viewingExpansionId])

  const actionsValue = useMemo<ExpansionActionsContextType>(() => ({
    setViewingExpansion: setViewingExpansionCb,
    refreshExpansions,
  }), [setViewingExpansionCb, refreshExpansions])

  return (
    <ExpansionDataContext.Provider value={dataValue}>
      <ExpansionActionsContext.Provider value={actionsValue}>
        {children}
      </ExpansionActionsContext.Provider>
    </ExpansionDataContext.Provider>
  )
}

export function useExpansionData() {
  const context = useContext(ExpansionDataContext)
  if (context === undefined) {
    throw new Error('useExpansionData must be used within an ExpansionProvider')
  }
  return context
}

export function useExpansionActions() {
  const context = useContext(ExpansionActionsContext)
  if (context === undefined) {
    throw new Error('useExpansionActions must be used within an ExpansionProvider')
  }
  return context
}

export function useExpansion(): ExpansionContextType {
  const data = useExpansionData()
  const actions = useExpansionActions()
  return { ...data, ...actions }
}

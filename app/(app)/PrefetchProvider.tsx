'use client'

import { createContext, useContext, type ReactNode } from 'react'

export interface PrefetchedGuildData {
  user: { id: string; email?: string } | null
  characters: any[] | null
  activePreferences: { active_character_id: string | null; active_guild_id: string | null } | null
  memberships: any[] | null
}

const PrefetchContext = createContext<PrefetchedGuildData | null>(null)

export function PrefetchProvider({
  data,
  children,
}: {
  data: PrefetchedGuildData | null
  children: ReactNode
}) {
  return (
    <PrefetchContext.Provider value={data}>
      {children}
    </PrefetchContext.Provider>
  )
}

export function usePrefetchedGuildData(): PrefetchedGuildData | null {
  return useContext(PrefetchContext)
}

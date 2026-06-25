'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { hasFeature } from '@/domain/guild/feature-flags'
import { resolveRollingWeeks, resolveRaidDays } from '@/domain/raid-team/settings'
import type { RaidTeam } from '@/domain/raid-team/types'

const STORAGE_KEY = 'lootlist_active_team'

function getStoredTeamId(guildId: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return null
    const parsed = JSON.parse(stored)
    // Only use if it's for the same guild
    return parsed?.guildId === guildId ? parsed.teamId : null
  } catch { return null }
}

function storeTeamId(guildId: string, teamId: string | null) {
  if (typeof window === 'undefined') return
  try {
    if (teamId) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ guildId, teamId }))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch { /* ignore */ }
}

interface UseRaidTeamResult {
  /** Currently selected team ID, or null for "All teams" */
  activeTeamId: string | null
  /** The selected team object, or null */
  activeTeam: RaidTeam | null
  /** All teams for the guild */
  teams: RaidTeam[]
  /** Whether the guild has Pro + at least one team */
  hasTeams: boolean
  /** Whether the guild has Pro tier */
  isPro: boolean
  /** Loading state */
  loading: boolean
  /** Set the active team (updates URL param + persists to localStorage) */
  setTeam: (teamId: string | null) => void
  /** Resolved rolling weeks (team override or guild default) */
  resolvedRollingWeeks: (guildRollingWeeks: number) => number
  /** Resolved raid days (team override or guild defaults) */
  resolvedRaidDays: (guildSettings: {
    raid_days_per_week: number
    first_raid_day: number | null
    second_raid_day: number | null
    third_raid_day: number | null
    fourth_raid_day: number | null
    fifth_raid_day: number | null
  }) => number[]
}

/**
 * Hook for per-page team selection via URL params, persisted to localStorage.
 *
 * Priority: URL param > localStorage > null (All teams).
 * When a team is selected, it's saved to localStorage so it persists across pages.
 */
export function useRaidTeam(): UseRaidTeamResult {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const { activeGuild } = useGuildContext()

  const [teams, setTeams] = useState<RaidTeam[]>([])
  const [loading, setLoading] = useState(false)

  const guildIsPro = hasFeature(activeGuild, 'raid_teams')
  const teamIdParam = searchParams.get('team')
  const guildId = activeGuild?.id || ''

  // Fetch teams for Pro guilds
  useEffect(() => {
    if (!activeGuild?.id || !guildIsPro) {
      setTeams([])
      return
    }

    let cancelled = false
    setLoading(true)

    const supabase = createClient()
    supabase
      .from('raid_teams')
      .select('*')
      .eq('guild_id', activeGuild.id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
      .then(({ data }: { data: RaidTeam[] | null }) => {
        if (!cancelled) {
          setTeams(data || [])
          setLoading(false)
        }
      })

    return () => { cancelled = true }
  }, [activeGuild?.id, guildIsPro])

  // Resolve active team: URL param > localStorage > null
  const resolvedTeamId = useMemo(() => {
    if (teamIdParam) return teamIdParam
    if (guildId && teams.length > 0) {
      const stored = getStoredTeamId(guildId)
      if (stored && teams.some(t => t.id === stored)) return stored
    }
    return null
  }, [teamIdParam, guildId, teams])

  const activeTeam = useMemo(
    () => teams.find(t => t.id === resolvedTeamId) ?? null,
    [teams, resolvedTeamId]
  )

  const activeTeamId = activeTeam ? resolvedTeamId : (loading ? resolvedTeamId : null)

  // Apply stored team to URL if not already there (on initial page load)
  useEffect(() => {
    if (!teamIdParam && activeTeamId && teams.length > 0) {
      const params = new URLSearchParams(searchParams.toString())
      params.set('team', activeTeamId)
      const qs = params.toString()
      router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false })
    }
  }, [activeTeamId, teamIdParam, teams.length, pathname])

  const setTeam = useCallback((teamId: string | null) => {
    // Persist to localStorage
    if (guildId) storeTeamId(guildId, teamId)

    const params = new URLSearchParams(searchParams.toString())
    if (teamId) {
      params.set('team', teamId)
    } else {
      params.delete('team')
    }
    const qs = params.toString()
    router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false })
  }, [searchParams, router, pathname, guildId])

  const resolvedRollingWeeksFn = useCallback((guildRollingWeeks: number) => {
    return resolveRollingWeeks(guildRollingWeeks, activeTeam?.rolling_weeks_override)
  }, [activeTeam])

  const resolvedRaidDaysFn = useCallback((guildSettings: {
    raid_days_per_week: number
    first_raid_day: number | null
    second_raid_day: number | null
    third_raid_day: number | null
    fourth_raid_day: number | null
    fifth_raid_day: number | null
  }) => {
    return resolveRaidDays(guildSettings, activeTeam?.raid_days_override)
  }, [activeTeam])

  return {
    activeTeamId,
    activeTeam,
    teams,
    hasTeams: guildIsPro && teams.length > 0,
    isPro: guildIsPro,
    loading,
    setTeam,
    resolvedRollingWeeks: resolvedRollingWeeksFn,
    resolvedRaidDays: resolvedRaidDaysFn,
  }
}

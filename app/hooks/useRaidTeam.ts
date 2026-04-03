'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { hasFeature } from '@/domain/guild/feature-flags'
import { resolveRollingWeeks, resolveRaidDays } from '@/domain/raid-team/settings'
import type { RaidTeam } from '@/domain/raid-team/types'

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
  /** Set the active team (updates URL param) */
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
 * Hook for per-page team selection via URL params.
 *
 * Reads `?team=<id>` from URL. Only fetches teams for Pro guilds.
 * Falls back gracefully: no team param = guild-wide view.
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
      .then(({ data }: { data: any }) => {
        if (!cancelled) {
          setTeams((data as RaidTeam[]) || [])
          setLoading(false)
        }
      })

    return () => { cancelled = true }
  }, [activeGuild?.id, guildIsPro])

  const activeTeam = useMemo(
    () => teams.find(t => t.id === teamIdParam) ?? null,
    [teams, teamIdParam]
  )

  const setTeam = useCallback((teamId: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (teamId) {
      params.set('team', teamId)
    } else {
      params.delete('team')
    }
    const qs = params.toString()
    router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false })
  }, [searchParams, router, pathname])

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
    activeTeamId: teamIdParam,
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

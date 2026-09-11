'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { hasFeature } from '@/domain/guild/feature-flags'
import { resolveRollingWeeks, resolveRaidDays } from '@/domain/raid-team/settings'
import { resolveTeamSelection, ALL_TEAMS_SENTINEL } from '@/domain/raid-team/select-default-team'
import type { RaidTeam } from '@/domain/raid-team/types'

const STORAGE_KEY = 'lootlist_active_team'

/**
 * Returns the stored team id for this guild, the All-teams sentinel if the
 * officer previously chose All teams on purpose, or null when there is no
 * record for this guild at all. A null return must not be conflated with an
 * All-teams choice — `resolveTeamSelection` relies on the distinction to
 * decide whether auto-selection is safe to apply.
 */
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
    // A null teamId records a deliberate All-teams choice via the sentinel,
    // rather than clearing the key, so the record keeps distinguishing "chose
    // All teams" from "never chose" for the next page load.
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ guildId, teamId: teamId ?? ALL_TEAMS_SENTINEL }))
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
 * Priority: URL param, then a stored choice (including a stored All-teams
 * choice), then the guild's default team when the guild has teams and the
 * officer has never chosen, then null. A team guild no longer strands an
 * officer on All teams by default (GH-267 Path B): once a guild has any raid
 * team, the ensure route refuses to create unassigned events, so leaving an
 * officer on All teams by default meant the current week was never created.
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

  // Resolve active team: URL param, then a stored choice (including a stored
  // All-teams choice), then the guild's default team, then null. Derived
  // rather than persisted, so an auto-selected team never masquerades as a
  // user choice until the officer actually picks (or re-picks) one.
  //
  // One-time migration note: officers who chose All teams before this change
  // have no stored record, are indistinguishable from officers who never
  // chose, and will be auto-selected onto a team once. Re-choosing All teams
  // afterward persists via the All-teams sentinel.
  const resolvedTeamId = useMemo(() => {
    return resolveTeamSelection({
      urlParam: teamIdParam,
      stored: guildId ? getStoredTeamId(guildId) : null,
      teams,
    })
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

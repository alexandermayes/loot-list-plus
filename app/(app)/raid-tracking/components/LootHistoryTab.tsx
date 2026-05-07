'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect, useCallback, useRef } from 'react'
import ItemLink from '@/app/components/ItemLink'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { useNotification } from '@/app/contexts/NotificationContext'
import { Skeleton } from '@/components/ui/skeletons'
import { Text } from '@/components/ui/typography'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { DatePicker } from '@/components/ui/date-picker'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { FileSearchIcon } from '@hugeicons/core-free-icons'
import { refreshWowheadTooltips } from '@/lib/wowhead'
import type { LootHistoryEntry } from '@/app/api/loot-history/route'
import { useRaidTeam } from '@/app/hooks/useRaidTeam'

interface RaidTier {
  id: string
  name: string
}

const ITEMS_PER_PAGE = 50

export default function LootHistoryTab() {
  const [entries, setEntries] = useState<LootHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [total, setTotal] = useState(0)
  const [raidTiers, setRaidTiers] = useState<RaidTier[]>([])

  // Filters
  const [filterTier, setFilterTier] = useState<string>('all')
  const [characterSearch, setCharacterSearch] = useState('')
  const [itemSearch, setItemSearch] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  // Track known entry IDs to detect newly added loot awards
  const knownIdsRef = useRef<Set<string>>(new Set())
  const [newEntryIds, setNewEntryIds] = useState<Set<string>>(new Set())

  const supabase = createClient()
  const { activeGuild, hasPermission } = useGuildContext()
  const canManageLoot = hasPermission('manage_loot')
  const { showNotification } = useNotification()
  const { activeTeamId } = useRaidTeam()

  const fetchHistory = useCallback(async (offset = 0, append = false) => {
    if (!activeGuild) return

    if (offset === 0) {
      setLoading(true)
    } else {
      setLoadingMore(true)
    }

    try {
      const params = new URLSearchParams({
        guild_id: activeGuild.id,
        limit: ITEMS_PER_PAGE.toString(),
        offset: offset.toString()
      })

      if (filterTier && filterTier !== 'all') {
        params.append('raid_tier_id', filterTier)
      }
      if (characterSearch.trim()) {
        params.append('character', characterSearch.trim())
      }
      if (itemSearch.trim()) {
        params.append('item', itemSearch.trim())
      }
      if (fromDate) {
        params.append('from', fromDate)
      }
      if (toDate) {
        params.append('to', toDate)
      }
      if (activeTeamId) {
        params.append('raid_team_id', activeTeamId)
      }

      const response = await fetch(`/api/loot-history?${params}`)
      const result = await response.json()

      if (!response.ok) {
        showNotification('error', result.error || 'Couldn\'t load loot history. Try again.')
        return
      }

      const incoming: LootHistoryEntry[] = result.data

      // Detect newly awarded items (not seen in previous loads)
      if (knownIdsRef.current.size > 0) {
        const fresh = new Set<string>()
        for (const entry of incoming) {
          if (!knownIdsRef.current.has(entry.id)) {
            fresh.add(entry.id)
          }
        }
        if (fresh.size > 0) {
          setNewEntryIds(fresh)
          // Clear glow after animation completes
          setTimeout(() => setNewEntryIds(new Set()), 1600)
        }
      }

      // Track all known IDs
      for (const entry of incoming) {
        knownIdsRef.current.add(entry.id)
      }

      if (append) {
        setEntries(prev => [...prev, ...incoming])
      } else {
        setEntries(incoming)
      }

      setTotal(result.pagination.total)
      setHasMore(offset + result.data.length < result.pagination.total)
    } catch (error) {
      console.error('Error fetching loot history:', error)
      showNotification('error', 'Couldn\'t load loot history. Try again.')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [activeGuild, filterTier, characterSearch, itemSearch, fromDate, toDate, activeTeamId, showNotification])

  const loadRaidTiers = useCallback(async () => {
    if (!activeGuild?.active_expansion_id) return

    const { data } = await supabase
      .from('raid_tiers')
      .select('id, name')
      .eq('expansion_id', activeGuild.active_expansion_id)
      .order('name')

    if (data) {
      setRaidTiers(data)
    }
  }, [activeGuild, supabase])

  // Load raid tiers when guild is ready
  useEffect(() => {
    if (activeGuild) {
      loadRaidTiers()
    }
  }, [activeGuild, loadRaidTiers])

  // Fetch history when filters change
  useEffect(() => {
    if (activeGuild && canManageLoot) {
      fetchHistory(0, false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGuild, canManageLoot, filterTier, fromDate, toDate, activeTeamId])

  // Debounce search filters
  useEffect(() => {
    if (!activeGuild || !canManageLoot) return

    const timer = setTimeout(() => {
      fetchHistory(0, false)
    }, 300)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [characterSearch, itemSearch, activeGuild, canManageLoot])

  // Refresh Wowhead tooltips after entries load
  useEffect(() => {
    if (entries.length > 0) {
      refreshWowheadTooltips(true)
    }
  }, [entries])

  const handleLoadMore = () => {
    fetchHistory(entries.length, true)
  }

  const handleClearFilters = () => {
    setFilterTier('all')
    setCharacterSearch('')
    setItemSearch('')
    setFromDate('')
    setToDate('')
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  // Calculate stats
  const thisWeek = entries.filter(e => {
    const date = new Date(e.awarded_date)
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    return date >= weekAgo
  }).length

  if (loading && entries.length === 0) {
    return (
      <div className="space-y-6">
        {/* Stats skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={`bg-background-elevated border border-border rounded-xl p-4${i === 2 ? ' col-span-2 sm:col-span-1' : ''}`}>
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-7 w-12 mt-1" />
            </div>
          ))}
        </div>
        {/* Filters skeleton */}
        <div className="bg-background-elevated border border-border rounded-xl p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="h-3.5 w-20 mb-2" />
                <Skeleton className="h-9 w-full rounded-[52px]" />
              </div>
            ))}
          </div>
        </div>
        {/* Table skeleton */}
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background-subtle">
                <th className="text-left px-4 py-2.5"><Skeleton className="h-3 w-12" /></th>
                <th className="text-left px-4 py-2.5"><Skeleton className="h-3 w-10" /></th>
                <th className="text-left px-4 py-2.5"><Skeleton className="h-3 w-14" /></th>
                <th className="text-left px-4 py-2.5"><Skeleton className="h-3 w-12" /></th>
                <th className="text-left px-4 py-2.5"><Skeleton className="h-3 w-10" /></th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-background-elevated border border-border rounded-xl p-4">
          <Text size="sm" color="muted">Total Awards</Text>
          <p className="text-2xl font-bold text-foreground">{total}</p>
        </div>
        <div className="bg-background-elevated border border-border rounded-xl p-4">
          <Text size="sm" color="muted">This Week</Text>
          <p className="text-2xl font-bold text-accent">{thisWeek}</p>
        </div>
        <div className="bg-background-elevated border border-border rounded-xl p-4 col-span-2 sm:col-span-1">
          <Text size="sm" color="muted">Showing</Text>
          <p className="text-2xl font-bold text-foreground">{entries.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-background-elevated border border-border rounded-xl p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Character Search */}
          <div>
            <Label className="mb-2">Search Player</Label>
            <Input
              variant="rounded"
              size="sm"
              value={characterSearch}
              onChange={(e) => setCharacterSearch(e.target.value)}
              placeholder="Character name..."
            />
          </div>

          {/* Item Search */}
          <div>
            <Label className="mb-2">Search Item</Label>
            <Input
              variant="rounded"
              size="sm"
              value={itemSearch}
              onChange={(e) => setItemSearch(e.target.value)}
              placeholder="Item name..."
            />
          </div>

          {/* Raid Tier Filter */}
          <div>
            <Label className="mb-2">Raid</Label>
            <Select
              variant="rounded"
              size="sm"
              value={filterTier}
              onChange={(e) => setFilterTier(e.target.value)}
            >
              <option value="all">All Raids</option>
              {raidTiers.map(tier => (
                <option key={tier.id} value={tier.id}>{tier.name}</option>
              ))}
            </Select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="mb-2">From</Label>
              <DatePicker
                variant="rounded"
                size="sm"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div>
              <Label className="mb-2">To</Label>
              <DatePicker
                variant="rounded"
                size="sm"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Clear Filters */}
        {(filterTier !== 'all' || characterSearch || itemSearch || fromDate || toDate) && (
          <div className="mt-3 pt-3 border-t border-border">
            <Button variant="ghost" size="sm" onClick={handleClearFilters}>
              Clear Filters
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      {entries.length === 0 ? (
        <EmptyState
          icon={FileSearchIcon}
          title="No loot awards found"
          description={
            filterTier !== 'all' || characterSearch || itemSearch || fromDate || toDate
              ? "Try adjusting your filters."
              : "Loot awards show up here after items are distributed in raid."
          }
          size="default"
          variant="card"
        />
      ) : (
        <div className="bg-background-elevated border border-border rounded-xl overflow-hidden">
          {/* Mobile Cards */}
          <div className="sm:hidden divide-y divide-border">
            {entries.map((entry) => (
              <div key={entry.id} className="px-4 py-3 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <ItemLink name={entry.item_name} wowheadId={entry.wowhead_id} />
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap">{formatDate(entry.awarded_date)}</span>
                </div>
                <div className="flex items-center gap-2 text-[12px]">
                  <span className="font-medium" style={{ color: entry.character_class_color || undefined }}>
                    {entry.character_name}
                  </span>
                  <span className="text-muted-foreground">from {entry.boss_name}</span>
                </div>
                {entry.notes && (
                  <p className="text-[11px] text-muted-foreground truncate">{entry.notes}</p>
                )}
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden sm:block overflow-x-auto max-h-[calc(100vh-400px)] overflow-y-auto">
            <table className="w-full min-w-[800px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-muted border-b border-border">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground bg-muted">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground bg-muted">
                    Item
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground bg-muted">
                    Player
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground bg-muted">
                    Boss
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground bg-muted">
                    Raid
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground bg-muted">
                    Awarded By
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground bg-muted">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entries.map((entry) => (
                  <tr key={entry.id} className={`hover:bg-muted/50 ${newEntryIds.has(entry.id) ? 'animate-loot-glow' : ''}`}>
                    <td className="px-4 py-3 text-foreground text-sm whitespace-nowrap">
                      {formatDate(entry.awarded_date)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <ItemLink name={entry.item_name} wowheadId={entry.wowhead_id} />
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className="font-medium"
                        style={{ color: entry.character_class_color || undefined }}
                      >
                        {entry.character_name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-sm">
                      {entry.boss_name}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-sm whitespace-nowrap">
                      {entry.raid_tier_name}
                    </td>
                    <td className="px-4 py-3 text-foreground-secondary text-sm">
                      {entry.awarded_by_name || '-'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-sm max-w-[200px] truncate">
                      {entry.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="p-4 border-t border-border flex justify-center">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                loading={loadingMore}
              >
                Load More
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

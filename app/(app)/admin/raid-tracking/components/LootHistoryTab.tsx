'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect, useCallback } from 'react'
import ItemLink from '@/app/components/ItemLink'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { useNotification } from '@/app/contexts/NotificationContext'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Text } from '@/components/ui/typography'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { DatePicker } from '@/components/ui/date-picker'
import { Label } from '@/components/ui/label'
import { FileSearchIcon } from '@hugeicons/core-free-icons'
import { refreshWowheadTooltips } from '@/lib/wowhead'
import type { LootHistoryEntry } from '@/app/api/loot-history/route'

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

  const supabase = createClient()
  const { activeGuild, isOfficer } = useGuildContext()
  const { showNotification } = useNotification()

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

      const response = await fetch(`/api/loot-history?${params}`)
      const result = await response.json()

      if (!response.ok) {
        showNotification('error', result.error || 'Failed to load loot history')
        return
      }

      if (append) {
        setEntries(prev => [...prev, ...result.data])
      } else {
        setEntries(result.data)
      }

      setTotal(result.pagination.total)
      setHasMore(offset + result.data.length < result.pagination.total)
    } catch (error) {
      console.error('Error fetching loot history:', error)
      showNotification('error', 'Failed to load loot history')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [activeGuild, filterTier, characterSearch, itemSearch, fromDate, toDate, showNotification])

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
    if (activeGuild && isOfficer) {
      fetchHistory(0, false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGuild, isOfficer, filterTier, fromDate, toDate])

  // Debounce search filters
  useEffect(() => {
    if (!activeGuild || !isOfficer) return

    const timer = setTimeout(() => {
      fetchHistory(0, false)
    }, 300)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [characterSearch, itemSearch, activeGuild, isOfficer])

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
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
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
            <label className="block text-[13px] font-medium text-foreground mb-2">
              Search Player
            </label>
            <input
              type="text"
              value={characterSearch}
              onChange={(e) => setCharacterSearch(e.target.value)}
              placeholder="Character name..."
              className="w-full px-4 py-2.5 bg-background-elevated border border-border-strong rounded-xl text-foreground text-[13px] focus:outline-none focus:border-accent"
            />
          </div>

          {/* Item Search */}
          <div>
            <label className="block text-[13px] font-medium text-foreground mb-2">
              Search Item
            </label>
            <input
              type="text"
              value={itemSearch}
              onChange={(e) => setItemSearch(e.target.value)}
              placeholder="Item name..."
              className="w-full px-4 py-2.5 bg-background-elevated border border-border-strong rounded-xl text-foreground text-[13px] focus:outline-none focus:border-accent"
            />
          </div>

          {/* Raid Tier Filter */}
          <div>
            <label className="block text-[13px] font-medium text-foreground mb-2">
              Raid
            </label>
            <select
              value={filterTier}
              onChange={(e) => setFilterTier(e.target.value)}
              className="w-full px-4 py-2.5 bg-background-elevated border border-border-strong rounded-xl text-foreground text-[13px] focus:outline-none focus:border-accent cursor-pointer"
            >
              <option value="all">All Raids</option>
              {raidTiers.map(tier => (
                <option key={tier.id} value={tier.id}>{tier.name}</option>
              ))}
            </select>
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
              ? "Try adjusting your filters"
              : "Loot awards will appear here when items are distributed"
          }
          size="default"
          variant="card"
        />
      ) : (
        <div className="bg-background-elevated border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="bg-muted border-b border-border">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">
                    Item
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">
                    Player
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">
                    Boss
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">
                    Raid
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">
                    Awarded By
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3 text-foreground text-sm whitespace-nowrap">
                      {formatDate(entry.awarded_date)}
                    </td>
                    <td className="px-4 py-3">
                      <ItemLink name={entry.item_name} wowheadId={entry.wowhead_id} />
                    </td>
                    <td className="px-4 py-3">
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
                variant="secondary"
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

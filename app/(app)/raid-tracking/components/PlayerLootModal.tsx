'use client'

import { useState, useEffect, useCallback } from 'react'
import { Modal, ModalHeader, ModalTitle, ModalDescription, ModalBody } from '@/components/ui/modal'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeletons'
import { Text } from '@/components/ui/typography'
import { EmptyState } from '@/components/ui/empty-state'
import { FileSearchIcon } from '@hugeicons/core-free-icons'
import ItemLink from '@/app/components/ItemLink'
import { refreshWowheadTooltips } from '@/lib/wowhead'
import { useNotification } from '@/app/contexts/NotificationContext'
import type { LootHistoryEntry } from '@/app/api/loot-history/route'

// A player rarely has this many awards; cap defensively and flag if we hit it.
const PLAYER_LOOT_LIMIT = 500

interface PlayerLootModalProps {
  open: boolean
  onClose: () => void
  guildId: string
  characterId: string | null
  characterName: string
  classColor: string | null
  /** Content phases (1-6) that have raids, for the phase dropdown */
  availablePhases: number[]
  /** Content phase the parent list is filtered to, used as the modal's initial scope */
  initialPhase: number | 'all'
}

interface RaidGroup {
  raidName: string
  items: LootHistoryEntry[]
}

export default function PlayerLootModal({
  open,
  onClose,
  guildId,
  characterId,
  characterName,
  classColor,
  availablePhases,
  initialPhase,
}: PlayerLootModalProps) {
  const [entries, setEntries] = useState<LootHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [truncated, setTruncated] = useState(false)
  const [phaseFilter, setPhaseFilter] = useState<number | 'all'>(initialPhase)
  const { showNotification } = useNotification()

  // Reset the phase scope to the parent's whenever the modal reopens for a player
  useEffect(() => {
    if (open) {
      setPhaseFilter(initialPhase)
    }
  }, [open, initialPhase, characterId, characterName])

  const fetchPlayerLoot = useCallback(async () => {
    if (!open) return
    setLoading(true)
    try {
      const params = new URLSearchParams({
        guild_id: guildId,
        limit: PLAYER_LOOT_LIMIT.toString(),
        offset: '0',
      })
      // Prefer exact character match; fall back to name for unlinked characters
      if (characterId) {
        params.append('character_id', characterId)
      } else {
        params.append('character', characterName)
      }
      if (phaseFilter !== 'all') {
        params.append('phase', String(phaseFilter))
      }

      const response = await fetch(`/api/loot-history?${params}`)
      const result = await response.json()

      if (!response.ok) {
        showNotification('error', result.error || 'Couldn\'t load this player\'s loot. Try again.')
        return
      }

      setEntries(result.data)
      setTruncated((result.pagination?.total ?? 0) > result.data.length)
    } catch (error) {
      console.error('Error fetching player loot:', error)
      showNotification('error', 'Couldn\'t load this player\'s loot. Try again.')
    } finally {
      setLoading(false)
    }
  }, [open, guildId, characterId, characterName, phaseFilter, showNotification])

  useEffect(() => {
    fetchPlayerLoot()
  }, [fetchPlayerLoot])

  useEffect(() => {
    if (entries.length > 0) {
      refreshWowheadTooltips(true)
    }
  }, [entries])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  // Group awards by raid, preserving the most-recent-first order from the API
  const groups: RaidGroup[] = []
  const groupIndex = new Map<string, number>()
  for (const entry of entries) {
    const raidName = entry.raid_tier_name || 'Unknown'
    if (!groupIndex.has(raidName)) {
      groupIndex.set(raidName, groups.length)
      groups.push({ raidName, items: [] })
    }
    groups[groupIndex.get(raidName)!].items.push(entry)
  }

  return (
    <Modal open={open} onClose={onClose} size="default">
      <ModalHeader onClose={onClose}>
        <ModalTitle>
          <span style={{ color: classColor || undefined }}>{characterName}</span>
          {"'s loot"}
        </ModalTitle>
        <ModalDescription>
          {loading
            ? 'Loading awards...'
            : `${entries.length} item${entries.length === 1 ? '' : 's'} received${phaseFilter === 'all' ? ' across all phases' : ''}`}
        </ModalDescription>
      </ModalHeader>
      <ModalBody>
        {/* Phase scope */}
        <div className="mb-4">
          <Label className="mb-2">Phase</Label>
          <Select
            variant="rounded"
            size="sm"
            value={phaseFilter === 'all' ? 'all' : String(phaseFilter)}
            onChange={(e) => setPhaseFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          >
            <option value="all">All phases</option>
            {availablePhases.map(phase => (
              <option key={phase} value={phase}>
                Phase {phase}
              </option>
            ))}
          </Select>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <EmptyState
            icon={FileSearchIcon}
            title="No loot here yet"
            description={
              phaseFilter === 'all'
                ? 'This player has not been awarded any items.'
                : 'No awards for this player in the selected phase.'
            }
            size="compact"
            variant="card"
          />
        ) : (
          <div className="space-y-5">
            {groups.map(group => (
              <div key={group.raidName}>
                <div className="flex items-center justify-between mb-2">
                  <Text size="sm" className="font-semibold text-foreground">{group.raidName}</Text>
                  <Text size="xs" color="muted">{group.items.length} item{group.items.length === 1 ? '' : 's'}</Text>
                </div>
                <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
                  {group.items.map(item => (
                    <div key={item.id} className="flex items-center justify-between gap-3 px-3 py-2">
                      <div className="min-w-0">
                        <ItemLink name={item.item_name} wowheadId={item.wowhead_id} />
                        <div className="text-[11px] text-muted-foreground truncate">
                          {item.boss_name}
                          {item.notes ? ` · ${item.notes}` : ''}
                        </div>
                      </div>
                      <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                        {formatDate(item.awarded_date)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {truncated && (
              <Text size="xs" color="muted">
                Showing the most recent {PLAYER_LOOT_LIMIT} awards. Narrow by phase to see older ones.
              </Text>
            )}
          </div>
        )}
      </ModalBody>
    </Modal>
  )
}

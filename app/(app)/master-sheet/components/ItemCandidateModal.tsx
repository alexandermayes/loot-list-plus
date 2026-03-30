'use client'

import { memo, useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import { Modal, ModalHeader, ModalTitle, ModalDescription, ModalBody } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import ItemLink from '@/app/components/ItemLink'
import type { ScoringConfig } from '@/domain/types'
import type { PlayerRanking, LootItem } from './BossSection'

interface ItemPriority {
  role_priorities: Record<string, number | null>
  class_priorities: Record<string, number | null>
  character_priorities: Record<string, number | null>
  priority_bonuses: { role: number; class: number; character: number }
  notes?: string | null
}

interface LootAward {
  character_name: string
  character_class_color: string | null
  awarded_date: string
  awarded_by_name: string | null
}

interface ItemCandidateModalProps {
  open: boolean
  onClose: () => void
  item: LootItem | null
  rankings: PlayerRanking[]
  priority: ItemPriority | null
  receivedCharacterIds: Set<string>
  guildSettings: Partial<ScoringConfig> & { decimal_places?: number; minimum_raid_days?: number }
  guildId: string | null
}

function PrioritySummary({ priority }: { priority: ItemPriority }) {
  const roles = Object.entries(priority.role_priorities)
    .filter(([, v]) => v != null)
    .sort(([, a], [, b]) => (a ?? 99) - (b ?? 99))
  const specs = Object.entries(priority.class_priorities)
    .filter(([, v]) => v != null)
    .sort(([, a], [, b]) => (a ?? 99) - (b ?? 99))
  const chars = Object.entries(priority.character_priorities)
    .filter(([, v]) => v != null)
    .sort(([, a], [, b]) => (a ?? 99) - (b ?? 99))

  if (roles.length === 0 && specs.length === 0 && chars.length === 0) return null

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
      {roles.length > 0 && (
        <span>
          <span className="text-foreground-secondary font-medium">Role:</span>{' '}
          {roles.map(([name, prio]) => `${name} (#${prio})`).join(', ')}
        </span>
      )}
      {specs.length > 0 && (
        <span>
          <span className="text-foreground-secondary font-medium">Spec:</span>{' '}
          {specs.map(([name, prio]) => `${name} (#${prio})`).join(', ')}
        </span>
      )}
      {chars.length > 0 && (
        <span>
          <span className="text-foreground-secondary font-medium">Character:</span>{' '}
          {chars.map(([name, prio]) => `${name} (#${prio})`).join(', ')}
        </span>
      )}
    </div>
  )
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export const ItemCandidateModal = memo(function ItemCandidateModal({
  open,
  onClose,
  item,
  rankings,
  priority,
  receivedCharacterIds,
  guildSettings,
  guildId,
}: ItemCandidateModalProps) {
  const decimalPlaces = guildSettings?.decimal_places ?? 2
  const [recentAwards, setRecentAwards] = useState<LootAward[]>([])
  const [awardsLoading, setAwardsLoading] = useState(false)

  // Fetch recent loot history for this item when modal opens
  useEffect(() => {
    if (!open || !item || !guildId) {
      setRecentAwards([])
      return
    }

    let cancelled = false
    setAwardsLoading(true)

    fetch(`/api/loot-history?guild_id=${guildId}&loot_item_id=${item.id}&limit=5`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (cancelled) return
        setRecentAwards(data?.data || [])
      })
      .catch(() => {
        if (!cancelled) setRecentAwards([])
      })
      .finally(() => {
        if (!cancelled) setAwardsLoading(false)
      })

    return () => { cancelled = true }
  }, [open, item?.id, guildId])

  const sortedRankings = useMemo(
    () => [...rankings].sort((a, b) => b.loot_score - a.loot_score),
    [rankings]
  )

  // Determine which score components are non-zero for any candidate to hide empty columns
  const visibleComponents = useMemo(() => {
    const has = {
      rankMod: false,
      roleBonus: false,
      prioBonus: false,
      blp: false,
      trialPen: false,
    }
    for (const r of sortedRankings) {
      if (r.role_modifier !== 0) has.rankMod = true
      if (r.role_bonus !== 0) has.roleBonus = true
      if (r.priority_bonus !== 0) has.prioBonus = true
      if (r.bad_luck_bonus !== 0) has.blp = true
      if (r.trial_penalty !== 0) has.trialPen = true
    }
    return has
  }, [sortedRankings])

  if (!item) return null

  return (
    <Modal open={open} onClose={onClose} size="full">
      <ModalHeader onClose={onClose}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <ModalTitle>
              <ItemLink name={item.name} wowheadId={item.wowhead_id} className="text-lg" />
            </ModalTitle>
            <ModalDescription>
              {item.boss_name} &middot; {item.item_slot}
              {priority && (
                <span className="ml-2 text-accent text-[12px]">Has priority rules</span>
              )}
            </ModalDescription>
          </div>
          <Link href="/loot-settings" onClick={onClose}>
            <Button variant="outline" size="sm" className="shrink-0">
              Edit priority
            </Button>
          </Link>
        </div>
      </ModalHeader>
      <ModalBody className="p-0">
        {/* Priority summary */}
        {priority && (
          <div className="px-6 py-3 border-b border-border bg-background-subtle space-y-1.5">
            <PrioritySummary priority={priority} />
            {priority.notes && (
              <p className="text-[12px] text-muted-foreground italic">
                {priority.notes}
              </p>
            )}
          </div>
        )}

        {/* Candidate count */}
        <div className="px-6 py-2 text-[12px] text-muted-foreground border-b border-border">
          {sortedRankings.length} candidate{sortedRankings.length !== 1 ? 's' : ''}
          {receivedCharacterIds.size > 0 && (
            <span className="ml-2">
              &middot; {receivedCharacterIds.size} already received
            </span>
          )}
        </div>

        {/* Candidate table */}
        {sortedRankings.length === 0 ? (
          <div className="px-6 py-8 text-center text-muted-foreground text-sm">
            No one has ranked this item.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-background-subtle text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  <th className="px-4 py-2 text-left w-8">#</th>
                  <th className="px-4 py-2 text-left">Candidate</th>
                  <th className="px-4 py-2 text-right">Score</th>
                  <th className="px-4 py-2 text-right" title="Item rank on their list">Rank</th>
                  <th className="px-4 py-2 text-right" title="Attendance score">Attend</th>
                  {visibleComponents.rankMod && <th className="px-4 py-2 text-right" title="Guild rank modifier">Rank mod</th>}
                  {visibleComponents.roleBonus && <th className="px-4 py-2 text-right" title="Raid role bonus">Role</th>}
                  {visibleComponents.prioBonus && <th className="px-4 py-2 text-right" title="Priority bonus">Prio</th>}
                  {visibleComponents.blp && <th className="px-4 py-2 text-right" title="Bad luck protection">BLP</th>}
                  {visibleComponents.trialPen && <th className="px-4 py-2 text-right" title="Trial penalty">Trial</th>}
                  <th className="px-4 py-2 text-right" title="Raids attended / total in window">Raids</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sortedRankings.map((r, i) => {
                  const hasReceived = receivedCharacterIds.has(r.character_id)
                  return (
                    <tr
                      key={r.character_id}
                      className={`transition-colors hover:bg-muted ${
                        !r.is_eligible ? 'opacity-50' : ''
                      } ${hasReceived ? 'bg-success/5' : ''}`}
                    >
                      <td className="px-4 py-2 text-muted-foreground text-[12px]">{i + 1}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium" style={{ color: r.class_color }}>
                            {r.player_name}
                          </span>
                          {r.is_trial && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-warning/20 text-warning">Trial</span>
                          )}
                          {!r.is_eligible && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-destructive/20 text-destructive">Ineligible</span>
                          )}
                          {hasReceived && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-success/20 text-success">Has item</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right font-semibold tabular-nums">
                        {r.loot_score.toFixed(decimalPlaces)}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">{r.rank}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                        {r.attendance_score.toFixed(decimalPlaces)}
                      </td>
                      {visibleComponents.rankMod && (
                        <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                          {r.role_modifier !== 0 ? (r.role_modifier > 0 ? '+' : '') + r.role_modifier.toFixed(decimalPlaces) : ''}
                        </td>
                      )}
                      {visibleComponents.roleBonus && (
                        <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                          {r.role_bonus !== 0 ? '+' + r.role_bonus.toFixed(decimalPlaces) : ''}
                        </td>
                      )}
                      {visibleComponents.prioBonus && (
                        <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                          {r.priority_bonus !== 0 ? '+' + r.priority_bonus.toFixed(decimalPlaces) : ''}
                        </td>
                      )}
                      {visibleComponents.blp && (
                        <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                          {r.bad_luck_bonus !== 0 ? '+' + r.bad_luck_bonus.toFixed(decimalPlaces) : ''}
                        </td>
                      )}
                      {visibleComponents.trialPen && (
                        <td className="px-4 py-2 text-right tabular-nums text-destructive">
                          {r.trial_penalty !== 0 ? r.trial_penalty.toFixed(decimalPlaces) : ''}
                        </td>
                      )}
                      <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                        {r.raids_attended}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Recent awards (audit receipt) */}
        <div className="px-6 py-4 border-t border-border bg-background-subtle">
          <p className="text-[12px] font-medium text-foreground-secondary uppercase tracking-wider mb-2">Recent awards</p>
          {awardsLoading ? (
            <p className="text-[12px] text-muted-foreground">Loading...</p>
          ) : recentAwards.length === 0 ? (
            <p className="text-[12px] text-muted-foreground">This item hasn't been awarded yet.</p>
          ) : (
            <div className="space-y-1">
              {recentAwards.map((award, i) => (
                <div key={i} className="flex items-center gap-2 text-[12px]">
                  <span className="text-muted-foreground tabular-nums">{formatDate(award.awarded_date)}</span>
                  <span className="text-muted-foreground">&rarr;</span>
                  <span className="font-medium" style={{ color: award.character_class_color || undefined }}>
                    {award.character_name}
                  </span>
                  {award.awarded_by_name && (
                    <span className="text-muted-foreground">by {award.awarded_by_name}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </ModalBody>
    </Modal>
  )
})

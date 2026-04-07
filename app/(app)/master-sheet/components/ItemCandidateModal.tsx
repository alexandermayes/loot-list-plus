'use client'

import { memo, useMemo, useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Modal, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Text } from '@/components/ui/typography'
import ItemLink from '@/app/components/ItemLink'
import { useNotification } from '@/app/contexts/NotificationContext'
import { explainScore } from '@/domain/scoring/explain'
import type { ScoringConfig, ScoreComponents } from '@/domain/types'
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
  notes: string | null
}

const AWARD_REASONS = [
  { value: '', label: 'No reason (score winner)' },
  { value: 'score', label: 'Score winner' },
  { value: 'loot_council', label: 'Loot council decision' },
  { value: 'override', label: 'Override (explain below)' },
  { value: 'offspec', label: 'Offspec / no contest' },
  { value: 'roll', label: 'Won roll (tied scores)' },
]

interface ItemCandidateModalProps {
  open: boolean
  onClose: () => void
  item: LootItem | null
  rankings: PlayerRanking[]
  priority: ItemPriority | null
  receivedCharacterIds: Set<string>
  guildSettings: Partial<ScoringConfig> & { decimal_places?: number; minimum_raid_days?: number }
  guildId: string | null
  isOfficer?: boolean
  raidTierId?: string | null
  mostRecentRaidEventId?: string | null
  onAwardComplete?: () => void
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

/** Reconstruct ScoreResult from flat PlayerRanking for explainScore() */
function rankingToExplanation(r: PlayerRanking, config?: Partial<ScoringConfig>) {
  const components: ScoreComponents = {
    itemRank: r.loot_score - r.attendance_score - r.role_modifier - r.role_bonus - r.priority_bonus - r.bad_luck_bonus - r.trial_penalty,
    attendanceScore: r.attendance_score,
    rankModifier: r.role_modifier,
    roleBonus: r.role_bonus,
    priorityBonus: r.priority_bonus,
    trialPenalty: r.trial_penalty,
    badLuckBonus: r.bad_luck_bonus,
  }
  return explainScore({ total: r.loot_score, components }, config)
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
  isOfficer,
  raidTierId,
  mostRecentRaidEventId,
  onAwardComplete,
}: ItemCandidateModalProps) {
  const decimalPlaces = guildSettings?.decimal_places ?? 2
  const [recentAwards, setRecentAwards] = useState<LootAward[]>([])
  const [awardsLoading, setAwardsLoading] = useState(false)

  // Award UI state
  const [awardingCandidate, setAwardingCandidate] = useState<PlayerRanking | null>(null)
  const [awardReason, setAwardReason] = useState('')
  const [awardNote, setAwardNote] = useState('')
  const [awarding, setAwarding] = useState(false)

  const { showNotification } = useNotification()

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

  // Reset award state when modal closes
  useEffect(() => {
    if (!open) {
      setAwardingCandidate(null)
      setAwardReason('')
      setAwardNote('')
    }
  }, [open])

  const handleAward = useCallback(async () => {
    if (!awardingCandidate || !item || !guildId) return
    setAwarding(true)

    const notes = [
      awardReason && awardReason !== '' ? AWARD_REASONS.find(r => r.value === awardReason)?.label : null,
      awardNote.trim() || null,
    ].filter(Boolean).join(': ')

    try {
      const res = await fetch('/api/loot-history/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guild_id: guildId,
          items: [{
            loot_item_id: item.id,
            raid_tier_id: raidTierId || null,
            raid_event_id: mostRecentRaidEventId || null,
            awarded_date: new Date().toISOString().split('T')[0],
            character_id: awardingCandidate.character_id,
            notes: notes || null,
          }],
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `HTTP ${res.status}`)
      }

      showNotification('success', `${item.name} awarded to ${awardingCandidate.player_name}`)
      setAwardingCandidate(null)
      setAwardReason('')
      setAwardNote('')

      // Refresh recent awards
      const refreshRes = await fetch(`/api/loot-history?guild_id=${guildId}&loot_item_id=${item.id}&limit=5`)
      if (refreshRes.ok) {
        const data = await refreshRes.json()
        setRecentAwards(data?.data || [])
      }

      onAwardComplete?.()
    } catch (err) {
      showNotification('error', `Failed to award: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setAwarding(false)
    }
  }, [awardingCandidate, item, guildId, raidTierId, mostRecentRaidEventId, awardReason, awardNote, showNotification, onAwardComplete])

  const sortedRankings = useMemo(
    () => [...rankings].sort((a, b) => b.loot_score - a.loot_score),
    [rankings]
  )

  // Generate inline explanations for top 3 candidates
  const topExplanations = useMemo(() => {
    const map = new Map<string, ReturnType<typeof rankingToExplanation>>()
    for (let i = 0; i < Math.min(3, sortedRankings.length); i++) {
      map.set(sortedRankings[i].character_id, rankingToExplanation(sortedRankings[i], guildSettings))
    }
    return map
  }, [sortedRankings, guildSettings])

  // Close-score analysis: group tied candidates and identify close contests
  const contestInfo = useMemo(() => {
    if (sortedRankings.length < 2) return null
    const threshold = Math.max(1, sortedRankings[0].loot_score * 0.1)

    // Find all candidates tied at #1
    const topScore = sortedRankings[0].loot_score
    const tiedAtTop = sortedRankings.filter(r => Math.abs(r.loot_score - topScore) < 0.01)

    // Find the next candidate after the tied group
    const nextAfterTied = sortedRankings[tiedAtTop.length]
    const gapToNext = nextAfterTied ? topScore - nextAfterTied.loot_score : Infinity

    // Get key differences between #1 and the closest non-tied candidate
    let keyDiffs: { key: string; label: string; diff: number }[] = []
    if (tiedAtTop.length === 1 && nextAfterTied) {
      const firstExp = topExplanations.get(sortedRankings[0].character_id)
      const secondExp = topExplanations.get(nextAfterTied.character_id)
      if (firstExp && secondExp) {
        keyDiffs = firstExp.lines.map(line => {
          const otherLine = secondExp.lines.find(l => l.key === line.key)
          return { key: line.key || '', label: line.label, diff: line.value - (otherLine?.value ?? 0) }
        }).filter(d => Math.abs(d.diff) > 0.001).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
      }
    }

    const isTied = tiedAtTop.length > 1
    const isClose = !isTied && gapToNext <= threshold

    if (!isTied && !isClose) return null

    return { tiedAtTop, nextAfterTied, gapToNext, isTied, isClose, keyDiffs }
  }, [sortedRankings, topExplanations])

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
              {item.classification && (
                <span className="ml-2 text-[12px] text-muted-foreground">({item.classification})</span>
              )}
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
              <Text size="sm" color="muted" className="italic">
                {priority.notes}
              </Text>
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

        {/* Contest indicator */}
        {contestInfo && (
          <div className="px-6 py-3 border-b border-border bg-warning/5">
            {contestInfo.isTied ? (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-warning">
                    {contestInfo.tiedAtTop.length}-way tie at {contestInfo.tiedAtTop[0].loot_score.toFixed(decimalPlaces)} pts
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
                  {contestInfo.tiedAtTop.map((r, i) => (
                    <span key={r.character_id} className="flex items-center gap-1">
                      {i > 0 && <span className="text-muted-foreground mr-1">&middot;</span>}
                      <span className="font-semibold" style={{ color: r.class_color }}>{r.player_name}</span>
                    </span>
                  ))}
                </div>
                <Text size="xs" color="muted" className="mt-1.5 text-warning">
                  Scores are identical. Consider a roll or loot council decision.
                </Text>
              </>
            ) : contestInfo.isClose && contestInfo.nextAfterTied ? (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-warning">
                    Close contest, {contestInfo.gapToNext.toFixed(decimalPlaces)} pts apart
                  </span>
                </div>
                <div className="flex items-center gap-4 text-[13px]">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">#1</span>
                    <span className="font-semibold" style={{ color: sortedRankings[0].class_color }}>
                      {sortedRankings[0].player_name}
                    </span>
                    <span className="font-bold tabular-nums">{sortedRankings[0].loot_score.toFixed(decimalPlaces)}</span>
                  </div>
                  <span className="text-muted-foreground">vs</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">#2</span>
                    <span className="font-semibold" style={{ color: contestInfo.nextAfterTied.class_color }}>
                      {contestInfo.nextAfterTied.player_name}
                    </span>
                    <span className="font-bold tabular-nums">{contestInfo.nextAfterTied.loot_score.toFixed(decimalPlaces)}</span>
                  </div>
                </div>
                {contestInfo.keyDiffs.length > 0 && (
                  <Text size="xs" color="muted" className="mt-1.5">
                    Key difference: <span className="text-foreground-secondary font-medium">{contestInfo.keyDiffs[0].label}</span>
                    {' '}({contestInfo.keyDiffs[0].diff > 0 ? '+' : ''}{contestInfo.keyDiffs[0].diff.toFixed(decimalPlaces)} for #1)
                    {contestInfo.keyDiffs.length > 1 && (
                      <span className="ml-1">
                        &middot; also: {contestInfo.keyDiffs.slice(1, 3).map(d => d.label).join(', ')}
                      </span>
                    )}
                  </Text>
                )}
              </>
            ) : null}
          </div>
        )}

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
                  {isOfficer && <th className="px-4 py-2 text-right w-20"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sortedRankings.map((r, i) => {
                  const hasReceived = receivedCharacterIds.has(r.character_id)
                  const explanation = topExplanations.get(r.character_id)
                  const isConfirming = awardingCandidate?.character_id === r.character_id
                  return (
                    <tr
                      key={r.character_id}
                      className={`group transition-colors hover:bg-muted ${
                        !r.is_eligible ? 'opacity-50' : ''
                      } ${hasReceived ? 'bg-success/5' : ''} ${isConfirming ? 'bg-accent/10' : ''}`}
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
                        {/* Inline score explanation for top 3 */}
                        {explanation && (
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                            {explanation.lines.map(line => (
                              <span key={line.key} className="text-[10px] text-muted-foreground">
                                {line.label}: <span className={`font-medium ${line.value > 0 ? 'text-foreground-secondary' : line.value < 0 ? 'text-destructive' : ''}`}>
                                  {line.value > 0 ? '+' : ''}{line.value.toFixed(decimalPlaces)}
                                </span>
                                {line.context ? ` (${line.context})` : ''}
                              </span>
                            ))}
                          </div>
                        )}
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
                      {isOfficer && (
                        <td className="px-4 py-2 text-right">
                          <Button
                            variant={isConfirming ? 'outline' : 'primary'}
                            size="sm"
                            className={`text-[11px] h-7 px-3 ${isConfirming ? '' : 'opacity-0 group-hover:opacity-100 transition-opacity'}`}
                            onClick={() => setAwardingCandidate(isConfirming ? null : r)}
                          >
                            {isConfirming ? 'Cancel' : 'Award'}
                          </Button>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Award confirmation panel */}
        {awardingCandidate && (
          <div className="px-6 py-4 border-t border-accent/30 bg-accent/5">
            <div className="flex items-center gap-3 mb-2">
              <Text size="sm" className="font-medium">
                Award <ItemLink name={item.name} wowheadId={item.wowhead_id} className="text-sm" /> to{' '}
                <span style={{ color: awardingCandidate.class_color }}>{awardingCandidate.player_name}</span>
              </Text>
            </div>
            {/* BLP status */}
            {(guildSettings as any)?.blp_enabled && (
              <Text size="xs" color="muted" className="mb-2">
                {awardingCandidate.bad_luck_bonus > 0
                  ? `${awardingCandidate.player_name}'s BLP (+${awardingCandidate.bad_luck_bonus.toFixed(decimalPlaces)}) will reset.`
                  : `${awardingCandidate.player_name} has no BLP on this item.`
                }
                {' '}Other candidates' BLP will increase.
              </Text>
            )}
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-52">
                <Text size="xs" color="muted" className="mb-1">Reason</Text>
                <Select
                  variant="rounded"
                  size="sm"
                  value={awardReason}
                  onChange={(e) => setAwardReason(e.target.value)}
                >
                  {AWARD_REASONS.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </Select>
              </div>
              {(awardReason === 'override' || awardReason === 'loot_council') && (
                <div className="flex-1 min-w-[200px]">
                  <Text size="xs" color="muted" className="mb-1">Note</Text>
                  <Input
                    size="sm"
                    variant="rounded"
                    placeholder="Explain the decision..."
                    value={awardNote}
                    onChange={(e) => setAwardNote(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAward() }}
                  />
                </div>
              )}
              <Button
                variant="primary"
                size="sm"
                loading={awarding}
                onClick={handleAward}
              >
                Confirm award
              </Button>
            </div>
          </div>
        )}

        {/* Recent awards (audit receipt) */}
        <div className="px-6 py-4 border-t border-border bg-background-subtle">
          <Text size="sm" color="secondary" className="font-medium uppercase tracking-wider mb-2">Recent awards</Text>
          {awardsLoading ? (
            <Text size="sm" color="muted">Loading...</Text>
          ) : recentAwards.length === 0 ? (
            <Text size="sm" color="muted">This item hasn't been awarded yet.</Text>
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
                  {award.notes && (
                    <span className="text-muted-foreground/70 italic">&middot; {award.notes}</span>
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

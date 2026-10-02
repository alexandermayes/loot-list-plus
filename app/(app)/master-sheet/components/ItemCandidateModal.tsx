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
import { toDateString } from '@/utils/date'
import type {
  ScoringConfig,
  ScoreComponents,
  AwardReason,
  AwardOutcomeType,
  DecisionCandidateSummary,
  DecisionContext,
} from '@/domain/types'
import type { PlayerRanking, LootItem } from './BossSection'
import { rankingEntryKey, bestEntryPerCharacter } from '@/domain/loot/ranking-entries'
import { readAwardResult } from '@/domain/loot/award-copies'

interface ItemPriority {
  role_priorities: Record<string, number | null>
  class_priorities: Record<string, number | null>
  character_priorities: Record<string, number | null>
  priority_bonuses: { role: number; class: number; character: number }
  notes?: string | null
}

interface LootAward {
  id: string
  character_name: string
  character_class_color: string | null
  awarded_date: string
  awarded_by_name: string | null
  notes: string | null
}

const AWARD_REASONS: { value: AwardReason; label: string }[] = [
  { value: '', label: 'No reason (score winner)' },
  { value: 'score', label: 'Score winner' },
  { value: 'loot_council', label: 'Loot council decision' },
  { value: 'override', label: 'Override (explain below)' },
  { value: 'offspec', label: 'Offspec / no contest' },
  { value: 'roll', label: 'Won roll (tied scores)' },
]

/** Default empty reason ('' / 'score') resolves to 'score'; everything else passes through. */
function reasonToOutcome(reason: AwardReason): AwardOutcomeType {
  if (reason === '' || reason === 'score') return 'score'
  return reason
}

/** Build ScoreComponents from a flat PlayerRanking (itemRank derived by subtraction). */
function rankingToComponents(r: PlayerRanking): ScoreComponents {
  return {
    itemRank:
      r.loot_score -
      r.attendance_score -
      r.role_modifier -
      r.role_bonus -
      r.priority_bonus -
      r.bad_luck_bonus -
      r.trial_penalty -
      r.donation_bonus -
      r.raider_bonus,
    attendanceScore: r.attendance_score,
    rankModifier: r.role_modifier,
    roleBonus: r.role_bonus,
    priorityBonus: r.priority_bonus,
    trialPenalty: r.trial_penalty,
    badLuckBonus: r.bad_luck_bonus,
    donationBonus: r.donation_bonus,
    raiderBonus: r.raider_bonus,
  }
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
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-12 text-muted-foreground">
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
  return explainScore({ total: r.loot_score, components: rankingToComponents(r) }, config)
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
  const [awardReason, setAwardReason] = useState<AwardReason>('')
  const [awardNote, setAwardNote] = useState('')
  const [awarding, setAwarding] = useState(false)
  const [undoingAwardId, setUndoingAwardId] = useState<string | null>(null)
  // FU-1 of #331, #293: set when the server reports the candidate already
  // has this item on this raid night; confirming then sends this copy.
  const [extraCopy, setExtraCopy] = useState<{ entryKey: string; awardCopy: number } | null>(null)

  // Choosing or clearing a candidate always drops a pending extra-copy prompt.
  const selectCandidate = useCallback((candidate: PlayerRanking | null) => {
    setAwardingCandidate(candidate)
    setExtraCopy(null)
  }, [])
  const showExtraCopyPrompt =
    !!extraCopy && !!awardingCandidate && extraCopy.entryKey === rankingEntryKey(awardingCandidate)

  // Override requires a non-empty note (trust feature: every override leaves a paper trail).
  const noteRequired = awardReason === 'override'
  const noteMissing = noteRequired && awardNote.trim().length === 0

  const sortedRankings = useMemo(
    () => [...rankings].sort((a, b) => b.loot_score - a.loot_score),
    [rankings]
  )

  // A raider can hold more than one entry for an item (GH #293). Ties, the
  // contest banner, the award snapshot and the candidate count compare
  // raiders by their best entry so nobody ties with or contests themselves.
  const bestRankings = useMemo(() => bestEntryPerCharacter(sortedRankings), [sortedRankings])

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
      setExtraCopy(null)
    }
  }, [open])


  const handleAward = useCallback(async () => {
    if (!awardingCandidate || !item || !guildId) return
    if (noteMissing) return
    setAwarding(true)

    const note = awardNote.trim() || null
    const entryKey = rankingEntryKey(awardingCandidate)
    const awardCopy = extraCopy && extraCopy.entryKey === entryKey ? extraCopy.awardCopy : undefined

    // Build a structured decision snapshot at award time. The server includes
    // this in audit_logs.new_data so we can answer "why this person won" later
    // without rerunning scoring or pulling stale rankings.
    const topScore = bestRankings[0]?.loot_score ?? awardingCandidate.loot_score
    const second = bestRankings[1]
    const tiedAtTop = !!second && Math.abs(topScore - second.loot_score) < 0.01
    const gapToNext = second ? topScore - second.loot_score : null
    const wasScoreWinner = Math.abs(awardingCandidate.loot_score - topScore) < 0.01

    const topCandidates: DecisionCandidateSummary[] = bestRankings.slice(0, 3).map(r => ({
      character_id: r.character_id,
      player_name: r.player_name,
      loot_score: r.loot_score,
      is_trial: r.is_trial,
      is_eligible: r.is_eligible,
      has_received: receivedCharacterIds.has(r.character_id),
      bad_luck_bonus: r.bad_luck_bonus,
      components: rankingToComponents(r),
    }))

    const decisionContext: DecisionContext = {
      outcome_type: reasonToOutcome(awardReason),
      was_score_winner: wasScoreWinner,
      tied_at_top: tiedAtTop,
      gap_to_next: gapToNext,
      awarded_character_id: awardingCandidate.character_id,
      winner_score: awardingCandidate.loot_score,
      winner_components: rankingToComponents(awardingCandidate),
      top_candidates: topCandidates,
    }

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
            awarded_date: toDateString(new Date()),
            character_id: awardingCandidate.character_id,
            // Server composes `loot_history.notes` from reason + note when these are present.
            reason: awardReason || null,
            note,
            decision_context: decisionContext,
            ...(awardCopy !== undefined ? { award_copy: awardCopy } : {}),
          }],
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `HTTP ${res.status}`)
      }

      // The route answers 200 with a per-item result, so a duplicate or a
      // failed insert must be read from the body, not from res.ok.
      const result = readAwardResult(await res.json().catch(() => ({})))
      // A duplicate of an explicit copy means that copy is already recorded
      // (a resend of the same confirm), so it counts as success below.
      if (result.kind === 'duplicate' && awardCopy === undefined) {
        if (typeof result.nextAwardCopy === 'number') {
          setExtraCopy({ entryKey, awardCopy: result.nextAwardCopy })
          return
        }
        if (result.nextAwardCopy === null) {
          showNotification('error', `${awardingCandidate.player_name} already has 10 copies of ${item.name} from this raid night.`)
          return
        }
        throw new Error('duplicate')
      }
      if (result.kind === 'failed') throw new Error(result.message)

      showNotification('success', `${item.name} awarded to ${awardingCandidate.player_name}`)
      setAwardingCandidate(null)
      setExtraCopy(null)
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
  }, [awardingCandidate, item, guildId, raidTierId, mostRecentRaidEventId, awardReason, awardNote, noteMissing, extraCopy, bestRankings, receivedCharacterIds, showNotification, onAwardComplete])

  // Keyboard shortcuts: Enter to confirm award, Escape to cancel
  useEffect(() => {
    if (!awardingCandidate || !open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey && !awarding && !noteMissing) {
        e.preventDefault()
        handleAward()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        selectCandidate(null)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [awardingCandidate, open, awarding, noteMissing, handleAward, selectCandidate])

  const handleUndoAward = useCallback(async (award: LootAward) => {
    if (!guildId) return
    setUndoingAwardId(award.id)
    try {
      const res = await fetch('/api/loot-history/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guild_id: guildId, ids: [award.id] }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      showNotification('success', `Award to ${award.character_name} removed`)
      // Refresh recent awards
      const refreshRes = await fetch(`/api/loot-history?guild_id=${guildId}&loot_item_id=${item?.id}&limit=5`)
      if (refreshRes.ok) {
        const data = await refreshRes.json()
        setRecentAwards(data?.data || [])
      }
      onAwardComplete?.()
    } catch (err) {
      showNotification('error', `Failed to undo: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setUndoingAwardId(null)
    }
  }, [guildId, item?.id, showNotification, onAwardComplete])

  // Generate inline explanations for the top 3 entries, keyed per entry
  const topExplanations = useMemo(() => {
    const map = new Map<string, ReturnType<typeof rankingToExplanation>>()
    for (let i = 0; i < Math.min(3, sortedRankings.length); i++) {
      map.set(rankingEntryKey(sortedRankings[i]), rankingToExplanation(sortedRankings[i], guildSettings))
    }
    return map
  }, [sortedRankings, guildSettings])

  // Close-score analysis: group tied candidates and identify close contests
  // Raiders are compared by their best entry (bestRankings).
  const contestInfo = useMemo(() => {
    if (bestRankings.length < 2) return null
    const threshold = Math.max(1, bestRankings[0].loot_score * 0.1)

    // Find all candidates tied at #1
    const topScore = bestRankings[0].loot_score
    const tiedAtTop = bestRankings.filter(r => Math.abs(r.loot_score - topScore) < 0.01)

    // Find the next candidate after the tied group
    const nextAfterTied = bestRankings[tiedAtTop.length]
    const gapToNext = nextAfterTied ? topScore - nextAfterTied.loot_score : Infinity

    // Get key differences between #1 and the closest non-tied candidate
    let keyDiffs: { key: string; label: string; diff: number }[] = []
    if (tiedAtTop.length === 1 && nextAfterTied) {
      const explain = (r: PlayerRanking) =>
        topExplanations.get(rankingEntryKey(r)) ?? rankingToExplanation(r, guildSettings)
      const firstExp = explain(bestRankings[0])
      const secondExp = explain(nextAfterTied)
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
  }, [bestRankings, topExplanations, guildSettings])

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
                <span className="ml-2 text-12 text-muted-foreground">({item.classification})</span>
              )}
              {priority && (
                <span className="ml-2 text-accent text-12">Has priority rules</span>
              )}
            </ModalDescription>
          </div>
          <Link href="/loot-management" onClick={onClose}>
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
        <div className="px-6 py-2 text-12 text-muted-foreground border-b border-border">
          {bestRankings.length} candidate{bestRankings.length !== 1 ? 's' : ''}
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
                  <span className="text-11 font-medium uppercase tracking-wider text-warning">
                    {contestInfo.tiedAtTop.length}-way tie at <span className="tabular-nums">{contestInfo.tiedAtTop[0].loot_score.toFixed(decimalPlaces)}</span> pts
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-13">
                  {contestInfo.tiedAtTop.map((r, i) => (
                    <span key={rankingEntryKey(r)} className="flex items-center gap-1">
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
                  <span className="text-11 font-medium uppercase tracking-wider text-warning">
                    Close contest, <span className="tabular-nums">{contestInfo.gapToNext.toFixed(decimalPlaces)}</span> pts apart
                  </span>
                </div>
                <div className="flex items-center gap-4 text-13">
                  <div className="flex items-center gap-2">
                    <span className="text-11 text-muted-foreground">#1</span>
                    <span className="font-semibold" style={{ color: sortedRankings[0].class_color }}>
                      {sortedRankings[0].player_name}
                    </span>
                    <span className="font-bold tabular-nums">{sortedRankings[0].loot_score.toFixed(decimalPlaces)}</span>
                  </div>
                  <span className="text-muted-foreground">vs</span>
                  <div className="flex items-center gap-2">
                    <span className="text-11 text-muted-foreground">#2</span>
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
            <table className="w-full text-13">
              <thead>
                <tr className="bg-background-subtle text-11 font-medium text-muted-foreground uppercase tracking-wider">
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
                  const entryKey = rankingEntryKey(r)
                  const explanation = topExplanations.get(entryKey)
                  const isConfirming = !!awardingCandidate && rankingEntryKey(awardingCandidate) === entryKey
                  return (
                    <tr
                      key={entryKey}
                      className={`group transition-colors hover:bg-muted ${
                        !r.is_eligible ? 'opacity-50' : ''
                      } ${hasReceived ? 'bg-success/5' : ''} ${isConfirming ? 'bg-accent/10' : ''}`}
                    >
                      <td className="px-4 py-2 text-muted-foreground text-12">{i + 1}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium" style={{ color: r.class_color }}>
                            {r.player_name}
                          </span>
                          {r.is_trial && (
                            <span className="text-11 font-medium px-1.5 py-0.5 rounded bg-warning/20 text-warning">Trial</span>
                          )}
                          {!r.is_eligible && (
                            <span className="text-11 font-medium px-1.5 py-0.5 rounded bg-destructive/20 text-destructive">Ineligible</span>
                          )}
                          {hasReceived && (
                            <span className="text-11 font-medium px-1.5 py-0.5 rounded bg-success/20 text-success">Has item</span>
                          )}
                        </div>
                        {/* Inline score explanation for top 3 */}
                        {explanation && (
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                            {explanation.lines.map(line => (
                              <span key={line.key} className="text-11 text-muted-foreground">
                                {line.label}: <span className={`font-medium tabular-nums ${line.value > 0 ? 'text-foreground-secondary' : line.value < 0 ? 'text-destructive' : ''}`}>
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
                            className={`text-11 h-7 px-3 ${isConfirming ? '' : 'opacity-0 group-hover:opacity-100 transition-opacity'}`}
                            onClick={() => selectCandidate(isConfirming ? null : r)}
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
            {guildSettings?.blp_enabled && (
              <Text size="xs" color="muted" className="mb-2">
                {awardingCandidate.bad_luck_bonus > 0
                  ? `${awardingCandidate.player_name}'s BLP (+${awardingCandidate.bad_luck_bonus.toFixed(decimalPlaces)}) will reset.`
                  : `${awardingCandidate.player_name} has no BLP on this item.`
                }
                {' '}Other candidates&apos; BLP will increase.
              </Text>
            )}
            {showExtraCopyPrompt && (
              <Text size="xs" className="mb-2 text-warning">
                {`${awardingCandidate.player_name} already received ${item.name} on this raid night. Award another copy?`}
              </Text>
            )}
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-52">
                <Text size="xs" color="muted" className="mb-1">Reason</Text>
                <Select
                  variant="rounded"
                  size="sm"
                  value={awardReason}
                  onChange={(e) => setAwardReason(e.target.value as AwardReason)}
                >
                  {AWARD_REASONS.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </Select>
              </div>
              {(awardReason === 'override' || awardReason === 'loot_council') && (
                <div className="flex-1 min-w-[200px]">
                  <Text size="xs" color="muted" className="mb-1">
                    Note {noteRequired && <span className="text-destructive">(required)</span>}
                  </Text>
                  <Input
                    size="sm"
                    variant="rounded"
                    placeholder={noteRequired ? 'Explain the override...' : 'Explain the decision...'}
                    value={awardNote}
                    onChange={(e) => setAwardNote(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !noteMissing) handleAward() }}
                  />
                </div>
              )}
              <Button
                variant="primary"
                size="sm"
                loading={awarding}
                disabled={noteMissing}
                onClick={handleAward}
              >
                {showExtraCopyPrompt ? 'Award another copy' : 'Confirm award'}
              </Button>
              <Text size="xs" color="muted" className="hidden sm:block">Enter to confirm, Esc to cancel</Text>
            </div>
          </div>
        )}

        {/* Recent awards (audit receipt) */}
        <div className="px-6 py-4 border-t border-border bg-background-subtle">
          <Text size="sm" color="secondary" className="font-medium uppercase tracking-wider mb-2">Recent awards</Text>
          {awardsLoading ? (
            <Text size="sm" color="muted">Loading...</Text>
          ) : recentAwards.length === 0 ? (
            <Text size="sm" color="muted">This item hasn&apos;t been awarded yet.</Text>
          ) : (
            <div className="space-y-1">
              {recentAwards.map((award) => (
                <div key={award.id} className="group flex items-center gap-2 text-12">
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
                  {isOfficer && (
                    <button
                      onClick={() => handleUndoAward(award)}
                      disabled={undoingAwardId === award.id}
                      className="ml-auto text-11 text-destructive/70 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                    >
                      {undoingAwardId === award.id ? 'Removing...' : 'Undo'}
                    </button>
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

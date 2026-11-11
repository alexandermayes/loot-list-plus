'use client'

import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
} from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { HugeiconsIcon } from '@hugeicons/react'
import type { IconSvgElement } from '@hugeicons/react'
import {
  Target01Icon,
  Calendar03Icon,
  UserIcon,
  SparklesIcon,
  Award01Icon,
  InformationCircleIcon,
  Time01Icon,
  Shield01Icon,
} from '@hugeicons/core-free-icons'
import { toScoreResult } from '@/domain/scoring/engine'
import { explainScore } from '@/domain/scoring/explain'
import { ScoreSplit, formatScoreValue } from '@/app/components/ScoreSplit'
import type { ScoreResult, ScoreComponents, ScoreLine, ScoringConfig } from '@/domain/types'

interface PlayerRanking {
  player_name: string
  class_name: string
  class_color: string
  loot_score: number
  rank: number
  attendance_score: number
  role_modifier: number
  role_bonus: number
  priority_bonus: number
  bad_luck_bonus: number
  trial_penalty: number
  donation_bonus: number
  raider_bonus: number
  is_trial: boolean
  character_id: string
}

interface ScoreComparisonModalProps {
  open: boolean
  onClose: () => void
  itemName: string
  userRanking: PlayerRanking | null
  winnerRanking: PlayerRanking | null
  /** The guild's decimal places setting. Defaults to 2, the guild default. */
  decimalPlaces?: number
  /** The guild's scoring settings, so a sentence can say "attendance 3 of 10". */
  config?: Partial<ScoringConfig>
}

/** Reconstruct a ScoreResult from flat PlayerRanking fields */
function rankingToScoreResult(r: PlayerRanking): ScoreResult {
  const components: ScoreComponents = {
    itemRank: r.rank,
    attendanceScore: r.attendance_score,
    rankModifier: r.role_modifier,
    roleBonus: r.role_bonus,
    badLuckBonus: r.bad_luck_bonus,
    priorityBonus: r.priority_bonus,
    trialPenalty: r.trial_penalty,
    donationBonus: r.donation_bonus,
    raiderBonus: r.raider_bonus,
  }
  return toScoreResult(r.loot_score, components)
}

/** Icon + color per component key (UI concern, not domain) */
const COMPONENT_STYLES: Record<string, { icon: IconSvgElement; iconColor: string }> = {
  itemRank: { icon: Target01Icon, iconColor: 'bg-yellow-500/20 text-yellow-500' },
  attendance: { icon: Calendar03Icon, iconColor: 'bg-blue-500/20 text-blue-500' },
  rankModifier: { icon: UserIcon, iconColor: 'bg-accent/20 text-accent' },
  roleBonus: { icon: Shield01Icon, iconColor: 'bg-cyan-500/20 text-cyan-500' },
  badLuckBonus: { icon: SparklesIcon, iconColor: 'bg-red-500/20 text-red-500' },
  priorityBonus: { icon: Award01Icon, iconColor: 'bg-green-500/20 text-green-500' },
  trialPenalty: { icon: Time01Icon, iconColor: 'bg-yellow-500/20 text-yellow-500' },
}

/** Diff column text and colour; a diff that rounds to zero reads as a plain 0. */
function formatDiff(diff: number, decimalPlaces: number): { text: string; color: string } {
  const formatted = formatScoreValue(diff, decimalPlaces)
  if (Number(formatted) === 0) return { text: '0', color: 'text-muted-foreground' }
  return {
    text: diff > 0 ? `+${formatted}` : formatted,
    color: diff > 0 ? 'text-destructive' : 'text-success',
  }
}

function ScoreRow({
  label,
  icon,
  iconColor,
  userValue,
  winnerValue,
  decimalPlaces,
}: {
  label: string
  icon: IconSvgElement
  iconColor: string
  userValue: number
  winnerValue: number
  decimalPlaces: number
}) {
  const diff = formatDiff(winnerValue - userValue, decimalPlaces)

  return (
    <div role="row" className="flex items-center gap-3 py-2">
      <div className={`w-6 h-6 rounded-full ${iconColor} flex items-center justify-center flex-shrink-0`} aria-hidden="true">
        <HugeiconsIcon icon={icon} size={14} className="text-current opacity-80" />
      </div>
      <span role="rowheader" className="text-foreground-secondary text-13 flex-1 min-w-0">{label}</span>
      <span role="cell" className="text-foreground font-medium text-13 w-16 text-right tabular-nums">
        {formatScoreValue(userValue, decimalPlaces)}
      </span>
      <span role="cell" className="text-foreground font-medium text-13 w-16 text-right tabular-nums">
        {formatScoreValue(winnerValue, decimalPlaces)}
      </span>
      <span role="cell" className={`${diff.color} font-medium text-12 w-12 text-right tabular-nums`}>
        {diff.text}
      </span>
    </div>
  )
}

/** Header row for a group of rows; it carries the group's subtotal in the three number columns. */
function GroupHeaderRow({
  label,
  userValue,
  winnerValue,
  decimalPlaces,
}: {
  label: string
  userValue: number
  winnerValue: number
  decimalPlaces: number
}) {
  const diff = formatDiff(winnerValue - userValue, decimalPlaces)

  return (
    <div role="row" className="flex items-center gap-3 py-2 bg-background-elevated/50">
      <span role="rowheader" className="text-foreground text-12 uppercase tracking-wide font-semibold flex-1 min-w-0">
        {label}
      </span>
      <span role="cell" className="text-foreground font-semibold text-13 w-16 text-right tabular-nums">
        {formatScoreValue(userValue, decimalPlaces)}
      </span>
      <span role="cell" className="text-foreground font-semibold text-13 w-16 text-right tabular-nums">
        {formatScoreValue(winnerValue, decimalPlaces)}
      </span>
      <span role="cell" className={`${diff.color} font-semibold text-12 w-12 text-right tabular-nums`}>
        {diff.text}
      </span>
    </div>
  )
}

/** One component row with its icon looked up from the key. */
function ComponentRow({
  componentKey,
  label,
  userValue,
  winnerValue,
  decimalPlaces,
}: {
  componentKey: string
  label: string
  userValue: number
  winnerValue: number
  decimalPlaces: number
}) {
  const style = COMPONENT_STYLES[componentKey] || { icon: InformationCircleIcon, iconColor: 'bg-muted text-muted-foreground' }
  return (
    <ScoreRow
      label={label}
      icon={style.icon}
      iconColor={style.iconColor}
      userValue={userValue}
      winnerValue={winnerValue}
      decimalPlaces={decimalPlaces}
    />
  )
}

/** Generate a contextual tip based on the biggest gap between two explanations */
function getTip(userLines: ScoreLine[], winnerLines: ScoreLine[], userRanking: PlayerRanking, totalDiff: number): string {
  // Build a gap map by key
  const winnerMap = new Map(winnerLines.map(l => [l.key, l.value]))
  const gaps = userLines.map(l => ({
    key: l.key || '',
    label: l.label,
    diff: (winnerMap.get(l.key!) || 0) - l.value,
  }))

  const biggestGap = gaps.reduce((max, gap) => gap.diff > max.diff ? gap : max, gaps[0])

  if (totalDiff < 1) {
    return "You were neck and neck. With scores this close, it often comes down to the roll."
  }

  if (biggestGap.key === 'attendance' && biggestGap.diff > 1) {
    return "Attendance made the difference here. Staying consistent with raids will help your score over time."
  }

  if (biggestGap.key === 'itemRank' && biggestGap.diff >= 2) {
    return "They ranked this item higher than you did. For future tiers, consider how you prioritize your most-wanted items."
  }

  if (biggestGap.key === 'priorityBonus' && biggestGap.diff > 0) {
    return "This item has priority set for certain roles or specs. The winner matched a priority that gave them a boost."
  }

  if (biggestGap.key === 'rankModifier' && biggestGap.diff > 0) {
    return "Guild rank contributed to their score. This reflects their role and responsibilities in the guild."
  }

  if (biggestGap.key === 'roleBonus' && biggestGap.diff > 0) {
    return "Their raid role (Tank, Healer, DPS) has a higher bonus configured. This is set by officers in loot settings."
  }

  if (biggestGap.key === 'trialPenalty' && userRanking.is_trial) {
    return "Your trial status applies a penalty to your score. Once promoted to full member, this penalty will be removed."
  }

  return "Keep showing up consistently and you'll be well-positioned for future drops."
}

export default function ScoreComparisonModal({
  open,
  onClose,
  itemName,
  userRanking,
  winnerRanking,
  decimalPlaces = 2,
  config = {},
}: ScoreComparisonModalProps) {
  if (!userRanking || !winnerRanking) return null

  // Generate explanations from canonical engine path. The raider reads their own
  // sentences in "your" voice and the winner's in "their" voice.
  const userExplanation = explainScore(rankingToScoreResult(userRanking), config, { voice: 'self', decimalPlaces })
  const winnerExplanation = explainScore(rankingToScoreResult(winnerRanking), config, { voice: 'other', decimalPlaces })

  // Merge lines by key for side-by-side comparison
  // Use the union of both explanations' keys (one may have lines the other doesn't)
  const allKeys = new Map<string, { label: string; userValue: number; winnerValue: number }>()
  for (const line of userExplanation.lines) {
    allKeys.set(line.key!, { label: line.label, userValue: line.value, winnerValue: 0 })
  }
  for (const line of winnerExplanation.lines) {
    const existing = allKeys.get(line.key!)
    if (existing) {
      existing.winnerValue = line.value
    } else {
      allKeys.set(line.key!, { label: line.label, userValue: 0, winnerValue: line.value })
    }
  }

  // Standing is every component except item rank; interest is the item rank row.
  const standingRows = [...allKeys.entries()].filter(([key]) => key !== 'itemRank')
  const interestRows = [...allKeys.entries()].filter(([key]) => key === 'itemRank')

  const scoreDiff = winnerRanking.loot_score - userRanking.loot_score
  const tip = getTip(userExplanation.lines, winnerExplanation.lines, userRanking, scoreDiff)

  return (
    <Modal open={open} onClose={onClose} size="default">
      <ModalHeader onClose={onClose}>
        <ModalTitle>Why didn&apos;t I get this item?</ModalTitle>
        <ModalDescription>{itemName}</ModalDescription>
      </ModalHeader>
      <ModalBody className="space-y-4">
        {/* Score Summary: stacked on a phone, side by side from sm */}
        <div className="flex flex-col sm:flex-row gap-4">
          <section
            aria-label="Your score breakdown"
            className="flex-1 min-w-0 bg-background-subtle border border-border rounded-lg p-3"
          >
            <p className="text-13 mb-2 truncate" style={{ color: userRanking.class_color }}>
              {userRanking.player_name}
            </p>
            <ScoreSplit
              variant="tiles"
              standing={userExplanation.standing}
              interest={userExplanation.interest}
              total={userRanking.loot_score}
              decimalPlaces={decimalPlaces}
              totalLabel="Your score"
            />
          </section>

          <section
            aria-label="Winner's score breakdown"
            className="flex-1 min-w-0 bg-accent/10 border border-accent/30 rounded-lg p-3"
          >
            <p className="text-13 mb-2 truncate" style={{ color: winnerRanking.class_color }}>
              {winnerRanking.player_name}
            </p>
            <ScoreSplit
              variant="tiles"
              standing={winnerExplanation.standing}
              interest={winnerExplanation.interest}
              total={winnerRanking.loot_score}
              decimalPlaces={decimalPlaces}
              totalLabel="Winner's score"
            />
          </section>
        </div>

        {/* Difference Badge */}
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-destructive/10 border border-destructive/20 rounded-full text-destructive text-12 font-medium tabular-nums">
            -{formatScoreValue(scoreDiff, decimalPlaces)} points behind
          </span>
        </div>

        {/* Detailed Breakdown, grouped under Standing and Interest */}
        <div role="table" aria-label="Component comparison" className="bg-background-subtle border border-border rounded-lg p-4">
          <div role="row" className="flex items-center gap-3 mb-3 pb-2 border-b border-border">
            <span role="columnheader" className="text-muted-foreground text-12 uppercase tracking-wide flex-1">Component</span>
            <span role="columnheader" className="text-muted-foreground text-12 uppercase tracking-wide w-16 text-right">You</span>
            <span role="columnheader" className="text-muted-foreground text-12 uppercase tracking-wide w-16 text-right">Winner</span>
            <span role="columnheader" className="text-muted-foreground text-12 uppercase tracking-wide w-12 text-right">Diff</span>
          </div>

          <div role="rowgroup">
            <GroupHeaderRow
              label="Standing"
              userValue={userExplanation.standing.value}
              winnerValue={winnerExplanation.standing.value}
              decimalPlaces={decimalPlaces}
            />
            <div className="divide-y divide-border/50">
              {standingRows.map(([key, { label, userValue, winnerValue }]) => (
                <ComponentRow key={key} componentKey={key} label={label} userValue={userValue} winnerValue={winnerValue} decimalPlaces={decimalPlaces} />
              ))}
            </div>
          </div>

          <div role="rowgroup" className="mt-2">
            <GroupHeaderRow
              label="Interest"
              userValue={userExplanation.interest.value}
              winnerValue={winnerExplanation.interest.value}
              decimalPlaces={decimalPlaces}
            />
            <div className="divide-y divide-border/50">
              {interestRows.map(([key, { label, userValue, winnerValue }]) => (
                <ComponentRow key={key} componentKey={key} label={label} userValue={userValue} winnerValue={winnerValue} decimalPlaces={decimalPlaces} />
              ))}
            </div>
          </div>
        </div>

        {/* Tip */}
        <div className="flex items-start gap-3 p-4 bg-accent/5 border border-accent/20 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
            <HugeiconsIcon icon={InformationCircleIcon} size={18} className="text-accent" />
          </div>
          <div>
            <p className="text-foreground font-medium text-13 mb-0.5">Tip</p>
            <p className="text-foreground-secondary text-13">{tip}</p>
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="primary" onClick={onClose} className="w-full">
          Close
        </Button>
      </ModalFooter>
    </Modal>
  )
}

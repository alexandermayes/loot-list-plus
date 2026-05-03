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
import { explainScore } from '@/domain/scoring/explain'
import type { ScoreResult, ScoreComponents, ScoreLine } from '@/domain/types'

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
  is_trial: boolean
  character_id: string
}

interface ScoreComparisonModalProps {
  open: boolean
  onClose: () => void
  itemName: string
  userRanking: PlayerRanking | null
  winnerRanking: PlayerRanking | null
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
  }
  return { total: r.loot_score, components }
}

/** Icon + color per component key (UI concern, not domain) */
const COMPONENT_STYLES: Record<string, { icon: any; iconColor: string }> = {
  itemRank: { icon: Target01Icon, iconColor: 'bg-yellow-500/20 text-yellow-500' },
  attendance: { icon: Calendar03Icon, iconColor: 'bg-blue-500/20 text-blue-500' },
  rankModifier: { icon: UserIcon, iconColor: 'bg-purple-500/20 text-purple-500' },
  roleBonus: { icon: Shield01Icon, iconColor: 'bg-cyan-500/20 text-cyan-500' },
  badLuckBonus: { icon: SparklesIcon, iconColor: 'bg-red-500/20 text-red-500' },
  priorityBonus: { icon: Award01Icon, iconColor: 'bg-green-500/20 text-green-500' },
  trialPenalty: { icon: Time01Icon, iconColor: 'bg-yellow-500/20 text-yellow-500' },
}

function ScoreRow({
  label,
  icon,
  iconColor,
  userValue,
  winnerValue,
}: {
  label: string
  icon: any
  iconColor: string
  userValue: number
  winnerValue: number
}) {
  const diff = winnerValue - userValue
  const diffFormatted = diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1)
  const diffColor = diff > 0 ? 'text-destructive' : diff < 0 ? 'text-success' : 'text-muted-foreground'

  return (
    <div className="flex items-center gap-3 py-2">
      <div className={`w-6 h-6 rounded-full ${iconColor} flex items-center justify-center flex-shrink-0`}>
        <HugeiconsIcon icon={icon} size={14} className="text-current opacity-80" />
      </div>
      <span className="text-foreground-secondary text-[13px] flex-1">{label}</span>
      <span className="text-foreground font-medium text-[13px] w-16 text-right tabular-nums">{userValue.toFixed(1)}</span>
      <span className="text-foreground font-medium text-[13px] w-16 text-right tabular-nums">{winnerValue.toFixed(1)}</span>
      <span className={`${diffColor} font-medium text-[12px] w-12 text-right tabular-nums`}>
        {diff !== 0 ? diffFormatted : '—'}
      </span>
    </div>
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
}: ScoreComparisonModalProps) {
  if (!userRanking || !winnerRanking) return null

  // Generate explanations from canonical engine path
  const userExplanation = explainScore(rankingToScoreResult(userRanking))
  const winnerExplanation = explainScore(rankingToScoreResult(winnerRanking))

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

  const scoreDiff = winnerRanking.loot_score - userRanking.loot_score
  const tip = getTip(userExplanation.lines, winnerExplanation.lines, userRanking, scoreDiff)

  return (
    <Modal open={open} onClose={onClose} size="default">
      <ModalHeader onClose={onClose}>
        <ModalTitle>Why didn't I get this item?</ModalTitle>
        <ModalDescription>{itemName}</ModalDescription>
      </ModalHeader>
      <ModalBody className="space-y-4">
        {/* Score Summary */}
        <div className="flex gap-4">
          <div className="flex-1 bg-background-subtle border border-border rounded-lg p-4 text-center">
            <p className="text-muted-foreground text-[12px] uppercase tracking-wide mb-1">Your score</p>
            <p className="text-foreground text-2xl font-semibold tabular-nums">{userRanking.loot_score.toFixed(1)}</p>
            <p className="text-foreground-secondary text-[13px]" style={{ color: userRanking.class_color }}>
              {userRanking.player_name}
            </p>
          </div>

          <div className="flex-1 bg-accent/10 border border-accent/30 rounded-lg p-4 text-center">
            <p className="text-muted-foreground text-[12px] uppercase tracking-wide mb-1">Winner's score</p>
            <p className="text-accent text-2xl font-semibold tabular-nums">{winnerRanking.loot_score.toFixed(1)}</p>
            <p className="text-foreground-secondary text-[13px]" style={{ color: winnerRanking.class_color }}>
              {winnerRanking.player_name}
            </p>
          </div>
        </div>

        {/* Difference Badge */}
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-destructive/10 border border-destructive/20 rounded-full text-destructive text-[12px] font-medium tabular-nums">
            -{scoreDiff.toFixed(1)} points behind
          </span>
        </div>

        {/* Detailed Breakdown — driven by explainScore() */}
        <div className="bg-background-subtle border border-border rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3 pb-2 border-b border-border">
            <span className="text-muted-foreground text-[12px] uppercase tracking-wide flex-1">Component</span>
            <span className="text-muted-foreground text-[12px] uppercase tracking-wide w-16 text-right">You</span>
            <span className="text-muted-foreground text-[12px] uppercase tracking-wide w-16 text-right">Winner</span>
            <span className="text-muted-foreground text-[12px] uppercase tracking-wide w-12 text-right">Diff</span>
          </div>

          <div className="divide-y divide-border/50">
            {[...allKeys.entries()].map(([key, { label, userValue, winnerValue }]) => {
              const style = COMPONENT_STYLES[key] || { icon: InformationCircleIcon, iconColor: 'bg-muted text-muted-foreground' }
              return (
                <ScoreRow
                  key={key}
                  label={label}
                  icon={style.icon}
                  iconColor={style.iconColor}
                  userValue={userValue}
                  winnerValue={winnerValue}
                />
              )
            })}
          </div>
        </div>

        {/* Tip */}
        <div className="flex items-start gap-3 p-4 bg-accent/5 border border-accent/20 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
            <HugeiconsIcon icon={InformationCircleIcon} size={18} className="text-accent" />
          </div>
          <div>
            <p className="text-foreground font-medium text-[13px] mb-0.5">Tip</p>
            <p className="text-foreground-secondary text-[13px]">{tip}</p>
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

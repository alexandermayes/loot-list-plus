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
} from '@hugeicons/core-free-icons'

interface PlayerRanking {
  player_name: string
  class_name: string
  class_color: string
  loot_score: number
  rank: number
  attendance_score: number
  role_modifier: number
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
  const diffColor = diff > 0 ? 'text-red-400' : diff < 0 ? 'text-green-400' : 'text-muted-foreground'

  return (
    <div className="flex items-center gap-3 py-2">
      <div className={`w-6 h-6 rounded-full ${iconColor} flex items-center justify-center flex-shrink-0`}>
        <HugeiconsIcon icon={icon} size={14} className="text-current opacity-80" />
      </div>
      <span className="text-foreground-secondary text-[13px] flex-1">{label}</span>
      <span className="text-foreground font-medium text-[13px] w-16 text-right">{userValue.toFixed(1)}</span>
      <span className="text-foreground font-medium text-[13px] w-16 text-right">{winnerValue.toFixed(1)}</span>
      <span className={`${diffColor} font-medium text-[12px] w-12 text-right`}>
        {diff !== 0 ? diffFormatted : '—'}
      </span>
    </div>
  )
}

function getTip(userRanking: PlayerRanking, winnerRanking: PlayerRanking): string {
  const totalDiff = winnerRanking.loot_score - userRanking.loot_score

  // Find the biggest contributing factor
  const gaps = [
    { name: 'item rank', diff: winnerRanking.rank - userRanking.rank },
    { name: 'attendance', diff: winnerRanking.attendance_score - userRanking.attendance_score },
    { name: 'role modifier', diff: winnerRanking.role_modifier - userRanking.role_modifier },
    { name: 'priority bonus', diff: winnerRanking.priority_bonus - userRanking.priority_bonus },
    { name: 'trial penalty', diff: winnerRanking.trial_penalty - userRanking.trial_penalty },
  ]

  const biggestGap = gaps.reduce((max, gap) => gap.diff > max.diff ? gap : max, gaps[0])

  // Very close - likely would have come down to a roll
  if (totalDiff < 1) {
    return "You were neck and neck! With scores this close, it often comes down to the roll."
  }

  // Attendance was the main factor
  if (biggestGap.name === 'attendance' && biggestGap.diff > 1) {
    return "Attendance made the difference here. Staying consistent with raids will help your score over time."
  }

  // Item rank was the main factor
  if (biggestGap.name === 'item rank' && biggestGap.diff >= 2) {
    return "They ranked this item higher than you did. For future tiers, consider how you prioritize your most-wanted items."
  }

  // Priority bonus was the factor
  if (biggestGap.name === 'priority bonus' && biggestGap.diff > 0) {
    return "This item has priority set for certain roles or specs. The winner matched a priority that gave them a boost."
  }

  // Role modifier (guild rank)
  if (biggestGap.name === 'role modifier' && biggestGap.diff > 0) {
    return "Guild rank contributed to their score. This reflects their role and responsibilities in the guild."
  }

  // Trial penalty
  if (biggestGap.name === 'trial penalty' && userRanking.is_trial) {
    return "Your trial status applies a penalty to your score. Once promoted to full member, this penalty will be removed."
  }

  // Generic fallback
  return "Keep showing up consistently and you'll be well-positioned for future drops!"
}

export default function ScoreComparisonModal({
  open,
  onClose,
  itemName,
  userRanking,
  winnerRanking,
}: ScoreComparisonModalProps) {
  if (!userRanking || !winnerRanking) return null

  const tip = getTip(userRanking, winnerRanking)
  const scoreDiff = winnerRanking.loot_score - userRanking.loot_score

  return (
    <Modal open={open} onClose={onClose} size="default">
      <ModalHeader onClose={onClose}>
        <ModalTitle>Why didn't I get this item?</ModalTitle>
        <ModalDescription>{itemName}</ModalDescription>
      </ModalHeader>
      <ModalBody className="space-y-4">
        {/* Score Summary */}
        <div className="flex gap-4">
          {/* User Score */}
          <div className="flex-1 bg-background-subtle border border-border rounded-lg p-4 text-center">
            <p className="text-muted-foreground text-[12px] uppercase tracking-wide mb-1">Your Score</p>
            <p className="text-foreground text-2xl font-semibold">{userRanking.loot_score.toFixed(1)}</p>
            <p className="text-foreground-secondary text-[13px]" style={{ color: userRanking.class_color }}>
              {userRanking.player_name}
            </p>
          </div>

          {/* Winner Score */}
          <div className="flex-1 bg-accent/10 border border-accent/30 rounded-lg p-4 text-center">
            <p className="text-muted-foreground text-[12px] uppercase tracking-wide mb-1">Winner's Score</p>
            <p className="text-accent text-2xl font-semibold">{winnerRanking.loot_score.toFixed(1)}</p>
            <p className="text-foreground-secondary text-[13px]" style={{ color: winnerRanking.class_color }}>
              {winnerRanking.player_name}
            </p>
          </div>
        </div>

        {/* Difference Badge */}
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full text-red-400 text-[12px] font-medium">
            -{scoreDiff.toFixed(1)} points behind
          </span>
        </div>

        {/* Detailed Breakdown */}
        <div className="bg-background-subtle border border-border rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3 pb-2 border-b border-border">
            <span className="text-muted-foreground text-[12px] uppercase tracking-wide flex-1">Component</span>
            <span className="text-muted-foreground text-[12px] uppercase tracking-wide w-16 text-right">You</span>
            <span className="text-muted-foreground text-[12px] uppercase tracking-wide w-16 text-right">Winner</span>
            <span className="text-muted-foreground text-[12px] uppercase tracking-wide w-12 text-right">Diff</span>
          </div>

          <div className="divide-y divide-border/50">
            <ScoreRow
              label="Item Rank"
              icon={Target01Icon}
              iconColor="bg-yellow-500/20 text-yellow-500"
              userValue={userRanking.rank}
              winnerValue={winnerRanking.rank}
            />
            <ScoreRow
              label="Attendance"
              icon={Calendar03Icon}
              iconColor="bg-blue-500/20 text-blue-500"
              userValue={userRanking.attendance_score}
              winnerValue={winnerRanking.attendance_score}
            />
            <ScoreRow
              label="Role Modifier"
              icon={UserIcon}
              iconColor="bg-purple-500/20 text-purple-500"
              userValue={userRanking.role_modifier}
              winnerValue={winnerRanking.role_modifier}
            />
            <ScoreRow
              label="Bad Luck Bonus"
              icon={SparklesIcon}
              iconColor="bg-red-500/20 text-red-500"
              userValue={userRanking.bad_luck_bonus}
              winnerValue={winnerRanking.bad_luck_bonus}
            />
            <ScoreRow
              label="Priority Bonus"
              icon={Award01Icon}
              iconColor="bg-green-500/20 text-green-500"
              userValue={userRanking.priority_bonus}
              winnerValue={winnerRanking.priority_bonus}
            />
            {(userRanking.trial_penalty !== 0 || winnerRanking.trial_penalty !== 0) && (
              <ScoreRow
                label="Trial Penalty"
                icon={Time01Icon}
                iconColor="bg-yellow-500/20 text-yellow-500"
                userValue={userRanking.trial_penalty}
                winnerValue={winnerRanking.trial_penalty}
              />
            )}
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
          Got it
        </Button>
      </ModalFooter>
    </Modal>
  )
}

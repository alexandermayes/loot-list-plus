'use client'

import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
} from '@/components/ui/modal'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Target01Icon,
  Calendar03Icon,
  UserIcon,
  SparklesIcon,
  Award01Icon,
  ShuffleIcon,
  Time01Icon
} from '@hugeicons/core-free-icons'

interface GuildSettings {
  attendance_mode?: string
  attendance_max_score?: number
  attendance_breakpoints?: { threshold: number; percentage: number }[]
  rank_modifier_gm?: number
  rank_modifier_officer?: number
  rank_modifier_member?: number
  bad_luck_bonus_per_loss?: number
  bad_luck_bonus_max?: number
  priority_bonus_role?: number
  priority_bonus_class_spec?: number
  priority_bonus_character?: number
  // Trial system
  trial_penalty_enabled?: boolean
  trial_penalty_value?: number
}

interface ScoreBreakdownModalProps {
  open: boolean
  onClose: () => void
  guildSettings: GuildSettings | null
}

export default function ScoreBreakdownModal({ open, onClose, guildSettings }: ScoreBreakdownModalProps) {
  // Default values if settings not loaded
  const attendanceMode = guildSettings?.attendance_mode || 'linear'
  const attendanceMax = guildSettings?.attendance_max_score ?? 10
  const breakpoints = guildSettings?.attendance_breakpoints || []
  const gmModifier = guildSettings?.rank_modifier_gm ?? 0
  const officerModifier = guildSettings?.rank_modifier_officer ?? 0
  const memberModifier = guildSettings?.rank_modifier_member ?? 0
  const blbPerLoss = guildSettings?.bad_luck_bonus_per_loss ?? 1
  const blbMax = guildSettings?.bad_luck_bonus_max ?? 5
  const priorityRole = guildSettings?.priority_bonus_role ?? 5
  const priorityClassSpec = guildSettings?.priority_bonus_class_spec ?? 3
  const priorityCharacter = guildSettings?.priority_bonus_character ?? 2
  const trialPenaltyEnabled = guildSettings?.trial_penalty_enabled ?? false
  const trialPenaltyValue = guildSettings?.trial_penalty_value ?? -2

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <ModalHeader onClose={onClose}>
        <ModalTitle>How loot scores work</ModalTitle>
        <ModalDescription>Understanding how your priority is calculated</ModalDescription>
      </ModalHeader>
      <ModalBody className="space-y-4">
        {/* Formula Overview */}
        <div className="bg-accent/10 border border-accent/30 rounded-lg p-4">
          <p className="text-foreground font-medium text-center text-[14px]">
            Score = Item Rank + Attendance + Role Modifier + Bad Luck + Priority{trialPenaltyEnabled ? ' + Trial Penalty' : ''}
          </p>
        </div>

        {/* Component Breakdown */}
        <div className="space-y-3">
          {/* Item Rank */}
          <div className="bg-background-subtle border border-border rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-warning/20 flex items-center justify-center">
                <HugeiconsIcon icon={Target01Icon} size={18} className="text-warning" />
              </div>
              <div>
                <h3 className="text-foreground font-medium text-[14px]">Item rank</h3>
                <p className="text-muted-foreground text-[12px]">50-1 points</p>
              </div>
            </div>
            <p className="text-foreground-secondary text-[13px]">
              How much you want the item. Rank 50 means you want it most, rank 1 means it's a minor upgrade.
            </p>
          </div>

          {/* Attendance */}
          <div className="bg-background-subtle border border-border rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                <HugeiconsIcon icon={Calendar03Icon} size={18} className="text-accent" />
              </div>
              <div>
                <h3 className="text-foreground font-medium text-[14px]">Attendance score</h3>
                <p className="text-muted-foreground text-[12px]">0-{attendanceMax} points</p>
              </div>
            </div>
            <p className="text-foreground-secondary text-[13px] mb-2">
              Based on your raid attendance percentage.
            </p>
            <div className="bg-background-elevated rounded-md p-3 text-[12px]">
              {attendanceMode === 'linear' ? (
                <p className="text-muted-foreground">
                  <span className="text-foreground font-medium">Linear Mode:</span> Your attendance % is multiplied by {attendanceMax} points.
                  (e.g., 80% attendance = {(0.8 * attendanceMax).toFixed(1)} points)
                </p>
              ) : (
                <div className="space-y-1">
                  <p className="text-foreground font-medium mb-2">Breakpoint Mode:</p>
                  {breakpoints.length > 0 ? (
                    breakpoints.map((bp, i) => (
                      <p key={i} className="text-muted-foreground">
                        {bp.percentage}%+ attendance = {((bp.threshold / 100) * attendanceMax).toFixed(1)} points
                      </p>
                    ))
                  ) : (
                    <p className="text-muted-foreground">No breakpoints configured</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Role Modifier */}
          <div className="bg-background-subtle border border-border rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                <HugeiconsIcon icon={UserIcon} size={18} className="text-accent" />
              </div>
              <div>
                <h3 className="text-foreground font-medium text-[14px]">Role modifier</h3>
                <p className="text-muted-foreground text-[12px]">Based on guild rank</p>
              </div>
            </div>
            <div className="bg-background-elevated rounded-md p-3 text-[12px] space-y-1">
              <p className="text-muted-foreground">
                <span className="text-foreground">Guild Master:</span> +{gmModifier} points
              </p>
              <p className="text-muted-foreground">
                <span className="text-foreground">Officer:</span> +{officerModifier} points
              </p>
              <p className="text-muted-foreground">
                <span className="text-foreground">Member:</span> +{memberModifier} points
              </p>
            </div>
          </div>

          {/* Bad Luck Bonus */}
          <div className="bg-background-subtle border border-border rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center">
                <HugeiconsIcon icon={SparklesIcon} size={18} className="text-destructive" />
              </div>
              <div>
                <h3 className="text-foreground font-medium text-[14px]">Bad luck bonus</h3>
                <p className="text-muted-foreground text-[12px]">0-{blbMax} points max</p>
              </div>
            </div>
            <p className="text-foreground-secondary text-[13px]">
              Earn +{blbPerLoss} point each time you lose a roll (up to {blbMax} max). Resets when you win an item.
            </p>
          </div>

          {/* Priority Bonus */}
          <div className="bg-background-subtle border border-border rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center">
                <HugeiconsIcon icon={Award01Icon} size={18} className="text-success" />
              </div>
              <div>
                <h3 className="text-foreground font-medium text-[14px]">Priority bonus</h3>
                <p className="text-muted-foreground text-[12px]">Stacking bonuses</p>
              </div>
            </div>
            <p className="text-foreground-secondary text-[13px] mb-2">
              Officers can set item priorities. Priority 1 gets full bonus, priority 2 gets half, etc.
            </p>
            <div className="bg-background-elevated rounded-md p-3 text-[12px] space-y-1">
              <p className="text-muted-foreground">
                <span className="text-foreground">Role Priority:</span> up to +{priorityRole} points
              </p>
              <p className="text-muted-foreground">
                <span className="text-foreground">Class/Spec Priority:</span> up to +{priorityClassSpec} points
              </p>
              <p className="text-muted-foreground">
                <span className="text-foreground">Character Priority:</span> up to +{priorityCharacter} points
              </p>
            </div>
          </div>

          {/* Trial Penalty */}
          {trialPenaltyEnabled && (
            <div className="bg-background-subtle border border-border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-warning/20 flex items-center justify-center">
                  <HugeiconsIcon icon={Time01Icon} size={18} className="text-warning" />
                </div>
                <div>
                  <h3 className="text-foreground font-medium text-[14px]">Trial penalty</h3>
                  <p className="text-muted-foreground text-[12px]">{trialPenaltyValue} points</p>
                </div>
              </div>
              <p className="text-foreground-secondary text-[13px]">
                New members on trial status receive a {trialPenaltyValue} point penalty until promoted to full member.
                Trial members are shown with <span className="text-warning">(T)</span> in rankings.
              </p>
            </div>
          )}
        </div>

        {/* Tiebreaker */}
        <div className="flex items-center gap-3 p-4 bg-background-subtle border border-border rounded-lg">
          <div className="w-8 h-8 rounded-full bg-warning/20 flex items-center justify-center">
            <HugeiconsIcon icon={ShuffleIcon} size={18} className="text-warning" />
          </div>
          <p className="text-foreground-secondary text-[13px]">
            <span className="text-foreground font-medium">Tiebreaker:</span> When scores are equal, winners are determined by random roll.
          </p>
        </div>
      </ModalBody>
    </Modal>
  )
}

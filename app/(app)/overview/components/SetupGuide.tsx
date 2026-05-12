'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { Button } from '@/components/ui/button'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  CheckmarkCircle01Icon,
  UserGroupIcon,
  Calendar03Icon,
  Task01Icon,
  Award01Icon,
  ArrowRight01Icon,
  Cancel01Icon,
  UserIcon,
  Globe02Icon,
  SparklesIcon,
} from '@hugeicons/core-free-icons'

interface SetupStep {
  id: string
  title: string
  description: string
  completedDescription: string
  icon: any
  complete: boolean
  href: string
  cta: string
}

interface SetupGuideProps {
  guildId: string
  guildName: string
  hasExpansion: boolean
}

export function SetupGuide({ guildId, guildName, hasExpansion }: SetupGuideProps) {
  const router = useRouter()
  const supabase = createClient()
  const { activeCharacter } = useGuildContext()
  const [dismissed, setDismissed] = useState(false)
  const [steps, setSteps] = useState<SetupStep[]>([])
  const [loading, setLoading] = useState(true)
  const [celebrating, setCelebrating] = useState(false)
  const [expandedStep, setExpandedStep] = useState<string | null>(null)

  const checkSetupProgress = useCallback(async () => {
    try {
      const [membersResult, inviteResult, settingsResult, submissionsResult, raidsResult] = await Promise.all([
        // Check member count (not just invite codes)
        supabase
          .from('character_guild_memberships')
          .select('id', { count: 'exact', head: true })
          .eq('guild_id', guildId)
          .eq('is_active', true),

        // Check invite codes
        fetch(`/api/guild-invites?guild_id=${guildId}`).then(r => r.ok ? r.json() : null),

        // Check guild settings for raid schedule
        supabase
          .from('guild_settings')
          .select('first_raid_day, second_raid_day, raid_days_per_week')
          .eq('guild_id', guildId)
          .single(),

        // Check approved submissions
        supabase
          .from('loot_submissions')
          .select('id', { count: 'exact', head: true })
          .eq('guild_id', guildId)
          .eq('status', 'approved'),

        // Check raid events
        supabase
          .from('raid_events')
          .select('id', { count: 'exact', head: true })
          .eq('guild_id', guildId)
          .eq('is_skipped', false),
      ])

      const memberCount = membersResult.count ?? 0
      const hasMembers = memberCount > 1
      const hasInviteCode = inviteResult?.invite_codes?.length > 0
      const hasCharacter = !!activeCharacter
      const hasRaidSchedule = settingsResult.data?.first_raid_day != null
      const hasSubmissions = (submissionsResult.count ?? 0) > 0
      const hasRaids = (raidsResult.count ?? 0) > 0

      const newSteps: SetupStep[] = [
        {
          id: 'character',
          title: 'Create your character',
          description: 'Add your main so your guild knows who you are.',
          completedDescription: `${activeCharacter?.name || 'Character'} is ready to go.`,
          icon: UserIcon,
          complete: hasCharacter,
          href: '/characters/manage',
          cta: 'Add character',
        },
        {
          id: 'expansion',
          title: 'Choose your expansion',
          description: 'Pick which expansion your guild is raiding so loot tables load.',
          completedDescription: 'Expansion configured with loot data.',
          icon: Globe02Icon,
          complete: hasExpansion,
          href: '/guild-settings',
          cta: 'Set expansion',
        },
        {
          id: 'invite',
          title: 'Invite your raiders',
          description: hasInviteCode && !hasMembers
            ? `Invite code created. Share it to get your guildies in.`
            : 'Create an invite link so your raiders can join.',
          completedDescription: `${memberCount} member${memberCount !== 1 ? 's' : ''} in the guild.`,
          icon: UserGroupIcon,
          complete: hasMembers,
          href: '/guild-settings',
          cta: hasInviteCode ? 'Share invite' : 'Create invite',
        },
        {
          id: 'schedule',
          title: 'Set your raid schedule',
          description: 'Tell us which days you raid so attendance tracks automatically.',
          completedDescription: 'Raid days configured. Attendance is tracking.',
          icon: Calendar03Icon,
          complete: hasRaidSchedule,
          href: '/guild-settings',
          cta: 'Set raid days',
        },
        {
          id: 'submissions',
          title: 'Get your first loot lists',
          description: 'Once raiders join, they rank items and submit for your review.',
          completedDescription: 'Loot lists approved. The master sheet is live.',
          icon: Task01Icon,
          complete: hasSubmissions,
          href: '/loot-submissions',
          cta: 'View submissions',
        },
        {
          id: 'raid',
          title: 'Log your first raid',
          description: 'After raid night, log attendance to start building scores.',
          completedDescription: 'Raids logged. Scores are building.',
          icon: Award01Icon,
          complete: hasRaids,
          href: '/raid-tracking',
          cta: 'Log a raid',
        },
      ]

      setSteps(newSteps)

      // Auto-expand first incomplete step
      const firstIncomplete = newSteps.find(s => !s.complete)
      if (firstIncomplete) {
        setExpandedStep(firstIncomplete.id)
      }
    } catch (error) {
      console.error('Error checking setup progress:', error)
    } finally {
      setLoading(false)
    }
  }, [guildId, guildName, hasExpansion, activeCharacter, supabase])

  useEffect(() => {
    checkSetupProgress()
  }, [checkSetupProgress])

  // Check dismissal in localStorage
  useEffect(() => {
    const key = `setup-guide-dismissed-${guildId}`
    if (localStorage.getItem(key) === 'true') {
      setDismissed(true)
    }
  }, [guildId])

  // Check if we should celebrate (all complete, not yet celebrated)
  useEffect(() => {
    if (steps.length === 0) return
    const allComplete = steps.every(s => s.complete)
    const celebratedKey = `setup-guide-celebrated-${guildId}`
    if (allComplete && localStorage.getItem(celebratedKey) !== 'true') {
      setCelebrating(true)
      localStorage.setItem(celebratedKey, 'true')
    }
  }, [steps, guildId])

  const handleDismiss = () => {
    localStorage.setItem(`setup-guide-dismissed-${guildId}`, 'true')
    setDismissed(true)
  }

  const handleDismissCelebration = () => {
    setCelebrating(false)
    handleDismiss()
  }

  if (dismissed || loading) return null

  const completedCount = steps.filter(s => s.complete).length
  const allComplete = completedCount === steps.length
  const progress = steps.length > 0 ? (completedCount / steps.length) * 100 : 0

  // Celebration state
  if (celebrating || allComplete) {
    return (
      <div className="relative bg-background-elevated border border-accent/30 rounded-xl overflow-hidden">
        {/* Subtle accent glow */}
        <div className="absolute inset-0 bg-accent/[0.03] pointer-events-none" />

        <div className="relative px-6 py-8 text-center">
          <div className="w-12 h-12 rounded-full bg-accent/15 flex items-center justify-center mx-auto mb-4">
            <HugeiconsIcon icon={SparklesIcon} size={24} className="text-accent" />
          </div>
          <h2 className="text-[20px] font-bold text-foreground">
            {guildName} is ready for loot
          </h2>
          <p className="text-muted-foreground text-sm mt-2 max-w-md mx-auto">
            All {steps.length} steps complete. Your guild is set up for fair, transparent loot distribution. Time to raid.
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismissCelebration}
            className="mt-4 text-muted-foreground"
          >
            Dismiss
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-background-elevated border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-[18px] font-bold text-foreground">
              Get {guildName} ready for loot
            </h2>
            <p className="text-muted-foreground text-[13px] mt-1">
              {completedCount} of {steps.length} steps complete
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 -mr-1 -mt-1"
            aria-label="Dismiss setup guide"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={18} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="px-3 pb-3">
        {steps.map((step) => {
          const isExpanded = expandedStep === step.id && !step.complete
          const isNextStep = !step.complete && expandedStep === step.id

          return (
            <div
              key={step.id}
              className={`rounded-lg transition-colors ${
                step.complete
                  ? 'opacity-50'
                  : isNextStep
                    ? 'bg-accent/[0.06]'
                    : 'hover:bg-muted/50 cursor-pointer'
              }`}
            >
              <div
                className="flex items-center gap-3.5 px-3 py-3"
                role={step.complete ? undefined : 'button'}
                tabIndex={step.complete ? undefined : 0}
                onClick={step.complete ? undefined : () => setExpandedStep(
                  expandedStep === step.id ? null : step.id
                )}
                onKeyDown={step.complete ? undefined : (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setExpandedStep(expandedStep === step.id ? null : step.id)
                  }
                }}
              >
                {/* Step indicator */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                  step.complete
                    ? 'bg-success/15'
                    : isNextStep
                      ? 'bg-accent/15'
                      : 'bg-muted'
                }`}>
                  {step.complete ? (
                    <HugeiconsIcon icon={CheckmarkCircle01Icon} size={18} className="text-success" />
                  ) : (
                    <HugeiconsIcon icon={step.icon} size={16} className={isNextStep ? 'text-accent' : 'text-muted-foreground'} />
                  )}
                </div>

                {/* Step content */}
                <div className="flex-1 min-w-0">
                  <p className={`text-[13px] font-medium ${
                    step.complete
                      ? 'text-muted-foreground line-through decoration-1'
                      : isNextStep
                        ? 'text-foreground'
                        : 'text-foreground-secondary'
                  }`}>
                    {step.title}
                  </p>
                  {step.complete && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">{step.completedDescription}</p>
                  )}
                </div>

                {/* Status */}
                {step.complete && (
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} size={16} className="text-success shrink-0" />
                )}
                {!step.complete && !isExpanded && (
                  <span className="text-[11px] text-muted-foreground shrink-0">
                    {steps.indexOf(step) === steps.findIndex(s => !s.complete) ? 'Next' : ''}
                  </span>
                )}
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="px-3 pb-3 pl-[52px]">
                  <p className="text-[12px] text-muted-foreground mb-3">
                    {step.description}
                  </p>
                  <Button
                    variant="accent"
                    size="sm"
                    onClick={() => router.push(step.href)}
                    className="text-[12px]"
                  >
                    {step.cta}
                    <HugeiconsIcon icon={ArrowRight01Icon} size={14} className="ml-1" />
                  </Button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

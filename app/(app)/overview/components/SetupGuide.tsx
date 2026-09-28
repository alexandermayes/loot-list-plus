'use client'

import { useState, useEffect, useCallback, useId } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/utils/supabase/client'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { getGuildGame, type RaidTierStatus } from '@/domain/expansion/game'
import { Button } from '@/components/ui/button'
import { HugeiconsIcon } from '@hugeicons/react'
import type { IconSvgElement } from '@hugeicons/react'
import {
  Tick02Icon,
  Clock01Icon,
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

// D-04: the only new visible string this plan adds. A Forever guild's
// "submissions" and "raid" steps show this instead of becoming clickable
// until a raid tier exists for the active expansion.
const FOREVER_WAITING_NOTE = 'Not available for WoW Forever yet'

interface SetupStep {
  id: string
  title: string
  description: string
  icon: IconSvgElement
  complete: boolean
  href: string
  cta: string
}

type StepStatus = 'done' | 'waiting' | 'current' | 'upcoming'

interface SetupGuideProps {
  guildId: string
  guildName: string
  guildIconUrl?: string | null
  hasExpansion: boolean
  raidTierStatus?: RaidTierStatus
}

export function SetupGuide({ guildId, guildName, guildIconUrl, hasExpansion, raidTierStatus = 'available' }: SetupGuideProps) {
  const router = useRouter()
  const supabase = createClient()
  const { activeCharacter, activeGuild } = useGuildContext()
  const isForeverGuild = getGuildGame(activeGuild) === 'forever'
  const [dismissed, setDismissed] = useState(false)
  const [steps, setSteps] = useState<SetupStep[]>([])
  const [loading, setLoading] = useState(true)
  const [celebrating, setCelebrating] = useState(false)
  // undefined means "follow the current step"; a string or null means the
  // user explicitly expanded or collapsed a row.
  const [expandedStep, setExpandedStep] = useState<string | null | undefined>(undefined)
  const headingId = useId()

  // D-03: while a Forever guild's raid tiers are still loading, the early
  // return below renders nothing, so steps 4 and 5 never flip from numbered
  // to waiting after first paint. Once tiers are known empty, those two
  // steps become non-interactive waiting rows instead of normal steps.
  const foreverRaidsLoading = isForeverGuild && raidTierStatus === 'loading'
  const foreverAwaitingRaids = isForeverGuild && raidTierStatus === 'none'

  const checkSetupProgress = useCallback(async () => {
    try {
      const [membersResult, inviteResult, settingsResult, submissionsResult, raidsResult] = await Promise.all([
        supabase
          .from('character_guild_memberships')
          .select('id', { count: 'exact', head: true })
          .eq('guild_id', guildId)
          .eq('is_active', true),
        fetch(`/api/guild-invites?guild_id=${guildId}`).then(r => r.ok ? r.json() : null),
        supabase
          .from('guild_settings')
          .select('first_raid_day, second_raid_day, raid_days_per_week')
          .eq('guild_id', guildId)
          .single(),
        supabase
          .from('loot_submissions')
          .select('id', { count: 'exact', head: true })
          .eq('guild_id', guildId)
          .eq('status', 'approved'),
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
          icon: UserIcon,
          complete: hasCharacter,
          href: '/characters/manage',
          cta: 'Add character',
        },
        {
          id: 'expansion',
          title: 'Choose your expansion',
          description: 'Pick which expansion your guild is raiding so loot tables load.',
          icon: Globe02Icon,
          complete: hasExpansion,
          href: '/guild-settings',
          cta: 'Set expansion',
        },
        {
          id: 'invite',
          title: 'Invite your raiders',
          description: hasInviteCode && !hasMembers
            ? 'Invite code created. Share it to get your guildies in.'
            : 'Create an invite link so your raiders can join.',
          icon: UserGroupIcon,
          complete: hasMembers,
          href: '/guild-settings',
          cta: hasInviteCode ? 'Share invite' : 'Create invite',
        },
        {
          id: 'schedule',
          title: 'Set your raid schedule',
          description: 'Tell us which days you raid so attendance tracks automatically.',
          icon: Calendar03Icon,
          complete: hasRaidSchedule,
          href: '/guild-settings',
          cta: 'Set raid days',
        },
        {
          id: 'submissions',
          title: 'Get your first loot lists',
          description: 'Once raiders join, they rank items and submit for your review.',
          icon: Task01Icon,
          complete: hasSubmissions,
          href: '/loot-submissions',
          cta: 'View submissions',
        },
        {
          id: 'raid',
          title: 'Log your first raid',
          description: 'After raid night, log attendance to start building scores.',
          icon: Award01Icon,
          complete: hasRaids,
          href: '/raid-tracking',
          cta: 'Log a raid',
        },
      ]

      // A Forever guild's game version is fixed at creation (D-02), so there
      // is nothing to "choose" -- the expansion step never applies (D-03).
      const visibleSteps = isForeverGuild
        ? newSteps.filter(s => s.id !== 'expansion')
        : newSteps

      setSteps(visibleSteps)
    } catch (error) {
      console.error('Error checking setup progress:', error)
    } finally {
      setLoading(false)
    }
  }, [guildId, guildName, hasExpansion, activeCharacter, isForeverGuild, supabase])

  useEffect(() => {
    checkSetupProgress()
  }, [checkSetupProgress])

  useEffect(() => {
    const key = `setup-guide-dismissed-${guildId}`
    if (localStorage.getItem(key) === 'true') {
      setDismissed(true)
    }
  }, [guildId])

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

  if (dismissed || loading || foreverRaidsLoading) return null

  const completedCount = steps.filter(s => s.complete).length
  const allComplete = completedCount === steps.length
  const progress = steps.length > 0 ? (completedCount / steps.length) * 100 : 0

  // Waiting steps still count toward the total (D-03); a completed step is
  // always "done" even if it would otherwise be waiting.
  const isWaitingStep = (step: SetupStep) =>
    foreverAwaitingRaids && !step.complete && (step.id === 'submissions' || step.id === 'raid')

  const currentStep = steps.find(s => !s.complete && !isWaitingStep(s))
  const currentStepId = currentStep?.id ?? null
  const expandedId = expandedStep === undefined ? currentStepId : expandedStep

  const getStepStatus = (step: SetupStep): StepStatus => {
    if (step.complete) return 'done'
    if (isWaitingStep(step)) return 'waiting'
    if (step.id === currentStepId) return 'current'
    return 'upcoming'
  }

  // Guild icon or fallback
  const guildAvatar = guildIconUrl ? (
    <Image
      src={guildIconUrl}
      alt=""
      width={40}
      height={40}
      className="w-10 h-10 rounded-lg shrink-0 outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
    />
  ) : (
    <div className="w-10 h-10 rounded-lg shrink-0 bg-accent/15 flex items-center justify-center outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10">
      <span className="text-accent font-bold text-[16px]">{guildName.charAt(0).toUpperCase()}</span>
    </div>
  )

  // Celebration state
  if (celebrating || allComplete) {
    return (
      <div className="relative bg-background-elevated border border-accent/20 rounded-xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.04] to-transparent pointer-events-none" />
        <div className="relative px-6 py-8 flex flex-col items-center text-center">
          {guildIconUrl ? (
            <Image
              src={guildIconUrl}
              alt=""
              width={56}
              height={56}
              className="w-14 h-14 rounded-xl mb-4 outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
            />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-accent/15 flex items-center justify-center mb-4">
              <HugeiconsIcon icon={SparklesIcon} size={28} className="text-accent" />
            </div>
          )}
          <h2 className="text-[20px] font-bold text-foreground">
            {guildName} is ready for loot
          </h2>
          <p className="text-muted-foreground text-[13px] mt-1.5 max-w-sm">
            All {steps.length} steps complete. Your guild is set up for fair, transparent loot distribution.
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismissCelebration}
            className="mt-4 text-muted-foreground text-[12px]"
          >
            Dismiss
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-background-elevated border border-border rounded-xl overflow-hidden">
      {/* Header with guild identity */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {guildAvatar}
            <div className="min-w-0">
              <h2 id={headingId} className="text-[16px] font-bold text-foreground truncate">
                Set up {guildName}
              </h2>
              <p className="text-muted-foreground text-[12px] mt-0.5">
                {completedCount} of {steps.length} steps done
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 -mr-1 -mt-1"
            aria-label="Dismiss setup guide"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={16} />
          </button>
        </div>

        {/* Progress: one continuous track, one accent fill by count (D-01) */}
        <div
          className="mt-4 h-1.5 rounded-full bg-muted overflow-hidden"
          role="progressbar"
          aria-labelledby={headingId}
          aria-valuemin={0}
          aria-valuemax={steps.length}
          aria-valuenow={completedCount}
          aria-valuetext={`${completedCount} of ${steps.length} steps done`}
        >
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Steps: one row anatomy for every state (D-01) */}
      <ol aria-labelledby={headingId} className="px-2 pb-3">
        {steps.map((step, index) => {
          const status = getStepStatus(step)
          const position = index + 1
          const isExpandable = status === 'current' || status === 'upcoming'
          const expanded = isExpandable && expandedId === step.id
          const rowClasses = 'flex items-center gap-3 min-h-11 pl-3 pr-2 py-2 w-full text-left'

          const statusSlot = status === 'done' ? (
            <div
              className="w-6 h-6 shrink-0 flex items-center justify-center rounded-full bg-success text-success-foreground"
              aria-hidden="true"
            >
              <HugeiconsIcon icon={Tick02Icon} size={14} strokeWidth={2.5} />
            </div>
          ) : status === 'waiting' ? (
            <div className="w-6 h-6 shrink-0 flex items-center justify-center" aria-hidden="true">
              <HugeiconsIcon icon={Clock01Icon} size={16} className="text-muted-foreground" />
            </div>
          ) : status === 'current' ? (
            <div
              className="w-6 h-6 shrink-0 flex items-center justify-center rounded-full bg-accent text-success-foreground text-[11px] font-semibold tabular-nums"
              aria-hidden="true"
            >
              {position}
            </div>
          ) : (
            <div
              className="w-6 h-6 shrink-0 flex items-center justify-center rounded-full bg-muted text-muted-foreground text-[11px] font-semibold tabular-nums"
              aria-hidden="true"
            >
              {position}
            </div>
          )

          return (
            <li key={step.id} className="relative">
              {status === 'current' && (
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-accent"
                />
              )}

              {status === 'done' && (
                <div className={rowClasses}>
                  {statusSlot}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium leading-5 text-foreground-secondary">
                      {step.title}
                      <span className="sr-only">, done</span>
                    </p>
                  </div>
                </div>
              )}

              {status === 'waiting' && (
                <div className={rowClasses}>
                  {statusSlot}
                  <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                    <p className="text-[13px] font-medium leading-5 text-muted-foreground">
                      {step.title}
                    </p>
                    <span className="text-[11px] text-muted-foreground">{FOREVER_WAITING_NOTE}</span>
                  </div>
                </div>
              )}

              {isExpandable && (
                <button
                  type="button"
                  onClick={() => setExpandedStep(expandedId === step.id ? null : step.id)}
                  aria-expanded={expanded}
                  aria-current={status === 'current' ? 'step' : undefined}
                  className={`${rowClasses} rounded-lg hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                >
                  {statusSlot}
                  <div className="flex-1 min-w-0">
                    <p className={`text-[13px] font-medium leading-5 ${
                      status === 'current' ? 'text-foreground' : 'text-foreground-secondary'
                    }`}>
                      {step.title}
                    </p>
                  </div>
                  <svg
                    aria-hidden="true"
                    className={`w-4 h-4 text-muted-foreground transition-transform shrink-0 ${expanded ? 'rotate-90' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}

              {expanded && (
                <div className="pl-12 pr-2 pb-3">
                  <p className="text-[12px] text-muted-foreground mb-3">
                    {step.description}
                  </p>
                  <Button
                    variant="accent"
                    size="sm"
                    onClick={() => router.push(step.href)}
                  >
                    {step.cta}
                    <HugeiconsIcon icon={ArrowRight01Icon} size={14} className="ml-1.5" />
                  </Button>
                </div>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

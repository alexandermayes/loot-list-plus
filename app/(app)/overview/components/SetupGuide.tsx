'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { HugeiconsIcon } from '@hugeicons/react'
import { CheckmarkCircle01Icon, UserGroupIcon, Calendar03Icon, Task01Icon, Award01Icon, ArrowRight01Icon, Cancel01Icon } from '@hugeicons/core-free-icons'

interface SetupStep {
  id: string
  title: string
  description: string
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
  const [dismissed, setDismissed] = useState(false)
  const [steps, setSteps] = useState<SetupStep[]>([])
  const [loading, setLoading] = useState(true)

  const checkSetupProgress = useCallback(async () => {
    try {
      // Run all checks in parallel
      const [inviteResult, settingsResult, submissionsResult, raidsResult] = await Promise.all([
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

      const hasInviteCode = inviteResult?.invite_codes?.length > 0
      const hasRaidSchedule = settingsResult.data?.first_raid_day != null
      const hasSubmissions = (submissionsResult.count ?? 0) > 0
      const hasRaids = (raidsResult.count ?? 0) > 0

      setSteps([
        {
          id: 'guild',
          title: 'Create your guild',
          description: `${guildName} is set up and ready to go.`,
          icon: CheckmarkCircle01Icon,
          complete: true,
          href: '/guild-settings',
          cta: 'Guild settings',
        },
        {
          id: 'invite',
          title: 'Invite your raiders',
          description: hasInviteCode
            ? 'Invite code created. Share it with your guildies.'
            : 'Create an invite code so your raiders can join.',
          icon: UserGroupIcon,
          complete: hasInviteCode,
          href: '/guild-settings',
          cta: hasInviteCode ? 'Manage invites' : 'Create invite code',
        },
        {
          id: 'schedule',
          title: 'Set your raid schedule',
          description: hasRaidSchedule
            ? 'Raid days configured. Attendance will track automatically.'
            : 'Tell us which days you raid so attendance tracking works.',
          icon: Calendar03Icon,
          complete: hasRaidSchedule,
          href: '/guild-settings',
          cta: hasRaidSchedule ? 'Edit schedule' : 'Set raid days',
        },
        {
          id: 'submissions',
          title: 'Get your first loot lists',
          description: hasSubmissions
            ? 'Raiders have submitted and you\'ve approved lists.'
            : 'Once raiders join, they\'ll rank items and submit for your approval.',
          icon: Task01Icon,
          complete: hasSubmissions,
          href: '/master-loot',
          cta: hasSubmissions ? 'Review lists' : 'View submissions',
        },
        {
          id: 'raid',
          title: 'Log your first raid',
          description: hasRaids
            ? 'Raids logged. Attendance and scores are tracking.'
            : 'After your first raid, log attendance to start building scores.',
          icon: Award01Icon,
          complete: hasRaids,
          href: '/raid-tracking',
          cta: hasRaids ? 'Raid tracking' : 'Log a raid',
        },
      ])
    } catch (error) {
      console.error('Error checking setup progress:', error)
    } finally {
      setLoading(false)
    }
  }, [guildId, guildName, supabase])

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

  const handleDismiss = () => {
    localStorage.setItem(`setup-guide-dismissed-${guildId}`, 'true')
    setDismissed(true)
  }

  if (dismissed || loading) return null

  const completedCount = steps.filter(s => s.complete).length
  const allComplete = completedCount === steps.length
  const progress = steps.length > 0 ? (completedCount / steps.length) * 100 : 0

  // Don't show if everything is already done
  if (allComplete) return null

  return (
    <div className="bg-background-elevated border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-[20px] font-bold text-foreground">
              Get {guildName} ready for loot
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              {completedCount} of {steps.length} steps done. You're {completedCount <= 1 ? 'just getting started' : completedCount <= 3 ? 'making progress' : 'almost there'}.
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
        <div className="mt-4 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="px-3 pb-3">
        {steps.map((step, i) => (
          <div
            key={step.id}
            className={`flex items-center gap-4 px-3 py-3 rounded-lg transition-colors ${
              step.complete
                ? 'opacity-60'
                : 'hover:bg-muted cursor-pointer'
            }`}
            role={step.complete ? undefined : 'button'}
            tabIndex={step.complete ? undefined : 0}
            onClick={step.complete ? undefined : () => router.push(step.href)}
            onKeyDown={step.complete ? undefined : (e) => {
              if (e.key === 'Enter' || e.key === ' ') router.push(step.href)
            }}
          >
            {/* Step indicator */}
            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
              step.complete
                ? 'bg-success/20'
                : 'bg-accent/15'
            }`}>
              {step.complete ? (
                <HugeiconsIcon icon={CheckmarkCircle01Icon} size={20} className="text-success" />
              ) : (
                <HugeiconsIcon icon={step.icon} size={18} className="text-accent" />
              )}
            </div>

            {/* Step content */}
            <div className="flex-1 min-w-0">
              <p className={`text-[14px] font-medium ${step.complete ? 'text-muted-foreground line-through decoration-1' : 'text-foreground'}`}>
                {step.title}
              </p>
              <p className="text-[12px] text-muted-foreground mt-0.5 truncate">
                {step.description}
              </p>
            </div>

            {/* Action */}
            {!step.complete && (
              <div className="shrink-0 hidden sm:block">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    router.push(step.href)
                  }}
                  className="text-[12px]"
                >
                  {step.cta}
                  <HugeiconsIcon icon={ArrowRight01Icon} size={14} className="ml-1" />
                </Button>
              </div>
            )}

            {/* Completed check (mobile) */}
            {step.complete && (
              <span className="text-[11px] text-success font-medium shrink-0">Done</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

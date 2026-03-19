'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { useGuildMembers } from '@/app/hooks/use-api'
import { Button } from '@/components/ui/button'

interface ChecklistStep {
  label: string
  done: boolean
  action?: { label: string; href: string }
}

/**
 * SetupChecklist — shows new guild officers what to do next.
 * Appears on the overview page when not all setup steps are complete.
 * Disappears once all steps are checked off.
 */
export function SetupChecklist() {
  const router = useRouter()
  const { activeGuild, activeCharacter, isOfficer } = useGuildContext()
  const { data: membersData } = useGuildMembers(activeGuild?.id || null)

  const steps = useMemo((): ChecklistStep[] => {
    const hasCharacter = !!activeCharacter
    const hasExpansion = !!activeGuild?.active_expansion_id
    const memberCount = membersData?.members?.length || 0
    const hasMembers = memberCount > 1 // More than just the creator

    return [
      {
        label: 'Create your guild',
        done: true, // Always done if they can see this
      },
      {
        label: 'Add your character',
        done: hasCharacter,
        action: hasCharacter ? undefined : { label: 'Add character', href: '/characters/manage' },
      },
      {
        label: 'Set up your expansion',
        done: hasExpansion,
        action: hasExpansion ? undefined : { label: 'Configure', href: '/admin/guild-settings' },
      },
      {
        label: 'Invite your guildies',
        done: hasMembers,
        action: hasMembers ? undefined : { label: 'Get invite link', href: '/admin/guild-settings' },
      },
      {
        label: 'Review a loot list',
        done: false, // We don't track this — disappears when all others are done
        action: { label: 'View submissions', href: '/loot-submissions' },
      },
    ]
  }, [activeCharacter, activeGuild?.active_expansion_id, membersData?.members?.length])

  // Don't show if not an officer or if all non-final steps are done
  const completedCount = steps.filter(s => s.done).length
  const allPreReqsDone = steps.slice(0, 4).every(s => s.done)

  if (!isOfficer || allPreReqsDone) return null

  return (
    <div className="bg-background-elevated border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[15px] font-semibold text-foreground">Getting started</h3>
        <span className="text-xs text-muted-foreground">{completedCount}/{steps.length} complete</span>
      </div>
      <div className="space-y-2.5">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
              step.done
                ? 'border-success bg-success/20'
                : 'border-border'
            }`}>
              {step.done && (
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-success" />
                </svg>
              )}
            </div>
            <span className={`text-[13px] flex-1 ${step.done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
              {step.label}
            </span>
            {!step.done && step.action && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(step.action!.href)}
                className="text-xs text-accent"
              >
                {step.action.label}
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

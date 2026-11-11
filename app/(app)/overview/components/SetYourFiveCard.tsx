'use client'

/**
 * The Overview's "Set your 5" card (D-14): the in-app way into the picker for
 * a raider in a Discovery guild who has no submitted list yet. Its words come
 * from the module the Discord message reads, so the two cannot drift apart.
 *
 * There is no dismiss control: the card goes away once a list is submitted.
 */
import Link from 'next/link'
import { HugeiconsIcon } from '@hugeicons/react'
import { Target02Icon } from '@hugeicons/core-free-icons'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import * as setYourFiveCopy from '@/domain/loot/set-your-five'

interface SetYourFiveCardProps {
  href?: string
}

export function SetYourFiveCard({ href = '/loot-list?picker=1' }: SetYourFiveCardProps) {
  return (
    <Card className="p-4 sm:p-6">
      {/* Phone: chip, text and button stack. From 640px they share one row. */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10">
          <HugeiconsIcon icon={Target02Icon} size={20} className="text-accent" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-16 font-semibold text-foreground">{setYourFiveCopy.SET_YOUR_FIVE_TITLE}</h2>
          <p className="mt-1 text-14 text-foreground-secondary">{setYourFiveCopy.SET_YOUR_FIVE_BODY}</p>
        </div>
        <Button asChild variant="primary" className="w-full sm:w-auto sm:shrink-0">
          <Link href={href}>{setYourFiveCopy.SET_YOUR_FIVE_CTA}</Link>
        </Button>
      </div>
    </Card>
  )
}

export interface ShowSetYourFiveCardInput {
  /** The active expansion has a guild-active tier in Discovery mode. */
  hasDiscoveryTier: boolean
  /** The tier and list status reads have both come back. */
  statusLoaded: boolean
  /** Either read failed. */
  statusError: boolean
  /** The character's Discovery list status: null when none exists. */
  submissionStatus: string | null
}

/**
 * Pending, Approved, Needs revision and Rejected all count as submitted. Only
 * no list, or a draft, shows the card; an unknown status is treated as
 * submitted so a new status never makes the card nag. Before the reads finish,
 * or if one fails, nothing shows: no loading flash and no extra error (E3).
 */
export function shouldShowSetYourFiveCard({
  hasDiscoveryTier,
  statusLoaded,
  statusError,
  submissionStatus,
}: ShowSetYourFiveCardInput): boolean {
  if (!hasDiscoveryTier || !statusLoaded || statusError) return false
  return submissionStatus === null || submissionStatus === 'draft'
}

export interface DiscoveryListStatusInput {
  tiers: ReadonlyArray<{ phase?: number | null; list_mode?: string | null }> | null
  tiersError: boolean
  submissions: ReadonlyArray<{ phase: number | null; status: string }> | null
  submissionsError: boolean
}

/**
 * Folds the Overview's two existing reads (guild-active tiers, the character's
 * submissions) into what the card needs. Only lists in a phase that has a
 * Discovery tier count. A draft beside a submitted list counts as submitted,
 * since the raider has already sent one in.
 */
export function discoveryListStatus({
  tiers,
  tiersError,
  submissions,
  submissionsError,
}: DiscoveryListStatusInput): Pick<ShowSetYourFiveCardInput, 'hasDiscoveryTier' | 'statusError' | 'submissionStatus'> {
  const discoveryPhases = new Set<number | null>()
  for (const tier of tiers ?? []) {
    if (tier.list_mode === 'discovery') discoveryPhases.add(tier.phase ?? null)
  }

  const lists = (submissions ?? []).filter((sub) => discoveryPhases.has(sub.phase))
  const submitted = lists.find((sub) => sub.status !== 'draft')
  const submissionStatus = submitted ? submitted.status : lists.length > 0 ? 'draft' : null

  return {
    hasDiscoveryTier: discoveryPhases.size > 0,
    statusError: tiersError || submissionsError,
    submissionStatus,
  }
}

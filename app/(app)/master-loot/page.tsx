'use client'

import { createClient } from '@/utils/supabase/client'
import { trackClientEvent } from '@/utils/analytics/client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { useNotification } from '@/app/contexts/NotificationContext'
import { SubmissionsListSkeleton, TierTabsSkeleton } from '@/components/ui/skeletons'
import { ErrorState } from '@/components/ui/error-state'
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Heading } from '@/components/ui/typography'
import { HugeiconsIcon } from '@hugeicons/react'
import { Settings01Icon } from '@hugeicons/core-free-icons'
import { StatusBadge, type SubmissionStatus } from '@/components/ui/status-badge'
import Link from 'next/link'
import ItemLink from '@/app/components/ItemLink'

interface Submission {
  id: string
  status: string
  submitted_at: string | null
  review_notes: string | null
  user: {
    id: string
    user_metadata: {
      full_name?: string
      provider_id?: string
      avatar_url?: string
    }
  }
  member: {
    character_name: string
    role: string
    class: {
      name: string
      color_hex: string
    }
  }
  item_count: number
}

interface RaidTierExpansion {
  id: string
  name: string
}

interface RaidTierRow {
  id: string
  name: string
  is_active: boolean
  expansion: RaidTierExpansion | RaidTierExpansion[]
}

interface RaidTier {
  id: string
  name: string
  is_active: boolean
  expansion: RaidTierExpansion
}

interface RawSubmissionCharacter {
  id: string
  name: string | null
  user_id: string
  class: { name: string; color_hex: string } | Array<{ name: string; color_hex: string }>
}

interface RawLootSubmission {
  id: string
  status: string
  submitted_at: string | null
  review_notes: string | null
  character_id: string
}

interface SubmissionDetailItem {
  rank: number
  loot_item: {
    id: string
    name: string
    boss_name: string
    item_slot: string
    wowhead_id: number
  }
}

export default function MasterLootPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [raidTiers, setRaidTiers] = useState<RaidTier[]>([])
  const [activeTier, setActiveTier] = useState<RaidTier | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reviewing, setReviewing] = useState<string | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [guildId, setGuildId] = useState<string | null>(null)
  const [viewingSubmission, setViewingSubmission] = useState<string | null>(null)
  const [submissionDetails, setSubmissionDetails] = useState<SubmissionDetailItem[]>([])

  const supabase = createClient()
  const router = useRouter()
  const { activeGuild, loading: guildLoading, isOfficer } = useGuildContext()
  const { showNotification } = useNotification()

  useEffect(() => {
    document.title = 'LootList+ • Master Loot'
  }, [])

  // Track page view
  useEffect(() => {
    if (guildId) trackClientEvent('master_loot_page_viewed', { guild_id: guildId })
  }, [guildId])

  useEffect(() => {
    const loadData = async () => {
      if (!guildLoading && !isOfficer) {
        router.push('/overview')
        return
      }

      if (!activeGuild) {
        setLoading(false)
        return
      }

      try {
        setGuildId(activeGuild.id)

        let tiersData: RaidTierRow[] = []
        if (activeGuild.active_expansion_id) {
          const { data: tiersResult } = await supabase
            .from('raid_tiers')
            .select(`
              id,
              name,
              is_active,
              expansion:expansions!inner (
                id,
                name
              )
            `)
            .eq('expansion.id', activeGuild.active_expansion_id)
            .eq('is_guild_active', true)
            .order('name', { ascending: true })

          if (tiersResult) {
            tiersData = tiersResult
          }
        }

        if (tiersData && tiersData.length > 0) {
          const transformedData = tiersData.map((tier: RaidTierRow) => ({
            ...tier,
            expansion: Array.isArray(tier.expansion) ? tier.expansion[0] : tier.expansion
          }))
          setRaidTiers(transformedData as RaidTier[])
          const active = transformedData.find((t: RaidTier) => t.is_active) as RaidTier | undefined
          if (active) {
            setActiveTier(active)
          }
        }
      } catch (error) {
        console.error('Error loading master loot data:', error)
        setError("Couldn't load master loot data. Check your connection and try again.")
      } finally {
        setLoading(false)
      }
    }

    if (!guildLoading) {
      loadData().catch(console.error)
    }
  }, [guildLoading, activeGuild])

  const loadSubmissions = useCallback(async (guildId: string, tierId: string) => {
    const { data: submissionsData } = await supabase
      .from('loot_submissions')
      .select(`
        id,
        status,
        submitted_at,
        review_notes,
        character_id
      `)
      .eq('guild_id', guildId)
      .eq('raid_tier_id', tierId)

    if (!submissionsData) return

    const submissionsWithDetails = await Promise.all(
      submissionsData.map(async (sub: RawLootSubmission) => {
        const { data: characterData } = await supabase
          .from('characters')
          .select(`
            id,
            name,
            user_id,
            class:wow_classes(name, color_hex)
          `)
          .eq('id', sub.character_id)
          .single()

        const typedCharacter = characterData as unknown as RawSubmissionCharacter | null
        const charClass = typedCharacter?.class
          ? (Array.isArray(typedCharacter.class) ? typedCharacter.class[0] : typedCharacter.class)
          : null

        const { count } = await supabase
          .from('loot_submission_items')
          .select('*', { count: 'exact', head: true })
          .eq('submission_id', sub.id)
          .is('removed_at', null)

        return {
          ...sub,
          member: typedCharacter ? {
            character_name: typedCharacter.name || 'Unknown',
            role: 'Member',
            class: charClass
          } : null,
          item_count: count || 0,
          user: {
            id: typedCharacter?.user_id || '',
            user_metadata: {}
          }
        }
      })
    )

    setSubmissions(submissionsWithDetails as Submission[])
  }, [supabase])

  useEffect(() => {
    if (guildId && activeTier) {
      loadSubmissions(guildId, activeTier.id)
    }
  }, [activeTier, guildId, loadSubmissions])

  const handleReview = async (submissionId: string, status: 'approved' | 'rejected') => {
    setReviewing(submissionId)

    try {
      const response = await fetch('/api/loot-submissions/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submission_id: submissionId,
          status,
          review_notes: reviewNotes || null
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Couldn\'t update submission')
      }

      const submission = submissions.find(s => s.id === submissionId)
      trackClientEvent('master_loot_awarded', {
        guild_id: guildId,
        item_name: status,
        character_name: submission?.member?.character_name || 'Unknown'
      })

      const statusMessages: Record<string, string> = {
        approved: 'Submission approved. Rankings will update.',
        needs_revision: 'Sent back for revision.',
        pending: 'Submission set to pending.',
      }
      showNotification('success', statusMessages[status] || `Submission ${status}`)
      setReviewNotes('')
      setReviewing(null)

      if (guildId && activeTier) {
        await loadSubmissions(guildId, activeTier.id)
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Couldn\'t update submission. Try again.'
      showNotification('error', message)
      setReviewing(null)
    }
  }

  const viewSubmissionDetails = async (submissionId: string) => {
    setViewingSubmission(submissionId)

    const { data: itemsData } = await supabase
      .from('loot_submission_items')
      .select(`
        rank,
        loot_item:loot_items(id, name, boss_name, item_slot, wowhead_id)
      `)
      .eq('submission_id', submissionId)
      .is('removed_at', null)
      .order('rank', { ascending: false })

    if (itemsData) {
      setSubmissionDetails(itemsData as SubmissionDetailItem[])
    }
  }

  const filteredSubmissions = submissions.filter(sub => {
    if (filter === 'all') return true
    return sub.status === filter
  })

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 font-poppins">
      {/* Header with Settings Button - Always visible */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Heading level={1}>Master Loot</Heading>
          <p className="text-muted-foreground mt-1 text-base">Manage loot submissions and available items</p>
        </div>
        <Link
          href="/loot-settings"
          className="flex items-center gap-2 px-5 py-2.5 bg-muted hover:bg-muted border border-border rounded-lg text-foreground text-[14px] font-medium transition"
        >
          <HugeiconsIcon icon={Settings01Icon} size={16} />
          Loot settings
        </Link>
      </div>

      {/* Show skeleton while loading */}
      {loading ? (
        <div className="space-y-6">
          <TierTabsSkeleton />
          <SubmissionsListSkeleton count={4} />
        </div>
      ) : error ? (
        <ErrorState
          message={error}
          onRetry={() => window.location.reload()}
          size="lg"
          variant="card"
        />
      ) : (
        <>
      {/* Submissions */}
      <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
              <Button
                key={status}
                variant={filter === status ? 'accent-subtle' : 'outline'}
                size="sm"
                onClick={() => setFilter(status)}
                className="rounded-full whitespace-nowrap"
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Button>
            ))}
          </div>

          {/* Submissions List */}
          <div className="space-y-3">
            {filteredSubmissions.length === 0 ? (
              <div className="bg-background-elevated border border-border rounded-xl p-8 text-center">
                <p className="text-muted-foreground">No submissions yet. They will appear here once raiders submit their Loot Lists.</p>
              </div>
            ) : (
              filteredSubmissions.map((submission) => (
                <div
                  key={submission.id}
                  className="bg-background-elevated border border-border rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted transition-colors"
                >
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <h3 className="text-[16px] sm:text-[20px] font-semibold text-foreground">
                      {submission.member?.character_name || 'Unknown'}
                    </h3>
                    {submission.member?.class && (
                      <span
                        className="px-2 sm:px-3 py-1 rounded-full text-[11px] sm:text-[12px] font-medium"
                        style={{ backgroundColor: submission.member.class.color_hex, color: 'white' }}
                      >
                        {submission.member.class.name}
                      </span>
                    )}
                    <StatusBadge status={submission.status as SubmissionStatus} />
                    <span className="text-muted-foreground text-[12px] sm:text-[14px]">
                      {submission.item_count} items • {submission.submitted_at ? new Date(submission.submitted_at).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }) : 'N/A'}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => viewSubmissionDetails(submission.id)}
                    className="w-full sm:w-auto"
                  >
                    View details
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

      {/* Submission Details Modal */}
      <Modal open={!!viewingSubmission} onClose={() => setViewingSubmission(null)}>
        <ModalHeader onClose={() => setViewingSubmission(null)}>
          <ModalTitle>Submission details</ModalTitle>
        </ModalHeader>
        <ModalBody>
          {submissionDetails.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">This submission has no ranked items.</p>
          ) : (
            <div className="space-y-2">
              {submissionDetails.map((detail: SubmissionDetailItem, idx: number) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b border-border">
                  <div>
                    <ItemLink
                      name={detail.loot_item?.name || 'Unknown'}
                      wowheadId={detail.loot_item?.wowhead_id}
                      className="font-medium text-[14px]"
                    />
                    <p className="text-muted-foreground text-[12px]">{detail.loot_item?.boss_name}</p>
                  </div>
                  <span className="px-3 py-1 bg-accent text-foreground rounded-full text-[13px] font-medium">
                    Rank {detail.rank}
                  </span>
                </div>
              ))}
            </div>
          )}
        </ModalBody>
        <ModalFooter className="flex justify-between items-center">
          <div className="flex gap-2">
            {viewingSubmission && submissions.find(s => s.id === viewingSubmission)?.status === 'pending' && (
              <>
                <Button
                  variant="success"
                  onClick={() => {
                    handleReview(viewingSubmission, 'approved')
                    setViewingSubmission(null)
                  }}
                  loading={reviewing === viewingSubmission}
                >
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    handleReview(viewingSubmission, 'rejected')
                    setViewingSubmission(null)
                  }}
                  disabled={reviewing === viewingSubmission}
                >
                  Reject
                </Button>
              </>
            )}
          </div>
          <Button variant="outline" onClick={() => setViewingSubmission(null)}>
            Close
          </Button>
        </ModalFooter>
      </Modal>
        </>
      )}
    </div>
  )
}

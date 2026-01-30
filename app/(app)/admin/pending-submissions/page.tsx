'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { useNotification } from '@/app/contexts/NotificationContext'
import { HugeiconsIcon } from '@hugeicons/react'
import { Tick01Icon, Cancel01Icon, Clock01Icon, UserIcon, CheckmarkCircle01Icon } from '@hugeicons/core-free-icons'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { useConfirm } from '@/components/ui/confirm-modal'
import { Heading } from '@/components/ui/typography'
import { PendingSubmissionsListSkeleton } from '@/components/ui/skeletons'

interface PendingSubmission {
  id: string
  character_id: string
  raid_tier_id: string
  status: string
  created_at: string
  updated_at: string
  character: {
    name: string
    class: {
      name: string
      color_hex: string
    } | null
  }
  raid_tier: {
    name: string
  }
  // Count of items in this submission
  item_count: number
}

export default function PendingSubmissionsPage() {
  const [submissions, setSubmissions] = useState<PendingSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)

  const supabase = createClient()
  const router = useRouter()
  const { activeGuild, loading: guildLoading, isOfficer } = useGuildContext()
  const { showNotification } = useNotification()
  const { confirm, ConfirmDialog } = useConfirm()

  useEffect(() => {
    document.title = 'LootList+ • Pending Submissions'
  }, [])

  useEffect(() => {
    if (!guildLoading) {
      if (!isOfficer) {
        router.push('/overview')
        return
      }
      if (activeGuild) {
        loadPendingSubmissions()
      }
    }
  }, [guildLoading, activeGuild, isOfficer])

  const loadPendingSubmissions = async () => {
    if (!activeGuild) return

    setLoading(true)
    try {
      // Get all pending submissions for this guild
      const { data, error } = await supabase
        .from('loot_submissions')
        .select(`
          id,
          character_id,
          raid_tier_id,
          status,
          created_at,
          updated_at,
          character:characters!inner (
            name,
            class:wow_classes (
              name,
              color_hex
            )
          ),
          raid_tier:raid_tiers!inner (
            name,
            expansion:expansions!inner (
              guild_id
            )
          )
        `)
        .eq('status', 'pending')
        .eq('raid_tier.expansion.guild_id', activeGuild.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading pending submissions:', error)
        showNotification('error', 'Couldn\'t load submissions. Check your connection and try again.')
        return
      }

      // Transform the data to handle nested arrays from Supabase
      const transformedData = (data || []).map(sub => {
        const character = Array.isArray(sub.character) ? sub.character[0] : sub.character
        const charClass = Array.isArray(character?.class) ? character.class[0] : character?.class
        const raidTier = Array.isArray(sub.raid_tier) ? sub.raid_tier[0] : sub.raid_tier

        return {
          ...sub,
          character: {
            name: character?.name || 'Unknown',
            class: charClass || null
          },
          raid_tier: {
            name: raidTier?.name || 'Unknown'
          }
        }
      })

      // Get item counts for each submission
      const submissionsWithCounts = await Promise.all(
        transformedData.map(async (sub) => {
          const { count } = await supabase
            .from('loot_submission_items')
            .select('*', { count: 'exact', head: true })
            .eq('submission_id', sub.id)

          return {
            ...sub,
            item_count: count || 0
          }
        })
      )

      setSubmissions(submissionsWithCounts as PendingSubmission[])
    } catch (error) {
      console.error('Error loading pending submissions:', error)
      showNotification('error', 'Couldn\'t load submissions. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (submissionId: string) => {
    setProcessing(submissionId)

    try {
      const { error } = await supabase
        .from('loot_submissions')
        .update({ status: 'approved', updated_at: new Date().toISOString() })
        .eq('id', submissionId)

      if (error) throw error

      showNotification('success', 'Submission approved')
      await loadPendingSubmissions()
    } catch (error: any) {
      console.error('Error approving submission:', error)
      showNotification('error', error.message || 'Couldn\'t approve submission. Try again.')
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = (submissionId: string) => {
    confirm({
      title: 'Reject submission',
      description: 'Are you sure you want to reject this submission? The player will need to resubmit.',
      confirmLabel: 'Reject',
      variant: 'danger',
      onConfirm: async () => {
        setProcessing(submissionId)

        try {
          const { error } = await supabase
            .from('loot_submissions')
            .update({ status: 'rejected', updated_at: new Date().toISOString() })
            .eq('id', submissionId)

          if (error) throw error

          showNotification('success', 'Submission rejected')
          await loadPendingSubmissions()
        } catch (error: any) {
          console.error('Error rejecting submission:', error)
          showNotification('error', error.message || 'Couldn\'t reject submission. Try again.')
        } finally {
          setProcessing(null)
        }
      }
    })
  }

  return (
    <div className="min-h-screen bg-background-subtle p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header - Always visible */}
        <div className="mb-8">
          <Heading level={1}>Pending Submissions</Heading>
          <p className="text-muted-foreground mt-1 text-base">
            Review and approve loot list submissions from your guild members
          </p>
        </div>

        {/* Show skeleton while loading */}
        {(loading || guildLoading) ? (
          <PendingSubmissionsListSkeleton count={3} />
        ) : (
          <>
        {/* Submissions List */}
        {submissions.length === 0 ? (
          <EmptyState
            icon={CheckmarkCircle01Icon}
            title="No pending submissions"
            description="All submissions have been reviewed"
            size="lg"
            variant="card"
          />
        ) : (
          <div className="space-y-4">
            {submissions.map((submission) => (
              <div
                key={submission.id}
                className="p-4 sm:p-6 bg-background-elevated border border-border rounded-xl"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  {/* Submission Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <HugeiconsIcon icon={UserIcon} size={20} className="text-muted-foreground" />
                      <div>
                        <p
                          className="text-[16px] font-semibold"
                          style={{ color: submission.character.class?.color_hex || '#fff' }}
                        >
                          {submission.character.name}
                        </p>
                        {submission.character.class && (
                          <p className="text-[13px] text-muted-foreground">
                            {submission.character.class.name}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] text-muted-foreground">Raid Tier:</span>
                        <span className="text-[13px] text-foreground font-medium">
                          {submission.raid_tier.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] text-muted-foreground">Items:</span>
                        <span className="text-[13px] text-foreground font-medium">
                          {submission.item_count} items
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] text-muted-foreground">Submitted:</span>
                        <span className="text-[13px] text-foreground">
                          {new Date(submission.created_at).toLocaleString()}
                        </span>
                      </div>
                      {submission.updated_at !== submission.created_at && (
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] text-muted-foreground">Last Updated:</span>
                          <span className="text-[13px] text-foreground">
                            {new Date(submission.updated_at).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                    <Button
                      variant="success"
                      onClick={() => handleApprove(submission.id)}
                      loading={processing === submission.id}
                      className="justify-center"
                    >
                      <HugeiconsIcon icon={Tick01Icon} size={16} />
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleReject(submission.id)}
                      disabled={processing === submission.id}
                      className="justify-center"
                    >
                      <HugeiconsIcon icon={Cancel01Icon} size={16} />
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

            {/* Summary */}
            {submissions.length > 0 && (
              <div className="mt-6 p-4 bg-background-elevated border border-border rounded-xl">
                <p className="text-[13px] text-muted-foreground">
                  Total Pending: <span className="text-foreground font-medium">{submissions.length}</span>
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {ConfirmDialog}
    </div>
  )
}

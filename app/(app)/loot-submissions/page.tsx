'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { useNotification } from '@/app/contexts/NotificationContext'
import { TierTabsSkeleton, SubmissionsListSkeleton } from '@/components/ui/skeletons'
import { StatusBadge, type SubmissionStatus } from '@/components/ui/status-badge'
import { ClassificationBadge } from '@/components/ui/classification-badge'
import { EmptyState } from '@/components/ui/empty-state'
import { ScrollIcon, AlertCircleIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
} from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Heading } from '@/components/ui/typography'
import ItemLink from '@/app/components/ItemLink'
import { refreshWowheadTooltips } from '@/lib/wowhead'

interface Submission {
  id: string
  status: string
  submitted_at: string | null
  review_notes: string | null
  tier_name?: string
  tier_id?: string
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

interface Phase {
  phase: number
  expansion_id: string
  expansion_name: string
}

export default function MasterLootPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [phases, setPhases] = useState<Phase[]>([])
  const [activePhase, setActivePhase] = useState<Phase | 'all' | null>(null)
  const [initialLoading, setInitialLoading] = useState(true)
  const [contentLoading, setContentLoading] = useState(false)
  const [reviewing, setReviewing] = useState<string | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [user, setUser] = useState<User | null>(null)
  const [guildId, setGuildId] = useState<string | null>(null)
    const [viewingSubmission, setViewingSubmission] = useState<string | null>(null)
  const [submissionDetails, setSubmissionDetails] = useState<any[]>([])
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'single' | 'pending' | 'all', id?: string } | null>(null)
  const [deleting, setDeleting] = useState(false)

  // PERFORMANCE: Track current request to prevent race conditions when rapidly clicking submissions
  const currentDetailRequestRef = useRef<string | null>(null)

  const supabase = createClient()
  const router = useRouter()
  const { activeGuild, loading: guildLoading, isOfficer } = useGuildContext()
  const { showNotification } = useNotification()

  useEffect(() => {
    document.title = 'LootList+ • Loot Submissions'
  }, [])

  // Refresh Wowhead tooltips when submission details modal opens
  // Uses centralized debounced refresh to prevent excessive API calls
  useEffect(() => {
    if (submissionDetails.length > 0) {
      refreshWowheadTooltips()
    }
  }, [submissionDetails])

  useEffect(() => {
    const loadData = async () => {
      // Wait for guild context to finish loading
      if (guildLoading) {
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }
      setUser(user)

      if (!isOfficer) {
        router.push('/overview')
        return
      }

      if (!activeGuild) {
        setInitialLoading(false)
        return
      }

      setGuildId(activeGuild.id)

      // Get expansion info and create phase options
      if (activeGuild.active_expansion_id) {
        const { data: expansion } = await supabase
          .from('expansions')
          .select('id, name')
          .eq('id', activeGuild.active_expansion_id)
          .single()

        if (expansion) {
          // Create phase options (1-5 is typical for WoW expansions)
          const phaseOptions: Phase[] = []
          for (let i = 1; i <= 5; i++) {
            phaseOptions.push({
              phase: i,
              expansion_id: expansion.id,
              expansion_name: expansion.name
            })
          }
          setPhases(phaseOptions)
          setActivePhase('all')
        }
      }
      setInitialLoading(false)
    }

    if (!guildLoading) {
      loadData()
    }
  }, [guildLoading, activeGuild])

  const loadSubmissions = useCallback(async (guildId: string, phase: Phase | 'all', expansionId?: string) => {
    setContentLoading(true)

    // Build query for submissions with character info
    // Exclude drafts - they haven't been submitted for review yet
    let query = supabase
      .from('loot_submissions')
      .select(`
        id,
        status,
        submitted_at,
        review_notes,
        character_id,
        expansion_id,
        phase,
        character:characters (
          name,
          class:wow_classes (
            name,
            color_hex
          )
        )
      `)
      .eq('guild_id', guildId)
      .neq('status', 'draft')

    // Filter by expansion
    if (expansionId) {
      query = query.eq('expansion_id', expansionId)
    }

    // Filter by phase if not 'all'
    if (phase !== 'all') {
      query = query.eq('phase', phase.phase)
    }

    query = query.order('submitted_at', { ascending: false })

    const { data: submissionsData, error } = await query

    if (error) {
      console.error('Error loading submissions:', error)
      setContentLoading(false)
      return
    }

    if (!submissionsData) {
      setSubmissions([])
      setContentLoading(false)
      return
    }

    // Get item counts for each submission
    const submissionIds = submissionsData.map((s: { id: string }) => s.id)
    const { data: itemCounts } = await supabase
      .from('loot_submission_items')
      .select('submission_id')
      .in('submission_id', submissionIds)

    const countMap: Record<string, number> = {}
    itemCounts?.forEach((item: { submission_id: string }) => {
      countMap[item.submission_id] = (countMap[item.submission_id] || 0) + 1
    })

    // Transform data to match expected format
    const formattedSubmissions = submissionsData.map((sub: any) => {
      const character = Array.isArray(sub.character) ? sub.character[0] : sub.character
      const charClass = Array.isArray(character?.class) ? character.class[0] : character?.class

      return {
        id: sub.id,
        status: sub.status,
        submitted_at: sub.submitted_at,
        review_notes: sub.review_notes,
        character_id: sub.character_id,
        tier_name: `Phase ${sub.phase}`,
        tier_id: sub.expansion_id,
        member: {
          character_name: character?.name || 'Unknown Character',
          role: 'Member',
          class: {
            name: charClass?.name || 'Unknown',
            color_hex: charClass?.color_hex || '#ffffff'
          }
        },
        item_count: countMap[sub.id] || 0,
        user: {
          id: '',
          user_metadata: {}
        }
      }
    })

    setSubmissions(formattedSubmissions as any)
    setContentLoading(false)
  }, [supabase])

  useEffect(() => {
    if (guildId && activePhase !== null && activeGuild?.active_expansion_id) {
      loadSubmissions(guildId, activePhase, activeGuild.active_expansion_id)
    }
  }, [activePhase, guildId, activeGuild?.active_expansion_id, loadSubmissions])

  const handleReview = async (submissionId: string, status: 'approved' | 'rejected') => {
    setReviewing(submissionId)

    try {
      const { data, error } = await supabase
        .from('loot_submissions')
        .update({
          status,
          review_notes: reviewNotes || null
        })
        .eq('id', submissionId)
        .select()

      if (error) throw error

      if (!data || data.length === 0) {
        throw new Error('No rows updated - check RLS policies')
      }

      // Send Discord DM notification (fire and forget - don't block on this)
      const submission = submissions.find(s => s.id === submissionId)
      const phaseNumber = typeof activePhase === 'object' ? activePhase?.phase : null
      fetch('/api/discord/send-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submission_id: submissionId,
          status,
          review_notes: reviewNotes || undefined,
          guild_name: activeGuild?.name,
          character_name: submission?.member?.character_name,
          phase: phaseNumber
        })
      }).catch(err => console.error('Failed to send Discord notification:', err))

      showNotification('success', `Submission ${status}`)
      setReviewNotes('')
      setReviewing(null)

      if (guildId && activePhase !== null && activeGuild?.active_expansion_id) {
        await loadSubmissions(guildId, activePhase, activeGuild.active_expansion_id)
      }
    } catch (error: any) {
      showNotification('error', error.message || 'Couldn\'t update submission. Try again.')
      setReviewing(null)
    }
  }

  const viewSubmissionDetails = async (submissionId: string) => {
    // Track this request to prevent race conditions
    currentDetailRequestRef.current = submissionId

    setViewingSubmission(submissionId)
    setReviewNotes('') // Clear previous review notes
    setSubmissionDetails([]) // Clear previous data immediately
    setLoadingDetails(true)

    const { data: itemsData } = await supabase
      .from('loot_submission_items')
      .select(`
        rank,
        loot_item:loot_items(id, name, boss_name, item_slot, wowhead_id, classification)
      `)
      .eq('submission_id', submissionId)
      .order('rank', { ascending: false })

    // Only update state if this is still the current request (prevents race conditions)
    if (currentDetailRequestRef.current === submissionId) {
      if (itemsData) {
        setSubmissionDetails(itemsData as any)
      }
      setLoadingDetails(false)
    }
  }

  const handleDeleteSubmissions = async () => {
    if (!guildId || !deleteTarget || activePhase === null) return

    setDeleting(true)
    try {
      // Build request body based on deletion type
      const requestBody: { guild_id: string; submission_id?: string; target?: string } = {
        guild_id: guildId
      }

      if (deleteTarget.type === 'single' && deleteTarget.id) {
        requestBody.submission_id = deleteTarget.id
      } else {
        requestBody.target = deleteTarget.type === 'pending' ? 'pending' : 'all'
      }

      const response = await fetch('/api/loot-submissions/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete submission')
      }

      const result = await response.json()
      if (deleteTarget.type === 'single') {
        showNotification('success', 'Submission deleted')
      } else {
        showNotification('success', `Deleted ${result.count} submission${result.count !== 1 ? 's' : ''}`)
      }

      if (activeGuild?.active_expansion_id) {
        await loadSubmissions(guildId, activePhase, activeGuild.active_expansion_id)
      }

      setShowDeleteConfirm(false)
      setDeleteTarget(null)
    } catch (error: any) {
      console.error('Error deleting submissions:', error)
      showNotification('error', error.message || 'Couldn\'t delete submissions. Try again.')
    } finally {
      setDeleting(false)
    }
  }

  const filteredSubmissions = submissions.filter(sub => {
    if (filter === 'all') return true
    return sub.status === filter
  })

  // Memoize grouped submission details to avoid recalculating on every render
  const groupedSubmissionDetails = useMemo(() => {
    const grouped: Record<number, any[]> = {}
    for (const detail of submissionDetails) {
      const rank = detail.rank
      if (!grouped[rank]) grouped[rank] = []
      grouped[rank].push(detail)
    }
    return Object.entries(grouped).sort(([a], [b]) => Number(b) - Number(a))
  }, [submissionDetails])

  return (
    <div className="font-poppins">
      {/* Header - Always visible */}
      <div className="p-4 sm:p-6 lg:p-8 pb-1.5">
        <Heading level={1}>Loot Submissions</Heading>
        <p className="text-muted-foreground mt-1 text-base">Review and manage character loot submissions</p>
      </div>

      {/* Phase Selector - Sticky */}
      {initialLoading ? (
        <div className="px-4 sm:px-6 lg:px-8 py-1.5 bg-background">
          <TierTabsSkeleton />
        </div>
      ) : phases.length > 0 && (
        <div className="sticky top-0 z-20 px-4 sm:px-6 lg:px-8 py-1.5 bg-background">
          <div className="flex items-center gap-3 overflow-x-auto pb-1">
            <div className="flex gap-2">
              {/* All Phases Button */}
              <Button
                variant={activePhase === 'all' ? 'accent-subtle' : 'secondary'}
                size="sm"
                onClick={() => setActivePhase('all')}
                className="rounded-[40px] whitespace-nowrap"
              >
                All Phases
              </Button>
              {phases.map((phase) => (
                <Button
                  key={phase.phase}
                  variant={activePhase !== 'all' && activePhase?.phase === phase.phase ? 'accent-subtle' : 'secondary'}
                  size="sm"
                  onClick={() => setActivePhase(phase)}
                  className="rounded-[40px] whitespace-nowrap"
                >
                  Phase {phase.phase}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="px-4 sm:px-6 lg:px-8 pt-1.5 pb-6 space-y-6">
      {initialLoading ? (
        <SubmissionsListSkeleton count={5} />
      ) : (
        <>
      {/* Submissions */}
      <div className="space-y-4">
          {/* Filters and Delete Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 w-full sm:w-auto">
              {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
                <Button
                  key={status}
                  variant={filter === status ? 'accent-subtle' : 'secondary'}
                  size="sm"
                  onClick={() => setFilter(status)}
                  className="rounded-[40px] whitespace-nowrap"
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Button>
              ))}
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button
                variant="destructive-outline"
                size="sm"
                onClick={() => {
                  setDeleteTarget({ type: 'pending' })
                  setShowDeleteConfirm(true)
                }}
              >
                Delete Pending
              </Button>
              <Button
                variant="destructive-outline"
                size="sm"
                onClick={() => {
                  setDeleteTarget({ type: 'all' })
                  setShowDeleteConfirm(true)
                }}
              >
                Delete All
              </Button>
            </div>
          </div>

          {/* Submissions List */}
          <div className="space-y-3">
            {contentLoading ? (
              <SubmissionsListSkeleton count={4} />
            ) : filteredSubmissions.length === 0 ? (
              <EmptyState
                icon={ScrollIcon}
                title="No submissions found"
                description="No loot list submissions match your current filters"
                variant="card"
              />
            ) : (
              filteredSubmissions.map((submission) => (
                <div
                  key={submission.id}
                  className="bg-background-elevated border border-border rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 hover:bg-muted transition-all cursor-pointer"
                  onClick={() => viewSubmissionDetails(submission.id)}
                >
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <h3
                      className="text-[16px] font-semibold"
                      style={{ color: submission.member?.class?.color_hex || 'var(--foreground)' }}
                    >
                      {submission.member?.character_name || 'Unknown'}
                    </h3>
                    {submission.tier_name && (
                      <span className="text-muted-foreground text-[13px]">
                        {submission.tier_name}
                      </span>
                    )}
                    <StatusBadge status={submission.status as SubmissionStatus} />
                    <span className="text-muted-foreground text-[13px]">
                      {submission.item_count} items • Submitted {submission.submitted_at ? new Date(submission.submitted_at).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }) : 'N/A'}
                    </span>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {submission.status === 'pending' && (
                      <>
                        <Button
                          variant="success"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleReview(submission.id, 'approved')
                          }}
                          disabled={reviewing === submission.id}
                          loading={reviewing === submission.id}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleReview(submission.id, 'rejected')
                          }}
                          disabled={reviewing === submission.id}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        viewSubmissionDetails(submission.id)
                      }}
                    >
                      View
                    </Button>
                    <Button
                      variant="destructive-outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeleteTarget({ type: 'single', id: submission.id })
                        setShowDeleteConfirm(true)
                      }}
                      title="Delete this submission"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      {/* Submission Details Modal */}
      <Modal open={!!viewingSubmission} onClose={() => { setViewingSubmission(null); setReviewNotes('') }} size="lg">
        <ModalHeader onClose={() => { setViewingSubmission(null); setReviewNotes('') }}>
          {(() => {
            const submission = viewingSubmission ? submissions.find(s => s.id === viewingSubmission) : null
            return (
              <div className="flex flex-col gap-1">
                <ModalTitle>
                  <span style={{ color: submission?.member?.class?.color_hex || 'inherit' }}>
                    {submission?.member?.character_name || 'Unknown Character'}
                  </span>
                  {submission?.member?.class?.name && (
                    <span className="text-muted-foreground font-normal text-base ml-2">
                      {submission.member.class.name}
                    </span>
                  )}
                </ModalTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {submission?.tier_name && (
                    <span>{submission.tier_name}</span>
                  )}
                  {submission?.tier_name && submission?.submitted_at && <span>•</span>}
                  {submission?.submitted_at && (
                    <span>Submitted {new Date(submission.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  )}
                  {submission?.status && (
                    <>
                      <span>•</span>
                      <StatusBadge status={submission.status as SubmissionStatus} />
                    </>
                  )}
                </div>
              </div>
            )
          })()}
        </ModalHeader>
        <ModalBody className="p-0">
          {loadingDetails ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
            </div>
          ) : submissionDetails.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No items in this submission</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-background-subtle border-b border-border">
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground w-12">Rank</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Item #1</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Item #2</th>
                </tr>
              </thead>
              <tbody>
                {groupedSubmissionDetails.map(([rank, items]) => {
                    const rankNum = Number(rank)
                    const getRankColor = (r: number) => {
                      if (r >= 48) return 'from-red-900 to-red-700'
                      if (r >= 45) return 'from-orange-900 to-orange-700'
                      if (r >= 42) return 'from-yellow-900 to-yellow-700'
                      if (r >= 39) return 'from-amber-900 to-amber-700'
                      if (r >= 25) return 'from-green-900 to-green-700'
                      return 'from-blue-900 to-blue-700'
                    }
                    const itemsArr = items as any[]
                    return (
                      <tr key={rank} className="border-b border-border">
                        <td className={`px-3 py-2 font-semibold text-sm text-foreground bg-gradient-to-r ${getRankColor(rankNum)}`}>
                          {rank}
                        </td>
                        <td className="px-3 py-2">
                          {itemsArr[0] ? (
                            <div className="flex items-center gap-2">
                              <ItemLink
                                name={itemsArr[0].loot_item?.name || 'Unknown'}
                                wowheadId={itemsArr[0].loot_item?.wowhead_id}
                                className="font-medium text-sm"
                              />
                              {itemsArr[0].loot_item?.classification && (
                                <ClassificationBadge classification={itemsArr[0].loot_item.classification as 'Reserved' | 'Limited' | 'Unlimited'} />
                              )}
                            </div>
                          ) : <span className="text-muted-foreground text-sm">-</span>}
                        </td>
                        <td className="px-3 py-2">
                          {itemsArr[1] ? (
                            <div className="flex items-center gap-2">
                              <ItemLink
                                name={itemsArr[1].loot_item?.name || 'Unknown'}
                                wowheadId={itemsArr[1].loot_item?.wowhead_id}
                                className="font-medium text-sm"
                              />
                              {itemsArr[1].loot_item?.classification && (
                                <ClassificationBadge classification={itemsArr[1].loot_item.classification as 'Reserved' | 'Limited' | 'Unlimited'} />
                              )}
                            </div>
                          ) : <span className="text-muted-foreground text-sm">-</span>}
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          )}
        </ModalBody>
        {viewingSubmission && submissions.find(s => s.id === viewingSubmission)?.status === 'pending' && (
          <ModalFooter className="flex-col items-stretch gap-4">
            <div className="w-full">
              <Label htmlFor="review-notes" className="text-sm font-medium mb-2 block">
                Review Notes (optional)
              </Label>
              <Textarea
                id="review-notes"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Add notes for the raider about this submission..."
                className="w-full min-h-[80px]"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button
                variant="destructive"
                onClick={async () => {
                  await handleReview(viewingSubmission, 'rejected')
                  setViewingSubmission(null)
                  setReviewNotes('')
                }}
                disabled={reviewing === viewingSubmission}
              >
                Reject
              </Button>
              <Button
                variant="success"
                onClick={async () => {
                  await handleReview(viewingSubmission, 'approved')
                  setViewingSubmission(null)
                  setReviewNotes('')
                }}
                disabled={reviewing === viewingSubmission}
                loading={reviewing === viewingSubmission}
              >
                Approve
              </Button>
            </div>
          </ModalFooter>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false)
          setDeleteTarget(null)
        }}
        size="sm"
        zIndex={60}
      >
        <ModalHeader>
          <ModalTitle>
            {deleteTarget?.type === 'single' ? 'Delete Submission?' :
             deleteTarget?.type === 'pending' ? 'Delete Pending Lists?' :
             'Delete All Lists?'}
          </ModalTitle>
        </ModalHeader>
        <ModalBody>
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-destructive/20 rounded-full flex items-center justify-center">
              <HugeiconsIcon icon={AlertCircleIcon} size={24} className="text-destructive" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-4">
                {deleteTarget?.type === 'single'
                  ? 'This will permanently delete this loot submission. The user will need to recreate their list.'
                  : deleteTarget?.type === 'pending'
                  ? 'This will permanently delete all pending loot submissions for this guild. Users will need to recreate their lists.'
                  : 'This will permanently delete ALL loot submissions (pending, approved, and received) for this guild. This action cannot be undone.'}
              </p>
              <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3">
                <p className="text-sm text-destructive font-medium">
                  This is a permanent action.
                </p>
              </div>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="secondary"
            onClick={() => {
              setShowDeleteConfirm(false)
              setDeleteTarget(null)
            }}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeleteSubmissions}
            disabled={deleting}
            loading={deleting}
          >
            Delete
          </Button>
        </ModalFooter>
      </Modal>
        </>
      )}
      </div>
    </div>
  )
}

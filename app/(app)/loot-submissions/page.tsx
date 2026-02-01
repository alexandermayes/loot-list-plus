'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect, useCallback } from 'react'
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
import { Heading } from '@/components/ui/typography'
import { StarFilledIcon } from '@/components/ui/icons'
import Link from 'next/link'
import ItemLink from '@/app/components/ItemLink'
import { normalizeBossName } from '@/utils/bossOrder'
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

interface RaidTier {
  id: string
  name: string
  is_active: boolean
  expansion: {
    name: string
  }
}

// Define raid tier progression order (Classic + TBC + WotLK)
const getRaidTierOrder = (tierName: string): number => {
  const order: Record<string, number> = {
    // Classic
    'Molten Core': 1, 'MC': 1,
    'Onyxia\'s Lair': 2, 'Onyxia': 2,
    'Blackwing Lair': 3, 'BWL': 3,
    'Zul\'Gurub': 4, 'ZG': 4,
    'Ruins of Ahn\'Qiraj': 5, 'AQ20': 5,
    'Temple of Ahn\'Qiraj': 6, 'AQ40': 6,
    'Naxxramas': 7, 'Naxx': 7,
    // TBC
    'Karazhan': 10, 'Kara': 10,
    'Gruul\'s Lair': 11, 'Gruul': 11,
    'Magtheridon\'s Lair': 12, 'Magtheridon': 12, 'Mag': 12,
    'Serpentshrine Cavern': 20, 'SSC': 20,
    'Tempest Keep: The Eye': 21, 'Tempest Keep': 21, 'The Eye': 21, 'TK': 21,
    'Hyjal Summit': 30, 'Mount Hyjal': 30, 'Hyjal': 30,
    'Black Temple': 31, 'BT': 31,
    'Zul\'Aman': 32, 'ZA': 32,
    'Sunwell Plateau': 33, 'Sunwell': 33, 'SWP': 33,
    // WotLK
    'Vault of Archavon': 40, 'VoA': 40,
    'Obsidian Sanctum': 41, 'OS': 41,
    'Eye of Eternity': 42, 'EoE': 42,
    'Naxxramas (10)': 43, 'Naxxramas (25)': 44,
    'Ulduar': 50,
    'Trial of the Crusader': 60, 'ToC': 60,
    'Trial of the Grand Crusader': 61, 'ToGC': 61,
    'Onyxia\'s Lair (10)': 62, 'Onyxia\'s Lair (25)': 63,
    'Icecrown Citadel': 70, 'ICC': 70,
    'Ruby Sanctum': 80, 'RS': 80
  }
  return order[tierName] || 999 // Unknown tiers go to the end
}

export default function MasterLootPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [raidTiers, setRaidTiers] = useState<RaidTier[]>([])
  const [activeTier, setActiveTier] = useState<RaidTier | 'all' | null>(null)
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

      let tiersData: any[] = []
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
        const transformedData = tiersData.map((tier: any) => ({
          ...tier,
          expansion: Array.isArray(tier.expansion) ? tier.expansion[0] : tier.expansion
        }))
        // Sort tiers by raid progression order
        const sortedTiers = transformedData.sort((a: any, b: any) =>
          getRaidTierOrder(a.name) - getRaidTierOrder(b.name)
        )
        setRaidTiers(sortedTiers as any)
        // Default to "All" view
        setActiveTier('all')
      }
      setInitialLoading(false)
    }

    if (!guildLoading) {
      loadData()
    }
  }, [guildLoading, activeGuild])

  const loadSubmissions = useCallback(async (guildId: string, tierId: string | 'all', allTiers?: RaidTier[], singleTier?: RaidTier) => {
    setContentLoading(true)
    if (tierId === 'all' && allTiers && allTiers.length > 0) {
      // Load submissions for all tiers in parallel
      const results = await Promise.all(
        allTiers.map(tier =>
          supabase
            .rpc('get_guild_submissions', {
              p_guild_id: guildId,
              p_raid_tier_id: tier.id
            })
            .then(({ data, error }) => ({ data, error, tier }))
        )
      )

      const allSubmissions: any[] = []
      results.forEach(({ data: submissionsData, error, tier }) => {
        if (!error && submissionsData) {
          // Add tier info to each submission
          const withTierInfo = submissionsData.map((sub: any) => ({
            ...sub,
            tier_name: tier.name,
            tier_id: tier.id
          }))
          allSubmissions.push(...withTierInfo)
        }
      })

      // Transform and set submissions
      const formattedSubmissions = allSubmissions.map((sub: any) => ({
        id: sub.id,
        status: sub.status,
        submitted_at: sub.submitted_at,
        review_notes: sub.review_notes,
        character_id: sub.character_id,
        tier_name: sub.tier_name,
        tier_id: sub.tier_id,
        member: sub.character_name ? {
          character_name: sub.character_name,
          role: 'Member',
          class: {
            name: sub.character_class_name,
            color_hex: sub.character_class_color
          }
        } : null,
        item_count: sub.item_count || 0,
        user: {
          id: sub.user_id || '',
          user_metadata: {}
        }
      }))

      setSubmissions(formattedSubmissions as any)
      setContentLoading(false)
      return
    }

    // Load submissions for a single tier
    const { data: submissionsData, error } = await supabase
      .rpc('get_guild_submissions', {
        p_guild_id: guildId,
        p_raid_tier_id: tierId
      })

    if (error) {
      console.error('Error loading submissions:', error)
      setContentLoading(false)
      return
    }

    if (!submissionsData) {
      setContentLoading(false)
      return
    }

    // Transform data to match expected format
    const formattedSubmissions = submissionsData.map((sub: any) => ({
      id: sub.id,
      status: sub.status,
      submitted_at: sub.submitted_at,
      review_notes: sub.review_notes,
      character_id: sub.character_id,
      tier_name: singleTier?.name,
      tier_id: singleTier?.id,
      member: sub.character_name ? {
        character_name: sub.character_name,
        role: 'Member',
        class: {
          name: sub.character_class_name,
          color_hex: sub.character_class_color
        }
      } : null,
      item_count: sub.item_count || 0,
      user: {
        id: sub.user_id || '',
        user_metadata: {}
      }
    }))

    setSubmissions(formattedSubmissions as any)
    setContentLoading(false)
  }, [supabase])

  useEffect(() => {
    if (guildId && activeTier) {
      if (activeTier === 'all') {
        loadSubmissions(guildId, 'all', raidTiers, undefined)
      } else {
        loadSubmissions(guildId, activeTier.id, undefined, activeTier)
      }
    }
  }, [activeTier, guildId, raidTiers, loadSubmissions])

  const handleReview = async (submissionId: string, status: 'approved' | 'rejected') => {
    setReviewing(submissionId)

    try {
      const { data, error } = await supabase
        .from('loot_submissions')
        .update({
          status,
          review_notes: reviewNotes || null,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', submissionId)
        .select()

      if (error) throw error

      showNotification('success', `Submission ${status}`)
      setReviewNotes('')
      setReviewing(null)

      if (guildId && activeTier) {
        const tierId = activeTier === 'all' ? 'all' : activeTier.id
        await loadSubmissions(guildId, tierId, activeTier === 'all' ? raidTiers : undefined, activeTier === 'all' ? undefined : activeTier)
      }
    } catch (error: any) {
      showNotification('error', error.message || 'Couldn\'t update submission. Try again.')
      setReviewing(null)
    }
  }

  const viewSubmissionDetails = async (submissionId: string) => {
    setViewingSubmission(submissionId)
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

    if (itemsData) {
      setSubmissionDetails(itemsData as any)
    }
    setLoadingDetails(false)
  }

  const handleDeleteSubmissions = async () => {
    if (!guildId || !deleteTarget || !activeTier) return

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

      const tierId = activeTier === 'all' ? 'all' : activeTier.id
      await loadSubmissions(guildId, tierId, activeTier === 'all' ? raidTiers : undefined, activeTier === 'all' ? undefined : activeTier)

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

  return (
    <div className="font-poppins">
      {/* Header - Always visible */}
      <div className="p-4 sm:p-6 lg:p-8 pb-1.5">
        <Heading level={1}>Loot Submissions</Heading>
        <p className="text-muted-foreground mt-1 text-base">Review and manage character loot submissions</p>
      </div>

      {/* Raid Tier Selector - Sticky */}
      {initialLoading ? (
        <div className="px-4 sm:px-6 lg:px-8 py-1.5 bg-background">
          <TierTabsSkeleton />
        </div>
      ) : raidTiers.length > 0 && (
        <div className="sticky top-0 z-20 px-4 sm:px-6 lg:px-8 py-1.5 bg-background">
          <div className="flex items-center gap-3 overflow-x-auto pb-1">
            <div className="flex gap-2">
              {/* All Tiers Button */}
              <button
                onClick={() => setActiveTier('all')}
                className={`px-5 py-2.5 rounded-[40px] whitespace-nowrap text-[13px] font-medium transition-all border ${
                  activeTier === 'all'
                    ? 'bg-accent/20 border-accent/20 text-accent'
                    : 'bg-background-elevated border-border text-foreground hover:bg-muted'
                }`}
              >
                All
              </button>
              {raidTiers.map((tier) => (
                <button
                  key={tier.id}
                  onClick={() => setActiveTier(tier)}
                  className={`px-5 py-2.5 rounded-[40px] whitespace-nowrap text-[13px] font-medium transition-all border ${
                    activeTier !== 'all' && activeTier?.id === tier.id
                      ? 'bg-accent/20 border-accent/20 text-accent'
                      : 'bg-background-elevated border-border text-foreground hover:bg-muted'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{tier.name}</span>
                    {tier.is_active && <StarFilledIcon size={14} />}
                  </div>
                </button>
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
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-5 py-2.5 rounded-[40px] text-[13px] font-medium transition-all whitespace-nowrap border ${
                    filter === status
                      ? 'bg-accent/20 border-accent/20 text-accent'
                      : 'bg-background-elevated text-foreground hover:bg-muted border-border'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
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
                    <Button
                      variant="primary-outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        viewSubmissionDetails(submission.id)
                      }}
                    >
                      View Details
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
      <Modal open={!!viewingSubmission} onClose={() => setViewingSubmission(null)} size="lg">
        <ModalHeader onClose={() => setViewingSubmission(null)}>
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
                {Object.entries(
                  submissionDetails.reduce((acc: Record<number, any[]>, detail: any) => {
                    const rank = detail.rank
                    if (!acc[rank]) acc[rank] = []
                    acc[rank].push(detail)
                    return acc
                  }, {})
                )
                  .sort(([a], [b]) => Number(b) - Number(a))
                  .map(([rank, items]) => {
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
          <ModalFooter>
            <Button
              variant="destructive"
              onClick={async () => {
                await handleReview(viewingSubmission, 'rejected')
                setViewingSubmission(null)
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
              }}
              disabled={reviewing === viewingSubmission}
              loading={reviewing === viewingSubmission}
            >
              Approve
            </Button>
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

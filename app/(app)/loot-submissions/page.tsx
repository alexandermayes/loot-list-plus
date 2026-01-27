'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { TierTabsSkeleton, SubmissionsListSkeleton } from '@/components/ui/skeletons'
import { StatusBadge, type SubmissionStatus } from '@/components/ui/status-badge'
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
import { StarFilledIcon } from '@/components/ui/icons'
import Link from 'next/link'
import ItemLink from '@/app/components/ItemLink'
import { normalizeBossName } from '@/utils/bossOrder'

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

interface RaidTier {
  id: string
  name: string
  is_active: boolean
  expansion: {
    name: string
  }
}

// Define raid tier progression order (Classic + TBC)
const getRaidTierOrder = (tierName: string): number => {
  const order: Record<string, number> = {
    // Classic
    'Molten Core': 1,
    'MC': 1,
    'Onyxia\'s Lair': 2,
    'Onyxia': 2,
    'Blackwing Lair': 3,
    'BWL': 3,
    'Zul\'Gurub': 4,
    'ZG': 4,
    'Ruins of Ahn\'Qiraj': 5,
    'AQ20': 5,
    'Temple of Ahn\'Qiraj': 6,
    'AQ40': 6,
    'Naxxramas': 7,
    'Naxx': 7,
    // TBC Tier 4
    'Karazhan': 10,
    'Kara': 10,
    'Gruul\'s Lair': 11,
    'Gruul': 11,
    'Magtheridon\'s Lair': 12,
    'Mag': 12,
    // TBC Tier 5
    'Serpentshrine Cavern': 20,
    'SSC': 20,
    'Tempest Keep: The Eye': 21,
    'Tempest Keep': 21,
    'The Eye': 21,
    'TK': 21,
    // TBC Tier 6
    'Hyjal Summit': 30,
    'Mount Hyjal': 30,
    'Hyjal': 30,
    'Black Temple': 31,
    'BT': 31,
    'Zul\'Aman': 32,
    'ZA': 32,
    'Sunwell Plateau': 33,
    'Sunwell': 33,
    'SWP': 33
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
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [viewingSubmission, setViewingSubmission] = useState<string | null>(null)
  const [submissionDetails, setSubmissionDetails] = useState<any[]>([])
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'single' | 'pending' | 'all', id?: string } | null>(null)
  const [deleting, setDeleting] = useState(false)

  const supabase = createClient()
  const router = useRouter()
  const { activeGuild, loading: guildLoading, isOfficer } = useGuildContext()

  useEffect(() => {
    document.title = 'LootList+ • Loot Submissions'
  }, [])

  // Refresh Wowhead tooltips when submission details modal opens
  useEffect(() => {
    if (submissionDetails.length > 0 && typeof window !== 'undefined' && (window as any).$WowheadPower) {
      const timer = setTimeout(() => {
        try {
          (window as any).$WowheadPower.refreshLinks()
        } catch (e) {
          console.error('Failed to refresh Wowhead links:', e)
        }
      }, 100)
      return () => clearTimeout(timer)
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

  const loadSubmissions = useCallback(async (guildId: string, tierId: string | 'all', allTiers?: RaidTier[]) => {
    setContentLoading(true)
    if (tierId === 'all' && allTiers && allTiers.length > 0) {
      // Load submissions for all tiers
      const allSubmissions: any[] = []
      for (const tier of allTiers) {
        const { data: submissionsData, error } = await supabase
          .rpc('get_guild_submissions', {
            p_guild_id: guildId,
            p_raid_tier_id: tier.id
          })

        if (!error && submissionsData) {
          // Add tier info to each submission
          const withTierInfo = submissionsData.map((sub: any) => ({
            ...sub,
            tier_name: tier.name,
            tier_id: tier.id
          }))
          allSubmissions.push(...withTierInfo)
        }
      }

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
        loadSubmissions(guildId, 'all', raidTiers)
      } else {
        loadSubmissions(guildId, activeTier.id)
      }
    }
  }, [activeTier, guildId, raidTiers, loadSubmissions])

  const handleReview = async (submissionId: string, status: 'approved' | 'rejected') => {
    setReviewing(submissionId)
    setMessage(null)

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

      setMessage({ type: 'success', text: `Submission ${status} successfully` })
      setReviewNotes('')
      setReviewing(null)

      if (guildId && activeTier) {
        const tierId = activeTier === 'all' ? 'all' : activeTier.id
        await loadSubmissions(guildId, tierId, activeTier === 'all' ? raidTiers : undefined)
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update submission' })
      setReviewing(null)
    }
  }

  const viewSubmissionDetails = async (submissionId: string) => {
    setViewingSubmission(submissionId)

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
  }

  const handleDeleteSubmissions = async () => {
    if (!guildId || !deleteTarget || !activeTier) return

    setDeleting(true)
    try {
      if (deleteTarget.type === 'single' && deleteTarget.id) {
        // Delete single submission
        const { error } = await supabase
          .from('loot_submissions')
          .delete()
          .eq('id', deleteTarget.id)

        if (error) throw error

        setMessage({ type: 'success', text: 'Submission deleted successfully' })
        const tierId = activeTier === 'all' ? 'all' : activeTier.id
        await loadSubmissions(guildId, tierId, activeTier === 'all' ? raidTiers : undefined)
      } else {
        // Bulk delete (pending or all)
        const response = await fetch('/api/loot-submissions/delete', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            guild_id: guildId,
            target: deleteTarget.type === 'pending' ? 'pending' : 'all'
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to delete submissions')
        }

        const result = await response.json()
        setMessage({ type: 'success', text: `Deleted ${result.count} submission${result.count !== 1 ? 's' : ''}` })
        const tierId = activeTier === 'all' ? 'all' : activeTier.id
        await loadSubmissions(guildId, tierId, activeTier === 'all' ? raidTiers : undefined)
      }

      setShowDeleteConfirm(false)
      setDeleteTarget(null)
    } catch (error: any) {
      console.error('Error deleting submissions:', error)
      setMessage({ type: 'error', text: error.message || 'Failed to delete submissions' })
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
      <div className="p-8 pb-4">
        <h1 className="text-[42px] font-bold text-foreground leading-tight">Loot Submissions</h1>
        <p className="text-muted-foreground mt-1 text-base">Review and manage character loot submissions</p>
      </div>

      {/* Raid Tier Selector - Sticky */}
      {initialLoading ? (
        <div className="px-8 py-3 bg-background">
          <TierTabsSkeleton />
        </div>
      ) : raidTiers.length > 0 && (
        <div className="sticky top-0 z-20 px-8 py-3 bg-background">
          <div className="flex items-center gap-3 overflow-x-auto">
            <span className="text-muted-foreground text-sm font-medium whitespace-nowrap">Raid Tier:</span>
            <div className="flex gap-2">
              {/* All Tiers Button */}
              <button
                onClick={() => setActiveTier('all')}
                className={`px-5 py-2.5 rounded-[40px] whitespace-nowrap text-[13px] font-medium transition-all ${
                  activeTier === 'all'
                    ? 'bg-accent/20 border-[0.5px] border-accent/20 text-accent'
                    : 'bg-background-elevated border border-border text-foreground hover:bg-muted'
                }`}
              >
                All
              </button>
              {raidTiers.map((tier) => (
                <button
                  key={tier.id}
                  onClick={() => setActiveTier(tier)}
                  className={`px-5 py-2.5 rounded-[40px] whitespace-nowrap text-[13px] font-medium transition-all ${
                    activeTier !== 'all' && activeTier?.id === tier.id
                      ? 'bg-accent/20 border-[0.5px] border-accent/20 text-accent'
                      : 'bg-background-elevated border border-border text-foreground hover:bg-muted'
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
      <div className="px-8 pb-8 space-y-6">
      {initialLoading ? (
        <SubmissionsListSkeleton count={5} />
      ) : (
        <>
      {message && (
        <div className={`p-4 rounded-xl ${
          message.type === 'success'
            ? 'bg-green-950/50 border border-green-600/50 text-green-200'
            : 'bg-red-950/50 border border-red-600/50 text-red-200'
        }`}>
          <p className="text-sm">{message.text}</p>
        </div>
      )}

      {/* Submissions */}
      <div className="space-y-4">
          {/* Filters and Delete Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground text-sm font-medium whitespace-nowrap">Status:</span>
              <div className="flex gap-2">
              {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-5 py-2.5 rounded-[40px] text-[13px] font-medium transition-all ${
                    filter === status
                      ? 'bg-accent/20 border-[0.5px] border-accent/20 text-accent'
                      : 'bg-background-elevated text-foreground hover:bg-muted border border-border'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setDeleteTarget({ type: 'pending' })
                  setShowDeleteConfirm(true)
                }}
                className="px-5 py-2.5 bg-red-900/30 hover:bg-red-900/50 border border-red-700/50 rounded-[40px] text-red-400 text-[13px] font-medium transition-all"
              >
                Delete Pending
              </button>
              <button
                onClick={() => {
                  setDeleteTarget({ type: 'all' })
                  setShowDeleteConfirm(true)
                }}
                className="px-5 py-2.5 bg-red-900/30 hover:bg-red-900/50 border border-red-700/50 rounded-[40px] text-red-400 text-[13px] font-medium transition-all"
              >
                Delete All
              </button>
            </div>
          </div>

          {/* Submissions List */}
          <div className="space-y-3">
            {contentLoading ? (
              <div className="bg-background-elevated border border-border rounded-xl p-12">
                <div className="flex flex-col items-center justify-center gap-4">
                  <LoadingSpinner />
                  <p className="text-muted-foreground text-sm">Loading submissions...</p>
                </div>
              </div>
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
                  className="bg-background-elevated border border-border rounded-xl p-5 flex items-center justify-between hover:bg-muted transition-all"
                >
                  <div className="flex items-center gap-3">
                    <h3 className="text-[16px] font-semibold text-foreground">
                      {submission.member?.character_name || 'Unknown'}
                    </h3>
                    {submission.member?.class && (
                      <span
                        className="px-3 py-1 rounded-full text-[12px] font-medium"
                        style={{ backgroundColor: submission.member.class.color_hex, color: 'white' }}
                      >
                        {submission.member.class.name}
                      </span>
                    )}
                    <StatusBadge status={submission.status as SubmissionStatus} />
                    <span className="text-muted-foreground text-[13px]">
                      {submission.item_count} items • Submitted {submission.submitted_at ? new Date(submission.submitted_at).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }) : 'N/A'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => viewSubmissionDetails(submission.id)}
                      className="px-5 py-2.5 bg-background-elevated hover:bg-muted border border-border rounded-[40px] text-foreground text-[13px] font-medium transition-all"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => {
                        setDeleteTarget({ type: 'single', id: submission.id })
                        setShowDeleteConfirm(true)
                      }}
                      className="px-3 py-2.5 bg-red-900/30 hover:bg-red-900/50 border border-red-700/50 rounded-[40px] text-red-400 transition-all"
                      title="Delete this submission"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      {/* Submission Details Modal */}
      {viewingSubmission && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setViewingSubmission(null)}
        >
          <div
            className="bg-background-subtle border border-border-strong rounded-xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-border-strong flex items-center justify-between bg-background-elevated">
              <h3 className="text-[24px] font-bold text-foreground">Submission details</h3>
              <button
                onClick={() => setViewingSubmission(null)}
                className="text-muted-foreground hover:text-foreground transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto flex-1">
              {submissionDetails.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No items in this submission</p>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="bg-background-subtle border-b border-border">
                      <th className="px-3 py-2 text-left text-[11px] font-medium text-foreground-muted w-12">Rank</th>
                      <th className="px-3 py-2 text-left text-[11px] font-medium text-foreground-muted">Item #1</th>
                      <th className="px-3 py-2 text-left text-[11px] font-medium text-foreground-muted">Item #2</th>
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
                        const getClassificationBadge = (classification?: string) => {
                          if (!classification || classification === 'Unlimited') return null
                          const colors: Record<string, string> = {
                            Reserved: 'bg-red-500/20 text-red-300 border-red-500/30',
                            Limited: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                          }
                          return (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${colors[classification] || ''}`}>
                              {classification}
                            </span>
                          )
                        }
                        const itemsArr = items as any[]
                        return (
                          <tr key={rank} className="border-b border-border">
                            <td className={`px-3 py-2 font-semibold text-[13px] text-foreground bg-gradient-to-r ${getRankColor(rankNum)}`}>
                              {rank}
                            </td>
                            <td className="px-3 py-2">
                              {itemsArr[0] ? (
                                <div className="flex items-center gap-2">
                                  <ItemLink
                                    name={itemsArr[0].loot_item?.name || 'Unknown'}
                                    wowheadId={itemsArr[0].loot_item?.wowhead_id}
                                    className="font-medium text-[13px]"
                                  />
                                  {getClassificationBadge(itemsArr[0].loot_item?.classification)}
                                </div>
                              ) : <span className="text-foreground-muted text-[12px]">-</span>}
                            </td>
                            <td className="px-3 py-2">
                              {itemsArr[1] ? (
                                <div className="flex items-center gap-2">
                                  <ItemLink
                                    name={itemsArr[1].loot_item?.name || 'Unknown'}
                                    wowheadId={itemsArr[1].loot_item?.wowhead_id}
                                    className="font-medium text-[13px]"
                                  />
                                  {getClassificationBadge(itemsArr[1].loot_item?.classification)}
                                </div>
                              ) : <span className="text-foreground-muted text-[12px]">-</span>}
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-border-strong bg-background-elevated flex justify-between items-center">
              <div className="flex gap-3">
                {submissions.find(s => s.id === viewingSubmission)?.status === 'pending' && (
                  <>
                    <button
                      onClick={() => {
                        handleReview(viewingSubmission, 'approved')
                        setViewingSubmission(null)
                      }}
                      disabled={reviewing === viewingSubmission}
                      className="px-6 py-2.5 bg-success hover:bg-success/90 rounded-[52px] text-success-foreground text-[13px] font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {reviewing === viewingSubmission ? 'Processing...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => {
                        handleReview(viewingSubmission, 'rejected')
                        setViewingSubmission(null)
                      }}
                      disabled={reviewing === viewingSubmission}
                      className="px-6 py-2.5 bg-destructive hover:bg-destructive/90 rounded-[52px] text-destructive-foreground text-[13px] font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Reject
                    </button>
                  </>
                )}
              </div>
              <button
                onClick={() => setViewingSubmission(null)}
                className="px-6 py-2.5 bg-background-elevated hover:bg-muted border border-border-strong rounded-[52px] text-foreground text-[13px] font-medium transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={() => {
            setShowDeleteConfirm(false)
            setDeleteTarget(null)
          }}
        >
          <div
            className="bg-background-subtle border border-red-900/50 rounded-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0 w-12 h-12 bg-red-900/30 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-[18px] font-bold text-foreground mb-2">
                  {deleteTarget?.type === 'single' ? 'Delete Submission?' :
                   deleteTarget?.type === 'pending' ? 'Delete Pending Lists?' :
                   'Delete All Lists?'}
                </h3>
                <p className="text-[13px] text-muted-foreground mb-4">
                  {deleteTarget?.type === 'single'
                    ? 'This will permanently delete this loot submission. The user will need to recreate their list.'
                    : deleteTarget?.type === 'pending'
                    ? 'This will permanently delete all pending loot submissions for this guild. Users will need to recreate their lists.'
                    : 'This will permanently delete ALL loot submissions (pending, approved, and received) for this guild. This action cannot be undone.'}
                </p>
                <div className="bg-red-950/20 border border-red-900/50 rounded-lg p-3 mb-4">
                  <p className="text-[12px] text-red-400 font-medium">
                    ⚠️ Warning: This action is permanent and cannot be undone.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setDeleteTarget(null)
                }}
                disabled={deleting}
                className="px-6 py-2.5 bg-background-elevated hover:bg-muted border border-border rounded-[40px] text-foreground text-[13px] font-medium transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSubmissions}
                disabled={deleting}
                className="px-6 py-2.5 bg-destructive hover:bg-destructive/90 rounded-[40px] text-destructive-foreground text-[13px] font-medium transition-all disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}
      </div>
    </div>
  )
}

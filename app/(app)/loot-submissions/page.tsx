'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Settings } from 'lucide-react'
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

interface RaidTier {
  id: string
  name: string
  is_active: boolean
  expansion: {
    name: string
  }
}

export default function MasterLootPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [raidTiers, setRaidTiers] = useState<RaidTier[]>([])
  const [activeTier, setActiveTier] = useState<RaidTier | null>(null)
  const [loading, setLoading] = useState(true)
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
        router.push('/dashboard')
        return
      }

      if (!activeGuild) {
        setLoading(false)
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
        setRaidTiers(transformedData as any)
        const active = transformedData.find(t => t.is_active) as any
        if (active) {
          setActiveTier(active)
        }
      }
      setLoading(false)
    }

    if (!guildLoading) {
      loadData()
    }
  }, [guildLoading, activeGuild])

  const loadSubmissions = useCallback(async (guildId: string, tierId: string) => {
    // Use RPC function to bypass RLS and get all submission data with character names
    const { data: submissionsData, error } = await supabase
      .rpc('get_guild_submissions', {
        p_guild_id: guildId,
        p_raid_tier_id: tierId
      })

    if (error) {
      console.error('Error loading submissions:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      console.error('Error message:', error?.message)
      console.error('Error code:', error?.code)
      return
    }

    if (!submissionsData) return

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
  }, [supabase])

  useEffect(() => {
    if (guildId && activeTier) {
      loadSubmissions(guildId, activeTier.id)
    }
  }, [activeTier, guildId, loadSubmissions])

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
        await loadSubmissions(guildId, activeTier.id)
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
        loot_item:loot_items(id, name, boss_name, item_slot, wowhead_id)
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
        await loadSubmissions(guildId, activeTier.id)
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
        await loadSubmissions(guildId, activeTier.id)
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6 font-poppins">
      {/* Header */}
      <div>
        <h1 className="text-[42px] font-bold text-white leading-tight">Loot Submissions</h1>
        <p className="text-[#8a8d94] mt-1 text-[14px]">Review and manage character loot submissions</p>
      </div>

      {message && (
        <div className={`p-4 rounded-xl ${
          message.type === 'success'
            ? 'bg-green-950/50 border border-green-600/50 text-green-200'
            : 'bg-red-950/50 border border-red-600/50 text-red-200'
        }`}>
          <p className="text-[14px]">{message.text}</p>
        </div>
      )}

      {/* Submissions */}
      <div className="space-y-4">
          {/* Filters and Delete Actions */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-5 py-2.5 rounded-full text-[13px] font-medium transition ${
                    filter === status
                      ? 'bg-[#ff8000] text-white'
                      : 'bg-[#151515] text-[#a1a1a1] hover:bg-[#1a1a1a] border border-[rgba(255,255,255,0.1)]'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setDeleteTarget({ type: 'pending' })
                  setShowDeleteConfirm(true)
                }}
                className="px-4 py-2 bg-red-900/30 hover:bg-red-900/50 border border-red-700 rounded-full text-red-400 text-[13px] font-medium transition"
              >
                Delete Pending
              </button>
              <button
                onClick={() => {
                  setDeleteTarget({ type: 'all' })
                  setShowDeleteConfirm(true)
                }}
                className="px-4 py-2 bg-red-900/30 hover:bg-red-900/50 border border-red-700 rounded-full text-red-400 text-[13px] font-medium transition"
              >
                Delete All
              </button>
            </div>
          </div>

          {/* Submissions List */}
          <div className="space-y-3">
            {filteredSubmissions.length === 0 ? (
              <div className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl p-8 text-center">
                <p className="text-[#a1a1a1]">No submissions found</p>
              </div>
            ) : (
              filteredSubmissions.map((submission) => (
                <div
                  key={submission.id}
                  className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl p-5 flex items-center justify-between hover:bg-[#1a1a1a] transition"
                >
                  <div className="flex items-center gap-3">
                    <h3 className="text-[20px] font-semibold text-white">
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
                    <span className={`px-3 py-1 rounded-full text-[12px] font-medium ${
                      submission.status === 'approved' ? 'bg-green-600/30 text-green-300' :
                      submission.status === 'rejected' ? 'bg-red-600/30 text-red-300' :
                      'bg-blue-600/30 text-blue-300'
                    }`}>
                      {submission.status}
                    </span>
                    <span className="text-[#8a8d94] text-[14px]">
                      {submission.item_count} items • Submitted {submission.submitted_at ? new Date(submission.submitted_at).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }) : 'N/A'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => viewSubmissionDetails(submission.id)}
                      className="px-5 py-2 bg-[#151515] hover:bg-[#1a1a1a] border border-[rgba(255,255,255,0.1)] rounded-[52px] text-white text-[14px] font-medium transition"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => {
                        setDeleteTarget({ type: 'single', id: submission.id })
                        setShowDeleteConfirm(true)
                      }}
                      className="px-4 py-2 bg-red-900/30 hover:bg-red-900/50 border border-red-700 rounded-[52px] text-red-400 text-[14px] font-medium transition"
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
            className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-[rgba(255,255,255,0.1)]">
              <h3 className="text-[24px] font-bold text-white">Submission Details</h3>
            </div>
            <div className="p-6">
              {submissionDetails.length === 0 ? (
                <p className="text-[#a1a1a1] text-center py-8">No items in this submission</p>
              ) : (
                <div className="space-y-2">
                  {submissionDetails.map((detail: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between py-2 border-b border-[rgba(255,255,255,0.1)]">
                      <div>
                        <ItemLink
                          name={detail.loot_item?.name || 'Unknown'}
                          wowheadId={detail.loot_item?.wowhead_id}
                          className="font-medium text-[14px]"
                        />
                        <p className="text-[#a1a1a1] text-[12px]">{detail.loot_item?.boss_name}</p>
                      </div>
                      <span className="px-3 py-1 bg-[#ff8000] text-white rounded-full text-[13px] font-medium">
                        Rank {detail.rank}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-[rgba(255,255,255,0.1)] flex justify-between items-center">
              <div className="flex gap-2">
                {submissions.find(s => s.id === viewingSubmission)?.status === 'pending' && (
                  <>
                    <button
                      onClick={() => {
                        handleReview(viewingSubmission, 'approved')
                        setViewingSubmission(null)
                      }}
                      disabled={reviewing === viewingSubmission}
                      className="px-5 py-2.5 bg-green-600 hover:bg-green-700 rounded-[52px] text-white text-[13px] font-medium transition disabled:opacity-50"
                    >
                      {reviewing === viewingSubmission ? 'Processing...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => {
                        handleReview(viewingSubmission, 'rejected')
                        setViewingSubmission(null)
                      }}
                      disabled={reviewing === viewingSubmission}
                      className="px-5 py-2.5 bg-red-600 hover:bg-red-700 rounded-[52px] text-white text-[13px] font-medium transition disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </>
                )}
              </div>
              <button
                onClick={() => setViewingSubmission(null)}
                className="px-5 py-2.5 bg-[#151515] hover:bg-[#1a1a1a] border border-[rgba(255,255,255,0.1)] rounded-[52px] text-white text-[13px] transition"
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
            className="bg-[#0d0e11] border border-red-900/50 rounded-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0 w-12 h-12 bg-red-900/30 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-[18px] font-bold text-white mb-2">
                  {deleteTarget?.type === 'single' ? 'Delete Submission?' :
                   deleteTarget?.type === 'pending' ? 'Delete Pending Lists?' :
                   'Delete All Lists?'}
                </h3>
                <p className="text-[13px] text-[#a1a1a1] mb-4">
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
                className="px-6 py-2.5 bg-[#151515] hover:bg-[#1a1a1a] border border-[#383838] rounded-[52px] text-white text-[13px] transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSubmissions}
                disabled={deleting}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 rounded-[52px] text-white text-[13px] font-medium transition disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

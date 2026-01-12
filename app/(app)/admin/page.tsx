'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

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

interface Deadline {
  id: string
  deadline_at: string
  is_locked: boolean
}

export default function AdminPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [raidTiers, setRaidTiers] = useState<RaidTier[]>([])
  const [deadline, setDeadline] = useState<Deadline | null>(null)
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

  const supabase = createClient()
  const router = useRouter()
  const { activeGuild, loading: guildLoading, isOfficer } = useGuildContext()

  // Set page title
  useEffect(() => {
    document.title = 'LootList+ • Master Loot'
  }, [])

  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }
      setUser(user)

      // Check if officer using context
      if (!guildLoading && !isOfficer) {
        router.push('/dashboard')
        return
      }

      if (!activeGuild) {
        setLoading(false)
        return
      }

      setGuildId(activeGuild.id)

      // Load raid tiers for active expansion (single join query)
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
        // Transform data to ensure expansion is a single object (Supabase returns it as array)
        const transformedData = tiersData.map((tier: any) => ({
          ...tier,
          expansion: Array.isArray(tier.expansion) ? tier.expansion[0] : tier.expansion
        }))
        setRaidTiers(transformedData as any)
        const active = transformedData.find(t => t.is_active) as any
        if (active) {
          setActiveTier(active)

          // Load deadline
          const { data: deadlineData } = await supabase
            .from('loot_deadlines')
            .select('id, deadline_at, is_locked')
            .eq('raid_tier_id', active.id)
            .single()

          if (deadlineData) {
            setDeadline(deadlineData)
          }
        }
      }

      if (tiersData && tiersData.length > 0) {
        const active = tiersData.find(t => t.is_active) as any
        if (active) {
          setActiveTier(active)
          // Load submissions will be triggered by useEffect
        }
      }
      setLoading(false)
    }

    if (!guildLoading) {
      loadData()
    }
  }, [guildLoading, activeGuild, isOfficer])

  const loadSubmissions = useCallback(async (guildId: string, tierId: string) => {
    const { data: submissionsData } = await supabase
      .from('loot_submissions')
      .select(`
        id,
        status,
        submitted_at,
        review_notes,
        user_id
      `)
      .eq('guild_id', guildId)
      .eq('raid_tier_id', tierId)

    if (!submissionsData) return

    // Get member data and item counts for each submission
    const submissionsWithDetails = await Promise.all(
      submissionsData.map(async (sub: any) => {
        const { data: memberData } = await supabase
          .from('guild_members')
          .select(`
            character_name,
            role,
            class:wow_classes(name, color_hex)
          `)
          .eq('user_id', sub.user_id)
          .single()

        const { count } = await supabase
          .from('loot_submission_items')
          .select('*', { count: 'exact', head: true })
          .eq('submission_id', sub.id)

        return {
          ...sub,
          member: memberData || null,
          item_count: count || 0,
          user: {
            id: sub.user_id,
            user_metadata: {}
          }
        }
      })
    )

    setSubmissions(submissionsWithDetails as any)
  }, [supabase])

  useEffect(() => {
    if (guildId && activeTier) {
      loadSubmissions(guildId, activeTier.id)
    }
  }, [activeTier, guildId, loadSubmissions])

  const handleReview = async (submissionId: string, status: 'approved' | 'rejected') => {
    console.log('handleReview called:', { submissionId, status, reviewNotes })
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

      console.log('Update result:', { data, error })

      if (error) {
        console.error('Update error:', error)
        throw error
      }

      setMessage({ type: 'success', text: `Submission ${status} successfully` })
      setReviewNotes('')
      setReviewing(null)

      if (guildId && activeTier) {
        await loadSubmissions(guildId, activeTier.id)
      }
    } catch (error: any) {
      console.error('handleReview error:', error)
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

  const handleDeadlineUpdate = async () => {
    if (!activeTier || !deadline) return

    setMessage(null)
    try {
      const { error } = await supabase
        .from('loot_deadlines')
        .update({
          deadline_at: deadline.deadline_at,
          is_locked: deadline.is_locked
        })
        .eq('id', deadline.id)

      if (error) throw error

      setMessage({ type: 'success', text: 'Deadline updated successfully' })
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update deadline' })
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
          <h1 className="text-[42px] font-bold text-white leading-tight">Master Loot Admin</h1>
          <p className="text-[#a1a1a1] mt-1 text-[14px]">Review and manage loot submissions from guild members</p>
        </div>
        {message && (
          <div className={`p-4 rounded-xl ${
            message.type === 'success'
              ? 'bg-green-950/50 border border-green-600/50 text-green-200'
              : 'bg-red-950/50 border border-red-600/50 text-red-200'
          }`}>
            {message.text}
          </div>
        )}

        {/* Active Tier & Deadline */}
        {activeTier && (
          <div className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl p-6">
            <h2 className="text-[24px] font-semibold text-white mb-4">Active Raid Tier</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-[#a1a1a1] text-[13px] mb-1">Tier</p>
                <p className="text-white font-medium text-[14px]">{activeTier.name}</p>
                <p className="text-[#a1a1a1] text-[13px]">{activeTier.expansion?.name}</p>
              </div>
              {deadline && (
                <div>
                  <p className="text-[#a1a1a1] text-[13px] mb-1">Deadline</p>
                  <input
                    type="datetime-local"
                    value={deadline.deadline_at ? new Date(deadline.deadline_at).toISOString().slice(0, 16) : ''}
                    onChange={(e) => setDeadline(prev => prev ? {
                      ...prev,
                      deadline_at: new Date(e.target.value).toISOString()
                    } : null)}
                    className="w-full px-5 py-3 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-[13px] focus:outline-none focus:border-[#ff8000] mb-2"
                  />
                  <label className="flex items-center gap-2 text-white">
                    <input
                      type="checkbox"
                      checked={deadline.is_locked}
                      onChange={(e) => setDeadline(prev => prev ? {
                        ...prev,
                        is_locked: e.target.checked
                      } : null)}
                      className="w-5 h-5 rounded border-[#383838] bg-[#151515] text-[#ff8000] focus:ring-[#ff8000]"
                    />
                    <span className="text-[13px]">Lock submissions</span>
                  </label>
                  <button
                    onClick={handleDeadlineUpdate}
                    className="mt-2 w-full px-5 py-3 bg-white hover:bg-gray-100 rounded-[40px] text-black font-medium text-[16px] transition"
                  >
                    Update Deadline
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Submissions */}
        <div className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h2 className="text-[24px] font-semibold text-white">Loot Submissions</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => router.push('/admin/settings')}
                  className="px-4 py-2 bg-[#151515] hover:bg-[#1a1a1a] border border-[rgba(255,255,255,0.1)] rounded-[40px] text-white text-[13px] font-medium transition"
                >
                  ⚙️ Settings
                </button>
                <button
                  onClick={() => router.push('/admin/raid-tiers')}
                  className="px-4 py-2 bg-[#151515] hover:bg-[#1a1a1a] border border-[rgba(255,255,255,0.1)] rounded-[40px] text-white text-[13px] font-medium transition"
                >
                  🏰 Raid Tiers
                </button>
                <button
                  onClick={() => router.push('/admin/loot-items')}
                  className="px-4 py-2 bg-[#151515] hover:bg-[#1a1a1a] border border-[rgba(255,255,255,0.1)] rounded-[40px] text-white text-[13px] font-medium transition"
                >
                  ⚔️ Manage Loot
                </button>
                <button
                  onClick={() => router.push('/admin/import')}
                  className="px-4 py-2 bg-[#151515] hover:bg-[#1a1a1a] border border-[rgba(255,255,255,0.1)] rounded-[40px] text-white text-[13px] font-medium transition"
                >
                  📥 Import
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              {['all', 'pending', 'approved', 'rejected'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f as any)}
                  className={`px-4 py-2 rounded-[40px] text-[13px] font-medium transition ${
                    filter === f
                      ? 'bg-[rgba(255,128,0,0.2)] border-[0.5px] border-[rgba(255,128,0,0.2)] text-[#ff8000]'
                      : 'bg-[#151515] text-white hover:bg-[#1a1a1a] border border-[rgba(255,255,255,0.1)]'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {filteredSubmissions.length === 0 ? (
            <p className="text-[#a1a1a1] text-center py-8 text-[14px]">No submissions found</p>
          ) : (
            <div className="space-y-4">
              {filteredSubmissions.map((sub) => (
                <div
                  key={sub.id}
                  className="bg-[#151515] rounded-xl p-4 border border-[rgba(255,255,255,0.1)]"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-white font-medium text-[14px]">
                          {sub.member?.character_name || 'Unknown'}
                        </p>
                        <p className="text-[13px]" style={{ color: sub.member?.class?.color_hex || '#888' }}>
                          {sub.member?.class?.name || 'Unknown'} • {sub.member?.role}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        sub.status === 'approved' ? 'bg-green-950/50 border border-green-600/50 text-green-200' :
                        sub.status === 'rejected' ? 'bg-red-950/50 border border-red-600/50 text-red-200' :
                        'bg-yellow-950/50 border border-yellow-600/50 text-yellow-200'
                      }`}>
                        {sub.status}
                      </span>
                      <p className="text-[#a1a1a1] text-xs mt-1">
                        {sub.item_count} items
                      </p>
                      <button
                        onClick={() => viewSubmissionDetails(sub.id)}
                        className="mt-2 px-3 py-1 bg-[#ff8000] hover:bg-[#e67300] rounded-[40px] text-white text-xs font-semibold transition"
                      >
                        View Details
                      </button>
                    </div>
                  </div>

                  {sub.submitted_at && (
                    <p className="text-[#a1a1a1] text-[13px] mb-4">
                      Submitted: {new Date(sub.submitted_at).toLocaleString()}
                    </p>
                  )}

                  {sub.review_notes && (
                    <div className="bg-[#0d0e11] rounded-xl p-3 mb-4">
                      <p className="text-[#a1a1a1] text-[13px] mb-1">Review Notes:</p>
                      <p className="text-white text-[13px]">{sub.review_notes}</p>
                    </div>
                  )}

                  {sub.status === 'pending' && (
                    <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.1)]">
                      <textarea
                        placeholder="Review notes (optional)"
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                        className="w-full px-5 py-3 bg-[#0d0e11] border border-[#383838] rounded-xl text-white text-[13px] focus:outline-none focus:border-[#ff8000] mb-3 resize-none"
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReview(sub.id, 'approved')}
                          disabled={reviewing === sub.id}
                          className="flex-1 px-5 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-[40px] text-white font-medium text-[16px] transition"
                        >
                          {reviewing === sub.id ? 'Processing...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => handleReview(sub.id, 'rejected')}
                          disabled={reviewing === sub.id}
                          className="flex-1 px-5 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-[40px] text-white font-medium text-[16px] transition"
                        >
                          {reviewing === sub.id ? 'Processing...' : 'Reject'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submission Details Modal */}
        {viewingSubmission && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-[rgba(255,255,255,0.1)] flex items-center justify-between">
                <h3 className="text-[24px] font-bold text-white">Submission Details</h3>
                <button
                  onClick={() => {
                    setViewingSubmission(null)
                    setSubmissionDetails([])
                  }}
                  className="text-[#a1a1a1] hover:text-white transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="overflow-y-auto p-6">
                {submissionDetails.length === 0 ? (
                  <p className="text-[#a1a1a1] text-center py-8 text-[14px]">No items ranked</p>
                ) : (
                  <div className="space-y-2">
                    {submissionDetails
                      .sort((a, b) => (b.rank || 0) - (a.rank || 0))
                      .map((item: any, index: number) => (
                        <div
                          key={index}
                          className="bg-[#151515] rounded-xl p-4 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-[#ff8000] rounded-lg flex items-center justify-center text-white font-bold">
                              {item.rank}
                            </div>
                            <div>
                              <a
                                href={`https://www.wowhead.com/classic/item=${item.loot_item?.wowhead_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#ff8000] hover:text-[#e67300] font-medium"
                              >
                                {item.loot_item?.name || 'Unknown Item'}
                              </a>
                              <p className="text-[#a1a1a1] text-[13px]">
                                {item.loot_item?.boss_name} • {item.loot_item?.item_slot}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
  )
}

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

  const supabase = createClient()
  const router = useRouter()
  const { activeGuild, loading: guildLoading, isOfficer } = useGuildContext()

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

      if (!guildLoading && !isOfficer) {
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
      submissionsData.map(async (sub: any) => {
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

        const { count } = await supabase
          .from('loot_submission_items')
          .select('*', { count: 'exact', head: true })
          .eq('submission_id', sub.id)

        return {
          ...sub,
          member: characterData ? {
            character_name: characterData.name,
            role: 'Member',
            class: characterData.class
          } : null,
          item_count: count || 0,
          user: {
            id: characterData?.user_id || '',
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
      {/* Header with Settings Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[42px] font-bold text-white leading-tight">Master Loot</h1>
          <p className="text-[#8a8d94] mt-1 text-[14px]">Manage loot submissions and available items</p>
        </div>
        <Link
          href="/loot-settings"
          className="flex items-center gap-2 px-5 py-2.5 bg-[#2a2d35] hover:bg-[#34373f] border border-[rgba(255,255,255,0.1)] rounded-lg text-white text-[14px] font-medium transition"
        >
          <Settings className="w-4 h-4" />
          Loot Settings
        </Link>
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
          {/* Filters */}
          <div className="flex gap-2">
            {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-5 py-2.5 rounded-full text-[13px] font-medium transition ${
                  filter === status
                    ? 'bg-[#ff8000] text-white'
                    : 'bg-[#2a2d35] text-[#a1a1a1] hover:bg-[#34373f] border border-[rgba(255,255,255,0.05)]'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
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
                  className="bg-[#1a1d24] border border-[rgba(255,255,255,0.1)] rounded-xl p-5 flex items-center justify-between hover:bg-[#1f2229] transition"
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
                      submission.status === 'draft' ? 'bg-yellow-600/30 text-yellow-300' :
                      'bg-blue-600/30 text-blue-300'
                    }`}>
                      {submission.status}
                    </span>
                    <span className="text-[#8a8d94] text-[14px]">
                      {submission.item_count} items • Submitted {submission.submitted_at ? new Date(submission.submitted_at).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }) : 'N/A'}
                    </span>
                  </div>
                  <button
                    onClick={() => viewSubmissionDetails(submission.id)}
                    className="px-5 py-2 bg-[#2a2d35] hover:bg-[#34373f] border border-[rgba(255,255,255,0.1)] rounded-lg text-white text-[14px] font-medium transition"
                  >
                    View Details
                  </button>
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
              <h3 className="text-[24px] font-bold text-white">Submission details</h3>
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
    </div>
  )
}

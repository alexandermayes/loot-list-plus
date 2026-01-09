'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import Navigation from '@/app/components/Navigation'

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

  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }
      setUser(user)

      // Check if officer
      const { data: memberData } = await supabase
        .from('guild_members')
        .select('role, guild_id')
        .eq('user_id', user.id)
        .single()

      if (!memberData || memberData.role !== 'Officer') {
        router.push('/dashboard')
        return
      }

      setGuildId(memberData.guild_id)

      // Load raid tiers (through expansions)
      const { data: guildExpansions } = await supabase
        .from('expansions')
        .select('id')
        .eq('guild_id', memberData.guild_id)

      let tiersData: any[] = []
      if (guildExpansions && guildExpansions.length > 0) {
        const expansionIds = guildExpansions.map(e => e.id)
        const { data: tiersResult } = await supabase
          .from('raid_tiers')
          .select('id, name, is_active, expansion_id')
          .in('expansion_id', expansionIds)
          .order('created_at', { ascending: false })
        
        if (tiersResult) {
          // Manually fetch expansion names
          tiersData = await Promise.all(
            tiersResult.map(async (tier: any) => {
              if (tier.expansion_id) {
                const { data: expData } = await supabase
                  .from('expansions')
                  .select('id, name')
                  .eq('id', tier.expansion_id)
                  .single()
                
                return {
                  ...tier,
                  expansion: expData || null
                }
              }
              return { ...tier, expansion: null }
            })
          )
        }
      }

      if (tiersData) {
        setRaidTiers(tiersData as any)
        const active = tiersData.find(t => t.is_active) as any
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

    loadData()
  }, [])

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
    setReviewing(submissionId)
    setMessage(null)

    try {
      const { error } = await supabase
        .from('loot_submissions')
        .update({
          status,
          review_notes: reviewNotes || null,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', submissionId)

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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation
        user={user}
        showBack
        backUrl="/dashboard"
        title="Officer Admin"
      />

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-6 space-y-6">
        {message && (
          <div className={`p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-success/20 border border-success text-success-foreground'
              : 'bg-error/20 border border-error text-error-foreground'
          }`}>
            {message.text}
          </div>
        )}

        {/* Active Tier & Deadline */}
        {activeTier && (
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Active Raid Tier</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-muted-foreground text-sm mb-1">Tier</p>
                <p className="text-foreground font-medium">{activeTier.name}</p>
                <p className="text-muted-foreground text-sm">{activeTier.expansion?.name}</p>
              </div>
              {deadline && (
                <div>
                  <p className="text-muted-foreground text-sm mb-1">Deadline</p>
                  <input
                    type="datetime-local"
                    value={deadline.deadline_at ? new Date(deadline.deadline_at).toISOString().slice(0, 16) : ''}
                    onChange={(e) => setDeadline(prev => prev ? {
                      ...prev,
                      deadline_at: new Date(e.target.value).toISOString()
                    } : null)}
                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-foreground mb-2"
                  />
                  <label className="flex items-center gap-2 text-foreground">
                    <input
                      type="checkbox"
                      checked={deadline.is_locked}
                      onChange={(e) => setDeadline(prev => prev ? {
                        ...prev,
                        is_locked: e.target.checked
                      } : null)}
                    />
                    <span className="text-sm">Lock submissions</span>
                  </label>
                  <button
                    onClick={handleDeadlineUpdate}
                    className="mt-2 w-full py-2 bg-primary hover:bg-primary/90 rounded-lg text-primary-foreground font-semibold transition"
                  >
                    Update Deadline
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Submissions */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold text-foreground">Loot Submissions</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => router.push('/admin/settings')}
                  className="px-4 py-2 bg-primary hover:bg-primary/90 rounded-lg text-primary-foreground text-sm font-semibold transition"
                >
                  ⚙️ Settings
                </button>
                <button
                  onClick={() => router.push('/admin/raid-tiers')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-foreground text-sm font-semibold transition"
                >
                  🏰 Raid Tiers
                </button>
                <button
                  onClick={() => router.push('/admin/loot-items')}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-foreground text-sm font-semibold transition"
                >
                  ⚔️ Manage Loot
                </button>
                <button
                  onClick={() => router.push('/admin/import')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-foreground text-sm font-semibold transition"
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
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    filter === f
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-foreground hover:bg-secondary/80'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {filteredSubmissions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No submissions found</p>
          ) : (
            <div className="space-y-4">
              {filteredSubmissions.map((sub) => (
                <div
                  key={sub.id}
                  className="bg-secondary rounded-lg p-4 border border-border"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-foreground font-medium">
                          {sub.member?.character_name || 'Unknown'}
                        </p>
                        <p className="text-sm" style={{ color: sub.member?.class?.color_hex || '#888' }}>
                          {sub.member?.class?.name || 'Unknown'} • {sub.member?.role}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        sub.status === 'approved' ? 'bg-success text-success-foreground' :
                        sub.status === 'rejected' ? 'bg-error text-error-foreground' :
                        'bg-warning text-warning-foreground'
                      }`}>
                        {sub.status}
                      </span>
                      <p className="text-muted-foreground text-xs mt-1">
                        {sub.item_count} items
                      </p>
                      <button
                        onClick={() => viewSubmissionDetails(sub.id)}
                        className="mt-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-foreground text-xs font-semibold transition"
                      >
                        View Details
                      </button>
                    </div>
                  </div>

                  {sub.submitted_at && (
                    <p className="text-muted-foreground text-sm mb-4">
                      Submitted: {new Date(sub.submitted_at).toLocaleString()}
                    </p>
                  )}

                  {sub.review_notes && (
                    <div className="bg-card rounded p-3 mb-4">
                      <p className="text-muted-foreground text-sm mb-1">Review Notes:</p>
                      <p className="text-foreground text-sm">{sub.review_notes}</p>
                    </div>
                  )}

                  {sub.status === 'pending' && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <textarea
                        placeholder="Review notes (optional)"
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground mb-3 resize-none"
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReview(sub.id, 'approved')}
                          disabled={reviewing === sub.id}
                          className="flex-1 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg text-foreground font-semibold transition"
                        >
                          {reviewing === sub.id ? 'Processing...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => handleReview(sub.id, 'rejected')}
                          disabled={reviewing === sub.id}
                          className="flex-1 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg text-foreground font-semibold transition"
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
            <div className="bg-card border border-border rounded-xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-border flex items-center justify-between">
                <h3 className="text-xl font-bold text-foreground">Submission Details</h3>
                <button
                  onClick={() => {
                    setViewingSubmission(null)
                    setSubmissionDetails([])
                  }}
                  className="text-muted-foreground hover:text-foreground transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="overflow-y-auto p-6">
                {submissionDetails.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No items ranked</p>
                ) : (
                  <div className="space-y-2">
                    {submissionDetails
                      .sort((a, b) => (b.rank || 0) - (a.rank || 0))
                      .map((item: any, index: number) => (
                        <div
                          key={index}
                          className="bg-secondary rounded-lg p-4 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold">
                              {item.rank}
                            </div>
                            <div>
                              <a
                                href={`https://www.wowhead.com/classic/item=${item.loot_item?.wowhead_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:text-purple-300 font-medium"
                              >
                                {item.loot_item?.name || 'Unknown Item'}
                              </a>
                              <p className="text-muted-foreground text-sm">
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
      </main>
    </div>
  )
}

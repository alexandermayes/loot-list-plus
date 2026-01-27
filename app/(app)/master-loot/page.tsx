'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Heading } from '@/components/ui/typography'
import { HugeiconsIcon } from '@hugeicons/react'
import { Settings01Icon } from '@hugeicons/core-free-icons'
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
        router.push('/overview')
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
          <Heading level={1}>Master Loot</Heading>
          <p className="text-muted-foreground mt-1 text-[14px]">Manage loot submissions and available items</p>
        </div>
        <Link
          href="/loot-settings"
          className="flex items-center gap-2 px-5 py-2.5 bg-muted hover:bg-muted border border-border rounded-lg text-foreground text-[14px] font-medium transition"
        >
          <HugeiconsIcon icon={Settings01Icon} size={16} />
          Loot Settings
        </Link>
      </div>

      {message && (
        <div className={`p-4 rounded-xl ${
          message.type === 'success'
            ? 'bg-success/10 border border-success/50 text-success'
            : 'bg-destructive/10 border border-destructive/50 text-destructive'
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
                    ? 'bg-accent text-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted border border-border'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>

          {/* Submissions List */}
          <div className="space-y-3">
            {filteredSubmissions.length === 0 ? (
              <div className="bg-background-elevated border border-border rounded-xl p-8 text-center">
                <p className="text-muted-foreground">No submissions found</p>
              </div>
            ) : (
              filteredSubmissions.map((submission) => (
                <div
                  key={submission.id}
                  className="bg-background-elevated border border-border rounded-xl p-5 flex items-center justify-between hover:bg-muted transition"
                >
                  <div className="flex items-center gap-3">
                    <h3 className="text-[20px] font-semibold text-foreground">
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
                      submission.status === 'approved' ? 'bg-success/30 text-success' :
                      submission.status === 'rejected' ? 'bg-destructive/30 text-destructive' :
                      submission.status === 'draft' ? 'bg-warning/30 text-warning' :
                      'bg-info/30 text-info'
                    }`}>
                      {submission.status}
                    </span>
                    <span className="text-muted-foreground text-[14px]">
                      {submission.item_count} items • Submitted {submission.submitted_at ? new Date(submission.submitted_at).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }) : 'N/A'}
                    </span>
                  </div>
                  <button
                    onClick={() => viewSubmissionDetails(submission.id)}
                    className="px-5 py-2 bg-muted hover:bg-muted border border-border rounded-lg text-foreground text-[14px] font-medium transition"
                  >
                    View Details
                  </button>
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
            <p className="text-muted-foreground text-center py-8">No items in this submission</p>
          ) : (
            <div className="space-y-2">
              {submissionDetails.map((detail: any, idx: number) => (
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
          <Button variant="secondary" onClick={() => setViewingSubmission(null)}>
            Close
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}

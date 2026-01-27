'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { HugeiconsIcon } from '@hugeicons/react'
import { Tick01Icon, Cancel01Icon, Clock01Icon, UserIcon } from '@hugeicons/core-free-icons'

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
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const supabase = createClient()
  const router = useRouter()
  const { activeGuild, loading: guildLoading, isOfficer } = useGuildContext()

  useEffect(() => {
    document.title = 'LootList+ • Pending Submissions'
  }, [])

  useEffect(() => {
    if (!guildLoading) {
      if (!isOfficer) {
        router.push('/dashboard')
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
        setMessage({ type: 'error', text: 'Failed to load pending submissions' })
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
      setMessage({ type: 'error', text: 'Failed to load pending submissions' })
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (submissionId: string) => {
    setProcessing(submissionId)
    setMessage(null)

    try {
      const { error } = await supabase
        .from('loot_submissions')
        .update({ status: 'approved', updated_at: new Date().toISOString() })
        .eq('id', submissionId)

      if (error) throw error

      setMessage({ type: 'success', text: 'Submission approved!' })
      await loadPendingSubmissions()
    } catch (error: any) {
      console.error('Error approving submission:', error)
      setMessage({ type: 'error', text: error.message || 'Failed to approve submission' })
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async (submissionId: string) => {
    if (!confirm('Are you sure you want to reject this submission? The player will need to resubmit.')) {
      return
    }

    setProcessing(submissionId)
    setMessage(null)

    try {
      const { error } = await supabase
        .from('loot_submissions')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', submissionId)

      if (error) throw error

      setMessage({ type: 'success', text: 'Submission rejected' })
      await loadPendingSubmissions()
    } catch (error: any) {
      console.error('Error rejecting submission:', error)
      setMessage({ type: 'error', text: error.message || 'Failed to reject submission' })
    } finally {
      setProcessing(null)
    }
  }

  if (loading || guildLoading) {
    return (
      <div className="min-h-screen bg-background-subtle p-8 flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-subtle p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-[42px] font-bold text-white mb-2">Pending Submissions</h1>
          <p className="text-[16px] text-muted-foreground">
            Review and approve loot list submissions from your guild members
          </p>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl ${
            message.type === 'success'
              ? 'bg-green-950/50 border border-green-600/50 text-green-200'
              : 'bg-red-950/50 border border-red-600/50 text-red-200'
          }`}>
            {message.text}
          </div>
        )}

        {/* Submissions List */}
        {submissions.length === 0 ? (
          <div className="p-12 bg-background-elevated border border-[rgba(255,255,255,0.1)] rounded-xl text-center">
            <HugeiconsIcon icon={Clock01Icon} size={48} className="text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground text-[16px]">No pending submissions</p>
            <p className="text-foreground-muted text-[14px] mt-2">
              All submissions have been reviewed!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {submissions.map((submission) => (
              <div
                key={submission.id}
                className="p-6 bg-background-elevated border border-[rgba(255,255,255,0.1)] rounded-xl"
              >
                <div className="flex items-start justify-between gap-4">
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
                        <span className="text-[13px] text-white font-medium">
                          {submission.raid_tier.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] text-muted-foreground">Items:</span>
                        <span className="text-[13px] text-white font-medium">
                          {submission.item_count} items
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] text-muted-foreground">Submitted:</span>
                        <span className="text-[13px] text-white">
                          {new Date(submission.created_at).toLocaleString()}
                        </span>
                      </div>
                      {submission.updated_at !== submission.created_at && (
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] text-muted-foreground">Last Updated:</span>
                          <span className="text-[13px] text-white">
                            {new Date(submission.updated_at).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleApprove(submission.id)}
                      disabled={processing === submission.id}
                      className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-[52px] text-white font-medium text-[14px] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <HugeiconsIcon icon={Tick01Icon} size={16} />
                      {processing === submission.id ? 'Approving...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => handleReject(submission.id)}
                      disabled={processing === submission.id}
                      className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-[52px] text-white font-medium text-[14px] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <HugeiconsIcon icon={Cancel01Icon} size={16} />
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary */}
        {submissions.length > 0 && (
          <div className="mt-6 p-4 bg-background-elevated border border-[rgba(255,255,255,0.1)] rounded-xl">
            <p className="text-[13px] text-muted-foreground">
              Total Pending: <span className="text-white font-medium">{submissions.length}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

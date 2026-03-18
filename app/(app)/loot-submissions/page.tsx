'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { useNotification } from '@/app/contexts/NotificationContext'
import { SubmissionsListSkeleton, Skeleton } from '@/components/ui/skeletons'
import { StatusBadge, type SubmissionStatus } from '@/components/ui/status-badge'
import { ClassificationBadge } from '@/components/ui/classification-badge'
import { EmptyState } from '@/components/ui/empty-state'
import { ScrollIcon, AlertCircleIcon, Delete01Icon, Cancel01Icon, Search01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
} from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useConfirm } from '@/components/ui/confirm-modal'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Heading } from '@/components/ui/typography'
import ItemLink from '@/app/components/ItemLink'
import { refreshWowheadTooltips } from '@/lib/wowhead'
import { trackClientEvent } from '@/utils/analytics/client'
import { notifySubmissionChanged } from '@/app/hooks/usePendingSubmissionCount'
import { resolvePhaseGroups, getPhaseGroupLabel, getPhaseGroupShortLabel, getCanonicalPhase, type PhaseGroup } from '@/utils/phase-groups'
import { getRaidIcon, getRaidShorthand } from '@/utils/raidIcons'

interface Submission {
  id: string
  status: string
  submitted_at: string | null
  review_notes: string | null
  tier_name?: string
  tier_id?: string
  resubmission_count: number
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

interface SnapshotItem {
  rank: number
  slot: number
  loot_item_id: string
  item_name: string
}

interface DiffEntry {
  type: 'added' | 'removed' | 'moved'
  item_name: string
  rank?: number
  old_rank?: number
  new_rank?: number
}

interface Phase {
  phase: number
  expansion_id: string
  expansion_name: string
}

interface RaidTierInfo {
  name: string
  phase: number | null
}

interface SubmissionDetailItem {
  rank: number
  slot: number
  removed_at?: string | null
  loot_item: {
    id: string
    name: string
    boss_name: string
    item_slot: string
    wowhead_id: number
    classification: string | null
  }
}

interface RawSubmissionCharacter {
  name: string | null
  class: { name: string; color_hex: string } | Array<{ name: string; color_hex: string }>
}

interface RawSubmission {
  id: string
  status: string
  submitted_at: string | null
  review_notes: string | null
  character_id: string
  expansion_id: string
  phase: number
  resubmission_count: number
  character: RawSubmissionCharacter | RawSubmissionCharacter[]
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
  const [guildId, setGuildId] = useState<string | null>(null)
    const [viewingSubmission, setViewingSubmission] = useState<string | null>(null)
  const [submissionDetails, setSubmissionDetails] = useState<SubmissionDetailItem[]>([])
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'single' | 'pending' | 'all', id?: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [resolvedGroups, setResolvedGroups] = useState<PhaseGroup[]>([])
  const [raidTierInfos, setRaidTierInfos] = useState<RaidTierInfo[]>([])
  const [submissionDiff, setSubmissionDiff] = useState<DiffEntry[]>([])
  const [loadingDiff, setLoadingDiff] = useState(false)
  const [removingItemId, setRemovingItemId] = useState<string | null>(null)
  const [revertingChanges, setRevertingChanges] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isMobile, setIsMobile] = useState(false)

  // Track viewport for mobile full-page vs desktop modal
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // PERFORMANCE: Track current request to prevent race conditions when rapidly clicking submissions
  const currentDetailRequestRef = useRef<string | null>(null)

  const supabase = createClient()
  const router = useRouter()
  const { activeGuild, loading: guildLoading, isOfficer } = useGuildContext()
  const { showNotification } = useNotification()
  const { confirm, ConfirmDialog } = useConfirm()

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

      if (!isOfficer) {
        router.push('/overview')
        return
      }

      if (!activeGuild) {
        setInitialLoading(false)
        return
      }

      try {
        setGuildId(activeGuild.id)

        // Get expansion info, raid tiers, and phase groups
        if (activeGuild.active_expansion_id) {
          const [{ data: expansion }, { data: tiersData }] = await Promise.all([
            supabase
              .from('expansions')
              .select('id, name, phase_groups')
              .eq('id', activeGuild.active_expansion_id)
              .single(),
            supabase
              .from('raid_tiers')
              .select('name, phase')
              .eq('expansion_id', activeGuild.active_expansion_id)
          ])

          if (expansion) {
            const tiers = (tiersData || []) as RaidTierInfo[]
            setRaidTierInfos(tiers)

            const availablePhases = [...new Set(tiers.map(t => t.phase).filter((p): p is number => p != null))].sort((a, b) => a - b)
            const phaseGroupsConfig = (expansion.phase_groups as number[][] | null) || null
            const groups = resolvePhaseGroups(phaseGroupsConfig, availablePhases)
            setResolvedGroups(groups)

            // Create phase options from resolved groups (canonical phases)
            const phaseOptions: Phase[] = groups.map(g => ({
              phase: g.canonicalPhase,
              expansion_id: expansion.id,
              expansion_name: expansion.name
            }))
            setPhases(phaseOptions)
            setActivePhase('all')
          }
        }
      } catch (error) {
        console.error('Error loading submissions data:', error)
      } finally {
        setInitialLoading(false)
      }
    }

    if (!guildLoading) {
      loadData().catch(console.error)
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
        resubmission_count,
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

    // Filter by phase group if not 'all'
    if (phase !== 'all') {
      const group = resolvedGroups.find(g => g.canonicalPhase === phase.phase)
      if (group && group.phases.length > 1) {
        query = query.in('phase', group.phases)
      } else {
        query = query.eq('phase', phase.phase)
      }
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
      .is('removed_at', null)

    const countMap: Record<string, number> = {}
    itemCounts?.forEach((item: { submission_id: string }) => {
      countMap[item.submission_id] = (countMap[item.submission_id] || 0) + 1
    })

    // Transform data to match expected format
    const formattedSubmissions = submissionsData.map((sub: RawSubmission) => {
      const character = Array.isArray(sub.character) ? sub.character[0] : sub.character
      const charClass = Array.isArray(character?.class) ? character.class[0] : character?.class

      return {
        id: sub.id,
        status: sub.status,
        submitted_at: sub.submitted_at,
        review_notes: sub.review_notes,
        character_id: sub.character_id,
        resubmission_count: sub.resubmission_count ?? 0,
        tier_name: (() => {
          const group = resolvedGroups.find(g => g.phases.includes(sub.phase))
          return group ? getPhaseGroupLabel(group) : `Phase ${sub.phase}`
        })(),
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

    setSubmissions(formattedSubmissions as Submission[])
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

      trackClientEvent('submission_reviewed', {
        guild_id: guildId,
        submission_id: submissionId,
        new_status: status,
        character_name: submission?.member?.character_name,
      })

      showNotification('success', `Submission ${status}`)
      setReviewNotes('')
      setReviewing(null)

      // Update sidebar badge count immediately
      notifySubmissionChanged()

      if (guildId && activePhase !== null && activeGuild?.active_expansion_id) {
        await loadSubmissions(guildId, activePhase, activeGuild.active_expansion_id)
      }
    } catch (error: any) {
      showNotification('error', error.message || 'Couldn\'t update submission. Try again.')
      setReviewing(null)
    }
  }

  const handleRevertChanges = async (submissionId: string) => {
    setRevertingChanges(true)
    try {
      const response = await fetch('/api/loot-submissions/revert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submission_id: submissionId })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Couldn\'t revert changes')
      }

      showNotification('success', 'Changes rejected. List reverted to previously approved state.')
      notifySubmissionChanged()

      if (guildId && activePhase !== null && activeGuild?.active_expansion_id) {
        await loadSubmissions(guildId, activePhase, activeGuild.active_expansion_id)
      }
    } catch (error: any) {
      showNotification('error', error.message || 'Couldn\'t revert changes. Try again.')
    } finally {
      setRevertingChanges(false)
    }
  }

  const computeDiff = (currentItems: SubmissionDetailItem[], snapshotItems: SnapshotItem[]): DiffEntry[] => {
    const diff: DiffEntry[] = []

    // Build maps: loot_item_id -> rank (use lowest rank if dupes)
    const currentByItem = new Map<string, number>()
    for (const item of currentItems) {
      const id = item.loot_item?.id
      if (id && (!currentByItem.has(id) || item.rank > currentByItem.get(id)!)) {
        currentByItem.set(id, item.rank)
      }
    }

    const snapshotByItem = new Map<string, { rank: number; name: string }>()
    for (const item of snapshotItems) {
      if (!snapshotByItem.has(item.loot_item_id) || item.rank > snapshotByItem.get(item.loot_item_id)!.rank) {
        snapshotByItem.set(item.loot_item_id, { rank: item.rank, name: item.item_name })
      }
    }

    // Find added items (in current but not in snapshot)
    for (const item of currentItems) {
      const id = item.loot_item?.id
      if (id && !snapshotByItem.has(id)) {
        diff.push({
          type: 'added',
          item_name: item.loot_item?.name || 'Unknown',
          rank: item.rank
        })
      }
    }

    // Find removed items (in snapshot but not in current)
    for (const [id, snap] of snapshotByItem) {
      if (!currentByItem.has(id)) {
        diff.push({
          type: 'removed',
          item_name: snap.name,
          old_rank: snap.rank
        })
      }
    }

    // Find moved items (same item, different rank)
    for (const [id, currentRank] of currentByItem) {
      const snap = snapshotByItem.get(id)
      if (snap && snap.rank !== currentRank) {
        diff.push({
          type: 'moved',
          item_name: snap.name,
          old_rank: snap.rank,
          new_rank: currentRank
        })
      }
    }

    // Sort: added first, then removed, then moved. Within each group, by rank desc
    diff.sort((a, b) => {
      const typeOrder = { added: 0, removed: 1, moved: 2 }
      if (typeOrder[a.type] !== typeOrder[b.type]) return typeOrder[a.type] - typeOrder[b.type]
      const rankA = a.rank ?? a.new_rank ?? a.old_rank ?? 0
      const rankB = b.rank ?? b.new_rank ?? b.old_rank ?? 0
      return rankB - rankA
    })

    return diff
  }

  const viewSubmissionDetails = async (submissionId: string) => {
    // Track this request to prevent race conditions
    currentDetailRequestRef.current = submissionId

    setViewingSubmission(submissionId)
    setReviewNotes('') // Clear previous review notes
    setSubmissionDetails([]) // Clear previous data immediately
    setSubmissionDiff([])
    setLoadingDetails(true)
    setLoadingDiff(true)

    // Fetch current items and latest snapshot in parallel
    const [{ data: itemsData }, { data: snapshotData }] = await Promise.all([
      supabase
        .from('loot_submission_items')
        .select(`
          rank,
          slot,
          removed_at,
          loot_item:loot_items(id, name, boss_name, item_slot, wowhead_id, classification)
        `)
        .eq('submission_id', submissionId)
        .order('rank', { ascending: false }),
      supabase
        .from('loot_submission_snapshots')
        .select('items')
        .eq('submission_id', submissionId)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle()
    ])

    // Only update state if this is still the current request (prevents race conditions)
    if (currentDetailRequestRef.current === submissionId) {
      if (itemsData) {
        setSubmissionDetails(itemsData as SubmissionDetailItem[])

        // Compute diff if we have a snapshot
        if (snapshotData?.items) {
          const diff = computeDiff(itemsData as SubmissionDetailItem[], snapshotData.items as SnapshotItem[])
          setSubmissionDiff(diff)
        }
      }
      setLoadingDetails(false)
      setLoadingDiff(false)
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
        throw new Error(errorData.error || 'Couldn\'t delete submission. Try again.')
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

  const handleRemoveItem = (submissionId: string, lootItemId: string, itemName: string) => {
    if (!guildId) return

    confirm({
      title: `Remove ${itemName}?`,
      description: 'This removes the item from the approved list without changing the list\'s approval status.',
      confirmLabel: 'Remove item',
      variant: 'warning',
      onConfirm: async () => {
        setRemovingItemId(lootItemId)
        try {
          const response = await fetch('/api/loot-submissions/remove-item', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              guild_id: guildId,
              submission_id: submissionId,
              loot_item_id: lootItemId,
            }),
          })

          const data = await response.json()
          if (!response.ok) {
            showNotification('error', data.error || 'Couldn\'t remove item. Try again.')
            return
          }

          showNotification('success', `${itemName} removed from list.`)
          setSubmissionDetails(prev => prev.filter(d => d.loot_item?.id !== lootItemId))
        } catch {
          showNotification('error', 'Couldn\'t remove item. Check your connection.')
        } finally {
          setRemovingItemId(null)
        }
      },
    })
  }

  const handleRestoreItem = async (submissionId: string, lootItemId: string, itemName: string) => {
    if (!guildId) return

    try {
      const response = await fetch('/api/loot-submissions/remove-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guild_id: guildId,
          submission_id: submissionId,
          loot_item_id: lootItemId,
          restore: true,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        showNotification('error', data.error || 'Couldn\'t restore item. Try again.')
        return
      }

      showNotification('success', `${itemName} restored.`)
      // Update local state to reflect restoration
      setSubmissionDetails(prev => prev.map(d =>
        d.loot_item?.id === lootItemId ? { ...d, removed_at: null } : d
      ))
    } catch {
      showNotification('error', 'Couldn\'t restore item. Check your connection.')
    }
  }

  const filteredSubmissions = submissions.filter(sub => {
    if (filter !== 'all' && sub.status !== filter) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return sub.member?.character_name?.toLowerCase().includes(q)
    }
    return true
  })

  // Memoize grouped submission details to avoid recalculating on every render
  const groupedSubmissionDetails = useMemo(() => {
    const grouped: Record<number, SubmissionDetailItem[]> = {}
    for (const detail of submissionDetails) {
      const rank = detail.rank
      if (!grouped[rank]) grouped[rank] = []
      grouped[rank].push(detail)
    }
    // Sort items within each rank by slot so Item #1 and #2 display correctly
    for (const items of Object.values(grouped)) {
      items.sort((a, b) => a.slot - b.slot)
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

      {/* Phase Selector - Sticky. Reserve consistent height to prevent CLS. */}
      {initialLoading ? (
        <div className="sticky top-14 sm:top-0 z-20 px-4 sm:px-6 lg:px-8 py-1.5 bg-background min-h-[46px]">
          {/* Inline skeleton matching size="sm" phase buttons (h-8) used on this page */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
            <Skeleton className="h-8 w-[88px] rounded-[40px] flex-shrink-0" />
            <Skeleton className="h-8 w-20 rounded-[40px] flex-shrink-0" />
            <Skeleton className="h-8 w-20 rounded-[40px] flex-shrink-0" />
            <Skeleton className="h-8 w-20 rounded-[40px] flex-shrink-0" />
          </div>
        </div>
      ) : phases.length > 0 && (
        <div className="sticky top-14 sm:top-0 z-20 px-4 sm:px-6 lg:px-8 py-1.5 bg-background min-h-[46px]">
          <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide pb-1">
            <div className="flex gap-2 flex-shrink-0">
              {/* All Phases Button */}
              <Button
                variant={activePhase === 'all' ? 'accent-subtle' : 'outline'}
                size="sm"
                onClick={() => setActivePhase('all')}
                className="rounded-[40px] whitespace-nowrap"
              >
                All phases
              </Button>
              {phases.map((phase) => {
                const group = resolvedGroups.find(g => g.canonicalPhase === phase.phase)
                const phasesInGroup = group ? group.phases : [phase.phase]
                const tiersInGroup = raidTierInfos.filter(t => t.phase !== null && phasesInGroup.includes(t.phase))
                const raidNames = tiersInGroup.map(t => getRaidShorthand(t.name)).join(', ')

                return (
                  <Button
                    key={phase.phase}
                    variant={activePhase !== 'all' && activePhase?.phase === phase.phase ? 'accent-subtle' : 'outline'}
                    size="sm"
                    onClick={() => setActivePhase(phase)}
                    className="rounded-[40px] whitespace-nowrap"
                    title={raidNames}
                  >
                    <span className="flex items-center gap-1.5">
                      {tiersInGroup.slice(0, 2).map((tier) => (
                        <img
                          key={tier.name}
                          src={getRaidIcon(tier.name)}
                          alt=""
                          width={16}
                          height={16}
                          className="w-4 h-4 rounded border border-border/50"
                        />
                      ))}
                      {group ? getPhaseGroupShortLabel(group) : `P${phase.phase}`}
                    </span>
                  </Button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="px-4 sm:px-6 lg:px-8 pt-1.5 pb-6 space-y-6">
      {initialLoading ? (
        <div className="space-y-4">
          {/* Filter bar skeleton - matches real filter layout */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-col gap-3 w-full sm:w-auto">
              <div className="flex gap-2">
                <Skeleton className="h-8 w-[42px] rounded-[40px]" />
                <Skeleton className="h-8 w-[68px] rounded-[40px]" />
                <Skeleton className="h-8 w-[80px] rounded-[40px]" />
                <Skeleton className="h-8 w-[72px] rounded-[40px]" />
              </div>
              <Skeleton className="h-8 w-full sm:w-52 rounded-[40px]" />
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Skeleton className="h-8 w-[108px] rounded-[40px]" />
              <Skeleton className="h-8 w-[82px] rounded-[40px]" />
            </div>
          </div>
          <SubmissionsListSkeleton count={5} />
        </div>
      ) : (
        <>
      {/* Submissions */}
      <div className="space-y-4">
          {/* Filters and Delete Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-col gap-3 w-full sm:w-auto">
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
                <Button
                  key={status}
                  variant={filter === status ? 'accent-subtle' : 'outline'}
                  size="sm"
                  onClick={() => setFilter(status)}
                  className="rounded-[40px] whitespace-nowrap flex-shrink-0"
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Button>
              ))}
              </div>
              <div className="relative w-full sm:w-52">
                <HugeiconsIcon icon={Search01Icon} size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search character..."
                  variant="pill"
                  className={`pl-9 w-full ${searchQuery ? 'pr-8' : ''}`}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} size={14} />
                  </button>
                )}
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
                Delete pending
              </Button>
              <Button
                variant="destructive-outline"
                size="sm"
                onClick={() => {
                  setDeleteTarget({ type: 'all' })
                  setShowDeleteConfirm(true)
                }}
              >
                Delete all
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
                title="No submissions yet"
                description="Loot List submissions will appear here once raiders submit their lists."
                variant="card"
              />
            ) : (
              filteredSubmissions.map((submission) => (
                <div
                  key={submission.id}
                  className="bg-background-elevated border border-border rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 hover:bg-muted transition-colors cursor-pointer"
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
                    {submission.resubmission_count > 0 && submission.status === 'pending' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-warning/15 text-warning border border-warning/30">
                        <HugeiconsIcon icon={AlertCircleIcon} size={12} />
                        Resubmitted {submission.resubmission_count}x
                      </span>
                    )}
                    <span className="text-muted-foreground text-[13px]">
                      {submission.item_count} items • Submitted {submission.submitted_at ? new Date(submission.submitted_at).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }) : 'N/A'}
                    </span>
                  </div>
                  <div className="flex gap-2 flex-shrink-0 flex-wrap sm:flex-nowrap">
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
                        {submission.resubmission_count > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRevertChanges(submission.id)
                            }}
                            disabled={revertingChanges}
                            loading={revertingChanges}
                            title="Reject changes and revert to previously approved list"
                          >
                            Reject changes
                          </Button>
                        )}
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
                      variant="outline"
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
                      <HugeiconsIcon icon={Delete01Icon} size={16} />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      {/* Submission Details Modal */}
      {/* Mobile: Full-page view */}
      {!!viewingSubmission && (() => {
        const viewedSubmission = submissions.find(s => s.id === viewingSubmission)
        const canRemove = viewedSubmission?.status === 'approved'
        const isPending = viewedSubmission?.status === 'pending'

        const getRankGradient = (r: number) => {
          if (r >= 48) return 'from-red-900 to-red-700'
          if (r >= 45) return 'from-orange-900 to-orange-700'
          if (r >= 42) return 'from-yellow-900 to-yellow-700'
          if (r >= 39) return 'from-amber-900 to-amber-700'
          if (r >= 25) return 'from-green-900 to-green-700'
          return 'from-blue-900 to-blue-700'
        }
        const getRankBg = (r: number) => {
          if (r >= 48) return 'bg-red-800'
          if (r >= 45) return 'bg-orange-800'
          if (r >= 42) return 'bg-yellow-800'
          if (r >= 39) return 'bg-amber-800'
          if (r >= 25) return 'bg-green-800'
          return 'bg-blue-800'
        }

        const renderItemCell = (item: SubmissionDetailItem | undefined) => {
          if (!item) return <span className="text-muted-foreground text-sm">-</span>
          const isRemoved = !!item.removed_at
          return (
            <div className={`flex items-center gap-2 group ${isRemoved ? 'opacity-50' : ''}`}>
              <ItemLink
                name={item.loot_item?.name || 'Unknown'}
                wowheadId={item.loot_item?.wowhead_id}
                className={`font-medium text-sm ${isRemoved ? 'line-through' : ''}`}
              />
              {item.loot_item?.classification && (
                <ClassificationBadge classification={item.loot_item.classification as 'Reserved' | 'Limited' | 'Unlimited'} />
              )}
              {isRemoved && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRestoreItem(viewingSubmission!, item.loot_item.id, item.loot_item.name)
                  }}
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-success/20 text-success flex-shrink-0 hover:bg-accent/20 hover:text-accent transition-colors"
                  title="Restore item"
                >
                  Undo
                </button>
              )}
              {canRemove && !isRemoved && item.loot_item?.id && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRemoveItem(viewingSubmission!, item.loot_item.id, item.loot_item.name)
                  }}
                  disabled={removingItemId === item.loot_item.id}
                  className="opacity-0 group-hover:opacity-100 ml-auto p-1 text-muted-foreground hover:text-destructive transition-opacity shrink-0"
                  title="Remove from list"
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={14} />
                </button>
              )}
            </div>
          )
        }

        const renderMobileItem = (item: SubmissionDetailItem | undefined, slotLabel: string) => {
          if (!item) return null
          const isRemoved = !!item.removed_at
          return (
            <div className="px-3 py-2 border-t border-border/50">
              <p className="text-[11px] text-muted-foreground font-medium mb-1">{slotLabel}</p>
              <div className={`flex items-center gap-2 group ${isRemoved ? 'opacity-50' : ''}`}>
                <ItemLink
                  name={item.loot_item?.name || 'Unknown'}
                  wowheadId={item.loot_item?.wowhead_id}
                  className={`font-medium text-sm ${isRemoved ? 'line-through' : ''}`}
                />
                {item.loot_item?.classification && (
                  <ClassificationBadge classification={item.loot_item.classification as 'Reserved' | 'Limited' | 'Unlimited'} />
                )}
                {isRemoved && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRestoreItem(viewingSubmission!, item.loot_item.id, item.loot_item.name)
                    }}
                    className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-success/20 text-success flex-shrink-0 hover:bg-accent/20 hover:text-accent transition-colors"
                    title="Restore item"
                  >
                    Undo
                  </button>
                )}
                {canRemove && !isRemoved && item.loot_item?.id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemoveItem(viewingSubmission!, item.loot_item.id, item.loot_item.name)
                    }}
                    disabled={removingItemId === item.loot_item.id}
                    className="ml-auto p-1 text-muted-foreground hover:text-destructive shrink-0"
                    title="Remove from list"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} size={14} />
                  </button>
                )}
              </div>
            </div>
          )
        }

        const headerContent = (
          <div className="flex flex-col gap-1">
            <h2 className="text-[20px] font-semibold text-foreground">
              <span style={{ color: viewedSubmission?.member?.class?.color_hex || 'inherit' }}>
                {viewedSubmission?.member?.character_name || 'Unknown Character'}
              </span>
              {viewedSubmission?.member?.class?.name && (
                <span className="text-muted-foreground font-normal text-base ml-2">
                  {viewedSubmission.member.class.name}
                </span>
              )}
            </h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {viewedSubmission?.tier_name && <span>{viewedSubmission.tier_name}</span>}
              {viewedSubmission?.tier_name && viewedSubmission?.submitted_at && <span>•</span>}
              {viewedSubmission?.submitted_at && (
                <span>Submitted {new Date(viewedSubmission.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              )}
              {viewedSubmission?.status && (
                <>
                  <span>•</span>
                  <StatusBadge status={viewedSubmission.status as SubmissionStatus} />
                </>
              )}
            </div>
          </div>
        )

        const bodyContent = (
          <>
            {loadingDetails ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="sm" />
              </div>
            ) : submissionDetails.length === 0 ? (
              <EmptyState
                icon={ScrollIcon}
                title="No ranked items"
                description="This submission has no ranked items."
                size="compact"
              />
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full min-w-[420px]">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-background-subtle border-b border-border">
                        <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground w-12 bg-background-subtle">Rank</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground bg-background-subtle">Item #1</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground bg-background-subtle">Item #2</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupedSubmissionDetails.map(([rank, items]) => {
                        const rankNum = Number(rank)
                        const itemsArr = items as SubmissionDetailItem[]
                        return (
                          <tr key={rank} className="border-b border-border">
                            <td className={`px-3 py-2 font-semibold text-sm text-foreground bg-gradient-to-r ${getRankGradient(rankNum)}`}>
                              {rank}
                            </td>
                            <td className="px-3 py-2">{renderItemCell(itemsArr[0])}</td>
                            <td className="px-3 py-2">{renderItemCell(itemsArr[1])}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile card list */}
                <div className="sm:hidden space-y-2 p-2">
                  {groupedSubmissionDetails.map(([rank, items]) => {
                    const rankNum = Number(rank)
                    const itemsArr = items as SubmissionDetailItem[]
                    return (
                      <div key={rank} className="bg-card border border-border rounded-lg overflow-hidden">
                        <div className="px-3 py-2 flex items-center gap-2">
                          <span className={`inline-flex items-center justify-center w-8 h-6 rounded text-[12px] font-bold text-white ${getRankBg(rankNum)}`}>
                            {rank}
                          </span>
                          <span className="text-[13px] text-muted-foreground">Rank {rank}</span>
                        </div>
                        {renderMobileItem(itemsArr[0], 'Item #1')}
                        {renderMobileItem(itemsArr[1], 'Item #2')}
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </>
        )

        const diffContent = (() => {
          if (!viewedSubmission || viewedSubmission.resubmission_count === 0) return null
          return (
            <div className="border-t border-border px-4 py-3">
              <h4 className="text-[13px] font-semibold text-foreground mb-2">
                Changes from previous submission
              </h4>
              {loadingDiff ? (
                <div className="flex items-center justify-center py-4">
                  <LoadingSpinner size="sm" />
                </div>
              ) : submissionDiff.length === 0 ? (
                <p className="text-[13px] text-muted-foreground">No changes detected</p>
              ) : (
                <div className="space-y-1">
                  {submissionDiff.map((entry, i) => (
                    <div key={i} className="text-[13px] flex items-center gap-1.5">
                      {entry.type === 'added' && (
                        <>
                          <span className="text-success font-medium">+</span>
                          <span className="text-foreground">{entry.item_name}</span>
                          <span className="text-muted-foreground">(rank {entry.rank})</span>
                        </>
                      )}
                      {entry.type === 'removed' && (
                        <>
                          <span className="text-destructive font-medium">-</span>
                          <span className="text-foreground">{entry.item_name}</span>
                          <span className="text-muted-foreground">(was rank {entry.old_rank})</span>
                        </>
                      )}
                      {entry.type === 'moved' && (
                        <>
                          <span className="text-accent font-medium">~</span>
                          <span className="text-foreground">{entry.item_name}</span>
                          <span className="text-muted-foreground">rank {entry.old_rank} → {entry.new_rank}</span>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })()

        const reviewFooter = isPending ? (
          <div className="space-y-4">
            <div className="w-full">
              <Label htmlFor="review-notes" className="text-sm font-medium mb-2 block">
                Review notes (optional)
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
                  await handleReview(viewingSubmission!, 'rejected')
                  setViewingSubmission(null)
                  setReviewNotes('')
                }}
                disabled={reviewing === viewingSubmission}
              >
                Reject
              </Button>
              {viewedSubmission?.resubmission_count > 0 && (
                <Button
                  variant="outline"
                  onClick={async () => {
                    await handleRevertChanges(viewingSubmission!)
                    setViewingSubmission(null)
                  }}
                  disabled={revertingChanges}
                  loading={revertingChanges}
                >
                  Reject changes
                </Button>
              )}
              <Button
                variant="success"
                onClick={async () => {
                  await handleReview(viewingSubmission!, 'approved')
                  setViewingSubmission(null)
                  setReviewNotes('')
                }}
                disabled={reviewing === viewingSubmission}
                loading={reviewing === viewingSubmission}
              >
                Approve
              </Button>
            </div>
          </div>
        ) : null

        const closeSubmission = () => { setViewingSubmission(null); setReviewNotes('') }

        return isMobile ? createPortal(
          /* Mobile: Full-page view with fixed header/footer, scrollable body */
          <div className="fixed inset-0 z-[100] bg-background flex flex-col">
            {/* Fixed header */}
            <div className="shrink-0 p-4 pb-3 border-b border-border">
              <div className="flex items-start justify-between gap-3">
                {headerContent}
                <Button variant="outline" size="sm" className="shrink-0" onClick={closeSubmission}>
                  Close
                </Button>
              </div>
            </div>

            {/* Scrollable loot area */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {bodyContent}
              {diffContent}
            </div>

            {/* Fixed footer with review actions */}
            {reviewFooter && (
              <div className="shrink-0 border-t border-border p-4">
                {reviewFooter}
              </div>
            )}
          </div>,
          document.body
        ) : (
          /* Desktop: Modal */
          <Modal open={true} onClose={closeSubmission} size="lg">
            <ModalHeader onClose={closeSubmission}>
              {headerContent}
            </ModalHeader>
            <ModalBody className="p-0">
              {bodyContent}
              {diffContent}
            </ModalBody>
            {reviewFooter && (
              <ModalFooter className="flex-col items-stretch gap-4">
                {reviewFooter}
              </ModalFooter>
            )}
          </Modal>
        )
      })()}

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
            {deleteTarget?.type === 'single' ? 'Delete submission?' :
             deleteTarget?.type === 'pending' ? 'Delete pending lists?' :
             'Delete all lists?'}
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
              <Alert variant="destructive">
                <AlertDescription className="font-medium">
                  This is a permanent action.
                </AlertDescription>
              </Alert>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => {
              setShowDeleteConfirm(false)
              setDeleteTarget(null)
            }}
            disabled={deleting}
          >
            Keep submission
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeleteSubmissions}
            disabled={deleting}
            loading={deleting}
          >
            Delete submission
          </Button>
        </ModalFooter>
      </Modal>
        </>
      )}
      {ConfirmDialog}
      </div>
    </div>
  )
}

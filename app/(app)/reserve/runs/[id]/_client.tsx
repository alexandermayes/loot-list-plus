'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { useNotification } from '@/app/contexts/NotificationContext'
import { useConfirm } from '@/components/ui/confirm-modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Heading, Text, LabelText } from '@/components/ui/typography'
import ItemLink from '@/app/components/ItemLink'
import {
  encodeGargulExport,
  normalizeClassForGargul,
  type GargulPayload,
  type GargulSoftReserve,
  type GargulHardReserve,
} from '@/domain/reserve/gargul-export'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Copy01Icon,
  Calendar03Icon,
  LockIcon,
  Search01Icon,
  CheckmarkCircle01Icon,
  Delete02Icon,
  UserMultiple02Icon,
  ArrowLeft02Icon,
  ArrowRight02Icon,
  Edit02Icon,
  CopyLinkIcon,
  FileDownloadIcon,
  DiscordIcon,
  Clock01Icon,
} from '@hugeicons/core-free-icons'
import { trackClientEvent } from '@/utils/analytics/client'
import { refreshWowheadTooltips } from '@/lib/wowhead'
import { getRaidIcon } from '@/utils/raidIcons'

// Hardcoded WoW class colors for display
const CLASS_COLORS: Record<string, string> = {
  warrior: '#C79C6E',
  paladin: '#F58CBA',
  hunter: '#ABD473',
  rogue: '#FFF569',
  priest: '#FFFFFF',
  'death knight': '#C41E3A',
  shaman: '#0070DE',
  mage: '#69CCF0',
  warlock: '#9482C9',
  monk: '#00FF96',
  druid: '#FF7D0A',
  'demon hunter': '#A330C9',
  evoker: '#33937F',
}

type LootItem = {
  id: string
  name: string
  boss_name: string
  item_slot: string
  wowhead_id: number
  classification?: string
}

type Submission = {
  id: string
  character_name: string
  character_class: string
  character_spec: string | null
  items: string[]
  created_at: string
  updated_at: string
}

type Award = {
  id: string
  loot_item_id: string
  character_name: string
  submission_id: string | null
  awarded_at: string
  notes: string | null
}

type ReserveRun = {
  id: string
  title: string
  status: 'open' | 'locked' | 'completed'
  raid_at: string
  lock_at: string
  locked_at: string | null
  max_reserves: number
  max_reserves_per_item: number | null
  allow_duplicates: boolean
  enforce_class_restrictions: boolean
  visibility: string
  rules_note: string | null
  discord_invite_url: string | null
  hard_reserves: Array<{ loot_item_id: string; reserved_for?: string }>
  share_token: string
  raid_leader_token?: string
  guild_id: string | null
  raid_tier_name: string | null
  submissions: Submission[]
  awards: Award[]
  items: LootItem[]
}

type AuditEntry = {
  id: string
  actor_user_id: string | null
  actor_label: string | null
  action: string
  details: Record<string, any>
  created_at: string
}

type SortMode = 'name' | 'class' | 'newest' | 'oldest'

const STATUS_STYLES: Record<string, { className: string; label: string }> = {
  open: { className: 'bg-success/10 text-success border-success/20', label: 'Open' },
  locked: { className: 'bg-warning/10 text-warning border-warning/20', label: 'Locked' },
  completed: { className: 'bg-muted text-muted-foreground border-border', label: 'Completed' },
}

export default function ReserveRunPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { showNotification } = useNotification()
  const { confirm, ConfirmDialog } = useConfirm()
  const [run, setRun] = useState<ReserveRun | null>(null)
  const [canManage, setCanManage] = useState(false)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [eligibilitySearch, setEligibilitySearch] = useState('')
  const [participantSearch, setParticipantSearch] = useState('')
  const [participantSort, setParticipantSort] = useState<SortMode>('newest')
  const [editingNote, setEditingNote] = useState(false)
  const [noteDraft, setNoteDraft] = useState('')
  const [editingDiscord, setEditingDiscord] = useState(false)
  const [discordDraft, setDiscordDraft] = useState('')
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([])
  const [auditOpen, setAuditOpen] = useState(false)
  const [auditLoading, setAuditLoading] = useState(false)

  // Raid leader token: query param wins on initial load, then we persist it
  // in localStorage so a page refresh keeps manager access without needing
  // to re-paste the token URL.
  const [leaderToken, setLeaderToken] = useState<string | null>(null)
  useEffect(() => {
    const fromUrl = searchParams.get('leader_token')
    const storageKey = `reserve_leader_token_${id}`
    if (fromUrl) {
      setLeaderToken(fromUrl)
      try { localStorage.setItem(storageKey, fromUrl) } catch {}
      return
    }
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) setLeaderToken(stored)
    } catch {}
  }, [id, searchParams])

  // Centralized fetch that automatically attaches the leader token header
  const authedFetch = useCallback(
    (input: string, init: RequestInit = {}) => {
      const headers = new Headers(init.headers)
      if (leaderToken) headers.set('x-reserve-leader-token', leaderToken)
      return fetch(input, { ...init, headers })
    },
    [leaderToken]
  )

  const loadRun = useCallback(async () => {
    try {
      const res = await authedFetch(`/api/reserve-runs/${id}`)
      const data = await res.json()
      if (data.success) {
        setRun(data.run)
        setCanManage(!!data.can_manage)
      }
    } catch (err) {
      console.error('Failed to load run:', err)
    } finally {
      setLoading(false)
    }
  }, [id, authedFetch])

  const clearLeaderToken = () => {
    setLeaderToken(null)
    try { localStorage.removeItem(`reserve_leader_token_${id}`) } catch {}
    showNotification('info', 'Raid leader access cleared')
  }

  useEffect(() => {
    trackClientEvent('reserve_run_viewed', { run_id: id })
    loadRun()
  }, [loadRun, id])

  useEffect(() => {
    if (run) {
      document.title = `LootList+ \u2022 ${run.title}`
      refreshWowheadTooltips()
      setNoteDraft(run.rules_note || '')
      setDiscordDraft(run.discord_invite_url || '')
    }
  }, [run])

  const itemMap = useMemo(() => {
    if (!run) return new Map<string, LootItem>()
    return new Map(run.items.map(item => [item.id, item]))
  }, [run?.items])

  // Filtered + sorted participant list
  const visibleSubmissions = useMemo(() => {
    if (!run) return []
    const query = participantSearch.trim().toLowerCase()
    let list = run.submissions
    if (query) {
      list = list.filter((s) => {
        if (s.character_name.toLowerCase().includes(query)) return true
        if (s.character_class.toLowerCase().includes(query)) return true
        if (s.character_spec?.toLowerCase().includes(query)) return true
        // Search by reserved item name too
        return s.items.some((id) => {
          const item = itemMap.get(id)
          return item?.name.toLowerCase().includes(query)
        })
      })
    }
    const sorted = [...list]
    switch (participantSort) {
      case 'name':
        sorted.sort((a, b) => a.character_name.localeCompare(b.character_name))
        break
      case 'class':
        sorted.sort((a, b) => a.character_class.localeCompare(b.character_class))
        break
      case 'newest':
        sorted.sort((a, b) => b.created_at.localeCompare(a.created_at))
        break
      case 'oldest':
        sorted.sort((a, b) => a.created_at.localeCompare(b.created_at))
        break
    }
    return sorted
  }, [run, participantSearch, participantSort, itemMap])

  // Build contested items: items reserved by 2+ players
  const contestedItems = useMemo(() => {
    if (!run) return []
    const itemCounts: Record<string, { item: LootItem; reservers: Submission[] }> = {}

    for (const sub of run.submissions) {
      for (const itemId of sub.items) {
        if (!itemCounts[itemId]) {
          const item = itemMap.get(itemId)
          if (!item) continue
          itemCounts[itemId] = { item, reservers: [] }
        }
        itemCounts[itemId].reservers.push(sub)
      }
    }

    return Object.values(itemCounts)
      .filter(c => c.reservers.length > 1)
      .sort((a, b) => b.reservers.length - a.reservers.length)
  }, [run?.submissions, itemMap])

  // Eligibility lookup
  const eligibilityResults = useMemo(() => {
    if (!run || !eligibilitySearch.trim()) return []
    const query = eligibilitySearch.toLowerCase()
    return run.items
      .filter(item => item.name.toLowerCase().includes(query) || item.boss_name?.toLowerCase().includes(query))
      .map(item => {
        const reservers = run.submissions.filter(s => s.items.includes(item.id))
        const isHardReserved = run.hard_reserves.some(hr => hr.loot_item_id === item.id)
        const awarded = run.awards.filter(a => a.loot_item_id === item.id)
        return { item, reservers, isHardReserved, awarded }
      })
      .slice(0, 20)
  }, [run, eligibilitySearch, itemMap])

  const executeAction = async (action: string) => {
    if (!run) return
    setActionLoading(true)
    try {
      const res = await authedFetch(`/api/reserve-runs/${run.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (data.success) {
        setRun(prev => prev ? { ...prev, ...data.run } : prev)
        showNotification('success', `Run ${action}ed`)
        loadRun()
      } else {
        showNotification('error', data.error)
      }
    } catch {
      showNotification('error', 'Something went wrong')
    } finally {
      setActionLoading(false)
    }
  }

  const handleLock = () => {
    confirm({
      title: 'Lock reserves?',
      description: 'Players will no longer be able to submit or edit reserves.',
      confirmLabel: 'Lock run',
      onConfirm: () => executeAction('lock'),
    })
  }

  const handleAward = async (itemId: string, characterName: string, submissionId?: string) => {
    if (!run) return
    setActionLoading(true)
    try {
      const res = await authedFetch(`/api/reserve-runs/${run.id}/awards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loot_item_id: itemId,
          character_name: characterName,
          submission_id: submissionId,
        }),
      })
      const data = await res.json()
      if (data.success) {
        showNotification('success', `Awarded to ${characterName}`)
        loadRun()
      } else {
        showNotification('error', data.error)
      }
    } catch {
      showNotification('error', 'Failed to award item')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRemoveAward = async (awardId: string) => {
    if (!run) return
    try {
      const res = await authedFetch(`/api/reserve-runs/${run.id}/awards?award_id=${awardId}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (data.success) {
        showNotification('success', 'Award removed')
        loadRun()
      }
    } catch {
      showNotification('error', 'Failed to remove award')
    }
  }

  const saveNote = async () => {
    if (!run) return
    try {
      const res = await authedFetch(`/api/reserve-runs/${run.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules_note: noteDraft.trim() || null }),
      })
      const data = await res.json()
      if (data.success) {
        showNotification('success', 'Note saved')
        setEditingNote(false)
        loadRun()
      } else {
        showNotification('error', data.error || 'Failed to save note')
      }
    } catch {
      showNotification('error', 'Something went wrong')
    }
  }

  const saveDiscord = async () => {
    if (!run) return
    try {
      const res = await authedFetch(`/api/reserve-runs/${run.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discord_invite_url: discordDraft.trim() || null }),
      })
      const data = await res.json()
      if (data.success) {
        showNotification('success', 'Discord link saved')
        setEditingDiscord(false)
        loadRun()
      } else {
        showNotification('error', data.error || 'Failed to save Discord link')
      }
    } catch {
      showNotification('error', 'Something went wrong')
    }
  }

  const deleteSubmission = (submission: Submission) => {
    if (!run) return
    confirm({
      title: `Remove ${submission.character_name}?`,
      description: 'This deletes the reserve and cannot be undone.',
      confirmLabel: 'Remove reserve',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const res = await authedFetch(
            `/api/reserve-runs/${run.id}/submissions/${submission.id}`,
            { method: 'DELETE' }
          )
          const data = await res.json()
          if (data.success) {
            showNotification('success', 'Reserve removed')
            loadRun()
          } else {
            showNotification('error', data.error || 'Failed to remove reserve')
          }
        } catch {
          showNotification('error', 'Something went wrong')
        }
      },
    })
  }

  const duplicateRun = async () => {
    if (!run) return
    setActionLoading(true)
    try {
      const res = await authedFetch(`/api/reserve-runs/${run.id}/duplicate`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        showNotification('success', 'Run duplicated')
        router.push(`/reserve/runs/${data.run.id}`)
      } else {
        showNotification('error', data.error || 'Failed to duplicate run')
      }
    } catch {
      showNotification('error', 'Something went wrong')
    } finally {
      setActionLoading(false)
    }
  }

  const deleteRun = () => {
    if (!run) return
    confirm({
      title: `Delete ${run.title}?`,
      description: 'This removes the run, all reserves, and all awards. This cannot be undone.',
      confirmLabel: 'Delete run',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const res = await authedFetch(`/api/reserve-runs/${run.id}`, { method: 'DELETE' })
          const data = await res.json()
          if (data.success) {
            showNotification('success', 'Run deleted')
            router.push('/reserve')
          } else {
            showNotification('error', data.error || 'Failed to delete run')
          }
        } catch {
          showNotification('error', 'Something went wrong')
        }
      },
    })
  }

  const exportCsv = () => {
    if (!run) return
    const header = ['Character', 'Class', 'Spec', 'Item', 'Wowhead ID', 'Boss']
    const rows: string[][] = [header]
    for (const sub of run.submissions) {
      for (const itemId of sub.items) {
        const item = itemMap.get(itemId)
        if (!item) continue
        rows.push([
          sub.character_name,
          sub.character_class,
          sub.character_spec || '',
          item.name,
          String(item.wowhead_id),
          item.boss_name || '',
        ])
      }
    }
    const csv = rows
      .map((row) =>
        row
          .map((cell) => `"${cell.replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\n')
    navigator.clipboard.writeText(csv)
    showNotification('success', 'CSV copied to clipboard')
  }

  const exportWeakaura = () => {
    if (!run) return
    // WeakAura format used by raid tools: CharacterName:ItemID:...
    // Each character on its own line, all reserved item IDs separated by colons
    const lines: string[] = []
    for (const sub of run.submissions) {
      const ids = sub.items
        .map((id) => itemMap.get(id)?.wowhead_id)
        .filter((n): n is number => typeof n === 'number')
      if (ids.length === 0) continue
      lines.push(`${sub.character_name}:${ids.join(':')}`)
    }
    navigator.clipboard.writeText(lines.join('\n'))
    showNotification('success', 'WeakAura data copied to clipboard')
  }

  const loadAudit = useCallback(async () => {
    if (!run) return
    setAuditLoading(true)
    try {
      const res = await authedFetch(`/api/reserve-runs/${run.id}/audit`)
      const data = await res.json()
      if (data.success) {
        setAuditEntries(data.entries || [])
      }
    } catch {
      // Silent
    } finally {
      setAuditLoading(false)
    }
  }, [run?.id])

  const toggleAudit = () => {
    const next = !auditOpen
    setAuditOpen(next)
    if (next && auditEntries.length === 0) {
      loadAudit()
    }
  }

  const exportGargul = async () => {
    if (!run) return

    const toUnixSeconds = (iso?: string | null) =>
      iso ? Math.floor(new Date(iso).getTime() / 1000) : 0

    const softreserves: GargulSoftReserve[] = run.submissions.flatMap((sub) => {
      const items = sub.items
        .map((id) => itemMap.get(id)?.wowhead_id)
        .filter((n): n is number => typeof n === 'number' && n > 0)
        .map((id) => ({ id }))
      if (items.length === 0) return []
      return [{
        name: sub.character_name,
        class: normalizeClassForGargul(sub.character_class),
        note: '',
        plusOnes: 0,
        items,
      }]
    })

    const hardreserves: GargulHardReserve[] = run.hard_reserves
      .map((hr) => {
        const item = itemMap.get(hr.loot_item_id)
        if (!item?.wowhead_id) return null
        return {
          id: item.wowhead_id,
          for: hr.reserved_for || '',
          note: '',
        }
      })
      .filter((x): x is GargulHardReserve => x !== null)

    const payload: GargulPayload = {
      metadata: {
        id: run.share_token,
        createdAt: toUnixSeconds(run.raid_at),
        updatedAt: toUnixSeconds(run.raid_at),
        discordUrl: run.discord_invite_url || '',
        hidden: run.visibility === 'hidden_until_lock',
        url: `${window.location.origin}/reserve/join/${run.share_token}`,
        raidStartsAt: toUnixSeconds(run.raid_at),
      },
      softreserves,
      hardreserves,
      instances: [],
    }

    try {
      const base64 = await encodeGargulExport(payload)
      await navigator.clipboard.writeText(base64)
      showNotification('success', 'Gargul data copied. In-game: /gl sr, then paste and Import')
      trackClientEvent('reserve_gargul_exported', { run_id: run.id })
    } catch (err) {
      console.error('exportGargul failed', err)
      showNotification('error', "Couldn't build the Gargul export. Try again.")
    }
  }

  const copyShareLink = () => {
    if (!run) return
    navigator.clipboard.writeText(`${window.location.origin}/reserve/join/${run.share_token}`)
    showNotification('success', 'Share link copied')
    trackClientEvent('reserve_share_link_copied', { run_id: run.id })
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    })
  }

  const getClassColor = (className: string) => {
    return CLASS_COLORS[className.toLowerCase()] || '#FFFFFF'
  }

  if (loading) return null // loading.tsx handles this

  if (!run) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <EmptyState title="Run not found" description="This reserve run doesn't exist or you don't have access." size="lg" />
      </div>
    )
  }

  const statusStyle = STATUS_STYLES[run.status]

  return (
    <>
      {ConfirmDialog}
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">

        {/* Back button */}
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/reserve')}
          >
            <HugeiconsIcon icon={ArrowLeft02Icon} size={16} />
            All runs
          </Button>
        </div>

        {/* Header */}
        <Card variant="unified">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              {run.raid_tier_name && (
                <img
                  src={getRaidIcon(run.raid_tier_name)}
                  alt=""
                  className="w-12 h-12 rounded-lg border border-border/50 flex-shrink-0 hidden sm:block"
                />
              )}
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Heading level={2}>{run.title}</Heading>
                  <Badge variant="outline" className={statusStyle.className}>
                    {statusStyle.label}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
                  {run.raid_tier_name && <span>{run.raid_tier_name}</span>}
                <span className="flex items-center gap-1.5">
                  <HugeiconsIcon icon={Calendar03Icon} size={14} />
                  {formatDate(run.raid_at)}
                </span>
                <span className="flex items-center gap-1.5">
                  <HugeiconsIcon icon={UserMultiple02Icon} size={14} />
                  <span className="tabular-nums">{run.submissions.length}</span> signed up
                </span>
                <span><span className="tabular-nums">{run.max_reserves}</span> reserve{run.max_reserves !== 1 ? 's' : ''} / player</span>
              </div>
              </div>
            </div>

            {/* Actions */}
            {canManage && (
              <div className="flex flex-col items-stretch gap-2 flex-shrink-0 w-full sm:w-auto">
                {run.status === 'open' && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleLock}
                    loading={actionLoading}
                  >
                    <HugeiconsIcon icon={LockIcon} size={16} />
                    Lock
                  </Button>
                )}
                {run.status === 'locked' && (
                  <>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => executeAction('complete')}
                      loading={actionLoading}
                    >
                      <HugeiconsIcon icon={CheckmarkCircle01Icon} size={16} />
                      Complete
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => executeAction('unlock')}
                      loading={actionLoading}
                    >
                      <HugeiconsIcon icon={LockIcon} size={16} />
                      Unlock
                    </Button>
                  </>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={duplicateRun}
                  loading={actionLoading}
                  title="Clone this run for next week"
                >
                  <HugeiconsIcon icon={CopyLinkIcon} size={16} />
                  Duplicate
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Share link + Export */}
        <Card variant="unified">
          <LabelText size="sm" className="mb-3">Share link</LabelText>
          <div className="flex items-center gap-2 mb-3">
            <a
              href={`/reserve/join/${run.share_token}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 min-w-0 h-11 px-5 rounded-xl border border-border-strong bg-background-elevated flex items-center text-[13px] text-muted-foreground hover:text-accent hover:border-accent/40 transition-colors truncate"
              title="Open join page in a new tab"
            >
              {typeof window !== 'undefined' ? `${window.location.origin}/reserve/join/${run.share_token}` : `/reserve/join/${run.share_token}`}
            </a>
            <Button variant="outline" onClick={copyShareLink} className="flex-shrink-0">
              <HugeiconsIcon icon={Copy01Icon} size={16} />
              Copy link
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open(`/reserve/join/${run.share_token}`, '_blank', 'noopener,noreferrer')}
              className="flex-shrink-0"
            >
              View reserve page
              <HugeiconsIcon icon={ArrowRight02Icon} size={14} />
            </Button>
          </div>
          {run.submissions.length > 0 && (
            <div className="pt-3 border-t border-border space-y-2">
              <LabelText size="xs">Export reserves</LabelText>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={exportGargul}>
                  <HugeiconsIcon icon={Copy01Icon} size={14} />
                  Copy for Gargul
                </Button>
                <Button variant="outline" size="sm" onClick={exportWeakaura}>
                  <HugeiconsIcon icon={Copy01Icon} size={14} />
                  Copy for WeakAura
                </Button>
                <Button variant="outline" size="sm" onClick={exportCsv}>
                  <HugeiconsIcon icon={FileDownloadIcon} size={14} />
                  CSV
                </Button>
              </div>
              <Text color="muted" size="xs">Gargul: copy, then in-game type /gl sr and click Import to paste. WeakAura: import into your reserve WA. CSV: paste into a spreadsheet.</Text>
            </div>
          )}
        </Card>

        {/* Raid leader access (visible to managers only, and only when we know the token) */}
        {canManage && run.raid_leader_token && (
          <Card variant="unified">
            <div className="flex items-center justify-between mb-3">
              <LabelText size="sm">Raid leader access</LabelText>
              {leaderToken && (
                <Button variant="ghost" size="sm" onClick={clearLeaderToken}>
                  Sign out of leader access
                </Button>
              )}
            </div>
            <Text color="muted" size="xs" className="mb-3">
              Share this link with co-leaders so they can lock, edit, and award without a LootList+ account. Treat it like a password.
            </Text>
            <div className="flex items-center gap-2 mb-3">
              <Input
                variant="rounded"
                readOnly
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/reserve/runs/${run.id}?leader_token=${run.raid_leader_token}`}
                className="text-[13px] text-muted-foreground"
                onFocus={(e) => e.currentTarget.select()}
              />
              <Button
                variant="outline"
                onClick={() => {
                  const url = `${window.location.origin}/reserve/runs/${run.id}?leader_token=${run.raid_leader_token}`
                  navigator.clipboard.writeText(url)
                  showNotification('success', 'Leader link copied')
                }}
                className="flex-shrink-0"
              >
                <HugeiconsIcon icon={CopyLinkIcon} size={16} />
                Copy
              </Button>
            </div>
            <Text color="muted" size="xs">
              Token: <span className="font-mono text-foreground-secondary">{run.raid_leader_token}</span>
            </Text>
          </Card>
        )}

        {/* Rules */}
        <Card variant="unified">
          <div className="flex items-center justify-between mb-3">
            <LabelText size="sm">Rules</LabelText>
            {canManage && !editingNote && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setNoteDraft(run.rules_note || '')
                  setEditingNote(true)
                }}
              >
                <HugeiconsIcon icon={Edit02Icon} size={14} />
                Edit note
              </Button>
            )}
          </div>
          <div className="space-y-3 text-[13px] text-foreground-secondary">
            <div className="flex flex-wrap gap-x-6 gap-y-1">
              <span><span className="tabular-nums">{run.max_reserves}</span> reserve{run.max_reserves !== 1 ? 's' : ''} per player</span>
              {run.max_reserves_per_item && (
                <span>Max <span className="tabular-nums">{run.max_reserves_per_item}</span> per item</span>
              )}
              <span>{run.visibility === 'hidden_until_lock' ? 'Hidden until you lock' : 'Everyone can see reserves'}</span>
              {run.allow_duplicates && <span>Duplicate reserves allowed</span>}
              {run.enforce_class_restrictions && <span>Class restrictions enforced</span>}
            </div>

            {editingNote ? (
              <div className="space-y-2">
                <Textarea
                  variant="rounded"
                  size="sm"
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  placeholder="e.g. MS > OS, 1 tier token max"
                />
                <div className="flex gap-2">
                  <Button variant="primary" size="sm" onClick={saveNote}>Save note</Button>
                  <Button variant="outline" size="sm" onClick={() => setEditingNote(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : run.rules_note ? (
              <p className="text-muted-foreground whitespace-pre-wrap">{run.rules_note}</p>
            ) : canManage ? (
              <p className="text-muted-foreground italic">No rules note. Click Edit to add one.</p>
            ) : null}

            {run.hard_reserves.length > 0 && (
              <div className="pt-1">
                <LabelText size="xs" className="mb-2">Hard reserves</LabelText>
                <div className="flex flex-wrap gap-2">
                  {run.hard_reserves.map((hr) => {
                    const item = itemMap.get(hr.loot_item_id)
                    return item ? (
                      <Badge
                        key={hr.loot_item_id}
                        variant="outline"
                        className="bg-destructive/10 text-destructive border-destructive/20 gap-1.5"
                      >
                        <ItemLink name={item.name} wowheadId={item.wowhead_id} clickable={false} />
                        {hr.reserved_for && <span className="text-muted-foreground">({hr.reserved_for})</span>}
                      </Badge>
                    ) : null
                  })}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Discord invite link */}
        {(run.discord_invite_url || canManage) && (
          <Card variant="unified">
            <div className="flex items-center justify-between mb-3">
              <LabelText size="sm">Discord</LabelText>
              {canManage && !editingDiscord && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDiscordDraft(run.discord_invite_url || '')
                    setEditingDiscord(true)
                  }}
                >
                  <HugeiconsIcon icon={Edit02Icon} size={14} />
                  Edit link
                </Button>
              )}
            </div>
            {editingDiscord ? (
              <div className="space-y-2">
                <Input
                  variant="rounded"
                  type="url"
                  value={discordDraft}
                  onChange={(e) => setDiscordDraft(e.target.value)}
                  placeholder="https://discord.gg/..."
                />
                <div className="flex gap-2">
                  <Button variant="primary" size="sm" onClick={saveDiscord}>Save link</Button>
                  <Button variant="outline" size="sm" onClick={() => setEditingDiscord(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : run.discord_invite_url ? (
              <a
                href={run.discord_invite_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-accent hover:underline text-[13px]"
              >
                <HugeiconsIcon icon={DiscordIcon} size={16} />
                {run.discord_invite_url}
              </a>
            ) : (
              <Text color="muted" size="sm" className="italic">No Discord link set.</Text>
            )}
          </Card>
        )}

        {/* Participants */}
        <Card className="overflow-hidden">
          <div className="px-5 py-4 border-b border-border space-y-3">
            <div className="flex items-center justify-between gap-3">
              <LabelText size="sm">
                Participants (<span className="tabular-nums">{run.submissions.length}</span>)
              </LabelText>
            </div>
            {run.submissions.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <HugeiconsIcon
                    icon={Search01Icon}
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    variant="rounded"
                    value={participantSearch}
                    onChange={(e) => setParticipantSearch(e.target.value)}
                    placeholder="Search by name, class, spec, or item..."
                    className="pl-9"
                  />
                </div>
                <Select
                  variant="rounded"
                  value={participantSort}
                  onChange={(e) => setParticipantSort(e.target.value as SortMode)}
                  className="sm:w-44"
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="name">Name (A–Z)</option>
                  <option value="class">Class</option>
                </Select>
              </div>
            )}
          </div>
          {run.submissions.length === 0 ? (
            <div className="p-5">
              <Text color="muted" size="sm">No one has signed up yet. Share the link to get started.</Text>
            </div>
          ) : visibleSubmissions.length === 0 ? (
            <div className="p-5">
              <Text color="muted" size="sm">No reserves match your search.</Text>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {visibleSubmissions.map((sub) => (
                <div key={sub.id} className="px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 group">
                  <div className="flex items-center gap-2 min-w-[140px]">
                    <span className="font-semibold text-[14px]" style={{ color: getClassColor(sub.character_class) }}>
                      {sub.character_name}
                    </span>
                    {sub.character_spec && (
                      <span className="text-[11px] text-muted-foreground">({sub.character_spec})</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 flex-1">
                    {(run.status !== 'open' || run.visibility === 'public_live') ? (
                      sub.items.map((itemId) => {
                        const item = itemMap.get(itemId)
                        return item ? (
                          <span key={itemId} className="inline-flex items-center px-2 py-0.5 bg-background-subtle rounded text-[12px]">
                            <ItemLink name={item.name} wowheadId={item.wowhead_id} clickable={false} />
                          </span>
                        ) : null
                      })
                    ) : (
                      <span className="text-[12px] text-muted-foreground italic">
                        {sub.items.length} item{sub.items.length !== 1 ? 's' : ''} reserved (hidden until locked)
                      </span>
                    )}
                  </div>
                  {canManage && (
                    <button
                      onClick={() => deleteSubmission(sub)}
                      className="text-muted-foreground hover:text-destructive transition-colors sm:opacity-0 sm:group-hover:opacity-100"
                      title="Remove this reserve"
                      aria-label={`Remove ${sub.character_name}'s reserve`}
                    >
                      <HugeiconsIcon icon={Delete02Icon} size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Contested items */}
        {contestedItems.length > 0 && (run.status !== 'open' || run.visibility === 'public_live') && (
          <Card className="overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <LabelText size="sm">
                Contested items (<span className="tabular-nums">{contestedItems.length}</span>)
              </LabelText>
            </div>
            <div className="divide-y divide-border">
              {contestedItems.map(({ item, reservers }) => (
                <div key={item.id} className="px-5 py-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <ItemLink name={item.name} wowheadId={item.wowhead_id} />
                    <span className="text-[12px] text-warning font-medium">{reservers.length} reservers</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {reservers.map((sub) => (
                      <span
                        key={sub.id}
                        className="text-[12px] font-medium"
                        style={{ color: getClassColor(sub.character_class) }}
                      >
                        {sub.character_name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Eligibility lookup */}
        {(run.status === 'locked' || run.status === 'completed') && (
          <Card variant="unified">
            <LabelText size="sm" className="mb-3">Item eligibility</LabelText>
            <div className="relative mb-4">
              <HugeiconsIcon
                icon={Search01Icon}
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                variant="rounded"
                value={eligibilitySearch}
                onChange={(e) => setEligibilitySearch(e.target.value)}
                placeholder="Search for a dropped item..."
                className="pl-9"
              />
            </div>

            {eligibilitySearch.trim() && eligibilityResults.length === 0 && (
              <Text color="muted" size="sm">No items match your search.</Text>
            )}

            {eligibilityResults.length > 0 && (
              <div className="space-y-3">
                {eligibilityResults.map(({ item, reservers, isHardReserved, awarded }) => (
                  <div key={item.id} className="border border-border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <ItemLink name={item.name} wowheadId={item.wowhead_id} />
                        {isHardReserved && (
                          <span className="text-[10px] font-semibold uppercase text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">HR</span>
                        )}
                      </div>
                      <span className="text-[12px] text-muted-foreground">{item.boss_name}</span>
                    </div>

                    {awarded.length > 0 && (
                      <div className="mb-2">
                        {awarded.map(a => (
                          <div key={a.id} className="flex items-center gap-2 text-[12px]">
                            <HugeiconsIcon icon={CheckmarkCircle01Icon} size={14} className="text-success" />
                            <span className="text-success font-medium">Awarded to {a.character_name}</span>
                            {canManage && (
                              <button
                                onClick={() => handleRemoveAward(a.id)}
                                className="text-muted-foreground hover:text-destructive transition-colors ml-1"
                              >
                                <HugeiconsIcon icon={Delete02Icon} size={12} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {reservers.length === 0 && !isHardReserved ? (
                      <Text color="muted" size="xs">No one reserved this item</Text>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {reservers.map((sub) => {
                          const alreadyAwarded = awarded.some(a => a.loot_item_id === item.id && a.character_name === sub.character_name)
                          return (
                            <button
                              key={sub.id}
                              onClick={() => canManage && !alreadyAwarded && handleAward(item.id, sub.character_name, sub.id)}
                              disabled={!canManage || alreadyAwarded || actionLoading}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-medium border transition-colors ${
                                alreadyAwarded
                                  ? 'bg-success/10 border-success/20 text-success cursor-default'
                                  : canManage
                                    ? 'bg-background-subtle border-border hover:bg-accent/10 hover:border-accent/30 hover:text-accent cursor-pointer'
                                    : 'bg-background-subtle border-border cursor-default'
                              }`}
                              title={canManage && !alreadyAwarded ? `Award to ${sub.character_name}` : undefined}
                            >
                              <span style={{ color: alreadyAwarded ? undefined : getClassColor(sub.character_class) }}>
                                {sub.character_name}
                              </span>
                              {alreadyAwarded && <HugeiconsIcon icon={CheckmarkCircle01Icon} size={12} />}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Winner log */}
        {run.awards.length > 0 && (
          <Card className="overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <LabelText size="sm">
                Winner log (<span className="tabular-nums">{run.awards.length}</span>)
              </LabelText>
            </div>
            <div className="divide-y divide-border">
              {run.awards.map((award) => {
                const item = itemMap.get(award.loot_item_id)
                return (
                  <div key={award.id} className="px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {item && <ItemLink name={item.name} wowheadId={item.wowhead_id} clickable={false} />}
                      <span className="text-[13px] text-muted-foreground">→</span>
                      <span className="text-[13px] font-medium text-foreground">{award.character_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(award.awarded_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </span>
                      {canManage && (
                        <button
                          onClick={() => handleRemoveAward(award.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                          title="Remove award"
                        >
                          <HugeiconsIcon icon={Delete02Icon} size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        )}

        {/* Audit log */}
        <Card className="overflow-hidden">
          <button
            type="button"
            onClick={toggleAudit}
            className="w-full px-5 py-4 border-b border-border flex items-center justify-between hover:bg-muted/30 transition-colors"
          >
            <LabelText size="sm" className="flex items-center gap-2">
              <HugeiconsIcon icon={Clock01Icon} size={14} />
              Audit log
            </LabelText>
            <span className="text-[12px] text-muted-foreground">
              {auditOpen ? 'Hide' : 'Show'}
            </span>
          </button>
          {auditOpen && (
            <div>
              {auditLoading ? (
                <div className="p-5">
                  <Text color="muted" size="sm">Loading audit log...</Text>
                </div>
              ) : auditEntries.length === 0 ? (
                <div className="p-5">
                  <Text color="muted" size="sm">No audit entries yet.</Text>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {auditEntries.map((entry) => {
                    const when = new Date(entry.created_at).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })
                    const who = entry.actor_label || 'System'
                    const actionLabel = entry.action.replace(/_/g, ' ')
                    const details = entry.details && Object.keys(entry.details).length > 0
                      ? Object.entries(entry.details)
                          .filter(([k]) => k !== 'award_id' && k !== 'submission_id' && k !== 'source_run_id')
                          .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
                          .join(' • ')
                      : ''
                    return (
                      <div key={entry.id} className="px-5 py-2.5 text-[12px]">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-medium text-foreground">{who}</span>
                            <span className="text-muted-foreground">{actionLabel}</span>
                          </div>
                          <span className="text-muted-foreground whitespace-nowrap">{when}</span>
                        </div>
                        {details && (
                          <Text color="muted" size="xs" className="mt-0.5 truncate">{details}</Text>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Danger zone — destructive actions kept away from the main flow */}
        {canManage && (
          <Card variant="unified" className="border-destructive/30">
            <div className="flex items-center justify-between mb-3">
              <LabelText size="sm" className="!text-destructive">Danger zone</LabelText>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <Text size="sm" className="font-semibold">Delete this run</Text>
                <Text color="muted" size="xs">
                  Permanently removes the run, all reserves, and all awards. This cannot be undone.
                </Text>
              </div>
              <Button
                variant="destructive-outline"
                size="sm"
                onClick={deleteRun}
                className="flex-shrink-0"
              >
                <HugeiconsIcon icon={Delete02Icon} size={16} />
                Delete run
              </Button>
            </div>
          </Card>
        )}
      </div>
    </>
  )
}

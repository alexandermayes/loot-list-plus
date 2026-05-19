'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { Skeleton } from '@/components/ui/skeletons'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Heading, Text } from '@/components/ui/typography'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Search01Icon,
  ScrollIcon,
  Medal01Icon,
  Calendar01Icon,
  Settings01Icon,
  UserIcon,
  Shield01Icon,
  Delete01Icon,
  Tick01Icon,
  Cancel01Icon,
  ArrowRight01Icon,
  Edit01Icon,
  Add01Icon,
  Layers01Icon,
  GiftIcon,
} from '@hugeicons/core-free-icons'
import { trackClientEvent } from '@/utils/analytics/client'
import { hasFeature } from '@/domain/guild/feature-flags'

interface AuditLog {
  id: string
  table_name: string
  record_id: string
  action: 'INSERT' | 'UPDATE' | 'DELETE'
  user_id: string
  user_display_name: string
  old_data: Record<string, any> | null
  new_data: Record<string, any> | null
  changed_fields: string[] | null
  created_at: string
  _character_names: Record<string, string>
}

// --- Category system ---

type AuditCategory = 'submission' | 'loot' | 'attendance' | 'settings' | 'members' | 'blp' | 'items' | 'donations'

const CATEGORY_CONFIG: Record<AuditCategory, {
  label: string
  icon: typeof ScrollIcon
  color: string
  bgColor: string
}> = {
  submission: {
    label: 'Submission',
    icon: ScrollIcon,
    color: 'text-[#a78bfa]',
    bgColor: 'bg-[#a78bfa]/10',
  },
  loot: {
    label: 'Loot',
    icon: Medal01Icon,
    color: 'text-[#f59e0b]',
    bgColor: 'bg-[#f59e0b]/10',
  },
  attendance: {
    label: 'Attendance',
    icon: Calendar01Icon,
    color: 'text-[#3b82f6]',
    bgColor: 'bg-[#3b82f6]/10',
  },
  settings: {
    label: 'Settings',
    icon: Settings01Icon,
    color: 'text-[#6b7280]',
    bgColor: 'bg-[#6b7280]/10',
  },
  members: {
    label: 'Members',
    icon: UserIcon,
    color: 'text-[#10b981]',
    bgColor: 'bg-[#10b981]/10',
  },
  blp: {
    label: 'BLP',
    icon: Shield01Icon,
    color: 'text-[#ec4899]',
    bgColor: 'bg-[#ec4899]/10',
  },
  items: {
    label: 'List',
    icon: Layers01Icon,
    color: 'text-[#8b5cf6]',
    bgColor: 'bg-[#8b5cf6]/10',
  },
  donations: {
    label: 'Donation',
    icon: GiftIcon,
    color: 'text-[#14b8a6]',
    bgColor: 'bg-[#14b8a6]/10',
  },
}

function getCategory(tableName: string): AuditCategory {
  switch (tableName) {
    case 'loot_submissions': return 'submission'
    case 'loot_history': return 'loot'
    case 'attendance_records': return 'attendance'
    case 'guild_settings': return 'settings'
    case 'character_guild_memberships':
    case 'guild_members': return 'members' // legacy, kept for historical log entries
    case 'blp_tracking': return 'blp'
    case 'loot_submission_items': return 'items'
    case 'donation_records': return 'donations'
    default: return 'settings'
  }
}

// --- Action icons ---

function getActionIcon(action: string) {
  switch (action) {
    case 'INSERT': return Add01Icon
    case 'DELETE': return Delete01Icon
    default: return Edit01Icon
  }
}

function getActionColor(action: string) {
  switch (action) {
    case 'INSERT': return 'text-success'
    case 'DELETE': return 'text-destructive'
    default: return 'text-accent'
  }
}

// --- Timestamps ---

function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}

function getDateGroupKey(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const entryDate = new Date(d.getFullYear(), d.getMonth(), d.getDate())

  if (entryDate.getTime() === today.getTime()) return 'Today'
  if (entryDate.getTime() === yesterday.getTime()) return 'Yesterday'

  const diffDays = Math.floor((today.getTime() - entryDate.getTime()) / 86400000)
  if (diffDays < 7) return 'This week'

  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })
}

// --- Character name resolution ---

function resolveCharName(log: AuditLog, id: string | undefined | null): string {
  if (!id) return 'unknown'
  return log._character_names?.[id] || id.slice(0, 8) + '...'
}

function resolveCharNames(log: AuditLog, ids: string[] | undefined | null): string {
  if (!ids || ids.length === 0) return ''
  const names = ids.map(id => resolveCharName(log, id))
  if (names.length <= 3) return names.join(', ')
  return `${names.slice(0, 2).join(', ')} and ${names.length - 2} more`
}

// --- Field name humanizer ---

const FIELD_LABELS: Record<string, string> = {
  trial_penalty_enabled: 'trial penalty',
  trial_penalty_value: 'trial penalty value',
  rank_modifiers: 'rank modifiers',
  enforce_slot_restrictions: 'slot restrictions',
  wcl_guild_url: 'Warcraft Logs URL',
  attendance_weight: 'attendance weight',
  ranking_weight: 'ranking weight',
  max_items: 'max items',
  max_items_per_bracket: 'max items per bracket',
  decay_enabled: 'score decay',
  decay_weeks: 'decay window',
  decay_percentage: 'decay percentage',
  loot_score_visibility: 'score visibility',
  submission_lock_enabled: 'submission lock',
  submission_lock_date: 'submission lock date',
  blp_enabled: 'bad luck protection',
  blp_max_passes: 'BLP max passes',
  attendance_scoring_method: 'attendance scoring',
  late_penalty_enabled: 'late penalty',
  late_penalty_value: 'late penalty value',
  benched_credit_enabled: 'benched credit',
  benched_credit_value: 'benched credit value',
  excused_absence_enabled: 'excused absence credit',
  excused_absence_value: 'excused absence value',
  phase_groups: 'phase groups',
}

function humanizeFieldName(field: string): string {
  if (FIELD_LABELS[field]) return FIELD_LABELS[field]
  return field.replace(/_/g, ' ').replace(/\bid\b/g, 'ID').replace(/\burl\b/g, 'URL')
}

function humanizeFieldList(fields: string[]): string {
  const humanized = fields.map(humanizeFieldName)
  if (humanized.length <= 3) return humanized.join(', ')
  return `${humanized.slice(0, 2).join(', ')} and ${humanized.length - 2} more`
}

// --- Rich descriptions ---

function describeActivity(log: AuditLog): { summary: string; detail?: string } {
  const { table_name, action, old_data, new_data, changed_fields } = log

  // Submission status changes
  if (table_name === 'loot_submissions' && action === 'UPDATE') {
    const oldStatus = old_data?.status
    const newStatus = new_data?.status
    if (oldStatus && newStatus) {
      if (newStatus === 'approved') return {
        summary: 'approved a submission',
        detail: new_data?.review_notes || undefined,
      }
      if (newStatus === 'rejected') return {
        summary: 'rejected a submission',
        detail: new_data?.review_notes || undefined,
      }
      if (newStatus === 'needs_revision') return {
        summary: 'requested revision on a submission',
        detail: new_data?.review_notes || undefined,
      }
      if (newStatus === 'pending' && oldStatus === 'draft') return {
        summary: 'submitted list for review',
      }
      if (newStatus === 'pending' && oldStatus === 'needs_revision') return {
        summary: 'resubmitted list for review',
      }
      if (newStatus === 'draft' && oldStatus === 'approved') return {
        summary: 'reverted submission to draft',
      }
      return {
        summary: `changed submission status`,
        detail: `${oldStatus} → ${newStatus}`,
      }
    }
    if (changed_fields?.length) {
      return { summary: `updated submission: ${humanizeFieldList(changed_fields)}` }
    }
  }

  // Submission creates
  if (table_name === 'loot_submissions' && action === 'INSERT') {
    return { summary: 'created a new submission' }
  }
  if (table_name === 'loot_submissions' && action === 'DELETE') {
    return { summary: 'deleted a submission' }
  }

  // Loot awards
  if (table_name === 'loot_history') {
    const name = new_data?.character_name || old_data?.character_name || 'unknown'
    if (action === 'INSERT') return { summary: `awarded loot to ${name}` }
    if (action === 'DELETE') return { summary: `removed loot award from ${name}` }
    if (action === 'UPDATE') {
      const oldName = old_data?.character_name
      const newName = new_data?.character_name
      if (oldName && newName && oldName !== newName) return {
        summary: `reassigned loot award`,
        detail: `${oldName} → ${newName}`,
      }
      return { summary: 'updated loot award' }
    }
  }

  // Donations
  if (table_name === 'donation_records') {
    const name = new_data?.character_name || old_data?.character_name || 'unknown'
    const fmtPoints = (p: unknown) => typeof p === 'number' ? (p > 0 ? `+${p}` : `${p}`) : ''
    if (action === 'INSERT') {
      const pts = fmtPoints(new_data?.points)
      const kind = new_data?.kind
      const amount = new_data?.amount_text
      const parts = [pts, kind && `${kind}`, amount && `(${amount})`].filter(Boolean)
      return { summary: `logged donation for ${name}`, detail: parts.join(' ') || undefined }
    }
    if (action === 'DELETE') {
      const pts = fmtPoints(old_data?.points)
      return { summary: `removed donation from ${name}`, detail: pts || undefined }
    }
    if (action === 'UPDATE') {
      const oldPts = old_data?.points
      const newPts = new_data?.points
      if (typeof oldPts === 'number' && typeof newPts === 'number' && oldPts !== newPts) {
        return { summary: `edited donation for ${name}`, detail: `${fmtPoints(oldPts)} → ${fmtPoints(newPts)}` }
      }
      return { summary: `edited donation for ${name}` }
    }
  }

  // Attendance
  if (table_name === 'attendance_records') {
    const charIds = old_data?.filters?.character_ids || new_data?.filters?.character_ids
    const charId = old_data?.filters?.character_id || old_data?.character_id || new_data?.character_id
    const charNames = charIds ? resolveCharNames(log, charIds) : charId ? resolveCharName(log, charId) : ''

    const count = new_data?.record_count || old_data?.ids
    if (action === 'INSERT') return {
      summary: `saved ${count || ''} attendance record${count !== 1 ? 's' : ''}`,
      detail: charNames || undefined,
    }
    if (action === 'UPDATE') {
      const status = new_data?.status
      return {
        summary: `updated attendance${status ? ` to ${status}` : ''}`,
        detail: charNames || undefined,
      }
    }
    if (action === 'DELETE') return {
      summary: 'deleted attendance records',
      detail: charNames || undefined,
    }
  }

  // Guild settings
  if (table_name === 'guild_settings') {
    if (changed_fields?.length) {
      const changes = changed_fields.map(field => {
        const oldVal = old_data?.[field]
        const newVal = new_data?.[field]
        const label = humanizeFieldName(field)
        if (oldVal !== undefined && newVal !== undefined) {
          const fmt = (v: any) => v === true ? 'on' : v === false ? 'off' : String(v)
          return `${label}: ${fmt(oldVal)} → ${fmt(newVal)}`
        }
        if (newVal !== undefined) {
          const fmt = (v: any) => v === true ? 'on' : v === false ? 'off' : String(v)
          return `${label}: ${fmt(newVal)}`
        }
        return label
      })
      return { summary: `changed guild settings`, detail: changes.join(', ') }
    }
    return { summary: 'updated guild settings' }
  }

  // Member management
  if (table_name === 'character_guild_memberships' || table_name === 'guild_members') {
    const charIds = new_data?.character_ids || old_data?.character_ids
    const targetName = charIds ? resolveCharNames(log, charIds) : ''

    if (action === 'UPDATE') {
      const newRole = new_data?.new_role || new_data?.role
      if (newRole) return {
        summary: `changed role to ${newRole}`,
        detail: targetName || undefined,
      }
      return { summary: `updated member`, detail: targetName || undefined }
    }
    if (action === 'DELETE') return {
      summary: `removed member from guild`,
      detail: targetName || undefined,
    }
    if (action === 'INSERT') return {
      summary: 'added member to guild',
      detail: targetName || undefined,
    }
  }

  // BLP
  if (table_name === 'blp_tracking') {
    const count = new_data?.incremented_count
    return { summary: `updated bad luck protection`, detail: `${count || 0} passed, 1 winner reset` }
  }

  // Submission items
  if (table_name === 'loot_submission_items') {
    if (action === 'DELETE') return { summary: 'removed item from list' }
    if (action === 'UPDATE') return { summary: 'restored item to list' }
    if (action === 'INSERT') return { summary: 'added item to list' }
  }

  // Fallback
  const actionLabel = action === 'INSERT' ? 'created' : action === 'DELETE' ? 'deleted' : 'updated'
  return { summary: `${actionLabel} ${table_name.replace(/_/g, ' ')}` }
}

// --- Stats ---

function computeStats(logs: AuditLog[]) {
  let submissions = 0
  let lootAwards = 0
  let attendanceUpdates = 0

  for (const log of logs) {
    const cat = getCategory(log.table_name)
    if (cat === 'submission') submissions++
    else if (cat === 'loot') lootAwards++
    else if (cat === 'attendance') attendanceUpdates++
  }

  return { submissions, lootAwards, attendanceUpdates, total: logs.length }
}

// --- Components ---

function StatCard({ label, value, icon, color, bgColor }: {
  label: string
  value: number
  icon: typeof ScrollIcon
  color: string
  bgColor: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-background-elevated px-4 py-3">
      <div className={`flex items-center justify-center w-9 h-9 rounded-lg ${bgColor}`}>
        <HugeiconsIcon icon={icon} size={18} className={color} />
      </div>
      <div>
        <p className="text-xl font-semibold text-foreground tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

function CategoryBadge({ category }: { category: AuditCategory }) {
  const config = CATEGORY_CONFIG[category]
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${config.color} ${config.bgColor}`}>
      <HugeiconsIcon icon={config.icon} size={12} />
      {config.label}
    </span>
  )
}

function AuditEntry({ log }: { log: AuditLog }) {
  const category = getCategory(log.table_name)
  const catConfig = CATEGORY_CONFIG[category]
  const { summary, detail } = describeActivity(log)
  const actionIcon = getActionIcon(log.action)
  const actionColor = getActionColor(log.action)

  return (
    <div className="group flex items-start gap-3 px-5 py-3.5 hover:bg-muted/50 transition-colors">
      {/* Category icon with action indicator */}
      <div className="relative flex-shrink-0 mt-0.5">
        <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${catConfig.bgColor}`}>
          <HugeiconsIcon icon={catConfig.icon} size={16} className={catConfig.color} />
        </div>
        {/* Small action badge */}
        <div className={`absolute -bottom-1.5 -right-1.5 flex items-center justify-center w-5 h-5 rounded-full bg-background-elevated border border-border ${actionColor}`}>
          <HugeiconsIcon icon={actionIcon} size={12} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-[13px] font-medium text-foreground">{log.user_display_name}</span>
          <span className="text-[13px] text-foreground-secondary">{summary}</span>
        </div>
        {detail && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{detail}</p>
        )}
      </div>

      {/* Category + Timestamp */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <CategoryBadge category={category} />
        <span
          className="text-xs text-muted-foreground tabular-nums min-w-[60px] text-right"
          title={new Date(log.created_at).toLocaleString()}
        >
          {formatTimestamp(log.created_at)}
        </span>
      </div>
    </div>
  )
}

function DateGroupHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 px-5 py-2 bg-background-subtle/50">
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="rounded-xl border border-border overflow-hidden bg-background-elevated">
      {/* Skeleton stats */}
      <div className="flex gap-4 p-5 border-b border-border">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 flex-1">
            <Skeleton className="w-9 h-9 rounded-lg" />
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-10" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
      {/* Skeleton entries */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-5 py-3.5 border-b border-border last:border-0">
          <Skeleton className="w-8 h-8 rounded-lg" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
    </div>
  )
}

// --- Filters ---

const TABLE_OPTIONS = [
  { value: '', label: 'All activity' },
  { value: 'loot_submissions', label: 'Submissions' },
  { value: 'loot_history', label: 'Loot awards' },
  { value: 'attendance_records', label: 'Attendance' },
  { value: 'guild_settings', label: 'Settings' },
  { value: 'loot_submission_items', label: 'List items' },
  { value: 'character_guild_memberships', label: 'Members' },
  { value: 'blp_tracking', label: 'Bad luck protection' },
]

const ACTION_OPTIONS = [
  { value: '', label: 'All actions' },
  { value: 'INSERT', label: 'Created' },
  { value: 'UPDATE', label: 'Updated' },
  { value: 'DELETE', label: 'Deleted' },
]

const PAGE_SIZE = 30

export default function AuditLogPage() {
  const { activeGuild, hasPermission } = useGuildContext()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [tableFilter, setTableFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [searchExhausted, setSearchExhausted] = useState(true)

  // Track page view
  useEffect(() => {
    if (activeGuild?.id) trackClientEvent('audit_log_page_viewed', { guild_id: activeGuild.id })
  }, [activeGuild?.id])

  const fetchLogs = useCallback(async () => {
    if (!activeGuild?.id) return
    setLoading(true)

    const params = new URLSearchParams({
      guild_id: activeGuild.id,
      limit: String(PAGE_SIZE),
      offset: String(offset),
    })
    if (tableFilter) params.set('table_name', tableFilter)
    if (actionFilter) params.set('action', actionFilter)
    if (debouncedSearch) params.set('search', debouncedSearch)

    try {
      const res = await fetch(`/api/audit-logs?${params}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setLogs(data.logs)
      setTotal(data.total)
      setSearchExhausted(data.search_exhausted !== false)
    } catch {
      setLogs([])
      setTotal(0)
      setSearchExhausted(true)
    } finally {
      setLoading(false)
    }
  }, [activeGuild?.id, offset, tableFilter, actionFilter, debouncedSearch])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  // Reset pagination when filters change
  useEffect(() => {
    setOffset(0)
  }, [tableFilter, actionFilter, debouncedSearch])

  // Group logs by date
  const groupedLogs = useMemo(() => {
    const groups: { label: string; logs: AuditLog[] }[] = []
    let currentLabel = ''

    for (const log of logs) {
      const label = getDateGroupKey(log.created_at)
      if (label !== currentLabel) {
        groups.push({ label, logs: [] })
        currentLabel = label
      }
      groups[groups.length - 1].logs.push(log)
    }

    return groups
  }, [logs])

  // Stats from current page
  const stats = useMemo(() => computeStats(logs), [logs])

  if (!hasPermission('view_audit_log') || !hasFeature(activeGuild, 'audit_log')) {
    return (
      <div className="p-8">
        <EmptyState
          icon={Search01Icon}
          title={!hasPermission('view_audit_log') ? 'Officers only' : 'Pro feature'}
          description={!hasPermission('view_audit_log') ? 'You need officer permissions to view audit logs.' : 'Audit log is available on the Pro plan.'}
        />
      </div>
    )
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1

  return (
    <div className="p-8 space-y-6">
      {/* Header + Filters */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-shrink-0">
          <Heading level={2}>Audit log</Heading>
          <Text size="sm" color="muted" className="mt-1">
            Track every officer action across your guild.
          </Text>
        </div>
        <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <HugeiconsIcon
            icon={Search01Icon}
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            variant="pill"
            size="default"
            className="pl-9"
          />
        </div>
        <Select
          value={tableFilter}
          onChange={(e) => setTableFilter(e.target.value)}
          variant="pill"
          size="default"
          className="w-auto min-w-0"
        >
          {TABLE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </Select>
        <Select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          variant="pill"
          size="default"
          className="w-auto min-w-0"
        >
          {ACTION_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </Select>
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : logs.length === 0 ? (
        <EmptyState
          icon={Search01Icon}
          title="All quiet on the logs"
          description={debouncedSearch ? 'No results matched your search.' : 'Activity shows up here when officers make changes.'}
          size="lg"
        />
      ) : (
        <>
          {/* Stats bar */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard
              label="Submissions"
              value={stats.submissions}
              icon={ScrollIcon}
              color="text-[#a78bfa]"
              bgColor="bg-[#a78bfa]/10"
            />
            <StatCard
              label="Loot awards"
              value={stats.lootAwards}
              icon={Medal01Icon}
              color="text-[#f59e0b]"
              bgColor="bg-[#f59e0b]/10"
            />
            <StatCard
              label="Attendance"
              value={stats.attendanceUpdates}
              icon={Calendar01Icon}
              color="text-[#3b82f6]"
              bgColor="bg-[#3b82f6]/10"
            />
          </div>

          {/* Activity feed */}
          <div className="rounded-xl border border-border overflow-hidden bg-background-elevated">
            {groupedLogs.map((group) => (
              <div key={group.label}>
                <DateGroupHeader label={group.label} />
                {group.logs.map((log) => (
                  <AuditEntry key={log.id} log={log} />
                ))}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <Text size="sm" color="muted">
                <span className="tabular-nums">{total}</span> entries
                {debouncedSearch && !searchExhausted && (
                  <span className="text-warning ml-2">Search covers recent entries only.</span>
                )}
              </Text>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={offset === 0}
                  onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                >
                  Previous
                </Button>
                <Text size="sm" color="muted" className="px-2 tabular-nums">
                  Page {currentPage} of {totalPages}
                </Text>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={offset + PAGE_SIZE >= total}
                  onClick={() => setOffset(offset + PAGE_SIZE)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

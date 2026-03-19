'use client'

import { useState, useEffect, useCallback } from 'react'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Heading } from '@/components/ui/typography'
import { Search01Icon } from '@hugeicons/core-free-icons'

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
}

const TABLE_LABELS: Record<string, string> = {
  loot_submissions: 'Submissions',
  loot_history: 'Loot awards',
  attendance_records: 'Attendance',
  guild_settings: 'Guild settings',
  loot_submission_items: 'List items',
  character_guild_memberships: 'Members',
  guild_members: 'Members (legacy)',
  blp_tracking: 'Bad luck protection',
}

const ACTION_LABELS: Record<string, string> = {
  INSERT: 'Created',
  UPDATE: 'Updated',
  DELETE: 'Deleted',
}

const ACTION_COLORS: Record<string, string> = {
  INSERT: 'text-success',
  UPDATE: 'text-accent',
  DELETE: 'text-destructive',
}

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

  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })
}

function describeSummary(log: AuditLog): string {
  const { table_name, action, old_data, new_data, changed_fields } = log

  // Submission status changes
  if (table_name === 'loot_submissions' && action === 'UPDATE') {
    const oldStatus = old_data?.status
    const newStatus = new_data?.status
    if (oldStatus && newStatus) {
      if (newStatus === 'approved') return `Approved submission`
      if (newStatus === 'rejected') return `Rejected submission`
      if (newStatus === 'pending') return `Submitted list for review`
      if (newStatus === 'approved' && new_data?.action === 'revert') return `Reverted submission to approved`
      return `Changed status: ${oldStatus} → ${newStatus}`
    }
    if (changed_fields?.length) {
      return `Updated ${changed_fields.join(', ')}`
    }
  }

  // Loot awards
  if (table_name === 'loot_history') {
    const name = new_data?.character_name || old_data?.character_name || 'unknown'
    if (action === 'INSERT') return `Awarded loot to ${name}`
    if (action === 'DELETE') return `Removed loot award from ${name}`
    if (action === 'UPDATE') {
      const oldName = old_data?.character_name
      const newName = new_data?.character_name
      if (oldName && newName && oldName !== newName) return `Reassigned loot: ${oldName} → ${newName}`
      return `Updated loot award`
    }
  }

  // Attendance
  if (table_name === 'attendance_records') {
    const count = new_data?.record_count || old_data?.ids
    if (action === 'INSERT') return `Saved ${count || ''} attendance record${count !== 1 ? 's' : ''}`
    if (action === 'UPDATE') return `Updated attendance records`
    if (action === 'DELETE') return `Deleted attendance records`
  }

  // Guild settings
  if (table_name === 'guild_settings') {
    if (changed_fields?.length) {
      return `Changed ${changed_fields.join(', ')}`
    }
    return `Updated guild settings`
  }

  // Member management
  if (table_name === 'character_guild_memberships' || table_name === 'guild_members') {
    if (action === 'UPDATE') {
      const newRole = new_data?.new_role || new_data?.role
      if (newRole) return `Changed role to ${newRole}`
      return `Updated member`
    }
    if (action === 'DELETE') return `Removed member from guild`
  }

  // BLP
  if (table_name === 'blp_tracking') {
    const count = new_data?.incremented_count
    return `Updated BLP: ${count || 0} passed, 1 winner reset`
  }

  // Submission items
  if (table_name === 'loot_submission_items') {
    if (action === 'DELETE') return `Removed item from list`
    if (action === 'UPDATE') return `Restored item to list`
  }

  // Fallback
  return `${ACTION_LABELS[action] || action} ${TABLE_LABELS[table_name] || table_name}`
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <span className="text-xs text-muted-foreground">
      <span className="text-foreground-secondary">{label}:</span> {value}
    </span>
  )
}

const PAGE_SIZE = 30

export default function AuditLogPage() {
  const { activeGuild, isOfficer } = useGuildContext()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [tableFilter, setTableFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

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
    } catch {
      setLogs([])
      setTotal(0)
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

  if (!isOfficer) {
    return (
      <div className="p-8">
        <EmptyState
          icon={Search01Icon}
          title="Officers only"
          description="You need officer permissions to view audit logs."
        />
      </div>
    )
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <Heading level={2}>Audit log</Heading>
        <div className="flex items-center gap-3">
          <Input
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            variant="pill"
            className="w-48"
          />
          <Select
            value={tableFilter}
            onChange={(e) => setTableFilter(e.target.value)}
            variant="pill"
          >
            <option value="">All tables</option>
            <option value="loot_submissions">Submissions</option>
            <option value="loot_history">Loot awards</option>
            <option value="attendance_records">Attendance</option>
            <option value="guild_settings">Guild settings</option>
            <option value="loot_submission_items">List items</option>
            <option value="character_guild_memberships">Members</option>
            <option value="blp_tracking">Bad luck protection</option>
          </Select>
          <Select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            variant="pill"
          >
            <option value="">All actions</option>
            <option value="INSERT">Created</option>
            <option value="UPDATE">Updated</option>
            <option value="DELETE">Deleted</option>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : logs.length === 0 ? (
        <EmptyState
          icon={Search01Icon}
          title="No audit logs"
          description="Activity will show up here as officers make changes."
        />
      ) : (
        <>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-background-subtle">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">When</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Who</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Action</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">What</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap" title={new Date(log.created_at).toLocaleString()}>
                      {formatTimestamp(log.created_at)}
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {log.user_display_name}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-medium ${ACTION_COLORS[log.action] || ''}`}>
                        {ACTION_LABELS[log.action] || log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-foreground-secondary">
                      {TABLE_LABELS[log.table_name] || log.table_name}
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[13px]">{describeSummary(log)}</span>
                        {log.new_data?.review_notes && (
                          <DetailLine label="Notes" value={log.new_data.review_notes} />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {total} entries
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={offset === 0}
                  onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground px-2">
                  Page {currentPage} of {totalPages}
                </span>
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

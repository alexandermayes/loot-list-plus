'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { useNotification } from '@/app/contexts/NotificationContext'
import { useConfirm } from '@/components/ui/confirm-modal'
import { Skeleton } from '@/components/ui/skeletons'
import { Text } from '@/components/ui/typography'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { DatePicker } from '@/components/ui/date-picker'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { HugeiconsIcon } from '@hugeicons/react'
import { GiftIcon, Edit01Icon, Delete01Icon } from '@hugeicons/core-free-icons'
import LogDonationModal, { type DonationRecord, type DonationKind } from './LogDonationModal'

interface Member {
  character_id: string
  user_id: string
  character_name: string
  class_name: string
  class_color: string
  role: string
}

const PAGE_SIZE = 50

const KIND_LABELS: Record<DonationKind, string> = {
  gold: 'Gold',
  materials: 'Materials',
  consumables: 'Consumables',
  other: 'Other',
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatPoints(p: number): string {
  return p > 0 ? `+${p}` : `${p}`
}

interface DonationsTabProps {
  /** Called when the empty-state CTA fires (no `donation_bonuses_enabled`). */
  onOpenSettings?: () => void
}

export default function DonationsTab({ onOpenSettings }: DonationsTabProps = {}) {
  const { activeGuild, hasPermission } = useGuildContext()
  const { showNotification } = useNotification()
  const { confirm, ConfirmDialog } = useConfirm()
  const canManage = hasPermission('manage_loot')

  const [donations, setDonations] = useState<DonationRecord[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [donationsEnabled, setDonationsEnabled] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)

  // Filters
  const [characterFilter, setCharacterFilter] = useState('')
  const [kindFilter, setKindFilter] = useState<'all' | DonationKind>('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<DonationRecord | null>(null)

  const memberMap = useMemo(() => {
    const m = new Map<string, Member>()
    for (const member of members) m.set(member.character_id, member)
    return m
  }, [members])

  const fetchSettings = useCallback(async () => {
    if (!activeGuild) return
    try {
      const res = await fetch(`/api/guild-settings?guild_id=${activeGuild.id}`)
      const data = res.ok ? await res.json() : null
      setDonationsEnabled(!!data?.settings?.donation_bonuses_enabled)
    } catch {
      setDonationsEnabled(false)
    }
  }, [activeGuild])

  const fetchMembers = useCallback(async () => {
    if (!activeGuild) return
    try {
      const res = await fetch(`/api/guild-members?guild_id=${activeGuild.id}`)
      const data = res.ok ? await res.json() : null
      if (!data?.members) return
      const list: Member[] = []
      for (const m of data.members) {
        for (const char of m.characters || []) {
          list.push({
            character_id: char.id,
            user_id: m.user_id,
            character_name: char.name || 'Unknown',
            class_name: char.class?.name || 'Unknown',
            class_color: char.class?.color_hex || '#888888',
            role: m.role || 'Member',
          })
        }
      }
      list.sort((a, b) => a.character_name.localeCompare(b.character_name))
      setMembers(list)
    } catch {
      // Non-fatal — modal will show no characters
    }
  }, [activeGuild])

  const fetchDonations = useCallback(async (offset = 0, append = false) => {
    if (!activeGuild) return
    if (offset === 0) setLoading(true)
    else setLoadingMore(true)

    try {
      const params = new URLSearchParams({
        guild_id: activeGuild.id,
        limit: String(PAGE_SIZE),
        offset: String(offset),
      })
      if (fromDate) params.append('since', fromDate)
      if (toDate) params.append('until', toDate)

      const res = await fetch(`/api/donations?${params}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        showNotification('error', data.error || 'Couldn’t load donations. Try again.')
        return
      }

      // Client-side filters that don't have a server param
      let rows: DonationRecord[] = data.data ?? []
      if (kindFilter !== 'all') rows = rows.filter(r => r.kind === kindFilter)
      if (characterFilter.trim()) {
        const q = characterFilter.trim().toLowerCase()
        rows = rows.filter(r => r.character_name.toLowerCase().includes(q))
      }

      setDonations(prev => append ? [...prev, ...rows] : rows)
      setTotal(data.pagination?.total ?? rows.length)
      setHasMore(offset + (data.data?.length ?? 0) < (data.pagination?.total ?? 0))
    } catch (err) {
      console.error('Donations fetch error:', err)
      showNotification('error', 'Couldn’t load donations. Try again.')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [activeGuild, fromDate, toDate, kindFilter, characterFilter, showNotification])

  // Initial loads
  useEffect(() => {
    if (!activeGuild) return
    fetchSettings()
    fetchMembers()
  }, [activeGuild, fetchSettings, fetchMembers])

  // Server-filter refetch (date range)
  useEffect(() => {
    if (!activeGuild) return
    fetchDonations(0, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGuild, fromDate, toDate])

  // Debounced client-side filter refetch (kind + character search)
  useEffect(() => {
    if (!activeGuild) return
    const t = setTimeout(() => fetchDonations(0, false), 200)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kindFilter, characterFilter])

  const handleRevoke = (row: DonationRecord) => {
    if (!activeGuild) return
    confirm({
      title: 'Revoke this donation?',
      description: `This logs an offsetting ${formatPoints(-row.points)} entry, preserving the original in the audit trail.`,
      confirmLabel: 'Revoke donation',
      variant: 'danger',
      onConfirm: async () => {
        const res = await fetch('/api/donations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            guild_id: activeGuild.id,
            character_id: row.character_id,
            points: -row.points,
            kind: row.kind,
            amount_text: row.amount_text,
            note: `Revoked donation from ${row.awarded_at}`,
            awarded_at: new Date().toISOString().slice(0, 10),
          }),
        })
        const result = await res.json().catch(() => ({}))
        if (!res.ok) {
          showNotification('error', result.error || 'Couldn’t revoke donation.')
          return
        }
        showNotification('success', 'Donation revoked.')
        fetchDonations(0, false)
      },
    })
  }

  const handleDelete = (row: DonationRecord) => {
    confirm({
      title: 'Delete this donation?',
      description: `Removes the ${formatPoints(row.points)} entry for ${row.character_name}. The audit log keeps a record. Use revoke instead if you want it visible.`,
      confirmLabel: 'Delete donation',
      variant: 'danger',
      onConfirm: async () => {
        const res = await fetch(`/api/donations/${row.id}`, { method: 'DELETE' })
        const result = await res.json().catch(() => ({}))
        if (!res.ok) {
          showNotification('error', result.error || 'Couldn’t delete donation.')
          return
        }
        showNotification('success', 'Donation deleted.')
        fetchDonations(0, false)
      },
    })
  }

  const handleClearFilters = () => {
    setCharacterFilter('')
    setKindFilter('all')
    setFromDate('')
    setToDate('')
  }

  // Compute stats from visible rows
  const totalPoints = useMemo(() => donations.reduce((sum, d) => sum + d.points, 0), [donations])
  const thisWeekCount = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    return donations.filter(d => new Date(d.awarded_at).getTime() >= weekAgo).length
  }, [donations])

  // ─── Render ────────────────────────────────────────────────

  if (!canManage) {
    return (
      <EmptyState
        icon={GiftIcon}
        title="Officers only"
        description="Donations are logged by officers. Ask an officer if you contributed something to the bank."
        size="default"
        variant="card"
      />
    )
  }

  if (loading && donations.length === 0 && donationsEnabled === null) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-background-elevated border border-border rounded-xl p-4">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-7 w-12 mt-1" />
            </div>
          ))}
        </div>
        <Skeleton className="h-9 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  if (donationsEnabled === false) {
    return (
      <EmptyState
        icon={GiftIcon}
        title="Donation bonuses are off"
        description="Turn them on in loot settings to start crediting raiders for bank donations."
        size="default"
        variant="card"
        action={onOpenSettings ? {
          label: 'Open loot settings',
          onClick: onOpenSettings,
          variant: 'primary',
        } : undefined}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-background-elevated border border-border rounded-xl p-4">
          <Text size="sm" color="muted">Total donations</Text>
          <p className="text-2xl font-bold text-foreground tabular-nums">{total}</p>
        </div>
        <div className="bg-background-elevated border border-border rounded-xl p-4">
          <Text size="sm" color="muted">Points in view</Text>
          <p className="text-2xl font-bold text-accent tabular-nums">{formatPoints(totalPoints)}</p>
        </div>
        <div className="bg-background-elevated border border-border rounded-xl p-4 col-span-2 sm:col-span-1">
          <Text size="sm" color="muted">This week</Text>
          <p className="text-2xl font-bold text-foreground tabular-nums">{thisWeekCount}</p>
        </div>
      </div>

      {/* Filters + Log button */}
      <div className="bg-background-elevated border border-border rounded-xl p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Label className="mb-2">Search player</Label>
            <Input
              variant="rounded"
              size="sm"
              value={characterFilter}
              onChange={(e) => setCharacterFilter(e.target.value)}
              placeholder="Character name..."
            />
          </div>
          <div>
            <Label className="mb-2">Kind</Label>
            <Select
              variant="rounded"
              size="sm"
              value={kindFilter}
              onChange={(e) => setKindFilter(e.target.value as 'all' | DonationKind)}
            >
              <option value="all">All kinds</option>
              {(Object.keys(KIND_LABELS) as DonationKind[]).map(k => (
                <option key={k} value={k}>{KIND_LABELS[k]}</option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="mb-2">From</Label>
              <DatePicker variant="rounded" size="sm" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div>
              <Label className="mb-2">To</Label>
              <DatePicker variant="rounded" size="sm" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
          </div>
          <div className="flex items-end">
            <Button
              variant="primary"
              className="w-full"
              onClick={() => { setEditing(null); setModalOpen(true) }}
            >
              Log donation
            </Button>
          </div>
        </div>

        {(characterFilter || kindFilter !== 'all' || fromDate || toDate) && (
          <div className="mt-3 pt-3 border-t border-border">
            <Button variant="ghost" size="sm" onClick={handleClearFilters}>
              Clear filters
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      {donations.length === 0 ? (
        <EmptyState
          icon={GiftIcon}
          title="No donations logged yet"
          description={
            characterFilter || kindFilter !== 'all' || fromDate || toDate
              ? 'Try adjusting your filters.'
              : 'Log your first bank donation to credit a raider.'
          }
          size="default"
          variant="card"
        />
      ) : (
        <div className="bg-background-elevated border border-border rounded-xl overflow-hidden">
          {/* Mobile cards */}
          <div className="sm:hidden divide-y divide-border">
            {donations.map(row => {
              const member = row.character_id ? memberMap.get(row.character_id) : null
              return (
                <div key={row.id} className="px-4 py-3 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium" style={{ color: member?.class_color }}>
                      {row.character_name}
                    </span>
                    <span className={`text-sm font-semibold tabular-nums ${row.points >= 0 ? 'text-accent' : 'text-destructive'}`}>
                      {formatPoints(row.points)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                    <span>{KIND_LABELS[row.kind]}</span>
                    {row.amount_text && <><span>·</span><span>{row.amount_text}</span></>}
                    <span>·</span>
                    <span>{formatDate(row.awarded_at)}</span>
                  </div>
                  {row.note && <p className="text-[11px] text-muted-foreground truncate">{row.note}</p>}
                  <div className="flex gap-2 pt-1">
                    <Button variant="ghost" size="sm" onClick={() => { setEditing(row); setModalOpen(true) }}>
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleRevoke(row)}>
                      Revoke
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(row)}>
                      Delete
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto max-h-[calc(100vh-400px)] overflow-y-auto">
            <table className="w-full min-w-[800px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-muted border-b border-border">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground bg-muted">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground bg-muted">Character</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground bg-muted">Kind</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground bg-muted">Amount</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-muted-foreground bg-muted">Points</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground bg-muted">Note</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-muted-foreground bg-muted">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {donations.map(row => {
                  const member = row.character_id ? memberMap.get(row.character_id) : null
                  return (
                    <tr key={row.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3 text-foreground text-sm whitespace-nowrap">{formatDate(row.awarded_at)}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="font-medium" style={{ color: member?.class_color }}>
                          {row.character_name}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-sm">{KIND_LABELS[row.kind]}</td>
                      <td className="px-4 py-3 text-muted-foreground text-sm max-w-[200px] truncate">{row.amount_text || '-'}</td>
                      <td className={`px-4 py-3 text-sm text-right font-semibold tabular-nums ${row.points >= 0 ? 'text-accent' : 'text-destructive'}`}>
                        {formatPoints(row.points)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-sm max-w-[240px] truncate">{row.note || '-'}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setEditing(row); setModalOpen(true) }}
                            aria-label="Edit donation"
                            title="Edit"
                          >
                            <HugeiconsIcon icon={Edit01Icon} size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRevoke(row)}
                            title="Revoke (log offsetting entry)"
                          >
                            Revoke
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(row)}
                            aria-label="Delete donation"
                            title="Delete"
                          >
                            <HugeiconsIcon icon={Delete01Icon} size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {hasMore && (
            <div className="p-4 border-t border-border flex justify-center">
              <Button
                variant="outline"
                loading={loadingMore}
                onClick={() => fetchDonations(donations.length, true)}
              >
                Load more
              </Button>
            </div>
          )}
        </div>
      )}

      <LogDonationModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        guildId={activeGuild?.id ?? ''}
        members={members}
        editing={editing}
        onSaved={() => fetchDonations(0, false)}
      />

      <Text size="xs" color="muted" className="text-center">
        Donation history is also visible in the{' '}
        <Link href="/audit-log" className="text-accent hover:underline">audit log</Link>.
      </Text>

      {ConfirmDialog}
    </div>
  )
}

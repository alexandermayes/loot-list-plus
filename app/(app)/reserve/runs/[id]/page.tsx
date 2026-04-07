'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { useNotification } from '@/app/contexts/NotificationContext'
import { useConfirm } from '@/components/ui/confirm-modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Heading, Text } from '@/components/ui/typography'
import ItemLink from '@/app/components/ItemLink'
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
} from '@hugeicons/core-free-icons'
import { trackClientEvent } from '@/utils/analytics/client'
import { refreshWowheadTooltips } from '@/lib/wowhead'

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
  allow_duplicates: boolean
  visibility: string
  rules_note: string | null
  hard_reserves: Array<{ loot_item_id: string; reserved_for?: string }>
  share_token: string
  guild_id: string
  raid_tier_name: string | null
  submissions: Submission[]
  awards: Award[]
  items: LootItem[]
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  open: { bg: 'bg-success/15', text: 'text-success', label: 'Open' },
  locked: { bg: 'bg-warning/15', text: 'text-warning', label: 'Locked' },
  completed: { bg: 'bg-muted/30', text: 'text-muted-foreground', label: 'Completed' },
}

export default function ReserveRunPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { isOfficer } = useGuildContext()
  const { showNotification } = useNotification()
  const { confirm, ConfirmDialog } = useConfirm()
  const [run, setRun] = useState<ReserveRun | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [eligibilitySearch, setEligibilitySearch] = useState('')

  const loadRun = useCallback(async () => {
    try {
      const res = await fetch(`/api/reserve-runs/${id}`)
      const data = await res.json()
      if (data.success) {
        setRun(data.run)
      }
    } catch (err) {
      console.error('Failed to load run:', err)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    trackClientEvent('reserve_run_viewed', { run_id: id })
    loadRun()
  }, [loadRun, id])

  useEffect(() => {
    if (run) {
      document.title = `LootList+ \u2022 ${run.title}`
      refreshWowheadTooltips()
    }
  }, [run])

  const itemMap = useMemo(() => {
    if (!run) return new Map<string, LootItem>()
    return new Map(run.items.map(item => [item.id, item]))
  }, [run?.items])

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

  const handleAction = async (action: string) => {
    if (!run) return

    if (action === 'lock') {
      const yes = await confirm({
        title: 'Lock reserves?',
        description: 'Players will no longer be able to submit or edit reserves.',
        confirmLabel: 'Lock run',
      })
      if (!yes) return
    }

    setActionLoading(true)
    try {
      const res = await fetch(`/api/reserve-runs/${run.id}`, {
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

  const handleAward = async (itemId: string, characterName: string, submissionId?: string) => {
    if (!run) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/reserve-runs/${run.id}/awards`, {
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
      const res = await fetch(`/api/reserve-runs/${run.id}/awards?award_id=${awardId}`, {
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
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
        <EmptyState title="Run not found" description="This reserve run doesn't exist or you don't have access." size="lg" />
      </div>
    )
  }

  const statusStyle = STATUS_STYLES[run.status]

  return (
    <>
      <ConfirmDialog />
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">

        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/reserve')}
          className="text-muted-foreground -ml-2"
        >
          <HugeiconsIcon icon={ArrowLeft02Icon} size={16} />
          All runs
        </Button>

        {/* Header */}
        <div className="bg-background-elevated border border-border rounded-xl p-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Heading level={2}>{run.title}</Heading>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide ${statusStyle.bg} ${statusStyle.text}`}>
                  {statusStyle.label}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
                {run.raid_tier_name && <span>{run.raid_tier_name}</span>}
                <span className="flex items-center gap-1.5">
                  <HugeiconsIcon icon={Calendar03Icon} size={14} />
                  {formatDate(run.raid_at)}
                </span>
                <span className="flex items-center gap-1.5">
                  <HugeiconsIcon icon={UserMultiple02Icon} size={14} />
                  {run.submissions.length} signed up
                </span>
                <span>{run.max_reserves} reserve{run.max_reserves !== 1 ? 's' : ''} / player</span>
              </div>
            </div>

            {/* Actions */}
            {isOfficer && (
              <div className="flex items-center gap-2 flex-shrink-0">
                {run.status === 'open' && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleAction('lock')}
                    loading={actionLoading}
                  >
                    <HugeiconsIcon icon={LockIcon} size={16} />
                    Lock
                  </Button>
                )}
                {run.status === 'locked' && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAction('unlock')}
                      loading={actionLoading}
                    >
                      <HugeiconsIcon icon={LockIcon} size={16} />
                      Unlock
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleAction('complete')}
                      loading={actionLoading}
                    >
                      <HugeiconsIcon icon={CheckmarkCircle01Icon} size={16} />
                      Complete
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Share link */}
        <div className="bg-background-elevated border border-border rounded-xl p-5">
          <Text size="sm" className="font-semibold mb-3">Share link</Text>
          <div className="flex items-center gap-2">
            <Input
              variant="rounded"
              readOnly
              value={`${typeof window !== 'undefined' ? window.location.origin : ''}/reserve/join/${run.share_token}`}
              className="text-[13px] text-muted-foreground"
              onClick={copyShareLink}
            />
            <Button variant="outline" onClick={copyShareLink} className="flex-shrink-0">
              <HugeiconsIcon icon={Copy01Icon} size={16} />
              Copy
            </Button>
          </div>
        </div>

        {/* Rules */}
        {(run.rules_note || run.hard_reserves.length > 0) && (
          <div className="bg-background-elevated border border-border rounded-xl p-5">
            <Text size="sm" className="font-semibold mb-3">Rules</Text>
            <div className="space-y-2 text-[13px] text-foreground-secondary">
              <div className="flex flex-wrap gap-x-6 gap-y-1">
                <span>{run.max_reserves} reserve{run.max_reserves !== 1 ? 's' : ''} per player</span>
                <span>{run.visibility === 'hidden_until_lock' ? 'Hidden until locked' : 'Visible immediately'}</span>
                {run.allow_duplicates && <span>Duplicate reserves allowed</span>}
              </div>
              {run.rules_note && <p className="text-muted-foreground">{run.rules_note}</p>}
              {run.hard_reserves.length > 0 && (
                <div className="mt-3">
                  <Text size="xs" color="muted" className="font-semibold uppercase tracking-wide mb-2">Hard reserves</Text>
                  <div className="flex flex-wrap gap-2">
                    {run.hard_reserves.map((hr) => {
                      const item = itemMap.get(hr.loot_item_id)
                      return item ? (
                        <span key={hr.loot_item_id} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-destructive/10 text-destructive text-[12px] font-medium rounded-full border border-destructive/20">
                          <ItemLink name={item.name} wowheadId={item.wowhead_id} clickable={false} size="small" />
                          {hr.reserved_for && <span className="text-muted-foreground">({hr.reserved_for})</span>}
                        </span>
                      ) : null
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Participants */}
        <div className="bg-background-elevated border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <Text size="sm" className="font-semibold">
              Participants ({run.submissions.length})
            </Text>
          </div>
          {run.submissions.length === 0 ? (
            <div className="p-5">
              <Text color="muted" size="sm">No one has signed up yet. Share the link to get started.</Text>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {run.submissions.map((sub) => (
                <div key={sub.id} className="px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
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
                            <ItemLink name={item.name} wowheadId={item.wowhead_id} clickable={false} size="small" />
                          </span>
                        ) : null
                      })
                    ) : (
                      <span className="text-[12px] text-muted-foreground italic">
                        {sub.items.length} item{sub.items.length !== 1 ? 's' : ''} reserved (hidden until locked)
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Contested items */}
        {contestedItems.length > 0 && (run.status !== 'open' || run.visibility === 'public_live') && (
          <div className="bg-background-elevated border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <Text size="sm" className="font-semibold">
                Contested items ({contestedItems.length})
              </Text>
            </div>
            <div className="divide-y divide-border">
              {contestedItems.map(({ item, reservers }) => (
                <div key={item.id} className="px-5 py-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <ItemLink name={item.name} wowheadId={item.wowhead_id} size="small" />
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
          </div>
        )}

        {/* Eligibility lookup */}
        {(run.status === 'locked' || run.status === 'completed') && (
          <div className="bg-background-elevated border border-border rounded-xl p-5">
            <Text size="sm" className="font-semibold mb-3">Item eligibility</Text>
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
                        <ItemLink name={item.name} wowheadId={item.wowhead_id} size="small" />
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
                            {isOfficer && (
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
                              onClick={() => isOfficer && !alreadyAwarded && handleAward(item.id, sub.character_name, sub.id)}
                              disabled={!isOfficer || alreadyAwarded || actionLoading}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-medium border transition-colors ${
                                alreadyAwarded
                                  ? 'bg-success/10 border-success/20 text-success cursor-default'
                                  : isOfficer
                                    ? 'bg-background-subtle border-border hover:bg-accent/10 hover:border-accent/30 hover:text-accent cursor-pointer'
                                    : 'bg-background-subtle border-border cursor-default'
                              }`}
                              title={isOfficer && !alreadyAwarded ? `Award to ${sub.character_name}` : undefined}
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
          </div>
        )}

        {/* Winner log */}
        {run.awards.length > 0 && (
          <div className="bg-background-elevated border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <Text size="sm" className="font-semibold">
                Winner log ({run.awards.length})
              </Text>
            </div>
            <div className="divide-y divide-border">
              {run.awards.map((award) => {
                const item = itemMap.get(award.loot_item_id)
                return (
                  <div key={award.id} className="px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {item && <ItemLink name={item.name} wowheadId={item.wowhead_id} clickable={false} size="small" />}
                      <span className="text-[13px] text-muted-foreground">\u2192</span>
                      <span className="text-[13px] font-medium text-foreground">{award.character_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(award.awarded_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </span>
                      {isOfficer && (
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
          </div>
        )}
      </div>
    </>
  )
}

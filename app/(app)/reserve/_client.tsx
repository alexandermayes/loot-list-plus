'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { useNotification } from '@/app/contexts/NotificationContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Heading, Text } from '@/components/ui/typography'
import { Skeleton } from '@/components/ui/skeletons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Add01Icon, Copy01Icon, Calendar03Icon, UserMultiple02Icon, ArrowRight02Icon } from '@hugeicons/core-free-icons'
import { trackClientEvent } from '@/utils/analytics/client'
import { getRaidIcon } from '@/utils/raidIcons'
import { CreateReserveRunModal } from './components/CreateReserveRunModal'

type ReserveRun = {
  id: string
  title: string
  status: 'open' | 'locked' | 'completed'
  raid_at: string
  lock_at: string
  locked_at: string | null
  max_reserves: number
  share_token: string
  created_at: string
  submission_count: number
  raid_tier_id: string
  raid_tier_name: string | null
  visibility: string
}

type StatusFilter = 'all' | 'open' | 'locked' | 'completed'

const STATUS_BADGE: Record<ReserveRun['status'], { label: string; className: string }> = {
  open: { label: 'Open', className: 'bg-success/10 text-success border-success/20' },
  locked: { label: 'Locked', className: 'bg-warning/10 text-warning border-warning/20' },
  completed: { label: 'Completed', className: 'bg-muted text-muted-foreground border-border' },
}

export default function ReservePage() {
  const router = useRouter()
  const { activeGuild } = useGuildContext()
  const { showNotification } = useNotification()
  const [runs, setRuns] = useState<ReserveRun[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [createOpen, setCreateOpen] = useState(false)

  const loadRuns = useCallback(async () => {
    if (!activeGuild) return
    try {
      const res = await fetch(`/api/reserve-runs?guild_id=${activeGuild.id}`)
      const data = await res.json()
      if (data.success) {
        setRuns(data.runs)
      }
    } catch (err) {
      console.error('Failed to load reserve runs:', err)
    } finally {
      setLoading(false)
    }
  }, [activeGuild])

  useEffect(() => {
    trackClientEvent('reserve_page_viewed')
    document.title = 'LootList+ \u2022 Reserve'
    loadRuns()
  }, [loadRuns])

  const copyShareLink = (token: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/reserve/join/${token}`)
    showNotification('success', 'Share link copied')
  }

  const filteredRuns = filter === 'all' ? runs : runs.filter(r => r.status === filter)

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <Heading level={1}>Reserve</Heading>
          <Text color="muted" size="sm">Fast soft reserves for raids</Text>
        </div>
        <Button
          variant="primary"
          onClick={() => setCreateOpen(true)}
        >
          <HugeiconsIcon icon={Add01Icon} size={16} />
          Create run
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {(['all', 'open', 'locked', 'completed'] as StatusFilter[]).map((s) => (
          <Button
            key={s}
            variant={filter === s ? 'accent-subtle' : 'outline'}
            size="sm"
            onClick={() => setFilter(s)}
            className="capitalize"
          >
            {s}
          </Button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} variant="unified">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-56" />
                  <Skeleton className="h-4 w-40" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && runs.length === 0 && (
        <EmptyState
          title="No reserve runs yet"
          description="Create your first reserve run to get started."
          size="lg"
          variant="card"
          action={{
            label: 'Create run',
            onClick: () => setCreateOpen(true),
            variant: 'primary',
          }}
        />
      )}

      {/* No results for filter */}
      {!loading && runs.length > 0 && filteredRuns.length === 0 && (
        <Text color="muted" className="text-center py-8">No {filter} runs found.</Text>
      )}

      {/* Run list */}
      {!loading && filteredRuns.length > 0 && (
        <div className="space-y-3">
          {filteredRuns.map((run) => {
            const badge = STATUS_BADGE[run.status]
            const raidIcon = run.raid_tier_name ? getRaidIcon(run.raid_tier_name) : null
            return (
              <Card
                key={run.id}
                variant="unified"
                onClick={() => router.push(`/reserve/runs/${run.id}`)}
                className="hover:border-accent/30 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  {raidIcon && (
                    <img
                      src={raidIcon}
                      alt=""
                      className="w-12 h-12 rounded-lg border border-border/50 flex-shrink-0 hidden sm:block"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1.5">
                      <Text size="md" className="font-semibold truncate">{run.title}</Text>
                      <Badge variant="outline" className={badge.className}>
                        {badge.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-[12px] text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <HugeiconsIcon icon={Calendar03Icon} size={14} />
                        {formatDate(run.raid_at)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <HugeiconsIcon icon={UserMultiple02Icon} size={14} />
                        {run.submission_count} signed up
                      </span>
                      <span>
                        {run.max_reserves} reserve{run.max_reserves !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        copyShareLink(run.share_token)
                      }}
                      title="Copy share link"
                    >
                      <HugeiconsIcon icon={Copy01Icon} size={16} />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        window.open(`/reserve/join/${run.share_token}`, '_blank', 'noopener,noreferrer')
                      }}
                    >
                      View reserve page
                      <HugeiconsIcon icon={ArrowRight02Icon} size={14} />
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <CreateReserveRunModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  )
}

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { useNotification } from '@/app/contexts/NotificationContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Heading, Text } from '@/components/ui/typography'
import { Skeleton } from '@/components/ui/skeletons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Add01Icon, Copy01Icon, Calendar03Icon, UserMultiple02Icon } from '@hugeicons/core-free-icons'
import { trackClientEvent } from '@/utils/analytics/client'

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
  visibility: string
}

type StatusFilter = 'all' | 'open' | 'locked' | 'completed'

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  open: { bg: 'bg-success/15', text: 'text-success' },
  locked: { bg: 'bg-warning/15', text: 'text-warning' },
  completed: { bg: 'bg-muted/30', text: 'text-muted-foreground' },
}

export default function ReservePage() {
  const router = useRouter()
  const { activeGuild, isOfficer } = useGuildContext()
  const { showNotification } = useNotification()
  const [runs, setRuns] = useState<ReserveRun[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<StatusFilter>('all')

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
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <Heading level={1}>Reserve</Heading>
          <Text color="muted" size="sm">Fast soft reserves for raids</Text>
        </div>
        <Button
          variant="primary"
          onClick={() => router.push('/reserve/create')}
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
            className="rounded-[40px] capitalize"
          >
            {s}
          </Button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-background-elevated border border-border rounded-xl p-5">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-56" />
                  <Skeleton className="h-4 w-40" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            </div>
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
            onClick: () => router.push('/reserve/create'),
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
            const statusStyle = STATUS_COLORS[run.status] || STATUS_COLORS.open
            return (
              <div
                key={run.id}
                onClick={() => router.push(`/reserve/runs/${run.id}`)}
                className="bg-background-elevated border border-border rounded-xl p-5 hover:border-accent/30 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1.5">
                      <span className="text-[15px] font-semibold text-foreground truncate">{run.title}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide ${statusStyle.bg} ${statusStyle.text}`}>
                        {run.status}
                      </span>
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
                      <span>{run.max_reserves} reserve{run.max_reserves !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      copyShareLink(run.share_token)
                    }}
                    className="flex-shrink-0"
                    title="Copy share link"
                  >
                    <HugeiconsIcon icon={Copy01Icon} size={16} />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

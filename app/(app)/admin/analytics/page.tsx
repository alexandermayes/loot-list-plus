'use client'

import { useState, useEffect, useMemo } from 'react'
import { Skeleton } from '@/components/ui/skeletons'
import { Heading, Text } from '@/components/ui/typography'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { trackClientEvent } from '@/utils/analytics/client'

interface GuildMetric {
  guild_id: string
  guild_name: string
  created_at: string
  is_active: boolean
  expansion_id: string | null
  members: { total: number; officers: number; raiders: number }
  submissions: { total: number; approved: number; pending: number; draft: number }
  raids: { total: number; last_30_days: number; attendance_records: number }
  loot: { items_distributed: number }
  activity: { audit_events_30d: number; last_raid_date: string | null }
  features_used: {
    attendance: boolean
    submissions: boolean
    loot_tracking: boolean
    audit_log: boolean
    customized_settings: boolean
  }
  settings: {
    attendance_type: string
    rolling_weeks: number
    new_member_mode: string
    raid_days_per_week: number
  } | null
}

interface WeekBucket {
  key: string
  label: string
  guilds_created: number
  raids_logged: number
  submissions_created: number
  loot_awarded: number
}

interface AnalyticsData {
  summary: {
    total_guilds: number
    active_guilds_30d: number
    total_members: number
    total_submissions: number
    total_raids: number
    total_loot_distributed: number
  }
  size_distribution: {
    solo: number
    small: number
    medium: number
    large: number
    extra_large: number
  }
  feature_adoption: {
    attendance: number
    submissions: number
    loot_tracking: number
    customized_settings: number
    total_guilds_with_activity: number
  } | null
  weekly_timeline: WeekBucket[]
  engagement_funnel: {
    total_guilds: number
    with_members: number
    with_raids: number
    with_submissions: number
    with_loot: number
    with_3plus_features: number
  }
  expansion_breakdown: { name: string; count: number }[]
  retention: {
    active: number
    churned: number
    new_guilds: number
    dormant: number
  }
  submission_pipeline: {
    total: number
    draft: number
    pending: number
    approved: number
    needs_revision: number
    rejected: number
  }
  settings_distribution: {
    attendance_type: Record<string, number>
    new_member_mode: Record<string, number>
    rolling_weeks: Record<string, number>
  }
  guilds: GuildMetric[]
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <Text size="sm" color="muted" className="mb-1">{label}</Text>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        {sub && <Text size="xs" color="secondary" className="mt-1">{sub}</Text>}
      </CardContent>
    </Card>
  )
}

function FeatureBar({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <Text size="sm" className="w-40 shrink-0">{label}</Text>
      <div className="flex-1 h-6 bg-background-subtle rounded-md overflow-hidden">
        <div
          className="h-full bg-accent/80 rounded-md transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <Text size="sm" color="secondary" className="w-20 text-right shrink-0">
        {count}/{total} ({pct}%)
      </Text>
    </div>
  )
}

function SizeBar({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <Text size="sm" className="w-32 shrink-0">{label}</Text>
      <div className="flex-1 h-5 bg-background-subtle rounded-md overflow-hidden">
        <div
          className="h-full bg-accent/60 rounded-md transition-all"
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
      <Text size="sm" color="secondary" className="w-16 text-right shrink-0">
        {count} ({pct}%)
      </Text>
    </div>
  )
}

function MiniBarChart({ data, dataKey, color, label }: { data: WeekBucket[]; dataKey: keyof WeekBucket; color: string; label: string }) {
  const values = data.map(d => d[dataKey] as number)
  const max = Math.max(...values, 1)
  const total = values.reduce((a, b) => a + b, 0)

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <Text size="sm" className="font-medium">{label}</Text>
        <Text size="xs" color="muted">{total} total</Text>
      </div>
      <div className="flex items-end gap-[3px] h-16">
        {data.map((d, i) => {
          const val = d[dataKey] as number
          const height = max > 0 ? Math.max((val / max) * 100, val > 0 ? 6 : 0) : 0
          return (
            <div key={i} className="flex-1 h-full flex items-end">
              <div className="w-full relative group flex items-end h-full">
                <div
                  className="w-full rounded-sm transition-all"
                  style={{ height: `${height}%`, minHeight: height > 0 ? '4px' : '0', backgroundColor: color }}
                />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-1.5 py-0.5 bg-background-elevated border border-border rounded text-[10px] text-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                  {val} &middot; {d.label}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex gap-[3px] mt-1">
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center">
            {i === 0 || i === data.length - 1 ? (
              <Text size="xs" color="muted" className="text-[9px]">{d.label}</Text>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}

function FunnelStep({ label, count, total, isFirst }: { label: string; count: number; total: number; isFirst?: boolean }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  const width = total > 0 ? Math.max((count / total) * 100, 8) : 8
  return (
    <div className="flex items-center gap-3">
      <Text size="sm" className="w-44 shrink-0">{label}</Text>
      <div className="flex-1 flex items-center gap-2">
        <div
          className="h-7 rounded-md transition-all flex items-center justify-end pr-2"
          style={{
            width: `${width}%`,
            backgroundColor: isFirst ? 'hsl(var(--accent))' : `hsl(var(--accent) / ${0.3 + (pct / 100) * 0.5})`,
          }}
        >
          <span className="text-[11px] font-medium text-accent-foreground">{count}</span>
        </div>
        {!isFirst && (
          <Text size="xs" color="muted">{pct}%</Text>
        )}
      </div>
    </div>
  )
}

function PipelineSegment({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 w-36 shrink-0">
        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <Text size="sm">{label}</Text>
      </div>
      <div className="flex-1 h-5 bg-background-subtle rounded-md overflow-hidden">
        <div
          className="h-full rounded-md transition-all"
          style={{ width: `${Math.max(pct, count > 0 ? 2 : 0)}%`, backgroundColor: color }}
        />
      </div>
      <Text size="sm" color="secondary" className="w-20 text-right shrink-0">
        {count} ({pct}%)
      </Text>
    </div>
  )
}

function DistributionRow({ label, entries }: { label: string; entries: Record<string, number> }) {
  const total = Object.values(entries).reduce((a, b) => a + b, 0)
  if (total === 0) return null
  const sorted = Object.entries(entries).sort((a, b) => b[1] - a[1])

  return (
    <div>
      <Text size="sm" className="font-medium mb-2">{label}</Text>
      <div className="flex h-6 rounded-md overflow-hidden">
        {sorted.map(([name, count], i) => {
          const pct = (count / total) * 100
          const colors = ['hsl(var(--accent))', 'hsl(var(--accent) / 0.6)', 'hsl(var(--accent) / 0.35)', 'hsl(var(--accent) / 0.2)']
          return (
            <div
              key={name}
              className="h-full relative group"
              style={{
                width: `${Math.max(pct, 3)}%`,
                backgroundColor: colors[i] || colors[colors.length - 1],
              }}
            >
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-1.5 py-0.5 bg-background-elevated border border-border rounded text-[10px] text-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                {name}: {count} ({Math.round(pct)}%)
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex flex-wrap gap-3 mt-1.5">
        {sorted.map(([name, count], i) => {
          const colors = ['hsl(var(--accent))', 'hsl(var(--accent) / 0.6)', 'hsl(var(--accent) / 0.35)', 'hsl(var(--accent) / 0.2)']
          return (
            <div key={name} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[i] || colors[colors.length - 1] }} />
              <Text size="xs" color="secondary">{name}: {count}</Text>
            </div>
          )
        })}
      </div>
    </div>
  )
}

type SortKey = 'guild' | 'members' | 'raids' | 'submissions' | 'loot' | 'last_raid' | 'features'
type SortDir = 'asc' | 'desc'

function SortHeader({ label, sortKey, currentSort, onSort, align }: {
  label: string
  sortKey: SortKey
  currentSort: { key: SortKey; dir: SortDir }
  onSort: (key: SortKey) => void
  align?: 'left' | 'right'
}) {
  const active = currentSort.key === sortKey
  return (
    <th
      className={`pb-3 pr-4 font-medium text-foreground-secondary cursor-pointer select-none hover:text-foreground transition-colors ${align === 'right' ? 'text-right' : 'text-left'}`}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <svg className={`w-3 h-3 shrink-0 ${active ? 'text-accent' : 'text-muted-foreground/40'}`} viewBox="0 0 12 16" fill="currentColor">
          <path d={active && currentSort.dir === 'asc'
            ? 'M6 2L1 8h10L6 2z'
            : active && currentSort.dir === 'desc'
            ? 'M6 14L1 8h10L6 14z'
            : 'M6 2L1 7h10L6 2zM6 14L1 9h10L6 14z'
          } />
        </svg>
      </span>
    </th>
  )
}

function getGuildSortValue(g: GuildMetric, key: SortKey): string | number {
  switch (key) {
    case 'guild': return g.guild_name.toLowerCase()
    case 'members': return g.members.total
    case 'raids': return g.raids.total
    case 'submissions': return g.submissions.total
    case 'loot': return g.loot.items_distributed
    case 'last_raid': return g.activity.last_raid_date || ''
    case 'features': return Object.values(g.features_used).filter(Boolean).length
  }
}

function daysAgo(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diff === 0) return 'today'
  if (diff === 1) return '1d ago'
  if (diff < 30) return `${diff}d ago`
  return `${Math.floor(diff / 30)}mo ago`
}

function featureCount(g: GuildMetric): number {
  return Object.values(g.features_used).filter(Boolean).length
}

function LoadingSkeleton() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-5 w-72 mt-1" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-background-elevated border border-border rounded-xl p-4">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-7 w-10 mt-1" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-background-elevated border border-border rounded-xl p-6 space-y-3">
            <Skeleton className="h-6 w-44" />
            <Skeleton className="h-16 w-full rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}

type Tab = 'guilds' | 'blog' | 'funnel' | 'traffic' | 'revenue'

// ─── PostHog-backed section components ──────────────────────

function BlogSection() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/analytics?section=blog')
      .then(r => r.json()).then(setData)
      .catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="py-12 text-center"><Text color="muted">Loading blog data...</Text></div>
  if (!data) return <div className="py-12 text-center"><Text color="muted">No blog data available</Text></div>

  return (
    <div className="space-y-6">
      {/* Top posts */}
      <Card>
        <CardHeader><CardTitle>Top posts (30 days)</CardTitle></CardHeader>
        <CardContent>
          {data.top_posts.length === 0 ? (
            <Text color="muted" size="sm">No blog views yet. Data will appear once the PostHog fix deploys.</Text>
          ) : (
            <div className="space-y-2">
              {data.top_posts.map((p: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-1.5">
                  <Text size="sm" className="truncate flex-1 mr-4">{p.path.replace('/blog/', '')}</Text>
                  <div className="flex items-center gap-4 shrink-0">
                    <Text size="sm" color="secondary" className="tabular-nums">{p.views} views</Text>
                    <Text size="sm" color="muted" className="tabular-nums w-20 text-right">{p.uniques} uniq</Text>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Weekly trend */}
      {data.weekly_trend.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Weekly blog traffic</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-end gap-[3px] h-20">
              {data.weekly_trend.map((w: any, i: number) => {
                const max = Math.max(...data.weekly_trend.map((w: any) => w.views), 1)
                const height = Math.max((w.views / max) * 100, w.views > 0 ? 6 : 0)
                return (
                  <div key={i} className="flex-1 h-full flex items-end group relative">
                    <div className="w-full rounded-sm bg-accent/80" style={{ height: `${height}%`, minHeight: height > 0 ? '4px' : '0' }} />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-1.5 py-0.5 bg-background-elevated border border-border rounded text-[10px] text-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                      {w.views} views &middot; {w.week}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Referrers */}
      {data.referrers.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Referrer sources</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {data.referrers.map((r: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-1">
                  <Text size="sm" className="truncate flex-1 mr-4">{r.referrer === '$direct' ? 'Direct / Bookmark' : r.referrer}</Text>
                  <Text size="sm" color="secondary" className="tabular-nums shrink-0">{r.views}</Text>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Engagement */}
      {data.engagement.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Engagement (scroll + time)</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.engagement.map((e: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-1">
                  <Text size="sm" className="truncate flex-1 mr-4">{e.slug}</Text>
                  <div className="flex items-center gap-4 shrink-0">
                    <Text size="sm" color="secondary" className="tabular-nums">{e.avg_seconds}s avg</Text>
                    <Text size="sm" color="muted" className="tabular-nums">{e.completed}/{e.total} completed</Text>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function FunnelSection() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/analytics?section=funnel')
      .then(r => r.json()).then(setData)
      .catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="py-12 text-center"><Text color="muted">Loading funnel data...</Text></div>
  if (!data) return null

  const steps = data.steps || []
  const topCount = steps[0]?.count || 1

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Signup funnel (30 days)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {steps.map((step: any, i: number) => {
            const pct = topCount > 0 ? Math.round((step.count / topCount) * 100) : 0
            const width = topCount > 0 ? Math.max((step.count / topCount) * 100, 8) : 8
            return (
              <div key={i}>
                <div className="flex items-baseline justify-between mb-1">
                  <Text size="sm">{step.name}</Text>
                  <Text size="sm" color="secondary" className="tabular-nums">{step.count} {i > 0 ? `(${pct}%)` : ''}</Text>
                </div>
                <div className="h-5 bg-background-subtle rounded-md overflow-hidden">
                  <div className="h-full bg-accent/80 rounded-md" style={{ width: `${width}%` }} />
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {data.weekly_signups?.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Weekly signups</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-end gap-[3px] h-20">
              {data.weekly_signups.map((w: any, i: number) => {
                const max = Math.max(...data.weekly_signups.map((w: any) => w.signups), 1)
                const height = Math.max((w.signups / max) * 100, w.signups > 0 ? 6 : 0)
                return (
                  <div key={i} className="flex-1 h-full flex items-end group relative">
                    <div className="w-full rounded-sm bg-success/80" style={{ height: `${height}%`, minHeight: height > 0 ? '4px' : '0' }} />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-1.5 py-0.5 bg-background-elevated border border-border rounded text-[10px] text-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                      {w.signups} &middot; {w.week}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function TrafficSection() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/analytics?section=traffic')
      .then(r => r.json()).then(setData)
      .catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="py-12 text-center"><Text color="muted">Loading traffic data...</Text></div>
  if (!data) return null

  return (
    <div className="space-y-6">
      {/* By domain */}
      <Card>
        <CardHeader><CardTitle>Traffic by domain (30 days)</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {(data.by_domain || []).map((d: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-1.5">
                <Text size="sm" className="font-medium">{d.host}</Text>
                <div className="flex items-center gap-4 shrink-0">
                  <Text size="sm" color="secondary" className="tabular-nums">{d.views.toLocaleString()} views</Text>
                  <Text size="sm" color="muted" className="tabular-nums w-24 text-right">{d.uniques.toLocaleString()} uniq</Text>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top pages */}
      <Card>
        <CardHeader><CardTitle>Top pages</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            {(data.top_pages || []).map((p: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-1">
                <Text size="sm" className="truncate flex-1 mr-4">{p.path}</Text>
                <div className="flex items-center gap-4 shrink-0">
                  <Text size="sm" color="secondary" className="tabular-nums">{p.views}</Text>
                  <Text size="sm" color="muted" className="tabular-nums w-16 text-right">{p.uniques} uniq</Text>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Weekly trend */}
      {(data.weekly_trend || []).length > 0 && (
        <Card>
          <CardHeader><CardTitle>Weekly traffic</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-end gap-[3px] h-20">
              {data.weekly_trend.map((w: any, i: number) => {
                const max = Math.max(...data.weekly_trend.map((w: any) => w.views), 1)
                const height = Math.max((w.views / max) * 100, w.views > 0 ? 6 : 0)
                return (
                  <div key={i} className="flex-1 h-full flex items-end group relative">
                    <div className="w-full rounded-sm bg-accent/80" style={{ height: `${height}%`, minHeight: height > 0 ? '4px' : '0' }} />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-1.5 py-0.5 bg-background-elevated border border-border rounded text-[10px] text-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                      {w.views.toLocaleString()} &middot; {w.uniques} uniq &middot; {w.week}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function RevenueSection() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/analytics?section=revenue')
      .then(r => r.json()).then(setData)
      .catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="py-12 text-center"><Text color="muted">Loading revenue data...</Text></div>
  if (!data) return null

  const tiers = data.tiers || {}

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Active guilds" value={data.total_active} />
        <StatCard label="Pro guilds" value={data.pro_count} />
        <StatCard label="Pro rate" value={`${data.pro_rate}%`} />
        <StatCard label="Upgrade clicks (30d)" value={data.upgrade_clicks_30d} />
      </div>

      <Card>
        <CardHeader><CardTitle>Subscription tiers</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(tiers).map(([tier, count]) => {
              const pct = data.total_active > 0 ? Math.round(((count as number) / data.total_active) * 100) : 0
              return (
                <div key={tier} className="flex items-center gap-3">
                  <Text size="sm" className="w-20 shrink-0 capitalize font-medium">{tier}</Text>
                  <div className="flex-1 h-5 bg-background-subtle rounded-md overflow-hidden">
                    <div
                      className="h-full rounded-md bg-accent/80"
                      style={{ width: `${Math.max(pct, (count as number) > 0 ? 4 : 0)}%` }}
                    />
                  </div>
                  <Text size="sm" color="secondary" className="w-24 text-right shrink-0 tabular-nums">
                    {count as number} ({pct}%)
                  </Text>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Main page ──────────────────────────────────────────────

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'raids', dir: 'desc' })
  const [activeTab, setActiveTab] = useState<Tab>('guilds')

  useEffect(() => {
    trackClientEvent('admin_analytics_page_viewed')
  }, [])

  useEffect(() => {
    fetch('/api/admin/analytics?section=guilds')
      .then(async res => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || `HTTP ${res.status}`)
        }
        return res.json()
      })
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const handleSort = (key: SortKey) => {
    setSort(prev => prev.key === key ? { key, dir: prev.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: 'desc' })
  }

  const sortedGuilds = useMemo(() => {
    if (!data) return []
    return [...data.guilds].sort((a, b) => {
      const aVal = getGuildSortValue(a, sort.key)
      const bVal = getGuildSortValue(b, sort.key)
      const cmp = typeof aVal === 'number' && typeof bVal === 'number'
        ? aVal - bVal
        : String(aVal).localeCompare(String(bVal))
      return sort.dir === 'asc' ? cmp : -cmp
    })
  }, [data, sort])

  if (loading) return <LoadingSkeleton />

  if (error) {
    return (
      <div className="p-8">
        <Text color="muted">Failed to load analytics: {error}</Text>
      </div>
    )
  }

  if (!data) return null

  const { summary, size_distribution, feature_adoption, weekly_timeline, engagement_funnel, expansion_breakdown, retention, submission_pipeline, settings_distribution } = data

  const retentionTotal = retention.active + retention.churned + retention.dormant

  const tabs: { key: Tab; label: string }[] = [
    { key: 'guilds', label: 'Guilds' },
    { key: 'blog', label: 'Blog' },
    { key: 'funnel', label: 'Funnel' },
    { key: 'traffic', label: 'Traffic' },
    { key: 'revenue', label: 'Revenue' },
  ]

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <Heading level={1}>Platform analytics</Heading>
        <Text color="secondary">Usage metrics across all guilds</Text>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? 'text-accent border-accent'
                : 'text-muted-foreground border-transparent hover:text-foreground hover:border-border'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'blog' && <BlogSection />}
      {activeTab === 'funnel' && <FunnelSection />}
      {activeTab === 'traffic' && <TrafficSection />}
      {activeTab === 'revenue' && <RevenueSection />}

      {activeTab === 'guilds' && <>
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Guilds" value={summary.total_guilds} sub={`${retention.new_guilds} new (30d)`} />
        <StatCard label="Active (30d)" value={summary.active_guilds_30d} sub={`${retentionTotal > 0 ? Math.round((retention.active / retentionTotal) * 100) : 0}% of all`} />
        <StatCard label="Members" value={summary.total_members} sub={`~${summary.total_guilds > 0 ? Math.round(summary.total_members / summary.total_guilds) : 0} avg/guild`} />
        <StatCard label="Submissions" value={summary.total_submissions} sub={`${submission_pipeline.approved} approved`} />
        <StatCard label="Raids logged" value={summary.total_raids} />
        <StatCard label="Loot distributed" value={summary.total_loot_distributed} />
      </div>

      {/* Activity timeline */}
      {weekly_timeline.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Weekly activity (12 weeks)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MiniBarChart data={weekly_timeline} dataKey="guilds_created" color="hsl(var(--accent))" label="Guild signups" />
              <MiniBarChart data={weekly_timeline} dataKey="raids_logged" color="hsl(142 71% 45%)" label="Raids logged" />
              <MiniBarChart data={weekly_timeline} dataKey="submissions_created" color="hsl(217 91% 60%)" label="Submissions" />
              <MiniBarChart data={weekly_timeline} dataKey="loot_awarded" color="hsl(280 68% 60%)" label="Loot awarded" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Engagement funnel + Retention side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Engagement funnel</CardTitle>
            <Text size="sm" color="secondary">How far guilds progress through the product</Text>
          </CardHeader>
          <CardContent className="space-y-2">
            <FunnelStep label="Created guild" count={engagement_funnel.total_guilds} total={engagement_funnel.total_guilds} isFirst />
            <FunnelStep label="Added members (2+)" count={engagement_funnel.with_members} total={engagement_funnel.total_guilds} />
            <FunnelStep label="Logged raids" count={engagement_funnel.with_raids} total={engagement_funnel.total_guilds} />
            <FunnelStep label="Used submissions" count={engagement_funnel.with_submissions} total={engagement_funnel.total_guilds} />
            <FunnelStep label="Distributed loot" count={engagement_funnel.with_loot} total={engagement_funnel.total_guilds} />
            <FunnelStep label="3+ features used" count={engagement_funnel.with_3plus_features} total={engagement_funnel.total_guilds} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Guild health</CardTitle>
            <Text size="sm" color="secondary">Based on 30-day raid activity</Text>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                <Text size="xs" color="muted" className="mb-1">Active</Text>
                <p className="text-xl font-bold text-success">{retention.active}</p>
                <Text size="xs" color="secondary">Raided in last 30d</Text>
              </div>
              <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
                <Text size="xs" color="muted" className="mb-1">Churned</Text>
                <p className="text-xl font-bold text-warning">{retention.churned}</p>
                <Text size="xs" color="secondary">Had raids, now inactive</Text>
              </div>
              <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
                <Text size="xs" color="muted" className="mb-1">New (30d)</Text>
                <p className="text-xl font-bold text-accent">{retention.new_guilds}</p>
                <Text size="xs" color="secondary">Created recently</Text>
              </div>
              <div className="p-4 rounded-lg bg-muted/30 border border-border">
                <Text size="xs" color="muted" className="mb-1">Dormant</Text>
                <p className="text-xl font-bold text-muted-foreground">{retention.dormant}</p>
                <Text size="xs" color="secondary">Solo, never raided</Text>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Submission pipeline + Expansion breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Submission pipeline</CardTitle>
            <Text size="sm" color="secondary">{submission_pipeline.total} total submissions</Text>
          </CardHeader>
          <CardContent className="space-y-2">
            <PipelineSegment label="Draft" count={submission_pipeline.draft} total={submission_pipeline.total} color="hsl(var(--muted-foreground))" />
            <PipelineSegment label="Pending" count={submission_pipeline.pending} total={submission_pipeline.total} color="hsl(45 93% 47%)" />
            <PipelineSegment label="Approved" count={submission_pipeline.approved} total={submission_pipeline.total} color="hsl(142 71% 45%)" />
            <PipelineSegment label="Needs revision" count={submission_pipeline.needs_revision} total={submission_pipeline.total} color="hsl(25 95% 53%)" />
            <PipelineSegment label="Rejected" count={submission_pipeline.rejected} total={submission_pipeline.total} color="hsl(0 84% 60%)" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expansion breakdown</CardTitle>
            <Text size="sm" color="secondary">Active expansion per guild</Text>
          </CardHeader>
          <CardContent className="space-y-2">
            {expansion_breakdown.map(exp => (
              <div key={exp.name} className="flex items-center gap-3">
                <Text size="sm" className="w-44 shrink-0">{exp.name}</Text>
                <div className="flex-1 h-5 bg-background-subtle rounded-md overflow-hidden">
                  <div
                    className="h-full bg-accent/60 rounded-md transition-all"
                    style={{ width: `${Math.max((exp.count / summary.total_guilds) * 100, 3)}%` }}
                  />
                </div>
                <Text size="sm" color="secondary" className="w-16 text-right shrink-0">
                  {exp.count} ({Math.round((exp.count / summary.total_guilds) * 100)}%)
                </Text>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Size distribution + Feature adoption */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Guild size distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <SizeBar label="Solo (1)" count={size_distribution.solo} total={summary.total_guilds} />
            <SizeBar label="Small (2-10)" count={size_distribution.small} total={summary.total_guilds} />
            <SizeBar label="Medium (11-25)" count={size_distribution.medium} total={summary.total_guilds} />
            <SizeBar label="Large (26-40)" count={size_distribution.large} total={summary.total_guilds} />
            <SizeBar label="XL (40+)" count={size_distribution.extra_large} total={summary.total_guilds} />
          </CardContent>
        </Card>

        {feature_adoption && (
          <Card>
            <CardHeader>
              <CardTitle>Feature adoption</CardTitle>
              <Text size="sm" color="secondary">
                Across {feature_adoption.total_guilds_with_activity} guilds with 2+ members
              </Text>
            </CardHeader>
            <CardContent className="space-y-3">
              <FeatureBar label="Attendance tracking" count={feature_adoption.attendance} total={feature_adoption.total_guilds_with_activity} />
              <FeatureBar label="Loot submissions" count={feature_adoption.submissions} total={feature_adoption.total_guilds_with_activity} />
              <FeatureBar label="Loot distribution" count={feature_adoption.loot_tracking} total={feature_adoption.total_guilds_with_activity} />
              <FeatureBar label="Custom settings" count={feature_adoption.customized_settings} total={feature_adoption.total_guilds_with_activity} />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Settings distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Settings distribution</CardTitle>
          <Text size="sm" color="secondary">How guilds configure their scoring</Text>
        </CardHeader>
        <CardContent className="space-y-5">
          <DistributionRow label="Attendance type" entries={settings_distribution.attendance_type} />
          <DistributionRow label="New member mode" entries={settings_distribution.new_member_mode} />
          <DistributionRow label="Rolling weeks" entries={settings_distribution.rolling_weeks} />
        </CardContent>
      </Card>

      {/* Per-guild table */}
      <Card>
        <CardHeader>
          <CardTitle>Guild breakdown</CardTitle>
          <Text size="sm" color="secondary">Click column headers to sort</Text>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <SortHeader label="Guild" sortKey="guild" currentSort={sort} onSort={handleSort} />
                <SortHeader label="Members" sortKey="members" currentSort={sort} onSort={handleSort} align="right" />
                <SortHeader label="Raids" sortKey="raids" currentSort={sort} onSort={handleSort} align="right" />
                <SortHeader label="Submissions" sortKey="submissions" currentSort={sort} onSort={handleSort} align="right" />
                <SortHeader label="Loot" sortKey="loot" currentSort={sort} onSort={handleSort} align="right" />
                <SortHeader label="Last raid" sortKey="last_raid" currentSort={sort} onSort={handleSort} />
                <SortHeader label="Features" sortKey="features" currentSort={sort} onSort={handleSort} />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {sortedGuilds.map(g => (
                <tr key={g.guild_id} className="hover:bg-background-subtle/50">
                  <td className="py-3 pr-4">
                    <Text size="sm" className="font-medium">{g.guild_name}</Text>
                    <Text size="xs" color="muted">{daysAgo(g.created_at)}</Text>
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <Text size="sm">{g.members.total}</Text>
                    <Text size="xs" color="muted">{g.members.officers}o / {g.members.raiders}r</Text>
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <Text size="sm">{g.raids.total}</Text>
                    <Text size="xs" color="muted">{g.raids.last_30_days} last 30d</Text>
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <Text size="sm">{g.submissions.total}</Text>
                    <Text size="xs" color="muted">
                      {g.submissions.approved}a / {g.submissions.pending}p / {g.submissions.draft}d
                    </Text>
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <Text size="sm">{g.loot.items_distributed}</Text>
                  </td>
                  <td className="py-3 pr-4">
                    <Text size="sm" color={g.activity.last_raid_date ? 'default' : 'muted'}>
                      {g.activity.last_raid_date || 'never'}
                    </Text>
                  </td>
                  <td className="py-3">
                    <div className="flex gap-1 flex-wrap">
                      {g.features_used.attendance && <Badge variant="secondary" className="text-[10px]">ATT</Badge>}
                      {g.features_used.submissions && <Badge variant="secondary" className="text-[10px]">SUB</Badge>}
                      {g.features_used.loot_tracking && <Badge variant="secondary" className="text-[10px]">LOOT</Badge>}
                      {g.features_used.customized_settings && <Badge variant="secondary" className="text-[10px]">CFG</Badge>}
                      {featureCount(g) === 0 && <Text size="xs" color="muted">none</Text>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      </>}
    </div>
  )
}

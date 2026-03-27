'use client'

import { useState, useEffect } from 'react'
import { Skeleton } from '@/components/ui/skeletons'
import { Heading, Text } from '@/components/ui/typography'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

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

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/analytics')
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

  if (loading) {
    return (
      <div className="p-8 max-w-6xl mx-auto space-y-8">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-5 w-72 mt-1" />
        </div>
        {/* Summary cards skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-background-elevated border border-border rounded-xl p-4">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-7 w-10 mt-1" />
            </div>
          ))}
        </div>
        {/* Size distribution skeleton */}
        <div className="bg-background-elevated border border-border rounded-xl p-6 space-y-3">
          <Skeleton className="h-6 w-44" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded" />
          ))}
        </div>
        {/* Feature adoption skeleton */}
        <div className="bg-background-elevated border border-border rounded-xl p-6 space-y-3">
          <Skeleton className="h-6 w-40" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <Text color="muted">Failed to load analytics: {error}</Text>
      </div>
    )
  }

  if (!data) return null

  const { summary, size_distribution, feature_adoption, guilds } = data

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <Heading level={1}>Platform analytics</Heading>
        <Text color="secondary">Usage metrics for monetization planning</Text>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Guilds" value={summary.total_guilds} />
        <StatCard label="Active (30d)" value={summary.active_guilds_30d} />
        <StatCard label="Members" value={summary.total_members} />
        <StatCard label="Submissions" value={summary.total_submissions} />
        <StatCard label="Raids logged" value={summary.total_raids} />
        <StatCard label="Loot distributed" value={summary.total_loot_distributed} />
      </div>

      {/* Size distribution */}
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

      {/* Feature adoption */}
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

      {/* Per-guild table */}
      <Card>
        <CardHeader>
          <CardTitle>Guild breakdown</CardTitle>
          <Text size="sm" color="secondary">Sorted by total raids logged</Text>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="pb-3 pr-4 font-medium text-foreground-secondary">Guild</th>
                <th className="pb-3 pr-4 font-medium text-foreground-secondary text-right">Members</th>
                <th className="pb-3 pr-4 font-medium text-foreground-secondary text-right">Raids</th>
                <th className="pb-3 pr-4 font-medium text-foreground-secondary text-right">Submissions</th>
                <th className="pb-3 pr-4 font-medium text-foreground-secondary text-right">Loot</th>
                <th className="pb-3 pr-4 font-medium text-foreground-secondary">Last raid</th>
                <th className="pb-3 font-medium text-foreground-secondary">Features</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {guilds.map(g => (
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
    </div>
  )
}

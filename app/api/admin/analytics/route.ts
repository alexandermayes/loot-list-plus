import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'

// ─── PostHog HogQL query helper ─────────────────────────────

async function queryPostHog(hogql: string): Promise<any[]> {
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY
  if (!apiKey) return []
  try {
    const res = await fetch('https://us.posthog.com/api/projects/310668/query/', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: { kind: 'HogQLQuery', query: hogql } }),
    })
    if (!res.ok) return []
    const data = await res.json()
    return data.results || []
  } catch {
    return []
  }
}

// ─── Section handlers ───────────────────────────────────────

async function getBlogAnalytics() {
  const [topPosts, weeklyTrend, referrers, engagement] = await Promise.all([
    queryPostHog(`SELECT properties.$pathname as path, count() as views, count(DISTINCT properties.distinct_id) as uniques FROM events WHERE event = '$pageview' AND properties.$pathname LIKE '/blog/%' AND properties.$pathname != '/blog/' AND timestamp > now() - INTERVAL 30 DAY GROUP BY path ORDER BY views DESC LIMIT 20`),
    queryPostHog(`SELECT toMonday(timestamp) as week, count() as views, count(DISTINCT properties.distinct_id) as uniques FROM events WHERE event = '$pageview' AND properties.$pathname LIKE '/blog/%' AND timestamp > now() - INTERVAL 12 WEEK GROUP BY week ORDER BY week ASC`),
    queryPostHog(`SELECT properties.$referrer as referrer, count() as views FROM events WHERE event = '$pageview' AND properties.$pathname LIKE '/blog/%' AND properties.$pathname != '/blog/' AND timestamp > now() - INTERVAL 30 DAY AND properties.$referrer IS NOT NULL AND properties.$referrer != '' GROUP BY referrer ORDER BY views DESC LIMIT 15`),
    queryPostHog(`SELECT properties.slug as slug, avg(properties.seconds) as avg_seconds, countIf(properties.depth = 100) as completed, count() as total FROM events WHERE event IN ('blog_time_on_page', 'blog_scroll_depth') AND timestamp > now() - INTERVAL 30 DAY GROUP BY slug ORDER BY total DESC`),
  ])

  return {
    top_posts: topPosts.map(r => ({ path: r[0], views: r[1], uniques: r[2] })),
    weekly_trend: weeklyTrend.map(r => ({ week: r[0], views: r[1], uniques: r[2] })),
    referrers: referrers.map(r => ({ referrer: r[0], views: r[1] })),
    engagement: engagement.map(r => ({ slug: r[0], avg_seconds: Math.round(r[1] || 0), completed: r[2], total: r[3] })),
  }
}

async function getFunnelAnalytics() {
  const [landingVisitors, signups, guildsCreated, firstRaid, weeklySignups] = await Promise.all([
    queryPostHog(`SELECT count(DISTINCT properties.distinct_id) as c FROM events WHERE event = '$pageview' AND properties.$host LIKE '%getlootlist%' AND timestamp > now() - INTERVAL 30 DAY`),
    queryPostHog(`SELECT count(DISTINCT properties.distinct_id) as c FROM events WHERE event = 'user_signed_up' AND timestamp > now() - INTERVAL 30 DAY`),
    queryPostHog(`SELECT count(DISTINCT properties.distinct_id) as c FROM events WHERE event = 'guild_creation_completed' AND timestamp > now() - INTERVAL 30 DAY`),
    queryPostHog(`SELECT count(DISTINCT properties.distinct_id) as c FROM events WHERE event = 'attendance_bulk_recorded' AND timestamp > now() - INTERVAL 30 DAY`),
    queryPostHog(`SELECT toMonday(timestamp) as week, count(DISTINCT properties.distinct_id) as signups FROM events WHERE event = 'user_signed_up' AND timestamp > now() - INTERVAL 12 WEEK GROUP BY week ORDER BY week ASC`),
  ])

  return {
    steps: [
      { name: 'Landing visitors', count: landingVisitors[0]?.[0] || 0 },
      { name: 'Signed up', count: signups[0]?.[0] || 0 },
      { name: 'Created guild', count: guildsCreated[0]?.[0] || 0 },
      { name: 'First raid tracked', count: firstRaid[0]?.[0] || 0 },
    ],
    weekly_signups: weeklySignups.map(r => ({ week: r[0], signups: r[1] })),
  }
}

async function getTrafficAnalytics() {
  const [byDomain, topPages, weeklyTrend] = await Promise.all([
    queryPostHog(`SELECT properties.$host as host, count() as views, count(DISTINCT properties.distinct_id) as uniques FROM events WHERE event = '$pageview' AND timestamp > now() - INTERVAL 30 DAY AND properties.$host NOT LIKE 'localhost%' GROUP BY host ORDER BY views DESC LIMIT 10`),
    queryPostHog(`SELECT properties.$pathname as path, count() as views, count(DISTINCT properties.distinct_id) as uniques FROM events WHERE event = '$pageview' AND timestamp > now() - INTERVAL 30 DAY AND properties.$host NOT LIKE 'localhost%' GROUP BY path ORDER BY views DESC LIMIT 25`),
    queryPostHog(`SELECT toMonday(timestamp) as week, count() as views, count(DISTINCT properties.distinct_id) as uniques FROM events WHERE event = '$pageview' AND properties.$host NOT LIKE 'localhost%' AND timestamp > now() - INTERVAL 12 WEEK GROUP BY week ORDER BY week ASC`),
  ])

  return {
    by_domain: byDomain.map(r => ({ host: r[0], views: r[1], uniques: r[2] })),
    top_pages: topPages.map(r => ({ path: r[0], views: r[1], uniques: r[2] })),
    weekly_trend: weeklyTrend.map(r => ({ week: r[0], views: r[1], uniques: r[2] })),
  }
}

async function getRevenueAnalytics() {
  const supabase = createServiceRoleClient()

  const [guildsResult, upgradeClicks] = await Promise.all([
    supabase.from('guilds').select('subscription_tier, is_active, created_at'),
    queryPostHog(`SELECT count() as clicks FROM events WHERE event = 'pro_upgrade_clicked' AND timestamp > now() - INTERVAL 30 DAY`),
  ])

  const guilds = guildsResult.data || []
  const activeGuilds = guilds.filter(g => g.is_active)
  const tiers: Record<string, number> = {}
  for (const g of activeGuilds) {
    const tier = g.subscription_tier || 'free'
    tiers[tier] = (tiers[tier] || 0) + 1
  }

  const proCount = tiers['pro'] || 0
  const totalActive = activeGuilds.length

  return {
    tiers,
    total_active: totalActive,
    pro_count: proCount,
    pro_rate: totalActive > 0 ? Math.round((proCount / totalActive) * 100) : 0,
    upgrade_clicks_30d: upgradeClicks[0]?.[0] || 0,
  }
}

/**
 * GET /api/admin/analytics
 *
 * Super-admin endpoint. Supports section param:
 * - ?section=guilds (default) — existing guild-level metrics
 * - ?section=blog — blog performance from PostHog
 * - ?section=funnel — signup funnel from PostHog
 * - ?section=traffic — site traffic from PostHog
 * - ?section=revenue — subscription metrics from Supabase + PostHog
 */
export async function GET(request: NextRequest) {
  try {
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isDevelopment = process.env.NODE_ENV === 'development'
    const superAdminIds = process.env.SUPER_ADMIN_IDS?.split(',').filter(Boolean) || []
    const isSuperAdmin = superAdminIds.includes(user.id)

    if (!isDevelopment && !isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const section = searchParams.get('section') || 'guilds'

    // Route to section-specific handlers
    if (section === 'blog') return NextResponse.json(await getBlogAnalytics())
    if (section === 'funnel') return NextResponse.json(await getFunnelAnalytics())
    if (section === 'traffic') return NextResponse.json(await getTrafficAnalytics())
    if (section === 'revenue') return NextResponse.json(await getRevenueAnalytics())

    // Default: guilds section (existing code)
    const supabase = createServiceRoleClient()

    // Run all queries in parallel
    const [
      guildsResult,
      membershipsResult,
      submissionsResult,
      raidEventsResult,
      attendanceResult,
      lootHistoryResult,
      auditLogsResult,
      settingsResult,
    ] = await Promise.all([
      // All guilds with creation date and expansion name
      supabase
        .from('guilds')
        .select('id, name, created_at, is_active, active_expansion_id, expansions!active_expansion_id(name)'),

      // All active memberships grouped by guild
      supabase
        .from('character_guild_memberships')
        .select('guild_id, character_id, role, is_active, joined_at')
        .eq('is_active', true),

      // All submissions with status
      supabase
        .from('loot_submissions')
        .select('id, guild_id, status, created_at, submitted_at, reviewed_at'),

      // All raid events
      supabase
        .from('raid_events')
        .select('id, guild_id, raid_date, is_skipped'),

      // Attendance record counts per guild
      supabase
        .from('attendance_records')
        .select('raid_event_id, character_id, attended, status'),

      // Loot history
      supabase
        .from('loot_history')
        .select('id, guild_id, awarded_date'),

      // Audit log counts (feature engagement proxy)
      supabase
        .from('audit_logs')
        .select('guild_id, table_name, action, created_at'),

      // Guild settings (which features are configured)
      supabase
        .from('guild_settings')
        .select('guild_id, rolling_attendance_weeks, max_attendance_bonus, attendance_type, raid_days_per_week, new_member_mode'),
    ])

    const guilds = guildsResult.data || []
    const memberships = membershipsResult.data || []
    const submissions = submissionsResult.data || []
    const raidEvents = raidEventsResult.data || []
    const attendance = attendanceResult.data || []
    const lootHistory = lootHistoryResult.data || []
    const auditLogs = auditLogsResult.data || []
    const settings = settingsResult.data || []

    // Build per-guild metrics
    const guildMetrics = guilds.map(guild => {
      const guildMembers = memberships.filter(m => m.guild_id === guild.id)
      const guildSubmissions = submissions.filter(s => s.guild_id === guild.id)
      const guildRaids = raidEvents.filter(r => r.guild_id === guild.id && !r.is_skipped)
      const guildLoot = lootHistory.filter(l => l.guild_id === guild.id)
      const guildAudit = auditLogs.filter(a => a.guild_id === guild.id)
      const guildSettings = settings.find(s => s.guild_id === guild.id)

      // Raid event IDs for this guild
      const guildRaidIds = new Set(guildRaids.map(r => r.id))
      const guildAttendance = attendance.filter(a => guildRaidIds.has(a.raid_event_id))

      // Unique users (officers vs raiders)
      const officers = guildMembers.filter(m => m.role === 'Officer' || m.role === 'Guild Master')
      const raiders = guildMembers.filter(m => m.role === 'Raider' || m.role === 'Trial')

      // Submission engagement
      const approvedSubmissions = guildSubmissions.filter(s => s.status === 'approved')
      const pendingSubmissions = guildSubmissions.filter(s => s.status === 'pending')
      const draftSubmissions = guildSubmissions.filter(s => s.status === 'draft')

      // Recent activity (last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const recentRaids = guildRaids.filter(r => new Date(r.raid_date) >= thirtyDaysAgo)
      const recentAudit = guildAudit.filter(a => new Date(a.created_at) >= thirtyDaysAgo)

      // Feature usage signals
      const usesAttendance = guildAttendance.length > 0
      const usesSubmissions = guildSubmissions.length > 0
      const usesLootTracking = guildLoot.length > 0
      const usesAuditLog = guildAudit.length > 0
      const customizedSettings = guildSettings && (
        guildSettings.rolling_attendance_weeks !== 4 ||
        guildSettings.attendance_type !== 'rolling' ||
        guildSettings.new_member_mode !== 'raw'
      )

      return {
        guild_id: guild.id,
        guild_name: guild.name,
        created_at: guild.created_at,
        is_active: guild.is_active,
        expansion_id: guild.active_expansion_id,
        members: {
          total: guildMembers.length,
          officers: officers.length,
          raiders: raiders.length,
        },
        submissions: {
          total: guildSubmissions.length,
          approved: approvedSubmissions.length,
          pending: pendingSubmissions.length,
          draft: draftSubmissions.length,
        },
        raids: {
          total: guildRaids.length,
          last_30_days: recentRaids.length,
          attendance_records: guildAttendance.length,
        },
        loot: {
          items_distributed: guildLoot.length,
        },
        activity: {
          audit_events_30d: recentAudit.length,
          last_raid_date: guildRaids.length > 0
            ? guildRaids.sort((a, b) => b.raid_date.localeCompare(a.raid_date))[0].raid_date
            : null,
        },
        features_used: {
          attendance: usesAttendance,
          submissions: usesSubmissions,
          loot_tracking: usesLootTracking,
          audit_log: usesAuditLog,
          customized_settings: !!customizedSettings,
        },
        settings: guildSettings ? {
          attendance_type: guildSettings.attendance_type,
          rolling_weeks: guildSettings.rolling_attendance_weeks,
          new_member_mode: guildSettings.new_member_mode,
          raid_days_per_week: guildSettings.raid_days_per_week,
        } : null,
      }
    })

    // Sort by engagement (most active first)
    guildMetrics.sort((a, b) => b.raids.total - a.raids.total)

    // Platform-wide summary
    const activeGuilds = guildMetrics.filter(g => g.raids.last_30_days > 0)
    const totalMembers = memberships.length
    const totalSubmissions = submissions.length
    const totalRaids = raidEvents.filter(r => !r.is_skipped).length

    // Size distribution
    const sizeDistribution = {
      solo: guildMetrics.filter(g => g.members.total <= 1).length,
      small: guildMetrics.filter(g => g.members.total >= 2 && g.members.total <= 10).length,
      medium: guildMetrics.filter(g => g.members.total >= 11 && g.members.total <= 25).length,
      large: guildMetrics.filter(g => g.members.total >= 26 && g.members.total <= 40).length,
      extra_large: guildMetrics.filter(g => g.members.total > 40).length,
    }

    // Feature adoption rates (across guilds with any activity)
    const guildsWithActivity = guildMetrics.filter(g => g.members.total > 1)
    const featureAdoption = guildsWithActivity.length > 0 ? {
      attendance: guildsWithActivity.filter(g => g.features_used.attendance).length,
      submissions: guildsWithActivity.filter(g => g.features_used.submissions).length,
      loot_tracking: guildsWithActivity.filter(g => g.features_used.loot_tracking).length,
      customized_settings: guildsWithActivity.filter(g => g.features_used.customized_settings).length,
      total_guilds_with_activity: guildsWithActivity.length,
    } : null

    // Weekly growth timeline (last 12 weeks)
    const now = new Date()
    const twelveWeeksAgo = new Date(now)
    twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84)

    function getWeekLabel(date: Date): string {
      const d = new Date(date)
      d.setDate(d.getDate() - d.getDay()) // Start of week (Sunday)
      return `${d.getMonth() + 1}/${d.getDate()}`
    }

    function getWeekKey(date: Date): string {
      const d = new Date(date)
      d.setDate(d.getDate() - d.getDay())
      return d.toISOString().split('T')[0]
    }

    // Build 12-week buckets
    const weekBuckets: { key: string; label: string; guilds_created: number; raids_logged: number; submissions_created: number; loot_awarded: number }[] = []
    for (let i = 11; i >= 0; i--) {
      const weekStart = new Date(now)
      weekStart.setDate(weekStart.getDate() - (i * 7) - weekStart.getDay())
      weekStart.setHours(0, 0, 0, 0)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 7)

      weekBuckets.push({
        key: getWeekKey(weekStart),
        label: getWeekLabel(weekStart),
        guilds_created: guilds.filter(g => {
          const d = new Date(g.created_at)
          return d >= weekStart && d < weekEnd
        }).length,
        raids_logged: raidEvents.filter(r => {
          if (r.is_skipped) return false
          const d = new Date(r.raid_date)
          return d >= weekStart && d < weekEnd
        }).length,
        submissions_created: submissions.filter(s => {
          const d = new Date(s.created_at)
          return d >= weekStart && d < weekEnd
        }).length,
        loot_awarded: lootHistory.filter(l => {
          const d = new Date(l.awarded_date)
          return d >= weekStart && d < weekEnd
        }).length,
      })
    }

    // Engagement funnel
    const engagementFunnel = {
      total_guilds: guilds.length,
      with_members: guildMetrics.filter(g => g.members.total > 1).length,
      with_raids: guildMetrics.filter(g => g.raids.total > 0).length,
      with_submissions: guildMetrics.filter(g => g.submissions.total > 0).length,
      with_loot: guildMetrics.filter(g => g.loot.items_distributed > 0).length,
      with_3plus_features: guildMetrics.filter(g =>
        Object.values(g.features_used).filter(Boolean).length >= 3
      ).length,
    }

    // Expansion breakdown
    const expansionCounts: Record<string, number> = {}
    for (const guild of guilds) {
      const expData = guild.expansions as { name: string } | { name: string }[] | null
      const expName = Array.isArray(expData) ? expData[0]?.name : expData?.name
      const name = expName || 'None set'
      expansionCounts[name] = (expansionCounts[name] || 0) + 1
    }
    const expansionBreakdown = Object.entries(expansionCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)

    // Retention: active (raid in last 30d), churned (had raids, none in 30d), new (created in last 30d), dormant (never raided)
    const thirtyDaysAgoRetention = new Date()
    thirtyDaysAgoRetention.setDate(thirtyDaysAgoRetention.getDate() - 30)
    const retention = {
      active: guildMetrics.filter(g => g.raids.last_30_days > 0).length,
      churned: guildMetrics.filter(g => g.raids.total > 0 && g.raids.last_30_days === 0).length,
      new_guilds: guilds.filter(g => new Date(g.created_at) >= thirtyDaysAgoRetention).length,
      dormant: guildMetrics.filter(g => g.raids.total === 0 && g.members.total <= 1).length,
    }

    // Submission pipeline
    const submissionPipeline = {
      total: submissions.length,
      draft: submissions.filter(s => s.status === 'draft').length,
      pending: submissions.filter(s => s.status === 'pending').length,
      approved: submissions.filter(s => s.status === 'approved').length,
      needs_revision: submissions.filter(s => s.status === 'needs_revision').length,
      rejected: submissions.filter(s => s.status === 'rejected').length,
    }

    // Settings distribution (across guilds that have settings)
    const settingsDistribution = {
      attendance_type: {} as Record<string, number>,
      new_member_mode: {} as Record<string, number>,
      rolling_weeks: {} as Record<string, number>,
    }
    for (const s of settings) {
      const at = s.attendance_type || 'rolling'
      settingsDistribution.attendance_type[at] = (settingsDistribution.attendance_type[at] || 0) + 1
      const nm = s.new_member_mode || 'raw'
      settingsDistribution.new_member_mode[nm] = (settingsDistribution.new_member_mode[nm] || 0) + 1
      const rw = String(s.rolling_attendance_weeks ?? 4)
      settingsDistribution.rolling_weeks[rw] = (settingsDistribution.rolling_weeks[rw] || 0) + 1
    }

    return NextResponse.json({
      summary: {
        total_guilds: guilds.length,
        active_guilds_30d: activeGuilds.length,
        total_members: totalMembers,
        total_submissions: totalSubmissions,
        total_raids: totalRaids,
        total_loot_distributed: lootHistory.length,
      },
      size_distribution: sizeDistribution,
      feature_adoption: featureAdoption,
      weekly_timeline: weekBuckets,
      engagement_funnel: engagementFunnel,
      expansion_breakdown: expansionBreakdown,
      retention,
      submission_pipeline: submissionPipeline,
      settings_distribution: settingsDistribution,
      guilds: guildMetrics,
    })
  } catch (error) {
    console.error('Error in GET /api/admin/analytics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

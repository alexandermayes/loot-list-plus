import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'

/**
 * GET /api/admin/analytics
 *
 * Super-admin endpoint that returns platform-wide usage metrics
 * for monetization planning. Returns guild-level engagement data
 * so we can identify what features to gate and where to set tier thresholds.
 */
export async function GET() {
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
      return NextResponse.json({
        error: 'Forbidden',
        debug: {
          user_id: user.id,
          env_set: !!process.env.SUPER_ADMIN_IDS,
          env_length: process.env.SUPER_ADMIN_IDS?.length || 0,
          admin_count: superAdminIds.length,
        }
      }, { status: 403 })
    }

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
      // All guilds with creation date
      supabase
        .from('guilds')
        .select('id, name, created_at, is_active, active_expansion_id'),

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
      const usesAuditLog = guildAudit.some(a => a.table_name === 'audit_logs')
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
      guilds: guildMetrics,
    })
  } catch (error) {
    console.error('Error in GET /api/admin/analytics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { SupabaseClient } from '@supabase/supabase-js'
import { trackEvent, type AnalyticsEvent } from './server'

/**
 * Activation-funnel evaluation (search & AI visibility sprint, item 4).
 *
 * Called fire-and-forget after any mutation that can advance a guild through
 * the funnel (guild created, settings saved, roster grown, list approved,
 * raid recorded, loot awarded). Recomputes the guild's funnel state from the
 * database and fires each milestone event exactly once, using
 * guild_funnel_milestones as the idempotency record.
 *
 * Definitions (from the sprint plan):
 * - qualified: guild exists with an expansion, a configured raid schedule,
 *   and a roster of at least ROSTER_THRESHOLD characters.
 * - activated: at least LIST_THRESHOLD approved loot lists AND a first raid
 *   attendance or first loot award.
 *
 * Concurrency note: two overlapping evaluations can in principle double-fire
 * an event. That is acceptable for analytics; correctness of the timestamps
 * is preserved by only ever setting a milestone column once.
 */

const ROSTER_THRESHOLD = 5
const LIST_THRESHOLD = 5

type MilestoneRow = {
  schedule_configured_at: string | null
  loot_settings_completed_at: string | null
  roster_threshold_at: string | null
  qualified_at: string | null
  first_raid_at: string | null
  first_loot_at: string | null
  activated_at: string | null
}

function hoursSince(iso: string): number {
  return Math.round(((Date.now() - new Date(iso).getTime()) / 3_600_000) * 10) / 10
}

function daysSince(iso: string): number {
  return Math.round(((Date.now() - new Date(iso).getTime()) / 86_400_000) * 10) / 10
}

export async function evaluateGuildFunnel(
  serviceSupabase: SupabaseClient,
  guildId: string,
  hints: { lootSettingsUpdated?: boolean } = {}
): Promise<void> {
  try {
    const [{ data: guild }, { data: existing }] = await Promise.all([
      serviceSupabase
        .from('guilds')
        .select('id, created_at, active_expansion_id')
        .eq('id', guildId)
        .maybeSingle(),
      serviceSupabase
        .from('guild_funnel_milestones')
        .select('*')
        .eq('guild_id', guildId)
        .maybeSingle(),
    ])
    if (!guild) return

    const m: MilestoneRow = existing ?? {
      schedule_configured_at: null,
      loot_settings_completed_at: null,
      roster_threshold_at: null,
      qualified_at: null,
      first_raid_at: null,
      first_loot_at: null,
      activated_at: null,
    }

    // Everything already reached? Nothing to compute.
    if (m.qualified_at && m.activated_at && m.loot_settings_completed_at) return

    const [settingsRes, rosterRes, approvedRes, attendanceRes, lootRes] = await Promise.all([
      serviceSupabase
        .from('guild_settings')
        .select('raid_days_per_week, first_raid_day')
        .eq('guild_id', guildId)
        .maybeSingle(),
      serviceSupabase
        .from('character_guild_memberships')
        .select('id', { count: 'exact', head: true })
        .eq('guild_id', guildId)
        .eq('is_active', true),
      serviceSupabase
        .from('loot_submissions')
        .select('character_id')
        .eq('guild_id', guildId)
        .eq('status', 'approved')
        .limit(500),
      serviceSupabase
        .from('attendance_records')
        .select('id, raid_events!inner(guild_id)')
        .eq('raid_events.guild_id', guildId)
        .limit(1),
      serviceSupabase
        .from('loot_history')
        .select('id')
        .eq('guild_id', guildId)
        .limit(1),
    ])

    const raidDayCount = settingsRes.data?.raid_days_per_week ?? 0
    const scheduleConfigured = raidDayCount > 0 && settingsRes.data?.first_raid_day != null
    const rosterCount = rosterRes.count ?? 0
    const approvedLists = new Set((approvedRes.data ?? []).map((r) => r.character_id)).size
    const hasRaid = (attendanceRes.data?.length ?? 0) > 0
    const hasLoot = (lootRes.data?.length ?? 0) > 0

    const now = new Date().toISOString()
    const updates: Record<string, string> = {}
    const events: { event: AnalyticsEvent; properties: Record<string, unknown> }[] = []

    if (!m.schedule_configured_at && scheduleConfigured) {
      updates.schedule_configured_at = now
      events.push({ event: 'raid_schedule_configured', properties: { raid_day_count: raidDayCount } })
    }
    if (!m.loot_settings_completed_at && hints.lootSettingsUpdated) {
      updates.loot_settings_completed_at = now
      events.push({ event: 'loot_settings_completed', properties: { expansion: guild.active_expansion_id } })
    }
    if (!m.roster_threshold_at && rosterCount >= ROSTER_THRESHOLD) {
      updates.roster_threshold_at = now
      events.push({
        event: 'roster_threshold_reached',
        properties: { character_count: rosterCount, threshold: ROSTER_THRESHOLD },
      })
    }
    const qualifiedNow =
      !!guild.active_expansion_id &&
      scheduleConfigured &&
      rosterCount >= ROSTER_THRESHOLD
    if (!m.qualified_at && qualifiedNow) {
      updates.qualified_at = now
      events.push({ event: 'guild_qualified', properties: { hours_since_creation: hoursSince(guild.created_at) } })
    }
    if (!m.first_raid_at && hasRaid) {
      updates.first_raid_at = now
      events.push({ event: 'first_raid_recorded', properties: { days_since_creation: daysSince(guild.created_at) } })
    }
    if (!m.first_loot_at && hasLoot) {
      updates.first_loot_at = now
      events.push({ event: 'first_loot_awarded', properties: { days_since_creation: daysSince(guild.created_at) } })
    }
    if (!m.activated_at && approvedLists >= LIST_THRESHOLD && (hasRaid || hasLoot)) {
      updates.activated_at = now
      events.push({
        event: 'guild_activated',
        properties: {
          days_since_creation: daysSince(guild.created_at),
          activation_path: hasRaid ? 'raid' : 'award',
          approved_list_count: approvedLists,
        },
      })
    }
    if (Object.keys(updates).length === 0) return

    const { error } = await serviceSupabase
      .from('guild_funnel_milestones')
      .upsert({ guild_id: guildId, ...updates, updated_at: now }, { onConflict: 'guild_id' })
    if (error) {
      console.error(`Funnel milestone upsert failed for guild ${guildId}:`, error.message)
      return
    }

    for (const e of events) {
      trackEvent({ event: e.event, userId: `guild:${guildId}`, guildId, properties: e.properties })
    }
  } catch (err) {
    // Analytics must never break a product mutation
    console.error(`Funnel evaluation failed for guild ${guildId}:`, err)
  }
}

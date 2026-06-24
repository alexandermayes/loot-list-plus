import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyPermission } from '@/utils/server-roles'
import { requirePro } from '@/utils/feature-gate'
import { logAudit } from '@/utils/audit/log'
import { resolveRaidDays } from '@/domain/raid-team/settings'
import type { RaidDaysOverride } from '@/domain/raid-team/types'
import { toDateString } from '@/utils/date'

/**
 * GET /api/raid-teams?guild_id=X
 * List all raid teams for a guild. Any guild member can view.
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const guildId = request.nextUrl.searchParams.get('guild_id')
    if (!guildId) {
      return NextResponse.json({ error: 'guild_id is required' }, { status: 400 })
    }

    const serviceSupabase = createServiceRoleClient()

    // Verify membership
    const { data: userChars } = await serviceSupabase
      .from('characters')
      .select('id')
      .eq('user_id', user.id)

    if (!userChars || userChars.length === 0) {
      return NextResponse.json({ error: 'No characters found' }, { status: 403 })
    }

    const { data: membership } = await serviceSupabase
      .from('character_guild_memberships')
      .select('id')
      .eq('guild_id', guildId)
      .in('character_id', userChars.map(c => c.id))
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this guild' }, { status: 403 })
    }

    const { data: teams, error } = await serviceSupabase
      .from('raid_teams')
      .select('*')
      .eq('guild_id', guildId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ teams: teams || [] })
  } catch (error) {
    console.error('Error in GET /api/raid-teams:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/raid-teams
 * Create a new raid team. Officer only, Pro only.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { guild_id, name, color_hex, raid_days_override, rolling_weeks_override } = body as {
      guild_id: string
      name: string
      color_hex?: string
      raid_days_override?: object | null
      rolling_weeks_override?: number | null
    }

    if (!guild_id || !name?.trim()) {
      return NextResponse.json({ error: 'guild_id and name are required' }, { status: 400 })
    }

    const serviceSupabase = createServiceRoleClient()

    // Pro gate
    const proCheck = await requirePro(serviceSupabase, guild_id)
    if (!proCheck.isPro) return proCheck.error

    // Officer check
    const { hasPermission } = await verifyPermission(serviceSupabase, user.id, guild_id, 'manage_roster')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Officers only' }, { status: 403 })
    }

    // Get current max sort_order
    const { data: existingTeams } = await serviceSupabase
      .from('raid_teams')
      .select('sort_order')
      .eq('guild_id', guild_id)
      .order('sort_order', { ascending: false })
      .limit(1)

    const nextOrder = (existingTeams?.[0]?.sort_order ?? -1) + 1

    // Check if this is the first team (make it default)
    const isFirstTeam = !existingTeams || existingTeams.length === 0

    // Resolve initial raid days for schedule history
    const { data: guildSettings } = await serviceSupabase
      .from('guild_settings')
      .select('raid_days_per_week, first_raid_day, second_raid_day, third_raid_day, fourth_raid_day, fifth_raid_day')
      .eq('guild_id', guild_id)
      .single()

    const initialDays = guildSettings
      ? resolveRaidDays(guildSettings, (raid_days_override as RaidDaysOverride | null) || null)
      : []

    const { data: team, error } = await serviceSupabase
      .from('raid_teams')
      .insert({
        guild_id,
        name: name.trim(),
        color_hex: color_hex || '#ff8000',
        is_default: isFirstTeam,
        sort_order: nextOrder,
        raid_days_override: raid_days_override || null,
        rolling_weeks_override: rolling_weeks_override ?? null,
        schedule_history: initialDays.length > 0
          ? [{ days: initialDays, effective_from: toDateString(new Date()) }]
          : null,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'A team with that name already exists' }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await logAudit({
      supabase: serviceSupabase,
      guildId: guild_id,
      tableName: 'raid_teams',
      recordId: team.id,
      action: 'INSERT',
      userId: user.id,
      newData: { name: team.name, color_hex: team.color_hex },
    })

    return NextResponse.json({ team })
  } catch (error) {
    console.error('Error in POST /api/raid-teams:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { logReserveAudit } from '@/utils/reserve-audit'
import { trackEvent } from '@/utils/analytics/server'
import { verifyReserveRunAccess } from '@/utils/reserve-access'

/**
 * POST /api/reserve-runs/[id]/duplicate
 *
 * Clone an existing run. Copies settings and hard reserves but creates
 * a new share token and starts the clone as open with no submissions
 * or awards. Officer-only.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Duplicating a run creates a new row owned by the caller. That means
    // we still require the caller to be authenticated — a raid leader
    // token alone is not enough, because the new run needs a `created_by`
    // FK to auth.users.
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Sign in to duplicate a run' }, { status: 401 })
    }

    const { id } = await params
    const serviceSupabase = createServiceRoleClient()

    const access = await verifyReserveRunAccess({
      serviceSupabase,
      runId: id,
      request,
      userId: user.id,
    })
    if (!access.allowed) {
      const status = access.reason === 'Run not found' ? 404 : 403
      return NextResponse.json({ error: access.reason ?? 'Forbidden' }, { status })
    }

    const { data: source, error: fetchError } = await serviceSupabase
      .from('reserve_runs')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !source) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 })
    }

    // Shift raid_at one week forward as a sensible default; officer can adjust later.
    const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000
    const nextRaidAt = new Date(new Date(source.raid_at).getTime() + ONE_WEEK_MS).toISOString()
    const nextLockAt = new Date(new Date(source.lock_at).getTime() + ONE_WEEK_MS).toISOString()

    const { data: clone, error: insertError } = await serviceSupabase
      .from('reserve_runs')
      .insert({
        created_by: user.id,
        guild_id: source.guild_id,
        raid_team_id: source.raid_team_id,
        expansion_id: source.expansion_id,
        raid_tier_id: source.raid_tier_id,
        title: `${source.title} (copy)`,
        status: 'open',
        raid_at: nextRaidAt,
        lock_at: nextLockAt,
        max_reserves: source.max_reserves,
        max_reserves_per_item: source.max_reserves_per_item,
        allow_duplicates: source.allow_duplicates,
        visibility: source.visibility,
        rules_note: source.rules_note,
        hard_reserves: source.hard_reserves,
        rule_snapshot: source.rule_snapshot,
        discord_invite_url: source.discord_invite_url,
        enforce_class_restrictions: source.enforce_class_restrictions,
      })
      .select()
      .single()

    if (insertError || !clone) {
      console.error('Error cloning reserve run:', insertError)
      return NextResponse.json({ error: 'Failed to duplicate run' }, { status: 500 })
    }

    await logReserveAudit({
      supabase: serviceSupabase,
      reserveRunId: clone.id,
      actorUserId: user.id,
      actorLabel: user.email ?? null,
      action: 'run_duplicated',
      details: { source_run_id: id },
    })

    trackEvent({
      event: 'reserve_run_duplicated',
      userId: user.id,
      properties: { source_run_id: id, clone_run_id: clone.id },
    })

    return NextResponse.json({ success: true, run: clone })
  } catch (err) {
    console.error('Reserve run duplicate error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

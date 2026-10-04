import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { decideReserveRunManager } from '@/utils/reserve-access'

/**
 * GET /api/reserve-runs/[id]/audit
 *
 * Returns the audit log for a reserve run. Managers only: the leader link,
 * the run's creator while an active member of its guild, and officers with
 * Manage reserves for a guild run. Run history is a management record, not
 * something every viewer needs.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await getAuthenticatedUser()
    const { id } = await params
    const serviceSupabase = createServiceRoleClient()

    const { data: run, error: runError } = await serviceSupabase
      .from('reserve_runs')
      .select('guild_id, created_by, raid_leader_token')
      .eq('id', id)
      .single()
    if (runError || !run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 })
    }

    const decision = await decideReserveRunManager({
      serviceSupabase,
      run,
      request,
      userId: user?.id ?? null,
    })

    if (!decision.allowed) {
      const status = decision.reason === 'Unauthorized' ? 401 : 403
      return NextResponse.json({ error: decision.reason ?? 'Forbidden' }, { status })
    }

    const { data: entries, error } = await serviceSupabase
      .from('reserve_audit_log')
      .select('id, actor_user_id, actor_label, action, details, created_at')
      .eq('reserve_run_id', id)
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) {
      console.error('Error loading reserve audit log:', error)
      return NextResponse.json({ error: 'Failed to load audit log' }, { status: 500 })
    }

    return NextResponse.json({ success: true, entries: entries || [] })
  } catch (err) {
    console.error('Reserve audit GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

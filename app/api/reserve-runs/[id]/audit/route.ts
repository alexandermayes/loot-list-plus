import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { extractLeaderToken } from '@/utils/reserve-access'

/**
 * GET /api/reserve-runs/[id]/audit
 *
 * Returns the audit log for a reserve run. Guild members can view.
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

    // Any of: leader token, creator, or guild member grants read access
    const token = extractLeaderToken(request)
    let allowed = token === run.raid_leader_token
    if (!allowed && user) {
      if (run.created_by === user.id) {
        allowed = true
      } else if (run.guild_id) {
        const { data: membership } = await serviceSupabase
          .from('character_guild_memberships')
          .select('id, characters!inner(user_id)')
          .eq('guild_id', run.guild_id)
          .eq('is_active', true)
          .eq('characters.user_id', user.id)
          .limit(1)
        if (membership && membership.length > 0) allowed = true
      } else {
        // Public run, no guild — any authed user with the run id can view audit
        allowed = true
      }
    }

    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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

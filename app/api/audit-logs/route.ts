import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyOfficerPermissions } from '@/utils/server-roles'
import { batchGetDisplayNames } from '@/utils/batch-display-names'

/**
 * GET /api/audit-logs
 *
 * Fetch audit logs for a guild. Officer-only.
 *
 * Query params:
 * - guild_id: Required
 * - limit: Optional (default 50, max 100)
 * - offset: Optional (default 0)
 * - table_name: Optional filter (e.g. 'loot_submissions', 'loot_history', 'attendance_records')
 * - action: Optional filter ('INSERT', 'UPDATE', 'DELETE')
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const guildId = searchParams.get('guild_id')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')
    const tableFilter = searchParams.get('table_name')
    const actionFilter = searchParams.get('action')

    if (!guildId) {
      return NextResponse.json({ error: 'guild_id is required' }, { status: 400 })
    }

    const serviceSupabase = createServiceRoleClient()

    const { hasPermission } = await verifyOfficerPermissions(serviceSupabase, user.id, guildId)
    if (!hasPermission) {
      return NextResponse.json({ error: 'Only officers can view audit logs' }, { status: 403 })
    }

    let query = serviceSupabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .eq('guild_id', guildId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (tableFilter) {
      query = query.eq('table_name', tableFilter)
    }
    if (actionFilter) {
      query = query.eq('action', actionFilter)
    }

    const { data: logs, error, count } = await query

    if (error) {
      console.error('Error fetching audit logs:', error)
      return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 })
    }

    // Resolve user display names
    const userIds = [...new Set((logs || []).map(l => l.user_id).filter(Boolean))]
    const displayNames = userIds.length > 0
      ? await batchGetDisplayNames(serviceSupabase, userIds)
      : {}

    const enrichedLogs = (logs || []).map(log => ({
      ...log,
      user_display_name: (displayNames as Record<string, string>)[log.user_id] || 'Unknown',
    }))

    return NextResponse.json({
      logs: enrichedLogs,
      total: count || 0,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Error in GET /api/audit-logs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

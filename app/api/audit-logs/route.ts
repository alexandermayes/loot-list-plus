import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyPermission } from '@/utils/server-roles'
import { batchGetDisplayNames } from '@/utils/batch-display-names'
import { requirePro } from '@/utils/feature-gate'

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
 * - search: Optional text search (filters by user display name or data content, applied post-query)
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
    const searchTerm = searchParams.get('search')?.toLowerCase()

    if (!guildId) {
      return NextResponse.json({ error: 'guild_id is required' }, { status: 400 })
    }

    const serviceSupabase = createServiceRoleClient()

    const { hasPermission } = await verifyPermission(serviceSupabase, user.id, guildId, 'view_audit_log')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Only officers can view audit logs' }, { status: 403 })
    }

    const proCheck = await requirePro(serviceSupabase, guildId)
    if (!proCheck.isPro) return proCheck.error

    // When searching, fetch a large window and filter post-query.
    // Search is limited to the most recent records. The UI communicates this.
    const SEARCH_WINDOW = 5000
    const fetchLimit = searchTerm ? SEARCH_WINDOW : limit
    const fetchOffset = searchTerm ? 0 : offset

    let query = serviceSupabase
      .from('audit_logs')
      .select('*', { count: searchTerm ? undefined : 'exact' })
      .eq('guild_id', guildId)
      .order('created_at', { ascending: false })
      .range(fetchOffset, fetchOffset + fetchLimit - 1)

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
      : new Map<string, string>()

    // Resolve character IDs embedded in old_data/new_data to names
    // Attendance logs store character_ids arrays, member logs store target character info
    const characterIdSet = new Set<string>()
    for (const log of (logs || [])) {
      for (const data of [log.old_data, log.new_data]) {
        if (!data) continue
        // Extract from filters.character_ids (attendance PATCH)
        if (data.filters?.character_ids) {
          for (const id of data.filters.character_ids) characterIdSet.add(id)
        }
        // Extract from filters.character_id (attendance DELETE)
        if (data.filters?.character_id) characterIdSet.add(data.filters.character_id)
        // Extract from character_id (direct field)
        if (data.character_id && typeof data.character_id === 'string') characterIdSet.add(data.character_id)
        // Extract from character_ids array (member management)
        if (Array.isArray(data.character_ids)) {
          for (const id of data.character_ids) characterIdSet.add(id)
        }
      }
    }

    const characterNames = new Map<string, string>()
    if (characterIdSet.size > 0) {
      const { data: chars } = await serviceSupabase
        .from('characters')
        .select('id, name')
        .in('id', [...characterIdSet])
      if (chars) {
        for (const c of chars) characterNames.set(c.id, c.name)
      }
    }

    let enrichedLogs = (logs || []).map(log => ({
      ...log,
      user_display_name: displayNames.get(log.user_id) || 'Unknown',
      _character_names: Object.fromEntries(characterNames),
    }))

    // Apply text search filter post-query
    // Character names are matched per-log (not globally) to avoid false positives
    if (searchTerm) {
      enrichedLogs = enrichedLogs.filter(log => {
        // Collect character names specific to THIS log entry
        const logCharNames: string[] = []
        for (const data of [log.old_data, log.new_data]) {
          if (!data) continue
          if (data.filters?.character_ids) {
            for (const id of data.filters.character_ids) {
              const name = characterNames.get(id)
              if (name) logCharNames.push(name)
            }
          }
          if (data.filters?.character_id) {
            const name = characterNames.get(data.filters.character_id)
            if (name) logCharNames.push(name)
          }
          if (data.character_id && typeof data.character_id === 'string') {
            const name = characterNames.get(data.character_id)
            if (name) logCharNames.push(name)
          }
          if (Array.isArray(data.character_ids)) {
            for (const id of data.character_ids) {
              const name = characterNames.get(id)
              if (name) logCharNames.push(name)
            }
          }
          // Also check character_name directly in data (e.g., loot history)
          if (data.character_name) logCharNames.push(data.character_name)
        }

        const haystack = [
          log.user_display_name,
          JSON.stringify(log.old_data),
          JSON.stringify(log.new_data),
          logCharNames.join(' '),
        ].join(' ').toLowerCase()
        return haystack.includes(searchTerm)
      })
    }

    // For search: total is matches within the search window (not all-time).
    // search_exhausted indicates whether we searched all available logs.
    const totalFiltered = searchTerm ? enrichedLogs.length : (count || 0)
    const rawFetched = (logs || []).length
    const searchExhausted = searchTerm ? rawFetched < SEARCH_WINDOW : true

    // Apply pagination after search filtering
    if (searchTerm) {
      enrichedLogs = enrichedLogs.slice(offset, offset + limit)
    }

    return NextResponse.json({
      logs: enrichedLogs,
      total: totalFiltered,
      limit,
      offset,
      search_exhausted: searchExhausted,
    })
  } catch (error) {
    console.error('Error in GET /api/audit-logs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

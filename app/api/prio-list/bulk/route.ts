import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { NextResponse } from 'next/server'
import { verifyPermission } from '@/utils/server-roles'
import { trackApiError } from '@/utils/analytics/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface BulkPriorityUpdate {
  item_id: number
  role_priorities?: Record<string, number | null>
  class_priorities?: Record<string, number | null>
  character_priorities?: Record<string, number | null>
  notes?: string | null
}

// POST - Bulk update item priorities
export async function POST(request: Request) {
  try {
    // Fast auth check using getSession (no network call)
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceSupabase = createServiceRoleClient()

    const body = await request.json()
    const {
      guild_id,
      raid_tier_id,
      priorities, // Array of BulkPriorityUpdate
      priority_bonuses // Default bonuses for all items
    } = body

    if (!guild_id || !raid_tier_id || !priorities || !Array.isArray(priorities)) {
      return NextResponse.json(
        { error: 'guild_id, raid_tier_id, and priorities array are required' },
        { status: 400 }
      )
    }

    // Verify user has officer permissions (position >= 50)
    const verification = await verifyPermission(serviceSupabase, user.id, guild_id, 'manage_loot')
    if (!verification.hasPermission) {
      return NextResponse.json(
        { error: 'Only officers can update item priorities' },
        { status: 403 }
      )
    }

    const defaultBonuses = priority_bonuses || { role: 5, class: 3, character: 2 }

    // Build upsert rows for batch operation (single query instead of 2N sequential queries)
    const upsertRows = (priorities as BulkPriorityUpdate[]).map(priority => ({
      guild_id,
      item_id: priority.item_id,
      raid_tier_id,
      role_priorities: priority.role_priorities || {},
      class_priorities: priority.class_priorities || {},
      character_priorities: priority.character_priorities || {},
      priority_bonuses: defaultBonuses,
      notes: priority.notes || null
    }))

    // guild_item_priorities currently has no RLS policies. Permission is verified
    // above, so use the service client for the upsert.
    const { data: results, error: upsertError } = await serviceSupabase
      .from('guild_item_priorities')
      .upsert(upsertRows, {
        onConflict: 'guild_id,item_id,raid_tier_id'
      })
      .select()

    const errors: { item_id: number; error: string }[] = []
    if (upsertError) {
      console.error('Error in bulk upsert:', upsertError)
      // If the whole upsert fails, report all items as failed
      for (const priority of priorities as BulkPriorityUpdate[]) {
        errors.push({ item_id: priority.item_id, error: 'Failed to save priority' })
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      updated: results?.length || 0,
      failed: errors.length,
      results: results || [],
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (error) {
    console.error('Error in prio-list bulk POST:', error)
    trackApiError('unknown', 'POST /api/prio-list/bulk', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

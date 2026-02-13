import { createClient, getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { NextResponse } from 'next/server'
import { verifyOfficerPermissions } from '@/utils/server-roles'
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

    const supabase = await createClient()
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
    const verification = await verifyOfficerPermissions(serviceSupabase, user.id, guild_id)
    if (!verification.hasPermission) {
      return NextResponse.json(
        { error: 'Only officers can update item priorities' },
        { status: 403 }
      )
    }

    const defaultBonuses = priority_bonuses || { role: 5, class: 3, character: 2 }
    const results: Record<string, unknown>[] = []
    const errors: { item_id: number; error: string }[] = []

    // Process each priority update
    for (const priority of priorities as BulkPriorityUpdate[]) {
      try {
        // Check if priority exists for this item
        const { data: existingPriority } = await supabase
          .from('guild_item_priorities')
          .select('id')
          .eq('guild_id', guild_id)
          .eq('item_id', priority.item_id)
          .eq('raid_tier_id', raid_tier_id)
          .single()

        const priorityData = {
          guild_id,
          item_id: priority.item_id,
          raid_tier_id,
          role_priorities: priority.role_priorities || {},
          class_priorities: priority.class_priorities || {},
          character_priorities: priority.character_priorities || {},
          priority_bonuses: defaultBonuses,
          notes: priority.notes || null
        }

        if (existingPriority) {
          // Update existing priority
          const { data, error } = await supabase
            .from('guild_item_priorities')
            .update(priorityData)
            .eq('id', existingPriority.id)
            .select()
            .single()

          if (error) {
            console.error(`Error updating priority for item ${priority.item_id}:`, error)
            errors.push({ item_id: priority.item_id, error: 'Failed to update priority' })
          } else {
            results.push(data)
          }
        } else {
          // Insert new priority
          const { data, error } = await supabase
            .from('guild_item_priorities')
            .insert(priorityData)
            .select()
            .single()

          if (error) {
            console.error(`Error inserting priority for item ${priority.item_id}:`, error)
            errors.push({ item_id: priority.item_id, error: 'Failed to save priority' })
          } else {
            results.push(data)
          }
        }
      } catch (err: unknown) {
        console.error(`Unexpected error processing priority for item ${priority.item_id}:`, err)
        errors.push({ item_id: priority.item_id, error: 'Failed to process priority' })
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      updated: results.length,
      failed: errors.length,
      results,
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (error) {
    console.error('Error in prio-list bulk POST:', error)
    trackApiError('unknown', 'POST /api/prio-list/bulk', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

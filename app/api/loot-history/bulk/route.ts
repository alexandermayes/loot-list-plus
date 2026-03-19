import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyOfficerPermissions } from '@/utils/server-roles'
import { logAudit } from '@/utils/audit/log'

/**
 * POST /api/loot-history/bulk
 *
 * Bulk insert loot history entries. Uses service role to bypass RLS
 * after verifying the caller has officer permissions.
 *
 * Body: { guild_id, items: Array<{ loot_item_id, raid_tier_id, raid_event_id, awarded_date, character_id?, character_name?, notes? }> }
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { guild_id, items } = body

    if (!guild_id || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'guild_id and items array are required' }, { status: 400 })
    }

    const serviceSupabase = createServiceRoleClient()

    const { hasPermission, error: permError } = await verifyOfficerPermissions(serviceSupabase, user.id, guild_id)
    if (!hasPermission) {
      return NextResponse.json({ error: permError || 'Insufficient permissions' }, { status: 403 })
    }

    const results: { index: number; success: boolean; error?: string; id?: string }[] = []

    // Look up expansion_id from raid_tier_id (first item's tier)
    let expansionId: string | null = null
    const firstTierId = items[0]?.raid_tier_id
    if (firstTierId) {
      const { data: tier } = await serviceSupabase
        .from('raid_tiers')
        .select('expansion_id')
        .eq('id', firstTierId)
        .single()
      expansionId = tier?.expansion_id || null
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const insertData: Record<string, unknown> = {
        loot_item_id: item.loot_item_id,
        guild_id,
        raid_tier_id: item.raid_tier_id,
        raid_event_id: item.raid_event_id,
        awarded_date: item.awarded_date,
        awarded_by: user.id,
        notes: item.notes || null,
        expansion_id: expansionId,
      }

      if (item.character_id) insertData.character_id = item.character_id
      if (item.character_name) insertData.character_name = item.character_name

      const { data, error } = await serviceSupabase
        .from('loot_history')
        .insert(insertData)
        .select('id')
        .single()

      if (error) {
        results.push({
          index: i,
          success: false,
          error: error.code === '23505' ? 'duplicate' : error.message,
        })
      } else {
        results.push({ index: i, success: true, id: data?.id })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failedCount = results.filter(r => !r.success).length

    // Audit log successful awards (fire and forget)
    for (const result of results) {
      if (result.success && result.id) {
        const item = items[result.index]
        logAudit({
          supabase: serviceSupabase,
          guildId: guild_id,
          tableName: 'loot_history',
          recordId: result.id,
          action: 'INSERT',
          userId: user.id,
          newData: {
            loot_item_id: item.loot_item_id,
            character_id: item.character_id,
            character_name: item.character_name,
            raid_event_id: item.raid_event_id,
            awarded_date: item.awarded_date,
          },
        })
      }
    }

    return NextResponse.json({ results, successCount, failedCount })
  } catch (error) {
    console.error('Error in POST /api/loot-history/bulk:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/loot-history/bulk
 *
 * Delete loot history entries by raid_event_id or by specific IDs.
 * Uses service role to bypass RLS after verifying officer permissions.
 *
 * Body: { guild_id, raid_event_id? , ids?: string[] }
 */
export async function DELETE(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { guild_id, raid_event_id, ids } = body

    if (!guild_id) {
      return NextResponse.json({ error: 'guild_id is required' }, { status: 400 })
    }

    if (!raid_event_id && (!ids || ids.length === 0)) {
      return NextResponse.json({ error: 'raid_event_id or ids required' }, { status: 400 })
    }

    const serviceSupabase = createServiceRoleClient()

    const { hasPermission, error: permError } = await verifyOfficerPermissions(serviceSupabase, user.id, guild_id)
    if (!hasPermission) {
      return NextResponse.json({ error: permError || 'Insufficient permissions' }, { status: 403 })
    }

    if (raid_event_id) {
      // Read what we're about to delete for the audit log
      const { data: toDelete } = await serviceSupabase
        .from('loot_history')
        .select('id, loot_item_id, character_id, character_name')
        .eq('raid_event_id', raid_event_id)
        .eq('guild_id', guild_id)

      const { error } = await serviceSupabase
        .from('loot_history')
        .delete()
        .eq('raid_event_id', raid_event_id)
        .eq('guild_id', guild_id)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      // Audit log each deleted entry
      for (const entry of toDelete || []) {
        logAudit({
          supabase: serviceSupabase,
          guildId: guild_id,
          tableName: 'loot_history',
          recordId: entry.id,
          action: 'DELETE',
          userId: user.id,
          oldData: { ...entry, raid_event_id },
        })
      }
    } else if (ids) {
      // Read what we're about to delete for the audit log
      const { data: toDelete } = await serviceSupabase
        .from('loot_history')
        .select('id, loot_item_id, character_id, character_name')
        .in('id', ids)
        .eq('guild_id', guild_id)

      const { error } = await serviceSupabase
        .from('loot_history')
        .delete()
        .in('id', ids)
        .eq('guild_id', guild_id)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      // Audit log each deleted entry
      for (const entry of toDelete || []) {
        logAudit({
          supabase: serviceSupabase,
          guildId: guild_id,
          tableName: 'loot_history',
          recordId: entry.id,
          action: 'DELETE',
          userId: user.id,
          oldData: entry,
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/loot-history/bulk:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/loot-history/bulk
 *
 * Update a single loot history entry (reassign).
 * Uses service role to bypass RLS after verifying officer permissions.
 *
 * Body: { guild_id, id, updates: { character_id?, character_name?, notes? } }
 */
export async function PATCH(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { guild_id, id, updates } = body

    if (!guild_id || !id || !updates) {
      return NextResponse.json({ error: 'guild_id, id, and updates are required' }, { status: 400 })
    }

    const serviceSupabase = createServiceRoleClient()

    const { hasPermission, error: permError } = await verifyOfficerPermissions(serviceSupabase, user.id, guild_id)
    if (!hasPermission) {
      return NextResponse.json({ error: permError || 'Insufficient permissions' }, { status: 403 })
    }

    const allowedFields = ['character_id', 'character_name', 'notes']
    const sanitized: Record<string, unknown> = {}
    for (const key of allowedFields) {
      if (key in updates) sanitized[key] = updates[key]
    }

    // Read current state for audit log
    const { data: before } = await serviceSupabase
      .from('loot_history')
      .select('character_id, character_name, notes')
      .eq('id', id)
      .eq('guild_id', guild_id)
      .single()

    const { error } = await serviceSupabase
      .from('loot_history')
      .update(sanitized)
      .eq('id', id)
      .eq('guild_id', guild_id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Audit log the reassignment
    logAudit({
      supabase: serviceSupabase,
      guildId: guild_id,
      tableName: 'loot_history',
      recordId: id,
      action: 'UPDATE',
      userId: user.id,
      oldData: before,
      newData: sanitized,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in PATCH /api/loot-history/bulk:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

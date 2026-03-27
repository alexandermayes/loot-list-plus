import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyOfficerPermissions } from '@/utils/server-roles'
import { logAudit } from '@/utils/audit/log'
import { trackEvent, trackApiError } from '@/utils/analytics/server'
import { toDateString } from '@/utils/date'

/**
 * POST /api/loot-submissions/remove-item
 *
 * Surgically removes a single item from an approved loot submission
 * without changing the submission's approved status.
 *
 * Allowed by: the character owner OR any officer in the guild.
 *
 * Body: {
 *   guild_id: string,
 *   submission_id: string,
 *   loot_item_id: string,
 *   reason?: string,
 *   already_obtained?: boolean  // If true, inserts into loot_history
 * }
 */
export async function POST(request: Request) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { guild_id, submission_id, loot_item_id, reason, already_obtained, restore } = body

    if (!guild_id || !submission_id || !loot_item_id) {
      return NextResponse.json(
        { error: 'guild_id, submission_id, and loot_item_id are required' },
        { status: 400 }
      )
    }

    const serviceSupabase = createServiceRoleClient()

    // Fetch the submission to verify it exists and is approved
    const { data: submission, error: subError } = await serviceSupabase
      .from('loot_submissions')
      .select('id, guild_id, character_id, status, expansion_id')
      .eq('id', submission_id)
      .eq('guild_id', guild_id)
      .single()

    if (subError || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    if (submission.status !== 'approved' && !restore) {
      return NextResponse.json(
        { error: 'Can only remove items from approved submissions. Edit the list directly instead.' },
        { status: 400 }
      )
    }

    // Permission check: character owner OR officer
    let isOwner = false
    const { data: character } = await serviceSupabase
      .from('characters')
      .select('id, user_id, name')
      .eq('id', submission.character_id)
      .single()

    if (character?.user_id === user.id) {
      isOwner = true
    }

    if (!isOwner) {
      const { hasPermission } = await verifyOfficerPermissions(serviceSupabase, user.id, guild_id)
      if (!hasPermission) {
        return NextResponse.json(
          { error: 'Only the list owner or officers can remove items' },
          { status: 403 }
        )
      }
    }

    // Fetch the item row(s)
    const { data: itemRows } = await serviceSupabase
      .from('loot_submission_items')
      .select('id, rank, slot, loot_item_id, removed_at')
      .eq('submission_id', submission_id)
      .eq('loot_item_id', loot_item_id)

    if (!itemRows || itemRows.length === 0) {
      return NextResponse.json({ error: 'Item not found in this submission' }, { status: 404 })
    }

    // Handle restore (undo removal)
    if (restore) {
      const removedRows = itemRows.filter(r => r.removed_at)
      console.log('[restore] itemRows:', itemRows.length, 'removedRows:', removedRows.length, 'removed_at values:', itemRows.map(r => r.removed_at))
      if (removedRows.length === 0) {
        return NextResponse.json({ error: 'Item is not removed' }, { status: 400 })
      }

      const itemIds = removedRows.map(r => r.id)
      const { error: restoreError } = await serviceSupabase
        .from('loot_submission_items')
        .update({ removed_at: null, removed_by: null })
        .in('id', itemIds)

      if (restoreError) {
        console.error('Error restoring item:', restoreError)
        return NextResponse.json({ error: 'Couldn\'t restore item. Try again.' }, { status: 500 })
      }

      const { data: lootItem } = await serviceSupabase
        .from('loot_items')
        .select('id, name, wowhead_id')
        .eq('id', loot_item_id)
        .single()

      await logAudit({
        supabase: serviceSupabase,
        guildId: guild_id,
        tableName: 'loot_submission_items',
        recordId: submission_id,
        action: 'UPDATE',
        userId: user.id,
        oldData: { removed_at: removedRows[0].removed_at, item_name: lootItem?.name },
        newData: { removed_at: null, item_name: lootItem?.name, restored: true },
      })

      return NextResponse.json({
        success: true,
        restored: true,
        item_name: lootItem?.name || 'Unknown',
      })
    }

    const activeRows = itemRows.filter(r => !r.removed_at)
    if (activeRows.length === 0) {
      return NextResponse.json({ error: 'Item already removed' }, { status: 400 })
    }

    // Fetch item details for audit log and loot_history
    const { data: lootItem } = await serviceSupabase
      .from('loot_items')
      .select('id, name, wowhead_id, raid_tier_id')
      .eq('id', loot_item_id)
      .single()

    // Mark items as removed (soft delete) instead of deleting
    const { error: updateError } = await serviceSupabase
      .from('loot_submission_items')
      .update({ removed_at: new Date().toISOString(), removed_by: user.id })
      .eq('submission_id', submission_id)
      .eq('loot_item_id', loot_item_id)
      .is('removed_at', null)

    if (updateError) {
      console.error('Error removing item from submission:', updateError)
      return NextResponse.json({ error: 'Couldn\'t remove item. Try again.' }, { status: 500 })
    }

    // If the raider already has the item, record it in loot_history
    if (already_obtained && character && lootItem) {
      await serviceSupabase
        .from('loot_history')
        .insert({
          guild_id,
          character_id: submission.character_id,
          character_name: character.name,
          loot_item_id,
          raid_tier_id: lootItem.raid_tier_id,
          awarded_date: toDateString(new Date()),
          awarded_by: user.id,
          notes: reason || 'Obtained outside of raid',
        })
    }

    // Audit log
    await logAudit({
      supabase: serviceSupabase,
      guildId: guild_id,
      tableName: 'loot_submission_items',
      recordId: submission_id,
      action: 'DELETE',
      userId: user.id,
      oldData: {
        item_name: lootItem?.name || 'Unknown',
        wowhead_id: lootItem?.wowhead_id,
        character_name: character?.name || 'Unknown',
        character_id: submission.character_id,
        ranks: itemRows.map(r => r.rank),
        reason: reason || null,
        already_obtained: !!already_obtained,
        removed_by_owner: isOwner,
      },
    })

    // Analytics
    await trackEvent({
      event: 'loot_item_removed_from_list',
      userId: user.id,
      properties: {
        guild_id,
        submission_id,
        loot_item_id,
        item_name: lootItem?.name,
        character_name: character?.name,
        already_obtained: !!already_obtained,
        removed_by: isOwner ? 'owner' : 'officer',
      },
    })

    return NextResponse.json({
      success: true,
      item_name: lootItem?.name || 'Unknown',
      ranks_removed: itemRows.map(r => r.rank),
    })
  } catch (error) {
    console.error('Error in remove-item:', error)
    trackApiError('unknown', 'POST /api/loot-submissions/remove-item', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

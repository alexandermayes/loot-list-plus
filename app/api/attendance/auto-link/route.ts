import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyPermission } from '@/utils/server-roles'
import { logAudit } from '@/utils/audit/log'

/**
 * POST /api/attendance/auto-link
 *
 * Reconcile unlinked attendance records (character_id IS NULL) by matching
 * character_name against guild members and aliases. Links matching records
 * by setting character_id/user_id, or deletes duplicates if a linked record
 * already exists for that (raid_event_id, character_id) pair.
 *
 * Body: { guild_id: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { guild_id } = body

    if (!guild_id) {
      return NextResponse.json({ error: 'guild_id is required' }, { status: 400 })
    }

    const serviceSupabase = createServiceRoleClient()

    const { hasPermission, error: permError } = await verifyPermission(serviceSupabase, user.id, guild_id, 'manage_attendance')
    if (!hasPermission) {
      return NextResponse.json({ error: permError || 'Insufficient permissions' }, { status: 403 })
    }

    // Fetch guild members: character_id, user_id, character name
    const { data: memberships } = await serviceSupabase
      .from('character_guild_memberships')
      .select('character_id, characters(name, user_id)')
      .eq('guild_id', guild_id)
      .eq('is_active', true)

    if (!memberships || memberships.length === 0) {
      return NextResponse.json({ linked: 0, merged: 0 })
    }

    // Build name -> { character_id, user_id } lookup (case-insensitive)
    const nameLookup = new Map<string, { character_id: string; user_id: string }>()
    for (const m of memberships) {
      const char = m.characters as unknown as { name: string; user_id: string } | null
      if (char?.name) {
        nameLookup.set(char.name.toLowerCase(), {
          character_id: m.character_id,
          user_id: char.user_id,
        })
      }
    }

    // Add character aliases to the lookup
    const { data: aliases } = await serviceSupabase
      .from('character_aliases')
      .select('alias_name, character_id')
      .eq('guild_id', guild_id)

    if (aliases) {
      for (const alias of aliases) {
        if (!nameLookup.has(alias.alias_name.toLowerCase())) {
          // Find the user_id for this character
          const membership = memberships.find(m => m.character_id === alias.character_id)
          const char = membership?.characters as unknown as { user_id: string } | null
          if (char?.user_id) {
            nameLookup.set(alias.alias_name.toLowerCase(), {
              character_id: alias.character_id,
              user_id: char.user_id,
            })
          }
        }
      }
    }

    // Fetch all unlinked attendance records for this guild's raids
    const { data: raidEvents } = await serviceSupabase
      .from('raid_events')
      .select('id')
      .eq('guild_id', guild_id)

    if (!raidEvents || raidEvents.length === 0) {
      return NextResponse.json({ linked: 0, merged: 0 })
    }

    const raidEventIds = raidEvents.map(r => r.id)

    const { data: unlinkedRecords } = await serviceSupabase
      .from('attendance_records')
      .select('id, raid_event_id, character_name')
      .is('character_id', null)
      .in('raid_event_id', raidEventIds)

    if (!unlinkedRecords || unlinkedRecords.length === 0) {
      return NextResponse.json({ linked: 0, merged: 0 })
    }

    // Find which unlinked records match a guild member
    const toLink: { id: string; raid_event_id: string; character_id: string; user_id: string }[] = []
    for (const record of unlinkedRecords) {
      if (!record.character_name) continue
      const match = nameLookup.get(record.character_name.toLowerCase())
      if (match) {
        toLink.push({
          id: record.id,
          raid_event_id: record.raid_event_id,
          character_id: match.character_id,
          user_id: match.user_id,
        })
      }
    }

    if (toLink.length === 0) {
      return NextResponse.json({ linked: 0, merged: 0 })
    }

    // Check which (raid_event_id, character_id) pairs already have linked records
    // to avoid unique constraint violations
    const characterIdsToCheck = [...new Set(toLink.map(r => r.character_id))]
    const raidIdsToCheck = [...new Set(toLink.map(r => r.raid_event_id))]

    const { data: existingLinked } = await serviceSupabase
      .from('attendance_records')
      .select('raid_event_id, character_id')
      .in('character_id', characterIdsToCheck)
      .in('raid_event_id', raidIdsToCheck)

    const existingPairs = new Set(
      (existingLinked || []).map(r => `${r.raid_event_id}:${r.character_id}`)
    )

    // Partition into link (update) vs merge (delete duplicate)
    const updateIds: { id: string; character_id: string; user_id: string }[] = []
    const deleteIds: string[] = []

    for (const record of toLink) {
      const pairKey = `${record.raid_event_id}:${record.character_id}`
      if (existingPairs.has(pairKey)) {
        // A linked record already exists — delete the unlinked duplicate
        deleteIds.push(record.id)
      } else {
        // No linked record — update this one to link it
        updateIds.push({
          id: record.id,
          character_id: record.character_id,
          user_id: record.user_id,
        })
        // Mark as existing so subsequent records for the same pair get merged
        existingPairs.add(pairKey)
      }
    }

    // Execute updates (one per record since each has different character_id)
    let linked = 0
    for (const update of updateIds) {
      const { error } = await serviceSupabase
        .from('attendance_records')
        .update({
          character_id: update.character_id,
          user_id: update.user_id,
          character_name: null,
        })
        .eq('id', update.id)

      if (!error) linked++
    }

    // Execute deletes
    let merged = 0
    if (deleteIds.length > 0) {
      const { error } = await serviceSupabase
        .from('attendance_records')
        .delete()
        .in('id', deleteIds)

      if (!error) merged = deleteIds.length
    }

    if (linked > 0 || merged > 0) {
      logAudit({
        supabase: serviceSupabase,
        guildId: guild_id,
        tableName: 'attendance_records',
        recordId: guild_id,
        action: 'UPDATE',
        userId: user.id,
        newData: { action: 'auto-link', linked, merged },
      })
    }

    return NextResponse.json({ linked, merged })
  } catch (error) {
    console.error('Error in POST /api/attendance/auto-link:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

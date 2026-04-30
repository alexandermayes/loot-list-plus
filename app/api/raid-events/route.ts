import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyPermission } from '@/utils/server-roles'

interface RaidEventInput {
  guild_id: string
  raid_tier_id: string
  raid_date: string
  notes: string | null
  is_skipped: boolean
  skip_reason: string | null
  raid_team_id?: string | null
}

/**
 * POST /api/raid-events
 * Bulk create raid events. Uses service role to bypass RLS.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { guild_id, events } = body as { guild_id: string; events: RaidEventInput[] }

    if (!guild_id || !events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ error: 'guild_id and events array are required' }, { status: 400 })
    }

    const serviceSupabase = createServiceRoleClient()

    const { hasPermission } = await verifyPermission(serviceSupabase, user.id, guild_id, 'manage_attendance')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Officers only' }, { status: 403 })
    }

    const { data, error } = await serviceSupabase
      .from('raid_events')
      .insert(events)
      .select('id, raid_date')

    if (error) {
      console.error('Failed to create raid events:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, events: data })
  } catch (error) {
    console.error('Error in POST /api/raid-events:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

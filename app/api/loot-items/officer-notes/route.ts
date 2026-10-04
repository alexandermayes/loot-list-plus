import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyPermission } from '@/utils/server-roles'
import { trackApiError } from '@/utils/analytics/server'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 1000

/**
 * GET /api/loot-items/officer-notes
 *
 * Officer notes on loot items are returned only through this route, after
 * the same Manage loot permission check the PATCH /api/loot-items writer
 * uses, and only for the caller's guild's expansion. No other reader of
 * loot_items selects this column.
 *
 * Query params: guild_id, expansion_id (both required).
 * Response: { notes: Record<loot_item_id, note_text> }
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const guildId = searchParams.get('guild_id')
    const expansionId = searchParams.get('expansion_id')

    if (!guildId || !expansionId) {
      return NextResponse.json({ error: 'guild_id and expansion_id are required' }, { status: 400 })
    }

    const serviceSupabase = createServiceRoleClient()

    const { hasPermission, error: permError } = await verifyPermission(serviceSupabase, user.id, guildId, 'manage_loot')
    if (!hasPermission) {
      return NextResponse.json({ error: permError || 'Insufficient permissions' }, { status: 403 })
    }

    const { data: expansion, error: expansionError } = await serviceSupabase
      .from('expansions')
      .select('id')
      .eq('id', expansionId)
      .eq('guild_id', guildId)
      .maybeSingle()

    if (expansionError) {
      throw new Error(`Failed to verify expansion: ${expansionError.message}`)
    }
    if (!expansion) {
      return NextResponse.json({ error: 'Expansion not found in this guild' }, { status: 404 })
    }

    const { data: raidTiers, error: raidTiersError } = await serviceSupabase
      .from('raid_tiers')
      .select('id')
      .eq('expansion_id', expansionId)

    if (raidTiersError) {
      throw new Error(`Failed to load raid tiers: ${raidTiersError.message}`)
    }
    if (!raidTiers || raidTiers.length === 0) {
      return NextResponse.json(
        { notes: {} },
        { headers: { 'Cache-Control': 'private, no-store' } }
      )
    }

    const tierIds = raidTiers.map((tier: { id: string }) => tier.id)

    const notes: Record<string, string> = {}
    let start = 0
    for (;;) {
      const { data, error } = await serviceSupabase
        .from('loot_items')
        .select('id, officer_notes')
        .in('raid_tier_id', tierIds)
        .not('officer_notes', 'is', null)
        .order('id', { ascending: true })
        .range(start, start + PAGE_SIZE - 1)

      if (error) {
        throw new Error(`Failed to load officer notes: ${error.message}`)
      }

      const page = (data ?? []) as Array<{ id: string; officer_notes: string | null }>
      for (const item of page) {
        if (item.officer_notes && item.officer_notes.trim() !== '') {
          notes[item.id] = item.officer_notes
        }
      }

      if (page.length < PAGE_SIZE) break
      start += PAGE_SIZE
    }

    return NextResponse.json(
      { notes },
      { headers: { 'Cache-Control': 'private, no-store' } }
    )
  } catch (error) {
    console.error('Error in GET /api/loot-items/officer-notes:', error)
    trackApiError('unknown', 'GET /api/loot-items/officer-notes', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

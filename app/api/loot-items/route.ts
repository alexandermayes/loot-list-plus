import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyPermission } from '@/utils/server-roles'
import { logAudit } from '@/utils/audit/log'
import { trackApiError } from '@/utils/analytics/server'
import {
  fetchLootItemsCharacter,
  fetchFilteredLootItems,
  resolveTierIdsForPhases,
} from '@/lib/loot-items-query'

export const dynamic = 'force-dynamic'

// GET - Fetch loot items for a raid tier, filtered by character spec
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const tierId = searchParams.get('tier_id')
    const phase = searchParams.get('phase')
    const phasesParam = searchParams.get('phases') // comma-separated for merged groups
    const expansionId = searchParams.get('expansion_id')
    const characterId = searchParams.get('character_id')
    const guildId = searchParams.get('guild_id')

    // Support tier_id (legacy), phase+expansion_id, or phases+expansion_id (merged groups)
    if (!characterId) {
      return NextResponse.json({ error: 'character_id is required' }, { status: 400 })
    }
    if (!tierId && !phase && !phasesParam) {
      return NextResponse.json({ error: 'tier_id, phase, or phases parameter is required' }, { status: 400 })
    }
    if ((phase || phasesParam) && !expansionId) {
      return NextResponse.json({ error: 'expansion_id is required with phase/phases' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Fetch + verify the character via the shared helper. The helper only
    // returns the fields needed for filtering, so we re-verify ownership
    // against the raw characters table for user_id security.
    const { data: ownerCheck, error: charError } = await supabase
      .from('characters')
      .select('user_id')
      .eq('id', characterId)
      .single()

    if (charError || !ownerCheck) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 })
    }
    if (ownerCheck.user_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized for this character' }, { status: 403 })
    }

    const character = await fetchLootItemsCharacter(supabase, characterId)
    if (!character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 })
    }

    // Resolve the set of raid tier IDs to query.
    let tierIds: string[] = []

    if (tierId) {
      // Legacy single-tier query.
      tierIds = [tierId]
    } else if ((phase || phasesParam) && expansionId) {
      // Parse phase values (single or comma-separated).
      let phaseValues: number[] = []

      if (phasesParam) {
        phaseValues = phasesParam
          .split(',')
          .map((p) => parseInt(p.trim(), 10))
          .filter((p) => !isNaN(p) && p >= 1 && p <= 10)
      } else if (phase) {
        const parsedPhase = parseInt(phase, 10)
        if (isNaN(parsedPhase) || parsedPhase < 1 || parsedPhase > 10) {
          return NextResponse.json({ error: 'Invalid phase value (must be 1-10)' }, { status: 400 })
        }
        phaseValues = [parsedPhase]
      }

      if (phaseValues.length === 0) {
        return NextResponse.json({ error: 'Invalid phases parameter' }, { status: 400 })
      }

      const resolved = await resolveTierIdsForPhases(supabase, expansionId, phaseValues)
      if (resolved === null) {
        return NextResponse.json({ error: 'Invalid phases parameter' }, { status: 400 })
      }
      tierIds = resolved

      if (tierIds.length === 0) {
        return NextResponse.json({ items: [] })
      }
    }

    const enrichedItems = await fetchFilteredLootItems(supabase, character, tierIds)

    return NextResponse.json(
      { items: enrichedItems },
      {
        headers: {
          // Spec-filtered loot list for a character. Stable until admins edit
          // loot_items or the character changes spec. 60s browser cache keeps
          // back-nav instant; SWR window absorbs the rare officer edit.
          'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
        },
      }
    )
  } catch (error) {
    console.error('Error in GET /api/loot-items:', error)
    trackApiError('unknown', 'GET /api/loot-items', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/loot-items
 *
 * Update loot item properties. Uses service role to bypass RLS
 * after verifying officer permissions.
 *
 * Body: {
 *   guild_id: string,
 *   item_id: string,
 *   updates: {
 *     is_available?: boolean,
 *     is_loot_council?: boolean,
 *     classification?: string,
 *     allocation_cost?: number,
 *     officer_notes?: string | null,
 *     roles?: string[],
 *   }
 * }
 */
export async function PATCH(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { guild_id, item_id, updates } = body

    if (!guild_id || !item_id || !updates) {
      return NextResponse.json({ error: 'guild_id, item_id, and updates are required' }, { status: 400 })
    }

    const serviceSupabase = createServiceRoleClient()

    const { hasPermission, error: permError } = await verifyPermission(serviceSupabase, user.id, guild_id, 'manage_loot')
    if (!hasPermission) {
      return NextResponse.json({ error: permError || 'Insufficient permissions' }, { status: 403 })
    }

    // Allowlist of updatable fields
    const allowedFields = ['is_available', 'is_loot_council', 'classification', 'allocation_cost', 'officer_notes', 'roles']
    const sanitized: Record<string, unknown> = {}
    for (const key of allowedFields) {
      if (key in updates) {
        sanitized[key] = updates[key]
      }
    }

    if (Object.keys(sanitized).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // Verify the item belongs to this guild (loot_items → raid_tiers → expansions → guild)
    const { data: item } = await serviceSupabase
      .from('loot_items')
      .select('id, raid_tier_id')
      .eq('id', item_id)
      .single()

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    if (item.raid_tier_id) {
      const { data: tier } = await serviceSupabase
        .from('raid_tiers')
        .select('expansion_id')
        .eq('id', item.raid_tier_id)
        .single()

      if (tier?.expansion_id) {
        const { data: expansion } = await serviceSupabase
          .from('expansions')
          .select('guild_id')
          .eq('id', tier.expansion_id)
          .single()

        if (expansion && expansion.guild_id !== guild_id) {
          return NextResponse.json({ error: 'Item not found in this guild' }, { status: 404 })
        }
      }
    }

    const { data, error } = await serviceSupabase
      .from('loot_items')
      .update(sanitized)
      .eq('id', item_id)
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    logAudit({
      supabase: serviceSupabase,
      guildId: guild_id,
      tableName: 'loot_items',
      recordId: item_id,
      action: 'UPDATE',
      userId: user.id,
      newData: sanitized,
    })

    return NextResponse.json({ success: true, item: data?.[0] })
  } catch (error) {
    console.error('Error in PATCH /api/loot-items:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

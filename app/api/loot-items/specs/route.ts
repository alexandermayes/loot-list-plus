import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyPermission } from '@/utils/server-roles'
import { logAudit } from '@/utils/audit/log'
import { trackApiError } from '@/utils/analytics/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/loot-items/specs
 *
 * Add/remove primary or secondary spec assignments on a loot item.
 * Routes through service role after verifying `manage_loot` permission so
 * officers with custom role names (where the table RLS hardcodes 'Officer' /
 * 'Guild Master') don't silently fail. See GH #60.
 *
 * Body: {
 *   guild_id: string,
 *   item_id: string,
 *   add?: Array<{ class_id: string; spec_id: string; spec_type: 'primary' | 'secondary' }>,
 *   remove?: Array<{ spec_id: string; spec_type: 'primary' | 'secondary' }>,
 *   remove_all?: { spec_type: 'primary' | 'secondary' },
 * }
 *
 * Operations apply in order: remove_all → remove → add. The add path uses
 * upsert(ignoreDuplicates) so concurrent edits don't fail with 23505.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { guild_id, item_id, add, remove, remove_all } = body as {
      guild_id?: string
      item_id?: string
      add?: Array<{ class_id: string; spec_id: string; spec_type: 'primary' | 'secondary' }>
      remove?: Array<{ spec_id: string; spec_type: 'primary' | 'secondary' }>
      remove_all?: { spec_type: 'primary' | 'secondary' }
    }

    if (!guild_id || !item_id) {
      return NextResponse.json({ error: 'guild_id and item_id are required' }, { status: 400 })
    }
    if (!add?.length && !remove?.length && !remove_all) {
      return NextResponse.json({ error: 'No operation specified' }, { status: 400 })
    }

    const serviceSupabase = createServiceRoleClient()

    const { hasPermission, error: permError } = await verifyPermission(
      serviceSupabase,
      user.id,
      guild_id,
      'manage_loot',
    )
    if (!hasPermission) {
      return NextResponse.json({ error: permError || 'Insufficient permissions' }, { status: 403 })
    }

    // Verify the item exists and belongs to this guild (loot_items → raid_tiers → expansions → guild)
    const { data: item, error: itemErr } = await serviceSupabase
      .from('loot_items')
      .select('id, raid_tier_id')
      .eq('id', item_id)
      .single()

    if (itemErr || !item) {
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

    // remove_all: clear every row of one spec_type for this item
    if (remove_all?.spec_type) {
      if (remove_all.spec_type !== 'primary' && remove_all.spec_type !== 'secondary') {
        return NextResponse.json({ error: "spec_type must be 'primary' or 'secondary'" }, { status: 400 })
      }
      const { error } = await serviceSupabase
        .from('loot_item_classes')
        .delete()
        .eq('loot_item_id', item_id)
        .eq('spec_type', remove_all.spec_type)
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // remove: delete each (spec_id, spec_type) row
    if (remove?.length) {
      const byType: Record<'primary' | 'secondary', string[]> = { primary: [], secondary: [] }
      for (const r of remove) {
        if (r.spec_type !== 'primary' && r.spec_type !== 'secondary') {
          return NextResponse.json({ error: "spec_type must be 'primary' or 'secondary'" }, { status: 400 })
        }
        if (!r.spec_id) {
          return NextResponse.json({ error: 'spec_id required on each remove entry' }, { status: 400 })
        }
        byType[r.spec_type].push(r.spec_id)
      }
      for (const t of ['primary', 'secondary'] as const) {
        if (!byType[t].length) continue
        const { error } = await serviceSupabase
          .from('loot_item_classes')
          .delete()
          .eq('loot_item_id', item_id)
          .eq('spec_type', t)
          .in('spec_id', byType[t])
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 })
        }
      }
    }

    // add: insert each row, swallowing duplicate-key errors
    if (add?.length) {
      const rows = add.map((a) => {
        if (a.spec_type !== 'primary' && a.spec_type !== 'secondary') {
          throw new Error("spec_type must be 'primary' or 'secondary'")
        }
        if (!a.class_id || !a.spec_id) {
          throw new Error('class_id and spec_id required on each add entry')
        }
        return {
          loot_item_id: item_id,
          class_id: a.class_id,
          spec_id: a.spec_id,
          spec_type: a.spec_type,
        }
      })
      const { error } = await serviceSupabase.from('loot_item_classes').insert(rows)
      // 23505 = unique_violation. Concurrent edits or retries can race —
      // the client treats this as a no-op success.
      if (error && error.code !== '23505') {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // Return the resulting row set so the client can sync state without a refetch
    const { data: current } = await serviceSupabase
      .from('loot_item_classes')
      .select('class_id, spec_id, spec_type')
      .eq('loot_item_id', item_id)

    logAudit({
      supabase: serviceSupabase,
      guildId: guild_id,
      tableName: 'loot_item_classes',
      recordId: item_id,
      action: 'UPDATE',
      userId: user.id,
      newData: { add, remove, remove_all },
    })

    return NextResponse.json({ success: true, specs: current ?? [] })
  } catch (error) {
    console.error('Error in POST /api/loot-items/specs:', error)
    trackApiError(
      'unknown',
      'POST /api/loot-items/specs',
      error instanceof Error ? error : new Error(String(error)),
    )
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}

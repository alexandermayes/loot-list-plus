import { NextRequest, NextResponse } from 'next/server'
import { createClient, getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyPermission } from '@/utils/server-roles'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_CHARACTER_IDS = 200
const NO_STORE = { 'Cache-Control': 'private, no-store' }

interface EquippedRow {
  character_id: string
  slot: string
  item_level: number | null
  imported_at: string | null
}

interface EquippedCharacterLevels {
  synced_at: string | null
  slots: Record<string, number | null>
}

/**
 * GET /api/guilds/[id]/equipped-item-levels?character_ids=a,b
 *
 * Equipped item level per slot for the guild's ranked characters, read by the
 * officer item candidate panel on the master sheet. Officers only (manage_loot).
 * The ids are filtered to active memberships of this guild on the service
 * role, then the rows are read through the RLS-scoped client so the policy
 * "Users can view equipped items for guild characters" stays the final
 * boundary even if the membership filter regresses (T-wpw-01). A failed read
 * answers 500, never an empty success (T-wpw-06).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: guildId } = await params
    const serviceSupabase = createServiceRoleClient()

    const verification = await verifyPermission(serviceSupabase, user.id, guildId, 'manage_loot')
    if (!verification.hasPermission) {
      return NextResponse.json({ error: 'Officers only' }, { status: 403 })
    }

    // T-wpw-05: UUID shape, dedupe and a hard cap before any query runs.
    const raw = request.nextUrl.searchParams.get('character_ids') ?? ''
    const characterIds = Array.from(new Set(raw.split(',').map(id => id.trim()).filter(Boolean)))
    if (characterIds.length === 0) {
      return NextResponse.json({ error: 'character_ids is required' }, { status: 400 })
    }
    if (characterIds.length > MAX_CHARACTER_IDS) {
      return NextResponse.json({ error: `At most ${MAX_CHARACTER_IDS} character_ids per request` }, { status: 400 })
    }
    if (characterIds.some(id => !UUID_RE.test(id))) {
      return NextResponse.json({ error: 'character_ids must be UUIDs' }, { status: 400 })
    }

    // Ids without an active membership in this guild are dropped here and never queried.
    const { data: memberships, error: membershipError } = await serviceSupabase
      .from('character_guild_memberships')
      .select('character_id')
      .eq('guild_id', guildId)
      .eq('is_active', true)
      .in('character_id', characterIds)

    if (membershipError) {
      console.error('Error reading memberships for equipped item levels:', membershipError)
      return NextResponse.json({ error: 'Failed to load equipped item levels' }, { status: 500 })
    }

    const activeIds = Array.from(new Set(
      ((memberships ?? []) as Array<{ character_id: string }>).map(m => m.character_id)
    ))
    const characters: Record<string, EquippedCharacterLevels> = {}
    if (activeIds.length === 0) {
      return NextResponse.json({ characters }, { headers: NO_STORE })
    }

    const supabase = await createClient()
    const { data: rows, error: rowsError } = await supabase
      .from('character_equipped_items')
      .select('character_id, slot, item_level, imported_at')
      .in('character_id', activeIds)

    if (rowsError) {
      console.error('Error reading equipped item levels:', rowsError)
      return NextResponse.json({ error: 'Failed to load equipped item levels' }, { status: 500 })
    }

    // synced_at is the newest imported_at across the character's rows.
    const newest = new Map<string, number>()
    for (const row of (rows ?? []) as EquippedRow[]) {
      const entry = characters[row.character_id] ?? (characters[row.character_id] = { synced_at: null, slots: {} })
      entry.slots[row.slot] = row.item_level
      if (!row.imported_at) continue
      const at = Date.parse(row.imported_at)
      if (Number.isNaN(at) || at <= (newest.get(row.character_id) ?? Number.NEGATIVE_INFINITY)) continue
      newest.set(row.character_id, at)
      entry.synced_at = row.imported_at
    }

    return NextResponse.json({ characters }, { headers: NO_STORE })
  } catch (error) {
    console.error('Error in GET /api/guilds/[id]/equipped-item-levels:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

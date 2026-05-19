import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyOfficerPermissions } from '@/utils/server-roles'
import { logAudit } from '@/utils/audit/log'
import { trackApiError } from '@/utils/analytics/server'

const VALID_KINDS = new Set(['gold', 'materials', 'consumables', 'other'])
const POINTS_MIN = -1000
const POINTS_MAX = 1000
const NOTE_MAX = 500
const AMOUNT_TEXT_MAX = 200

type DonationKind = 'gold' | 'materials' | 'consumables' | 'other'

interface DonationPatchInput {
  points?: number
  kind?: DonationKind
  amount_text?: string | null
  note?: string | null
  awarded_at?: string
}

/**
 * Validate PATCH body. Only mutable fields are accepted — guild_id and
 * character_id are immutable on a donation record (delete + recreate to move).
 */
function validatePatchBody(body: unknown): DonationPatchInput | { error: string } {
  if (!body || typeof body !== 'object') return { error: 'Invalid body' }
  const b = body as Record<string, unknown>
  const out: DonationPatchInput = {}

  if (b.points !== undefined) {
    if (typeof b.points !== 'number' || !Number.isFinite(b.points)) {
      return { error: 'points must be a finite number' }
    }
    if (b.points < POINTS_MIN || b.points > POINTS_MAX) {
      return { error: `points must be between ${POINTS_MIN} and ${POINTS_MAX}` }
    }
    if (b.points === 0) return { error: 'points cannot be zero' }
    out.points = b.points
  }

  if (b.kind !== undefined) {
    if (typeof b.kind !== 'string' || !VALID_KINDS.has(b.kind)) {
      return { error: `kind must be one of: ${[...VALID_KINDS].join(', ')}` }
    }
    out.kind = b.kind as DonationKind
  }

  if (b.amount_text !== undefined) {
    out.amount_text = typeof b.amount_text === 'string'
      ? b.amount_text.slice(0, AMOUNT_TEXT_MAX).trim() || null
      : null
  }

  if (b.note !== undefined) {
    out.note = typeof b.note === 'string'
      ? b.note.slice(0, NOTE_MAX).trim() || null
      : null
  }

  if (b.awarded_at !== undefined) {
    if (typeof b.awarded_at !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(b.awarded_at)) {
      return { error: 'awarded_at must be YYYY-MM-DD' }
    }
    out.awarded_at = b.awarded_at
  }

  if (Object.keys(out).length === 0) {
    return { error: 'No fields to update' }
  }

  return out
}

// ─── PATCH ──────────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const body = await request.json().catch(() => null)
    const validated = validatePatchBody(body)
    if ('error' in validated) {
      return NextResponse.json({ error: validated.error }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Load existing row to capture old_data and verify officer scope.
    const { data: existing, error: loadError } = await supabase
      .from('donation_records')
      .select('*')
      .eq('id', id)
      .single()
    if (loadError || !existing) {
      return NextResponse.json({ error: 'Donation not found' }, { status: 404 })
    }
    const existingRow = existing as Record<string, unknown> & { guild_id: string }

    const perm = await verifyOfficerPermissions(supabase, user.id, existingRow.guild_id)
    if (!perm.hasPermission) {
      return NextResponse.json({ error: perm.error || 'Insufficient permissions' }, { status: 403 })
    }

    const { data: updated, error: updateError } = await supabase
      .from('donation_records')
      .update(validated as Record<string, unknown>)
      .eq('id', id)
      .select('*')
      .single()

    if (updateError || !updated) {
      console.error('Error updating donation:', updateError)
      return NextResponse.json({ error: 'Failed to update donation' }, { status: 500 })
    }

    logAudit({
      supabase,
      guildId: existingRow.guild_id,
      tableName: 'donation_records',
      recordId: id,
      action: 'UPDATE',
      userId: user.id,
      oldData: existingRow,
      newData: updated as Record<string, unknown>,
    })

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error('Error in PATCH /api/donations/[id]:', error)
    trackApiError('unknown', 'PATCH /api/donations/[id]', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── DELETE ─────────────────────────────────────────────────

/**
 * DELETE /api/donations/[id]
 *
 * Hard-delete a donation record. The audit log entry captures the deleted row
 * in `old_data` so the action remains reconstructible.
 *
 * For "revoke but keep history visible" semantics, the officer UI should
 * instead POST a new donation with negative `points` rather than calling this.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const supabase = createServiceRoleClient()

    const { data: existing, error: loadError } = await supabase
      .from('donation_records')
      .select('*')
      .eq('id', id)
      .single()
    if (loadError || !existing) {
      return NextResponse.json({ error: 'Donation not found' }, { status: 404 })
    }
    const existingRow = existing as Record<string, unknown> & { guild_id: string }

    const perm = await verifyOfficerPermissions(supabase, user.id, existingRow.guild_id)
    if (!perm.hasPermission) {
      return NextResponse.json({ error: perm.error || 'Insufficient permissions' }, { status: 403 })
    }

    const { error: deleteError } = await supabase
      .from('donation_records')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting donation:', deleteError)
      return NextResponse.json({ error: 'Failed to delete donation' }, { status: 500 })
    }

    logAudit({
      supabase,
      guildId: existingRow.guild_id,
      tableName: 'donation_records',
      recordId: id,
      action: 'DELETE',
      userId: user.id,
      oldData: existingRow,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/donations/[id]:', error)
    trackApiError('unknown', 'DELETE /api/donations/[id]', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyOfficerPermissions } from '@/utils/server-roles'

// PUT - Update a guild role (name, permissions) with membership propagation
export async function PUT(request: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { role_id, guild_id, name, permissions, old_name } = body

  if (!role_id || !guild_id || !name) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const serviceSupabase = createServiceRoleClient()

  // Verify officer permissions
  const permCheck = await verifyOfficerPermissions(serviceSupabase, user.id, guild_id)
  if (!permCheck.hasPermission) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  // Update the role
  const { error: updateError } = await serviceSupabase
    .from('guild_roles')
    .update({ name: name.trim(), permissions: permissions || [] })
    .eq('id', role_id)
    .eq('guild_id', guild_id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Propagate name change to all memberships with the old name
  if (old_name && old_name !== name.trim()) {
    const { error: propagateError } = await serviceSupabase
      .from('character_guild_memberships')
      .update({ role: name.trim() })
      .eq('guild_id', guild_id)
      .eq('role', old_name)
      .eq('is_active', true)

    if (propagateError) {
      console.error('[ROLE RENAME] Failed to propagate rename:', propagateError)
      // Don't fail the request — role was updated, propagation is best-effort
    }
  }

  return NextResponse.json({ success: true })
}

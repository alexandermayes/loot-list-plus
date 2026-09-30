import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyOfficerPermissions } from '@/utils/server-roles'

/**
 * PUT - Update a guild role (name, permissions) with membership propagation.
 *
 * A rename moves the role's holders from the role's stored name to the new
 * one, so it changes no one's position. The request body's old_name is not
 * used.
 */
export async function PUT(request: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { role_id, guild_id, name, permissions } = body

  if (!role_id || !guild_id || !name) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const serviceSupabase = createServiceRoleClient()

  // Verify officer permissions
  const permCheck = await verifyOfficerPermissions(serviceSupabase, user.id, guild_id)
  if (!permCheck.hasPermission) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  // Read the role's stored name, so the rename propagates from it
  const { data: storedRole, error: lookupError } = await serviceSupabase
    .from('guild_roles')
    .select('name')
    .eq('id', role_id)
    .eq('guild_id', guild_id)
    .maybeSingle()

  if (lookupError) {
    console.error('[ROLE RENAME] Failed to read the stored role:', lookupError)
    return NextResponse.json({ success: false }, { status: 500 })
  }

  const newName = name.trim()

  // Update the role
  const { error: updateError } = await serviceSupabase
    .from('guild_roles')
    .update({ name: newName, permissions: permissions || [] })
    .eq('id', role_id)
    .eq('guild_id', guild_id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Propagate the rename to the memberships that hold the stored name
  if (storedRole && storedRole.name !== newName) {
    const { error: propagateError } = await serviceSupabase
      .from('character_guild_memberships')
      .update({ role: newName })
      .eq('guild_id', guild_id)
      .eq('role', storedRole.name)
      .eq('is_active', true)

    if (propagateError) {
      console.error('[ROLE RENAME] Failed to propagate rename:', propagateError)
      // Don't fail the request — role was updated, propagation is best-effort
    }
  }

  return NextResponse.json({ success: true })
}

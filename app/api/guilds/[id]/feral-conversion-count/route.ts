import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyOfficerPermissions } from '@/utils/server-roles'

/**
 * GET /api/guilds/[id]/feral-conversion-count
 * Returns count of Feral Druid characters that haven't chosen between Feral/Guardian.
 * Officer-only.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: guildId } = await params
    const serviceSupabase = createServiceRoleClient()

    // Verify officer permissions
    const verification = await verifyOfficerPermissions(serviceSupabase, user.id, guildId)
    if (!verification.hasPermission) {
      return NextResponse.json({ error: 'Officers only' }, { status: 403 })
    }

    // Get Feral spec ID for Druid
    const { data: feralSpec } = await serviceSupabase
      .from('class_specs')
      .select('id, class_id')
      .eq('name', 'Feral')
      .single()

    if (!feralSpec) {
      return NextResponse.json({ count: 0 })
    }

    // Get the Druid class ID to ensure we only match Feral Druids
    const { data: druidClass } = await serviceSupabase
      .from('wow_classes')
      .select('id')
      .eq('name', 'Druid')
      .single()

    if (!druidClass) {
      return NextResponse.json({ count: 0 })
    }

    // Count characters in this guild that are Feral Druid and haven't dismissed the conversion
    const { count, error } = await serviceSupabase
      .from('characters')
      .select('id, character_guild_memberships!inner(guild_id)', { count: 'exact', head: true })
      .eq('spec_id', feralSpec.id)
      .eq('class_id', druidClass.id)
      .eq('guardian_conversion_dismissed', false)
      .eq('character_guild_memberships.guild_id', guildId)

    if (error) {
      console.error('Feral conversion count error:', error)
      return NextResponse.json({ error: 'Failed to get count' }, { status: 500 })
    }

    return NextResponse.json({ count: count || 0 })
  } catch (error) {
    console.error('Feral conversion count error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

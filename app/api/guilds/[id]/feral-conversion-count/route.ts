import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyOfficerPermissions } from '@/utils/server-roles'

/**
 * GET /api/guilds/[id]/feral-conversion-count
 * Returns Feral Druid characters that haven't chosen between Feral/Guardian.
 * Officer-only. Includes character details for the banner.
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

    // Get Feral and Guardian spec IDs
    const { data: specs } = await serviceSupabase
      .from('class_specs')
      .select('id, name, class_id')
      .in('name', ['Feral', 'Guardian'])

    const feralSpec = specs?.find(s => s.name === 'Feral')
    const guardianSpec = specs?.find(s => s.name === 'Guardian')

    if (!feralSpec || !guardianSpec) {
      return NextResponse.json({ count: 0, members: [], guardianSpecId: null })
    }

    // Get the Druid class ID to ensure we only match Feral Druids
    const { data: druidClass } = await serviceSupabase
      .from('wow_classes')
      .select('id, color_hex')
      .eq('name', 'Druid')
      .single()

    if (!druidClass) {
      return NextResponse.json({ count: 0, members: [], guardianSpecId: null })
    }

    // Fetch characters (not just count) so we can show names
    const { data: characters, error } = await serviceSupabase
      .from('characters')
      .select('id, name, character_guild_memberships!inner(guild_id)')
      .eq('spec_id', feralSpec.id)
      .eq('class_id', druidClass.id)
      .eq('guardian_conversion_dismissed', false)
      .eq('character_guild_memberships.guild_id', guildId)
      .order('name')

    if (error) {
      console.error('Feral conversion count error:', error)
      return NextResponse.json({ error: 'Failed to get count' }, { status: 500 })
    }

    const members = (characters || []).map(c => ({
      id: c.id,
      name: c.name,
    }))

    return NextResponse.json({
      count: members.length,
      members,
      guardianSpecId: guardianSpec.id,
      classColor: druidClass.color_hex,
    })
  } catch (error) {
    console.error('Feral conversion count error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/guilds/[id]/feral-conversion-count
 * Officer action: update a character's spec (Feral→Guardian or keep Feral) and dismiss the prompt.
 */
export async function POST(
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

    const body = await request.json()
    const { characterId, specId } = body

    if (!characterId) {
      return NextResponse.json({ error: 'characterId is required' }, { status: 400 })
    }

    // Verify the character is in this guild
    const { data: membership } = await serviceSupabase
      .from('character_guild_memberships')
      .select('id')
      .eq('character_id', characterId)
      .eq('guild_id', guildId)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Character not in this guild' }, { status: 404 })
    }

    // Build update: always dismiss, optionally change spec
    const updateData: { guardian_conversion_dismissed: boolean; updated_at: string; spec_id?: string } = {
      guardian_conversion_dismissed: true,
      updated_at: new Date().toISOString(),
    }
    if (specId) {
      updateData.spec_id = specId
    }

    const { error } = await serviceSupabase
      .from('characters')
      .update(updateData)
      .eq('id', characterId)

    if (error) {
      console.error('Officer spec update error:', error)
      return NextResponse.json({ error: 'Failed to update character' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Officer spec update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

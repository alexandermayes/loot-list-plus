import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { isGuildCreator, verifyGuildMasterPermissions } from '@/utils/server-roles'

// PUT - Update guild basic info (name, realm, faction, discord_server_id)
// Only the Guild Master (creator) can update these settings
export async function PUT(request: NextRequest) {
  try {
    // Fast auth check using getSession (no network call)
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceSupabase = createServiceRoleClient()

    const body = await request.json()
    const { guild_id, name, realm, faction, discord_server_id, icon_url } = body

    if (!guild_id) {
      return NextResponse.json({ error: 'guild_id is required' }, { status: 400 })
    }

    // Check if user is the guild creator - only creators can modify guild info
    const isCreator = await isGuildCreator(serviceSupabase, user.id, guild_id)

    if (!isCreator) {
      // Fall back to checking Guild Master position for backwards compatibility
      const gmCheck = await verifyGuildMasterPermissions(serviceSupabase, user.id, guild_id)
      if (!gmCheck.hasPermission) {
        return NextResponse.json(
          { error: 'Only the guild owner can modify guild information' },
          { status: 403 }
        )
      }
    }

    // Build update object with only provided fields
    const updateData: Record<string, any> = {}
    if (name !== undefined) updateData.name = name.trim()
    if (realm !== undefined) updateData.realm = realm?.trim() || null
    if (faction !== undefined) updateData.faction = faction
    if (discord_server_id !== undefined) updateData.discord_server_id = discord_server_id?.trim() || null
    if (icon_url !== undefined) updateData.icon_url = icon_url || null

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    // Update guild using service role (bypasses RLS)
    const { error: updateError } = await serviceSupabase
      .from('guilds')
      .update(updateData)
      .eq('id', guild_id)

    if (updateError) {
      console.error('Error updating guild info:', updateError)
      return NextResponse.json({ error: 'Failed to update guild information' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in PUT /api/guilds/info:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

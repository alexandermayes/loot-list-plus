import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyPermission } from '@/utils/server-roles'

// POST - Bulk upsert character aliases
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceSupabase = createServiceRoleClient()

    const body = await request.json()
    const { guild_id, aliases } = body

    if (!guild_id) {
      return NextResponse.json({ error: 'Guild ID is required' }, { status: 400 })
    }

    if (!aliases || !Array.isArray(aliases) || aliases.length === 0) {
      return NextResponse.json({ error: 'Aliases array is required' }, { status: 400 })
    }

    // Verify officer permissions
    const verification = await verifyPermission(serviceSupabase, user.id, guild_id, 'manage_members')
    if (!verification.hasPermission) {
      return NextResponse.json({ error: 'Only officers can manage aliases' }, { status: 403 })
    }

    // Normalize alias names to lowercase and build upsert data
    const upsertData = aliases.map((a: { alias_name: string; character_id: string }) => ({
      guild_id,
      alias_name: a.alias_name.toLowerCase().trim(),
      character_id: a.character_id,
    }))

    const { data, error } = await serviceSupabase
      .from('character_aliases')
      .upsert(upsertData, { onConflict: 'guild_id,alias_name' })
      .select()

    if (error) {
      console.error('Character alias upsert error:', error)
      return NextResponse.json({ error: 'Failed to save aliases' }, { status: 500 })
    }

    return NextResponse.json({ aliases: data })
  } catch (error) {
    console.error('Character aliases error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'

// List of user IDs that are allowed to perform super-admin operations
// LOW-05: Filter empty strings and log warning if not configured
const SUPER_ADMIN_IDS = process.env.SUPER_ADMIN_IDS?.split(',').filter(Boolean) || []

if (SUPER_ADMIN_IDS.length === 0 && process.env.NODE_ENV === 'production') {
  console.warn(
    '[SECURITY] No SUPER_ADMIN_IDS configured. ' +
    'Admin endpoints will only work in development mode.'
  )
}

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Require authentication
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // SECURITY: Only allow in development OR if user is a super-admin
    const isDevelopment = process.env.NODE_ENV === 'development'
    const isSuperAdmin = SUPER_ADMIN_IDS.includes(user.id)

    if (!isDevelopment && !isSuperAdmin) {
      return NextResponse.json(
        { error: 'This operation is only allowed in development or by super-admins' },
        { status: 403 }
      )
    }

    const supabase = createAdminClient()

    // Check for guild name to keep
    let keepGuildName: string | null = null
    let keepGuildId: string | null = null

    try {
      const body = await request.json()
      keepGuildName = body.keep_guild_name || null
    } catch {
      // No body provided, delete all
    }

    // If keeping a guild, find its ID first
    if (keepGuildName) {
      const { data: guildToKeep } = await supabase
        .from('guilds')
        .select('id')
        .ilike('name', keepGuildName)
        .single()

      if (guildToKeep) {
        keepGuildId = guildToKeep.id
      }
    }

    // Build the delete query for guild members
    let membersQuery = supabase
      .from('guild_members')
      .delete()

    if (keepGuildId) {
      membersQuery = membersQuery.neq('guild_id', keepGuildId)
    } else {
      membersQuery = membersQuery.neq('id', '00000000-0000-0000-0000-000000000000')
    }

    const { error: membersError } = await membersQuery

    if (membersError) {
      console.error('Error deleting guild members:', membersError)
      return NextResponse.json({ error: 'Couldn\'t delete guild members. Try again.' }, { status: 500 })
    }

    // Delete character guild memberships
    let charMembersQuery = supabase
      .from('character_guild_memberships')
      .delete()

    if (keepGuildId) {
      charMembersQuery = charMembersQuery.neq('guild_id', keepGuildId)
    } else {
      charMembersQuery = charMembersQuery.neq('id', '00000000-0000-0000-0000-000000000000')
    }

    const { error: charMembersError } = await charMembersQuery

    if (charMembersError) {
      console.error('Error deleting character guild memberships:', charMembersError)
      // Not critical, continue
    }

    // Delete invite codes
    let invitesQuery = supabase
      .from('guild_invite_codes')
      .delete()

    if (keepGuildId) {
      invitesQuery = invitesQuery.neq('guild_id', keepGuildId)
    } else {
      invitesQuery = invitesQuery.neq('id', '00000000-0000-0000-0000-000000000000')
    }

    const { error: invitesError } = await invitesQuery

    if (invitesError) {
      console.error('Error deleting invite codes:', invitesError)
      // Not critical, continue
    }

    // Delete active guild entries
    let activeQuery = supabase
      .from('user_active_guilds')
      .delete()

    if (keepGuildId) {
      activeQuery = activeQuery.neq('active_guild_id', keepGuildId)
    } else {
      activeQuery = activeQuery.neq('user_id', '00000000-0000-0000-0000-000000000000')
    }

    const { error: activeError } = await activeQuery

    if (activeError) {
      console.error('Error deleting active guilds:', activeError)
      // Not critical, continue
    }

    // Finally, delete guilds
    let guildsQuery = supabase
      .from('guilds')
      .delete()

    if (keepGuildId) {
      guildsQuery = guildsQuery.neq('id', keepGuildId)
    } else {
      guildsQuery = guildsQuery.neq('id', '00000000-0000-0000-0000-000000000000')
    }

    const { error: guildsError } = await guildsQuery

    if (guildsError) {
      console.error('Error deleting guilds:', guildsError)
      return NextResponse.json({ error: 'Couldn\'t delete guilds. Try again.' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: keepGuildId
        ? `All guilds except "${keepGuildName}" have been deleted`
        : 'All guilds, members, and related data have been deleted',
      kept_guild: keepGuildId ? { id: keepGuildId, name: keepGuildName } : null
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

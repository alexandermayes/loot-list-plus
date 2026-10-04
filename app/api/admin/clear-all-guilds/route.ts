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

    // OD-3 A: refuse the whole bulk delete while any guild it would delete
    // still has a live Premium subscription. The normal delete path
    // (DELETE /api/guilds, POST /api/guilds/delete) cancels a guild's
    // subscription before deleting it; this admin tool deletes guild rows
    // directly with the admin client and makes no Stripe call, so it must
    // not be the path that silently leaves a subscription billing for a
    // guild that no longer exists.
    let liveSubsQuery = supabase
      .from('guild_subscriptions')
      .select('guild_id')
      .not('stripe_subscription_id', 'is', null)
      .not('status', 'in', '(canceled,incomplete_expired)')

    if (keepGuildId) {
      liveSubsQuery = liveSubsQuery.neq('guild_id', keepGuildId)
    }

    const { data: liveSubs, error: liveSubsError } = await liveSubsQuery

    if (liveSubsError) {
      console.error('Error checking live Premium subscriptions:', liveSubsError)
      return NextResponse.json({ error: 'Couldn\'t delete guilds. Try again.' }, { status: 500 })
    }

    if (liveSubs && liveSubs.length > 0) {
      return NextResponse.json(
        {
          error: 'Some of these guilds still have a live Premium subscription. Delete them one at a time from Guild Settings, which cancels the subscription, then try again.',
          guild_ids: liveSubs.map((row) => row.guild_id),
        },
        { status: 409 }
      )
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

    // Clear active guild references in user_active_characters
    let activeQuery = supabase
      .from('user_active_characters')
      .update({ active_guild_id: null, updated_at: new Date().toISOString() })

    if (keepGuildId) {
      activeQuery = activeQuery.neq('active_guild_id', keepGuildId)
    } else {
      activeQuery = activeQuery.not('active_guild_id', 'is', null)
    }

    const { error: activeError } = await activeQuery

    if (activeError) {
      console.error('Error clearing active guilds:', activeError)
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

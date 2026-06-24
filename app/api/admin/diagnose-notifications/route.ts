import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyPermission } from '@/utils/server-roles'
import { roleHasPermission } from '@/domain/guild/roles'

/**
 * GET /api/admin/diagnose-notifications?guild_id=X
 *
 * Mirrors the lookup that /api/discord/notify-officers performs and reports
 * which members would be DM'd when a loot list is submitted. For each role
 * with manage_submissions and each member holding that role, it returns
 * whether a Discord ID is linked and where it came from. Discord IDs are
 * partially masked so the response is safe to share for debugging.
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    let guildId = searchParams.get('guild_id')

    const serviceSupabase = createServiceRoleClient()

    // If no guild_id is provided, find one for the caller by looking up an
    // active membership on one of their characters. Avoids needing the user
    // to dig through localStorage for a UUID.
    if (!guildId) {
      const { data: callerChars } = await serviceSupabase
        .from('characters')
        .select('id')
        .eq('user_id', user.id)

      const charIds = (callerChars || []).map((c: { id: string }) => c.id)
      if (charIds.length === 0) {
        return NextResponse.json({ error: 'No characters found for this user' }, { status: 404 })
      }

      const { data: guilds } = await serviceSupabase
        .from('character_guild_memberships')
        .select('guild_id, guilds(name)')
        .in('character_id', charIds)
        .eq('is_active', true)

      type GuildMembershipRow = { guild_id: string; guilds?: { name?: string } | null }
      const unique = [...new Map((guilds || []).map((g: GuildMembershipRow) => [g.guild_id, g])).values()]
      if (unique.length === 0) {
        return NextResponse.json({ error: 'No active guild memberships found' }, { status: 404 })
      }

      if (unique.length > 1) {
        return NextResponse.json({
          error: 'Multiple guilds found, specify ?guild_id=<id>',
          guilds: unique.map((g) => ({ guild_id: g.guild_id, name: g.guilds?.name })),
        }, { status: 400 })
      }

      guildId = unique[0].guild_id as string
    }

    const { hasPermission, error: permError } = await verifyPermission(serviceSupabase, user.id, guildId, 'manage_settings')
    if (!hasPermission) {
      return NextResponse.json({ error: permError || 'Officer permissions required' }, { status: 403 })
    }

    const { data: guildRoles } = await serviceSupabase
      .from('guild_roles')
      .select('name, position, permissions')
      .eq('guild_id', guildId)

    const allRoles = (guildRoles || []).map(r => ({
      name: r.name as string,
      position: (r.position ?? 0) as number,
      permissions: ((r.permissions ?? []) as string[]),
      notifies: roleHasPermission(r.position ?? 0, r.permissions ?? [], 'manage_submissions'),
    }))

    const notifiableRoleNames = allRoles.filter(r => r.notifies).map(r => r.name)
    const fellBackToDefaults = notifiableRoleNames.length === 0
    if (fellBackToDefaults) {
      notifiableRoleNames.push('Officer', 'Guild Master')
    }

    const { data: memberships } = await serviceSupabase
      .from('character_guild_memberships')
      .select(`
        role,
        characters!inner(id, name, user_id)
      `)
      .eq('guild_id', guildId)
      .in('role', notifiableRoleNames)
      .eq('is_active', true)

    type Membership = {
      role: string
      characters: { id: string; name: string; user_id: string } | null
    }
    const rows = (memberships || []) as unknown as Membership[]

    const userIds = [...new Set(rows.map(m => m.characters?.user_id).filter((id): id is string => Boolean(id)))]

    const discordByUser = new Map<string, { discord_id: string; source: 'preferences' | 'provider_id' }>()

    if (userIds.length > 0) {
      const { data: preferences } = await serviceSupabase
        .from('user_preferences')
        .select('user_id, discord_id')
        .in('user_id', userIds)

      for (const pref of preferences || []) {
        if (pref.discord_id) {
          discordByUser.set(pref.user_id, { discord_id: pref.discord_id, source: 'preferences' })
        }
      }

      const missing = userIds.filter(id => !discordByUser.has(id))
      if (missing.length > 0) {
        const results = await Promise.all(missing.map(id => serviceSupabase.auth.admin.getUserById(id)))
        for (const result of results) {
          const u = result.data?.user
          const providerId = u?.user_metadata?.provider_id
          if (u && providerId) {
            discordByUser.set(u.id, { discord_id: providerId, source: 'provider_id' })
          }
        }
      }
    }

    const recipients = rows.map(m => {
      const char = m.characters
      const linked = char ? discordByUser.get(char.user_id) : undefined
      return {
        character: char?.name ?? '(unknown)',
        user_id: char?.user_id ?? null,
        role: m.role,
        discord_id_masked: linked ? maskDiscordId(linked.discord_id) : null,
        discord_source: linked?.source ?? null,
        would_receive_dm: Boolean(linked) && char?.user_id !== user.id,
        excluded_reason: !char?.user_id
          ? 'missing user'
          : char.user_id === user.id
            ? 'caller is excluded from their own notification'
            : !linked
              ? 'no Discord ID linked in user_preferences or auth metadata'
              : null,
      }
    })

    return NextResponse.json({
      guild_id: guildId,
      caller_user_id: user.id,
      fell_back_to_default_role_names: fellBackToDefaults,
      notifiable_role_names: notifiableRoleNames,
      all_guild_roles: allRoles,
      recipient_count: recipients.filter(r => r.would_receive_dm).length,
      total_role_holders: recipients.length,
      recipients,
    })
  } catch (error) {
    console.error('Error in GET /api/admin/diagnose-notifications:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function maskDiscordId(id: string): string {
  if (id.length <= 6) return '***'
  return `${id.slice(0, 3)}***${id.slice(-3)}`
}

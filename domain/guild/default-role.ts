import { createServiceRoleClient } from '@/utils/supabase/service-role'

/**
 * Resolve the default role name for new members joining a guild.
 *
 * Looks up the guild's `guild_roles` table and returns the name of the
 * lowest-position role (the default member role). Falls back to 'Member'
 * if no custom roles exist.
 */
export async function getDefaultRoleName(guildId: string): Promise<string> {
  const serviceSupabase = createServiceRoleClient()

  const { data } = await serviceSupabase
    .from('guild_roles')
    .select('name, position')
    .eq('guild_id', guildId)
    .order('position', { ascending: true })
    .limit(1)

  if (data && data.length > 0) {
    return data[0].name
  }

  return 'Member'
}

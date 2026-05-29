import type { User } from '@supabase/supabase-js'
import type { PrefetchedGuildData } from '@/app/(app)/PrefetchProvider'
import type { Character, CharacterGuildMembership, Guild, GuildMember, GuildMembership } from './GuildContext'

export interface DerivedPrefetchState {
  user: User
  userCharacters: Character[]
  characterMemberships: CharacterGuildMembership[]
  userGuilds: GuildMembership[]
  activeCharacter: Character | null
  activeGuild: Guild | null
  activeMember: GuildMember | null
  rolePositionCache: Map<string, Map<string, number>>
  rolePermissionsCache: Map<string, Map<string, string[]>>
}

interface RawMembership {
  id: string
  character_id: string
  guild_id: string
  role: string
  is_active: boolean
  joined_at: string
  joined_via: string
  character: unknown
  guild: unknown
}

interface RawGuildRole {
  name: string
  position: number
  permissions?: string[]
}

interface RawGuildWithRoles {
  id: string
  guild_roles?: RawGuildRole[]
  [key: string]: unknown
}

interface RawCharacter {
  class?: unknown
  spec?: unknown
  [key: string]: unknown
}

const DEFAULT_ROLE_POSITIONS = new Map<string, number>([
  ['Guild Master', 100],
  ['Officer', 50],
  ['Member', 0],
])

/**
 * Mirrors the happy-path derivation from GuildContext.loadUserData() so the
 * state can be hydrated synchronously in useState initializers when the
 * server-side prefetched bundle is available.
 *
 * Returns null when prefetched.user is missing (the caller falls back to
 * the async loadUserData() flow). Edge cases that require additional
 * Supabase queries (stale active_guild_id pointing to a non-membership,
 * "joined guild but no character yet" pending state) also fall through —
 * the async loadUserData() picks them up after first render.
 */
export function deriveStateFromPrefetch(
  prefetched: PrefetchedGuildData | null,
): DerivedPrefetchState | null {
  if (!prefetched?.user) return null

  const user = {
    id: prefetched.user.id,
    email: prefetched.user.email,
  } as User

  const characters = (prefetched.characters ?? []) as Character[]
  const rawMemberships = (prefetched.memberships ?? []) as RawMembership[]
  const activePrefs = prefetched.activePreferences

  const rolePositionCache = new Map<string, Map<string, number>>()
  const rolePermissionsCache = new Map<string, Map<string, string[]>>()

  // Transform memberships: Supabase joins return arrays for many-to-one
  // relationships, so we normalize to single objects, and strip guild_roles
  // off the guild object after caching them.
  const characterMemberships: CharacterGuildMembership[] = rawMemberships.map((m) => {
    const char = (Array.isArray(m.character) ? m.character[0] : m.character) as RawCharacter | undefined
    const rawGuild = (Array.isArray(m.guild) ? m.guild[0] : m.guild) as RawGuildWithRoles | undefined

    if (rawGuild?.id && rawGuild.guild_roles && !rolePositionCache.has(rawGuild.id)) {
      const posMap = new Map<string, number>()
      const permMap = new Map<string, string[]>()
      for (const role of rawGuild.guild_roles) {
        posMap.set(role.name, role.position)
        permMap.set(role.name, role.permissions ?? [])
      }
      rolePositionCache.set(rawGuild.id, posMap)
      rolePermissionsCache.set(rawGuild.id, permMap)
    }

    const guildWithoutRoles = rawGuild ? { ...rawGuild } : null
    if (guildWithoutRoles) delete guildWithoutRoles.guild_roles

    const normalizedChar = char
      ? ({
          ...char,
          class: Array.isArray(char.class) ? char.class[0] : char.class,
          spec: Array.isArray(char.spec) ? char.spec[0] : char.spec,
        } as Character)
      : (char as unknown as Character)

    return {
      id: m.id,
      character_id: m.character_id,
      guild_id: m.guild_id,
      role: m.role,
      is_active: m.is_active,
      joined_at: m.joined_at,
      joined_via: m.joined_via,
      character: normalizedChar,
      guild: guildWithoutRoles as unknown as Guild,
    }
  })

  // Group by guild and keep the highest-role membership per guild for the
  // sidebar guild list.
  const guildMap = new Map<string, { guild: Guild; role: string; membership: CharacterGuildMembership }>()
  for (const m of characterMemberships) {
    if (!m.guild) continue
    const rolePositions = rolePositionCache.get(m.guild.id) ?? DEFAULT_ROLE_POSITIONS
    const positionOf = (roleName: string) =>
      rolePositions.get(roleName) ?? DEFAULT_ROLE_POSITIONS.get(roleName) ?? 0

    const existing = guildMap.get(m.guild.id)
    if (!existing) {
      guildMap.set(m.guild.id, { guild: m.guild, role: m.role, membership: m })
    } else if (positionOf(m.role) > positionOf(existing.role)) {
      existing.role = m.role
      existing.membership = m
    }
  }

  const userGuilds: GuildMembership[] = Array.from(guildMap.values()).map(({ guild, role, membership }) => ({
    guild,
    member: {
      id: membership.id,
      user_id: user.id,
      guild_id: guild.id,
      character_name: membership.character?.name ?? '',
      class_id: membership.character?.class_id ?? '',
      role,
      is_active: true,
      joined_at: membership.joined_at,
      joined_via: membership.joined_via,
    } as GuildMember,
    class: (membership.character?.class as { name: string; color_hex: string } | undefined) ?? {
      name: 'Unknown',
      color_hex: '#808080',
    },
  }))

  // Active character: stored preference, else first character.
  const activeCharacter: Character | null = activePrefs?.active_character_id
    ? characters.find((c) => c.id === activePrefs.active_character_id) ?? null
    : characters[0] ?? null

  // Active guild: stored preference if it matches a membership, else the
  // first membership's guild. Skip the stale-reference / pending-character
  // edge cases — async loadUserData picks those up.
  let activeGuild: Guild | null = null
  if (activePrefs?.active_guild_id) {
    const match = characterMemberships.find((m) => m.guild_id === activePrefs.active_guild_id)
    if (match?.guild) activeGuild = match.guild
  }
  if (!activeGuild && characterMemberships.length > 0 && characterMemberships[0].guild) {
    activeGuild = characterMemberships[0].guild
  }

  const activeMember: GuildMember | null = activeGuild
    ? userGuilds.find((g) => g.guild.id === activeGuild!.id)?.member ?? null
    : null

  return {
    user,
    userCharacters: characters,
    characterMemberships,
    userGuilds,
    activeCharacter,
    activeGuild,
    activeMember,
    rolePositionCache,
    rolePermissionsCache,
  }
}

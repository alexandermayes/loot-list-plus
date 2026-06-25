import { describe, it, expect } from 'vitest'
import { verifyPermission } from '../server-roles'

/**
 * Table-aware chainable Supabase mock.
 *
 * verifyPermission issues several queries against different tables, some
 * awaited directly on the builder (characters, character_guild_memberships,
 * guild_roles) and some terminated with .single() (guilds, via isGuildCreator).
 * The builder is thenable so `await sb.from(t).select().eq()` resolves to the
 * configured result for table `t`.
 */
function mockSupabase(tableResults: Record<string, { data: unknown; error?: unknown }>) {
  function builder(table: string) {
    const result = tableResults[table] ?? { data: null, error: null }
    const chain: Record<string, unknown> = {
      select: () => chain,
      eq: () => chain,
      in: () => chain,
      single: () => Promise.resolve(result),
      maybeSingle: () => Promise.resolve(result),
      then: (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve),
    }
    return chain
  }
  return { from: (table: string) => builder(table) } as unknown as Parameters<typeof verifyPermission>[0]
}

const USER = 'user-1'
const GUILD = 'guild-1'

// Common fixtures: user owns one character that is an active "Officer" member.
const officerMembership = {
  characters: { data: [{ id: 'char-1' }], error: null },
  character_guild_memberships: { data: [{ role: 'Officer' }], error: null },
  guilds: { data: { created_by: 'someone-else' }, error: null },
}

describe('verifyPermission — default-role position fallback (regression #111)', () => {
  it('grants an Officer when guild_roles is missing the Officer row', async () => {
    // guild_roles is populated but lacks the "Officer" row (e.g. never seeded).
    // Before the fix this resolved to position 0 -> 403. The DEFAULT_ROLES
    // fallback should resolve "Officer" to position 50 -> officer catch-all.
    const sb = mockSupabase({
      ...officerMembership,
      guild_roles: {
        data: [
          { name: 'Member', position: 0, permissions: [] },
          { name: 'Guild Master', position: 100, permissions: [] },
        ],
        error: null,
      },
    })

    const result = await verifyPermission(sb, USER, GUILD, 'manage_loot')

    expect(result.hasPermission).toBe(true)
    expect(result.position).toBe(50)
  })

  it('grants an Officer when guild_roles is empty (falls back to DEFAULT_ROLES)', async () => {
    const sb = mockSupabase({
      ...officerMembership,
      guild_roles: { data: [], error: null },
    })

    const result = await verifyPermission(sb, USER, GUILD, 'manage_loot')

    expect(result.hasPermission).toBe(true)
    expect(result.position).toBe(50)
  })

  it('grants an Officer when its guild_roles row exists', async () => {
    const sb = mockSupabase({
      ...officerMembership,
      guild_roles: {
        data: [{ name: 'Officer', position: 50, permissions: [] }],
        error: null,
      },
    })

    const result = await verifyPermission(sb, USER, GUILD, 'manage_loot')

    expect(result.hasPermission).toBe(true)
    expect(result.position).toBe(50)
  })

  it('denies a non-officer custom role with no matching guild_roles row and no grant', async () => {
    // A custom role name has no DEFAULT_ROLES fallback, so it stays at 0.
    const sb = mockSupabase({
      characters: { data: [{ id: 'char-1' }], error: null },
      character_guild_memberships: { data: [{ role: 'Recruit' }], error: null },
      guild_roles: { data: [{ name: 'Member', position: 0, permissions: [] }], error: null },
      guilds: { data: { created_by: 'someone-else' }, error: null },
    })

    const result = await verifyPermission(sb, USER, GUILD, 'manage_loot')

    expect(result.hasPermission).toBe(false)
    expect(result.position).toBe(0)
  })

  it('grants a sub-officer custom role that has the specific permission granted', async () => {
    const sb = mockSupabase({
      characters: { data: [{ id: 'char-1' }], error: null },
      character_guild_memberships: { data: [{ role: 'Loot Master' }], error: null },
      guild_roles: {
        data: [{ name: 'Loot Master', position: 10, permissions: ['manage_loot'] }],
        error: null,
      },
      guilds: { data: { created_by: 'someone-else' }, error: null },
    })

    const result = await verifyPermission(sb, USER, GUILD, 'manage_loot')

    expect(result.hasPermission).toBe(true)
  })

  it('denies a sub-officer role that lacks the specific permission', async () => {
    const sb = mockSupabase({
      characters: { data: [{ id: 'char-1' }], error: null },
      character_guild_memberships: { data: [{ role: 'Loot Master' }], error: null },
      guild_roles: {
        data: [{ name: 'Loot Master', position: 10, permissions: ['manage_attendance'] }],
        error: null,
      },
      guilds: { data: { created_by: 'someone-else' }, error: null },
    })

    const result = await verifyPermission(sb, USER, GUILD, 'manage_loot')

    expect(result.hasPermission).toBe(false)
  })

  it('grants the guild creator even when their role would not qualify', async () => {
    const sb = mockSupabase({
      characters: { data: [{ id: 'char-1' }], error: null },
      character_guild_memberships: { data: [{ role: 'Member' }], error: null },
      guild_roles: { data: [{ name: 'Member', position: 0, permissions: [] }], error: null },
      guilds: { data: { created_by: USER }, error: null },
    })

    const result = await verifyPermission(sb, USER, GUILD, 'manage_loot')

    expect(result.hasPermission).toBe(true)
  })
})

// @vitest-environment node
import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  GUILD_JOIN_GRANT_TTL_DAYS,
  recordGuildJoinGrant,
  resolveGuildJoinAccess,
  consumeGuildJoinGrant,
} from '../join-grants'

interface Call {
  table: string
  op: 'select' | 'update' | 'insert' | 'upsert' | 'delete'
  columns?: string
  payload?: unknown
  options?: unknown
  filters: Array<[string, string, unknown]>
  limit?: number
}

type Terminal = 'single' | 'maybeSingle' | 'then'
type Resolver = (call: Call, terminal: Terminal) => { data: unknown; error: unknown }

/**
 * Recording Supabase stand-in. Every chain records its table, operation,
 * payload, options and filters; `resolve` decides what each awaited chain
 * returns.
 */
function createFakeClient(resolve: Resolver) {
  const calls: Call[] = []
  function from(table: string) {
    const call: Call = { table, op: 'select', filters: [] }
    calls.push(call)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const builder: any = {
      select: (columns?: string) => {
        if (call.op === 'select') call.columns = columns
        return builder
      },
      update: (payload: unknown) => {
        call.op = 'update'
        call.payload = payload
        return builder
      },
      insert: (payload: unknown) => {
        call.op = 'insert'
        call.payload = payload
        return builder
      },
      upsert: (payload: unknown, options?: unknown) => {
        call.op = 'upsert'
        call.payload = payload
        call.options = options
        return builder
      },
      eq: (col: string, val: unknown) => {
        call.filters.push(['eq', col, val])
        return builder
      },
      neq: (col: string, val: unknown) => {
        call.filters.push(['neq', col, val])
        return builder
      },
      in: (col: string, val: unknown) => {
        call.filters.push(['in', col, val])
        return builder
      },
      is: (col: string, val: unknown) => {
        call.filters.push(['is', col, val])
        return builder
      },
      gt: (col: string, val: unknown) => {
        call.filters.push(['gt', col, val])
        return builder
      },
      limit: (n: number) => {
        call.limit = n
        return builder
      },
      maybeSingle: () => Promise.resolve(resolve(call, 'maybeSingle')),
      single: () => Promise.resolve(resolve(call, 'single')),
      then: (onResolve: (v: unknown) => unknown, onReject: (e: unknown) => unknown) =>
        Promise.resolve(resolve(call, 'then')).then(onResolve, onReject),
    }
    return builder
  }
  return { client: { from } as never, calls }
}

const USER = 'user-1'
const GUILD = 'guild-1'
const NOW = new Date('2026-09-30T12:00:00.000Z')
const OK = { data: null, error: null }

interface World {
  createdBy?: string | null
  guildMissing?: boolean
  characters?: string[]
  activeMembership?: boolean
  grant?: boolean
  failOn?: string
}

function world(w: World) {
  return createFakeClient((call) => {
    if (w.failOn === call.table) return { data: null, error: { message: 'lookup failed' } }
    if (call.table === 'guilds') {
      return { data: w.guildMissing ? null : { created_by: w.createdBy ?? 'someone-else' }, error: null }
    }
    if (call.table === 'characters') {
      return { data: (w.characters ?? []).map(id => ({ id })), error: null }
    }
    if (call.table === 'character_guild_memberships') {
      return { data: w.activeMembership ? [{ id: 'm-1' }] : [], error: null }
    }
    if (call.table === 'guild_join_grants') {
      return { data: w.grant ? { user_id: USER } : null, error: null }
    }
    return OK
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('recordGuildJoinGrant', () => {
  it('upserts one record per user and guild with a fresh window and no consumed_at', async () => {
    const fake = createFakeClient(() => OK)

    const result = await recordGuildJoinGrant(fake.client, {
      userId: USER,
      guildId: GUILD,
      source: 'invite_code',
      now: NOW,
    })

    expect(result).toEqual({ error: null })
    expect(fake.calls).toHaveLength(1)
    const expires = new Date(NOW.getTime() + GUILD_JOIN_GRANT_TTL_DAYS * 24 * 60 * 60 * 1000)
    expect(fake.calls[0]).toMatchObject({
      table: 'guild_join_grants',
      op: 'upsert',
      payload: {
        user_id: USER,
        guild_id: GUILD,
        source: 'invite_code',
        created_at: NOW.toISOString(),
        expires_at: expires.toISOString(),
        consumed_at: null,
      },
      options: { onConflict: 'user_id,guild_id' },
    })
  })

  it('uses a 30 day window', () => {
    expect(GUILD_JOIN_GRANT_TTL_DAYS).toBe(30)
  })

  it('returns the write error', async () => {
    const failure = { message: 'write failed' }
    const fake = createFakeClient(() => ({ data: null, error: failure }))

    const result = await recordGuildJoinGrant(fake.client, {
      userId: USER,
      guildId: GUILD,
      source: 'discord_verify',
    })

    expect(result).toEqual({ error: failure })
    expect(fake.calls[0].payload).toMatchObject({ source: 'discord_verify' })
  })
})

describe('resolveGuildJoinAccess', () => {
  it('allows the guild creator with no further lookups', async () => {
    const fake = world({ createdBy: USER })

    const access = await resolveGuildJoinAccess(fake.client, { userId: USER, guildId: GUILD, now: NOW })

    expect(access).toEqual({ allowed: true, via: 'creator' })
    expect(fake.calls.map(c => c.table)).toEqual(['guilds'])
    expect(fake.calls[0].filters).toEqual([['eq', 'id', GUILD]])
  })

  it('denies a guild that does not exist with no further lookups', async () => {
    const fake = world({ guildMissing: true, grant: true })

    const access = await resolveGuildJoinAccess(fake.client, { userId: USER, guildId: GUILD, now: NOW })

    expect(access).toEqual({ allowed: false })
    expect(fake.calls.map(c => c.table)).toEqual(['guilds'])
  })

  it('allows a user whose other character is an active member, excluding the given character', async () => {
    const fake = world({ characters: ['char-1', 'char-2'], activeMembership: true })

    const access = await resolveGuildJoinAccess(fake.client, {
      userId: USER,
      guildId: GUILD,
      excludeCharacterId: 'char-1',
      now: NOW,
    })

    expect(access).toEqual({ allowed: true, via: 'member' })
    expect(fake.calls.map(c => c.table)).toEqual(['guilds', 'characters', 'character_guild_memberships'])
    expect(fake.calls[1].filters).toEqual([['eq', 'user_id', USER]])
    const membership = fake.calls[2]
    expect(membership.filters).toContainEqual(['eq', 'guild_id', GUILD])
    expect(membership.filters).toContainEqual(['eq', 'is_active', true])
    expect(membership.filters).toContainEqual(['in', 'character_id', ['char-2']])
    expect(membership.filters).toContainEqual(['neq', 'character_id', 'char-1'])
    expect(membership.limit).toBe(1)
  })

  it('skips the membership lookup when the user has no character other than the excluded one', async () => {
    const fake = world({ characters: ['char-1'], activeMembership: true, grant: true })

    const access = await resolveGuildJoinAccess(fake.client, {
      userId: USER,
      guildId: GUILD,
      excludeCharacterId: 'char-1',
      now: NOW,
    })

    expect(access).toEqual({ allowed: true, via: 'grant' })
    expect(fake.calls.map(c => c.table)).toEqual(['guilds', 'characters', 'guild_join_grants'])
    expect(fake.calls.some(c => c.filters.some(f => f[0] === 'in'))).toBe(false)
  })

  it('skips the membership lookup when the user has no characters at all', async () => {
    const fake = world({ characters: [] })

    const access = await resolveGuildJoinAccess(fake.client, { userId: USER, guildId: GUILD, now: NOW })

    expect(access).toEqual({ allowed: false })
    expect(fake.calls.map(c => c.table)).toEqual(['guilds', 'characters', 'guild_join_grants'])
  })

  it('allows a user holding an unconsumed, unexpired join record', async () => {
    const fake = world({ characters: ['char-1', 'char-2'], activeMembership: false, grant: true })

    const access = await resolveGuildJoinAccess(fake.client, {
      userId: USER,
      guildId: GUILD,
      excludeCharacterId: 'char-1',
      now: NOW,
    })

    expect(access).toEqual({ allowed: true, via: 'grant' })
    const grant = fake.calls[3]
    expect(grant.table).toBe('guild_join_grants')
    expect(grant.op).toBe('select')
    expect(grant.filters).toEqual([
      ['eq', 'user_id', USER],
      ['eq', 'guild_id', GUILD],
      ['is', 'consumed_at', null],
      ['gt', 'expires_at', NOW.toISOString()],
    ])
  })

  it('denies when no path applies', async () => {
    const fake = world({ characters: ['char-2'], activeMembership: false, grant: false })

    const access = await resolveGuildJoinAccess(fake.client, { userId: USER, guildId: GUILD, now: NOW })

    expect(access).toEqual({ allowed: false })
  })

  it.each(['guilds', 'characters', 'character_guild_memberships', 'guild_join_grants'])(
    'throws when the %s lookup fails',
    async (table) => {
      const fake = world({ characters: ['char-2'], failOn: table })

      await expect(
        resolveGuildJoinAccess(fake.client, { userId: USER, guildId: GUILD, now: NOW }),
      ).rejects.toThrow('Failed to check guild join access')
    },
  )

  it('never writes', async () => {
    const fake = world({ characters: ['char-2'], grant: true })

    await resolveGuildJoinAccess(fake.client, { userId: USER, guildId: GUILD, now: NOW })

    expect(fake.calls.every(c => c.op === 'select')).toBe(true)
  })
})

describe('consumeGuildJoinGrant', () => {
  it('sets consumed_at on the unconsumed record for the user and guild', async () => {
    const fake = createFakeClient(() => OK)

    await consumeGuildJoinGrant(fake.client, { userId: USER, guildId: GUILD, now: NOW })

    expect(fake.calls).toHaveLength(1)
    expect(fake.calls[0]).toMatchObject({
      table: 'guild_join_grants',
      op: 'update',
      payload: { consumed_at: NOW.toISOString() },
      filters: [
        ['eq', 'user_id', USER],
        ['eq', 'guild_id', GUILD],
        ['is', 'consumed_at', null],
      ],
    })
  })

  it('logs a constant message and does not throw when the update fails', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const fake = createFakeClient(() => ({ data: null, error: { message: 'write failed' } }))

    await expect(
      consumeGuildJoinGrant(fake.client, { userId: USER, guildId: GUILD }),
    ).resolves.toBeUndefined()

    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy.mock.calls[0][0]).toBe('Failed to consume guild join record')
  })
})

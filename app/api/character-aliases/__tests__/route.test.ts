// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
//
// Quick task 261002-l8o: character aliases point only at characters with an
// active membership in the alias's guild.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { verifyPermission } from '@/utils/server-roles'

vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/utils/supabase/server', () => ({ getAuthenticatedUser: vi.fn() }))
vi.mock('@/utils/server-roles', () => ({ verifyPermission: vi.fn() }))

const GUILD_ID = 'aaaaaaaa-0000-0000-0000-000000000001'
const OTHER_GUILD_ID = 'bbbbbbbb-0000-0000-0000-000000000001'
const ACTIVE_ID = 'aaaaaaaa-0000-0000-0000-00000000000b'
const ACTIVE_ID_2 = 'aaaaaaaa-0000-0000-0000-00000000000c'
const INACTIVE_ID = 'aaaaaaaa-0000-0000-0000-00000000000f'
const FOREIGN_ID = 'bbbbbbbb-0000-0000-0000-000000000003'

const C3_TEXT = "Some raiders aren't active members of this guild. Check the roster, then try again."

type MembershipRow = { character_id: string; guild_id: string; is_active: boolean | null }
type Call = {
  table: string
  filters: Array<[string, unknown]>
  upsertPayload?: unknown
  upsertOptions?: unknown
}

const MEMBERSHIPS: MembershipRow[] = [
  { character_id: ACTIVE_ID, guild_id: GUILD_ID, is_active: true },
  { character_id: ACTIVE_ID_2, guild_id: GUILD_ID, is_active: true },
  { character_id: INACTIVE_ID, guild_id: GUILD_ID, is_active: false },
  { character_id: FOREIGN_ID, guild_id: OTHER_GUILD_ID, is_active: true },
]

/**
 * Recording fake client. Answers the character_guild_memberships lookup from
 * MEMBERSHIPS (guild_id, is_active and character_id filters applied) and
 * records the character_aliases upsert, returning its rows.
 */
function makeClient(opts: { lookupError?: boolean } = {}) {
  const calls: Call[] = []
  const client = {
    from(table: string) {
      const call: Call = { table, filters: [] }
      calls.push(call)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const builder: any = {
        select: () => builder,
        eq: (col: string, val: unknown) => { call.filters.push([col, val]); return builder },
        in: (col: string, val: unknown) => { call.filters.push([col, val]); return builder },
        upsert: (payload: unknown, options: unknown) => {
          call.upsertPayload = payload
          call.upsertOptions = options
          return builder
        },
        then: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) => {
          if (table === 'character_guild_memberships') {
            if (opts.lookupError) return Promise.resolve({ data: null, error: { message: 'lookup failed' } }).then(resolve, reject)
            const filter = (col: string) => call.filters.find(([c]) => c === col)?.[1]
            const ids = (filter('character_id') ?? []) as string[]
            const rows = MEMBERSHIPS
              .filter(m => m.guild_id === filter('guild_id') && m.is_active === filter('is_active') && ids.includes(m.character_id))
              .map(m => ({ character_id: m.character_id }))
            return Promise.resolve({ data: rows, error: null }).then(resolve, reject)
          }
          if (table === 'character_aliases') {
            return Promise.resolve({ data: call.upsertPayload, error: null }).then(resolve, reject)
          }
          return Promise.resolve({ data: null, error: null }).then(resolve, reject)
        },
      }
      return builder
    },
  }
  const membershipCalls = () => calls.filter(c => c.table === 'character_guild_memberships')
  const upserts = () => calls.filter(c => c.table === 'character_aliases' && c.upsertPayload !== undefined)
  return { client, calls, membershipCalls, upserts }
}

function post(body: unknown) {
  return POST(new Request('http://localhost/api/character-aliases', {
    method: 'POST',
    body: JSON.stringify(body),
  }) as never)
}

describe('POST /api/character-aliases guild roster check', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: 'user-1' }, error: null } as never)
    vi.mocked(verifyPermission).mockResolvedValue({ hasPermission: true } as never)
  })

  it('saves aliases for active members exactly as before', async () => {
    const fake = makeClient()
    vi.mocked(createServiceRoleClient).mockReturnValue(fake.client as never)

    const res = await post({
      guild_id: GUILD_ID,
      aliases: [
        { alias_name: '  Thrall ', character_id: ACTIVE_ID },
        { alias_name: 'JAINA', character_id: ACTIVE_ID_2 },
      ],
    })

    expect(res.status).toBe(200)
    const expected = [
      { guild_id: GUILD_ID, alias_name: 'thrall', character_id: ACTIVE_ID },
      { guild_id: GUILD_ID, alias_name: 'jaina', character_id: ACTIVE_ID_2 },
    ]
    expect(await res.json()).toEqual({ aliases: expected })
    expect(fake.upserts()).toHaveLength(1)
    expect(fake.upserts()[0].upsertPayload).toEqual(expected)
    expect(fake.upserts()[0].upsertOptions).toEqual({ onConflict: 'guild_id,alias_name' })
    expect(fake.membershipCalls()[0].filters).toEqual([
      ['guild_id', GUILD_ID],
      ['is_active', true],
      ['character_id', [ACTIVE_ID, ACTIVE_ID_2]],
    ])
  })

  it.each([
    ['a character from another guild', FOREIGN_ID],
    ['an inactive member', INACTIVE_ID],
    ['a malformed id', 'not-a-uuid'],
  ])('refuses %s with the roster text and saves nothing', async (_label, badId) => {
    const fake = makeClient()
    vi.mocked(createServiceRoleClient).mockReturnValue(fake.client as never)

    const res = await post({
      guild_id: GUILD_ID,
      aliases: [
        { alias_name: 'thrall', character_id: ACTIVE_ID },
        { alias_name: 'other', character_id: badId },
      ],
    })

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: C3_TEXT, invalid_character_ids: [badId] })
    expect(fake.upserts()).toEqual([])
  })

  it('lists each invalid id once, in first-seen order', async () => {
    const fake = makeClient()
    vi.mocked(createServiceRoleClient).mockReturnValue(fake.client as never)

    const res = await post({
      guild_id: GUILD_ID,
      aliases: [
        { alias_name: 'a', character_id: INACTIVE_ID },
        { alias_name: 'b', character_id: ACTIVE_ID },
        { alias_name: 'c', character_id: FOREIGN_ID },
        { alias_name: 'd', character_id: INACTIVE_ID },
      ],
    })

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: C3_TEXT, invalid_character_ids: [INACTIVE_ID, FOREIGN_ID] })
    expect(fake.upserts()).toEqual([])
  })

  it.each([
    ['a null character_id', { alias_name: 'ghost', character_id: null }],
    ['no character_id key', { alias_name: 'ghost' }],
    ['an empty character_id', { alias_name: 'ghost', character_id: '' }],
  ])('refuses %s, reported as null, without passing null to the lookup', async (_label, alias) => {
    const fake = makeClient()
    vi.mocked(createServiceRoleClient).mockReturnValue(fake.client as never)

    const res = await post({
      guild_id: GUILD_ID,
      aliases: [{ alias_name: 'thrall', character_id: ACTIVE_ID }, alias],
    })

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: C3_TEXT, invalid_character_ids: [null] })
    expect(fake.upserts()).toEqual([])
    for (const call of fake.membershipCalls()) {
      const ids = call.filters.find(([col]) => col === 'character_id')?.[1] as unknown[]
      expect(ids).not.toContain(null)
    }
  })

  it('returns 500 with the existing text and saves nothing when the membership lookup fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const fake = makeClient({ lookupError: true })
    vi.mocked(createServiceRoleClient).mockReturnValue(fake.client as never)

    const res = await post({ guild_id: GUILD_ID, aliases: [{ alias_name: 'thrall', character_id: ACTIVE_ID }] })

    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'Failed to save aliases' })
    expect(fake.upserts()).toEqual([])
  })

  it('still refuses a caller without manage_members before any membership query', async () => {
    const fake = makeClient()
    vi.mocked(createServiceRoleClient).mockReturnValue(fake.client as never)
    vi.mocked(verifyPermission).mockResolvedValue({ hasPermission: false } as never)

    const res = await post({ guild_id: GUILD_ID, aliases: [{ alias_name: 'thrall', character_id: FOREIGN_ID }] })

    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'Only officers can manage aliases' })
    expect(fake.calls).toEqual([])
  })
})

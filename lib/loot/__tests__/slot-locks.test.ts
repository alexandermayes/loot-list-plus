// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  lockAwardedSlots,
  fetchActiveSlotLocks,
  releaseSlotLock,
  releaseSlotLocksForAward,
} from '../slot-locks'

const GUILD = 'guild-1'
const RAIDER = 'char-1'
const ITEM = 'item-1'
const LIST = 'list-1'
const USER = 'user-1'

type Op = [string, unknown[]]
interface Call {
  table: string
  ops: Op[]
}
type Result = { data?: unknown; error?: { code?: string; message: string } | null }

/** Recording fake: every chain method records itself, awaiting the chain asks `answer` for the result. */
function makeClient(answer: (call: Call) => Result) {
  const calls: Call[] = []
  const client = {
    from: vi.fn((table: string) => {
      const call: Call = { table, ops: [] }
      calls.push(call)
      const builder: Record<string, unknown> = {}
      for (const method of ['select', 'eq', 'in', 'is', 'order', 'upsert', 'update', 'maybeSingle']) {
        builder[method] = (...args: unknown[]) => {
          call.ops.push([method, args])
          return builder
        }
      }
      builder.then = (resolve: (value: Result) => unknown, reject: (reason: unknown) => unknown) =>
        Promise.resolve(answer(call)).then(value => resolve({ data: null, error: null, ...value }), reject)
      return builder
    }),
  }
  return { client: client as never, calls, from: client.from }
}

const has = (call: Call, method: string) => call.ops.some(([name]) => name === method)
const args = (call: Call, method: string) => call.ops.find(([name]) => name === method)?.[1]
const forTable = (calls: Call[], table: string) => calls.filter(call => call.table === table)

interface Fixture {
  setting?: boolean | null
  history?: Array<{ id: string; character_id: string | null; loot_item_id: string; award_copy: number | null }>
  submissions?: Array<{ id: string }>
  items?: Array<{ id: string; submission_id: string; rank: number; slot: number; loot_item_id: string }>
  locks?: Array<{ rank: number; slot: number }>
  upsertError?: { code?: string; message: string } | null
}

function fixtureClient(fx: Fixture) {
  return makeClient(call => {
    switch (call.table) {
      case 'guild_settings':
        return { data: fx.setting === null ? null : { award_slot_lock_enabled: fx.setting ?? true } }
      case 'loot_history':
        return {
          data: fx.history ?? [{ id: 'hist-1', character_id: RAIDER, loot_item_id: ITEM, award_copy: 1 }],
        }
      case 'loot_submissions':
        return { data: fx.submissions ?? [{ id: LIST }] }
      case 'loot_submission_items':
        return {
          data: fx.items ?? [
            { id: 'row-a', submission_id: LIST, rank: 40, slot: 1, loot_item_id: ITEM },
            { id: 'row-b', submission_id: LIST, rank: 20, slot: 1, loot_item_id: ITEM },
          ],
        }
      case 'loot_list_slot_locks':
        if (has(call, 'upsert')) return { error: fx.upsertError ?? null }
        return { data: fx.locks ?? [] }
      default:
        return {}
    }
  })
}

let errorSpy: ReturnType<typeof vi.spyOn>
let warnSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  errorSpy.mockRestore()
  warnSpy.mockRestore()
})

describe('lockAwardedSlots', () => {
  it('writes nothing when the setting is off', async () => {
    const { client, calls } = fixtureClient({ setting: false })
    const result = await lockAwardedSlots(client, GUILD, [{ lootHistoryId: 'hist-1', reason: 'score' }])

    expect(result).toBe(0)
    expect(forTable(calls, 'guild_settings')).toHaveLength(1)
    expect(forTable(calls, 'loot_history')).toHaveLength(0)
    expect(calls.some(call => has(call, 'upsert'))).toBe(false)
  })

  it('writes nothing when the guild has no settings row', async () => {
    const { client, calls } = fixtureClient({ setting: null })
    expect(await lockAwardedSlots(client, GUILD, [{ lootHistoryId: 'hist-1' }])).toBe(0)
    expect(calls.some(call => has(call, 'upsert'))).toBe(false)
  })

  it('skips off-spec and roll awards without reading settings', async () => {
    const { client, from } = fixtureClient({})
    const result = await lockAwardedSlots(client, GUILD, [
      { lootHistoryId: 'hist-1', reason: 'offspec' },
      { lootHistoryId: 'hist-2', reason: 'roll' },
    ])

    expect(result).toBe(0)
    expect(from).not.toHaveBeenCalled()
  })

  it('writes nothing when the character has no approved list', async () => {
    const { client, calls } = fixtureClient({ submissions: [] })
    expect(await lockAwardedSlots(client, GUILD, [{ lootHistoryId: 'hist-1', reason: '' }])).toBe(0)
    expect(calls.some(call => has(call, 'upsert'))).toBe(false)
  })

  it('copy 1 locks the highest-ranked live row', async () => {
    const { client, calls } = fixtureClient({})
    const result = await lockAwardedSlots(client, GUILD, [{ lootHistoryId: 'hist-1', reason: 'score' }])

    expect(result).toBe(1)
    const upsert = calls.find(call => has(call, 'upsert'))!
    expect(args(upsert, 'upsert')).toEqual([
      {
        guild_id: GUILD,
        submission_id: LIST,
        character_id: RAIDER,
        loot_item_id: ITEM,
        rank: 40,
        slot: 1,
        loot_history_id: 'hist-1',
      },
      { onConflict: 'loot_history_id', ignoreDuplicates: true },
    ])
  })

  it('copy 2 locks the second-highest rank', async () => {
    const { client, calls } = fixtureClient({
      history: [{ id: 'hist-2', character_id: RAIDER, loot_item_id: ITEM, award_copy: 2 }],
    })
    await lockAwardedSlots(client, GUILD, [{ lootHistoryId: 'hist-2', reason: 'loot_council' }])

    const upsert = calls.find(call => has(call, 'upsert'))!
    expect((args(upsert, 'upsert') as Array<{ rank: number }>)[0].rank).toBe(20)
  })

  it('locks an award that carries no reason (addon awards)', async () => {
    const { client } = fixtureClient({})
    expect(await lockAwardedSlots(client, GUILD, [{ lootHistoryId: 'hist-1', reason: null }])).toBe(1)
    expect(await lockAwardedSlots(client, GUILD, [{ lootHistoryId: 'hist-1' }])).toBe(1)
  })

  it('skips an award whose history row has no character', async () => {
    const { client, calls } = fixtureClient({
      history: [{ id: 'hist-1', character_id: null, loot_item_id: ITEM, award_copy: 1 }],
    })
    expect(await lockAwardedSlots(client, GUILD, [{ lootHistoryId: 'hist-1', reason: 'score' }])).toBe(0)
    expect(forTable(calls, 'loot_submissions')).toHaveLength(0)
  })

  it('moves to the next unlocked row when the numbered row already holds a lock', async () => {
    const { client, calls } = fixtureClient({ locks: [{ rank: 40, slot: 1 }] })
    expect(await lockAwardedSlots(client, GUILD, [{ lootHistoryId: 'hist-1', reason: 'score' }])).toBe(1)

    const upsert = calls.find(call => has(call, 'upsert'))!
    expect((args(upsert, 'upsert') as Array<{ rank: number }>)[0].rank).toBe(20)
  })

  it('locks nothing when the item is live on two approved lists', async () => {
    const { client, calls } = fixtureClient({
      submissions: [{ id: LIST }, { id: 'list-2' }],
      items: [
        { id: 'row-a', submission_id: LIST, rank: 40, slot: 1, loot_item_id: ITEM },
        { id: 'row-c', submission_id: 'list-2', rank: 12, slot: 1, loot_item_id: ITEM },
      ],
    })
    expect(await lockAwardedSlots(client, GUILD, [{ lootHistoryId: 'hist-1', reason: 'score' }])).toBe(0)
    expect(calls.some(call => has(call, 'upsert'))).toBe(false)
    expect(warnSpy).toHaveBeenCalled()
  })

  it('logs an upsert error with a constant first argument and resolves 0', async () => {
    const { client } = fixtureClient({ upsertError: { code: '23505', message: 'duplicate key value' } })
    expect(await lockAwardedSlots(client, GUILD, [{ lootHistoryId: 'hist-1', reason: 'score' }])).toBe(0)

    expect(errorSpy).toHaveBeenCalledWith('slot-locks: lock insert failed', '23505')
    for (const call of errorSpy.mock.calls) expect(call[0]).toMatch(/^slot-locks: [a-zA-Z_ ]+$/)
  })

  it('logs and resolves 0 when the client throws', async () => {
    const throwing = {
      from: vi.fn(() => {
        throw new Error('boom')
      }),
    } as never
    await expect(lockAwardedSlots(throwing, GUILD, [{ lootHistoryId: 'hist-1', reason: 'score' }])).resolves.toBe(0)
    expect(errorSpy).toHaveBeenCalled()
  })
})

describe('fetchActiveSlotLocks', () => {
  it('maps the item embed (object or array) and falls back for a missing name', async () => {
    const { client, calls } = makeClient(() => ({
      data: [
        { id: 'l1', rank: 50, slot: 1, loot_item_id: 'i1', locked_at: '2026-10-24T12:00:00Z', loot_items: { name: 'Locked Item' } },
        { id: 'l2', rank: 40, slot: 2, loot_item_id: 'i2', locked_at: '2026-10-24T12:00:00Z', loot_items: [{ name: 'Array Item' }] },
        { id: 'l3', rank: 30, slot: 1, loot_item_id: 'i3', locked_at: '2026-10-24T12:00:00Z', loot_items: null },
      ],
    }))

    const locks = await fetchActiveSlotLocks(client, LIST)

    expect(locks.map(lock => lock.item_name)).toEqual(['Locked Item', 'Array Item', 'an awarded item'])
    expect(locks[0]).toEqual({
      id: 'l1',
      rank: 50,
      slot: 1,
      loot_item_id: 'i1',
      locked_at: '2026-10-24T12:00:00Z',
      item_name: 'Locked Item',
    })
    expect(args(calls[0], 'eq')).toEqual(['submission_id', LIST])
    expect(args(calls[0], 'is')).toEqual(['released_at', null])
  })

  it('rejects when the read fails', async () => {
    const { client } = makeClient(() => ({ error: { code: '42P01', message: 'relation missing' } }))
    await expect(fetchActiveSlotLocks(client, LIST)).rejects.toThrow('Failed to read loot list slot locks')
  })
})

describe('releaseSlotLock', () => {
  it('stamps the release and filters on the lock id and released_at is null', async () => {
    const { client, calls } = makeClient(() => ({}))
    await releaseSlotLock(client, 'lock-1', USER, 'removed_by_officer')

    const payload = (args(calls[0], 'update') as Array<Record<string, string>>)[0]
    expect(payload.released_by).toBe(USER)
    expect(payload.release_reason).toBe('removed_by_officer')
    expect(Number.isNaN(Date.parse(payload.released_at))).toBe(false)
    expect(args(calls[0], 'eq')).toEqual(['id', 'lock-1'])
    expect(args(calls[0], 'is')).toEqual(['released_at', null])
  })

  it('rejects on an error', async () => {
    const { client } = makeClient(() => ({ error: { code: '42501', message: 'denied' } }))
    await expect(releaseSlotLock(client, 'lock-1', USER, 'removed_by_officer')).rejects.toThrow(
      'Failed to release loot list slot lock',
    )
  })
})

describe('releaseSlotLocksForAward', () => {
  it('filters on the loot_history id and resolves the row count', async () => {
    const { client, calls } = makeClient(() => ({ data: [{ id: 'lock-1' }] }))
    const count = await releaseSlotLocksForAward(client, 'hist-1', USER, 'award_reassigned')

    expect(count).toBe(1)
    expect(args(calls[0], 'eq')).toEqual(['loot_history_id', 'hist-1'])
    expect(args(calls[0], 'is')).toEqual(['released_at', null])
    expect(args(calls[0], 'select')).toEqual(['id'])
  })

  it('resolves 0 and logs on failure', async () => {
    const { client } = makeClient(() => ({ error: { code: '42501', message: 'denied' } }))
    await expect(releaseSlotLocksForAward(client, 'hist-1', USER, 'award_reassigned')).resolves.toBe(0)
    expect(errorSpy).toHaveBeenCalledWith('slot-locks: release for award failed', '42501')
  })
})

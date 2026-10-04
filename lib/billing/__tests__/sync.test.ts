import { describe, it, expect } from 'vitest'
import { syncSubscriptionToGuild } from '../sync'

const GUILD_ID = 'g1'

const ACTIVE_SUBSCRIPTION = {
  id: 'sub_1',
  customer: 'cus_1',
  status: 'active',
  cancel_at_period_end: false,
  items: { data: [{ price: { id: 'price_1', recurring: { interval: 'month' } } }] },
}

interface RecordedCall {
  table: string
  op: 'upsert' | 'update'
  payload: unknown
  options?: unknown
  filter?: [string, unknown]
}

/**
 * One recording Supabase stand-in. from('guilds').select('id').eq('id', id)
 * .maybeSingle() resolves the test's guild lookup. from('guild_subscriptions')
 * .upsert(payload, options) and from('guilds').update(payload).eq(col, val)
 * are recorded in call order and resolve the test's { error }.
 */
function createMockClient(opts: {
  guild?: { id: string } | null
  guildLookupError?: unknown
  upsertError?: unknown
  updateError?: unknown
} = {}) {
  const calls: RecordedCall[] = []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = {
    from: (table: string) => {
      if (table === 'guilds') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: opts.guild ?? null, error: opts.guildLookupError ?? null }),
            }),
          }),
          update: (payload: unknown) => ({
            eq: (column: string, value: unknown) => {
              calls.push({ table, op: 'update', payload, filter: [column, value] })
              return Promise.resolve({ error: opts.updateError ?? null })
            },
          }),
        }
      }
      if (table === 'guild_subscriptions') {
        return {
          upsert: (payload: unknown, options: unknown) => {
            calls.push({ table, op: 'upsert', payload, options })
            return Promise.resolve({ error: opts.upsertError ?? null })
          },
        }
      }
      throw new Error(`unexpected table ${table}`)
    },
  }

  return { supabase, calls }
}

describe('syncSubscriptionToGuild', () => {
  it('S1: guild exists, subscription active: lookup, upsert, then tier update, returns tier pro', async () => {
    const { supabase, calls } = createMockClient({ guild: { id: GUILD_ID } })
    const result = await syncSubscriptionToGuild(supabase, GUILD_ID, ACTIVE_SUBSCRIPTION)

    expect(result).toEqual({ tier: 'pro' })
    expect(calls).toHaveLength(2)
    expect(calls[0].table).toBe('guild_subscriptions')
    expect(calls[0].op).toBe('upsert')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((calls[0].payload as any).guild_id).toBe(GUILD_ID)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((calls[0].payload as any).updated_at).toEqual(expect.any(String))
    expect(calls[0].options).toEqual({ onConflict: 'guild_id' })
    expect(calls[1].table).toBe('guilds')
    expect(calls[1].op).toBe('update')
    expect(calls[1].payload).toEqual({ subscription_tier: 'pro' })
    expect(calls[1].filter).toEqual(['id', GUILD_ID])
  })

  it('S2: lookup returns no row -> guildMissing true, no upsert, no update', async () => {
    const { supabase, calls } = createMockClient({ guild: null })
    const result = await syncSubscriptionToGuild(supabase, GUILD_ID, ACTIVE_SUBSCRIPTION)

    expect(result).toEqual({ tier: 'pro', guildMissing: true })
    expect(calls).toEqual([])
  })

  it('S3: lookup returns an error -> error starting with guild lookup failed, no upsert', async () => {
    const { supabase, calls } = createMockClient({ guildLookupError: { message: 'db down' } })
    const result = await syncSubscriptionToGuild(supabase, GUILD_ID, ACTIVE_SUBSCRIPTION)

    expect(result.error).toMatch(/^guild lookup failed/)
    expect(calls).toEqual([])
  })

  it('S4: upsert returns code 23503 -> guildMissing true, no update', async () => {
    const { supabase, calls } = createMockClient({
      guild: { id: GUILD_ID },
      upsertError: { code: '23503', message: 'fk violation' },
    })
    const result = await syncSubscriptionToGuild(supabase, GUILD_ID, ACTIVE_SUBSCRIPTION)

    expect(result).toEqual({ tier: 'pro', guildMissing: true })
    expect(calls).toHaveLength(1)
    expect(calls[0].op).toBe('upsert')
  })

  it('S5: upsert returns another error -> unchanged text', async () => {
    const { supabase } = createMockClient({
      guild: { id: GUILD_ID },
      upsertError: { message: 'constraint violation' },
    })
    const result = await syncSubscriptionToGuild(supabase, GUILD_ID, ACTIVE_SUBSCRIPTION)

    expect(result.error).toBe('guild_subscriptions upsert failed: constraint violation')
  })

  it('S6: tier update error -> unchanged text', async () => {
    const { supabase } = createMockClient({
      guild: { id: GUILD_ID },
      updateError: { message: 'update boom' },
    })
    const result = await syncSubscriptionToGuild(supabase, GUILD_ID, ACTIVE_SUBSCRIPTION)

    expect(result.error).toBe('subscription_tier update failed: update boom')
  })
})

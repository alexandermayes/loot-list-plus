import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'

vi.mock('@/lib/discord', () => ({
  discordFetch: vi.fn(),
}))

import { discordFetch } from '@/lib/discord'
import { notifyLootAward } from '../discord-loot-announcements'

interface FakeOptions {
  activeExpansionId?: string | null
  expansionName?: string | null
  expansionError?: boolean
  items?: Array<{ id: string; name: string; wowhead_id: number | null; kind?: string }>
}

/**
 * Minimal fake Supabase client. Serves just the four tables notifyLootAward
 * reads: guilds, guild_settings, loot_items (thenable after .in) and
 * expansions (maybeSingle). Records which tables were queried.
 */
function makeFakeSupabase(opts: FakeOptions = {}) {
  const {
    activeExpansionId = 'exp-1',
    expansionName = 'Mists of Pandaria',
    expansionError = false,
    items = [{ id: 'item-1', name: 'Ring of Testing', wowhead_id: 1001 }],
  } = opts
  const tablesQueried: string[] = []

  const client = {
    from(table: string) {
      tablesQueried.push(table)
      const chain: Record<string, unknown> = {}
      chain.select = () => chain
      chain.eq = () => chain
      if (table === 'guilds') {
        chain.single = async () => ({
          data: { name: 'Test Guild', discord_server_id: 'srv-1', active_expansion_id: activeExpansionId },
          error: null,
        })
      } else if (table === 'guild_settings') {
        chain.single = async () => ({
          data: { raid_summary_channel_id: 'chan-1', loot_announcements_enabled: true },
          error: null,
        })
      } else if (table === 'loot_items') {
        chain.in = () => ({
          then: (resolve: (v: unknown) => unknown) => resolve({ data: items, error: null }),
        })
      } else if (table === 'expansions') {
        chain.maybeSingle = async () =>
          expansionError
            ? { data: null, error: { message: 'boom' } }
            : { data: expansionName === null ? null : { name: expansionName }, error: null }
      }
      return chain
    },
  }

  return { client: client as unknown as SupabaseClient, tablesQueried }
}

function postedDescription(): string {
  const call = vi.mocked(discordFetch).mock.calls[0]
  const body = JSON.parse((call[1] as { body: string }).body)
  return body.embeds[0].description as string
}

describe('notifyLootAward item links', () => {
  beforeEach(() => {
    vi.stubEnv('DISCORD_BOT_TOKEN', 'test-token')
    vi.mocked(discordFetch).mockReset()
    vi.mocked(discordFetch).mockResolvedValue({ ok: true } as Response)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('links a Forever guild item to wowhead.com/forever', async () => {
    const { client } = makeFakeSupabase({
      expansionName: 'Forever',
      items: [{ id: 'item-1', name: 'Ring of Testing', wowhead_id: 271940 }],
    })

    const ok = await notifyLootAward(client, 'guild-1', [{ itemId: 'item-1', characterName: 'Thrall' }])

    expect(ok).toBe(true)
    expect(postedDescription()).toContain('https://www.wowhead.com/forever/item=271940')
  })

  it('keeps the retail link for a Mists of Pandaria guild', async () => {
    const { client } = makeFakeSupabase({ expansionName: 'Mists of Pandaria' })

    await notifyLootAward(client, 'guild-1', [{ itemId: 'item-1', characterName: 'Thrall' }])

    expect(postedDescription()).toContain('https://www.wowhead.com/item=1001')
    expect(postedDescription()).not.toContain('/forever/')
  })

  it('still posts with the retail link when the expansion lookup errors', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { client } = makeFakeSupabase({ expansionError: true })

    const ok = await notifyLootAward(client, 'guild-1', [{ itemId: 'item-1', characterName: 'Thrall' }])

    expect(ok).toBe(true)
    expect(discordFetch).toHaveBeenCalledTimes(1)
    expect(postedDescription()).toContain('https://www.wowhead.com/item=1001')
  })

  it('still posts with the retail link when the expansion row is missing', async () => {
    const { client } = makeFakeSupabase({ expansionName: null })

    const ok = await notifyLootAward(client, 'guild-1', [{ itemId: 'item-1', characterName: 'Thrall' }])

    expect(ok).toBe(true)
    expect(postedDescription()).toContain('https://www.wowhead.com/item=1001')
  })

  it('makes no expansions call and uses the retail link when the guild has no active expansion', async () => {
    const { client, tablesQueried } = makeFakeSupabase({ activeExpansionId: null })

    const ok = await notifyLootAward(client, 'guild-1', [{ itemId: 'item-1', characterName: 'Thrall' }])

    expect(ok).toBe(true)
    expect(tablesQueried).not.toContain('expansions')
    expect(postedDescription()).toContain('https://www.wowhead.com/item=1001')
  })

  it('renders an item with no wowhead_id as plain bold text with no link', async () => {
    const { client } = makeFakeSupabase({
      expansionName: 'Forever',
      items: [{ id: 'item-1', name: 'Mystery Blade', wowhead_id: null }],
    })

    await notifyLootAward(client, 'guild-1', [{ itemId: 'item-1', characterName: 'Thrall' }])

    const description = postedDescription()
    expect(description).toContain('**Mystery Blade**')
    expect(description).not.toContain('wowhead.com')
  })

  // D-15, DISC-06: a Discovery award names a need row, which has no Wowhead id
  // to link. D-22 holds real need rankings in Phase 3, so this fixture stands
  // past the hold; research open question 6 accepts plain bold text.
  it('need row (past the D-22 hold): renders as plain bold text with no wowhead link', async () => {
    const { client } = makeFakeSupabase({
      expansionName: 'Forever',
      items: [{ id: 'need-1', name: 'Trinket, Healing', kind: 'need', wowhead_id: null }],
    })

    const ok = await notifyLootAward(client, 'guild-1', [{ itemId: 'need-1', characterName: 'Thrall' }])

    expect(ok).toBe(true)
    const description = postedDescription()
    expect(description).toContain('**Trinket, Healing**')
    expect(description).toContain('**Thrall**')
    expect(description).not.toContain('wowhead.com')
    expect(description).not.toContain('](')
  })
})

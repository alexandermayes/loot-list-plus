// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PATCH } from '../route'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyPermission } from '@/utils/server-roles'

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
  getAuthenticatedUser: vi.fn(),
}))
vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/utils/server-roles', () => ({ verifyPermission: vi.fn() }))

type ExpansionRow = { id: string; name: string } | null

/**
 * Minimal Supabase stand-in: a guild with the given game version (null means
 * no guild row), and an expansions row (null means not found). Records every
 * table name passed to from() and every update() call's table and payload.
 */
function makeClient({ game, expansion }: { game: string | null; expansion: ExpansionRow }) {
  const tables: string[] = []
  const updates: Array<{ table: string; payload: unknown }> = []

  const client = {
    from(table: string) {
      tables.push(table)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const builder: any = {
        select: () => builder,
        eq: () => builder,
        update: (payload: unknown) => {
          updates.push({ table, payload })
          return builder
        },
        single: () => Promise.resolve(
          table === 'guilds'
            ? { data: game === null ? null : { game }, error: game === null ? { message: 'not found' } : null }
            : { data: expansion, error: expansion ? null : { message: 'not found' } }
        ),
        then: (resolve: (value: { data: null; error: null }) => unknown) =>
          Promise.resolve({ data: null, error: null }).then(resolve),
      }
      return builder
    },
  }
  return { client, tables, updates }
}

function patch(body: unknown) {
  const request = new Request('http://localhost/api/guilds/g1/expansions/exp-1', {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return PATCH(request as any, { params: Promise.resolve({ id: 'g1', expansionId: 'exp-1' }) })
}

describe('PATCH /api/guilds/[id]/expansions/[expansionId] game-version enforcement', () => {
  beforeEach(() => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: 'user-1' }, error: null } as never)
    vi.mocked(verifyPermission).mockResolvedValue({ hasPermission: true } as never)
  })

  it('rejects setting The Burning Crusade current for a Forever guild without any write', async () => {
    const { client, tables, updates } = makeClient({
      game: 'forever',
      expansion: { id: 'exp-1', name: 'The Burning Crusade' },
    })
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await patch({ setAsCurrent: true })

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({
      error: "The Burning Crusade isn't available for this guild's game version.",
    })
    expect(updates).toEqual([])
    void tables
  })

  it('rejects setting Forever current for a Classic guild, writing nothing even with bundled schedule fields', async () => {
    const { client, updates } = makeClient({
      game: 'classic',
      expansion: { id: 'exp-1', name: 'Forever' },
    })
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await patch({ setAsCurrent: true, raidDaysPerWeek: 3 })

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({
      error: "WoW Forever isn't available for this guild's game version.",
    })
    expect(updates.find((u) => u.table === 'guilds')).toBeUndefined()
    expect(updates.find((u) => u.table === 'expansions')).toBeUndefined()
  })

  it('sets The Burning Crusade current for a Classic guild', async () => {
    const { client, updates } = makeClient({
      game: 'classic',
      expansion: { id: 'exp-1', name: 'The Burning Crusade' },
    })
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await patch({ setAsCurrent: true })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      success: true,
      message: 'The Burning Crusade is now your current expansion',
    })
    const guildUpdates = updates.filter((u) => u.table === 'guilds')
    expect(guildUpdates).toEqual([{ table: 'guilds', payload: { active_expansion_id: 'exp-1' } }])
  })

  it('sets Forever current for a Forever guild', async () => {
    const { client, updates } = makeClient({
      game: 'forever',
      expansion: { id: 'exp-1', name: 'Forever' },
    })
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await patch({ setAsCurrent: true })

    expect(res.status).toBe(200)
    const guildUpdates = updates.filter((u) => u.table === 'guilds')
    expect(guildUpdates).toHaveLength(1)
  })

  it('returns 404 Guild not found when the guild row is missing, without any write', async () => {
    const { client, updates } = makeClient({
      game: null,
      expansion: { id: 'exp-1', name: 'The Burning Crusade' },
    })
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await patch({ setAsCurrent: true })

    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'Guild not found' })
    expect(updates).toEqual([])
  })

  it('updates schedule fields for a Classic guild with no setAsCurrent, never reading guilds', async () => {
    const { client, tables, updates } = makeClient({
      game: 'classic',
      expansion: { id: 'exp-1', name: 'Forever' },
    })
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await patch({ raidDaysPerWeek: 3 })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true, message: 'Expansion updated successfully' })
    expect(tables).not.toContain('guilds')
    const expansionUpdates = updates.filter((u) => u.table === 'expansions')
    expect(expansionUpdates).toEqual([{ table: 'expansions', payload: { raid_days_per_week: 3 } }])
  })

  it('returns 403 when the caller lacks permission, making no from() call', async () => {
    vi.mocked(verifyPermission).mockResolvedValue({ hasPermission: false } as never)
    const { client, tables } = makeClient({ game: 'classic', expansion: { id: 'exp-1', name: 'Classic' } })
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await patch({ setAsCurrent: true })

    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'Officer permissions required' })
    expect(tables).toEqual([])
  })

  it('returns 404 Expansion not found when the expansion row is missing, never reading guilds', async () => {
    const { client, tables } = makeClient({ game: 'classic', expansion: null })
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await patch({ setAsCurrent: true })

    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'Expansion not found' })
    expect(tables).not.toContain('guilds')
  })
})

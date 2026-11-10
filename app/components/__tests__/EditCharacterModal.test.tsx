import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EditCharacterModal } from '../EditCharacterModal'
import { useNotification } from '@/app/contexts/NotificationContext'
import { useGuildContext, type Character } from '@/app/contexts/GuildContext'

vi.mock('@/app/contexts/GuildContext', () => ({ useGuildContext: vi.fn() }))
vi.mock('@/app/contexts/NotificationContext', () => ({ useNotification: vi.fn() }))
vi.mock('@/utils/analytics/client', () => ({ trackClientEvent: vi.fn() }))
// The embedded BattlenetCharacterPickerModal calls useRouter.
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))

// createBrowserClient throws without NEXT_PUBLIC_SUPABASE_* env vars, so the
// client is a table-aware stand-in: one class, one spec, a linked Battle.net account.
vi.mock('@/utils/supabase/client', () => {
  const tables: Record<string, { data: unknown; error: unknown }> = {
    wow_classes: { data: [{ id: 'class-1', name: 'Warrior', color_hex: '#c79c6e' }], error: null },
    class_specs: { data: [{ id: 'spec-1', class_id: 'class-1', name: 'Arms' }], error: null },
    battlenet_accounts: { data: { id: 'bnet-1' }, error: null },
  }
  function from(table: string) {
    const result = tables[table] ?? { data: null, error: null }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain: any = {
      select: () => chain,
      eq: () => chain,
      order: () => chain,
      single: () => Promise.resolve(result),
      then: (onResolve: (v: unknown) => unknown, onReject: (e: unknown) => unknown) =>
        Promise.resolve(result).then(onResolve, onReject),
    }
    return chain
  }
  return {
    createClient: () => ({
      auth: { getUser: () => Promise.resolve({ data: { user: { id: 'user-1' } } }) },
      from,
    }),
  }
})

/** Minimal Response stand-in: the modal only reads ok, status and json(). */
function reply(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body }
}

type SyncAnswer = { status: number; body: unknown } | 'reject'

interface Recorded {
  url: string
  method: string
  body: unknown
}

let requests: Recorded[] = []
let showNotification: Mock<(type: string, message: string, duration?: number) => void>

function character(overrides: Partial<Character> = {}): Character {
  return {
    id: 'char-1',
    name: 'Thrall',
    realm: 'Benediction',
    class_id: 'class-1',
    spec_id: 'spec-1',
    is_main: true,
    battle_net_id: 123456,
    game_version: 'mop-classic',
    ...overrides,
  } as unknown as Character
}

function routeFetch(sync: SyncAnswer) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method ?? 'GET'
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined
    requests.push({ url, method, body })

    if (url === '/api/battlenet/characters/sync-gear' && method === 'POST') {
      if (sync === 'reject') throw new TypeError('Failed to fetch')
      return reply(sync.status, sync.body)
    }
    return reply(404, { error: 'unrouted in test' })
  })
}

const syncRequests = () => requests.filter(r => r.url === '/api/battlenet/characters/sync-gear' && r.method === 'POST')

function renderModal(c: Character, sync: SyncAnswer = { status: 200, body: { gear_synced: 16 } }) {
  vi.stubGlobal('fetch', routeFetch(sync))
  render(<EditCharacterModal isOpen onClose={vi.fn()} character={c} />)
}

describe('EditCharacterModal gear sync', () => {
  beforeEach(() => {
    requests = []
    showNotification = vi.fn()
    ;(useNotification as Mock).mockReturnValue({ showNotification })
    ;(useGuildContext as Mock).mockReturnValue({
      user: { id: 'user-1' },
      refreshCharacters: vi.fn(async () => {}),
      characterMemberships: [],
      userCharacters: [],
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('syncs gear for a Battle.net linked character with its game version', async () => {
    renderModal(character())
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: /sync gear/i }))

    await waitFor(() => expect(syncRequests()).toHaveLength(1))
    expect(syncRequests()[0].body).toEqual({ characterId: 'char-1', version: 'mop-classic' })
    await waitFor(() =>
      expect(showNotification).toHaveBeenCalledWith('success', 'Gear synced. 16 items updated.')
    )
  })

  it('falls back to cata-classic when the character has no game version', async () => {
    renderModal(character({ game_version: null }))
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: /sync gear/i }))

    await waitFor(() => expect(syncRequests()).toHaveLength(1))
    expect(syncRequests()[0].body).toEqual({ characterId: 'char-1', version: 'cata-classic' })
  })

  it('shows the server error when the sync is refused', async () => {
    const message = 'Character is missing realm data needed for Battle.net sync'
    renderModal(character(), { status: 400, body: { error: message } })
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: /sync gear/i }))

    await waitFor(() => expect(showNotification).toHaveBeenCalledWith('error', message))
  })

  it('shows a connection error when the request fails', async () => {
    renderModal(character(), 'reject')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: /sync gear/i }))

    await waitFor(() =>
      expect(showNotification).toHaveBeenCalledWith('error', "Couldn't sync gear. Check your connection.")
    )
  })

  it('offers Link instead of Sync gear for a character that is not linked', async () => {
    renderModal(character({ battle_net_id: null }))

    await screen.findByRole('button', { name: /^link$/i })
    expect(screen.queryByRole('button', { name: /sync gear/i })).toBeNull()
    expect(syncRequests()).toHaveLength(0)
  })
})

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CreateCharacterModal } from '../CreateCharacterModal'
import { useNotification } from '@/app/contexts/NotificationContext'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { trackClientEvent } from '@/utils/analytics/client'
import { hasFeature } from '@/domain/guild/feature-flags'

const GUILD = { id: 'guild-1', name: 'Test Guild' }
const CHARACTER = { id: 'char-1', name: 'Thrall' }

vi.mock('@/app/contexts/GuildContext', () => ({ useGuildContext: vi.fn() }))
vi.mock('@/app/contexts/NotificationContext', () => ({ useNotification: vi.fn() }))
vi.mock('@/utils/analytics/client', () => ({ trackClientEvent: vi.fn() }))
vi.mock('@/domain/guild/feature-flags', () => ({ hasFeature: vi.fn(() => false) }))
// The embedded BattlenetCharacterPickerModal calls useRouter.
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))

// createBrowserClient throws without NEXT_PUBLIC_SUPABASE_* env vars, so the
// client is a table-aware stand-in: one class, one spec, no Battle.net link.
vi.mock('@/utils/supabase/client', () => {
  const tables: Record<string, { data: unknown; error: unknown }> = {
    wow_classes: { data: [{ id: 'class-1', name: 'Warrior', color_hex: '#c79c6e' }], error: null },
    class_specs: { data: [{ id: 'spec-1', class_id: 'class-1', name: 'Arms' }], error: null },
    battlenet_accounts: { data: null, error: null },
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

type Attach = { status: number; body: unknown } | 'reject'

interface Harness {
  attach?: Attach
  raidTeams?: Array<{ id: string; name: string; color_hex: string }>
}

interface Recorded {
  url: string
  method: string
  body: unknown
}

let requests: Recorded[] = []
let showNotification: Mock<(type: string, message: string, duration?: number) => void>
let refreshCharacters: Mock<() => Promise<void>>
let onClose: Mock<() => void>
let reload: Mock<() => void>
const originalLocation = window.location

/** Routes fetch by URL and method; the guild attach answer is per test. */
function routeFetch(h: Harness) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method ?? 'GET'
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined
    requests.push({ url, method, body })

    if (url.startsWith('/api/guild-members')) return reply(200, { members: [] })
    if (url.startsWith('/api/raid-teams?')) return reply(200, { teams: h.raidTeams ?? [] })
    if (url === '/api/characters' && method === 'POST') return reply(201, { character: CHARACTER })
    if (url === `/api/characters/${CHARACTER.id}/guilds` && method === 'POST') {
      const attach = h.attach ?? { status: 201, body: { membership: { id: 'm-1' } } }
      if (attach === 'reject') throw new TypeError('Failed to fetch')
      return reply(attach.status, attach.body)
    }
    if (url === '/api/user/active-character' && method === 'PUT') return reply(200, {})
    if (url.startsWith('/api/raid-teams/') && method === 'POST') return reply(201, {})
    return reply(404, { error: 'unrouted in test' })
  })
}

const requestsTo = (url: string, method: string) => requests.filter(r => r.url === url && r.method === method)

function renderModal(h: Harness = {}) {
  vi.stubGlobal('fetch', routeFetch(h))
  render(<CreateCharacterModal isOpen onClose={onClose} />)
}

/** Fills the form the way a user does and submits it. */
async function submit(options: { raidTeam?: string } = {}) {
  const user = userEvent.setup()
  await user.type(screen.getByPlaceholderText('e.g. Zevinall'), 'Thrall')
  const [classSelect] = await screen.findAllByRole('combobox')
  await screen.findByRole('option', { name: 'Warrior' })
  await user.selectOptions(classSelect, 'Warrior')
  const specSelect = (await screen.findAllByRole('combobox'))[1]
  await user.selectOptions(specSelect, 'Arms')
  if (options.raidTeam) {
    // Class, spec, then the raid team select once the teams have loaded.
    await screen.findByRole('option', { name: options.raidTeam })
    const selects = await screen.findAllByRole('combobox')
    await user.selectOptions(selects[selects.length - 1], options.raidTeam)
  }
  await user.click(screen.getByRole('button', { name: /Create character/ }))
}

beforeEach(() => {
  requests = []
  showNotification = vi.fn()
  refreshCharacters = vi.fn(async () => {})
  onClose = vi.fn()
  reload = vi.fn()
  vi.mocked(useGuildContext).mockReturnValue({
    activeGuild: GUILD,
    userCharacters: [],
    refreshCharacters,
    switchCharacter: vi.fn(),
    currentExpansion: null,
  } as never)
  vi.mocked(useNotification).mockReturnValue({ showNotification } as never)
  vi.mocked(hasFeature).mockReturnValue(false)
  vi.mocked(trackClientEvent).mockReset()
  // jsdom's location is not writable, so swap in a copy whose reload is a spy.
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: { ...originalLocation, reload, href: 'http://localhost/dashboard' },
  })
})

afterEach(() => {
  Object.defineProperty(window, 'location', { configurable: true, writable: true, value: originalLocation })
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('CreateCharacterModal guild attach', () => {
  it('never reads or clears a pending_guild_join sessionStorage hint', async () => {
    // regression for #356: the modal read a sessionStorage key nothing wrote
    const getItem = vi.spyOn(Storage.prototype, 'getItem')
    const removeItem = vi.spyOn(Storage.prototype, 'removeItem')
    renderModal()

    await submit()
    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1))

    expect(getItem).not.toHaveBeenCalledWith('pending_guild_join')
    expect(removeItem).not.toHaveBeenCalledWith('pending_guild_join')
  })

  it('attaches the new character to the active guild as a manual join', async () => {
    renderModal()

    await submit()
    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1))

    const [attach] = requestsTo(`/api/characters/${CHARACTER.id}/guilds`, 'POST')
    expect(attach.body).toEqual({ guild_id: GUILD.id, joined_via: 'manual' })
  })

  it('on a successful attach sets the active character in the guild and reloads once', async () => {
    renderModal()

    await submit()
    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1))

    const [put] = requestsTo('/api/user/active-character', 'PUT')
    expect(put.body).toEqual({ character_id: CHARACTER.id, guild_id: GUILD.id })
    expect(showNotification).not.toHaveBeenCalledWith('warning', expect.anything(), expect.anything())
    expect(showNotification).not.toHaveBeenCalledWith('warning', expect.anything())
  })
})

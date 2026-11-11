import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CreateGuildModal } from '../CreateGuildModal'
import { LOOT_STYLE_PRESETS } from '@/domain/guild/loot-style-presets'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ alt, src }: { alt: string; src: string }) => <img alt={alt} src={src} />,
}))
vi.mock('@/utils/analytics/client', () => ({ trackClientEvent: vi.fn() }))

// The pickers are not under test; a button stands in for choosing a ruleset or realm.
vi.mock('@/app/components/ForeverRulesetSelector', () => ({
  default: ({ onChange }: { onChange: (v: string) => void }) => (
    <button type="button" onClick={() => onChange('PvP (US)')}>
      Pick ruleset
    </button>
  ),
}))
vi.mock('@/app/components/RealmSelector', () => ({
  default: ({ onRealmChange }: { onRealmChange: (v: string) => void }) => (
    <button type="button" onClick={() => onRealmChange('Test Realm')}>
      Pick realm
    </button>
  ),
}))

// Table-aware stand-in: a verified user, and no guild with the chosen name yet.
vi.mock('@/utils/supabase/client', () => {
  function from(table: string) {
    const result =
      table === 'user_preferences'
        ? { data: { discord_verified: true }, error: null }
        : { data: [], error: null }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain: any = {
      select: () => chain,
      eq: () => chain,
      ilike: () => chain,
      limit: () => chain,
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

interface Recorded {
  url: string
  method: string
  body: Record<string, unknown> | undefined
}

let requests: Recorded[] = []

function reply(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body }
}

beforeEach(() => {
  requests = []
  localStorage.clear()
  // The modal sends the browser to /overview after a successful create.
  Object.defineProperty(window, 'location', { configurable: true, value: { href: 'http://localhost/' } })
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const method = init?.method ?? 'GET'
      const body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined
      requests.push({ url, method, body })

      if (url === '/api/discord-servers') {
        return reply(200, { guilds: [{ id: 'server-1', name: 'Test Server', icon: null, owner: true, permissions: '8' }] })
      }
      if (url.startsWith('/api/discord/check-bot')) return reply(200, { installed: true })
      if (url === '/api/guilds' && method === 'POST') return reply(200, { guild: { id: 'guild-1' } })
      return reply(200, {})
    }),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

/** Walks Connect Discord and Add guild details to reach Finalize settings. */
async function openFinalizeStep(user: ReturnType<typeof userEvent.setup>) {
  render(<CreateGuildModal isOpen onClose={vi.fn()} />)
  await user.click(await screen.findByRole('button', { name: /Test Server/ }))
  const toDetails = screen.getByRole('button', { name: /Continue/ })
  await waitFor(() => expect(toDetails).toBeEnabled())
  await user.click(toDetails)
  // The name check is debounced, so Continue unlocks a moment after the name fills in.
  const toSettings = screen.getByRole('button', { name: /Continue/ })
  await waitFor(() => expect(toSettings).toBeEnabled())
  await user.click(toSettings)
  await screen.findByText('Faction')
}

describe('CreateGuildModal loot style step', () => {
  it('shows the Loot style block after Faction and before Summary, with Reward attendance preselected', async () => {
    const user = userEvent.setup()
    await openFinalizeStep(user)

    const group = screen.getByRole('radiogroup', { name: 'Loot style' })
    expect(within(group).getAllByRole('radio')).toHaveLength(3)
    expect(screen.getByRole('radio', { name: /Reward attendance/ })).toBeChecked()

    const faction = screen.getByText('Faction')
    const summary = screen.getByText('Summary')
    expect(faction.compareDocumentPosition(group) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(group.compareDocumentPosition(summary) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    // Presets show for every guild, and a new one has nothing to confirm over.
    expect(screen.queryByText('Custom')).not.toBeInTheDocument()
  })

  it('lists what the selected preset sets in a read-only Fine-tune, then the footnote', async () => {
    const user = userEvent.setup()
    await openFinalizeStep(user)

    const toggle = screen.getByRole('button', { name: /Fine-tune/ })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    // The footnote is a reassurance, so it stays visible with the list folded away.
    const footnote = screen.getByText('You can change this any time in Loot system settings.')
    expect(footnote).toBeVisible()

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    const region = document.getElementById(toggle.getAttribute('aria-controls') as string) as HTMLElement
    expect(within(region).getByText('What this sets')).toBeInTheDocument()
    const lines = within(region).getAllByRole('listitem').map((li) => li.textContent)
    expect(lines).toEqual([...LOOT_STYLE_PRESETS.reward_attendance.summary])
    expect(lines.length).toBeLessThanOrEqual(6)
    expect(region.compareDocumentPosition(footnote) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    // Read-only: no knob controls live here.
    expect(within(region).queryByRole('textbox')).not.toBeInTheDocument()
    expect(within(region).queryByRole('combobox')).not.toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: /Even rotation/ }))
    const next = within(region).getAllByRole('listitem').map((li) => li.textContent)
    expect(next).toEqual([...LOOT_STYLE_PRESETS.even_rotation.summary])
  })

  it('adds the loot style to the Summary card and follows the choice', async () => {
    const user = userEvent.setup()
    await openFinalizeStep(user)

    expect(screen.getByText('Loot style: Reward attendance')).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: /Even rotation/ }))

    expect(screen.getByText('Loot style: Even rotation')).toBeInTheDocument()
    expect(screen.queryByText('Loot style: Reward attendance')).not.toBeInTheDocument()
  })

  it('sends the chosen loot_style in the POST /api/guilds body and never calls guild-settings', async () => {
    const user = userEvent.setup()
    await openFinalizeStep(user)

    await user.click(screen.getByRole('button', { name: 'Pick ruleset' }))
    await user.click(screen.getByRole('radio', { name: /Even rotation/ }))
    await user.click(screen.getByRole('button', { name: 'Create guild' }))

    await waitFor(() => expect(requests.some((r) => r.url === '/api/guilds' && r.method === 'POST')).toBe(true))
    const post = requests.find((r) => r.url === '/api/guilds' && r.method === 'POST')!
    expect(post.body).toMatchObject({
      name: 'Test Server',
      faction: 'Alliance',
      discord_server_id: 'server-1',
      loot_style: 'even_rotation',
    })
    // A settings PUT here would mark the activation milestone (research F4).
    expect(requests.filter((r) => r.url.includes('/api/guild-settings'))).toHaveLength(0)
  })

  it('sends the preselected Reward attendance when the officer changes nothing', async () => {
    const user = userEvent.setup()
    await openFinalizeStep(user)

    await user.click(screen.getByRole('button', { name: 'Pick ruleset' }))
    await user.click(screen.getByRole('button', { name: 'Create guild' }))

    await waitFor(() => expect(requests.some((r) => r.url === '/api/guilds' && r.method === 'POST')).toBe(true))
    expect(requests.find((r) => r.url === '/api/guilds')!.body?.loot_style).toBe('reward_attendance')
  })

  it('keeps the officer on the step with the existing error when creation fails', async () => {
    const user = userEvent.setup()
    await openFinalizeStep(user)
    vi.mocked(fetch).mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.startsWith('/api/discord/check-bot')) return reply(200, { installed: true }) as Response
      if (url === '/api/guilds' && init?.method === 'POST') return reply(400, { error: 'loot_style must be one of the loot style presets' }) as Response
      return reply(200, {}) as Response
    })

    await user.click(screen.getByRole('button', { name: 'Pick ruleset' }))
    await user.click(screen.getByRole('button', { name: 'Create guild' }))

    expect(await screen.findByText('loot_style must be one of the loot style presets')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Reward attendance/ })).toBeChecked()
  })
})

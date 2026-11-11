import { Suspense } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ExpansionDetailPage, { CompactRaidToggle } from '../_client'
import { DISCOVERY_FOREVER_ONLY_REASON, KNOWN_SWITCH_BLOCKED_REASON } from '@/domain/loot/list-mode'

// Fixtures use generic raid names; no names from production appear here.
const GUILD_ID = 'guild-1'
const EXPANSION_ID = 'expansion-1'
const TIER_ONE = 'tier-1'
const TIER_TWO = 'tier-2'

type TierFixture = {
  id: string
  name: string
  phase: number
  is_guild_active: boolean
  master_sheet_visible: boolean
  list_mode: 'known' | 'discovery'
}

const fixture: { expansionName: string; tiers: TierFixture[] } = {
  expansionName: 'Forever',
  tiers: [],
}

const guildState = {
  loading: false,
  activeGuild: { id: GUILD_ID, game: 'forever' } as { id: string; game: string },
  hasPermission: (() => true) as (permission: string) => boolean,
}

const mutateMock = vi.fn()
const showNotification = vi.fn()
const pushMock = vi.fn()
const fetchMock = vi.fn()

vi.mock('@/app/contexts/GuildContext', () => ({
  useGuildContext: () => guildState,
}))
vi.mock('@/app/contexts/NotificationContext', () => ({
  useNotification: () => ({ showNotification }),
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))
vi.mock('swr', () => ({
  useSWRConfig: () => ({ mutate: mutateMock }),
}))
vi.mock('@/utils/analytics/client', () => ({
  trackClientEvent: vi.fn(),
}))
vi.mock('@/utils/supabase/client', () => {
  // A thenable builder: the page awaits some chains directly and ends others
  // with .single(), so both resolve to the same fixture result.
  const makeBuilder = (result: () => unknown) => {
    const builder: Record<string, unknown> = {}
    builder.select = () => builder
    builder.eq = () => builder
    builder.single = async () => result()
    builder.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve(result()).then(resolve, reject)
    return builder
  }
  const client = {
    rpc: async () => ({
      data: [
        {
          expansion_id: EXPANSION_ID,
          expansion_name: fixture.expansionName,
          raid_start_date: null,
          is_current: true,
        },
      ],
      error: null,
    }),
    from: (table: string) =>
      makeBuilder(() =>
        table === 'raid_tiers'
          ? { data: fixture.tiers, error: null }
          : { data: { phase_deadlines: {}, current_phase: 1, phase_groups: null }, error: null }
      ),
  }
  return { createClient: () => client }
})

function tier(overrides: Partial<TierFixture> & Pick<TierFixture, 'id' | 'name'>): TierFixture {
  return { phase: 1, is_guild_active: true, master_sheet_visible: true, list_mode: 'known', ...overrides }
}

// React 19's use() reads a promise carrying status and value synchronously,
// which keeps the page out of Suspense for the test.
function resolvedParams() {
  const promise = Promise.resolve({ expansionId: EXPANSION_ID }) as Promise<{ expansionId: string }> & {
    status: string
    value: { expansionId: string }
  }
  promise.status = 'fulfilled'
  promise.value = { expansionId: EXPANSION_ID }
  return promise
}

async function renderPage() {
  render(
    <Suspense fallback={null}>
      <ExpansionDetailPage params={resolvedParams()} />
    </Suspense>
  )
  await screen.findByText('Raid One')
}

function jsonResponse(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body }
}

function modeGroup(raid: string) {
  return screen.getByRole('group', { name: `List mode for ${raid}` })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', fetchMock)
  fixture.expansionName = 'Forever'
  fixture.tiers = [
    tier({ id: TIER_ONE, name: 'Raid One', list_mode: 'known' }),
    tier({ id: TIER_TWO, name: 'Raid Two', list_mode: 'discovery' }),
  ]
  guildState.hasPermission = () => true
})

describe('[D-15] list mode control on the expansion page', () => {
  it('shows a List mode control with Known and Discovery on every tier of a Forever expansion for managers', async () => {
    await renderPage()

    for (const raid of ['Raid One', 'Raid Two']) {
      const group = modeGroup(raid)
      expect(within(group).getByRole('button', { name: 'Known' })).toBeInTheDocument()
      expect(within(group).getByRole('button', { name: 'Discovery' })).toBeInTheDocument()
    }
    expect(screen.getAllByText('List mode')).toHaveLength(2)
    expect(within(modeGroup('Raid One')).getByRole('button', { name: 'Known' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(modeGroup('Raid Two')).getByRole('button', { name: 'Discovery' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('shows nothing new on a Classic expansion', async () => {
    fixture.expansionName = 'Classic'
    guildState.activeGuild = { id: GUILD_ID, game: 'classic' }
    try {
      await renderPage()

      expect(screen.queryByText('List mode')).not.toBeInTheDocument()
      expect(screen.queryByRole('group', { name: /List mode for/ })).not.toBeInTheDocument()
      expect(screen.queryByText('Discovery')).not.toBeInTheDocument()
    } finally {
      guildState.activeGuild = { id: GUILD_ID, game: 'forever' }
    }
  })

  it('confirms before Known to Discovery, then sends the PATCH and refreshes both SWR keys', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { success: true }))
    const user = userEvent.setup()
    await renderPage()

    await user.click(within(modeGroup('Raid One')).getByRole('button', { name: 'Discovery' }))

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent('Switch Raid One to Discovery?')
    expect(dialog).toHaveTextContent(
      'Raiders will pick five gear needs instead of ranking items. You can switch back until a need is ranked or won.'
    )
    expect(fetchMock).not.toHaveBeenCalled()

    await user.click(within(dialog).getByRole('button', { name: 'Switch to Discovery' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/raid-tiers')
    expect(init.method).toBe('PATCH')
    expect(JSON.parse(init.body)).toEqual({
      guild_id: GUILD_ID,
      tier_id: TIER_ONE,
      updates: { list_mode: 'discovery' },
    })

    await waitFor(() => expect(mutateMock).toHaveBeenCalled())
    const matcher = mutateMock.mock.calls[0][0] as (key: string) => boolean
    expect(matcher('/api/raid-tiers?expansion_id=x')).toBe(true)
    expect(matcher('/api/loot-items?guild_id=x')).toBe(true)
    expect(matcher('/api/other')).toBe(false)
    await waitFor(() =>
      expect(within(modeGroup('Raid One')).getByRole('button', { name: 'Discovery' })).toHaveAttribute('aria-pressed', 'true')
    )
  })

  it('leaves the tier alone when the Discovery confirm is declined', async () => {
    const user = userEvent.setup()
    await renderPage()

    await user.click(within(modeGroup('Raid One')).getByRole('button', { name: 'Discovery' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Not now' }))

    expect(fetchMock).not.toHaveBeenCalled()
    expect(within(modeGroup('Raid One')).getByRole('button', { name: 'Known' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('sends Discovery to Known without a confirm', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { success: true }))
    const user = userEvent.setup()
    await renderPage()

    await user.click(within(modeGroup('Raid Two')).getByRole('button', { name: 'Known' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      guild_id: GUILD_ID,
      tier_id: TIER_TWO,
      updates: { list_mode: 'known' },
    })
    await waitFor(() =>
      expect(within(modeGroup('Raid Two')).getByRole('button', { name: 'Known' })).toHaveAttribute('aria-pressed', 'true')
    )
  })

  it('snaps back and shows the 409 reason verbatim in an alert panel', async () => {
    fetchMock.mockResolvedValue(jsonResponse(409, { error: KNOWN_SWITCH_BLOCKED_REASON }))
    const user = userEvent.setup()
    await renderPage()

    await user.click(within(modeGroup('Raid Two')).getByRole('button', { name: 'Known' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(KNOWN_SWITCH_BLOCKED_REASON)
    expect(within(modeGroup('Raid Two')).getByRole('button', { name: 'Discovery' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(modeGroup('Raid Two')).getByRole('button', { name: 'Known' })).toHaveAttribute('aria-pressed', 'false')
    expect(mutateMock).not.toHaveBeenCalled()
  })

  it('shows the 400 reason verbatim', async () => {
    fetchMock.mockResolvedValue(jsonResponse(400, { error: DISCOVERY_FOREVER_ONLY_REASON }))
    const user = userEvent.setup()
    await renderPage()

    await user.click(within(modeGroup('Raid One')).getByRole('button', { name: 'Discovery' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Switch to Discovery' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(DISCOVERY_FOREVER_ONLY_REASON)
    expect(within(modeGroup('Raid One')).getByRole('button', { name: 'Known' })).toHaveAttribute('aria-pressed', 'true')
  })

  it("falls back to the generic sentence when the response carries no reason", async () => {
    fetchMock.mockResolvedValue(jsonResponse(500, {}))
    const user = userEvent.setup()
    await renderPage()

    await user.click(within(modeGroup('Raid Two')).getByRole('button', { name: 'Known' }))

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't change the list mode. Try again.")
  })

  it('falls back to the generic sentence when the request itself fails', async () => {
    fetchMock.mockRejectedValue(new Error('network down'))
    const user = userEvent.setup()
    await renderPage()

    await user.click(within(modeGroup('Raid Two')).getByRole('button', { name: 'Known' }))

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't change the list mode. Try again.")
  })

  it('clears the reason on a tap and on the next successful change', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(409, { error: KNOWN_SWITCH_BLOCKED_REASON }))
    const user = userEvent.setup()
    await renderPage()

    await user.click(within(modeGroup('Raid Two')).getByRole('button', { name: 'Known' }))
    await user.click(await screen.findByRole('alert'))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    fetchMock.mockResolvedValueOnce(jsonResponse(409, { error: KNOWN_SWITCH_BLOCKED_REASON }))
    await user.click(within(modeGroup('Raid Two')).getByRole('button', { name: 'Known' }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()

    fetchMock.mockResolvedValueOnce(jsonResponse(200, { success: true }))
    await user.click(within(modeGroup('Raid Two')).getByRole('button', { name: 'Known' }))
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
  })

  it('disables the control while the request runs', async () => {
    let finish: (value: unknown) => void = () => {}
    fetchMock.mockReturnValue(new Promise(resolve => { finish = resolve }))
    const user = userEvent.setup()
    await renderPage()

    await user.click(within(modeGroup('Raid Two')).getByRole('button', { name: 'Known' }))

    await waitFor(() => expect(within(modeGroup('Raid Two')).getByRole('button', { name: 'Known' })).toBeDisabled())
    expect(within(modeGroup('Raid Two')).getByRole('button', { name: 'Discovery' })).toBeDisabled()

    finish(jsonResponse(200, { success: true }))
    await waitFor(() => expect(within(modeGroup('Raid Two')).getByRole('button', { name: 'Known' })).not.toBeDisabled())
  })
})

describe('[UI-16] mixed list modes in one phase', () => {
  const NOTE = 'Raids in this phase use different list modes. Raiders see the item list until every raid matches.'

  it('shows the note when two tiers of a phase use different modes', async () => {
    await renderPage()

    expect(screen.getByText(NOTE)).toBeInTheDocument()
  })

  it('shows no note when every tier of the phase matches', async () => {
    fixture.tiers = [
      tier({ id: TIER_ONE, name: 'Raid One', list_mode: 'discovery' }),
      tier({ id: TIER_TWO, name: 'Raid Two', list_mode: 'discovery' }),
    ]
    await renderPage()

    expect(screen.queryByText(NOTE)).not.toBeInTheDocument()
  })

  it('ignores a tier the guild turned off, since raiders never see it', async () => {
    fixture.tiers = [
      tier({ id: TIER_ONE, name: 'Raid One', list_mode: 'discovery' }),
      tier({ id: TIER_TWO, name: 'Raid Two', list_mode: 'known', is_guild_active: false }),
    ]
    await renderPage()

    expect(screen.queryByText(NOTE)).not.toBeInTheDocument()
  })
})

describe('[D-15] read-only badge for users without manage_settings', () => {
  const baseProps = {
    game: 'forever' as const,
    updating: null,
    onToggleActive: vi.fn(),
    onToggleRankings: vi.fn(),
  }

  it('shows a Discovery badge and no control on a Discovery tier', () => {
    render(
      <CompactRaidToggle
        {...baseProps}
        tier={tier({ id: TIER_TWO, name: 'Raid Two', list_mode: 'discovery' })}
        listMode={{ canManage: false, reason: undefined, onChange: vi.fn(), onDismissReason: vi.fn() }}
      />
    )

    expect(screen.getByText('Discovery')).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: /List mode for/ })).not.toBeInTheDocument()
    expect(screen.queryByText('List mode')).not.toBeInTheDocument()
  })

  it('shows nothing on a Known tier', () => {
    render(
      <CompactRaidToggle
        {...baseProps}
        tier={tier({ id: TIER_ONE, name: 'Raid One', list_mode: 'known' })}
        listMode={{ canManage: false, reason: undefined, onChange: vi.fn(), onDismissReason: vi.fn() }}
      />
    )

    expect(screen.queryByText('Discovery')).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: /List mode for/ })).not.toBeInTheDocument()
  })

  it('shows nothing new when no list mode surface is passed (other expansions)', () => {
    render(<CompactRaidToggle {...baseProps} tier={tier({ id: TIER_TWO, name: 'Raid Two', list_mode: 'discovery' })} />)

    expect(screen.queryByText('Discovery')).not.toBeInTheDocument()
    expect(screen.queryByText('List mode')).not.toBeInTheDocument()
  })
})

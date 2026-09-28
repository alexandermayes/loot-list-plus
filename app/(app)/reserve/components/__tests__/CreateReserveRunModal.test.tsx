import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CreateReserveRunModal } from '../CreateReserveRunModal'

// Hoisted mutable state so per-test values can be set before render while the
// vi.mock factories below (which vitest hoists to the top of the module) can
// still close over the same object.
const { guildState, tiersState } = vi.hoisted(() => ({
  guildState: { activeGuild: null as { id: string; game?: string; active_expansion_id: string } | null },
  tiersState: { tiers: [] as { id: string; name: string; phase: number | null }[], eqArgs: [] as unknown[][] },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('@/utils/supabase/client', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: (...args: unknown[]) => {
          tiersState.eqArgs.push(args)
          return {
            order: () => Promise.resolve({ data: tiersState.tiers, error: null }),
          }
        },
      }),
    }),
  }),
}))

vi.mock('@/app/contexts/GuildContext', () => ({
  useGuildContext: () => ({ activeGuild: guildState.activeGuild }),
}))

vi.mock('@/app/contexts/NotificationContext', () => ({
  useNotification: () => ({ showNotification: vi.fn() }),
}))

vi.mock('@/utils/analytics/client', () => ({
  trackClientEvent: vi.fn(),
}))

vi.mock('@/app/components/ReserveItemPicker', () => ({
  default: () => null,
}))

describe('CreateReserveRunModal, Forever vs Classic wording (EW-C8, EW-C9)', () => {
  beforeEach(() => {
    tiersState.tiers = []
    tiersState.eqArgs = []
    guildState.activeGuild = null
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({ json: () => Promise.resolve({ success: true, items: [] }) } as Response)
    ))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('Forever guild with no raid tiers: shows the raid-only step 1 copy and the Forever empty state, no Classic tiles, no "expansion" wording', async () => {
    guildState.activeGuild = { id: 'g1', game: 'forever', active_expansion_id: 'exp-f' }
    tiersState.tiers = []

    render(<CreateReserveRunModal open={true} onClose={vi.fn()} />)

    expect(await screen.findByText('WoW Forever has no raids open yet.')).toBeInTheDocument()
    expect(screen.getByText('Pick a raid to get started')).toBeInTheDocument()

    expect(tiersState.eqArgs).toContainEqual(['expansion_id', 'exp-f'])

    for (const label of ['Classic', 'TBC', 'WotLK', 'Cata', 'MoP']) {
      expect(screen.queryByText(label)).not.toBeInTheDocument()
    }

    expect(document.body.textContent?.toLowerCase()).not.toContain('expansion')
  })

  it('Forever guild with a raid tier: shows the tier without clicking any tile', async () => {
    guildState.activeGuild = { id: 'g1', game: 'forever', active_expansion_id: 'exp-f' }
    tiersState.tiers = [{ id: 't1', name: 'Test Raid', phase: 1 }]

    render(<CreateReserveRunModal open={true} onClose={vi.fn()} />)

    expect(await screen.findByText('Test Raid')).toBeInTheDocument()
  })

  it('Guild object with no game field behaves like Classic: shows the Expansion tiles and, after picking one, the Classic empty state', async () => {
    guildState.activeGuild = { id: 'g1', active_expansion_id: 'exp-c' } as unknown as { id: string; active_expansion_id: string }
    tiersState.tiers = []

    const user = userEvent.setup()
    render(<CreateReserveRunModal open={true} onClose={vi.fn()} />)

    expect(screen.getByText('Pick an expansion and raid to get started')).toBeInTheDocument()
    expect(screen.getByText('Expansion')).toBeInTheDocument()
    for (const label of ['Classic', 'TBC', 'WotLK', 'Cata', 'MoP']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }

    expect(tiersState.eqArgs).toHaveLength(0)

    await user.click(screen.getByText('Classic'))

    expect(await screen.findByText('No raid data available for this expansion yet.')).toBeInTheDocument()
  })
})

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CreateReserveRunModal } from '../CreateReserveRunModal'

// Hoisted mutable state so per-test values can be set before render while the
// vi.mock factories below (which vitest hoists to the top of the module) can
// still close over the same object.
const { guildState, tiersState, slowTierRender } = vi.hoisted(() => ({
  guildState: { activeGuild: null as { id: string; game?: string; active_expansion_id: string } | null },
  tiersState: { tiers: [] as { id: string; name: string; phase: number | null }[], eqArgs: [] as unknown[][] },
  slowTierRender: { tierName: null as string | null },
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

// Delegates to the actual module for every raid name except the one armed by
// slowTierRender, so the other three tests render identically to today.
// getRaidIcon runs while rendering the commit that sets selectedTierId, so
// busy-waiting here makes that scheduler task overrun React's 5ms slice;
// React then yields before running the commit's passive effects, leaving the
// 'load items when tier changes' effect pending, the same state a loaded CI
// runner hit in PR #337.
vi.mock('@/utils/raidIcons', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/raidIcons')>()
  return {
    ...actual,
    getRaidIcon: (name: string) => {
      if (slowTierRender.tierName === name) {
        slowTierRender.tierName = null
        const deadline = performance.now() + 30
        while (performance.now() < deadline) {
          // busy-wait
        }
      }
      return actual.getRaidIcon(name)
    },
  }
})

describe('CreateReserveRunModal, Forever vs Classic wording (EW-C8, EW-C9)', () => {
  beforeEach(() => {
    tiersState.tiers = []
    tiersState.eqArgs = []
    guildState.activeGuild = null
    slowTierRender.tierName = null
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({ json: () => Promise.resolve({ success: true, items: [] }) } as Response)
    ))
  })

  /**
   * This file's afterEach runs BEFORE the root-level afterEach registered in
   * vitest.setup.ts (RTL cleanup()). If this afterEach restores the real
   * fetch first, the component is still mounted when cleanup() runs next;
   * unmounting flushes any pending passive effect, so a still-pending 'load
   * items when tier changes' effect calls Node's real fetch with a relative
   * URL ("Failed to parse URL from /api/reserve-runs/items?raid_tier_id=t1",
   * the PR #337 CI flake). Unmounting while fetch is still stubbed removes
   * that window entirely.
   */
  function teardown() {
    cleanup()
    vi.unstubAllGlobals()
  }

  afterEach(teardown)

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

  it('teardown unmounts while fetch is still stubbed, so a pending tier effect never reaches the real fetch', async () => {
    guildState.activeGuild = { id: 'g1', game: 'forever', active_expansion_id: 'exp-f' }
    tiersState.tiers = [{ id: 't1', name: 'Test Raid', phase: 1 }]
    slowTierRender.tierName = 'Test Raid'

    const fetchMock = globalThis.fetch as Mock

    render(<CreateReserveRunModal open={true} onClose={vi.fn()} />)

    // Not findByText/waitFor: RTL's async wrapper drains with a
    // setTimeout(0) afterwards, which can let the pending effect run first
    // and would make this guard non-deterministic.
    await new Promise<void>((resolve) => {
      if (screen.queryByText('Test Raid')) {
        resolve()
        return
      }
      const observer = new MutationObserver(() => {
        if (screen.queryByText('Test Raid')) {
          observer.disconnect()
          resolve()
        }
      })
      observer.observe(document.body, { subtree: true, childList: true, characterData: true })
    })

    // If this ever fails after a React upgrade, the scheduler no longer
    // leaves the effect pending and this guard must be re-derived, not
    // deleted.
    expect(fetchMock).not.toHaveBeenCalledWith('/api/reserve-runs/items?raid_tier_id=t1')

    teardown()

    expect(fetchMock).toHaveBeenCalledWith('/api/reserve-runs/items?raid_tier_id=t1')
  })
})

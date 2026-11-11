import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, waitFor } from '@testing-library/react'

import { LootListProvider, useLootList, type SaveSubmissionOptions } from '@/app/contexts/LootListContext'

// What the need picker needs from the context (04-11): the slot map, and a save
// that writes rankings it is handed. The editor's own save must stay as it was
// (T-04-11-03), so both paths are pinned here.
const hoisted = vi.hoisted(() => {
  const rpc = vi.fn(async () => ({ error: null }))
  const chain = (result: unknown) => {
    const link: Record<string, unknown> = {}
    for (const method of ['select', 'eq', 'upsert', 'in', 'order']) link[method] = () => link
    link.single = () => Promise.resolve(result)
    link.maybeSingle = () => Promise.resolve(result)
    return link
  }
  // One client for every render: a fresh one would re-run the effects that depend on it.
  const supabase = {
    rpc,
    from: (table: string) => {
      if (table === 'character_guild_memberships') return chain({ data: { id: 'm-1', is_active: true }, error: null })
      if (table === 'loot_submissions') {
        return chain({ data: { id: 'sub-1', status: 'draft', submitted_at: null }, error: null })
      }
      return chain({ data: null, error: null })
    },
  }
  return {
    rpc,
    supabase,
    showNotification: vi.fn(),
    swrMutate: vi.fn(),
    needTierSlots: { current: null as Record<string, number> | null },
    bootstrapBody: { current: {} as Record<string, unknown> },
  }
})

vi.mock('next/navigation', () => {
  const router = { replace: vi.fn() }
  const params = new URLSearchParams()
  return { useRouter: () => router, useSearchParams: () => params }
})
vi.mock('swr', () => ({ mutate: hoisted.swrMutate }))
vi.mock('@/utils/supabase/client', () => ({ createClient: () => hoisted.supabase }))
vi.mock('@/app/contexts/GuildContext', () => {
  const value = {
    activeGuild: { id: 'guild-1', name: 'Test guild' },
    activeCharacter: { id: 'char-1', name: 'Testchar' },
    loading: false,
    currentExpansion: { expansion_id: 'exp-1' },
    viewingExpansionId: null,
  }
  return { useGuildContext: () => value }
})
vi.mock('@/app/contexts/NotificationContext', () => ({
  useNotification: () => ({ showNotification: hoisted.showNotification }),
}))
vi.mock('@/utils/analytics/client', () => ({ trackClientEvent: vi.fn() }))
vi.mock('@/app/hooks/usePendingSubmissionCount', () => ({ notifySubmissionChanged: vi.fn() }))
vi.mock('@/lib/wowhead', () => ({ refreshWowheadTooltips: vi.fn() }))
vi.mock('@/app/hooks/use-api', () => {
  // Stable references: the context syncs state from these on every new identity.
  const tiers = { data: { tiers: [{ id: 'tier-1', name: 'Test raid', phase: 1, is_guild_active: true }], current_phase: 1, phase_groups: null }, isLoading: false }
  const submission = {
    data: {
      submission: { id: 'sub-1', status: 'draft', submitted_at: null },
      rankings: { '50-1': 'item-from-state' },
      removedItems: [],
      locks: [],
    },
    isLoading: false,
    mutate: vi.fn(),
  }
  const statuses = { data: { phaseStatuses: {} } }
  const gear = { data: { items: [], awarded_items: [] }, isLoading: false, mutate: vi.fn() }
  return {
    useRaidTiers: () => tiers,
    usePhaseSubmission: () => submission,
    usePhaseSubmissionStatuses: () => statuses,
    useCharacterGear: () => gear,
    usePhaseLootItems: () => ({
      data: { items: [], need_tier_slots: hoisted.needTierSlots.current },
      isLoading: false,
    }),
    invalidatePhaseSubmissionStatuses: vi.fn(),
    invalidateCharacterGear: vi.fn(),
  }
})

type Api = ReturnType<typeof useLootList>

function Capture({ onValue }: { onValue: (api: Api) => void }) {
  onValue(useLootList())
  return null
}

async function mountProvider() {
  let api!: Api
  render(
    <LootListProvider>
      <Capture onValue={(value) => { api = value }} />
    </LootListProvider>,
  )
  // Bootstrap resolves, then the submission sync effect fills the state.
  await waitFor(() => expect(api.isLoading).toBe(false))
  await waitFor(() => expect(api.rankings).toEqual({ '50-1': 'item-from-state' }))
  return () => api
}

const fetchMock = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  hoisted.needTierSlots.current = null
  hoisted.bootstrapBody.current = {
    tiers: [],
    current_phase: 1,
    phase_groups: null,
    selected_phase: 1,
    selected_phases: [1],
    items: [],
    submission: null,
    rankings: {},
    removedItems: [],
  }
  fetchMock.mockImplementation(async (url: string) => {
    if (String(url).startsWith('/api/loot-list/bootstrap')) {
      return { ok: true, json: async () => hoisted.bootstrapBody.current }
    }
    return { ok: true, json: async () => ({}) }
  })
  vi.stubGlobal('fetch', fetchMock)
})

describe('LootListContext need picker support (D-12, D-27)', () => {
  it('exposes needTierSlots from the phase items and null without a map', async () => {
    const getApi = await mountProvider()
    expect(getApi().needTierSlots).toBeNull()

    hoisted.needTierSlots.current = { 'tier-1': 1 }
    const second = await mountProvider()
    expect(second().needTierSlots).toEqual({ 'tier-1': 1 })
  })

  it('seeds the items cache with the bootstrap slot map, null when it is absent', async () => {
    hoisted.bootstrapBody.current = { ...hoisted.bootstrapBody.current, need_tier_slots: { 'tier-1': 1 } }
    await mountProvider()
    const seeded = hoisted.swrMutate.mock.calls.find(([key]) => String(key).startsWith('/api/loot-items'))
    expect(seeded?.[1]).toEqual({ items: [], need_tier_slots: { 'tier-1': 1 } })

    hoisted.swrMutate.mockClear()
    delete hoisted.bootstrapBody.current.need_tier_slots
    await mountProvider()
    const plain = hoisted.swrMutate.mock.calls.find(([key]) => String(key).startsWith('/api/loot-items'))
    expect(plain?.[1]).toEqual({ items: [], need_tier_slots: null })
  })

  it('saves and submits the rankings it is handed, not the editor state, and keeps them as the state', async () => {
    const getApi = await mountProvider()
    const handed = { '50-1': 'need-a', '50-2': 'need-b' }

    await act(async () => {
      await getApi().saveSubmission(true, { rankings: handed })
    })

    expect(hoisted.rpc).toHaveBeenCalledWith('save_submission_items', {
      p_submission_id: 'sub-1',
      p_items: [
        { loot_item_id: 'need-a', rank: 50, slot: 1 },
        { loot_item_id: 'need-b', rank: 50, slot: 2 },
      ],
    })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/loot-submissions/submit',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(getApi().rankings).toEqual(handed)
    expect(getApi().initialRankings).toEqual(handed)
    expect(hoisted.showNotification).toHaveBeenCalledWith('success', 'Loot List submitted. Officers will review it.')
  })

  it('uses a custom success message when one is given', async () => {
    const getApi = await mountProvider()
    const options: SaveSubmissionOptions = { rankings: { '50-1': 'need-a' }, successMessage: 'Saved. Officers will review your 5.' }

    await act(async () => {
      await getApi().saveSubmission(true, options)
    })

    expect(hoisted.showNotification).toHaveBeenCalledWith('success', 'Saved. Officers will review your 5.')
  })

  it('without options saves the editor state and shows today\'s messages (T-04-11-03)', async () => {
    const getApi = await mountProvider()

    await act(async () => {
      await getApi().saveSubmission(false)
    })
    expect(hoisted.rpc).toHaveBeenLastCalledWith('save_submission_items', {
      p_submission_id: 'sub-1',
      p_items: [{ loot_item_id: 'item-from-state', rank: 50, slot: 1 }],
    })
    expect(hoisted.showNotification).toHaveBeenLastCalledWith('success', 'Draft saved. Pick up where you left off anytime.')
    expect(fetchMock).not.toHaveBeenCalledWith('/api/loot-submissions/submit', expect.anything())

    await act(async () => {
      await getApi().saveSubmission(true)
    })
    expect(hoisted.showNotification).toHaveBeenLastCalledWith('success', 'Loot List submitted. Officers will review it.')
    expect(getApi().rankings).toEqual({ '50-1': 'item-from-state' })
  })
})

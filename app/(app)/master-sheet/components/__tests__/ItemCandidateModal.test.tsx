import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ItemCandidateModal } from '../ItemCandidateModal'
import type { PlayerRanking, LootItem } from '../BossSection'

// FU-1 of #331, #293 (D-05, OD-2, A-1): awarding a raider who already got
// the item on this raid night asks before recording another copy, sends that
// copy as award_copy, and a per-item failure shows an error toast instead of
// a false success toast.

const { showNotification } = vi.hoisted(() => ({ showNotification: vi.fn() }))

vi.mock('@/app/contexts/NotificationContext', () => ({
  useNotification: () => ({ showNotification }),
}))
vi.mock('@/app/components/ItemLink', () => ({
  default: ({ name }: { name: string }) => <span>{name}</span>,
}))

const ITEM: LootItem = {
  id: 'item-bindings',
  name: 'Qiraji Bindings of Command',
  boss_name: 'Shared Boss Loot',
  item_slot: 'Wrist',
  wowhead_id: 20928,
}

function ranking(overrides: Partial<PlayerRanking> = {}): PlayerRanking {
  return {
    player_name: 'Thrall',
    class_name: 'Shaman',
    class_color: '#0070DE',
    loot_score: 10,
    rank: 1,
    attendance_score: 5,
    role_modifier: 0,
    role_bonus: 0,
    priority_bonus: 0,
    bad_luck_bonus: 0,
    trial_penalty: 0,
    donation_bonus: 0,
    raider_bonus: 0,
    is_trial: false,
    character_id: 'char-thrall',
    raids_attended: 4,
    is_eligible: true,
    ...overrides,
  }
}

const C1 = 'Thrall already received Qiraji Bindings of Command on this raid night. Award another copy?'
const C2 = 'Award another copy'
const C3 = 'Thrall already has 10 copies of Qiraji Bindings of Command from this raid night.'
const SUCCESS = 'Qiraji Bindings of Command awarded to Thrall'

type PostBody = { guild_id: string; items: Array<Record<string, unknown>> }

/** Stubs fetch: the recent-awards GET answers an empty list, and each POST
 * to the bulk route answers the next scripted per-item result. */
function stubFetch(postResults: Array<Record<string, unknown>>) {
  const posts: PostBody[] = []
  const queue = [...postResults]
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    if (init?.method === 'POST' && url === '/api/loot-history/bulk') {
      posts.push(JSON.parse(String(init.body)))
      const result = queue.shift() ?? { index: 0, success: true, id: 'hist-x' }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ results: [result] }) } as Response)
    }
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ data: [] }) } as Response)
  })
  vi.stubGlobal('fetch', fetchMock)
  return { posts }
}

function renderModal(rankings: PlayerRanking[] = [ranking()], onAwardComplete = vi.fn()) {
  render(
    <ItemCandidateModal
      open
      onClose={() => {}}
      item={ITEM}
      rankings={rankings}
      priority={null}
      receivedCharacterIds={new Set()}
      guildSettings={{}}
      guildId="guild-1"
      isOfficer
      mostRecentRaidEventId="ev-1"
      onAwardComplete={onAwardComplete}
    />,
  )
  return { onAwardComplete }
}

async function startAward(index = 0) {
  await userEvent.click(screen.getAllByRole('button', { name: 'Award' })[index])
  await userEvent.click(screen.getByRole('button', { name: 'Confirm award' }))
}

const toasts = (kind: 'success' | 'error') =>
  showNotification.mock.calls.filter(([k]) => k === kind).map(([, message]) => message)

describe('ItemCandidateModal second copy on one raid night', () => {
  beforeEach(() => {
    showNotification.mockReset()
    vi.unstubAllGlobals()
  })

  afterEach(() => {
    // Unmount while fetch is still stubbed (quick task 261001-t74).
    cleanup()
    vi.unstubAllGlobals()
  })

  it('M1 a duplicate with a next copy shows C-1 and C-2, and confirming sends that award_copy', async () => {
    const { posts } = stubFetch([
      { index: 0, success: false, error: 'duplicate', next_award_copy: 2 },
      { index: 0, success: true, id: 'hist-2' },
    ])
    const { onAwardComplete } = renderModal()

    await startAward()
    expect(await screen.findByText(C1)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: C2 })).toBeInTheDocument()
    expect(toasts('success')).toEqual([])
    expect(toasts('error')).toEqual([])
    expect(posts[0].items[0]).not.toHaveProperty('award_copy')

    await userEvent.click(screen.getByRole('button', { name: C2 }))
    await waitFor(() => expect(toasts('success')).toEqual([SUCCESS]))
    expect(posts).toHaveLength(2)
    expect(posts[1].items[0]).toMatchObject({
      award_copy: 2,
      character_id: 'char-thrall',
      loot_item_id: 'item-bindings',
      raid_event_id: 'ev-1',
      reason: posts[0].items[0].reason,
      note: posts[0].items[0].note,
    })
    expect(screen.queryByText(C1)).not.toBeInTheDocument()
    expect(onAwardComplete).toHaveBeenCalledTimes(1)
  })

  it('M2 a per-item failure shows "Failed to award: boom" and no success toast', async () => {
    stubFetch([{ index: 0, success: false, error: 'boom' }])
    const { onAwardComplete } = renderModal()

    await startAward()
    await waitFor(() => expect(toasts('error')).toEqual(['Failed to award: boom']))
    expect(toasts('success')).toEqual([])
    expect(onAwardComplete).not.toHaveBeenCalled()
  })

  it('M2b a duplicate without next_award_copy shows "Failed to award: duplicate"', async () => {
    stubFetch([{ index: 0, success: false, error: 'duplicate' }])
    renderModal()

    await startAward()
    await waitFor(() => expect(toasts('error')).toEqual(['Failed to award: duplicate']))
    expect(screen.queryByText(C1)).not.toBeInTheDocument()
  })

  it('M3 a duplicate at the 10-copy cap shows C-3 as an error toast and no prompt', async () => {
    stubFetch([{ index: 0, success: false, error: 'duplicate', next_award_copy: null }])
    renderModal()

    await startAward()
    await waitFor(() => expect(toasts('error')).toEqual([C3]))
    expect(toasts('success')).toEqual([])
    expect(screen.queryByText(C1)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirm award' })).toBeInTheDocument()
  })

  it('M4 cancelling, Escape or choosing another candidate clears the prompt', async () => {
    stubFetch([
      { index: 0, success: false, error: 'duplicate', next_award_copy: 2 },
      { index: 0, success: false, error: 'duplicate', next_award_copy: 2 },
      { index: 0, success: false, error: 'duplicate', next_award_copy: 2 },
    ])
    renderModal([ranking(), ranking({ player_name: 'Jaina', character_id: 'char-jaina', loot_score: 5 })])

    // Cancel (the row button reads Cancel while confirming).
    await startAward()
    expect(await screen.findByText(C1)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByText(C1)).not.toBeInTheDocument()
    await userEvent.click(screen.getAllByRole('button', { name: 'Award' })[0])
    expect(screen.getByRole('button', { name: 'Confirm award' })).toBeInTheDocument()

    // Escape.
    await userEvent.click(screen.getByRole('button', { name: 'Confirm award' }))
    expect(await screen.findByText(C1)).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByText(C1)).not.toBeInTheDocument()

    // Another candidate.
    await startAward()
    expect(await screen.findByText(C1)).toBeInTheDocument()
    await userEvent.click(screen.getAllByRole('button', { name: 'Award' })[0])
    expect(screen.queryByText(C1)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirm award' })).toBeInTheDocument()
  })

  it('M5 a duplicate answer to an explicit copy counts as success and never prompts for the next copy', async () => {
    const { posts } = stubFetch([
      { index: 0, success: false, error: 'duplicate', next_award_copy: 2 },
      { index: 0, success: false, error: 'duplicate', next_award_copy: 3 },
    ])
    const { onAwardComplete } = renderModal()

    await startAward()
    await userEvent.click(await screen.findByRole('button', { name: C2 }))
    await waitFor(() => expect(toasts('success')).toEqual([SUCCESS]))
    expect(posts[1].items[0].award_copy).toBe(2)
    expect(screen.queryByText(C1)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: C2 })).not.toBeInTheDocument()
    expect(toasts('error')).toEqual([])
    expect(onAwardComplete).toHaveBeenCalledTimes(1)
  })
})

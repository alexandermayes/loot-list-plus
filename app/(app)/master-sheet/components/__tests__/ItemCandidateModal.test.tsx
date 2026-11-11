import type { ComponentProps } from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor, within } from '@testing-library/react'
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

type EquippedCharacters = Record<string, { synced_at: string | null; slots: Record<string, number | null> }>

/** Stubs fetch: the recent-awards GET answers an empty list, each POST to
 * the bulk route answers the next scripted per-item result, and the
 * equipped-item-levels GET answers the given status and characters map
 * (default 200 with an empty map). */
function stubFetch(
  postResults: Array<Record<string, unknown>>,
  equipped: { status?: number; characters?: EquippedCharacters } = {},
) {
  const posts: PostBody[] = []
  const equippedRequests: string[] = []
  const queue = [...postResults]
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    if (init?.method === 'POST' && url === '/api/loot-history/bulk') {
      posts.push(JSON.parse(String(init.body)))
      const result = queue.shift() ?? { index: 0, success: true, id: 'hist-x' }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ results: [result] }) } as Response)
    }
    if (url.includes('equipped-item-levels')) {
      equippedRequests.push(url)
      const status = equipped.status ?? 200
      return Promise.resolve({
        ok: status >= 200 && status < 300,
        status,
        json: () => Promise.resolve(status === 200 ? { characters: equipped.characters ?? {} } : { error: 'boom' }),
      } as Response)
    }
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ data: [] }) } as Response)
  })
  vi.stubGlobal('fetch', fetchMock)
  return { posts, equippedRequests }
}

function renderModal(
  rankings: PlayerRanking[] = [ranking()],
  onAwardComplete = vi.fn(),
  guildSettings: ComponentProps<typeof ItemCandidateModal>['guildSettings'] = {},
  item: LootItem = ITEM,
) {
  render(
    <ItemCandidateModal
      open
      onClose={() => {}}
      item={item}
      rankings={rankings}
      priority={null}
      receivedCharacterIds={new Set()}
      guildSettings={guildSettings}
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

describe('ItemCandidateModal raider bonus reasons (GH #357)', () => {
  const settingsFor = (characterKey: string) => ({
    single_raider_overall_bonus: true,
    single_raider_modifiers: {
      [characterKey]: [{ amount: 2, label: 'Full enchants', expires_at: '2026-10-12' }],
    },
  })
  beforeEach(() => {
    showNotification.mockReset()
    stubFetch([])
    // Only Date is faked so Testing Library timers stay real.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 10, 12))
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  // D-21 replaced the label and value chips with two sentences, so the reason
  // moved to its own line under them; the reason must stay on screen (#357).
  it('M6 the top candidates list the reason and end date after the raider bonus', async () => {
    renderModal([ranking({ raider_bonus: 2, loot_score: 12 })], vi.fn(), settingsFor('char-thrall'))
    expect(await screen.findByText('Officer bonus (Full enchants: +2 until Oct 12)')).toBeInTheDocument()
  })

  it('M7 the top candidates show no reason line when the entry belongs to another raider', async () => {
    renderModal([ranking({ raider_bonus: 2, loot_score: 12 })], vi.fn(), settingsFor('char-other'))
    expect(await screen.findByText(/^Standing 7: .*officer bonus 2\.$/)).toBeInTheDocument()
    expect(screen.queryByText(/Full enchants/)).toBeNull()
    expect(screen.queryByText(/^Officer bonus \(/)).toBeNull()
  })
})

// Quick task 261026-wpw: the Equipped column shows each candidate's item
// level for the item's slot, read once per open from the guild route, and
// only when the slot is comparable and the read succeeded (T-wpw-06).
describe('ItemCandidateModal equipped item level column', () => {
  const RING: LootItem = { id: 'item-ring', name: 'Band of the Sandworm', boss_name: 'Boss', item_slot: 'Finger', wowhead_id: 1 }
  const MOUNT: LootItem = { id: 'item-mount', name: 'Reins of Something', boss_name: 'Boss', item_slot: 'Mount', wowhead_id: 2 }
  const THRALL = ranking()
  const JAINA = ranking({ player_name: 'Jaina', character_id: 'char-jaina', loot_score: 5 })
  const RECENT_EMPTY = "This item hasn't been awarded yet."

  const rowOf = (playerName: string) => {
    const row = screen.getByText(playerName).closest('tr')
    if (!row) throw new Error(`no row for ${playerName}`)
    return within(row)
  }

  beforeEach(() => {
    showNotification.mockReset()
    vi.unstubAllGlobals()
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('E1 a ring shows the Equipped header, the lower ring level for a synced candidate and Not synced for one without data', async () => {
    const { equippedRequests } = stubFetch([], {
      characters: { 'char-thrall': { synced_at: '2026-10-20T12:00:00.000Z', slots: { 'Finger 1': 489, 'Finger 2': 476 } } },
    })
    renderModal([THRALL, JAINA], vi.fn(), {}, RING)

    expect(await screen.findByRole('columnheader', { name: 'Equipped' })).toBeInTheDocument()
    expect(rowOf('Thrall').getByText('476')).toBeInTheDocument()
    expect(rowOf('Jaina').getByText('Not synced')).toBeInTheDocument()
    expect(equippedRequests).toHaveLength(1)
    expect(equippedRequests[0]).toBe(
      `/api/guilds/guild-1/equipped-item-levels?character_ids=${encodeURIComponent('char-thrall,char-jaina')}`,
    )
  })

  it('E2 a mount makes no equipped-item-levels request and shows no Equipped header', async () => {
    const { equippedRequests } = stubFetch([])
    renderModal([THRALL, JAINA], vi.fn(), {}, MOUNT)

    expect(await screen.findByText(RECENT_EMPTY)).toBeInTheDocument()
    expect(equippedRequests).toEqual([])
    expect(screen.queryByRole('columnheader', { name: 'Equipped' })).not.toBeInTheDocument()
  })

  it('E3 a failed read shows no Equipped header instead of Not synced for everyone', async () => {
    const { equippedRequests } = stubFetch([], { status: 500 })
    renderModal([THRALL, JAINA], vi.fn(), {}, RING)

    await waitFor(() => expect(equippedRequests).toHaveLength(1))
    expect(await screen.findByText(RECENT_EMPTY)).toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Equipped' })).not.toBeInTheDocument()
    expect(screen.queryByText('Not synced')).not.toBeInTheDocument()
  })
})

// D-21, UI-12: Score stays the total, Standing is new, Rank becomes Interest, and
// the top three read as two officer-voice sentences instead of chips.
describe('ItemCandidateModal standing and interest (D-21)', () => {
  const NINE_KEYS = [
    'attendanceScore',
    'badLuckBonus',
    'donationBonus',
    'itemRank',
    'priorityBonus',
    'raiderBonus',
    'rankModifier',
    'roleBonus',
    'trialPenalty',
  ]

  // Four candidates, highest total first; the fourth is outside the top three.
  const FOUR = [
    ranking({ player_name: 'Thrall', character_id: 'c1', loot_score: 50, rank: 45, attendance_score: 5 }),
    ranking({ player_name: 'Jaina', character_id: 'c2', loot_score: 40, rank: 38, attendance_score: 2 }),
    ranking({ player_name: 'Sylvanas', character_id: 'c3', loot_score: 30, rank: 29, attendance_score: 1 }),
    ranking({ player_name: 'Anduin', character_id: 'c4', loot_score: 20, rank: 20, attendance_score: 0 }),
  ]

  const headers = () => screen.getAllByRole('columnheader').map(th => th.textContent)
  const cellsOf = (playerName: string) => {
    const row = screen.getByText(playerName).closest('tr')
    if (!row) throw new Error(`no row for ${playerName}`)
    return within(row).getAllByRole('cell').map(td => td.textContent)
  }

  beforeEach(() => {
    showNotification.mockReset()
    stubFetch([])
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('D1 the header reads Score, Standing, then Interest in place of Rank, with the Interest title', async () => {
    renderModal(FOUR)
    await screen.findByText("This item hasn't been awarded yet.")
    const names = headers()
    const score = names.indexOf('Score')
    expect(score).toBeGreaterThanOrEqual(0)
    expect(names[score + 1]).toBe('Standing')
    expect(names[score + 2]).toBe('Interest')
    expect(screen.queryByRole('columnheader', { name: 'Rank' })).toBeNull()
    expect(screen.getByRole('columnheader', { name: 'Interest' })).toHaveAttribute('title', 'How much they want this item')
  })

  it('D2 every row shows its total, standing and interest in that order', async () => {
    renderModal(FOUR)
    await screen.findByText("This item hasn't been awarded yet.")
    const score = headers().indexOf('Score')
    // Anduin is outside the top three, so this also proves Standing is not top-three only.
    expect(cellsOf('Anduin').slice(score, score + 3)).toEqual(['20.00', '0.00', '20'])
    expect(cellsOf('Thrall').slice(score, score + 3)).toEqual(['50.00', '5.00', '45'])
  })

  it('D3 the top three show the two officer-voice sentences and the fourth shows neither', async () => {
    renderModal(FOUR)
    await screen.findByText("This item hasn't been awarded yet.")
    expect(screen.getByText('Interest 45: their number 6 pick.')).toBeInTheDocument()
    expect(screen.getByText('Standing 5: attendance 5 of 4.')).toBeInTheDocument()
    expect(screen.getAllByText(/^Interest \d+: their number/)).toHaveLength(3)
    expect(screen.getAllByText(/^Standing /)).toHaveLength(3)
    expect(screen.queryByText(/your number/)).toBeNull()
    // The chips the sentences replace are gone.
    expect(screen.queryByText(/Item rank:/)).toBeNull()
  })

  it('D4 keeps the component columns on the right', async () => {
    renderModal(FOUR)
    await screen.findByText("This item hasn't been awarded yet.")
    const names = headers()
    for (const name of ['Attend', 'Raids']) expect(names).toContain(name)
    expect(names.indexOf('Attend')).toBeGreaterThan(names.indexOf('Interest'))
  })

  it('D5 the award request still records the same nine components and the winner components', async () => {
    const { posts } = stubFetch([{ index: 0, success: true, id: 'hist-1' }])
    renderModal([
      ranking({
        loot_score: 20.5,
        rank: 10,
        attendance_score: 4,
        role_modifier: 1,
        role_bonus: 0.5,
        priority_bonus: 1,
        bad_luck_bonus: 2,
        trial_penalty: -1,
        donation_bonus: 0.5,
        raider_bonus: 2.5,
      }),
    ])

    await startAward()
    await waitFor(() => expect(posts).toHaveLength(1))
    const context = posts[0].items[0].decision_context as {
      winner_components: Record<string, number>
      winner_score: number
      top_candidates: Array<{ components: Record<string, number> }>
    }
    expect(Object.keys(context.winner_components).sort()).toEqual(NINE_KEYS)
    expect(context.winner_components).toEqual({
      itemRank: 20.5 - 4 - 1 - 0.5 - 1 - 2 + 1 - 0.5 - 2.5,
      attendanceScore: 4,
      rankModifier: 1,
      roleBonus: 0.5,
      priorityBonus: 1,
      trialPenalty: -1,
      badLuckBonus: 2,
      donationBonus: 0.5,
      raiderBonus: 2.5,
    })
    expect(context.winner_score).toBe(20.5)
    expect(Object.keys(context.top_candidates[0].components).sort()).toEqual(NINE_KEYS)
  })
})

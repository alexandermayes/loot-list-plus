import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react'
import { BossSection } from '../BossSection'
import type { PlayerRanking, LootItem } from '../BossSection'
import { RAIDER_BONUS_GENERIC_DETAIL } from '@/domain/scoring/explain'

// GH #357: the score hover shows each active raider bonus reason and end
// date instead of only the total.

// The need-row cases (D-13) need the real ItemLink to prove the NeedLabel
// fallback renders no Wowhead anchor; every other case keeps the light mock.
const itemLinkMode = vi.hoisted(() => ({ real: false }))
vi.mock('@/app/components/ItemLink', async () => {
  const actual = await vi.importActual<typeof import('@/app/components/ItemLink')>('@/app/components/ItemLink')
  const Real = actual.default
  return {
    default: (props: { name: string; wowheadId: number | null; onClick?: (e: React.MouseEvent) => void }) =>
      itemLinkMode.real ? <Real {...props} /> : <span>{props.name}</span>,
  }
})
vi.mock('@/data/item-icons', () => ({ getItemIconUrl: () => null }))
vi.mock('@/data/boss-quotes', () => ({ getBossQuote: () => null }))

const ITEM: LootItem = {
  id: 'item-bindings',
  name: 'Qiraji Bindings of Command',
  boss_name: 'Ragnaros',
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

const ENTRY = { amount: 2, label: 'Full enchants', expires_at: '2026-10-12' }

function hoverThrall(characterKey: string) {
  const { container } = render(
    <BossSection
      boss="Ragnaros"
      items={[{ item: ITEM, rankings: [ranking({ raider_bonus: 2, loot_score: 12 })] }]}
      isCollapsed={false}
      onToggleCollapse={() => {}}
      isOfficer
      guildSettings={{
        single_raider_overall_bonus: true,
        single_raider_modifiers: { [characterKey]: [ENTRY] },
      }}
    />,
  )
  // The mobile card list also renders the name, so look inside the desktop table.
  const table = container.querySelector('table')!
  fireEvent.mouseEnter(within(table).getByText('Thrall').parentElement!)
}

describe('BossSection score hover raider bonus reasons (GH #357)', () => {
  beforeEach(() => {
    // Only Date is faked so Testing Library timers stay real.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 10, 12))
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('B1 lists the reason and end date under the Raider bonus line', async () => {
    hoverThrall('char-thrall')
    expect(await screen.findByText('Full enchants: +2 until Oct 12')).toBeInTheDocument()
  })

  it('B2 shows no extra text when the entry belongs to another raider', async () => {
    hoverThrall('char-other')
    expect(await screen.findByText('Raider bonus')).toBeInTheDocument()
    expect(screen.queryByText(RAIDER_BONUS_GENERIC_DETAIL)).toBeNull()
  })
})

describe('BossSection need rows (D-13, DISC-06)', () => {
  const NEED: LootItem = {
    id: 'need-trinket-healing',
    name: 'Trinket, Healing',
    boss_name: 'Needs',
    item_slot: 'Trinket',
    wowhead_id: null,
    kind: 'need',
  }

  beforeEach(() => {
    itemLinkMode.real = true
  })

  afterEach(() => {
    itemLinkMode.real = false
    cleanup()
  })

  it('N1: renders the need name and its ranking with no Wowhead anchor', () => {
    const { container } = render(
      <BossSection
        boss="Needs"
        items={[{ item: NEED, rankings: [ranking()] }]}
        isCollapsed={false}
        onToggleCollapse={() => {}}
      />,
    )
    const table = container.querySelector('table')!

    expect(within(table).getByText('Trinket, Healing')).toBeInTheDocument()
    expect(within(table).getByText('Thrall')).toBeInTheDocument()
    expect(container.querySelector('a')).toBeNull()
    expect(container.querySelector('[data-wowhead]')).toBeNull()
    expect(container.innerHTML).not.toContain('item=null')
  })

  it('N2: an officer clicking the need name opens the candidate modal once', () => {
    const onItemClick = vi.fn()
    const rankings = [ranking()]
    const { container } = render(
      <BossSection
        boss="Needs"
        items={[{ item: NEED, rankings }]}
        isCollapsed={false}
        onToggleCollapse={() => {}}
        isOfficer
        onItemClick={onItemClick}
      />,
    )
    const table = container.querySelector('table')!

    fireEvent.click(within(table).getByRole('button', { name: 'Trinket, Healing' }))

    expect(onItemClick).toHaveBeenCalledTimes(1)
    expect(onItemClick).toHaveBeenCalledWith(NEED, rankings)
  })

  it('N3: a raider (not an officer) sees no click target on the need name', () => {
    const { container } = render(
      <BossSection
        boss="Needs"
        items={[{ item: NEED, rankings: [ranking()] }]}
        isCollapsed={false}
        onToggleCollapse={() => {}}
        onItemClick={() => {}}
      />,
    )
    const table = container.querySelector('table')!

    expect(within(table).queryByRole('button', { name: 'Trinket, Healing' })).toBeNull()
    expect(within(table).getByText('Trinket, Healing')).toBeInTheDocument()
  })
})

// D-21, UI-12: the officer score popover shows the split in officer voice
// ("their"), keeps the component lines minus Item rank, and leaves the notes alone.
describe('BossSection score popover standing and interest (D-21)', () => {
  afterEach(cleanup)

  function hoverRanking(entry: PlayerRanking, guildSettings: Record<string, unknown> = {}) {
    const { container } = render(
      <BossSection
        boss="Ragnaros"
        items={[{ item: ITEM, rankings: [entry, ranking({ player_name: 'Jaina', character_id: 'char-jaina', loot_score: 1 })] }]}
        isCollapsed={false}
        onToggleCollapse={() => {}}
        isOfficer
        guildSettings={{ max_attendance_bonus: 4, ...guildSettings }}
      />,
    )
    const table = container.querySelector('table')!
    fireEvent.mouseEnter(within(table).getByText(entry.player_name).parentElement!)
  }

  const SPLIT_ENTRY = () =>
    ranking({
      rank: 50,
      attendance_score: 3,
      bad_luck_bonus: 2,
      raider_bonus: 2.5,
      loot_score: 57.5,
    })

  it('P1 shows the standing and interest sentences in officer voice and no Item rank line', async () => {
    hoverRanking(SPLIT_ENTRY())
    expect(await screen.findByText('Interest 50: their number 1 pick.')).toBeInTheDocument()
    expect(
      screen.getByText('Standing 7.5: attendance 3 of 4, bad luck protection 2, officer bonus 2.5.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Item rank')).toBeNull()
    expect(screen.queryByText(/your number/)).toBeNull()
  })

  it('P2 keeps the name and total in the header and the other component lines below the split', async () => {
    hoverRanking(SPLIT_ENTRY())
    const interest = await screen.findByText('Interest 50: their number 1 pick.')
    const popover = interest.closest('.fixed') as HTMLElement
    expect(within(popover).getByText('57.50')).toBeInTheDocument()
    expect(within(popover).getByText('Attendance')).toBeInTheDocument()
    expect(within(popover).getByText('Bad luck protection')).toBeInTheDocument()
    // The compact split sits between the header and the component lines.
    const order = [
      popover.textContent!.indexOf('Standing'),
      popover.textContent!.indexOf('Attendance'),
    ]
    expect(order[0]).toBeGreaterThanOrEqual(0)
    expect(order[0]).toBeLessThan(order[1])
  })

  it('P3 uses the guild decimal places for the tile numbers', async () => {
    hoverRanking(SPLIT_ENTRY(), { decimal_places: 1 })
    const interest = await screen.findByText('Interest 50: their number 1 pick.')
    const popover = interest.closest('.fixed') as HTMLElement
    expect(within(popover).getByText('7.5').className).toContain('tabular-nums')
    expect(within(popover).getByText('50.0')).toBeInTheDocument()
  })

  it('P4 keeps the trial and ineligible notes', async () => {
    hoverRanking({ ...SPLIT_ENTRY(), is_trial: true, is_eligible: false })
    expect(await screen.findByText('Trial member')).toBeInTheDocument()
    expect(screen.getByText('Ineligible (min raids not met)')).toBeInTheDocument()
  })
})

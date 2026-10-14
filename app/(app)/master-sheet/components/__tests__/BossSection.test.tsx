import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react'
import { BossSection } from '../BossSection'
import type { PlayerRanking, LootItem } from '../BossSection'
import { RAIDER_BONUS_GENERIC_DETAIL } from '@/domain/scoring/explain'

// GH #357: the score hover shows each active raider bonus reason and end
// date instead of only the total.

vi.mock('@/app/components/ItemLink', () => ({
  default: ({ name }: { name: string }) => <span>{name}</span>,
}))
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

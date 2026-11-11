import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import ScoreComparisonModal from '../ScoreComparisonModal'

// D-21 and UI-12: the modal shows each person as split tiles and groups the
// breakdown under Standing and Interest. The fixtures are invented so the
// subtotals are easy to check by hand.

type Ranking = NonNullable<React.ComponentProps<typeof ScoreComparisonModal>['userRanking']>

function ranking(overrides: Partial<Ranking>): Ranking {
  return {
    player_name: 'Tester',
    class_name: 'Warrior',
    class_color: '#C79C6E',
    loot_score: 0,
    rank: 0,
    attendance_score: 0,
    role_modifier: 0,
    role_bonus: 0,
    priority_bonus: 0,
    bad_luck_bonus: 0,
    trial_penalty: 0,
    donation_bonus: 0,
    raider_bonus: 0,
    is_trial: false,
    character_id: 'char-test',
    ...overrides,
  }
}

// You: interest 45 (number 6 pick), standing 3 + 2 = 5, total 50.
const YOU = ranking({
  player_name: 'Youname',
  loot_score: 50,
  rank: 45,
  attendance_score: 3,
  bad_luck_bonus: 2,
})

// Winner: interest 50 (number 1 pick), standing 4 + 1.5 + 2 = 7.5, total 57.5.
const WINNER = ranking({
  player_name: 'Winname',
  loot_score: 57.5,
  rank: 50,
  attendance_score: 4,
  role_bonus: 1.5,
  priority_bonus: 2,
})

function renderModal(props: Partial<React.ComponentProps<typeof ScoreComparisonModal>> = {}) {
  return render(
    <ScoreComparisonModal
      open
      onClose={() => {}}
      itemName="Test Item"
      userRanking={YOU}
      winnerRanking={WINNER}
      {...props}
    />,
  )
}

afterEach(cleanup)

describe('ScoreComparisonModal split tiles', () => {
  it('C1 renders each person as tiles with the Your score and Winner\'s score labels', () => {
    renderModal()
    const you = screen.getByRole('region', { name: 'Your score breakdown' })
    const winner = screen.getByRole('region', { name: "Winner's score breakdown" })

    expect(within(you).getByText('Your score')).toBeInTheDocument()
    expect(within(you).getByText('Standing')).toBeInTheDocument()
    expect(within(you).getByText('Interest')).toBeInTheDocument()
    expect(within(you).getByText('50.00')).toBeInTheDocument()
    expect(within(you).getByText('Youname')).toBeInTheDocument()

    expect(within(winner).getByText("Winner's score")).toBeInTheDocument()
    expect(within(winner).getByText('57.50')).toBeInTheDocument()
    expect(within(winner).getByText('Winname')).toBeInTheDocument()
  })

  it('C2 writes your sentences in your voice and the winner\'s in their voice', () => {
    renderModal()
    const you = screen.getByRole('region', { name: 'Your score breakdown' })
    const winner = screen.getByRole('region', { name: "Winner's score breakdown" })

    expect(within(you).getByText('Interest 45: your number 6 pick.')).toBeInTheDocument()
    expect(within(you).getByText('Standing 5: attendance 3 of 4, bad luck protection 2.')).toBeInTheDocument()
    expect(within(winner).getByText('Interest 50: their number 1 pick.')).toBeInTheDocument()
    expect(
      within(winner).getByText('Standing 7.5: attendance 4 of 4, role 1.5, officer priority 2.'),
    ).toBeInTheDocument()
  })

  it('C3 stacks the cards on a phone and puts them side by side from sm', () => {
    renderModal()
    const you = screen.getByRole('region', { name: 'Your score breakdown' })
    const container = you.parentElement as HTMLElement

    expect(container.className).toContain('flex-col')
    expect(container.className).toContain('sm:flex-row')
    expect(you.className).toContain('min-w-0')
  })

  it('C4 follows the guild decimal places in the tiles', () => {
    renderModal({ decimalPlaces: 0 })
    const winner = screen.getByRole('region', { name: "Winner's score breakdown" })

    expect(within(winner).getByText('58')).toBeInTheDocument()
  })

  it('C5 reads the attendance maximum from the guild config', () => {
    renderModal({ config: { max_attendance_bonus: 10 } })
    const you = screen.getByRole('region', { name: 'Your score breakdown' })

    expect(within(you).getByText('Standing 5: attendance 3 of 10, bad luck protection 2.')).toBeInTheDocument()
  })
})

describe('ScoreComparisonModal grouped breakdown', () => {
  function rowNamed(name: string): HTMLElement {
    const table = screen.getByRole('table', { name: 'Component comparison' })
    const rows = within(table).getAllByRole('row')
    const row = rows.find(r => within(r).queryByRole('rowheader', { name }))
    if (!row) throw new Error(`no row named ${name}`)
    return row
  }

  function cells(row: HTMLElement): string[] {
    return within(row).getAllByRole('cell').map(c => c.textContent ?? '')
  }

  it('C6 shows the Standing group header with the standing subtotals for You, Winner and Diff', () => {
    renderModal()
    expect(cells(rowNamed('Standing'))).toEqual(['5.00', '7.50', '+2.50'])
  })

  it('C7 shows the Interest group header with the interest subtotals', () => {
    renderModal()
    expect(cells(rowNamed('Interest'))).toEqual(['45.00', '50.00', '+5.00'])
  })

  it('C8 keeps the component rows unchanged, standing ones before the interest one', () => {
    renderModal()
    const table = screen.getByRole('table', { name: 'Component comparison' })
    const order = within(table)
      .getAllByRole('rowheader')
      .map(h => h.textContent)

    // Rows keep the order the existing merge gives: your lines first, then any the winner adds.
    expect(order).toEqual([
      'Standing',
      'Attendance',
      'Bad luck protection',
      'Role bonus',
      'Priority bonus',
      'Interest',
      'Item rank',
    ])

    expect(cells(rowNamed('Attendance'))).toEqual(['3.00', '4.00', '+1.00'])
    expect(cells(rowNamed('Bad luck protection'))).toEqual(['2.00', '0.00', '-2.00'])
    expect(cells(rowNamed('Item rank'))).toEqual(['45.00', '50.00', '+5.00'])
  })

  it('C9 shows a zero diff as a plain 0 and a negative standing with its minus sign', () => {
    renderModal({
      userRanking: ranking({ loot_score: 48.5, rank: 50, attendance_score: -1.5 }),
      winnerRanking: ranking({ loot_score: 52, rank: 50, attendance_score: 2 }),
    })

    expect(cells(rowNamed('Interest'))[2]).toBe('0')
    expect(cells(rowNamed('Standing'))[0]).toBe('-1.50')
  })

  it('C10 leaves the tip and the behind badge in place', () => {
    renderModal()

    expect(screen.getByText('Tip')).toBeInTheDocument()
    expect(screen.getByText('-7.50 points behind')).toBeInTheDocument()
  })

  it('C11 renders nothing when either ranking is missing', () => {
    const { container } = renderModal({ userRanking: null })
    expect(container.innerHTML).toBe('')
    expect(screen.queryByText('Tip')).toBeNull()
  })

  it('C12 writes no em dash', () => {
    renderModal()
    expect(document.body.textContent).not.toContain(String.fromCharCode(0x2014))
  })
})

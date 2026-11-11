import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import { ScoreSplit } from '../ScoreSplit'

// D-21: ScoreSplit shows the standing and interest it is given beside the total
// and never recomputes a score, so the tests hand it values that do not add up
// and expect them back unchanged.

const STANDING_SENTENCE = 'Standing 7.5: attendance 3 of 4, bad luck protection 2, officer bonus 2.5.'
const INTEREST_SENTENCE = 'Interest 50: their number 1 pick.'

function renderSplit(overrides: Partial<React.ComponentProps<typeof ScoreSplit>> = {}) {
  return render(
    <ScoreSplit
      standing={{ value: 7.5, sentence: STANDING_SENTENCE }}
      interest={{ value: 50, sentence: INTEREST_SENTENCE }}
      total={57.5}
      decimalPlaces={2}
      variant="tiles"
      {...overrides}
    />,
  )
}

afterEach(cleanup)

describe('ScoreSplit tiles', () => {
  it('S1 renders the three labels, the three numbers and both sentences', () => {
    renderSplit()
    expect(screen.getByText('Standing')).toBeInTheDocument()
    expect(screen.getByText('Interest')).toBeInTheDocument()
    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByText('7.50')).toBeInTheDocument()
    expect(screen.getByText('50.00')).toBeInTheDocument()
    expect(screen.getByText('57.50')).toBeInTheDocument()
    expect(screen.getByText(STANDING_SENTENCE)).toBeInTheDocument()
    expect(screen.getByText(INTEREST_SENTENCE)).toBeInTheDocument()
  })

  it('S2 puts tabular-nums on every number', () => {
    renderSplit()
    for (const text of ['7.50', '50.00', '57.50']) {
      expect(screen.getByText(text).className).toContain('tabular-nums')
    }
  })

  it('S3 uses the guild decimal places and the given total label', () => {
    renderSplit({ decimalPlaces: 0, totalLabel: 'Total for your number 1 pick' })
    expect(screen.getByText('Total for your number 1 pick')).toBeInTheDocument()
    expect(screen.queryByText('Total')).toBeNull()
    expect(screen.getByText('58')).toBeInTheDocument()
  })

  it('S4 shows a negative standing with a leading minus and no destructive or red class', () => {
    const { container } = renderSplit({
      standing: { value: -1.5, sentence: 'Standing -1.5: trial penalty -1.5.' },
      total: 48.5,
    })
    const number = screen.getByText('-1.50')
    expect(number.className).toContain('text-foreground')
    expect(container.innerHTML).not.toMatch(/destructive|red-/)
  })

  it('S5 never shows a negative zero', () => {
    renderSplit({ standing: { value: -0.001, sentence: 'Standing 0: no bonuses yet.' } })
    expect(screen.queryByText('-0.00')).toBeNull()
    expect(screen.getByText('0.00')).toBeInTheDocument()
  })

  it('S6 renders the values it is given and does not recompute the total', () => {
    renderSplit({ total: 99 })
    expect(screen.getByText('99.00')).toBeInTheDocument()
    expect(screen.queryByText('57.50')).toBeNull()
  })

  it('S7 keeps each tile column shrinkable so a long label wraps instead of clipping', () => {
    const { container } = renderSplit({ totalLabel: 'Total for your number 1 pick' })
    const grid = container.querySelector('.grid-cols-3')!
    expect(grid).not.toBeNull()
    for (const column of Array.from(grid.children)) {
      expect(column.className).toContain('min-w-0')
    }
  })
})

describe('ScoreSplit compact', () => {
  it('C1 renders Standing and Interest in two columns with both sentences and no Total', () => {
    const { container } = renderSplit({ variant: 'compact' })
    const grid = container.querySelector('.grid-cols-2')!
    expect(grid).not.toBeNull()
    expect(within(grid as HTMLElement).getByText('Standing')).toBeInTheDocument()
    expect(within(grid as HTMLElement).getByText('Interest')).toBeInTheDocument()
    expect(within(grid as HTMLElement).getByText('7.50').className).toContain('tabular-nums')
    expect(within(grid as HTMLElement).getByText('50.00')).toBeInTheDocument()
    expect(screen.getByText(STANDING_SENTENCE)).toBeInTheDocument()
    expect(screen.getByText(INTEREST_SENTENCE)).toBeInTheDocument()
    // The popover header owns the total.
    expect(screen.queryByText('Total')).toBeNull()
    expect(screen.queryByText('57.50')).toBeNull()
  })
})

describe('ScoreSplit rows', () => {
  it('R1 renders the two sentences as two lines, each led by its word label', () => {
    const { container } = renderSplit({ variant: 'rows' })
    const lines = Array.from(container.querySelectorAll('p'))
    expect(lines.map(line => line.textContent)).toEqual([STANDING_SENTENCE, INTEREST_SENTENCE])
    for (const line of lines) {
      expect(line.className).toContain('tabular-nums')
      expect(line.className).toContain('text-foreground-secondary')
    }
    expect(container.innerHTML).not.toMatch(/destructive|red-/)
  })
})

import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { NeedQuestionFlow } from '@/app/components/need-picker/NeedQuestionFlow'
import { NeedQuestionSheet } from '@/app/components/need-picker/NeedQuestionSheet'
import { NEED_SLOT_ICONS, NEED_SLOT_ICON_FALLBACK } from '@/app/components/need-picker/need-slot-icons'
import { eligibleNeedsFor } from '@/domain/loot/need-eligibility'
import { EMPTY_NEED_FLOW_VALUE, NEED_SLOT_GROUPS, type NeedFlowValue } from '@/domain/loot/need-questions'
import { NEED_DEFINITIONS, type NeedDefinition } from '@/domain/loot/needs'

const protWarrior = eligibleNeedsFor({ className: 'Warrior', specName: 'Protection' })
const mage = eligibleNeedsFor({ className: 'Mage', specName: 'Fire' })

interface HarnessProps {
  eligibility: readonly NeedDefinition[] | null
  onComplete?: (need: NeedDefinition) => void
  initial?: NeedFlowValue
  currentNeedKey?: string | null
  variant?: 'sheet' | 'inline'
}

function Harness({ eligibility, onComplete = () => {}, initial, currentNeedKey, variant = 'sheet' }: HarnessProps) {
  const [value, setValue] = useState<NeedFlowValue>(initial ?? EMPTY_NEED_FLOW_VALUE)
  return (
    <NeedQuestionFlow
      value={value}
      onChange={setValue}
      onComplete={onComplete}
      eligibility={eligibility}
      currentNeedKey={currentNeedKey}
      variant={variant}
    />
  )
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

function stubReducedMotion(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: matches && query === '(prefers-reduced-motion: reduce)',
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      onchange: null,
      dispatchEvent: () => false,
    })),
  )
}

describe('NeedQuestionFlow tracer (D-16)', () => {
  it('turns Chest then Plate into the chest.plate.tank need for a Protection Warrior', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    render(<Harness eligibility={protWarrior} onComplete={onComplete} />)

    await user.click(screen.getByRole('button', { name: /^Chest/ }))
    await user.click(await screen.findByRole('button', { name: /^Plate/ }))

    expect(onComplete).toHaveBeenCalledOnce()
    expect(onComplete.mock.calls[0][0].key).toBe('chest.plate.tank')
  })

  it('has no weapon type and no lighter armour control', async () => {
    const user = userEvent.setup()
    const { container } = render(<Harness eligibility={null} />)
    expect(container.textContent).not.toMatch(/lighter armou?r|weapon type/i)
    await user.click(screen.getByRole('button', { name: /^Chest/ }))
    expect(container.textContent).not.toMatch(/lighter armou?r|weapon type/i)
    expect(screen.queryByRole('checkbox')).toBeNull()
  })

  it('waits 150ms after a tap, then shows the next question title and moves focus to it', () => {
    // fireEvent, not userEvent: userEvent waits on timers that stay frozen here.
    vi.useFakeTimers()
    render(<Harness eligibility={protWarrior} />)

    expect(screen.getByRole('heading', { name: 'Which slot?' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /^Chest/ }))
    expect(screen.getByRole('heading', { name: 'Which slot?' })).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(149)
    })
    expect(screen.getByRole('heading', { name: 'Which slot?' })).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(1)
    })
    const title = screen.getByRole('heading', { name: 'Which armour?' })
    expect(title).toHaveFocus()
    expect(title).toHaveAttribute('tabindex', '-1')
  })

  it('counts only the questions that apply in the step line', async () => {
    const user = userEvent.setup()
    render(<Harness eligibility={protWarrior} />)
    expect(screen.getByText('Question 1')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^Chest/ }))
    expect(await screen.findByText('Question 2 of 2')).toBeInTheDocument()
  })

  it('writes the decided parts into a polite building sentence', async () => {
    const user = userEvent.setup()
    render(<Harness eligibility={protWarrior} />)
    const sentence = screen.getByTestId('need-building-sentence')
    expect(sentence).toHaveAttribute('aria-live', 'polite')
    expect(sentence).toHaveTextContent('')

    await user.click(screen.getByRole('button', { name: /^Chest/ }))
    expect(sentence).toHaveTextContent('Picking: Chest')

    await user.click(await screen.findByRole('button', { name: /^Plate/ }))
    expect(sentence).toHaveTextContent('Picking: Chest, Plate, Tank')
  })

  it('completes on the slot tap alone when the class has a single choice for it', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    render(<Harness eligibility={mage} onComplete={onComplete} />)

    await user.click(screen.getByRole('button', { name: /^Chest/ }))
    expect(onComplete).toHaveBeenCalledOnce()
    expect(onComplete.mock.calls[0][0].key).toBe('chest.cloth.spell-damage')
  })

  it('marks the pressed answer, the current slot and the class top armour', async () => {
    const user = userEvent.setup()
    render(<Harness eligibility={protWarrior} currentNeedKey="chest.plate.tank" />)

    expect(within(screen.getByRole('button', { name: /^Chest/ })).getByText('Current')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Chest/ })).toHaveAttribute('aria-pressed', 'false')

    await user.click(screen.getByRole('button', { name: /^Chest/ }))
    expect(screen.getByRole('button', { name: /^Chest/ })).toHaveAttribute('aria-pressed', 'true')

    const plate = await screen.findByRole('button', { name: /^Plate/ })
    expect(within(plate).getByText('Your armour')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Leather/ })).not.toHaveTextContent('Your armour')
  })

  it('offers only eligible slots in the three groups, hiding a group with no slots', () => {
    render(<Harness eligibility={mage} />)
    expect(screen.queryByRole('button', { name: /^Shield/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /^Relic/ })).toBeNull()
    expect(screen.getByText('Weapons')).toBeInTheDocument()
    expect(screen.getByText('Armour')).toBeInTheDocument()
    expect(screen.getByText('Accessories')).toBeInTheDocument()
  })

  it('offers every slot of the taxonomy when eligibility is null', () => {
    render(<Harness eligibility={null} variant="inline" />)
    const slotButtons = screen.getAllByRole('button').filter((button) => button.hasAttribute('aria-pressed'))
    expect(slotButtons).toHaveLength(19)
  })

  it('skips a question that is already decided when it advances', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    render(
      <Harness
        eligibility={protWarrior}
        onComplete={onComplete}
        initial={{ slot: null, armour: 'plate', stat: null }}
      />,
    )
    await user.click(screen.getByRole('button', { name: /^Chest/ }))
    // Armour was decided before the slot, so the tap on Chest finishes the flow.
    expect(onComplete).toHaveBeenCalledOnce()
    expect(onComplete.mock.calls[0][0].key).toBe('chest.plate.tank')
  })
})

describe('slot icon map (UI-06)', () => {
  it('has an entry for each of the 19 slot keys', () => {
    const slots = [...new Set(NEED_DEFINITIONS.map((definition) => definition.slot))]
    expect(slots).toHaveLength(19)
    for (const slot of slots) expect(NEED_SLOT_ICONS[slot]).toBeDefined()
    expect(Object.keys(NEED_SLOT_ICONS).sort()).toEqual([...slots].sort())
  })

  it('uses the neutral target icon for a slot with no clear glyph', () => {
    expect(NEED_SLOT_ICON_FALLBACK).toBeDefined()
    const fallbackSlots = NEED_SLOT_GROUPS.flatMap((group) => group.slots).filter(
      (slot) => NEED_SLOT_ICONS[slot] === NEED_SLOT_ICON_FALLBACK,
    )
    expect(fallbackSlots).toContain('trinket')
  })

  it('draws a decorative 24px icon on each slot tile', () => {
    render(<Harness eligibility={null} />)
    const tile = screen.getByRole('button', { name: /^Chest/ })
    const icon = tile.querySelector('svg')
    expect(icon).not.toBeNull()
    expect(icon).toHaveAttribute('aria-hidden', 'true')
    expect(icon).toHaveAttribute('width', '24')
  })
})

describe('reduced motion (UI-SPEC motion rules)', () => {
  it('advances at once, with no 150ms timer, when prefers-reduced-motion matches', () => {
    stubReducedMotion(true)
    vi.useFakeTimers()
    render(<Harness eligibility={protWarrior} />)

    fireEvent.click(screen.getByRole('button', { name: /^Chest/ }))
    expect(screen.getByRole('heading', { name: 'Which armour?' })).toHaveFocus()
  })

  it('still waits 150ms when the user has not asked for reduced motion', () => {
    stubReducedMotion(false)
    vi.useFakeTimers()
    render(<Harness eligibility={protWarrior} />)

    fireEvent.click(screen.getByRole('button', { name: /^Chest/ }))
    expect(screen.getByRole('heading', { name: 'Which slot?' })).toBeInTheDocument()
  })
})

describe('NeedQuestionSheet (D-16, UI-01)', () => {
  function SheetHarness({
    eligibility = protWarrior,
    onComplete = () => {},
    onClose = () => {},
  }: {
    eligibility?: readonly NeedDefinition[] | null
    onComplete?: (need: NeedDefinition) => void
    onClose?: () => void
  }) {
    return <NeedQuestionSheet open onClose={onClose} onComplete={onComplete} eligibility={eligibility} />
  }

  it('opens as a dialog titled with the current question', () => {
    render(<SheetHarness />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAccessibleName('Which slot?')
    expect(screen.getByText('Question 1')).toBeInTheDocument()
  })

  it('moves focus to the next question title after a tap', async () => {
    const user = userEvent.setup()
    render(<SheetHarness />)

    await user.click(screen.getByRole('button', { name: /^Chest/ }))
    const title = await screen.findByRole('heading', { name: 'Which armour?' })
    expect(title).toHaveFocus()
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Which armour?')
    expect(screen.getByText('Question 2 of 2')).toBeInTheDocument()
  })

  it('has no Back button on the first question and one from the second', async () => {
    const user = userEvent.setup()
    render(<SheetHarness />)
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull()

    await user.click(screen.getByRole('button', { name: /^Chest/ }))
    expect(await screen.findByRole('button', { name: 'Back' })).toBeInTheDocument()
  })

  it('goes Back to the previous shown question with its answer still pressed', async () => {
    const user = userEvent.setup()
    render(<SheetHarness />)

    await user.click(screen.getByRole('button', { name: /^Chest/ }))
    await user.click(await screen.findByRole('button', { name: 'Back' }))

    expect(await screen.findByRole('heading', { name: 'Which slot?' })).toHaveFocus()
    expect(screen.getByRole('button', { name: /^Chest/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('commits the need and closes on the last answer', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    const onClose = vi.fn()
    render(<SheetHarness onComplete={onComplete} onClose={onClose} />)

    await user.click(screen.getByRole('button', { name: /^Chest/ }))
    await user.click(await screen.findByRole('button', { name: /^Plate/ }))

    expect(onComplete).toHaveBeenCalledOnce()
    expect(onComplete.mock.calls[0][0].key).toBe('chest.plate.tank')
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('closes from the Close button without calling onComplete', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    const onClose = vi.fn()
    render(<SheetHarness onComplete={onComplete} onClose={onClose} />)

    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledOnce()
    expect(onComplete).not.toHaveBeenCalled()
  })

  it('shows one dot per applicable question, the current one in the accent colour', async () => {
    const user = userEvent.setup()
    render(<SheetHarness />)
    await user.click(screen.getByRole('button', { name: /^Chest/ }))
    await screen.findByText('Question 2 of 2')

    const dots = screen.getByTestId('need-step-dots').children
    expect(dots).toHaveLength(2)
    expect(dots[1]).toHaveClass('bg-accent')
    expect(dots[0]).toHaveClass('bg-muted')
  })

  it('opens a fresh flow each time, discarding an unfinished change', async () => {
    const user = userEvent.setup()
    function Reopen() {
      const [open, setOpen] = useState(true)
      return (
        <div>
          <button onClick={() => setOpen(true)}>Open sheet</button>
          <NeedQuestionSheet open={open} onClose={() => setOpen(false)} onComplete={() => {}} eligibility={protWarrior} />
        </div>
      )
    }
    render(<Reopen />)
    await user.click(screen.getByRole('button', { name: /^Chest/ }))
    await screen.findByRole('heading', { name: 'Which armour?' })

    await user.click(screen.getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await user.click(screen.getByRole('button', { name: 'Open sheet' }))

    expect(await screen.findByRole('heading', { name: 'Which slot?' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Chest/ })).toHaveAttribute('aria-pressed', 'false')
  })
})

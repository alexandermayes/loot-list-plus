import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { NeedQuestionFlow } from '@/app/components/need-picker/NeedQuestionFlow'
import { eligibleNeedsFor } from '@/domain/loot/need-eligibility'
import { EMPTY_NEED_FLOW_VALUE, type NeedFlowValue } from '@/domain/loot/need-questions'
import type { NeedDefinition } from '@/domain/loot/needs'

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
})

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

  it('waits 150ms after a tap, then shows the next question title and moves focus to it', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<Harness eligibility={protWarrior} />)

    expect(screen.getByRole('heading', { name: 'Which slot?' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^Chest/ }))
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

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SkipDayModal } from '../SkipDayModal'

const baseProps = {
  open: true,
  date: '2026-05-24',
  reason: '',
  onReasonChange: () => {},
  onCancel: () => {},
  onConfirm: () => {},
}

describe('SkipDayModal', () => {
  it('does not render when open is false', () => {
    render(<SkipDayModal {...baseProps} open={false} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders title and formatted date when open', () => {
    render(<SkipDayModal {...baseProps} />)
    expect(screen.getByRole('heading', { name: 'Skip raid day' })).toBeInTheDocument()
    // The "Sunday, May 24, 2026" formatted date should appear somewhere.
    expect(screen.getByText(/May 24, 2026/)).toBeInTheDocument()
  })

  it('omits the date label when date is null', () => {
    render(<SkipDayModal {...baseProps} date={null} />)
    expect(screen.queryByText(/2026/)).not.toBeInTheDocument()
  })

  it('reason input shows the current value', () => {
    render(<SkipDayModal {...baseProps} reason="Holiday" />)
    expect(screen.getByPlaceholderText(/Holiday, Cancelled/)).toHaveValue('Holiday')
  })

  it('typing in reason input fires onReasonChange with the new character (controlled input)', async () => {
    const user = userEvent.setup()
    const onReasonChange = vi.fn()
    render(<SkipDayModal {...baseProps} reason="" onReasonChange={onReasonChange} />)

    // Because the component is controlled and the test holds `reason` at "",
    // each keystroke fires onChange with just the new character. We type one
    // letter and assert the callback got that letter.
    await user.type(screen.getByPlaceholderText(/Holiday, Cancelled/), 'H')
    expect(onReasonChange).toHaveBeenCalledExactlyOnceWith('H')
  })

  it('Cancel button fires onCancel', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(<SkipDayModal {...baseProps} onCancel={onCancel} />)

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('Skip day button fires onConfirm', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<SkipDayModal {...baseProps} onConfirm={onConfirm} />)

    await user.click(screen.getByRole('button', { name: 'Skip day' }))
    expect(onConfirm).toHaveBeenCalledOnce()
  })
})

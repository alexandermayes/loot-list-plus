import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NotesModal } from '../NotesModal'

const sulfuras = {
  id: 'item-1',
  name: 'Sulfuras, Hand of Ragnaros',
  wowhead_id: 17182,
}

const baseProps = {
  item: sulfuras,
  value: '',
  saving: false,
  onValueChange: () => {},
  onClose: () => {},
  onSave: async () => true,
}

describe('NotesModal', () => {
  it('does not render when item is null', () => {
    render(<NotesModal {...baseProps} item={null} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders item name in description', () => {
    render(<NotesModal {...baseProps} />)
    expect(screen.getByText('Sulfuras, Hand of Ragnaros')).toBeInTheDocument()
  })

  it('textarea reflects value', () => {
    render(<NotesModal {...baseProps} value="hold for tank" />)
    expect(screen.getByPlaceholderText(/Add notes for officers/)).toHaveValue('hold for tank')
  })

  it('typing in textarea fires onValueChange (controlled input)', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(<NotesModal {...baseProps} value="" onValueChange={onValueChange} />)
    await user.type(screen.getByPlaceholderText(/Add notes for officers/), 'B')
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith('B')
  })

  it('Cancel fires onClose', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<NotesModal {...baseProps} onClose={onClose} />)
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('Save fires onSave with (itemId, value) and closes on resolved-true', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn().mockResolvedValue(true)
    const onClose = vi.fn()
    render(
      <NotesModal {...baseProps} value="prog priority" onSave={onSave} onClose={onClose} />
    )
    await user.click(screen.getByRole('button', { name: 'Save note' }))

    expect(onSave).toHaveBeenCalledExactlyOnceWith('item-1', 'prog priority')
    // Save resolved true → modal closes itself.
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
  })

  it('Save does NOT close when onSave resolves false (server rejection / validation)', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn().mockResolvedValue(false)
    const onClose = vi.fn()
    render(<NotesModal {...baseProps} onSave={onSave} onClose={onClose} />)
    await user.click(screen.getByRole('button', { name: 'Save note' }))
    await waitFor(() => expect(onSave).toHaveBeenCalled())
    // Failure case: parent owns the error message; modal stays open so the
    // user doesn't lose what they typed.
    expect(onClose).not.toHaveBeenCalled()
  })

  it('Cancel button disabled while saving (don\'t let users close mid-save)', () => {
    render(<NotesModal {...baseProps} saving={true} />)
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
  })
})

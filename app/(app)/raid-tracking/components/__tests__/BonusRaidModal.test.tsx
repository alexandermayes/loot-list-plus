import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BonusRaidModal } from '../BonusRaidModal'

const baseProps = {
  open: true,
  date: '2026-05-24',
  notes: '',
  maxDate: '2026-05-29',
  creating: false,
  activeTeamId: null as string | null,
  hasTeams: false,
  onDateChange: () => {},
  onNotesChange: () => {},
  onCancel: () => {},
  onSubmit: () => {},
}

describe('BonusRaidModal', () => {
  it('does not render when open is false', () => {
    render(<BonusRaidModal {...baseProps} open={false} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  // ─── Team hint text (varies by team state) ────────────

  it('hints "tied to the selected team" when activeTeamId is set', () => {
    render(<BonusRaidModal {...baseProps} activeTeamId="team-1" hasTeams={true} />)
    expect(screen.getByText(/Tied to the selected team/)).toBeInTheDocument()
  })

  it('hints "no team selected" when no active team but teams exist', () => {
    render(<BonusRaidModal {...baseProps} activeTeamId={null} hasTeams={true} />)
    expect(screen.getByText(/No team selected/)).toBeInTheDocument()
  })

  it('no team hint when guild has no teams configured', () => {
    render(<BonusRaidModal {...baseProps} activeTeamId={null} hasTeams={false} />)
    expect(screen.queryByText(/team/)).not.toBeInTheDocument()
  })

  // ─── Submit button gating ─────────────────────────────

  it('submit button disabled when date is empty', () => {
    render(<BonusRaidModal {...baseProps} date="" />)
    expect(screen.getByRole('button', { name: 'Add raid day' })).toBeDisabled()
  })

  it('submit button enabled when date is set and not creating', () => {
    render(<BonusRaidModal {...baseProps} date="2026-05-24" creating={false} />)
    expect(screen.getByRole('button', { name: 'Add raid day' })).not.toBeDisabled()
  })

  it('submit button disabled and Cancel disabled while creating', () => {
    render(<BonusRaidModal {...baseProps} creating={true} />)
    expect(screen.getByRole('button', { name: 'Add raid day' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
  })

  // ─── Callbacks ────────────────────────────────────────

  it('Cancel fires onCancel', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(<BonusRaidModal {...baseProps} onCancel={onCancel} />)
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('Add raid day fires onSubmit', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<BonusRaidModal {...baseProps} onSubmit={onSubmit} />)
    await user.click(screen.getByRole('button', { name: 'Add raid day' }))
    expect(onSubmit).toHaveBeenCalledOnce()
  })

  it('notes input shows the current value', () => {
    render(<BonusRaidModal {...baseProps} notes="Saturday alt night" />)
    expect(screen.getByPlaceholderText(/Heroic split run/)).toHaveValue('Saturday alt night')
  })

  it('typing in notes input fires onNotesChange (controlled input)', async () => {
    const user = userEvent.setup()
    const onNotesChange = vi.fn()
    render(<BonusRaidModal {...baseProps} notes="" onNotesChange={onNotesChange} />)
    await user.type(screen.getByPlaceholderText(/Heroic split run/), 'A')
    expect(onNotesChange).toHaveBeenCalledExactlyOnceWith('A')
  })
})

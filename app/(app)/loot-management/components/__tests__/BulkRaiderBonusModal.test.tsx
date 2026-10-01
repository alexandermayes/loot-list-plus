import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BulkRaiderBonusModal, type BulkRaiderBonusDraft } from '../BulkRaiderBonusModal'

const ZEV = 'id-zev'
const DENY = 'id-deny'
const CHECK = 'id-check'

const baseProps = {
  open: true,
  onClose: () => {},
  roster: [
    { id: ZEV, name: 'Zev', classColor: null },
    { id: DENY, name: 'Deny' },
    { id: CHECK, name: 'Check' },
  ],
  aliases: [{ alias_name: 'denny', character_id: DENY }],
  today: '2026-09-30',
  weekResetDay: 2,
  saving: false,
  onSave: () => {},
}

function setup(overrides: Partial<typeof baseProps> = {}) {
  const user = userEvent.setup()
  const onSave = vi.fn<(draft: BulkRaiderBonusDraft) => void>()
  render(<BulkRaiderBonusModal {...baseProps} onSave={onSave} {...overrides} />)
  return { user, onSave }
}

async function pasteNames(user: ReturnType<typeof userEvent.setup>, text: string) {
  await user.click(screen.getByRole('textbox', { name: 'Raiders' }))
  await user.paste(text)
}

const saveButton = () => screen.getByRole('button', { name: /^Add bonus for/ })
const amountInput = () => screen.getByRole('spinbutton', { name: 'Amount' })

describe('BulkRaiderBonusModal', () => {
  it('renders no dialog when closed', () => {
    render(<BulkRaiderBonusModal {...baseProps} open={false} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows the title when open', () => {
    render(<BulkRaiderBonusModal {...baseProps} />)
    expect(screen.getByText('Add a bonus for many raiders')).toBeInTheDocument()
    expect(screen.getByText('Paste names from your raid, a sheet or Discord. Everyone matched gets the same bonus.')).toBeInTheDocument()
  })

  it('keeps Save disabled without names or a usable amount', async () => {
    const { user } = setup()
    expect(saveButton()).toBeDisabled()

    await user.type(amountInput(), '2')
    expect(saveButton()).toBeDisabled()

    await pasteNames(user, 'Zev')
    expect(saveButton()).not.toBeDisabled()

    await user.clear(amountInput())
    expect(saveButton()).toBeDisabled()

    await user.type(amountInput(), '0')
    expect(saveButton()).toBeDisabled()
  })

  it('previews matched, alias, unmatched and repeated names', async () => {
    const { user } = setup()
    await pasteNames(user, 'Zev\nDenny\nNobody\nzev')

    expect(screen.getByText('1 matched')).toBeInTheDocument()
    expect(screen.getByText('1 via alias')).toBeInTheDocument()
    expect(screen.getByText('1 unmatched')).toBeInTheDocument()
    expect(screen.getByText('1 repeated names ignored')).toBeInTheDocument()
    expect(screen.getByText('Not matched. These names are skipped unless you pick a raider.')).toBeInTheDocument()
  })

  it('shows the resolved dates for each duration', async () => {
    const { user } = setup()
    // Next week is the default.
    expect(screen.getByText('Oct 6 to Oct 12')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'This week' }))
    expect(screen.getByText('Until Oct 5')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Next week' }))
    expect(screen.getByText('Oct 6 to Oct 12')).toBeInTheDocument()
  })

  it('flags custom dates that end before they start', async () => {
    const { user } = setup()
    await pasteNames(user, 'Zev')
    await user.type(amountInput(), '2')
    await user.click(screen.getByRole('button', { name: 'Custom dates' }))

    // Date inputs have no ARIA role; the two pickers are Starts then Ends.
    expect(screen.getByText('Starts')).toBeInTheDocument()
    expect(screen.getByText('Ends')).toBeInTheDocument()
    const [start, end] = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="date"]'))
    await user.clear(start)
    await user.type(start, '2026-10-08')
    await user.clear(end)
    await user.type(end, '2026-10-03')

    expect(screen.getByText("The end date can't be before the start date.")).toBeInTheDocument()
    expect(saveButton()).toBeDisabled()
  })

  it('saves matched and picked raiders, remembering picked names by default', async () => {
    const { user, onSave } = setup()
    await pasteNames(user, 'Zev\nDenny\nNobody\nzev')
    await user.type(amountInput(), '2')
    await user.type(screen.getByRole('textbox', { name: 'Reason (optional)' }), '  Full enchants  ')

    await user.selectOptions(screen.getByRole('combobox', { name: 'Raider for Nobody' }), CHECK)
    expect(screen.getByText('1 picked')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Remember this name' })).toBeChecked()
    expect(saveButton()).toHaveTextContent('Add bonus for 3 raiders')

    await user.click(saveButton())
    expect(onSave).toHaveBeenCalledTimes(1)
    const draft = onSave.mock.calls[0][0]
    expect([...draft.characterIds].sort()).toEqual([CHECK, DENY, ZEV].sort())
    expect(draft).toMatchObject({
      amount: 2,
      label: 'Full enchants',
      starts_at: '2026-10-06',
      expires_at: '2026-10-12',
      aliasesToSave: [{ alias_name: 'nobody', character_id: CHECK }],
    })
  })

  it('still includes a picked raider when Remember is unticked', async () => {
    const { user, onSave } = setup()
    await pasteNames(user, 'Zev\nNobody')
    await user.type(amountInput(), '2')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Raider for Nobody' }), CHECK)
    await user.click(screen.getByRole('checkbox', { name: 'Remember this name' }))

    await user.click(saveButton())
    const draft = onSave.mock.calls[0][0]
    expect(draft.aliasesToSave).toEqual([])
    expect(draft.characterIds).toContain(CHECK)
    expect(draft.characterIds).toContain(ZEV)
  })

  it('limits the reason to 60 characters and sends null for an empty reason', async () => {
    const { user, onSave } = setup()
    expect(screen.getByRole('textbox', { name: 'Reason (optional)' })).toHaveAttribute('maxLength', '60')

    await pasteNames(user, 'Zev')
    await user.type(amountInput(), '-2')
    await user.click(saveButton())
    expect(onSave.mock.calls[0][0]).toMatchObject({ characterIds: [ZEV], amount: -2, label: null })
    expect(saveButton()).toHaveTextContent('Add bonus for 1 raider')
  })

  it('disables Save and Cancel while saving', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<BulkRaiderBonusModal {...baseProps} />)
    await pasteNames(user, 'Zev, Deny')
    await user.type(amountInput(), '2')
    expect(saveButton()).not.toBeDisabled()

    rerender(<BulkRaiderBonusModal {...baseProps} saving />)
    expect(saveButton()).toBeDisabled()
    expect(saveButton()).toHaveTextContent('Add bonus for 2 raiders')
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
  })
})

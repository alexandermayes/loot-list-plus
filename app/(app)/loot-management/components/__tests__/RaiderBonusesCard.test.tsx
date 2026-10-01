import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RaiderBonusesCard } from '../RaiderBonusesCard'
import type { RaiderBonusMap } from '@/domain/scoring'

const ZEV = 'id-zev'
const DENY = 'id-deny'
const CHECK = 'id-check'

const characters = [
  { id: CHECK, name: 'Check' },
  { id: DENY, name: 'Deny' },
  { id: ZEV, name: 'Zev', class: { name: 'Mage', color_hex: 'rgb(63, 199, 235)' } },
]

const b1 = { amount: 2, label: 'Full enchants', starts_at: '2026-10-06', expires_at: '2026-10-12', batch_id: 'b1-00000' }

function setup(raiderMods: RaiderBonusMap) {
  const user = userEvent.setup()
  const onPersist = vi.fn<(next: RaiderBonusMap) => Promise<boolean>>().mockResolvedValue(true)
  const onAddForMany = vi.fn()
  render(
    <RaiderBonusesCard
      characters={characters}
      raiderMods={raiderMods}
      today="2026-10-06"
      weekResetDay={2}
      saving={false}
      onPersist={onPersist}
      onAddForMany={onAddForMany}
    />,
  )
  return { user, onPersist, onAddForMany }
}

describe('RaiderBonusesCard', () => {
  it('shows a pasted bonus as one row and removes it for everyone', async () => {
    const { user, onPersist } = setup({ [ZEV]: [b1], [DENY]: [b1] })

    expect(screen.getByText('Full enchants')).toBeInTheDocument()
    expect(screen.getByText('+2')).toBeInTheDocument()
    expect(screen.getByText('until Oct 12')).toBeInTheDocument()
    expect(screen.getByText('2 raiders')).toBeInTheDocument()
    expect(screen.getByText('Zev', { selector: 'span' })).toBeInTheDocument()
    expect(screen.getByText('Deny', { selector: 'span' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Remove this bonus for all 2 raiders' }))
    expect(onPersist).toHaveBeenCalledWith({})
  })

  it('removes one raider from a pasted bonus', async () => {
    const { user, onPersist } = setup({ [ZEV]: [{ amount: 5, expires_at: null }, b1], [DENY]: [b1] })

    await user.click(screen.getByRole('button', { name: 'Remove Zev from this bonus' }))
    expect(onPersist).toHaveBeenCalledWith({ [ZEV]: [{ amount: 5, expires_at: null }], [DENY]: [b1] })
  })

  it('titles an unlabelled one-raider batch in the singular', () => {
    const batch = { amount: 1, expires_at: '2026-10-12', batch_id: 'b3-00000' }
    setup({ [ZEV]: [batch] })

    expect(screen.getByText('Bonus for 1 raider')).toBeInTheDocument()
  })

  it('titles an unlabelled batch by its raider count', () => {
    const batch = { amount: 1, expires_at: '2026-10-12', batch_id: 'b2-00000' }
    setup({ [ZEV]: [batch], [DENY]: [batch], [CHECK]: [batch] })

    expect(screen.getByText('Bonus for 3 raiders')).toBeInTheDocument()
    expect(screen.getByText('3 raiders')).toBeInTheDocument()
  })

  it('marks upcoming and ended bonuses', () => {
    setup({
      [ZEV]: [{ amount: 3, starts_at: '2026-10-13', expires_at: '2026-10-19' }],
      [DENY]: [{ amount: -1, expires_at: '2026-10-05' }],
    })

    expect(screen.getByText('starts Oct 13')).toBeInTheDocument()
    expect(screen.getByText('ended Oct 5')).toBeInTheDocument()
  })

  it('offers Clear ended bonuses only when something has ended', async () => {
    const mods: RaiderBonusMap = {
      [ZEV]: [{ amount: 5, expires_at: null }],
      [DENY]: [{ amount: -1, expires_at: '2026-10-05' }],
    }
    const { user, onPersist } = setup(mods)

    await user.click(screen.getByRole('button', { name: 'Clear ended bonuses' }))
    expect(onPersist).toHaveBeenCalledWith({ [ZEV]: [{ amount: 5, expires_at: null }] })
  })

  it('hides Clear ended bonuses when nothing has ended', () => {
    setup({ [ZEV]: [{ amount: 5, expires_at: null }] })
    expect(screen.queryByRole('button', { name: 'Clear ended bonuses' })).not.toBeInTheDocument()
  })

  it('keeps single entries as before', async () => {
    const { user, onPersist } = setup({ [ZEV]: [{ amount: 5, expires_at: null }], [CHECK]: [{ amount: -2, expires_at: null }] })

    expect(screen.getAllByText('permanent')).toHaveLength(2)
    expect(screen.getByText('Zev', { selector: 'span' })).toHaveStyle({ color: 'rgb(63, 199, 235)' })
    expect(screen.getByText('Check', { selector: 'span' })).toHaveClass('text-foreground')

    await user.click(screen.getByRole('button', { name: 'Remove bonus for Zev' }))
    expect(onPersist).toHaveBeenCalledWith({ [CHECK]: [{ amount: -2, expires_at: null }] })
  })

  it('adds one raider from the add row', async () => {
    const { user, onPersist } = setup({ [ZEV]: [{ amount: 5, expires_at: null }] })

    await user.selectOptions(screen.getByRole('combobox', { name: 'Raider' }), ZEV)
    await user.type(screen.getByRole('spinbutton', { name: 'Amount' }), '-2')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Duration' }), 'week')
    expect(screen.getByRole('option', { name: 'This week (until Oct 12)' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(onPersist).toHaveBeenCalledWith({
      [ZEV]: [{ amount: 5, expires_at: null }, { amount: -2, expires_at: '2026-10-12' }],
    })
  })

  it('opens the bulk modal from Add for many raiders', async () => {
    const { user, onAddForMany } = setup({})

    expect(screen.getByText('No raider bonuses yet. Add one above.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Add for many raiders' }))
    expect(onAddForMany).toHaveBeenCalledTimes(1)
  })
})

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReassignLootModal } from '../ReassignLootModal'
import type { Member, RaidLootEntry } from '../types'

const alice: Member = {
  character_id: 'char-alice',
  user_id: 'user-alice',
  character_name: 'Alice',
  class_name: 'Paladin',
  class_color: '#f48cba',
  role: 'Officer',
}
const bob: Member = {
  character_id: 'char-bob',
  user_id: 'user-bob',
  character_name: 'Bob',
  class_name: 'Warrior',
  class_color: '#c69b6d',
  role: 'Raider',
}
const carol: Member = {
  character_id: 'char-carol',
  user_id: 'user-carol',
  character_name: 'Carol',
  class_name: 'Mage',
  class_color: '#3fc7eb',
  role: 'Raider',
}

const sulfuras: RaidLootEntry = {
  id: 'loot-1',
  character_id: 'char-alice',
  character_name: 'Alice',
  character_class_color: '#f48cba',
  item_name: 'Sulfuras',
  item_wowhead_id: 17182,
  awarded_date: '2026-05-24',
}
const thunderfury: RaidLootEntry = {
  id: 'loot-2',
  character_id: 'char-alice',
  character_name: 'Alice',
  character_class_color: '#f48cba',
  item_name: 'Thunderfury',
  item_wowhead_id: 19019,
  awarded_date: '2026-05-24',
}

describe('ReassignLootModal', () => {
  it('does not render when target is null', () => {
    render(
      <ReassignLootModal target={null} members={[alice, bob]} onClose={() => {}} onReassign={() => {}} />
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('single-item: description shows the item via ItemLink, no count phrase', () => {
    render(
      <ReassignLootModal
        target={{ lootEntries: [sulfuras], currentMember: alice }}
        members={[alice, bob]}
        onClose={() => {}}
        onReassign={() => {}}
      />
    )
    // Sulfuras name appears in description AND in the per-item row.
    expect(screen.getAllByText('Sulfuras').length).toBeGreaterThanOrEqual(1)
    // No "N items from X" phrase for single-item case.
    expect(screen.queryByText(/items from/)).not.toBeInTheDocument()
  })

  it('multi-item: description shows "{N} items from {currentMember}"', () => {
    render(
      <ReassignLootModal
        target={{ lootEntries: [sulfuras, thunderfury], currentMember: alice }}
        members={[alice, bob]}
        onClose={() => {}}
        onReassign={() => {}}
      />
    )
    expect(screen.getByText(/2 items from Alice/)).toBeInTheDocument()
  })

  it('shows one Select per loot entry', () => {
    render(
      <ReassignLootModal
        target={{ lootEntries: [sulfuras, thunderfury], currentMember: alice }}
        members={[alice, bob, carol]}
        onClose={() => {}}
        onReassign={() => {}}
      />
    )
    expect(screen.getAllByRole('combobox')).toHaveLength(2)
  })

  it('Select excludes the current member from the options', () => {
    render(
      <ReassignLootModal
        target={{ lootEntries: [sulfuras], currentMember: alice }}
        members={[alice, bob, carol]}
        onClose={() => {}}
        onReassign={() => {}}
      />
    )
    const select = screen.getByRole('combobox')
    // Three members, but Alice (current) excluded → 2 + placeholder option = 3 options.
    expect(select.querySelectorAll('option')).toHaveLength(3)
    expect(select.querySelector('option[value="char-alice"]')).toBeNull()
    expect(select.querySelector('option[value="char-bob"]')).not.toBeNull()
    expect(select.querySelector('option[value="char-carol"]')).not.toBeNull()
  })

  it('selecting a new owner fires onReassign(lootId, characterId, characterName)', async () => {
    const user = userEvent.setup()
    const onReassign = vi.fn()
    render(
      <ReassignLootModal
        target={{ lootEntries: [sulfuras], currentMember: alice }}
        members={[alice, bob, carol]}
        onClose={() => {}}
        onReassign={onReassign}
      />
    )

    await user.selectOptions(screen.getByRole('combobox'), 'char-bob')
    expect(onReassign).toHaveBeenCalledExactlyOnceWith('loot-1', 'char-bob', 'Bob')
  })

  it('Cancel button fires onClose', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <ReassignLootModal
        target={{ lootEntries: [sulfuras], currentMember: alice }}
        members={[alice, bob]}
        onClose={onClose}
        onReassign={() => {}}
      />
    )
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})

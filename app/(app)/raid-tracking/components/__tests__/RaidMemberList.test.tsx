import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RaidMemberList } from '../RaidMemberList'
import type { Member, AttendanceStatus, UnlinkedAttendee, RaidLootEntry } from '../types'

// RaidMemberList is the expanded roster shown when an officer opens a raid
// card. It's the highest-interaction surface on the raid-tracking page —
// per-row clicks, per-row dropdowns, AND a document-level keyboard
// listener (Pass 4b shipped) that lets officers hover a row and press
// 1/2/3/4/5/0 to set status without clicking through the menu.
//
// We focus on:
// - Keyboard shortcuts (1/2/3/4/5/0) — never had tests before this file
// - Hover gating (no hovered row → key is no-op)
// - Input-focus suppression (don't steal keys while user is typing)
// - Modifier-key suppression (Cmd/Ctrl/Alt don't trigger)
// - Empty state vs roster
// - "Mark all attended" button visibility
// - Per-row click → onCycleStatus
// - Three-dot menu items → correct callbacks
// - Conditional menu items (signups / reassign)
// - Unlinked attendees filter

const blankStatus: AttendanceStatus = {
  signed_up: false,
  attended: false,
  no_call_no_show: false,
  was_late: false,
  was_benched: false,
}

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

const baseProps = {
  raidId: 'raid-1',
  members: [alice, bob],
  attendanceMap: undefined as Record<string, AttendanceStatus> | undefined,
  loot: undefined as RaidLootEntry[] | undefined,
  unlinkedAttendees: undefined as UnlinkedAttendee[] | undefined,
  useSignups: false,
  onCycleStatus: () => {},
  onSetAttendanceStatus: () => {},
  onToggleSignup: () => {},
  onRemoveFromAttendance: () => {},
  onMarkAllAttended: () => {},
  onOpenReassign: () => {},
  onDeleteLootEntry: () => {},
}

describe('RaidMemberList', () => {
  // ─── Empty state ──────────────────────────────────────

  it('shows empty state when there are no members and no unlinked attendees', () => {
    render(<RaidMemberList {...baseProps} members={[]} unlinkedAttendees={[]} />)
    expect(screen.getByText('No raiders with loot lists')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mark all attended' })).not.toBeInTheDocument()
  })

  it('does NOT show empty state when unlinked attendees exist (members can still be empty)', () => {
    const unlinked: UnlinkedAttendee[] = [{ character_name: 'Stranger', status: blankStatus }]
    render(<RaidMemberList {...baseProps} members={[]} unlinkedAttendees={unlinked} />)
    expect(screen.queryByText('No raiders with loot lists')).not.toBeInTheDocument()
    expect(screen.getByText('Stranger')).toBeInTheDocument()
  })

  // ─── Roster rendering ─────────────────────────────────

  it('renders each member by character name', () => {
    render(<RaidMemberList {...baseProps} />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  // ─── Mark all attended ────────────────────────────────

  it('shows "Mark all attended" when at least one member has empty cellState', () => {
    render(<RaidMemberList {...baseProps} attendanceMap={{}} />)
    expect(screen.getByRole('button', { name: 'Mark all attended' })).toBeInTheDocument()
  })

  it('hides "Mark all attended" when every member already has a non-empty state', () => {
    render(
      <RaidMemberList
        {...baseProps}
        attendanceMap={{
          'char-alice': { ...blankStatus, attended: true },
          'char-bob': { ...blankStatus, attended: true },
        }}
      />
    )
    expect(screen.queryByRole('button', { name: 'Mark all attended' })).not.toBeInTheDocument()
  })

  it('clicking "Mark all attended" calls onMarkAllAttended(raidId, members)', async () => {
    const user = userEvent.setup()
    const onMarkAllAttended = vi.fn()
    render(<RaidMemberList {...baseProps} onMarkAllAttended={onMarkAllAttended} />)

    await user.click(screen.getByRole('button', { name: 'Mark all attended' }))
    expect(onMarkAllAttended).toHaveBeenCalledExactlyOnceWith('raid-1', [alice, bob])
  })

  // ─── Per-row click cycles status ──────────────────────

  it('clicking the row body calls onCycleStatus(raidId, characterId, userId)', async () => {
    const user = userEvent.setup()
    const onCycleStatus = vi.fn()
    render(<RaidMemberList {...baseProps} onCycleStatus={onCycleStatus} />)

    // The row click target is the inner <button type="button"> with the
    // character name. Pick Alice's row.
    await user.click(screen.getByText('Alice'))
    expect(onCycleStatus).toHaveBeenCalledExactlyOnceWith('raid-1', 'char-alice', 'user-alice')
  })

  // ─── Status pill reflects current state ──────────────

  it('shows the right status pill for each member based on attendanceMap', () => {
    render(
      <RaidMemberList
        {...baseProps}
        attendanceMap={{
          'char-alice': { ...blankStatus, attended: true },
          'char-bob': { ...blankStatus, no_call_no_show: true },
        }}
      />
    )
    expect(screen.getByText('Attended')).toBeInTheDocument()
    expect(screen.getByText('No Show')).toBeInTheDocument()
  })

  it('shows "Signed up" pill alongside the state pill when signed_up is true', () => {
    render(
      <RaidMemberList
        {...baseProps}
        members={[alice]}
        attendanceMap={{ 'char-alice': { ...blankStatus, signed_up: true } }}
      />
    )
    // signed_up alone is empty cell state — the only pill rendered is "Signed up".
    expect(screen.getByText('Signed up')).toBeInTheDocument()
    expect(screen.queryByText('Attended')).not.toBeInTheDocument()
  })

  // ─── Keyboard shortcuts (Pass 4b — never tested before) ───

  it('hover + 1 sets Attended on the hovered member', async () => {
    const user = userEvent.setup()
    const onSetAttendanceStatus = vi.fn()
    render(<RaidMemberList {...baseProps} onSetAttendanceStatus={onSetAttendanceStatus} />)

    // Hover Alice's row, then press 1 (Attended).
    await user.hover(screen.getByText('Alice'))
    await user.keyboard('1')
    expect(onSetAttendanceStatus).toHaveBeenCalledExactlyOnceWith(
      'raid-1',
      'char-alice',
      'user-alice',
      'attended'
    )
  })

  it('keys 1-5 + 0 map to attended / late / standby / no-show / excused / empty', async () => {
    const user = userEvent.setup()
    const onSetAttendanceStatus = vi.fn()
    render(
      <RaidMemberList
        {...baseProps}
        members={[alice]}
        onSetAttendanceStatus={onSetAttendanceStatus}
      />
    )
    await user.hover(screen.getByText('Alice'))

    const mapping: Array<[string, string]> = [
      ['1', 'attended'],
      ['2', 'late'],
      ['3', 'standby'],
      ['4', 'no-show'],
      ['5', 'excused'],
      ['0', 'empty'],
    ]
    for (const [key, expected] of mapping) {
      onSetAttendanceStatus.mockClear()
      await user.keyboard(key)
      expect(onSetAttendanceStatus).toHaveBeenCalledExactlyOnceWith(
        'raid-1',
        'char-alice',
        'user-alice',
        expected
      )
    }
  })

  it('switching hover between rows targets the most recently hovered member', async () => {
    const user = userEvent.setup()
    const onSetAttendanceStatus = vi.fn()
    render(<RaidMemberList {...baseProps} onSetAttendanceStatus={onSetAttendanceStatus} />)

    await user.hover(screen.getByText('Alice'))
    await user.hover(screen.getByText('Bob'))
    await user.keyboard('1')

    expect(onSetAttendanceStatus).toHaveBeenCalledExactlyOnceWith(
      'raid-1',
      'char-bob',
      'user-bob',
      'attended'
    )
  })

  it('key press with no hovered row is a no-op', async () => {
    const user = userEvent.setup()
    const onSetAttendanceStatus = vi.fn()
    render(<RaidMemberList {...baseProps} onSetAttendanceStatus={onSetAttendanceStatus} />)

    // No hover happened; just press a key.
    await user.keyboard('1')
    expect(onSetAttendanceStatus).not.toHaveBeenCalled()
  })

  it('mouseLeave clears the hover target so a subsequent keypress is a no-op', async () => {
    const user = userEvent.setup()
    const onSetAttendanceStatus = vi.fn()
    render(<RaidMemberList {...baseProps} onSetAttendanceStatus={onSetAttendanceStatus} />)

    await user.hover(screen.getByText('Alice'))
    await user.unhover(screen.getByText('Alice'))
    await user.keyboard('1')
    expect(onSetAttendanceStatus).not.toHaveBeenCalled()
  })

  it('unmapped keys are ignored (e.g. 7, "a", Escape)', async () => {
    const user = userEvent.setup()
    const onSetAttendanceStatus = vi.fn()
    render(
      <RaidMemberList
        {...baseProps}
        members={[alice]}
        onSetAttendanceStatus={onSetAttendanceStatus}
      />
    )
    await user.hover(screen.getByText('Alice'))

    await user.keyboard('7')
    await user.keyboard('a')
    await user.keyboard('{Escape}')
    expect(onSetAttendanceStatus).not.toHaveBeenCalled()
  })

  it('does not steal keys when an input is focused (officers typing in import modal)', async () => {
    const user = userEvent.setup()
    const onSetAttendanceStatus = vi.fn()
    render(
      <div>
        <input data-testid="other-input" />
        <RaidMemberList {...baseProps} onSetAttendanceStatus={onSetAttendanceStatus} />
      </div>
    )

    // Hover Alice, then focus an unrelated input, then type "1".
    await user.hover(screen.getByText('Alice'))
    await user.click(screen.getByTestId('other-input'))
    await user.keyboard('1')

    expect(onSetAttendanceStatus).not.toHaveBeenCalled()
    // Sanity: the "1" went into the input, not the listener.
    expect((screen.getByTestId('other-input') as HTMLInputElement).value).toBe('1')
  })

  it('does not steal keys when a textarea is focused', async () => {
    const user = userEvent.setup()
    const onSetAttendanceStatus = vi.fn()
    render(
      <div>
        <textarea data-testid="other-textarea" />
        <RaidMemberList {...baseProps} onSetAttendanceStatus={onSetAttendanceStatus} />
      </div>
    )

    await user.hover(screen.getByText('Alice'))
    await user.click(screen.getByTestId('other-textarea'))
    await user.keyboard('1')

    expect(onSetAttendanceStatus).not.toHaveBeenCalled()
  })

  it('does not trigger when a modifier key is held (Cmd+1, Ctrl+1, Alt+1)', async () => {
    const user = userEvent.setup()
    const onSetAttendanceStatus = vi.fn()
    render(
      <RaidMemberList
        {...baseProps}
        members={[alice]}
        onSetAttendanceStatus={onSetAttendanceStatus}
      />
    )
    await user.hover(screen.getByText('Alice'))

    await user.keyboard('{Meta>}1{/Meta}')
    await user.keyboard('{Control>}1{/Control}')
    await user.keyboard('{Alt>}1{/Alt}')

    expect(onSetAttendanceStatus).not.toHaveBeenCalled()
  })

  it('removes the document keydown listener on unmount (no leaks across tabs)', async () => {
    const user = userEvent.setup()
    const onSetAttendanceStatus = vi.fn()
    const { unmount } = render(
      <RaidMemberList
        {...baseProps}
        members={[alice]}
        onSetAttendanceStatus={onSetAttendanceStatus}
      />
    )

    await user.hover(screen.getByText('Alice'))
    unmount()

    // After unmount the listener should be gone — keypresses do nothing.
    await user.keyboard('1')
    expect(onSetAttendanceStatus).not.toHaveBeenCalled()
  })

  // ─── Three-dot menu items ─────────────────────────────

  it('three-dot menu fires the status callback for the right member', async () => {
    const user = userEvent.setup()
    const onSetAttendanceStatus = vi.fn()
    render(<RaidMemberList {...baseProps} onSetAttendanceStatus={onSetAttendanceStatus} />)

    // First "More" button is for Alice (sorted by appearance).
    const moreButtons = screen.getAllByRole('button', { name: '' })
      .filter((b) => b.querySelector('svg'))
    // Open Alice's menu — the trigger is the dropdown trigger button on her row.
    // Radix uses role=button without explicit name; pick by being inside Alice's row.
    const aliceRow = screen.getByText('Alice').closest('div.flex.flex-col')!
    const aliceMore = aliceRow.querySelector('button[aria-haspopup="menu"]') as HTMLButtonElement
    await user.click(aliceMore)

    const item = await screen.findByRole('menuitem', { name: 'Mark as late' })
    await user.click(item)
    expect(onSetAttendanceStatus).toHaveBeenCalledExactlyOnceWith(
      'raid-1',
      'char-alice',
      'user-alice',
      'late'
    )
    // Silence unused warning
    void moreButtons
  })

  it('menu shows "Mark as signed up" only when useSignups is true', async () => {
    const user = userEvent.setup()
    render(<RaidMemberList {...baseProps} useSignups={false} />)
    const aliceRow = screen.getByText('Alice').closest('div.flex.flex-col')!
    const aliceMore = aliceRow.querySelector('button[aria-haspopup="menu"]') as HTMLButtonElement
    await user.click(aliceMore)

    expect(screen.queryByRole('menuitem', { name: /signed up|Remove signup/ })).not.toBeInTheDocument()
  })

  it('menu shows "Mark as signed up" when signed_up is false', async () => {
    const user = userEvent.setup()
    render(
      <RaidMemberList
        {...baseProps}
        useSignups={true}
        attendanceMap={{ 'char-alice': { ...blankStatus, signed_up: false } }}
      />
    )
    const aliceRow = screen.getByText('Alice').closest('div.flex.flex-col')!
    const aliceMore = aliceRow.querySelector('button[aria-haspopup="menu"]') as HTMLButtonElement
    await user.click(aliceMore)
    expect(screen.getByRole('menuitem', { name: 'Mark as signed up' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Remove signup' })).not.toBeInTheDocument()
  })

  it('menu shows "Remove signup" when signed_up is true', async () => {
    const user = userEvent.setup()
    render(
      <RaidMemberList
        {...baseProps}
        useSignups={true}
        attendanceMap={{ 'char-alice': { ...blankStatus, signed_up: true } }}
      />
    )
    const aliceRow = screen.getByText('Alice').closest('div.flex.flex-col')!
    const aliceMore = aliceRow.querySelector('button[aria-haspopup="menu"]') as HTMLButtonElement
    await user.click(aliceMore)
    expect(screen.getByRole('menuitem', { name: 'Remove signup' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Mark as signed up' })).not.toBeInTheDocument()
  })

  it('menu shows "Reassign loot" only when the member has loot entries', async () => {
    const user = userEvent.setup()
    const lootForAlice: RaidLootEntry = {
      id: 'loot-1',
      character_id: 'char-alice',
      character_name: 'Alice',
      character_class_color: '#f48cba',
      item_name: 'Sulfuras',
      item_wowhead_id: 17182,
      awarded_date: '2026-05-24',
    }
    render(<RaidMemberList {...baseProps} loot={[lootForAlice]} />)

    // Alice has loot → menu should include Reassign.
    const aliceRow = screen.getByText('Alice').closest('div.flex.flex-col')!
    const aliceMore = aliceRow.querySelector('button[aria-haspopup="menu"]') as HTMLButtonElement
    await user.click(aliceMore)
    expect(screen.getByRole('menuitem', { name: 'Reassign loot' })).toBeInTheDocument()
    // Dismiss menu
    await user.keyboard('{Escape}')

    // Bob has no loot → menu should NOT include Reassign.
    const bobRow = screen.getByText('Bob').closest('div.flex.flex-col')!
    const bobMore = bobRow.querySelector('button[aria-haspopup="menu"]') as HTMLButtonElement
    await user.click(bobMore)
    expect(screen.queryByRole('menuitem', { name: 'Reassign loot' })).not.toBeInTheDocument()
  })

  it('"Remove from raid" menu item fires onRemoveFromAttendance(raidId, characterId)', async () => {
    const user = userEvent.setup()
    const onRemoveFromAttendance = vi.fn()
    render(<RaidMemberList {...baseProps} onRemoveFromAttendance={onRemoveFromAttendance} />)

    const aliceRow = screen.getByText('Alice').closest('div.flex.flex-col')!
    const aliceMore = aliceRow.querySelector('button[aria-haspopup="menu"]') as HTMLButtonElement
    await user.click(aliceMore)
    await user.click(await screen.findByRole('menuitem', { name: 'Remove from raid' }))

    expect(onRemoveFromAttendance).toHaveBeenCalledExactlyOnceWith('raid-1', 'char-alice')
  })

  // ─── Unlinked attendees ───────────────────────────────

  it('shows unlinked attendees not already in members', () => {
    const unlinked: UnlinkedAttendee[] = [
      { character_name: 'Stranger', status: { ...blankStatus, attended: true } },
    ]
    render(<RaidMemberList {...baseProps} unlinkedAttendees={unlinked} />)
    expect(screen.getByText('Stranger')).toBeInTheDocument()
  })

  it('filters out unlinked attendees that match a linked member by name (case-insensitive)', () => {
    const unlinked: UnlinkedAttendee[] = [
      { character_name: 'alice', status: { ...blankStatus, attended: true } },
      { character_name: 'OtherDude', status: blankStatus },
    ]
    render(<RaidMemberList {...baseProps} unlinkedAttendees={unlinked} />)
    // Alice appears once (the linked member's row), not twice.
    expect(screen.getAllByText('Alice')).toHaveLength(1)
    expect(screen.queryByText('alice')).not.toBeInTheDocument()
    // The other unlinked attendee still renders.
    expect(screen.getByText('OtherDude')).toBeInTheDocument()
  })
})

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ImportModal } from '../ImportModal'

// ImportModal is the busiest modal in the app — it's officers' main path to
// stamp attendance + loot for a raid. Five interlocking concerns make it
// worth careful testing:
//
//   1. Title and primary button label flip on isEdit (new import vs edit)
//   2. Signups section only renders when guild has use_signups enabled
//   3. Preview chips (matched / aliasMatched / unmatched / linked / failed)
//      are conditional on a non-null preview object AND positive counts
//   4. Primary-submit gating is a 3-condition gate:
//        - importing (loading)
//        - both attendance and loot empty (nothing to save)
//        - isEdit && all three fields unchanged (nothing to commit)
//   5. "Clear fields" disabled when there's nothing to clear

const baseProps = {
  target: { raidId: 'raid-1', date: '2026-05-24', isEdit: false },
  attendanceData: '',
  lootData: '',
  signupsData: '',
  initialAttendanceData: '',
  initialLootData: '',
  initialSignupsData: '',
  attendancePreview: null,
  lootPreview: null,
  signupsPreview: null,
  importing: false,
  useSignups: false,
  onAttendanceChange: () => {},
  onLootChange: () => {},
  onSignupsChange: () => {},
  onClose: () => {},
  onClearFields: () => {},
  onClearSavedData: () => {},
  onImport: () => {},
}

describe('ImportModal', () => {
  // ─── Render gating ────────────────────────────────────

  it('does not render when target is null', () => {
    render(<ImportModal {...baseProps} target={null} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  // ─── Title + primary button label flip on isEdit ──────

  it('shows "Import raid data" title and "Import all" primary button in new-import mode', () => {
    render(<ImportModal {...baseProps} target={{ raidId: 'r', date: '2026-05-24', isEdit: false }} />)
    expect(screen.getByRole('heading', { name: 'Import raid data' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Import all' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument()
  })

  it('shows "Edit raid data" title and "Save changes" primary button in edit mode', () => {
    render(
      <ImportModal
        {...baseProps}
        target={{ raidId: 'r', date: '2026-05-24', isEdit: true }}
        attendanceData="someone"
      />
    )
    expect(screen.getByRole('heading', { name: 'Edit raid data' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Import all' })).not.toBeInTheDocument()
  })

  it('formats the target date in the description', () => {
    render(<ImportModal {...baseProps} />)
    expect(screen.getByText(/May 24, 2026/)).toBeInTheDocument()
  })

  // ─── Signups section visibility ───────────────────────

  it('hides Signups section when useSignups is false', () => {
    render(<ImportModal {...baseProps} useSignups={false} />)
    expect(screen.queryByText(/Who signed up for this raid/)).not.toBeInTheDocument()
  })

  it('shows Signups section when useSignups is true', () => {
    render(<ImportModal {...baseProps} useSignups={true} />)
    expect(screen.getByText(/Who signed up for this raid/)).toBeInTheDocument()
  })

  // ─── Textarea bindings ────────────────────────────────

  it('attendance textarea displays attendanceData', () => {
    render(<ImportModal {...baseProps} attendanceData="Alice, Bob, Carol" />)
    expect(screen.getByDisplayValue('Alice, Bob, Carol')).toBeInTheDocument()
  })

  it('typing in attendance fires onAttendanceChange (controlled)', async () => {
    const user = userEvent.setup()
    const onAttendanceChange = vi.fn()
    render(<ImportModal {...baseProps} onAttendanceChange={onAttendanceChange} />)
    const textareas = screen.getAllByRole('textbox')
    // First textarea = attendance, second = loot.
    await user.type(textareas[0], 'X')
    expect(onAttendanceChange).toHaveBeenCalledExactlyOnceWith('X')
  })

  it('typing in loot fires onLootChange', async () => {
    const user = userEvent.setup()
    const onLootChange = vi.fn()
    render(<ImportModal {...baseProps} onLootChange={onLootChange} />)
    const textareas = screen.getAllByRole('textbox')
    await user.type(textareas[1], 'Y')
    expect(onLootChange).toHaveBeenCalledExactlyOnceWith('Y')
  })

  it('typing in signups fires onSignupsChange (only when section visible)', async () => {
    const user = userEvent.setup()
    const onSignupsChange = vi.fn()
    render(<ImportModal {...baseProps} useSignups={true} onSignupsChange={onSignupsChange} />)
    const textareas = screen.getAllByRole('textbox')
    // Third textarea = signups.
    await user.type(textareas[2], 'Z')
    expect(onSignupsChange).toHaveBeenCalledExactlyOnceWith('Z')
  })

  // ─── Preview chips ────────────────────────────────────

  it('attendance preview chips render counts when preview is non-null', () => {
    render(
      <ImportModal
        {...baseProps}
        attendancePreview={{ total: 40, matched: 35, aliasMatched: 3, unmatched: 2 }}
      />
    )
    expect(screen.getByText('35 matched')).toBeInTheDocument()
    expect(screen.getByText('3 via alias')).toBeInTheDocument()
    expect(screen.getByText('2 unmatched')).toBeInTheDocument()
  })

  it('attendance preview hides aliasMatched/unmatched when zero (no noise)', () => {
    render(
      <ImportModal
        {...baseProps}
        attendancePreview={{ total: 40, matched: 40, aliasMatched: 0, unmatched: 0 }}
      />
    )
    expect(screen.getByText('40 matched')).toBeInTheDocument()
    expect(screen.queryByText(/via alias/)).not.toBeInTheDocument()
    expect(screen.queryByText(/unmatched/)).not.toBeInTheDocument()
  })

  it('loot preview chips render linked / unlinked / failed counts', () => {
    render(
      <ImportModal
        {...baseProps}
        lootPreview={{ total: 10, linked: 7, unlinked: 2, failed: 1, items: [] }}
      />
    )
    expect(screen.getByText('7 linked')).toBeInTheDocument()
    expect(screen.getByText('2 unlinked')).toBeInTheDocument()
    expect(screen.getByText('1 failed')).toBeInTheDocument()
  })

  it('loot preview omits each chip whose count is zero', () => {
    render(
      <ImportModal
        {...baseProps}
        lootPreview={{ total: 5, linked: 5, unlinked: 0, failed: 0, items: [] }}
      />
    )
    expect(screen.getByText('5 linked')).toBeInTheDocument()
    expect(screen.queryByText(/unlinked/)).not.toBeInTheDocument()
    expect(screen.queryByText(/failed/)).not.toBeInTheDocument()
  })

  // ─── Primary submit gating (the 3-condition gate) ─────

  it('primary submit disabled while importing', () => {
    render(<ImportModal {...baseProps} attendanceData="someone" importing={true} />)
    const btn = screen.getByRole('button', { name: /Import all|Save changes/ })
    expect(btn).toBeDisabled()
  })

  it('primary submit disabled when both attendance AND loot are empty (whitespace counts as empty)', () => {
    render(<ImportModal {...baseProps} attendanceData="   " lootData="   " />)
    expect(screen.getByRole('button', { name: 'Import all' })).toBeDisabled()
  })

  it('primary submit enabled when attendance has content (even if loot is empty)', () => {
    render(<ImportModal {...baseProps} attendanceData="Alice" lootData="" />)
    expect(screen.getByRole('button', { name: 'Import all' })).not.toBeDisabled()
  })

  it('primary submit enabled when loot has content (even if attendance is empty)', () => {
    render(<ImportModal {...baseProps} attendanceData="" lootData="2026/05/24;[123];Alice" />)
    expect(screen.getByRole('button', { name: 'Import all' })).not.toBeDisabled()
  })

  it('edit mode: primary submit disabled when all three fields are unchanged', () => {
    // Same values for current + initial → nothing to save.
    const same = {
      attendanceData: 'Alice',
      lootData: '2026/05/24;[123];Alice',
      signupsData: 'Alice',
    }
    render(
      <ImportModal
        {...baseProps}
        target={{ raidId: 'r', date: '2026-05-24', isEdit: true }}
        {...same}
        initialAttendanceData={same.attendanceData}
        initialLootData={same.lootData}
        initialSignupsData={same.signupsData}
      />
    )
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
  })

  it('edit mode: primary submit enabled when at least one field differs from initial', () => {
    render(
      <ImportModal
        {...baseProps}
        target={{ raidId: 'r', date: '2026-05-24', isEdit: true }}
        attendanceData="Alice modified"
        initialAttendanceData="Alice original"
        lootData=""
        initialLootData=""
        signupsData=""
        initialSignupsData=""
      />
    )
    expect(screen.getByRole('button', { name: 'Save changes' })).not.toBeDisabled()
  })

  // ─── Clear fields button gating ───────────────────────

  it('Clear fields disabled when all three fields are empty', () => {
    render(<ImportModal {...baseProps} />)
    expect(screen.getByRole('button', { name: 'Clear fields' })).toBeDisabled()
  })

  it('Clear fields enabled when any field has non-whitespace content', () => {
    render(<ImportModal {...baseProps} attendanceData="Alice" />)
    expect(screen.getByRole('button', { name: 'Clear fields' })).not.toBeDisabled()
  })

  it('Clear fields disabled while importing (even if there\'s content to clear)', () => {
    render(<ImportModal {...baseProps} attendanceData="Alice" importing={true} />)
    expect(screen.getByRole('button', { name: 'Clear fields' })).toBeDisabled()
  })

  it('Clear saved data is always enabled unless importing', () => {
    // Always-destructive: officer may want to wipe even an empty visible form.
    render(<ImportModal {...baseProps} importing={false} />)
    expect(screen.getByRole('button', { name: 'Clear saved data' })).not.toBeDisabled()
  })

  it('Clear saved data disabled while importing', () => {
    render(<ImportModal {...baseProps} importing={true} />)
    expect(screen.getByRole('button', { name: 'Clear saved data' })).toBeDisabled()
  })

  // ─── Callbacks ────────────────────────────────────────

  it('clicking the primary submit fires onImport', async () => {
    const user = userEvent.setup()
    const onImport = vi.fn()
    render(<ImportModal {...baseProps} attendanceData="Alice" onImport={onImport} />)
    await user.click(screen.getByRole('button', { name: 'Import all' }))
    expect(onImport).toHaveBeenCalledOnce()
  })

  it('clicking Cancel fires onClose', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<ImportModal {...baseProps} onClose={onClose} />)
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('clicking Clear fields fires onClearFields', async () => {
    const user = userEvent.setup()
    const onClearFields = vi.fn()
    render(<ImportModal {...baseProps} attendanceData="Alice" onClearFields={onClearFields} />)
    await user.click(screen.getByRole('button', { name: 'Clear fields' }))
    expect(onClearFields).toHaveBeenCalledOnce()
  })

  it('clicking Clear saved data fires onClearSavedData', async () => {
    const user = userEvent.setup()
    const onClearSavedData = vi.fn()
    render(<ImportModal {...baseProps} onClearSavedData={onClearSavedData} />)
    await user.click(screen.getByRole('button', { name: 'Clear saved data' }))
    expect(onClearSavedData).toHaveBeenCalledOnce()
  })
})

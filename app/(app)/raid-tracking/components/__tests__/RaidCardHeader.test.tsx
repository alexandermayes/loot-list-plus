import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RaidCardHeader } from '../RaidCardHeader'
import type { RaidEvent } from '../types'

// RaidCardHeader is the row of state + actions on each per-raid card.
// What matters (things a careless refactor could silently break):
// - Expand chevron click → onToggleExpanded(raid.id)
// - The action set differs by state:
//     skipped raid → only "Unskip" button, no Import / Discord / overflow
//     non-skipped → Import button + (optional) Discord button + overflow menu
// - Overflow menu items are conditional:
//     Link WCL appears only when hasImportedData AND canLinkWcl
//     Skip day always appears (for non-skipped raids)
// - The Today / Bonus / Imported / Skipped badges respect raid state
// - The attendance/loot subtitle is suppressed for skipped raids
// - Loading props (isOpeningImport / isPostingDiscord / isLinkingWcl)
//   propagate to the Button's loading prop
//
// Note: the per-raid header uses portal-rendered DropdownMenuContent (Radix).
// Testing-library + userEvent traverse the portal automatically, no special
// setup needed.

const baseRaid: RaidEvent = {
  id: 'raid-1',
  raid_date: '2026-05-24',
  notes: null,
  is_skipped: false,
  skip_reason: null,
  wcl_report_code: null,
}

const baseProps = {
  raid: baseRaid,
  isExpanded: false,
  isPast: true,
  today: '2026-05-28',
  hasImportedData: false,
  attendedCount: 0,
  signupCount: 0,
  lootCount: 0,
  canPostDiscord: false,
  canLinkWcl: false,
  isPostingDiscord: false,
  isLinkingWcl: false,
  isOpeningImport: false,
  onToggleExpanded: () => {},
  onImport: () => {},
  onPostToDiscord: () => {},
  onLinkWcl: () => {},
  onSkipDay: () => {},
}

describe('RaidCardHeader', () => {
  // ─── Expand toggle ────────────────────────────────────

  it('clicking the expand chevron calls onToggleExpanded with the raid id', async () => {
    const user = userEvent.setup()
    const onToggleExpanded = vi.fn()
    render(<RaidCardHeader {...baseProps} onToggleExpanded={onToggleExpanded} />)

    // The chevron Button has no text — find by its inline svg position. It's
    // the only icon-only Button without a visible label, so we can use the
    // accessible role + filtering.
    const buttons = screen.getAllByRole('button')
    // First button is the expand chevron (no text content, no aria-label).
    await user.click(buttons[0])
    expect(onToggleExpanded).toHaveBeenCalledExactlyOnceWith('raid-1')
  })

  // ─── Action set by skipped state ──────────────────────

  it('skipped raid shows only Unskip, hides Import/Discord/overflow', () => {
    render(
      <RaidCardHeader
        {...baseProps}
        raid={{ ...baseRaid, is_skipped: true, skip_reason: 'Holiday' }}
        hasImportedData={true}
        canPostDiscord={true}
      />
    )
    expect(screen.getByRole('button', { name: 'Unskip' })).toBeInTheDocument()
    expect(screen.queryByText(/Import|Edit/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Post to Discord' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'More raid actions' })).not.toBeInTheDocument()
  })

  it('non-skipped raid shows the Import button and the overflow menu', () => {
    render(<RaidCardHeader {...baseProps} />)
    // Either label depending on hasImportedData
    expect(screen.getByText(/Import data|Edit import/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'More raid actions' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Unskip' })).not.toBeInTheDocument()
  })

  // ─── Import button label and click ────────────────────

  it('shows "Import data" when hasImportedData is false', () => {
    render(<RaidCardHeader {...baseProps} hasImportedData={false} />)
    expect(screen.getByText('Import data')).toBeInTheDocument()
    expect(screen.queryByText('Edit import')).not.toBeInTheDocument()
  })

  it('shows "Edit import" when hasImportedData is true', () => {
    render(<RaidCardHeader {...baseProps} hasImportedData={true} />)
    expect(screen.getByText('Edit import')).toBeInTheDocument()
    expect(screen.queryByText('Import data')).not.toBeInTheDocument()
  })

  it('clicking Import calls onImport with (raid, hasImportedData)', async () => {
    const user = userEvent.setup()
    const onImport = vi.fn()
    render(<RaidCardHeader {...baseProps} hasImportedData={true} onImport={onImport} />)

    await user.click(screen.getByRole('button', { name: /Edit import/ }))
    expect(onImport).toHaveBeenCalledExactlyOnceWith(baseRaid, true)
  })

  // ─── Discord button visibility + click ────────────────

  it('Discord button hidden when canPostDiscord is false', () => {
    render(<RaidCardHeader {...baseProps} hasImportedData={true} canPostDiscord={false} />)
    expect(screen.queryByRole('button', { name: /Post to Discord/ })).not.toBeInTheDocument()
  })

  it('Discord button hidden when hasImportedData is false (no point posting empty raid)', () => {
    render(<RaidCardHeader {...baseProps} hasImportedData={false} canPostDiscord={true} />)
    expect(screen.queryByRole('button', { name: /Post to Discord/ })).not.toBeInTheDocument()
  })

  it('Discord button shows when both hasImportedData and canPostDiscord are true; click calls onPostToDiscord(raid.id)', async () => {
    const user = userEvent.setup()
    const onPostToDiscord = vi.fn()
    render(
      <RaidCardHeader
        {...baseProps}
        hasImportedData={true}
        canPostDiscord={true}
        onPostToDiscord={onPostToDiscord}
      />
    )
    const btn = screen.getByRole('button', { name: /Post to Discord/ })
    await user.click(btn)
    expect(onPostToDiscord).toHaveBeenCalledExactlyOnceWith('raid-1')
  })

  // ─── Overflow menu ────────────────────────────────────

  it('overflow menu contains Skip day for non-skipped raids', async () => {
    const user = userEvent.setup()
    const onSkipDay = vi.fn()
    render(<RaidCardHeader {...baseProps} onSkipDay={onSkipDay} />)

    await user.click(screen.getByRole('button', { name: 'More raid actions' }))
    const menuItem = await screen.findByRole('menuitem', { name: 'Skip day' })
    await user.click(menuItem)
    expect(onSkipDay).toHaveBeenCalledExactlyOnceWith('raid-1', false)
  })

  it('overflow menu hides Link WCL when hasImportedData is false', async () => {
    const user = userEvent.setup()
    render(<RaidCardHeader {...baseProps} hasImportedData={false} canLinkWcl={true} />)
    await user.click(screen.getByRole('button', { name: 'More raid actions' }))
    expect(screen.queryByRole('menuitem', { name: 'Link WCL' })).not.toBeInTheDocument()
  })

  it('overflow menu hides Link WCL when canLinkWcl is false (already linked or not configured)', async () => {
    const user = userEvent.setup()
    render(<RaidCardHeader {...baseProps} hasImportedData={true} canLinkWcl={false} />)
    await user.click(screen.getByRole('button', { name: 'More raid actions' }))
    expect(screen.queryByRole('menuitem', { name: 'Link WCL' })).not.toBeInTheDocument()
  })

  it('overflow menu shows Link WCL when both conditions met; click fires onLinkWcl(raid.id)', async () => {
    const user = userEvent.setup()
    const onLinkWcl = vi.fn()
    render(
      <RaidCardHeader
        {...baseProps}
        hasImportedData={true}
        canLinkWcl={true}
        onLinkWcl={onLinkWcl}
      />
    )
    await user.click(screen.getByRole('button', { name: 'More raid actions' }))
    const item = await screen.findByRole('menuitem', { name: 'Link WCL' })
    await user.click(item)
    expect(onLinkWcl).toHaveBeenCalledExactlyOnceWith('raid-1')
  })

  it('overflow Link WCL shows "Linking WCL…" and is disabled while isLinkingWcl is true', async () => {
    const user = userEvent.setup()
    render(
      <RaidCardHeader
        {...baseProps}
        hasImportedData={true}
        canLinkWcl={true}
        isLinkingWcl={true}
      />
    )
    await user.click(screen.getByRole('button', { name: 'More raid actions' }))
    const item = await screen.findByRole('menuitem', { name: /Linking WCL/ })
    // Radix marks disabled menu items with data-disabled.
    expect(item).toHaveAttribute('data-disabled')
  })

  // ─── Badges ───────────────────────────────────────────

  it('shows "Today" badge when the raid date matches today and it is not past/skipped', () => {
    render(
      <RaidCardHeader
        {...baseProps}
        raid={{ ...baseRaid, raid_date: '2026-05-28' }}
        today="2026-05-28"
        isPast={false}
      />
    )
    expect(screen.getByText('Today')).toBeInTheDocument()
  })

  it('does not show "Today" when raid date does not match today', () => {
    render(<RaidCardHeader {...baseProps} today="2026-05-28" isPast={false} />)
    expect(screen.queryByText('Today')).not.toBeInTheDocument()
  })

  it('shows "Bonus" badge when raid is bonus and not skipped', () => {
    render(<RaidCardHeader {...baseProps} raid={{ ...baseRaid, is_bonus: true }} />)
    expect(screen.getByText('Bonus')).toBeInTheDocument()
  })

  it('hides "Bonus" when raid is also skipped (Skipped wins)', () => {
    render(
      <RaidCardHeader
        {...baseProps}
        raid={{ ...baseRaid, is_bonus: true, is_skipped: true, skip_reason: 'Cancelled' }}
      />
    )
    expect(screen.queryByText('Bonus')).not.toBeInTheDocument()
    expect(screen.getByText(/Skipped:/)).toBeInTheDocument()
  })

  it('shows "Imported" badge when hasImportedData is true and not skipped', () => {
    render(<RaidCardHeader {...baseProps} hasImportedData={true} />)
    expect(screen.getByText('Imported')).toBeInTheDocument()
  })

  // ─── Subtitle ─────────────────────────────────────────

  it('shows attendance/signup subtitle on non-skipped raids', () => {
    render(<RaidCardHeader {...baseProps} attendedCount={42} signupCount={45} />)
    expect(screen.getByText(/42 attended/)).toBeInTheDocument()
    expect(screen.getByText(/45 signed up/)).toBeInTheDocument()
  })

  it('appends loot count to subtitle when lootCount > 0', () => {
    render(<RaidCardHeader {...baseProps} attendedCount={42} signupCount={45} lootCount={7} />)
    expect(screen.getByText(/7 loot/)).toBeInTheDocument()
  })

  it('omits loot count when lootCount is 0', () => {
    render(<RaidCardHeader {...baseProps} attendedCount={42} signupCount={45} lootCount={0} />)
    expect(screen.queryByText(/loot/i)).not.toBeInTheDocument()
  })

  it('appends WCL report link when raid has a wcl_report_code', () => {
    render(
      <RaidCardHeader
        {...baseProps}
        raid={{ ...baseRaid, wcl_report_code: 'abc123' }}
        attendedCount={42}
        signupCount={45}
      />
    )
    const link = screen.getByRole('link', { name: 'WCL Report' })
    expect(link).toHaveAttribute('href', 'https://classic.warcraftlogs.com/reports/abc123')
    // The link must open in a new tab so it doesn't break the user's review flow.
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('suppresses subtitle entirely on skipped raids', () => {
    render(
      <RaidCardHeader
        {...baseProps}
        raid={{ ...baseRaid, is_skipped: true, skip_reason: 'Holiday' }}
        attendedCount={42}
        signupCount={45}
        lootCount={7}
      />
    )
    expect(screen.queryByText(/attended/)).not.toBeInTheDocument()
    expect(screen.queryByText(/signed up/)).not.toBeInTheDocument()
  })

  // ─── Loading states ───────────────────────────────────

  it('isOpeningImport disables the Import button (so users can\'t double-fire it)', () => {
    render(<RaidCardHeader {...baseProps} isOpeningImport={true} />)
    const importBtn = screen.getByRole('button', { name: /Import data/ })
    expect(importBtn).toBeDisabled()
  })

  it('isPostingDiscord disables the Discord button', () => {
    render(
      <RaidCardHeader
        {...baseProps}
        hasImportedData={true}
        canPostDiscord={true}
        isPostingDiscord={true}
      />
    )
    const discordBtn = screen.getByRole('button', { name: /Post to Discord/ })
    expect(discordBtn).toBeDisabled()
  })
})

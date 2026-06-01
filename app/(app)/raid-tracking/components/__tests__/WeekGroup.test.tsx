import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WeekGroup } from '../WeekGroup'

// WeekGroup is the per-week collapsible wrapper above the raid cards.
// What we care about (the things a future refactor could silently break):
// - Click the header → onToggle fires with the weekStart string
// - Children only render when expanded (collapsed weeks must not mount raid cards)
// - The "This week" / "Last week" tag toggles via relativeTag
// - The summary chip ("N raids • X attended • Y loot") only shows when
//   collapsed AND raidCount > 0 — loot piece only when lootCount > 0
// - Singular vs plural raid/s

const baseProps = {
  weekStart: '2026-05-24',
  label: 'May 24 – May 30',
  relativeTag: null as 'this' | 'last' | null,
  isExpanded: false,
  raidCount: 2,
  attendedCount: 87,
  lootCount: 56,
  onToggle: () => {},
}

describe('WeekGroup', () => {
  it('renders the date-range label', () => {
    render(<WeekGroup {...baseProps} />)
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('May 24 – May 30')
  })

  it('fires onToggle with the weekStart when the header button is clicked', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    render(<WeekGroup {...baseProps} weekStart="2026-05-24" onToggle={onToggle} />)

    await user.click(screen.getByRole('button'))
    expect(onToggle).toHaveBeenCalledExactlyOnceWith('2026-05-24')
  })

  // ─── Children gating (collapsed weeks must not mount raid cards) ──

  it('does not render children when collapsed', () => {
    render(
      <WeekGroup {...baseProps} isExpanded={false}>
        <div data-testid="raid-card">raid card</div>
      </WeekGroup>
    )
    expect(screen.queryByTestId('raid-card')).not.toBeInTheDocument()
  })

  it('renders children when expanded', () => {
    render(
      <WeekGroup {...baseProps} isExpanded={true}>
        <div data-testid="raid-card">raid card</div>
      </WeekGroup>
    )
    expect(screen.getByTestId('raid-card')).toBeInTheDocument()
  })

  // ─── Relative tag ──────────────────────────────────────

  it('shows "This week" badge when relativeTag is "this"', () => {
    render(<WeekGroup {...baseProps} relativeTag="this" />)
    expect(screen.getByText('This week')).toBeInTheDocument()
    expect(screen.queryByText('Last week')).not.toBeInTheDocument()
  })

  it('shows "Last week" badge when relativeTag is "last"', () => {
    render(<WeekGroup {...baseProps} relativeTag="last" />)
    expect(screen.getByText('Last week')).toBeInTheDocument()
    expect(screen.queryByText('This week')).not.toBeInTheDocument()
  })

  it('shows no badge when relativeTag is null', () => {
    render(<WeekGroup {...baseProps} relativeTag={null} />)
    expect(screen.queryByText('This week')).not.toBeInTheDocument()
    expect(screen.queryByText('Last week')).not.toBeInTheDocument()
  })

  // ─── Summary chip ──────────────────────────────────────

  it('shows summary chip when collapsed and there are raids', () => {
    render(<WeekGroup {...baseProps} isExpanded={false} raidCount={2} attendedCount={87} lootCount={56} />)
    expect(screen.getByText(/2 raids • 87 attended/)).toBeInTheDocument()
    expect(screen.getByText(/• 56 loot/)).toBeInTheDocument()
  })

  it('hides summary chip when expanded (the raid cards below already carry the numbers)', () => {
    render(<WeekGroup {...baseProps} isExpanded={true} raidCount={2} attendedCount={87} lootCount={56} />)
    expect(screen.queryByText(/2 raids • 87 attended/)).not.toBeInTheDocument()
  })

  it('hides summary chip when raidCount is 0', () => {
    render(<WeekGroup {...baseProps} isExpanded={false} raidCount={0} attendedCount={0} lootCount={0} />)
    // No "raids" or "raid" string in the chip area.
    expect(screen.queryByText(/raid/i)).not.toBeInTheDocument()
  })

  it('omits the "loot" piece of the summary when lootCount is 0', () => {
    render(<WeekGroup {...baseProps} isExpanded={false} raidCount={3} attendedCount={42} lootCount={0} />)
    expect(screen.getByText(/3 raids • 42 attended/)).toBeInTheDocument()
    expect(screen.queryByText(/loot/i)).not.toBeInTheDocument()
  })

  it('uses singular "raid" when raidCount is 1', () => {
    render(<WeekGroup {...baseProps} isExpanded={false} raidCount={1} attendedCount={28} lootCount={3} />)
    expect(screen.getByText(/1 raid • 28 attended/)).toBeInTheDocument()
    // The pluralization is a content choice — pin it so it doesn't silently flip.
    expect(screen.queryByText(/1 raids/)).not.toBeInTheDocument()
  })
})

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ForeverAnnouncementModal from '../ForeverAnnouncementModal'
import { trackClientEvent } from '@/utils/analytics/client'
import { foreverModalSeenKey, ONBOARDING_SEEN_KEY } from '@/lib/announcements'

const guildState: {
  loading: boolean
  user: { id: string } | null
  activeGuild: { id: string; game?: string } | null
} = {
  loading: false,
  user: { id: 'user-1' },
  activeGuild: { id: 'guild-1', game: 'classic' },
}

vi.mock('@/app/contexts/GuildContext', () => ({
  useGuildContext: () => guildState,
}))

vi.mock('@/utils/analytics/client', () => ({
  trackClientEvent: vi.fn(),
}))

// Approved copy (D-01), copied verbatim from the plan's Approved copy table.
const APPROVED = {
  title: 'WoW Forever is here',
  paragraph1:
    'You can now set up a LootList+ guild for World of Warcraft: Forever. Pick WoW Forever when you create a guild, then choose your region and ruleset instead of a realm.',
  paragraph2:
    "Forever raids aren't in LootList+ yet. We'll keep updating as we learn more. In the meantime, you can get your guild, roster and characters ready.",
  cta: 'Create a Forever guild',
  dismiss: 'Not now',
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  guildState.loading = false
  guildState.user = { id: 'user-1' }
  guildState.activeGuild = { id: 'guild-1', game: 'classic' }
  localStorage.setItem(ONBOARDING_SEEN_KEY, '1')
})

afterEach(() => {
  localStorage.clear()
})

describe('ForeverAnnouncementModal, eligible user', () => {
  it('shows the approved copy, CTA link and dismiss button', async () => {
    render(<ForeverAnnouncementModal delayMs={0} />)
    const dialog = await screen.findByRole('dialog', { name: APPROVED.title })
    expect(dialog).toHaveTextContent(APPROVED.paragraph1)
    expect(dialog).toHaveTextContent(APPROVED.paragraph2)
    expect(screen.getByRole('link', { name: APPROVED.cta })).toHaveAttribute(
      'href',
      '/guild-select/create?game=forever'
    )
    expect(screen.getByRole('button', { name: APPROVED.dismiss })).toBeInTheDocument()
  })

  it('renders exactly one dialog, named by the title and described by the body', async () => {
    render(<ForeverAnnouncementModal delayMs={0} />)
    const dialog = await screen.findByRole('dialog', { name: APPROVED.title })
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(dialog).toHaveAccessibleName(APPROVED.title)

    const describedBy = dialog.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    // getElementById, not querySelector: React useId values contain
    // characters that would need CSS escaping.
    const description = document.getElementById(describedBy as string)
    expect(description).not.toBeNull()
    expect(description).toHaveTextContent(APPROVED.paragraph1)
    expect(description).toHaveTextContent(APPROVED.paragraph2)
  })

  it('fires announcement_viewed exactly once with the app_modal payload', async () => {
    render(<ForeverAnnouncementModal delayMs={0} />)
    await screen.findByRole('dialog', { name: APPROVED.title })
    const mockFn = trackClientEvent as unknown as ReturnType<typeof vi.fn>
    const viewedCalls = mockFn.mock.calls.filter((c) => c[0] === 'announcement_viewed')
    expect(viewedCalls).toHaveLength(1)
    expect(viewedCalls[0][1]).toEqual({ announcement: 'wow-forever', surface: 'app_modal' })
  })

  it('focuses the Not now button after open', async () => {
    render(<ForeverAnnouncementModal delayMs={0} />)
    await screen.findByRole('dialog', { name: APPROVED.title })
    const dismissButton = screen.getByRole('button', { name: APPROVED.dismiss })
    await waitFor(() => expect(dismissButton).toHaveFocus())
  })

  it('traps focus: Tab from the last element wraps to the first, Shift+Tab from the first wraps to the last', async () => {
    render(<ForeverAnnouncementModal delayMs={0} />)
    const dialog = await screen.findByRole('dialog', { name: APPROVED.title })
    const dismissButton = screen.getByRole('button', { name: APPROVED.dismiss })
    const ctaLink = screen.getByRole('link', { name: APPROVED.cta })

    ctaLink.focus()
    fireEvent.keyDown(dialog, { key: 'Tab' })
    expect(dismissButton).toHaveFocus()

    dismissButton.focus()
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true })
    expect(ctaLink).toHaveFocus()
  })

  it('Not now closes the dialog, writes the per-user seen key and fires announcement_dismissed', async () => {
    render(<ForeverAnnouncementModal delayMs={0} />)
    await screen.findByRole('dialog', { name: APPROVED.title })
    fireEvent.click(screen.getByRole('button', { name: APPROVED.dismiss }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(localStorage.getItem(foreverModalSeenKey('user-1'))).toBe('1')
    expect(trackClientEvent).toHaveBeenCalledWith('announcement_dismissed', {
      announcement: 'wow-forever',
      surface: 'app_modal',
    })
  })

  it('returns focus to the previously focused element after Not now', async () => {
    render(
      <>
        <button type="button">Trigger</button>
        <ForeverAnnouncementModal delayMs={0} />
      </>
    )
    // Focus the trigger synchronously, before the 0ms open timer fires, so it
    // is the element Modal records as the one to restore.
    const trigger = screen.getByRole('button', { name: 'Trigger' })
    trigger.focus()

    await screen.findByRole('dialog', { name: APPROVED.title })
    fireEvent.click(screen.getByRole('button', { name: APPROVED.dismiss }))
    // Modal restores focus when it unmounts, 150ms after close.
    await waitFor(() => expect(trigger).toHaveFocus())
  })

  it('Escape closes the dialog, writes the per-user seen key and fires announcement_dismissed', async () => {
    render(<ForeverAnnouncementModal delayMs={0} />)
    const dialog = await screen.findByRole('dialog', { name: APPROVED.title })
    fireEvent.keyDown(dialog, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(localStorage.getItem(foreverModalSeenKey('user-1'))).toBe('1')
    expect(trackClientEvent).toHaveBeenCalledWith('announcement_dismissed', {
      announcement: 'wow-forever',
      surface: 'app_modal',
    })
  })

  it('the CTA fires announcement_cta_clicked and writes the per-user seen key', async () => {
    render(<ForeverAnnouncementModal delayMs={0} />)
    await screen.findByRole('dialog', { name: APPROVED.title })
    fireEvent.click(screen.getByRole('link', { name: APPROVED.cta }))
    expect(localStorage.getItem(foreverModalSeenKey('user-1'))).toBe('1')
    expect(trackClientEvent).toHaveBeenCalledWith('announcement_cta_clicked', {
      announcement: 'wow-forever',
      surface: 'app_modal',
    })
  })

  it('makes the page behind the announcement inert while open and releases it after Not now (regression for #304)', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <>
        <button type="button">Trigger</button>
        <ForeverAnnouncementModal delayMs={0} />
      </>
    )

    // Testing Library's container is a direct child of document.body, like
    // the Next app root the Modal portals beside. Assert on the attribute,
    // not the .inert property: jsdom does not reflect the property.
    const dialog = await screen.findByRole('dialog', { name: APPROVED.title })
    await waitFor(() => expect(container).toHaveAttribute('inert'))
    expect(dialog.closest('[inert]')).toBeNull()

    await user.click(screen.getByRole('button', { name: APPROVED.dismiss }))
    await waitFor(() => expect(container).not.toHaveAttribute('inert'))
  })

  it('renders through a Modal that respects prefers-reduced-motion (regression for #304)', async () => {
    render(<ForeverAnnouncementModal delayMs={0} />)
    const dialog = await screen.findByRole('dialog', { name: APPROVED.title })
    // jsdom loads no Tailwind stylesheet, so class presence is the assertion.
    const panel = dialog.parentElement as HTMLElement
    const backdrop = panel.parentElement as HTMLElement
    expect(panel).toHaveClass('motion-reduce:transition-none', 'motion-reduce:scale-100')
    expect(backdrop).toHaveClass('motion-reduce:transition-none')
  })
})

describe('ForeverAnnouncementModal, ineligible cases render no dialog', () => {
  it('renders nothing for a Forever guild', async () => {
    guildState.activeGuild = { id: 'guild-1', game: 'forever' }
    render(<ForeverAnnouncementModal delayMs={0} />)
    await new Promise((r) => setTimeout(r, 10))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders nothing with no user', async () => {
    guildState.user = null
    render(<ForeverAnnouncementModal delayMs={0} />)
    await new Promise((r) => setTimeout(r, 10))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders nothing while loading', async () => {
    guildState.loading = true
    render(<ForeverAnnouncementModal delayMs={0} />)
    await new Promise((r) => setTimeout(r, 10))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders nothing with no active guild', async () => {
    guildState.activeGuild = null
    render(<ForeverAnnouncementModal delayMs={0} />)
    await new Promise((r) => setTimeout(r, 10))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders nothing when onboarding has not been seen', async () => {
    localStorage.clear()
    render(<ForeverAnnouncementModal delayMs={0} />)
    await new Promise((r) => setTimeout(r, 10))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders nothing when the per-user seen key already exists', async () => {
    localStorage.setItem(foreverModalSeenKey('user-1'), '1')
    render(<ForeverAnnouncementModal delayMs={0} />)
    await new Promise((r) => setTimeout(r, 10))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders nothing when getItem throws', async () => {
    const original = Storage.prototype.getItem
    Storage.prototype.getItem = () => {
      throw new Error('blocked')
    }
    render(<ForeverAnnouncementModal delayMs={0} />)
    await new Promise((r) => setTimeout(r, 10))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    Storage.prototype.getItem = original
  })
})

describe('ForeverAnnouncementModal, storage failure resilience', () => {
  it('still closes the dialog when setItem throws', async () => {
    render(<ForeverAnnouncementModal delayMs={0} />)
    await screen.findByRole('dialog', { name: APPROVED.title })
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = () => {
      throw new Error('quota')
    }
    fireEvent.click(screen.getByRole('button', { name: APPROVED.dismiss }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    Storage.prototype.setItem = original
  })
})

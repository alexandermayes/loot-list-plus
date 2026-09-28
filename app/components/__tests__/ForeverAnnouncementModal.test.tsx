import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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

  it('fires announcement_viewed exactly once with the app_modal payload', async () => {
    render(<ForeverAnnouncementModal delayMs={0} />)
    await screen.findByRole('dialog', { name: APPROVED.title })
    const mockFn = trackClientEvent as unknown as ReturnType<typeof vi.fn>
    const viewedCalls = mockFn.mock.calls.filter((c) => c[0] === 'announcement_viewed')
    expect(viewedCalls).toHaveLength(1)
    expect(viewedCalls[0][1]).toEqual({ announcement: 'wow-forever', surface: 'app_modal' })
  })

  it('focuses the dialog container after open', async () => {
    render(<ForeverAnnouncementModal delayMs={0} />)
    const dialog = await screen.findByRole('dialog', { name: APPROVED.title })
    await waitFor(() => expect(dialog).toHaveFocus())
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

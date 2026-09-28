import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ForeverAnnouncementBar, ForeverAnnouncementSpacer } from '../ForeverAnnouncementBar'
import { trackClientEvent, trackMarketingCta } from '@/utils/analytics/client'
import { FOREVER_BAR_HTML_ATTR, FOREVER_BAR_DISMISSED_KEY, FOREVER_CREATE_URL } from '@/lib/announcements'

vi.mock('@/utils/analytics/client', () => ({
  trackClientEvent: vi.fn(),
  trackMarketingCta: vi.fn(),
}))

// Approved copy (D-02), copied verbatim from the plan's Approved copy table.
const APPROVED = {
  text: 'WoW Forever is here.',
  cta: 'Set up your guild',
  close: 'Close',
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  document.documentElement.removeAttribute(FOREVER_BAR_HTML_ATTR)
})

afterEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute(FOREVER_BAR_HTML_ATTR)
})

describe('ForeverAnnouncementBar', () => {
  it('renders the approved text and CTA link, carrying data-announcement', () => {
    const { container } = render(<ForeverAnnouncementBar onDismiss={vi.fn()} />)
    expect(screen.getByText(APPROVED.text, { exact: false })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: APPROVED.cta })).toHaveAttribute(
      'href',
      FOREVER_CREATE_URL
    )
    expect(container.firstChild).toHaveAttribute('data-announcement', 'wow-forever')
  })

  it('clicking Close sets the html attribute, writes the dismissed key, fires announcement_dismissed and calls onDismiss', () => {
    const onDismiss = vi.fn()
    render(<ForeverAnnouncementBar onDismiss={onDismiss} />)
    fireEvent.click(screen.getByRole('button', { name: APPROVED.close }))

    expect(document.documentElement.getAttribute(FOREVER_BAR_HTML_ATTR)).toBe('dismissed')
    expect(localStorage.getItem(FOREVER_BAR_DISMISSED_KEY)).toBe('1')
    expect(trackClientEvent).toHaveBeenCalledWith('announcement_dismissed', {
      announcement: 'wow-forever',
      surface: 'public_bar',
    })
    expect(onDismiss).toHaveBeenCalled()
  })

  it('still sets the html attribute when setItem throws', () => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = () => {
      throw new Error('quota')
    }
    const onDismiss = vi.fn()
    render(<ForeverAnnouncementBar onDismiss={onDismiss} />)
    fireEvent.click(screen.getByRole('button', { name: APPROVED.close }))
    expect(document.documentElement.getAttribute(FOREVER_BAR_HTML_ATTR)).toBe('dismissed')
    expect(onDismiss).toHaveBeenCalled()
    Storage.prototype.setItem = original
  })

  it('clicking the CTA link fires announcement_cta_clicked and trackMarketingCta with the expected payload', () => {
    render(<ForeverAnnouncementBar onDismiss={vi.fn()} />)
    fireEvent.click(screen.getByRole('link', { name: APPROVED.cta }))

    expect(trackClientEvent).toHaveBeenCalledWith('announcement_cta_clicked', {
      announcement: 'wow-forever',
      surface: 'public_bar',
    })
    expect(trackMarketingCta).toHaveBeenCalledWith({
      cta_text: 'Set up your guild',
      cta_placement: 'announcement_bar',
      destination: FOREVER_CREATE_URL,
    })
  })
})

describe('ForeverAnnouncementSpacer', () => {
  it('carries the same data-announcement attribute as the bar', () => {
    const { container } = render(<ForeverAnnouncementSpacer />)
    const spacer = container.firstChild as HTMLElement
    expect(spacer).toHaveAttribute('data-announcement', 'wow-forever')
  })
})

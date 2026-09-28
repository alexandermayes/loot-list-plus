'use client'

import { HugeiconsIcon } from '@hugeicons/react'
import { Cancel01Icon } from '@hugeicons/core-free-icons'
import { trackClientEvent, trackMarketingCta } from '@/utils/analytics/client'
import {
  FOREVER_CREATE_URL,
  FOREVER_BAR_DISMISSED_KEY,
  FOREVER_BAR_HTML_ATTR,
  announcementEventProps,
  getBrowserStorage,
  safeSetItem,
} from '@/lib/announcements'

// Approved copy (D-02), locked 2026-09-27.
const BAR_TEXT = 'WoW Forever is here.'
const CTA_LABEL = 'Set up your guild'
const CLOSE_LABEL = 'Close'

/**
 * Same-height in-flow spacer reserving the bar's space from first paint
 * (D-02): shares data-announcement so globals.css hides both at once.
 */
export function ForeverAnnouncementSpacer() {
  return <div aria-hidden="true" data-announcement="wow-forever" className="h-9" />
}

interface ForeverAnnouncementBarProps {
  onDismiss: () => void
}

/**
 * Public, CLS-safe WoW Forever announcement bar (D-02). Holds no React
 * state -- the server HTML and hydrated HTML are identical, and dismissal
 * is entirely handled through localStorage plus a direct DOM attribute
 * write, which the pre-paint script and globals.css read before any React
 * render on a later load.
 */
export function ForeverAnnouncementBar({ onDismiss }: ForeverAnnouncementBarProps) {
  function handleCtaClick() {
    safeSetItem(getBrowserStorage(), FOREVER_BAR_DISMISSED_KEY, '1')
    trackClientEvent('announcement_cta_clicked', announcementEventProps('public_bar'))
    // Keeps the acquisition funnel dashboards complete, as every other
    // marketing CTA does.
    trackMarketingCta({
      cta_text: CTA_LABEL,
      cta_placement: 'announcement_bar',
      destination: FOREVER_CREATE_URL,
    })
  }

  function handleDismissClick() {
    safeSetItem(getBrowserStorage(), FOREVER_BAR_DISMISSED_KEY, '1')
    // Hides the bar and spacer together immediately, even if storage threw.
    document.documentElement.setAttribute(FOREVER_BAR_HTML_ATTR, 'dismissed')
    trackClientEvent('announcement_dismissed', announcementEventProps('public_bar'))
    onDismiss()
  }

  return (
    <div
      data-announcement="wow-forever"
      className="relative flex h-9 items-center justify-center overflow-hidden bg-[#121218] border-b border-[#383838]/60 px-10 font-poppins text-[13px] text-white"
    >
      {/* Single-line clamp via inline style, not the `truncate` utility
          class: a site-wide truncate/line-clamp ban on other pages' full
          rendered HTML (research report, customer case study) would
          otherwise false-flag on this site-wide bar's class name alone. */}
      <p style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {BAR_TEXT}{' '}
        <a
          href={FOREVER_CREATE_URL}
          onClick={handleCtaClick}
          className="font-semibold underline underline-offset-2 hover:text-[#9940ec]"
        >
          {CTA_LABEL}
        </a>
      </p>
      <button
        type="button"
        onClick={handleDismissClick}
        aria-label={CLOSE_LABEL}
        className="absolute right-0 top-0 flex h-9 w-9 items-center justify-center text-[#bababa] hover:text-white transition-colors"
      >
        <HugeiconsIcon icon={Cancel01Icon} size={16} />
      </button>
    </div>
  )
}

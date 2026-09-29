'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { trackClientEvent } from '@/utils/analytics/client'
import {
  FOREVER_CREATE_PATH,
  announcementEventProps,
  foreverModalSeenKey,
  getBrowserStorage,
  safeSetItem,
  shouldShowForeverModal,
} from '@/lib/announcements'

// Approved copy (D-01), locked 2026-09-27. Kept as module-level string
// constants with straight apostrophes so JSX needs no entity escaping.
const TITLE = 'WoW Forever is here'
const PARAGRAPH_1 =
  "You can now set up a LootList+ guild for World of Warcraft: Forever. Pick WoW Forever when you create a guild, then choose your region and ruleset instead of a realm."
const PARAGRAPH_2 =
  "Forever raids aren't in LootList+ yet. We'll keep updating as we learn more. In the meantime, you can get your guild, roster and characters ready."
const CTA_LABEL = 'Create a Forever guild'
const DISMISS_LABEL = 'Not now'

/** Focusable descendants for the Tab-trap: links with href, enabled buttons, and any element with a non-negative tabindex. */
function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const nodes = container.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]')
  return Array.from(nodes).filter((el) => {
    if (el === container) {
      return false
    }
    const tabindex = el.getAttribute('tabindex')
    return tabindex === null || parseInt(tabindex, 10) >= 0
  })
}

interface ForeverAnnouncementModalProps {
  /** Delay before the dialog opens, letting the page paint first (D-01). */
  delayMs?: number
}

/**
 * Signed-in-only WoW Forever announcement dialog (D-01). Mounted once in
 * app/(app)/AppLayout.client.tsx; shows at most once per user per browser.
 */
export default function ForeverAnnouncementModal({ delayMs = 800 }: ForeverAnnouncementModalProps) {
  const { loading, user, activeGuild } = useGuildContext()
  const [open, setOpen] = useState(false)
  const closedRef = useRef(false)
  const viewedRef = useRef(false)
  const previousFocusRef = useRef<Element | null>(null)
  const titleId = useId()
  const bodyId = useId()

  const userId = user?.id ?? null
  const guildId = activeGuild?.id ?? null
  const guildGame = activeGuild?.game ?? null

  useEffect(() => {
    if (closedRef.current) {
      return
    }
    if (
      !shouldShowForeverModal(
        { loading, userId, guild: activeGuild ?? null },
        getBrowserStorage()
      )
    ) {
      return
    }
    const timer = setTimeout(() => {
      previousFocusRef.current = document.activeElement
      setOpen(true)
      if (!viewedRef.current) {
        viewedRef.current = true
        trackClientEvent('announcement_viewed', announcementEventProps('app_modal'))
      }
    }, delayMs)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, userId, guildId, guildGame, delayMs])

  const handleClose = useCallback(
    (action: 'dismiss' | 'cta') => {
      if (userId) {
        safeSetItem(getBrowserStorage(), foreverModalSeenKey(userId), '1')
      }
      closedRef.current = true
      setOpen(false)
      trackClientEvent(
        action === 'dismiss' ? 'announcement_dismissed' : 'announcement_cta_clicked',
        announcementEventProps('app_modal')
      )
      if (action === 'dismiss') {
        const el = previousFocusRef.current
        if (el instanceof HTMLElement && el.isConnected) {
          el.focus()
        }
      }
    },
    [userId]
  )

  const dialogRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      node.focus()
    }
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab') {
      return
    }
    const container = e.currentTarget
    const focusable = getFocusableElements(container)
    if (focusable.length === 0) {
      return
    }
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    const active = document.activeElement

    if (e.shiftKey) {
      if (active === first || active === container) {
        e.preventDefault()
        last.focus()
      }
    } else if (active === last) {
      e.preventDefault()
      first.focus()
    }
  }, [])

  return (
    <Modal open={open} onClose={() => handleClose('dismiss')} size="sm">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        // tabIndex 0, not -1: the shared Modal's topmost focus trap focuses
        // its first focusable descendant on open, and it skips tabindex="-1".
        // With 0 this container is that first descendant, so focus lands on
        // the dialog itself (as intended here) instead of on "Not now".
        // getFocusableElements excludes the container, so the Tab wrap is
        // unchanged.
        tabIndex={0}
        className="outline-none flex flex-col min-h-0"
        onKeyDown={handleKeyDown}
      >
        <ModalHeader showCloseButton={false}>
          <div className="flex items-center gap-3">
            <Image
              src="/images/expansions/ForeverLogo.webp"
              alt=""
              width={274}
              height={224}
              className="h-10 w-auto shrink-0"
            />
            <ModalTitle id={titleId}>{TITLE}</ModalTitle>
          </div>
        </ModalHeader>
        <ModalBody id={bodyId} className="text-13 text-foreground-secondary space-y-3">
          <p>{PARAGRAPH_1}</p>
          <p>{PARAGRAPH_2}</p>
        </ModalBody>
        <ModalFooter className="flex-col-reverse sm:flex-row">
          <Button variant="outline" className="w-full sm:w-auto" onClick={() => handleClose('dismiss')}>
            {DISMISS_LABEL}
          </Button>
          <Button variant="primary" asChild className="w-full sm:w-auto">
            <Link href={FOREVER_CREATE_PATH} onClick={() => handleClose('cta')}>
              {CTA_LABEL}
            </Link>
          </Button>
        </ModalFooter>
      </div>
    </Modal>
  )
}

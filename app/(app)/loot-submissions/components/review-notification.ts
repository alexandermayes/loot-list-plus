// Holds the officer review Discord DM until the undo toast ends (GH #353
// D-08, OD-3 option N1). A misclicked review followed by an undo should
// never send a DM the raider would then have to ignore, so the page holds
// one payload at a time and only sends it when the undo window is gone for
// good: the toast timer ends, the officer closes it, reviews another list,
// or leaves the page.
//
// No React import: this module is plain state plus a fetch call so it can
// be unit tested without rendering anything.

export interface ReviewNotificationPayload {
  submission_id: string
  status: 'approved' | 'rejected'
  review_notes?: string
  guild_name?: string
  character_name?: string
  phase: number | null
}

export interface SendReviewNotificationOptions {
  keepalive?: boolean
}

/**
 * Posts a review outcome to the Discord notification route. Fire and
 * forget: a rejected fetch is caught and logged, never thrown, so it can
 * never block the officer's own review flow.
 */
export async function sendReviewNotification(
  payload: ReviewNotificationPayload,
  { keepalive = false }: SendReviewNotificationOptions = {}
): Promise<void> {
  try {
    await fetch('/api/discord/send-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive,
    })
  } catch (err) {
    console.error('Failed to send Discord notification:', err)
  }
}

export interface PendingReviewNotificationController {
  /**
   * Holds `payload` to be sent later. If a different submission's payload
   * is already held, it is sent first (that undo window is over now that a
   * new review started).
   */
  hold(payload: ReviewNotificationPayload): void
  /**
   * Sends and clears the held payload. With no `submissionId`, or one that
   * matches the held payload, it sends; otherwise it does nothing (a stale
   * call for a payload that was already released or discarded).
   */
  release(options?: { submissionId?: string; keepalive?: boolean }): void
  /** Clears the held payload without sending, only if it matches `submissionId`. */
  discard(submissionId: string): void
  /** True while a payload is held. */
  isHolding(): boolean
}

type SendFn = (payload: ReviewNotificationPayload, options?: SendReviewNotificationOptions) => void

/**
 * Creates one controller instance (one per page mount) that holds at most
 * one pending review notification at a time.
 */
export function createPendingReviewNotification(send: SendFn = sendReviewNotification): PendingReviewNotificationController {
  let held: ReviewNotificationPayload | null = null

  return {
    hold(payload) {
      if (held && held.submission_id !== payload.submission_id) {
        send(held)
      }
      held = payload
    },
    release(options) {
      if (!held) return
      if (options?.submissionId && options.submissionId !== held.submission_id) return
      const payload = held
      held = null
      send(payload, { keepalive: options?.keepalive ?? false })
    },
    discard(submissionId) {
      if (held && held.submission_id === submissionId) {
        held = null
      }
    },
    isHolding() {
      return held !== null
    },
  }
}

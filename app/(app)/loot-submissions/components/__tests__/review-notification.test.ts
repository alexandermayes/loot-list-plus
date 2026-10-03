import { describe, it, expect, vi, afterEach } from 'vitest'
import { createPendingReviewNotification, sendReviewNotification, type ReviewNotificationPayload } from '../review-notification'

const payload = (submissionId: string, status: 'approved' | 'rejected' = 'approved'): ReviewNotificationPayload => ({
  submission_id: submissionId,
  status,
  guild_name: 'Test Guild',
  character_name: 'Testchar',
  phase: 1,
})

describe('createPendingReviewNotification', () => {
  it('sends nothing on hold', () => {
    const send = vi.fn()
    const controller = createPendingReviewNotification(send)
    controller.hold(payload('s1'))
    expect(send).not.toHaveBeenCalled()
    expect(controller.isHolding()).toBe(true)
  })

  it('release sends the held payload once with keepalive false', () => {
    const send = vi.fn()
    const controller = createPendingReviewNotification(send)
    const p1 = payload('s1')
    controller.hold(p1)
    controller.release()
    expect(send).toHaveBeenCalledTimes(1)
    expect(send).toHaveBeenCalledWith(p1, { keepalive: false })
    expect(controller.isHolding()).toBe(false)

    // A second release sends nothing further.
    controller.release()
    expect(send).toHaveBeenCalledTimes(1)
  })

  it('holding a second submission sends the first at the second hold and keeps the second held', () => {
    const send = vi.fn()
    const controller = createPendingReviewNotification(send)
    const p1 = payload('s1')
    const p2 = payload('s2', 'rejected')
    controller.hold(p1)
    controller.hold(p2)
    expect(send).toHaveBeenCalledTimes(1)
    expect(send).toHaveBeenCalledWith(p1)
    controller.release()
    expect(send).toHaveBeenCalledTimes(2)
    expect(send).toHaveBeenNthCalledWith(2, p2, { keepalive: false })
  })

  it('discard clears the held payload without sending', () => {
    const send = vi.fn()
    const controller = createPendingReviewNotification(send)
    const p1 = payload('s1')
    controller.hold(p1)
    controller.discard('s1')
    expect(controller.isHolding()).toBe(false)
    controller.release()
    expect(send).not.toHaveBeenCalled()
  })

  it('discard of a different id leaves the held payload in place', () => {
    const send = vi.fn()
    const controller = createPendingReviewNotification(send)
    const p1 = payload('s1')
    controller.hold(p1)
    controller.discard('other')
    expect(controller.isHolding()).toBe(true)
    controller.release()
    expect(send).toHaveBeenCalledWith(p1, { keepalive: false })
  })

  it('release with a mismatched submissionId sends nothing', () => {
    const send = vi.fn()
    const controller = createPendingReviewNotification(send)
    const p1 = payload('s1')
    controller.hold(p1)
    controller.release({ submissionId: 'other' })
    expect(send).not.toHaveBeenCalled()
    expect(controller.isHolding()).toBe(true)
  })

  it('release with the matching submissionId sends the held payload', () => {
    const send = vi.fn()
    const controller = createPendingReviewNotification(send)
    const p1 = payload('s1')
    controller.hold(p1)
    controller.release({ submissionId: 's1' })
    expect(send).toHaveBeenCalledWith(p1, { keepalive: false })
  })

  it('release with keepalive true passes it through to send', () => {
    const send = vi.fn()
    const controller = createPendingReviewNotification(send)
    const p1 = payload('s1')
    controller.hold(p1)
    controller.release({ keepalive: true })
    expect(send).toHaveBeenCalledWith(p1, { keepalive: true })
  })
})

describe('sendReviewNotification', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('posts JSON to /api/discord/send-notification with the payload and keepalive', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    const p1 = payload('s1')
    await sendReviewNotification(p1, { keepalive: true })
    expect(fetchMock).toHaveBeenCalledWith('/api/discord/send-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(p1),
      keepalive: true,
    })
  })

  it('catches and logs a rejected fetch', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'))
    vi.stubGlobal('fetch', fetchMock)
    await sendReviewNotification(payload('s1'))
    expect(consoleError).toHaveBeenCalledWith('Failed to send Discord notification:', expect.any(Error))
    consoleError.mockRestore()
  })
})

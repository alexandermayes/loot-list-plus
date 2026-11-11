// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response global that discordFetch hands back.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { discordFetch, sendDirectMessage } from '../discord'

// Why these cases: discordFetch sleeps on Discord's Retry-After with no cap of
// its own, so a caller with a deadline (the Set your 5 send) relies on the
// signal it passes to end that wait. regression for WR-03 (Phase 4 review).

const URL = 'https://discord.com/api/v10/channels/700000000000000001/messages'
const BOT_TOKEN = 'test-bot-token-not-real'

function response(status: number, headers: Record<string, string> = {}, body: unknown = {}) {
  return new Response(JSON.stringify(body), { status, headers })
}

let fetchMock: ReturnType<typeof vi.fn>
let warnSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  vi.useFakeTimers()
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  warnSpy.mockRestore()
})

describe('discordFetch without a signal', () => {
  it('honours Retry-After in full and then retries', async () => {
    fetchMock.mockResolvedValueOnce(response(429, { 'Retry-After': '30' })).mockResolvedValueOnce(response(200))

    const pending = discordFetch(URL, { method: 'POST' })
    await vi.advanceTimersByTimeAsync(29_999)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    const res = await pending

    expect(res.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('returns the last 429 once the retries are spent', async () => {
    fetchMock.mockResolvedValue(response(429, { 'Retry-After': '1' }))

    const pending = discordFetch(URL)
    await vi.advanceTimersByTimeAsync(2_000)
    const res = await pending

    expect(res.status).toBe(429)
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})

describe('discordFetch with a deadline signal', () => {
  it('passes the signal to fetch', async () => {
    fetchMock.mockResolvedValueOnce(response(200))
    const controller = new AbortController()

    await discordFetch(URL, { method: 'POST', signal: controller.signal })

    expect(fetchMock.mock.calls[0][1]).toMatchObject({ signal: controller.signal })
  })

  it('ends a Retry-After wait at the deadline and hands back the 429 as it stands', async () => {
    fetchMock.mockResolvedValueOnce(response(429, { 'Retry-After': '30' })).mockResolvedValueOnce(response(200))
    const controller = new AbortController()

    const pending = discordFetch(URL, { signal: controller.signal })
    await vi.advanceTimersByTimeAsync(1_000)
    controller.abort()
    const res = await pending

    expect(res.status).toBe(429)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    // The 30 second timer is cleared: nothing fires later.
    await vi.advanceTimersByTimeAsync(60_000)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('ends a 5xx retry wait at the deadline and hands back the 5xx', async () => {
    fetchMock.mockResolvedValueOnce(response(503)).mockResolvedValueOnce(response(200))
    const controller = new AbortController()

    const pending = discordFetch(URL, { signal: controller.signal })
    await vi.advanceTimersByTimeAsync(500)
    controller.abort()
    const res = await pending

    expect(res.status).toBe(503)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('makes no request on an already aborted signal and throws its reason', async () => {
    const controller = new AbortController()
    const reason = new Error('deadline')
    controller.abort(reason)

    await expect(discordFetch(URL, { signal: controller.signal })).rejects.toBe(reason)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('does not retry a request the deadline cut off in flight', async () => {
    const controller = new AbortController()
    fetchMock.mockImplementationOnce(async () => {
      controller.abort()
      throw new DOMException('The operation was aborted', 'AbortError')
    })

    await expect(discordFetch(URL, { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' })
    await vi.advanceTimersByTimeAsync(5_000)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('sendDirectMessage with a deadline signal', () => {
  it('passes the signal to both Discord calls', async () => {
    fetchMock
      .mockResolvedValueOnce(response(200, {}, { id: '700000000000000002' }))
      .mockResolvedValueOnce(response(200))
    const controller = new AbortController()

    const outcome = await sendDirectMessage(BOT_TOKEN, '800000000000000001', { content: 'hi' }, { signal: controller.signal })

    expect(outcome).toEqual({ ok: true, stage: 'send_message', status: 200 })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    for (const call of fetchMock.mock.calls) {
      expect(call[1]).toMatchObject({ signal: controller.signal })
    }
  })

  it('reports a DM cut off by the deadline as not ok with a null status, never throwing', async () => {
    const controller = new AbortController()
    fetchMock
      .mockResolvedValueOnce(response(200, {}, { id: '700000000000000002' }))
      .mockImplementationOnce(async () => {
        controller.abort()
        throw new DOMException('The operation was aborted', 'AbortError')
      })

    const outcome = await sendDirectMessage(BOT_TOKEN, '800000000000000001', { content: 'hi' }, { signal: controller.signal })

    expect(outcome).toEqual({ ok: false, stage: 'send_message', status: null })
  })
})

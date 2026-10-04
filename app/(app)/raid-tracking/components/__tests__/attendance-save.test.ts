import { describe, it, expect, vi, afterEach } from 'vitest'
import { sendAttendanceBulk, importSaveFailureMessage, IMPORT_SAVE_FAILED_MESSAGE, IMPORT_SAVE_FAILED_FALLBACK } from '../attendance-save'

function okResponse() {
  return { ok: true, status: 200, json: async () => ({ success: true }) } as unknown as Response
}

function errorResponse(status: number, body: unknown) {
  return { ok: false, status, json: async () => body } as unknown as Response
}

function nonJsonErrorResponse(status: number) {
  return { ok: false, status, json: async () => { throw new Error('not json') } } as unknown as Response
}

describe('sendAttendanceBulk', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('posts with the method, JSON content-type header and JSON body, and returns null for an ok response', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(okResponse())
    vi.stubGlobal('fetch', fetchSpy)

    const result = await sendAttendanceBulk('POST', { guild_id: 'g1', records: [] })

    expect(result).toBeNull()
    expect(fetchSpy).toHaveBeenCalledWith('/api/attendance/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guild_id: 'g1', records: [] }),
    })
  })

  it('returns the status and error text for a 400 response with an error body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(errorResponse(400, { error: 'One or more raiders were never members of this guild. Refresh the page, then try again.' })))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = await sendAttendanceBulk('PATCH', { guild_id: 'g1', updates: {}, filters: {} })

    expect(result).toEqual({ status: 400, error: 'One or more raiders were never members of this guild. Refresh the page, then try again.' })
  })

  it('returns a null error for a 500 response with a non-JSON body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(nonJsonErrorResponse(500)))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = await sendAttendanceBulk('DELETE', { guild_id: 'g1', ids: ['x'] })

    expect(result).toEqual({ status: 500, error: null })
  })

  it('returns a null error when the body error is an empty string', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(errorResponse(400, { error: '' })))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = await sendAttendanceBulk('POST', { guild_id: 'g1', records: [] })

    expect(result).toEqual({ status: 400, error: null })
  })

  it('returns a null status and error, and does not throw, when fetch rejects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = await sendAttendanceBulk('POST', { guild_id: 'g1', records: [] })

    expect(result).toEqual({ status: null, error: null })
    expect(errorSpy).toHaveBeenCalledWith('Attendance save failed:', { method: 'POST' })
  })

  it('logs the constant message with method and status on a failed response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(errorResponse(403, { error: 'nope' })))
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await sendAttendanceBulk('DELETE', { guild_id: 'g1' })

    expect(errorSpy).toHaveBeenCalledWith('Attendance save failed:', { method: 'DELETE', status: 403 })
  })
})

describe('importSaveFailureMessage', () => {
  it('returns null for an empty list', () => {
    expect(importSaveFailureMessage([])).toBeNull()
  })

  it('appends the first failure with error text', () => {
    expect(importSaveFailureMessage([{ status: 400, error: 'X.' }]))
      .toBe(`${IMPORT_SAVE_FAILED_MESSAGE} X.`)
  })

  it('uses the first failure that has error text, skipping ones that do not', () => {
    expect(importSaveFailureMessage([{ status: null, error: null }, { status: 400, error: 'Y.' }]))
      .toBe(`${IMPORT_SAVE_FAILED_MESSAGE} Y.`)
  })

  it('falls back to the fallback text when no failure has error text', () => {
    expect(importSaveFailureMessage([{ status: null, error: null }, { status: 500, error: null }]))
      .toBe(`${IMPORT_SAVE_FAILED_MESSAGE} ${IMPORT_SAVE_FAILED_FALLBACK}`)
  })
})

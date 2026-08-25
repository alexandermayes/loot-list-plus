// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { isChunkLoadError, reloadOnceForStaleChunk } from '../chunk-reload'

describe('isChunkLoadError', () => {
  it('matches the chunk failure messages seen in production', () => {
    // Real messages from PostHog client_error events (Jul-Aug 2026)
    expect(isChunkLoadError('Failed to load chunk /_next/static/chunks/31379-8ba54ebc866e0da7.js')).toBe(true)
    expect(isChunkLoadError('Failed to load chunk /_next/static/chunks/51340-1f2ab9d61a3c44de.js')).toBe(true)
  })

  it('matches the other chunk failure shapes browsers produce', () => {
    expect(isChunkLoadError('ChunkLoadError: Loading chunk 179 failed.')).toBe(true)
    expect(isChunkLoadError('Loading chunk app/loot-list/page failed. (error: https://x/chunk.js)')).toBe(true)
    expect(isChunkLoadError('Failed to fetch dynamically imported module: https://x/_next/static/chunks/a.js')).toBe(true)
    expect(isChunkLoadError('error loading dynamically imported module')).toBe(true)
    expect(isChunkLoadError('Importing a module script failed.')).toBe(true)
  })

  it('does not match unrelated errors', () => {
    expect(isChunkLoadError("Failed to execute 'removeChild' on 'Node'")).toBe(false)
    expect(isChunkLoadError('Error in input stream')).toBe(false)
    expect(isChunkLoadError('Network request failed')).toBe(false)
    expect(isChunkLoadError('')).toBe(false)
    expect(isChunkLoadError(null)).toBe(false)
    expect(isChunkLoadError(undefined)).toBe(false)
  })
})

describe('reloadOnceForStaleChunk', () => {
  const reload = vi.fn()

  beforeEach(() => {
    reload.mockClear()
    window.sessionStorage.clear()
    Object.defineProperty(window, 'location', {
      value: { ...window.location, reload },
      writable: true,
    })
  })

  it('reloads on the first chunk failure', () => {
    expect(reloadOnceForStaleChunk()).toBe(true)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('does not reload again within the cooldown (no reload loops)', () => {
    expect(reloadOnceForStaleChunk()).toBe(true)
    expect(reloadOnceForStaleChunk()).toBe(false)
    expect(reloadOnceForStaleChunk()).toBe(false)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('reloads again once the cooldown has passed (next deploy)', () => {
    window.sessionStorage.setItem('chunk-error-reloaded-at', String(Date.now() - 61_000))
    expect(reloadOnceForStaleChunk()).toBe(true)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('does not reload when sessionStorage is unavailable (loop protection impossible)', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied')
    })
    expect(reloadOnceForStaleChunk()).toBe(false)
    expect(reload).not.toHaveBeenCalled()
    getItem.mockRestore()
  })
})

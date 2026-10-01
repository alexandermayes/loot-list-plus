import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  persistRaiderModifiers,
  putRaiderModifiers,
  RAIDER_BONUS_SAVE_FAILED,
} from '../raider-bonus-save'
import type { RaiderBonusMap } from '@/domain/scoring'

const A = '11111111-1111-4111-8111-111111111111'

/** Minimal fetch Response stand-in. */
function jsonResponse(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body }
}

function textResponse(status: number) {
  return { ok: false, status, json: async () => { throw new SyntaxError('Unexpected token') } }
}

describe('putRaiderModifiers', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('sends the map as single_raider_modifiers', async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse(200, { settings: {} }))
    const mods: RaiderBonusMap = { [A]: [{ amount: 2, expires_at: null }] }

    expect(await putRaiderModifiers('g1', mods, fetchFn)).toEqual({ ok: true })
    const [url, init] = fetchFn.mock.calls[0]
    expect(url).toBe('/api/guild-settings')
    expect(init.method).toBe('PUT')
    expect(JSON.parse(init.body)).toEqual({ guild_id: 'g1', settings: { single_raider_modifiers: mods } })
  })

  it("shows the server's message for a 400", async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse(400, { error: 'A raider bonus reason can be up to 60 characters.' }))
    expect(await putRaiderModifiers('g1', {}, fetchFn)).toEqual({ ok: false, message: 'A raider bonus reason can be up to 60 characters.' })
  })

  it('falls back to the generic message for other failures', async () => {
    expect(await putRaiderModifiers('g1', {}, vi.fn().mockResolvedValue(jsonResponse(500, { error: 'Internal server error' }))))
      .toEqual({ ok: false, message: RAIDER_BONUS_SAVE_FAILED })
    expect(await putRaiderModifiers('g1', {}, vi.fn().mockResolvedValue(textResponse(400))))
      .toEqual({ ok: false, message: RAIDER_BONUS_SAVE_FAILED })
    expect(await putRaiderModifiers('g1', {}, vi.fn().mockRejectedValue(new Error('offline'))))
      .toEqual({ ok: false, message: RAIDER_BONUS_SAVE_FAILED })
  })
})

describe('persistRaiderModifiers', () => {
  const previous: RaiderBonusMap = { [A]: [{ amount: 1, expires_at: null }] }
  const next: RaiderBonusMap = {
    [A]: [
      { amount: 1, expires_at: null },
      { amount: 3, expires_at: '2026-10-01' },
      { amount: 2, starts_at: '2026-10-13', expires_at: '2026-10-19' },
    ],
  }
  const tidied: RaiderBonusMap = {
    [A]: [
      { amount: 1, expires_at: null },
      { amount: 2, starts_at: '2026-10-13', expires_at: '2026-10-19' },
    ],
  }

  function deps(fetchFn: ReturnType<typeof vi.fn>) {
    return {
      guildId: 'g1',
      previous,
      today: '2026-10-06',
      setMods: vi.fn(),
      setSaving: vi.fn(),
      notify: vi.fn(),
      fetchFn: fetchFn as unknown as typeof fetch,
    }
  }

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('saves the tidied map, updates local state and resolves true', async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse(200, {}))
    const d = deps(fetchFn)

    expect(await persistRaiderModifiers(next, d)).toBe(true)
    expect(JSON.parse(fetchFn.mock.calls[0][1].body).settings.single_raider_modifiers).toEqual(tidied)
    expect(d.setMods.mock.calls).toEqual([[tidied]])
    expect(d.setSaving.mock.calls).toEqual([[true], [false]])
    expect(d.notify).not.toHaveBeenCalled()
  })

  it("rolls back and shows the server's 400 message", async () => {
    const d = deps(vi.fn().mockResolvedValue(jsonResponse(400, { error: 'A raider bonus has an unknown raider.' })))

    expect(await persistRaiderModifiers(next, d)).toBe(false)
    expect(d.setMods.mock.calls).toEqual([[tidied], [previous]])
    expect(d.notify).toHaveBeenCalledWith('error', 'A raider bonus has an unknown raider.')
    expect(d.setSaving.mock.calls).toEqual([[true], [false]])
  })

  it('rolls back with the generic message when the network fails', async () => {
    const d = deps(vi.fn().mockRejectedValue(new Error('offline')))

    expect(await persistRaiderModifiers(next, d)).toBe(false)
    expect(d.setMods).toHaveBeenLastCalledWith(previous)
    expect(d.notify).toHaveBeenCalledWith('error', RAIDER_BONUS_SAVE_FAILED)
  })
})

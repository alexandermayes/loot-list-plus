import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  persistRaiderModifiers,
  putRaiderModifiers,
  saveRaiderBonusBatch,
  bonusAddedMessage,
  RAIDER_BONUS_SAVE_FAILED,
  RAIDER_BONUS_ALIAS_FAILED,
  type RaiderBonusBatchDraft,
} from '../raider-bonus-save'
import type { RaiderBonusMap } from '@/domain/scoring'

const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'

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

describe('saveRaiderBonusBatch', () => {
  const existing: RaiderBonusMap = { [A]: [{ amount: 10, expires_at: null }] }
  const draft: RaiderBonusBatchDraft = {
    characterIds: [A, B],
    amount: 2,
    label: 'Full enchants',
    starts_at: '2026-10-06',
    expires_at: '2026-10-12',
    aliasesToSave: [],
  }

  function deps(persistResult: boolean, fetchFn = vi.fn()) {
    return {
      guildId: 'g1',
      mods: existing,
      batchId: 'batch-0001',
      persist: vi.fn<(next: RaiderBonusMap) => Promise<boolean>>().mockResolvedValue(persistResult),
      onSaved: vi.fn(),
      onAliasesSaved: vi.fn(),
      notify: vi.fn(),
      fetchFn: fetchFn as unknown as typeof fetch,
      rawFetch: fetchFn,
    }
  }

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('adds one entry per raider under one batch id, closes and shows the success toast', async () => {
    const d = deps(true)

    expect(await saveRaiderBonusBatch(draft, d)).toBe(true)
    const next = d.persist.mock.calls[0][0]
    expect(next[A]).toEqual([
      { amount: 10, expires_at: null },
      { amount: 2, starts_at: '2026-10-06', expires_at: '2026-10-12', label: 'Full enchants', batch_id: 'batch-0001' },
    ])
    expect(next[B]).toEqual([{ amount: 2, starts_at: '2026-10-06', expires_at: '2026-10-12', label: 'Full enchants', batch_id: 'batch-0001' }])
    expect(d.onSaved).toHaveBeenCalledTimes(1)
    expect(d.notify).toHaveBeenCalledWith('success', 'Bonus added for 2 raiders.')
    expect(d.rawFetch).not.toHaveBeenCalled()
  })

  it('keeps the modal open when the bonus save fails', async () => {
    const d = deps(false)

    expect(await saveRaiderBonusBatch({ ...draft, aliasesToSave: [{ alias_name: 'nobody', character_id: B }] }, d)).toBe(false)
    expect(d.onSaved).not.toHaveBeenCalled()
    expect(d.notify).not.toHaveBeenCalled()
    expect(d.rawFetch).not.toHaveBeenCalled()
  })

  it('saves remembered names after the bonus and passes back what was stored', async () => {
    const stored = [{ id: 'alias-1', alias_name: 'nobody', character_id: B }]
    const d = deps(true, vi.fn().mockResolvedValue(jsonResponse(200, { aliases: stored })))
    const aliasesToSave = [{ alias_name: 'nobody', character_id: B }]

    expect(await saveRaiderBonusBatch({ ...draft, aliasesToSave }, d)).toBe(true)
    const [url, init] = d.rawFetch.mock.calls[0]
    expect(url).toBe('/api/character-aliases')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ guild_id: 'g1', aliases: aliasesToSave })
    expect(d.onAliasesSaved).toHaveBeenCalledWith(stored)
    expect(d.notify).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['a 403 for officers without member management', () => Promise.resolve(jsonResponse(403, { error: 'Only officers can manage aliases' }))],
    ['a server error', () => Promise.resolve(jsonResponse(500, { error: 'Failed to save aliases' }))],
    ['a network failure', () => Promise.reject(new Error('offline'))],
  ])('keeps the bonus and shows the alias notice on %s', async (_name, respond) => {
    const d = deps(true, vi.fn().mockImplementation(respond))

    expect(await saveRaiderBonusBatch({ ...draft, aliasesToSave: [{ alias_name: 'nobody', character_id: B }] }, d)).toBe(true)
    expect(d.onSaved).toHaveBeenCalledTimes(1)
    expect(d.notify).toHaveBeenCalledWith('success', 'Bonus added for 2 raiders.')
    expect(d.notify).toHaveBeenCalledWith('warning', RAIDER_BONUS_ALIAS_FAILED)
    expect(d.onAliasesSaved).not.toHaveBeenCalled()
  })

  it('words the success toast for one raider', () => {
    expect(bonusAddedMessage(1)).toBe('Bonus added for 1 raider.')
    expect(bonusAddedMessage(25)).toBe('Bonus added for 25 raiders.')
  })
})

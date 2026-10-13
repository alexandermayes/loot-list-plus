// @vitest-environment node
// Runs in the root vitest suite. companion/tsconfig.json excludes
// __tests__, so the companion typecheck never needs vitest's types.
import { describe, expect, it } from 'vitest'
import { describeRejected, statusText } from '../sync-status'
import type { SyncStatus } from '../sync-status'

function status(partial: Partial<SyncStatus> = {}): SyncStatus {
  return {
    state: 'watching',
    lastSync: null,
    lastError: null,
    pendingAwards: 0,
    pendingAttendance: 0,
    ...partial,
  }
}

describe('describeRejected (GH #320)', () => {
  it('D1 nothing rejected gives null', () => {
    expect(describeRejected(0, 0)).toBeNull()
  })

  it('D2 one award', () => {
    expect(describeRejected(1, 0)).toBe(
      '1 award was not accepted by the server. It stays in the addon and will be retried on the next sync.',
    )
  })

  it('D3 one attendance record', () => {
    expect(describeRejected(0, 1)).toBe(
      '1 attendance record was not accepted by the server. It stays in the addon and will be retried on the next sync.',
    )
  })

  it('D4 several awards and one attendance record', () => {
    expect(describeRejected(2, 1)).toBe(
      '2 awards and 1 attendance record were not accepted by the server. They stay in the addon and will be retried on the next sync.',
    )
  })

  it('D5 one award and one attendance record', () => {
    expect(describeRejected(1, 1)).toBe(
      '1 award and 1 attendance record were not accepted by the server. They stay in the addon and will be retried on the next sync.',
    )
  })

  it('D6 several attendance records', () => {
    expect(describeRejected(0, 3)).toBe(
      '3 attendance records were not accepted by the server. They stay in the addon and will be retried on the next sync.',
    )
  })
})

describe('statusText (GH #320)', () => {
  it('T1 a syncing status', () => {
    expect(statusText(status({ state: 'syncing' }))).toBe('Syncing...')
  })

  it('T2 an error status shows the error', () => {
    expect(statusText(status({ state: 'error', lastError: 'WoW installation not found at: X' }))).toBe(
      'Error: WoW installation not found at: X',
    )
  })

  it('T3 watching with a last sync and a stuck sentence appends the sentence in parentheses', () => {
    const sentence = describeRejected(2, 1)
    expect(statusText(status({ lastSync: '2026-10-13T12:00:00.000Z', lastError: sentence }))).toBe(
      `Last sync: 2026-10-13T12:00:00.000Z (${sentence})`,
    )
  })

  it('T4 watching with a last sync and no error', () => {
    expect(statusText(status({ lastSync: '2026-10-13T12:00:00.000Z' }))).toBe('Last sync: 2026-10-13T12:00:00.000Z')
  })

  it('T5 idle with nothing yet', () => {
    expect(statusText(status({ state: 'idle' }))).toBe('Not synced yet')
  })

  it('T6 an error message without a last sync still reads as not synced yet', () => {
    expect(statusText(status({ state: 'idle', lastError: 'something' }))).toBe('Not synced yet')
  })
})

// @vitest-environment node
// Runs in the root vitest suite. companion/tsconfig.json excludes
// __tests__, so the companion typecheck never needs vitest's types.
import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  CLEARED_LOG_FILE,
  MAX_PERMANENT_ATTEMPTS,
  STUCK_STORE_FILE,
  appendClearedLog,
  classifyRejection,
  emptyStore,
  isParked,
  parkedEntries,
  partitionPending,
  pruneStore,
  readStuckStore,
  recordOutcomes,
  stuckKey,
  writeStuckStore,
} from '../stuck-entries'
import type { StuckStoreData } from '../stuck-entries'
import { toPendingAttendancePairs, toPendingAwardPairs } from '../addon-format'
import type { SubmitOutcome } from '../api-client'

const NOW = '2026-10-16T12:00:00.000Z'
const AWARDED_AT = '2026-09-20T20:00:00Z'

const awardX = { wowheadId: 20928, characterName: 'Thrall', awardedAt: AWARDED_AT, awardId: 'id-x' }
const awardY = { wowheadId: 16921, characterName: 'Jaina', awardedAt: '2026-09-20T21:00:00Z' }
const awardZ = { wowheadId: 19019, characterName: 'Uther', awardedAt: '2026-09-20T22:00:00Z' }
const night = { raidDate: '2026-09-20', raidName: "Temple of Ahn'Qiraj", startTime: '2026-09-20T19:00:00Z', attended: ['Thrall'] }

const rejected = (status: number | null, error: string | null = null): SubmitOutcome => ({ status, error })
const accepted: SubmitOutcome = { status: 200, error: null }

/** A store with the award at the given attempts, built through recordOutcomes. */
function storeWith(entry: unknown, attempts: number): StuckStoreData {
  const data = emptyStore()
  const pairs = toPendingAwardPairs([entry])
  for (let i = 0; i < attempts; i++) recordOutcomes('award', pairs, [rejected(404, 'nope')], data, NOW)
  return data
}

describe('classifyRejection (GH #320 follow-up)', () => {
  // regression for #320
  it('B1 400, 404 and 422 are permanent; auth, timeouts, rate limits, 5xx and a thrown fetch are transient', () => {
    for (const status of [400, 404, 422]) expect(classifyRejection(status)).toBe('permanent')
    for (const status of [401, 403, 408, 429, 500, 502, 503, null]) expect(classifyRejection(status)).toBe('transient')
    expect(MAX_PERMANENT_ATTEMPTS).toBe(3)
  })
})

describe('recordOutcomes and isParked (GH #320 follow-up)', () => {
  it('B2 a permanent rejection creates a record and three of them park the entry', () => {
    const data = emptyStore()
    const pairs = toPendingAwardPairs([awardX])
    const key = stuckKey('award', awardX) as string
    expect(key).toBe('award:id:id-x')

    recordOutcomes('award', pairs, [rejected(404, 'No loot item found for wowhead_id 20928')], data, NOW)
    expect(data.entries[key]).toEqual({
      kind: 'award',
      attempts: 1,
      lastStatus: 404,
      lastError: 'No loot item found for wowhead_id 20928',
      lastAttemptAt: NOW,
    })

    recordOutcomes('award', pairs, [rejected(400, 'bad')], data, '2026-10-16T13:00:00.000Z')
    expect(data.entries[key].attempts).toBe(2)
    expect(data.entries[key].lastStatus).toBe(400)
    expect(data.entries[key].lastAttemptAt).toBe('2026-10-16T13:00:00.000Z')
    expect(isParked(data.entries[key])).toBe(false)

    recordOutcomes('award', pairs, [rejected(422, null)], data, NOW)
    expect(data.entries[key].attempts).toBe(3)
    expect(isParked(data.entries[key])).toBe(true)
    expect(isParked(undefined)).toBe(false)
  })

  it('B3 a transient rejection creates no record and leaves an existing count alone', () => {
    const data = emptyStore()
    const pairs = toPendingAwardPairs([awardX])
    recordOutcomes('award', pairs, [rejected(500, 'boom')], data, NOW)
    recordOutcomes('award', pairs, [rejected(null, 'network down')], data, NOW)
    expect(data.entries).toEqual({})

    const counted = storeWith(awardX, 2)
    recordOutcomes('award', pairs, [rejected(503)], counted, NOW)
    recordOutcomes('award', pairs, [rejected(401)], counted, NOW)
    recordOutcomes('award', pairs, [rejected(null)], counted, NOW)
    expect(counted.entries['award:id:id-x'].attempts).toBe(2)
  })

  it('B4 an accepted outcome deletes the record', () => {
    const data = storeWith(awardX, 2)
    const pairs = toPendingAwardPairs([awardX])
    recordOutcomes('award', pairs, [accepted], data, NOW)
    expect(data.entries).toEqual({})

    const repeat = storeWith(awardX, 3)
    recordOutcomes('award', pairs, [{ status: 200, error: null }], repeat, NOW)
    expect(repeat.entries).toEqual({})
  })
})

describe('partitionPending (GH #320 follow-up)', () => {
  // regression for #320
  it('B5 parks only entries at the limit, keeps order and identity, and never mixes kinds', () => {
    const data = storeWith(awardX, 3)
    const pairsY = toPendingAwardPairs([awardY])
    recordOutcomes('award', pairsY, [rejected(404)], data, NOW)

    const pairs = toPendingAwardPairs([awardX, awardY, awardZ])
    const { sendable, parked } = partitionPending('award', pairs, data)
    expect(sendable).toHaveLength(2)
    expect(sendable[0]).toBe(pairs[1])
    expect(sendable[1]).toBe(pairs[2])
    expect(parked).toHaveLength(1)
    expect(parked[0]).toBe(pairs[0])

    // An attendance entry built so its identity string equals awardY's
    // identity. Its parked record must not park the award.
    const lookalike = { raidDate: 'at:2026-09-20T21:00:00Z', raidName: '16921', startTime: 'jaina', attended: [] }
    const data2 = emptyStore()
    const nightPairs = toPendingAttendancePairs([lookalike])
    for (let i = 0; i < 3; i++) recordOutcomes('attendance', nightPairs, [rejected(400)], data2, NOW)
    expect(stuckKey('attendance', lookalike)).toBe('attendance:at:2026-09-20T21:00:00Z|16921|jaina')
    expect(stuckKey('award', awardY)).toBe('award:at:2026-09-20T21:00:00Z|16921|jaina')
    const awardsOnly = partitionPending('award', toPendingAwardPairs([awardY]), data2)
    expect(awardsOnly.parked).toEqual([])
    expect(awardsOnly.sendable).toHaveLength(1)
    const nightsOnly = partitionPending('attendance', nightPairs, data2)
    expect(nightsOnly.parked).toHaveLength(1)
  })
})

describe('pruneStore and parkedEntries (GH #320 follow-up)', () => {
  it('B6 pruneStore drops records whose entry is no longer pending and keeps the rest', () => {
    const data = storeWith(awardX, 1)
    recordOutcomes('award', toPendingAwardPairs([awardY]), [rejected(404)], data, NOW)
    recordOutcomes('attendance', toPendingAttendancePairs([night]), [rejected(400)], data, NOW)
    expect(Object.keys(data.entries)).toHaveLength(3)

    pruneStore(data, { awards: [awardY], attendance: [night] })
    expect(Object.keys(data.entries).sort()).toEqual([
      'attendance:2026-09-20|Temple of Ahn\'Qiraj|2026-09-20T19:00:00Z',
      'award:at:2026-09-20T21:00:00Z|16921|jaina',
    ])

    pruneStore(data, { awards: [], attendance: [] })
    expect(data.entries).toEqual({})
  })

  it('B7 parkedEntries returns the raw parked entries by reference, per kind', () => {
    const data = storeWith(awardX, 3)
    recordOutcomes('award', toPendingAwardPairs([awardY]), [rejected(404)], data, NOW)
    const nightPairs = toPendingAttendancePairs([night])
    for (let i = 0; i < 3; i++) recordOutcomes('attendance', nightPairs, [rejected(400)], data, NOW)

    const parked = parkedEntries(data, { awards: [awardX, awardY, awardZ, 'junk'], attendance: [night] })
    expect(parked.awards).toHaveLength(1)
    expect(parked.awards[0]).toBe(awardX)
    expect(parked.attendance).toHaveLength(1)
    expect(parked.attendance[0]).toBe(night)

    expect(parkedEntries(emptyStore(), { awards: [awardX], attendance: [night] })).toEqual({ awards: [], attendance: [] })
  })
})

describe('store files (GH #320 follow-up)', () => {
  let dir: string
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'llp-stuck-'))
  })
  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true })
  })

  it('B8 writeStuckStore then readStuckStore round-trips; anything unreadable or malformed reads as empty', () => {
    const file = path.join(dir, 'nested', STUCK_STORE_FILE)
    const data = storeWith(awardX, 2)
    writeStuckStore(file, data)
    expect(readStuckStore(file)).toEqual(data)
    expect(JSON.parse(fs.readFileSync(file, 'utf-8'))).toEqual(data)

    expect(readStuckStore(path.join(dir, 'missing.json'))).toEqual(emptyStore())

    fs.writeFileSync(file, '{ not json', 'utf-8')
    expect(readStuckStore(file)).toEqual(emptyStore())

    fs.writeFileSync(file, JSON.stringify({ ...data, version: 2 }), 'utf-8')
    expect(readStuckStore(file)).toEqual(emptyStore())

    fs.writeFileSync(file, JSON.stringify({ version: 1, entries: [] }), 'utf-8')
    expect(readStuckStore(file)).toEqual(emptyStore())

    const badAttempts = {
      version: 1,
      entries: { 'award:id:id-x': { kind: 'award', attempts: 'three', lastStatus: 404, lastError: null, lastAttemptAt: NOW } },
    }
    fs.writeFileSync(file, JSON.stringify(badAttempts), 'utf-8')
    expect(readStuckStore(file)).toEqual(emptyStore())

    expect(readStuckStore(null)).toEqual(emptyStore())
    expect(() => writeStuckStore(null, data)).not.toThrow()
    expect(fs.readdirSync(dir)).toEqual(['nested'])
  })

  it('B9 appendClearedLog writes one JSON line per entry and appends on a second call', () => {
    const file = path.join(dir, CLEARED_LOG_FILE)
    appendClearedLog(file, { awards: [awardX], attendance: [night] }, NOW)
    const first = fs.readFileSync(file, 'utf-8')
    expect(first.endsWith('\n')).toBe(true)
    const lines = first.trimEnd().split('\n').map(line => JSON.parse(line))
    expect(lines).toEqual([
      { clearedAt: NOW, kind: 'award', entry: awardX },
      { clearedAt: NOW, kind: 'attendance', entry: night },
    ])

    appendClearedLog(file, { awards: [awardY], attendance: [] }, '2026-10-16T13:00:00.000Z')
    const all = fs.readFileSync(file, 'utf-8').trimEnd().split('\n')
    expect(all).toHaveLength(3)
    expect(JSON.parse(all[2])).toEqual({ clearedAt: '2026-10-16T13:00:00.000Z', kind: 'award', entry: awardY })

    expect(() => appendClearedLog(null, { awards: [awardX], attendance: [] }, NOW)).not.toThrow()
    appendClearedLog(path.join(dir, 'empty.jsonl'), { awards: [], attendance: [] }, NOW)
    expect(fs.existsSync(path.join(dir, 'empty.jsonl'))).toBe(false)
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/utils/raid-events/team-routing', async () => {
  const actual = await vi.importActual<typeof import('@/utils/raid-events/team-routing')>(
    '@/utils/raid-events/team-routing',
  )
  return { ...actual, findAwardRaidEvent: vi.fn() }
})

import { findAwardRaidEvent } from '@/utils/raid-events/team-routing'
import {
  DEFAULT_RAID_TIME_ZONE,
  RAID_NIGHT_ROLLOVER_HOURS,
  findRaidNightForAward,
  guildRaidTimeZone,
  isUtcTimestamp,
  raidNightDate,
} from '../raid-night'

const mockFind = vi.mocked(findAwardRaidEvent)

describe('constants', () => {
  it('rolls over at 6 hours and defaults to America/New_York', () => {
    expect(RAID_NIGHT_ROLLOVER_HOURS).toBe(6)
    expect(DEFAULT_RAID_TIME_ZONE).toBe('America/New_York')
  })
})

describe('isUtcTimestamp', () => {
  it('accepts Z, fractional seconds and numeric offsets', () => {
    expect(isUtcTimestamp('2026-10-14T02:30:00Z')).toBe(true)
    expect(isUtcTimestamp('2026-10-14T02:30:00.000Z')).toBe(true)
    expect(isUtcTimestamp('2026-10-14T02:30Z')).toBe(true)
    expect(isUtcTimestamp('2026-10-14T02:30:00+02:00')).toBe(true)
    expect(isUtcTimestamp('  2026-10-14T02:30:00Z  ')).toBe(true)
  })

  it('rejects values without an explicit zone or that are not real times', () => {
    expect(isUtcTimestamp('2026-10-14T02:30:00')).toBe(false)
    expect(isUtcTimestamp('2026-10-14')).toBe(false)
    expect(isUtcTimestamp('yesterday')).toBe(false)
    expect(isUtcTimestamp(1758398400)).toBe(false)
    expect(isUtcTimestamp(undefined)).toBe(false)
    expect(isUtcTimestamp('2026-13-40T99:99:00Z')).toBe(false)
  })
})

describe('raidNightDate', () => {
  const NY = 'America/New_York'
  const cases: Array<[string, string | null | undefined, string, string]> = [
    ['2026-10-14T02:30:00Z', NY, '2026-10-13', '22:30 EDT, UTC date is the 14th'],
    ['2026-10-14T04:30:00Z', NY, '2026-10-13', '00:30 local, rollover'],
    ['2026-10-14T03:59:00Z', 'Europe/Berlin', '2026-10-13', '05:59 CEST'],
    ['2026-10-14T04:00:00Z', 'Europe/Berlin', '2026-10-14', '06:00 CEST'],
    ['2026-10-14T05:30:00Z', 'Europe/Berlin', '2026-10-14', '07:30 CEST'],
    ['2026-03-08T04:30:00Z', NY, '2026-03-07', '23:30 EST before the DST switch'],
    ['2026-03-08T09:59:00Z', NY, '2026-03-07', '05:59 EDT after the switch'],
    ['2026-03-08T10:00:00Z', NY, '2026-03-08', '06:00 EDT after the switch'],
    ['2027-01-01T05:00:00Z', NY, '2026-12-31', 'month and year roll back'],
    ['2026-10-14T07:00:00Z', null, '2026-10-13', 'null zone uses default'],
    ['2026-10-14T07:00:00Z', '', '2026-10-13', 'empty zone uses default'],
    ['2026-10-14T07:00:00Z', '  ', '2026-10-13', 'blank zone uses default'],
    ['2026-10-14T07:00:00Z', undefined, '2026-10-13', 'undefined zone uses default'],
    ['2026-10-14T07:00:00Z', 'Mars/Olympus', '2026-10-14', 'invalid name falls back to UTC'],
    ['2026-10-14T07:00:00Z', 'UTC', '2026-10-14', 'UTC'],
  ]

  it.each(cases)('%s in %s gives %s (%s)', (utcIso, zone, night) => {
    expect(raidNightDate(utcIso, zone)).toBe(night)
  })

  it.each([
    'yesterday',
    1758398400,
    undefined,
    '2026-10-14',
    '2026-10-14T02:30:00',
    '2026-13-40T99:99:00Z',
  ])('returns null for %s', value => {
    expect(raidNightDate(value, 'America/New_York')).toBeNull()
  })
})

interface GuildRow {
  data: unknown
  error: { message: string } | null
}

function guildFake(result: GuildRow) {
  const calls: { table: string; columns?: string; eq?: [string, unknown] } = { table: '' }
  const builder = {
    select: (columns: string) => {
      calls.columns = columns
      return builder
    },
    eq: (column: string, value: unknown) => {
      calls.eq = [column, value]
      return builder
    },
    maybeSingle: async () => result,
  }
  const client = {
    from: (table: string) => {
      calls.table = table
      return builder
    },
  }
  return { client: client as never, calls }
}

describe('guildRaidTimeZone', () => {
  it('returns the stored zone', async () => {
    const { client, calls } = guildFake({
      data: { active_expansion_id: 'x', expansions: { timezone: 'Europe/Berlin' } },
      error: null,
    })
    await expect(guildRaidTimeZone(client, 'g-1')).resolves.toBe('Europe/Berlin')
    expect(calls.table).toBe('guilds')
    expect(calls.columns).toContain('guilds_active_expansion_id_fkey')
    expect(calls.eq).toEqual(['id', 'g-1'])
  })

  it('trims the stored zone', async () => {
    const { client } = guildFake({ data: { expansions: { timezone: '  Europe/Berlin ' } }, error: null })
    await expect(guildRaidTimeZone(client, 'g-1')).resolves.toBe('Europe/Berlin')
  })

  it('accepts an array embed', async () => {
    const { client } = guildFake({ data: { expansions: [{ timezone: 'Asia/Tokyo' }] }, error: null })
    await expect(guildRaidTimeZone(client, 'g-1')).resolves.toBe('Asia/Tokyo')
  })

  it('defaults with no active expansion, no row or an empty zone', async () => {
    for (const data of [{ expansions: null }, null, { expansions: { timezone: '' } }, { expansions: { timezone: null } }]) {
      const { client } = guildFake({ data, error: null })
      await expect(guildRaidTimeZone(client, 'g-1')).resolves.toBe(DEFAULT_RAID_TIME_ZONE)
    }
  })

  it('rejects on a query error', async () => {
    const { client } = guildFake({ data: null, error: { message: 'boom' } })
    await expect(guildRaidTimeZone(client, 'g-1')).rejects.toThrow(
      'Failed to read the guild raid time zone: boom',
    )
  })
})

describe('findRaidNightForAward', () => {
  const supabase = {} as never

  beforeEach(() => {
    mockFind.mockReset()
  })

  it('with no zoned date does one lookup on the legacy date', async () => {
    mockFind.mockResolvedValueOnce({ raidEventId: 'ev-1', outcome: 'linked' })
    const result = await findRaidNightForAward(
      supabase, 'g-1', { zonedDate: null, legacyDate: '2026-10-14' }, 'c-1',
    )
    expect(mockFind).toHaveBeenCalledTimes(1)
    expect(mockFind).toHaveBeenCalledWith(supabase, 'g-1', '2026-10-14', 'c-1')
    expect(result).toEqual({ raidEventId: 'ev-1', outcome: 'linked', date: '2026-10-14' })
  })

  it('with no zoned date and an unusable legacy date gives date null', async () => {
    mockFind.mockResolvedValueOnce({ raidEventId: null, outcome: 'no_date' })
    const result = await findRaidNightForAward(
      supabase, 'g-1', { zonedDate: null, legacyDate: undefined }, null,
    )
    expect(result).toEqual({ raidEventId: null, outcome: 'no_date', date: null })
  })

  it('returns the zoned night when it links', async () => {
    mockFind.mockResolvedValueOnce({ raidEventId: 'ev-1013', outcome: 'linked' })
    const result = await findRaidNightForAward(
      supabase, 'g-1', { zonedDate: '2026-10-13', legacyDate: '2026-10-14' }, 'c-1',
    )
    expect(mockFind).toHaveBeenCalledTimes(1)
    expect(mockFind).toHaveBeenCalledWith(supabase, 'g-1', '2026-10-13', 'c-1')
    expect(result).toEqual({ raidEventId: 'ev-1013', outcome: 'linked', date: '2026-10-13' })
  })

  it('returns an ambiguous zoned night without a legacy lookup', async () => {
    mockFind.mockResolvedValueOnce({ raidEventId: null, outcome: 'ambiguous' })
    const result = await findRaidNightForAward(
      supabase, 'g-1', { zonedDate: '2026-10-13', legacyDate: '2026-10-14' }, 'c-1',
    )
    expect(mockFind).toHaveBeenCalledTimes(1)
    expect(result).toEqual({ raidEventId: null, outcome: 'ambiguous', date: '2026-10-13' })
  })

  it('does not look up a legacy date equal to the zoned date', async () => {
    mockFind.mockResolvedValueOnce({ raidEventId: null, outcome: 'no_raid_night' })
    const result = await findRaidNightForAward(
      supabase, 'g-1', { zonedDate: '2026-10-14', legacyDate: '2026-10-14T02:00:00Z' }, 'c-1',
    )
    expect(mockFind).toHaveBeenCalledTimes(1)
    expect(result).toEqual({ raidEventId: null, outcome: 'no_raid_night', date: '2026-10-14' })
  })

  it('does not look up an unusable legacy date', async () => {
    mockFind.mockResolvedValueOnce({ raidEventId: null, outcome: 'no_raid_night' })
    const result = await findRaidNightForAward(
      supabase, 'g-1', { zonedDate: '2026-10-13', legacyDate: 'nonsense' }, 'c-1',
    )
    expect(mockFind).toHaveBeenCalledTimes(1)
    expect(result.date).toBe('2026-10-13')
  })

  it('falls back to the legacy night when it links', async () => {
    mockFind
      .mockResolvedValueOnce({ raidEventId: null, outcome: 'no_raid_night' })
      .mockResolvedValueOnce({ raidEventId: 'ev-1014', outcome: 'linked' })
    const result = await findRaidNightForAward(
      supabase, 'g-1', { zonedDate: '2026-10-13', legacyDate: '2026-10-14' }, 'c-1',
    )
    expect(mockFind).toHaveBeenCalledTimes(2)
    expect(mockFind).toHaveBeenNthCalledWith(1, supabase, 'g-1', '2026-10-13', 'c-1')
    expect(mockFind).toHaveBeenNthCalledWith(2, supabase, 'g-1', '2026-10-14', 'c-1')
    expect(result).toEqual({ raidEventId: 'ev-1014', outcome: 'linked', date: '2026-10-14' })
  })

  it('keeps the zoned result when the legacy night does not link', async () => {
    mockFind
      .mockResolvedValueOnce({ raidEventId: null, outcome: 'no_raid_night' })
      .mockResolvedValueOnce({ raidEventId: null, outcome: 'ambiguous' })
    const result = await findRaidNightForAward(
      supabase, 'g-1', { zonedDate: '2026-10-13', legacyDate: '2026-10-14' }, 'c-1',
    )
    expect(mockFind).toHaveBeenCalledTimes(2)
    expect(result).toEqual({ raidEventId: null, outcome: 'no_raid_night', date: '2026-10-13' })
  })
})

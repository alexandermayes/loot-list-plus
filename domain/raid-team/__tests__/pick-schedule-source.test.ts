import { describe, it, expect } from 'vitest'
import { pickScheduleSource } from '../pick-schedule-source'
import { resolveRaidDays } from '../settings'

describe('pickScheduleSource', () => {
  it('returns the expansion row when its raid_days_per_week is set, even over a fully populated guild_settings row', () => {
    const expansion = {
      raid_days_per_week: 2,
      first_raid_day: 2,
      second_raid_day: 4,
      third_raid_day: null,
      fourth_raid_day: null,
      fifth_raid_day: null,
    }
    const guildSettings = {
      raid_days_per_week: 3,
      first_raid_day: 1,
      second_raid_day: 3,
      third_raid_day: 5,
      fourth_raid_day: null,
      fifth_raid_day: null,
    }
    expect(pickScheduleSource(expansion, guildSettings)).toEqual(expansion)
  })

  it('GH-267 regression: an expansion configured Tue/Thu beats a guild_settings row configured Tue/Mon', () => {
    const expansion = {
      raid_days_per_week: 2,
      first_raid_day: 2, // Tuesday
      second_raid_day: 4, // Thursday
      third_raid_day: null,
      fourth_raid_day: null,
      fifth_raid_day: null,
    }
    const guildSettings = {
      raid_days_per_week: 2,
      first_raid_day: 2, // Tuesday
      second_raid_day: 1, // Monday
      third_raid_day: null,
      fourth_raid_day: null,
      fifth_raid_day: null,
    }
    const result = pickScheduleSource(expansion, guildSettings)
    expect(result).not.toBeNull()
    expect(resolveRaidDays(result!, null)).toEqual([2, 4])
  })

  it('falls back to guild_settings when the expansion row exists but its raid_days_per_week is null', () => {
    const expansion = {
      raid_days_per_week: null,
      first_raid_day: null,
      second_raid_day: null,
      third_raid_day: null,
      fourth_raid_day: null,
      fifth_raid_day: null,
    }
    const guildSettings = {
      raid_days_per_week: 2,
      first_raid_day: 2,
      second_raid_day: 1,
      third_raid_day: null,
      fourth_raid_day: null,
      fifth_raid_day: null,
    }
    expect(pickScheduleSource(expansion, guildSettings)).toEqual(guildSettings)
  })

  it('falls back to guild_settings when the expansion row is null (absent)', () => {
    const guildSettings = {
      raid_days_per_week: 2,
      first_raid_day: 2,
      second_raid_day: 1,
      third_raid_day: null,
      fourth_raid_day: null,
      fifth_raid_day: null,
    }
    expect(pickScheduleSource(null, guildSettings)).toEqual(guildSettings)
  })

  it('returns null when both rows are null', () => {
    expect(pickScheduleSource(null, null)).toBeNull()
  })

  it('produces a result that resolves to an empty day array when guild_settings itself has raid_days_per_week null, matching an unconfigured guild', () => {
    const guildSettings = {
      raid_days_per_week: null,
      first_raid_day: null,
      second_raid_day: null,
      third_raid_day: null,
      fourth_raid_day: null,
      fifth_raid_day: null,
    }
    const result = pickScheduleSource(null, guildSettings)
    expect(result).not.toBeNull()
    expect(resolveRaidDays(result!, null)).toEqual([])
  })

  it('exposes only the six schedule fields, dropping extra columns present on a real row', () => {
    const expansion = {
      id: 'exp-1',
      guild_id: 'guild-1',
      current_phase: 3,
      timezone: 'America/New_York',
      raid_days_per_week: 2,
      first_raid_day: 2,
      second_raid_day: 4,
      third_raid_day: null,
      fourth_raid_day: null,
      fifth_raid_day: null,
    }
    const result = pickScheduleSource(expansion, null)
    expect(result).toEqual({
      raid_days_per_week: 2,
      first_raid_day: 2,
      second_raid_day: 4,
      third_raid_day: null,
      fourth_raid_day: null,
      fifth_raid_day: null,
    })
    expect(result).not.toHaveProperty('id')
    expect(result).not.toHaveProperty('guild_id')
    expect(result).not.toHaveProperty('current_phase')
    expect(result).not.toHaveProperty('timezone')
  })
})

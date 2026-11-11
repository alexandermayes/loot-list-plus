import { describe, expect, it } from 'vitest'
import {
  LOOT_STYLE_IDS,
  LOOT_STYLE_KNOB_KEYS,
  LOOT_STYLE_PRESETS,
  applyLootStyle,
  isLootStyleId,
  lootStyleStatus,
  presetDiff,
  presetMatches,
} from '@/domain/guild/loot-style-presets'

const EXPECTED_KNOB_KEYS = [
  'attendance_type',
  'rolling_attendance_weeks',
  'use_signups',
  'signup_weight',
  'max_attendance_bonus',
  'max_attendance_threshold',
  'middle_attendance_bonus',
  'middle_attendance_threshold',
  'bottom_attendance_bonus',
  'bottom_attendance_threshold',
  'blp_enabled',
  'blp_increment',
  'blp_maximum',
  'guild_rank_bonuses_enabled',
  'raid_roles_overall_bonus_priority',
  'single_raider_overall_bonus',
  'role_bonus_priority_single_item',
  'class_bonus_priority_single_item',
  'single_raider_bonus_single_item',
  'enforce_slot_restrictions',
]

// Keys a preset must never touch, so picking one cannot flip an unrelated rule (T-04-06-02).
const UNRELATED_SETTINGS = {
  award_slot_lock_enabled: true,
  decimal_places: 3,
  loot_style: null,
}

describe('LOOT_STYLE_IDS and isLootStyleId', () => {
  it('lists the three ids in picker order', () => {
    expect([...LOOT_STYLE_IDS]).toEqual(['reward_attendance', 'even_rotation', 'officers_decide'])
  })

  it('accepts a known id and rejects everything else', () => {
    expect(isLootStyleId('even_rotation')).toBe(true)
    expect(isLootStyleId('council')).toBe(false)
    expect(isLootStyleId(null)).toBe(false)
    expect(isLootStyleId(undefined)).toBe(false)
    expect(isLootStyleId(3)).toBe(false)
    // Prototype names must not answer from an object lookup (T-04-06-01).
    expect(isLootStyleId('__proto__')).toBe(false)
    expect(isLootStyleId('constructor')).toBe(false)
  })
})

describe('LOOT_STYLE_PRESETS', () => {
  it('sets exactly the 20 scoring knobs and nothing else', () => {
    expect([...LOOT_STYLE_KNOB_KEYS]).toEqual(EXPECTED_KNOB_KEYS)
    for (const id of LOOT_STYLE_IDS) {
      expect(Object.keys(LOOT_STYLE_PRESETS[id].knobs).sort()).toEqual([...EXPECTED_KNOB_KEYS].sort())
    }
  })

  it('never carries a setting outside the scoring knobs', () => {
    for (const id of LOOT_STYLE_IDS) {
      const keys = Object.keys(LOOT_STYLE_PRESETS[id].knobs)
      expect(keys).not.toContain('award_slot_lock_enabled')
      expect(keys).not.toContain('loot_style')
    }
  })

  it('is frozen all the way down so a caller cannot edit a preset', () => {
    expect(Object.isFrozen(LOOT_STYLE_PRESETS)).toBe(true)
    for (const id of LOOT_STYLE_IDS) {
      expect(Object.isFrozen(LOOT_STYLE_PRESETS[id])).toBe(true)
      expect(Object.isFrozen(LOOT_STYLE_PRESETS[id].knobs)).toBe(true)
      expect(Object.isFrozen(LOOT_STYLE_PRESETS[id].summary)).toBe(true)
    }
  })

  it('carries the draft names, each with its id', () => {
    expect(LOOT_STYLE_PRESETS.reward_attendance.name).toBe('Reward attendance')
    expect(LOOT_STYLE_PRESETS.even_rotation.name).toBe('Even rotation')
    expect(LOOT_STYLE_PRESETS.officers_decide.name).toBe('Officers decide, score advises')
    for (const id of LOOT_STYLE_IDS) expect(LOOT_STYLE_PRESETS[id].id).toBe(id)
  })

  it('keeps every line and summary free of em dashes and within six summary lines', () => {
    for (const id of LOOT_STYLE_IDS) {
      const preset = LOOT_STYLE_PRESETS[id]
      expect(preset.summary.length).toBeGreaterThan(0)
      expect(preset.summary.length).toBeLessThanOrEqual(6)
      for (const text of [preset.name, preset.line, ...preset.summary]) {
        expect(text).not.toContain('—')
      }
    }
  })

  it('has every preset set the three single-item flags (D-17 amended)', () => {
    expect(LOOT_STYLE_PRESETS.reward_attendance.knobs.role_bonus_priority_single_item).toBe(false)
    expect(LOOT_STYLE_PRESETS.officers_decide.knobs.role_bonus_priority_single_item).toBe(true)
    expect(LOOT_STYLE_PRESETS.officers_decide.knobs.class_bonus_priority_single_item).toBe(true)
    expect(LOOT_STYLE_PRESETS.officers_decide.knobs.single_raider_bonus_single_item).toBe(true)
  })

  it('makes reward_attendance equal to what a new guild gets today (UI-10)', () => {
    expect(LOOT_STYLE_PRESETS.reward_attendance.knobs).toEqual({
      attendance_type: 'linear',
      rolling_attendance_weeks: 8,
      use_signups: false,
      signup_weight: 0,
      max_attendance_bonus: 4,
      max_attendance_threshold: 0.9,
      middle_attendance_bonus: 2,
      middle_attendance_threshold: 0.5,
      bottom_attendance_bonus: 1,
      bottom_attendance_threshold: 0.25,
      blp_enabled: false,
      blp_increment: 1,
      blp_maximum: 5,
      guild_rank_bonuses_enabled: false,
      raid_roles_overall_bonus_priority: false,
      single_raider_overall_bonus: false,
      role_bonus_priority_single_item: false,
      class_bonus_priority_single_item: false,
      single_raider_bonus_single_item: false,
      enforce_slot_restrictions: false,
    })
  })
})

describe('applyLootStyle', () => {
  it('returns a new object with the 20 knobs set and loot_style recorded', () => {
    const before = { ...UNRELATED_SETTINGS, attendance_type: 'breakpoint', blp_enabled: false }
    const after = applyLootStyle(before, 'even_rotation')

    expect(after).not.toBe(before)
    expect(after.loot_style).toBe('even_rotation')
    expect(after.blp_enabled).toBe(true)
    expect(after.max_attendance_bonus).toBe(2)
    expect(after.attendance_type).toBe('linear')
    expect(before.attendance_type).toBe('breakpoint')
    expect(before.loot_style).toBeNull()
  })

  it('leaves keys outside the preset untouched', () => {
    const after = applyLootStyle({ ...UNRELATED_SETTINGS }, 'officers_decide')
    expect(after.award_slot_lock_enabled).toBe(true)
    expect(after.decimal_places).toBe(3)
  })
})

describe('lootStyleStatus after applyLootStyle', () => {
  it.each(LOOT_STYLE_IDS)('reads %s back as a matching, uncustomised preset', (id) => {
    const settings = applyLootStyle({ ...UNRELATED_SETTINGS }, id)
    expect(lootStyleStatus(settings)).toEqual({ kind: 'preset', id, customised: false })
  })
})

// PostgREST returns numeric(3,2) and numeric(5,2) columns as strings.
const REWARD_AS_POSTGREST = {
  ...LOOT_STYLE_PRESETS.reward_attendance.knobs,
  signup_weight: '0.00',
  max_attendance_bonus: '4.00',
  max_attendance_threshold: '0.90',
  middle_attendance_bonus: '2.00',
  middle_attendance_threshold: '0.50',
  bottom_attendance_bonus: '1.00',
  bottom_attendance_threshold: '0.25',
  blp_increment: '1.00',
  blp_maximum: '5.00',
}

describe('presetMatches', () => {
  it('matches numeric strings from PostgREST against the numbers in the preset', () => {
    expect(presetMatches(REWARD_AS_POSTGREST, 'reward_attendance')).toBe(true)
    expect(presetMatches({ ...REWARD_AS_POSTGREST, bottom_attendance_threshold: '0.25' }, 'reward_attendance')).toBe(true)
  })

  it('does not match when a numeric string differs in value', () => {
    expect(presetMatches({ ...REWARD_AS_POSTGREST, max_attendance_bonus: '4.50' }, 'reward_attendance')).toBe(false)
  })

  it('does not treat a non-numeric string as a number', () => {
    expect(presetMatches({ ...REWARD_AS_POSTGREST, blp_maximum: 'five' }, 'reward_attendance')).toBe(false)
    expect(presetMatches({ ...REWARD_AS_POSTGREST, blp_maximum: '' }, 'reward_attendance')).toBe(false)
    expect(presetMatches({ ...REWARD_AS_POSTGREST, blp_maximum: null }, 'reward_attendance')).toBe(false)
  })

  it('compares booleans and strings exactly', () => {
    expect(presetMatches({ ...REWARD_AS_POSTGREST, blp_enabled: 'false' }, 'reward_attendance')).toBe(false)
    expect(presetMatches({ ...REWARD_AS_POSTGREST, attendance_type: 'breakpoint' }, 'reward_attendance')).toBe(false)
    expect(presetMatches({ ...REWARD_AS_POSTGREST, use_signups: 0 }, 'reward_attendance')).toBe(false)
  })

  it('counts a missing knob as different', () => {
    const { blp_maximum: _omitted, ...withoutKnob } = REWARD_AS_POSTGREST
    expect(presetMatches(withoutKnob, 'reward_attendance')).toBe(false)
    expect(presetDiff(withoutKnob, 'reward_attendance')).toEqual(['blp_maximum'])
  })

  it('ignores settings outside the knobs', () => {
    expect(presetMatches({ ...REWARD_AS_POSTGREST, ...UNRELATED_SETTINGS }, 'reward_attendance')).toBe(true)
  })
})

describe('presetDiff', () => {
  it('is empty when every knob already matches', () => {
    expect(presetDiff(REWARD_AS_POSTGREST, 'reward_attendance')).toEqual([])
  })

  it('lists the attendance bonuses and the six bonus flags and nothing else for officers_decide', () => {
    expect(presetDiff({ ...LOOT_STYLE_PRESETS.reward_attendance.knobs }, 'officers_decide')).toEqual([
      'max_attendance_bonus',
      'middle_attendance_bonus',
      'bottom_attendance_bonus',
      'guild_rank_bonuses_enabled',
      'raid_roles_overall_bonus_priority',
      'single_raider_overall_bonus',
      'role_bonus_priority_single_item',
      'class_bonus_priority_single_item',
      'single_raider_bonus_single_item',
    ])
  })

  it('has a length that is the count the confirm shows', () => {
    expect(presetDiff({ ...LOOT_STYLE_PRESETS.reward_attendance.knobs }, 'even_rotation')).toHaveLength(4)
  })

  it('returns a key only when the numeric value really differs', () => {
    const settings = { ...REWARD_AS_POSTGREST, blp_maximum: '6.00', rolling_attendance_weeks: 4 }
    expect(presetDiff(settings, 'reward_attendance')).toEqual(['rolling_attendance_weeks', 'blp_maximum'])
  })
})

describe('lootStyleStatus', () => {
  it('is custom for a null loot_style', () => {
    expect(lootStyleStatus({ loot_style: null, ...REWARD_AS_POSTGREST })).toEqual({ kind: 'custom' })
  })

  it('is custom for a missing loot_style', () => {
    expect(lootStyleStatus({ ...REWARD_AS_POSTGREST })).toEqual({ kind: 'custom' })
  })

  it('is custom for an unknown or prototype loot_style', () => {
    expect(lootStyleStatus({ loot_style: 'council', ...REWARD_AS_POSTGREST })).toEqual({ kind: 'custom' })
    expect(lootStyleStatus({ loot_style: '__proto__', ...REWARD_AS_POSTGREST })).toEqual({ kind: 'custom' })
  })

  it('is an uncustomised preset when PostgREST strings match the map', () => {
    expect(lootStyleStatus({ loot_style: 'reward_attendance', ...REWARD_AS_POSTGREST })).toEqual({
      kind: 'preset',
      id: 'reward_attendance',
      customised: false,
    })
  })

  it('is customised when any knob differs, keeping the choice', () => {
    const even = LOOT_STYLE_PRESETS.even_rotation.knobs
    expect(lootStyleStatus({ loot_style: 'even_rotation', ...even, blp_maximum: 6 })).toEqual({
      kind: 'preset',
      id: 'even_rotation',
      customised: true,
    })
  })
})

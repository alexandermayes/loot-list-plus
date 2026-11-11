import { describe, expect, it } from 'vitest'
import {
  LOOT_STYLE_IDS,
  LOOT_STYLE_KNOB_KEYS,
  LOOT_STYLE_PRESETS,
  applyLootStyle,
  isLootStyleId,
  lootStyleStatus,
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

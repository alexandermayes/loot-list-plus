/**
 * Loot style presets (D-17, D-18).
 *
 * One source for the three preset knob maps, so the settings modal, the guild
 * creation step and the guild-settings routes all apply and read back the same
 * values. "Customised" is computed by comparing live knobs to a preset map and
 * is never stored (D-18).
 *
 * Pure and client-safe: no I/O. No key is added to DEFAULT_SETTINGS,
 * ScoringConfig or withDefaults, so the Lua exporter output cannot change.
 *
 * DRAFT: the names, lines, summaries and knob values are proposals. The owner
 * signs them with the rest of the copy at the 04-19 sign-off, and changing a
 * value later is a code edit, not a migration.
 */

export const LOOT_STYLE_IDS = ['reward_attendance', 'even_rotation', 'officers_decide'] as const

export type LootStyleId = (typeof LOOT_STYLE_IDS)[number]

// An includes check on the tuple, never an object lookup with the input, so
// '__proto__' and 'constructor' cannot pass as ids (T-04-06-01).
export function isLootStyleId(value: unknown): value is LootStyleId {
  return typeof value === 'string' && (LOOT_STYLE_IDS as readonly string[]).includes(value)
}

/**
 * The scoring knobs a preset sets, and only these. Settings outside this list
 * (the award slot lock, loot_style, decimal places and so on) are never part
 * of a preset, so picking one cannot flip an unrelated guild rule (T-04-06-02).
 */
export const LOOT_STYLE_KNOB_KEYS = [
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
  // "Pass and see item bonuses" (D-17 amended) are these three single-item flags.
  'role_bonus_priority_single_item',
  'class_bonus_priority_single_item',
  'single_raider_bonus_single_item',
  'enforce_slot_restrictions',
] as const

export type LootStyleKnobKey = (typeof LOOT_STYLE_KNOB_KEYS)[number]

// A type alias, not an interface: aliases get an implicit index signature, so an
// applied settings object can go straight to lootStyleStatus.
export type LootStyleKnobs = {
  attendance_type: 'linear' | 'breakpoint' | 'points-per-raid'
  rolling_attendance_weeks: number
  use_signups: boolean
  signup_weight: number
  max_attendance_bonus: number
  max_attendance_threshold: number
  middle_attendance_bonus: number
  middle_attendance_threshold: number
  bottom_attendance_bonus: number
  bottom_attendance_threshold: number
  blp_enabled: boolean
  blp_increment: number
  blp_maximum: number
  guild_rank_bonuses_enabled: boolean
  raid_roles_overall_bonus_priority: boolean
  single_raider_overall_bonus: boolean
  role_bonus_priority_single_item: boolean
  class_bonus_priority_single_item: boolean
  single_raider_bonus_single_item: boolean
  enforce_slot_restrictions: boolean
}

export interface LootStylePreset {
  id: LootStyleId
  name: string
  line: string
  knobs: Readonly<LootStyleKnobs>
  /** Up to six plain lines for the creation step's "What this sets" list. */
  summary: readonly string[]
}

// The attendance tiers (4, 2, 1 at 0.9, 0.5, 0.25) and bad luck protection
// (off, increment 1, maximum 5) are today's column defaults. The six bonus
// flags are false here, not the column default (true), because the Loot system
// settings modal opens with them off and with no modifiers configured they have
// no effect on a new guild's scores (research A8).
const REWARD_ATTENDANCE: LootStyleKnobs = {
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
}

// Smaller attendance bonuses and bad luck protection on, so missing out is what
// moves a raider up.
const EVEN_ROTATION: LootStyleKnobs = {
  ...REWARD_ATTENDANCE,
  max_attendance_bonus: 2,
  middle_attendance_bonus: 1,
  bottom_attendance_bonus: 0.5,
  blp_enabled: true,
}

// Same small attendance bonuses and no bad luck protection; officer bonuses on
// so officers can steer the score, which only advises.
const OFFICERS_DECIDE: LootStyleKnobs = {
  ...REWARD_ATTENDANCE,
  max_attendance_bonus: 2,
  middle_attendance_bonus: 1,
  bottom_attendance_bonus: 0.5,
  guild_rank_bonuses_enabled: true,
  raid_roles_overall_bonus_priority: true,
  single_raider_overall_bonus: true,
  role_bonus_priority_single_item: true,
  class_bonus_priority_single_item: true,
  single_raider_bonus_single_item: true,
}

function definePreset(preset: LootStylePreset): LootStylePreset {
  return Object.freeze({
    ...preset,
    knobs: Object.freeze({ ...preset.knobs }),
    summary: Object.freeze([...preset.summary]),
  })
}

export const LOOT_STYLE_PRESETS: Readonly<Record<LootStyleId, LootStylePreset>> = Object.freeze({
  reward_attendance: definePreset({
    id: 'reward_attendance',
    name: 'Reward attendance',
    line: 'Raiders who show up most get first pick.',
    knobs: REWARD_ATTENDANCE,
    summary: [
      'Attendance: up to 4 points',
      'Attendance counts the last 8 weeks',
      'Bad luck protection: off',
      'Officer bonuses: off',
    ],
  }),
  even_rotation: definePreset({
    id: 'even_rotation',
    name: 'Even rotation',
    line: 'Everyone gets a turn. Missing out raises your priority fast.',
    knobs: EVEN_ROTATION,
    summary: [
      'Attendance: up to 2 points',
      'Attendance counts the last 8 weeks',
      'Bad luck protection: on',
      'Officer bonuses: off',
    ],
  }),
  officers_decide: definePreset({
    id: 'officers_decide',
    name: 'Officers decide, score advises',
    line: 'Officers make every call. The score is a guide, not a rule.',
    knobs: OFFICERS_DECIDE,
    summary: [
      'Attendance: up to 2 points',
      'Attendance counts the last 8 weeks',
      'Bad luck protection: off',
      'Officer bonuses: on',
    ],
  }),
})

/** The settings after a preset: the caller's other keys, the 20 knobs, and the choice. */
export type LootStyleApplied<T> = Omit<T, LootStyleKnobKey | 'loot_style'> &
  LootStyleKnobs & { loot_style: LootStyleId }

/**
 * A copy of the settings with the preset's knobs written over it and the choice
 * recorded in loot_style. Every other key is left as it was. The knob keys are
 * omitted from T first so a settings type that carries loot_style: null (or a
 * wider knob type) does not intersect down to never.
 */
export function applyLootStyle<T extends Record<string, unknown>>(
  settings: T,
  id: LootStyleId,
): LootStyleApplied<T> {
  return { ...settings, ...LOOT_STYLE_PRESETS[id].knobs, loot_style: id }
}

// PostgREST returns numeric(3,2) and numeric(5,2) columns as strings ('0.25',
// '4.00'), so numbers compare through Number(). An empty or non-numeric string
// becomes NaN, which never equals a preset number; Number('') would otherwise
// read as 0 and match a zero knob.
function knobEquals(actual: unknown, expected: unknown): boolean {
  if (typeof expected === 'number') {
    if (typeof actual === 'number') return actual === expected
    if (typeof actual !== 'string' || actual.trim() === '') return false
    const parsed = Number(actual)
    return !Number.isNaN(parsed) && parsed === expected
  }
  return Object.is(actual, expected)
}

/**
 * The knob keys whose value would change if the preset were applied. Its length
 * is the {n} in the "Replace your settings?" confirm; a missing knob counts.
 */
export function presetDiff(settings: Record<string, unknown>, id: LootStyleId): LootStyleKnobKey[] {
  const knobs: Record<string, unknown> = { ...LOOT_STYLE_PRESETS[id].knobs }
  return LOOT_STYLE_KNOB_KEYS.filter((key) => !knobEquals(settings[key], knobs[key]))
}

/** True when every knob in the settings equals the preset's value. */
export function presetMatches(settings: Record<string, unknown>, id: LootStyleId): boolean {
  return presetDiff(settings, id).length === 0
}

export type LootStyleStatus =
  | { kind: 'custom' }
  | { kind: 'preset'; id: LootStyleId; customised: boolean }

/**
 * What the picker shows for a settings row: Custom when no preset was chosen
 * (or the stored id is unknown), else the preset and whether its knobs still
 * match. Customised is computed here, never stored (D-18).
 */
export function lootStyleStatus(
  settings: { loot_style?: unknown } & Record<string, unknown>,
): LootStyleStatus {
  const id = settings.loot_style
  if (!isLootStyleId(id)) return { kind: 'custom' }
  return { kind: 'preset', id, customised: !presetMatches(settings, id) }
}

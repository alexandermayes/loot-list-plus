/**
 * The question logic behind the Discovery need picker (D-16).
 *
 * A need is a slot, an optional armour class and a stat family. The flow asks
 * for them one question at a time and skips every question that has only one
 * possible answer, so a raider answers at most three questions and often one.
 * The same rules serve the raid picker, which passes the eligible needs of a
 * character, and the Phase 5 Drop Desk, which passes null to classify any drop
 * against the whole taxonomy.
 *
 * Everything offered comes from the eligible list, so eligibility cannot fail
 * inside the flow (D-10). The taxonomy has no weapon type and no "lighter
 * armour is fine" key, so neither can be asked (UI-03).
 *
 * Pure and client-safe: no server code, no I/O.
 */
import { costForSlot } from '@/domain/loot/need-budget'
import {
  NEED_DEFINITIONS,
  type NeedArmourKey,
  type NeedDefinition,
  type NeedSlotKey,
  type NeedStatKey,
} from '@/domain/loot/needs'

export type NeedQuestion = 'slot' | 'armour' | 'stat'

/** The answers so far; null means not decided yet. */
export interface NeedFlowValue {
  slot: NeedSlotKey | null
  armour: NeedArmourKey | null
  stat: NeedStatKey | null
}

export const EMPTY_NEED_FLOW_VALUE: NeedFlowValue = Object.freeze({ slot: null, armour: null, stat: null })

export type NeedOptionKey = NeedSlotKey | NeedArmourKey | NeedStatKey

export interface NeedOption {
  question: NeedQuestion
  key: NeedOptionKey
  label: string
}

export interface NeedOptionGroup {
  /** Group heading for slots; null for the armour and stat questions. */
  label: string | null
  options: readonly NeedOption[]
}

// DRAFT copy for the 04-19 sign-off. Slot, armour and stat words are the
// taxonomy's own; a test keeps them equal to the names in NEED_DEFINITIONS.
export const NEED_SLOT_LABELS: Readonly<Record<NeedSlotKey, string>> = Object.freeze({
  'two-hand-weapon': 'Two-hand weapon',
  'main-hand-weapon': 'Main hand weapon',
  'off-hand-weapon': 'Off-hand weapon',
  'ranged-weapon': 'Ranged weapon',
  trinket: 'Trinket',
  ring: 'Ring',
  neck: 'Neck',
  back: 'Back',
  shield: 'Shield',
  'off-hand-item': 'Off-hand item',
  relic: 'Relic',
  head: 'Head',
  shoulders: 'Shoulders',
  chest: 'Chest',
  wrist: 'Wrist',
  hands: 'Hands',
  waist: 'Waist',
  legs: 'Legs',
  feet: 'Feet',
})

export const NEED_ARMOUR_LABELS: Readonly<Record<NeedArmourKey, string>> = Object.freeze({
  cloth: 'Cloth',
  leather: 'Leather',
  mail: 'Mail',
  plate: 'Plate',
})

export const NEED_STAT_LABELS: Readonly<Record<NeedStatKey, string>> = Object.freeze({
  strength: 'Strength',
  agility: 'Agility',
  tank: 'Tank',
  'spell-damage': 'Spell damage',
  healing: 'Healing',
  physical: 'Physical',
})

export interface NeedSlotGroup {
  label: string
  slots: readonly NeedSlotKey[]
}

export const NEED_SLOT_GROUPS: readonly NeedSlotGroup[] = Object.freeze([
  {
    label: 'Weapons',
    slots: Object.freeze<NeedSlotKey[]>([
      'two-hand-weapon',
      'main-hand-weapon',
      'off-hand-weapon',
      'ranged-weapon',
      'shield',
      'off-hand-item',
      'relic',
    ]),
  },
  {
    label: 'Armour',
    slots: Object.freeze<NeedSlotKey[]>(['head', 'shoulders', 'chest', 'wrist', 'hands', 'waist', 'legs', 'feet']),
  },
  {
    label: 'Accessories',
    slots: Object.freeze<NeedSlotKey[]>(['neck', 'ring', 'back', 'trinket']),
  },
])

const QUESTION_ORDER: readonly NeedQuestion[] = ['slot', 'armour', 'stat']
const ARMOUR_ORDER: readonly NeedArmourKey[] = ['cloth', 'leather', 'mail', 'plate']
const STAT_ORDER: readonly NeedStatKey[] = ['strength', 'agility', 'tank', 'spell-damage', 'healing', 'physical']

const COST_WORD: Readonly<Record<1 | 2 | 3, string>> = Object.freeze({ 3: 'Big', 2: 'Medium', 1: 'Standard' })

/** Big, Medium or Standard: the word that tells costs apart (never colour alone). */
export function needCostWord(slot: NeedSlotKey): string {
  return COST_WORD[costForSlot(slot)]
}

function pool(eligibility: readonly NeedDefinition[] | null): readonly NeedDefinition[] {
  return eligibility ?? NEED_DEFINITIONS
}

function armourOptionKeys(
  slot: NeedSlotKey | null,
  eligibility: readonly NeedDefinition[] | null,
): NeedArmourKey[] {
  if (slot === null) return []
  const offered = new Set<NeedArmourKey>()
  for (const definition of pool(eligibility)) {
    if (definition.slot === slot && definition.armour !== null) offered.add(definition.armour)
  }
  return ARMOUR_ORDER.filter((armour) => offered.has(armour))
}

function statOptionKeys(
  value: NeedFlowValue,
  eligibility: readonly NeedDefinition[] | null,
): NeedStatKey[] {
  if (value.slot === null) return []
  const offered = new Set<NeedStatKey>()
  for (const definition of pool(eligibility)) {
    if (definition.slot !== value.slot) continue
    if (value.armour !== null && definition.armour !== value.armour) continue
    offered.add(definition.stat)
  }
  return STAT_ORDER.filter((stat) => offered.has(stat))
}

// With armour still open, the stat question counts only if some armour class
// leaves a real choice, so a slot where every class fixes the stat is not
// announced as a third question.
function statQuestionApplies(value: NeedFlowValue, eligibility: readonly NeedDefinition[] | null): boolean {
  if (value.slot === null) return false
  if (value.armour !== null) return statOptionKeys(value, eligibility).length > 1
  const armours = armourOptionKeys(value.slot, eligibility)
  if (armours.length === 0) return statOptionKeys(value, eligibility).length > 1
  return armours.some((armour) => statOptionKeys({ ...value, armour }, eligibility).length > 1)
}

/**
 * The questions that apply to this value, in order. A decided question stays
 * in the list (Back shows it again); callers skip it when moving forward with
 * nextNeedQuestion. While no slot is chosen only the slot question is known.
 */
export function questionsFor(
  value: NeedFlowValue,
  eligibility: readonly NeedDefinition[] | null,
): NeedQuestion[] {
  const questions: NeedQuestion[] = ['slot']
  if (value.slot === null) return questions
  if (armourOptionKeys(value.slot, eligibility).length > 1) questions.push('armour')
  if (statQuestionApplies(value, eligibility)) questions.push('stat')
  return questions
}

function toOption(question: NeedQuestion, key: NeedOptionKey, label: string): NeedOption {
  return { question, key, label }
}

/**
 * The eligible options for one question given the earlier answers. Slots come
 * grouped as Weapons, Armour and Accessories with an empty group left out;
 * armour and stat come as a single unlabelled group.
 */
export function optionsFor(
  question: NeedQuestion,
  value: NeedFlowValue,
  eligibility: readonly NeedDefinition[] | null,
): NeedOptionGroup[] {
  if (question === 'slot') {
    const offered = new Set(pool(eligibility).map((definition) => definition.slot))
    return NEED_SLOT_GROUPS.map((group) => ({
      label: group.label,
      options: group.slots
        .filter((slot) => offered.has(slot))
        .map((slot) => toOption('slot', slot, NEED_SLOT_LABELS[slot])),
    })).filter((group) => group.options.length > 0)
  }

  const keys: NeedOptionKey[] =
    question === 'armour' ? armourOptionKeys(value.slot, eligibility) : statOptionKeys(value, eligibility)
  if (keys.length === 0) return []
  const labels: Readonly<Record<string, string>> = question === 'armour' ? NEED_ARMOUR_LABELS : NEED_STAT_LABELS
  return [{ label: null, options: keys.map((key) => toOption(question, key, labels[key])) }]
}

function candidates(value: NeedFlowValue, eligibility: readonly NeedDefinition[] | null): NeedDefinition[] {
  if (value.slot === null) return []
  return pool(eligibility).filter(
    (definition) =>
      definition.slot === value.slot &&
      (value.armour === null || definition.armour === value.armour) &&
      (value.stat === null || definition.stat === value.stat),
  )
}

/**
 * The need this value names, else null. A value names a need once every
 * remaining question has a single possible answer, so a class with one choice
 * for a slot resolves on the slot tap alone.
 */
export function resolveNeed(
  value: NeedFlowValue,
  eligibility: readonly NeedDefinition[] | null,
): NeedDefinition | null {
  const matches = candidates(value, eligibility)
  return matches.length === 1 ? matches[0] : null
}

/**
 * Records an answer. Changing an answer that was already given clears the ones
 * after it, because they were chosen for the old answer; choosing the same
 * option again keeps them. An earlier question that was still open keeps the
 * later answers, which the Drop Desk can decide from the drop itself.
 */
export function applyNeedAnswer(
  value: NeedFlowValue,
  question: NeedQuestion,
  key: NeedOptionKey,
): NeedFlowValue {
  if (question === 'slot') {
    const slot = key as NeedSlotKey
    if (value.slot === null || value.slot === slot) return { ...value, slot }
    return { slot, armour: null, stat: null }
  }
  if (question === 'armour') {
    const armour = key as NeedArmourKey
    if (value.armour === null || value.armour === armour) return { ...value, armour }
    return { ...value, armour, stat: null }
  }
  return { ...value, stat: key as NeedStatKey }
}

/**
 * Drops a later answer the earlier ones no longer allow, so a stale armour or
 * stat can never survive into a need that does not exist for the character.
 */
export function pruneNeedValue(
  value: NeedFlowValue,
  eligibility: readonly NeedDefinition[] | null,
): NeedFlowValue {
  if (value.slot === null) return value
  const armour =
    value.armour !== null && armourOptionKeys(value.slot, eligibility).includes(value.armour) ? value.armour : null
  const withArmour = { ...value, armour }
  const stat = value.stat !== null && statOptionKeys(withArmour, eligibility).includes(value.stat) ? value.stat : null
  return { ...withArmour, stat }
}

/** The next applicable question after this one that is still undecided, else null. */
export function nextNeedQuestion(
  value: NeedFlowValue,
  after: NeedQuestion,
  eligibility: readonly NeedDefinition[] | null,
): NeedQuestion | null {
  const questions = questionsFor(value, eligibility)
  const from = QUESTION_ORDER.indexOf(after)
  return questions.find((question) => QUESTION_ORDER.indexOf(question) > from && value[question] === null) ?? null
}

/**
 * The armour class tagged "Your armour": the highest class among the eligible
 * needs. Null for an unrestricted flow, where no class is the user's.
 */
export function topArmourFor(eligibility: readonly NeedDefinition[] | null): NeedArmourKey | null {
  if (eligibility === null) return null
  const worn = new Set<NeedArmourKey>()
  for (const definition of eligibility) {
    if (definition.armour !== null) worn.add(definition.armour)
  }
  return [...ARMOUR_ORDER].reverse().find((armour) => worn.has(armour)) ?? null
}

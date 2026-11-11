/**
 * Which Discovery needs a character can use (D-10).
 *
 * The picker offers only the needs this returns and the submit route refuses
 * the rest through the same function, so the two cannot disagree. A need is
 * eligible when the class can use its slot (weapon proficiencies, shield,
 * dual wield, relic), can wear its armour class (lighter is allowed), and the
 * spec's role covers its stat family. Strength and agility are further limited
 * by the class, because a role alone cannot tell a rogue from a warrior.
 *
 * Every class table is a frozen Map or Set and every lookup goes through it
 * (T-04-03-02), so a class name such as '__proto__' answers nothing instead of
 * answering from the prototype.
 *
 * Pure and client-safe: no server code, no I/O.
 */
import {
  CLASS_PROFICIENCIES,
  canWearArmorType,
  type ArmorType,
  type ClassProficiency,
  type WeaponType,
  type WowClassName,
} from '@/data/class-proficiencies'
import {
  NEED_DEFINITIONS,
  findNeedDefinition,
  needRowColumns,
  type NeedArmourKey,
  type NeedDefinition,
  type NeedSlotKey,
} from '@/domain/loot/needs'
import { getSpecRoles, specMapping, type Role } from '@/domain/loot/spec-role-mapping'

/** DRAFT copy for the 04-19 sign-off. No em or en dash may appear. */
export const NEED_NOT_ELIGIBLE_CODE = 'NEED_NOT_ELIGIBLE'
export const NEED_NOT_ELIGIBLE_ERROR = "Your spec can't use this need. Change it to continue."

/**
 * The class and spec names the master sheet joins into a specMapping key:
 * 'Mage' for a class whose spec shares its name, else 'Holy Paladin'.
 */
export function specMappingKey(className: string, specName: string): string {
  return className === specName ? className : `${specName} ${className}`
}

// Owner-reviewed assumptions A1 and A2 (research, the 04-02 stop). The weapon
// list cannot tell dual wield from a single one-hander, and relics are not
// weapons, so both are tables here rather than derived from proficiencies.
export const DUAL_WIELD_CLASSES: ReadonlySet<string> = new Set([
  'Warrior',
  'Rogue',
  'Hunter',
  'Shaman',
  'Death Knight',
  'Monk',
])

export const RELIC_CLASSES: ReadonlySet<string> = new Set(['Paladin', 'Druid', 'Shaman', 'Death Knight'])

type PhysicalStat = 'strength' | 'agility'

/**
 * Which of strength and agility a class uses. The 'physical' family is not
 * listed here: it is open to every physical spec.
 */
export const PHYSICAL_STAT_BY_CLASS: ReadonlyMap<string, readonly PhysicalStat[]> = new Map<
  string,
  readonly PhysicalStat[]
>([
  ['Warrior', Object.freeze<PhysicalStat[]>(['strength'])],
  ['Paladin', Object.freeze<PhysicalStat[]>(['strength'])],
  ['Death Knight', Object.freeze<PhysicalStat[]>(['strength'])],
  ['Hunter', Object.freeze<PhysicalStat[]>(['agility'])],
  ['Rogue', Object.freeze<PhysicalStat[]>(['agility'])],
  ['Monk', Object.freeze<PhysicalStat[]>(['agility'])],
  ['Shaman', Object.freeze<PhysicalStat[]>(['strength', 'agility'])],
  ['Druid', Object.freeze<PhysicalStat[]>(['strength', 'agility'])],
])

const PROFICIENCY_BY_CLASS: ReadonlyMap<string, ClassProficiency> = new Map(
  Object.entries(CLASS_PROFICIENCIES),
)

const TWO_HAND_WEAPONS: readonly WeaponType[] = [
  'Two-Handed Axe',
  'Two-Handed Mace',
  'Two-Handed Sword',
  'Polearm',
  'Staff',
]
const MAIN_HAND_WEAPONS: readonly WeaponType[] = [
  'Dagger',
  'Fist Weapon',
  'One-Handed Axe',
  'One-Handed Mace',
  'One-Handed Sword',
]
const RANGED_WEAPONS: readonly WeaponType[] = ['Bow', 'Crossbow', 'Gun', 'Thrown', 'Wand']

// Slots every known class can fill; the stat rule narrows them afterwards.
const OPEN_SLOTS: readonly NeedSlotKey[] = [
  'off-hand-item',
  'trinket',
  'ring',
  'neck',
  'back',
  'head',
  'shoulders',
  'chest',
  'wrist',
  'hands',
  'waist',
  'legs',
  'feet',
]

const ARMOUR_TYPE_BY_KEY: Readonly<Record<NeedArmourKey, ArmorType>> = Object.freeze({
  cloth: 'Cloth',
  leather: 'Leather',
  mail: 'Mail',
  plate: 'Plate',
})

function knownClassName(className: string | null | undefined): WowClassName | null {
  if (typeof className !== 'string' || !PROFICIENCY_BY_CLASS.has(className)) return null
  return className as WowClassName
}

/** The slots the class can use at all; empty for an unknown or missing class. */
export function eligibleSlotsFor(className: string | null | undefined): ReadonlySet<NeedSlotKey> {
  const known = knownClassName(className)
  const proficiency = known === null ? undefined : PROFICIENCY_BY_CLASS.get(known)
  if (known === null || proficiency === undefined) return new Set()

  const slots = new Set<NeedSlotKey>(OPEN_SLOTS)
  const usesAny = (types: readonly WeaponType[]) => types.some((type) => proficiency.weapons.includes(type))
  if (usesAny(TWO_HAND_WEAPONS)) slots.add('two-hand-weapon')
  if (usesAny(MAIN_HAND_WEAPONS)) slots.add('main-hand-weapon')
  if (usesAny(RANGED_WEAPONS)) slots.add('ranged-weapon')
  if (proficiency.weapons.includes('Shield')) slots.add('shield')
  if (DUAL_WIELD_CLASSES.has(known)) slots.add('off-hand-weapon')
  if (RELIC_CLASSES.has(known)) slots.add('relic')
  return slots
}

// A character who never picked a spec still sees a usable picker: the union of
// the roles of every spec of the class (planner decision).
function classRoles(className: string): ReadonlySet<Role> {
  const roles = new Set<Role>()
  for (const info of Object.values(specMapping)) {
    if (info.class === className) for (const role of info.roles) roles.add(role)
  }
  return roles
}

function rolesFor(className: string, specName: string | null | undefined): ReadonlySet<Role> {
  if (typeof specName === 'string') {
    const key = specMappingKey(className, specName)
    // hasOwn, because getSpecRoles would also answer for prototype names.
    if (Object.hasOwn(specMapping, key)) return new Set(getSpecRoles(key))
  }
  return classRoles(className)
}

/**
 * The needs this character may rank, in NEED_DEFINITIONS order. An unknown or
 * missing class gets none, so the submit route refuses every need for it.
 */
export function eligibleNeedsFor(character: {
  className: string | null | undefined
  specName: string | null | undefined
}): readonly NeedDefinition[] {
  const className = knownClassName(character.className)
  if (className === null) return []

  const slots = eligibleSlotsFor(className)
  const roles = rolesFor(className, character.specName)
  const physicalStats = PHYSICAL_STAT_BY_CLASS.get(className) ?? []

  return NEED_DEFINITIONS.filter((definition) => {
    if (!slots.has(definition.slot)) return false
    if (definition.armour !== null && !canWearArmorType(className, ARMOUR_TYPE_BY_KEY[definition.armour])) {
      return false
    }
    if (!needRowColumns(definition).roles.some((role) => roles.has(role))) return false
    if (definition.stat === 'strength' || definition.stat === 'agility') {
      return physicalStats.includes(definition.stat)
    }
    return true
  })
}

/** Whether this character may rank this key; any non-need value is false. */
export function isNeedEligible(
  character: { className: string | null | undefined; specName: string | null | undefined },
  needKey: unknown,
): boolean {
  const definition = findNeedDefinition(needKey)
  if (definition === null) return false
  return eligibleNeedsFor(character).some((need) => need.key === definition.key)
}

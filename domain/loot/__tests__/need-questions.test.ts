import { describe, expect, it } from 'vitest'
import { eligibleNeedsFor } from '@/domain/loot/need-eligibility'
import {
  EMPTY_NEED_FLOW_VALUE,
  NEED_ARMOUR_LABELS,
  NEED_SLOT_GROUPS,
  NEED_SLOT_LABELS,
  NEED_STAT_LABELS,
  applyNeedAnswer,
  needCostWord,
  nextNeedQuestion,
  optionsFor,
  pruneNeedValue,
  questionsFor,
  resolveNeed,
  topArmourFor,
  type NeedFlowValue,
} from '@/domain/loot/need-questions'
import { NEED_DEFINITIONS, type NeedSlotKey } from '@/domain/loot/needs'

const protWarrior = eligibleNeedsFor({ className: 'Warrior', specName: 'Protection' })
const mage = eligibleNeedsFor({ className: 'Mage', specName: 'Fire' })

function value(partial: Partial<NeedFlowValue>): NeedFlowValue {
  return { ...EMPTY_NEED_FLOW_VALUE, ...partial }
}

function slotsOffered(eligibility: Parameters<typeof optionsFor>[2]): NeedSlotKey[] {
  return optionsFor('slot', EMPTY_NEED_FLOW_VALUE, eligibility).flatMap((group) =>
    group.options.map((option) => option.key as NeedSlotKey),
  )
}

describe('questionsFor (D-16)', () => {
  it('starts with the slot question and nothing else while no slot is chosen', () => {
    expect(questionsFor(EMPTY_NEED_FLOW_VALUE, protWarrior)).toEqual(['slot'])
  })

  it('asks armour for an armour slot when the class has more than one armour class with a usable stat, and skips stat when only tank is usable', () => {
    expect(questionsFor(value({ slot: 'chest' }), protWarrior)).toEqual(['slot', 'armour'])
  })

  it('skips armour for a slot that carries no armour class', () => {
    const questions = questionsFor(value({ slot: 'trinket' }), mage)
    expect(questions).not.toContain('armour')
  })

  it('skips both follow-up questions when one need is the only choice', () => {
    // A mage can only want cloth, spell damage on a chest.
    expect(questionsFor(value({ slot: 'chest' }), mage)).toEqual(['slot'])
  })

  it('asks stat only when more than one family is usable', () => {
    const paladin = eligibleNeedsFor({ className: 'Paladin', specName: null })
    expect(questionsFor(value({ slot: 'trinket' }), paladin)).toEqual(['slot', 'stat'])
  })

  it('keeps a decided question in the list so Back can show it', () => {
    expect(questionsFor(value({ slot: 'chest', armour: 'plate' }), protWarrior)).toEqual(['slot', 'armour'])
  })

  it('never asks more than three questions, for any slot with every need eligible', () => {
    for (const slot of NEED_DEFINITIONS.map((definition) => definition.slot)) {
      expect(questionsFor(value({ slot }), null).length).toBeLessThanOrEqual(3)
    }
  })

  it('offers no weapon type and no lighter armour question', () => {
    const everyQuestion = new Set(
      NEED_DEFINITIONS.flatMap((definition) => questionsFor(value({ slot: definition.slot }), null)),
    )
    expect([...everyQuestion].sort()).toEqual(['armour', 'slot', 'stat'])
  })
})

describe('optionsFor (D-10)', () => {
  it('lists no shield, off-hand weapon or relic for a mage', () => {
    const offered = slotsOffered(mage)
    expect(offered).not.toContain('shield')
    expect(offered).not.toContain('off-hand-weapon')
    expect(offered).not.toContain('relic')
    expect(offered).toContain('chest')
  })

  it('groups slots as Weapons, Armour and Accessories in that order and drops a group with no slots', () => {
    const labels = optionsFor('slot', EMPTY_NEED_FLOW_VALUE, mage).map((group) => group.label)
    expect(labels).toEqual(['Weapons', 'Armour', 'Accessories'])

    // Only accessories remain when the eligible list holds nothing else.
    const accessoriesOnly = NEED_DEFINITIONS.filter((definition) => definition.slot === 'ring')
    expect(optionsFor('slot', EMPTY_NEED_FLOW_VALUE, accessoriesOnly).map((group) => group.label)).toEqual([
      'Accessories',
    ])
  })

  it('offers only the armour classes the class can wear with a usable stat', () => {
    const armour = optionsFor('armour', value({ slot: 'chest' }), protWarrior)
      .flatMap((group) => group.options)
      .map((option) => option.key)
    expect(armour).toEqual(['leather', 'plate'])
  })

  it('offers only the stat families usable for the chosen slot and armour', () => {
    const paladin = eligibleNeedsFor({ className: 'Paladin', specName: null })
    const stats = optionsFor('stat', value({ slot: 'chest', armour: 'plate' }), paladin)
      .flatMap((group) => group.options)
      .map((option) => option.key)
    expect(stats).toEqual(['strength', 'tank', 'healing'])
  })

  it('offers every slot, armour and stat of the taxonomy when eligibility is null', () => {
    expect(slotsOffered(null)).toHaveLength(19)
    const armour = optionsFor('armour', value({ slot: 'head' }), null).flatMap((group) => group.options)
    expect(armour.map((option) => option.key)).toEqual(['cloth', 'leather', 'mail', 'plate'])
    const stats = optionsFor('stat', value({ slot: 'trinket' }), null).flatMap((group) => group.options)
    expect(stats.map((option) => option.key)).toEqual(['tank', 'spell-damage', 'healing', 'physical'])
  })

  it('returns nothing for armour or stat before a slot is chosen', () => {
    expect(optionsFor('armour', EMPTY_NEED_FLOW_VALUE, null)).toEqual([])
    expect(optionsFor('stat', EMPTY_NEED_FLOW_VALUE, null)).toEqual([])
  })

  it('returns nothing for a missing character', () => {
    expect(optionsFor('slot', EMPTY_NEED_FLOW_VALUE, [])).toEqual([])
  })
})

describe('resolveNeed', () => {
  it('returns the chest.plate.tank definition for a complete answer', () => {
    expect(resolveNeed({ slot: 'chest', armour: 'plate', stat: 'tank' }, protWarrior)?.key).toBe(
      'chest.plate.tank',
    )
  })

  it('returns null while a question that has more than one choice is unanswered', () => {
    expect(resolveNeed(value({ slot: 'chest' }), protWarrior)).toBeNull()
    expect(resolveNeed(EMPTY_NEED_FLOW_VALUE, protWarrior)).toBeNull()
  })

  it('resolves once every remaining question has a single choice', () => {
    expect(resolveNeed(value({ slot: 'chest', armour: 'plate' }), protWarrior)?.key).toBe('chest.plate.tank')
    expect(resolveNeed(value({ slot: 'chest' }), mage)?.key).toBe('chest.cloth.spell-damage')
  })

  it('returns null for an answer the eligibility does not allow', () => {
    expect(resolveNeed({ slot: 'chest', armour: 'cloth', stat: 'spell-damage' }, protWarrior)).toBeNull()
  })

  it('resolves any taxonomy need when eligibility is null', () => {
    expect(resolveNeed({ slot: 'ring', armour: null, stat: 'healing' }, null)?.key).toBe('ring.healing')
  })
})

describe('applyNeedAnswer and nextNeedQuestion', () => {
  it('clears later answers when an earlier answer changes', () => {
    const next = applyNeedAnswer({ slot: 'chest', armour: 'plate', stat: 'tank' }, 'slot', 'head')
    expect(next).toEqual({ slot: 'head', armour: null, stat: null })
  })

  it('keeps later answers when the same option is chosen again', () => {
    const next = applyNeedAnswer({ slot: 'chest', armour: 'plate', stat: 'tank' }, 'slot', 'chest')
    expect(next).toEqual({ slot: 'chest', armour: 'plate', stat: 'tank' })
  })

  it('keeps answers decided before the slot, and prunes any the slot does not allow', () => {
    const decidedEarly = applyNeedAnswer(value({ armour: 'plate' }), 'slot', 'chest')
    expect(decidedEarly).toEqual({ slot: 'chest', armour: 'plate', stat: null })
    expect(pruneNeedValue(decidedEarly, protWarrior)).toEqual(decidedEarly)

    // Plate is not offered for a trinket, and a mage has no plate at all.
    expect(pruneNeedValue(value({ slot: 'trinket', armour: 'plate' }), protWarrior).armour).toBeNull()
    expect(pruneNeedValue(value({ slot: 'chest', armour: 'plate', stat: 'tank' }), mage)).toEqual({
      slot: 'chest',
      armour: null,
      stat: null,
    })
  })

  it('moves to the next undecided question and skips a decided one', () => {
    const paladin = eligibleNeedsFor({ className: 'Paladin', specName: null })
    expect(nextNeedQuestion(value({ slot: 'chest' }), 'slot', paladin)).toBe('armour')
    expect(nextNeedQuestion(value({ slot: 'chest', stat: 'tank' }), 'slot', paladin)).toBe('armour')
    expect(nextNeedQuestion(value({ slot: 'chest', armour: 'plate' }), 'armour', paladin)).toBe('stat')
    expect(nextNeedQuestion(value({ slot: 'chest', armour: 'plate', stat: 'tank' }), 'armour', paladin)).toBeNull()
  })
})

describe('labels, cost words and the top armour', () => {
  it('uses the taxonomy words, so a name in NEED_DEFINITIONS is the labels joined', () => {
    for (const definition of NEED_DEFINITIONS) {
      const parts = [
        NEED_SLOT_LABELS[definition.slot],
        definition.armour ? NEED_ARMOUR_LABELS[definition.armour] : null,
        NEED_STAT_LABELS[definition.stat],
      ].filter(Boolean)
      expect(parts.join(', ')).toBe(definition.name)
    }
  })

  it('groups every one of the 19 slots exactly once', () => {
    const grouped = NEED_SLOT_GROUPS.flatMap((group) => group.slots)
    expect(new Set(grouped).size).toBe(19)
    expect(grouped).toHaveLength(19)
  })

  it('names the cost tier in words', () => {
    expect(needCostWord('trinket')).toBe('Big')
    expect(needCostWord('ring')).toBe('Medium')
    expect(needCostWord('chest')).toBe('Standard')
  })

  it('finds the class top armour among the eligible needs, and none for any need', () => {
    expect(topArmourFor(protWarrior)).toBe('plate')
    expect(topArmourFor(mage)).toBe('cloth')
    expect(topArmourFor(null)).toBeNull()
    expect(topArmourFor([])).toBeNull()
  })

  it('writes no dash into a label or group name', () => {
    const words = [
      ...Object.values(NEED_SLOT_LABELS),
      ...Object.values(NEED_ARMOUR_LABELS),
      ...Object.values(NEED_STAT_LABELS),
      ...NEED_SLOT_GROUPS.map((group) => group.label),
    ].join(' ')
    expect(words).not.toMatch(/[–—]/)
  })
})

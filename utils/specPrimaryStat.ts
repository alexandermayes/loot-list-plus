/**
 * Map a character's class + spec to its primary stat.
 *
 * Used by the unranked-items "match my spec" filter to hide gear with the
 * wrong primary stat (e.g. strength rings on a priest, agility mail on a
 * resto shaman).
 *
 * Returns null for classes whose mapping needs spec disambiguation but no
 * spec was provided, so the caller can decide to skip filtering.
 */

export type PrimaryStat = 'Strength' | 'Agility' | 'Intellect'

const PURE_CLASS_STAT: Record<string, PrimaryStat> = {
  Mage: 'Intellect',
  Warlock: 'Intellect',
  Priest: 'Intellect',
  Rogue: 'Agility',
  Hunter: 'Agility',
  'Demon Hunter': 'Agility',
  Warrior: 'Strength',
  'Death Knight': 'Strength',
}

// Hybrid classes — spec name decides. Spec names are matched case-insensitively
// and may appear with or without a class prefix.
const HYBRID_SPEC_STAT: Record<string, PrimaryStat> = {
  // Paladin
  holy: 'Intellect',
  protection: 'Strength', // ambiguous with warrior but warrior already resolves above
  retribution: 'Strength',
  // Shaman
  elemental: 'Intellect',
  enhancement: 'Agility',
  restoration: 'Intellect', // ambiguous with druid — same answer
  // Druid
  balance: 'Intellect',
  feral: 'Agility',
  guardian: 'Agility',
  // Monk
  brewmaster: 'Agility',
  mistweaver: 'Intellect',
  windwalker: 'Agility',
  // Evoker
  devastation: 'Intellect',
  preservation: 'Intellect',
  augmentation: 'Intellect',
}

export function getCharacterPrimaryStat(
  className: string | null | undefined,
  specName: string | null | undefined
): PrimaryStat | null {
  if (!className) return null

  const pure = PURE_CLASS_STAT[className]
  if (pure) return pure

  if (specName) {
    const key = specName.toLowerCase().trim()
    if (HYBRID_SPEC_STAT[key]) return HYBRID_SPEC_STAT[key]
  }

  return null
}

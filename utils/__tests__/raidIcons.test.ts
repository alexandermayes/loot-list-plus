// @vitest-environment node
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { getExpansionGame } from '@/domain/expansion/game'
import {
  FOREVER_RAID_ICON,
  getRaidIcon,
  getRaidIconLarge,
  getRaidShorthand,
} from '@/utils/raidIcons'

/**
 * Raid icons resolve by game plus name (D-04 as amended 2026-10-14). Forever
 * raid names collide with Classic and TBC raid names ("Onyxia's Lair",
 * "Hyjal Summit"), so a name-only lookup would show a Forever tier with Classic
 * or TBC art. The owner moved this work out of plan 02-11 into its own PR so
 * the copy sign-off on 02-11 can never hold it back and no deployed Forever
 * tier ever shows the wrong art.
 */

const MEDIUM = 'https://wow.zamimg.com/images/wow/icons/medium/'
const LARGE = 'https://wow.zamimg.com/images/wow/icons/large/'

describe('getRaidIcon and getRaidIconLarge: Forever scoping', () => {
  it('exports the neutral Forever icon constant', () => {
    expect(FOREVER_RAID_ICON).toBe('inv_misc_questionmark')
  })

  it("never resolves a Forever Onyxia's Lair to the Classic Onyxia icon", () => {
    const url = getRaidIcon("Onyxia's Lair", 'forever')
    expect(url).not.toContain('achievement_boss_onyxia')
    expect(url).toBe(`${MEDIUM}${FOREVER_RAID_ICON}.jpg`)
  })

  it('never resolves a Forever Hyjal Summit to the TBC Archimonde icon', () => {
    const url = getRaidIcon('Hyjal Summit', 'forever')
    expect(url).not.toContain('achievement_boss_archimonde')
    expect(url).toBe(`${MEDIUM}${FOREVER_RAID_ICON}.jpg`)
  })

  it('gives a Forever raid that is in no name map the neutral icon', () => {
    expect(getRaidIcon('Barrow Deeps', 'forever')).toBe(`${MEDIUM}${FOREVER_RAID_ICON}.jpg`)
  })

  it('returns the large neutral URL from getRaidIconLarge for Forever', () => {
    expect(getRaidIconLarge("Onyxia's Lair", 'forever')).toBe(
      `${LARGE}${FOREVER_RAID_ICON}.jpg`,
    )
    expect(getRaidIconLarge('Hyjal Summit', 'forever')).not.toContain(
      'achievement_boss_archimonde',
    )
  })

  it('never reads the name map on the Forever path (prototype-pollution names)', () => {
    for (const name of ['constructor', '__proto__', 'toString', 'hasOwnProperty']) {
      expect(getRaidIcon(name, 'forever')).toBe(`${MEDIUM}${FOREVER_RAID_ICON}.jpg`)
      expect(getRaidIconLarge(name, 'forever')).toBe(`${LARGE}${FOREVER_RAID_ICON}.jpg`)
    }
  })
})

describe('getRaidIcon and getRaidIconLarge: Classic line is unchanged', () => {
  it("keeps the Classic Onyxia icon with the game omitted or 'classic'", () => {
    expect(getRaidIcon("Onyxia's Lair")).toContain('achievement_boss_onyxia')
    expect(getRaidIcon("Onyxia's Lair", 'classic')).toContain('achievement_boss_onyxia')
    expect(getRaidIconLarge("Onyxia's Lair", 'classic')).toContain('achievement_boss_onyxia')
  })

  it("keeps the TBC Archimonde icon for Hyjal Summit with the game omitted or 'classic'", () => {
    expect(getRaidIcon('Hyjal Summit')).toContain('achievement_boss_archimonde-')
    expect(getRaidIcon('Hyjal Summit', 'classic')).toContain('achievement_boss_archimonde-')
  })

  it("resolves a name the same with 'classic' as with no game", () => {
    for (const name of ['Molten Core', 'Karazhan', 'Naxxramas', 'Siege of Orgrimmar']) {
      expect(getRaidIcon(name, 'classic')).toBe(getRaidIcon(name))
      expect(getRaidIconLarge(name, 'classic')).toBe(getRaidIconLarge(name))
    }
  })

  it('still falls back to the question-mark icon for an unknown name', () => {
    expect(getRaidIcon('Not A Raid')).toBe(`${MEDIUM}inv_misc_questionmark.jpg`)
    expect(getRaidIcon('Not A Raid', 'classic')).toBe(`${MEDIUM}inv_misc_questionmark.jpg`)
    expect(getRaidIconLarge('Not A Raid')).toBe(`${LARGE}inv_misc_questionmark.jpg`)
  })
})

describe('run payload composition (plan 02-13 usage)', () => {
  it("gives a Forever expansion name the neutral icon and a null expansion the Classic icon", () => {
    expect(getRaidIcon("Onyxia's Lair", getExpansionGame('Forever') ?? 'classic')).toBe(
      `${MEDIUM}${FOREVER_RAID_ICON}.jpg`,
    )
    expect(getRaidIcon("Onyxia's Lair", getExpansionGame(null) ?? 'classic')).toContain(
      'achievement_boss_onyxia',
    )
  })
})

describe('getRaidShorthand', () => {
  it('is unchanged: labels carry no art and are right for the Forever raids too', () => {
    expect(getRaidShorthand("Onyxia's Lair")).toBe('Onyxia')
    expect(getRaidShorthand('Hyjal Summit')).toBe('Hyjal')
  })
})

/**
 * Call-site inventory. Every raid-icon call under app/ must pass the game
 * (D-04 as amended 2026-10-14), except files on the allowlist below, which
 * plan 02-13 wires. The allowlist is self-checking: each entry must exist and
 * still hold only game-less calls, so wiring a file forces its removal.
 */

interface RaidIconCall {
  name: 'getRaidIcon' | 'getRaidIconLarge'
  argCount: number
}

/** Blanks comments while keeping string contents and line structure intact. */
function stripComments(source: string): string {
  let out = ''
  let i = 0
  while (i < source.length) {
    const ch = source[i]
    const next = source[i + 1]
    if (ch === '/' && next === '/') {
      const end = source.indexOf('\n', i)
      i = end === -1 ? source.length : end
      continue
    }
    if (ch === '/' && next === '*') {
      const end = source.indexOf('*/', i + 2)
      i = end === -1 ? source.length : end + 2
      continue
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      let j = i + 1
      while (j < source.length && source[j] !== ch) {
        if (source[j] === '\\') j++
        j++
      }
      out += source.slice(i, j + 1)
      i = j + 1
      continue
    }
    out += ch
    i++
  }
  return out
}

/**
 * Reads the arguments of the call whose opening parenthesis is at `openIndex`
 * and returns how many there are (top-level commas, ignoring a trailing one),
 * or null when the parentheses never balance.
 */
function countArguments(source: string, openIndex: number): number | null {
  let depth = 0
  let segment = ''
  let count = 0
  for (let i = openIndex; i < source.length; i++) {
    const ch = source[i]
    if (ch === "'" || ch === '"' || ch === '`') {
      let j = i + 1
      while (j < source.length && source[j] !== ch) {
        if (source[j] === '\\') j++
        j++
      }
      if (j >= source.length) return null
      segment += source.slice(i, j + 1)
      i = j
      continue
    }
    if (ch === '(' || ch === '[' || ch === '{') {
      depth++
      if (depth === 1) continue
    } else if (ch === ')' || ch === ']' || ch === '}') {
      depth--
      if (depth === 0) {
        if (segment.trim() !== '') count++
        return count
      }
    } else if (ch === ',' && depth === 1) {
      if (segment.trim() !== '') count++
      segment = ''
      continue
    }
    segment += ch
  }
  return null
}

/** Finds each getRaidIcon( and getRaidIconLarge( call and its argument count. */
function findRaidIconCalls(source: string): RaidIconCall[] {
  const code = stripComments(source)
    .split('\n')
    .filter((line) => !/^\s*import\b/.test(line))
    .join('\n')
  const calls: RaidIconCall[] = []
  const pattern = /\b(getRaidIconLarge|getRaidIcon)\(/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(code)) !== null) {
    const argCount = countArguments(code, match.index + match[0].length - 1)
    if (argCount === null) throw new Error(`unbalanced ${match[1]}( call`)
    calls.push({ name: match[1] as RaidIconCall['name'], argCount })
  }
  return calls
}

// Plan 02-13 wires each of these and removes it from this list in the same
// commit; the list ends empty (D-04 as amended 2026-10-14: every raid-icon call
// site resolves by game).
const GAMELESS_CALL_ALLOWLIST: readonly string[] = [
  'app/(app)/master-sheet/components/RaidTierHeader.tsx',
  'app/(app)/reserve/_client.tsx',
  'app/(app)/reserve/components/CreateReserveRunModal.tsx',
  'app/reserve/join/[token]/opengraph-image.tsx',
  'app/reserve/join/[token]/page.tsx',
]

const REPO_ROOT = path.resolve(__dirname, '../..')
const MIN_CALLS = 13

function collectSourceFiles(dir: string): string[] {
  const found: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (['node_modules', '.next', '__tests__'].includes(entry.name)) continue
      found.push(...collectSourceFiles(path.join(dir, entry.name)))
    } else if (
      entry.isFile() &&
      /\.tsx?$/.test(entry.name) &&
      !/\.test\./.test(entry.name)
    ) {
      found.push(path.join(dir, entry.name))
    }
  }
  return found
}

const callsByFile = new Map<string, RaidIconCall[]>()
for (const file of collectSourceFiles(path.join(REPO_ROOT, 'app')).sort()) {
  const calls = findRaidIconCalls(fs.readFileSync(file, 'utf8'))
  if (calls.length > 0) {
    callsByFile.set(path.relative(REPO_ROOT, file).split(path.sep).join('/'), calls)
  }
}
const allCalls = [...callsByFile.values()].flat()

describe('findRaidIconCalls (synthetic self-check)', () => {
  it('counts one argument for a game-less call and two when the game is passed', () => {
    expect(findRaidIconCalls('getRaidIcon(tier.name)')).toEqual([
      { name: 'getRaidIcon', argCount: 1 },
    ])
    expect(findRaidIconCalls('getRaidIcon(tier.name, game)')).toEqual([
      { name: 'getRaidIcon', argCount: 2 },
    ])
  })

  it('counts two for a nested expression argument followed by the game', () => {
    const source =
      "getRaidIcon(phaseTiers.find(t => t.a)?.name || '', guildGame)"
    expect(findRaidIconCalls(source)).toEqual([{ name: 'getRaidIcon', argCount: 2 }])
  })

  it('ignores a trailing comma and commas inside strings', () => {
    expect(findRaidIconCalls("getRaidIcon('a, b',)")).toEqual([
      { name: 'getRaidIcon', argCount: 1 },
    ])
  })

  it('ignores calls in comments and import lines', () => {
    const source = [
      "import { getRaidIcon } from '@/utils/raidIcons'",
      '// getRaidIcon(tier.name)',
      '/* getRaidIcon(tier.name) */',
      'const url = "https://example.test/x" // getRaidIcon(tier.name)',
    ].join('\n')
    expect(findRaidIconCalls(source)).toEqual([])
  })

  it('reports getRaidIconLarge under its own name', () => {
    expect(findRaidIconCalls("getRaidIconLarge('Unknown')")).toEqual([
      { name: 'getRaidIconLarge', argCount: 1 },
    ])
  })
})

describe('raid icon call-site inventory under app/', () => {
  it(`finds at least ${MIN_CALLS} calls, so the scan is not vacuous`, () => {
    expect(allCalls.length).toBeGreaterThanOrEqual(MIN_CALLS)
  })

  it('every call outside the allowlist passes the game', () => {
    const offenders = [...callsByFile.entries()]
      .filter(([file]) => !GAMELESS_CALL_ALLOWLIST.includes(file))
      .flatMap(([file, calls]) =>
        calls
          .filter((call) => call.argCount !== 2)
          .map((call) => `${file}: ${call.name}( with ${call.argCount} argument(s)`),
      )
    expect(offenders).toEqual([])
  })

  it('every allowlisted file exists, holds calls, and holds only game-less calls', () => {
    const problems: string[] = []
    for (const file of GAMELESS_CALL_ALLOWLIST) {
      if (!fs.existsSync(path.join(REPO_ROOT, file))) {
        problems.push(`${file}: does not exist, remove it from the allowlist`)
        continue
      }
      const calls = callsByFile.get(file) ?? []
      if (calls.length === 0) {
        problems.push(`${file}: holds no raid icon call, remove it from the allowlist`)
      } else if (calls.some((call) => call.argCount !== 1)) {
        problems.push(`${file}: passes the game now, remove it from the allowlist`)
      }
    }
    expect(problems).toEqual([])
  })

  it('names exactly the five surfaces plan 02-13 has still to wire', () => {
    expect(GAMELESS_CALL_ALLOWLIST).toHaveLength(5)
    expect(new Set(GAMELESS_CALL_ALLOWLIST).size).toBe(5)
  })
})

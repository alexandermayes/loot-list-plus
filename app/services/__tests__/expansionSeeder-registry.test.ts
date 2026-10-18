// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  SUPPORTED_EXPANSIONS,
  isSupportedExpansion,
  getAvailableExpansions,
  getExpansionDefinition,
  getExpansionGame,
  seedExpansionForGuild,
} from '../expansionSeeder'
import { EXPANSION_REGISTRY, getExpansionMeta } from '@/data/expansions/registry'
import { getExpansionCatalog } from '@/data/expansions/catalogs'

/**
 * Pins the expansion registry (plan 02-04) so the seeder cannot drift back to
 * name-keyed chains and tables (EXPN-02). GH-269 was exactly that: lookups
 * keyed on a display name that silently fell back to Classic data when a name
 * did not match. Four things are fixed here: the seeder source stays free of
 * selection chains and hand-written tables, the surface and order callers rely
 * on cannot change, near-miss names never resolve, and the client-safe files
 * stay client-safe.
 *
 * The round-trip case below is the invariant test recorded in plan 02-04's
 * assumption-delta decision: every registry row with data must come back
 * through getExpansionDefinition with the same slug, seed mode and game.
 */

const REPO_ROOT = path.resolve(__dirname, '../../..')

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, relativePath), 'utf8')
}

/**
 * Drop block and line comments so prose that mentions a forbidden word does
 * not trip the scan. A `//` only starts a comment at line start or after
 * whitespace, which keeps `https://` inside strings intact.
 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|\s)\/\/.*$/gm, '$1')
}

// The per-expansion data files the old seeder imported directly; only the
// catalogs module may load them now.
const PER_EXPANSION_DATA_IMPORT =
  /from\s+['"][^'"]*data\/[\w-]*(?:-raids|-item-classifications|-item-roles)['"]/

/** One message per way the seeder source has an expansion-name chain or table. */
function findChainViolations(source: string): string[] {
  const code = stripComments(source)
  const violations: string[] = []
  if (/\bdisplayName\s*(?:===?|!==?)/.test(code)) {
    violations.push('compares displayName with == or ===')
  }
  if (/\bclassificationMap\b/.test(code)) {
    violations.push('uses a classificationMap selection chain')
  }
  if (/\broleMap\b/.test(code)) {
    violations.push('uses a roleMap selection chain')
  }
  if (/\bEXPANSION_DATA\b/.test(code)) {
    violations.push('declares or reads a hand-written EXPANSION_DATA table')
  }
  if (PER_EXPANSION_DATA_IMPORT.test(code)) {
    violations.push('imports a data/*-raids, *-item-classifications or *-item-roles file')
  }
  return violations
}

/** Specifiers of runtime imports, ignoring `import type` and `export type`. */
function findRuntimeImports(source: string): string[] {
  const code = stripComments(source)
  const specifiers: string[] = []
  const staticImport = /(?:^|\n)\s*(import|export)\s+(type\s+)?(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]/g
  for (const match of code.matchAll(staticImport)) {
    if (match[2]) continue
    specifiers.push(match[3])
  }
  for (const match of code.matchAll(/\b(?:import|require)\(\s*['"]([^'"]+)['"]\s*\)/g)) {
    specifiers.push(match[1])
  }
  return specifiers
}

const CLIENT_UNSAFE_IMPORT: Array<[string, RegExp]> = [
  ['zod at runtime', /^zod(?:\/|$)/],
  ['the server-only catalogs', /expansions\/catalogs$/],
  ['a per-expansion raid file', /data\/[\w-]*-raids$/],
  ['a per-expansion classification file', /data\/[\w-]*-item-classifications$/],
  ['a per-expansion role file', /data\/[\w-]*-item-roles$/],
  ['app/services code', /^(?:@\/)?app\/services(?:\/|$)/],
  ['Supabase code', /^(?:@\/)?utils\/supabase(?:\/|$)/],
]

/** One message per runtime import a client-safe file must not have. */
function findClientUnsafeImports(source: string): string[] {
  const violations: string[] = []
  for (const specifier of findRuntimeImports(source)) {
    for (const [label, pattern] of CLIENT_UNSAFE_IMPORT) {
      if (pattern.test(specifier)) violations.push(`imports ${label}: ${specifier}`)
    }
  }
  return violations
}

// The twelve-entry list from plan 02-04's interfaces block, in registry order.
const TWELVE_EXPANSIONS = [
  { name: 'Classic', hasData: true },
  { name: 'The Burning Crusade', hasData: true },
  { name: 'Wrath of the Lich King', hasData: true },
  { name: 'Cataclysm', hasData: true },
  { name: 'Mists of Pandaria', hasData: true },
  { name: 'Forever', hasData: true },
  { name: 'Warlords of Draenor', hasData: false },
  { name: 'Legion', hasData: false },
  { name: 'Battle for Azeroth', hasData: false },
  { name: 'Shadowlands', hasData: false },
  { name: 'Dragonflight', hasData: false },
  { name: 'The War Within', hasData: false },
]

const LEGACY_NAMES = [
  'Classic',
  'The Burning Crusade',
  'Wrath of the Lich King',
  'Cataclysm',
  'Mists of Pandaria',
]

describe('seeder source has no expansion-name chains or tables (EXPN-02, GH-269)', () => {
  const oldStyleSource = `
    import { classicRaids } from '@/data/classic-wow-raids'
    import { TBC_ITEM_CLASSIFICATIONS } from '@/data/tbc-item-classifications'
    import { CATA_ITEM_ROLES } from '@/data/cata-item-roles'
    const EXPANSION_DATA = { Classic: classicRaids }
    const classificationMap = displayName === 'Classic' ? A : B
    const roleMap = displayName == 'Cataclysm' ? C : D
  `

  it('findChainViolations flags a synthetic old-style source for every forbidden pattern', () => {
    const violations = findChainViolations(oldStyleSource)
    expect(violations).toEqual([
      'compares displayName with == or ===',
      'uses a classificationMap selection chain',
      'uses a roleMap selection chain',
      'declares or reads a hand-written EXPANSION_DATA table',
      'imports a data/*-raids, *-item-classifications or *-item-roles file',
    ])
  })

  it('findChainViolations accepts a clean registry-driven source and ignores comments', () => {
    const clean = `
      // Used to compare displayName === 'Classic' and read EXPANSION_DATA.
      /* classificationMap and roleMap lived here. data/classic-wow-raids is gone. */
      import { getExpansionMeta } from '@/data/expansions/registry'
      const meta = getExpansionMeta(name)
    `
    expect(findChainViolations(clean)).toEqual([])
  })

  it('expansionSeeder.ts, comments stripped, has no chain, table or per-expansion data import', () => {
    expect(findChainViolations(readSource('app/services/expansionSeeder.ts'))).toEqual([])
  })
})

describe('registry surface the callers rely on', () => {
  it('[E-EXPN-02 ordering] getAvailableExpansions returns all twelve in registry order', () => {
    expect(getAvailableExpansions()).toEqual(TWELVE_EXPANSIONS)
    expect(Object.keys(EXPANSION_REGISTRY)).toEqual(TWELVE_EXPANSIONS.map((entry) => entry.name))
  })

  it('[E-EXPN-02 ordering] SUPPORTED_EXPANSIONS stays Classic, The Burning Crusade, Wrath of the Lich King, Cataclysm, Mists of Pandaria, Forever', () => {
    expect([...SUPPORTED_EXPANSIONS]).toEqual([
      'Classic',
      'The Burning Crusade',
      'Wrath of the Lich King',
      'Cataclysm',
      'Mists of Pandaria',
      'Forever',
    ])
  })

  it.each([...SUPPORTED_EXPANSIONS])('%s resolves through the registry, its catalog and the seeder', (name) => {
    const meta = getExpansionMeta(name)
    expect(meta).not.toBeNull()
    expect(meta?.hasData).toBe(true)
    expect(isSupportedExpansion(name)).toBe(true)

    const catalog = getExpansionCatalog(name)
    expect(catalog).not.toBeNull()
    // Native exactly when the seed mode is 'sync', so an expansion without its
    // own classification map can never be handed Classic's.
    expect(catalog?.kind === 'native').toBe(meta?.seedMode === 'sync')
  })

  it('only Forever is sync-seeded', () => {
    const syncNames = [...SUPPORTED_EXPANSIONS].filter((name) => getExpansionMeta(name)?.seedMode === 'sync')
    expect(syncNames).toEqual(['Forever'])
  })

  it.each([...SUPPORTED_EXPANSIONS])('round trip: getExpansionDefinition(%s) matches its registry entry', (name) => {
    const meta = getExpansionMeta(name)
    const definition = getExpansionDefinition(name)
    expect(definition).not.toBeNull()
    expect(definition?.seedMode).toBe(meta?.seedMode)
    expect(definition?.slug).toBe(meta?.slug)
    expect(definition?.game).toBe(getExpansionGame(name))
  })

  it.each(TWELVE_EXPANSIONS.map((entry) => entry.name))('registry game for %s equals getExpansionGame', (name) => {
    expect(getExpansionMeta(name)?.game ?? null).toBe(getExpansionGame(name))
  })

  it('the six retail names have no game in the registry', () => {
    const retail = TWELVE_EXPANSIONS.filter((entry) => !entry.hasData).map((entry) => entry.name)
    expect(retail).toHaveLength(6)
    for (const name of retail) {
      expect(getExpansionMeta(name)?.game).toBeNull()
      expect(getExpansionGame(name)).toBeNull()
    }
  })

  it.each(LEGACY_NAMES)('legacy catalog for %s defaults an unknown item to Unlimited and no roles', (name) => {
    const catalog = getExpansionCatalog(name)
    expect(catalog?.kind).toBe('legacy')
    if (catalog?.kind !== 'legacy') return
    expect(catalog.classify('No Such Item')).toBe('Unlimited')
    expect(catalog.rolesFor('No Such Item')).toEqual([])
  })
})

describe('exact-name guard', () => {
  const NEAR_MISSES: unknown[] = ['forever', 'classic', 'constructor', '__proto__', 'toString', '', undefined, 42]

  it.each(NEAR_MISSES.map((value) => [String(value), value] as const))(
    '[E-EXPN-02 adjacency] %j resolves to no meta, catalog or definition',
    (_label, value) => {
      expect(getExpansionMeta(value)).toBeNull()
      expect(getExpansionCatalog(value)).toBeNull()
      expect(getExpansionDefinition(value)).toBeNull()
      expect(isSupportedExpansion(value)).toBe(false)
    }
  )
})

describe('names without data', () => {
  it('[E-EXPN-02 empty] a hasData-false retail name has a meta row but no definition and no catalog', () => {
    expect(getExpansionMeta('Legion')?.hasData).toBe(false)
    expect(getExpansionDefinition('Legion')).toBeNull()
    expect(getExpansionCatalog('Legion')).toBeNull()
    expect(isSupportedExpansion('Legion')).toBe(false)
  })

  it('[E-EXPN-02 empty] an unknown name resolves to nothing at all', () => {
    expect(getExpansionMeta('Nope')).toBeNull()
    expect(getExpansionDefinition('Nope')).toBeNull()
    expect(getExpansionCatalog('Nope')).toBeNull()
  })

  it.each(['Legion', 'Nope'])('[E-EXPN-02 empty] seedExpansionForGuild(%s) returns the CP-09 message and never calls from()', async (name) => {
    const fromCalls: string[] = []
    const recordingClient = {
      from: vi.fn((table: string) => {
        fromCalls.push(table)
        throw new Error(`unexpected from(${table})`)
      }),
      rpc: vi.fn(),
    } as unknown as SupabaseClient

    const result = await seedExpansionForGuild(recordingClient, 'guild-1', name)

    expect(result.expansionId).toBe('')
    expect(result.error).toMatch(new RegExp(`^No data available for ${name} yet\\. Currently supported: `))
    expect(result.error).toContain('Please select one of these or wait for other expansion data to be added.')
    expect(fromCalls).toEqual([])
    expect(recordingClient.rpc).not.toHaveBeenCalled()
  })
})

describe('client-safe files stay client-safe', () => {
  const CLIENT_SAFE_FILES = [
    'data/expansions/registry.ts',
    'data/expansions/types.ts',
    'data/expansions/forever/manifest.ts',
    'data/expansions/forever/lookup.ts',
  ]

  it('findClientUnsafeImports flags runtime zod, catalogs, raid files, services and Supabase, and skips type-only imports', () => {
    const unsafe = `
      import { z } from 'zod'
      import { getExpansionCatalog } from '@/data/expansions/catalogs'
      import { classicRaids } from '@/data/classic-wow-raids'
      import { seedExpansionForGuild } from '@/app/services/expansionSeeder'
      import { createClient } from '@/utils/supabase/server'
    `
    expect(findClientUnsafeImports(unsafe)).toHaveLength(5)

    const safe = `
      import type { ExpansionManifest } from '@/domain/expansion/manifest-schema'
      import type { z } from 'zod'
      export type { ExpansionMeta } from '@/data/expansions/types'
      import { EXPANSION_GAMES } from '@/domain/expansion/game'
    `
    expect(findClientUnsafeImports(safe)).toEqual([])
  })

  it.each(CLIENT_SAFE_FILES)('%s has no import a client bundle cannot take', (file) => {
    const source = readSource(file)
    // A scan that finds no imports at all would pass vacuously.
    expect(findRuntimeImports(source).length + (source.match(/import type/g)?.length ?? 0)).toBeGreaterThan(0)
    expect(findClientUnsafeImports(source)).toEqual([])
  })
})

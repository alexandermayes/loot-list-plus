/**
 * Parser for Master Sheet "Items" tab (Loot List sheet).
 * Column-based CSV with item configuration data.
 */

import { parseCSV } from './csv-parser'
import { specMapping, type Role } from '@/domain/loot/spec-role-mapping'

export interface SheetLootItem {
  available: boolean
  name: string
  baseName: string // Name with Offspec suffix stripped
  isOffspec: boolean
  offspecNumber: number | null
  primaryClass: string
  secondaryClass: string
  category: string // Item slot
  raid: string
  classification: string
  prioritySpec?: string
  priorityClasses?: string
}

export interface MatchedItem {
  sheetItem: SheetLootItem
  dbItem: { id: string; name: string; item_slot: string; raid_tier_name: string; classification: string; is_available: boolean }
  updates: {
    classification?: string
    is_available?: boolean
  }
  specEntries: SpecEntry[]
}

export interface SpecEntry {
  spec_name: string // Combined name like "Holy Paladin"
  spec_type: 'primary' | 'secondary'
}

export interface ItemParseResult {
  matched: MatchedItem[]
  unmatched: SheetLootItem[]
}

// Column header detection
const HEADER_PATTERNS: Record<string, string[]> = {
  available: ['available', 'active', 'enabled'],
  name: ['name', 'item', 'item name'],
  primaryClass: ['primary class', 'primary', 'main spec', 'ms class', 'primary spec'],
  secondaryClass: ['secondary class', 'secondary', 'off spec', 'os class', 'secondary spec'],
  category: ['category', 'slot', 'item slot', 'type'],
  raid: ['raid', 'raid name', 'instance', 'dungeon', 'source'],
  classification: ['classification', 'class', 'tier', 'rarity'],
  prioritySpec: ['priority', 'priority spec', 'priority override'],
  priorityClasses: ['priority classes', 'priority class override'],
}

function detectColumns(headers: string[]): Record<string, number> {
  const indices: Record<string, number> = {}
  const lowerHeaders = headers.map(h => h.toLowerCase().trim())

  for (const [field, patterns] of Object.entries(HEADER_PATTERNS)) {
    for (const pattern of patterns) {
      const idx = lowerHeaders.indexOf(pattern)
      if (idx >= 0) {
        indices[field] = idx
        break
      }
    }
  }

  // Fallback: if classification wasn't found but "class" matches col G (not primary/secondary)
  if (!('classification' in indices)) {
    const classIdx = lowerHeaders.indexOf('class')
    if (classIdx >= 0 && classIdx !== indices.primaryClass && classIdx !== indices.secondaryClass) {
      indices.classification = classIdx
    }
  }

  return indices
}

/**
 * Find the header row by scanning for a row that contains "Name" and "Available".
 * The Master Sheet format has instructional rows before the actual column headers.
 */
function findHeaderRow(rows: string[][]): number {
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const lowerRow = rows[i].map(c => c.toLowerCase().trim())
    if (lowerRow.includes('name') && (lowerRow.includes('available') || lowerRow.includes('classification'))) {
      return i
    }
  }
  return 0 // Fallback to first row
}

/**
 * Parse the Items tab CSV into structured sheet items.
 */
export function parseItemsTab(csv: string): SheetLootItem[] {
  const rows = parseCSV(csv)
  if (rows.length < 2) return []

  const headerIdx = findHeaderRow(rows)
  const headers = rows[headerIdx]
  const cols = detectColumns(headers)

  // Validate required columns
  if (!('name' in cols)) {
    const foundHeaders = headers.slice(0, 10).map(h => `"${h}"`).join(', ')
    throw new Error(
      `Items CSV must have a "Name" column. Found headers: ${foundHeaders}`
    )
  }

  const items: SheetLootItem[] = []

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i]
    const rawName = row[cols.name]?.trim()
    if (!rawName) continue

    // Parse offspec suffix
    const offspecMatch = rawName.match(/^(.+?)\s+Offspec\s*(\d+)$/i)
    const baseName = offspecMatch ? offspecMatch[1].trim() : rawName
    const isOffspec = !!offspecMatch
    const offspecNumber = offspecMatch ? parseInt(offspecMatch[2]) : null

    // Parse available field
    let available = true
    if ('available' in cols) {
      const val = row[cols.available]?.toLowerCase().trim()
      available = val !== 'false' && val !== '0' && val !== 'no'
    }

    // Parse classification
    let classification = 'Unlimited'
    if ('classification' in cols) {
      const raw = row[cols.classification]?.trim()
      if (raw) {
        const lower = raw.toLowerCase()
        if (lower === 'reserved' || lower === 'r') classification = 'Reserved'
        else if (lower === 'limited' || lower === 'l') classification = 'Limited'
        else if (lower === 'unlimited' || lower === 'u') classification = 'Unlimited'
        else classification = raw // Preserve as-is if not recognized
      }
    }

    items.push({
      available,
      name: rawName,
      baseName,
      isOffspec,
      offspecNumber,
      primaryClass: row[cols.primaryClass]?.trim() || '',
      secondaryClass: row[cols.secondaryClass]?.trim() || '',
      category: row[cols.category]?.trim() || '',
      raid: row[cols.raid]?.trim() || '',
      classification,
      prioritySpec: 'prioritySpec' in cols ? row[cols.prioritySpec]?.trim() : undefined,
      priorityClasses: 'priorityClasses' in cols ? row[cols.priorityClasses]?.trim() : undefined,
    })
  }

  return items
}

/**
 * Resolve a class shorthand string to spec names.
 *
 * Input formats:
 * - "Physical" → all physical DPS specs
 * - "Caster, PPal" → all caster specs + Protection Paladin
 * - "Healer" → all healer specs
 * - "All" → all specs
 * - "Druid" → all Druid specs
 * - "Frl" → Feral Druid
 * - "HPal" → Holy Paladin
 * - Comma-separated mix of the above
 */
export function resolveClassShorthand(classStr: string): string[] {
  if (!classStr || classStr.trim() === '') return []

  const parts = classStr.split(',').map(p => p.trim()).filter(Boolean)
  const resolved = new Set<string>()

  for (const part of parts) {
    const lower = part.toLowerCase()

    // Role keywords
    if (lower === 'all') {
      Object.keys(specMapping).forEach(name => resolved.add(name))
      continue
    }
    if (lower === 'physical' || lower === 'physical dps' || lower === 'melee') {
      resolveRole('physical').forEach(name => resolved.add(name))
      continue
    }
    if (lower === 'caster' || lower === 'caster dps' || lower === 'ranged') {
      resolveRole('caster').forEach(name => resolved.add(name))
      continue
    }
    if (lower === 'healer' || lower === 'healers') {
      resolveRole('healer').forEach(name => resolved.add(name))
      continue
    }
    if (lower === 'tank' || lower === 'tanks') {
      resolveRole('tank').forEach(name => resolved.add(name))
      continue
    }

    // Try shorthand match
    const shorthandMatch = findByShorthand(part)
    if (shorthandMatch) {
      resolved.add(shorthandMatch)
      continue
    }

    // Try class name match (all specs for that class), including aliases
    const classAliases: Record<string, string> = {
      'dk': 'death knight',
      'pally': 'paladin',
      'pal': 'paladin',
      'sham': 'shaman',
      'lock': 'warlock',
      'war': 'warrior',
    }
    const resolvedClass = classAliases[lower] || lower
    const classSpecs = Object.entries(specMapping).filter(
      ([_, info]) => info.class.toLowerCase() === resolvedClass
    )
    if (classSpecs.length > 0) {
      classSpecs.forEach(([name]) => resolved.add(name))
      continue
    }

    // Try full spec name match
    const fullMatch = Object.keys(specMapping).find(
      name => name.toLowerCase() === lower
    )
    if (fullMatch) {
      resolved.add(fullMatch)
    }
  }

  return Array.from(resolved)
}

function resolveRole(role: Role): string[] {
  return Object.entries(specMapping)
    .filter(([_, info]) => info.roles.includes(role))
    .map(([name]) => name)
}

function findByShorthand(shorthand: string): string | null {
  const lower = shorthand.toLowerCase()
  for (const [specName, info] of Object.entries(specMapping)) {
    if (!info.shorthand) continue
    const shorthands = Array.isArray(info.shorthand) ? info.shorthand : [info.shorthand]
    if (shorthands.some(s => s.toLowerCase() === lower)) {
      return specName
    }
  }
  return null
}

/**
 * Normalize an item name for matching.
 * Preserves (Heroic)/(Normal) suffixes since DB stores them as separate items.
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[''\u2019]/g, "'") // Normalize fancy quotes
    .replace(/[^\w\s'()]/g, '') // Remove non-word chars except apostrophes and parens
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Normalize a raid name for matching.
 */
function normalizeRaidName(name: string): string {
  const aliases: Record<string, string> = {
    'gruuls lair': "gruul's lair",
    'gruul': "gruul's lair",
    'magtheridons lair': "magtheridon's lair",
    'magtheridon': "magtheridon's lair",
    'mag': "magtheridon's lair",
    'ssc': 'serpentshrine cavern',
    'tk': 'tempest keep: the eye',
    'tempest keep': 'tempest keep: the eye',
    'the eye': 'tempest keep: the eye',
    'bt': 'black temple',
    'hyjal': 'hyjal summit',
    'mount hyjal': 'hyjal summit',
    'za': "zul'aman",
    'zulaman': "zul'aman",
    'swp': 'sunwell plateau',
    'sunwell': 'sunwell plateau',
    'kara': 'karazhan',
    'naxx': 'naxxramas',
    'bwl': 'blackwing lair',
    'mc': 'molten core',
    'aq40': "temple of ahn'qiraj",
    'aq20': "ruins of ahn'qiraj",
    'zg': "zul'gurub",
    'ony': "onyxia's lair",
    'onyxia': "onyxia's lair",
    'voa': 'vault of archavon',
    'os': 'obsidian sanctum',
    'eoe': 'eye of eternity',
    'toc': 'trial of the crusader',
    'icc': 'icecrown citadel',
    'rs': 'ruby sanctum',
    'bwd': 'blackwing descent',
    'bot': 'the bastion of twilight',
    'tot4w': 'throne of the four winds',
    'fl': 'firelands',
    'ds': 'dragon soul',
    'msv': "mogu'shan vaults",
    'hof': 'heart of fear',
    'toes': 'terrace of endless spring',
    'tot': 'throne of thunder',
    'soo': 'siege of orgrimmar',
  }

  let normalized = name.toLowerCase().replace(/['']/g, "'").trim()

  // Strip difficulty suffixes like "Both", "Heroic", "Normal", "10", "25"
  normalized = normalized
    .replace(/\s+(both|heroic|normal|10|25|10n|25n|10h|25h)\s*$/i, '')
    .trim()

  return aliases[normalized.replace(/'/g, '')] || aliases[normalized] || normalized
}

/**
 * Normalize a slot/category name for matching.
 */
function normalizeSlot(slot: string): string {
  const aliases: Record<string, string> = {
    'weapon': 'weapon',
    'off hand': 'off hand',
    'offhand': 'off hand',
    'off-hand': 'off hand',
    'shield': 'off hand',
    'ranged': 'ranged',
    'relic': 'relic',
    'back': 'back',
    'cloak': 'back',
    'cape': 'back',
    'chest': 'chest',
    'feet': 'feet',
    'boots': 'feet',
    'hands': 'hands',
    'gloves': 'hands',
    'head': 'head',
    'helm': 'head',
    'helmet': 'head',
    'legs': 'legs',
    'leggings': 'legs',
    'neck': 'neck',
    'necklace': 'neck',
    'ring': 'ring',
    'finger': 'ring',
    'shoulder': 'shoulder',
    'shoulders': 'shoulder',
    'trinket': 'trinket',
    'waist': 'waist',
    'belt': 'waist',
    'wrist': 'wrist',
    'bracer': 'wrist',
    'bracers': 'wrist',
    'mount': 'mount',
  }

  const lower = slot.toLowerCase().trim()
  return aliases[lower] || lower
}

interface DbLootItem {
  id: string
  name: string
  item_slot: string
  raid_tier_name: string
  classification: string
  is_available: boolean
}

/**
 * Match sheet items to DB items using normalized name + raid + slot.
 */
export function matchItemsToDb(
  sheetItems: SheetLootItem[],
  dbItems: DbLootItem[]
): ItemParseResult {
  const matched: MatchedItem[] = []
  const unmatched: SheetLootItem[] = []

  // Build lookup indices on DB items
  const byNormalizedName = new Map<string, DbLootItem[]>()
  for (const item of dbItems) {
    const key = normalizeName(item.name)
    if (!byNormalizedName.has(key)) byNormalizedName.set(key, [])
    byNormalizedName.get(key)!.push(item)
  }

  // Debug: log a few lookups
  let debugCount = 0

  for (const sheetItem of sheetItems) {
    const normalizedBase = normalizeName(sheetItem.baseName)
    if (debugCount < 3) {
      const found = byNormalizedName.has(normalizedBase)
      console.log(`[match] "${sheetItem.baseName}" -> "${normalizedBase}" found=${found}`)
      if (!found) {
        // Show first 3 DB keys for comparison
        const keys = Array.from(byNormalizedName.keys()).slice(0, 3)
        console.log(`[match] DB keys sample:`, keys)
      }
      debugCount++
    }
    const normalizedRaid = normalizeRaidName(sheetItem.raid)
    const normalizedSlot = normalizeSlot(sheetItem.category)

    let dbItem: DbLootItem | undefined

    // 1. Match by exact normalized name
    const nameMatches = byNormalizedName.get(normalizedBase)

    if (nameMatches) {
      if (nameMatches.length === 1) {
        // Unique name match
        dbItem = nameMatches[0]
      } else {
        // Multiple matches, try to narrow by raid
        const raidMatch = nameMatches.find(
          item => normalizeRaidName(item.raid_tier_name) === normalizedRaid
        )
        if (raidMatch) {
          dbItem = raidMatch
        } else {
          // Try slot as tiebreaker
          const slotMatch = nameMatches.find(
            item => normalizeSlot(item.item_slot) === normalizedSlot
          )
          dbItem = slotMatch || nameMatches[0]
        }
      }
    }

    if (!dbItem) {
      // 2. Fallback: fuzzy match on name within same raid
      for (const candidate of dbItems) {
        if (normalizeRaidName(candidate.raid_tier_name) !== normalizedRaid) continue
        if (normalizeName(candidate.name) === normalizedBase) {
          dbItem = candidate
          break
        }
      }
    }

    if (dbItem) {
      // Determine what to update
      const updates: MatchedItem['updates'] = {}

      if (sheetItem.classification !== dbItem.classification) {
        updates.classification = sheetItem.classification
      }
      if (sheetItem.available !== dbItem.is_available) {
        updates.is_available = sheetItem.available
      }

      // Resolve spec entries from class strings
      const specEntries: SpecEntry[] = []

      // Primary class → primary specs
      const primarySpecs = resolveClassShorthand(sheetItem.primaryClass)
      for (const specName of primarySpecs) {
        specEntries.push({ spec_name: specName, spec_type: 'primary' })
      }

      // For offspec items, use Secondary Class column as secondary
      // For non-offspec items with Secondary Class, use as secondary
      if (sheetItem.secondaryClass) {
        const secondarySpecs = resolveClassShorthand(sheetItem.secondaryClass)
        for (const specName of secondarySpecs) {
          // Don't duplicate if already in primary
          if (!primarySpecs.includes(specName)) {
            specEntries.push({ spec_name: specName, spec_type: 'secondary' })
          }
        }
      }

      matched.push({ sheetItem, dbItem, updates, specEntries })
    } else {
      unmatched.push(sheetItem)
    }
  }

  return { matched, unmatched }
}

/**
 * Roster name matching — turn pasted raid names into guild characters.
 *
 * Shared by the raid-tracking import and the bulk raider bonus modal, so a
 * paste matches the same raiders in both places. Pure functions. No I/O.
 *
 * Matching is case-insensitive on the character name first, then on a saved
 * alias (alias_name is stored lowercase). An alias only counts when its
 * character is in the roster passed in.
 */

export interface RosterAlias {
  alias_name: string
  character_id: string
}

export type RosterMatchVia = 'name' | 'alias'

export interface RosterMatch<T> {
  member: T
  id: string
  via: RosterMatchVia
}

export interface RosterMatcher<T> {
  resolve(name: string): RosterMatch<T> | null
}

/**
 * Split pasted text into character names.
 * Handles MRT/attendance formats like:
 * "21/01/2026 01:58:11 - Throne of Thunder6" (header - skipped)
 * "Alphafold    x" -> "Alphafold"
 * "Brewenjoyer    x" -> "Brewenjoyer"
 * Splits on newlines, commas and semicolons; drops empty names and names over
 * 50 characters. Does not dedupe.
 */
export function parseRosterNames(text: string): string[] {
  return text
    .trim()
    .split(/[\n,;]+/)
    .map(entry => {
      const line = entry.trim()
      // Skip header lines (contain date pattern or " - ")
      if (line.match(/\d{2}\/\d{2}\/\d{4}/) || line.includes(' - ')) {
        return ''
      }
      // Strip the "x" marker and any surrounding whitespace
      // Handle formats: "Name    x", "Name"
      return line
        .replace(/\s+x\s*$/i, '')  // Remove trailing "x" with whitespace
        .trim()
    })
    .filter(name => name.length > 0 && name.length <= 50)
}

/**
 * Build a matcher over a roster and its aliases. Lookups are built once.
 * With duplicate roster names or duplicate aliases, the first one wins (the
 * same as a linear find).
 */
export function createRosterMatcher<T>(
  roster: T[],
  aliases: RosterAlias[],
  getId: (m: T) => string,
  getName: (m: T) => string,
): RosterMatcher<T> {
  const byName = new Map<string, T>()
  const byId = new Map<string, T>()
  for (const member of roster) {
    const nameLower = getName(member).toLowerCase()
    if (!byName.has(nameLower)) byName.set(nameLower, member)
    const id = getId(member)
    if (!byId.has(id)) byId.set(id, member)
  }
  const aliasToId = new Map<string, string>()
  for (const alias of aliases) {
    if (!aliasToId.has(alias.alias_name)) aliasToId.set(alias.alias_name, alias.character_id)
  }

  return {
    resolve(name: string): RosterMatch<T> | null {
      const nameLower = name.toLowerCase()
      const direct = byName.get(nameLower)
      if (direct) return { member: direct, id: getId(direct), via: 'name' }
      const aliasId = aliasToId.get(nameLower)
      if (aliasId != null) {
        const aliased = byId.get(aliasId)
        if (aliased) return { member: aliased, id: getId(aliased), via: 'alias' }
      }
      return null
    },
  }
}

/**
 * Resolve a list of names once each. A name repeated (any case) or a second
 * name that resolves to an already matched character counts as repeated and
 * is ignored. Unmatched names keep their first spelling.
 */
export function matchRosterNames<T>(
  names: string[],
  matcher: RosterMatcher<T>,
): { matched: { name: string; member: T; id: string; via: RosterMatchVia }[]; unmatched: string[]; repeatedCount: number } {
  const seenNames = new Set<string>()
  const seenIds = new Set<string>()
  const matched: { name: string; member: T; id: string; via: RosterMatchVia }[] = []
  const unmatched: string[] = []
  let repeatedCount = 0

  for (const name of names) {
    const nameLower = name.toLowerCase()
    if (seenNames.has(nameLower)) {
      repeatedCount++
      continue
    }
    seenNames.add(nameLower)

    const hit = matcher.resolve(name)
    if (!hit) {
      unmatched.push(name)
      continue
    }
    if (seenIds.has(hit.id)) {
      repeatedCount++
      continue
    }
    seenIds.add(hit.id)
    matched.push({ name, member: hit.member, id: hit.id, via: hit.via })
  }

  return { matched, unmatched, repeatedCount }
}

/**
 * Count matches name by name, without deduping (the raid import preview):
 * total is names.length, and each name is a direct match, an alias match or
 * unmatched.
 */
export function countRosterMatches<T>(
  names: string[],
  matcher: RosterMatcher<T>,
): { total: number; matched: number; aliasMatched: number; unmatched: number } {
  let matched = 0
  let aliasMatched = 0
  let unmatched = 0
  for (const name of names) {
    const hit = matcher.resolve(name)
    if (!hit) unmatched++
    else if (hit.via === 'name') matched++
    else aliasMatched++
  }
  return { total: names.length, matched, aliasMatched, unmatched }
}

/** Simple string similarity: longest common substring ratio. */
export function nameSimilarity(a: string, b: string): number {
  const al = a.toLowerCase()
  const bl = b.toLowerCase()
  if (al === bl) return 1
  let longest = 0
  for (let i = 0; i < al.length; i++) {
    for (let j = 0; j < bl.length; j++) {
      let k = 0
      while (i + k < al.length && j + k < bl.length && al[i + k] === bl[j + k]) k++
      if (k > longest) longest = k
    }
  }
  return longest / Math.max(al.length, bl.length)
}

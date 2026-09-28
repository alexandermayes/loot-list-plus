/**
 * Build and encode a Gargul-compatible SoftRes export payload.
 *
 * Gargul's importer (Classes/SoftRes.lua → importGargulData) expects a string
 * that is base64(zlib(JSON)). The JSON must contain:
 *   - metadata.id  (truthy string)
 *   - softreserves  (array of { name, class, note, plusOnes, items: [{ id }] })
 *   - hardreserves  (array of { id, for, note })
 *
 * Class names must match Gargul's Constants.Classes keys — all lowercase,
 * with spaces for multi-word classes ("death knight", "demon hunter").
 */

// ─── Types ──────────────────────────────────────────────────

export interface GargulSoftReserve {
  name: string
  class: string
  note: string
  plusOnes: number
  items: { id: number }[]
}

export interface GargulHardReserve {
  id: number
  for: string
  note: string
}

export interface GargulMetadata {
  id: string
  createdAt: number
  updatedAt: number
  discordUrl: string
  hidden: boolean
  url: string
  raidStartsAt: number
}

export interface GargulPayload {
  metadata: GargulMetadata
  softreserves: GargulSoftReserve[]
  hardreserves: GargulHardReserve[]
  instances: string[]
}

// ─── Helpers ────────────────────────────────────────────────

/**
 * Normalize a WoW class name to the form Gargul's Constants.Classes accepts.
 */
export function normalizeClassForGargul(raw: string): string {
  const lower = (raw || '').toLowerCase().trim()
  if (lower === 'deathknight' || lower === 'death-knight') return 'death knight'
  if (lower === 'demonhunter' || lower === 'demon-hunter') return 'demon hunter'
  return lower
}

// ─── Encode ─────────────────────────────────────────────────

/**
 * Encode a GargulPayload into the base64(zlib(JSON)) string that Gargul
 * accepts via /gl sr → Import → paste.
 */
export async function encodeGargulExport(payload: GargulPayload): Promise<string> {
  const json = JSON.stringify(payload)
  // CompressionStream('deflate') emits zlib-wrapped deflate (RFC 1950),
  // which matches LibDeflate:DecompressZlib in Gargul.
  const stream = new Blob([json]).stream().pipeThrough(new CompressionStream('deflate'))
  const compressed = new Uint8Array(await new Response(stream).arrayBuffer())
  // Base64 encode in chunks to avoid argument-length limits on large payloads.
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < compressed.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(compressed.subarray(i, i + chunk)))
  }
  return btoa(binary)
}

/**
 * Decode a Gargul export string back into the JSON payload.
 * Useful for testing round-trip correctness.
 */
export async function decodeGargulExport(base64: string): Promise<GargulPayload> {
  const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'))
  const json = await new Response(stream).text()
  return JSON.parse(json) as GargulPayload
}

// ─── Payload builders (GH #290) ────────────────────────────────
//
// Faction-variant items (Head of Nefarian 19002/19003, Head of Onyxia
// 18422/18423, see domain/loot/faction-item-aliases.ts) are NEVER mirrored
// here, unlike the LootList+ addon exports (guild-data, export-string).
// Gargul's SoftRes:byItemID and SoftRes:playerReservesOnItem both iterate
// GL:getLinkedItemsForID(itemID, true), which walks Data/ItemLinks.lua and
// sums or lists the reserves of every linked id together (18422 links
// 18423, 19002 links 19003). A mirrored reservation would double: the same
// player's reserve would show as "(2x)" in Gargul's UI and count twice
// against roll standing. Hard reserves already match through the same
// linked-id lookup (IDIsHardReserved), so nothing needs mirroring there
// either. Each builder below emits only the id the guild's data holds.
//
// https://github.com/papa-smurf/Gargul/blob/master/Data/ItemLinks.lua
// https://github.com/papa-smurf/Gargul/blob/master/Utils/Items.lua
// https://github.com/papa-smurf/Gargul/blob/master/Classes/SoftRes.lua

/**
 * Builds the Gargul soft-reserve payload from raw submissions. A submission
 * item id ("id" is the loot_items uuid) resolves through `itemsById` to its
 * wowhead_id; unresolvable ids and non-positive wowhead ids are dropped. A
 * submission left with no resolvable items is omitted entirely.
 */
export function buildGargulSoftReserves(
  submissions: ReadonlyArray<{ character_name: string; character_class: string; items: readonly string[] }>,
  itemsById: ReadonlyMap<string, { wowhead_id: number | null }>
): GargulSoftReserve[] {
  const result: GargulSoftReserve[] = []
  for (const sub of submissions) {
    const items = sub.items
      .map(id => itemsById.get(id)?.wowhead_id)
      .filter((n): n is number => typeof n === 'number' && n > 0)
      .map(id => ({ id }))
    if (items.length === 0) continue
    result.push({
      name: sub.character_name,
      class: normalizeClassForGargul(sub.character_class),
      note: '',
      plusOnes: 0,
      items,
    })
  }
  return result
}

/**
 * Builds the Gargul hard-reserve payload. Entries whose item is missing or
 * has a falsy wowhead_id are skipped; a missing `reserved_for` maps to ''.
 */
export function buildGargulHardReserves(
  hardReserves: ReadonlyArray<{ loot_item_id: string; reserved_for?: string | null }>,
  itemsById: ReadonlyMap<string, { wowhead_id: number | null }>
): GargulHardReserve[] {
  const result: GargulHardReserve[] = []
  for (const hr of hardReserves) {
    const item = itemsById.get(hr.loot_item_id)
    if (!item?.wowhead_id) continue
    result.push({
      id: item.wowhead_id,
      for: hr.reserved_for || '',
      note: '',
    })
  }
  return result
}

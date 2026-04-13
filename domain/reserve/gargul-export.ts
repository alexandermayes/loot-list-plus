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

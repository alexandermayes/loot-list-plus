/**
 * Build the Gargul DFT (Dynamic Format Tooltip) prio export string.
 *
 * DFT format (one block per item, separated by newlines):
 *   "<wowheadId>^DFTFC <header>:\n<line1>\n<line2>...;"
 *
 * Each line is:
 *   |cffRRGGBB <playerName>|r: <score>
 *
 * After WoW EditBox escaping (| -> ||), Gargul's parser:
 *   strsub(line, 12) skips the 11-char escaped color prefix (||cffXXXXXX)
 *   gsub("|r: ", "") strips the color reset, then explode(line, "|") splits name from score.
 * DFT sorts descending (highest score first) and supports a custom header label.
 *
 * Grouping rule: a single physical WoW item (e.g. Nether Vortex, wowhead_id
 * 30183) may appear as multiple `loot_items` rows when it drops in more than
 * one raid (SSC + TK). Gargul keys by wowhead id and only keeps one block per
 * id, so all rankings sharing a wowhead_id collapse into a single block.
 *
 * Per-character entries are NOT deduped. If a raider deliberately ranked both
 * copies (e.g. one slot for the weapon recipe, one for the belt recipe), they
 * appear twice in the Gargul prio so the officer can award them each drop.
 * This treats two distinct rankings as the explicit signal it is.
 */

export interface GargulDftRankingEntry {
  character_id: string
  player_name: string
  class_color: string
  loot_score: number
}

export interface GargulDftItemRankings {
  item: { wowhead_id: number }
  rankings: GargulDftRankingEntry[]
}

export function formatRankingsForGargul(
  itemRankings: readonly GargulDftItemRankings[],
  decimalPlaces: number
): string {
  // Group by wowhead id; preserve every ranking so raiders who ranked the
  // same wowhead in more than one row appear once per ranking.
  const byWowheadId = new Map<number, GargulDftRankingEntry[]>()
  for (const ir of itemRankings) {
    const wowheadId = ir.item.wowhead_id
    if (!wowheadId || wowheadId <= 0) continue
    if (ir.rankings.length === 0) continue

    let entries = byWowheadId.get(wowheadId)
    if (!entries) {
      entries = []
      byWowheadId.set(wowheadId, entries)
    }
    entries.push(...ir.rankings)
  }

  const blocks: string[] = []
  for (const [wowheadId, entries] of byWowheadId) {
    if (entries.length === 0) continue
    const sorted = entries.slice().sort((a, b) => b.loot_score - a.loot_score)
    const playerLines = sorted
      .map(r => {
        const colorHex = r.class_color.replace('#', '')
        return `|cff${colorHex} ${r.player_name}|r: ${r.loot_score.toFixed(decimalPlaces)}`
      })
      .join('\n')
    blocks.push(`"${wowheadId}^DFTFC LootList+ Score:\n${playerLines};"`)
  }

  return blocks.join('\n')
}

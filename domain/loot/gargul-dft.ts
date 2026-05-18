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
 * Dedupe rule: a single physical WoW item (e.g. Nether Vortex, wowhead_id 30183)
 * may appear as multiple `loot_items` rows when it drops in more than one raid
 * (SSC + TK). Gargul keys by wowhead id and only keeps one block per id, so we
 * must merge all rankings sharing a wowhead_id into a single block. When the
 * same character has ranked the item in multiple rows, keep their highest
 * loot_score so Gargul shows their best prio.
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
  // Group by wowhead id, keeping each character's highest score across rows.
  const byWowheadId = new Map<number, Map<string, GargulDftRankingEntry>>()
  for (const ir of itemRankings) {
    const wowheadId = ir.item.wowhead_id
    if (!wowheadId || wowheadId <= 0) continue
    if (ir.rankings.length === 0) continue

    let bestByChar = byWowheadId.get(wowheadId)
    if (!bestByChar) {
      bestByChar = new Map<string, GargulDftRankingEntry>()
      byWowheadId.set(wowheadId, bestByChar)
    }
    for (const r of ir.rankings) {
      const existing = bestByChar.get(r.character_id)
      if (!existing || r.loot_score > existing.loot_score) {
        bestByChar.set(r.character_id, r)
      }
    }
  }

  const blocks: string[] = []
  for (const [wowheadId, bestByChar] of byWowheadId) {
    if (bestByChar.size === 0) continue
    const merged = Array.from(bestByChar.values()).sort(
      (a, b) => b.loot_score - a.loot_score
    )
    const playerLines = merged
      .map(r => {
        const colorHex = r.class_color.replace('#', '')
        return `|cff${colorHex} ${r.player_name}|r: ${r.loot_score.toFixed(decimalPlaces)}`
      })
      .join('\n')
    blocks.push(`"${wowheadId}^DFTFC LootList+ Score:\n${playerLines};"`)
  }

  return blocks.join('\n')
}

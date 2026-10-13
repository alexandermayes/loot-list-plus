/**
 * Discord post-raid summary helpers.
 *
 * Lives in lib/ rather than the route file because a Next.js route file may
 * only export handlers and route config. Pure functions only: no I/O.
 */

import { wowheadItemUrl } from '@/domain/expansion/wowhead'

export interface RaidSummaryLootLineArgs {
  itemName: string | null
  wowheadId: number | null
  characterName: string
  expansionName: string | null
}

/**
 * Formats one loot line for the post-raid summary embed.
 *
 * With a wowheadId the item name is a markdown link; without one it is plain
 * text ('Unknown Item' when the name is missing too). Applied per row with
 * Array.map, so the lines keep their input order.
 *
 * The 'classic' argument to wowheadItemUrl preserves the summary link every
 * non-Forever guild gets today (recorded decision, owner decision 2). That
 * hardcoded classic domain is wrong for TBC to MoP guilds and is listed as an
 * owner follow-up, not changed here.
 */
export function formatRaidSummaryLootLine({
  itemName,
  wowheadId,
  characterName,
  expansionName,
}: RaidSummaryLootLineArgs): string {
  if (wowheadId) {
    return `[${itemName}](${wowheadItemUrl(expansionName, wowheadId, 'classic')}) → ${characterName}`
  }
  return `${itemName || 'Unknown Item'} → ${characterName}`
}

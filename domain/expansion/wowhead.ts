/**
 * Wowhead URL helpers.
 *
 * Shared by client components (ItemLink, the reserve page) and server code
 * (Discord posts, the bot route). This file must import nothing: client
 * components import it directly, and it must never pull in server code or
 * raid data. URLs are built from the stored wowhead_id only; nothing here
 * fetches from Wowhead or wago.tools.
 */

/** Map expansion display names to wowhead URL/tooltip domains */
const EXPANSION_TO_WOWHEAD_DOMAIN: Record<string, string> = {
  'Classic': 'classic',
  'Classic WoW': 'classic',
  'The Burning Crusade': 'tbc',
  'Wrath of the Lich King': 'wotlk',
  'Cataclysm': 'cata',
  'Mists of Pandaria': 'mop-classic',
  'Forever': 'forever',
  'Warlords of Draenor': 'wow',
  'Legion': 'wow',
  'Battle for Azeroth': 'wow',
  'Shadowlands': 'wow',
  'Dragonflight': 'wow',
  'The War Within': 'wow',
}

export function getWowheadDomain(expansionName: string | undefined | null): string | null {
  if (!expansionName) return null
  return EXPANSION_TO_WOWHEAD_DOMAIN[expansionName] ?? null
}

/**
 * Builds a Discord-facing (or copied) item link.
 *
 * Forever items always use the forever domain. Every other guild keeps the
 * link each call site produced before this helper existed: callers pass the
 * domain they used (for example 'classic' for the raid summary), or nothing
 * for the retail `/item=` form. That is the recorded decision (owner decision
 * 2, 2026-10-13: Forever-only). Era-correct links for Classic-era guilds are
 * an owner opt-in follow-up, and `getWowheadDomain` already holds that era map.
 *
 * The expansion name must match the stored name exactly ('Forever'); a null,
 * undefined, unknown or near-miss name falls through to the caller's link.
 */
export function wowheadItemUrl(
  expansionName: string | null | undefined,
  wowheadId: number,
  nonForeverDomain: string | null = null
): string {
  if (getWowheadDomain(expansionName) === 'forever') {
    return `https://www.wowhead.com/forever/item=${wowheadId}`
  }
  if (nonForeverDomain) {
    return `https://www.wowhead.com/${nonForeverDomain}/item=${wowheadId}`
  }
  return `https://www.wowhead.com/item=${wowheadId}`
}

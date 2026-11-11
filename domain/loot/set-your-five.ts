/**
 * "Set your 5": the one module the Discord message, the Overview card and the
 * deep link entry all read (D-14, D-23, D-24), so the copy and the link shape
 * cannot drift apart.
 *
 * Pure and client-safe: no database, no server imports. The sender route
 * (app/api/discord/set-your-five) and the picker entry import from here.
 */

// DRAFT copy: the owner signs it off in the 04-19 copy review. The title is
// locked (UI-SPEC). No em dash in any of it.
export const SET_YOUR_FIVE_TITLE = 'Set your 5 for Forever raids (1 minute)'
export const SET_YOUR_FIVE_BODY =
  'Pick the five gear needs you want most. Officers review your list before it counts.'
export const SET_YOUR_FIVE_CTA = 'Set my 5'

// Route answers, DRAFT for the same sign-off. They live here, not in the route
// file, because a Next route file may only export handlers and route config,
// and the send row shows the post-failed sentence too.
export const SET_YOUR_FIVE_NOT_OFFICER_ERROR = 'Only officers can send Set your 5'
export const SET_YOUR_FIVE_NO_CHANNEL_ERROR = 'No raid summary channel configured'
export const SET_YOUR_FIVE_NO_DISCOVERY_ERROR = 'Set your 5 is for guilds with Discovery raids.'
export const SET_YOUR_FIVE_COOLDOWN_ERROR = 'Set your 5 was sent in the last hour. Try again later.'
export const SET_YOUR_FIVE_POST_FAILED_ERROR = "Couldn't post in the channel. Try again."

// Canonical origin per app/layout.tsx metadataBase and app/robots.ts.
const DEFAULT_APP_ORIGIN = 'https://www.getlootlist.com'

export function resolveAppOrigin(env: Readonly<Record<string, string | undefined>> = process.env): string {
  const origin = env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_ORIGIN
  return origin.replace(/\/+$/, '')
}

/**
 * The link members open from Discord (D-24). It names the guild and asks for
 * the picker, nothing else: no character id and no token, because the link is
 * visible to everyone in the channel. The page re-checks membership.
 */
export function buildSetYourFiveUrl(origin: string, guildId: string): string {
  return `${origin.replace(/\/+$/, '')}/loot-list?guild=${encodeURIComponent(guildId)}&picker=1`
}

export interface SetYourFiveMessage {
  content: string
  components: Array<{
    type: 1
    components: Array<{ type: 2; style: number; label: string; url: string }>
  }>
  allowed_mentions: { parse: [] }
}

/**
 * The channel post and every DM share this body. Plain content plus one link
 * button (style 5), no embed. Only fixed strings go in, so no user text can
 * reach it, and `allowed_mentions.parse` is empty so nothing can ping anyone.
 */
export function buildSetYourFiveMessage(url: string): SetYourFiveMessage {
  return {
    content: `${SET_YOUR_FIVE_TITLE}\n${SET_YOUR_FIVE_BODY}`,
    components: [
      {
        type: 1,
        components: [{ type: 2, style: 5, label: SET_YOUR_FIVE_CTA, url }],
      },
    ],
    allowed_mentions: { parse: [] },
  }
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface SetYourFiveParams {
  guildId: string | null
  picker: boolean
}

/** Reads the guild and picker parameters of the link; a bad guild id is null. */
export function parseSetYourFiveParams(params: URLSearchParams): SetYourFiveParams {
  const guild = params.get('guild')
  return {
    guildId: guild !== null && UUID_PATTERN.test(guild) ? guild : null,
    picker: params.get('picker') === '1',
  }
}

interface LinkCharacter {
  id: string
  is_main: boolean | null
  created_at: string | null
}

interface LinkMembership<C extends LinkCharacter> {
  guild_id: string
  is_active: boolean
  character: C
}

/**
 * The character the link opens the picker for (D-24): among the member's
 * active characters in that guild, the main first, then the oldest, then the
 * lowest id so the choice is stable.
 */
export function pickLinkCharacter<C extends LinkCharacter>(
  memberships: ReadonlyArray<LinkMembership<C>>,
  guildId: string,
): C | null {
  const candidates = memberships
    .filter((m) => m.guild_id === guildId && m.is_active)
    .map((m) => m.character)
  if (candidates.length === 0) return null

  candidates.sort((a, b) => {
    if (Boolean(a.is_main) !== Boolean(b.is_main)) return a.is_main ? -1 : 1
    const byCreated = (a.created_at ?? '').localeCompare(b.created_at ?? '')
    if (byCreated !== 0) return byCreated
    return a.id.localeCompare(b.id)
  })
  return candidates[0]
}

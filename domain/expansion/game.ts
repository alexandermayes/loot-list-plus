/**
 * Game version — classic or forever.
 *
 * The game version is fixed at guild creation (D-02) and never switched.
 * WoW Forever is still an expansion row internally (D-03): it has its own
 * expansions.name ('Forever') and its own raid tiers, but a guild's game
 * version decides which ladder of expansions it is allowed to see and add.
 *
 * This module is the single source of truth for expansion-to-game mapping
 * (D-05). app/services/expansionSeeder.ts re-exports getExpansionGame and
 * tags every ExpansionDefinition with it, rather than hand-typing 'classic'
 * or 'forever' a second time. This file must import nothing: client
 * components import it directly, and it must never pull in raid data.
 */

export type GameVersion = 'classic' | 'forever'

export const GAME_VERSIONS: readonly GameVersion[] = ['classic', 'forever']

export const GAME_VERSION_LABELS: Record<GameVersion, string> = {
  classic: 'WoW Classic',
  forever: 'WoW Forever',
}

// The stored expansions.name / seeder registry key for WoW Forever.
export const FOREVER_EXPANSION_NAME = 'Forever'

/**
 * Every supported seeder registry key mapped to its game version. The five
 * Classic-line expansions map to 'classic'; Forever maps to 'forever'. This
 * is the single source of truth (D-05) -- the seeder indexes into this map
 * rather than hand-typing a game per definition.
 */
export const EXPANSION_GAMES = {
  Classic: 'classic',
  'The Burning Crusade': 'classic',
  'Wrath of the Lich King': 'classic',
  Cataclysm: 'classic',
  'Mists of Pandaria': 'classic',
  [FOREVER_EXPANSION_NAME]: 'forever',
} as const satisfies Record<string, GameVersion>

export function isGameVersion(value: unknown): value is GameVersion {
  return value === 'classic' || value === 'forever'
}

/**
 * Resolve an expansion name to its game version. Mirrors
 * getExpansionDefinition's guard: only an own, string-typed key of
 * EXPANSION_GAMES resolves, so prototype-pollution names ('constructor',
 * '__proto__', 'toString'), non-string input, and unsupported/retail
 * expansion names all return null.
 */
export function getExpansionGame(name: unknown): GameVersion | null {
  if (typeof name !== 'string' || !Object.prototype.hasOwnProperty.call(EXPANSION_GAMES, name)) {
    return null
  }
  return EXPANSION_GAMES[name as keyof typeof EXPANSION_GAMES]
}

/**
 * Resolve a guild's game version. Reads guild.game only -- never an
 * expansion name or a realm/ruleset string (D-07). A missing, null, or
 * unrecognized value defaults to 'classic' so a stale cached guild object
 * (for example within the 60s user-bundle cache window) never mis-reads as
 * Forever.
 */
export function getGuildGame(guild: { game?: string | null } | null | undefined): GameVersion {
  return guild?.game === 'forever' ? 'forever' : 'classic'
}

/**
 * Resolve the expansion name to submit at signup from the chosen game
 * version and (for Classic) the chosen Classic-line expansion. Forever
 * guilds always submit the Forever expansion row regardless of what the
 * (hidden) Classic expansion state holds.
 */
export function resolveSignupExpansion(game: GameVersion, classicExpansion: string): string {
  return game === 'forever' ? FOREVER_EXPANSION_NAME : classicExpansion
}

/**
 * The signup default game version (D-07). WoW Forever is the default and
 * first-listed tile in both signup pickers, distinct from getGuildGame's
 * classic default for *stored* guilds -- that default protects a stale
 * cached guild object (for example within the 60s user-bundle cache window)
 * from mis-reading as Forever, and is unrelated to what a brand-new signup
 * should default to.
 */
export const DEFAULT_SIGNUP_GAME: GameVersion = 'forever'

/**
 * Parse a `?game=` query value into a signup game version. Only the exact
 * string 'classic' selects Classic; every other value (including 'forever',
 * missing, empty, wrong case, or an unrecognized/hostile string) falls back
 * to DEFAULT_SIGNUP_GAME so an unknown value never blocks signup.
 */
export function parseGameParam(value: string | null | undefined): GameVersion {
  return value === 'classic' ? 'classic' : DEFAULT_SIGNUP_GAME
}

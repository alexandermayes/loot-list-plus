/**
 * Shared helpers for /api/bot/* endpoints called by the LootList+ Discord bot.
 *
 * These endpoints are server-to-server. They authenticate via a shared
 * BOT_API_KEY secret (set on Railway for the bot, on Vercel for this app),
 * not via user cookies — the calling actor is the bot itself, not a logged-in
 * LootList+ user.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { guildHasPaidAccess } from '@/utils/feature-gate'

/**
 * Constant-time comparison of two strings. Slower than `===` only for the
 * length of the shorter string, but avoids leaking timing info to a remote
 * attacker who knows the format.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/**
 * Verifies the bot's `Authorization: Bot <token>` header against BOT_API_KEY.
 * Returns null on success, or a NextResponse error on failure.
 */
export function checkBotAuth(request: Request): NextResponse | null {
  const expected = process.env.BOT_API_KEY
  if (!expected) {
    return NextResponse.json({ error: 'Bot integration not configured' }, { status: 503 })
  }
  const header = request.headers.get('authorization') || ''
  if (!header.toLowerCase().startsWith('bot ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const token = header.slice(4).trim()
  if (!timingSafeEqual(token, expected)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

/**
 * Resolve a LootList+ guild record from a Discord server ID. Returns null
 * if no guild is linked to that Discord server.
 *
 * The schema technically allows multiple LootList+ guilds per Discord server
 * (different raid teams / game versions). For slash commands we pick the
 * oldest active guild linked to the server (created_at, then id to break
 * ties), so the same server always resolves to the same guild. Most installs
 * are 1:1 and this avoids surfacing a disambiguation step in chat.
 *
 * Throws if the query errors, so a database error reaches the caller's catch
 * and answers 500 instead of being read as "no guild linked".
 */
export async function resolveGuildFromDiscord(
  supabase: SupabaseClient,
  discordGuildId: string
): Promise<{ id: string; name: string; active_expansion_id: string | null } | null> {
  const { data, error } = await supabase
    .from('guilds')
    .select('id, name, active_expansion_id, is_active')
    .eq('discord_server_id', discordGuildId)
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (error) {
    throw new Error(`Failed to look up the guild linked to this Discord server: ${error.message}`)
  }
  if (!data) return null
  return { id: data.id, name: data.name, active_expansion_id: data.active_expansion_id }
}

/**
 * The canonical app origin for a user-facing link, matching
 * lib/billing/trial-ending.ts resolveAppOrigin (per app/layout.tsx
 * metadataBase). Read at call time, not at module load, so tests can stub
 * NEXT_PUBLIC_APP_URL. Trailing slashes are removed so callers can append
 * a path with a single slash.
 */
function appOrigin(): string {
  const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://www.getlootlist.com'
  return origin.replace(/\/+$/, '')
}

/**
 * Require LootList+ Premium for the Discord bot's /score and /priority
 * lookups. Null means go on (the guild has Premium); otherwise a 403
 * NextResponse the caller returns as is.
 *
 * Called directly after guild resolution in both routes, before any guild
 * data is read. A thrown read error (guildHasPaidAccess fails closed) is
 * not caught here, so it reaches the route's own catch and answers 500 -
 * a tier read error never answers premium_required and never lets data
 * through.
 *
 * Why 403 and not 402: slice 1 already answers premium_required with 403
 * (utils/feature-gate.ts requireReserveAccess and requireReserveRunPremium),
 * the bot already handles a 403 machine code (rankings_hidden), nothing in
 * the codebase answers 402, and 402 has no settled meaning.
 *
 * `error` is a machine code the bot keys on, same as every other bot route
 * answer (no_guild_linked, item_not_found, rankings_hidden); the human text
 * lives in the bot. `guild_name` is returned raw, as /score already returns
 * it; the bot cleans it for Discord markdown.
 */
export async function requireBotLookupAccess(
  supabase: SupabaseClient,
  guild: { id: string; name: string }
): Promise<NextResponse | null> {
  const hasAccess = await guildHasPaidAccess(supabase, guild.id, 'discord_bot')
  if (hasAccess) return null
  return NextResponse.json(
    { error: 'premium_required', guild_name: guild.name, premium_url: `${appOrigin()}/premium` },
    { status: 403 }
  )
}

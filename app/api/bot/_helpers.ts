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
 * (different raid teams / game versions). For slash commands we just pick
 * the first active one — most installs are 1:1 and this avoids surfacing a
 * disambiguation step in chat.
 */
export async function resolveGuildFromDiscord(
  supabase: SupabaseClient,
  discordGuildId: string
): Promise<{ id: string; name: string; active_expansion_id: string | null } | null> {
  const { data } = await supabase
    .from('guilds')
    .select('id, name, active_expansion_id, is_active')
    .eq('discord_server_id', discordGuildId)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()
  if (!data) return null
  return { id: data.id, name: data.name, active_expansion_id: data.active_expansion_id }
}

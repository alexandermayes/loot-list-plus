/**
 * Backfill: move attendance_records and loot_history that were written onto the
 * wrong team's raid_event onto the event matching each character's own team.
 *
 * Mirrors the runtime fix in utils/raid-events/team-routing.ts. A record is
 * "misrouted" when its raid_event belongs to a team different from the
 * character's team. We move it to the (guild, date, characterTeam) event,
 * creating that event if needed (copying tier from a sibling event on the date).
 *
 * SAFE BY DEFAULT: dry-run unless you pass --apply.
 *
 *   npx tsx scripts/backfill-team-event-routing.ts                 # all team guilds, dry-run
 *   npx tsx scripts/backfill-team-event-routing.ts <guildId>       # one guild, dry-run
 *   npx tsx scripts/backfill-team-event-routing.ts <guildId> --apply
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import {
  getGuildTeamRouting,
  findOrCreateTeamEvent,
} from '../utils/raid-events/team-routing'
import { recomputeBlpForItems, recomputeBlpForEvents } from '../utils/blp/recompute'

// Load .env.local — fall back to the main clone when run inside a worktree
// (.env.local is gitignored and not copied into .claude/worktrees/<name>/).
const cwd = process.cwd()
const mainRoot = cwd.includes('/.claude/worktrees/') ? cwd.split('/.claude/worktrees/')[0] : cwd
const envPath = existsSync(resolve(cwd, '.env.local')) ? resolve(cwd, '.env.local') : resolve(mainRoot, '.env.local')
readFileSync(envPath, 'utf8').split('\n').forEach(line => {
  const [key, ...rest] = line.split('=')
  if (key && rest.length) process.env[key.trim()] = rest.join('=').trim().replace(/^["']|["']$/g, '')
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
) as unknown as Parameters<typeof getGuildTeamRouting>[0]
const sb = supabase as unknown as SupabaseClient

const APPLY = process.argv.includes('--apply')
const guildArg = process.argv.find((a, i) => i >= 2 && !a.startsWith('--'))

type EventInfo = { id: string; raid_date: string; raid_team_id: string | null }

async function guildsToProcess(): Promise<string[]> {
  if (guildArg) return [guildArg]
  const { data } = await sb.from('raid_teams').select('guild_id')
  return [...new Set((data ?? []).map((r: { guild_id: string }) => r.guild_id))]
}

async function backfillGuild(guildId: string) {
  const { charTeam, hasTeams } = await getGuildTeamRouting(supabase, guildId)
  if (!hasTeams) { console.log(`  ${guildId}: no teams, skipping`); return }

  // All events for the guild, indexed by id and by (date|team).
  const { data: eventRows } = await sb
    .from('raid_events')
    .select('id, raid_date, raid_team_id')
    .eq('guild_id', guildId)
  const events = (eventRows ?? []) as EventInfo[]
  const eventById = new Map(events.map(e => [e.id, e]))

  let attMoves = 0, attMerges = 0, lootMoves = 0, lootDupes = 0, created = 0
  const createdKeys = new Set<string>()
  const affectedEventIds = new Set<string>() // source + target events touched
  const affectedItemIds = new Set<string>()  // loot items whose BLP may shift

  const targetFor = async (date: string, team: string): Promise<string | null> => {
    const existing = events.find(e => e.raid_date === date && e.raid_team_id === team)
    if (existing) return existing.id
    if (!APPLY) { // dry-run: pretend we'd create it
      const key = `${date}|${team}`
      if (!createdKeys.has(key)) { createdKeys.add(key); created++ }
      return `(new ${key})`
    }
    const id = await findOrCreateTeamEvent(supabase, guildId, date, team)
    if (id) { events.push({ id, raid_date: date, raid_team_id: team }); eventById.set(id, { id, raid_date: date, raid_team_id: team }); created++ }
    return id
  }

  // ---- attendance_records ----
  const attIds = events.map(e => e.id)
  const { data: attRows } = await sb
    .from('attendance_records')
    .select('id, raid_event_id, character_id, attended, status')
    .in('raid_event_id', attIds)

  for (const r of (attRows ?? []) as { id: string; raid_event_id: string; character_id: string | null; attended: boolean; status: string | null }[]) {
    if (!r.character_id) continue
    const team = charTeam.get(r.character_id)
    if (!team) continue
    const srcEvent = eventById.get(r.raid_event_id)
    if (!srcEvent || srcEvent.raid_team_id === team) continue // already correct

    const targetId = await targetFor(srcEvent.raid_date, team)
    if (!targetId) continue
    affectedEventIds.add(srcEvent.id); affectedEventIds.add(targetId)

    // Conflict check: does the target already hold a record for this character?
    if (APPLY) {
      const { data: clash } = await sb
        .from('attendance_records')
        .select('id, attended')
        .eq('raid_event_id', targetId)
        .eq('character_id', r.character_id)
        .maybeSingle()
      if (clash) {
        // Keep the attended=true record, drop the other.
        const keepSource = r.attended && !clash.attended
        if (keepSource) {
          await sb.from('attendance_records').delete().eq('id', clash.id)
          await sb.from('attendance_records').update({ raid_event_id: targetId }).eq('id', r.id)
        } else {
          await sb.from('attendance_records').delete().eq('id', r.id)
        }
        attMerges++
        continue
      }
      await sb.from('attendance_records').update({ raid_event_id: targetId }).eq('id', r.id)
    }
    attMoves++
  }

  // ---- loot_history ----
  const { data: lootRows } = await sb
    .from('loot_history')
    .select('id, raid_event_id, character_id, loot_item_id')
    .eq('guild_id', guildId)
    .not('raid_event_id', 'is', null)

  for (const r of (lootRows ?? []) as { id: string; raid_event_id: string; character_id: string | null; loot_item_id: string }[]) {
    if (!r.character_id) continue
    const team = charTeam.get(r.character_id)
    if (!team) continue
    const srcEvent = eventById.get(r.raid_event_id)
    if (!srcEvent || srcEvent.raid_team_id === team) continue

    const targetId = await targetFor(srcEvent.raid_date, team)
    if (!targetId) continue
    affectedEventIds.add(srcEvent.id); affectedEventIds.add(targetId)
    affectedItemIds.add(r.loot_item_id)

    if (APPLY) {
      // Unique award index is (guild, loot_item_id, character_id, raid_event_id).
      const { data: clash } = await sb
        .from('loot_history')
        .select('id')
        .eq('raid_event_id', targetId)
        .eq('character_id', r.character_id)
        .eq('loot_item_id', r.loot_item_id)
        .maybeSingle()
      if (clash) { await sb.from('loot_history').delete().eq('id', r.id); lootDupes++; continue }
      await sb.from('loot_history').update({ raid_event_id: targetId }).eq('id', r.id)
    }
    lootMoves++
  }

  // BLP is derived per (guild, item) from award + attendance history. Moving
  // events around it, so rebuild the affected items/events after writing.
  if (APPLY && (affectedItemIds.size > 0 || affectedEventIds.size > 0)) {
    await recomputeBlpForItems(supabase, guildId, [...affectedItemIds])
    await recomputeBlpForEvents(supabase, guildId, [...affectedEventIds])
  }

  console.log(`  ${guildId}: attendance moves=${attMoves} merges=${attMerges} | loot moves=${lootMoves} dupes=${lootDupes} | team events ${APPLY ? 'created' : 'to create'}=${created} | BLP recompute items=${affectedItemIds.size} events=${affectedEventIds.size}`)
}

async function main() {
  console.log(APPLY ? '🚨 APPLY mode — writing changes' : '🔍 DRY RUN — no changes (pass --apply to write)')
  const guilds = await guildsToProcess()
  console.log(`Processing ${guilds.length} guild(s) with teams\n`)
  for (const g of guilds) await backfillGuild(g)
  console.log('\nDone.')
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })

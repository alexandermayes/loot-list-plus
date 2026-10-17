/**
 * Links addon and companion awards that were saved without a raid night to
 * the night that has since appeared (GH #321).
 *
 * An addon award is linked at insert time only when its night already
 * exists (GH #295). Two cases stay unlinked: the companion synced the award
 * before the session's attendance, and the award's UTC date is not the
 * session's date (a session crossing midnight UTC). An unlinked award gets
 * no BLP credit and is missing from the night's loot summary. The addon
 * attendance paths call linkUnlinkedAddonAwards after they create or
 * update a night, so the awards saved before it catch up.
 *
 * Why rows are never created here: a night is an attendance fact, written
 * by importAttendanceByTeam from a real session. Linking only moves an
 * award onto a night that exists; it never invents one, so a stray award
 * with a bad date cannot conjure an empty raid night.
 *
 * Why the update is guarded: each update filters on guild_id and on
 * raid_event_id IS NULL. A concurrent link (two sync passes) or an officer
 * who linked or edited the row on the website in between makes the update
 * a harmless no-op instead of overwriting their choice. Linking onto a
 * night can also collide with the unique rule on (guild, item, character,
 * night, award_copy), so each link takes the next free copy, and a row that
 * would need copy 11 stays unlinked and is reported.
 */
import type { createServiceRoleClient } from '@/utils/supabase/service-role'
import { MAX_AWARD_COPIES, nextAwardCopy } from '@/domain/loot/award-copies'
import { getGuildTeamRouting, pickAwardRaidEvent } from './team-routing'

type Service = ReturnType<typeof createServiceRoleClient>

const UNIQUE_VIOLATION = '23505'

/** One unlinked loot_history row, as linkUnlinkedAddonAwards reads it. */
export interface UnlinkedAwardRow {
  id: string
  character_id: string | null
  loot_item_id: string
}

export interface AwardLink {
  id: string
  raidEventId: string
  awardCopy: number
}

export interface AwardLinkPlan {
  links: AwardLink[]
  skipped: Array<{ id: string; reason: string }>
}

/** The key existingCopies and the plan use for one (item, raider, night). */
export function awardCopyKey(itemId: string, characterId: string, raidEventId: string): string {
  return `${itemId}|${characterId}|${raidEventId}`
}

/**
 * Pure: decides which night each unlinked row joins and which award_copy it
 * takes there. Night choice follows pickAwardRaidEvent (the GH #295 rules),
 * with the raider's team from routing.charTeam. existingCopies holds the
 * highest copy already on each night for (item, raider, night), keyed by
 * awardCopyKey; copies assigned earlier in the same plan count too, so two
 * unlinked copies of one item get consecutive numbers. A row whose copy
 * would pass MAX_AWARD_COPIES is skipped with a reason. Rows with no
 * character_id sit outside the unique rule and take copy 1.
 */
// regression for #321
export function planAwardLinks(
  rows: readonly UnlinkedAwardRow[],
  events: ReadonlyArray<{ id: string; raid_team_id: string | null }>,
  routing: { charTeam: ReadonlyMap<string, string>; hasTeams: boolean },
  existingCopies: ReadonlyMap<string, number>,
): AwardLinkPlan {
  const highest = new Map<string, number>(existingCopies)
  const links: AwardLink[] = []
  const skipped: Array<{ id: string; reason: string }> = []

  for (const row of rows) {
    const teamId = routing.hasTeams && row.character_id ? routing.charTeam.get(row.character_id) ?? null : null
    const night = pickAwardRaidEvent([...events], { hasTeams: routing.hasTeams, teamId })
    if (night.outcome !== 'linked' || !night.raidEventId) {
      skipped.push({ id: row.id, reason: night.outcome })
      continue
    }

    if (!row.character_id) {
      links.push({ id: row.id, raidEventId: night.raidEventId, awardCopy: 1 })
      continue
    }

    const key = awardCopyKey(row.loot_item_id, row.character_id, night.raidEventId)
    const copy = nextAwardCopy(highest.get(key))
    if (copy === null) {
      skipped.push({ id: row.id, reason: `the raider already has ${MAX_AWARD_COPIES} copies of this item on this raid night` })
      continue
    }
    highest.set(key, copy)
    links.push({ id: row.id, raidEventId: night.raidEventId, awardCopy: copy })
  }

  return { links, skipped }
}

export interface LinkUnlinkedAwardsResult {
  /** loot_history ids now linked. */
  linked: string[]
  /** Distinct loot_item_ids of the linked rows, for a BLP recompute. */
  itemIds: string[]
  /** Rows left unlinked, with the reason. */
  skipped: Array<{ id: string; reason: string }>
}

/**
 * Links the guild's unlinked addon awards dated raidDate to that date's
 * raid nights. One loot_history query first; when it finds nothing, that is
 * the only query. Otherwise the date's raid_events and the guild's team
 * routing are read once, the highest award_copy per (item, raider, night)
 * among the nights' linked rows is read in one query, and each planned link
 * is one guarded update (see the module comment). A unique violation on an
 * update skips that row; any other query error throws and the caller
 * decides (the addon routes log it and never fail the attendance response).
 */
// regression for #321
export async function linkUnlinkedAddonAwards(
  service: Service,
  guildId: string,
  raidDate: string,
): Promise<LinkUnlinkedAwardsResult> {
  const { data: unlinkedRows, error: unlinkedError } = await service
    .from('loot_history')
    .select('id, character_id, loot_item_id')
    .eq('guild_id', guildId)
    .eq('source', 'addon')
    .is('raid_event_id', null)
    .eq('awarded_date', raidDate)
  if (unlinkedError) {
    throw new Error(`Failed to read unlinked addon awards: ${unlinkedError.message}`)
  }
  const rows = (unlinkedRows ?? []) as UnlinkedAwardRow[]
  if (rows.length === 0) return { linked: [], itemIds: [], skipped: [] }

  const { data: eventRows, error: eventsError } = await service
    .from('raid_events')
    .select('id, raid_team_id')
    .eq('guild_id', guildId)
    .eq('raid_date', raidDate)
  if (eventsError) {
    throw new Error(`Failed to read raid nights for unlinked addon awards: ${eventsError.message}`)
  }
  const events = (eventRows ?? []) as Array<{ id: string; raid_team_id: string | null }>
  if (events.length === 0) {
    return { linked: [], itemIds: [], skipped: rows.map(r => ({ id: r.id, reason: 'no_raid_night' })) }
  }

  const routing = await getGuildTeamRouting(service, guildId)

  const itemIds = [...new Set(rows.map(r => r.loot_item_id))]
  const { data: copyRows, error: copiesError } = await service
    .from('loot_history')
    .select('loot_item_id, character_id, raid_event_id, award_copy')
    .eq('guild_id', guildId)
    .in('raid_event_id', events.map(e => e.id))
    .in('loot_item_id', itemIds)
  if (copiesError) {
    throw new Error(`Failed to read award copies for unlinked addon awards: ${copiesError.message}`)
  }
  const existingCopies = new Map<string, number>()
  for (const row of (copyRows ?? []) as Array<{
    loot_item_id: string
    character_id: string | null
    raid_event_id: string | null
    award_copy: number | null
  }>) {
    // Rows with no character sit outside the unique rule, so they never collide.
    if (!row.character_id || !row.raid_event_id) continue
    const key = awardCopyKey(row.loot_item_id, row.character_id, row.raid_event_id)
    const copy = row.award_copy ?? 1
    if (copy > (existingCopies.get(key) ?? 0)) existingCopies.set(key, copy)
  }

  const plan = planAwardLinks(rows, events, routing, existingCopies)
  const itemById = new Map(rows.map(r => [r.id, r.loot_item_id]))
  const linked: string[] = []
  const skipped = [...plan.skipped]

  for (const link of plan.links) {
    const { error } = await service
      .from('loot_history')
      .update({ raid_event_id: link.raidEventId, award_copy: link.awardCopy })
      .eq('id', link.id)
      .eq('guild_id', guildId)
      .is('raid_event_id', null)
    if (error) {
      if (error.code === UNIQUE_VIOLATION) {
        // Another writer took this copy between the read and the update;
        // the next attendance sync for the date links the row.
        console.warn('Skipped linking an addon award: award copy already taken', { id: link.id, raidEventId: link.raidEventId })
        skipped.push({ id: link.id, reason: 'award copy already taken' })
        continue
      }
      throw new Error(`Failed to link an addon award to its raid night: ${error.message}`)
    }
    linked.push(link.id)
  }

  if (skipped.length > 0) {
    console.warn('Addon awards left unlinked:', { guildId, raidDate, skipped })
  }

  const linkedItemIds = [...new Set(linked.map(id => itemById.get(id)).filter((id): id is string => !!id))]
  return { linked, itemIds: linkedItemIds, skipped }
}

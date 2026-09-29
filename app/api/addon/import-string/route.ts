import { NextRequest, NextResponse, after } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyOfficerPermissions } from '@/utils/server-roles'
import { trackApiError, trackEvent } from '@/utils/analytics/server'
import { notifyLootAward, type LootAward } from '@/lib/discord-loot-announcements'
import { recomputeBlpForEvents, recomputeBlpForItems } from '@/utils/blp/recompute'
import { importAttendanceByTeam, findAwardRaidEvent } from '@/utils/raid-events/team-routing'
import {
  resolveGuildLootItem,
  resolveGuildLootItemIds,
  formatInvalidLootItemIdsError,
  type LootItemHints,
} from '@/lib/loot/guild-scoped-lookup'
import { buildImportStringAwardRow, type LootItemScope } from '@/lib/loot/loot-history-rows'
import { insertAddonAward } from '@/lib/loot/addon-award-insert'
import { matchAwardSession } from '@/lib/addon/award-session'
import { inflateRawSync } from 'zlib'

interface AddonAward {
  wowheadId: number
  lootItemId?: string
  characterName: string
  characterClass?: string
  bossName?: string
  raidName?: string
  awardedAt: string
  manual?: boolean
}

interface AddonAttendanceRecord {
  raidDate: string
  raidName: string
  startTime: string
  endTime: string
  bossKills: Array<{
    bossName: string
    killTime: string
    roster: string[]
  }>
  attended: string[]
}

interface ImportPayload {
  guildId: string
  exportedAt: string
  awards: AddonAward[]
  attendance: AddonAttendanceRecord[]
}

/**
 * POST /api/addon/import-string
 *
 * Processes an export string from the WoW addon.
 * Decodes awards and attendance records, validates, and stores them.
 *
 * Every award's supplied lootItemId is checked against the calling guild
 * before anything is processed (GH #294 D-02). When a supplied lootItemId
 * does not resolve within the guild, the award falls back to its wowheadId
 * through the same alias-aware guild-scoped lookup addon awards already use
 * (GH #277) — a foreign id is never written, but it does not have to sink
 * the whole import if the addon's own wowheadId still resolves (OD-2). Only
 * when both fail is the import rejected with 400, before any award or
 * attendance record is processed. Rows carry raid_tier_id and expansion_id
 * from whichever guild-owned scope the award resolved to.
 *
 * GH #295/#307: attendance is written before awards, so the raid nights the
 * export's sessions create already exist when the awards link to them. Each
 * award is matched to the attendance session that contains its awardedAt
 * (matchAwardSession); that session's raidDate picks the raid night
 * (findAwardRaidEvent, find-only, guild-scoped, team-aware), and its live
 * boss kill and instance name pick the tier when the item sits in more than
 * one (resolveGuildLootItem hints). The addon's cached lootItemId is
 * replaced only when those live hints decided between tiers (OD-6). A
 * re-imported award already on its night counts as processed and in
 * awards.already_recorded, not as an error, and is not announced again.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { importString } = await request.json()
    if (!importString || typeof importString !== 'string') {
      return NextResponse.json({ error: 'importString is required' }, { status: 400 })
    }

    // Parse the export string
    const PREFIX = 'LLP1E:'
    if (!importString.startsWith(PREFIX)) {
      return NextResponse.json({ error: 'Invalid export string format' }, { status: 400 })
    }

    const rest = importString.slice(PREFIX.length)
    const colonIdx = rest.indexOf(':')
    if (colonIdx === -1) {
      return NextResponse.json({ error: 'Malformed export string' }, { status: 400 })
    }

    const version = parseInt(rest.slice(0, colonIdx))
    if (version !== 1) {
      return NextResponse.json({ error: `Unsupported protocol version: ${version}` }, { status: 400 })
    }

    const encoded = rest.slice(colonIdx + 1)

    let payload: ImportPayload
    try {
      const compressed = Buffer.from(encoded, 'base64')
      const decompressed = inflateRawSync(compressed)
      payload = JSON.parse(decompressed.toString('utf-8'))
    } catch {
      return NextResponse.json({ error: 'Failed to decode export string' }, { status: 400 })
    }

    if (!payload.guildId) {
      return NextResponse.json({ error: 'Missing guild ID in export data' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Verify officer permissions
    const verification = await verifyOfficerPermissions(supabase, user.id, payload.guildId)
    if (!verification.hasPermission) {
      return NextResponse.json({ error: 'Officer permissions required' }, { status: 403 })
    }

    // Pre-check every supplied lootItemId against the guild before anything
    // is processed (GH #294 D-02/D-03, OD-2). A lootItemId the guild does
    // not own falls back to the award's wowheadId through the same
    // alias-aware guild-scoped lookup the wowheadId-only path already uses;
    // only ids that fail BOTH are rejected, and any such id sinks the whole
    // import (nothing processed) rather than a partial write.
    const awards = payload.awards || []
    const awardScopes = await resolveImportAwardScopes(supabase, payload.guildId, awards)
    if (awardScopes.invalidLootItemIds.length > 0) {
      return NextResponse.json(
        {
          error: formatInvalidLootItemIdsError(awardScopes.invalidLootItemIds),
          invalid_loot_item_ids: awardScopes.invalidLootItemIds,
        },
        { status: 400 }
      )
    }

    const results = {
      awards: { processed: 0, errors: 0, already_recorded: 0 },
      attendance: { processed: 0, errors: 0 },
    }
    const announceQueue: LootAward[] = []
    const attendance = payload.attendance || []

    // Process attendance FIRST (GH #295 PD-07): importAttendanceByTeam
    // creates the payload's raid nights, so the awards below can link to
    // them. Awards never create a night themselves.
    const attendanceEventIds = new Set<string>()
    for (const record of attendance) {
      try {
        const raidEventIds = await processAttendance(supabase, payload.guildId, record)
        for (const id of raidEventIds) attendanceEventIds.add(id)
        results.attendance.processed++
      } catch (err) {
        console.error('Failed to process attendance:', err)
        results.attendance.errors++
      }
    }

    // Process awards, each linked to its session's raid night when one matches.
    const linkedItemIds = new Set<string>()
    for (let i = 0; i < awards.length; i++) {
      const award = awards[i]
      try {
        const outcome = await processAward(
          supabase,
          payload.guildId,
          user.id,
          award,
          awardScopes.scopeByIndex.get(i) ?? null,
          attendance
        )
        results.awards.processed++
        if (outcome.status === 'already_recorded') {
          results.awards.already_recorded++
          continue
        }
        announceQueue.push(outcome.announce)
        if (outcome.raidEventId) linkedItemIds.add(outcome.announce.itemId)
      } catch (err) {
        console.error('Failed to process award:', err)
        results.awards.errors++
      }
    }

    // BLP is derived and idempotent (GH #98). Recompute for the nights the
    // attendance touched (credits for drops already on them), and for every
    // item newly linked to a night here (PD-09).
    if (attendanceEventIds.size > 0) {
      after(() => recomputeBlpForEvents(supabase, payload.guildId, [...attendanceEventIds]))
    }
    if (linkedItemIds.size > 0) {
      after(() => recomputeBlpForItems(supabase, payload.guildId, [...linkedItemIds]))
    }

    if (results.awards.processed > 0) {
      trackEvent({
        event: 'loot_item_imported',
        userId: user.id,
        guildId: payload.guildId,
        properties: { source: 'addon', count: results.awards.processed },
      })
    }

    if (announceQueue.length > 0) {
      after(() => notifyLootAward(supabase, payload.guildId, announceQueue))
    }

    return NextResponse.json({ data: results })
  } catch (error) {
    console.error('Error in POST /api/addon/import-string:', error)
    trackApiError('unknown', 'POST /api/addon/import-string', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** Result of the guild-scope pre-check across every award in an import (GH #294 D-02). */
interface ImportAwardScopes {
  /** award index (in payload.awards) -> guild-owned scope, for every award
   * that supplied a lootItemId (whether the guild owned it directly, or it
   * needed the wowheadId fallback per OD-2). Awards with no lootItemId at
   * all have no entry here and are resolved in processAward as before. */
  scopeByIndex: Map<number, LootItemScope>
  /** Every supplied lootItemId (well-formed or not) that could not be
   * resolved directly OR via its award's wowheadId fallback. Non-empty
   * means the whole import is rejected with 400 before anything is
   * processed. */
  invalidLootItemIds: string[]
}

/**
 * Pre-checks every award's supplied lootItemId against the guild in one
 * batched pass (GH #294 D-02). A lootItemId the guild does not own directly
 * falls back to the award's own wowheadId through the same alias-aware
 * guild-scoped lookup the wowheadId-only path uses (OD-2) — a foreign id is
 * never written, but a working wowheadId still lets the award through.
 * Awards with no lootItemId at all are left for processAward's existing
 * wowheadId resolution and never appear in either map here.
 */
async function resolveImportAwardScopes(
  supabase: ReturnType<typeof createServiceRoleClient>,
  guildId: string,
  awards: AddonAward[]
): Promise<ImportAwardScopes> {
  const invalidLootItemIds: string[] = []
  const scopeByIndex = new Map<number, LootItemScope>()

  const suppliedIdAwards: Array<{ index: number; lootItemId: string; wowheadId: number }> = []
  awards.forEach((award, index) => {
    if (award.lootItemId === undefined || award.lootItemId === null) return
    if (typeof award.lootItemId !== 'string' || award.lootItemId.length === 0) {
      invalidLootItemIds.push(String(award.lootItemId))
      return
    }
    suppliedIdAwards.push({ index, lootItemId: award.lootItemId, wowheadId: award.wowheadId })
  })

  if (suppliedIdAwards.length === 0) {
    return { scopeByIndex, invalidLootItemIds }
  }

  const idResolution = await resolveGuildLootItemIds(supabase, guildId, suppliedIdAwards.map(a => a.lootItemId))

  for (const { index, lootItemId, wowheadId } of suppliedIdAwards) {
    const owned = idResolution.resolved.get(lootItemId)
    if (owned) {
      scopeByIndex.set(index, owned)
      continue
    }

    // Not owned directly — fall back to the wowheadId, alias-aware (OD-2).
    const fallback = wowheadId ? await resolveGuildLootItem(supabase, guildId, wowheadId) : null
    if (fallback) {
      scopeByIndex.set(index, fallback)
    } else {
      invalidLootItemIds.push(lootItemId)
    }
  }

  return { scopeByIndex, invalidLootItemIds }
}

type ProcessAwardOutcome =
  | { status: 'inserted'; announce: LootAward; raidEventId: string | null }
  | { status: 'already_recorded' }

async function processAward(
  supabase: ReturnType<typeof createServiceRoleClient>,
  guildId: string,
  userId: string,
  award: AddonAward,
  preResolvedScope: LootItemScope | null,
  attendance: unknown
): Promise<ProcessAwardOutcome> {
  // The export's own attendance session for this award, if any (PD-07).
  // Its boss kill and instance name are live; the award's bossName and
  // raidName echo the cached catalog row, so award.raidName is never used.
  const session = matchAwardSession(award.awardedAt, attendance)
  const hints: LootItemHints = session
    ? { bossName: session.bossName, raidName: session.raidName }
    : { bossName: award.bossName ?? null }

  // Resolution order (GH #294 D-01/D-02, OD-2):
  //  1. preResolvedScope — set by resolveImportAwardScopes whenever the
  //     award supplied a lootItemId, whether the guild owned it directly or
  //     it needed the wowheadId fallback. A foreign lootItemId can never
  //     reach here unmapped: resolveImportAwardScopes already rejected the
  //     whole import with 400 if it could not resolve one. GH #307 OD-6:
  //     the addon's lootItemId is its cached catalog row, so when the live
  //     session hints decide between the guild's tiers, that row wins.
  //  2. resolveGuildLootItem by wowheadId, trying the exact id first and
  //     its faction alias second (GH #277 D-03, SCOPE-01) — the path used
  //     when no lootItemId was supplied at all.
  let item: LootItemScope | null = preResolvedScope
  if (item && session && award.wowheadId) {
    const live = await resolveGuildLootItem(supabase, guildId, award.wowheadId, hints)
    if (live && (live.matched_by === 'boss' || live.matched_by === 'boss_tier' || live.matched_by === 'raid')) {
      item = live
    }
  } else if (!item && award.wowheadId) {
    item = await resolveGuildLootItem(supabase, guildId, award.wowheadId, hints)
  }

  if (!item) {
    throw new Error(`Could not resolve item for wowhead_id ${award.wowheadId}`)
  }

  // Resolve character name to character_id
  let characterId: string | null = null
  if (award.characterName) {
    const { data: membership } = await supabase
      .from('character_guild_memberships')
      .select('character_id, characters(id, name)')
      .eq('guild_id', guildId)
      .eq('is_active', true)

    if (membership) {
      for (const m of membership) {
        const char = Array.isArray(m.characters) ? m.characters[0] : m.characters
        if (char && (char as { name: string }).name?.toLowerCase() === award.characterName.toLowerCase()) {
          characterId = m.character_id
          break
        }
      }
    }
  }

  // The guild's raid night for the session's raidDate (exact, even for a
  // session that crosses 00:00 UTC), or else the awardedAt date (GH #295).
  // A lookup failure saves the award unlinked instead of failing it.
  let raidEventId: string | null = null
  try {
    const night = await findAwardRaidEvent(supabase, guildId, session?.raidDate ?? award.awardedAt, characterId)
    raidEventId = night.raidEventId
  } catch (nightError) {
    console.error('Failed to look up the raid night for an imported award:', nightError)
    trackApiError('unknown', 'POST /api/addon/import-string', nightError instanceof Error ? nightError : new Error(String(nightError)))
  }

  const today = new Date().toISOString().split('T')[0]
  const result = await insertAddonAward(
    supabase,
    buildImportStringAwardRow({
      guildId,
      item,
      characterId,
      characterName: award.characterName,
      awardedAt: award.awardedAt,
      manual: award.manual,
      awardedBy: userId,
      raidEventId,
      today,
    })
  )

  if (result.status === 'already_recorded') return { status: 'already_recorded' }
  return {
    status: 'inserted',
    announce: { itemId: item.id, characterName: award.characterName, raidEventId },
    raidEventId,
  }
}

async function processAttendance(
  supabase: ReturnType<typeof createServiceRoleClient>,
  guildId: string,
  record: AddonAttendanceRecord
): Promise<string[]> {
  // Resolve active members → character ids + names.
  const { data: memberships } = await supabase
    .from('character_guild_memberships')
    .select('character_id, characters(id, name)')
    .eq('guild_id', guildId)
    .eq('is_active', true)

  const members: Array<{ charId: string; name: string }> = []
  for (const m of memberships ?? []) {
    const char = Array.isArray(m.characters) ? m.characters[0] : m.characters
    if (char) members.push({ charId: m.character_id, name: (char as { name: string }).name.toLowerCase() })
  }

  const attendedSet = new Set(record.attended.map(n => n.toLowerCase()))
  const { eventIds } = await importAttendanceByTeam(supabase, guildId, record.raidDate, members, attendedSet)
  return eventIds
}

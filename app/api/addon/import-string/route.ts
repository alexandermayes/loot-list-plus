import { NextRequest, NextResponse, after } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createTypedServiceRoleClient } from '@/utils/supabase/typed-service-role'
import type { TypedServiceClient } from '@/utils/supabase/typed-service-role'
import { verifyOfficerPermissions } from '@/utils/server-roles'
import { trackApiError, trackEvent } from '@/utils/analytics/server'
import { notifyLootAward, type LootAward } from '@/lib/discord-loot-announcements'
import { recomputeBlpForEvents, recomputeBlpForItems } from '@/utils/blp/recompute'
import { importAttendanceByTeam, toRaidNightDate } from '@/utils/raid-events/team-routing'
import { linkUnlinkedAddonAwards } from '@/utils/raid-events/link-unlinked-awards'
import { findRaidNightForAward, guildRaidTimeZone, raidNightDate } from '@/lib/addon/raid-night'
import {
  resolveGuildLootItem,
  resolveGuildLootItemIds,
  formatInvalidLootItemIdsError,
  type LootItemHints,
} from '@/lib/loot/guild-scoped-lookup'
import { buildImportStringAwardRow, type LootItemScope } from '@/lib/loot/loot-history-rows'
import { addonAwardKeys, insertAddonAward } from '@/lib/loot/addon-award-insert'
import { matchAwardSession } from '@/lib/addon/award-session'
import { inflateRawSync } from 'zlib'

interface AddonAward {
  wowheadId: number
  lootItemId?: string
  characterName: string
  characterClass?: string
  bossName?: string
  raidName?: string
  /** The live instance name from GetInstanceInfo (addon 1.2.0 and later), optional (GH #319). */
  instanceName?: string
  awardedAt: string
  /** The addon's own award id (addon 1.1.0 and later), optional. */
  awardId?: string
  /** The addon session's raidDate (YYYY-MM-DD, UTC) at award time, addon
   * 1.2.0 and later (GH #321). Picks the night when no session in this
   * export contains the award. */
  sessionDate?: string
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
 * one (resolveGuildLootItem hints). An award outside any session offers its
 * own bossName and instanceName instead, which addon 1.2.0 stamps live
 * (GH #319). The addon's cached lootItemId is
 * replaced only when those live hints decided between tiers (OD-6). A
 * re-imported award already on its night counts as processed and in
 * awards.already_recorded, not as an error, and is not announced again.
 *
 * FU-1 of #331, #293: each award is identified by its addonAwardKey
 * (awardedAt, wowheadId and character name), so a re-import is matched by
 * the award's key while a second award of the same item to the same raider
 * on one night (a different awardedAt) is recorded as the next copy. An
 * export that holds only the later award, after "Clear pending" in game,
 * still records it as the next copy.
 *
 * FU-C of 261001-tv5: an award that carries an awardId (addon 1.1.0) is
 * keyed by it instead ('addon2:' key, the same one POST
 * /api/addon/loot-award builds from the companion's award_id), with its
 * awardedAt key looked up as an alternate, so two awards in the same second
 * become two copies and an award stored earlier under its awardedAt key is
 * not recorded twice. A missing or malformed awardId keys on awardedAt.
 *
 * GH #355: raid nights are read in the guild's raid time zone
 * (lib/addon/raid-night.ts), not the UTC date. A session's night comes from
 * its startTime; an award's from its session's startTime, or from its own
 * awardedAt when no session matches. A local time from 00:00 to 05:59
 * belongs to the previous night (D1). If the zoned night does not exist yet,
 * the UTC-dated night an older sync created is used when it does (D3), and
 * the award's stored awarded_date is the night it was linked under (D4),
 * where it used to be the awardedAt UTC date. Nights already created on a
 * UTC date are not moved. A missing or malformed startTime keeps raidDate,
 * and a failed time zone read carries on with the UTC dates as before. The
 * dedupe keys still read the raw awardedAt and awardId, untouched.
 *
 * GH #321: after the attendance loop, the guild's addon awards saved earlier
 * without a raid night and dated one of the nights this import touched are
 * linked to it (linkUnlinkedAddonAwards, team-aware, copy-safe) and their
 * items join the BLP recompute. A linking failure is logged and the import
 * carries on. An award that carries the addon's sessionDate (addon 1.2.0)
 * and matches no session here uses that date as its UTC night instead of
 * the awardedAt date, so an award made after midnight UTC still finds the
 * night the session started on; a malformed sessionDate falls back to
 * awardedAt.
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

    const supabase = createTypedServiceRoleClient()

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

    // GH #355: the guild's raid time zone, read once. A failed read carries
    // on with the UTC dates, exactly as before.
    let raidTimeZone: string | null = null
    try {
      raidTimeZone = await guildRaidTimeZone(supabase, payload.guildId)
    } catch (zoneError) {
      console.error('Failed to read the raid time zone for an import:', zoneError)
      trackApiError('unknown', 'POST /api/addon/import-string', zoneError instanceof Error ? zoneError : new Error(String(zoneError)))
    }

    // Process attendance FIRST (GH #295 PD-07): importAttendanceByTeam
    // creates the payload's raid nights, so the awards below can link to
    // them. Awards never create a night themselves.
    const attendanceEventIds = new Set<string>()
    const attendanceNights = new Set<string>()
    for (const record of attendance) {
      try {
        const { eventIds: raidEventIds, raidNight } = await processAttendance(supabase, payload.guildId, record, raidTimeZone)
        for (const id of raidEventIds) attendanceEventIds.add(id)
        attendanceNights.add(raidNight)
        results.attendance.processed++
      } catch (err) {
        console.error('Failed to process attendance:', err)
        results.attendance.errors++
      }
    }

    // Items newly linked to a night in this import, for the BLP recompute.
    const linkedItemIds = new Set<string>()

    // regression for #321: the nights now exist, so addon awards saved
    // earlier without one (an earlier companion sync or paste) catch up.
    // Awards in this import link themselves below; a failure here is logged
    // and the import carries on.
    for (const raidNight of attendanceNights) {
      try {
        const linked = await linkUnlinkedAddonAwards(supabase, payload.guildId, raidNight)
        for (const id of linked.itemIds) linkedItemIds.add(id)
      } catch (linkError) {
        console.error('Failed to link unlinked addon awards after an import:', linkError)
        trackApiError('unknown', 'POST /api/addon/import-string', linkError instanceof Error ? linkError : new Error(String(linkError)))
      }
    }

    // Process awards, each linked to its session's raid night when one matches.
    for (let i = 0; i < awards.length; i++) {
      const award = awards[i]
      try {
        const outcome = await processAward(
          supabase,
          payload.guildId,
          user.id,
          award,
          awardScopes.scopeByIndex.get(i) ?? null,
          attendance,
          raidTimeZone
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
  supabase: TypedServiceClient,
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
  supabase: TypedServiceClient,
  guildId: string,
  userId: string,
  award: AddonAward,
  preResolvedScope: LootItemScope | null,
  attendance: unknown,
  raidTimeZone: string | null
): Promise<ProcessAwardOutcome> {
  // The export's own attendance session for this award, if any (PD-07).
  // The session is preferred: its boss kill is time-matched and more
  // precise. An award with no session falls back to its own bossName and
  // instanceName, which addon 1.2.0 stamps live; older awards echo the
  // cached catalog row and carry no instanceName. award.raidName is never
  // used, it is the cached catalog raid.
  // regression for #319
  const session = matchAwardSession(award.awardedAt, attendance)
  const liveInstance = typeof award.instanceName === 'string' ? award.instanceName : null
  const hints: LootItemHints = session
    ? { bossName: session.bossName, raidName: session.raidName }
    : { bossName: award.bossName ?? null, raidName: liveInstance }

  // Resolution order (GH #294 D-01/D-02, OD-2):
  //  1. preResolvedScope — set by resolveImportAwardScopes whenever the
  //     award supplied a lootItemId, whether the guild owned it directly or
  //     it needed the wowheadId fallback. A foreign lootItemId can never
  //     reach here unmapped: resolveImportAwardScopes already rejected the
  //     whole import with 400 if it could not resolve one. GH #307 OD-6:
  //     the addon's lootItemId is its cached catalog row, so when the live
  //     hints (the session's, or the award's own instanceName, GH #319)
  //     decide between the guild's tiers, that row wins. An award with
  //     neither has no live hint to offer, so no extra lookup is made.
  //  2. resolveGuildLootItem by wowheadId, trying the exact id first and
  //     its faction alias second (GH #277 D-03, SCOPE-01) — the path used
  //     when no lootItemId was supplied at all.
  let item: LootItemScope | null = preResolvedScope
  if (item && (session || liveInstance) && award.wowheadId) {
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

  // The guild's raid night (GH #295, GH #355): the session's start time, or
  // the award's own time when no session matches, read in the guild's raid
  // time zone. When that night does not exist yet, the UTC-dated night
  // (the session's raidDate, else the awardedAt date) is used if it does
  // (D3). matchAwardSession still matches on the UTC window. A lookup
  // failure saves the award unlinked instead of failing it.
  // regression for #321: with no session in this export, the addon's own
  // sessionDate (the UTC date its session started) is the UTC night, so an
  // award made after midnight UTC still finds the night it belongs to. A
  // malformed sessionDate falls back to the awardedAt date, never to a 400.
  const zonedDate = raidTimeZone === null
    ? null
    : raidNightDate(session ? session.startTime : award.awardedAt, raidTimeZone)
  const legacyDate = session?.raidDate ?? toRaidNightDate(award.sessionDate) ?? award.awardedAt
  let raidEventId: string | null = null
  let storedDate: string | null = zonedDate
  try {
    const night = await findRaidNightForAward(
      supabase,
      guildId,
      { zonedDate, legacyDate },
      characterId,
    )
    raidEventId = night.raidEventId
    // D4: the stored awarded_date is the zoned night, or the older UTC-dated
    // night the award linked to; with no zoned night it stays the awardedAt date.
    storedDate = zonedDate !== null && night.date === zonedDate ? zonedDate : null
  } catch (nightError) {
    console.error('Failed to look up the raid night for an imported award:', nightError)
    trackApiError('unknown', 'POST /api/addon/import-string', nightError instanceof Error ? nightError : new Error(String(nightError)))
  }

  const today = new Date().toISOString().split('T')[0]
  const keys = addonAwardKeys({
    awardedAt: award.awardedAt,
    wowheadId: award.wowheadId,
    characterName: award.characterName,
    awardId: award.awardId,
  })
  const result = await insertAddonAward(
    supabase,
    buildImportStringAwardRow({
      guildId,
      item,
      characterId,
      characterName: award.characterName,
      awardedAt: award.awardedAt,
      awardedDate: storedDate,
      manual: award.manual,
      awardedBy: userId,
      raidEventId,
      sourceAwardKey: keys.key,
      today,
    }),
    { alternateKeys: keys.alternateKeys },
  )

  if (result.status === 'already_recorded') return { status: 'already_recorded' }
  return {
    status: 'inserted',
    announce: { itemId: item.id, characterName: award.characterName, raidEventId },
    raidEventId,
  }
}

async function processAttendance(
  supabase: TypedServiceClient,
  guildId: string,
  record: AddonAttendanceRecord,
  raidTimeZone: string | null
): Promise<{ eventIds: string[]; raidNight: string }> {
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
  // GH #355: the night from the session's start time in the guild's raid
  // time zone; a missing or malformed startTime keeps the UTC raidDate.
  const raidNight = (raidTimeZone !== null ? raidNightDate(record.startTime, raidTimeZone) : null) ?? record.raidDate
  const { eventIds } = await importAttendanceByTeam(supabase, guildId, raidNight, members, attendedSet)
  // The night is returned too, so the route can link the awards saved
  // before it existed (GH #321).
  return { eventIds, raidNight }
}

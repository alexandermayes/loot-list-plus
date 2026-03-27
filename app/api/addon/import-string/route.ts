import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyOfficerPermissions } from '@/utils/server-roles'
import { trackApiError } from '@/utils/analytics/server'
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

    const results = {
      awards: { processed: 0, errors: 0 },
      attendance: { processed: 0, errors: 0 },
    }

    // Process awards
    for (const award of payload.awards || []) {
      try {
        await processAward(supabase, payload.guildId, user.id, award)
        results.awards.processed++
      } catch (err) {
        console.error('Failed to process award:', err)
        results.awards.errors++
      }
    }

    // Process attendance
    for (const record of payload.attendance || []) {
      try {
        await processAttendance(supabase, payload.guildId, record)
        results.attendance.processed++
      } catch (err) {
        console.error('Failed to process attendance:', err)
        results.attendance.errors++
      }
    }

    return NextResponse.json({ data: results })
  } catch (error) {
    console.error('Error in POST /api/addon/import-string:', error)
    trackApiError('unknown', 'POST /api/addon/import-string', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function processAward(
  supabase: ReturnType<typeof createServiceRoleClient>,
  guildId: string,
  userId: string,
  award: AddonAward
) {
  // Resolve wowhead_id to loot_item_id
  let lootItemId = award.lootItemId
  if (!lootItemId && award.wowheadId) {
    const { data: item } = await supabase
      .from('loot_items')
      .select('id')
      .eq('wowhead_id', award.wowheadId)
      .limit(1)
      .single()
    lootItemId = item?.id
  }

  if (!lootItemId) {
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

  // Insert into loot_history
  const { error } = await supabase.from('loot_history').insert({
    guild_id: guildId,
    character_id: characterId,
    character_name: award.characterName,
    loot_item_id: lootItemId,
    awarded_date: award.awardedAt ? award.awardedAt.split('T')[0] : new Date().toISOString().split('T')[0],
    awarded_by: userId,
    source: 'addon',
    notes: award.manual ? 'Manual award from addon' : null,
  })

  if (error) throw error
}

async function processAttendance(
  supabase: ReturnType<typeof createServiceRoleClient>,
  guildId: string,
  record: AddonAttendanceRecord
) {
  // Create or find the raid event
  const { data: existingEvent } = await supabase
    .from('raid_events')
    .select('id')
    .eq('guild_id', guildId)
    .eq('raid_date', record.raidDate)
    .eq('raid_name', record.raidName)
    .limit(1)
    .single()

  let raidEventId: string

  if (existingEvent) {
    raidEventId = existingEvent.id
  } else {
    const { data: newEvent, error } = await supabase
      .from('raid_events')
      .insert({
        guild_id: guildId,
        raid_date: record.raidDate,
        raid_name: record.raidName,
      })
      .select('id')
      .single()

    if (error || !newEvent) throw error || new Error('Failed to create raid event')
    raidEventId = newEvent.id
  }

  // Resolve character names to IDs
  const { data: memberships } = await supabase
    .from('character_guild_memberships')
    .select('character_id, characters(id, name)')
    .eq('guild_id', guildId)
    .eq('is_active', true)

  const nameToCharId: Record<string, string> = {}
  if (memberships) {
    for (const m of memberships) {
      const char = Array.isArray(m.characters) ? m.characters[0] : m.characters
      if (char) {
        nameToCharId[(char as { name: string }).name.toLowerCase()] = m.character_id
      }
    }
  }

  // Insert attendance records
  const attendedSet = new Set(record.attended.map(n => n.toLowerCase()))

  for (const [name, charId] of Object.entries(nameToCharId)) {
    const attended = attendedSet.has(name)

    const { error } = await supabase
      .from('attendance_records')
      .upsert({
        raid_event_id: raidEventId,
        character_id: charId,
        attended,
        signed_up: false,
        status: attended ? 'attended' : 'absent',
      }, {
        onConflict: 'raid_event_id,character_id',
      })

    if (error) {
      console.error(`Failed to upsert attendance for ${name}:`, error)
    }
  }
}

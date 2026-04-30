import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { NextResponse } from 'next/server'
import { verifyPermission } from '@/utils/server-roles'
import { parseInformationTab } from '@/lib/sheet-import/settings-parser'
import { parseItemsTab, matchItemsToDb } from '@/lib/sheet-import/items-parser'
import { trackEvent, trackApiError } from '@/utils/analytics/server'

export const dynamic = 'force-dynamic'

// Allowed settings fields (same allowlist as guild-settings route)
const ALLOWED_SETTINGS_FIELDS = [
  'raid_days_per_week', 'first_raid_day', 'second_raid_day', 'third_raid_day',
  'fourth_raid_day', 'fifth_raid_day', 'reset_date', 'decimal_places',
  'attendance_type', 'rolling_attendance_weeks', 'use_signups', 'signup_weight',
  'max_attendance_bonus', 'max_attendance_threshold', 'middle_attendance_bonus',
  'middle_attendance_threshold', 'bottom_attendance_bonus', 'bottom_attendance_threshold',
  'minimum_raid_days_enabled', 'minimum_raid_days', 'late_early_penalty_enabled',
  'late_early_penalty_value', 'guild_rank_bonuses_enabled', 'number_of_ranks',
  'rank_modifiers', 'role_bonus_priority_single_item', 'class_bonus_priority_single_item',
  'raid_roles_overall_bonus_priority', 'single_raider_overall_bonus',
  'single_raider_bonus_single_item', 'donation_bonuses_enabled',
  'blp_enabled', 'blp_increment', 'blp_maximum',
  'new_member_mode', 'trial_penalty_enabled', 'trial_penalty_value',
  'enforce_slot_restrictions',
] as const

export async function POST(request: Request) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceSupabase = createServiceRoleClient()

    const body = await request.json()
    const { guildId, settingsCSV, itemsCSV, expansionId, dryRun } = body

    if (!guildId) {
      return NextResponse.json({ error: 'guildId is required' }, { status: 400 })
    }

    // Verify officer permissions
    const { hasPermission, error: permError } = await verifyPermission(serviceSupabase, user.id, guildId, 'manage_settings')
    if (!hasPermission) {
      return NextResponse.json({ error: permError || 'Only officers can import data' }, { status: 403 })
    }

    const result: {
      settings?: {
        parsed: Record<string, any>
        current: Record<string, any> | null
        changes: Array<{ field: string; from: any; to: any }>
      }
      items?: {
        matched: Array<{
          sheetName: string
          dbName: string
          dbId: string
          updates: Record<string, any>
          specCount: number
        }>
        unmatched: Array<{ name: string; raid: string; category: string }>
        totalUpdated?: number
      }
      settingsApplied?: boolean
      itemsUpdated?: number
    } = {}

    // --- Settings Import ---
    if (settingsCSV) {
      const parsed = parseInformationTab(settingsCSV)

      // Filter to allowed fields only
      const sanitized: Record<string, any> = {}
      for (const field of ALLOWED_SETTINGS_FIELDS) {
        if (field in parsed) {
          sanitized[field] = (parsed as any)[field]
        }
      }

      // Get current settings for diff
      const { data: currentSettings } = await serviceSupabase
        .from('guild_settings')
        .select('*')
        .eq('guild_id', guildId)
        .single()

      // Build changes list
      const changes: Array<{ field: string; from: any; to: any }> = []
      for (const [field, newValue] of Object.entries(sanitized)) {
        const currentValue = currentSettings?.[field]
        const isDifferent = JSON.stringify(currentValue) !== JSON.stringify(newValue)
        if (isDifferent) {
          changes.push({ field, from: currentValue ?? null, to: newValue })
        }
      }

      result.settings = {
        parsed: sanitized,
        current: currentSettings || null,
        changes,
      }

      if (!dryRun && changes.length > 0) {
        if (currentSettings) {
          const { error } = await serviceSupabase
            .from('guild_settings')
            .update({ ...sanitized, updated_at: new Date().toISOString() })
            .eq('guild_id', guildId)

          if (error) {
            console.error('Error updating settings:', error)
            return NextResponse.json({ error: 'Couldn\'t update guild settings.' }, { status: 500 })
          }
        } else {
          const { error } = await serviceSupabase
            .from('guild_settings')
            .insert({ guild_id: guildId, ...sanitized })

          if (error) {
            console.error('Error inserting settings:', error)
            return NextResponse.json({ error: 'Couldn\'t create guild settings.' }, { status: 500 })
          }
        }
        result.settingsApplied = true
      }
    }

    // --- Items Import ---
    if (itemsCSV && expansionId) {
      const sheetItems = parseItemsTab(itemsCSV)

      // Load DB items for the expansion
      const { data: tiers } = await serviceSupabase
        .from('raid_tiers')
        .select('id, name')
        .eq('expansion_id', expansionId)
        .eq('is_guild_active', true)

      if (!tiers || tiers.length === 0) {
        return NextResponse.json({ error: 'No active raid tiers found for this expansion.' }, { status: 400 })
      }

      const tierIds = tiers.map(t => t.id)
      const tierNameMap = new Map(tiers.map(t => [t.id, t.name]))

      // Load all loot items for these tiers
      const { data: dbItemsRaw } = await serviceSupabase
        .from('loot_items')
        .select('id, name, item_slot, raid_tier_id, classification, is_available')
        .in('raid_tier_id', tierIds)

      if (!dbItemsRaw || dbItemsRaw.length === 0) {
        return NextResponse.json({ error: 'No loot items found. Make sure the expansion is seeded.' }, { status: 400 })
      }

      const dbItems = dbItemsRaw.map(item => ({
        ...item,
        raid_tier_name: tierNameMap.get(item.raid_tier_id) || '',
      }))

      // Debug: log first few items from each side
      console.log('[sheet-import] Sheet items:', sheetItems.length, 'first:', sheetItems[0]?.baseName)
      console.log('[sheet-import] DB items:', dbItems.length, 'first:', dbItems[0]?.name)
      if (sheetItems.length > 0 && dbItems.length > 0) {
        // Test normalize on first items
        const testSheet = sheetItems[0].baseName.toLowerCase().replace(/['\u2018\u2019]/g, "'").replace(/[^\w\s'()]/g, '').replace(/\s+/g, ' ').trim()
        const testDb = dbItems[0].name.toLowerCase().replace(/['\u2018\u2019]/g, "'").replace(/[^\w\s'()]/g, '').replace(/\s+/g, ' ').trim()
        console.log('[sheet-import] Normalized sheet:', JSON.stringify(testSheet))
        console.log('[sheet-import] Normalized DB:', JSON.stringify(testDb))
      }

      // Match sheet items to DB items
      const { matched, unmatched } = matchItemsToDb(sheetItems, dbItems)

      result.items = {
        matched: matched.map(m => ({
          sheetName: m.sheetItem.name,
          dbName: m.dbItem.name,
          dbId: m.dbItem.id,
          updates: m.updates,
          specCount: m.specEntries.length,
        })),
        unmatched: unmatched.map(u => ({
          name: u.name,
          raid: u.raid,
          category: u.category,
        })),
      }

      if (!dryRun) {
        let totalUpdated = 0

        // Load specs + classes for name → ID resolution
        const { data: classSpecs } = await serviceSupabase
          .from('class_specs')
          .select('id, name, class_id, wow_classes!inner(name)')

        const { data: wowClasses } = await serviceSupabase
          .from('wow_classes')
          .select('id, name')

        if (!classSpecs || !wowClasses) {
          return NextResponse.json({ error: 'Couldn\'t load class/spec data.' }, { status: 500 })
        }

        // Build spec name → { spec_id, class_id } lookup
        const specLookup = new Map<string, { specId: string; classId: string }>()
        for (const spec of classSpecs) {
          const className = Array.isArray(spec.wow_classes)
            ? (spec.wow_classes as any)[0]?.name
            : (spec.wow_classes as any)?.name
          const combinedName = spec.name === className ? spec.name : `${spec.name} ${className}`
          specLookup.set(combinedName, { specId: spec.id, classId: spec.class_id })
        }

        // Batch update loot items
        for (const m of matched) {
          if (Object.keys(m.updates).length > 0) {
            const { error } = await serviceSupabase
              .from('loot_items')
              .update(m.updates)
              .eq('id', m.dbItem.id)

            if (error) {
              console.error(`Error updating item ${m.dbItem.name}:`, error)
            } else {
              totalUpdated++
            }
          }

          // Update class/spec priorities: delete existing then insert new
          if (m.specEntries.length > 0) {
            // Delete existing entries for this item
            await serviceSupabase
              .from('loot_item_classes')
              .delete()
              .eq('loot_item_id', m.dbItem.id)

            // Build insert rows
            const rows = m.specEntries
              .map(entry => {
                const lookup = specLookup.get(entry.spec_name)
                if (!lookup) return null
                return {
                  loot_item_id: m.dbItem.id,
                  class_id: lookup.classId,
                  spec_id: lookup.specId,
                  spec_type: entry.spec_type,
                }
              })
              .filter((r): r is NonNullable<typeof r> => r !== null)

            if (rows.length > 0) {
              const { error } = await serviceSupabase
                .from('loot_item_classes')
                .insert(rows)

              if (error) {
                console.error(`Error inserting specs for ${m.dbItem.name}:`, error)
              } else {
                totalUpdated++
              }
            }
          }
        }

        result.itemsUpdated = totalUpdated

        await trackEvent({
          event: 'sheet_import_completed',
          userId: user.id,
          guildId: guildId,
          properties: {
            guild_id: guildId,
            expansion_id: expansionId,
            items_matched: matched.length,
            items_unmatched: unmatched.length,
            items_updated: totalUpdated,
            settings_imported: !!settingsCSV,
          },
        })
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in sheet import:', error)
    trackApiError('unknown', 'POST /api/admin/sheet-import', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Import failed. Check your CSV format.' },
      { status: 500 }
    )
  }
}

import { createClient, getAuthenticatedUser } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { logAudit } from '@/utils/audit/log'
import { trackEvent } from '@/utils/analytics/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  try {
    // Fast auth check using getSession (no network call)
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Get guild_id from query params
    const { searchParams } = new URL(request.url)
    const guildId = searchParams.get('guild_id')

    if (!guildId) {
      return NextResponse.json({ error: 'guild_id is required' }, { status: 400 })
    }

    // Verify user is a member of this guild
    // First get user's characters
    const { data: userCharacters } = await supabase
      .from('characters')
      .select('id')
      .eq('user_id', user.id)

    if (!userCharacters || userCharacters.length === 0) {
      return NextResponse.json({ error: 'No characters found' }, { status: 403 })
    }

    const characterIds = userCharacters.map(c => c.id)

    // Check if any of the user's characters are in this guild
    const { data: membership } = await supabase
      .from('character_guild_memberships')
      .select('id')
      .eq('guild_id', guildId)
      .in('character_id', characterIds)
      .limit(1)

    if (!membership || membership.length === 0) {
      return NextResponse.json({ error: 'Not a member of this guild' }, { status: 403 })
    }

    // Get guild settings
    const { data: settings, error } = await supabase
      .from('guild_settings')
      .select('*')
      .eq('guild_id', guildId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error fetching guild settings:', error)
      return NextResponse.json({ error: 'Failed to fetch guild settings' }, { status: 500 })
    }

    // If no settings exist yet, return defaults
    if (!settings) {
      // Default reset date to 4 weeks ago
      const defaultResetDate = new Date()
      defaultResetDate.setDate(defaultResetDate.getDate() - 28)

      return NextResponse.json(
        {
          settings: {
            // General Settings
            raid_days_per_week: 2,
            first_raid_day: 2, // Tuesday
            second_raid_day: 1, // Monday
            third_raid_day: null,
            reset_date: defaultResetDate.toISOString().split('T')[0],
            decimal_places: 2,

            // Attendance Settings
            attendance_type: 'linear',
            rolling_attendance_weeks: 4,
            use_signups: true,
            signup_weight: 0.25,

            // Attendance Bonus Tiers
            max_attendance_bonus: 4.0,
            max_attendance_threshold: 0.9,
            middle_attendance_bonus: 2.0,
            middle_attendance_threshold: 0.5,
            bottom_attendance_bonus: 1.0,
            bottom_attendance_threshold: 0.25,

            // Minimum Raids
            minimum_raid_days_enabled: true,
            minimum_raid_days: 2,

            // Late/Early Penalty
            late_early_penalty_enabled: true,
            late_early_penalty_value: 0.25,

            // Bad Luck Prevention
            see_item_bonus: true,
            see_item_bonus_value: 1.0,
            pass_item_bonus: false,
            pass_item_bonus_value: 0.0,

            // Rank, Role, Class Bonuses
            guild_rank_bonuses_enabled: true,
            number_of_ranks: 5,
            rank_modifiers: {
              'Guild Master': 0,
              'Officer': 0,
              'Member': 0
            },
            role_bonus_priority_single_item: true,
            class_bonus_priority_single_item: true,
            raid_roles_overall_bonus_priority: true,
            single_raider_overall_bonus: true,
            single_raider_bonus_single_item: true,

            // Donation Settings
            donation_bonuses_enabled: false,
            donation_cap_enabled: false,
            donation_bonus_type: 'rolling',

            // Trial System
            trial_penalty_enabled: false,
            trial_penalty_value: -2.0,
            trial_auto_promote_enabled: false,
            trial_auto_promote_weeks: 4,
            new_members_start_as_trial: false
          }
        },
        {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        }
      )
    }

    return NextResponse.json(
      { settings },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    )
  } catch (error) {
    console.error('Error in guild settings GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    // Fast auth check using getSession (no network call)
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    const body = await request.json()
    const { guild_id, settings } = body

    if (!guild_id || !settings) {
      return NextResponse.json({ error: 'guild_id and settings are required' }, { status: 400 })
    }

    // Check if user is guild creator (always has officer permissions)
    const { data: guild } = await supabase
      .from('guilds')
      .select('created_by')
      .eq('id', guild_id)
      .single()

    const isGuildCreator = guild?.created_by === user.id

    // If not guild creator, verify user is an officer via character membership
    if (!isGuildCreator) {
      // Get user's characters
      const { data: userCharacters } = await supabase
        .from('characters')
        .select('id')
        .eq('user_id', user.id)

      if (!userCharacters || userCharacters.length === 0) {
        return NextResponse.json({ error: 'No characters found' }, { status: 403 })
      }

      const characterIds = userCharacters.map(c => c.id)

      // Get user's membership in this guild
      const { data: membership } = await supabase
        .from('character_guild_memberships')
        .select('role')
        .eq('guild_id', guild_id)
        .in('character_id', characterIds)
        .eq('is_active', true)
        .limit(1)
        .single()

      if (!membership) {
        return NextResponse.json({ error: 'Not a member of this guild' }, { status: 403 })
      }

      // Check if user is an officer (position >= 50) using guild_roles
      const { data: roleData } = await supabase
        .from('guild_roles')
        .select('position')
        .eq('guild_id', guild_id)
        .eq('name', membership.role)
        .single()

      // Fallback: if no guild_roles entry, check against default positions
      const position = roleData?.position ?? (
        membership.role === 'Guild Master' ? 100 :
        membership.role === 'Officer' ? 50 : 0
      )

      if (position < 50) {
        return NextResponse.json({ error: 'Only officers can update guild settings' }, { status: 403 })
      }
    }

    // Check if settings exist and get current values for audit logging
    const { data: existingSettings } = await supabase
      .from('guild_settings')
      .select('*')
      .eq('guild_id', guild_id)
      .single()

    let result
    if (existingSettings) {
      // Update existing settings
      const { data, error } = await supabase
        .from('guild_settings')
        .update({
          ...settings,
          updated_at: new Date().toISOString()
        })
        .eq('guild_id', guild_id)
        .select()
        .single()

      if (error) {
        console.error('Error updating guild settings:', error)
        return NextResponse.json({ error: 'Failed to update guild settings' }, { status: 500 })
      }
      result = data
    } else {
      // Insert new settings
      const { data, error } = await supabase
        .from('guild_settings')
        .insert({
          guild_id,
          ...settings
        })
        .select()
        .single()

      if (error) {
        console.error('Error inserting guild settings:', error)
        return NextResponse.json({ error: 'Failed to create guild settings' }, { status: 500 })
      }
      result = data
    }

    // Audit logging - track settings changes
    if (result) {
      await logAudit({
        supabase,
        guildId: guild_id,
        tableName: 'guild_settings',
        recordId: result.id,
        action: existingSettings ? 'UPDATE' : 'INSERT',
        userId: user.id,
        oldData: existingSettings || null,
        newData: result,
      })

      // Analytics tracking
      await trackEvent({
        event: 'guild_settings_updated',
        userId: user.id,
        properties: {
          guild_id,
          is_new_settings: !existingSettings,
        },
      })
    }

    return NextResponse.json({ settings: result })
  } catch (error) {
    console.error('Error in guild settings PUT:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

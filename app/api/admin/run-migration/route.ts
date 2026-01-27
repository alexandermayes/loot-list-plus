import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/utils/supabase/server'

// List of user IDs that are allowed to perform super-admin operations
const SUPER_ADMIN_IDS = process.env.SUPER_ADMIN_IDS?.split(',') || []

export async function GET() {
  try {
    // SECURITY: Require authentication
    const authClient = await createServerClient()
    const { data: { user } } = await authClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // SECURITY: Only allow in development OR if user is a super-admin
    const isDevelopment = process.env.NODE_ENV === 'development'
    const isSuperAdmin = SUPER_ADMIN_IDS.includes(user.id)

    if (!isDevelopment && !isSuperAdmin) {
      return NextResponse.json(
        { error: 'This operation is only allowed in development or by super-admins' },
        { status: 403 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json({ error: 'Missing Supabase credentials' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const results: string[] = []

    // Migration 1: Set is_guild_active to true for ALL raid_tiers
    const { data: updatedTiers, error: raidTiersError } = await supabase
      .from('raid_tiers')
      .update({ is_guild_active: true })
      .eq('is_guild_active', false)
      .select('id')

    if (raidTiersError && raidTiersError.code === '42703') {
      results.push('is_guild_active column needs to be added via SQL Editor')
    } else if (raidTiersError) {
      results.push(`raid_tiers migration: ${raidTiersError.message}`)
    } else {
      results.push(`raid_tiers is_guild_active: OK (${updatedTiers?.length || 0} updated)`)
    }

    // Migration 2: Seed default guild_roles for guilds missing them
    // First get all guilds
    const { data: guilds } = await supabase.from('guilds').select('id')

    if (guilds && guilds.length > 0) {
      let rolesSeeded = 0

      for (const guild of guilds) {
        // Check if guild has roles
        const { data: existingRoles } = await supabase
          .from('guild_roles')
          .select('name')
          .eq('guild_id', guild.id)

        const existingRoleNames = new Set(existingRoles?.map(r => r.name) || [])

        const rolesToInsert = []

        if (!existingRoleNames.has('Member')) {
          rolesToInsert.push({
            guild_id: guild.id,
            name: 'Member',
            color_hex: '#a1a1a1',
            position: 0,
            is_default: true
          })
        }

        if (!existingRoleNames.has('Officer')) {
          rolesToInsert.push({
            guild_id: guild.id,
            name: 'Officer',
            color_hex: '#fbbf24',
            position: 50,
            is_default: true
          })
        }

        if (!existingRoleNames.has('Guild Master')) {
          rolesToInsert.push({
            guild_id: guild.id,
            name: 'Guild Master',
            color_hex: '#ff8000',
            position: 100,
            is_default: true
          })
        }

        if (rolesToInsert.length > 0) {
          const { error: insertError } = await supabase
            .from('guild_roles')
            .insert(rolesToInsert)

          if (!insertError) {
            rolesSeeded += rolesToInsert.length
          }
        }
      }

      results.push(`guild_roles seeded: ${rolesSeeded} roles for ${guilds.length} guilds`)
    } else {
      results.push('guild_roles: No guilds found')
    }

    return NextResponse.json({
      success: true,
      message: 'Migrations applied',
      results
    })
  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

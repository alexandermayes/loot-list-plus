import { NextRequest, NextResponse } from 'next/server'
import { createClient, getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { revalidateUserBundle } from '@/lib/cache/user-bundle'
import { setUserMilestone, trackEvent } from '@/utils/analytics/server'
import { evaluateGuildFunnel } from '@/utils/analytics/funnel'
import { getDefaultRoleName } from '@/domain/guild/default-role'

// GET - Validate invite code and get guild info (works without auth for invite preview)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params

    if (!code) {
      return NextResponse.json(
        { error: 'Invite code is required' },
        { status: 400 }
      )
    }

    // Use service role to allow unauthenticated invite preview
    const serviceSupabase = createServiceRoleClient()

    // Get invite code details
    const { data: inviteCode, error: codeError } = await serviceSupabase
      .from('guild_invite_codes')
      .select(`
        id,
        code,
        guild_id,
        expires_at,
        max_uses,
        current_uses,
        is_active,
        guild:guilds (
          id,
          name,
          realm,
          faction
        )
      `)
      .eq('code', code)
      .single()

    if (codeError || !inviteCode) {
      return NextResponse.json(
        { error: 'Invalid invite code' },
        { status: 404 }
      )
    }

    // Check if code is active
    if (!inviteCode.is_active) {
      return NextResponse.json(
        { error: 'This invite code has been deactivated' },
        { status: 400 }
      )
    }

    // Check if code is expired
    if (inviteCode.expires_at && new Date(inviteCode.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'This invite code has expired' },
        { status: 400 }
      )
    }

    // Check if code has reached max uses
    if (inviteCode.max_uses && inviteCode.current_uses >= inviteCode.max_uses) {
      return NextResponse.json(
        { error: 'This invite code has reached its maximum uses' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      valid: true,
      guild: inviteCode.guild,
      expires_at: inviteCode.expires_at,
      uses_remaining: inviteCode.max_uses
        ? inviteCode.max_uses - inviteCode.current_uses
        : null
    })
  } catch (error) {
    console.error('Error in GET /api/guild-invites/[code]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Redeem invite code (join guild)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params

    // Fast auth check using getSession (no network call)
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    if (!code) {
      return NextResponse.json(
        { error: 'Invite code is required' },
        { status: 400 }
      )
    }

    // Atomically validate and claim a use of the invite code via RPC.
    // This prevents the race condition where concurrent requests could
    // read the same current_uses value and both increment, exceeding max_uses.
    const { data: redeemResult, error: redeemError } = await supabase
      .rpc('redeem_invite_code', { code_input: code })

    if (redeemError) {
      console.error('[INVITE JOIN] Error calling redeem_invite_code RPC:', redeemError)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }

    const redeemed = Array.isArray(redeemResult) ? redeemResult[0] : redeemResult

    if (!redeemed) {
      return NextResponse.json(
        { error: 'Invalid invite code' },
        { status: 404 }
      )
    }

    // Map RPC error codes to user-facing error responses
    if (redeemed.error_code) {
      const errorMap: Record<string, { error: string; status: number }> = {
        NOT_FOUND: { error: 'Invalid invite code', status: 404 },
        DEACTIVATED: { error: 'This invite code has been deactivated', status: 400 },
        EXPIRED: { error: 'This invite code has expired', status: 400 },
        MAX_USES_REACHED: { error: 'This invite code has reached its maximum uses', status: 400 },
      }
      const mapped = errorMap[redeemed.error_code] || { error: 'Invalid invite code', status: 400 }
      return NextResponse.json({ error: mapped.error }, { status: mapped.status })
    }

    // Invite code is now atomically claimed. Extract details from the RPC result.
    const guildId = redeemed.invite_guild_id

    // Use service role client to bypass RLS for character operations
    const serviceSupabase = createServiceRoleClient()

    // Resolve the guild's default role name (lowest-position role)
    const defaultRole = await getDefaultRoleName(guildId)

    // Get the guild details for realm
    const { data: guildData } = await supabase
      .from('guilds')
      .select('realm')
      .eq('id', guildId)
      .single()

    // Check if user has a properly configured character (with class set)
    const { data: existingCharacters } = await serviceSupabase
      .from('characters')
      .select('id, class_id')
      .eq('user_id', user.id)
      .not('class_id', 'is', null)
      .order('is_main', { ascending: false })
      .limit(1)

    if (!existingCharacters || existingCharacters.length === 0) {
      // No valid character - set guild as active and prompt character creation
      await serviceSupabase
        .from('user_active_characters')
        .upsert({
          user_id: user.id,
          active_character_id: null,
          active_guild_id: guildId,
          updated_at: new Date().toISOString()
        })

      trackEvent({ event: 'guild_joined', userId: user.id, guildId })
      evaluateGuildFunnel(serviceSupabase, guildId)

      return NextResponse.json({
        success: true,
        guild_id: guildId,
        needs_character_creation: true,
        message: 'Joined guild - please create a character'
      })
    }

    const characterId = existingCharacters[0].id

    // Check if character is already an ACTIVE member of this guild
    const { data: existingMembership } = await serviceSupabase
      .from('character_guild_memberships')
      .select('id, is_active')
      .eq('character_id', characterId)
      .eq('guild_id', guildId)
      .single()

    // Check if new members should start as trial
    const { data: joinSettings } = await serviceSupabase
      .from('guild_settings')
      .select('new_members_start_as_trial')
      .eq('guild_id', guildId)
      .single()
    const startAsTrial = joinSettings?.new_members_start_as_trial === true
    const trialFields = startAsTrial
      ? { membership_status: 'trial' as const, trial_started_at: new Date().toISOString() }
      : {}

    if (existingMembership) {
      if (existingMembership.is_active) {
        return NextResponse.json(
          { error: 'You are already a member of this guild' },
          { status: 400 }
        )
      }

      // Reactivate inactive membership (user rejoining)
      const { error: reactivateError } = await serviceSupabase
        .from('character_guild_memberships')
        .update({
          is_active: true,
          role: defaultRole,
          joined_at: new Date().toISOString(),
          joined_via: 'invite_code',
          ...trialFields,
        })
        .eq('id', existingMembership.id)

      if (reactivateError) {
        console.error('[INVITE JOIN] Error reactivating membership:', reactivateError)
        return NextResponse.json(
          { error: 'Couldn\'t rejoin guild. Try again or contact an officer.' },
          { status: 500 }
        )
      }

      // Set as active character and guild for user
      await serviceSupabase
        .from('user_active_characters')
        .upsert({
          user_id: user.id,
          active_character_id: characterId,
          active_guild_id: guildId,
          updated_at: new Date().toISOString()
        })

      revalidateUserBundle(user.id)
      trackEvent({ event: 'guild_joined', userId: user.id, guildId })
      evaluateGuildFunnel(serviceSupabase, guildId)

      return NextResponse.json({
        success: true,
        guild_id: guildId,
        message: 'Successfully rejoined guild'
      })
    }

    // Create character guild membership
    const { error: memberError } = await serviceSupabase
      .from('character_guild_memberships')
      .insert({
        character_id: characterId,
        guild_id: guildId,
        role: defaultRole,
        is_active: true,
        joined_at: new Date().toISOString(),
        joined_via: 'invite_code',
        ...trialFields,
      })

    if (memberError) {
      console.error('[INVITE JOIN] Error creating character guild membership:', memberError)
      return NextResponse.json(
        { error: 'Couldn\'t join guild. Try again or contact an officer.' },
        { status: 500 }
      )
    }

    // Set as active character and guild for user
    await serviceSupabase
      .from('user_active_characters')
      .upsert({
        user_id: user.id,
        active_character_id: characterId,
        active_guild_id: guildId,
        updated_at: new Date().toISOString()
      })

    revalidateUserBundle(user.id)
    setUserMilestone(user.id, 'first_guild_joined_at')
    trackEvent({ event: 'guild_joined', userId: user.id, guildId })
    evaluateGuildFunnel(serviceSupabase, guildId)

    return NextResponse.json({
      success: true,
      guild_id: guildId,
      message: 'Successfully joined guild'
    })
  } catch (error) {
    console.error('Error in POST /api/guild-invites/[code]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

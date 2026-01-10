import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// POST - Generate a new invite code
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { guild_id, expires_at, max_uses } = body

    if (!guild_id) {
      return NextResponse.json(
        { error: 'Guild ID is required' },
        { status: 400 }
      )
    }

    // Check if user is an officer of this guild
    const { data: membership } = await supabase
      .from('guild_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('guild_id', guild_id)
      .single()

    if (!membership || membership.role !== 'Officer') {
      return NextResponse.json(
        { error: 'Only officers can generate invite codes' },
        { status: 403 }
      )
    }

    // Generate a random invite code using the database function
    const { data: codeData, error: codeError } = await supabase
      .rpc('generate_invite_code')

    if (codeError || !codeData) {
      console.error('Error generating invite code:', codeError)
      return NextResponse.json(
        { error: 'Failed to generate invite code' },
        { status: 500 }
      )
    }

    const code = codeData as string

    // Create the invite code record
    const { data: inviteCode, error: insertError } = await supabase
      .from('guild_invite_codes')
      .insert({
        guild_id,
        code,
        created_by: user.id,
        expires_at: expires_at || null,
        max_uses: max_uses || null,
        current_uses: 0,
        is_active: true
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating invite code:', insertError)
      return NextResponse.json(
        { error: 'Failed to create invite code' },
        { status: 500 }
      )
    }

    // Get the current origin for share URL
    const origin = request.nextUrl.origin

    return NextResponse.json({
      success: true,
      invite_code: {
        id: inviteCode.id,
        code: inviteCode.code,
        share_url: `${origin}/guild-select/join?code=${inviteCode.code}`,
        expires_at: inviteCode.expires_at,
        max_uses: inviteCode.max_uses,
        current_uses: inviteCode.current_uses,
        is_active: inviteCode.is_active,
        created_at: inviteCode.created_at
      }
    })
  } catch (error) {
    console.error('Error in POST /api/guild-invites:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET - List guild's invite codes
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get guild_id from query params
    const { searchParams } = new URL(request.url)
    const guild_id = searchParams.get('guild_id')

    if (!guild_id) {
      return NextResponse.json(
        { error: 'Guild ID is required' },
        { status: 400 }
      )
    }

    // Check if user is an officer of this guild
    const { data: membership } = await supabase
      .from('guild_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('guild_id', guild_id)
      .single()

    if (!membership || membership.role !== 'Officer') {
      return NextResponse.json(
        { error: 'Only officers can view invite codes' },
        { status: 403 }
      )
    }

    // Get all invite codes for this guild
    const { data: inviteCodes, error: codesError } = await supabase
      .from('guild_invite_codes')
      .select('*')
      .eq('guild_id', guild_id)
      .order('created_at', { ascending: false })

    if (codesError) {
      console.error('Error fetching invite codes:', codesError)
      return NextResponse.json(
        { error: 'Failed to fetch invite codes' },
        { status: 500 }
      )
    }

    const origin = request.nextUrl.origin

    return NextResponse.json({
      invite_codes: (inviteCodes || []).map(code => ({
        id: code.id,
        code: code.code,
        share_url: `${origin}/guild-select/join?code=${code.code}`,
        expires_at: code.expires_at,
        max_uses: code.max_uses,
        current_uses: code.current_uses,
        is_active: code.is_active,
        created_at: code.created_at
      }))
    })
  } catch (error) {
    console.error('Error in GET /api/guild-invites:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

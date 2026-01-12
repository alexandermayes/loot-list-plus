import { NextResponse } from 'next/server'

// Temporary debug endpoint to check if environment variables are loaded
export async function GET() {
  return NextResponse.json({
    hasDiscordToken: !!process.env.DISCORD_BOT_TOKEN,
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasSupabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    hasSupabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    discordTokenLength: process.env.DISCORD_BOT_TOKEN?.length || 0,
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV
  })
}

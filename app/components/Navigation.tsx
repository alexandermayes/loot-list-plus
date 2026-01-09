'use client'

import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { ArrowLeft, LogOut } from 'lucide-react'

interface NavigationProps {
  user: User | null
  characterName?: string
  className?: string
  classColor?: string
  role?: string
  showBack?: boolean
  backUrl?: string
  title?: string
}

export default function Navigation({
  user,
  characterName,
  className,
  classColor,
  role,
  showBack = false,
  backUrl = '/dashboard',
  title
}: NavigationProps) {
  const supabase = createClient()
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          {showBack && (
            <button
              onClick={() => router.push(backUrl)}
              className="text-muted-foreground hover:text-foreground transition flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          )}
          <h1 className="text-xl font-bold text-primary">{title || 'LootList+'}</h1>
        </div>
        <div className="flex items-center gap-4">
          {(characterName || user) && (
            <>
              <button
                onClick={() => router.push('/profile')}
                className="flex items-center gap-3 hover:opacity-80 transition"
              >
                <div className="text-right">
                  <p className="text-foreground font-medium">
                    {user?.user_metadata?.custom_claims?.global_name || user?.user_metadata?.full_name || user?.user_metadata?.name || characterName || 'User'}
                  </p>
                  {characterName && (
                    <p className="text-sm text-muted-foreground">
                      {characterName}
                      {className && role && (
                        <span style={{ color: classColor || '#888' }}> • {className}</span>
                      )}
                    </p>
                  )}
                </div>
                {user?.user_metadata?.provider_id && user?.user_metadata?.avatar_url && (
                  <img
                    src={user.user_metadata.avatar_url.startsWith('http')
                      ? user.user_metadata.avatar_url
                      : `https://cdn.discordapp.com/avatars/${user.user_metadata.provider_id}/${user.user_metadata.avatar_url}.png`}
                    alt="Avatar"
                    className="w-10 h-10 rounded-full border-2 border-border"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = 'https://cdn.discordapp.com/embed/avatars/0.png'
                    }}
                  />
                )}
              </button>
            </>
          )}
          <button
            onClick={handleLogout}
            className="text-muted-foreground hover:text-foreground transition flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    </header>
  )
}

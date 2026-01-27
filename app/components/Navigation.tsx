'use client'

import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowLeft01Icon, Logout01Icon, ArrowDown01Icon, Tick01Icon } from '@hugeicons/core-free-icons'
import { useGuildContext } from '../contexts/GuildContext'
import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'

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
  const { activeGuild, userGuilds, hasMultipleGuilds, switchGuild, loading: guildLoading } = useGuildContext()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleSwitchGuild = async (guildId: string) => {
    setDropdownOpen(false)
    await switchGuild(guildId)
    router.refresh()
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          {showBack && (
            <button
              onClick={() => router.push(backUrl)}
              className="text-muted-foreground hover:text-foreground transition flex items-center gap-2"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
              Back
            </button>
          )}
          <Image
            src="/logo.svg"
            alt="LootList+"
            width={160}
            height={34}
            className="h-8 w-auto cursor-pointer"
            priority
            onClick={() => router.push('/dashboard')}
          />
          {title && showBack && (
            <span className="text-muted-foreground">•</span>
          )}
          {title && showBack && (
            <h1 className="text-lg font-semibold text-foreground">{title}</h1>
          )}
        </div>

        {/* Guild Switcher */}
        {activeGuild && hasMultipleGuilds && !guildLoading && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-4 py-2 rounded-[52px] bg-background-elevated border border-border-strong hover:bg-muted focus:outline-none focus:border-accent transition"
            >
              <span className="text-sm font-medium text-foreground">{activeGuild.name}</span>
              <HugeiconsIcon icon={ArrowDown01Icon} size={16} className="text-muted-foreground" />
            </button>

            {dropdownOpen && (
              <div className="absolute top-full mt-2 left-0 w-64 bg-background-elevated border border-border-strong rounded-lg shadow-lg z-50">
                <div className="p-2">
                  <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Your Guilds
                  </div>
                  {userGuilds.map((guild) => (
                    <button
                      key={guild.guild.id}
                      onClick={() => handleSwitchGuild(guild.guild.id)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded hover:bg-muted transition text-left"
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-foreground">{guild.guild.name}</span>
                        {guild.guild.realm && (
                          <span className="text-xs text-muted-foreground">{guild.guild.realm}</span>
                        )}
                      </div>
                      {activeGuild.id === guild.guild.id && (
                        <HugeiconsIcon icon={Tick01Icon} size={16} className="text-green-400" />
                      )}
                    </button>
                  ))}
                  <div className="border-t border-border mt-2 pt-2">
                    <button
                      onClick={() => {
                        setDropdownOpen(false)
                        router.push('/guild-select')
                      }}
                      className="w-full px-3 py-2 flex items-center gap-3 hover:bg-muted rounded-lg transition text-left"
                    >
                      <svg className="w-5 h-5 shrink-0 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                      <div className="flex-1">
                        <p className="font-poppins font-medium text-[13px] text-primary">
                          Join a guild
                        </p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

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
            <HugeiconsIcon icon={Logout01Icon} size={16} />
            Sign Out
          </button>
        </div>
      </div>
    </header>
  )
}

'use client'

import { createClient } from '@/utils/supabase/client'
import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { trackClientEvent } from '@/utils/analytics/client'
import { Button } from '@/components/ui/button'
import { Modal, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter } from '@/components/ui/modal'
import { HugeiconsIcon } from '@hugeicons/react'
import { Key01Icon } from '@hugeicons/core-free-icons'

export default function LoginPage() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const nextParam = searchParams.get('next')

  // Extract invite code from next param if it's an invite link
  const inviteCode = nextParam?.match(/code=([A-Z0-9]+)/)?.[1] || null
  const [guildInfo, setGuildInfo] = useState<{ guild: { name: string; realm: string | null; faction: string } } | null>(null)
  const [showInviteModal, setShowInviteModal] = useState(false)

  useEffect(() => {
    if (inviteCode) {
      fetch(`/api/guild-invites/${inviteCode}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.guild) {
            setGuildInfo(data)
            setShowInviteModal(true)
          }
        })
        .catch(() => {})
    }
  }, [inviteCode])

  const handleDiscordLogin = async () => {
    trackClientEvent('sign_in_clicked')
    const callbackUrl = nextParam
      ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextParam)}`
      : `${window.location.origin}/auth/callback`
    await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: callbackUrl,
        scopes: 'identify guilds'
      }
    })
  }

  return (
    <div className="min-h-screen bg-[#151515] flex">
      {/* Left side - Background image */}
      <div className="hidden lg:block lg:w-1/2 relative">
        {/* Logo in top left */}
        <div className="absolute top-[60px] left-[60px] z-10">
          <Image
            src="/logo.svg"
            alt="LootList+"
            width={179}
            height={28}
            className="h-7 w-auto"
          />
        </div>

        {/* Background image */}
        <div className="absolute inset-0">
          <picture>
            <source
              type="image/webp"
              srcSet="/images/landing/landing-background-640w.webp 640w, /images/landing/landing-background-1024w.webp 1024w, /images/landing/landing-background-1920w.webp 1920w, /images/landing/landing-background-2560w.webp 2560w"
              sizes="50vw"
            />
            <Image
              src="/images/landing/landing-background-2560w.webp"
              alt=""
              fill
              className="object-cover object-center"
              priority
              quality={82}
            />
          </picture>
        </div>
      </div>

      {/* Right side - Login content */}
      <div className="w-full lg:w-1/2 bg-[#09090c] flex flex-col min-h-screen">
        {/* Mobile logo - only shows on small screens */}
        <div className="lg:hidden p-6">
          <Image
            src="/logo.svg"
            alt="LootList+"
            width={140}
            height={22}
            className="h-6 w-auto"
          />
        </div>

        {/* Login button in top right */}
        <div className="absolute top-[50px] right-[60px] hidden lg:block">
          <Button
            onClick={handleDiscordLogin}
            variant="ghost"
            className="bg-[#141519] hover:bg-[#1c1d24] text-foreground text-base font-semibold px-5 py-3 rounded-full transition-colors"
          >
            Log in
          </Button>
        </div>

        {/* Centered content */}
        <div className="flex-1 flex items-center justify-center px-6 lg:px-[60px]">
          <div className="w-full max-w-[373px] flex flex-col items-center gap-[60px]">
            {/* Content section */}
            <div className="flex flex-col items-center gap-5 w-full">
              {/* LootList+ icon */}
              <Image
                src="/lootlist-icon.svg"
                alt=""
                width={33}
                height={44}
                className="w-8 h-11"
              />

              {/* Headline */}
              <h1 className="text-[32px] lg:text-[42px] font-bold text-foreground text-center leading-[1.02]">
                Epic loot deserves an epic system.
              </h1>

              {/* Description */}
              <p className="text-muted-foreground text-base text-center">
                LootList+ is a transparent loot management system for WoW guilds. Includes loot submissions, attendance tracking and more.
              </p>
            </div>

            {/* Buttons section */}
            <div className="flex flex-col gap-2.5 w-full">
              {/* Discord signup button */}
              <Button
                onClick={handleDiscordLogin}
                variant="primary"
                className="w-full bg-foreground hover:bg-foreground/90 text-[#0a0a0a] font-medium text-base px-5 py-3 rounded-full flex items-center justify-center gap-3 transition-colors border border-[#383838]"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                Sign up with Discord
              </Button>

              {/* Learn more button */}
              <a
                href="https://www.getlootlist.com"
                className="w-full bg-[#141519] hover:bg-[#1c1d24] text-foreground font-medium text-base px-5 py-3 rounded-full flex items-center justify-center transition-colors"
              >
                See how it works
              </a>

              {/* Terms and Privacy */}
              <p className="text-muted-foreground text-sm text-center mt-2">
                By continuing, you agree to our{' '}
                <Link href="/terms" className="text-foreground underline hover:text-foreground-secondary">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-foreground underline hover:text-foreground-secondary">
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Invite Code Modal */}
      {guildInfo && (
        <Modal open={showInviteModal} onClose={() => setShowInviteModal(false)} size="sm">
          <ModalHeader onClose={() => setShowInviteModal(false)}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <HugeiconsIcon icon={Key01Icon} size={20} className="text-accent" />
              </div>
              <div>
                <ModalTitle>You've been invited</ModalTitle>
                <ModalDescription>Sign in with Discord to join this guild</ModalDescription>
              </div>
            </div>
          </ModalHeader>
          <ModalBody>
            <div className="bg-background-subtle border border-border rounded-lg p-4 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Guild</p>
                <p className="text-base font-semibold text-foreground">{guildInfo.guild.name}</p>
              </div>
              <div className="flex gap-6">
                <div>
                  <p className="text-xs text-muted-foreground">Realm</p>
                  <p className="text-sm text-foreground">{guildInfo.guild.realm || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Faction</p>
                  <p className="text-sm text-foreground">{guildInfo.guild.faction}</p>
                </div>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="primary"
              onClick={handleDiscordLogin}
              className="w-full"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              Sign in with Discord to join
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  )
}

'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { HugeiconsIcon } from '@hugeicons/react'
import { Loading01Icon } from '@hugeicons/core-free-icons'
import Image from 'next/image'

export default function Home() {
  const [loading, setLoading] = useState(true)
  const [showLogin, setShowLogin] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        router.push('/dashboard')
      } else {
        setLoading(false)
      }
    }
    checkUser()
  }, [])

  const handleDiscordLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: 'identify email guilds guilds.members.read'
      }
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background-elevated flex items-center justify-center">
        <HugeiconsIcon icon={Loading01Icon} size={32} className="animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Background Image Section */}
      <div className="absolute inset-0 bg-background-elevated">
        <Image
          src="/landing-background.png"
          alt="Epic loot background"
          fill
          className="object-cover object-center"
          priority
          quality={100}
        />
      </div>

      {/* Logo in top left - Always visible */}
      <div className="absolute top-[60px] left-[60px] z-30">
        <Image
          src="/logo.svg"
          alt="LootList+"
          width={179}
          height={28}
          className="h-7 w-auto"
          priority
        />
      </div>

      {/* Animated Panel */}
      <div
        className={`absolute right-0 top-0 h-screen bg-background flex flex-col transition-all duration-500 ease-in-out ${
          showLogin ? 'w-full' : 'w-full md:w-[720px]'
        }`}
      >
        {/* Toggle Button */}
        <div className="absolute top-[50px] right-[60px] z-20">
          <button
            onClick={() => setShowLogin(!showLogin)}
            className="px-5 py-3 bg-background-elevated text-foreground font-poppins font-semibold text-base rounded-[60px] hover:bg-muted transition"
          >
            {showLogin ? 'Signup' : 'Login'}
          </button>
        </div>

        {/* Content Container */}
        <div className="relative flex-1 flex items-center justify-center px-[60px]">
          {/* Signup Content */}
          <div
            className={`absolute inset-0 flex items-center justify-center px-[60px] transition-opacity duration-300 ${
              showLogin ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
          >
            <div className="w-full max-w-[600px] flex flex-col items-center gap-[60px]">
              {/* Content Section */}
              <div className="w-full flex flex-col items-center gap-5">
                {/* Icon */}
                <div className="w-[33px] h-[44px] relative">
                  <Image
                    src="/lootlist-icon.svg"
                    alt="LootList+ Icon"
                    width={33}
                    height={44}
                    className="w-full h-full"
                  />
                </div>

                {/* Headline */}
                <h1 className="font-poppins font-bold text-[42px] leading-[43px] text-foreground text-center max-w-[600px]">
                  Epic loot deserves an epic system.
                </h1>

                {/* Description */}
                <p className="font-poppins font-normal text-base text-muted-foreground text-center max-w-[600px]">
                  LootList+ is a transparent loot management system for WoW guilds. Includes loot submissions, attendance, tracking, and more!
                </p>
              </div>

              {/* Buttons Section */}
              <div className="w-full max-w-[373px] flex flex-col gap-2.5">
                {/* Continue with Discord */}
                <button
                  onClick={handleDiscordLogin}
                  className="w-full px-5 py-3 bg-primary hover:bg-primary/90 transition border border-border-strong rounded-[52px] flex items-center justify-center gap-3"
                >
                  <Image
                    src="/discord-icon.svg"
                    alt="Discord"
                    width={24}
                    height={24}
                    className="w-6 h-6"
                  />
                  <span className="font-poppins font-medium text-base text-primary-foreground">
                    Continue with Discord
                  </span>
                </button>

                {/* Learn more */}
                <button className="w-full px-5 py-3 bg-background-elevated hover:bg-muted transition border border-border rounded-[52px] flex items-center justify-center">
                  <span className="font-poppins font-medium text-base text-foreground">
                    Learn more
                  </span>
                </button>

                {/* Terms and Privacy */}
                <p className="font-poppins font-normal text-sm text-muted-foreground text-center mt-0">
                  By continuing, you agree to our{' '}
                  <span className="text-foreground underline decoration-solid cursor-pointer hover:opacity-80">
                    Terms of Service
                  </span>
                  {' '}and{' '}
                  <span className="text-foreground underline decoration-solid cursor-pointer hover:opacity-80">
                    Privacy Policy
                  </span>.
                </p>
              </div>
            </div>
          </div>

          {/* Login Content */}
          <div
            className={`absolute inset-0 flex items-center justify-center px-[60px] transition-opacity duration-300 ${
              showLogin ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <div className="w-[500px] flex flex-col items-center gap-[30px]">
              {/* Content Section */}
              <div className="w-[500px] flex flex-col items-center gap-5">
                {/* Icon */}
                <div className="w-[33px] h-[44px] relative">
                  <Image
                    src="/lootlist-icon.svg"
                    alt="LootList+ Icon"
                    width={33}
                    height={44}
                    className="w-full h-full"
                  />
                </div>

                {/* Headline */}
                <h1 className="font-poppins font-bold text-[42px] leading-[43px] text-foreground text-center w-[500px]">
                  Login to LL+
                </h1>
              </div>

              {/* Buttons Section */}
              <div className="w-full flex flex-col items-center gap-2.5">
                {/* Continue with Discord */}
                <button
                  onClick={handleDiscordLogin}
                  className="px-[60px] py-3 bg-primary hover:bg-primary/90 transition border border-border-strong rounded-[52px] flex items-center justify-center gap-3 w-max"
                >
                  <Image
                    src="/discord-icon.svg"
                    alt="Discord"
                    width={24}
                    height={24}
                    className="w-6 h-6"
                  />
                  <span className="font-poppins font-medium text-base text-primary-foreground">
                    Continue with Discord
                  </span>
                </button>

                {/* Terms and Privacy */}
                <p className="font-poppins font-normal text-sm text-muted-foreground text-center" style={{ width: '100%', maxWidth: '312px' }}>
                  By continuing, you agree to our{' '}
                  <span className="text-foreground underline decoration-solid cursor-pointer hover:opacity-80">
                    Terms of Service
                  </span>
                  {' '}and{' '}
                  <span className="text-foreground underline decoration-solid cursor-pointer hover:opacity-80">
                    Privacy Policy
                  </span>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
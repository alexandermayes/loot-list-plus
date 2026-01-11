'use client'

import Image from 'next/image'
import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function WelcomeScreen() {
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleDiscordJoin = async () => {
    // TODO: Implement Discord guild sync
    alert('Discord integration coming soon!')
  }

  const handleCodeJoin = async () => {
    if (!inviteCode.trim()) {
      setError('Please enter an invite code')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Call the join guild function with the invite code
      const { data, error: joinError } = await supabase.rpc('join_guild_with_code', {
        p_invite_code: inviteCode.trim()
      })

      if (joinError) {
        setError(joinError.message || 'Invalid invite code')
      } else {
        // Successfully joined, refresh the page
        router.refresh()
      }
    } catch (err: any) {
      setError(err.message || 'Failed to join guild')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-[290px]">
      <div className="flex flex-col items-center gap-10 max-w-[817px] w-full">
        {/* Header */}
        <div className="flex flex-col items-center gap-5 text-center w-full">
          <Image
            src="/lootlist-icon.svg"
            alt="LootList+"
            width={33}
            height={44}
            className="w-[33px] h-[44px]"
          />
          <h1 className="font-poppins font-bold text-[42px] leading-[43px] text-white">
            Welcome to LootList+
          </h1>
          <p className="font-poppins font-normal text-base text-[#a1a1a1]">
            You're not a member of any guilds yet. Pick an option below to join one.
          </p>
        </div>

        {/* Join Options */}
        <div className="flex flex-col gap-6 w-full">
          <div className="flex gap-2.5 w-full">
            {/* Join via Discord */}
            <div className="flex-1 bg-[#151515] border border-[rgba(255,255,255,0.1)] rounded-[40px] p-6 pt-[43px] pb-6 flex flex-col gap-6 items-center">
              <div className="flex flex-col gap-6 items-center w-full">
                <Image
                  src="/icons/discord-large.svg"
                  alt="Discord"
                  width={44}
                  height={44}
                  className="w-11 h-11"
                />
                <div className="flex flex-col gap-1 text-center w-full">
                  <h2 className="font-poppins font-bold text-2xl text-white">
                    Join via Discord
                  </h2>
                  <p className="font-poppins font-normal text-sm text-[#a1a1a1]">
                    If your guild has Discord linked, you're in automatically.
                  </p>
                </div>
              </div>
              <button
                onClick={handleDiscordJoin}
                className="w-full bg-[#5865f2] hover:bg-[#4752c4] border border-[#383838] rounded-[52px] px-5 py-3 flex items-center justify-center gap-3 transition"
              >
                <Image
                  src="/icons/discord-white.svg"
                  alt="Discord"
                  width={24}
                  height={24}
                  className="w-6 h-6"
                />
                <span className="font-poppins font-medium text-base text-white">
                  Join with Discord
                </span>
              </button>
            </div>

            {/* Join with Code */}
            <div className="flex-1 bg-[#151515] border border-[rgba(255,255,255,0.1)] rounded-[40px] p-6 pt-[43px] pb-6 flex flex-col gap-6 items-center">
              <div className="flex flex-col gap-6 items-center w-full">
                <Image
                  src="/icons/password-validation.svg"
                  alt="Code"
                  width={44}
                  height={44}
                  className="w-11 h-11"
                />
                <div className="flex flex-col gap-1 text-center w-full">
                  <h2 className="font-poppins font-bold text-2xl text-white">
                    Join with Code
                  </h2>
                  <p className="font-poppins font-normal text-sm text-[#a1a1a1]">
                    Paste the code from your guild officer.
                  </p>
                </div>
              </div>
              <div className="flex gap-2.5 w-full">
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="ABC123DEF456"
                  className="flex-1 bg-[#151515] border border-[#383838] rounded-[52px] px-5 py-3 font-poppins font-medium text-base text-white placeholder:text-[#666] focus:outline-none focus:border-[#555]"
                  disabled={loading}
                />
                <button
                  onClick={handleCodeJoin}
                  disabled={loading || !inviteCode.trim()}
                  className="bg-white hover:bg-gray-100 disabled:bg-gray-600 disabled:cursor-not-allowed border border-[#383838] rounded-[52px] px-5 py-3 transition"
                >
                  <span className="font-poppins font-medium text-base text-black">
                    {loading ? 'Joining...' : 'Join'}
                  </span>
                </button>
              </div>
              {error && (
                <p className="text-red-400 text-sm font-poppins">{error}</p>
              )}
            </div>
          </div>

          {/* Help Section */}
          <div className="flex flex-col gap-2.5 items-center p-6 rounded-[40px] w-[409px] mx-auto">
            <div className="flex items-center justify-center gap-2.5">
              <Image
                src="/icons/help.svg"
                alt="Help"
                width={20}
                height={20}
                className="w-5 h-5"
              />
              <p className="font-poppins font-bold text-lg text-white">
                Need Help?
              </p>
            </div>
            <p className="font-poppins font-normal text-sm text-[#a1a1a1] text-center">
              Ask your guild officer for an invite code or Discord link. Setting up a new guild? You'll become the first officer.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

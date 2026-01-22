'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
export default function WelcomeScreen() {
  const [inviteCode, setInviteCode] = useState('')
  const [modalInviteCode, setModalInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [modalView, setModalView] = useState<'main' | 'discord'>('main')
  const [discordLoading, setDiscordLoading] = useState(false)
  const [availableGuilds, setAvailableGuilds] = useState<any[]>([])
  const [discordError, setDiscordError] = useState('')
  const [joining, setJoining] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Lock body scroll when modal is open
  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [showModal])

  const handleOpenDiscordModal = async () => {
    setModalView('discord')
    setDiscordLoading(true)
    setDiscordError('')
    setAvailableGuilds([])

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setDiscordError('Please log in first')
      setDiscordLoading(false)
      return
    }

    // Check Discord verification
    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('discord_verified')
      .eq('user_id', user.id)
      .single()

    // If not verified but user logged in with Discord, auto-verify them
    if (!preferences?.discord_verified) {
      console.log('User not verified, attempting auto-verification...')
      try {
        const verifyResponse = await fetch('/api/verify-discord', {
          method: 'POST'
        })

        if (!verifyResponse.ok) {
          const errorData = await verifyResponse.json()
          setDiscordError(errorData.error || 'Discord verification required. Please go to your Profile to verify your Discord account.')
          setDiscordLoading(false)
          return
        }

        console.log('Auto-verification successful')
      } catch (err) {
        console.error('Auto-verification failed:', err)
        setDiscordError('Discord verification required. Please go to your Profile to verify your Discord account.')
        setDiscordLoading(false)
        return
      }
    }

    // Fetch available guilds
    try {
      const response = await fetch('/api/discord-guilds')
      const data = await response.json()

      if (!response.ok) {
        const errorMessage = response.status === 429
          ? 'Discord rate limit reached. Please wait a moment and try again.'
          : data.error || 'Failed to load guilds'
        setDiscordError(errorMessage)
        setDiscordLoading(false)
        return
      }

      setAvailableGuilds(data.available_guilds || [])
      setDiscordLoading(false)
    } catch (err) {
      console.error('Error loading guilds:', err)
      setDiscordError('Failed to load available guilds')
      setDiscordLoading(false)
    }
  }

  const handleJoinDiscordGuild = async (guildId: string) => {
    setJoining(true)
    setDiscordError('')

    try {
      const response = await fetch('/api/discord-guilds/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ guild_id: guildId })
      })

      const data = await response.json()

      if (!response.ok) {
        setDiscordError(data.error || 'Failed to join guild')
        setJoining(false)
        return
      }

      // Success! Redirect to dashboard
      window.location.href = '/dashboard'
    } catch (err) {
      console.error('Error joining guild:', err)
      setDiscordError('An error occurred while joining the guild')
      setJoining(false)
    }
  }

  const handleCodeJoin = async () => {
    if (!inviteCode.trim()) {
      setError('Please enter an invite code')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/guild-invites/${inviteCode.trim()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Invalid invite code')
        setLoading(false)
        return
      }

      // Success! Redirect to dashboard
      window.location.href = '/dashboard'
    } catch (err: any) {
      setError(err.message || 'Failed to join guild')
      setLoading(false)
    }
  }

  const handleModalCodeJoin = async () => {
    if (!modalInviteCode.trim()) {
      return
    }

    setJoining(true)

    try {
      const response = await fetch(`/api/guild-invites/${modalInviteCode.trim()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (!response.ok) {
        setDiscordError(data.error || 'Invalid invite code')
        setJoining(false)
        return
      }

      // Success! Redirect to dashboard
      window.location.href = '/dashboard'
    } catch (err: any) {
      setDiscordError(err.message || 'Failed to join guild')
      setJoining(false)
    }
  }

  const handleDiscordJoin = () => {
    setShowModal(true)
    setModalView('main')
    setModalInviteCode('')
    setDiscordError('')
  }

  return (
    <>
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4 lg:px-[290px]">
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 w-full">
              {/* Join via Discord */}
              <div className="bg-[#151515] border border-[rgba(255,255,255,0.1)] rounded-[40px] p-6 pt-[43px] pb-6 flex flex-col items-center">
                <div className="flex flex-col gap-6 items-center w-full flex-1">
                  <Image
                    src="/icons/discord-large.svg"
                    alt="Discord"
                    width={44}
                    height={44}
                    className="w-11 h-11"
                  />
                  <div className="flex flex-col gap-1 text-center w-full">
                    <h2 className="font-poppins font-bold text-2xl text-white">
                      Join with Discord
                    </h2>
                    <p className="font-poppins font-normal text-sm text-[#a1a1a1]">
                      If your guild has Discord linked, you're in automatically.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowModal(true)
                    handleOpenDiscordModal()
                  }}
                  className="w-full bg-white hover:bg-gray-100 border border-[#383838] rounded-[52px] px-5 py-3 flex items-center justify-center transition mt-6"
                >
                  <span className="font-poppins font-medium text-base text-black">
                    Select guild
                  </span>
                </button>
              </div>

              {/* Join with Code */}
              <div className="bg-[#151515] border border-[rgba(255,255,255,0.1)] rounded-[40px] p-6 pt-[43px] pb-6 flex flex-col items-center">
                <div className="flex flex-col gap-6 items-center w-full flex-1">
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
                <div className="flex flex-col gap-2.5 w-full mt-6">
                  <div className="flex gap-2.5 w-full">
                    <input
                      type="text"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                      placeholder="ABC123DEF456"
                      className="flex-1 min-w-0 bg-[#151515] border border-[#383838] rounded-[52px] px-5 py-3 font-poppins font-medium text-base text-white placeholder:text-[#666] focus:outline-none focus:border-[#555]"
                      disabled={loading}
                    />
                    <button
                      onClick={handleCodeJoin}
                      disabled={loading || !inviteCode.trim()}
                      className="bg-white hover:bg-gray-100 disabled:bg-gray-600 disabled:cursor-not-allowed border border-[#383838] rounded-[52px] px-5 py-3 transition shrink-0"
                    >
                      <span className="font-poppins font-medium text-base text-black">
                        {loading ? 'Joining...' : 'Join'}
                      </span>
                    </button>
                  </div>
                  {error && (
                    <p className="text-red-400 text-sm font-poppins text-center">{error}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Help Section */}
            <div className="flex flex-col gap-2.5 items-center p-6 rounded-[40px] w-full lg:w-[409px] mx-auto">
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

      {/* Join via Discord Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          onClick={() => {
            setShowModal(false)
            setModalView('main')
          }}
        >
          <div
            className="bg-[#0d0e11] border border-[#383838] rounded-xl max-w-xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-[#383838] bg-[#141519]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#5865f2] rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5" viewBox="0 0 71 55" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M60.1045 4.8978C55.5792 2.8214 50.7265 1.2916 45.6527 0.41542C45.5603 0.39851 45.468 0.440769 45.4204 0.525289C44.7963 1.6353 44.105 3.0834 43.6209 4.2216C38.1637 3.4046 32.7345 3.4046 27.3892 4.2216C26.905 3.0581 26.1886 1.6353 25.5617 0.525289C25.5141 0.443589 25.4218 0.40133 25.3294 0.41542C20.2584 1.2888 15.4057 2.8186 10.8776 4.8978C10.8384 4.9147 10.8048 4.9429 10.7825 4.9795C1.57795 18.7309 -0.943561 32.1443 0.293408 45.3914C0.299005 45.4562 0.335386 45.5182 0.385761 45.5576C6.45866 50.0174 12.3413 52.7249 18.1147 54.5195C18.2071 54.5477 18.305 54.5139 18.3638 54.4378C19.7295 52.5728 20.9469 50.6063 21.9907 48.5383C22.0523 48.4172 21.9935 48.2735 21.8676 48.2256C19.9366 47.4931 18.0979 46.6 16.3292 45.5858C16.1893 45.5041 16.1781 45.304 16.3068 45.2082C16.679 44.9293 17.0513 44.6391 17.4067 44.3461C17.471 44.2926 17.5606 44.2813 17.6362 44.3151C29.2558 49.6202 41.8354 49.6202 53.3179 44.3151C53.3935 44.2785 53.4831 44.2898 53.5502 44.3433C53.9057 44.6363 54.2779 44.9293 54.6529 45.2082C54.7816 45.304 54.7732 45.5041 54.6333 45.5858C52.8646 46.6197 51.0259 47.4931 49.0921 48.2228C48.9662 48.2707 48.9102 48.4172 48.9718 48.5383C50.038 50.6034 51.2554 52.5699 52.5959 54.435C52.6519 54.5139 52.7526 54.5477 52.845 54.5195C58.6464 52.7249 64.529 50.0174 70.6019 45.5576C70.6551 45.5182 70.6887 45.459 70.6943 45.3942C72.1747 30.0791 68.2147 16.7757 60.1968 4.9823C60.1772 4.9429 60.1437 4.9147 60.1045 4.8978ZM23.7259 37.3253C20.2276 37.3253 17.3451 34.1136 17.3451 30.1693C17.3451 26.225 20.1717 23.0133 23.7259 23.0133C27.308 23.0133 30.1626 26.2532 30.1066 30.1693C30.1066 34.1136 27.28 37.3253 23.7259 37.3253ZM47.3178 37.3253C43.8196 37.3253 40.9371 34.1136 40.9371 30.1693C40.9371 26.225 43.7636 23.0133 47.3178 23.0133C50.9 23.0133 53.7545 26.2532 53.6986 30.1693C53.6986 34.1136 50.9 37.3253 47.3178 37.3253Z" fill="white"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-[20px] font-bold text-white">Join with Discord</h3>
                    <p className="text-[12px] text-[#a1a1a1]">Automatically join guilds from your Discord servers</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowModal(false)
                    setModalView('main')
                  }}
                  className="text-[#a1a1a1] hover:text-white transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1">
              {discordLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                  <p className="text-[14px] text-[#a1a1a1] mt-4">Loading available guilds...</p>
                </div>
              ) : discordError ? (
                <div className="flex flex-col gap-4 p-4 rounded-xl bg-red-950/50 border border-red-600/50">
                  <p className="text-[14px] text-red-200">{discordError}</p>
                  {discordError.includes('verification required') && (
                    <button
                      onClick={() => {
                        setShowModal(false)
                        setModalView('main')
                        router.push('/profile')
                      }}
                      className="bg-white hover:bg-gray-100 rounded-[52px] px-5 py-2.5 text-[14px] font-medium text-black transition"
                    >
                      Go to Profile to Verify Discord
                    </button>
                  )}
                </div>
              ) : availableGuilds.length === 0 ? (
                <div className="text-center py-8">
                  <p className="font-bold text-[18px] text-white mb-2">No guilds found</p>
                  <p className="text-[14px] text-[#a1a1a1] mb-4">
                    We didn't find any LootList+ guilds linked to your Discord servers.
                  </p>
                  <div className="bg-[#141519] border border-[#383838] rounded-xl p-4 text-left space-y-2">
                    <p className="text-[14px] text-white font-medium">Why this might happen:</p>
                    <ul className="text-[13px] text-[#a1a1a1] space-y-1 list-disc list-inside">
                      <li>No servers you're in use LootList+</li>
                      <li>You're already in all matching guilds</li>
                      <li>Discord integration isn't set up yet</li>
                    </ul>
                    <p className="text-[13px] text-[#a1a1a1] mt-3">
                      Use an invite code, or ask a guild officer to enable Discord integration.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <h3 className="font-bold text-[16px] text-white">Available Guilds</h3>
                  <div className="space-y-3">
                    {availableGuilds.map((guild) => (
                      <div
                        key={guild.id}
                        className="bg-[#141519] border border-[#383838] rounded-xl p-4 hover:border-[#505050] transition"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 flex-1">
                            {guild.discord_icon && (
                              <img
                                src={`https://cdn.discordapp.com/icons/${guild.discord_server_id}/${guild.discord_icon}.png`}
                                alt={guild.discord_name || guild.name}
                                className="w-10 h-10 rounded-full"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-[14px] text-white truncate">{guild.name}</h4>
                              <div className="flex gap-2 text-[12px] text-[#a1a1a1] mt-0.5">
                                {guild.realm && <span>{guild.realm}</span>}
                                {guild.realm && <span>•</span>}
                                <span>{guild.faction}</span>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleJoinDiscordGuild(guild.id)}
                            disabled={joining}
                            className="bg-white hover:bg-gray-100 rounded-[52px] px-5 py-2 text-[13px] font-medium text-black transition disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                          >
                            {joining ? 'Joining...' : 'Join'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[#383838] bg-[#0d0e11]">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-[#a1a1a1] shrink-0 mt-0.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="10" cy="10" r="9" />
                  <path d="M10 6v4M10 14h.01" strokeLinecap="round" />
                </svg>
                <p className="text-[12px] text-[#a1a1a1]">
                  We check which Discord servers you're a member of and match them with LootList+ guilds that have Discord integration enabled.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}


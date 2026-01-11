'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Sidebar from '@/app/components/Sidebar'
import Image from 'next/image'

interface AvailableGuild {
  id: string
  name: string
  realm: string | null
  faction: string
  discord_server_id: string
  discord_name: string | null
  discord_icon: string | null
}

export default function GuildSelectPage() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [discordVerified, setDiscordVerified] = useState(false)
  const [hasGuilds, setHasGuilds] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [validating, setValidating] = useState(false)
  const [joining, setJoining] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [showToast, setShowToast] = useState(false)
  const [guildInfo, setGuildInfo] = useState<any>(null)

  // Discord modal state
  const [showDiscordModal, setShowDiscordModal] = useState(false)
  const [discordLoading, setDiscordLoading] = useState(false)
  const [availableGuilds, setAvailableGuilds] = useState<AvailableGuild[]>([])
  const [discordError, setDiscordError] = useState('')

  const supabase = createClient()
  const router = useRouter()

  const showErrorToast = (message: string) => {
    setToastMessage(message)
    setShowToast(true)
    setTimeout(() => setShowToast(false), 4000)
  }

  useEffect(() => {
    const checkUser = async () => {
      // Check if logged in
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) {
        router.push('/')
        return
      }
      setUser(currentUser)

      // Check if user already has guilds
      const { data: memberships } = await supabase
        .from('guild_members')
        .select('id')
        .eq('user_id', currentUser.id)
        .limit(1)

      if (memberships && memberships.length > 0) {
        setHasGuilds(true)
        // User has guilds, redirect to dashboard
        router.push('/dashboard')
        return
      }

      // Check Discord verification status
      const { data: prefs } = await supabase
        .from('user_preferences')
        .select('discord_verified')
        .eq('user_id', currentUser.id)
        .single()

      setDiscordVerified(prefs?.discord_verified || false)
      setLoading(false)
    }

    checkUser()
  }, [])

  const validateCode = async (code: string) => {
    if (!code.trim()) {
      showErrorToast('Please enter an invite code')
      setGuildInfo(null)
      return
    }

    setValidating(true)
    setGuildInfo(null)

    try {
      const response = await fetch(`/api/guild-invites/${code.trim()}`)
      const data = await response.json()

      if (!response.ok) {
        showErrorToast(data.error || 'Invalid invite code')
        setValidating(false)
        return
      }

      // Code is valid, show guild info
      setGuildInfo(data)
      setValidating(false)
    } catch (err) {
      console.error('Error validating code:', err)
      showErrorToast('Failed to validate invite code')
      setValidating(false)
    }
  }

  const handleJoinWithCode = async () => {
    if (!guildInfo) {
      // If no guild info yet, validate the code
      if (inviteCode.trim()) {
        await validateCode(inviteCode.trim())
      }
      return
    }

    // If guild info exists, join the guild
    setJoining(true)

    try {
      const response = await fetch(`/api/guild-invites/${inviteCode.trim()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (!response.ok) {
        showErrorToast(data.error || 'Failed to join guild')
        setJoining(false)
        return
      }

      // Success! Redirect to dashboard
      window.location.href = '/dashboard'
    } catch (err) {
      console.error('Error joining guild:', err)
      showErrorToast('An error occurred while joining the guild')
      setJoining(false)
    }
  }

  const handleOpenDiscordModal = async () => {
    // Check Discord verification
    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('discord_verified')
      .eq('user_id', user?.id)
      .single()

    if (!preferences?.discord_verified) {
      showErrorToast('Please verify your Discord account in your profile first')
      return
    }

    setShowDiscordModal(true)
    setDiscordLoading(true)
    setDiscordError('')
    setAvailableGuilds([])

    // Fetch available guilds
    try {
      const response = await fetch('/api/discord-guilds')
      const data = await response.json()

      if (!response.ok) {
        setDiscordError(data.error || 'Failed to load guilds')
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

  if (loading) {
    return <LoadingSpinner fullScreen />
  }

  return (
    <div className="flex h-screen bg-[#151515]">
      {/* Toast Notification */}
      <div
        className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300 ease-out ${
          showToast ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
        }`}
      >
        <div className="bg-red-950/95 border border-red-600/50 rounded-[12px] px-[24px] py-[16px] shadow-lg backdrop-blur-sm">
          <p className="font-poppins text-[14px] text-red-200">{toastMessage}</p>
        </div>
      </div>

      <Sidebar user={user} />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto flex items-center justify-center py-[10px] ml-[208px]" style={{ background: 'linear-gradient(90deg, rgb(9, 9, 12) 0%, rgb(9, 9, 12) 100%)' }}>
        <div className="flex flex-col gap-[40px] items-center justify-center w-full max-w-[817px] px-[60px]">
          {/* Content Header */}
          <div className="flex flex-col gap-[20px] items-center justify-center w-full text-center">
            {/* Icon */}
            <Image
              src="/lootlist-icon.svg"
              alt="LootList+ Icon"
              width={33}
              height={44}
              className="w-[33px] h-[44px]"
            />

            {/* Welcome Text */}
            <h1 className="font-poppins font-bold text-[42px] leading-[43px] text-white text-center">
              Welcome to LootList+, {user?.user_metadata?.custom_claims?.global_name || user?.user_metadata?.full_name || 'User'}
            </h1>

            <p className="font-poppins font-normal text-[16px] text-[#a1a1a1] text-center">
              You're not a member of any guilds yet. Pick an option below to join one.
            </p>
          </div>

          {/* Buttons Section */}
          <div className="flex flex-col gap-[24px] items-center justify-center w-full">
            {/* Join Options */}
            <div className="flex flex-col lg:flex-row gap-[10px] items-stretch w-full">
              {/* Join with Discord */}
              <div
                className="flex-1 bg-[#141519] border-[0.5px] border-[rgba(255,255,255,0.1)] rounded-[40px] px-[24px] pt-[43px] pb-[24px] flex flex-col gap-[24px] items-center"
              >
                <div className="flex flex-col gap-[24px] items-center w-full">
                  <svg className="w-[44px] h-[44px]" viewBox="0 0 71 55" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <g clipPath="url(#clip0)">
                      <path d="M60.1045 4.8978C55.5792 2.8214 50.7265 1.2916 45.6527 0.41542C45.5603 0.39851 45.468 0.440769 45.4204 0.525289C44.7963 1.6353 44.105 3.0834 43.6209 4.2216C38.1637 3.4046 32.7345 3.4046 27.3892 4.2216C26.905 3.0581 26.1886 1.6353 25.5617 0.525289C25.5141 0.443589 25.4218 0.40133 25.3294 0.41542C20.2584 1.2888 15.4057 2.8186 10.8776 4.8978C10.8384 4.9147 10.8048 4.9429 10.7825 4.9795C1.57795 18.7309 -0.943561 32.1443 0.293408 45.3914C0.299005 45.4562 0.335386 45.5182 0.385761 45.5576C6.45866 50.0174 12.3413 52.7249 18.1147 54.5195C18.2071 54.5477 18.305 54.5139 18.3638 54.4378C19.7295 52.5728 20.9469 50.6063 21.9907 48.5383C22.0523 48.4172 21.9935 48.2735 21.8676 48.2256C19.9366 47.4931 18.0979 46.6 16.3292 45.5858C16.1893 45.5041 16.1781 45.304 16.3068 45.2082C16.679 44.9293 17.0513 44.6391 17.4067 44.3461C17.471 44.2926 17.5606 44.2813 17.6362 44.3151C29.2558 49.6202 41.8354 49.6202 53.3179 44.3151C53.3935 44.2785 53.4831 44.2898 53.5502 44.3433C53.9057 44.6363 54.2779 44.9293 54.6529 45.2082C54.7816 45.304 54.7732 45.5041 54.6333 45.5858C52.8646 46.6197 51.0259 47.4931 49.0921 48.2228C48.9662 48.2707 48.9102 48.4172 48.9718 48.5383C50.038 50.6034 51.2554 52.5699 52.5959 54.435C52.6519 54.5139 52.7526 54.5477 52.845 54.5195C58.6464 52.7249 64.529 50.0174 70.6019 45.5576C70.6551 45.5182 70.6887 45.459 70.6943 45.3942C72.1747 30.0791 68.2147 16.7757 60.1968 4.9823C60.1772 4.9429 60.1437 4.9147 60.1045 4.8978ZM23.7259 37.3253C20.2276 37.3253 17.3451 34.1136 17.3451 30.1693C17.3451 26.225 20.1717 23.0133 23.7259 23.0133C27.308 23.0133 30.1626 26.2532 30.1066 30.1693C30.1066 34.1136 27.28 37.3253 23.7259 37.3253ZM47.3178 37.3253C43.8196 37.3253 40.9371 34.1136 40.9371 30.1693C40.9371 26.225 43.7636 23.0133 47.3178 23.0133C50.9 23.0133 53.7545 26.2532 53.6986 30.1693C53.6986 34.1136 50.9 37.3253 47.3178 37.3253Z" fill="white"/>
                    </g>
                    <defs>
                      <clipPath id="clip0">
                        <rect width="71" height="55" fill="white"/>
                      </clipPath>
                    </defs>
                  </svg>

                  <div className="flex flex-col gap-[4px] items-center text-center w-full">
                    <p className="font-poppins font-bold text-[24px] text-white leading-[normal]">
                      Join with Discord
                    </p>
                    <p className="font-poppins font-normal text-[14px] text-[#a1a1a1] leading-[normal]">
                      If your guild has Discord linked, you're in automatically.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleOpenDiscordModal}
                  className="bg-white border border-[#383838] rounded-[52px] px-[20px] py-[12px] flex gap-[12px] items-center justify-center w-full hover:bg-gray-100 transition"
                >
                  <span className="font-poppins font-medium text-[16px] text-black leading-[normal]">
                    Join with Discord
                  </span>
                </button>
              </div>

              {/* Join with Code */}
              <div
                className="flex-1 bg-[#141519] border-[0.5px] border-[rgba(255,255,255,0.1)] rounded-[40px] px-[24px] pt-[43px] pb-[24px] flex flex-col gap-[24px] items-center justify-between"
              >
                <div className="flex flex-col gap-[24px] items-center w-full">
                  <svg className="w-[44px] h-[44px]" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M24.5817 30.5574C24.5817 30.5574 25.7275 30.5574 26.8733 33.0018C26.8733 33.0018 30.513 26.8907 33.7483 25.6685" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M31.0629 12.8351H31.0794" stroke="white" strokeWidth="3.33333" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M21.8962 12.8351H21.9127" stroke="white" strokeWidth="3.33333" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12.7295 12.8351H12.746" stroke="white" strokeWidth="3.33333" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M14.4685 21.9413H9.18212C6.136 21.9413 3.66663 19.479 3.66663 16.4414V9.16309C3.66663 6.12551 6.136 3.66309 9.18212 3.66309H34.8179C37.864 3.66309 40.3333 6.12551 40.3333 9.16309V16.7364" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M40.3326 29.3352C40.3326 23.2601 35.3937 18.3352 29.3016 18.3352C23.2094 18.3352 18.2706 23.2601 18.2706 29.3352C18.2706 35.4103 23.2094 40.3352 29.3016 40.3352C35.3937 40.3352 40.3326 35.4103 40.3326 29.3352Z" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                  </svg>

                  <div className="flex flex-col gap-[4px] items-center text-center w-full">
                    <p className="font-poppins font-bold text-[24px] text-white leading-[normal]">
                      Join with Code
                    </p>
                    <p className="font-poppins font-normal text-[14px] text-[#a1a1a1] leading-[normal]">
                      Paste the code from your guild officer.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-[12px] w-full">
                  <div className="flex gap-[10px] items-stretch w-full">
                    <Input
                      placeholder="ABC123DEF456"
                      value={inviteCode}
                      onChange={(e) => {
                        setInviteCode(e.target.value.toUpperCase())
                        setGuildInfo(null)
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && handleJoinWithCode()}
                      disabled={validating || joining}
                      maxLength={12}
                      className="flex-1 bg-[#0d0e11] border-[#383838] border-[0.5px] rounded-[52px] px-[20px] py-[12px] font-poppins font-medium text-[16px] text-white placeholder:text-[rgba(255,255,255,0.25)] focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-[#ff8000] focus:border-[1px] transition-colors h-auto"
                    />
                    <Button
                      onClick={handleJoinWithCode}
                      disabled={!inviteCode.trim() || validating || joining}
                      className="bg-white border border-[#383838] rounded-[52px] px-[20px] py-[12px] font-poppins font-medium text-[16px] text-black hover:bg-gray-100 h-auto disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {validating ? 'Checking...' : joining ? 'Joining...' : 'Join'}
                    </Button>
                  </div>

                  {/* Guild Info (shown after validation) */}
                  {guildInfo && (
                    <div className="px-[20px] py-[16px] rounded-[12px] bg-green-950/20 border border-green-600/50">
                      <div className="flex flex-col gap-[8px]">
                        <p className="font-poppins font-bold text-[16px] text-green-200">Valid Invite Code!</p>
                        <div className="flex flex-col gap-[4px]">
                          <p className="font-poppins text-[14px] text-[#a1a1a1]">
                            Guild: <span className="text-white font-medium">{guildInfo.guild.name}</span>
                          </p>
                          <p className="font-poppins text-[14px] text-[#a1a1a1]">
                            Realm: <span className="text-white font-medium">{guildInfo.guild.realm || 'Not set'}</span>
                          </p>
                          <p className="font-poppins text-[14px] text-[#a1a1a1]">
                            Faction: <span className="text-white font-medium">{guildInfo.guild.faction}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Need Help Section */}
            <div className="flex flex-col gap-[10px] items-center justify-center rounded-[40px] p-[24px] max-w-[409px] text-center">
              <div className="flex gap-[10px] items-center justify-center w-full">
                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 18.3334C14.6024 18.3334 18.3333 14.6024 18.3333 10C18.3333 5.39765 14.6024 1.66669 10 1.66669C5.39763 1.66669 1.66667 5.39765 1.66667 10C1.66667 14.6024 5.39763 18.3334 10 18.3334Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M7.57501 7.50002C7.77093 6.94308 8.15768 6.47344 8.66658 6.17427C9.17548 5.8751 9.77403 5.76579 10.3559 5.86561C10.9378 5.96543 11.4656 6.26792 11.8458 6.71963C12.2261 7.17134 12.4342 7.74297 12.4333 8.33335C12.4333 10 9.93334 10.8334 9.93334 10.8334" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M10 14.1667H10.0083" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <p className="font-poppins font-bold text-[18px] text-white leading-[normal]">
                  Need Help?
                </p>
              </div>
              <p className="font-poppins font-normal text-[14px] text-[#a1a1a1] text-center w-full leading-[normal]">
                Ask your guild officer for an invite code or Discord link. Setting up a new guild? You'll become the first officer.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Discord Modal */}
      {showDiscordModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={() => setShowDiscordModal(false)}>
          <div className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-[24px] max-w-[800px] w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="px-[32px] py-[24px] border-b border-[rgba(255,255,255,0.1)]">
              <div className="flex items-center justify-between">
                <h2 className="font-poppins font-bold text-[24px] text-white">Join via Discord</h2>
                <button
                  onClick={() => setShowDiscordModal(false)}
                  className="text-[#a1a1a1] hover:text-white transition"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <p className="font-poppins text-[14px] text-[#a1a1a1] mt-2">
                Automatically join guilds based on your Discord server memberships
              </p>
            </div>

            {/* Modal Content */}
            <div className="px-[32px] py-[24px]">
              {discordLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <LoadingSpinner />
                  <p className="font-poppins text-[14px] text-[#a1a1a1] mt-4">Loading available guilds...</p>
                </div>
              ) : discordError ? (
                <div className="px-[20px] py-[16px] rounded-[12px] bg-red-950/50 border border-red-600/50">
                  <p className="font-poppins text-[14px] text-red-200">{discordError}</p>
                </div>
              ) : availableGuilds.length === 0 ? (
                <div className="text-center py-12">
                  <p className="font-poppins font-bold text-[18px] text-white mb-2">No Guilds Found</p>
                  <p className="font-poppins text-[14px] text-[#a1a1a1]">
                    We couldn't find any LootList+ guilds that match your Discord servers.
                  </p>
                  <p className="font-poppins text-[14px] text-[#a1a1a1] mt-4">
                    Make sure you're a member of a Discord server that has a LootList+ guild set up.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <h3 className="font-poppins font-bold text-[18px] text-white">Available Guilds</h3>
                  <div className="space-y-3">
                    {availableGuilds.map((guild) => (
                      <div
                        key={guild.id}
                        className="bg-[#0d0e11] border border-[rgba(255,255,255,0.1)] rounded-[16px] px-[20px] py-[16px] hover:border-[rgba(255,255,255,0.2)] transition"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3 flex-1">
                            {guild.discord_icon && (
                              <img
                                src={`https://cdn.discordapp.com/icons/${guild.discord_server_id}/${guild.discord_icon}.png`}
                                alt={guild.discord_name || guild.name}
                                className="w-12 h-12 rounded-full"
                              />
                            )}
                            <div className="flex-1">
                              <h4 className="font-poppins font-bold text-[16px] text-white">{guild.name}</h4>
                              {guild.discord_name && guild.discord_name !== guild.name && (
                                <p className="font-poppins text-[12px] text-[#a1a1a1]">Discord: {guild.discord_name}</p>
                              )}
                              <div className="flex gap-3 text-[12px] text-[#a1a1a1] mt-1">
                                {guild.realm && <span>Realm: {guild.realm}</span>}
                                <span>Faction: {guild.faction}</span>
                              </div>
                            </div>
                          </div>
                          <Button
                            onClick={() => handleJoinDiscordGuild(guild.id)}
                            disabled={joining}
                            className="bg-white border border-[#383838] rounded-[52px] px-[20px] py-[10px] font-poppins font-medium text-[14px] text-black hover:bg-gray-100 h-auto disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {joining ? 'Joining...' : 'Join'}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-[32px] py-[24px] border-t border-[rgba(255,255,255,0.1)] bg-[#0d0e11]/50">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-[#a1a1a1] shrink-0 mt-0.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="10" cy="10" r="9" />
                  <path d="M10 6v4M10 14h.01" strokeLinecap="round" />
                </svg>
                <p className="font-poppins text-[12px] text-[#a1a1a1]">
                  We check which Discord servers you're a member of and match them with LootList+ guilds that have Discord integration enabled.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

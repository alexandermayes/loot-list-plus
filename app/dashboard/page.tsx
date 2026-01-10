'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navigation from '@/app/components/Navigation'
import { ClipboardList, FileBarChart, Settings, ClipboardCheck } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ActionCard } from '@/components/ui/action-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useGuildContext } from '@/app/contexts/GuildContext'

interface RaidTier {
  id: string
  name: string
  expansion: {
    name: string
  }
}

interface Deadline {
  deadline_at: string
  is_locked: boolean
}

export default function Dashboard() {
  const { activeGuild, activeMember, userGuilds, loading: guildLoading, isOfficer } = useGuildContext()
  const [raidTier, setRaidTier] = useState<RaidTier | null>(null)
  const [raidTiers, setRaidTiers] = useState<RaidTier[]>([])
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null)
  const [deadline, setDeadline] = useState<Deadline | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const loadData = async () => {
      // Check if logged in
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }
      setUser(user)

      // Wait for guild context to load
      if (guildLoading) {
        return
      }

      // If no active guild, redirect to guild select (but only if we have user guilds)
      if (!activeGuild && userGuilds.length === 0) {
        router.push('/guild-select')
        return
      }

      // If we have guilds but no active guild, something went wrong
      if (!activeGuild && userGuilds.length > 0) {
        console.error('Dashboard: Have guilds but no active guild!', userGuilds)
        // Don't redirect, show error or loading state
        setLoading(false)
        return
      }

      // Ensure we have an active guild before proceeding
      if (!activeGuild) {
        setLoading(false)
        return
      }

      // Check if guild has active expansion set
      if (!activeGuild.active_expansion_id) {
        setRaidTiers([])
        setError('⚠️ Your guild needs to select an expansion. Ask an officer to go to Guild Settings.')
        setLoading(false)
        return
      }

      // Get raid tiers for active expansion only (single join query)
      const { data: tiersData, error: tiersError } = await supabase
        .from('raid_tiers')
        .select(`
          id,
          name,
          is_active,
          expansion:expansions!inner (
            id,
            name
          )
        `)
        .eq('expansion.id', activeGuild.active_expansion_id)
        .order('name', { ascending: true })

      if (tiersError) {
        console.error('Error loading raid tiers:', tiersError)
        setRaidTiers([])
      } else {
        setRaidTiers(tiersData || [])

        // Default to active tier, or first tier if none active
        const activeTier = tiersData?.find(t => t.is_active) || tiersData?.[0]
        if (activeTier) {
          setSelectedTierId(activeTier.id)
          setRaidTier(activeTier as any)

          // Get deadline for selected tier
          const { data: deadlineData } = await supabase
            .from('loot_deadlines')
            .select('deadline_at, is_locked')
            .eq('raid_tier_id', activeTier.id)
            .single()

          if (deadlineData) {
            setDeadline(deadlineData)
          } else {
            setDeadline(null)
          }
        } else {
          setSelectedTierId(null)
          setRaidTier(null)
        }
      }

      setLoading(false)
    }

    loadData()
  }, [guildLoading, activeGuild])

  // Load tier data when selection changes
  useEffect(() => {
    const loadTierData = async () => {
      if (!selectedTierId || !activeGuild || raidTiers.length === 0) return

      const selectedTier = raidTiers.find((t: any) => t.id === selectedTierId)
      if (selectedTier) {
        setRaidTier(selectedTier as any)

        // Get deadline for selected tier
        const { data: deadlineData } = await supabase
          .from('loot_deadlines')
          .select('deadline_at, is_locked')
          .eq('raid_tier_id', selectedTierId)
          .single()

        if (deadlineData) {
          setDeadline(deadlineData)
        } else {
          setDeadline(null)
        }
      }
    }

    loadTierData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTierId, raidTiers, activeGuild])

  const getDaysUntilDeadline = () => {
    if (!deadline) return null
    const now = new Date()
    const deadlineDate = new Date(deadline.deadline_at)
    const diff = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  if (loading || guildLoading) {
    return <LoadingSpinner fullScreen />
  }

  // Get class info from userGuilds
  const currentMembership = userGuilds.find(g => g.guild.id === activeGuild?.id)
  const classInfo = currentMembership?.class

  const daysLeft = getDaysUntilDeadline()

  return (
    <div className="min-h-screen bg-background">
      <Navigation
        user={user}
        characterName={activeMember?.character_name}
        className={classInfo?.name}
        classColor={classInfo?.color_hex}
        role={activeMember?.role}
        title={activeGuild?.name ? `LootList+ - ${activeGuild.name}` : 'LootList+'}
      />

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Guild Info */}
        <Card>
          <CardHeader>
            <CardTitle>Guild Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-muted-foreground text-sm">Guild</p>
                <p className="text-foreground font-medium">{activeGuild?.name}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Realm</p>
                <p className="text-foreground font-medium">{activeGuild?.realm || 'Not set'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Faction</p>
                <p className="text-foreground font-medium">{activeGuild?.faction}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Your Role</p>
                <Badge variant="secondary">{activeMember?.role}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Message (e.g., no expansion set) */}
        {error && (
          <Card className="border-yellow-600 bg-yellow-950/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="text-yellow-400 mt-0.5">⚠️</div>
                <div className="flex-1">
                  <p className="text-yellow-200 font-semibold">Action Required</p>
                  <p className="text-yellow-300 text-sm mt-1">{error}</p>
                  {isOfficer && (
                    <button
                      onClick={() => router.push('/admin/guild-settings')}
                      className="mt-2 px-3 py-1 text-sm bg-yellow-600 hover:bg-yellow-700 text-white rounded transition"
                    >
                      Go to Guild Settings
                    </button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <ActionCard
            title="My Loot List"
            description="Submit or edit your rankings"
            icon={ClipboardList}
            onClick={() => router.push('/loot-list')}
          />

          <ActionCard
            title="Master Sheet"
            description="View all loot rankings"
            icon={FileBarChart}
            iconColor="bg-green-600"
            onClick={() => router.push('/master-sheet')}
          />

          {isOfficer && (
            <>
              <ActionCard
                title="Officer Admin"
                description="Manage submissions & settings"
                icon={Settings}
                onClick={() => router.push('/admin')}
              />

              <ActionCard
                title="Attendance"
                description="Track raid attendance"
                icon={ClipboardCheck}
                iconColor="bg-blue-600"
                onClick={() => router.push('/attendance')}
              />
            </>
          )}
        </div>

        {/* Guild Management (Officer Only) */}
        {isOfficer && (
          <div className="mt-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Guild Management</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ActionCard
                title="Guild Settings"
                description="Edit guild info & invite codes"
                icon={Settings}
                iconColor="bg-purple-600"
                onClick={() => router.push('/admin/guild-settings')}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
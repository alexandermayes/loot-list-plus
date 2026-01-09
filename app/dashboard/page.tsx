'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navigation from '@/app/components/Navigation'
import { Clock, ClipboardList, FileBarChart, Settings, ClipboardCheck } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ActionCard } from '@/components/ui/action-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Guild {
  id: string
  name: string
  realm: string
  faction: string
}

interface GuildMember {
  id: string
  character_name: string
  role: string
  class: {
    name: string
    color_hex: string
  }
}

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
  const [guild, setGuild] = useState<Guild | null>(null)
  const [member, setMember] = useState<GuildMember | null>(null)
  const [raidTier, setRaidTier] = useState<RaidTier | null>(null)
  const [raidTiers, setRaidTiers] = useState<RaidTier[]>([])
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null)
  const [deadline, setDeadline] = useState<Deadline | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [guildId, setGuildId] = useState<string | null>(null)
  
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

      // Get guild membership
      const { data: memberData } = await supabase
        .from('guild_members')
        .select(`
          id,
          character_name,
          role,
          class:wow_classes(name, color_hex),
          guild:guilds(id, name, realm, faction)
        `)
        .eq('user_id', user.id)
        .single()

      if (memberData) {
        setMember({
          id: memberData.id,
          character_name: memberData.character_name,
          role: memberData.role,
          class: memberData.class as any
        })
        const guildData = memberData.guild as any
        setGuild(guildData)
        setGuildId(guildData?.id || null)

        // Get all raid tiers for this guild (through expansions)
        // First get expansions for this guild
        const { data: guildExpansions, error: expError } = await supabase
          .from('expansions')
          .select('id')
          .eq('guild_id', guildData?.id)

        if (expError) {
          console.error('Error loading expansions:', expError)
          setRaidTiers([])
        } else if (guildExpansions && guildExpansions.length > 0) {
          const expansionIds = guildExpansions.map(e => e.id)
          
          const { data: simpleTiersData, error: tiersError } = await supabase
            .from('raid_tiers')
            .select('id, name, is_active, expansion_id')
            .in('expansion_id', expansionIds)
            .order('name', { ascending: true })

          if (tiersError) {
            console.error('Error loading raid tiers:', tiersError)
            setRaidTiers([])
          } else {
            if (simpleTiersData && simpleTiersData.length > 0) {
            // Manually fetch expansion names for each tier
            const tiersWithExpansions = await Promise.all(
              simpleTiersData.map(async (tier: any) => {
                let expansion = null
                if (tier.expansion_id) {
                  const { data: expData } = await supabase
                    .from('expansions')
                    .select('id, name')
                    .eq('id', tier.expansion_id)
                    .single()
                  
                  expansion = expData || null
                }
                
                return {
                  ...tier,
                  expansion: expansion
                }
              })
            )
            
            setRaidTiers(tiersWithExpansions as any)
            
            // Default to active tier, or first tier if none active
            const activeTier = tiersWithExpansions.find((t: any) => t.is_active) || tiersWithExpansions[0]
            if (activeTier && activeTier.id) {
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
            }
            } else {
              setRaidTiers([])
            }
          }
        } else {
          setRaidTiers([])
          setSelectedTierId(null)
          setRaidTier(null)
        }
      }

      setLoading(false)
    }

    loadData()
  }, [])

  // Load tier data when selection changes
  useEffect(() => {
    const loadTierData = async () => {
      if (!selectedTierId || !guildId || raidTiers.length === 0) return

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
  }, [selectedTierId, raidTiers, guildId])

  const getDaysUntilDeadline = () => {
    if (!deadline) return null
    const now = new Date()
    const deadlineDate = new Date(deadline.deadline_at)
    const diff = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  if (loading) {
    return <LoadingSpinner fullScreen />
  }

  const daysLeft = getDaysUntilDeadline()

  return (
    <div className="min-h-screen bg-background">
      <Navigation
        user={user}
        characterName={member?.character_name}
        className={member?.class?.name}
        classColor={member?.class?.color_hex}
        role={member?.role}
        title={guild?.name}
      />

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-6 space-y-6 pb-32">
        {/* Current Tier Banner */}
        {raidTier && (
          <Card className="bg-primary text-primary-foreground border-primary">
            <CardHeader>
              <CardTitle className="text-2xl">{raidTier.name}</CardTitle>
              <p className="opacity-90">{raidTier.expansion?.name}</p>
            </CardHeader>
            {deadline && (
              <CardContent>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  <span>
                    {daysLeft !== null && daysLeft > 0
                      ? `${daysLeft} days until submission deadline`
                      : 'Deadline passed!'}
                  </span>
                </div>
              </CardContent>
            )}
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

          {member?.role === 'Officer' && (
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

        {/* Guild Info */}
        <Card>
          <CardHeader>
            <CardTitle>Guild Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-muted-foreground text-sm">Guild</p>
                <p className="text-foreground font-medium">{guild?.name}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Realm</p>
                <p className="text-foreground font-medium">{guild?.realm || 'Not set'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Faction</p>
                <p className="text-foreground font-medium">{guild?.faction}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Your Role</p>
                <Badge variant="secondary">{member?.role}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Raid Tier Tabs - Fixed at Bottom */}
      {raidTiers.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-2xl">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center px-4 py-2 overflow-x-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-background">
              <span className="text-muted-foreground text-sm font-medium mr-4 whitespace-nowrap">Raid Tiers:</span>
              <div className="flex gap-2">
                {raidTiers.map((tier: any) => (
                  <button
                    key={tier.id}
                    onClick={() => {
                      if (tier.id) {
                        setSelectedTierId(tier.id)
                      }
                    }}
                    className={`px-4 py-2 rounded-lg whitespace-nowrap text-sm font-medium transition-all ${
                      selectedTierId === tier.id
                        ? 'bg-primary text-primary-foreground shadow-lg'
                        : 'bg-card text-muted-foreground hover:bg-accent'
                    }`}
                  >
                    {tier.name}
                    {tier.is_active && ' ⭐'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
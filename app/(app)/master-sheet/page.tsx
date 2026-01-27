'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import ItemLink from '@/app/components/ItemLink'
import { calculateAttendanceScore, getRankModifier, calculateLootScore, calculatePriorityBonus, type ItemPriority } from '@/utils/calculations'
import { getSpecRoles } from '@/utils/spec-role-mapping'
import { getBossOrder, normalizeBossName } from '@/utils/bossOrder'
import { getBossImage } from '@/utils/bossImages'
import { StarFilledIcon } from '@/components/ui/icons'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { ExpansionGuard } from '@/app/components/ExpansionGuard'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface LootItem {
  id: string
  name: string
  boss_name: string
  item_slot: string
  wowhead_id: number
}

interface PlayerRanking {
  player_name: string
  class_name: string
  class_color: string
  loot_score: number
  rank: number
}

interface ItemRankings {
  item: LootItem
  rankings: PlayerRanking[]
}

export default function MasterSheet() {
  const { activeGuild, activeCharacter, loading: guildLoading, isOfficer } = useGuildContext()
  const [allItemRankings, setAllItemRankings] = useState<ItemRankings[]>([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [contentLoading, setContentLoading] = useState(false)
  const [guildId, setGuildId] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [member, setMember] = useState<any>(null)
  const [guildSettings, setGuildSettings] = useState<any>(null)
  const [raidTiers, setRaidTiers] = useState<any[]>([])
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null)
  const [masterSheetVisible, setMasterSheetVisible] = useState<boolean>(false)
  const [itemPriorities, setItemPriorities] = useState<Record<string, ItemPriority>>({})
  const [collapsedBosses, setCollapsedBosses] = useState<Set<string>>(new Set())
  const [tierScrollState, setTierScrollState] = useState({ left: false, right: true })
  const tierScrollRef = useRef<HTMLDivElement>(null)

  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const scrollPendingRef = useRef<string | null>(null)

  // Set page title
  useEffect(() => {
    document.title = 'LootList+ • Loot Rankings'
  }, [])

  // Handle tier scroll to show/hide fades
  const handleTierScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    const scrollLeft = el.scrollLeft
    const maxScroll = el.scrollWidth - el.clientWidth
    setTierScrollState({
      left: scrollLeft > 5,
      right: scrollLeft < maxScroll - 5
    })
  }, [])

  // Check initial tier scroll state
  useEffect(() => {
    const el = tierScrollRef.current
    if (el) {
      const maxScroll = el.scrollWidth - el.clientWidth
      setTierScrollState({
        left: el.scrollLeft > 5,
        right: maxScroll > 5
      })
    }
  }, [raidTiers])

  // Define raid tier progression order (Classic + TBC)
  const getRaidTierOrder = (tierName: string): number => {
    const order: Record<string, number> = {
      // Classic
      'Molten Core': 1,
      'MC': 1,
      'Onyxia\'s Lair': 2,
      'Onyxia': 2,
      'Blackwing Lair': 3,
      'BWL': 3,
      'Zul\'Gurub': 4,
      'ZG': 4,
      'Ruins of Ahn\'Qiraj': 5,
      'AQ20': 5,
      'Temple of Ahn\'Qiraj': 6,
      'AQ40': 6,
      'Naxxramas': 7,
      'Naxx': 7,
      // TBC Tier 4
      'Karazhan': 10,
      'Kara': 10,
      'Gruul\'s Lair': 11,
      'Gruul': 11,
      'Magtheridon\'s Lair': 12,
      'Mag': 12,
      // TBC Tier 5
      'Serpentshrine Cavern': 20,
      'SSC': 20,
      'Tempest Keep: The Eye': 21,
      'Tempest Keep': 21,
      'The Eye': 21,
      'TK': 21,
      // TBC Tier 6
      'Hyjal Summit': 30,
      'Mount Hyjal': 30,
      'Hyjal': 30,
      'Black Temple': 31,
      'BT': 31,
      'Zul\'Aman': 32,
      'ZA': 32,
      'Sunwell Plateau': 33,
      'Sunwell': 33,
      'SWP': 33
    }
    return order[tierName] || 999 // Unknown tiers go to the end
  }

  // Calculate attendance score for a character (or user for backward compatibility)
  const calculateAttendance = async (userId: string, characterId?: string): Promise<number> => {
    if (!guildId || !guildSettings) return 0

    const weeks = guildSettings.rolling_attendance_weeks || 4
    const daysAgo = weeks * 7
    const periodStart = new Date()
    periodStart.setDate(periodStart.getDate() - daysAgo)

    const { data: recentRaids } = await supabase
      .from('raid_events')
      .select('id')
      .eq('guild_id', guildId)
      .gte('raid_date', periodStart.toISOString().split('T')[0])

    if (!recentRaids || recentRaids.length === 0) return 0

    const raidIds = recentRaids.map(r => r.id)

    // Try character-based attendance first, fall back to user-based
    let records
    if (characterId) {
      const { data } = await supabase
        .from('attendance_records')
        .select('signed_up, attended, no_call_no_show')
        .eq('character_id', characterId)
        .in('raid_event_id', raidIds)
      records = data
    }

    // Fall back to user-based if no character records found
    if (!records || records.length === 0) {
      const { data } = await supabase
        .from('attendance_records')
        .select('signed_up, attended, no_call_no_show')
        .eq('user_id', userId)
        .in('raid_event_id', raidIds)
      records = data
    }

    if (!records || records.length === 0) return 0

    return calculateAttendanceScore(records, recentRaids.length, guildSettings)
  }

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      // Wait for guild context to load
      if (guildLoading) {
        return
      }

      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/')
        return
      }

      setUser(user)

      if (!activeGuild) {
        setInitialLoading(false)
        return
      }

      if (!activeCharacter) {
        setInitialLoading(false)
        return
      }

      setGuildId(activeGuild.id)
      setMember({
        character_name: activeCharacter.name,
        role: 'Member', // Can be updated if needed from character_guild_memberships
        class: activeCharacter.class
      })

      // Load guild settings
      const { data: settingsData } = await supabase
        .from('guild_settings')
        .select('*')
        .eq('guild_id', activeGuild.id)
        .single()

      if (settingsData) {
        setGuildSettings(settingsData)
      }

      // Load raid tiers for active expansion (single join query)
      if (activeGuild?.active_expansion_id) {
        const { data: tiersData } = await supabase
          .from('raid_tiers')
          .select(`
            id,
            name,
            is_active,
            master_sheet_visible,
            expansion:expansions!inner (
              id,
              name
            )
          `)
          .eq('expansion.id', activeGuild.active_expansion_id)
          .eq('is_guild_active', true)

        if (tiersData && tiersData.length > 0) {
          // Transform data to ensure expansion is a single object (Supabase returns it as array)
          const transformedData = tiersData.map((tier: any) => ({
            ...tier,
            expansion: Array.isArray(tier.expansion) ? tier.expansion[0] : tier.expansion
          }))

          // Sort by Classic raid progression order
          const sortedTiers = transformedData.sort((a: any, b: any) => {
            return getRaidTierOrder(a.name) - getRaidTierOrder(b.name)
          })

          setRaidTiers(sortedTiers)

          // Only set default tier if we don't have one selected yet
          if (!selectedTierId) {
            // Check if there's a tier in the query params first
            const tierFromUrl = searchParams.get('tier')
            if (tierFromUrl && sortedTiers.find((t: any) => t.id === tierFromUrl)) {
              setSelectedTierId(tierFromUrl)
            } else {
              // Otherwise use active tier or first tier
              const activeTier = sortedTiers.find((t: any) => t.is_active) || sortedTiers[0]
              setSelectedTierId(activeTier.id)
            }
          }
        }
      }

      setInitialLoading(false)
    }

    loadData()
  }, [guildLoading, activeGuild, activeCharacter])

  // Update master sheet visibility when selected tier changes
  useEffect(() => {
    if (selectedTierId && raidTiers.length > 0) {
      const tier = raidTiers.find(t => t.id === selectedTierId)
      setMasterSheetVisible(tier?.master_sheet_visible ?? false)
    }
  }, [selectedTierId, raidTiers])

  // Load all item rankings when tier is selected
  useEffect(() => {
    const loadAllRankings = async () => {
      if (!selectedTierId || !guildId || !guildSettings) {
        setAllItemRankings([])
        return
      }

      // Only load rankings if master sheet is visible OR user is an officer
      if (!masterSheetVisible && !isOfficer) {
        setAllItemRankings([])
        setContentLoading(false)
        return
      }

      setContentLoading(true)

      try {
        // Get all loot items for this tier
        const { data: itemsData } = await supabase
          .from('loot_items')
          .select('id, name, boss_name, item_slot, wowhead_id')
          .eq('raid_tier_id', selectedTierId)
          .eq('is_available', true)
          .order('boss_name')
          .order('name')

        if (!itemsData || itemsData.length === 0) {
          setAllItemRankings([])
          setContentLoading(false)
          return
        }

        // Get all ranking submissions for all items at once
        const itemIds = itemsData.map(i => i.id)
        const { data: allRankingsData, error: rankingsError } = await supabase
          .from('loot_submission_items')
          .select('rank, slot, submission_id, loot_item_id')
          .in('loot_item_id', itemIds)

        if (rankingsError) {
          console.error('Error loading rankings:', rankingsError)
          setAllItemRankings(itemsData.map(item => ({ item, rankings: [] })))
          setContentLoading(false)
          return
        }

        if (!allRankingsData || allRankingsData.length === 0) {
          setAllItemRankings(itemsData.map(item => ({ item, rankings: [] })))
          setContentLoading(false)
          return
        }

        // Get all submissions (only approved lists show on master sheet)
        const submissionIds = [...new Set(allRankingsData.map(r => r.submission_id))]
        const { data: subsData, error: subsError } = await supabase
          .from('loot_submissions')
          .select('id, status, character_id')
          .in('id', submissionIds)
          .eq('status', 'approved')

        if (subsError) {
          console.error('Error loading submissions:', subsError)
        }

        if (!subsData || subsData.length === 0) {
          setAllItemRankings(itemsData.map(item => ({ item, rankings: [] })))
          setContentLoading(false)
          return
        }

        // Get all character info (filter out nulls)
        const characterIds = [...new Set(subsData.map(s => s.character_id).filter(id => id !== null))]

        if (characterIds.length === 0) {
          setAllItemRankings(itemsData.map(item => ({ item, rankings: [] })))
          setContentLoading(false)
          return
        }

        const { data: charactersData, error: charError } = await supabase
          .from('characters')
          .select(`
            id,
            name,
            user_id,
            spec_id,
            class:wow_classes(name, color_hex),
            spec:class_specs(id, name),
            character_guild_memberships!inner(role)
          `)
          .in('id', characterIds)
          .eq('character_guild_memberships.guild_id', activeGuild!.id)

        if (charError) {
          console.error('Error loading characters:', charError)
          setAllItemRankings(itemsData.map(item => ({ item, rankings: [] })))
          setContentLoading(false)
          return
        }

        // Load item priorities for this tier
        let prioritiesMap: Record<string, ItemPriority> = {}
        try {
          const prioResponse = await fetch(
            `/api/prio-list?guild_id=${guildId}&raid_tier_id=${selectedTierId}`
          )
          if (prioResponse.ok) {
            const prioData = await prioResponse.json()
            for (const prio of prioData.priorities || []) {
              prioritiesMap[prio.item_id] = prio
            }
          }
        } catch (err) {
          console.error('Error loading item priorities:', err)
        }
        setItemPriorities(prioritiesMap)

        // Load loot history to filter out characters who already received items
        const { data: lootHistoryData } = await supabase
          .from('loot_history')
          .select('character_id, loot_item_id')
          .eq('guild_id', guildId)
          .in('loot_item_id', itemIds)

        // Create a Set of "characterId-itemId" pairs for fast lookup
        const receivedItemsSet = new Set<string>(
          (lootHistoryData || []).map(h => `${h.character_id}-${h.loot_item_id}`)
        )

        // Pre-calculate attendance for all characters in parallel
        const attendanceCache: Record<string, number> = {}
        const attendancePromises = (charactersData || []).map(async (character) => {
          const attendance = await calculateAttendance(character.user_id, character.id)
          return { id: character.id, attendance }
        })
        const attendanceResults = await Promise.all(attendancePromises)
        attendanceResults.forEach(({ id, attendance }) => {
          attendanceCache[id] = attendance
        })

        // Build rankings for each item
        const itemRankingsMap: Record<string, ItemRankings> = {}

        for (const item of itemsData) {
          const itemRankingsData = allRankingsData.filter(r => r.loot_item_id === item.id)
          const rankings: PlayerRanking[] = []

          for (const r of itemRankingsData) {
            const sub = subsData.find(s => s.id === r.submission_id)
            if (!sub) continue

            const character = charactersData?.find(c => c.id === sub.character_id)
            if (!character) continue

            // Skip if character has already received this item
            if (receivedItemsSet.has(`${character.id}-${item.id}`)) continue

            const attendance = attendanceCache[character.id] || 0
            const characterRole = (character as any).character_guild_memberships?.[0]?.role || 'Member'
            const roleModifier = getRankModifier(characterRole, guildSettings)

            // Calculate priority bonus
            const itemPriority = prioritiesMap[item.id]
            const specId = (character as any).spec_id || null
            const specName = (character as any).spec?.name || null
            const className = (character.class as any)?.name || null

            // Determine the character's role based on their spec
            let specRole: string | null = null
            if (specName && className) {
              const fullSpecName = className === specName ? className : `${className} ${specName}`
              const roles = getSpecRoles(fullSpecName)
              specRole = roles.length > 0 ? roles[0] : null
            }

            const priorityBonus = calculatePriorityBonus(
              itemPriority,
              character.id,
              specId,
              specRole
            )

            const lootScore = calculateLootScore(r.rank, attendance, roleModifier, 0, priorityBonus)

            rankings.push({
              player_name: character.name || 'Unknown',
              class_name: (character.class as any)?.name || 'Unknown',
              class_color: (character.class as any)?.color_hex || '#888888',
              loot_score: lootScore,
              rank: r.rank
            })
          }

          // Sort by loot score (highest first) and take top 5
          rankings.sort((a, b) => b.loot_score - a.loot_score)
          itemRankingsMap[item.id] = { item, rankings: rankings.slice(0, 5) }
        }

        // Convert to array and sort by boss name
        const sortedItemRankings = itemsData.map(item => itemRankingsMap[item.id])
        setAllItemRankings(sortedItemRankings)

      } catch (err) {
        console.error('Error loading rankings:', err)
        setAllItemRankings([])
      }

      setContentLoading(false)
    }

    loadAllRankings()
  }, [selectedTierId, guildId, guildSettings, masterSheetVisible, isOfficer])

  // Refresh Wowhead tooltips after items are loaded
  useEffect(() => {
    if (allItemRankings.length > 0 && typeof window !== 'undefined' && (window as any).$WowheadPower) {
      setTimeout(() => {
        (window as any).$WowheadPower.refreshLinks()
      }, 100)
    }
  }, [allItemRankings])

  // Handle tier switching from query params
  useEffect(() => {
    const tierId = searchParams.get('tier')
    const itemId = searchParams.get('item')

    // If we have a tier parameter, switch to it and store scroll target
    if (tierId && raidTiers.length > 0) {
      const tierExists = raidTiers.find(t => t.id === tierId)
      if (tierExists && tierId !== selectedTierId) {
        if (itemId) {
          scrollPendingRef.current = itemId
        }
        setSelectedTierId(tierId)
      } else if (tierExists && tierId === selectedTierId && itemId) {
        // Already on correct tier, just need to scroll
        scrollPendingRef.current = itemId
      }
    } else if (itemId && !tierId) {
      // No tier specified, just scroll to item
      scrollPendingRef.current = itemId
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, selectedTierId, raidTiers.length])

  // Scroll to item when items are loaded
  useEffect(() => {
    const itemId = scrollPendingRef.current

    if (itemId && allItemRankings.length > 0) {
      // Check if the item exists in current rankings
      const itemExists = allItemRankings.some(ir => ir.item.id === itemId)

      if (itemExists) {
        const timer = setTimeout(() => {
          const element = document.getElementById(`item-${itemId}`)
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
            // Highlight the item briefly
            element.classList.add('ring-2', 'ring-[#ff8000]')
            setTimeout(() => {
              element.classList.remove('ring-2', 'ring-[#ff8000]')
            }, 2000)

            // Clear the pending scroll
            scrollPendingRef.current = null
          }
        }, 600)

        return () => clearTimeout(timer)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allItemRankings.length])

  // Group items by boss (normalize boss names to merge multi-boss encounters like Opera Event)
  const groupedByBoss: Record<string, ItemRankings[]> = {}
  allItemRankings.forEach(ir => {
    const boss = normalizeBossName(ir.item.boss_name)
    if (!groupedByBoss[boss]) {
      groupedByBoss[boss] = []
    }
    groupedByBoss[boss].push(ir)
  })

  const selectedTier = raidTiers.find(t => t.id === selectedTierId)

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  const bossNames = Object.keys(groupedByBoss).sort((a, b) => getBossOrder(a) - getBossOrder(b))

  const scrollToBoss = (bossName: string) => {
    const element = document.getElementById(`boss-${bossName.replace(/\s+/g, '-')}`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const toggleBossCollapse = (bossName: string) => {
    setCollapsedBosses(prev => {
      const newSet = new Set(prev)
      if (newSet.has(bossName)) {
        newSet.delete(bossName)
      } else {
        newSet.add(bossName)
      }
      return newSet
    })
  }

  const collapseAll = () => {
    setCollapsedBosses(new Set(bossNames))
  }

  const expandAll = () => {
    setCollapsedBosses(new Set())
  }

  return (
    <ExpansionGuard>
      <div className="font-poppins">
        {/* Header */}
        <div className="p-8 pb-4">
          <h1 className="text-[42px] font-bold text-white leading-tight">
            {selectedTier?.name}: Loot Rankings
          </h1>
          <p className="text-[#a1a1a1] text-base">
            Top 5 players for each item
          </p>
        </div>

        {/* Raid Tier Tabs - Sticky */}
        {raidTiers.length > 0 && (
          <div className="sticky top-0 z-20 px-8 py-3 bg-[#09090c]">
            <div
              ref={tierScrollRef}
              onScroll={handleTierScroll}
              className="overflow-x-auto scrollbar-hide"
              style={{
                maskImage: `linear-gradient(to right, ${tierScrollState.left ? 'transparent' : 'black'}, black ${tierScrollState.left ? '24px' : '0px'}, black calc(100% - ${tierScrollState.right ? '24px' : '0px'}), ${tierScrollState.right ? 'transparent' : 'black'})`,
                WebkitMaskImage: `linear-gradient(to right, ${tierScrollState.left ? 'transparent' : 'black'}, black ${tierScrollState.left ? '24px' : '0px'}, black calc(100% - ${tierScrollState.right ? '24px' : '0px'}), ${tierScrollState.right ? 'transparent' : 'black'})`
              }}
            >
              <div className="flex gap-2 pr-3">
                {raidTiers.map((tier: any) => (
                  <button
                    key={tier.id}
                    onClick={() => setSelectedTierId(tier.id)}
                    className={`px-5 py-2.5 rounded-[40px] whitespace-nowrap text-[13px] font-medium transition-all ${
                      selectedTierId === tier.id
                        ? 'bg-[rgba(255,128,0,0.2)] border-[0.5px] border-[rgba(255,128,0,0.2)] text-[#ff8000]'
                        : 'bg-[#151515] border border-[rgba(255,255,255,0.1)] text-white hover:bg-[#1a1a1a]'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {tier.name}
                      {tier.is_active && <StarFilledIcon size={14} />}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Boss Quick Navigation - Sticky below tier tabs */}
        {!contentLoading && bossNames.length > 0 && (
          <div className="sticky top-[64px] z-10 px-8 pt-3 pb-2 bg-[#09090c]">
            <div className="flex gap-3">
              {/* Boss chips container with horizontal scroll fade */}
              <div className="flex-1 min-w-0 bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl p-3 overflow-hidden">
                <div
                  className="overflow-x-auto scrollbar-hide"
                  style={{
                    maskImage: 'linear-gradient(to right, transparent, black 24px, black calc(100% - 24px), transparent)',
                    WebkitMaskImage: 'linear-gradient(to right, transparent, black 24px, black calc(100% - 24px), transparent)'
                  }}
                >
                  <div className="flex gap-2 px-3">
                    {bossNames.map((boss) => (
                      <button
                        key={boss}
                        onClick={() => scrollToBoss(boss)}
                        className="px-3 py-1.5 bg-[#151515] hover:bg-[#1a1a1a] border border-[rgba(255,255,255,0.1)] rounded-[40px] text-xs font-medium text-white whitespace-nowrap transition"
                      >
                        {boss}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {/* Expand/Collapse container */}
              <div className="flex-shrink-0 bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl p-3">
                <div className="flex gap-2 h-full items-center">
                  <button
                    onClick={expandAll}
                    className="px-3 py-1.5 bg-[#151515] hover:bg-[#1a1a1a] border border-[rgba(255,255,255,0.1)] rounded-[40px] text-xs font-medium text-[#a1a1a1] hover:text-white whitespace-nowrap transition"
                  >
                    Expand All
                  </button>
                  <button
                    onClick={collapseAll}
                    className="px-3 py-1.5 bg-[#151515] hover:bg-[#1a1a1a] border border-[rgba(255,255,255,0.1)] rounded-[40px] text-xs font-medium text-[#a1a1a1] hover:text-white whitespace-nowrap transition"
                  >
                    Collapse All
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="px-8 pt-2 pb-8 space-y-6">

        {/* Content Loading State */}
        {contentLoading ? (
          <div className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl p-12">
            <div className="flex flex-col items-center justify-center gap-4">
              <LoadingSpinner />
              <p className="text-[#a1a1a1] text-sm">Loading loot rankings...</p>
            </div>
          </div>
        ) : (
        <>
        {/* Master Sheet Hidden Warning */}
        {!masterSheetVisible && !isOfficer ? (
          <div className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-[#1a1a1a] rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🔒</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Master Sheet Not Available</h3>
              <p className="text-[#a1a1a1]">
                The loot rankings for this raid tier are currently hidden. Officers will make them visible once the submission deadline has passed.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Officer Viewing Hidden Sheet Badge */}
            {!masterSheetVisible && isOfficer && (
              <div className="bg-blue-950/50 border border-blue-600/50 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <span className="text-xl">👁️</span>
                  <div>
                    <p className="text-blue-200 font-semibold">Officer Preview</p>
                    <p className="text-blue-300 text-sm">
                      The master sheet is currently hidden from members. Only officers can see these rankings.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Loot Table */}
            {Object.keys(groupedByBoss).length === 0 ? (
              <div className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl p-8 text-center">
                <p className="text-[#a1a1a1]">No loot items found for this raid tier</p>
              </div>
            ) : (
          <div className="space-y-3">
            {Object.entries(groupedByBoss).sort(([bossA], [bossB]) => getBossOrder(bossA) - getBossOrder(bossB)).map(([boss, items]) => {
              const isCollapsed = collapsedBosses.has(boss)
              return (
                <div
                  key={boss}
                  id={`boss-${boss.replace(/\s+/g, '-')}`}
                  className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl overflow-hidden scroll-mt-[140px]"
                >
                  {/* Boss Header - Clickable */}
                  <button
                    onClick={() => toggleBossCollapse(boss)}
                    className="w-full px-5 py-3 flex items-center justify-between hover:bg-[#1a1a1a] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {getBossImage(boss) && (
                        <img
                          src={getBossImage(boss)!}
                          alt={boss}
                          className="w-6 h-6 rounded"
                        />
                      )}
                      <h2 className="text-[15px] font-semibold text-white">{boss}</h2>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[12px] text-[#666] font-medium">
                        {items.length} item{items.length !== 1 ? 's' : ''}
                      </span>
                      <svg
                        className={`w-4 h-4 text-[#a1a1a1] transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>

                  {/* Items Table - Collapsible */}
                  {!isCollapsed && (
                    <div className="border-t border-[rgba(255,255,255,0.1)]">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-[#0d0e11]">
                            <th className="px-5 py-2.5 text-left text-[12px] font-medium text-[#666] w-[280px]">Item</th>
                            <th className="px-3 py-2.5 text-left text-[12px] font-medium text-[#666] w-[100px]">Slot</th>
                            <th className="px-3 py-2.5 text-center text-[12px] font-medium text-[#666] w-[120px]">#1</th>
                            <th className="px-3 py-2.5 text-center text-[12px] font-medium text-[#666] w-[120px]">#2</th>
                            <th className="px-3 py-2.5 text-center text-[12px] font-medium text-[#666] w-[120px]">#3</th>
                            <th className="px-3 py-2.5 text-center text-[12px] font-medium text-[#666] w-[120px]">#4</th>
                            <th className="px-3 py-2.5 text-center text-[12px] font-medium text-[#666] w-[120px]">#5</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[rgba(255,255,255,0.05)]">
                          {items.map((ir) => (
                            <tr
                              key={ir.item.id}
                              id={`item-${ir.item.id}`}
                              className={`transition-all hover:bg-[#1a1a1a] ${ir.rankings.length === 0 ? 'bg-[#1a1519]' : ''}`}
                            >
                              <td className="px-5 py-2.5">
                                <ItemLink
                                  name={ir.item.name}
                                  wowheadId={ir.item.wowhead_id}
                                  className="font-medium text-[13px]"
                                />
                              </td>
                              <td className="px-3 py-2.5 text-[12px] text-[#666]">
                                {ir.item.item_slot}
                              </td>
                              {[0, 1, 2, 3, 4].map((index) => {
                                const ranking = ir.rankings[index]
                                return (
                                  <td key={index} className="px-3 py-2.5 text-center">
                                    {ranking ? (
                                      <div className="flex flex-col items-center">
                                        <span
                                          className="text-[13px] font-medium"
                                          style={{ color: ranking.class_color }}
                                        >
                                          {ranking.player_name}
                                        </span>
                                        <span className="text-[11px] text-[#666]">
                                          {Math.round(ranking.loot_score)}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-[#333]">—</span>
                                    )}
                                  </td>
                                )
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
            )}
          </>
        )}
        </>
        )}

        {/* Legend */}
        <div className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-[#666] text-[12px]">
              Scores = item rank + attendance + role modifiers + priority bonuses. Ties go to roll.
            </p>
            {Object.keys(itemPriorities).length > 0 && (
              <p className="text-[#666] text-[12px]">
                {Object.keys(itemPriorities).length} items with priority
              </p>
            )}
          </div>
        </div>
        </div>
      </div>
    </ExpansionGuard>
  )
}

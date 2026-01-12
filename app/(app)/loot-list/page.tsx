'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import SearchableItemSelect from '@/app/components/SearchableItemSelect'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { ExpansionGuard } from '@/app/components/ExpansionGuard'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useNotification } from '@/app/contexts/NotificationContext'

interface LootItem {
  id: string
  name: string
  boss_name: string
  item_slot: string
  wowhead_id: number
  classification?: string // Reserved, Limited, Unlimited
  item_type?: string // For duplicate detection
  allocation_cost?: number // 0 or 1
}

interface Submission {
  id: string
  status: string
  submitted_at: string | null
  review_notes: string | null
}

export default function LootList() {
  const { activeGuild, loading: guildLoading } = useGuildContext()
  const { showNotification } = useNotification()
  const [lootItems, setLootItems] = useState<LootItem[]>([])
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [rankings, setRankings] = useState<Record<string, string>>({}) // "rank-slot" -> item_id (e.g., "50-1", "50-2")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [raidTiers, setRaidTiers] = useState<any[]>([])
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null)
  const [tierSubmissionStatuses, setTierSubmissionStatuses] = useState<Record<string, any>>({})
  const [guildId, setGuildId] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [member, setMember] = useState<any>(null)
  const [enforceSlotRestrictions, setEnforceSlotRestrictions] = useState(true)
  const [showInstructionsModal, setShowInstructionsModal] = useState(false)
  const [autoSaving, setAutoSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [initialLoadComplete, setInitialLoadComplete] = useState(false)

  const supabase = createClient()
  const router = useRouter()

  // Set page title
  useEffect(() => {
    document.title = 'LootList+ • Loot List'
  }, [])

  // Define Classic raid tier progression order
  const getRaidTierOrder = (tierName: string): number => {
    const order: Record<string, number> = {
      'Molten Core': 1,
      'MC': 1, // Alternative name
      'Onyxia\'s Lair': 2,
      'Onyxia': 2, // Alternative name
      'Blackwing Lair': 3,
      'BWL': 3, // Alternative name
      'Zul\'Gurub': 4,
      'ZG': 4, // Alternative name
      'Ruins of Ahn\'Qiraj': 5,
      'AQ20': 5, // Alternative name
      'Temple of Ahn\'Qiraj': 6,
      'AQ40': 6, // Alternative name
      'Naxxramas': 7,
      'Naxx': 7 // Alternative name
    }
    return order[tierName] || 999 // Unknown tiers go to the end
  }

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
        setLoading(false)
        return
      }

      const { data: memberData } = await supabase
        .from('guild_members')
        .select(`
          guild_id,
          class_id,
          character_name,
          role,
          class:wow_classes(name, color_hex)
        `)
        .eq('user_id', user.id)
        .eq('guild_id', activeGuild.id)
        .single()

      if (!memberData) {
        setLoading(false)
        return
      }

      setGuildId(memberData.guild_id)
      setMember({
        character_name: memberData.character_name,
        role: memberData.role,
        class: memberData.class
      })

      // Load guild settings to check slot restrictions
      const { data: settingsData } = await supabase
        .from('guild_settings')
        .select('enforce_slot_restrictions')
        .eq('guild_id', activeGuild.id)
        .single()

      // Default to true if setting doesn't exist
      setEnforceSlotRestrictions(settingsData?.enforce_slot_restrictions ?? true)

      // Get all raid tiers for this guild's active expansion
      if (!activeGuild.active_expansion_id) {
        setLoading(false)
        return
      }

      const { data: tiersData } = await supabase
        .from('raid_tiers')
        .select('id, name, is_active')
        .eq('expansion_id', activeGuild.active_expansion_id)

      if (!tiersData || tiersData.length === 0) {
        setLoading(false)
        return
      }

      // Sort by Classic raid progression order
      const sortedTiers = tiersData.sort((a: any, b: any) => {
        return getRaidTierOrder(a.name) - getRaidTierOrder(b.name)
      })

      setRaidTiers(sortedTiers)

      // Default to active tier or first tier
      const activeTier = sortedTiers.find(t => t.is_active) || sortedTiers[0]
      setSelectedTierId(activeTier.id)

      setLoading(false)
    }

    loadData()
  }, [guildLoading, activeGuild])

  // Load submission statuses for all tiers
  useEffect(() => {
    const loadSubmissionStatuses = async () => {
      if (!user || !guildId || raidTiers.length === 0) return

      const tierIds = raidTiers.map(t => t.id)

      const { data: submissions } = await supabase
        .from('loot_submissions')
        .select('raid_tier_id, status, submitted_at')
        .eq('user_id', user.id)
        .eq('guild_id', guildId)
        .in('raid_tier_id', tierIds)

      // Build status map: { tierId: { status, submitted_at } }
      const statusMap: Record<string, any> = {}
      submissions?.forEach(sub => {
        statusMap[sub.raid_tier_id] = {
          status: sub.status,
          submitted_at: sub.submitted_at
        }
      })

      setTierSubmissionStatuses(statusMap)
    }

    loadSubmissionStatuses()
  }, [user, guildId, raidTiers])

  // Load loot items and submission for selected tier
  useEffect(() => {
    const loadTierData = async () => {
      if (!selectedTierId || !guildId || !member) {
        setLootItems([])
        setSubmission(null)
        setRankings({})
        return
      }

      setInitialLoadComplete(false)
      setLoading(true)

      try {
        // Load loot items for this tier
        const { data: itemsData } = await supabase
          .from('loot_items')
          .select(`
            id, name, boss_name, item_slot, wowhead_id,
            classification, item_type, allocation_cost, is_available,
            loot_item_classes(class_id, spec_type)
          `)
          .eq('raid_tier_id', selectedTierId)
          .eq('is_available', true)
          .order('id')

        if (itemsData) {
          const filteredItems = itemsData.filter(item => {
            const classes = item.loot_item_classes as any[]
            return classes.length === 0 || classes.some(c => c.class_id === member.class_id)
          })
          setLootItems(filteredItems)
        }

        // Load existing submission for this tier
        const { data: subData } = await supabase
          .from('loot_submissions')
          .select('id, status, submitted_at, review_notes')
          .eq('user_id', user.id)
          .eq('raid_tier_id', selectedTierId)
          .eq('guild_id', guildId)
          .single()

        if (subData) {
          setSubmission(subData)

          // Load existing rankings
          const { data: rankingsData } = await supabase
            .from('loot_submission_items')
            .select('loot_item_id, rank')
            .eq('submission_id', subData.id)

          if (rankingsData) {
            const rankingsMap: Record<string, string> = {}
            const rankCounts: Record<number, number> = {}

            rankingsData.sort((a, b) => b.rank - a.rank)

            rankingsData.forEach(r => {
              rankCounts[r.rank] = (rankCounts[r.rank] || 0) + 1
              const slot = rankCounts[r.rank]
              rankingsMap[`${r.rank}-${slot}`] = r.loot_item_id
            })

            setRankings(rankingsMap)
          }
        } else {
          setSubmission(null)
          setRankings({})
        }
      } catch (error) {
        console.error('Error loading tier data:', error)
      }

      setLoading(false)
      setInitialLoadComplete(true)
    }

    loadTierData()
  }, [selectedTierId, user, guildId, member])

  // Refresh Wowhead tooltips after items are loaded and loading is complete
  useEffect(() => {
    if (!loading && lootItems.length > 0 && typeof window !== 'undefined' && (window as any).$WowheadPower) {
      // Use longer delay to ensure DOM is fully settled and reduce flickering
      const timer = setTimeout(() => {
        (window as any).$WowheadPower.refreshLinks()
      }, 300)

      return () => clearTimeout(timer)
    }
  }, [loading, lootItems.length]) // Only trigger on loading state change and item count change, not on lootItems content change

  // Helper function to get bracket name and ranks for a given rank
  const getBracketForRank = (rank: number): { name: string, ranks: number[] } | null => {
    if (rank >= 48 && rank <= 50) return { name: 'Bracket 1', ranks: [50, 49, 48] }
    if (rank >= 45 && rank <= 47) return { name: 'Bracket 2', ranks: [47, 46, 45] }
    if (rank >= 42 && rank <= 44) return { name: 'Bracket 3', ranks: [44, 43, 42] }
    if (rank >= 39 && rank <= 41) return { name: 'Bracket 4', ranks: [41, 40, 39] }
    return null // No bracket (ranks 38-25)
  }

  const handleItemSelect = (rank: number, slot: number, itemId: string) => {
    const key = `${rank}-${slot}`
    if (itemId === '') {
      const newRankings = { ...rankings }
      delete newRankings[key]
      setRankings(newRankings)
    } else {
      setRankings(prev => ({ ...prev, [key]: itemId }))
    }
  }

  const saveSubmission = async (submit: boolean) => {
    if (!user || !selectedTierId || !guildId) return

    setSaving(true)

    try {
      let submissionId = submission?.id

      if (!submissionId) {
        const { data: newSub, error: subError } = await supabase
          .from('loot_submissions')
          .insert({
            user_id: user.id,
            guild_id: guildId,
            raid_tier_id: selectedTierId,
            status: submit ? 'pending' : 'draft',
            submitted_at: submit ? new Date().toISOString() : null
          })
          .select()
          .single()

        if (subError) throw subError
        submissionId = newSub.id
        setSubmission(newSub)
      } else {
        const { error: updateError } = await supabase
          .from('loot_submissions')
          .update({
            status: submit ? 'pending' : 'draft',
            submitted_at: submit ? new Date().toISOString() : submission?.submitted_at,
            updated_at: new Date().toISOString()
          })
          .eq('id', submissionId)

        if (updateError) throw updateError

        setSubmission(prev => prev ? {
          ...prev,
          status: submit ? 'pending' : 'draft',
          submitted_at: submit ? new Date().toISOString() : prev.submitted_at
        } : null)
      }

      // Delete existing rankings
      await supabase
        .from('loot_submission_items')
        .delete()
        .eq('submission_id', submissionId)

      // Insert new rankings (convert from "rank-slot" format)
      const rankingsToInsert = Object.entries(rankings).map(([key, loot_item_id]) => {
        const [rankStr] = key.split('-')
        const rank = parseInt(rankStr)

        return {
          submission_id: submissionId,
          loot_item_id,
          rank
        }
      })

      if (rankingsToInsert.length > 0) {
        const { error: itemsError } = await supabase
          .from('loot_submission_items')
          .insert(rankingsToInsert)

        if (itemsError) throw itemsError
      }

      showNotification('success', submit ? 'Loot list submitted for review!' : 'Draft saved!')

      // Refresh submission statuses after save
      if (user && guildId && raidTiers.length > 0) {
        const tierIds = raidTiers.map(t => t.id)
        const { data: submissions } = await supabase
          .from('loot_submissions')
          .select('raid_tier_id, status, submitted_at')
          .eq('user_id', user.id)
          .eq('guild_id', guildId)
          .in('raid_tier_id', tierIds)

        const statusMap: Record<string, any> = {}
        submissions?.forEach(sub => {
          statusMap[sub.raid_tier_id] = {
            status: sub.status,
            submitted_at: sub.submitted_at
          }
        })
        setTierSubmissionStatuses(statusMap)
      }
    } catch (error: any) {
      showNotification('error', error.message || 'Failed to save')
    }

    setSaving(false)
  }

  // Auto-save function (saves as draft without notifications)
  const autoSave = async () => {
    if (!user || !selectedTierId || !guildId) return

    setAutoSaving(true)

    try {
      let submissionId = submission?.id

      if (!submissionId) {
        const { data: newSub, error: subError } = await supabase
          .from('loot_submissions')
          .insert({
            user_id: user.id,
            guild_id: guildId,
            raid_tier_id: selectedTierId,
            status: 'draft',
            submitted_at: null
          })
          .select()
          .single()

        if (subError) throw subError
        submissionId = newSub.id
        setSubmission(newSub)
      } else {
        const { error: updateError } = await supabase
          .from('loot_submissions')
          .update({
            updated_at: new Date().toISOString()
          })
          .eq('id', submissionId)

        if (updateError) throw updateError
      }

      // Delete existing rankings
      await supabase
        .from('loot_submission_items')
        .delete()
        .eq('submission_id', submissionId)

      // Insert new rankings
      const rankingsToInsert = Object.entries(rankings).map(([key, loot_item_id]) => {
        const [rankStr] = key.split('-')
        const rank = parseInt(rankStr)

        return {
          submission_id: submissionId,
          loot_item_id,
          rank
        }
      })

      if (rankingsToInsert.length > 0) {
        const { error: itemsError } = await supabase
          .from('loot_submission_items')
          .insert(rankingsToInsert)

        if (itemsError) throw itemsError
      }

      setLastSaved(new Date())
    } catch (error: any) {
      console.error('Auto-save failed:', error)
    }

    setAutoSaving(false)
  }

  // Auto-save when rankings change (debounced)
  useEffect(() => {
    if (!user || !selectedTierId || !guildId || !initialLoadComplete) return

    const timer = setTimeout(() => {
      autoSave()
    }, 2000) // 2 second debounce

    return () => clearTimeout(timer)
  }, [rankings, selectedTierId])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-950/20 border-green-600 text-white'
      case 'pending': return 'bg-yellow-950/20 border-yellow-600 text-white'
      case 'needs_revision': return 'bg-orange-950/20 border-orange-600 text-white'
      case 'rejected': return 'bg-red-950/20 border-red-600 text-white'
      default: return 'bg-[#141519] border-[rgba(255,255,255,0.1)] text-[#a1a1a1]'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved': return 'Approved'
      case 'pending': return 'Pending Review'
      case 'needs_revision': return 'Needs Revision'
      case 'rejected': return 'Rejected'
      default: return 'Draft'
    }
  }

  const rankedCount = Object.keys(rankings).length
  const selectedItems = new Set(Object.values(rankings))
  const duplicateItems = Object.values(rankings).filter((itemId, index, arr) => arr.indexOf(itemId) !== index)

  // Bracket validation
  type BracketValidation = {
    bracketName: string
    allocationPoints: number
    maxPoints: number
    ranks: number[]
    violations: string[]
  }

  const validateBrackets = (): BracketValidation[] => {
    const brackets: BracketValidation[] = [
      { bracketName: 'Bracket 1 (50-48)', allocationPoints: 0, maxPoints: 3, ranks: [50, 49, 48], violations: [] },
      { bracketName: 'Bracket 2 (47-45)', allocationPoints: 0, maxPoints: 3, ranks: [47, 46, 45], violations: [] },
      { bracketName: 'Bracket 3 (44-42)', allocationPoints: 0, maxPoints: 3, ranks: [44, 43, 42], violations: [] },
      { bracketName: 'Bracket 4 (41-39)', allocationPoints: 0, maxPoints: 3, ranks: [41, 40, 39], violations: [] },
    ]

    brackets.forEach(bracket => {
      const itemTypesInBracket: Record<string, number> = {}
      const itemSlotsInBracket: Record<string, number> = {}
      const reservedItems: Array<{ rank: number, name: string }> = []

      bracket.ranks.forEach(rank => {
        const item1Id = rankings[`${rank}-1`]
        const item2Id = rankings[`${rank}-2`]

        // Check slot 1
        if (item1Id) {
          const item = lootItems.find(i => i.id === item1Id)
          if (item) {
            // Add allocation cost
            bracket.allocationPoints += item.allocation_cost || 0

            // Track item types for duplicate detection
            if (item.item_type) {
              itemTypesInBracket[item.item_type] = (itemTypesInBracket[item.item_type] || 0) + 1
            }

            // Track item slots for duplicate detection (if enabled)
            if (enforceSlotRestrictions && item.item_slot) {
              itemSlotsInBracket[item.item_slot] = (itemSlotsInBracket[item.item_slot] || 0) + 1
            }

            // Track Reserved items
            if (item.classification === 'Reserved') {
              reservedItems.push({ rank, name: item.name })
            }
          }
        }

        // Check slot 2
        if (item2Id) {
          const item = lootItems.find(i => i.id === item2Id)
          if (item) {
            // Add allocation cost
            bracket.allocationPoints += item.allocation_cost || 0

            // Track item types for duplicate detection
            if (item.item_type) {
              itemTypesInBracket[item.item_type] = (itemTypesInBracket[item.item_type] || 0) + 1
            }

            // Track item slots for duplicate detection (if enabled)
            if (enforceSlotRestrictions && item.item_slot) {
              itemSlotsInBracket[item.item_slot] = (itemSlotsInBracket[item.item_slot] || 0) + 1
            }

            // Track Reserved items
            if (item.classification === 'Reserved') {
              reservedItems.push({ rank, name: item.name })
            }

            // Check if Reserved item has a companion
            if (item1Id) {
              const item1 = lootItems.find(i => i.id === item1Id)
              if (item1?.classification === 'Reserved' || item.classification === 'Reserved') {
                bracket.violations.push(`Reserved items must be alone at rank ${rank}`)
              }
            }
          }
        }
      })

      // Check allocation points
      if (bracket.allocationPoints > bracket.maxPoints) {
        bracket.violations.push(`Too many allocation points: ${bracket.allocationPoints}/${bracket.maxPoints}`)
      }

      // Check for duplicate item types
      Object.entries(itemTypesInBracket).forEach(([type, count]) => {
        if (count > 1) {
          bracket.violations.push(`Duplicate ${type} (${count} selected)`)
        }
      })

      // Check for duplicate item slots (if enforcement is enabled)
      if (enforceSlotRestrictions) {
        Object.entries(itemSlotsInBracket).forEach(([slot, count]) => {
          if (count > 1) {
            bracket.violations.push(`Multiple ${slot} items (${count} selected) - only 1 allowed per bracket`)
          }
        })
      }
    })

    return brackets.filter(b => b.violations.length > 0 || b.allocationPoints > 0)
  }

  const bracketValidations = validateBrackets()
  const hasValidationErrors = bracketValidations.some(b => b.violations.length > 0)

  // Get validation for a specific bracket by name
  const getBracketValidation = (bracketName: string) => {
    return bracketValidations.find(b => b.bracketName === bracketName)
  }

  // Group ranks by brackets (matching Google Sheet structure)
  const bracket1 = Array.from({ length: 3 }, (_, i) => 50 - i) // 50-48
  const bracket2 = Array.from({ length: 3 }, (_, i) => 47 - i) // 47-45
  const bracket3 = Array.from({ length: 3 }, (_, i) => 44 - i) // 44-42
  const bracket4 = Array.from({ length: 3 }, (_, i) => 41 - i) // 41-39
  const noBracket = Array.from({ length: 14 }, (_, i) => 38 - i) // 38-25
  const offSpec = Array.from({ length: 24 }, (_, i) => 24 - i) // 24-1

  const getRankColor = (rank: number) => {
    if (rank >= 48) return 'from-red-900 to-red-700' // Bracket 1
    if (rank >= 45) return 'from-orange-900 to-orange-700' // Bracket 2
    if (rank >= 42) return 'from-yellow-900 to-yellow-700' // Bracket 3
    if (rank >= 39) return 'from-amber-900 to-amber-700' // Bracket 4
    if (rank >= 25) return 'from-green-900 to-green-700' // No Bracket (Main-spec)
    return 'from-blue-900 to-blue-700' // Off-spec
  }

  const getRankLabel = (rank: number) => {
    if (rank >= 48) return 'Bracket 1'
    if (rank >= 45) return 'Bracket 2'
    if (rank >= 42) return 'Bracket 3'
    if (rank >= 39) return 'Bracket 4'
    if (rank >= 25) return 'No Bracket (Main-spec)'
    return 'Off-spec'
  }

  const RankRow = ({ rank }: { rank: number }) => {
    const selectedItemId1 = rankings[`${rank}-1`]
    const selectedItemId2 = rankings[`${rank}-2`]
    const selectedItem1 = selectedItemId1 ? lootItems.find(i => i.id === selectedItemId1) : null
    const selectedItem2 = selectedItemId2 ? lootItems.find(i => i.id === selectedItemId2) : null
    const isDuplicate1 = selectedItemId1 && duplicateItems.includes(selectedItemId1)
    const isDuplicate2 = selectedItemId2 && duplicateItems.includes(selectedItemId2)

    const getClassificationBadge = (classification?: string) => {
      if (!classification) return null
      const colors = {
        Reserved: 'bg-error text-error-foreground',
        Limited: 'bg-warning text-warning-foreground',
        Unlimited: 'bg-success text-success-foreground'
      }
      return (
        <span className={`text-xs px-2 py-0.5 rounded ${colors[classification as keyof typeof colors] || 'bg-gray-600'}`}>
          {classification}
        </span>
      )
    }

    return (
      <tr className={`border-b border-border ${(isDuplicate1 || isDuplicate2) ? 'bg-red-900/20' : ''}`}>
        <td className={`px-3 py-1.5 font-bold text-sm text-foreground bg-gradient-to-r ${getRankColor(rank)}`} rowSpan={1}>
          {rank}
        </td>
        <td className="px-3 py-1.5">
          <SearchableItemSelect
            items={lootItems}
            value={selectedItemId1 || ''}
            onChange={(value) => handleItemSelect(rank, 1, value)}
            disabled={selectedItems}
            currentValue={rankings[`${rank}-1`]}
          />
        </td>
        <td className="px-3 py-1.5">
          {selectedItem1 ? (
            <div className="flex items-center gap-2">
              <p className="text-muted-foreground text-xs">{selectedItem1.boss_name}</p>
              {selectedItem1.classification && getClassificationBadge(selectedItem1.classification)}
            </div>
          ) : <span className="text-muted-foreground text-xs">-</span>}
        </td>
        <td className="px-3 py-1.5">
          <SearchableItemSelect
            items={lootItems}
            value={selectedItemId2 || ''}
            onChange={(value) => handleItemSelect(rank, 2, value)}
            disabled={selectedItems}
            currentValue={rankings[`${rank}-2`]}
          />
        </td>
        <td className="px-3 py-1.5">
          {selectedItem2 ? (
            <div className="flex items-center gap-2">
              <p className="text-muted-foreground text-xs">{selectedItem2.boss_name}</p>
              {selectedItem2.classification && getClassificationBadge(selectedItem2.classification)}
            </div>
          ) : <span className="text-muted-foreground text-xs">-</span>}
        </td>
      </tr>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <ExpansionGuard>
        <div className="p-8 space-y-6 font-poppins">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-[42px] font-bold text-white leading-tight">Loot Lists</h1>
              <p className="text-[#a1a1a1] mt-1 text-base">Rank your preferred items for {raidTiers.find(t => t.id === selectedTierId)?.name || 'this raid tier'}</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Auto-save status */}
              <div className="text-sm text-[#a1a1a1]">
                {autoSaving ? (
                  <span>Saving...</span>
                ) : lastSaved ? (
                  <span>Saved {new Date(lastSaved).toLocaleTimeString()}</span>
                ) : null}
              </div>
              {/* How to Rank Button */}
              <button
                onClick={() => setShowInstructionsModal(true)}
                className="px-6 py-3 bg-[#151515] hover:bg-[#1a1a1a] border border-[rgba(255,255,255,0.1)] rounded-[52px] text-white font-medium text-base transition whitespace-nowrap"
              >
                How to Rank
              </button>
              {/* Submit for Review Button */}
              <button
                onClick={() => saveSubmission(true)}
                disabled={saving || rankedCount === 0 || duplicateItems.length > 0 || hasValidationErrors}
                className="px-6 py-3 bg-white hover:bg-gray-100 disabled:bg-[#1a1a1a] disabled:text-[#666] disabled:cursor-not-allowed disabled:border-[rgba(255,255,255,0.1)] border-2 border-white rounded-[52px] text-black font-medium text-base transition whitespace-nowrap shadow-lg"
              >
                {saving ? 'Submitting...' : 'Submit for Review'}
              </button>
            </div>
          </div>

          {/* Raid Tier Tabs - At Top */}
          {raidTiers.length > 0 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              <span className="text-[#a1a1a1] text-sm font-medium whitespace-nowrap">Raid Tier:</span>
              <div className="flex gap-2">
                {raidTiers.map((tier: any) => {
                  const status = tierSubmissionStatuses[tier.id]
                  const hasSubmission = !!status
                  const statusColor = hasSubmission
                    ? status.status === 'approved'
                      ? 'text-green-400'
                      : status.status === 'pending'
                      ? 'text-yellow-400'
                      : status.status === 'needs_revision'
                      ? 'text-orange-400'
                      : status.status === 'rejected'
                      ? 'text-red-400'
                      : 'text-gray-400'
                    : ''

                  return (
                    <button
                      key={tier.id}
                      onClick={() => setSelectedTierId(tier.id)}
                      className={`px-5 py-2.5 rounded-[40px] whitespace-nowrap text-[13px] font-medium transition-all ${
                        selectedTierId === tier.id
                          ? 'bg-[rgba(255,128,0,0.2)] border-[0.5px] border-[rgba(255,128,0,0.2)] text-[#ff8000]'
                          : 'bg-[#151515] border border-[rgba(255,255,255,0.1)] text-white hover:bg-[#1a1a1a]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{tier.name}</span>
                        {tier.is_active && <span className="text-xs">⭐</span>}
                        {hasSubmission && (
                          <span className={`text-xs ${statusColor}`}>
                            {status.status === 'approved' ? '✓' :
                             status.status === 'pending' ? '⏳' :
                             status.status === 'needs_revision' ? '⚠' :
                             status.status === 'rejected' ? '✗' : '○'}
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Status Banner */}
        {submission && (
          <div className={`rounded-xl p-6 border ${getStatusColor(submission.status)}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-base">{raidTiers.find(t => t.id === selectedTierId)?.name || 'Raid Tier'}: {getStatusLabel(submission.status)}</p>
                {submission.submitted_at && (
                  <p className="text-sm opacity-75 mt-1">
                    Submitted: {new Date(submission.submitted_at).toLocaleDateString()}
                  </p>
                )}
              </div>
              <div className="text-right">
                <span className="text-sm opacity-75">{rankedCount} items ranked</span>
              </div>
            </div>
            {submission.review_notes && (
              <div className="mt-3 p-4 bg-black/20 rounded-xl">
                <p className="text-sm"><strong>Officer Notes:</strong> {submission.review_notes}</p>
              </div>
            )}
          </div>
        )}


        {/* Duplicate Warning */}
        {duplicateItems.length > 0 && (
          <div className="bg-red-900/50 border border-red-500 rounded-xl p-4 text-red-300">
            <strong>Warning:</strong> You have selected the same item multiple times. Each item can only appear once.
          </div>
        )}

        {/* Bracket 1 (50-48) */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="bg-gradient-to-r from-red-900 to-red-700 px-4 py-2">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-foreground">Bracket 1 (50-48)</h2>
                {(() => {
                  const validation = getBracketValidation('Bracket 1 (50-48)')
                  return validation ? (
                    <div className="mt-1">
                      <p className={`text-xs font-semibold ${validation.violations.length > 0 ? 'text-red-200' : 'text-red-200'}`}>
                        Allocation Points: {validation.allocationPoints}/{validation.maxPoints}
                      </p>
                      {validation.violations.length > 0 && (
                        <div className="mt-1 bg-red-800/50 rounded p-1.5">
                          <ul className="space-y-0.5 text-xs text-red-100">
                            {validation.violations.map((violation, idx) => (
                              <li key={idx}>⚠ {violation}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-red-200 text-xs mt-1">Max 3 allocation points per bracket</p>
                  )
                })()}
              </div>
              {(() => {
                const validation = getBracketValidation('Bracket 1 (50-48)')
                return validation && validation.violations.length > 0 ? (
                  <span className="text-xs bg-red-700 px-2 py-1 rounded font-semibold">
                    {validation.violations.length} {validation.violations.length === 1 ? 'Error' : 'Errors'}
                  </span>
                ) : null
              })()}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-accent border-b border-border">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground w-16">Rank</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Loot #1</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground w-40">Details</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Loot #2</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground w-40">Details</th>
                </tr>
              </thead>
              <tbody>
                {bracket1.map(rank => (
                  <RankRow key={rank} rank={rank} />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bracket 2 (47-45) */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="bg-gradient-to-r from-orange-900 to-orange-700 px-4 py-2">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-foreground">Bracket 2 (47-45)</h2>
                {(() => {
                  const validation = getBracketValidation('Bracket 2 (47-45)')
                  return validation ? (
                    <div className="mt-1">
                      <p className={`text-xs font-semibold ${validation.violations.length > 0 ? 'text-orange-200' : 'text-orange-200'}`}>
                        Allocation Points: {validation.allocationPoints}/{validation.maxPoints}
                      </p>
                      {validation.violations.length > 0 && (
                        <div className="mt-1 bg-orange-800/50 rounded p-1.5">
                          <ul className="space-y-0.5 text-xs text-orange-100">
                            {validation.violations.map((violation, idx) => (
                              <li key={idx}>⚠ {violation}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-orange-200 text-xs mt-1">Max 3 allocation points per bracket</p>
                  )
                })()}
              </div>
              {(() => {
                const validation = getBracketValidation('Bracket 2 (47-45)')
                return validation && validation.violations.length > 0 ? (
                  <span className="text-xs bg-orange-700 px-2 py-1 rounded font-semibold">
                    {validation.violations.length} {validation.violations.length === 1 ? 'Error' : 'Errors'}
                  </span>
                ) : null
              })()}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-accent border-b border-border">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground w-16">Rank</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Loot #1</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground w-40">Details</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Loot #2</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground w-40">Details</th>
                </tr>
              </thead>
              <tbody>
                {bracket2.map(rank => (
                  <RankRow key={rank} rank={rank} />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bracket 3 (44-42) */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="bg-gradient-to-r from-yellow-900 to-yellow-700 px-4 py-2">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-foreground">Bracket 3 (44-42)</h2>
                {(() => {
                  const validation = getBracketValidation('Bracket 3 (44-42)')
                  return validation ? (
                    <div className="mt-1">
                      <p className={`text-xs font-semibold ${validation.violations.length > 0 ? 'text-yellow-200' : 'text-yellow-200'}`}>
                        Allocation Points: {validation.allocationPoints}/{validation.maxPoints}
                      </p>
                      {validation.violations.length > 0 && (
                        <div className="mt-1 bg-yellow-800/50 rounded p-1.5">
                          <ul className="space-y-0.5 text-xs text-yellow-100">
                            {validation.violations.map((violation, idx) => (
                              <li key={idx}>⚠ {violation}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-yellow-200 text-xs mt-1">Max 3 allocation points per bracket</p>
                  )
                })()}
              </div>
              {(() => {
                const validation = getBracketValidation('Bracket 3 (44-42)')
                return validation && validation.violations.length > 0 ? (
                  <span className="text-xs bg-yellow-700 px-2 py-1 rounded font-semibold">
                    {validation.violations.length} {validation.violations.length === 1 ? 'Error' : 'Errors'}
                  </span>
                ) : null
              })()}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-accent border-b border-border">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground w-16">Rank</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Loot #1</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground w-40">Details</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Loot #2</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground w-40">Details</th>
                </tr>
              </thead>
              <tbody>
                {bracket3.map(rank => (
                  <RankRow key={rank} rank={rank} />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bracket 4 (41-39) */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="bg-gradient-to-r from-amber-900 to-amber-700 px-4 py-2">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-foreground">Bracket 4 (41-39)</h2>
                {(() => {
                  const validation = getBracketValidation('Bracket 4 (41-39)')
                  return validation ? (
                    <div className="mt-1">
                      <p className={`text-xs font-semibold ${validation.violations.length > 0 ? 'text-amber-200' : 'text-amber-200'}`}>
                        Allocation Points: {validation.allocationPoints}/{validation.maxPoints}
                      </p>
                      {validation.violations.length > 0 && (
                        <div className="mt-1 bg-amber-800/50 rounded p-1.5">
                          <ul className="space-y-0.5 text-xs text-amber-100">
                            {validation.violations.map((violation, idx) => (
                              <li key={idx}>⚠ {violation}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-amber-200 text-xs mt-1">Max 3 allocation points per bracket</p>
                  )
                })()}
              </div>
              {(() => {
                const validation = getBracketValidation('Bracket 4 (41-39)')
                return validation && validation.violations.length > 0 ? (
                  <span className="text-xs bg-amber-700 px-2 py-1 rounded font-semibold">
                    {validation.violations.length} {validation.violations.length === 1 ? 'Error' : 'Errors'}
                  </span>
                ) : null
              })()}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-accent border-b border-border">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground w-16">Rank</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Loot #1</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground w-40">Details</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Loot #2</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground w-40">Details</th>
                </tr>
              </thead>
              <tbody>
                {bracket4.map(rank => (
                  <RankRow key={rank} rank={rank} />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* No Bracket (38-25) - Main-spec */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="bg-gradient-to-r from-green-900 to-green-700 px-4 py-2">
            <h2 className="text-lg font-bold text-foreground">No Bracket (38-25) - Main-spec</h2>
            <p className="text-green-200 text-xs">Still considered main-spec priority</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-accent border-b border-border">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground w-16">Rank</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Loot #1</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground w-40">Details</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Loot #2</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground w-40">Details</th>
                </tr>
              </thead>
              <tbody>
                {noBracket.map(rank => (
                  <RankRow key={rank} rank={rank} />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Off-spec (24-1) */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-900 to-blue-700 px-4 py-2">
            <h2 className="text-lg font-bold text-foreground">Off-spec (24-1)</h2>
            <p className="text-blue-200 text-xs">Off-spec items to support guild flexibility</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-accent border-b border-border">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground w-16">Rank</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Loot #1</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground w-40">Details</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Loot #2</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground w-40">Details</th>
                </tr>
              </thead>
              <tbody>
                {offSpec.map(rank => (
                  <RankRow key={rank} rank={rank} />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* How to Rank Modal */}
        {showInstructionsModal && (
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowInstructionsModal(false)}
          >
            <div
              className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-[#141519] border-b border-[rgba(255,255,255,0.1)] px-6 py-4 flex items-center justify-between">
                <h2 className="text-white font-bold text-[24px]">How to Rank</h2>
                <button
                  onClick={() => setShowInstructionsModal(false)}
                  className="text-[#a1a1a1] hover:text-white transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-4">
                {/* Core Structure */}
                <div>
                  <h4 className="text-white font-semibold text-sm mb-2">Core Structure</h4>
                  <p className="text-[#a1a1a1] text-sm">
                    The system uses <span className="font-semibold text-white">50 desirability levels</span> (Level 50 being most desirable),
                    with each level containing <span className="font-semibold text-white">2 item slots</span> divided into 6 brackets.
                  </p>
                </div>

                {/* Brackets */}
                <div>
                  <h4 className="text-white font-semibold text-sm mb-2">Bracket Framework</h4>
                  <ul className="text-[#a1a1a1] text-sm space-y-1">
                    <li>• <span className="font-semibold text-red-300">Bracket 1:</span> Levels 50, 49, 48</li>
                    <li>• <span className="font-semibold text-orange-300">Bracket 2:</span> Levels 47, 46, 45</li>
                    <li>• <span className="font-semibold text-yellow-300">Bracket 3:</span> Levels 44, 43, 42</li>
                    <li>• <span className="font-semibold text-amber-300">Bracket 4:</span> Levels 41, 40, 39</li>
                    <li>• <span className="font-semibold text-green-300">No Bracket:</span> Levels 38-25 (Still main-spec priority)</li>
                    <li>• <span className="font-semibold text-blue-300">Off-spec:</span> Levels 24-1 (Enhances guild flexibility)</li>
                  </ul>
                </div>

                {/* Key Rules */}
                <div>
                  <h4 className="text-white font-semibold text-sm mb-2">Key Rules (Brackets 1-4)</h4>
                  <ul className="text-[#a1a1a1] text-sm space-y-2">
                    <li>
                      <span className="font-semibold text-white">1. Allocation Point Limit:</span> Maximum 3 points per bracket.
                      <ul className="ml-4 mt-1 space-y-0.5">
                        <li>- <span className="text-red-300">Reserved items</span> cost 1 point</li>
                        <li>- <span className="text-yellow-300">Limited items</span> cost 1 point</li>
                        <li>- <span className="text-green-300">Unlimited items</span> cost 0 points</li>
                      </ul>
                    </li>
                    <li>
                      <span className="font-semibold text-white">2. Type Restriction:</span> Brackets 1-4 may only contain 1 item of a type
                      (no duplicate weapon types in same bracket).
                    </li>
                    <li>
                      <span className="font-semibold text-white">3. Reserved Items:</span> Must be the sole entry at that desirability level
                      (cannot have another item in the same rank).
                    </li>
                    <li>
                      <span className="font-semibold text-white">4. Equal Priority:</span> Both item slots per level receive equal priority when filled.
                    </li>
                    <li>
                      <span className="font-semibold text-white">5. Dual Weapons:</span> Two identical non-unique weapons are permitted if not hand-specific
                      (e.g., two of the same dagger).
                    </li>
                    <li>
                      <span className="font-semibold text-white">6. Off-spec Importance:</span> Completing off-spec selections enhances guild flexibility
                      and is encouraged.
                    </li>
                  </ul>
                </div>

                {/* Important Notes */}
                <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3">
                  <h4 className="text-blue-200 font-semibold text-sm mb-2">Important Notes</h4>
                  <ul className="text-blue-200 text-sm space-y-1">
                    <li>• Each item can only be selected once across all ranks</li>
                    <li>• Items in "No Bracket" don't guarantee unavailability - they indicate other classes receive priority</li>
                    <li>• <span className="text-red-300 font-semibold">If your rank number is tied, you will roll</span></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        </div>
    </ExpansionGuard>
  )
}

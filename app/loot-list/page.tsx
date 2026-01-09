'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navigation from '@/app/components/Navigation'
import SearchableItemSelect from '@/app/components/SearchableItemSelect'
import { Loader2 } from 'lucide-react'

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
  const [lootItems, setLootItems] = useState<LootItem[]>([])
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [rankings, setRankings] = useState<Record<string, string>>({}) // "rank-slot" -> item_id (e.g., "50-1", "50-2")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [raidTierId, setRaidTierId] = useState<string | null>(null)
  const [guildId, setGuildId] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [member, setMember] = useState<any>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }
      setUser(user)

      const { data: memberData } = await supabase
        .from('guild_members')
        .select(`
          guild_id,
          class_id,
          character_name,
          role,
          class:wow_classes(name, color_hex),
          guild:guilds(id)
        `)
        .eq('user_id', user.id)
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

      // Get active raid tier
      const { data: tierData } = await supabase
        .from('raid_tiers')
        .select('id, name')
        .eq('is_active', true)
        .single()

      if (!tierData) {
        setLoading(false)
        return
      }

      setRaidTierId(tierData.id)

      // Get loot items for this tier
      const { data: itemsData } = await supabase
        .from('loot_items')
        .select(`
          id,
          name,
          boss_name,
          item_slot,
          wowhead_id,
          classification,
          item_type,
          allocation_cost,
          is_available,
          loot_item_classes(class_id, spec_type)
        `)
        .eq('raid_tier_id', tierData.id)
        .eq('is_available', true)
        .order('boss_name')

      if (itemsData) {
        const filteredItems = itemsData.filter(item => {
          const classes = item.loot_item_classes as any[]
          // Show items with no class restrictions, or items where the user's class is primary or secondary
          return classes.length === 0 || classes.some(c => c.class_id === memberData.class_id)
        })
        setLootItems(filteredItems)
      }

      // Get existing submission
      const { data: subData } = await supabase
        .from('loot_submissions')
        .select('id, status, submitted_at, review_notes')
        .eq('user_id', user.id)
        .eq('raid_tier_id', tierData.id)
        .eq('guild_id', memberData.guild_id)
        .single()

      if (subData) {
        setSubmission(subData)

        // Get existing rankings
        const { data: rankingsData } = await supabase
          .from('loot_submission_items')
          .select('loot_item_id, rank')
          .eq('submission_id', subData.id)

        if (rankingsData) {
          const rankingsMap: Record<string, string> = {}
          const rankCounts: Record<number, number> = {}

          rankingsData.forEach(r => {
            // Track how many times we've seen this rank
            rankCounts[r.rank] = (rankCounts[r.rank] || 0) + 1
            const slot = rankCounts[r.rank]
            rankingsMap[`${r.rank}-${slot}`] = r.loot_item_id
          })
          setRankings(rankingsMap)
        }
      }

      setLoading(false)
    }

    loadData()
  }, [])

  // Refresh Wowhead tooltips after items are loaded
  useEffect(() => {
    if (lootItems.length > 0 && typeof window !== 'undefined' && (window as any).$WowheadPower) {
      setTimeout(() => {
        (window as any).$WowheadPower.refreshLinks()
      }, 100)
    }
  }, [lootItems])

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
    if (!user || !raidTierId || !guildId) return

    setSaving(true)
    setMessage(null)

    try {
      let submissionId = submission?.id

      if (!submissionId) {
        const { data: newSub, error: subError } = await supabase
          .from('loot_submissions')
          .insert({
            user_id: user.id,
            guild_id: guildId,
            raid_tier_id: raidTierId,
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
        const rank = parseInt(key.split('-')[0])
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

      setMessage({
        type: 'success',
        text: submit ? 'Loot list submitted for review!' : 'Draft saved!'
      })
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Failed to save'
      })
    }

    setSaving(false)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-900/50 border-green-500 text-green-300'
      case 'pending': return 'bg-yellow-900/50 border-yellow-500 text-yellow-300'
      case 'needs_revision': return 'bg-orange-900/50 border-orange-500 text-orange-300'
      case 'rejected': return 'bg-red-900/50 border-red-500 text-red-300'
      default: return 'bg-secondary border-border text-gray-300'
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
        Reserved: 'bg-red-600 text-foreground',
        Limited: 'bg-yellow-600 text-foreground',
        Unlimited: 'bg-green-600 text-foreground'
      }
      return (
        <span className={`text-xs px-2 py-0.5 rounded ${colors[classification as keyof typeof colors] || 'bg-gray-600'}`}>
          {classification}
        </span>
      )
    }

    return (
      <tr className={`border-b border-border hover:bg-accent ${(isDuplicate1 || isDuplicate2) ? 'bg-red-900/20' : ''}`}>
        <td className={`px-4 py-3 font-bold text-foreground bg-gradient-to-r ${getRankColor(rank)}`} rowSpan={1}>
          {rank}
        </td>
        <td className="px-4 py-3">
          <SearchableItemSelect
            items={lootItems}
            value={selectedItemId1 || ''}
            onChange={(value) => handleItemSelect(rank, 1, value)}
            disabled={selectedItems}
            currentValue={rankings[`${rank}-1`]}
          />
        </td>
        <td className="px-4 py-3">
          {selectedItem1 ? (
            <div className="space-y-1">
              <p className="text-muted-foreground text-sm">{selectedItem1.boss_name}</p>
              {selectedItem1.classification && getClassificationBadge(selectedItem1.classification)}
            </div>
          ) : '-'}
        </td>
        <td className="px-4 py-3">
          <SearchableItemSelect
            items={lootItems}
            value={selectedItemId2 || ''}
            onChange={(value) => handleItemSelect(rank, 2, value)}
            disabled={selectedItems}
            currentValue={rankings[`${rank}-2`]}
          />
        </td>
        <td className="px-4 py-3">
          {selectedItem2 ? (
            <div className="space-y-1">
              <p className="text-muted-foreground text-sm">{selectedItem2.boss_name}</p>
              {selectedItem2.classification && getClassificationBadge(selectedItem2.classification)}
            </div>
          ) : '-'}
        </td>
      </tr>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation
        user={user}
        characterName={member?.character_name}
        className={member?.class?.name}
        classColor={member?.class?.color_hex}
        role={member?.role}
        showBack
        backUrl="/dashboard"
        title="My Loot List"
      />

      <main className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Status Banner */}
        {submission && (
          <div className={`rounded-xl p-4 border ${getStatusColor(submission.status)}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Status: {getStatusLabel(submission.status)}</p>
                {submission.submitted_at && (
                  <p className="text-sm opacity-75">
                    Submitted: {new Date(submission.submitted_at).toLocaleDateString()}
                  </p>
                )}
              </div>
              <div className="text-right">
                <span className="text-sm opacity-75">{rankedCount} items ranked</span>
              </div>
            </div>
            {submission.review_notes && (
              <div className="mt-3 p-3 bg-black/20 rounded-lg">
                <p className="text-sm"><strong>Officer Notes:</strong> {submission.review_notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Message */}
        {message && (
          <div className={`rounded-xl p-4 ${message.type === 'success' ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}>
            {message.text}
          </div>
        )}

        {/* Instructions */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-foreground font-semibold mb-2">How to Rank</h3>
          <ul className="text-muted-foreground text-sm space-y-1">
            <li>• Select up to 2 items for each desirability level (50 = highest priority, 1 = lowest)</li>
            <li>• <span className="font-semibold text-foreground">Brackets 1-4</span> (50-39): Maximum 3 allocation points per bracket</li>
            <li>• <span className="font-semibold text-foreground">No Bracket</span> (38-25): Still considered main-spec priority</li>
            <li>• <span className="font-semibold text-foreground">Off-spec</span> (24-1): Off-spec items to support guild flexibility</li>
            <li>• Each item can only be selected once</li>
            <li>• <span className="text-red-400 font-semibold">If your rank number is tied you will roll</span></li>
          </ul>
        </div>

        {/* Duplicate Warning */}
        {duplicateItems.length > 0 && (
          <div className="bg-red-900/50 border border-red-500 rounded-xl p-4 text-red-300">
            <strong>Warning:</strong> You have selected the same item multiple times. Each item can only appear once.
          </div>
        )}

        {/* Bracket 1 (50-48) */}
        <div className="bg-card border border-border rounded-xl overflow-visible">
          <div className="bg-gradient-to-r from-red-900 to-red-700 px-6 py-3">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-foreground">Bracket 1 (50-48)</h2>
                {(() => {
                  const validation = getBracketValidation('Bracket 1 (50-48)')
                  return validation ? (
                    <div className="mt-2">
                      <p className={`text-sm font-semibold ${validation.violations.length > 0 ? 'text-red-200' : 'text-red-200'}`}>
                        Allocation Points: {validation.allocationPoints}/{validation.maxPoints}
                      </p>
                      {validation.violations.length > 0 && (
                        <div className="mt-2 bg-red-800/50 rounded p-2">
                          <ul className="space-y-1 text-sm text-red-100">
                            {validation.violations.map((violation, idx) => (
                              <li key={idx}>⚠ {violation}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-red-200 text-sm mt-1">Max 3 allocation points per bracket</p>
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
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300 w-20">Rank</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Loot #1</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300 w-48">Item Details</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Loot #2</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300 w-48">Item Details</th>
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
        <div className="bg-card border border-border rounded-xl overflow-visible">
          <div className="bg-gradient-to-r from-orange-900 to-orange-700 px-6 py-3">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-foreground">Bracket 2 (47-45)</h2>
                {(() => {
                  const validation = getBracketValidation('Bracket 2 (47-45)')
                  return validation ? (
                    <div className="mt-2">
                      <p className={`text-sm font-semibold ${validation.violations.length > 0 ? 'text-orange-200' : 'text-orange-200'}`}>
                        Allocation Points: {validation.allocationPoints}/{validation.maxPoints}
                      </p>
                      {validation.violations.length > 0 && (
                        <div className="mt-2 bg-orange-800/50 rounded p-2">
                          <ul className="space-y-1 text-sm text-orange-100">
                            {validation.violations.map((violation, idx) => (
                              <li key={idx}>⚠ {violation}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-orange-200 text-sm mt-1">Max 3 allocation points per bracket</p>
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
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300 w-20">Rank</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Loot #1</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300 w-48">Item Details</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Loot #2</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300 w-48">Item Details</th>
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
        <div className="bg-card border border-border rounded-xl overflow-visible">
          <div className="bg-gradient-to-r from-yellow-900 to-yellow-700 px-6 py-3">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-foreground">Bracket 3 (44-42)</h2>
                {(() => {
                  const validation = getBracketValidation('Bracket 3 (44-42)')
                  return validation ? (
                    <div className="mt-2">
                      <p className={`text-sm font-semibold ${validation.violations.length > 0 ? 'text-yellow-200' : 'text-yellow-200'}`}>
                        Allocation Points: {validation.allocationPoints}/{validation.maxPoints}
                      </p>
                      {validation.violations.length > 0 && (
                        <div className="mt-2 bg-yellow-800/50 rounded p-2">
                          <ul className="space-y-1 text-sm text-yellow-100">
                            {validation.violations.map((violation, idx) => (
                              <li key={idx}>⚠ {violation}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-yellow-200 text-sm mt-1">Max 3 allocation points per bracket</p>
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
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300 w-20">Rank</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Loot #1</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300 w-48">Item Details</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Loot #2</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300 w-48">Item Details</th>
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
        <div className="bg-card border border-border rounded-xl overflow-visible">
          <div className="bg-gradient-to-r from-amber-900 to-amber-700 px-6 py-3">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-foreground">Bracket 4 (41-39)</h2>
                {(() => {
                  const validation = getBracketValidation('Bracket 4 (41-39)')
                  return validation ? (
                    <div className="mt-2">
                      <p className={`text-sm font-semibold ${validation.violations.length > 0 ? 'text-amber-200' : 'text-amber-200'}`}>
                        Allocation Points: {validation.allocationPoints}/{validation.maxPoints}
                      </p>
                      {validation.violations.length > 0 && (
                        <div className="mt-2 bg-amber-800/50 rounded p-2">
                          <ul className="space-y-1 text-sm text-amber-100">
                            {validation.violations.map((violation, idx) => (
                              <li key={idx}>⚠ {violation}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-amber-200 text-sm mt-1">Max 3 allocation points per bracket</p>
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
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300 w-20">Rank</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Loot #1</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300 w-48">Item Details</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Loot #2</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300 w-48">Item Details</th>
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
        <div className="bg-card border border-border rounded-xl overflow-visible">
          <div className="bg-gradient-to-r from-green-900 to-green-700 px-6 py-3">
            <h2 className="text-xl font-bold text-foreground">No Bracket (38-25) - Main-spec</h2>
            <p className="text-green-200 text-sm">Still considered main-spec priority</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-accent border-b border-border">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300 w-20">Rank</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Loot #1</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300 w-48">Item Details</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Loot #2</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300 w-48">Item Details</th>
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
        <div className="bg-card border border-border rounded-xl overflow-visible">
          <div className="bg-gradient-to-r from-blue-900 to-blue-700 px-6 py-3">
            <h2 className="text-xl font-bold text-foreground">Off-spec (24-1)</h2>
            <p className="text-blue-200 text-sm">Off-spec items to support guild flexibility</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-accent border-b border-border">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300 w-20">Rank</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Loot #1</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300 w-48">Item Details</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Loot #2</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300 w-48">Item Details</th>
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

        {/* Action Buttons */}
        <div className="flex gap-4 sticky bottom-0 bg-background py-4">
          <button
            onClick={() => saveSubmission(false)}
            disabled={saving}
            className="flex-1 py-3 bg-secondary hover:bg-gray-600 disabled:bg-card disabled:text-gray-500 rounded-xl text-foreground font-semibold transition"
          >
            {saving ? 'Saving...' : 'Save Draft'}
          </button>
          <button
            onClick={() => saveSubmission(true)}
            disabled={saving || rankedCount === 0 || duplicateItems.length > 0 || hasValidationErrors}
            className="flex-1 py-3 bg-primary hover:bg-primary/90 disabled:bg-card disabled:text-gray-500 rounded-xl text-foreground font-semibold transition"
          >
            {saving ? 'Submitting...' : 'Submit for Review'}
          </button>
        </div>
      </main>
    </div>
  )
}

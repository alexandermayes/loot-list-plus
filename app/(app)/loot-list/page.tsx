'use client'

import { createClient } from '@/utils/supabase/client'
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import SearchableItemSelect from '@/app/components/SearchableItemSelect'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { ExpansionGuard } from '@/app/components/ExpansionGuard'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { TierTabsSkeleton, TableSkeleton } from '@/components/ui/skeletons'
import { useNotification } from '@/app/contexts/NotificationContext'
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalBody,
} from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Heading } from '@/components/ui/typography'
import { normalizeBossName } from '@/utils/bossOrder'
import { getRaidIcon } from '@/utils/raidIcons'
import { StarFilledIcon, CheckFilledIcon, ClockFilledIcon, AlertFilledIcon, CancelFilledIcon } from '@/components/ui/icons'

interface LootItem {
  id: string
  name: string
  boss_name: string
  item_slot: string
  wowhead_id: number
  classification?: string // Reserved, Limited, Unlimited
  item_type?: string // For duplicate detection
  allocation_cost?: number // 0 or 1
  roles?: string[] // Roles that can use this item
}

interface Submission {
  id: string
  status: string
  submitted_at: string | null
  review_notes: string | null
}

export default function LootList() {
  const {
    activeGuild,
    activeCharacter,
    loading: guildLoading,
    currentExpansion,
    guildExpansions,
    viewingExpansionId,
    setViewingExpansion
  } = useGuildContext()
  const { showNotification } = useNotification()
  const [lootItems, setLootItems] = useState<LootItem[]>([])
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [rankings, setRankings] = useState<Record<string, string>>({}) // "rank-slot" -> item_id (e.g., "50-1", "50-2")
  const [initialLoading, setInitialLoading] = useState(true)
  const [contentLoading, setContentLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [raidTiers, setRaidTiers] = useState<any[]>([])
  const [selectedTierDeadline, setSelectedTierDeadline] = useState<string | null>(null)
  const [selectedTierId, setSelectedTierId] = useState<string | null>(() => {
    // Try to read tier from URL on initial load
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      return params.get('tier')
    }
    return null
  })
  const [tierSubmissionStatuses, setTierSubmissionStatuses] = useState<Record<string, any>>({})
  const [guildId, setGuildId] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [member, setMember] = useState<any>(null)
  const [enforceSlotRestrictions, setEnforceSlotRestrictions] = useState(true)
  const [showInstructionsModal, setShowInstructionsModal] = useState(false)
  const [autoSaving, setAutoSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [initialLoadComplete, setInitialLoadComplete] = useState(false)
  const [initialRankings, setInitialRankings] = useState<Record<string, string>>({}) // Track original rankings to detect changes
  const [originalStatus, setOriginalStatus] = useState<string | null>(null) // Track original submission status
  const [expandedErrors, setExpandedErrors] = useState<Set<string>>(new Set()) // Track which bracket errors are expanded

  const rankingsRef = useRef(rankings)
  const submissionRef = useRef(submission)
  const savingInProgressRef = useRef(false)

  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Keep refs in sync
  useEffect(() => {
    rankingsRef.current = rankings
  }, [rankings])

  useEffect(() => {
    submissionRef.current = submission
  }, [submission])

  // Set page title
  useEffect(() => {
    document.title = 'LootList+ • Loot List'
  }, [])

  // Define raid tier progression order (Classic + TBC + WotLK)
  const getRaidTierOrder = (tierName: string): number => {
    const order: Record<string, number> = {
      // Classic
      'Molten Core': 1, 'MC': 1,
      'Onyxia\'s Lair': 2, 'Onyxia': 2,
      'Blackwing Lair': 3, 'BWL': 3,
      'Zul\'Gurub': 4, 'ZG': 4,
      'Ruins of Ahn\'Qiraj': 5, 'AQ20': 5,
      'Temple of Ahn\'Qiraj': 6, 'AQ40': 6,
      'Naxxramas': 7, 'Naxx': 7,
      // TBC
      'Karazhan': 10, 'Kara': 10,
      'Gruul\'s Lair': 11, 'Gruul': 11,
      'Magtheridon\'s Lair': 12, 'Magtheridon': 12, 'Mag': 12,
      'Serpentshrine Cavern': 20, 'SSC': 20,
      'Tempest Keep: The Eye': 21, 'Tempest Keep': 21, 'The Eye': 21, 'TK': 21,
      'Hyjal Summit': 30, 'Mount Hyjal': 30, 'Hyjal': 30,
      'Black Temple': 31, 'BT': 31,
      'Zul\'Aman': 32, 'ZA': 32,
      'Sunwell Plateau': 33, 'Sunwell': 33, 'SWP': 33,
      // WotLK
      'Vault of Archavon': 40, 'VoA': 40,
      'Obsidian Sanctum': 41, 'OS': 41,
      'Eye of Eternity': 42, 'EoE': 42,
      'Naxxramas (10)': 43, 'Naxxramas (25)': 44,
      'Ulduar': 50,
      'Trial of the Crusader': 60, 'ToC': 60,
      'Trial of the Grand Crusader': 61, 'ToGC': 61,
      'Onyxia\'s Lair (10)': 62, 'Onyxia\'s Lair (25)': 63,
      'Icecrown Citadel': 70, 'ICC': 70,
      'Ruby Sanctum': 80, 'RS': 80
    }
    return order[tierName] || 999 // Unknown tiers go to the end
  }

  // Helper to change tier and update URL without page reload
  const changeTier = useCallback((tierId: string) => {
    setSelectedTierId(tierId)
    // Update URL with tier parameter without causing navigation/reload
    const params = new URLSearchParams(searchParams.toString())
    params.set('tier', tierId)
    window.history.replaceState(null, '', `?${params.toString()}`)
  }, [searchParams])

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
        class: activeCharacter.class,
        class_id: activeCharacter.class_id
      })

      // Load guild settings to check slot restrictions
      const { data: settingsData } = await supabase
        .from('guild_settings')
        .select('enforce_slot_restrictions')
        .eq('guild_id', activeGuild.id)
        .single()

      // Default to true if setting doesn't exist
      setEnforceSlotRestrictions(settingsData?.enforce_slot_restrictions ?? true)

      // Get all raid tiers for the viewing expansion (or current expansion if not viewing a specific one)
      const targetExpansionId = viewingExpansionId || currentExpansion?.expansion_id

      if (!targetExpansionId) {
        setInitialLoading(false)
        return
      }

      const { data: tiersData } = await supabase
        .from('raid_tiers')
        .select('id, name, is_active, submission_deadline')
        .eq('expansion_id', targetExpansionId)
        .eq('is_guild_active', true)

      if (!tiersData || tiersData.length === 0) {
        setInitialLoading(false)
        return
      }

      // Sort by Classic raid progression order
      const sortedTiers = tiersData.sort((a: any, b: any) => {
        return getRaidTierOrder(a.name) - getRaidTierOrder(b.name)
      })

      setRaidTiers(sortedTiers)

      // Determine which tier to select
      const tierIdFromUrl = searchParams.get('tier')
      let tierToSelect: any

      if (tierIdFromUrl && sortedTiers.some(t => t.id === tierIdFromUrl)) {
        // URL has a valid tier, use it
        tierToSelect = sortedTiers.find(t => t.id === tierIdFromUrl)!
        // Only update state if it's different (avoid unnecessary re-renders)
        if (selectedTierId !== tierToSelect.id) {
          setSelectedTierId(tierToSelect.id)
        }
      } else if (selectedTierId && sortedTiers.some(t => t.id === selectedTierId)) {
        // Already have a valid tier selected from initial state, keep it and update URL
        const params = new URLSearchParams(searchParams.toString())
        params.set('tier', selectedTierId)
        router.replace(`?${params.toString()}`, { scroll: false })
      } else {
        // No valid tier yet, use default and update both state and URL
        tierToSelect = sortedTiers.find(t => t.is_active) || sortedTiers[0]
        setSelectedTierId(tierToSelect.id)
        const params = new URLSearchParams(searchParams.toString())
        params.set('tier', tierToSelect.id)
        router.replace(`?${params.toString()}`, { scroll: false })
      }

      // Don't set loading to false here - let the tier data useEffect handle it
      // This prevents a flicker where we show content briefly before loading tier data
    }

    loadData()
  }, [guildLoading, activeGuild, activeCharacter, viewingExpansionId, currentExpansion])

  // Load submission statuses for all tiers
  useEffect(() => {
    const loadSubmissionStatuses = async () => {
      if (!activeCharacter || !guildId || raidTiers.length === 0) return

      const tierIds = raidTiers.map(t => t.id)

      const { data: submissions } = await supabase
        .from('loot_submissions')
        .select('raid_tier_id, status, submitted_at')
        .eq('character_id', activeCharacter.id)
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
  }, [activeCharacter, guildId, raidTiers])

  // Load loot items and submission for selected tier
  useEffect(() => {
    const loadTierData = async () => {
      if (!selectedTierId || !guildId || !activeCharacter) {
        setLootItems([])
        setSubmission(null)
        setRankings({})
        setSelectedTierDeadline(null)
        return
      }

      setInitialLoadComplete(false)
      setContentLoading(true)

      try {
        // Load selected tier's deadline
        const selectedTier = raidTiers.find(t => t.id === selectedTierId)
        setSelectedTierDeadline(selectedTier?.submission_deadline || null)

        // Load loot items for this tier
        const { data: itemsData } = await supabase
          .from('loot_items')
          .select(`
            id, name, boss_name, item_slot, wowhead_id,
            classification, item_type, allocation_cost, is_available, roles,
            loot_item_classes(class_id, spec_id, spec_type)
          `)
          .eq('raid_tier_id', selectedTierId)
          .eq('is_available', true)
          .order('id')

        if (itemsData) {
          const filteredItems = itemsData.filter(item => {
            const classes = item.loot_item_classes as any[]

            // If no spec restrictions, show to anyone
            if (classes.length === 0) return true

            // If character has no spec set, show all items for their class
            if (!activeCharacter.spec_id) {
              return classes.some(c => c.class_id === activeCharacter.class_id)
            }

            // Check if character's specific spec is in primary or secondary list
            const specMatch = classes.some(c => c.spec_id === activeCharacter.spec_id)
            return specMatch
          })
          setLootItems(filteredItems)
        }

        // Load existing submission for this tier
        const { data: subData } = await supabase
          .from('loot_submissions')
          .select('id, status, submitted_at, review_notes')
          .eq('character_id', activeCharacter.id)
          .eq('raid_tier_id', selectedTierId)
          .eq('guild_id', guildId)
          .maybeSingle()

        if (subData) {
          setSubmission(subData)

          // Load existing rankings
          const { data: rankingsData } = await supabase
            .from('loot_submission_items')
            .select('loot_item_id, rank, slot')
            .eq('submission_id', subData.id)

          if (rankingsData) {
            const rankingsMap: Record<string, string> = {}

            rankingsData.forEach(r => {
              rankingsMap[`${r.rank}-${r.slot}`] = r.loot_item_id
            })

            setRankings(rankingsMap)
            setInitialRankings(rankingsMap) // Store initial state to track changes
            setOriginalStatus(subData.status) // Store original status
          }
        } else {
          setSubmission(null)
          setRankings({})
          setInitialRankings({}) // Reset initial rankings when no submission
          setOriginalStatus(null) // Reset original status
        }
      } catch (error) {
        console.error('Error loading tier data:', error)
      }

      setContentLoading(false)
      setInitialLoading(false)
      setInitialLoadComplete(true)
    }

    loadTierData()
  }, [selectedTierId, activeCharacter, guildId])

  // Refresh Wowhead tooltips after items are loaded and loading is complete
  useEffect(() => {
    if (!contentLoading && lootItems.length > 0 && typeof window !== 'undefined' && (window as any).$WowheadPower) {
      // Use longer delay to ensure DOM is fully settled and reduce flickering
      const timer = setTimeout(() => {
        (window as any).$WowheadPower.refreshLinks()
      }, 300)

      return () => clearTimeout(timer)
    }
  }, [contentLoading, lootItems.length]) // Only trigger on loading state change and item count change, not on lootItems content change

  // Helper to check if we're past the submission deadline
  const isPastDeadline = (): boolean => {
    if (!selectedTierDeadline) return false
    return new Date() > new Date(selectedTierDeadline)
  }

  // Helper function to get bracket name and ranks for a given rank
  const getBracketForRank = (rank: number): { name: string, ranks: number[] } | null => {
    if (rank >= 48 && rank <= 50) return { name: 'Bracket 1', ranks: [50, 49, 48] }
    if (rank >= 45 && rank <= 47) return { name: 'Bracket 2', ranks: [47, 46, 45] }
    if (rank >= 42 && rank <= 44) return { name: 'Bracket 3', ranks: [44, 43, 42] }
    if (rank >= 39 && rank <= 41) return { name: 'Bracket 4', ranks: [41, 40, 39] }
    return null // No bracket (ranks 38-25)
  }

  const handleItemSelect = useCallback((rank: number, slot: number, itemId: string) => {
    const key = `${rank}-${slot}`
    if (itemId === '') {
      setRankings(prev => {
        const newRankings = { ...prev }
        delete newRankings[key]
        return newRankings
      })
    } else {
      setRankings(prev => ({ ...prev, [key]: itemId }))
    }
  }, [])

  const handleClearList = useCallback(() => {
    if (confirm('Are you sure you want to clear all ranked items? This cannot be undone.')) {
      setRankings({})
    }
  }, [])

  const toggleErrorExpanded = useCallback((bracketName: string) => {
    setExpandedErrors(prev => {
      const newSet = new Set(prev)
      if (newSet.has(bracketName)) {
        newSet.delete(bracketName)
      } else {
        newSet.add(bracketName)
      }
      return newSet
    })
  }, [])

  const saveSubmission = async (submit: boolean) => {
    if (!activeCharacter || !selectedTierId || !guildId) return

    setSaving(true)

    try {
      let submissionId = submission?.id

      if (!submissionId) {
        const { data: newSub, error: subError } = await supabase
          .from('loot_submissions')
          .insert({
            character_id: activeCharacter.id,
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
        // If updating an existing submission, always set to pending when submitting
        // (even if it was previously approved, it needs re-approval after changes)
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
          submitted_at: submit ? new Date().toISOString() : prev.submitted_at,
          updated_at: new Date().toISOString()
        } : null)
      }

      // Delete existing rankings
      await supabase
        .from('loot_submission_items')
        .delete()
        .eq('submission_id', submissionId)

      // Insert new rankings (convert from "rank-slot" format)
      const rankingsToInsert = Object.entries(rankings).map(([key, loot_item_id]) => {
        const [rankStr, slotStr] = key.split('-')
        const rank = parseInt(rankStr)
        const slot = parseInt(slotStr)

        return {
          submission_id: submissionId,
          loot_item_id,
          rank,
          slot
        }
      })

      if (rankingsToInsert.length > 0) {
        const { error: itemsError } = await supabase
          .from('loot_submission_items')
          .insert(rankingsToInsert)

        if (itemsError) throw itemsError
      }

      showNotification('success', submit ? 'Loot list submitted for review!' : 'Draft saved!')

      // Update initial rankings and original status to reflect saved state
      setInitialRankings({ ...rankings })
      const newStatus = submit ? 'pending' : 'draft'
      setOriginalStatus(newStatus)

      // Refresh submission statuses after save
      if (activeCharacter && guildId && raidTiers.length > 0) {
        const tierIds = raidTiers.map(t => t.id)
        const { data: submissions } = await supabase
          .from('loot_submissions')
          .select('raid_tier_id, status, submitted_at')
          .eq('character_id', activeCharacter.id)
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
  const autoSave = useCallback(async () => {
    if (!activeCharacter || !selectedTierId || !guildId) return

    // Prevent concurrent saves using ref (more reliable than state)
    if (savingInProgressRef.current) {
      console.log('Save already in progress, skipping...')
      return
    }

    savingInProgressRef.current = true

    const currentSubmission = submissionRef.current
    const currentRankings = rankingsRef.current

    // Determine if rankings have changed
    const currentKeys = Object.keys(currentRankings).sort()
    const initialKeys = Object.keys(initialRankings).sort()
    const rankingsChanged = currentKeys.length !== initialKeys.length ||
      currentKeys.some(key => currentRankings[key] !== initialRankings[key])

    // Determine target status based on changes
    let targetStatus = currentSubmission?.status || 'draft'
    if (rankingsChanged && (currentSubmission?.status === 'approved' || currentSubmission?.status === 'pending')) {
      // If there are changes and status is approved/pending, change to draft
      targetStatus = 'draft'
    } else if (!rankingsChanged && currentSubmission?.status === 'draft' && originalStatus && ['approved', 'pending'].includes(originalStatus)) {
      // If no changes and status is draft but original was approved/pending, restore original
      targetStatus = originalStatus
    }

    setAutoSaving(true)

    try {
      // First verify the character is a member of this guild
      const { data: membership, error: membershipError } = await supabase
        .from('character_guild_memberships')
        .select('id')
        .eq('character_id', activeCharacter.id)
        .eq('guild_id', guildId)
        .maybeSingle()

      if (membershipError || !membership) {
        console.error('Character is not a member of this guild. Membership check failed:', membershipError)
        showNotification('error', 'Your character needs to rejoin this guild. Please visit Guild Settings.')
        savingInProgressRef.current = false
        setAutoSaving(false)
        return
      }

      let submissionId = currentSubmission?.id

      if (!submissionId) {
        const { data: newSub, error: subError } = await supabase
          .from('loot_submissions')
          .insert({
            character_id: activeCharacter.id,
            guild_id: guildId,
            raid_tier_id: selectedTierId,
            status: targetStatus,
            submitted_at: null
          })
          .select()
          .single()

        if (subError) {
          console.error('Submission insert error:', subError)
          throw new Error(subError.message || 'Failed to create submission')
        }
        submissionId = newSub.id
        setSubmission(newSub)
      } else {
        const { error: updateError } = await supabase
          .from('loot_submissions')
          .update({
            status: targetStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', submissionId)

        if (updateError) {
          console.error('Submission update error:', updateError)
          throw new Error(updateError.message || 'Failed to update submission')
        }

        // Update local submission state
        setSubmission(prev => prev ? { ...prev, status: targetStatus } : null)
      }

      // Delete existing rankings - wait for it to complete
      const { error: deleteError, count: deleteCount } = await supabase
        .from('loot_submission_items')
        .delete({ count: 'exact' })
        .eq('submission_id', submissionId)

      if (deleteError) {
        console.error('Delete items error:', deleteError)
        throw new Error(deleteError.message || 'Failed to delete existing rankings')
      }

      console.log(`Deleted ${deleteCount} existing items for submission ${submissionId}`)

      // Insert new rankings (convert from "rank-slot" format)
      const rankingsToInsert = Object.entries(currentRankings).map(([key, loot_item_id]) => {
        const [rankStr, slotStr] = key.split('-')
        const rank = parseInt(rankStr)
        const slot = parseInt(slotStr)

        return {
          submission_id: submissionId,
          loot_item_id,
          rank,
          slot
        }
      })

      if (rankingsToInsert.length > 0) {
        // Use upsert to handle any remaining duplicates gracefully
        const { error: itemsError } = await supabase
          .from('loot_submission_items')
          .upsert(rankingsToInsert, {
            onConflict: 'submission_id,rank,slot',
            ignoreDuplicates: false
          })

        if (itemsError) {
          console.error('Insert items error:', itemsError)
          console.error('Attempted to insert:', rankingsToInsert.length, 'items')
          throw new Error(itemsError.message || 'Failed to save rankings')
        }
      }

      setLastSaved(new Date())
    } catch (error: any) {
      console.error('Auto-save failed:', error)
      showNotification('error', error.message || 'Auto-save failed')
    } finally {
      // Always clear the save lock
      savingInProgressRef.current = false
      setAutoSaving(false)
    }
  }, [activeCharacter, selectedTierId, guildId, supabase, showNotification, initialRankings, originalStatus])

  // Auto-save when rankings change (debounced)
  useEffect(() => {
    if (!activeCharacter || !selectedTierId || !guildId || !initialLoadComplete) return

    const timer = setTimeout(() => {
      autoSave()
    }, 300) // 300ms debounce

    return () => clearTimeout(timer)
  }, [rankings, selectedTierId, activeCharacter, guildId, initialLoadComplete, autoSave])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-success/10 border-success text-foreground'
      case 'pending': return 'bg-yellow-500/10 border-yellow-500 text-foreground'
      case 'needs_revision': return 'bg-orange-500/10 border-orange-500 text-foreground'
      case 'rejected': return 'bg-destructive/10 border-destructive text-foreground'
      default: return 'bg-background-elevated border-border text-muted-foreground'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved': return 'Approved'
      case 'pending': return 'Pending'
      case 'needs_revision': return 'Needs Revision'
      case 'rejected': return 'Rejected'
      default: return 'Draft'
    }
  }

  const rankedCount = Object.keys(rankings).length
  const selectedItems = useMemo(() => new Set(Object.values(rankings)), [rankings])
  const duplicateItems = useMemo(() =>
    Object.values(rankings).filter((itemId, index, arr) => arr.indexOf(itemId) !== index),
    [rankings]
  )

  // Check if rankings have changed since initial load
  const hasChanges = useMemo(() => {
    const currentKeys = Object.keys(rankings).sort()
    const initialKeys = Object.keys(initialRankings).sort()

    // Different number of rankings = changed
    if (currentKeys.length !== initialKeys.length) return true

    // Check if any ranking values differ
    return currentKeys.some(key => rankings[key] !== initialRankings[key])
  }, [rankings, initialRankings])

  // Bracket validation
  type BracketValidation = {
    bracketName: string
    allocationPoints: number
    maxPoints: number
    ranks: number[]
    violations: string[]
  }

  const bracketValidations = useMemo((): BracketValidation[] => {
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
  }, [rankings, lootItems, enforceSlotRestrictions])
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

  const RankRow = React.memo(({ rank }: { rank: number }) => {
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
        <td className={`px-3 py-2.5 font-semibold text-[13px] text-foreground bg-gradient-to-r ${getRankColor(rank)}`} rowSpan={1}>
          {rank}
        </td>
        <td className="px-3 py-2.5">
          <SearchableItemSelect
            items={lootItems}
            value={selectedItemId1 || ''}
            onChange={(value) => handleItemSelect(rank, 1, value)}
            disabled={selectedItems}
            currentValue={rankings[`${rank}-1`]}
          />
        </td>
        <td className="px-3 py-2.5">
          {selectedItem1 ? (
            <div className="flex items-center gap-2">
              <p className="text-foreground-muted text-[12px]">{normalizeBossName(selectedItem1.boss_name)}</p>
              {selectedItem1.classification && getClassificationBadge(selectedItem1.classification)}
            </div>
          ) : <span className="text-foreground-muted text-[12px]">-</span>}
        </td>
        <td className="px-3 py-2.5">
          <SearchableItemSelect
            items={lootItems}
            value={selectedItemId2 || ''}
            onChange={(value) => handleItemSelect(rank, 2, value)}
            disabled={selectedItems}
            currentValue={rankings[`${rank}-2`]}
          />
        </td>
        <td className="px-3 py-2.5">
          {selectedItem2 ? (
            <div className="flex items-center gap-2">
              <p className="text-foreground-muted text-[12px]">{normalizeBossName(selectedItem2.boss_name)}</p>
              {selectedItem2.classification && getClassificationBadge(selectedItem2.classification)}
            </div>
          ) : <span className="text-foreground-muted text-[12px]">-</span>}
        </td>
      </tr>
    )
  })

  return (
    <ExpansionGuard>
      <div className="font-poppins">
        {/* Header - Always visible */}
        <div className="p-8 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Heading level={1}>Loot Lists</Heading>
              <div className="mt-1">
                <p className="text-muted-foreground text-base inline">
                  {initialLoading ? 'Loading raid tiers...' : `Rank your preferred items for ${raidTiers.find(t => t.id === selectedTierId)?.name || 'this raid tier'}`}
                </p>
                {viewingExpansionId && (
                  <span className="ml-2 px-3 py-1 bg-blue-950/50 border border-blue-600/50 text-blue-300 text-xs font-medium rounded-full">
                    Viewing Past: {guildExpansions.find(e => e.expansion_id === viewingExpansionId)?.expansion_name}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Auto-save status */}
              <div className="text-sm text-muted-foreground">
                {autoSaving ? (
                  <span>Saving...</span>
                ) : lastSaved ? (
                  <span>Saved {new Date(lastSaved).toLocaleTimeString()}</span>
                ) : null}
              </div>
              {/* How to Rank Button */}
              <Button variant="secondary" onClick={() => setShowInstructionsModal(true)}>
                How to Rank
              </Button>
            </div>
          </div>

          {/* Expansion Selector */}
          {guildExpansions.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-2 mt-4">
              <span className="text-muted-foreground text-sm font-medium whitespace-nowrap">Expansion:</span>
              <div className="flex gap-2">
                {guildExpansions.map((expansion) => {
                  const isViewing = viewingExpansionId === expansion.expansion_id
                  const isCurrent = expansion.is_current && !viewingExpansionId

                  return (
                    <button
                      key={expansion.expansion_id}
                      onClick={() => setViewingExpansion(expansion.is_current ? null : expansion.expansion_id)}
                      className={`px-5 py-2.5 rounded-[40px] whitespace-nowrap text-[13px] font-medium transition-all ${
                        isViewing || isCurrent
                          ? 'bg-accent/20 border-[0.5px] border-accent/20 text-accent'
                          : 'bg-background-elevated border border-border text-foreground hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{expansion.expansion_name}</span>
                        {expansion.is_current && <StarFilledIcon size={14} />}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Raid Tier Tabs - Sticky */}
        {initialLoading ? (
          <div className="sticky top-0 z-20 px-8 py-3 bg-background">
            <TierTabsSkeleton />
          </div>
        ) : raidTiers.length > 0 && (
          <div className="sticky top-0 z-20 px-8 py-3 bg-background">
            <div className="flex items-center gap-3 overflow-x-auto">
              <span className="text-muted-foreground text-sm font-medium whitespace-nowrap">Raid Tier:</span>
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
                      onClick={() => changeTier(tier.id)}
                      className={`px-5 py-2.5 rounded-[40px] whitespace-nowrap text-[13px] font-medium transition-all ${
                        selectedTierId === tier.id
                          ? 'bg-accent/20 border-[0.5px] border-accent/20 text-accent'
                          : 'bg-background-elevated border border-border text-foreground hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{tier.name}</span>
                        {tier.is_active && <StarFilledIcon size={14} />}
                        {hasSubmission && (
                          <span className={statusColor}>
                            {status.status === 'approved' ? <CheckFilledIcon size={14} /> :
                             status.status === 'pending' ? <ClockFilledIcon size={14} /> :
                             status.status === 'needs_revision' ? <AlertFilledIcon size={14} /> :
                             status.status === 'rejected' ? <CancelFilledIcon size={14} /> :
                             <span className="w-2 h-2 rounded-full bg-current inline-block" />}
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="px-8 pb-8 space-y-6">
        {/* Content Loading State */}
        {(initialLoading || contentLoading) ? (
          <div className="space-y-6">
            <TableSkeleton rows={10} cols={3} />
          </div>
        ) : (
        <>
        {/* Status Banner */}
        {selectedTierId && (
          <div className={`rounded-xl p-6 border ${submission ? getStatusColor(submission.status) : getStatusColor('draft')}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={getRaidIcon(raidTiers.find(t => t.id === selectedTierId)?.name || '')}
                  alt=""
                  className="w-10 h-10 rounded-lg border-2 border-border/50 shadow-md"
                />
                <div>
                  <h2 className="font-semibold text-lg text-foreground">{raidTiers.find(t => t.id === selectedTierId)?.name || 'Raid Tier'}</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {submission ? getStatusLabel(submission.status) : 'Draft'}
                    {submission?.submitted_at && (
                      <span> · Submitted {new Date(submission.submitted_at).toLocaleDateString()}</span>
                    )}
                    {selectedTierDeadline && !isPastDeadline() && (
                      <span> · Due {new Date(selectedTierDeadline).toLocaleString()}</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm opacity-75">{rankedCount} items ranked</span>
                {/* Clear List Button */}
                {rankedCount > 0 && (
                  <Button variant="destructive" onClick={handleClearList}>
                    Clear List
                  </Button>
                )}
                {/* Submit for Review Button */}
                <Button
                  onClick={() => saveSubmission(true)}
                  disabled={
                    rankedCount === 0 ||
                    duplicateItems.length > 0 ||
                    hasValidationErrors ||
                    (!hasChanges && (submission?.status === 'approved' || submission?.status === 'pending'))
                  }
                  loading={saving}
                >
                  Submit for Review
                </Button>
              </div>
            </div>
            {submission?.review_notes && (
              <div className="mt-3 p-4 bg-black/20 rounded-xl">
                <p className="text-sm"><strong>Officer Notes:</strong> {submission.review_notes}</p>
              </div>
            )}
          </div>
        )}


        {/* Deadline Warning */}
        {selectedTierDeadline && isPastDeadline() && (
          <div className="bg-yellow-900/50 border border-yellow-500 rounded-xl p-4 text-yellow-200">
            <div className="flex items-start gap-3">
              <span className="text-xl">⏰</span>
              <div>
                <p className="font-semibold mb-1">Submission Deadline Passed</p>
                <p className="text-sm">
                  The deadline for this raid tier was {new Date(selectedTierDeadline).toLocaleString()}.
                  You can still submit changes, but they will require officer approval before being visible on the master sheet.
                </p>
              </div>
            </div>
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
          <div className="bg-red-500/10 border-l-4 border-l-red-800/60 px-4 py-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[15px] font-semibold text-foreground">Bracket 1 (50-48)</h2>
                {(() => {
                  const validation = getBracketValidation('Bracket 1 (50-48)')
                  return validation ? (
                    <p className={`text-[12px] font-medium mt-1 ${validation.violations.length > 0 ? 'text-red-200' : 'text-red-200'}`}>
                      Allocation Points: {validation.allocationPoints}/{validation.maxPoints}
                    </p>
                  ) : (
                    <p className="text-red-200 text-[12px] mt-1">Max 3 allocation points per bracket</p>
                  )
                })()}
              </div>
              {(() => {
                const validation = getBracketValidation('Bracket 1 (50-48)')
                const bracketName = 'Bracket 1 (50-48)'
                const isExpanded = expandedErrors.has(bracketName)
                return validation && validation.violations.length > 0 ? (
                  <div className="flex flex-col items-end gap-2">
                    <button
                      onClick={() => toggleErrorExpanded(bracketName)}
                      className="flex items-center gap-2 bg-red-500 hover:bg-red-600 border-2 border-red-300 px-3 py-1.5 rounded-lg font-bold text-foreground shadow-lg animate-pulse transition-colors cursor-pointer"
                    >
                      <span className="text-sm whitespace-nowrap">
                        {validation.violations.length} {validation.violations.length === 1 ? 'Error' : 'Errors'}
                      </span>
                      <span className="text-xs">{isExpanded ? '▼' : '▶'}</span>
                    </button>
                    {isExpanded && (
                      <div className="bg-red-600 border-2 border-red-400 rounded-lg px-3 py-2 shadow-lg max-w-md">
                        <ul className="space-y-1 text-sm font-semibold text-foreground">
                          {validation.violations.map((violation, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <span className="text-base">⚠️</span>
                              <span>{violation}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : null
              })()}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <colgroup>
                <col style={{ width: '64px' }} />
                <col style={{ width: '320px' }} />
                <col style={{ width: '160px' }} />
                <col style={{ width: '320px' }} />
                <col style={{ width: '160px' }} />
              </colgroup>
              <thead>
                <tr className="bg-background-subtle border-b border-border">
                  <th className="px-3 py-2.5 text-left text-[12px] font-medium text-foreground-muted">Rank</th>
                  <th className="px-3 py-2.5 text-left text-[12px] font-medium text-foreground-muted">Loot #1</th>
                  <th className="px-3 py-2.5 text-left text-[12px] font-medium text-foreground-muted">Details</th>
                  <th className="px-3 py-2.5 text-left text-[12px] font-medium text-foreground-muted">Loot #2</th>
                  <th className="px-3 py-2.5 text-left text-[12px] font-medium text-foreground-muted">Details</th>
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
          <div className="bg-orange-500/10 border-l-4 border-l-orange-800/60 px-4 py-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[15px] font-semibold text-foreground">Bracket 2 (47-45)</h2>
                {(() => {
                  const validation = getBracketValidation('Bracket 2 (47-45)')
                  return validation ? (
                    <p className={`text-[12px] font-medium mt-1 ${validation.violations.length > 0 ? 'text-orange-200' : 'text-orange-200'}`}>
                      Allocation Points: {validation.allocationPoints}/{validation.maxPoints}
                    </p>
                  ) : (
                    <p className="text-orange-200 text-[12px] mt-1">Max 3 allocation points per bracket</p>
                  )
                })()}
              </div>
              {(() => {
                const validation = getBracketValidation('Bracket 2 (47-45)')
                const bracketName = 'Bracket 2 (47-45)'
                const isExpanded = expandedErrors.has(bracketName)
                return validation && validation.violations.length > 0 ? (
                  <div className="flex flex-col items-end gap-2">
                    <button
                      onClick={() => toggleErrorExpanded(bracketName)}
                      className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 border-2 border-orange-300 px-3 py-1.5 rounded-lg font-bold text-foreground shadow-lg animate-pulse transition-colors cursor-pointer"
                    >
                      <span className="text-sm whitespace-nowrap">
                        {validation.violations.length} {validation.violations.length === 1 ? 'Error' : 'Errors'}
                      </span>
                      <span className="text-xs">{isExpanded ? '▼' : '▶'}</span>
                    </button>
                    {isExpanded && (
                      <div className="bg-orange-600 border-2 border-orange-400 rounded-lg px-3 py-2 shadow-lg max-w-md">
                        <ul className="space-y-1 text-sm font-semibold text-foreground">
                          {validation.violations.map((violation, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <span className="text-base">⚠️</span>
                              <span>{violation}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : null
              })()}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <colgroup>
                <col style={{ width: '64px' }} />
                <col style={{ width: '320px' }} />
                <col style={{ width: '160px' }} />
                <col style={{ width: '320px' }} />
                <col style={{ width: '160px' }} />
              </colgroup>
              <thead>
                <tr className="bg-background-subtle border-b border-border">
                  <th className="px-3 py-2.5 text-left text-[12px] font-medium text-foreground-muted">Rank</th>
                  <th className="px-3 py-2.5 text-left text-[12px] font-medium text-foreground-muted">Loot #1</th>
                  <th className="px-3 py-2.5 text-left text-[12px] font-medium text-foreground-muted">Details</th>
                  <th className="px-3 py-2.5 text-left text-[12px] font-medium text-foreground-muted">Loot #2</th>
                  <th className="px-3 py-2.5 text-left text-[12px] font-medium text-foreground-muted">Details</th>
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
          <div className="bg-yellow-500/10 border-l-4 border-l-yellow-800/60 px-4 py-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[15px] font-semibold text-foreground">Bracket 3 (44-42)</h2>
                {(() => {
                  const validation = getBracketValidation('Bracket 3 (44-42)')
                  return validation ? (
                    <p className={`text-[12px] font-medium mt-1 ${validation.violations.length > 0 ? 'text-yellow-200' : 'text-yellow-200'}`}>
                      Allocation Points: {validation.allocationPoints}/{validation.maxPoints}
                    </p>
                  ) : (
                    <p className="text-yellow-200 text-[12px] mt-1">Max 3 allocation points per bracket</p>
                  )
                })()}
              </div>
              {(() => {
                const validation = getBracketValidation('Bracket 3 (44-42)')
                const bracketName = 'Bracket 3 (44-42)'
                const isExpanded = expandedErrors.has(bracketName)
                return validation && validation.violations.length > 0 ? (
                  <div className="flex flex-col items-end gap-2">
                    <button
                      onClick={() => toggleErrorExpanded(bracketName)}
                      className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 border-2 border-yellow-300 px-3 py-1.5 rounded-lg font-bold text-foreground shadow-lg animate-pulse transition-colors cursor-pointer"
                    >
                      <span className="text-sm whitespace-nowrap">
                        {validation.violations.length} {validation.violations.length === 1 ? 'Error' : 'Errors'}
                      </span>
                      <span className="text-xs">{isExpanded ? '▼' : '▶'}</span>
                    </button>
                    {isExpanded && (
                      <div className="bg-yellow-600 border-2 border-yellow-400 rounded-lg px-3 py-2 shadow-lg max-w-md">
                        <ul className="space-y-1 text-sm font-semibold text-foreground">
                          {validation.violations.map((violation, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <span className="text-base">⚠️</span>
                              <span>{violation}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : null
              })()}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <colgroup>
                <col style={{ width: '64px' }} />
                <col style={{ width: '320px' }} />
                <col style={{ width: '160px' }} />
                <col style={{ width: '320px' }} />
                <col style={{ width: '160px' }} />
              </colgroup>
              <thead>
                <tr className="bg-background-subtle border-b border-border">
                  <th className="px-3 py-2.5 text-left text-[12px] font-medium text-foreground-muted">Rank</th>
                  <th className="px-3 py-2.5 text-left text-[12px] font-medium text-foreground-muted">Loot #1</th>
                  <th className="px-3 py-2.5 text-left text-[12px] font-medium text-foreground-muted">Details</th>
                  <th className="px-3 py-2.5 text-left text-[12px] font-medium text-foreground-muted">Loot #2</th>
                  <th className="px-3 py-2.5 text-left text-[12px] font-medium text-foreground-muted">Details</th>
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
          <div className="bg-amber-500/10 border-l-4 border-l-amber-800/60 px-4 py-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[15px] font-semibold text-foreground">Bracket 4 (41-39)</h2>
                {(() => {
                  const validation = getBracketValidation('Bracket 4 (41-39)')
                  return validation ? (
                    <p className={`text-[12px] font-medium mt-1 ${validation.violations.length > 0 ? 'text-amber-200' : 'text-amber-200'}`}>
                      Allocation Points: {validation.allocationPoints}/{validation.maxPoints}
                    </p>
                  ) : (
                    <p className="text-amber-200 text-[12px] mt-1">Max 3 allocation points per bracket</p>
                  )
                })()}
              </div>
              {(() => {
                const validation = getBracketValidation('Bracket 4 (41-39)')
                const bracketName = 'Bracket 4 (41-39)'
                const isExpanded = expandedErrors.has(bracketName)
                return validation && validation.violations.length > 0 ? (
                  <div className="flex flex-col items-end gap-2">
                    <button
                      onClick={() => toggleErrorExpanded(bracketName)}
                      className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 border-2 border-amber-300 px-3 py-1.5 rounded-lg font-bold text-foreground shadow-lg animate-pulse transition-colors cursor-pointer"
                    >
                      <span className="text-sm whitespace-nowrap">
                        {validation.violations.length} {validation.violations.length === 1 ? 'Error' : 'Errors'}
                      </span>
                      <span className="text-xs">{isExpanded ? '▼' : '▶'}</span>
                    </button>
                    {isExpanded && (
                      <div className="bg-amber-600 border-2 border-amber-400 rounded-lg px-3 py-2 shadow-lg max-w-md">
                        <ul className="space-y-1 text-sm font-semibold text-foreground">
                          {validation.violations.map((violation, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <span className="text-base">⚠️</span>
                              <span>{violation}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : null
              })()}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <colgroup>
                <col style={{ width: '64px' }} />
                <col style={{ width: '320px' }} />
                <col style={{ width: '160px' }} />
                <col style={{ width: '320px' }} />
                <col style={{ width: '160px' }} />
              </colgroup>
              <thead>
                <tr className="bg-background-subtle border-b border-border">
                  <th className="px-3 py-2.5 text-left text-[12px] font-medium text-foreground-muted">Rank</th>
                  <th className="px-3 py-2.5 text-left text-[12px] font-medium text-foreground-muted">Loot #1</th>
                  <th className="px-3 py-2.5 text-left text-[12px] font-medium text-foreground-muted">Details</th>
                  <th className="px-3 py-2.5 text-left text-[12px] font-medium text-foreground-muted">Loot #2</th>
                  <th className="px-3 py-2.5 text-left text-[12px] font-medium text-foreground-muted">Details</th>
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
          <div className="bg-green-500/10 border-l-4 border-l-green-800/60 px-4 py-2">
            <h2 className="text-[15px] font-semibold text-foreground">No Bracket (38-25) - Main-spec</h2>
            <p className="text-green-200 text-[12px]">Still considered main-spec priority</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <colgroup>
                <col style={{ width: '64px' }} />
                <col style={{ width: '320px' }} />
                <col style={{ width: '160px' }} />
                <col style={{ width: '320px' }} />
                <col style={{ width: '160px' }} />
              </colgroup>
              <thead>
                <tr className="bg-background-subtle border-b border-border">
                  <th className="px-3 py-2.5 text-left text-[12px] font-medium text-foreground-muted">Rank</th>
                  <th className="px-3 py-2.5 text-left text-[12px] font-medium text-foreground-muted">Loot #1</th>
                  <th className="px-3 py-2.5 text-left text-[12px] font-medium text-foreground-muted">Details</th>
                  <th className="px-3 py-2.5 text-left text-[12px] font-medium text-foreground-muted">Loot #2</th>
                  <th className="px-3 py-2.5 text-left text-[12px] font-medium text-foreground-muted">Details</th>
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
          <div className="bg-blue-500/10 border-l-4 border-l-blue-800/60 px-4 py-2">
            <h2 className="text-[15px] font-semibold text-foreground">Off-spec (24-1)</h2>
            <p className="text-blue-200 text-[12px]">Off-spec items to support guild flexibility</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <colgroup>
                <col style={{ width: '64px' }} />
                <col style={{ width: '320px' }} />
                <col style={{ width: '160px' }} />
                <col style={{ width: '320px' }} />
                <col style={{ width: '160px' }} />
              </colgroup>
              <thead>
                <tr className="bg-background-subtle border-b border-border">
                  <th className="px-3 py-2.5 text-left text-[12px] font-medium text-foreground-muted">Rank</th>
                  <th className="px-3 py-2.5 text-left text-[12px] font-medium text-foreground-muted">Loot #1</th>
                  <th className="px-3 py-2.5 text-left text-[12px] font-medium text-foreground-muted">Details</th>
                  <th className="px-3 py-2.5 text-left text-[12px] font-medium text-foreground-muted">Loot #2</th>
                  <th className="px-3 py-2.5 text-left text-[12px] font-medium text-foreground-muted">Details</th>
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
        <Modal open={showInstructionsModal} onClose={() => setShowInstructionsModal(false)} size="lg">
          <ModalHeader onClose={() => setShowInstructionsModal(false)}>
            <ModalTitle>How to Rank</ModalTitle>
          </ModalHeader>
          <ModalBody className="space-y-4">
            {/* Core Structure */}
            <div>
              <h4 className="text-foreground font-semibold text-sm mb-2">Core Structure</h4>
              <p className="text-muted-foreground text-sm">
                The system uses <span className="font-semibold text-foreground">50 desirability levels</span> (Level 50 being most desirable),
                with each level containing <span className="font-semibold text-foreground">2 item slots</span> divided into 6 brackets.
              </p>
            </div>

            {/* Brackets */}
            <div>
              <h4 className="text-foreground font-semibold text-sm mb-2">Bracket Framework</h4>
              <ul className="text-muted-foreground text-sm space-y-1">
                <li>• <span className="font-semibold text-destructive">Bracket 1:</span> Levels 50, 49, 48</li>
                <li>• <span className="font-semibold text-accent">Bracket 2:</span> Levels 47, 46, 45</li>
                <li>• <span className="font-semibold text-warning">Bracket 3:</span> Levels 44, 43, 42</li>
                <li>• <span className="font-semibold text-yellow-400">Bracket 4:</span> Levels 41, 40, 39</li>
                <li>• <span className="font-semibold text-success">No Bracket:</span> Levels 38-25 (Still main-spec priority)</li>
                <li>• <span className="font-semibold text-info">Off-spec:</span> Levels 24-1 (Enhances guild flexibility)</li>
              </ul>
            </div>

            {/* Key Rules */}
            <div>
              <h4 className="text-foreground font-semibold text-sm mb-2">Key Rules (Brackets 1-4)</h4>
              <ul className="text-muted-foreground text-sm space-y-2">
                <li>
                  <span className="font-semibold text-foreground">1. Allocation Point Limit:</span> Maximum 3 points per bracket.
                  <ul className="ml-4 mt-1 space-y-0.5">
                    <li>- <span className="text-destructive">Reserved items</span> cost 1 point</li>
                    <li>- <span className="text-warning">Limited items</span> cost 1 point</li>
                    <li>- <span className="text-success">Unlimited items</span> cost 0 points</li>
                  </ul>
                </li>
                <li>
                  <span className="font-semibold text-foreground">2. Type Restriction:</span> Brackets 1-4 may only contain 1 item of a type
                  (no duplicate weapon types in same bracket).
                </li>
                <li>
                  <span className="font-semibold text-foreground">3. Reserved Items:</span> Must be the sole entry at that desirability level
                  (cannot have another item in the same rank).
                </li>
                <li>
                  <span className="font-semibold text-foreground">4. Equal Priority:</span> Both item slots per level receive equal priority when filled.
                </li>
                <li>
                  <span className="font-semibold text-foreground">5. Dual Weapons:</span> Two identical non-unique weapons are permitted if not hand-specific
                  (e.g., two of the same dagger).
                </li>
                <li>
                  <span className="font-semibold text-foreground">6. Off-spec Importance:</span> Completing off-spec selections enhances guild flexibility
                  and is encouraged.
                </li>
              </ul>
            </div>

            {/* Important Notes */}
            <div className="bg-info/10 border border-info/30 rounded-xl p-4">
              <h4 className="text-info font-semibold text-sm mb-2">Important Notes</h4>
              <ul className="text-info text-sm space-y-1">
                <li>• Each item can only be selected once across all ranks</li>
                <li>• Items in "No Bracket" don't guarantee unavailability - they indicate other classes receive priority</li>
                <li>• <span className="text-destructive font-semibold">If your rank number is tied, you will roll</span></li>
              </ul>
            </div>
          </ModalBody>
        </Modal>
        </>
        )}
        </div>
      </div>
    </ExpansionGuard>
  )
}

'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ItemLink from '@/app/components/ItemLink'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { useNotification } from '@/app/contexts/NotificationContext'
import { ExpansionGuard } from '@/app/components/ExpansionGuard'
import { LootSettingsPageSkeleton } from '@/components/ui/skeletons'
import { Modal, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter } from '@/components/ui/modal'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Heading } from '@/components/ui/typography'
import { Select } from '@/components/ui/select'
import { toDateString } from '@/utils/date'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import StyledSelect from '@/app/components/StyledSelect'
import MultiSelectDropdown from '@/app/components/MultiSelectDropdown'
import { specMapping, allRoles, getRoleDisplayName } from '@/domain/loot/spec-role-mapping'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowDown01Icon, ArrowUp01Icon, Settings01Icon, Calendar03Icon, Settings02Icon, UserAdd01Icon, DiceIcon, Medal01Icon, Clock01Icon, GiftIcon, StickyNote01Icon, Search01Icon, Layers01Icon } from '@hugeicons/core-free-icons'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { Textarea } from '@/components/ui/textarea'
import { refreshWowheadTooltips } from '@/lib/wowhead'
import PriorityListTab from './components/PriorityListTab'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Checkbox } from '@/components/ui/checkbox'
import { trackClientEvent } from '@/utils/analytics/client'
import { InfoTooltip } from '@/components/ui/info-tooltip'

interface LootItem {
  id: string
  name: string
  boss_name: string
  item_slot: string
  wowhead_id: number
  classification: string
  item_type: string
  allocation_cost: number
  is_available: boolean
  is_loot_council: boolean
  roles: string[]
  officer_notes?: string
  raid_tier: {
    name: string
  }
}

interface WowClass {
  id: string
  name: string
  color_hex: string
}

interface ClassSpec {
  id: string
  class_id: string
  name: string
  class_name?: string
  combined_name?: string
  wow_classes?: { name: string }
}

interface ItemClassRelation {
  class_id: string
  spec_id: string | null
  spec_type: string // 'primary' or 'secondary'
}

// Classes that didn't exist in earlier expansions
const EXPANSION_CLASS_EXCLUSIONS: Record<string, string[]> = {
  'Classic': ['Death Knight', 'Monk'],
  'The Burning Crusade': ['Death Knight', 'Monk'],
  'Wrath of the Lich King': ['Monk'],
  'Cataclysm': ['Monk'],
}

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
  return order[tierName] || 999
}

export default function AdminLootItems() {
  const [lootItems, setLootItems] = useState<LootItem[]>([])
  const [classes, setClasses] = useState<WowClass[]>([])
  const [classSpecs, setClassSpecs] = useState<ClassSpec[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [member, setMember] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [filterTier, setFilterTier] = useState<string>('all')
  const [filterSlot, setFilterSlot] = useState<string>('all')
  const [filterClassification, setFilterClassification] = useState<string>('all')
  const [sortField, setSortField] = useState<'name' | 'boss' | 'slot' | 'raid' | 'classification' | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [raidTiers, setRaidTiers] = useState<any[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(100)

  const tableContainerRef = useRef<HTMLDivElement>(null)
  const goToPage = useCallback((page: number | ((prev: number) => number)) => {
    setCurrentPage(page)
    requestAnimationFrame(() => {
      tableContainerRef.current?.scrollTo(0, 0)
    })
  }, [])
  // Track specs for each item: { itemId: { primary: Set<specId>, secondary: Set<specId> } }
  const [itemSpecs, setItemSpecs] = useState<Record<string, { primary: Set<string>, secondary: Set<string> }>>({})
  // Track roles for each item: { itemId: Set<role> }
  const [itemRoles, setItemRoles] = useState<Record<string, Set<string>>>({})
  // Track notes for each item: { itemId: note }
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({})
  // Notes modal state
  const [notesModalItem, setNotesModalItem] = useState<LootItem | null>(null)
  const [notesModalValue, setNotesModalValue] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [advancedExpanded, setAdvancedExpanded] = useState(false)
  const [initialSettings, setInitialSettings] = useState<typeof settings | null>(null)
  const [initialGuildRoles, setInitialGuildRoles] = useState<typeof guildRoles | null>(null)
  const [viewMode, setViewMode] = useState<'items' | 'priorities'>('items')

  // Guild Settings State
  const getDefaultResetDate = () => {
    const today = new Date()
    today.setDate(today.getDate() - 28) // 4 weeks ago
    return toDateString(today)
  }

  const [settings, setSettings] = useState({
    // General Settings
    raid_days_per_week: 2,
    first_raid_day: 2,
    second_raid_day: 1 as number | null,
    third_raid_day: null as number | null,
    fourth_raid_day: null as number | null,
    fifth_raid_day: null as number | null,
    reset_date: getDefaultResetDate(),
    decimal_places: 2,

    // Attendance Settings
    attendance_type: 'linear' as 'linear' | 'breakpoint' | 'points-per-raid',
    rolling_attendance_weeks: 8,  // 8 weeks provides better data than 4
    use_signups: false,  // Most guilds don't use formal signup systems
    signup_weight: 0.25,

    // Attendance Bonus Tiers
    max_attendance_bonus: 4.0,
    max_attendance_threshold: 0.9,
    middle_attendance_bonus: 2.0,
    middle_attendance_threshold: 0.5,
    bottom_attendance_bonus: 1.0,
    bottom_attendance_threshold: 0.25,

    // Minimum Raids
    minimum_raid_days_enabled: true,
    minimum_raid_days: 2,

    // New Member Policy
    new_member_mode: 'raw' as 'raw' | 'fair' | 'minimum_gate',

    // Late/Early Penalty
    late_early_penalty_enabled: true,
    late_early_penalty_value: 0.25,

    // Rank, Role, Class Bonuses - all OFF by default for simpler out-of-box experience
    guild_rank_bonuses_enabled: false,
    number_of_ranks: 5,
    rank_modifiers: {} as Record<string, number>,
    role_bonus_priority_single_item: false,
    class_bonus_priority_single_item: false,
    raid_roles_overall_bonus_priority: false,
    role_modifiers: {} as Record<string, number>,
    single_raider_overall_bonus: false,
    single_raider_bonus_single_item: false,

    // Donation Settings
    donation_bonuses_enabled: false,
    donation_cap_enabled: false,
    donation_bonus_type: 'rolling' as 'permanent' | 'rolling' | 'hard-reset',

    // Trial System Settings
    trial_penalty_enabled: false,
    trial_penalty_value: -2.0,
    trial_auto_promote_enabled: false,
    trial_auto_promote_weeks: 4,
    new_members_start_as_trial: false,

    // BLP (Bad Luck Protection) Settings
    blp_enabled: false,
    blp_increment: 1.0,
    blp_maximum: 5.0,

    // Loot List Rules
    enforce_slot_restrictions: false
  })

  const [guildRoles, setGuildRoles] = useState<{ name: string; position: number }[]>([
    { name: 'Guild Master', position: 100 },
    { name: 'Officer', position: 50 },
    { name: 'Member', position: 0 }
  ])

  const supabase = createClient()
  const router = useRouter()
  const { activeGuild, activeMember, loading: guildLoading, isOfficer } = useGuildContext()
  const { showNotification } = useNotification()

  // Check if settings have unsaved changes
  const hasSettingsChanges = initialSettings !== null && (
    JSON.stringify(settings) !== JSON.stringify(initialSettings) ||
    JSON.stringify(guildRoles) !== JSON.stringify(initialGuildRoles)
  )

  // Set page title
  useEffect(() => {
    document.title = viewMode === 'items' ? 'LootList+ • Loot Management' : 'LootList+ • Priority List'
  }, [viewMode])

  // Track page view
  useEffect(() => {
    if (activeGuild?.id) trackClientEvent('settings_page_viewed', { guild_id: activeGuild.id })
  }, [activeGuild?.id])

  // Lock body scroll when settings modal is open and capture initial values
  useEffect(() => {
    if (showSettingsModal) {
      document.body.style.overflow = 'hidden'
      // Capture initial settings when modal opens for change detection
      setInitialSettings(JSON.parse(JSON.stringify(settings)))
      setInitialGuildRoles(JSON.parse(JSON.stringify(guildRoles)))
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [showSettingsModal])

  // Debounce search term for better performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm])

  // Reset to page 1 when filters or items per page change
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearchTerm, filterTier, filterSlot, filterClassification, sortField, sortDirection, itemsPerPage])

  useEffect(() => {
    if (!guildLoading) {
      loadData().catch(console.error)
    }
  }, [guildLoading, activeGuild])

  // Refresh Wowhead tooltips after items are loaded AND rendered
  // Uses centralized debounced refresh to prevent excessive API calls
  useEffect(() => {
    if (!loading && lootItems.length > 0) {
      refreshWowheadTooltips(true) // Immediate on initial load
    }
  }, [lootItems, loading])

  const loadSettings = async (guildId: string) => {
    try {
      const response = await fetch(`/api/guild-settings?guild_id=${guildId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.settings) {
          setSettings(prevSettings => ({
            ...prevSettings,
            ...data.settings
          }))

          // Load roles from the guild_roles table (authoritative source)
          const { data: guildRolesData, error: rolesError } = await supabase
            .from('guild_roles')
            .select('name, position')
            .eq('guild_id', guildId)
            .order('position', { ascending: false })

          if (rolesError) {
            console.error('Error loading guild roles:', rolesError)
          }

          const rolesFromGuildRoles = guildRolesData
            ? guildRolesData.map((r: { name: string; position: number }) => ({ name: r.name, position: r.position }))
            : []

          // ONLY use guild_roles table if it has data
          // Otherwise fall back to other sources
          let allRoles: { name: string; position: number }[] = []

          if (rolesFromGuildRoles.length > 0) {
            // Guild roles table is the authoritative source
            allRoles = rolesFromGuildRoles
          } else {
            // Fallback to old sources if guild_roles table is empty
            const rolesFromSettings = data.settings.rank_modifiers
              ? Object.keys(data.settings.rank_modifiers)
              : []

            const { data: membershipData } = await supabase
              .from('character_guild_memberships')
              .select('role')
              .eq('guild_id', guildId)

            const rolesFromDB = membershipData
              ? [...new Set(membershipData.map((d: { role: string }) => d.role))].filter(Boolean) as string[]
              : []

            const uniqueRoleNames = [...new Set([...rolesFromSettings, ...rolesFromDB])]
            // Assign default positions for fallback roles
            allRoles = uniqueRoleNames.map((name: string) => {
              if (name === 'Guild Master') return { name, position: 100 }
              if (name === 'Officer') return { name, position: 50 }
              if (name === 'Member') return { name, position: 0 }
              return { name, position: 25 } // Custom roles
            })
          }

          if (allRoles.length > 0) {
            setGuildRoles(allRoles)

            // Rebuild rank_modifiers to ONLY include current guild roles
            setSettings(prev => {
              const newModifiers: Record<string, number> = {}
              allRoles.forEach(role => {
                // Keep existing value if it exists, otherwise default to 0
                newModifiers[role.name] = prev.rank_modifiers?.[role.name] ?? 0
              })
              return { ...prev, rank_modifiers: newModifiers }
            })
          }
        }
      } else {
        console.error('Failed to load settings:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error loading guild settings:', error)
      showNotification('error', 'Couldn\'t load loot settings. Check your connection and try again.')
    }
  }

  const saveSettings = async () => {
    if (!activeGuild) return

    setSavingSettings(true)
    try {
      // Filter out any fields that the schema cache doesn't recognize yet
      // Only save the core fields that we know exist
      const safeSettings = {
        // General Settings
        raid_days_per_week: settings.raid_days_per_week,
        first_raid_day: settings.first_raid_day,
        second_raid_day: settings.second_raid_day,
        third_raid_day: settings.third_raid_day,
        fourth_raid_day: settings.fourth_raid_day,
        fifth_raid_day: settings.fifth_raid_day,
        reset_date: settings.reset_date,
        decimal_places: settings.decimal_places,

        // Attendance Settings
        attendance_type: settings.attendance_type,
        rolling_attendance_weeks: settings.rolling_attendance_weeks,
        use_signups: settings.use_signups,
        signup_weight: settings.signup_weight,

        // Attendance Bonus Tiers
        max_attendance_bonus: settings.max_attendance_bonus,
        max_attendance_threshold: settings.max_attendance_threshold,
        middle_attendance_bonus: settings.middle_attendance_bonus,
        middle_attendance_threshold: settings.middle_attendance_threshold,
        bottom_attendance_bonus: settings.bottom_attendance_bonus,
        bottom_attendance_threshold: settings.bottom_attendance_threshold,

        // Minimum Raids
        minimum_raid_days_enabled: settings.minimum_raid_days_enabled,
        minimum_raid_days: settings.minimum_raid_days,

        // New Member Policy
        new_member_mode: settings.new_member_mode || 'raw',

        // Late/Early Penalty
        late_early_penalty_enabled: settings.late_early_penalty_enabled,
        late_early_penalty_value: settings.late_early_penalty_value,

        // Rank Bonuses
        guild_rank_bonuses_enabled: settings.guild_rank_bonuses_enabled,
        rank_modifiers: settings.rank_modifiers,

        // Role/Class Bonuses
        role_bonus_priority_single_item: settings.role_bonus_priority_single_item,
        class_bonus_priority_single_item: settings.class_bonus_priority_single_item,
        raid_roles_overall_bonus_priority: settings.raid_roles_overall_bonus_priority,
        role_modifiers: settings.role_modifiers,
        single_raider_overall_bonus: settings.single_raider_overall_bonus,
        single_raider_bonus_single_item: settings.single_raider_bonus_single_item,

        // Donation Settings
        donation_bonuses_enabled: settings.donation_bonuses_enabled,
        donation_cap_enabled: settings.donation_cap_enabled,
        donation_bonus_type: settings.donation_bonus_type,
        number_of_ranks: settings.number_of_ranks,

        // Trial System Settings
        trial_penalty_enabled: settings.trial_penalty_enabled,
        trial_penalty_value: settings.trial_penalty_value,
        trial_auto_promote_enabled: settings.trial_auto_promote_enabled,
        trial_auto_promote_weeks: settings.trial_auto_promote_weeks,
        new_members_start_as_trial: settings.new_members_start_as_trial,

        // BLP (Bad Luck Protection) Settings
        blp_enabled: settings.blp_enabled,
        blp_increment: settings.blp_increment,
        blp_maximum: settings.blp_maximum,

        // Loot List Rules
        enforce_slot_restrictions: settings.enforce_slot_restrictions
      }

      const response = await fetch('/api/guild-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          guild_id: activeGuild.id,
          settings: safeSettings
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('API Error:', errorData)
        throw new Error(errorData.error || 'Couldn\'t save settings. Try again.')
      }

      setShowSettingsModal(false)
      showNotification('success', 'Settings saved')
    } catch (error: any) {
      console.error('Error saving settings:', error)
      showNotification('error', error.message || 'Couldn\'t save settings. Try again.')
    } finally {
      setSavingSettings(false)
    }
  }

  const loadData = async () => {
    // Ensure guild context has fully loaded
    if (guildLoading) {
      return
    }

    // Check if officer using context
    if (!isOfficer) {
      router.push('/overview')
      return
    }

    if (!activeGuild || !activeMember) {
      setLoading(false)
      return
    }

    try {
      setMember(activeMember)

      // Load guild settings (which also loads guild roles)
      await loadSettings(activeGuild.id)

      // Load all WoW classes
      const { data: classesData } = await supabase
        .from('wow_classes')
        .select('*')
        .order('name')

      if (classesData) {
        setClasses(classesData)
      }

      // Load all class specs with class information
      const { data: specsData } = await supabase
        .from('class_specs')
        .select(`
          id,
          name,
          class_id,
          wow_classes!inner(name)
        `)
        .order('name')

      if (specsData) {
        // Transform specs to include combined name for role mapping
        const transformedSpecs = specsData.map((spec: any) => {
          // The wow_classes join returns an object or array
          const className = Array.isArray(spec.wow_classes)
            ? spec.wow_classes[0]?.name
            : spec.wow_classes?.name

          return {
            ...spec,
            class_name: className,
            // Create combined name like "Holy Paladin" to match spec-role-mapping
            combined_name: spec.name === className
              ? spec.name // Hunter, Mage, Warlock, Rogue
              : `${spec.name} ${className}` // "Holy Paladin", "Protection Warrior"
          }
        })
        setClassSpecs(transformedSpecs as any)
      }

      // Load expansion name and filter classes not available in this expansion
      if (activeGuild.active_expansion_id) {
        const { data: expansionData } = await supabase
          .from('expansions')
          .select('name')
          .eq('id', activeGuild.active_expansion_id)
          .single()

        if (expansionData) {
          const excluded = EXPANSION_CLASS_EXCLUSIONS[expansionData.name] || []
          if (excluded.length > 0) {
            setClasses(prev => prev.filter(c => !excluded.includes(c.name)))
            setClassSpecs(prev => prev.filter((s: any) => !excluded.includes(s.class_name)))
          }
        }

      // Load raid tiers for filtering (only for active expansion)
        const { data: tiersData } = await supabase
          .from('raid_tiers')
          .select('id, name')
          .eq('expansion_id', activeGuild.active_expansion_id)
          .eq('is_guild_active', true)

        if (tiersData) {
          // Sort by progression order
          const sortedTiers = tiersData.sort((a: { name: string }, b: { name: string }) =>
            getRaidTierOrder(a.name) - getRaidTierOrder(b.name)
          )
          setRaidTiers(sortedTiers)
        }

        // Load all loot items
        await loadLootItems(activeGuild.active_expansion_id)
      }
    } catch (error) {
      console.error('Error loading loot settings data:', error)
      setError("Couldn't load loot settings. Check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  const loadLootItems = async (expansionId: string) => {
    // Get raid tiers for active expansion (only guild-active tiers)
    const { data: tiersData } = await supabase
      .from('raid_tiers')
      .select('id')
      .eq('expansion_id', expansionId)
      .eq('is_guild_active', true)

    if (!tiersData || tiersData.length === 0) return

    const tierIds = tiersData.map((t: any) => t.id)

    // Load loot items
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
        is_loot_council,
        roles,
        officer_notes,
        raid_tier:raid_tiers(name)
      `)
      .in('raid_tier_id', tierIds)
      .order('name')

    if (itemsData) {
      setLootItems(itemsData as any)

      // Initialize item roles state
      const rolesState: Record<string, Set<string>> = {}
      itemsData.forEach((item: any) => {
        rolesState[item.id] = new Set(item.roles || [])
      })
      setItemRoles(rolesState)

      // Initialize item notes state
      const notesState: Record<string, string> = {}
      itemsData.forEach((item: any) => {
        notesState[item.id] = item.officer_notes || ''
      })
      setItemNotes(notesState)

      // Load all spec relations for all items (batch to avoid URL length issues)
      const itemIds = itemsData.map((item: any) => item.id)
      const specs: Record<string, { primary: Set<string>, secondary: Set<string> }> = {}

      // Initialize all items with empty spec sets
      itemIds.forEach((id: string) => {
        specs[id] = { primary: new Set(), secondary: new Set() }
      })

      // Batch load specs in chunks of 100 to avoid URL length issues
      const batchSize = 100
      let totalRelations = 0

      for (let i = 0; i < itemIds.length; i += batchSize) {
        const batchIds = itemIds.slice(i, i + batchSize)

        const { data: specRelations, error: specError } = await supabase
          .from('loot_item_classes')
          .select('loot_item_id, spec_id, spec_type')
          .in('loot_item_id', batchIds)

        if (specError) {
          console.error('Error loading spec relations for batch:', specError)
          continue
        }

        if (specRelations) {
          totalRelations += specRelations.length
          specRelations.forEach((rel: any) => {
            if (rel.spec_id && rel.loot_item_id) {
              if (rel.spec_type === 'primary') {
                specs[rel.loot_item_id].primary.add(rel.spec_id)
              } else if (rel.spec_type === 'secondary') {
                specs[rel.loot_item_id].secondary.add(rel.spec_id)
              }
            }
          })
        }
      }

      setItemSpecs(specs)
    }
  }

  const toggleLootCouncil = async (itemId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('loot_items')
      .update({ is_loot_council: !currentStatus })
      .eq('id', itemId)

    if (error) {
      showNotification('error', 'Failed to update. Try again.')
      return
    }

    setLootItems(items => items.map(item =>
      item.id === itemId ? { ...item, is_loot_council: !currentStatus } : item
    ))
    showNotification('success', `Item ${!currentStatus ? 'marked as' : 'removed from'} Loot Council`)
  }

  const toggleAvailability = async (itemId: string, currentStatus: boolean) => {
    const { data, error } = await supabase
      .from('loot_items')
      .update({ is_available: !currentStatus })
      .eq('id', itemId)
      .select()

    if (error) {
      console.error('Error toggling availability:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      showNotification('error', error.message || 'Couldn\'t update availability. Try again.')
      return
    }

    setLootItems(items => items.map(item =>
      item.id === itemId ? { ...item, is_available: !currentStatus } : item
    ))
  }

  const updateClassification = async (itemId: string, classification: string) => {
    const allocationCost = (classification === 'Reserved' || classification === 'Limited') ? 1 : 0

    const { data, error } = await supabase
      .from('loot_items')
      .update({
        classification,
        allocation_cost: allocationCost
      })
      .eq('id', itemId)
      .select()

    if (error) {
      console.error('Error updating classification:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      showNotification('error', error.message || 'Couldn\'t update classification. Try again.')
      return
    }

    setLootItems(items => items.map(item =>
      item.id === itemId ? { ...item, classification, allocation_cost: allocationCost } : item
    ))
  }

  // Update officer notes for an item
  const updateNotes = async (itemId: string, notes: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from('loot_items')
      .update({ officer_notes: notes || null })
      .eq('id', itemId)
      .select('id, officer_notes')

    if (error) {
      console.error('Error updating notes:', error)
      showNotification('error', 'Couldn\'t save notes. Try again.')
      return false
    }

    // Check if the update actually worked (RLS might silently block it)
    if (!data || data.length === 0) {
      console.error('Notes update failed - no rows updated (RLS may have blocked it)')
      showNotification('error', 'You don\'t have permission to edit notes.')
      return false
    }

    setItemNotes(prev => ({ ...prev, [itemId]: notes }))
    setLootItems(items => items.map(item =>
      item.id === itemId ? { ...item, officer_notes: notes || undefined } : item
    ))
    showNotification('success', 'Note saved')
    return true
  }

  // Add a spec to an item (immediately saves to database)
  const addSpec = async (itemId: string, specIdOrRole: string, specType: 'primary' | 'secondary') => {
    // Check if this is "all" selection
    if (specIdOrRole === 'all') {
      await addAllSpecs(itemId, specType)
      return
    }

    // Check if this is a role selection (starts with 'role:')
    if (specIdOrRole.startsWith('role:')) {
      const role = specIdOrRole.replace('role:', '') as 'tank' | 'healer' | 'physical' | 'caster'
      await addRoleSpecs(itemId, role, specType)
      return
    }

    const spec = classSpecs.find(s => s.id === specIdOrRole)
    if (!spec) return

    // Check if spec already exists in local state
    const currentSpecs = itemSpecs[itemId] || { primary: new Set(), secondary: new Set() }
    if (currentSpecs[specType].has(specIdOrRole)) {
      return
    }

    // Check if it exists in database (to prevent race conditions)
    const { data: existing } = await supabase
      .from('loot_item_classes')
      .select('id')
      .eq('loot_item_id', itemId)
      .eq('spec_id', specIdOrRole)
      .eq('spec_type', specType)
      .maybeSingle()

    if (existing) {
      // Already exists in database, just update local state
      setItemSpecs(prev => {
        const prevItemSpecs = prev[itemId] || { primary: new Set(), secondary: new Set() }
        const updatedSpecs = new Set(prevItemSpecs[specType])
        updatedSpecs.add(specIdOrRole)

        return {
          ...prev,
          [itemId]: {
            ...prevItemSpecs,
            [specType]: updatedSpecs
          }
        }
      })
      return
    }

    // Check if spec is in opposite type - if so, skip (preserve existing selection)
    const oppositeType = specType === 'primary' ? 'secondary' : 'primary'
    if (currentSpecs[oppositeType].has(specIdOrRole)) {
      // Spec already exists in opposite type, don't add it here
      return
    }

    // Insert into database
    const { error } = await supabase
      .from('loot_item_classes')
      .insert({
        loot_item_id: itemId,
        class_id: spec.class_id,
        spec_id: specIdOrRole,
        spec_type: specType
      })

    if (error) {
      console.error('Error adding spec:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      showNotification('error', error.message || 'Couldn\'t add spec. Try again.')
      return
    }

    // Update local state
    setItemSpecs(prev => {
      const prevItemSpecs = prev[itemId] || { primary: new Set(), secondary: new Set() }
      const updatedSpecs = new Set(prevItemSpecs[specType])
      updatedSpecs.add(specIdOrRole)

      return {
        ...prev,
        [itemId]: {
          ...prevItemSpecs,
          [specType]: updatedSpecs
        }
      }
    })
  }

  // Add all specs of a role to an item
  const addRoleSpecs = async (itemId: string, role: 'tank' | 'healer' | 'physical' | 'caster', specType: 'primary' | 'secondary') => {
    const { getSpecsForRole } = await import('@/domain/loot/spec-role-mapping')
    const roleSpecNames = getSpecsForRole(role)

    // Find the spec IDs that match these spec names (using combined_name)
    const specsToAdd = classSpecs.filter(spec =>
      roleSpecNames.includes(spec.combined_name || spec.name)
    )

    // Get current specs to avoid duplicates
    const currentSpecs = itemSpecs[itemId]?.[specType] || new Set()

    // Check opposite type - skip specs that are already in opposite type
    const oppositeType = specType === 'primary' ? 'secondary' : 'primary'
    const oppositeSpecs = itemSpecs[itemId]?.[oppositeType] || new Set()

    // Filter out specs that are in the opposite type (preserve existing selections)
    const specsNotInOpposite = specsToAdd.filter(spec => !oppositeSpecs.has(spec.id))

    // Only insert specs that aren't already in this type or opposite type
    const specsToInsert = specsNotInOpposite
      .filter(spec => !currentSpecs.has(spec.id))
      .map(spec => ({
        loot_item_id: itemId,
        class_id: spec.class_id,
        spec_id: spec.id,
        spec_type: specType
      }))

    // Batch insert new specs (with ignoreDuplicates to handle race conditions)
    if (specsToInsert.length > 0) {
      const { error } = await supabase
        .from('loot_item_classes')
        .insert(specsToInsert)

      if (error) {
        // Check if it's a duplicate key error (code 23505)
        if (error.code !== '23505') {
          console.error(`Error adding role ${role} specs:`, {
            message: error.message,
            details: error.details,
            code: error.code
          })
        }
        // If it's a duplicate, we'll just update the state below
      }
    }

    // Update local state - add role specs that aren't in opposite type
    const roleSpecIdsToAdd = new Set(specsNotInOpposite.map(s => s.id))

    setItemSpecs(prev => {
      const prevItemSpecs = prev[itemId] || { primary: new Set(), secondary: new Set() }
      const updatedSpecs = new Set(prevItemSpecs[specType])
      roleSpecIdsToAdd.forEach(id => updatedSpecs.add(id))

      return {
        ...prev,
        [itemId]: {
          ...prevItemSpecs,
          [specType]: updatedSpecs
        }
      }
    })
  }

  // Add all specs to an item
  const addAllSpecs = async (itemId: string, specType: 'primary' | 'secondary') => {
    // Get current specs
    const currentSpecs = itemSpecs[itemId]?.[specType] || new Set()
    const oppositeType = specType === 'primary' ? 'secondary' : 'primary'
    const oppositeSpecs = itemSpecs[itemId]?.[oppositeType] || new Set()

    // When adding "all" to a type, we add all specs EXCEPT those in the opposite type
    // This preserves the user's opposite type selections
    const allSpecIds = new Set(classSpecs.map(s => s.id))
    const specsToAddIds = new Set<string>()
    allSpecIds.forEach(id => {
      if (!oppositeSpecs.has(id)) {
        specsToAddIds.add(id)
      }
    })

    // Only insert specs that aren't already in this type
    const specsToInsert = classSpecs
      .filter(spec => specsToAddIds.has(spec.id) && !currentSpecs.has(spec.id))
      .map(spec => ({
        loot_item_id: itemId,
        class_id: spec.class_id,
        spec_id: spec.id,
        spec_type: specType
      }))

    // Batch insert all new specs
    if (specsToInsert.length > 0) {
      const { error } = await supabase
        .from('loot_item_classes')
        .insert(specsToInsert)

      if (error) {
        // Ignore duplicate key errors
        if (error.code !== '23505') {
          console.error('Error adding all specs:', {
            message: error.message,
            details: error.details,
            code: error.code
          })
        }
      }
    }

    // Update local state - add all specs to this type except those in opposite type
    setItemSpecs(prev => {
      const prevItemSpecs = prev[itemId] || { primary: new Set(), secondary: new Set() }
      return {
        ...prev,
        [itemId]: {
          ...prevItemSpecs,
          [specType]: specsToAddIds
        }
      }
    })
  }

  // Remove a spec from an item (immediately deletes from database)
  const removeSpec = async (itemId: string, specIdOrRole: string, specType: 'primary' | 'secondary') => {
    // Check if this is "all" selection
    if (specIdOrRole === 'all') {
      await removeAllSpecs(itemId, specType)
      return
    }

    // Check if this is a role selection (starts with 'role:')
    if (specIdOrRole.startsWith('role:')) {
      const role = specIdOrRole.replace('role:', '') as 'tank' | 'healer' | 'physical' | 'caster'
      await removeRoleSpecs(itemId, role, specType)
      return
    }

    // Delete from database
    const { error } = await supabase
      .from('loot_item_classes')
      .delete()
      .eq('loot_item_id', itemId)
      .eq('spec_id', specIdOrRole)
      .eq('spec_type', specType)

    if (error) {
      console.error('Error removing spec:', {
        message: error.message,
        details: error.details,
        code: error.code
      })
      showNotification('error', error.message || 'Couldn\'t remove spec. Try again.')
      return
    }

    // Update local state
    setItemSpecs(prev => {
      const prevItemSpecs = prev[itemId] || { primary: new Set(), secondary: new Set() }
      const newSpecs = new Set(prevItemSpecs[specType])
      newSpecs.delete(specIdOrRole)
      return {
        ...prev,
        [itemId]: {
          ...prevItemSpecs,
          [specType]: newSpecs
        }
      }
    })
  }

  // Remove all specs of a role from an item
  const removeRoleSpecs = async (itemId: string, role: 'tank' | 'healer' | 'physical' | 'caster', specType: 'primary' | 'secondary') => {
    const { getSpecsForRole } = await import('@/domain/loot/spec-role-mapping')
    const roleSpecNames = getSpecsForRole(role)

    // Find the spec IDs that match these spec names
    const specsToRemove = classSpecs.filter(spec =>
      roleSpecNames.includes(spec.combined_name || spec.name)
    )

    // Get current specs for this item/type
    const currentSpecs = itemSpecs[itemId]?.[specType] || new Set()

    // Only remove specs that are currently selected
    const specIdsToRemove = specsToRemove
      .map(spec => spec.id)
      .filter(specId => currentSpecs.has(specId))

    if (specIdsToRemove.length === 0) return

    // Batch delete from database
    const { error } = await supabase
      .from('loot_item_classes')
      .delete()
      .eq('loot_item_id', itemId)
      .eq('spec_type', specType)
      .in('spec_id', specIdsToRemove)

    if (error) {
      console.error(`Error removing role ${role} specs:`, {
        message: error.message,
        details: error.details,
        code: error.code
      })
      return
    }

    // Update local state - remove the specs
    setItemSpecs(prev => {
      const prevItemSpecs = prev[itemId] || { primary: new Set(), secondary: new Set() }
      const newSpecs = new Set(prevItemSpecs[specType])
      specIdsToRemove.forEach(specId => newSpecs.delete(specId))

      return {
        ...prev,
        [itemId]: {
          ...prevItemSpecs,
          [specType]: newSpecs
        }
      }
    })
  }

  // Remove all specs of a type from an item (batch delete)
  const removeAllSpecs = async (itemId: string, specType: 'primary' | 'secondary') => {
    // Batch delete from database
    const { error } = await supabase
      .from('loot_item_classes')
      .delete()
      .eq('loot_item_id', itemId)
      .eq('spec_type', specType)

    if (!error) {
      // Update local state - clear all specs of this type
      setItemSpecs(prev => {
        const prevItemSpecs = prev[itemId] || { primary: new Set(), secondary: new Set() }
        return {
          ...prev,
          [itemId]: {
            ...prevItemSpecs,
            [specType]: new Set()
          }
        }
      })
    } else {
      console.error('Error removing all specs:', {
        message: error.message,
        details: error.details,
        code: error.code
      })
    }
  }

  // Toggle a role for an item (immediately updates database)
  const toggleRole = async (itemId: string, role: string) => {
    const currentRoles = itemRoles[itemId] || new Set()
    const newRoles = new Set(currentRoles)

    if (newRoles.has(role)) {
      newRoles.delete(role)
    } else {
      newRoles.add(role)
    }

    // Update database
    const { error } = await supabase
      .from('loot_items')
      .update({ roles: Array.from(newRoles) })
      .eq('id', itemId)

    if (!error) {
      // Update local state
      setItemRoles(prev => ({
        ...prev,
        [itemId]: newRoles
      }))
    } else {
      console.error('Error updating roles:', error)
    }
  }

  // Get role group specs - returns spec IDs for each role - MEMOIZED
  const getRoleGroupSpecs = useMemo(() => {
    const { getSpecsForRole } = require('@/domain/loot/spec-role-mapping')

    const roles = ['tank', 'healer', 'physical', 'caster'] as const
    const roleGroups: Record<string, Set<string>> = {}

    roles.forEach(role => {
      const roleSpecNames = getSpecsForRole(role)
      const specIds = classSpecs
        .filter(spec => roleSpecNames.includes(spec.combined_name || spec.name))
        .map(spec => spec.id)
      roleGroups[role] = new Set(specIds)
    })

    return roleGroups
  }, [classSpecs])

  // Get all available specs as "Class Spec" options for dropdown - MEMOIZED
  const classSpecOptions = useMemo(() => {
    return classSpecs
      .map(spec => {
        const wowClass = classes.find(c => c.id === spec.class_id)

        // If class name equals spec name, just show class name
        const label = wowClass?.name === spec.name
          ? wowClass.name
          : `${wowClass?.name} ${spec.name}`

        return {
          id: spec.id,
          label,
          classColor: wowClass?.color_hex || '#888888'
        }
      })
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [classSpecs, classes])

  // Get display name for a spec (e.g., "Paladin Holy" or just "Hunter" for single-spec classes)
  const getSpecName = useCallback((specId: string) => {
    const spec = classSpecs.find(s => s.id === specId)
    if (!spec) return ''

    // Use combined_name if available (includes class name)
    if (spec.combined_name) {
      return spec.combined_name
    }

    // Fallback to old logic if combined_name not available
    const wowClass = classes.find(c => c.id === spec.class_id)
    if (wowClass?.name === spec.name) {
      return wowClass.name
    }
    return `${wowClass?.name} ${spec.name}`
  }, [classSpecs, classes])

  // Get color for a spec (from class color)
  const getSpecColor = useCallback((specId: string) => {
    // Role groups and 'all' don't have colors
    if (specId.startsWith('role:') || specId === 'all') {
      return undefined
    }

    const spec = classSpecs.find(s => s.id === specId)
    if (!spec) return undefined
    const wowClass = classes.find(c => c.id === spec.class_id)
    return wowClass?.color_hex || undefined
  }, [classSpecs, classes])

  // Get consolidated display for selected specs (consolidates role groups)
  const getConsolidatedSpecNames = useCallback((selectedIds: Set<string>) => {
    const remainingIds = new Set(selectedIds)
    const displayItems: Array<{ name: string, color?: string }> = []

    // Check each role to see if all specs are selected
    const roleLabels: Record<string, string> = {
      'tank': 'All tanks',
      'healer': 'All healers',
      'physical': 'All physical DPS',
      'caster': 'All caster DPS'
    }

    Object.entries(getRoleGroupSpecs).forEach(([role, roleSpecIds]) => {
      const allRoleSpecsSelected = Array.from(roleSpecIds).every(specId => selectedIds.has(specId))

      if (allRoleSpecsSelected && roleSpecIds.size > 0) {
        displayItems.push({ name: roleLabels[role] })
        // Remove these specs from the remaining list
        roleSpecIds.forEach(specId => remainingIds.delete(specId))
      }
    })

    // Add remaining individual specs
    remainingIds.forEach(specId => {
      displayItems.push({
        name: getSpecName(specId),
        color: getSpecColor(specId)
      })
    })

    return displayItems
  }, [getRoleGroupSpecs, getSpecName, getSpecColor])

  // Check if a role group checkbox should be checked
  const isRoleGroupSelected = useCallback((roleId: string, selectedIds: Set<string>) => {
    if (roleId === 'all') {
      // Check if all specs are selected
      return selectedIds.size === classSpecs.length && classSpecs.length > 0
    }

    if (roleId.startsWith('role:')) {
      const role = roleId.replace('role:', '')
      const roleSpecIds = getRoleGroupSpecs[role]

      if (!roleSpecIds || roleSpecIds.size === 0) return false

      // Check if all specs of this role are selected
      return Array.from(roleSpecIds).every(specId => selectedIds.has(specId))
    }

    // Regular spec - just check if it's in the set
    return selectedIds.has(roleId)
  }, [classSpecs, getRoleGroupSpecs])

  // Get unique slots for filter dropdown
  const uniqueSlots = useMemo(() => {
    const slots = [...new Set(lootItems.map(item => item.item_slot).filter(Boolean))]
    return slots.sort()
  }, [lootItems])

  // Memoize filtered items to prevent unnecessary recalculations
  const filteredItems = useMemo(() => {
    let items = lootItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                           item.boss_name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      const matchesTier = filterTier === 'all' || (item.raid_tier as any)?.name === filterTier
      const matchesSlot = filterSlot === 'all' || item.item_slot === filterSlot
      const matchesClassification = filterClassification === 'all' || item.classification === filterClassification
      return matchesSearch && matchesTier && matchesSlot && matchesClassification
    })

    // Apply sorting if a sort field is selected
    if (sortField) {
      items = [...items].sort((a, b) => {
        let aValue: string
        let bValue: string

        switch (sortField) {
          case 'name':
            aValue = a.name.toLowerCase()
            bValue = b.name.toLowerCase()
            break
          case 'boss':
            aValue = a.boss_name.toLowerCase()
            bValue = b.boss_name.toLowerCase()
            break
          case 'slot':
            aValue = (a.item_slot || '').toLowerCase()
            bValue = (b.item_slot || '').toLowerCase()
            break
          case 'raid':
            aValue = ((a.raid_tier as any)?.name || '').toLowerCase()
            bValue = ((b.raid_tier as any)?.name || '').toLowerCase()
            break
          case 'classification':
            aValue = a.classification.toLowerCase()
            bValue = b.classification.toLowerCase()
            break
          default:
            return 0
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
        return 0
      })
    }

    return items
  }, [lootItems, debouncedSearchTerm, filterTier, filterSlot, filterClassification, sortField, sortDirection])

  // Pagination calculations
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedItems = useMemo(() => {
    return filteredItems.slice(startIndex, endIndex)
  }, [filteredItems, startIndex, endIndex])

  if (loading) {
    return <LootSettingsPageSkeleton />
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 font-poppins">
        <div>
          <Heading level={1}>Loot Management</Heading>
          <p className="text-muted-foreground mt-1 text-base">Manage loot items and configure classifications</p>
        </div>
        <ErrorState
          message={error}
          onRetry={() => window.location.reload()}
          size="lg"
          variant="card"
        />
      </div>
    )
  }

  return (
    <ExpansionGuard>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 font-poppins">
        {/* Header with Tabs and Settings Button */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <Heading level={1}>Loot Management</Heading>
            <p className="text-muted-foreground mt-1 text-base">
              {viewMode === 'items' ? 'Manage loot items and configure classifications' : 'Set role, class and individual raider priorities'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Tabs */}
            <SegmentedControl
              options={[
                { value: 'items', label: 'Items' },
                { value: 'priorities', label: 'Priorities' }
              ]}
              value={viewMode}
              onChange={setViewMode}
            />

            {/* Import Button */}
            <Link href="/admin/sheet-import">
              <Button variant="outline">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Import from spreadsheet
              </Button>
            </Link>

            {/* Settings Button */}
            <Button
              variant="outline"
              onClick={() => setShowSettingsModal(true)}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Loot system settings
            </Button>
          </div>
        </div>

        {/* Items Tab Content */}
        {viewMode === 'items' && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-background-elevated border border-border rounded-xl p-4">
                <p className="text-foreground-muted text-sm">Total items</p>
                <p className="text-2xl font-bold text-foreground">{filteredItems.length}</p>
              </div>
              <div className="bg-background-elevated border border-border rounded-xl p-4">
                <p className="text-foreground-muted text-sm">Available</p>
                <p className="text-2xl font-bold text-success">
                  {filteredItems.filter(i => i.is_available).length}
                </p>
              </div>
              <div className="bg-background-elevated border border-border rounded-xl p-4">
                <p className="text-foreground-muted text-sm">Reserved</p>
                <p className="text-2xl font-bold text-destructive">
                  {filteredItems.filter(i => i.classification === 'Reserved').length}
                </p>
              </div>
              <div className="bg-background-elevated border border-border rounded-xl p-4">
                <p className="text-foreground-muted text-sm">Limited</p>
                <p className="text-2xl font-bold text-warning">
                  {filteredItems.filter(i => i.classification === 'Limited').length}
                </p>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-background-elevated border border-border rounded-xl p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <div>
                  <Label size="sm" className="block text-foreground-muted mb-2">Search items</Label>
                  <div className="relative">
                    <Input
                      variant="pill"
                      size="sm"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search by name or boss..."
                      className="bg-background-elevated pr-8"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Clear search"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <Label size="sm" className="block text-foreground-muted mb-2">Raid</Label>
                  <Select
                    variant="pill"
                    size="sm"
                    value={filterTier}
                    onChange={(e) => setFilterTier(e.target.value)}
                    className="bg-background-elevated"
                  >
                    <option value="all" className="bg-background-elevated text-foreground">All raids</option>
                    {raidTiers.map(tier => (
                      <option key={tier.id} value={tier.name} className="bg-background-elevated text-foreground">{tier.name}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label size="sm" className="block text-foreground-muted mb-2">Slot</Label>
                  <Select
                    variant="pill"
                    size="sm"
                    value={filterSlot}
                    onChange={(e) => setFilterSlot(e.target.value)}
                    className="bg-background-elevated"
                  >
                    <option value="all" className="bg-background-elevated text-foreground">All slots</option>
                    {uniqueSlots.map(slot => (
                      <option key={slot} value={slot} className="bg-background-elevated text-foreground">{slot}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label size="sm" className="block text-foreground-muted mb-2">Classification</Label>
                  <Select
                    variant="pill"
                    size="sm"
                    value={filterClassification}
                    onChange={(e) => setFilterClassification(e.target.value)}
                    className="bg-background-elevated"
                  >
                    <option value="all" className="bg-background-elevated text-foreground">All classifications</option>
                    <option value="Reserved" className="bg-background-elevated" style={{ color: '#E57373' }}>Reserved</option>
                    <option value="Limited" className="bg-background-elevated" style={{ color: '#64B5F6' }}>Limited</option>
                    <option value="Unlimited" className="bg-background-elevated" style={{ color: '#B0B0B0' }}>Unlimited</option>
                  </Select>
                </div>
                <div>
                  <Label size="sm" className="block text-foreground-muted mb-2">Sort by</Label>
                  <Select
                    variant="pill"
                    size="sm"
                    value={sortField || ''}
                    onChange={(e) => setSortField(e.target.value as any || null)}
                    className="bg-background-elevated"
                  >
                    <option value="" className="bg-background-elevated text-foreground">Default</option>
                    <option value="name" className="bg-background-elevated text-foreground">Item name</option>
                    <option value="boss" className="bg-background-elevated text-foreground">Boss</option>
                    <option value="slot" className="bg-background-elevated text-foreground">Slot</option>
                    <option value="raid" className="bg-background-elevated text-foreground">Raid</option>
                    <option value="classification" className="bg-background-elevated text-foreground">Classification</option>
                  </Select>
                </div>
                <div>
                  <Label size="sm" className="block text-foreground-muted mb-2">Order</Label>
                  <Select
                    variant="pill"
                    size="sm"
                    value={sortDirection}
                    onChange={(e) => setSortDirection(e.target.value as 'asc' | 'desc')}
                    disabled={!sortField}
                    className="bg-background-elevated"
                  >
                    <option value="asc" className="bg-background-elevated text-foreground">A → Z</option>
                    <option value="desc" className="bg-background-elevated text-foreground">Z → A</option>
                  </Select>
                </div>
              </div>
            </div>

        {/* Items Table */}
        <div className="bg-background-elevated border border-border rounded-xl overflow-hidden">
          <div ref={tableContainerRef} className="-mx-4 sm:mx-0 overflow-x-auto max-h-[calc(100vh-200px)] overflow-y-auto">
            <table className="w-full table-fixed" style={{ minWidth: '1100px' }}>
              <colgroup>
                <col className="w-[44px]" />
                <col className="w-[40px]" />
                <col className="w-[14%]" />
                <col className="w-[9%]" />
                <col className="w-[6%]" />
                <col className="w-[8%]" />
                <col className="w-[13%]" />
                <col className="w-[18%]" />
                <col className="w-[17%]" />
                <col className="w-[44px]" />
              </colgroup>
              <thead className="sticky top-14 sm:top-0 z-10">
                <tr className="bg-background-subtle border-b border-border">
                  <th className="px-4 py-2.5 text-left text-[12px] font-medium text-foreground-muted bg-background-subtle">On</th>
                  <th className="px-2 py-2.5 text-center text-[12px] font-medium text-foreground-muted bg-background-subtle"><span className="inline-flex items-center gap-1">LC <InfoTooltip content="Loot Council. When enabled, officers decide the winner instead of using Loot Score. Use for progression-critical items." iconSize={11} /></span></th>
                  <th className="px-4 py-2.5 text-left text-[12px] font-medium text-foreground-muted bg-background-subtle">Item name</th>
                  <th className="px-4 py-2.5 text-left text-[12px] font-medium text-foreground-muted bg-background-subtle">Boss</th>
                  <th className="px-4 py-2.5 text-left text-[12px] font-medium text-foreground-muted bg-background-subtle">Slot</th>
                  <th className="px-4 py-2.5 text-left text-[12px] font-medium text-foreground-muted bg-background-subtle">Raid</th>
                  <th className="px-4 py-2.5 text-left text-[12px] font-medium text-foreground-muted bg-background-subtle whitespace-nowrap"><span className="inline-flex items-center gap-1">Classification <InfoTooltip content="Item demand tier. Reserved and Limited cost 1 allocation point each. Unlimited costs 0 points." iconSize={11} /></span></th>
                  <th className="px-4 py-2.5 text-left text-[12px] font-medium text-foreground-muted bg-background-subtle">Primary</th>
                  <th className="px-4 py-2.5 text-left text-[12px] font-medium text-foreground-muted bg-background-subtle">Secondary</th>
                  <th className="px-2 py-2.5 text-center text-[12px] font-medium text-foreground-muted sm:static sticky right-0 z-20 bg-background-subtle shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.3)] sm:shadow-none">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/50">
                    <td className="px-4 py-2.5">
                      <Checkbox
                        size="sm"
                        checked={item.is_available}
                        onCheckedChange={() => toggleAvailability(item.id, item.is_available)}
                        aria-label={`Toggle availability for ${item.name}`}
                      />
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      <Checkbox
                        size="sm"
                        variant="accent"
                        checked={item.is_loot_council ?? false}
                        onCheckedChange={() => toggleLootCouncil(item.id, item.is_loot_council ?? false)}
                        disabled={!item.is_available}
                        aria-label={`Toggle Loot Council for ${item.name}`}
                      />
                    </td>
                    <td className="px-4 py-2.5 text-[13px] text-foreground">
                      <div className="truncate overflow-hidden">
                        <ItemLink name={item.name} wowheadId={item.wowhead_id} />
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-[12px] text-foreground-muted">
                      <div className="truncate">{item.boss_name}</div>
                    </td>
                    <td className="px-4 py-2.5 text-[12px] text-foreground-muted">
                      <div className="truncate">{item.item_slot}</div>
                    </td>
                    <td className="px-4 py-2.5 text-[12px] text-foreground-muted">
                      <div className="truncate">{(item.raid_tier as any)?.name}</div>
                    </td>
                    <td className="px-2 py-2.5">
                      <Select
                        variant="pill"
                        size="sm"
                        value={item.classification}
                        onChange={(e) => updateClassification(item.id, e.target.value)}
                        className="bg-background-elevated font-medium"
                        style={{
                          color: item.classification === 'Reserved' ? '#E57373' :
                                 item.classification === 'Limited' ? '#64B5F6' :
                                 item.classification === 'Unlimited' ? '#B0B0B0' :
                                 '#ffffff'
                        }}
                      >
                        <option value="Reserved" className="bg-background-elevated" style={{ color: '#E57373' }}>Reserved</option>
                        <option value="Limited" className="bg-background-elevated" style={{ color: '#64B5F6' }}>Limited</option>
                        <option value="Unlimited" className="bg-background-elevated" style={{ color: '#B0B0B0' }}>Unlimited</option>
                      </Select>
                    </td>
                    <td className="px-2 py-2.5">
                      <MultiSelectDropdown
                        placeholder="Primary"
                        selectedIds={itemSpecs[item.id]?.primary || new Set()}
                        options={[]}
                        optionGroups={[
                          {
                            label: '',
                            options: [
                              { id: 'all', label: 'All specs/roles', isRoleGroup: true },
                              { id: 'role:tank', label: 'All tanks', isRoleGroup: true },
                              { id: 'role:healer', label: 'All healers', isRoleGroup: true },
                              { id: 'role:physical', label: 'All physical DPS', isRoleGroup: true },
                              { id: 'role:caster', label: 'All caster DPS', isRoleGroup: true }
                            ]
                          },
                          {
                            label: 'Individual specs',
                            options: classSpecOptions.map(opt => ({
                              id: opt.id,
                              label: opt.label,
                              disabled: itemSpecs[item.id]?.secondary.has(opt.id)
                            }))
                          }
                        ]}
                        onAdd={(id) => addSpec(item.id, id, 'primary')}
                        onRemove={(id) => removeSpec(item.id, id, 'primary')}
                        onClear={() => removeAllSpecs(item.id, 'primary')}
                        getDisplayName={(id) => getSpecName(id)}
                        getClassColor={(id) => getSpecColor(id)}
                        getConsolidatedDisplay={(ids) => getConsolidatedSpecNames(ids)}
                        isOptionSelected={(optionId, selectedIds) => isRoleGroupSelected(optionId, selectedIds)}
                        variant="primary"
                      />
                    </td>
                    <td className="px-2 py-2.5">
                      <MultiSelectDropdown
                        placeholder="Secondary"
                        selectedIds={itemSpecs[item.id]?.secondary || new Set()}
                        options={[]}
                        optionGroups={[
                          {
                            label: '',
                            options: [
                              { id: 'all', label: 'All specs/roles', isRoleGroup: true },
                              { id: 'role:tank', label: 'All tanks', isRoleGroup: true },
                              { id: 'role:healer', label: 'All healers', isRoleGroup: true },
                              { id: 'role:physical', label: 'All physical DPS', isRoleGroup: true },
                              { id: 'role:caster', label: 'All caster DPS', isRoleGroup: true }
                            ]
                          },
                          {
                            label: 'Individual specs',
                            options: classSpecOptions.map(opt => ({
                              id: opt.id,
                              label: opt.label,
                              disabled: itemSpecs[item.id]?.primary.has(opt.id)
                            }))
                          }
                        ]}
                        onAdd={(id) => addSpec(item.id, id, 'secondary')}
                        onRemove={(id) => removeSpec(item.id, id, 'secondary')}
                        onClear={() => removeAllSpecs(item.id, 'secondary')}
                        getDisplayName={(id) => getSpecName(id)}
                        getClassColor={(id) => getSpecColor(id)}
                        getConsolidatedDisplay={(ids) => getConsolidatedSpecNames(ids)}
                        isOptionSelected={(optionId, selectedIds) => isRoleGroupSelected(optionId, selectedIds)}
                        variant="secondary"
                      />
                    </td>
                    <td className="px-2 py-2.5 text-center sm:static sticky right-0 bg-background-elevated shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.3)] sm:shadow-none">
                      <button
                        onClick={() => {
                          setNotesModalItem(item)
                          setNotesModalValue(itemNotes[item.id] || '')
                        }}
                        title={itemNotes[item.id] || 'Add note'}
                        className={`p-1.5 rounded-md transition-colors ${
                          itemNotes[item.id]
                            ? 'text-accent hover:bg-accent/10'
                            : 'text-foreground-muted hover:text-foreground hover:bg-background-elevated'
                        }`}
                      >
                        <HugeiconsIcon icon={StickyNote01Icon} size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {filteredItems.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 bg-background-subtle border-t border-border">
              {/* Left: Results display */}
              <div className="text-[12px] text-foreground-muted">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredItems.length)} of {filteredItems.length} results
              </div>

              {/* Center: Page navigation */}
              {totalPages > 1 && (
                <div className="flex items-center gap-6">
                  {/* Previous Button */}
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => goToPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </Button>

                  {/* Page Numbers */}
                  <div className="flex items-center gap-2">
                    {(() => {
                      const pageNumbers = []
                      const showEllipsisStart = currentPage > 3
                      const showEllipsisEnd = currentPage < totalPages - 2

                      // Always show first page
                      pageNumbers.push(
                        <Button
                          key={1}
                          variant={currentPage === 1 ? 'accent-subtle' : 'outline'}
                          size="sm"
                          onClick={() => goToPage(1)}
                          className="min-w-[36px]"
                        >
                          1
                        </Button>
                      )

                      // Ellipsis after first page
                      if (showEllipsisStart) {
                        pageNumbers.push(
                          <span key="ellipsis-start" className="text-foreground-muted px-2">...</span>
                        )
                      }

                      // Pages around current page
                      const startPage = Math.max(2, currentPage - 1)
                      const endPage = Math.min(totalPages - 1, currentPage + 1)

                      for (let i = startPage; i <= endPage; i++) {
                        pageNumbers.push(
                          <Button
                            key={i}
                            variant={currentPage === i ? 'accent-subtle' : 'outline'}
                            size="sm"
                            onClick={() => goToPage(i)}
                            className="min-w-[36px]"
                          >
                            {i}
                          </Button>
                        )
                      }

                      // Ellipsis before last page
                      if (showEllipsisEnd) {
                        pageNumbers.push(
                          <span key="ellipsis-end" className="text-foreground-muted px-2">...</span>
                        )
                      }

                      // Always show last page if there's more than 1 page
                      if (totalPages > 1) {
                        pageNumbers.push(
                          <Button
                            key={totalPages}
                            variant={currentPage === totalPages ? 'accent-subtle' : 'outline'}
                            size="sm"
                            onClick={() => goToPage(totalPages)}
                            className="min-w-[36px]"
                          >
                            {totalPages}
                          </Button>
                        )
                      }

                      return pageNumbers
                    })()}
                  </div>

                  {/* Next Button */}
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => goToPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Button>
                </div>
              )}

              {/* Right: Rows per page */}
              <div className="flex items-center gap-3">
                <span className="text-sm text-foreground-muted">Rows per page:</span>
                <Select
                  variant="pill"
                  size="sm"
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="bg-background-elevated w-auto"
                >
                  <option value={25} className="bg-background-elevated">25</option>
                  <option value={50} className="bg-background-elevated">50</option>
                  <option value={100} className="bg-background-elevated">100</option>
                  <option value={200} className="bg-background-elevated">200</option>
                </Select>
              </div>
            </div>
          )}
        </div>

        {filteredItems.length === 0 && (
          <EmptyState
            icon={Search01Icon}
            title="No items found"
            description="No items match your filters. Try broadening your search."
            size="default"
          />
        )}
          </>
        )}

        {/* Priorities Tab Content */}
        {viewMode === 'priorities' && <PriorityListTab />}
      </div>

      {/* Loot System Settings Modal */}
      <Modal open={showSettingsModal} onClose={() => setShowSettingsModal(false)} size="xl">
        <ModalHeader onClose={() => setShowSettingsModal(false)}>
          <ModalTitle>Loot system settings</ModalTitle>
        </ModalHeader>
        <ModalBody className="space-y-6">
              {/* General Settings */}
              <Card variant="unified">
                <CardHeader>
                  <CardTitle className="text-[15px] font-semibold flex items-center gap-2">
                    <HugeiconsIcon icon={Settings01Icon} size={18} className="text-muted-foreground" />
                    General settings
                  </CardTitle>
                  <CardDescription>Configure how Loot Scores are displayed.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div>
                    <Label className="block mb-2">Score precision</Label>
                    <Select
                      variant="pill"
                      value={settings.decimal_places}
                      onChange={(e) => setSettings({ ...settings, decimal_places: Number(e.target.value) })}
                      className="bg-background-elevated"
                    >
                      <option value="0">Whole numbers (e.g., 42)</option>
                      <option value="1">One decimal (e.g., 42.5)</option>
                      <option value="2">Two decimals (e.g., 42.50)</option>
                    </Select>
                    <p className="text-muted-foreground text-[12px] mt-1">How many decimal places to show</p>
                  </div>
                </CardContent>
              </Card>

              {/* Attendance Settings - Basic */}
              <Card variant="unified">
                <CardHeader>
                  <CardTitle className="text-[15px] font-semibold flex items-center gap-2">
                    <HugeiconsIcon icon={Calendar03Icon} size={18} className="text-muted-foreground" />
                    Attendance
                  </CardTitle>
                  <CardDescription>Control how attendance bonuses are calculated. Consistent raiders get priority on loot.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="block mb-2 inline-flex items-center gap-1">Type of attendance bonus <InfoTooltip content="How attendance points are calculated. Points-per-raid gives flat points, linear scales with %, breakpoint gives fixed bonuses at thresholds." iconSize={12} /></Label>
                      <Select
                        variant="pill"
                        value={settings.attendance_type}
                        onChange={(e) => setSettings({ ...settings, attendance_type: e.target.value as 'linear' | 'breakpoint' | 'points-per-raid' })}
                        className="bg-background-elevated"
                      >
                        <option value="points-per-raid">Points per raid</option>
                        <option value="linear">Linear (percentage)</option>
                        <option value="breakpoint">Breakpoint</option>
                      </Select>
                      <p className="text-muted-foreground text-[12px] mt-1">
                        {settings.attendance_type === 'points-per-raid'
                          ? 'Flat points per raid: signup + attendance = 1 point/raid'
                          : settings.attendance_type === 'linear'
                          ? 'Scales with % of raids attended'
                          : 'Fixed bonus at attendance thresholds'}
                      </p>
                    </div>

                    <div>
                      <Label className="block mb-2 inline-flex items-center gap-1">Rolling attendance period (weeks) <InfoTooltip content="How far back to look when calculating attendance. Only raids within this window count toward a raider's score." iconSize={12} /></Label>
                      <Input
                        variant="pill"
                        type="number"
                        inputMode="numeric"
                        min="1"
                        value={settings.rolling_attendance_weeks}
                        onChange={(e) => setSettings({ ...settings, rolling_attendance_weeks: Number(e.target.value) })}
                        className="bg-background-elevated"
                      />
                      <p className="text-muted-foreground text-[12px] mt-1">How many weeks to track attendance</p>
                    </div>
                  </div>

                  {/* Linear: show max bonus */}
                  {settings.attendance_type === 'linear' && (
                    <div className="bg-background-elevated border border-border-strong p-4 rounded-xl">
                      <div className="w-full sm:w-1/3">
                        <Label className="block mb-2">Maximum attendance bonus</Label>
                        <Input
                          variant="pill"
                          type="number"
                          inputMode="numeric"
                          value={settings.max_attendance_bonus}
                          onChange={(e) => setSettings({ ...settings, max_attendance_bonus: Number(e.target.value) })}
                          placeholder="Points"
                          className="bg-background-elevated"
                        />
                        <p className="text-muted-foreground text-[12px] mt-1">Bonus at 100% attendance</p>
                      </div>
                    </div>
                  )}

                  {/* Breakpoint: show all tiers */}
                  {settings.attendance_type === 'breakpoint' && (
                    <div className="bg-background-elevated border border-border-strong p-4 rounded-xl">
                      <p className="text-muted-foreground text-[12px] mb-3">Configure bonus points for different attendance thresholds (points | threshold %)</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <Label size="sm" className="block text-muted-foreground mb-1">Max attendance</Label>
                          <div className="flex gap-2">
                            <Input
                              variant="pill"
                              size="sm"
                              type="number"
                              inputMode="numeric"
                              value={settings.max_attendance_bonus}
                              onChange={(e) => setSettings({ ...settings, max_attendance_bonus: Number(e.target.value) })}
                              placeholder="Points"
                              className="bg-background-elevated"
                            />
                            <Input
                              variant="pill"
                              size="sm"
                              type="number"
                              inputMode="numeric"
                              step="0.1"
                              value={settings.max_attendance_threshold}
                              onChange={(e) => setSettings({ ...settings, max_attendance_threshold: Number(e.target.value) })}
                              placeholder="Threshold"
                              className="bg-background-elevated"
                            />
                          </div>
                        </div>
                        <div>
                          <Label size="sm" className="block text-muted-foreground mb-1">Middle attendance</Label>
                          <div className="flex gap-2">
                            <Input
                              variant="pill"
                              size="sm"
                              type="number"
                              inputMode="numeric"
                              value={settings.middle_attendance_bonus}
                              onChange={(e) => setSettings({ ...settings, middle_attendance_bonus: Number(e.target.value) })}
                              placeholder="Points"
                              className="bg-background-elevated"
                            />
                            <Input
                              variant="pill"
                              size="sm"
                              type="number"
                              inputMode="numeric"
                              step="0.1"
                              value={settings.middle_attendance_threshold}
                              onChange={(e) => setSettings({ ...settings, middle_attendance_threshold: Number(e.target.value) })}
                              placeholder="Threshold"
                              className="bg-background-elevated"
                            />
                          </div>
                        </div>
                        <div>
                          <Label size="sm" className="block text-muted-foreground mb-1">Bottom attendance</Label>
                          <div className="flex gap-2">
                            <Input
                              variant="pill"
                              size="sm"
                              type="number"
                              inputMode="numeric"
                              value={settings.bottom_attendance_bonus}
                              onChange={(e) => setSettings({ ...settings, bottom_attendance_bonus: Number(e.target.value) })}
                              placeholder="Points"
                              className="bg-background-elevated"
                            />
                            <Input
                              variant="pill"
                              size="sm"
                              type="number"
                              inputMode="numeric"
                              step="0.1"
                              value={settings.bottom_attendance_threshold}
                              onChange={(e) => setSettings({ ...settings, bottom_attendance_threshold: Number(e.target.value) })}
                              placeholder="Threshold"
                              className="bg-background-elevated"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Points-per-raid: show max cap */}
                  {settings.attendance_type === 'points-per-raid' && (
                    <div className="bg-background-elevated border border-border-strong p-4 rounded-xl">
                      <div className="w-full sm:w-1/3">
                        <Label className="block mb-2">Max points cap</Label>
                        <Input
                          variant="pill"
                          type="number"
                          inputMode="numeric"
                          value={settings.max_attendance_bonus}
                          onChange={(e) => setSettings({ ...settings, max_attendance_bonus: Number(e.target.value) })}
                          placeholder="Points"
                          className="bg-background-elevated"
                        />
                        <p className="text-muted-foreground text-[12px] mt-1">
                          Max possible: {settings.rolling_attendance_weeks * 2} pts ({settings.rolling_attendance_weeks} weeks × 2 raids)
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Raid Signups */}
                  <div className="border-t border-border pt-4">
                    <p className="text-[13px] font-medium text-foreground mb-3">Raid signups</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="block mb-2">Use raid signups for attendance</Label>
                        <Select
                          variant="pill"
                          value={settings.use_signups ? 'yes' : 'no'}
                          onChange={(e) => setSettings({ ...settings, use_signups: e.target.value === 'yes' })}
                          className="bg-background-elevated"
                        >
                          <option value="no">No</option>
                          <option value="yes">Yes</option>
                        </Select>
                        <p className="text-muted-foreground text-[12px] mt-1">Give bonus for signing up to raids</p>
                      </div>

                      <div>
                        <Label className="block mb-2">
                          {settings.attendance_type === 'points-per-raid'
                            ? 'Signup points (per raid)'
                            : 'Signup % of attendance (decimal)'}
                        </Label>
                        <Input
                          variant="pill"
                          type="number"
                          inputMode="numeric"
                          min="0"
                          max="1"
                          step="0.05"
                          value={settings.signup_weight}
                          onChange={(e) => setSettings({ ...settings, signup_weight: Number(e.target.value) })}
                          disabled={settings.attendance_type !== 'points-per-raid' && !settings.use_signups}
                          className="bg-background-elevated"
                        />
                        <p className="text-muted-foreground text-[12px] mt-1">
                          {settings.attendance_type === 'points-per-raid'
                            ? `Signup: ${settings.signup_weight} pts, Attend: ${(1 - settings.signup_weight).toFixed(2)} pts per raid`
                            : 'Portion of attendance bonus from signups'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Attendance Penalties */}
                  <div className="border-t border-border pt-4">
                    <p className="text-[13px] font-medium text-foreground mb-3">Penalties</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="block mb-2">Late show / leave early penalty</Label>
                        <Select
                          variant="pill"
                          value={settings.late_early_penalty_enabled ? 'yes' : 'no'}
                          onChange={(e) => setSettings({ ...settings, late_early_penalty_enabled: e.target.value === 'yes' })}
                          className="bg-background-elevated"
                        >
                          <option value="no">No</option>
                          <option value="yes">Yes</option>
                        </Select>
                        <p className="text-muted-foreground text-[12px] mt-1">Penalize partial attendance</p>
                      </div>

                      <div>
                        <Label className="block mb-2">Penalty value</Label>
                        <Input
                          variant="pill"
                          type="number"
                          inputMode="numeric"
                          step="0.05"
                          value={settings.late_early_penalty_value}
                          onChange={(e) => setSettings({ ...settings, late_early_penalty_value: Number(e.target.value) })}
                          disabled={!settings.late_early_penalty_enabled}
                          className="bg-background-elevated"
                        />
                        <p className="text-muted-foreground text-[12px] mt-1">Attendance deduction for late/early</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Advanced Settings - Collapsible */}
              <div className="space-y-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setAdvancedExpanded(!advancedExpanded)}
                  className="w-full flex items-center justify-between py-3 px-4 bg-background-subtle hover:bg-background-elevated border border-border-strong rounded-xl h-auto"
                >
                  <div className="flex items-center gap-2">
                    <HugeiconsIcon icon={Settings02Icon} size={18} className="text-muted-foreground" />
                    <span className="text-[16px] font-semibold text-foreground">Advanced settings</span>
                    <span className="text-[12px] text-muted-foreground">(optional)</span>
                  </div>
                  <HugeiconsIcon
                    icon={advancedExpanded ? ArrowUp01Icon : ArrowDown01Icon}
                    size={20}
                    className="text-muted-foreground"
                  />
                </Button>

                {advancedExpanded && (
                  <div className="space-y-4 pt-2">
                    {/* New Members - Combined Policy and Trial System */}
                    <Card variant="unified">
                      <CardHeader>
                        <CardTitle className="text-[15px] font-semibold flex items-center gap-2">
                          <HugeiconsIcon icon={UserAdd01Icon} size={18} className="text-muted-foreground" />
                          New members
                        </CardTitle>
                        <CardDescription>Control how new members are treated for loot eligibility and trial periods.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* Attendance Calculation Mode */}
                        <div className="space-y-3">
                          <p className="text-[13px] font-medium text-foreground">Attendance calculation</p>
                          <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${settings.new_member_mode === 'raw' ? 'border-accent bg-accent/5' : 'border-border hover:border-border-strong'}`}>
                            <input
                              type="radio"
                              name="new_member_mode"
                              value="raw"
                              checked={settings.new_member_mode === 'raw'}
                              onChange={() => setSettings({ ...settings, new_member_mode: 'raw' })}
                              className="mt-1"
                            />
                            <div>
                              <div className="font-medium text-foreground">Raw attendance</div>
                              <div className="text-muted-foreground text-[13px]">Score calculated against full rolling window. New members naturally have lower priority until they&apos;ve attended enough raids.</div>
                            </div>
                          </label>

                          <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${settings.new_member_mode === 'fair' ? 'border-accent bg-accent/5' : 'border-border hover:border-border-strong'}`}>
                            <input
                              type="radio"
                              name="new_member_mode"
                              value="fair"
                              checked={settings.new_member_mode === 'fair'}
                              onChange={() => setSettings({ ...settings, new_member_mode: 'fair' })}
                              className="mt-1"
                            />
                            <div>
                              <div className="font-medium text-foreground">Fair attendance</div>
                              <div className="text-muted-foreground text-[13px]">Score only counts raids since member joined guild. New members can compete equally if they&apos;re consistent.</div>
                            </div>
                          </label>

                          <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${settings.new_member_mode === 'minimum_gate' ? 'border-accent bg-accent/5' : 'border-border hover:border-border-strong'}`}>
                            <input
                              type="radio"
                              name="new_member_mode"
                              value="minimum_gate"
                              checked={settings.new_member_mode === 'minimum_gate'}
                              onChange={() => setSettings({ ...settings, new_member_mode: 'minimum_gate' })}
                              className="mt-1"
                            />
                            <div>
                              <div className="font-medium text-foreground">Minimum raids required</div>
                              <div className="text-muted-foreground text-[13px]">Members must attend a minimum number of raids before becoming eligible for loot. Uses fair attendance calculation once eligible.</div>
                            </div>
                          </label>

                          {settings.new_member_mode === 'minimum_gate' && (
                            <div className="ml-7 mt-2">
                              <Label className="block mb-2 inline-flex items-center gap-1">Minimum raids before eligible <InfoTooltip content="New members must attend this many raids before they can receive loot. Their score still tracks in the background." iconSize={12} /></Label>
                              <Input
                                variant="pill"
                                type="number"
                                inputMode="numeric"
                                min="1"
                                max="20"
                                value={settings.minimum_raid_days}
                                onChange={(e) => setSettings({ ...settings, minimum_raid_days: Number(e.target.value) })}
                                className="bg-background-elevated w-24"
                              />
                              <p className="text-muted-foreground text-[12px] mt-1">Members must attend this many raids before they can receive loot.</p>
                            </div>
                          )}
                        </div>

                        {/* Trial System */}
                        <div className="space-y-4 pt-2 border-t border-border">
                          <p className="text-[13px] font-medium text-foreground pt-2">Trial system</p>
                          <p className="text-muted-foreground text-[12px] -mt-2">Apply a score penalty to members on trial status until promoted to full member.</p>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <Label className="block mb-2 inline-flex items-center gap-1">Enable trial penalty <InfoTooltip content="Applies a score penalty to trial members, giving established raiders priority. Removed when promoted to full member." iconSize={12} /></Label>
                              <Select
                                variant="pill"
                                value={settings.trial_penalty_enabled ? 'yes' : 'no'}
                                onChange={(e) => setSettings({ ...settings, trial_penalty_enabled: e.target.value === 'yes' })}
                                className="bg-background-elevated"
                              >
                                <option value="no">No</option>
                                <option value="yes">Yes</option>
                              </Select>
                            </div>

                            <div>
                              <Label className="block mb-2">Trial penalty value</Label>
                              <Input
                                variant="pill"
                                type="number"
                                inputMode="numeric"
                                step="0.5"
                                value={settings.trial_penalty_value}
                                onChange={(e) => setSettings({ ...settings, trial_penalty_value: Number(e.target.value) })}
                                disabled={!settings.trial_penalty_enabled}
                                className="bg-background-elevated"
                              />
                              <p className="text-muted-foreground text-[11px] mt-1">Negative value reduces trial member scores</p>
                            </div>
                          </div>

                          <div>
                            <Label className="block mb-2">New members start as trial</Label>
                            <Select
                              variant="pill"
                              value={settings.new_members_start_as_trial ? 'yes' : 'no'}
                              onChange={(e) => setSettings({ ...settings, new_members_start_as_trial: e.target.value === 'yes' })}
                              className="bg-background-elevated"
                            >
                              <option value="no">No</option>
                              <option value="yes">Yes</option>
                            </Select>
                            <p className="text-muted-foreground text-[11px] mt-1">When enabled, new members joining the guild will automatically be set to trial status</p>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <Label className="block mb-2">Auto-promote trials</Label>
                              <Select
                                variant="pill"
                                value={settings.trial_auto_promote_enabled ? 'yes' : 'no'}
                                onChange={(e) => setSettings({ ...settings, trial_auto_promote_enabled: e.target.value === 'yes' })}
                                className="bg-background-elevated"
                              >
                                <option value="no">No</option>
                                <option value="yes">Yes</option>
                              </Select>
                            </div>

                            <div>
                              <Label className="block mb-2">Weeks until promotion</Label>
                              <Input
                                variant="pill"
                                type="number"
                                inputMode="numeric"
                                min="1"
                                max="52"
                                value={settings.trial_auto_promote_weeks}
                                onChange={(e) => setSettings({ ...settings, trial_auto_promote_weeks: Number(e.target.value) })}
                                disabled={!settings.trial_auto_promote_enabled}
                                className="bg-background-elevated"
                              />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Bad Luck Prevention (BLP) */}
                    <Card variant="unified">
                      <CardHeader>
                        <CardTitle className="text-[15px] font-semibold flex items-center gap-2">
                          <HugeiconsIcon icon={DiceIcon} size={18} className="text-muted-foreground" />
                          Bad luck prevention
                        </CardTitle>
                        <CardDescription>Compensate raiders who lose rolls or get passed over for items they want. When a raider is &quot;in running&quot; (has the item ranked and attended the raid) but doesn&apos;t receive it, their BLP bonus increases. Resets to 0 when they finally win the item.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label className="block mb-2">Enable BLP tracking</Label>
                            <Select
                              variant="pill"
                              value={settings.blp_enabled ? 'yes' : 'no'}
                              onChange={(e) => setSettings({ ...settings, blp_enabled: e.target.value === 'yes' })}
                              className="bg-background-elevated"
                            >
                              <option value="no">No</option>
                              <option value="yes">Yes</option>
                            </Select>
                          </div>

                          <div>
                            <Label className="block mb-2 inline-flex items-center gap-1">Bonus per loss <InfoTooltip content="How many points a raider gains each time they're in running for an item but don't receive it." iconSize={12} /></Label>
                            <Input
                              variant="pill"
                              type="number"
                              inputMode="numeric"
                              step="0.01"
                              min="0.01"
                              max="10"
                              value={settings.blp_increment}
                              onChange={(e) => setSettings({ ...settings, blp_increment: Number(e.target.value) })}
                              disabled={!settings.blp_enabled}
                              className="bg-background-elevated"
                            />
                          </div>

                          <div>
                            <Label className="block mb-2 inline-flex items-center gap-1">Maximum bonus <InfoTooltip content="Cap on how high bad luck protection can stack. Prevents runaway scores from long absence periods." iconSize={12} /></Label>
                            <Input
                              variant="pill"
                              type="number"
                              inputMode="numeric"
                              step="0.1"
                              min="0.1"
                              max="50"
                              value={settings.blp_maximum}
                              onChange={(e) => setSettings({ ...settings, blp_maximum: Number(e.target.value) })}
                              disabled={!settings.blp_enabled}
                              className="bg-background-elevated"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Loot List Rules */}
                    <Card variant="unified">
                      <CardHeader>
                        <CardTitle className="text-[15px] font-semibold flex items-center gap-2">
                          <HugeiconsIcon icon={Layers01Icon} size={18} className="text-muted-foreground" />
                          Loot list rules
                        </CardTitle>
                        <CardDescription>Control how raiders can arrange items in their priority brackets.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div>
                          <Label className="block mb-2">One token per bracket</Label>
                          <p className="text-xs text-muted-foreground mb-2">Restrict each bracket to a single tier token. Other equipment slots are always limited to one per bracket.</p>
                          <Select
                            variant="pill"
                            value={settings.enforce_slot_restrictions ? 'yes' : 'no'}
                            onChange={(e) => setSettings({ ...settings, enforce_slot_restrictions: e.target.value === 'yes' })}
                            className="bg-background-elevated w-32"
                          >
                            <option value="no">No</option>
                            <option value="yes">Yes</option>
                          </Select>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Rank, Role, Class Bonuses */}
                    <Card variant="unified">
                      <CardHeader>
                        <CardTitle className="text-[15px] font-semibold flex items-center gap-2">
                          <HugeiconsIcon icon={Medal01Icon} size={18} className="text-muted-foreground" />
                          Rank, role and class bonuses
                        </CardTitle>
                        <CardDescription>Fine-tune priority systems to value guild rank, raid roles, class needs or individual contributions.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">

                      <div>
                        <Label className="block mb-2">Guild ranks give bonuses (positive or negative)</Label>
                        <Select
                          variant="pill"
                          value={settings.guild_rank_bonuses_enabled ? 'yes' : 'no'}
                          onChange={(e) => setSettings({ ...settings, guild_rank_bonuses_enabled: e.target.value === 'yes' })}
                          className="bg-background-elevated"
                        >
                          <option value="no">No</option>
                          <option value="yes">Yes</option>
                        </Select>
                      </div>

                      {settings.guild_rank_bonuses_enabled && (
                        <div className="bg-background-elevated border border-border-strong p-4 rounded-xl space-y-3">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-[13px] font-medium text-foreground">Rank bonuses</p>
                            <p className="text-[11px] text-muted-foreground">Can be positive or negative. For negative, use - before number (e.g., -1)</p>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {[...guildRoles].sort((a, b) => b.position - a.position).map((role) => (
                              <div key={role.name}>
                                <Label size="sm" className="block text-foreground-muted mb-1">{role.name}</Label>
                                <Input
                                  variant="pill"
                                  size="sm"
                                  type="number"
                                  inputMode="numeric"
                                  step="0.1"
                                  value={settings.rank_modifiers[role.name] === 0 || settings.rank_modifiers[role.name] === undefined ? '' : settings.rank_modifiers[role.name]}
                                  onChange={(e) => {
                                    const newModifiers = { ...settings.rank_modifiers }
                                    if (e.target.value === '') {
                                      newModifiers[role.name] = 0
                                    } else {
                                      newModifiers[role.name] = Number(e.target.value)
                                    }
                                    setSettings({
                                      ...settings,
                                      rank_modifiers: newModifiers
                                    })
                                  }}
                                  placeholder="0"
                                  className="bg-background-elevated"
                                />
                              </div>
                            ))}
                          </div>
                          <p className="text-[11px] text-accent mt-2">
                            Ensure you have assigned roles for each raider in the Master Sheet or calculations will not work.
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label className="block mb-2 inline-flex items-center gap-1">Role bonus priority on single item <InfoTooltip content="When enabled, raiders whose role matches an item's role tag (e.g. Tank) get a score boost for that item." iconSize={12} /></Label>
                          <Select
                            variant="pill"
                            value={settings.role_bonus_priority_single_item ? 'yes' : 'no'}
                            onChange={(e) => setSettings({ ...settings, role_bonus_priority_single_item: e.target.value === 'yes' })}
                            className="bg-background-elevated"
                          >
                            <option value="no">No</option>
                            <option value="yes">Yes</option>
                          </Select>
                          <p className="text-muted-foreground text-[11px] mt-1">Boost priority for the intended role when an item has a role tag (e.g., Tank gear)</p>
                        </div>

                        <div>
                          <Label className="block mb-2">Class bonus priority on single item</Label>
                          <Select
                            variant="pill"
                            value={settings.class_bonus_priority_single_item ? 'yes' : 'no'}
                            onChange={(e) => setSettings({ ...settings, class_bonus_priority_single_item: e.target.value === 'yes' })}
                            className="bg-background-elevated"
                          >
                            <option value="no">No</option>
                            <option value="yes">Yes</option>
                          </Select>
                          <p className="text-muted-foreground text-[11px] mt-1">Boost priority for specific classes when an item has a class tag</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label className="block mb-2">Raid roles overall bonus priority</Label>
                          <Select
                            variant="pill"
                            value={settings.raid_roles_overall_bonus_priority ? 'yes' : 'no'}
                            onChange={(e) => setSettings({ ...settings, raid_roles_overall_bonus_priority: e.target.value === 'yes' })}
                            className="bg-background-elevated"
                          >
                            <option value="no">No</option>
                            <option value="yes">Yes</option>
                          </Select>
                          <p className="text-muted-foreground text-[11px] mt-1">Give certain raid roles (Tank, Healer, DPS) a global score bonus</p>
                        </div>

                        <div>
                          <Label className="block mb-2">Single raider overall bonus</Label>

                          <Select
                            variant="pill"
                            value={settings.single_raider_overall_bonus ? 'yes' : 'no'}
                            onChange={(e) => setSettings({ ...settings, single_raider_overall_bonus: e.target.value === 'yes' })}
                            className="bg-background-elevated"
                          >
                            <option value="no">No</option>
                            <option value="yes">Yes</option>
                          </Select>
                          <p className="text-muted-foreground text-[11px] mt-1">Allow individual raiders to have custom score modifiers</p>
                        </div>
                      </div>

                      {settings.raid_roles_overall_bonus_priority && (
                        <div className="bg-background-elevated border border-border-strong p-4 rounded-xl space-y-3">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-[13px] font-medium text-foreground">Role bonuses</p>
                            <p className="text-[11px] text-muted-foreground">Can be positive or negative. For negative, use - before number (e.g., -1)</p>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {allRoles.map((role) => (
                              <div key={role}>
                                <Label size="sm" className="block text-foreground-muted mb-1">{getRoleDisplayName(role)}</Label>
                                <Input
                                  variant="pill"
                                  size="sm"
                                  type="number"
                                  inputMode="numeric"
                                  step="0.1"
                                  value={settings.role_modifiers[role] === 0 || settings.role_modifiers[role] === undefined ? '' : settings.role_modifiers[role]}
                                  onChange={(e) => {
                                    const newModifiers = { ...settings.role_modifiers }
                                    if (e.target.value === '') {
                                      newModifiers[role] = 0
                                    } else {
                                      newModifiers[role] = Number(e.target.value)
                                    }
                                    setSettings({
                                      ...settings,
                                      role_modifiers: newModifiers
                                    })
                                  }}
                                  placeholder="0"
                                  className="bg-background-elevated"
                                />
                              </div>
                            ))}
                          </div>
                          <p className="text-[11px] text-accent mt-2">
                            Roles are determined by each raider's spec. Make sure specs are set correctly.
                          </p>
                        </div>
                      )}

                      <div>
                        <Label className="block mb-2">Single raider bonus on single item</Label>
                        <Select
                          variant="pill"
                          value={settings.single_raider_bonus_single_item ? 'yes' : 'no'}
                          onChange={(e) => setSettings({ ...settings, single_raider_bonus_single_item: e.target.value === 'yes' })}
                          className="bg-background-elevated"
                        >
                          <option value="no">No</option>
                          <option value="yes">Yes</option>
                        </Select>
                        <p className="text-muted-foreground text-[11px] mt-1">Allow boosting a specific raider&apos;s priority on a specific item</p>
                      </div>
                      </CardContent>
                    </Card>

                    {/* Donations */}
                    <Card variant="unified">
                      <CardHeader>
                        <CardTitle className="text-[15px] font-semibold flex items-center gap-2">
                          <HugeiconsIcon icon={GiftIcon} size={18} className="text-muted-foreground" />
                          Donations
                        </CardTitle>
                        <CardDescription>Reward members who donate gold, materials, or consumables to the guild bank.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label className="block mb-2">Enable donation bonuses</Label>
                            <Select
                              variant="pill"
                              value={settings.donation_bonuses_enabled ? 'yes' : 'no'}
                              onChange={(e) => setSettings({ ...settings, donation_bonuses_enabled: e.target.value === 'yes' })}
                              className="bg-background-elevated"
                            >
                              <option value="no">No</option>
                              <option value="yes">Yes</option>
                            </Select>
                          </div>

                          <div>
                            <Label className="block mb-2">Cap on donation points</Label>
                            <Select
                              variant="pill"
                              value={settings.donation_cap_enabled ? 'yes' : 'no'}
                              onChange={(e) => setSettings({ ...settings, donation_cap_enabled: e.target.value === 'yes' })}
                              className="bg-background-elevated"
                              disabled={!settings.donation_bonuses_enabled}
                            >
                              <option value="no">No</option>
                              <option value="yes">Yes</option>
                            </Select>
                            <p className="text-muted-foreground text-[11px] mt-1">Limit max donation bonus to prevent pay-to-win</p>
                          </div>

                          <div>
                            <Label className="block mb-2 inline-flex items-center gap-1">Donation bonus type <InfoTooltip content="How donation points persist. Permanent stays forever, rolling decays over time, hard reset clears on a schedule." iconSize={12} /></Label>
                            <Select
                              variant="pill"
                              value={settings.donation_bonus_type}
                              onChange={(e) => setSettings({ ...settings, donation_bonus_type: e.target.value as 'permanent' | 'rolling' | 'hard-reset' })}
                              className="bg-background-elevated"
                              disabled={!settings.donation_bonuses_enabled}
                            >
                              <option value="permanent">Permanent</option>
                              <option value="rolling">Rolling</option>
                              <option value="hard-reset">Hard reset</option>
                            </Select>
                            <p className="text-muted-foreground text-[11px] mt-1">How donation points persist over time</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                  </div>
                )}
              </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowSettingsModal(false)} disabled={savingSettings}>
            Cancel
          </Button>
          <Button onClick={saveSettings} loading={savingSettings} disabled={!hasSettingsChanges}>
            Save settings
          </Button>
        </ModalFooter>
      </Modal>

      {/* Notes Modal */}
      <Modal
        open={!!notesModalItem}
        onClose={() => setNotesModalItem(null)}
        size="sm"
      >
        <ModalHeader onClose={() => setNotesModalItem(null)}>
          <ModalTitle>Officer notes</ModalTitle>
          {notesModalItem && (
            <ModalDescription>
              <ItemLink wowheadId={notesModalItem.wowhead_id} name={notesModalItem.name} />
            </ModalDescription>
          )}
        </ModalHeader>
        <ModalBody>
          <Textarea
            value={notesModalValue}
            onChange={(e) => setNotesModalValue(e.target.value)}
            placeholder="Add notes for officers..."
            rows={4}
            variant="rounded"
            autoFocus
          />
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setNotesModalItem(null)} disabled={savingNotes}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={savingNotes}
            onClick={async () => {
              if (notesModalItem) {
                setSavingNotes(true)
                const success = await updateNotes(notesModalItem.id, notesModalValue)
                setSavingNotes(false)
                if (success) {
                  setNotesModalItem(null)
                }
              }
            }}
          >
            Save note
          </Button>
        </ModalFooter>
      </Modal>
    </ExpansionGuard>
  )
}

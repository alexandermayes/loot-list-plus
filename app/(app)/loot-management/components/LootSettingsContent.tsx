'use client'

import { createClient } from '@/utils/supabase/client'
import { paginatedSelect } from '@/utils/supabase/paginate'
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import nextDynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { useNotification } from '@/app/contexts/NotificationContext'
import { ExpansionGuard } from '@/app/components/ExpansionGuard'
import { LootSettingsPageSkeleton } from '@/components/ui/skeletons'
import { Button } from '@/components/ui/button'
import { Heading } from '@/components/ui/typography'
import { Select } from '@/components/ui/select'
import { toDateString } from '@/utils/date'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import StyledSelect from '@/app/components/StyledSelect'
import { specMapping, allRoles } from '@/domain/loot/spec-role-mapping'
import { Search01Icon } from '@hugeicons/core-free-icons'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { refreshWowheadTooltips } from '@/lib/wowhead'
import { ItemRow } from './ItemRow'
import { Skeleton } from '@/components/ui/skeletons'

// Modals are lazy-loaded so their JS doesn't ship in the initial bundle.
// Combined with conditional render below, each chunk fetches on first open.
const SettingsModal = nextDynamic(
  () => import('./SettingsModal').then((m) => m.SettingsModal),
  { ssr: false }
)
const NotesModal = nextDynamic(
  () => import('./NotesModal').then((m) => m.NotesModal),
  { ssr: false }
)
import { SegmentedControl } from '@/components/ui/segmented-control'
import { useConfirm } from '@/components/ui/confirm-modal'
import { trackClientEvent } from '@/utils/analytics/client'
import { InfoTooltip } from '@/components/ui/info-tooltip'

// Lazy-load the two off-default tabs so the Items tab (default) doesn't pay
// for their JS on first paint. PriorityListTab (~933 lines) and DonationsTab
// (~521 lines) only load when the user clicks their tab.
function TabLoadingSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  )
}
const PriorityListTab = nextDynamic(() => import('./PriorityListTab'), {
  loading: () => <TabLoadingSkeleton />,
})
const DonationsTab = nextDynamic(() => import('./DonationsTab'), {
  loading: () => <TabLoadingSkeleton />,
})

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

export default function LootSettingsContent({
  serverHeading,
}: { serverHeading?: React.ReactNode } = {}) {
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
  const [settingsSaveStatus, setSettingsSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [advancedExpanded, setAdvancedExpanded] = useState(false)
  const [initialSettings, setInitialSettings] = useState<typeof settings | null>(null)
  const [initialGuildRoles, setInitialGuildRoles] = useState<typeof guildRoles | null>(null)
  const settingsLoadedRef = useRef(false)
  const [viewMode, setViewMode] = useState<'items' | 'priorities' | 'donations'>('items')

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
    weekly_attendance_minimum: null as number | null,

    // Raid Reset Week
    week_reset_day: 2, // Tuesday (NA WoW reset)

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
    donation_cap_points: 0,
    donation_bonus_type: 'rolling' as 'permanent' | 'rolling' | 'hard-reset',
    donation_rolling_weeks: null as number | null,
    donation_reset_at: null as string | null,

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
    enforce_slot_restrictions: false,
    max_allocation_points_per_bracket: 3,
    max_tokens_per_bracket: 1,
    max_category_per_bracket: 1
  })

  const [guildRoles, setGuildRoles] = useState<{ name: string; position: number }[]>([
    { name: 'Guild Master', position: 100 },
    { name: 'Officer', position: 50 },
    { name: 'Member', position: 0 }
  ])

  const supabase = createClient()
  const router = useRouter()
  const { activeGuild, activeMember, loading: guildLoading, hasPermission } = useGuildContext()
  const { showNotification } = useNotification()
  const { confirm, ConfirmDialog } = useConfirm()

  // Latest-state snapshot read by stable action handlers below. Keeps itemSpecs
  // out of useCallback deps so a single spec edit doesn't recreate every handler
  // and defeat React.memo on ItemRow.
  const latestRef = useRef({ itemSpecs })
  useEffect(() => {
    latestRef.current = { itemSpecs }
  })

  // Check if settings have unsaved changes
  const hasSettingsChanges = initialSettings !== null && (
    JSON.stringify(settings) !== JSON.stringify(initialSettings) ||
    JSON.stringify(guildRoles) !== JSON.stringify(initialGuildRoles)
  )

  // Auto-save settings after any change (debounced)
  useEffect(() => {
    if (!settingsLoadedRef.current || !activeGuild) return

    const timer = setTimeout(async () => {
      setSettingsSaveStatus('saving')
      try {
        const safeSettings = {
          raid_days_per_week: settings.raid_days_per_week,
          first_raid_day: settings.first_raid_day,
          second_raid_day: settings.second_raid_day,
          third_raid_day: settings.third_raid_day,
          fourth_raid_day: settings.fourth_raid_day,
          fifth_raid_day: settings.fifth_raid_day,
          reset_date: settings.reset_date,
          decimal_places: settings.decimal_places,
          attendance_type: settings.attendance_type,
          rolling_attendance_weeks: settings.rolling_attendance_weeks,
          use_signups: settings.use_signups,
          signup_weight: settings.signup_weight,
          max_attendance_bonus: settings.max_attendance_bonus,
          max_attendance_threshold: settings.max_attendance_threshold,
          middle_attendance_bonus: settings.middle_attendance_bonus,
          middle_attendance_threshold: settings.middle_attendance_threshold,
          bottom_attendance_bonus: settings.bottom_attendance_bonus,
          bottom_attendance_threshold: settings.bottom_attendance_threshold,
          minimum_raid_days_enabled: settings.minimum_raid_days_enabled,
          minimum_raid_days: settings.minimum_raid_days,
          weekly_attendance_minimum: settings.weekly_attendance_minimum,
          week_reset_day: settings.week_reset_day,
          new_member_mode: settings.new_member_mode || 'raw',
          late_early_penalty_enabled: settings.late_early_penalty_enabled,
          late_early_penalty_value: settings.late_early_penalty_value,
          guild_rank_bonuses_enabled: settings.guild_rank_bonuses_enabled,
          rank_modifiers: settings.rank_modifiers,
          role_bonus_priority_single_item: settings.role_bonus_priority_single_item,
          class_bonus_priority_single_item: settings.class_bonus_priority_single_item,
          raid_roles_overall_bonus_priority: settings.raid_roles_overall_bonus_priority,
          role_modifiers: settings.role_modifiers,
          single_raider_overall_bonus: settings.single_raider_overall_bonus,
          single_raider_bonus_single_item: settings.single_raider_bonus_single_item,
          donation_bonuses_enabled: settings.donation_bonuses_enabled,
          donation_cap_enabled: settings.donation_cap_enabled,
          donation_cap_points: settings.donation_cap_points,
          donation_bonus_type: settings.donation_bonus_type,
          donation_rolling_weeks: settings.donation_rolling_weeks,
          donation_reset_at: settings.donation_reset_at,
          number_of_ranks: settings.number_of_ranks,
          trial_penalty_enabled: settings.trial_penalty_enabled,
          trial_penalty_value: settings.trial_penalty_value,
          trial_auto_promote_enabled: settings.trial_auto_promote_enabled,
          trial_auto_promote_weeks: settings.trial_auto_promote_weeks,
          new_members_start_as_trial: settings.new_members_start_as_trial,
          blp_enabled: settings.blp_enabled,
          blp_increment: settings.blp_increment,
          blp_maximum: settings.blp_maximum,
          enforce_slot_restrictions: settings.enforce_slot_restrictions,
          max_allocation_points_per_bracket: settings.max_allocation_points_per_bracket,
          max_tokens_per_bracket: settings.max_tokens_per_bracket,
          max_category_per_bracket: settings.max_category_per_bracket,
        }

        const response = await fetch('/api/guild-settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ guild_id: activeGuild.id, settings: safeSettings }),
        })

        if (!response.ok) throw new Error('Save failed')
        setSettingsSaveStatus('saved')
        setTimeout(() => setSettingsSaveStatus('idle'), 2000)
      } catch {
        setSettingsSaveStatus('error')
        setTimeout(() => setSettingsSaveStatus('idle'), 3000)
      }
    }, 800)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings])

  // Set page title
  useEffect(() => {
    document.title = viewMode === 'items'
      ? 'LootList+ • Loot Management'
      : viewMode === 'donations'
        ? 'LootList+ • Donations'
        : 'LootList+ • Priority List'
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

          // Mark settings as loaded after all state updates flush,
          // so auto-save doesn't fire during initial hydration
          setTimeout(() => { settingsLoadedRef.current = true }, 100)
        }
      } else {
        console.error('Failed to load settings:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error loading guild settings:', error)
      showNotification('error', 'Couldn\'t load loot settings. Check your connection and try again.')
    }
  }

  const loadData = async () => {
    // Ensure guild context has fully loaded
    if (guildLoading) {
      return
    }

    // Check if officer using context
    if (!hasPermission('manage_settings')) {
      router.push('/overview')
      return
    }

    if (!activeGuild || !activeMember) {
      setLoading(false)
      return
    }

    try {
      setMember(activeMember)

      // Start loot items loading in parallel (only needs expansionId)
      const lootItemsPromise = activeGuild.active_expansion_id
        ? loadLootItems(activeGuild.active_expansion_id)
        : Promise.resolve()

      // Parallelize all independent data loads
      const [, classesResult, specsResult, expansionResult, tiersResult] = await Promise.all([
        // 1. Guild settings (also loads guild roles internally)
        loadSettings(activeGuild.id),

        // 2. WoW classes
        supabase.from('wow_classes').select('*').order('name'),

        // 3. Class specs with class info
        supabase.from('class_specs').select('id, name, class_id, wow_classes!inner(name)').order('name'),

        // 4. Expansion name (for class filtering)
        activeGuild.active_expansion_id
          ? supabase.from('expansions').select('name').eq('id', activeGuild.active_expansion_id).single()
          : Promise.resolve({ data: null }),

        // 5. Raid tiers
        activeGuild.active_expansion_id
          ? supabase.from('raid_tiers').select('id, name').eq('expansion_id', activeGuild.active_expansion_id).eq('is_guild_active', true)
          : Promise.resolve({ data: null }),
      ])

      // Process classes
      let classesData = classesResult.data || []
      if (classesData.length > 0) setClasses(classesData)

      // Process specs
      let transformedSpecs: any[] = []
      if (specsResult.data) {
        transformedSpecs = specsResult.data.map((spec: any) => {
          const className = Array.isArray(spec.wow_classes)
            ? spec.wow_classes[0]?.name
            : spec.wow_classes?.name
          return {
            ...spec,
            class_name: className,
            combined_name: spec.name === className
              ? spec.name
              : `${spec.name} ${className}`
          }
        })
        setClassSpecs(transformedSpecs as any)
      }

      // Filter classes by expansion exclusions
      if (expansionResult.data) {
        const excluded = EXPANSION_CLASS_EXCLUSIONS[expansionResult.data.name] || []
        if (excluded.length > 0) {
          classesData = classesData.filter((c: any) => !excluded.includes(c.name))
          setClasses(classesData)
          transformedSpecs = transformedSpecs.filter((s: any) => !excluded.includes(s.class_name))
          setClassSpecs(transformedSpecs as any)
        }
      }

      // Process raid tiers
      if (tiersResult.data) {
        const sortedTiers = tiersResult.data.sort((a: { name: string }, b: { name: string }) =>
          getRaidTierOrder(a.name) - getRaidTierOrder(b.name)
        )
        setRaidTiers(sortedTiers)
      }

      // Load loot items (runs in parallel with above via Promise.all)
      // Already started above — await its result
      await lootItemsPromise
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

    // Load loot items in pages. PostgREST silently caps unpaginated queries
    // at 1000 rows, which truncated late-alphabet items for guilds whose
    // active expansion has >1000 items (e.g. MoP at 1705). Order by 'id' so
    // successive pages are stable — 'name' alone isn't unique across tiers
    // and can cause Postgres to skip / duplicate rows between range() calls.
    const itemsData = await paginatedSelect<any>((start, end) =>
      supabase
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
        .order('id', { ascending: true })
        .range(start, end)
    )

    if (itemsData.length > 0) {
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

      // Load all spec relations for all items in a single query
      // Supabase sends .in() filters via POST body, so URL length is not a concern
      const itemIds = itemsData.map((item: any) => item.id)
      const specs: Record<string, { primary: Set<string>, secondary: Set<string> }> = {}

      // Initialize all items with empty spec sets
      itemIds.forEach((id: string) => {
        specs[id] = { primary: new Set(), secondary: new Set() }
      })

      // Paginate spec relations — each item can have multiple entries, so
      // even ~150 items can blow past the 1000-row default cap. The previous
      // inline loop had no .order() which lets Postgres skip/duplicate rows
      // between range() calls (the same bug class that caused loot-submission
      // item-counts to silently undercount).
      const specRelations = await paginatedSelect<{ loot_item_id: string; spec_id: string | null; spec_type: string }>(
        (start, end) =>
          supabase
            .from('loot_item_classes')
            .select('loot_item_id, spec_id, spec_type')
            .in('loot_item_id', itemIds)
            .order('id', { ascending: true })
            .range(start, end)
      )

      if (specRelations.length > 0) {
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

      setItemSpecs(specs)
    }
  }

  /** Server-side loot item update — bypasses RLS via service role after officer permission check */
  const updateLootItem = useCallback(async (itemId: string, updates: Record<string, unknown>): Promise<boolean> => {
    if (!activeGuild?.id) return false

    const res = await fetch('/api/loot-items', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guild_id: activeGuild.id, item_id: itemId, updates }),
    })

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}))
      showNotification('error', errBody.error || 'Couldn\'t save changes. Try again.')
      return false
    }

    return true
  }, [activeGuild?.id, showNotification])

  const toggleLootCouncil = useCallback(async (itemId: string, currentStatus: boolean) => {
    const success = await updateLootItem(itemId, { is_loot_council: !currentStatus })
    if (!success) return

    setLootItems(items => items.map(item =>
      item.id === itemId ? { ...item, is_loot_council: !currentStatus } : item
    ))
    showNotification('success', `Item ${!currentStatus ? 'marked as' : 'removed from'} Loot Council`)
  }, [updateLootItem, showNotification])

  const toggleAvailability = useCallback(async (itemId: string, currentStatus: boolean) => {
    const success = await updateLootItem(itemId, { is_available: !currentStatus })
    if (!success) return

    setLootItems(items => items.map(item =>
      item.id === itemId ? { ...item, is_available: !currentStatus } : item
    ))
  }, [updateLootItem])

  const updateClassification = useCallback(async (itemId: string, classification: string) => {
    const allocationCost = (classification === 'Reserved' || classification === 'Limited') ? 1 : 0
    const success = await updateLootItem(itemId, { classification, allocation_cost: allocationCost })
    if (!success) return

    setLootItems(items => items.map(item =>
      item.id === itemId ? { ...item, classification, allocation_cost: allocationCost } : item
    ))
  }, [updateLootItem])

  const updateNotes = useCallback(async (itemId: string, notes: string): Promise<boolean> => {
    const success = await updateLootItem(itemId, { officer_notes: notes || null })
    if (!success) return false

    setItemNotes(prev => ({ ...prev, [itemId]: notes }))
    setLootItems(items => items.map(item =>
      item.id === itemId ? { ...item, officer_notes: notes || undefined } : item
    ))
    showNotification('success', 'Note saved')
    return true
  }, [updateLootItem, showNotification])

  // Add a spec to an item (immediately saves to database)
  const addSpec = useCallback(async (itemId: string, specIdOrRole: string, specType: 'primary' | 'secondary') => {
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

    // Check if spec already exists in local state (read latest via ref so the
    // useCallback can stay out of itemSpecs deps and ItemRow.memo holds up)
    const currentSpecs = latestRef.current.itemSpecs[itemId] || { primary: new Set<string>(), secondary: new Set<string>() }
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
    // addAllSpecs / addRoleSpecs are stable via useCallback below (forward refs).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classSpecs, supabase, showNotification])

  // Add all specs of a role to an item
  const addRoleSpecs = useCallback(async (itemId: string, role: 'tank' | 'healer' | 'physical' | 'caster', specType: 'primary' | 'secondary') => {
    const { getSpecsForRole } = await import('@/domain/loot/spec-role-mapping')
    const roleSpecNames = getSpecsForRole(role)

    // Find the spec IDs that match these spec names (using combined_name)
    const specsToAdd = classSpecs.filter(spec =>
      roleSpecNames.includes(spec.combined_name || spec.name)
    )

    // Get current specs to avoid duplicates (latest snapshot via ref)
    const liveItemSpecs = latestRef.current.itemSpecs
    const currentSpecs = liveItemSpecs[itemId]?.[specType] || new Set<string>()

    // Check opposite type - skip specs that are already in opposite type
    const oppositeType = specType === 'primary' ? 'secondary' : 'primary'
    const oppositeSpecs = liveItemSpecs[itemId]?.[oppositeType] || new Set<string>()

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
  }, [classSpecs, supabase])

  // Add all specs to an item
  const addAllSpecs = useCallback(async (itemId: string, specType: 'primary' | 'secondary') => {
    // Get current specs (latest snapshot via ref)
    const liveItemSpecs = latestRef.current.itemSpecs
    const currentSpecs = liveItemSpecs[itemId]?.[specType] || new Set<string>()
    const oppositeType = specType === 'primary' ? 'secondary' : 'primary'
    const oppositeSpecs = liveItemSpecs[itemId]?.[oppositeType] || new Set<string>()

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
  }, [classSpecs, supabase])

  // Remove a spec from an item (immediately deletes from database)
  const removeSpec = useCallback(async (itemId: string, specIdOrRole: string, specType: 'primary' | 'secondary') => {
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
  }, [supabase])

  // Remove all specs of a role from an item
  const removeRoleSpecs = useCallback(async (itemId: string, role: 'tank' | 'healer' | 'physical' | 'caster', specType: 'primary' | 'secondary') => {
    const { getSpecsForRole } = await import('@/domain/loot/spec-role-mapping')
    const roleSpecNames = getSpecsForRole(role)

    // Find the spec IDs that match these spec names
    const specsToRemove = classSpecs.filter(spec =>
      roleSpecNames.includes(spec.combined_name || spec.name)
    )

    // Get current specs for this item/type (latest snapshot via ref)
    const currentSpecs = latestRef.current.itemSpecs[itemId]?.[specType] || new Set<string>()

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
  }, [classSpecs, supabase])

  // Remove all specs of a type from an item (batch delete)
  const removeAllSpecs = useCallback(async (itemId: string, specType: 'primary' | 'secondary') => {
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
  }, [supabase])

  // Stable callback so ItemRow.memo holds (the previous inline arrow rebuilt
  // on every render and re-rendered every row on any state change).
  const openNotesModal = useCallback((item: LootItem, currentNote: string) => {
    setNotesModalItem(item)
    setNotesModalValue(currentNote)
  }, [])

  // Toggle a role for an item (immediately updates database)
  const toggleRole = async (itemId: string, role: string) => {
    const currentRoles = itemRoles[itemId] || new Set()
    const newRoles = new Set(currentRoles)

    if (newRoles.has(role)) {
      newRoles.delete(role)
    } else {
      newRoles.add(role)
    }

    const success = await updateLootItem(itemId, { roles: Array.from(newRoles) })
    if (success) {
      setItemRoles(prev => ({
        ...prev,
        [itemId]: newRoles
      }))
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

  // Use the server-rendered heading on initial paint; switch to the dynamic
  // version once the user navigates tabs so the subtitle stays in sync. Initial
  // render produces the same HTML as the server (viewMode defaults to 'items')
  // so hydration matches.
  const dynamicHeadingBlock = (
    <div>
      <Heading level={1}>Loot Management</Heading>
      <p className="text-muted-foreground mt-1 text-base">
        {viewMode === 'items'
          ? 'Manage loot items and configure classifications'
          : viewMode === 'donations'
            ? 'Log bank donations and credit raiders'
            : 'Set role, class and individual raider priorities'}
      </p>
    </div>
  )
  const headingBlock = viewMode === 'items' ? (serverHeading ?? dynamicHeadingBlock) : dynamicHeadingBlock

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 font-poppins">
        {headingBlock}
        <LootSettingsPageSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 font-poppins">
        {headingBlock}
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
          {headingBlock}

          <div className="flex items-center gap-3">
            {/* Tabs */}
            <SegmentedControl
              options={[
                { value: 'items', label: 'Items' },
                { value: 'priorities', label: 'Priorities' },
                { value: 'donations', label: 'Donations' },
              ]}
              value={viewMode}
              onChange={setViewMode}
            />

            {/* Import Button */}
            <Link href="/sheet-import">
              <Button variant="outline">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Import
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
              Loot settings
            </Button>
          </div>
        </div>

        {/* Items Tab Content */}
        {viewMode === 'items' && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-background-elevated border border-border rounded-xl p-4">
                <p className="text-foreground-muted text-sm">Total items</p>
                <p className="text-2xl font-bold text-foreground tabular-nums">{filteredItems.length}</p>
              </div>
              <div className="bg-background-elevated border border-border rounded-xl p-4">
                <p className="text-foreground-muted text-sm">Available</p>
                <p className="text-2xl font-bold text-success tabular-nums">
                  {filteredItems.filter(i => i.is_available).length}
                </p>
              </div>
              <div className="bg-background-elevated border border-border rounded-xl p-4">
                <p className="text-foreground-muted text-sm">Reserved</p>
                <p className="text-2xl font-bold text-destructive tabular-nums">
                  {filteredItems.filter(i => i.classification === 'Reserved').length}
                </p>
              </div>
              <div className="bg-background-elevated border border-border rounded-xl p-4">
                <p className="text-foreground-muted text-sm">Limited</p>
                <p className="text-2xl font-bold text-warning tabular-nums">
                  {filteredItems.filter(i => i.classification === 'Limited').length}
                </p>
              </div>
              <div className="bg-background-elevated border border-border rounded-xl p-4">
                <p className="text-foreground-muted text-sm">Loot Council</p>
                <p className="text-2xl font-bold text-accent tabular-nums">
                  {filteredItems.filter(i => i.is_loot_council).length}
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
                    <option value="Reserved" className="bg-background-elevated" style={{ color: '#ef4444' }}>Reserved</option>
                    <option value="Limited" className="bg-background-elevated" style={{ color: '#eab308' }}>Limited</option>
                    <option value="Unlimited" className="bg-background-elevated" style={{ color: '#22c55e' }}>Unlimited</option>
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
                  <ItemRow
                    key={item.id}
                    item={item}
                    specs={itemSpecs[item.id]}
                    note={itemNotes[item.id] || ''}
                    classSpecOptions={classSpecOptions}
                    onToggleAvailability={toggleAvailability}
                    onToggleLootCouncil={toggleLootCouncil}
                    onUpdateClassification={updateClassification}
                    onAddSpec={addSpec}
                    onRemoveSpec={removeSpec}
                    onRemoveAllSpecs={removeAllSpecs}
                    onOpenNotes={openNotesModal}
                    getSpecName={getSpecName}
                    getSpecColor={getSpecColor}
                    getConsolidatedSpecNames={getConsolidatedSpecNames}
                    isRoleGroupSelected={isRoleGroupSelected}
                  />
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

        {viewMode === 'donations' && (
          <DonationsTab onOpenSettings={() => setShowSettingsModal(true)} />
        )}
      </div>

      {showSettingsModal && (
        <SettingsModal
          open={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          settings={settings}
          setSettings={setSettings}
          saveStatus={settingsSaveStatus}
          advancedExpanded={advancedExpanded}
          setAdvancedExpanded={setAdvancedExpanded}
          guildRoles={guildRoles}
        />
      )}

      {notesModalItem && (
        <NotesModal
          item={notesModalItem}
          value={notesModalValue}
          saving={savingNotes}
          onValueChange={setNotesModalValue}
          onClose={() => setNotesModalItem(null)}
          onSave={async (itemId, value) => {
            setSavingNotes(true)
            const success = await updateNotes(itemId, value)
            setSavingNotes(false)
            return success
          }}
        />
      )}

      {ConfirmDialog}
    </ExpansionGuard>
  )
}

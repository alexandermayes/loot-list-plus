'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import ItemLink from '@/app/components/ItemLink'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { ExpansionGuard } from '@/app/components/ExpansionGuard'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import StyledSelect from '@/app/components/StyledSelect'
import MultiSelectDropdown from '@/app/components/MultiSelectDropdown'
import { specMapping } from '@/utils/spec-role-mapping'

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
  roles: string[]
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

export default function AdminLootItems() {
  const [lootItems, setLootItems] = useState<LootItem[]>([])
  const [classes, setClasses] = useState<WowClass[]>([])
  const [classSpecs, setClassSpecs] = useState<ClassSpec[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
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
  // Track specs for each item: { itemId: { primary: Set<specId>, secondary: Set<specId> } }
  const [itemSpecs, setItemSpecs] = useState<Record<string, { primary: Set<string>, secondary: Set<string> }>>({})
  // Track roles for each item: { itemId: Set<role> }
  const [itemRoles, setItemRoles] = useState<Record<string, Set<string>>>({})
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)

  // Guild Settings State
  const getDefaultResetDate = () => {
    const today = new Date()
    today.setDate(today.getDate() - 28) // 4 weeks ago
    return today.toISOString().split('T')[0]
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
    attendance_type: 'linear' as 'linear' | 'breakpoint',
    rolling_attendance_weeks: 4,
    use_signups: true,
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

    // Late/Early Penalty
    late_early_penalty_enabled: true,
    late_early_penalty_value: 0.25,

    // Bad Luck Prevention
    see_item_bonus: true,
    see_item_bonus_value: 1.0,
    pass_item_bonus: false,
    pass_item_bonus_value: 0.0,

    // Rank, Role, Class Bonuses
    guild_rank_bonuses_enabled: true,
    number_of_ranks: 5,
    rank_modifiers: {} as Record<string, number>,
    role_bonus_priority_single_item: true,
    class_bonus_priority_single_item: true,
    raid_roles_overall_bonus_priority: true,
    single_raider_overall_bonus: true,
    single_raider_bonus_single_item: true,

    // Donation Settings
    donation_bonuses_enabled: false,
    donation_cap_enabled: false,
    donation_bonus_type: 'rolling' as 'permanent' | 'rolling' | 'hard-reset'
  })

  const [guildRoles, setGuildRoles] = useState<{ name: string; position: number }[]>([
    { name: 'Guild Master', position: 100 },
    { name: 'Officer', position: 50 },
    { name: 'Member', position: 0 }
  ])

  const supabase = createClient()
  const router = useRouter()
  const { activeGuild, activeMember, loading: guildLoading, isOfficer } = useGuildContext()

  // Set page title
  useEffect(() => {
    document.title = 'LootList+ • Master Loot'
  }, [])

  // Lock body scroll when settings modal is open
  useEffect(() => {
    if (showSettingsModal) {
      document.body.style.overflow = 'hidden'
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
      loadData()
    }
  }, [guildLoading, activeGuild])

  // Refresh Wowhead tooltips after items are loaded AND rendered
  useEffect(() => {
    if (!loading && lootItems.length > 0 && typeof window !== 'undefined') {
      let attempts = 0
      const maxAttempts = 25 // Try for 5 seconds max

      const refreshWowhead = () => {
        if ((window as any).$WowheadPower) {
          (window as any).$WowheadPower.refreshLinks()
          console.log('🔄 Refreshed Wowhead tooltips')
        } else if (attempts < maxAttempts) {
          attempts++
          setTimeout(refreshWowhead, 200)
        } else {
          console.warn('⚠️ Wowhead script did not load in time')
        }
      }

      // Wait a bit longer for DOM to render
      setTimeout(refreshWowhead, 300)
    }
  }, [lootItems, loading])

  const loadSettings = async (guildId: string) => {
    try {
      const response = await fetch(`/api/guild-settings?guild_id=${guildId}`)
      if (response.ok) {
        const data = await response.json()
        console.log('Guild settings loaded:', data)

        if (data.settings) {
          setSettings(prevSettings => ({
            ...prevSettings,
            ...data.settings
          }))

          console.log('rank_modifiers:', data.settings.rank_modifiers)

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
            ? guildRolesData.map(r => ({ name: r.name, position: r.position }))
            : []

          console.log('Roles from guild_roles table:', rolesFromGuildRoles)

          // ONLY use guild_roles table if it has data
          // Otherwise fall back to other sources
          let allRoles: { name: string; position: number }[] = []

          if (rolesFromGuildRoles.length > 0) {
            // Guild roles table is the authoritative source
            allRoles = rolesFromGuildRoles
            console.log('Using guild_roles table as source')
          } else {
            // Fallback to old sources if guild_roles table is empty
            console.log('Falling back to other sources')
            const rolesFromSettings = data.settings.rank_modifiers
              ? Object.keys(data.settings.rank_modifiers)
              : []

            const { data: membershipData } = await supabase
              .from('character_guild_memberships')
              .select('role')
              .eq('guild_id', guildId)

            const rolesFromDB = membershipData
              ? [...new Set(membershipData.map(d => d.role))].filter(Boolean)
              : []

            const uniqueRoleNames = [...new Set([...rolesFromSettings, ...rolesFromDB])]
            // Assign default positions for fallback roles
            allRoles = uniqueRoleNames.map(name => {
              if (name === 'Guild Master') return { name, position: 100 }
              if (name === 'Officer') return { name, position: 50 }
              if (name === 'Member') return { name, position: 0 }
              return { name, position: 25 } // Custom roles
            })
          }

          console.log('Final roles to display:', allRoles)

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
    }
  }

  const saveSettings = async () => {
    if (!activeGuild) return

    setSavingSettings(true)
    try {
      console.log('Saving settings:', settings)

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

        // Late/Early Penalty
        late_early_penalty_enabled: settings.late_early_penalty_enabled,
        late_early_penalty_value: settings.late_early_penalty_value,

        // Bad Luck Prevention
        see_item_bonus: settings.see_item_bonus,
        see_item_bonus_value: settings.see_item_bonus_value,
        pass_item_bonus: settings.pass_item_bonus,
        pass_item_bonus_value: settings.pass_item_bonus_value,

        // Rank Bonuses
        guild_rank_bonuses_enabled: settings.guild_rank_bonuses_enabled,
        rank_modifiers: settings.rank_modifiers,

        // Role/Class Bonuses
        role_bonus_priority_single_item: settings.role_bonus_priority_single_item,
        class_bonus_priority_single_item: settings.class_bonus_priority_single_item,
        raid_roles_overall_bonus_priority: settings.raid_roles_overall_bonus_priority,
        single_raider_overall_bonus: settings.single_raider_overall_bonus,
        single_raider_bonus_single_item: settings.single_raider_bonus_single_item,

        // Donation Settings
        donation_bonuses_enabled: settings.donation_bonuses_enabled,
        donation_cap_enabled: settings.donation_cap_enabled,
        donation_bonus_type: settings.donation_bonus_type,
        number_of_ranks: settings.number_of_ranks
      }

      console.log('Filtered settings to save:', safeSettings)

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
        throw new Error(errorData.error || 'Failed to save settings')
      }

      setShowSettingsModal(false)
      alert('Settings saved successfully!')
    } catch (error: any) {
      console.error('Error saving settings:', error)
      alert(`Failed to save settings: ${error.message}`)
    } finally {
      setSavingSettings(false)
    }
  }

  const loadData = async () => {
    // Ensure guild context has fully loaded
    if (guildLoading) {
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/')
      return
    }
    setUser(user)

    // Check if officer using context
    if (!isOfficer) {
      router.push('/dashboard')
      return
    }

    if (!activeGuild || !activeMember) {
      setLoading(false)
      return
    }

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

    // Load raid tiers for filtering (only for active expansion)
    if (activeGuild.active_expansion_id) {
      const { data: tiersData } = await supabase
        .from('raid_tiers')
        .select('id, name')
        .eq('expansion_id', activeGuild.active_expansion_id)
        .eq('is_guild_active', true)
        .order('name')

      if (tiersData) {
        setRaidTiers(tiersData)
      }

      // Load all loot items
      await loadLootItems(activeGuild.active_expansion_id)
    }
    setLoading(false)
  }

  const loadLootItems = async (expansionId: string) => {
    // Get raid tiers for active expansion
    const { data: tiersData } = await supabase
      .from('raid_tiers')
      .select('id')
      .eq('expansion_id', expansionId)

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
        roles,
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
          console.error('❌ Error loading spec relations for batch:', specError)
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

      console.log('📊 Loaded', totalRelations, 'spec relations for', itemIds.length, 'items')
      console.log('✅ Organized specs for', Object.keys(specs).length, 'items')
      console.log('Sample item specs:', Object.values(specs).slice(0, 3).map(s => ({
        primary: Array.from(s.primary).length,
        secondary: Array.from(s.secondary).length
      })))

      setItemSpecs(specs)
    }
  }

  const toggleAvailability = async (itemId: string, currentStatus: boolean) => {
    console.log('🔄 Toggling availability for item:', itemId, 'from', currentStatus, 'to', !currentStatus)

    // Check current auth state
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    console.log('Current user:', currentUser?.id, currentUser?.email)

    const { data, error } = await supabase
      .from('loot_items')
      .update({ is_available: !currentStatus })
      .eq('id', itemId)
      .select()

    if (error) {
      console.error('❌ Error toggling availability:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      alert(`Failed to update item availability: ${error.message}`)
      return
    }

    console.log('✅ Toggled availability for item', itemId, 'Result:', data)
    setLootItems(items => items.map(item =>
      item.id === itemId ? { ...item, is_available: !currentStatus } : item
    ))
  }

  const updateClassification = async (itemId: string, classification: string) => {
    console.log('🔄 Updating classification for item:', itemId, 'to', classification)
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
      console.error('❌ Error updating classification:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      alert(`Failed to update item classification: ${error.message}`)
      return
    }

    console.log('✅ Updated classification for item', itemId, 'to', classification, 'Result:', data)
    setLootItems(items => items.map(item =>
      item.id === itemId ? { ...item, classification, allocation_cost: allocationCost } : item
    ))
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

    // Remove from opposite type if it exists there
    const oppositeType = specType === 'primary' ? 'secondary' : 'primary'
    if (currentSpecs[oppositeType].has(specIdOrRole)) {
      await removeSpec(itemId, specIdOrRole, oppositeType)
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
      console.error('❌ Error adding spec:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      alert(`Failed to add spec: ${error.message}`)
      return
    }

    console.log(`✅ Added ${specType} spec ${specIdOrRole} to item ${itemId}`)

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
    const { getSpecsForRole } = await import('@/utils/spec-role-mapping')
    const roleSpecNames = getSpecsForRole(role)

    // Find the spec IDs that match these spec names (using combined_name)
    const specsToAdd = classSpecs.filter(spec =>
      roleSpecNames.includes(spec.combined_name || spec.name)
    )

    // Get current specs to avoid duplicates
    const currentSpecs = itemSpecs[itemId]?.[specType] || new Set()

    // Check opposite type for conflicts
    const oppositeType = specType === 'primary' ? 'secondary' : 'primary'
    const oppositeSpecs = itemSpecs[itemId]?.[oppositeType] || new Set()

    // Remove specs from opposite type if they exist there
    const specsInOpposite = specsToAdd.filter(spec => oppositeSpecs.has(spec.id))
    if (specsInOpposite.length > 0) {
      const { error: deleteError } = await supabase
        .from('loot_item_classes')
        .delete()
        .eq('loot_item_id', itemId)
        .eq('spec_type', oppositeType)
        .in('spec_id', specsInOpposite.map(s => s.id))

      if (deleteError) {
        console.error('Error removing conflicting specs:', {
          message: deleteError.message,
          details: deleteError.details
        })
      }
    }

    // Only insert specs that aren't already in this type
    const specsToInsert = specsToAdd
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

    // Update local state - add all role specs (not just newly inserted ones)
    const allRoleSpecIds = new Set(specsToAdd.map(s => s.id))

    setItemSpecs(prev => {
      const prevItemSpecs = prev[itemId] || { primary: new Set(), secondary: new Set() }
      const updatedSpecs = new Set(prevItemSpecs[specType])
      allRoleSpecIds.forEach(id => updatedSpecs.add(id))

      // Remove specs from opposite type
      const updatedOppositeSpecs = new Set(prevItemSpecs[oppositeType])
      specsInOpposite.forEach(spec => updatedOppositeSpecs.delete(spec.id))

      return {
        ...prev,
        [itemId]: {
          primary: specType === 'primary' ? updatedSpecs : updatedOppositeSpecs,
          secondary: specType === 'secondary' ? updatedSpecs : updatedOppositeSpecs
        }
      }
    })
  }

  // Add all specs to an item
  const addAllSpecs = async (itemId: string, specType: 'primary' | 'secondary') => {
    // Get current specs to avoid duplicates
    const currentSpecs = itemSpecs[itemId]?.[specType] || new Set()

    // Check opposite type - need to clear all from opposite
    const oppositeType = specType === 'primary' ? 'secondary' : 'primary'

    // Delete all specs from opposite type
    const { error: deleteError } = await supabase
      .from('loot_item_classes')
      .delete()
      .eq('loot_item_id', itemId)
      .eq('spec_type', oppositeType)

    if (deleteError) {
      console.error('Error removing conflicting specs:', {
        message: deleteError.message,
        details: deleteError.details
      })
    }

    // Only insert specs that aren't already in this type
    const specsToInsert = classSpecs
      .filter(spec => !currentSpecs.has(spec.id))
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

    // Update local state with ALL specs for this type
    const allSpecIds = new Set(classSpecs.map(s => s.id))

    setItemSpecs(prev => {
      const prevItemSpecs = prev[itemId] || { primary: new Set(), secondary: new Set() }
      return {
        ...prev,
        [itemId]: {
          primary: specType === 'primary' ? allSpecIds : new Set(),
          secondary: specType === 'secondary' ? allSpecIds : new Set()
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
      console.error('❌ Error removing spec:', {
        message: error.message,
        details: error.details,
        code: error.code
      })
      alert(`Failed to remove spec: ${error.message}`)
      return
    }

    console.log(`✅ Removed ${specType} spec ${specIdOrRole} from item ${itemId}`)

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
    const { getSpecsForRole } = await import('@/utils/spec-role-mapping')
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
    const { getSpecsForRole } = require('@/utils/spec-role-mapping')

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
      'tank': 'All Tanks',
      'healer': 'All Healers',
      'physical': 'All Physical DPS',
      'caster': 'All Caster DPS'
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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <ExpansionGuard>
      <div className="p-8 space-y-6 font-poppins">
        {/* Header with Settings Button */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[42px] font-bold text-white leading-tight">Master Loot</h1>
            <p className="text-[#666] mt-1 text-[14px]">Manage loot items and configure classifications</p>
          </div>
          <button
            onClick={() => setShowSettingsModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-[#151515] hover:bg-[#1a1a1a] border border-[rgba(255,255,255,0.1)] rounded-[52px] text-white text-base font-medium transition whitespace-nowrap"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Loot System Settings
          </button>
        </div>

        {/* Filters */}
        <div className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <div>
              <label className="block text-[12px] font-medium text-[#666] mb-2">Search Items</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or boss..."
                className="w-full px-4 py-2 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-[12px] focus:outline-none focus:border-[#ff8000]"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[#666] mb-2">Raid</label>
              <select
                value={filterTier}
                onChange={(e) => setFilterTier(e.target.value)}
                className="w-full px-4 py-2 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-[12px] focus:outline-none focus:border-[#ff8000] cursor-pointer select-custom-sm"
              >
                <option value="all" className="bg-[#151515] text-white">All Raids</option>
                {raidTiers.map(tier => (
                  <option key={tier.id} value={tier.name} className="bg-[#151515] text-white">{tier.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[#666] mb-2">Slot</label>
              <select
                value={filterSlot}
                onChange={(e) => setFilterSlot(e.target.value)}
                className="w-full px-4 py-2 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-[12px] focus:outline-none focus:border-[#ff8000] cursor-pointer select-custom-sm"
              >
                <option value="all" className="bg-[#151515] text-white">All Slots</option>
                {uniqueSlots.map(slot => (
                  <option key={slot} value={slot} className="bg-[#151515] text-white">{slot}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[#666] mb-2">Classification</label>
              <select
                value={filterClassification}
                onChange={(e) => setFilterClassification(e.target.value)}
                className="w-full px-4 py-2 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-[12px] focus:outline-none focus:border-[#ff8000] cursor-pointer select-custom-sm"
              >
                <option value="all" className="bg-[#151515] text-white">All Classifications</option>
                <option value="Reserved" className="bg-[#151515]" style={{ color: '#E57373' }}>Reserved</option>
                <option value="Limited" className="bg-[#151515]" style={{ color: '#64B5F6' }}>Limited</option>
                <option value="Unlimited" className="bg-[#151515]" style={{ color: '#B0B0B0' }}>Unlimited</option>
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[#666] mb-2">Sort By</label>
              <select
                value={sortField || ''}
                onChange={(e) => setSortField(e.target.value as any || null)}
                className="w-full px-4 py-2 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-[12px] focus:outline-none focus:border-[#ff8000] cursor-pointer select-custom-sm"
              >
                <option value="" className="bg-[#151515] text-white">Default</option>
                <option value="name" className="bg-[#151515] text-white">Item Name</option>
                <option value="boss" className="bg-[#151515] text-white">Boss</option>
                <option value="slot" className="bg-[#151515] text-white">Slot</option>
                <option value="raid" className="bg-[#151515] text-white">Raid</option>
                <option value="classification" className="bg-[#151515] text-white">Classification</option>
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[#666] mb-2">Order</label>
              <select
                value={sortDirection}
                onChange={(e) => setSortDirection(e.target.value as 'asc' | 'desc')}
                disabled={!sortField}
                className="w-full px-4 py-2 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-[12px] focus:outline-none focus:border-[#ff8000] cursor-pointer select-custom-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="asc" className="bg-[#151515] text-white">A → Z</option>
                <option value="desc" className="bg-[#151515] text-white">Z → A</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl p-4">
            <p className="text-[#666] text-sm">Total Items</p>
            <p className="text-2xl font-bold text-white">{filteredItems.length}</p>
          </div>
          <div className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl p-4">
            <p className="text-[#666] text-sm">Available</p>
            <p className="text-2xl font-bold text-green-400">
              {filteredItems.filter(i => i.is_available).length}
            </p>
          </div>
          <div className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl p-4">
            <p className="text-[#666] text-sm">Reserved</p>
            <p className="text-2xl font-bold text-red-400">
              {filteredItems.filter(i => i.classification === 'Reserved').length}
            </p>
          </div>
          <div className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl p-4">
            <p className="text-[#666] text-sm">Limited</p>
            <p className="text-2xl font-bold text-yellow-400">
              {filteredItems.filter(i => i.classification === 'Limited').length}
            </p>
          </div>
        </div>

        {/* Items Table */}
        <div className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl overflow-hidden">
          <div>
            <table className="w-full table-fixed">
              <colgroup>
                <col style={{ width: '50px' }} />
                <col style={{ width: '200px' }} />
                <col style={{ width: '120px' }} />
                <col style={{ width: '80px' }} />
                <col style={{ width: '100px' }} />
                <col style={{ width: '150px' }} />
                <col style={{ width: '220px' }} />
                <col style={{ width: '220px' }} />
              </colgroup>
              <thead>
                <tr className="bg-[#0d0e11] border-b border-[rgba(255,255,255,0.05)]">
                  <th className="px-4 py-2.5 text-left text-[12px] font-medium text-[#666]">On</th>
                  <th className="px-4 py-2.5 text-left text-[12px] font-medium text-[#666]">Item Name</th>
                  <th className="px-4 py-2.5 text-left text-[12px] font-medium text-[#666]">Boss</th>
                  <th className="px-4 py-2.5 text-left text-[12px] font-medium text-[#666]">Slot</th>
                  <th className="px-4 py-2.5 text-left text-[12px] font-medium text-[#666]">Raid</th>
                  <th className="px-4 py-2.5 text-left text-[12px] font-medium text-[#666]">Classification</th>
                  <th className="px-4 py-2.5 text-left text-[12px] font-medium text-[#666]">Primary</th>
                  <th className="px-4 py-2.5 text-left text-[12px] font-medium text-[#666]">Secondary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(255,255,255,0.05)]">
                {paginatedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-[#1a1a1a]/50">
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => toggleAvailability(item.id, item.is_available)}
                        className={`w-4 h-4 rounded ${
                          item.is_available
                            ? 'bg-green-600 hover:bg-green-700'
                            : 'bg-[#2a2a2a] hover:bg-[#333333]'
                        } flex items-center justify-center`}
                      >
                        {item.is_available && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-2.5 text-[13px] text-white">
                      <div className="truncate overflow-hidden">
                        <ItemLink name={item.name} wowheadId={item.wowhead_id} />
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-[12px] text-[#666]">
                      <div className="truncate">{item.boss_name}</div>
                    </td>
                    <td className="px-4 py-2.5 text-[12px] text-[#666]">
                      <div className="truncate">{item.item_slot}</div>
                    </td>
                    <td className="px-4 py-2.5 text-[12px] text-[#666]">
                      <div className="truncate">{(item.raid_tier as any)?.name}</div>
                    </td>
                    <td className="px-4 py-2.5">
                      <select
                        value={item.classification}
                        onChange={(e) => updateClassification(item.id, e.target.value)}
                        className="w-full px-3 py-2 bg-[#151515] border border-[#383838] rounded-[52px] focus:outline-none focus:border-[#ff8000] transition-colors cursor-pointer appearance-none flex items-center text-[12px] font-medium"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                          backgroundPosition: 'right 0.5rem center',
                          backgroundRepeat: 'no-repeat',
                          backgroundSize: '1em 1em',
                          paddingRight: '2rem',
                          color: item.classification === 'Reserved' ? '#E57373' :
                                 item.classification === 'Limited' ? '#64B5F6' :
                                 item.classification === 'Unlimited' ? '#B0B0B0' :
                                 '#ffffff'
                        }}
                      >
                        <option value="Reserved" className="bg-[#151515]" style={{ color: '#E57373' }}>Reserved</option>
                        <option value="Limited" className="bg-[#151515]" style={{ color: '#64B5F6' }}>Limited</option>
                        <option value="Unlimited" className="bg-[#151515]" style={{ color: '#B0B0B0' }}>Unlimited</option>
                      </select>
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
                              { id: 'all', label: 'All Specs/Roles', isRoleGroup: true },
                              { id: 'role:tank', label: 'All Tanks', isRoleGroup: true },
                              { id: 'role:healer', label: 'All Healers', isRoleGroup: true },
                              { id: 'role:physical', label: 'All Physical DPS', isRoleGroup: true },
                              { id: 'role:caster', label: 'All Caster DPS', isRoleGroup: true }
                            ]
                          },
                          {
                            label: 'Individual Specs',
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
                              { id: 'all', label: 'All Specs/Roles', isRoleGroup: true },
                              { id: 'role:tank', label: 'All Tanks', isRoleGroup: true },
                              { id: 'role:healer', label: 'All Healers', isRoleGroup: true },
                              { id: 'role:physical', label: 'All Physical DPS', isRoleGroup: true },
                              { id: 'role:caster', label: 'All Caster DPS', isRoleGroup: true }
                            ]
                          },
                          {
                            label: 'Individual Specs',
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {filteredItems.length > 0 && (
            <div className="flex items-center justify-between px-4 py-6 bg-[#0d0e11] border-t border-[rgba(255,255,255,0.05)]">
              {/* Left: Results display */}
              <div className="text-[12px] text-[#666]">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredItems.length)} of {filteredItems.length} results
              </div>

              {/* Center: Page navigation */}
              {totalPages > 1 && (
                <div className="flex items-center gap-6">
                  {/* Previous Button */}
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="flex items-center justify-center w-9 h-9 rounded-md bg-[#151515] border border-[#383838] text-white hover:bg-[#1a1a1a] hover:border-[#ff8000] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-[#151515] disabled:hover:border-[#383838] transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>

                  {/* Page Numbers */}
                  <div className="flex items-center gap-2">
                    {(() => {
                      const pageNumbers = []
                      const showEllipsisStart = currentPage > 3
                      const showEllipsisEnd = currentPage < totalPages - 2

                      // Always show first page
                      pageNumbers.push(
                        <button
                          key={1}
                          onClick={() => setCurrentPage(1)}
                          className={`flex items-center justify-center min-w-[36px] h-9 px-3 rounded-md text-sm font-medium transition-colors ${
                            currentPage === 1
                              ? 'bg-[#ff8000] text-white border border-[#ff8000]'
                              : 'bg-[#151515] text-[#666] border border-[#383838] hover:bg-[#1a1a1a] hover:border-[#ff8000] hover:text-white'
                          }`}
                        >
                          1
                        </button>
                      )

                      // Ellipsis after first page
                      if (showEllipsisStart) {
                        pageNumbers.push(
                          <span key="ellipsis-start" className="text-[#666] px-2">...</span>
                        )
                      }

                      // Pages around current page
                      const startPage = Math.max(2, currentPage - 1)
                      const endPage = Math.min(totalPages - 1, currentPage + 1)

                      for (let i = startPage; i <= endPage; i++) {
                        pageNumbers.push(
                          <button
                            key={i}
                            onClick={() => setCurrentPage(i)}
                            className={`flex items-center justify-center min-w-[36px] h-9 px-3 rounded-md text-sm font-medium transition-colors ${
                              currentPage === i
                                ? 'bg-[#ff8000] text-white border border-[#ff8000]'
                                : 'bg-[#151515] text-[#666] border border-[#383838] hover:bg-[#1a1a1a] hover:border-[#ff8000] hover:text-white'
                            }`}
                          >
                            {i}
                          </button>
                        )
                      }

                      // Ellipsis before last page
                      if (showEllipsisEnd) {
                        pageNumbers.push(
                          <span key="ellipsis-end" className="text-[#666] px-2">...</span>
                        )
                      }

                      // Always show last page if there's more than 1 page
                      if (totalPages > 1) {
                        pageNumbers.push(
                          <button
                            key={totalPages}
                            onClick={() => setCurrentPage(totalPages)}
                            className={`flex items-center justify-center min-w-[36px] h-9 px-3 rounded-md text-sm font-medium transition-colors ${
                              currentPage === totalPages
                                ? 'bg-[#ff8000] text-white border border-[#ff8000]'
                                : 'bg-[#151515] text-[#666] border border-[#383838] hover:bg-[#1a1a1a] hover:border-[#ff8000] hover:text-white'
                            }`}
                          >
                            {totalPages}
                          </button>
                        )
                      }

                      return pageNumbers
                    })()}
                  </div>

                  {/* Next Button */}
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="flex items-center justify-center w-9 h-9 rounded-md bg-[#151515] border border-[#383838] text-white hover:bg-[#1a1a1a] hover:border-[#ff8000] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-[#151515] disabled:hover:border-[#383838] transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Right: Rows per page */}
              <div className="flex items-center gap-3">
                <span className="text-sm text-[#666]">Rows per page:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="px-4 py-2 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-[13px] focus:outline-none focus:border-[#ff8000] cursor-pointer select-custom"
                >
                  <option value={25} className="bg-[#151515]">25</option>
                  <option value={50} className="bg-[#151515]">50</option>
                  <option value={100} className="bg-[#151515]">100</option>
                  <option value={200} className="bg-[#151515]">200</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-12 text-[#666]">
            No items found matching your filters
          </div>
        )}
      </div>

      {/* Loot System Settings Modal */}
      {showSettingsModal && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowSettingsModal(false)}
        >
          <div
            className="bg-[#0d0e11] border border-[#383838] rounded-xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-[#383838] flex items-center justify-between bg-[#141519]">
              <h3 className="text-[24px] font-bold text-white">Loot system settings</h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-[#666] hover:text-white transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-6 overflow-y-auto">
              {/* General Settings */}
              <div className="space-y-4 pb-6 border-b border-[#383838]">
                <div>
                  <h4 className="text-[18px] font-semibold text-white pb-2">General Settings</h4>
                  <p className="text-[#8a8d94] text-[13px] mt-1">Configure your guild's raid schedule and how loot priority points are calculated and displayed. These settings establish the foundation for your loot system.</p>
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-white mb-2">Date of 1st Full Raid Week (Reset Day)</label>
                  <div className="relative date-picker-wrapper">
                    <input
                      type="date"
                      value={settings.reset_date}
                      onChange={(e) => setSettings({ ...settings, reset_date: e.target.value })}
                      className="date-picker-input w-full px-4 py-2.5 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-[13px] focus:outline-none focus:border-[#ff8000] hover:bg-[#1a1a1a] transition-colors cursor-pointer [color-scheme:dark]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-white mb-2">Number of Raid Days a Week</label>
                  <select
                    value={settings.raid_days_per_week}
                    onChange={(e) => setSettings({ ...settings, raid_days_per_week: Number(e.target.value) })}
                    className="w-full pl-4 pr-12 py-2 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-[13px] focus:outline-none focus:border-[#ff8000] transition-colors select-custom-sm"
                  >
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5</option>
                  </select>
                </div>

                {/* Show raid day selections in 2-column grid */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Always show 1st raid day */}
                  <div>
                    <label className="block text-[13px] font-medium text-white mb-2">1st Raid Day of the Week</label>
                    <select
                      value={settings.first_raid_day}
                      onChange={(e) => setSettings({ ...settings, first_raid_day: Number(e.target.value) })}
                      className="w-full pl-4 pr-12 py-2 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-[13px] focus:outline-none focus:border-[#ff8000] transition-colors select-custom-sm"
                    >
                      <option value="0">Sunday</option>
                      <option value="1">Monday</option>
                      <option value="2">Tuesday</option>
                      <option value="3">Wednesday</option>
                      <option value="4">Thursday</option>
                      <option value="5">Friday</option>
                      <option value="6">Saturday</option>
                    </select>
                  </div>

                  {/* Show 2nd raid day if >= 2 */}
                  {settings.raid_days_per_week >= 2 && (
                    <div>
                      <label className="block text-[13px] font-medium text-white mb-2">2nd Raid Day of the Week</label>
                      <select
                        value={settings.second_raid_day?.toString() || ''}
                        onChange={(e) => setSettings({ ...settings, second_raid_day: e.target.value ? Number(e.target.value) : null })}
                        className="w-full pl-4 pr-12 py-2 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-[13px] focus:outline-none focus:border-[#ff8000] transition-colors select-custom-sm"
                      >
                        <option value="">None</option>
                        <option value="0">Sunday</option>
                        <option value="1">Monday</option>
                        <option value="2">Tuesday</option>
                        <option value="3">Wednesday</option>
                        <option value="4">Thursday</option>
                        <option value="5">Friday</option>
                        <option value="6">Saturday</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Show 3rd and 4th raid days if >= 3 */}
                {settings.raid_days_per_week >= 3 && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[13px] font-medium text-white mb-2">3rd Raid Day of the Week</label>
                      <select
                        value={settings.third_raid_day?.toString() || ''}
                        onChange={(e) => setSettings({ ...settings, third_raid_day: e.target.value ? Number(e.target.value) : null })}
                        className="w-full pl-4 pr-12 py-2 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-[13px] focus:outline-none focus:border-[#ff8000] transition-colors select-custom-sm"
                      >
                        <option value="">None</option>
                        <option value="0">Sunday</option>
                        <option value="1">Monday</option>
                        <option value="2">Tuesday</option>
                        <option value="3">Wednesday</option>
                        <option value="4">Thursday</option>
                        <option value="5">Friday</option>
                        <option value="6">Saturday</option>
                      </select>
                    </div>

                    {/* Show 4th raid day if >= 4 */}
                    {settings.raid_days_per_week >= 4 && (
                      <div>
                        <label className="block text-[13px] font-medium text-white mb-2">4th Raid Day of the Week</label>
                        <select
                          value={settings.fourth_raid_day?.toString() || ''}
                          onChange={(e) => setSettings({ ...settings, fourth_raid_day: e.target.value ? Number(e.target.value) : null })}
                          className="w-full pl-4 pr-12 py-2 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-[13px] focus:outline-none focus:border-[#ff8000] transition-colors select-custom-sm"
                        >
                          <option value="">None</option>
                          <option value="0">Sunday</option>
                          <option value="1">Monday</option>
                          <option value="2">Tuesday</option>
                          <option value="3">Wednesday</option>
                          <option value="4">Thursday</option>
                          <option value="5">Friday</option>
                          <option value="6">Saturday</option>
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {/* Show 5th raid day if >= 5 */}
                {settings.raid_days_per_week >= 5 && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[13px] font-medium text-white mb-2">5th Raid Day of the Week</label>
                      <select
                        value={settings.fifth_raid_day?.toString() || ''}
                        onChange={(e) => setSettings({ ...settings, fifth_raid_day: e.target.value ? Number(e.target.value) : null })}
                        className="w-full pl-4 pr-12 py-2 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-[13px] focus:outline-none focus:border-[#ff8000] transition-colors select-custom-sm"
                      >
                        <option value="">None</option>
                        <option value="0">Sunday</option>
                        <option value="1">Monday</option>
                        <option value="2">Tuesday</option>
                        <option value="3">Wednesday</option>
                        <option value="4">Thursday</option>
                        <option value="5">Friday</option>
                        <option value="6">Saturday</option>
                      </select>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[13px] font-medium text-white mb-2">Decimal Places</label>
                  <select
                    value={settings.decimal_places}
                    onChange={(e) => setSettings({ ...settings, decimal_places: Number(e.target.value) })}
                    className="w-full pl-4 pr-12 py-2 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-[13px] focus:outline-none focus:border-[#ff8000] transition-colors select-custom-sm"
                  >
                    <option value="0">Ones</option>
                    <option value="1">Tenths</option>
                    <option value="2">Hundredths</option>
                  </select>
                </div>
              </div>

              {/* Attendance Settings */}
              <div className="space-y-4 pb-6 border-b border-[#383838]">
                <div>
                  <h4 className="text-[18px] font-semibold text-white pb-2">Attendance</h4>
                  <p className="text-[#8a8d94] text-[13px] mt-1">Control how attendance bonuses are calculated and awarded. Rewards consistent raiders while allowing flexibility for signups and absences. Set thresholds and penalties to match your guild's raiding culture.</p>
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-white mb-2">Type of Attendance Bonus</label>
                  <select
                    value={settings.attendance_type}
                    onChange={(e) => setSettings({ ...settings, attendance_type: e.target.value as 'linear' | 'breakpoint' })}
                    className="w-full pl-4 pr-12 py-2 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-[13px] focus:outline-none focus:border-[#ff8000] transition-colors select-custom-sm"
                  >
                    <option value="linear">Linear</option>
                    <option value="breakpoint">Break Point</option>
                  </select>
                  <p className="text-[#8a8d94] text-[12px] mt-1">Choose how attendance bonus scales</p>
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-white mb-2">Rolling Attendance Period (Weeks)</label>
                  <input
                    type="number"
                    min="1"
                    value={settings.rolling_attendance_weeks}
                    onChange={(e) => setSettings({ ...settings, rolling_attendance_weeks: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-[13px] focus:outline-none focus:border-[#ff8000] transition-colors"
                  />
                  <p className="text-[#8a8d94] text-[12px] mt-1">How long of a period to track attendance points</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[13px] font-medium text-white mb-2">Use Raid Signups for Attendance</label>
                    <select
                      value={settings.use_signups ? 'yes' : 'no'}
                      onChange={(e) => setSettings({ ...settings, use_signups: e.target.value === 'yes' })}
                      className="w-full pl-4 pr-12 py-2 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-[13px] focus:outline-none focus:border-[#ff8000] transition-colors select-custom-sm"
                    >
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-white mb-2">Signup % of Attendance (Decimal)</label>
                    <input
                      type="number"
                      min="0"
                      max="1"
                      step="0.05"
                      value={settings.signup_weight}
                      onChange={(e) => setSettings({ ...settings, signup_weight: Number(e.target.value) })}
                      disabled={!settings.use_signups}
                      className="w-full pl-4 pr-12 py-2 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-[13px] focus:outline-none focus:border-[#ff8000] transition-colors select-custom-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[#0a0a0a]"
                    />
                  </div>
                </div>

                <div className="bg-[#151515] border border-[#383838] p-4 rounded-xl space-y-3">
                  <p className="text-[13px] font-medium text-white">Attendance Bonus Tiers</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[12px] text-[#8a8d94] mb-1">Max Attendance</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={settings.max_attendance_bonus}
                          onChange={(e) => setSettings({ ...settings, max_attendance_bonus: Number(e.target.value) })}
                          placeholder="Points"
                          className="w-full px-3 py-2 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-[12px] focus:outline-none focus:border-[#ff8000] transition-colors"
                        />
                        <input
                          type="number"
                          step="0.1"
                          value={settings.max_attendance_threshold}
                          onChange={(e) => setSettings({ ...settings, max_attendance_threshold: Number(e.target.value) })}
                          placeholder="Threshold"
                          className="w-full px-3 py-2 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-[12px] focus:outline-none focus:border-[#ff8000] transition-colors"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[12px] text-[#8a8d94] mb-1">Middle Attendance</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={settings.middle_attendance_bonus}
                          onChange={(e) => setSettings({ ...settings, middle_attendance_bonus: Number(e.target.value) })}
                          placeholder="Points"
                          className="w-full px-3 py-2 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-[12px] focus:outline-none focus:border-[#ff8000] transition-colors"
                        />
                        <input
                          type="number"
                          step="0.1"
                          value={settings.middle_attendance_threshold}
                          onChange={(e) => setSettings({ ...settings, middle_attendance_threshold: Number(e.target.value) })}
                          placeholder="Threshold"
                          className="w-full px-3 py-2 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-[12px] focus:outline-none focus:border-[#ff8000] transition-colors"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[12px] text-[#8a8d94] mb-1">Bottom Attendance</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={settings.bottom_attendance_bonus}
                          onChange={(e) => setSettings({ ...settings, bottom_attendance_bonus: Number(e.target.value) })}
                          placeholder="Points"
                          className="w-full px-3 py-2 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-[12px] focus:outline-none focus:border-[#ff8000] transition-colors"
                        />
                        <input
                          type="number"
                          step="0.1"
                          value={settings.bottom_attendance_threshold}
                          onChange={(e) => setSettings({ ...settings, bottom_attendance_threshold: Number(e.target.value) })}
                          placeholder="Threshold"
                          className="w-full px-3 py-2 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-[12px] focus:outline-none focus:border-[#ff8000] transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[13px] font-medium text-white mb-2">Minimum Raid Days Per Week</label>
                    <select
                      value={settings.minimum_raid_days_enabled ? 'yes' : 'no'}
                      onChange={(e) => setSettings({ ...settings, minimum_raid_days_enabled: e.target.value === 'yes' })}
                      className="w-full pl-4 pr-12 py-2 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-[13px] focus:outline-none focus:border-[#ff8000] transition-colors select-custom-sm"
                    >
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-white mb-2">Minimum Number of Raids</label>
                    <input
                      type="number"
                      min="1"
                      value={settings.minimum_raid_days}
                      onChange={(e) => setSettings({ ...settings, minimum_raid_days: Number(e.target.value) })}
                      disabled={!settings.minimum_raid_days_enabled}
                      className="w-full px-4 py-2.5 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-[13px] focus:outline-none focus:border-[#ff8000] transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[#0a0a0a]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[13px] font-medium text-white mb-2">Late Show / Leave Early Penalty</label>
                    <select
                      value={settings.late_early_penalty_enabled ? 'yes' : 'no'}
                      onChange={(e) => setSettings({ ...settings, late_early_penalty_enabled: e.target.value === 'yes' })}
                      className="w-full pl-4 pr-12 py-2 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-[13px] focus:outline-none focus:border-[#ff8000] transition-colors select-custom-sm"
                    >
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-white mb-2">Penalty Value</label>
                    <input
                      type="number"
                      step="0.05"
                      value={settings.late_early_penalty_value}
                      onChange={(e) => setSettings({ ...settings, late_early_penalty_value: Number(e.target.value) })}
                      disabled={!settings.late_early_penalty_enabled}
                      className="w-full px-4 py-2.5 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-[13px] focus:outline-none focus:border-[#ff8000] transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[#0a0a0a]"
                    />
                  </div>
                </div>
              </div>

              {/* Bad Luck Prevention */}
              <div className="space-y-4 pb-6 border-b border-[#383838]">
                <div>
                  <h4 className="text-[18px] font-semibold text-white pb-2">Bad Luck Prevention</h4>
                  <p className="text-[#8a8d94] text-[13px] mt-1">Provide bonus points to raiders who experience bad RNG luck. Rewards players who see their desired items drop but lose the roll, or who generously pass on items to help others progress.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[13px] font-medium text-white mb-2">Bonus for Seeing Item but Not Receiving</label>
                    <select
                      value={settings.see_item_bonus ? 'yes' : 'no'}
                      onChange={(e) => setSettings({ ...settings, see_item_bonus: e.target.value === 'yes' })}
                      className="w-full pl-4 pr-12 py-2 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-[13px] focus:outline-none focus:border-[#ff8000] transition-colors select-custom-sm"
                    >
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-white mb-2">Bonus Value</label>
                    <input
                      type="number"
                      value={settings.see_item_bonus_value}
                      onChange={(e) => setSettings({ ...settings, see_item_bonus_value: Number(e.target.value) })}
                      disabled={!settings.see_item_bonus}
                      className="w-full px-4 py-2.5 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-[13px] focus:outline-none focus:border-[#ff8000] transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[#0a0a0a]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[13px] font-medium text-white mb-2">Bonus for Passing an Item</label>
                    <select
                      value={settings.pass_item_bonus ? 'yes' : 'no'}
                      onChange={(e) => setSettings({ ...settings, pass_item_bonus: e.target.value === 'yes' })}
                      className="w-full pl-4 pr-12 py-2 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-[13px] focus:outline-none focus:border-[#ff8000] transition-colors select-custom-sm"
                    >
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-white mb-2">Bonus Value</label>
                    <input
                      type="number"
                      value={settings.pass_item_bonus_value}
                      onChange={(e) => setSettings({ ...settings, pass_item_bonus_value: Number(e.target.value) })}
                      disabled={!settings.pass_item_bonus}
                      className="w-full px-4 py-2.5 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-[13px] focus:outline-none focus:border-[#ff8000] transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[#0a0a0a]"
                    />
                  </div>
                </div>
              </div>

              {/* Rank, Role, Class Bonuses */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-[18px] font-semibold text-white pb-2">Rank, Role, Class, or Raider Additional Bonuses</h4>
                  <p className="text-[#8a8d94] text-[13px] mt-1">Fine-tune priority systems to value guild rank, raid roles, class needs, or individual contributions. Use these settings to prioritize items for main tanks, reward long-term members, or incentivize donations and support roles.</p>
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-white mb-2">Guild Ranks Give Bonuses (Positive or Negative)</label>
                  <select
                    value={settings.guild_rank_bonuses_enabled ? 'yes' : 'no'}
                    onChange={(e) => setSettings({ ...settings, guild_rank_bonuses_enabled: e.target.value === 'yes' })}
                    className="w-full pl-4 pr-12 py-2 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-[13px] focus:outline-none focus:border-[#ff8000] transition-colors select-custom-sm"
                  >
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>

                {settings.guild_rank_bonuses_enabled && (
                  <div className="bg-[#151515] border border-[#383838] p-4 rounded-xl space-y-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[13px] font-medium text-white">Rank Bonuses</p>
                      <p className="text-[11px] text-[#8a8d94]">Can be positive or negative. For negative, use - before number (e.g., -1)</p>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {[...guildRoles].sort((a, b) => b.position - a.position).map((role) => (
                        <div key={role.name}>
                          <label className="block text-[12px] text-[#666] mb-1">{role.name}</label>
                          <input
                            type="number"
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
                            className="w-full px-3 py-2 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-[12px] focus:outline-none focus:border-[#ff8000] transition-colors"
                          />
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-[#ff8000] mt-2">
                      ⚠️ If "Yes" is selected, ensure you have assigned roles for each raider in the Master Loot sheet or calculations will not work.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[13px] font-medium text-white mb-2">Role Bonus Priority on Single Item</label>
                    <select
                      value={settings.role_bonus_priority_single_item ? 'yes' : 'no'}
                      onChange={(e) => setSettings({ ...settings, role_bonus_priority_single_item: e.target.value === 'yes' })}
                      className="w-full pl-4 pr-12 py-2 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-[13px] focus:outline-none focus:border-[#ff8000] transition-colors select-custom-sm"
                    >
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-white mb-2">Class Bonus Priority on Single Item</label>
                    <select
                      value={settings.class_bonus_priority_single_item ? 'yes' : 'no'}
                      onChange={(e) => setSettings({ ...settings, class_bonus_priority_single_item: e.target.value === 'yes' })}
                      className="w-full pl-4 pr-12 py-2 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-[13px] focus:outline-none focus:border-[#ff8000] transition-colors select-custom-sm"
                    >
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[13px] font-medium text-white mb-2">Raid Roles Overall Bonus Priority</label>
                    <select
                      value={settings.raid_roles_overall_bonus_priority ? 'yes' : 'no'}
                      onChange={(e) => setSettings({ ...settings, raid_roles_overall_bonus_priority: e.target.value === 'yes' })}
                      className="w-full pl-4 pr-12 py-2 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-[13px] focus:outline-none focus:border-[#ff8000] transition-colors select-custom-sm"
                    >
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-white mb-2">Single Raider Overall Bonus</label>
                    <select
                      value={settings.single_raider_overall_bonus ? 'yes' : 'no'}
                      onChange={(e) => setSettings({ ...settings, single_raider_overall_bonus: e.target.value === 'yes' })}
                      className="w-full pl-4 pr-12 py-2 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-[13px] focus:outline-none focus:border-[#ff8000] transition-colors select-custom-sm"
                    >
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-white mb-2">Single Raider Bonus on Single Item</label>
                  <select
                    value={settings.single_raider_bonus_single_item ? 'yes' : 'no'}
                    onChange={(e) => setSettings({ ...settings, single_raider_bonus_single_item: e.target.value === 'yes' })}
                    className="w-full pl-4 pr-12 py-2 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-[13px] focus:outline-none focus:border-[#ff8000] transition-colors select-custom-sm"
                  >
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[13px] font-medium text-white mb-2">Donation Bonuses</label>
                    <select
                      value={settings.donation_bonuses_enabled ? 'yes' : 'no'}
                      onChange={(e) => setSettings({ ...settings, donation_bonuses_enabled: e.target.value === 'yes' })}
                      className="w-full pl-4 pr-12 py-2 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-[13px] focus:outline-none focus:border-[#ff8000] transition-colors select-custom-sm"
                    >
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-white mb-2">Cap on Donation Points</label>
                    <select
                      value={settings.donation_cap_enabled ? 'yes' : 'no'}
                      onChange={(e) => setSettings({ ...settings, donation_cap_enabled: e.target.value === 'yes' })}
                      className="w-full pl-4 pr-12 py-2 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-[13px] focus:outline-none focus:border-[#ff8000] transition-colors select-custom-sm"
                    >
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-white mb-2">Donation Bonus Type</label>
                    <select
                      value={settings.donation_bonus_type}
                      onChange={(e) => setSettings({ ...settings, donation_bonus_type: e.target.value as 'permanent' | 'rolling' | 'hard-reset' })}
                      className="w-full pl-4 pr-12 py-2 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-[13px] focus:outline-none focus:border-[#ff8000] transition-colors select-custom-sm"
                    >
                      <option value="permanent">Permanent</option>
                      <option value="rolling">Rolling</option>
                      <option value="hard-reset">Hard Reset</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-[#383838] bg-[#141519] flex justify-end gap-3">
              <button
                onClick={() => setShowSettingsModal(false)}
                disabled={savingSettings}
                className="px-6 py-2.5 bg-[#151515] hover:bg-[#1a1a1a] border border-[#383838] rounded-[52px] text-white text-[13px] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={saveSettings}
                disabled={savingSettings}
                className="px-6 py-2.5 bg-white hover:bg-gray-100 rounded-[52px] text-black text-[13px] font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingSettings ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ExpansionGuard>
  )
}

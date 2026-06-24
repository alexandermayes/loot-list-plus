'use client'

import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Heading, Text, LabelText } from '@/components/ui/typography'
import { Skeleton } from '@/components/ui/skeletons'
import { Alert, AlertDescription } from '@/components/ui/alert'
import ReserveItemPicker from '@/app/components/ReserveItemPicker'
import ItemLink from '@/app/components/ItemLink'
import { HugeiconsIcon } from '@hugeicons/react'
import { Calendar03Icon, LockIcon, CheckmarkCircle01Icon, UserMultiple02Icon, DiscordIcon, Copy01Icon, Delete02Icon } from '@hugeicons/core-free-icons'
import { refreshWowheadTooltips } from '@/lib/wowhead'
import { getRaidIcon } from '@/utils/raidIcons'
import { canClassReserveItem } from '@/utils/wowClassRestrictions'
import { useNotification } from '@/app/contexts/NotificationContext'
import { useConfirm } from '@/components/ui/confirm-modal'
import ManagementToolbar from './components/ManagementToolbar'
import InlineSettingsEditor from './components/InlineSettingsEditor'
import Image from 'next/image'
import Link from 'next/link'

// Hardcoded WoW classes for the public form
const WOW_CLASSES = [
  { name: 'Warrior', color: '#C79C6E' },
  { name: 'Paladin', color: '#F58CBA' },
  { name: 'Hunter', color: '#ABD473' },
  { name: 'Rogue', color: '#FFF569' },
  { name: 'Priest', color: '#FFFFFF' },
  { name: 'Death Knight', color: '#C41E3A' },
  { name: 'Shaman', color: '#0070DE' },
  { name: 'Mage', color: '#69CCF0' },
  { name: 'Warlock', color: '#9482C9' },
  { name: 'Monk', color: '#00FF96' },
  { name: 'Druid', color: '#FF7D0A' },
]

// Which classes are available in which expansion. Used to filter the
// class picker on the join page so a TBC raid doesn't show Death Knight.
const CLASSIC_CLASSES = [
  'Druid', 'Hunter', 'Mage', 'Paladin', 'Priest', 'Rogue', 'Shaman', 'Warlock', 'Warrior',
]
const WRATH_CLASSES = [...CLASSIC_CLASSES, 'Death Knight']
const MOP_CLASSES = [...WRATH_CLASSES, 'Monk']

const EXPANSION_CLASSES: Record<string, string[]> = {
  'Classic': CLASSIC_CLASSES,
  'Classic WoW': CLASSIC_CLASSES,
  'The Burning Crusade': CLASSIC_CLASSES,
  'Wrath of the Lich King': WRATH_CLASSES,
  'Cataclysm': WRATH_CLASSES,
  'Mists of Pandaria': MOP_CLASSES,
}

const EXPANSION_SHORT_NAME: Record<string, string> = {
  'Classic': 'Classic',
  'Classic WoW': 'Classic',
  'The Burning Crusade': 'TBC',
  'Wrath of the Lich King': 'Wrath',
  'Cataclysm': 'Cata',
  'Mists of Pandaria': 'MoP',
}

// Supported specs per class, spanning Classic through Mists of Pandaria.
// A run can be for any of those expansions so we err on the side of
// including every spec that was available at some point.
const CLASS_SPECS: Record<string, string[]> = {
  Warrior: ['Arms', 'Fury', 'Protection'],
  Paladin: ['Holy', 'Protection', 'Retribution'],
  Hunter: ['Beast Mastery', 'Marksmanship', 'Survival'],
  Rogue: ['Assassination', 'Combat', 'Subtlety'],
  Priest: ['Discipline', 'Holy', 'Shadow'],
  'Death Knight': ['Blood', 'Frost', 'Unholy'],
  Shaman: ['Elemental', 'Enhancement', 'Restoration'],
  Mage: ['Arcane', 'Fire', 'Frost'],
  Warlock: ['Affliction', 'Demonology', 'Destruction'],
  Monk: ['Brewmaster', 'Mistweaver', 'Windwalker'],
  Druid: ['Balance', 'Feral', 'Guardian', 'Restoration'],
}

type UserCharacter = {
  id: string
  name: string
  class_name: string | null
  class_color: string | null
  spec_name: string | null
  is_main: boolean
}

type LootItem = {
  id: string
  name: string
  boss_name: string
  item_slot: string
  wowhead_id: number
  classification?: string
  armor_type?: string | null
  weapon_type?: string | null
}

type Submission = {
  id: string
  character_name: string
  character_class: string
  character_spec: string | null
  items: string[]
  created_at: string
}

type Award = {
  id: string
  loot_item_id: string
  character_name: string
  awarded_at: string
  notes: string | null
}

type RunData = {
  id: string
  title: string
  status: 'open' | 'locked' | 'completed'
  raid_at: string
  lock_at: string
  locked_at: string | null
  max_reserves: number
  max_reserves_per_item: number | null
  allow_duplicates: boolean
  enforce_class_restrictions: boolean
  visibility: string
  rules_note: string | null
  discord_invite_url: string | null
  hard_reserves: Array<{ loot_item_id: string; reserved_for?: string }>
  raid_tier_name: string | null
  expansion_name: string | null
  guild_name: string | null
}

const STATUS_LABELS: Record<string, { text: string; className: string }> = {
  open: { text: 'Open for reserves', className: 'bg-success/10 text-success border-success/20' },
  locked: { text: 'Reserves locked', className: 'bg-warning/10 text-warning border-warning/20' },
  completed: { text: 'Completed', className: 'bg-muted text-muted-foreground border-border' },
}

interface PickerOption {
  value: string
  label: string
  color?: string
}

/**
 * Minimal custom dropdown that supports per-option colors. Native
 * <select> ignores CSS on <option>, so we roll our own just for
 * class/spec pickers where we want WoW class colors to come through.
 */
function ColoredPicker({
  options,
  value,
  onChange,
  placeholder,
  disabled = false,
}: {
  options: PickerOption[]
  value: string
  onChange: (value: string) => void
  placeholder: string
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  const selected = options.find((o) => o.value === value)

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 h-11 px-4 rounded-xl border border-border-strong bg-background-elevated text-[13px] text-foreground hover:border-border hover:bg-muted focus:outline-none focus:border-accent transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      >
        {selected ? (
          <span
            className="font-medium truncate"
            style={selected.color ? { color: selected.color } : undefined}
          >
            {selected.label}
          </span>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
        <svg
          className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-background-elevated border border-border-strong rounded-xl shadow-lg overflow-hidden max-h-72 overflow-y-auto">
          {options.map((opt) => {
            const isSelected = opt.value === value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value)
                  setOpen(false)
                }}
                className={`w-full flex items-center gap-2 px-4 py-2.5 text-left text-[13px] hover:bg-muted transition-colors ${isSelected ? 'bg-muted' : ''}`}
                style={opt.color ? { color: opt.color } : undefined}
              >
                <span className="font-medium flex-1 truncate">{opt.label}</span>
                {isSelected && (
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function ReserveJoinPage() {
  const { token } = useParams<{ token: string }>()
  const { showNotification } = useNotification()
  const { confirm, ConfirmDialog } = useConfirm()

  const [run, setRun] = useState<RunData | null>(null)
  const [items, setItems] = useState<LootItem[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [awards, setAwards] = useState<Award[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  // Snapshot of what was actually persisted on the server, so the
  // confirmation card doesn't drift when the user starts editing.
  const [submittedItemIds, setSubmittedItemIds] = useState<string[]>([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [copied, setCopied] = useState(false)

  // Management state
  const [canManage, setCanManage] = useState(false)
  const [leaderToken, setLeaderToken] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Reserve board view toggle. Defaults to item-grouped when the run
  // is locked (contested items are the point), player-grouped otherwise.
  const [boardView, setBoardView] = useState<'item' | 'player'>('item')

  // Form state
  const [characterName, setCharacterName] = useState('')
  const [characterClass, setCharacterClass] = useState('')
  const [characterSpec, setCharacterSpec] = useState('')
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([])

  // Logged-in users get their characters for this guild pre-fetched
  // from the API. When this list is non-empty we show a character picker
  // and submit with character_id instead of freeform name/class/spec.
  const [userCharacters, setUserCharacters] = useState<UserCharacter[]>([])
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>('')
  // Escape hatch: lets a logged-in user submit as a raid alt that isn't
  // tracked in LootList+. Clears selectedCharacterId so POST treats it
  // as a guest submission (no character_id link).
  const [useGuestCharacter, setUseGuestCharacter] = useState(false)

  // Auth-aware header: logged-in users get a mini profile card that links
  // to the app's reserve page, anonymous visitors get a login button.
  const [homeHref, setHomeHref] = useState('/')
  const [authUser, setAuthUser] = useState<{
    displayName: string
    avatarUrl: string | null
  } | null>(null)
  useEffect(() => {
    const supabase = createClient()
    // client.js is untyped so we get `any` here — fine for this lookup
    type AuthResult = {
      data: {
        user: {
          email?: string | null
          user_metadata?: {
            custom_claims?: { global_name?: string }
            full_name?: string
            avatar_url?: string
            provider_id?: string
          } | null
        } | null
      }
    }
    supabase.auth.getUser().then((result: AuthResult) => {
      const user = result.data.user
      if (!user) {
        setHomeHref('/')
        setAuthUser(null)
        return
      }
      const meta = user.user_metadata || {}
      const displayName =
        meta.custom_claims?.global_name ||
        meta.full_name ||
        user.email ||
        'Account'
      let avatarUrl: string | null = null
      if (meta.avatar_url) {
        avatarUrl = meta.avatar_url.startsWith('http')
          ? meta.avatar_url
          : `https://cdn.discordapp.com/avatars/${meta.provider_id}/${meta.avatar_url}.png`
      }
      setHomeHref('/reserve')
      setAuthUser({ displayName, avatarUrl })
    })
  }, [])

  const loginHref = `/?next=${encodeURIComponent(`/reserve/join/${token}`)}`

  // Leader token detection: from URL params or localStorage
  useEffect(() => {
    const storageKey = `reserve_leader_token_${token}`
    try {
      const params = new URLSearchParams(window.location.search)
      const fromUrl = params.get('leader_token')
      if (fromUrl) {
        setLeaderToken(fromUrl)
        localStorage.setItem(storageKey, fromUrl)
        // Clean the URL
        const url = new URL(window.location.href)
        url.searchParams.delete('leader_token')
        window.history.replaceState({}, '', url.toString())
        return
      }
      const stored = localStorage.getItem(storageKey)
      if (stored) setLeaderToken(stored)
    } catch {}
  }, [token])

  // Centralized fetch that attaches the leader token header
  const authedFetch = useCallback(
    (input: string, init: RequestInit = {}) => {
      const headers = new Headers(init.headers)
      if (leaderToken) headers.set('x-reserve-leader-token', leaderToken)
      return fetch(input, { ...init, headers })
    },
    [leaderToken]
  )

  // Load saved character from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('lootlist_reserve_character')
    if (saved) {
      try {
        const { name, class: cls } = JSON.parse(saved)
        if (name) setCharacterName(name)
        if (cls) setCharacterClass(cls)
      } catch {}
    }
  }, [])

  // Fetch run data
  const reloadRun = useCallback(async () => {
    try {
      const res = await authedFetch(`/api/reserve-runs/join/${token}`)
      const data = await res.json()
      if (data.success) {
        setRun(data.run)
        setItems(data.items || [])
        setSubmissions(data.submissions || [])
        setAwards(data.awards || [])
        setCanManage(!!data.can_manage)
      }
    } catch {}
  }, [token, authedFetch])

  // Auto-poll for new submissions every 15 seconds while the run is open
  useEffect(() => {
    if (!run || run.status !== 'open') return
    const interval = setInterval(reloadRun, 15_000)
    return () => clearInterval(interval)
  }, [run?.status, reloadRun])

  useEffect(() => {
    const load = async () => {
      try {
        const res = await authedFetch(`/api/reserve-runs/join/${token}`)
        const data = await res.json()
        if (data.success) {
          setRun(data.run)
          setItems(data.items || [])
          setSubmissions(data.submissions || [])
          setAwards(data.awards || [])
          setCanManage(!!data.can_manage)
          const chars: UserCharacter[] = data.user_characters || []
          setUserCharacters(chars)

          // If the user has characters in this guild, default to their main
          // (first in the list, since the API sorts mains first).
          if (chars.length > 0) {
            const main = chars[0]
            setSelectedCharacterId(main.id)
            setCharacterName(main.name)
            if (main.class_name) setCharacterClass(main.class_name)
            if (main.spec_name) setCharacterSpec(main.spec_name)
          }

          // Check if user already submitted. Prefer matching against their
          // linked characters (logged-in case), then fall back to the
          // localStorage character name (anonymous case).
          const subs: Submission[] = data.submissions || []
          let existing: Submission | undefined

          if (chars.length > 0) {
            const charNames = new Set(chars.map((c) => c.name.toLowerCase()))
            existing = subs.find((s) =>
              charNames.has(s.character_name.toLowerCase())
            )
            if (existing) {
              const matched = chars.find(
                (c) => c.name.toLowerCase() === existing!.character_name.toLowerCase()
              )
              if (matched) setSelectedCharacterId(matched.id)
            }
          }

          if (!existing) {
            const savedName = localStorage.getItem('lootlist_reserve_character')
            if (savedName) {
              try {
                const { name } = JSON.parse(savedName)
                existing = subs.find(
                  (s) => s.character_name.toLowerCase() === name?.toLowerCase()
                )
              } catch {}
            }
          }

          if (existing) {
            setCharacterName(existing.character_name)
            setCharacterClass(existing.character_class)
            setCharacterSpec(existing.character_spec || '')
            setSelectedItemIds(existing.items || [])
            setSubmittedItemIds(existing.items || [])
            setSubmitted(true)
          }
        } else {
          setNotFound(true)
        }
      } catch {
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token, authedFetch])

  useEffect(() => {
    if (run) {
      document.title = `${run.title} • LootList+ Reserve`
      refreshWowheadTooltips()
    }
  }, [run])

  // Re-scan wowhead links whenever the confirmation snapshot changes,
  // so the tooltips register on newly-rendered items.
  useEffect(() => {
    if (submittedItemIds.length > 0) refreshWowheadTooltips()
  }, [submittedItemIds])

  // Re-scan wowhead links whenever the reserve board rerenders. The
  // board pulls in a bunch of new <a> tags when toggling views or when
  // submissions arrive, so power.js needs another pass.
  useEffect(() => {
    refreshWowheadTooltips()
  }, [boardView, submissions])

  const itemMap = useMemo(() => new Map(items.map(i => [i.id, i])), [items])

  // Submissions grouped by loot item (one entry per reserver per item).
  const reservesByItem = useMemo(() => {
    const map = new Map<string, Submission[]>()
    submissions.forEach((sub) => {
      sub.items.forEach((itemId) => {
        if (!map.has(itemId)) map.set(itemId, [])
        map.get(itemId)!.push(sub)
      })
    })
    return map
  }, [submissions])

  // Awards grouped by loot item so the board can show winners inline.
  const awardsByItem = useMemo(() => {
    const map = new Map<string, Award[]>()
    awards.forEach((a) => {
      if (!map.has(a.loot_item_id)) map.set(a.loot_item_id, [])
      map.get(a.loot_item_id)!.push(a)
    })
    return map
  }, [awards])

  // Reserved items grouped by boss, with bosses in raid order and items
  // sorted by most contested first.
  const boardByBoss = useMemo(() => {
    const grouped = new Map<string, LootItem[]>()
    for (const [itemId] of reservesByItem) {
      const item = itemMap.get(itemId)
      if (!item) continue
      const boss = item.boss_name || 'Unknown'
      if (!grouped.has(boss)) grouped.set(boss, [])
      grouped.get(boss)!.push(item)
    }
    grouped.forEach((arr) =>
      arr.sort(
        (a, b) =>
          (reservesByItem.get(b.id)?.length || 0) -
          (reservesByItem.get(a.id)?.length || 0)
      )
    )
    return grouped
  }, [reservesByItem, itemMap])

  // Clear spec when class changes if the current spec isn't valid for the new class
  useEffect(() => {
    if (!characterClass) return
    const validSpecs = CLASS_SPECS[characterClass] || []
    if (characterSpec && !validSpecs.includes(characterSpec)) {
      setCharacterSpec('')
    }
  }, [characterClass])

  // Drop selected items that become disabled when class changes
  useEffect(() => {
    if (!run?.enforce_class_restrictions || !characterClass) return
    setSelectedItemIds((prev) => {
      if (prev.length === 0) return prev
      const filtered = prev.filter((id) => {
        const item = items.find((i) => i.id === id)
        if (!item) return true
        return canClassReserveItem(characterClass, item)
      })
      return filtered.length === prev.length ? prev : filtered
    })
  }, [characterClass, run?.enforce_class_restrictions, items])

  // Classes available for the run's expansion. Defaults to all classes
  // if the expansion isn't recognized (safer than hiding everything).
  const availableClasses = useMemo(() => {
    if (!run?.expansion_name) return WOW_CLASSES
    const allowed = EXPANSION_CLASSES[run.expansion_name]
    if (!allowed) return WOW_CLASSES
    return WOW_CLASSES.filter((c) => allowed.includes(c.name))
  }, [run?.expansion_name])

  // Clear the character class if it isn't valid for the run's expansion
  // (e.g. a WotLK Death Knight selected from localStorage viewing a TBC run)
  useEffect(() => {
    if (!run?.expansion_name || !characterClass) return
    const allowed = EXPANSION_CLASSES[run.expansion_name]
    if (allowed && !allowed.includes(characterClass)) {
      setCharacterClass('')
      setCharacterSpec('')
    }
  }, [run?.expansion_name, characterClass])

  const disabledItemIds = useMemo(() => {
    const set = new Set<string>()
    if (!run) return set
    for (const hr of run.hard_reserves || []) set.add(hr.loot_item_id)
    if (run.enforce_class_restrictions && characterClass) {
      for (const item of items) {
        if (!canClassReserveItem(characterClass, item)) {
          set.add(item.id)
        }
      }
    }
    return set
  }, [run, items, characterClass])

  const handleSubmit = async () => {
    if (!characterName.trim() || !characterClass) {
      setError('Enter your character name and select a class')
      return
    }
    if (!characterSpec) {
      setError('Select your spec')
      return
    }
    if (selectedItemIds.length === 0) {
      setError('Select at least one item to reserve')
      return
    }

    setError('')
    setSubmitting(true)
    try {
      const res = await fetch(`/api/reserve-runs/join/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_name: characterName.trim(),
          character_class: characterClass,
          character_spec: characterSpec.trim() || null,
          character_id: selectedCharacterId || null,
          items: selectedItemIds,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setSubmitted(true)
        setSubmittedItemIds([...selectedItemIds])
        setSuccess(data.updated ? 'Reserves updated.' : 'Reserves submitted.')
        // Save character for next time
        localStorage.setItem('lootlist_reserve_character', JSON.stringify({
          name: characterName.trim(),
          class: characterClass,
        }))
      } else {
        setError(data.error || 'Couldn\'t save your reserves. Check your selections and try again.')
      }
    } catch {
      setError('Connection issue. Check your internet and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Items the player has actually submitted (snapshot from the last
  // successful save, so the confirmation card doesn't drift while they
  // start editing their selections).
  const reservedItems = useMemo(
    () =>
      submittedItemIds
        .map((id) => itemMap.get(id))
        .filter((i): i is LootItem => !!i),
    [submittedItemIds, itemMap]
  )

  const handleCharacterPick = (charId: string) => {
    // Sentinel option at the bottom of the picker — flips into the
    // freeform guest flow so raiders can reserve as an alt they don't
    // track in LootList+.
    if (charId === '__guest__') {
      setUseGuestCharacter(true)
      setSelectedCharacterId('')
      setCharacterName('')
      setCharacterClass('')
      setCharacterSpec('')
      return
    }
    setSelectedCharacterId(charId)
    const char = userCharacters.find((c) => c.id === charId)
    if (!char) return
    setCharacterName(char.name)
    setCharacterClass(char.class_name || '')
    setCharacterSpec(char.spec_name || '')
  }

  const handleCopyForDiscord = async () => {
    if (!run) return
    const header = characterSpec
      ? `${characterName} (${characterSpec} ${characterClass}) reserved for ${run.title}:`
      : `${characterName} (${characterClass}) reserved for ${run.title}:`
    const lines = reservedItems.map(
      (item) => `- ${item.name} — https://www.wowhead.com/item=${item.wowhead_id}`
    )
    const text = [header, ...lines].join('\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Could not copy to clipboard')
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    })
  }

  // "in 2h 30m", "in 45m", "3h ago", "tomorrow at 8 PM" — used by the
  // locked state banner to give players a sense of when the raid starts.
  const formatRelative = (dateStr: string): string => {
    const target = new Date(dateStr).getTime()
    const now = Date.now()
    const diffMs = target - now
    const absMs = Math.abs(diffMs)
    const mins = Math.round(absMs / 60000)
    const hours = Math.floor(mins / 60)
    const days = Math.floor(hours / 24)
    const future = diffMs > 0
    const prefix = future ? 'in ' : ''
    const suffix = future ? '' : ' ago'
    if (mins < 1) return 'now'
    if (mins < 60) return `${prefix}${mins}m${suffix}`
    if (hours < 24) {
      const remMins = mins % 60
      return remMins > 0
        ? `${prefix}${hours}h ${remMins}m${suffix}`
        : `${prefix}${hours}h${suffix}`
    }
    if (days < 7) return `${prefix}${days}d${suffix}`
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="p-4 sm:p-6 lg:p-8 pt-8 space-y-6">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-60 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  if (notFound || !run) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center p-8">
          <Heading level={2} className="mb-2">Run not found</Heading>
          <Text color="muted">This reserve link is invalid or has expired.</Text>
          <Link href="/" className="text-accent text-sm mt-4 block hover:underline">
            Go to LootList+
          </Link>
        </div>
      </div>
    )
  }

  const statusInfo = STATUS_LABELS[run.status]
  const isOpen = run.status === 'open'
  const showSubmissions = canManage || run.status !== 'open' || run.visibility === 'public_live'

  // Management actions
  const executeAction = async (action: string) => {
    if (!run) return
    setActionLoading(true)
    try {
      const res = await authedFetch(`/api/reserve-runs/${run.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (data.success) {
        showNotification('success', `Run ${action}ed`)
        reloadRun()
      } else {
        showNotification('error', data.error)
      }
    } catch {
      showNotification('error', 'Something went wrong')
    } finally {
      setActionLoading(false)
    }
  }

  const handleLock = () => {
    confirm({
      title: 'Lock reserves?',
      description: 'Players will no longer be able to submit or edit reserves.',
      confirmLabel: 'Lock run',
      onConfirm: () => executeAction('lock'),
    })
  }

  const deleteSubmission = (submission: Submission) => {
    confirm({
      title: `Remove ${submission.character_name}?`,
      description: 'This deletes the reserve and cannot be undone.',
      confirmLabel: 'Remove reserve',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const res = await authedFetch(
            `/api/reserve-runs/${run.id}/submissions/${submission.id}`,
            { method: 'DELETE' }
          )
          const data = await res.json()
          if (data.success) {
            showNotification('success', 'Reserve removed')
            reloadRun()
          } else {
            showNotification('error', data.error || 'Failed to remove reserve')
          }
        } catch {
          showNotification('error', 'Something went wrong')
        }
      },
    })
  }

  return (
    <div className="min-h-screen bg-background">
      {ConfirmDialog}
      {/* Minimal header — pinned. Matches the landing nav wordmark */}
      <div className="sticky top-0 z-40 border-b border-border bg-background-elevated/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          <Link href={homeHref} className="flex items-center gap-3" aria-label="LootList+ home">
            <Image
              src="/images/landing/logo-landing.svg"
              alt="LootList+"
              width={88}
              height={14}
              className="h-3.5 w-auto"
              priority
            />
            <span className="text-muted-foreground/60 text-[14px] font-light" aria-hidden="true">|</span>
            <span className="text-[14px] font-semibold text-muted-foreground">Reserve</span>
          </Link>

          {authUser ? (
            <Link
              href="/reserve"
              className="flex items-center gap-2.5 rounded-full border border-border bg-background-elevated pl-1.5 pr-3.5 py-1 hover:bg-muted transition-colors group"
              title="Manage your runs in LootList+"
            >
              {authUser.avatarUrl ? (
                <Image
                  src={authUser.avatarUrl}
                  alt=""
                  width={24}
                  height={24}
                  className="w-6 h-6 rounded-full border border-border"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.src = 'https://cdn.discordapp.com/embed/avatars/0.png'
                  }}
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 border border-border" />
              )}
              <span className="text-[13px] font-medium text-foreground group-hover:text-accent transition-colors truncate max-w-[140px]">
                {authUser.displayName}
              </span>
            </Link>
          ) : (
            <Link
              href={loginHref}
              className="inline-flex items-center justify-center h-8 px-4 rounded-full bg-white text-[13px] font-semibold text-black hover:bg-white/90 transition-colors"
            >
              Log in
            </Link>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-5">
        {/* Management toolbar for creators/officers */}
        {canManage && (
          <ManagementToolbar
            runId={run.id}
            status={run.status}
            actionLoading={actionLoading}
            onLock={handleLock}
            onUnlock={() => executeAction('unlock')}
            onComplete={() => executeAction('complete')}
          />
        )}

        {/* Run info card */}
        <Card variant="unified">
          <div className="flex items-start gap-4">
            {run.raid_tier_name && (
              <img
                src={getRaidIcon(run.raid_tier_name)}
                alt=""
                className="w-14 h-14 rounded-lg border border-border/50 flex-shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              {run.guild_name && (
                <Text size="xs" color="muted" className="uppercase tracking-wide font-semibold mb-1">{run.guild_name}</Text>
              )}
              <Heading level={2} className="mb-2">{run.title}</Heading>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted-foreground mb-3 mt-3">
            {run.expansion_name && (
              <span>{EXPANSION_SHORT_NAME[run.expansion_name] || run.expansion_name}</span>
            )}
            {run.raid_tier_name && <span>{run.raid_tier_name}</span>}
            <span className="flex items-center gap-1.5">
              <HugeiconsIcon icon={Calendar03Icon} size={14} />
              {formatDate(run.raid_at)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={statusInfo.className}>
              {statusInfo.text}
            </Badge>
            <span className="text-[12px] text-muted-foreground">
              <span className="tabular-nums">{run.max_reserves}</span> reserve{run.max_reserves !== 1 ? 's' : ''} / player
            </span>
            {run.max_reserves_per_item && (
              <span className="text-[12px] text-muted-foreground">
                Max <span className="tabular-nums">{run.max_reserves_per_item}</span> per item
              </span>
            )}
            {run.enforce_class_restrictions && (
              <span className="text-[12px] text-muted-foreground">
                Class restrictions enforced
              </span>
            )}
          </div>

          {/* Manager: inline settings editor. Raider: read-only display. */}
          {canManage ? (
            <div className="mt-3">
              <InlineSettingsEditor
                runId={run.id}
                status={run.status}
                title={run.title}
                rulesNote={run.rules_note}
                discordInviteUrl={run.discord_invite_url}
                hardReserves={run.hard_reserves}
                maxReserves={run.max_reserves}
                maxReservesPerItem={run.max_reserves_per_item}
                visibility={run.visibility}
                allowDuplicates={run.allow_duplicates}
                enforceClassRestrictions={run.enforce_class_restrictions}
                itemMap={itemMap}
                authedFetch={authedFetch}
                onRunUpdated={reloadRun}
                onRunDeleted={() => window.location.href = '/reserve'}
              />
            </div>
          ) : (
            <>
              {run.discord_invite_url && (
                <div className="mt-3 pt-3 border-t border-border">
                  <a
                    href={run.discord_invite_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-[13px] text-accent hover:underline"
                  >
                    <HugeiconsIcon icon={DiscordIcon} size={16} />
                    Join the guild Discord
                  </a>
                </div>
              )}

              {/* Rules */}
              {(run.rules_note || run.hard_reserves.length > 0) && (
                <div className="mt-4 pt-3 border-t border-border space-y-2">
                  {run.rules_note && (
                    <Text size="sm" color="secondary">{run.rules_note}</Text>
                  )}
                  {run.hard_reserves.length > 0 && (
                    <div>
                      <LabelText size="xs" className="mb-1.5">Hard reserves</LabelText>
                      <div className="flex flex-wrap gap-1.5">
                        {run.hard_reserves.map((hr) => {
                          const item = itemMap.get(hr.loot_item_id)
                          return item ? (
                            <Badge
                              key={hr.loot_item_id}
                              variant="outline"
                              className="bg-destructive/10 text-destructive border-destructive/20 gap-1.5"
                            >
                              <ItemLink name={item.name} wowheadId={item.wowhead_id} clickable={false} />
                            </Badge>
                          ) : null
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </Card>

        {/* Reserve board — grouped by item or by player. Shown whenever
            submissions are visible (public_live, locked, or completed). */}
        {showSubmissions && submissions.length > 0 && (
          <Card className="overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <HugeiconsIcon icon={UserMultiple02Icon} size={16} className="text-muted-foreground" />
                <LabelText size="sm">
                  Reserve board (<span className="tabular-nums">{submissions.length}</span> player{submissions.length === 1 ? '' : 's'})
                </LabelText>
              </div>
              <div className="flex items-center gap-1 p-0.5 rounded-full border border-border bg-background-subtle">
                <button
                  type="button"
                  onClick={() => setBoardView('item')}
                  className={`px-3 py-1 rounded-full text-[12px] font-medium transition-colors ${
                    boardView === 'item'
                      ? 'bg-background-elevated text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  By item
                </button>
                <button
                  type="button"
                  onClick={() => setBoardView('player')}
                  className={`px-3 py-1 rounded-full text-[12px] font-medium transition-colors ${
                    boardView === 'player'
                      ? 'bg-background-elevated text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  By player
                </button>
              </div>
            </div>

            {boardView === 'item' ? (
              <div>
                {Array.from(boardByBoss.entries()).map(([boss, bossItems]) => (
                  <div key={boss}>
                    <div className="px-5 py-2 bg-background-subtle border-y border-border">
                      <LabelText size="xs">{boss}</LabelText>
                    </div>
                    <div className="divide-y divide-border">
                      {bossItems.map((item) => {
                        const reservers = reservesByItem.get(item.id) || []
                        const contested = reservers.length > 1
                        const itemAwards = awardsByItem.get(item.id) || []
                        return (
                          <div key={item.id} className="px-5 py-3">
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <ItemLink name={item.name} wowheadId={item.wowhead_id} clickable={false} />
                              <span className="text-[11px] text-muted-foreground">{item.item_slot}</span>
                              <span
                                className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium ${
                                  contested
                                    ? 'bg-warning/15 text-warning'
                                    : 'bg-background-subtle text-muted-foreground'
                                }`}
                              >
                                <span className="tabular-nums">{reservers.length}</span> reserve{reservers.length === 1 ? '' : 's'}
                              </span>
                              {itemAwards.length > 0 && (
                                <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-success/15 text-success font-medium inline-flex items-center gap-1">
                                  <HugeiconsIcon icon={CheckmarkCircle01Icon} size={11} />
                                  Awarded to {itemAwards.map((a) => a.character_name).join(', ')}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-x-3 gap-y-1 pl-0.5">
                              {reservers.map((sub) => {
                                const classInfo = WOW_CLASSES.find(
                                  (c) => c.name.toLowerCase() === sub.character_class.toLowerCase()
                                )
                                const isMine =
                                  submitted &&
                                  sub.character_name.toLowerCase() === characterName.toLowerCase()
                                return (
                                  <span
                                    key={`${sub.id}-${item.id}`}
                                    className={`text-[12px] inline-flex items-center gap-1 ${
                                      isMine ? 'font-semibold' : ''
                                    }`}
                                  >
                                    <span style={{ color: classInfo?.color || '#FFFFFF' }}>
                                      {sub.character_name}
                                    </span>
                                    {sub.character_spec && (
                                      <span className="text-muted-foreground">({sub.character_spec})</span>
                                    )}
                                    {isMine && (
                                      <span className="text-[10px] uppercase tracking-wide text-accent">
                                        You
                                      </span>
                                    )}
                                  </span>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {submissions.map((sub) => {
                  const classInfo = WOW_CLASSES.find(
                    (c) => c.name.toLowerCase() === sub.character_class.toLowerCase()
                  )
                  const isMine =
                    submitted &&
                    sub.character_name.toLowerCase() === characterName.toLowerCase()
                  return (
                    <div
                      key={sub.id}
                      className={`px-5 py-3 group ${isMine ? 'bg-accent/[0.04]' : ''}`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-[14px] font-semibold"
                            style={{ color: classInfo?.color || '#FFFFFF' }}
                          >
                            {sub.character_name}
                          </span>
                          {sub.character_spec && (
                            <span className="text-[11px] text-muted-foreground">
                              ({sub.character_spec} {sub.character_class})
                            </span>
                          )}
                          {isMine && (
                            <span className="text-[10px] uppercase tracking-wide text-accent font-semibold">
                              You
                            </span>
                          )}
                        </div>
                        {canManage && (
                          <button
                            onClick={() => deleteSubmission(sub)}
                            className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                            title="Remove this reserve"
                            aria-label={`Remove ${sub.character_name}'s reserve`}
                          >
                            <HugeiconsIcon icon={Delete02Icon} size={14} />
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1">
                        {sub.items.map((itemId) => {
                          const item = itemMap.get(itemId)
                          if (!item) return null
                          const itemAwards = awardsByItem.get(itemId) || []
                          const wonByThisChar = itemAwards.some(
                            (a) => a.character_name.toLowerCase() === sub.character_name.toLowerCase()
                          )
                          return (
                            <span
                              key={itemId}
                              className="inline-flex items-center gap-1 text-[12px]"
                            >
                              <ItemLink name={item.name} wowheadId={item.wowhead_id} clickable={false} />
                              {wonByThisChar && (
                                <HugeiconsIcon
                                  icon={CheckmarkCircle01Icon}
                                  size={12}
                                  className="text-success"
                                />
                              )}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        )}

        {/* Confirmation card — shown once the player has submitted. Gives
            them a clear "you're in" signal, wowhead-styled list of what they
            reserved, and a copy-to-Discord button. Edits still happen in the
            form below. */}
        {submitted && reservedItems.length > 0 && (
          <Card variant="unified" className="border-success/40 bg-success/[0.04]">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-success/15 flex items-center justify-center flex-shrink-0">
                <HugeiconsIcon icon={CheckmarkCircle01Icon} size={18} className="text-success" />
              </div>
              <div className="flex-1 min-w-0">
                <Heading level={3} className="mb-0.5">You&apos;re in</Heading>
                <Text size="sm" color="muted">
                  {isOpen
                    ? 'You can edit your reserves anytime before the run locks.'
                    : 'This run is no longer accepting changes.'}
                </Text>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-background-subtle px-4 py-3 mb-3">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="text-[14px] font-semibold"
                  style={{
                    color:
                      WOW_CLASSES.find((c) => c.name === characterClass)?.color ||
                      '#FFFFFF',
                  }}
                >
                  {characterName}
                </span>
                {characterSpec && (
                  <span className="text-[12px] text-muted-foreground">
                    {characterSpec} {characterClass}
                  </span>
                )}
              </div>
              <ul className="space-y-1">
                {reservedItems.map((item) => (
                  <li key={item.id} className="text-[13px] flex items-center gap-2">
                    <span className="text-muted-foreground">•</span>
                    <ItemLink name={item.name} wowheadId={item.wowhead_id} clickable={false} />
                    <span className="text-[11px] text-muted-foreground">{item.item_slot}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyForDiscord}
              >
                <HugeiconsIcon icon={Copy01Icon} size={14} />
                {copied ? 'Copied' : 'Copy for Discord'}
              </Button>
              {run.discord_invite_url && (
                <a
                  href={run.discord_invite_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 h-8 px-3 rounded-full border border-border text-[13px] font-medium hover:bg-muted transition-colors"
                >
                  <HugeiconsIcon icon={DiscordIcon} size={14} />
                  Open guild Discord
                </a>
              )}
            </div>
          </Card>
        )}

        {/* Submission form (only when open) */}
        {isOpen && (
          <Card variant="unified">
            <Heading level={3} className="mb-4">
              {submitted ? 'Edit your reserves' : 'Submit your reserves'}
            </Heading>

            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="mb-4 border-success/30 bg-success/10">
                <AlertDescription className="text-success">{success}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              {/* Character info — use a picker when the logged-in user has
                  characters in this guild, otherwise fall back to the
                  freeform anonymous form. */}
              {userCharacters.length > 0 && !useGuestCharacter ? (
                <div className="space-y-1.5">
                  <Label>Submitting as</Label>
                  <ColoredPicker
                    placeholder="Select your character"
                    value={selectedCharacterId}
                    onChange={handleCharacterPick}
                    options={[
                      ...userCharacters.map((c) => ({
                        value: c.id,
                        label: c.spec_name
                          ? `${c.name} — ${c.spec_name} ${c.class_name}${c.is_main ? ' (Main)' : ''}`
                          : `${c.name} — ${c.class_name}${c.is_main ? ' (Main)' : ''}`,
                        color: c.class_color || undefined,
                      })),
                      { value: '__guest__', label: '+ Use a different character' },
                    ]}
                  />
                  <Text size="xs" color="muted">
                    Linked to your LootList+ character.
                  </Text>
                </div>
              ) : (
                <>
                  {authUser && run.guild_name && userCharacters.length === 0 && (
                    <Alert className="border-accent/30 bg-accent/5">
                      <AlertDescription className="text-[12px]">
                        You&apos;re logged in but don&apos;t have a character in{' '}
                        <span className="font-semibold">{run.guild_name}</span>. You can still submit as a guest below.
                      </AlertDescription>
                    </Alert>
                  )}
                  {userCharacters.length > 0 && useGuestCharacter && (
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <Text size="xs" color="muted">
                        Submitting as a guest (not linked to your LootList+ roster).
                      </Text>
                      <button
                        type="button"
                        onClick={() => {
                          setUseGuestCharacter(false)
                          const main = userCharacters[0]
                          if (main) {
                            setSelectedCharacterId(main.id)
                            setCharacterName(main.name)
                            setCharacterClass(main.class_name || '')
                            setCharacterSpec(main.spec_name || '')
                          }
                        }}
                        className="text-[12px] text-accent hover:underline"
                      >
                        Use my linked character
                      </button>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Character name</Label>
                      <Input
                        variant="rounded"
                        value={characterName}
                        onChange={(e) => setCharacterName(e.target.value)}
                        placeholder="e.g. Zevinall"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Class</Label>
                      <ColoredPicker
                        placeholder="Select class"
                        value={characterClass}
                        onChange={setCharacterClass}
                        options={availableClasses.map((c) => ({
                          value: c.name,
                          label: c.name,
                          color: c.color,
                        }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Spec</Label>
                    <ColoredPicker
                      placeholder={characterClass ? 'Select spec' : 'Select a class first'}
                      value={characterSpec}
                      onChange={setCharacterSpec}
                      disabled={!characterClass}
                      options={(CLASS_SPECS[characterClass] || []).map((s) => ({
                        value: s,
                        label: s,
                        color: WOW_CLASSES.find((c) => c.name === characterClass)?.color,
                      }))}
                    />
                  </div>
                </>
              )}

              {/* Item picker */}
              <div className="space-y-1.5">
                <Label>Reserve items (<span className="tabular-nums">{selectedItemIds.length}/{run.max_reserves}</span>)</Label>
                <ReserveItemPicker
                  items={items}
                  selectedIds={selectedItemIds}
                  onChange={setSelectedItemIds}
                  maxSelections={run.max_reserves}
                  disabledIds={disabledItemIds}
                  allowDuplicates={run.allow_duplicates}
                  placeholder="Search for items..."
                />
              </div>

              <Button
                variant="primary"
                onClick={handleSubmit}
                loading={submitting}
                disabled={selectedItemIds.length === 0 || !characterName.trim() || !characterClass || !characterSpec}
                className="w-full"
              >
                {submitted ? 'Update reserves' : 'Submit reserves'}
              </Button>
            </div>
          </Card>
        )}

        {/* Locked / completed banner — only when the run isn't open. */}
        {!isOpen && (
          <Card
            variant="unified"
            className={
              run.status === 'locked'
                ? 'border-warning/40 bg-warning/[0.04]'
                : 'border-border bg-background-subtle'
            }
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                  run.status === 'locked' ? 'bg-warning/15' : 'bg-muted'
                }`}
              >
                <HugeiconsIcon
                  icon={run.status === 'locked' ? LockIcon : CheckmarkCircle01Icon}
                  size={18}
                  className={run.status === 'locked' ? 'text-warning' : 'text-muted-foreground'}
                />
              </div>
              <div className="flex-1 min-w-0">
                <Heading level={3} className="mb-0.5">
                  {run.status === 'locked' ? 'Reserves locked' : 'Run completed'}
                </Heading>
                <Text size="sm" color="muted">
                  {run.status === 'locked'
                    ? <>Raid {formatRelative(run.raid_at)} · <span className="tabular-nums">{submissions.length}</span> player{submissions.length === 1 ? '' : 's'} signed up</>
                    : <>Completed · <span className="tabular-nums">{submissions.length}</span> player{submissions.length === 1 ? '' : 's'} reserved · <span className="tabular-nums">{awards.length}</span> award{awards.length === 1 ? '' : 's'}</>}
                </Text>
              </div>
            </div>
          </Card>
        )}

        {/* Locked with no submissions visible (hidden_until_lock on an
            empty run, for example) */}
        {!isOpen && submissions.length === 0 && (
          <Card variant="unified" className="text-center">
            <Text color="muted" size="sm">No reserves yet. Share the link with your raid to get started.</Text>
          </Card>
        )}

        {/* Footer */}
        <footer className="pt-8 pb-6 border-t border-border/50 mt-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex flex-col items-center md:items-start gap-3">
              <Image
                src="/images/landing/logo-landing.svg"
                alt="LootList+"
                width={120}
                height={19}
                className="h-5 w-auto opacity-70"
              />
              <p className="text-xs text-muted-foreground/50">
                &copy; {new Date().getFullYear()} LootList+. All rights reserved.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
              <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                About
              </Link>
              <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Terms of Service
              </Link>
              <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Privacy Policy
              </Link>
            </div>

            <p className="text-xs text-muted-foreground/50 text-center md:text-right">
              Made with love by{' '}
              <a
                href="https://discord.gg/JNJewThYAB"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Big Yikes
              </a>
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}

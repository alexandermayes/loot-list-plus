'use client'

import { useState, useRef, useEffect } from 'react'
import { WOW_REALMS, REALM_REGIONS, getVersionsForRegion, getRealmsByVersion, type RealmRegion } from '@/data/wow-realms'

interface RealmSelectorProps {
  region: string
  realm: string
  onRegionChange: (region: string) => void
  onRealmChange: (realm: string) => void
  disabled?: boolean
}

const REGION_CODES: Record<string, string> = {
  'All': 'All',
  'Americas & Oceania': 'US',
  'Europe': 'EU',
  'Korea': 'KR',
  'Taiwan': 'TW'
}

export default function RealmSelector({
  region,
  realm,
  onRegionChange,
  onRealmChange,
  disabled = false
}: RealmSelectorProps) {
  const [regionDropdownOpen, setRegionDropdownOpen] = useState(false)
  const [realmDropdownOpen, setRealmDropdownOpen] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })
  const [search, setSearch] = useState('')

  const regionButtonRef = useRef<HTMLButtonElement>(null)
  const realmButtonRef = useRef<HTMLButtonElement>(null)
  const regionDropdownRef = useRef<HTMLDivElement>(null)
  const realmDropdownRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (regionDropdownRef.current && !regionDropdownRef.current.contains(event.target as Node) &&
          !regionButtonRef.current?.contains(event.target as Node)) {
        setRegionDropdownOpen(false)
      }
      if (realmDropdownRef.current && !realmDropdownRef.current.contains(event.target as Node) &&
          !realmButtonRef.current?.contains(event.target as Node)) {
        setRealmDropdownOpen(false)
        setSearch('')
      }
    }

    const handleScroll = (event: Event) => {
      if (realmDropdownRef.current && !realmDropdownRef.current.contains(event.target as Node)) {
        setRealmDropdownOpen(false)
        setSearch('')
      }
    }

    if (realmDropdownOpen) {
      window.addEventListener('scroll', handleScroll, true)
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [realmDropdownOpen])

  // Calculate dropdown position
  useEffect(() => {
    if (realmDropdownOpen && realmButtonRef.current) {
      const rect = realmButtonRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom,
        left: rect.left,
        width: rect.width
      })
    }
  }, [realmDropdownOpen])

  const handleRegionSelect = (selectedRegion: string) => {
    onRegionChange(selectedRegion)
    onRealmChange('') // Clear realm when region changes
    setRegionDropdownOpen(false)
  }

  const handleRealmSelect = (selectedRealm: string) => {
    onRealmChange(selectedRealm)
    setRealmDropdownOpen(false)
    setSearch('')
  }

  // Focus search input when realm dropdown opens
  useEffect(() => {
    if (realmDropdownOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [realmDropdownOpen])

  const regionCode = region ? REGION_CODES[region] || region : 'Region'

  // Get versions based on selected region
  const versions = region
    ? region === 'All'
      ? Array.from(new Set(Object.values(WOW_REALMS).flat().map(r => r.version))).sort()
      : getVersionsForRegion(region as RealmRegion)
    : []

  // Filter realms by search across all versions
  const getFilteredRealmsByVersion = (version: string) => {
    if (!region) return []

    let realmsForVersion: typeof WOW_REALMS[keyof typeof WOW_REALMS]

    if (region === 'All') {
      // Get realms from all regions for this version, deduplicated by name
      const allRealms = Object.values(WOW_REALMS)
        .flat()
        .filter(r => r.version === version)

      // Deduplicate by name (keep first occurrence)
      const seen = new Set<string>()
      realmsForVersion = allRealms.filter(r => {
        if (seen.has(r.name)) return false
        seen.add(r.name)
        return true
      }).sort((a, b) => a.name.localeCompare(b.name))
    } else {
      realmsForVersion = getRealmsByVersion(region as RealmRegion, version)
    }

    if (!search) return realmsForVersion
    return realmsForVersion.filter(r =>
      r.name.toLowerCase().includes(search.toLowerCase())
    )
  }

  // Get versions that have matching realms
  const filteredVersions = versions.filter(version =>
    getFilteredRealmsByVersion(version).length > 0
  )

  return (
    <div className="flex gap-0 relative">
      {/* Region Button */}
      <div className="relative">
        <button
          ref={regionButtonRef}
          type="button"
          onClick={() => !disabled && setRegionDropdownOpen(!regionDropdownOpen)}
          disabled={disabled}
          className="h-11 px-4 bg-secondary/80 border border-border rounded-l-md border-r-0 text-foreground font-medium flex items-center gap-2 hover:bg-secondary disabled:opacity-50 min-w-[100px] justify-between"
        >
          <span>{regionCode}</span>
          <svg
            className={`w-4 h-4 transition-transform ${regionDropdownOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Region Dropdown */}
        {regionDropdownOpen && (
          <div
            ref={regionDropdownRef}
            className="absolute z-[9999] mt-1 bg-secondary border border-border rounded-lg shadow-lg overflow-hidden min-w-[120px]"
          >
            <button
              type="button"
              onClick={() => handleRegionSelect('All')}
              className={`w-full px-4 py-2 text-left hover:bg-accent transition ${
                region === 'All' ? 'bg-accent' : ''
              }`}
            >
              <div className="font-medium text-foreground">All</div>
            </button>
            {REALM_REGIONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => handleRegionSelect(r)}
                className={`w-full px-4 py-2 text-left hover:bg-accent transition ${
                  region === r ? 'bg-accent' : ''
                }`}
              >
                <div className="font-medium text-foreground">{REGION_CODES[r]}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Realm Button */}
      <div className="relative flex-1">
        <button
          ref={realmButtonRef}
          type="button"
          onClick={() => !disabled && region && setRealmDropdownOpen(!realmDropdownOpen)}
          disabled={disabled || !region}
          className="w-full h-11 px-4 bg-background border border-border rounded-r-md text-foreground text-left flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent/50"
        >
          <span className={realm ? '' : 'text-muted-foreground'}>
            {realm || 'Realm'}
          </span>
          <svg
            className={`w-4 h-4 transition-transform ${realmDropdownOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Realm Dropdown */}
        {realmDropdownOpen && (
          <div
            ref={realmDropdownRef}
            className="fixed z-[9999] bg-secondary border border-border rounded-lg shadow-lg max-h-96 overflow-hidden"
            style={{
              top: `${dropdownPosition.top + 4}px`,
              left: `${dropdownPosition.left}px`,
              width: `${dropdownPosition.width}px`
            }}
          >
            {/* Search Input */}
            <div className="p-2 border-b border-border sticky top-0 bg-secondary">
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search realms..."
                className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Clear Option */}
            {realm && (
              <button
                onClick={() => {
                  onRealmChange('')
                  setRealmDropdownOpen(false)
                  setSearch('')
                }}
                className="w-full px-3 py-2 text-left hover:bg-accent text-muted-foreground text-sm border-b border-border"
              >
                -- Clear Selection --
              </button>
            )}

            {/* Realms List */}
            <div className="max-h-80 overflow-y-auto">
              {filteredVersions.length === 0 ? (
                <div className="px-3 py-4 text-center text-muted-foreground text-sm">
                  No realms found
                </div>
              ) : (
                filteredVersions.map((version) => {
                  const realmsForVersion = getFilteredRealmsByVersion(version)
                  return (
                    <div key={version}>
                      {/* Version Header */}
                      <div className="px-3 py-2 bg-accent/50 border-b border-border">
                        <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
                          {version}
                        </p>
                      </div>
                      {/* Version Realms */}
                      {realmsForVersion.map((realmInfo) => (
                        <button
                          key={realmInfo.name}
                          type="button"
                          onClick={() => handleRealmSelect(realmInfo.name)}
                          className={`w-full px-3 py-2 text-left hover:bg-accent flex items-center gap-2 ${
                            realm === realmInfo.name ? 'bg-accent' : ''
                          }`}
                        >
                          <div className="font-medium text-foreground">{realmInfo.name}</div>
                        </button>
                      ))}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

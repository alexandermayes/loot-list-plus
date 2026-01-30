'use client'

import { useMemo } from 'react'
import { WOW_REALMS, REALM_REGIONS, getVersionsForRegion, getRealmsByVersion, type RealmRegion } from '@/data/wow-realms'
import { ComboDropdown, type DropdownOption, type DropdownGroup } from '@/components/ui/searchable-dropdown'

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
  // Build region options
  const regionOptions: DropdownOption[] = useMemo(() => [
    { value: 'All', label: 'All' },
    ...REALM_REGIONS.map((r) => ({
      value: r,
      label: REGION_CODES[r] || r
    }))
  ], [])

  // Build realm options grouped by version
  const realmOptions: DropdownGroup[] = useMemo(() => {
    if (!region) return []

    // Get versions based on selected region
    const versions = region === 'All'
      ? Array.from(new Set(Object.values(WOW_REALMS).flat().map(r => r.version))).sort()
      : getVersionsForRegion(region as RealmRegion)

    return versions.map((version) => {
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

      return {
        label: version,
        options: realmsForVersion.map((realmInfo) => ({
          value: realmInfo.name,
          label: realmInfo.name
        }))
      }
    }).filter(group => group.options.length > 0)
  }, [region])

  return (
    <ComboDropdown
      prefixValue={region}
      onPrefixChange={onRegionChange}
      prefixOptions={regionOptions}
      prefixPlaceholder="Region"
      value={realm}
      onChange={onRealmChange}
      options={realmOptions}
      placeholder="Realm"
      grouped={true}
      disabled={disabled}
      searchable={true}
      searchPlaceholder="Search realms..."
      clearable={true}
    />
  )
}

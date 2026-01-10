/**
 * SearchableRealmSelect Component
 *
 * A custom dropdown for selecting WoW realms with search functionality
 * Groups realms by region (US East, US West, EU, etc.)
 */

'use client'

import { useState, useRef, useEffect } from 'react'
import { WOW_REALMS, REALM_REGIONS } from '@/data/wow-realms'

interface SearchableRealmSelectProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

export default function SearchableRealmSelect({
  value,
  onChange,
  placeholder = 'Select a realm...',
  disabled = false
}: SearchableRealmSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Filter realms by search across all regions
  const filteredRealmsByRegion: Record<string, string[]> = {}

  REALM_REGIONS.forEach(region => {
    const realms = WOW_REALMS[region] || []
    const filtered = realms.filter(realm =>
      realm.toLowerCase().includes(search.toLowerCase())
    )
    if (filtered.length > 0) {
      filteredRealmsByRegion[region] = filtered
    }
  })

  // Close dropdown when clicking outside or scrolling outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearch('')
      }
    }

    const handleScroll = (event: Event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearch('')
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      window.addEventListener('scroll', handleScroll, true)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [isOpen])

  // Calculate dropdown position when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom,
        left: rect.left,
        width: rect.width
      })
    }
  }, [isOpen])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isOpen])

  const handleSelect = (realm: string) => {
    onChange(realm)
    setIsOpen(false)
    setSearch('')
  }

  const handleClear = () => {
    onChange('')
    setIsOpen(false)
    setSearch('')
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground text-left focus:outline-none focus:ring-2 focus:ring-primary flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="truncate">
          {value || placeholder}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="fixed z-[9999] bg-card border border-border rounded-lg shadow-lg max-h-96 overflow-hidden"
          style={{
            top: `${dropdownPosition.top + 4}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`
          }}
        >
          {/* Search Input */}
          <div className="p-2 border-b border-border sticky top-0 bg-card">
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search realms..."
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Clear Option */}
          {value && (
            <button
              onClick={handleClear}
              className="w-full px-3 py-2 text-left hover:bg-accent text-muted-foreground text-sm border-b border-border"
            >
              -- Clear Selection --
            </button>
          )}

          {/* Realms List */}
          <div className="max-h-80 overflow-y-auto">
            {Object.keys(filteredRealmsByRegion).length === 0 ? (
              <div className="px-3 py-4 text-center text-muted-foreground text-sm">
                No realms found
              </div>
            ) : (
              REALM_REGIONS.map(region => {
                const realms = filteredRealmsByRegion[region]
                if (!realms || realms.length === 0) return null

                return (
                  <div key={region}>
                    {/* Region Header */}
                    <div className="px-3 py-2 bg-accent/50 border-b border-border sticky top-0">
                      <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
                        {region}
                      </p>
                    </div>
                    {/* Region Realms */}
                    {realms.map(realm => (
                      <button
                        key={realm}
                        onClick={() => handleSelect(realm)}
                        className={`w-full px-3 py-2 text-left hover:bg-accent text-sm ${
                          value === realm ? 'bg-accent font-medium' : ''
                        }`}
                      >
                        {realm}
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
  )
}

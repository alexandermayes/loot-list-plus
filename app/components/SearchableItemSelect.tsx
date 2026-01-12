/**
 * SearchableItemSelect Component
 *
 * A custom dropdown that shows items with Wowhead styling (colored names + icons)
 * Allows searching/filtering items by name
 */

'use client'

import { useState, useRef, useEffect } from 'react'
import ItemLink from './ItemLink'

interface Item {
  id: string
  name: string
  wowhead_id: number
  boss_name: string
  classification?: string
}

interface SearchableItemSelectProps {
  items: Item[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: Set<string>
  currentValue?: string
}

export default function SearchableItemSelect({
  items,
  value,
  onChange,
  placeholder = '-- Select Item --',
  disabled = new Set(),
  currentValue
}: SearchableItemSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const dropdownContentRef = useRef<HTMLDivElement>(null)

  const selectedItem = items.find(i => i.id === value)

  // Filter items by search
  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase())
  )

  // Group items by boss (maintain encounter order)
  const itemsByBoss: Record<string, Item[]> = {}
  const bossOrder: string[] = []

  filteredItems.forEach(item => {
    const boss = item.boss_name || 'Unknown'
    if (!itemsByBoss[boss]) {
      itemsByBoss[boss] = []
      bossOrder.push(boss) // Track order as we encounter each boss
    }
    itemsByBoss[boss].push(item)
  })

  const bossNames = bossOrder

  // Close dropdown when clicking outside or scrolling outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearch('')
      }
    }

    const handleScroll = (event: Event) => {
      // Only close if scrolling is happening outside the dropdown
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

  // Refresh Wowhead tooltips when value changes (after selection)
  useEffect(() => {
    if (value && typeof window !== 'undefined' && (window as any).$WowheadPower) {
      // Very short delay to let the new link render
      const timer = setTimeout(() => {
        (window as any).$WowheadPower.refreshLinks()
      }, 10)

      return () => clearTimeout(timer)
    }
  }, [value])

  // Refresh Wowhead tooltips when dropdown opens or search results change
  useEffect(() => {
    if (isOpen && typeof window !== 'undefined' && (window as any).$WowheadPower) {
      const timer = setTimeout(() => {
        (window as any).$WowheadPower.refreshLinks()
      }, 100)

      return () => clearTimeout(timer)
    }
  }, [isOpen, filteredItems.length])

  const handleSelect = (itemId: string) => {
    onChange(itemId)
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
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-left focus:outline-none focus:border-[#ff8000] flex items-center justify-between gap-2"
      >
        <span className="truncate flex items-center gap-2 min-w-0">
          {selectedItem ? (
            <>
              <span className="truncate">
                <ItemLink name={selectedItem.name} wowheadId={selectedItem.wowhead_id} clickable={false} />
              </span>
              {selectedItem.classification && selectedItem.classification !== 'Unlimited' && (
                <span className="text-xs text-muted-foreground flex-shrink-0">[{selectedItem.classification}]</span>
              )}
            </>
          ) : (
            <span className="truncate">{placeholder}</span>
          )}
        </span>
        <svg
          className="w-4 h-4 flex-shrink-0 transition-transform"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
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
          ref={dropdownContentRef}
          className="fixed z-[9999] bg-[#151515] border border-[#383838] rounded-lg shadow-lg max-h-96 overflow-hidden"
          style={{
            top: `${dropdownPosition.top + 4}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
            minWidth: '250px'
          }}
        >
          {/* Search Input */}
          <div className="p-2 border-b border-[rgba(255,255,255,0.1)] sticky top-0 bg-[#151515]">
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items..."
              className="w-full px-3 py-2 bg-[#0d0e11] border border-[rgba(255,255,255,0.1)] rounded-md text-white text-sm focus:outline-none focus:border-[#ff8000]"
            />
          </div>

          {/* Clear Option */}
          {value && (
            <button
              onClick={handleClear}
              className="w-full px-3 py-2 text-left hover:bg-[#1a1a1a] text-[#a1a1a1] text-sm border-b border-[rgba(255,255,255,0.1)]"
            >
              -- Clear Selection --
            </button>
          )}

          {/* Items List */}
          <div className="max-h-80 overflow-y-auto">
            {filteredItems.length === 0 ? (
              <div className="px-3 py-4 text-center text-[#a1a1a1] text-sm">
                No items found
              </div>
            ) : (
              bossNames.map(boss => (
                <div key={boss}>
                  {/* Boss Header */}
                  <div className="px-3 py-2 bg-[#1a1a1a] border-b border-[rgba(255,255,255,0.1)]">
                    <p className="text-xs font-semibold text-white uppercase tracking-wide">
                      {boss}
                    </p>
                  </div>
                  {/* Boss Items */}
                  {itemsByBoss[boss].map(item => {
                    const isDisabled = disabled.has(item.id) && currentValue !== item.id
                    return (
                      <button
                        key={item.id}
                        onClick={() => !isDisabled && handleSelect(item.id)}
                        disabled={isDisabled}
                        className={`w-full px-3 py-2 text-left hover:bg-[#1a1a1a] flex items-center gap-2 min-w-0 ${
                          isDisabled ? 'opacity-50 cursor-not-allowed' : ''
                        } ${value === item.id ? 'bg-[#1a1a1a]' : ''}`}
                      >
                        <span className="truncate flex-1 min-w-0">
                          <ItemLink name={item.name} wowheadId={item.wowhead_id} clickable={false} />
                        </span>
                        {item.classification && item.classification !== 'Unlimited' && (
                          <span className="text-xs text-[#a1a1a1] flex-shrink-0">
                            [{item.classification}]
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

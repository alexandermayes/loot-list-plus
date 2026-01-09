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

  const selectedItem = items.find(i => i.id === value)

  // Filter items by search
  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase())
  )

  // Close dropdown when clicking outside or scrolling
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearch('')
      }
    }

    const handleScroll = () => {
      setIsOpen(false)
      setSearch('')
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

  // Refresh Wowhead tooltips when dropdown opens
  useEffect(() => {
    if (isOpen && typeof window !== 'undefined' && (window as any).$WowheadPower) {
      setTimeout(() => {
        (window as any).$WowheadPower.refreshLinks()
      }, 50)
    }
  }, [isOpen, filteredItems])

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
        className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground text-left focus:outline-none focus:ring-2 focus:ring-purple-500 flex items-center justify-between"
      >
        <span className="truncate">
          {selectedItem ? selectedItem.name : placeholder}
          {selectedItem?.classification && selectedItem.classification !== 'Unlimited' && (
            <span className="ml-2 text-xs text-muted-foreground">[{selectedItem.classification}]</span>
          )}
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
              placeholder="Search items..."
              className="w-full px-3 py-2 bg-background border border-border rounded text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
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

          {/* Items List */}
          <div className="max-h-80 overflow-y-auto">
            {filteredItems.length === 0 ? (
              <div className="px-3 py-4 text-center text-muted-foreground text-sm">
                No items found
              </div>
            ) : (
              filteredItems.map(item => {
                const isDisabled = disabled.has(item.id) && currentValue !== item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => !isDisabled && handleSelect(item.id)}
                    disabled={isDisabled}
                    className={`w-full px-3 py-2 text-left hover:bg-accent flex items-center gap-2 ${
                      isDisabled ? 'opacity-50 cursor-not-allowed' : ''
                    } ${value === item.id ? 'bg-accent' : ''}`}
                  >
                    <ItemLink name={item.name} wowheadId={item.wowhead_id} />
                    {item.classification && item.classification !== 'Unlimited' && (
                      <span className="text-xs text-muted-foreground ml-auto">
                        [{item.classification}]
                      </span>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

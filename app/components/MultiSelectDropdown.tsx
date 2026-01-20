'use client'

import { useState, useRef, useEffect } from 'react'

interface Option {
  id: string
  label: string
  isRoleGroup?: boolean // For "All Tanks", "All Healers", etc.
  disabled?: boolean
}

interface OptionGroup {
  label: string
  options: Option[]
}

interface MultiSelectDropdownProps {
  placeholder: string
  selectedIds: Set<string>
  options: Option[]
  optionGroups?: OptionGroup[]
  onAdd: (id: string) => void
  onRemove: (id: string) => void
  onClear: () => void
  getDisplayName: (id: string) => string
  getClassColor?: (id: string) => string | undefined
  getConsolidatedDisplay?: (selectedIds: Set<string>) => Array<{ name: string, color?: string }>
  isOptionSelected?: (optionId: string, selectedIds: Set<string>) => boolean
  variant?: 'primary' | 'secondary'
}

export default function MultiSelectDropdown({
  placeholder,
  selectedIds,
  options,
  optionGroups,
  onAdd,
  onRemove,
  onClear,
  getDisplayName,
  getClassColor,
  getConsolidatedDisplay,
  isOptionSelected,
  variant = 'primary'
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number, left: number, width: number } | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearch('')
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isOpen])

  // Close dropdown on scroll or resize
  useEffect(() => {
    if (!isOpen) return

    const handleScrollOrResize = () => {
      setIsOpen(false)
      setSearch('')
    }

    window.addEventListener('scroll', handleScrollOrResize, true)
    window.addEventListener('resize', handleScrollOrResize)

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true)
      window.removeEventListener('resize', handleScrollOrResize)
    }
  }, [isOpen])

  const handleToggle = (optionId: string, isChecked: boolean) => {
    if (isChecked) {
      onAdd(optionId)
    } else {
      onRemove(optionId)
    }
  }

  // Filter options by search term
  const filterOptions = (opts: Option[]) => {
    if (!search) return opts
    return opts.filter(opt =>
      opt.label.toLowerCase().includes(search.toLowerCase())
    )
  }

  const renderButtonContent = () => {
    if (selectedIds.size === 0) {
      return <span className="text-gray-400">{placeholder}</span>
    }

    // Check if all specs are selected (get all non-role-group options)
    const allIndividualOptions = optionGroups
      ?.flatMap(g => g.options.filter(o => !o.isRoleGroup))
      || options.filter(opt => !opt.isRoleGroup)

    if (selectedIds.size === allIndividualOptions.length && allIndividualOptions.length > 0) {
      return <span>All Specs/Roles</span>
    }

    // Use consolidated display if provided (consolidates role groups)
    const displayEntries = getConsolidatedDisplay
      ? getConsolidatedDisplay(selectedIds)
      : Array.from(selectedIds).map(id => ({
          name: getDisplayName(id),
          color: getClassColor?.(id)
        }))

    return (
      <>
        {displayEntries.map((entry, index) => (
          <span key={`${entry.name}-${index}`}>
            <span style={{ color: entry.color || '#ffffff' }}>
              {entry.name}
            </span>
            {index < displayEntries.length - 1 && <span className="text-gray-400">, </span>}
          </span>
        ))}
      </>
    )
  }

  const handleToggleDropdown = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom,
        left: rect.left,
        width: rect.width
      })
    }
    setIsOpen(!isOpen)
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggleDropdown}
        className="w-full px-3 py-2 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-left focus:outline-none focus:border-[#ff8000] flex items-center justify-between gap-2 transition-colors"
      >
        <span className="truncate flex-1 min-w-0 overflow-hidden whitespace-nowrap">{renderButtonContent()}</span>
        <svg
          className={`w-4 h-4 ml-2 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && dropdownPosition && (
        <div
          className="fixed z-[9999] mt-1 max-w-xs bg-[#151515] border border-[#383838] rounded-lg shadow-xl overflow-hidden"
          style={{
            top: `${dropdownPosition.top + 4}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`
          }}
        >
          {/* Search Input */}
          <div className="p-2 border-b border-[rgba(255,255,255,0.1)] sticky top-0 bg-[#151515]">
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search specs..."
              className="w-full px-3 py-2 bg-[#0d0e11] border border-[rgba(255,255,255,0.1)] rounded-md text-white text-sm focus:outline-none focus:border-[#ff8000]"
            />
          </div>

          {/* Clear button */}
          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onClear()
              }}
              className="w-full px-3 py-2 text-left hover:bg-[#1a1a1a] text-[#a1a1a1] text-sm border-b border-[rgba(255,255,255,0.1)]"
            >
              -- Clear All --
            </button>
          )}

          {/* Options */}
          <div className="max-h-80 overflow-y-auto">
            {(() => {
              // Calculate total filtered options for "no results" check
              const allFilteredOptions = optionGroups
                ? optionGroups.flatMap(g => filterOptions(g.options))
                : filterOptions(options)

              if (allFilteredOptions.length === 0) {
                return (
                  <div className="px-3 py-4 text-center text-[#a1a1a1] text-sm">
                    No specs found
                  </div>
                )
              }

              return optionGroups ? (
                optionGroups.map((group, groupIndex) => {
                  const filteredGroupOptions = filterOptions(group.options)
                  if (filteredGroupOptions.length === 0) return null

                  return (
                    <div key={groupIndex}>
                      {group.label && (
                        <div className="px-3 py-2 bg-[#1a1a1a] border-b border-[rgba(255,255,255,0.1)]">
                          <p className="text-xs font-semibold text-white uppercase tracking-wide">
                            {group.label}
                          </p>
                        </div>
                      )}
                      {filteredGroupOptions.map((option) => {
                      const color = getClassColor?.(option.id)
                      const isChecked = isOptionSelected
                        ? isOptionSelected(option.id, selectedIds)
                        : selectedIds.has(option.id)
                      return (
                        <label
                          key={option.id}
                          className={`flex items-center px-3 py-2 hover:bg-[#1a1a1a] cursor-pointer transition-colors ${
                            option.disabled ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => handleToggle(option.id, e.target.checked)}
                            disabled={option.disabled}
                            className="w-4 h-4 rounded border-gray-600 bg-[#0f1011] text-[#ff8000] focus:ring-2 focus:ring-[#ff8000]/30 focus:ring-offset-0"
                          />
                          <span
                            className="ml-3 text-sm"
                            style={{ color: color || '#ffffff' }}
                          >
                            {option.label}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                )
              })
            ) : (
              filterOptions(options).map((option) => {
                const color = getClassColor?.(option.id)
                const isChecked = isOptionSelected
                  ? isOptionSelected(option.id, selectedIds)
                  : selectedIds.has(option.id)
                return (
                  <label
                    key={option.id}
                    className={`flex items-center px-3 py-2 hover:bg-[#1a1a1a] cursor-pointer transition-colors ${
                      option.disabled ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => handleToggle(option.id, e.target.checked)}
                      disabled={option.disabled}
                      className="w-4 h-4 rounded border-gray-600 bg-[#0f1011] text-[#ff8000] focus:ring-2 focus:ring-[#ff8000]/30 focus:ring-offset-0"
                    />
                    <span
                      className="ml-3 text-sm"
                      style={{ color: color || '#ffffff' }}
                    >
                      {option.label}
                    </span>
                  </label>
                )
              })
            )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}

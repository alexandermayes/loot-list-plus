'use client'

import * as React from 'react'
import { useState, useRef, useEffect } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * SearchableDropdown Component - LootList+ Design System
 *
 * A searchable dropdown component with optional grouping and prefix dropdown.
 * Used for realm selection, class selection, and other searchable lists.
 *
 * Features:
 * - Searchable options with filtering
 * - Optional grouped options with headers
 * - Optional prefix dropdown (e.g., region selector)
 * - Keyboard navigation support
 * - Fixed positioning for scrollable containers
 *
 * Variants:
 * - pill: Fully rounded ends (default) - used in most forms
 * - rounded: Rounded corners - used in cards/compact areas
 *
 * Sizes:
 * - sm: Compact (h-9, text-[12px])
 * - default: Standard (h-11, text-[13px])
 * - lg: Large (h-12, text-[14px])
 */

const dropdownButtonVariants = cva(
  [
    'flex items-center justify-between w-full border text-foreground transition-colors',
    'bg-background-elevated',
    'hover:bg-muted',
    'focus:outline-none focus:border-accent',
    'disabled:cursor-not-allowed disabled:opacity-50',
  ],
  {
    variants: {
      variant: {
        pill: 'rounded-[52px] border-border-strong',
        rounded: 'rounded-xl border-border',
      },
      size: {
        sm: 'h-9 px-3 text-[12px]',
        default: 'h-11 px-4 text-[13px]',
        lg: 'h-12 px-5 text-[14px]',
      },
    },
    defaultVariants: {
      variant: 'pill',
      size: 'default',
    },
  }
)

// Chevron icon component
const ChevronIcon = ({ isOpen, className }: { isOpen: boolean; className?: string }) => (
  <svg
    className={cn('w-4 h-4 transition-transform flex-shrink-0', isOpen && 'rotate-180', className)}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
)

export interface DropdownOption {
  value: string
  label: string
  group?: string
}

export interface DropdownGroup {
  label: string
  options: DropdownOption[]
}

export interface SearchableDropdownProps extends VariantProps<typeof dropdownButtonVariants> {
  /** Currently selected value */
  value: string
  /** Callback when value changes */
  onChange: (value: string) => void
  /** List of options (flat or grouped) */
  options: DropdownOption[] | DropdownGroup[]
  /** Placeholder text when no value selected */
  placeholder?: string
  /** Whether options are grouped */
  grouped?: boolean
  /** Whether the dropdown is disabled */
  disabled?: boolean
  /** Whether to show a search input */
  searchable?: boolean
  /** Placeholder for search input */
  searchPlaceholder?: string
  /** Whether to show a clear option */
  clearable?: boolean
  /** Clear option label */
  clearLabel?: string
  /** Additional className */
  className?: string
  /** Width of the dropdown menu (defaults to trigger width) */
  menuWidth?: number | string
}

export function SearchableDropdown({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  grouped = false,
  disabled = false,
  searchable = true,
  searchPlaceholder = 'Search...',
  clearable = false,
  clearLabel = '-- Clear Selection --',
  variant,
  size,
  className,
  menuWidth,
}: SearchableDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })

  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !buttonRef.current?.contains(event.target as Node)
      ) {
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
      window.addEventListener('scroll', handleScroll, true)
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [isOpen])

  // Calculate dropdown position
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom,
        left: rect.left,
        width: rect.width,
      })
    }
  }, [isOpen])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isOpen, searchable])

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue)
    setIsOpen(false)
    setSearch('')
  }

  const handleClear = () => {
    onChange('')
    setIsOpen(false)
    setSearch('')
  }

  // Get the display label for current value
  const getDisplayLabel = (): string => {
    if (!value) return ''

    if (grouped) {
      const groups = options as DropdownGroup[]
      for (const group of groups) {
        const option = group.options.find(o => o.value === value)
        if (option) return option.label
      }
    } else {
      const flatOptions = options as DropdownOption[]
      const option = flatOptions.find(o => o.value === value)
      if (option) return option.label
    }
    return value
  }

  // Filter options based on search
  const getFilteredOptions = (): DropdownOption[] | DropdownGroup[] => {
    if (!search) return options

    const searchLower = search.toLowerCase()

    if (grouped) {
      const groups = options as DropdownGroup[]
      return groups
        .map(group => ({
          ...group,
          options: group.options.filter(o =>
            o.label.toLowerCase().includes(searchLower)
          ),
        }))
        .filter(group => group.options.length > 0)
    } else {
      const flatOptions = options as DropdownOption[]
      return flatOptions.filter(o =>
        o.label.toLowerCase().includes(searchLower)
      )
    }
  }

  const filteredOptions = getFilteredOptions()
  const displayLabel = getDisplayLabel()
  const hasOptions = grouped
    ? (filteredOptions as DropdownGroup[]).some(g => g.options.length > 0)
    : (filteredOptions as DropdownOption[]).length > 0

  return (
    <div className={cn('relative', className)}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(dropdownButtonVariants({ variant, size }))}
      >
        <span className={value ? '' : 'text-muted-foreground'}>
          {displayLabel || placeholder}
        </span>
        <ChevronIcon isOpen={isOpen} />
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="fixed z-[9999] bg-background-elevated border border-border-strong rounded-lg shadow-lg max-h-96 overflow-hidden"
          style={{
            top: `${dropdownPosition.top + 4}px`,
            left: `${dropdownPosition.left}px`,
            width: menuWidth || `${dropdownPosition.width}px`,
          }}
        >
          {/* Search Input */}
          {searchable && (
            <div className="p-2 border-b border-border sticky top-0 bg-background-elevated">
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full px-3 py-2 bg-background-subtle border border-border rounded-md text-foreground text-[13px] focus:outline-none focus:border-accent"
              />
            </div>
          )}

          {/* Clear Option */}
          {clearable && value && (
            <button
              type="button"
              onClick={handleClear}
              className="w-full px-3 py-2 text-left hover:bg-muted text-muted-foreground text-[13px] border-b border-border"
            >
              {clearLabel}
            </button>
          )}

          {/* Options List */}
          <div className="max-h-80 overflow-y-auto">
            {!hasOptions ? (
              <div className="px-3 py-4 text-center text-muted-foreground text-[13px]">
                No results found
              </div>
            ) : grouped ? (
              (filteredOptions as DropdownGroup[]).map((group) => (
                <div key={group.label}>
                  {/* Group Header */}
                  <div className="px-3 py-2 bg-muted border-b border-border">
                    <p className="text-[11px] font-semibold text-foreground uppercase tracking-wide">
                      {group.label}
                    </p>
                  </div>
                  {/* Group Options */}
                  {group.options.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleSelect(option.value)}
                      className={cn(
                        'w-full px-3 py-2 text-left hover:bg-muted text-[13px]',
                        value === option.value ? 'bg-muted' : ''
                      )}
                    >
                      <span className="font-medium text-foreground">{option.label}</span>
                    </button>
                  ))}
                </div>
              ))
            ) : (
              (filteredOptions as DropdownOption[]).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={cn(
                    'w-full px-3 py-2 text-left hover:bg-muted text-[13px]',
                    value === option.value ? 'bg-muted' : ''
                  )}
                >
                  <span className="font-medium text-foreground">{option.label}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * ComboDropdown Component
 *
 * A combined dropdown with a prefix selector and main searchable dropdown.
 * Used for realm selection (region + realm).
 */
export interface ComboDropdownProps extends VariantProps<typeof dropdownButtonVariants> {
  /** Prefix dropdown value */
  prefixValue: string
  /** Prefix dropdown onChange */
  onPrefixChange: (value: string) => void
  /** Prefix dropdown options */
  prefixOptions: DropdownOption[]
  /** Prefix placeholder */
  prefixPlaceholder?: string
  /** Main dropdown value */
  value: string
  /** Main dropdown onChange */
  onChange: (value: string) => void
  /** Main dropdown options (flat or grouped) */
  options: DropdownOption[] | DropdownGroup[]
  /** Main dropdown placeholder */
  placeholder?: string
  /** Whether main options are grouped */
  grouped?: boolean
  /** Whether the combo is disabled */
  disabled?: boolean
  /** Whether main dropdown is searchable */
  searchable?: boolean
  /** Search placeholder */
  searchPlaceholder?: string
  /** Whether to show a clear option */
  clearable?: boolean
  /** Additional className */
  className?: string
}

export function ComboDropdown({
  prefixValue,
  onPrefixChange,
  prefixOptions,
  prefixPlaceholder = 'Select',
  value,
  onChange,
  options,
  placeholder = 'Select...',
  grouped = false,
  disabled = false,
  searchable = true,
  searchPlaceholder = 'Search...',
  clearable = true,
  variant,
  size,
  className,
}: ComboDropdownProps) {
  const [prefixOpen, setPrefixOpen] = useState(false)
  const [mainOpen, setMainOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })

  const prefixButtonRef = useRef<HTMLButtonElement>(null)
  const mainButtonRef = useRef<HTMLButtonElement>(null)
  const prefixDropdownRef = useRef<HTMLDivElement>(null)
  const mainDropdownRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        prefixDropdownRef.current &&
        !prefixDropdownRef.current.contains(event.target as Node) &&
        !prefixButtonRef.current?.contains(event.target as Node)
      ) {
        setPrefixOpen(false)
      }
      if (
        mainDropdownRef.current &&
        !mainDropdownRef.current.contains(event.target as Node) &&
        !mainButtonRef.current?.contains(event.target as Node)
      ) {
        setMainOpen(false)
        setSearch('')
      }
    }

    const handleScroll = (event: Event) => {
      if (mainDropdownRef.current && !mainDropdownRef.current.contains(event.target as Node)) {
        setMainOpen(false)
        setSearch('')
      }
    }

    if (mainOpen) {
      window.addEventListener('scroll', handleScroll, true)
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [mainOpen])

  // Calculate dropdown position for main dropdown
  useEffect(() => {
    if (mainOpen && mainButtonRef.current) {
      const rect = mainButtonRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom,
        left: rect.left,
        width: rect.width,
      })
    }
  }, [mainOpen])

  // Focus search input when main dropdown opens
  useEffect(() => {
    if (mainOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [mainOpen, searchable])

  const handlePrefixSelect = (selectedValue: string) => {
    onPrefixChange(selectedValue)
    onChange('') // Clear main value when prefix changes
    setPrefixOpen(false)
  }

  const handleMainSelect = (selectedValue: string) => {
    onChange(selectedValue)
    setMainOpen(false)
    setSearch('')
  }

  const handleClear = () => {
    onChange('')
    setMainOpen(false)
    setSearch('')
  }

  // Get display label for prefix
  const getPrefixLabel = (): string => {
    if (!prefixValue) return prefixPlaceholder
    const option = prefixOptions.find(o => o.value === prefixValue)
    return option?.label || prefixValue
  }

  // Get display label for main value
  const getMainLabel = (): string => {
    if (!value) return ''

    if (grouped) {
      const groups = options as DropdownGroup[]
      for (const group of groups) {
        const option = group.options.find(o => o.value === value)
        if (option) return option.label
      }
    } else {
      const flatOptions = options as DropdownOption[]
      const option = flatOptions.find(o => o.value === value)
      if (option) return option.label
    }
    return value
  }

  // Filter options based on search
  const getFilteredOptions = (): DropdownOption[] | DropdownGroup[] => {
    if (!search) return options

    const searchLower = search.toLowerCase()

    if (grouped) {
      const groups = options as DropdownGroup[]
      return groups
        .map(group => ({
          ...group,
          options: group.options.filter(o =>
            o.label.toLowerCase().includes(searchLower)
          ),
        }))
        .filter(group => group.options.length > 0)
    } else {
      const flatOptions = options as DropdownOption[]
      return flatOptions.filter(o =>
        o.label.toLowerCase().includes(searchLower)
      )
    }
  }

  const filteredOptions = getFilteredOptions()
  const mainLabel = getMainLabel()
  const hasOptions = grouped
    ? (filteredOptions as DropdownGroup[]).some(g => g.options.length > 0)
    : (filteredOptions as DropdownOption[]).length > 0

  // Determine size-based styles
  const sizeStyles = {
    sm: 'h-9 text-[12px]',
    default: 'h-11 text-[13px]',
    lg: 'h-12 text-[14px]',
  }
  const currentSize = size || 'default'

  return (
    <div className={cn('flex gap-0 relative', className)}>
      {/* Prefix Dropdown */}
      <div className="relative">
        <button
          ref={prefixButtonRef}
          type="button"
          onClick={() => !disabled && setPrefixOpen(!prefixOpen)}
          disabled={disabled}
          className={cn(
            'px-4 bg-background-elevated border border-border-strong border-r-0 text-foreground font-medium flex items-center gap-2 hover:bg-muted disabled:opacity-50 min-w-[100px] justify-between focus:outline-none focus:border-accent transition-colors',
            variant === 'rounded' ? 'rounded-l-xl' : 'rounded-l-[52px]',
            sizeStyles[currentSize]
          )}
        >
          <span>{getPrefixLabel()}</span>
          <ChevronIcon isOpen={prefixOpen} />
        </button>

        {prefixOpen && (
          <div
            ref={prefixDropdownRef}
            className="absolute z-[9999] mt-1 bg-background-elevated border border-border-strong rounded-lg shadow-lg overflow-hidden min-w-[120px]"
          >
            {prefixOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handlePrefixSelect(option.value)}
                className={cn(
                  'w-full px-4 py-2 text-left hover:bg-muted transition text-[13px]',
                  prefixValue === option.value ? 'bg-muted' : ''
                )}
              >
                <span className="font-medium text-foreground">{option.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Dropdown */}
      <div className="relative flex-1">
        <button
          ref={mainButtonRef}
          type="button"
          onClick={() => !disabled && prefixValue && setMainOpen(!mainOpen)}
          disabled={disabled || !prefixValue}
          className={cn(
            'w-full px-4 bg-background-elevated border border-border-strong text-foreground text-left flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted focus:outline-none focus:border-accent transition-colors',
            variant === 'rounded' ? 'rounded-r-xl' : 'rounded-r-[52px]',
            sizeStyles[currentSize]
          )}
        >
          <span className={value ? '' : 'text-muted-foreground'}>
            {mainLabel || placeholder}
          </span>
          <ChevronIcon isOpen={mainOpen} />
        </button>

        {mainOpen && (
          <div
            ref={mainDropdownRef}
            className="fixed z-[9999] bg-background-elevated border border-border-strong rounded-lg shadow-lg max-h-96 overflow-hidden"
            style={{
              top: `${dropdownPosition.top + 4}px`,
              left: `${dropdownPosition.left}px`,
              width: `${dropdownPosition.width}px`,
            }}
          >
            {/* Search Input */}
            {searchable && (
              <div className="p-2 border-b border-border sticky top-0 bg-background-elevated">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full px-3 py-2 bg-background-subtle border border-border rounded-md text-foreground text-[13px] focus:outline-none focus:border-accent"
                />
              </div>
            )}

            {/* Clear Option */}
            {clearable && value && (
              <button
                type="button"
                onClick={handleClear}
                className="w-full px-3 py-2 text-left hover:bg-muted text-muted-foreground text-[13px] border-b border-border"
              >
                -- Clear Selection --
              </button>
            )}

            {/* Options List */}
            <div className="max-h-80 overflow-y-auto">
              {!hasOptions ? (
                <div className="px-3 py-4 text-center text-muted-foreground text-[13px]">
                  No results found
                </div>
              ) : grouped ? (
                (filteredOptions as DropdownGroup[]).map((group) => (
                  <div key={group.label}>
                    {/* Group Header */}
                    <div className="px-3 py-2 bg-muted border-b border-border">
                      <p className="text-[11px] font-semibold text-foreground uppercase tracking-wide">
                        {group.label}
                      </p>
                    </div>
                    {/* Group Options */}
                    {group.options.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleMainSelect(option.value)}
                        className={cn(
                          'w-full px-3 py-2 text-left hover:bg-muted text-[13px]',
                          value === option.value ? 'bg-muted' : ''
                        )}
                      >
                        <span className="font-medium text-foreground">{option.label}</span>
                      </button>
                    ))}
                  </div>
                ))
              ) : (
                (filteredOptions as DropdownOption[]).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleMainSelect(option.value)}
                    className={cn(
                      'w-full px-3 py-2 text-left hover:bg-muted text-[13px]',
                      value === option.value ? 'bg-muted' : ''
                    )}
                  >
                    <span className="font-medium text-foreground">{option.label}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export { dropdownButtonVariants }

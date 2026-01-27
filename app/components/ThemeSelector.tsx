'use client'

import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'

// Inline SVG icons for reliable theming
const MonitorIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M8 21H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M12 17V21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

const MoonIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M21.5 14.0784C20.3003 14.7189 18.9301 15.0821 17.4751 15.0821C12.7491 15.0821 8.91797 11.251 8.91797 6.52501C8.91797 5.07002 9.28119 3.69983 9.92176 2.5C5.66778 3.49713 2.5 7.31527 2.5 11.8732C2.5 17.19 6.81023 21.5002 12.127 21.5002C16.685 21.5002 20.5031 18.3324 21.5 14.0784Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const SunIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M12 2V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M12 20V22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M4 12H2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M22 12H20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M19.778 4.22205L18.364 5.63605" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M5.636 18.364L4.222 19.778" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M19.778 19.778L18.364 18.364" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M5.636 5.636L4.222 4.222" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

const CheckIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4.16667 11.6667C4.16667 11.6667 5.83333 12.0833 7.08333 14.5833C7.08333 14.5833 11.7157 6.94444 15.8333 5.41667" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const THEME_OPTIONS = [
  { value: 'system', label: 'Auto', Icon: MonitorIcon },
  { value: 'dark', label: 'Dark', Icon: MoonIcon },
  { value: 'light', label: 'Light', Icon: SunIcon },
]

export function ThemeSelector() {
  const [mounted, setMounted] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const { theme, setTheme } = useTheme()

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    // Return skeleton to prevent hydration mismatch
    return (
      <div className="w-full px-3.5 py-2 flex items-center gap-3 rounded-[40px] bg-background-elevated border border-border animate-pulse">
        <div className="w-5 h-5 rounded bg-border-strong" />
        <div className="flex-1 min-w-0">
          <div className="h-3 bg-border-strong rounded w-16" />
        </div>
      </div>
    )
  }

  const currentTheme = THEME_OPTIONS.find(t => t.value === theme) || THEME_OPTIONS[0]
  const CurrentIcon = currentTheme.Icon

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3.5 py-2 flex items-center gap-3 rounded-[40px] hover:bg-muted transition font-poppins font-medium text-[13px] text-foreground"
      >
        <CurrentIcon className="w-5 h-5" />
        <span className="whitespace-nowrap flex-1 text-left">{currentTheme.label}</span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Content */}
          <div className="absolute bottom-full mb-2 left-0 right-0 bg-background-elevated border border-border rounded-[12px] shadow-lg z-50 py-2 overflow-hidden">
            {THEME_OPTIONS.map((option) => {
              const OptionIcon = option.Icon
              return (
                <button
                  key={option.value}
                  onClick={() => {
                    setTheme(option.value)
                    setIsOpen(false)
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2 hover:bg-muted transition text-left"
                >
                  <OptionIcon className="w-5 h-5" />
                  <span className="font-poppins font-medium text-[13px] text-foreground flex-1">
                    {option.label}
                  </span>
                  {theme === option.value && (
                    <CheckIcon className="w-5 h-5 shrink-0 text-accent" />
                  )}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

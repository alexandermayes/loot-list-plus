'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

const MIN_WIDTH = 200
const MAX_WIDTH = 260
const DEFAULT_WIDTH = 220
const STORAGE_KEY = 'sidebar-width'
const DESKTOP_BREAKPOINT = 1024 // lg breakpoint - below this, use hamburger menu

interface SidebarContextType {
  sidebarWidth: number
  setSidebarWidth: (width: number) => void
  isResizing: boolean
  setIsResizing: (resizing: boolean) => void
  minWidth: number
  maxWidth: number
  // Mobile/responsive state
  isMobile: boolean
  isMobileMenuOpen: boolean
  toggleMobileMenu: () => void
  closeMobileMenu: () => void
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [sidebarWidth, setSidebarWidthState] = useState(DEFAULT_WIDTH)
  const [isResizing, setIsResizing] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  // Mobile/responsive state
  const [isMobile, setIsMobile] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Load saved width from localStorage on mount and detect breakpoint
  useEffect(() => {
    const savedWidth = localStorage.getItem(STORAGE_KEY)
    if (savedWidth) {
      const width = parseInt(savedWidth, 10)
      if (width >= MIN_WIDTH && width <= MAX_WIDTH) {
        setSidebarWidthState(width)
      }
    }

    // Initial breakpoint check
    setIsMobile(window.innerWidth < DESKTOP_BREAKPOINT)
    setIsInitialized(true)
  }, [])

  // Listen for window resize to update mobile state
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < DESKTOP_BREAKPOINT
      setIsMobile(mobile)

      // Auto-close mobile menu when resizing to desktop
      if (!mobile) {
        setIsMobileMenuOpen(false)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const toggleMobileMenu = () => setIsMobileMenuOpen(prev => !prev)
  const closeMobileMenu = () => setIsMobileMenuOpen(false)

  // Save width to localStorage when it changes
  const setSidebarWidth = (width: number) => {
    const clampedWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width))
    setSidebarWidthState(clampedWidth)
    localStorage.setItem(STORAGE_KEY, clampedWidth.toString())
  }

  // Set CSS variable for sidebar width
  useEffect(() => {
    if (isInitialized) {
      document.documentElement.style.setProperty('--sidebar-width', `${sidebarWidth}px`)
    }
  }, [sidebarWidth, isInitialized])

  return (
    <SidebarContext.Provider
      value={{
        sidebarWidth,
        setSidebarWidth,
        isResizing,
        setIsResizing,
        minWidth: MIN_WIDTH,
        maxWidth: MAX_WIDTH,
        isMobile,
        isMobileMenuOpen,
        toggleMobileMenu,
        closeMobileMenu,
      }}
    >
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider')
  }
  return context
}

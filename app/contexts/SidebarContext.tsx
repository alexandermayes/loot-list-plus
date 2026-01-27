'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

const MIN_WIDTH = 140
const MAX_WIDTH = 260
const DEFAULT_WIDTH = 220
const STORAGE_KEY = 'sidebar-width'

interface SidebarContextType {
  sidebarWidth: number
  setSidebarWidth: (width: number) => void
  isResizing: boolean
  setIsResizing: (resizing: boolean) => void
  minWidth: number
  maxWidth: number
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [sidebarWidth, setSidebarWidthState] = useState(DEFAULT_WIDTH)
  const [isResizing, setIsResizing] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  // Load saved width from localStorage on mount
  useEffect(() => {
    const savedWidth = localStorage.getItem(STORAGE_KEY)
    if (savedWidth) {
      const width = parseInt(savedWidth, 10)
      if (width >= MIN_WIDTH && width <= MAX_WIDTH) {
        setSidebarWidthState(width)
      }
    }
    setIsInitialized(true)
  }, [])

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

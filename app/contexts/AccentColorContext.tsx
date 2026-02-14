'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { trackClientEvent } from '@/utils/analytics/client'
import { useNotification } from '@/app/contexts/NotificationContext'

// WoW item quality colors as accent options
// Adjusted from official WoW values for readable white text on solid backgrounds
export const ACCENT_COLORS = [
  { name: 'Legendary', value: '#ff8000' },   // Default - WoW Legendary orange
  { name: 'Epic', value: '#a335ee' },        // WoW Epic purple
  { name: 'Rare', value: '#0070dd' },        // WoW Rare blue
  { name: 'Uncommon', value: '#15b300' },    // WoW Uncommon green (darkened from #1eff00)
  { name: 'Artifact', value: '#c5a840' },    // WoW Artifact gold (darkened from #e6cc80)
  { name: 'Heirloom', value: '#0099cc' },    // WoW Heirloom blue (darkened from #00ccff)
] as const

export const DEFAULT_ACCENT_COLOR = '#ff8000'

// Pre-computed CSS filters for each accent color (converts white to the target color)
// These filters are calculated to transform white (#ffffff) to the target color
const ACCENT_FILTERS: Record<string, string> = {
  '#ff8000': 'invert(55%) sepia(89%) saturate(2274%) hue-rotate(1deg) brightness(101%) contrast(105%)',
  '#a335ee': 'invert(29%) sepia(98%) saturate(2472%) hue-rotate(262deg) brightness(87%) contrast(98%)',
  '#0070dd': 'invert(31%) sepia(93%) saturate(1565%) hue-rotate(196deg) brightness(96%) contrast(101%)',
  '#15b300': 'invert(50%) sepia(95%) saturate(1200%) hue-rotate(80deg) brightness(92%) contrast(105%)',
  '#c5a840': 'invert(70%) sepia(50%) saturate(600%) hue-rotate(10deg) brightness(90%) contrast(95%)',
  '#0099cc': 'invert(45%) sepia(90%) saturate(1200%) hue-rotate(165deg) brightness(92%) contrast(100%)',
}

interface AccentColorContextType {
  accentColor: string
  setAccentColor: (color: string) => void
  saveAccentColor: (color: string) => Promise<void>
  isLoading: boolean
}

const AccentColorContext = createContext<AccentColorContextType | null>(null)

// Helper to convert hex to HSL
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  // Remove # if present
  hex = hex.replace(/^#/, '')

  // Parse hex
  const r = parseInt(hex.substring(0, 2), 16) / 255
  const g = parseInt(hex.substring(2, 4), 16) / 255
  const b = parseInt(hex.substring(4, 6), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  }
}

// Apply accent color to CSS custom properties
function applyAccentColor(hex: string) {
  const hsl = hexToHsl(hex)
  const root = document.documentElement

  // Set the accent color CSS variable (format: "h s% l%")
  root.style.setProperty('--accent', `${hsl.h} ${hsl.s}% ${hsl.l}%`)
  root.style.setProperty('--accent-subtle', `${hsl.h} ${hsl.s}% ${hsl.l}% / 0.2`)
  root.style.setProperty('--ring', `${hsl.h} ${hsl.s}% ${hsl.l}%`)

  // Set foreground color based on lightness (dark text for light colors, white for dark)
  const foreground = hsl.l > 60 ? '0 0% 10%' : '0 0% 100%'
  root.style.setProperty('--accent-foreground', foreground)

  // Set the CSS filter for icon coloring
  const filter = ACCENT_FILTERS[hex] || ACCENT_FILTERS[DEFAULT_ACCENT_COLOR]
  root.style.setProperty('--accent-icon-filter', filter)
}

export function AccentColorProvider({ children }: { children: React.ReactNode }) {
  const [accentColor, setAccentColorState] = useState(DEFAULT_ACCENT_COLOR)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()
  const { showNotification } = useNotification()

  // Apply default accent color on mount (so CSS variables are set immediately)
  useEffect(() => {
    applyAccentColor(DEFAULT_ACCENT_COLOR)
  }, [])

  // Load accent color from user preferences
  useEffect(() => {
    const loadAccentColor = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setIsLoading(false)
          return
        }

        const { data } = await supabase
          .from('user_preferences')
          .select('accent_color')
          .eq('user_id', user.id)
          .single()

        if (data?.accent_color) {
          setAccentColorState(data.accent_color)
          applyAccentColor(data.accent_color)
        }
      } catch (error) {
        console.error('Failed to load accent color:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadAccentColor()
  }, [supabase])

  // Update accent color (applies immediately, doesn't save to DB)
  const setAccentColor = useCallback((color: string) => {
    setAccentColorState(color)
    applyAccentColor(color)
  }, [])

  // Save accent color to database
  const saveAccentColor = useCallback(async (color: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('user_preferences')
        .upsert(
          {
            user_id: user.id,
            accent_color: color === DEFAULT_ACCENT_COLOR ? null : color,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'user_id' }
        )

      if (error) {
        console.error('Failed to save accent color:', error)
        showNotification('error', 'Couldn\'t save accent color. Try again.')
      } else {
        trackClientEvent('accent_color_changed', { color })
      }
    } catch (error) {
      console.error('Failed to save accent color:', error)
      showNotification('error', 'Couldn\'t save accent color. Try again.')
    }
  }, [supabase, showNotification])

  return (
    <AccentColorContext.Provider value={{ accentColor, setAccentColor, saveAccentColor, isLoading }}>
      {children}
    </AccentColorContext.Provider>
  )
}

export function useAccentColor() {
  const context = useContext(AccentColorContext)
  if (!context) {
    throw new Error('useAccentColor must be used within an AccentColorProvider')
  }
  return context
}

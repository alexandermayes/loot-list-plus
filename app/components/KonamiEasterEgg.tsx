'use client'

import { useState, useEffect, useCallback } from 'react'

const KONAMI_CODE = [
  'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
  'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
  'b', 'a'
]

// Loot icons that "rain" down — WoW item quality colors
const LOOT_DROPS = [
  { emoji: '⚔️', color: '#a335ee' },  // epic purple
  { emoji: '🛡️', color: '#a335ee' },
  { emoji: '🗡️', color: '#ff8000' },  // legendary orange
  { emoji: '🏹', color: '#0070dd' },  // rare blue
  { emoji: '🔮', color: '#a335ee' },
  { emoji: '👑', color: '#ff8000' },
  { emoji: '💎', color: '#a335ee' },
  { emoji: '⭐', color: '#ff8000' },
]

interface FallingItem {
  id: number
  emoji: string
  left: number
  delay: number
  duration: number
}

export function KonamiEasterEgg() {
  const [active, setActive] = useState(false)
  const [items, setItems] = useState<FallingItem[]>([])

  const trigger = useCallback(() => {
    // Generate random falling items
    const drops: FallingItem[] = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      emoji: LOOT_DROPS[Math.floor(Math.random() * LOOT_DROPS.length)].emoji,
      left: Math.random() * 100,
      delay: Math.random() * 1.5,
      duration: 2 + Math.random() * 2,
    }))
    setItems(drops)
    setActive(true)

    // Auto-dismiss
    setTimeout(() => setActive(false), 4500)
  }, [])

  // Konami code listener (non-input keys only)
  useEffect(() => {
    let index = 0
    let timeout: ReturnType<typeof setTimeout>

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (e.key === KONAMI_CODE[index]) {
        index++
        if (index === KONAMI_CODE.length) {
          trigger()
          index = 0
        }
        clearTimeout(timeout)
        timeout = setTimeout(() => { index = 0 }, 2000)
      } else {
        index = 0
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      clearTimeout(timeout)
    }
  }, [trigger])

  // /camp easter egg — works in search inputs
  const [campMessage, setCampMessage] = useState(false)

  useEffect(() => {
    const handleInput = (e: Event) => {
      const target = e.target
      if (!(target instanceof HTMLInputElement)) return
      if (target.type !== 'text' && target.type !== 'search') return

      if (target.value.toLowerCase() === '/camp') {
        // Replace the input value with the camp message
        const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
        if (nativeSetter) {
          nativeSetter.call(target, '')
          target.dispatchEvent(new Event('input', { bubbles: true }))
        }
        setCampMessage(true)
        setTimeout(() => setCampMessage(false), 2000)
      }
    }

    document.addEventListener('input', handleInput)
    return () => document.removeEventListener('input', handleInput)
  }, [])

  if (!active && !campMessage) return null

  return (
    <>
    {/* /camp message */}
    {campMessage && (
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none animate-fade-in">
        <p className="text-sm text-warning/80 italic px-4 py-2 bg-background-elevated border border-border rounded-lg shadow-lg">
          You sit down and make camp.
        </p>
      </div>
    )}

    {/* Konami code loot rain */}
    {active && (
    <div
      className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden"
      aria-hidden="true"
    >
      {/* Centered "EPIC LOOT" text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <p
          className="text-4xl sm:text-6xl font-black tracking-wider animate-fade-in"
          style={{
            color: '#ff8000',
            textShadow: '0 0 40px rgba(255, 128, 0, 0.5), 0 0 80px rgba(255, 128, 0, 0.2)',
          }}
        >
          EPIC LOOT
        </p>
      </div>

      {/* Falling items */}
      {items.map((item) => (
        <span
          key={item.id}
          className="absolute text-2xl"
          style={{
            left: `${item.left}%`,
            top: '-40px',
            animation: `loot-rain ${item.duration}s ease-in ${item.delay}s forwards`,
          }}
        >
          {item.emoji}
        </span>
      ))}

      {/* Inline keyframes for the rain effect */}
      <style>{`
        @keyframes loot-rain {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translateY(110vh) rotate(360deg); opacity: 0; }
        }
      `}</style>
    </div>
    )}
    </>
  )
}

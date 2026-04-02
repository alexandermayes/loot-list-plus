'use client'

import { useEffect, useState } from 'react'
import { useMotionValue, useSpring } from 'framer-motion'

/**
 * Tracks mouse position across the viewport and returns smooth
 * motion values for parallax offset. Higher depth = more movement.
 *
 * Movement is relative to viewport center so items shift symmetrically.
 */
export function useMouseParallax(depth: number = 1) {
  const [enabled, setEnabled] = useState(false)
  const rawX = useMotionValue(0)
  const rawY = useMotionValue(0)

  // Smooth spring physics — slow & floaty to feel ambient, not reactive
  const x = useSpring(rawX, { stiffness: 30, damping: 30, mass: 1 })
  const y = useSpring(rawY, { stiffness: 30, damping: 30, mass: 1 })

  useEffect(() => {
    // Only enable on devices with a pointer (no touch)
    const mq = window.matchMedia('(pointer: fine)')
    if (!mq.matches) return
    setEnabled(true)

    const maxShift = 25 * depth

    const handleMouseMove = (e: MouseEvent) => {
      // Normalize to -1...1 from viewport center
      const nx = (e.clientX / window.innerWidth - 0.5) * 2
      const ny = (e.clientY / window.innerHeight - 0.5) * 2
      rawX.set(nx * maxShift)
      rawY.set(ny * maxShift)
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [depth, rawX, rawY])

  // Return zero motion values when disabled so nothing shifts on touch
  if (!enabled) {
    return { x: rawX, y: rawY } // both stay at 0
  }

  return { x, y }
}

'use client'

import { useEffect, RefObject } from 'react'
import { useMotionValue, useSpring } from 'framer-motion'

/**
 * Proximity-based mouse parallax. Only shifts the item when the cursor
 * is within `radius` px of the element's center. Effect strength fades
 * with distance.
 */
export function useMouseParallax(
  ref: RefObject<HTMLElement | null>,
  depth: number = 1,
  radius: number = 400,
) {
  const rawX = useMotionValue(0)
  const rawY = useMotionValue(0)

  const x = useSpring(rawX, { stiffness: 40, damping: 30, mass: 1 })
  const y = useSpring(rawY, { stiffness: 40, damping: 30, mass: 1 })

  useEffect(() => {
    const mq = window.matchMedia('(pointer: fine)')
    if (!mq.matches) return

    const maxShift = 20 * depth

    const handleMouseMove = (e: MouseEvent) => {
      const el = ref.current
      if (!el) return

      const rect = el.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2

      const dx = e.clientX - cx
      const dy = e.clientY - cy
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist > radius) {
        rawX.set(0)
        rawY.set(0)
        return
      }

      // Strength falls off as cursor moves away (1 at center, 0 at radius)
      const strength = 1 - dist / radius

      rawX.set((dx / radius) * maxShift * strength)
      rawY.set((dy / radius) * maxShift * strength)
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [depth, radius, rawX, rawY, ref])

  return { x, y }
}

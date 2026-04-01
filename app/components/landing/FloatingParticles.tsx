'use client'

import { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  size: number
  speedY: number
  speedX: number
  opacity: number
  hue: number
  depth: number
}

export default function FloatingParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const animFrameRef = useRef<number>(0)
  const scrollRef = useRef(0)
  const sectionsRef = useRef<{ top: number; bottom: number }[]>([])

  useEffect(() => {
    // Skip particles on mobile for performance
    if (window.innerWidth < 768) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const handleScroll = () => {
      scrollRef.current = window.scrollY
    }
    window.addEventListener('scroll', handleScroll, { passive: true })

    // Find the lighter sections (how-it-works gradient + stats)
    const updateSections = () => {
      const sections: { top: number; bottom: number }[] = []
      const hero = document.getElementById('hero')
      const howItWorks = document.getElementById('how-it-works')
      if (hero) {
        const rect = hero.getBoundingClientRect()
        sections.push({ top: rect.top + window.scrollY, bottom: rect.bottom + window.scrollY })
      }
      if (howItWorks) {
        const rect = howItWorks.getBoundingClientRect()
        sections.push({ top: rect.top + window.scrollY, bottom: rect.bottom + window.scrollY })
      }
      sectionsRef.current = sections
    }

    // Update section positions periodically
    updateSections()
    const sectionInterval = setInterval(updateSections, 2000)

    // Initialize particles
    const count = 35
    particlesRef.current = Array.from({ length: count }, () => {
      const depth = Math.random()
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: 0.5 + depth * 2,
        speedY: -(0.1 + depth * 0.3),
        speedX: (Math.random() - 0.5) * (0.1 + depth * 0.2),
        opacity: 0.08 + depth * 0.35,
        hue: Math.random() > 0.5 ? 270 + Math.random() * 30 : 30 + Math.random() * 20,
        depth,
      }
    })

    let lastScroll = 0

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const scroll = scrollRef.current
      const scrollDelta = scroll - lastScroll
      lastScroll = scroll

      const sections = sectionsRef.current
      const viewTop = scroll
      const viewBottom = scroll + canvas.height

      for (const p of particlesRef.current) {
        p.y += p.speedY
        p.x += p.speedX

        const parallaxOffset = scrollDelta * (0.05 + p.depth * 0.15)
        p.y -= parallaxOffset

        if (p.y < -20) {
          p.y = canvas.height + 20
          p.x = Math.random() * canvas.width
        } else if (p.y > canvas.height + 20) {
          p.y = -20
          p.x = Math.random() * canvas.width
        }

        // Check if this particle's world position is inside a lighter section
        const worldY = p.y + scroll
        let inSection = false
        for (const s of sections) {
          if (worldY >= s.top && worldY <= s.bottom) {
            inSection = true
            break
          }
        }

        if (!inSection) continue // Skip drawing particles outside lighter sections

        const pulse = Math.sin(Date.now() * 0.001 + p.x) * 0.15
        const alpha = Math.max(0, Math.min(1, p.opacity + pulse))

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${p.hue}, 70%, 70%, ${alpha})`
        ctx.fill()

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * (2 + p.depth * 2), 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${p.hue}, 70%, 70%, ${alpha * 0.12})`
        ctx.fill()
      }

      animFrameRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      cancelAnimationFrame(animFrameRef.current)
      clearInterval(sectionInterval)
      window.removeEventListener('resize', resize)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[1]"
      aria-hidden="true"
    />
  )
}

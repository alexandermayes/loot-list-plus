'use client'

import { useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, useScroll, useTransform, useAnimation, AnimatePresence } from 'framer-motion'
import { useMouseParallax } from './useMouseParallax'
import { ClickEffect, ClickEffectType } from './ClickEffects'

interface ParallaxItemProps {
  children: React.ReactNode
  speed: number
  className?: string
  style?: React.CSSProperties
  slideFrom?: 'left' | 'right'
  delay?: number
  depth?: number
  float?: {
    distance?: number
    duration?: number
    delay?: number
  }
  clickEffect?: ClickEffectType
  tooltip?: {
    name: string
    quality: 'legendary' | 'epic' | 'rare' | 'uncommon'
    type: string
    flavor?: string
  }
}

const qualityColors = {
  legendary: '#ff8000',
  epic: '#a335ee',
  rare: '#0070dd',
  uncommon: '#1eff00',
}

export default function ParallaxItem({
  children,
  speed,
  className,
  style,
  slideFrom,
  delay = 0,
  depth = 1,
  float,
  clickEffect,
  tooltip,
}: ParallaxItemProps) {
  const ref = useRef(null)
  const [hovered, setHovered] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0, rightSide: false })
  const [effects, setEffects] = useState<Array<{ id: number; x: number; y: number }>>([])
  const clickControls = useAnimation()
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })

  const y = useTransform(scrollYProgress, [0, 1], [speed * -200, speed * 200])
  const initialX = slideFrom === 'left' ? -60 : slideFrom === 'right' ? 60 : 0

  const mouse = useMouseParallax(ref, depth)

  const floatDistance = float?.distance ?? 12
  const floatDuration = float?.duration ?? 6
  const floatDelay = float?.delay ?? 0
  const [floatKeyframes] = useState(() => {
    const randY1 = -(floatDistance * (0.4 + Math.random() * 0.6))
    const randY2 = floatDistance * (0.2 + Math.random() * 0.4)
    const randY3 = -(floatDistance * (0.3 + Math.random() * 0.5))
    const randX1 = (Math.random() - 0.5) * floatDistance * 0.5
    const randX2 = (Math.random() - 0.5) * floatDistance * 0.4
    const randRot1 = (Math.random() - 0.5) * 3
    const randRot2 = (Math.random() - 0.5) * 2
    return {
      y: [0, randY1, randY2, randY3, 0],
      x: [0, randX1, randX2, -randX1, 0],
      rotate: [0, randRot1, randRot2, -randRot1, 0],
    }
  })

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!clickEffect) return

    // Scale punch
    clickControls.start({
      scale: [1, 1.12, 0.96, 1.03, 1],
      transition: { duration: 0.45, ease: 'easeOut' },
    })

    const id = Date.now() + Math.random()
    setEffects(prev => [...prev, { id, x: e.clientX, y: e.clientY }])
  }, [clickEffect, clickControls])

  const removeEffect = useCallback((id: number) => {
    setEffects(prev => prev.filter(e => e.id !== id))
  }, [])

  const handleMouseMove = (e: React.MouseEvent) => {
    const isRightSide = e.clientX > window.innerWidth / 2
    setMousePos({
      x: e.clientX,
      y: e.clientY + 16,
      rightSide: isRightSide,
    })
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ ...style, y, position: 'absolute' as const }}
      initial={{ opacity: 0, x: initialX }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, delay, ease: 'easeOut' }}
    >
      {/* Idle float layer */}
      <motion.div
        className="relative w-full h-full"
        animate={floatKeyframes}
        transition={{
          duration: floatDuration,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: floatDelay,
          repeatType: 'mirror',
        }}
        style={{ x: mouse.x }}
      >
        {/* Hover + click layer */}
        <motion.div
          animate={hovered ? { y: -10, rotate: 2, scale: 1.05 } : { y: 0, rotate: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="relative w-full h-full"
          style={tooltip || clickEffect ? { cursor: 'pointer', pointerEvents: 'auto' } : undefined}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onMouseMove={tooltip ? handleMouseMove : undefined}
          onClick={handleClick}
        >
          <motion.div className="relative w-full h-full" animate={clickControls}>
            {children}
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Click effects — rendered via portal */}
      {clickEffect && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {effects.map(effect => (
            <ClickEffect
              key={effect.id}
              type={clickEffect}
              x={effect.x}
              y={effect.y}
              onComplete={() => removeEffect(effect.id)}
            />
          ))}
        </AnimatePresence>,
        document.body,
      )}

      {/* WoW-style tooltip */}
      {tooltip && typeof document !== 'undefined' && (
        createPortal(
          <AnimatePresence>
            {hovered && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                className="fixed z-[9999] pointer-events-none"
                style={{
                  top: mousePos.y,
                  ...(mousePos.rightSide
                    ? { right: window.innerWidth - mousePos.x + 16 }
                    : { left: mousePos.x + 16 }),
                }}
              >
                <div className="bg-[#1a1a2e]/95 border border-[#4a4a6a] rounded px-3 py-2 shadow-xl backdrop-blur-sm">
                  <p
                    className="font-poppins font-bold text-[14px] leading-tight"
                    style={{ color: qualityColors[tooltip.quality] }}
                  >
                    {tooltip.name}
                  </p>
                  <p className="font-poppins text-[11px] text-[#bababa] mt-0.5">
                    {tooltip.type}
                  </p>
                  {tooltip.flavor && (
                    <p className="font-poppins text-[11px] text-[#ffd100] mt-1 italic">
                      &quot;{tooltip.flavor}&quot;
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )
      )}
    </motion.div>
  )
}

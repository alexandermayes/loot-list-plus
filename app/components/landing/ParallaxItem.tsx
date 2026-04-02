'use client'

import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import { useMouseParallax } from './useMouseParallax'

interface ParallaxItemProps {
  children: React.ReactNode
  speed: number
  className?: string
  style?: React.CSSProperties
  slideFrom?: 'left' | 'right'
  delay?: number
  /** Depth layer for mouse parallax (higher = moves more). Default 1 */
  depth?: number
  /** Idle float config */
  float?: {
    /** Y distance in px (default 12) */
    distance?: number
    /** Duration in seconds (default 6) */
    duration?: number
    /** Delay offset in seconds (default 0) */
    delay?: number
  }
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
  tooltip,
}: ParallaxItemProps) {
  const ref = useRef(null)
  const [hovered, setHovered] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0, rightSide: false })
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })

  const y = useTransform(scrollYProgress, [0, 1], [speed * -200, speed * 200])
  const initialX = slideFrom === 'left' ? -60 : slideFrom === 'right' ? 60 : 0

  // Mouse-reactive parallax
  const mouse = useMouseParallax(depth)

  // Idle float animation
  const floatDistance = float?.distance ?? 12
  const floatDuration = float?.duration ?? 6
  const floatDelay = float?.delay ?? 0

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
      style={{
        ...style,
        y,
        x: mouse.x,
        // Layer mouse Y on top of scroll Y via a wrapper below
      }}
      initial={{ opacity: 0, x: initialX }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.8, delay, ease: 'easeOut' }}
    >
      {/* Idle float layer */}
      <motion.div
        animate={{
          y: [0, -floatDistance, 0],
        }}
        transition={{
          duration: floatDuration,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: floatDelay,
        }}
        style={{ y: mouse.y }}
      >
        {/* Hover interaction layer */}
        <motion.div
          animate={hovered ? { y: -10, rotate: 2, scale: 1.05 } : { y: 0, rotate: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="w-full h-full"
          style={tooltip ? { cursor: 'pointer', pointerEvents: 'auto' } : undefined}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onMouseMove={tooltip ? handleMouseMove : undefined}
        >
          {children}
        </motion.div>
      </motion.div>

      {/* WoW-style tooltip - rendered via portal at cursor position */}
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

'use client'

import { motion } from 'framer-motion'

export type ClickEffectType = 'lightning' | 'shockwave' | 'slash' | 'eyeFlash' | 'holyNova' | 'frostShatter' | 'warCry' | 'shadowCleave'

interface ClickEffectProps {
  type: ClickEffectType
  x: number
  y: number
  onComplete: () => void
}

export function ClickEffect({ type, x, y, onComplete }: ClickEffectProps) {
  switch (type) {
    case 'lightning':
      return <LightningEffect x={x} y={y} onComplete={onComplete} />
    case 'shockwave':
      return <ShockwaveEffect x={x} y={y} onComplete={onComplete} />
    case 'slash':
      return <SlashEffect x={x} y={y} onComplete={onComplete} />
    case 'eyeFlash':
      return <EyeFlashEffect x={x} y={y} onComplete={onComplete} />
    case 'holyNova':
      return <HolyNovaEffect x={x} y={y} onComplete={onComplete} />
    case 'frostShatter':
      return <FrostShatterEffect x={x} y={y} onComplete={onComplete} />
    case 'warCry':
      return <WarCryEffect x={x} y={y} onComplete={onComplete} />
    case 'shadowCleave':
      return <ShadowCleaveEffect x={x} y={y} onComplete={onComplete} />
  }
}

type EffectProps = { x: number; y: number; onComplete: () => void }

/** Thunderfury — blue lightning bolts forking outward */
function LightningEffect({ x, y, onComplete }: EffectProps) {
  const bolts = Array.from({ length: 4 }, (_, i) => {
    const angle = (i * 90 + (Math.random() - 0.5) * 40) * (Math.PI / 180)
    const segments = []
    let cx = 0, cy = 0
    for (let s = 0; s < 5; s++) {
      const len = 15 + Math.random() * 25
      const jitter = (Math.random() - 0.5) * 30
      cx += Math.cos(angle) * len + Math.cos(angle + Math.PI / 2) * jitter
      cy += Math.sin(angle) * len + Math.sin(angle + Math.PI / 2) * jitter
      segments.push(`${cx},${cy}`)
    }
    return `0,0 ${segments.join(' ')}`
  })

  return (
    <motion.div
      className="fixed pointer-events-none z-[9998]"
      style={{ left: x, top: y, transform: 'translate(-50%, -50%)' }}
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      onAnimationComplete={onComplete}
    >
      <svg width="300" height="300" viewBox="-150 -150 300 300" className="overflow-visible">
        {bolts.map((points, i) => (
          <motion.polyline
            key={i}
            points={points}
            fill="none"
            stroke="#4dc9f6"
            strokeWidth={2.5 - i * 0.3}
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#lightning-glow)"
            initial={{ pathLength: 0, opacity: 1 }}
            animate={{ pathLength: 1, opacity: [1, 1, 0.6, 0] }}
            transition={{
              pathLength: { duration: 0.15, delay: i * 0.04, ease: 'easeOut' },
              opacity: { duration: 0.5, delay: i * 0.04 },
            }}
          />
        ))}
        <motion.circle
          cx={0} cy={0} r={8}
          fill="#a0e8ff"
          initial={{ opacity: 1, scale: 1 }}
          animate={{ opacity: 0, scale: 3 }}
          transition={{ duration: 0.3 }}
        />
        <defs>
          <filter id="lightning-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
      </svg>
    </motion.div>
  )
}

/** Sulfuras — fiery shockwave rings expanding outward */
function ShockwaveEffect({ x, y, onComplete }: EffectProps) {
  return (
    <motion.div
      className="fixed pointer-events-none z-[9998]"
      style={{ left: x, top: y, transform: 'translate(-50%, -50%)' }}
      onAnimationComplete={onComplete}
    >
      {[0, 0.08, 0.16].map((ringDelay, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            border: `${3 - i}px solid`,
            borderColor: i === 0 ? '#ff6a00' : i === 1 ? '#ff9500' : '#ffcc00',
            boxShadow: `0 0 ${20 - i * 5}px ${i === 0 ? '#ff6a0080' : '#ff950060'}, inset 0 0 ${10 - i * 3}px ${i === 0 ? '#ff6a0040' : '#ff950030'}`,
          }}
          initial={{ width: 10, height: 10, opacity: 1 }}
          animate={{ width: 180 - i * 30, height: 180 - i * 30, opacity: 0 }}
          transition={{ duration: 0.6, delay: ringDelay, ease: 'easeOut' }}
        />
      ))}
      <motion.div
        className="absolute rounded-full"
        style={{
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(circle, #ffdd00 0%, #ff6a00 40%, transparent 70%)',
        }}
        initial={{ width: 30, height: 30, opacity: 0.9 }}
        animate={{ width: 60, height: 60, opacity: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      />
      {Array.from({ length: 8 }, (_, i) => {
        const angle = (i * 45 + Math.random() * 20) * (Math.PI / 180)
        const dist = 40 + Math.random() * 50
        return (
          <motion.div
            key={`ember-${i}`}
            className="absolute w-[4px] h-[4px] rounded-full"
            style={{
              left: '50%',
              top: '50%',
              background: Math.random() > 0.5 ? '#ff8c00' : '#ffcc00',
              boxShadow: `0 0 6px ${Math.random() > 0.5 ? '#ff6a00' : '#ffcc00'}`,
            }}
            initial={{ x: 0, y: 0, opacity: 1 }}
            animate={{
              x: Math.cos(angle) * dist,
              y: Math.sin(angle) * dist,
              opacity: 0,
            }}
            transition={{ duration: 0.5 + Math.random() * 0.3, ease: 'easeOut' }}
          />
        )
      })}
    </motion.div>
  )
}

/** Warglaives — fel green X-slash marks */
function SlashEffect({ x, y, onComplete }: EffectProps) {
  return (
    <motion.div
      className="fixed pointer-events-none z-[9998]"
      style={{ left: x, top: y, transform: 'translate(-50%, -50%)' }}
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 0.7, ease: 'easeOut', delay: 0.2 }}
      onAnimationComplete={onComplete}
    >
      <svg width="200" height="200" viewBox="-100 -100 200 200" className="overflow-visible">
        <motion.line
          x1={-70} y1={-60} x2={70} y2={60}
          stroke="#1eff00" strokeWidth={4} strokeLinecap="round"
          filter="url(#slash-glow)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
        />
        <motion.line
          x1={65} y1={-65} x2={-65} y2={65}
          stroke="#1eff00" strokeWidth={4} strokeLinecap="round"
          filter="url(#slash-glow)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.15, delay: 0.1, ease: 'easeOut' }}
        />
        <motion.line
          x1={-70} y1={-60} x2={70} y2={60}
          stroke="#1eff0050" strokeWidth={14} strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0.8 }}
          animate={{ pathLength: 1, opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
        <motion.line
          x1={65} y1={-65} x2={-65} y2={65}
          stroke="#1eff0050" strokeWidth={14} strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0.8 }}
          animate={{ pathLength: 1, opacity: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
        />
        <motion.circle
          cx={0} cy={0} r={6} fill="#1eff00" filter="url(#slash-glow)"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: [0, 1, 0], scale: [0, 2, 3] }}
          transition={{ duration: 0.4, delay: 0.15 }}
        />
        <defs>
          <filter id="slash-glow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
      </svg>
    </motion.div>
  )
}

/** Cursed Vision — demonic eye flash with dark energy */
function EyeFlashEffect({ x, y, onComplete }: EffectProps) {
  return (
    <motion.div
      className="fixed pointer-events-none z-[9998]"
      style={{ left: x, top: y, transform: 'translate(-50%, -50%)' }}
      onAnimationComplete={onComplete}
    >
      <motion.div
        className="absolute rounded-full"
        style={{
          left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
          border: '2px solid #a335ee',
          boxShadow: '0 0 30px #a335ee80, 0 0 60px #a335ee40',
        }}
        initial={{ width: 20, height: 20, opacity: 1 }}
        animate={{ width: 140, height: 140, opacity: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />
      <svg
        width="160" height="80" viewBox="-80 -40 160 80"
        className="absolute overflow-visible"
        style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
      >
        <defs>
          <filter id="eye-glow">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        <motion.path
          d="M-60,0 Q0,-35 60,0 Q0,35 -60,0Z"
          fill="none" stroke="#d41c1c" strokeWidth={2} filter="url(#eye-glow)"
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: [0.3, 1.2, 1], opacity: [0, 1, 1, 0] }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        />
        <motion.circle
          cx={0} cy={0} r={12}
          fill="none" stroke="#d41c1c" strokeWidth={3} filter="url(#eye-glow)"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1.3, 1], opacity: [0, 1, 1, 0] }}
          transition={{ duration: 0.6, delay: 0.05 }}
        />
        <motion.circle
          cx={0} cy={0} r={5} fill="#d41c1c" filter="url(#eye-glow)"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1.5, 0.8, 0], opacity: [0, 1, 1, 0] }}
          transition={{ duration: 0.7, delay: 0.08 }}
        />
      </svg>
      <motion.div
        className="fixed inset-0 pointer-events-none"
        style={{ left: -x, top: -y, background: 'radial-gradient(circle at 50% 50%, #a335ee15 0%, transparent 60%)' }}
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
      />
    </motion.div>
  )
}

/** Val'anyr — golden holy nova burst with radiating light rays */
function HolyNovaEffect({ x, y, onComplete }: EffectProps) {
  const rayCount = 12
  return (
    <motion.div
      className="fixed pointer-events-none z-[9998]"
      style={{ left: x, top: y, transform: 'translate(-50%, -50%)' }}
      onAnimationComplete={onComplete}
    >
      <svg width="240" height="240" viewBox="-120 -120 240 240" className="overflow-visible">
        <defs>
          <filter id="holy-glow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        {/* Radiating light rays */}
        {Array.from({ length: rayCount }, (_, i) => {
          const angle = (i * (360 / rayCount)) * (Math.PI / 180)
          const len = 50 + Math.random() * 40
          return (
            <motion.line
              key={i}
              x1={0} y1={0}
              x2={Math.cos(angle) * len} y2={Math.sin(angle) * len}
              stroke="#e6cc80"
              strokeWidth={i % 2 === 0 ? 3 : 1.5}
              strokeLinecap="round"
              filter="url(#holy-glow)"
              initial={{ pathLength: 0, opacity: 1 }}
              animate={{ pathLength: [0, 1], opacity: [1, 1, 0] }}
              transition={{ duration: 0.5, delay: i * 0.02, ease: 'easeOut' }}
            />
          )
        })}
        {/* Inner golden burst */}
        <motion.circle
          cx={0} cy={0} r={15}
          fill="#e6cc80"
          filter="url(#holy-glow)"
          initial={{ opacity: 1, scale: 0.5 }}
          animate={{ opacity: 0, scale: 2.5 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
        {/* Bright white core */}
        <motion.circle
          cx={0} cy={0} r={6}
          fill="#fffbe6"
          initial={{ opacity: 1, scale: 1 }}
          animate={{ opacity: 0, scale: 4 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        />
      </svg>
      {/* Golden sparkle particles */}
      {Array.from({ length: 10 }, (_, i) => {
        const angle = (i * 36 + Math.random() * 15) * (Math.PI / 180)
        const dist = 30 + Math.random() * 60
        return (
          <motion.div
            key={`sparkle-${i}`}
            className="absolute w-[3px] h-[3px] rounded-full"
            style={{
              left: '50%', top: '50%',
              background: '#fffbe6',
              boxShadow: '0 0 8px #e6cc80, 0 0 4px #fffbe6',
            }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{
              x: Math.cos(angle) * dist,
              y: Math.sin(angle) * dist - 20,
              opacity: 0,
              scale: 0,
            }}
            transition={{ duration: 0.6 + Math.random() * 0.3, ease: 'easeOut' }}
          />
        )
      })}
    </motion.div>
  )
}

/** Invincible's Reins — frost shatter with ice crystal shards */
function FrostShatterEffect({ x, y, onComplete }: EffectProps) {
  const shardCount = 10
  return (
    <motion.div
      className="fixed pointer-events-none z-[9998]"
      style={{ left: x, top: y, transform: 'translate(-50%, -50%)' }}
      onAnimationComplete={onComplete}
    >
      <svg width="240" height="240" viewBox="-120 -120 240 240" className="overflow-visible">
        <defs>
          <filter id="frost-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        {/* Ice crystal shards flying outward */}
        {Array.from({ length: shardCount }, (_, i) => {
          const angle = (i * (360 / shardCount) + Math.random() * 20) * (Math.PI / 180)
          const dist = 50 + Math.random() * 50
          const size = 8 + Math.random() * 12
          const rotation = Math.random() * 360
          return (
            <motion.polygon
              key={i}
              points={`0,${-size} ${size * 0.3},0 0,${size} ${-size * 0.3},0`}
              fill={i % 3 === 0 ? '#a0e8ff' : i % 3 === 1 ? '#48cdf4' : '#ddf4ff'}
              filter="url(#frost-glow)"
              initial={{ x: 0, y: 0, opacity: 1, rotate: rotation }}
              animate={{
                x: Math.cos(angle) * dist,
                y: Math.sin(angle) * dist,
                opacity: 0,
                rotate: rotation + (Math.random() > 0.5 ? 180 : -180),
              }}
              transition={{ duration: 0.5 + Math.random() * 0.2, ease: 'easeOut' }}
            />
          )
        })}
        {/* Central frost burst */}
        <motion.circle
          cx={0} cy={0} r={20}
          fill="none"
          stroke="#48cdf4"
          strokeWidth={2}
          filter="url(#frost-glow)"
          initial={{ scale: 0.3, opacity: 1 }}
          animate={{ scale: 2, opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
        {/* White flash core */}
        <motion.circle
          cx={0} cy={0} r={10}
          fill="#ddf4ff"
          initial={{ opacity: 0.9, scale: 1 }}
          animate={{ opacity: 0, scale: 2 }}
          transition={{ duration: 0.3 }}
        />
      </svg>
      {/* Snowflake/ice dust */}
      {Array.from({ length: 6 }, (_, i) => {
        const angle = (i * 60 + Math.random() * 30) * (Math.PI / 180)
        const dist = 60 + Math.random() * 40
        return (
          <motion.div
            key={`dust-${i}`}
            className="absolute w-[2px] h-[2px] rounded-full"
            style={{
              left: '50%', top: '50%',
              background: '#ddf4ff',
              boxShadow: '0 0 6px #48cdf4',
            }}
            initial={{ x: 0, y: 0, opacity: 1 }}
            animate={{
              x: Math.cos(angle) * dist,
              y: Math.sin(angle) * dist + 15,
              opacity: 0,
            }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
          />
        )
      })}
    </motion.div>
  )
}

/** Tusks of Mannoroth — brutal war cry with concentric red/orange arcs */
function WarCryEffect({ x, y, onComplete }: EffectProps) {
  return (
    <motion.div
      className="fixed pointer-events-none z-[9998]"
      style={{ left: x, top: y, transform: 'translate(-50%, -50%)' }}
      onAnimationComplete={onComplete}
    >
      <svg width="260" height="260" viewBox="-130 -130 260 260" className="overflow-visible">
        <defs>
          <filter id="warcry-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        {/* Radiating arc segments — like a roar spreading outward */}
        {Array.from({ length: 6 }, (_, i) => {
          const startAngle = i * 60 + 15
          const endAngle = startAngle + 30
          const r = 40 + i * 5
          const x1 = Math.cos((startAngle * Math.PI) / 180) * r
          const y1 = Math.sin((startAngle * Math.PI) / 180) * r
          const x2 = Math.cos((endAngle * Math.PI) / 180) * r
          const y2 = Math.sin((endAngle * Math.PI) / 180) * r
          return (
            <motion.path
              key={i}
              d={`M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`}
              fill="none"
              stroke={i % 2 === 0 ? '#fd571b' : '#ff8c42'}
              strokeWidth={4}
              strokeLinecap="round"
              filter="url(#warcry-glow)"
              initial={{ pathLength: 0, opacity: 1, scale: 0.5 }}
              animate={{ pathLength: 1, opacity: 0, scale: 2.5 }}
              transition={{ duration: 0.5, delay: i * 0.03, ease: 'easeOut' }}
            />
          )
        })}
        {/* Impact lines — like cracks radiating from impact */}
        {Array.from({ length: 5 }, (_, i) => {
          const angle = (i * 72 + Math.random() * 15) * (Math.PI / 180)
          const innerR = 10
          const outerR = 35 + Math.random() * 25
          return (
            <motion.line
              key={`crack-${i}`}
              x1={Math.cos(angle) * innerR} y1={Math.sin(angle) * innerR}
              x2={Math.cos(angle) * outerR} y2={Math.sin(angle) * outerR}
              stroke="#fd571b"
              strokeWidth={2.5}
              strokeLinecap="round"
              filter="url(#warcry-glow)"
              initial={{ pathLength: 0, opacity: 1 }}
              animate={{ pathLength: 1, opacity: [1, 0.8, 0] }}
              transition={{ duration: 0.3, delay: 0.05 + i * 0.03 }}
            />
          )
        })}
        {/* Center rage burst */}
        <motion.circle
          cx={0} cy={0} r={12}
          fill="#fd571b"
          filter="url(#warcry-glow)"
          initial={{ opacity: 1, scale: 1 }}
          animate={{ opacity: 0, scale: 3 }}
          transition={{ duration: 0.4 }}
        />
      </svg>
    </motion.div>
  )
}

/** Corrupted Ashbringer — dark shadowy arc slash with unholy energy */
function ShadowCleaveEffect({ x, y, onComplete }: EffectProps) {
  return (
    <motion.div
      className="fixed pointer-events-none z-[9998]"
      style={{ left: x, top: y, transform: 'translate(-50%, -50%)' }}
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: 'easeOut', delay: 0.25 }}
      onAnimationComplete={onComplete}
    >
      <svg width="220" height="220" viewBox="-110 -110 220 220" className="overflow-visible">
        <defs>
          <filter id="shadow-glow">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        {/* Wide sweeping arc slash */}
        <motion.path
          d="M -80 40 Q -20 -80 80 -30"
          fill="none"
          stroke="#64c864"
          strokeWidth={5}
          strokeLinecap="round"
          filter="url(#shadow-glow)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        />
        {/* Wide glow trail */}
        <motion.path
          d="M -80 40 Q -20 -80 80 -30"
          fill="none"
          stroke="#64c86440"
          strokeWidth={20}
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0.7 }}
          animate={{ pathLength: 1, opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
        {/* Shadow wisps trailing the slash */}
        {Array.from({ length: 6 }, (_, i) => {
          const t = i / 5
          const sx = -80 + t * 160 + (Math.random() - 0.5) * 30
          const sy = 40 - t * 70 + (Math.random() - 0.5) * 40
          return (
            <motion.circle
              key={i}
              cx={sx} cy={sy}
              r={4 + Math.random() * 4}
              fill="#2d5a2d"
              filter="url(#shadow-glow)"
              initial={{ opacity: 0.8, scale: 1 }}
              animate={{ opacity: 0, scale: 2, y: -20 - Math.random() * 20 }}
              transition={{ duration: 0.5, delay: 0.05 + i * 0.04, ease: 'easeOut' }}
            />
          )
        })}
        {/* Corrupted energy sparks */}
        <motion.circle
          cx={0} cy={-20} r={5}
          fill="#64c864"
          filter="url(#shadow-glow)"
          initial={{ opacity: 1, scale: 0.5 }}
          animate={{ opacity: 0, scale: 3 }}
          transition={{ duration: 0.35, delay: 0.1 }}
        />
      </svg>
    </motion.div>
  )
}

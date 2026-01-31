'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import {
  Modal,
  ModalBody,
  ModalFooter,
} from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { HugeiconsIcon } from '@hugeicons/react'
import { CrownIcon, CheckListIcon, SparklesIcon, Cancel01Icon, Shield01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons'

interface OnboardingModalProps {
  open: boolean
  onClose: () => void
}

const TOTAL_STEPS = 3

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 100 : -100,
    opacity: 0
  }),
  center: {
    x: 0,
    opacity: 1
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 100 : -100,
    opacity: 0
  })
}

// Icon bounce animation when step becomes active
const iconVariants = {
  initial: { scale: 0.8, opacity: 0 },
  animate: {
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring" as const,
      stiffness: 400,
      damping: 15
    }
  }
}

// Epic glow animation for highlighted boxes
const epicGlowVariants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { delay: 0.2, duration: 0.3 }
  }
}

export default function OnboardingModal({ open, onClose }: OnboardingModalProps) {
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(0)

  const nextStep = () => {
    if (step < TOTAL_STEPS - 1) {
      setDirection(1)
      setStep(step + 1)
    }
  }

  const prevStep = () => {
    if (step > 0) {
      setDirection(-1)
      setStep(step - 1)
    }
  }

  const handleClose = () => {
    setStep(0)
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <Modal open={open} onClose={handleClose} size="default">
          {/* Custom branded header with gradient */}
          <div className="relative overflow-hidden rounded-t-xl">
            {/* Animated gradient background - subtle color shift */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-br from-accent/20 via-purple-500/15 to-accent/20 bg-[length:200%_200%]"
              animate={{
                backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'],
              }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            />
            {/* Fade to background at bottom */}
            <div className="absolute inset-0 bg-gradient-to-t from-background-elevated to-transparent" />

            {/* Glow effect behind logo */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-accent/30 rounded-full blur-3xl" />

            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 z-10 p-1.5 rounded-full bg-background/50 hover:bg-background/80 text-foreground-secondary hover:text-foreground transition-colors"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={18} />
            </button>

            {/* Header content */}
            <div className="relative z-10 flex flex-col items-center pt-8 pb-6 px-6">
              {/* Logo with glow animation */}
              <div className="relative mb-4">
                <motion.div
                  className="absolute inset-0 bg-accent/40 rounded-full blur-xl"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.4, 0.6, 0.4]
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
                <Image
                  src="/lootlist-icon.svg"
                  alt="LootList+"
                  width={48}
                  height={56}
                  className="relative z-10 drop-shadow-lg"
                />
              </div>

              <h2 className="text-xl font-semibold text-foreground mb-1">
                Welcome to LootList+
              </h2>
              <p className="text-foreground-secondary text-[14px]">
                Here&apos;s how the loot system works
              </p>
            </div>
          </div>

          <ModalBody className="py-6 px-8">
            <div className="relative h-[240px] overflow-hidden">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={step}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="absolute inset-0"
                >
                {step === 0 && (
                  <div className="space-y-6">
                    {/* What is this */}
                    <div className="flex gap-5">
                      <motion.div
                        variants={iconVariants}
                        initial="initial"
                        animate="animate"
                        className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0"
                      >
                        <HugeiconsIcon icon={CrownIcon} size={24} className="text-accent" />
                      </motion.div>
                      <div>
                        <h3 className="text-foreground font-semibold text-[16px] mb-2">What is this?</h3>
                        <p className="text-foreground-secondary text-[14px] leading-relaxed">
                          A loot priority system that speeds up raid loot distribution, sets clear expectations, and removes drama.
                        </p>
                      </div>
                    </div>

                    {/* Getting started */}
                    <div className="flex gap-5">
                      <motion.div
                        variants={iconVariants}
                        initial="initial"
                        animate="animate"
                        transition={{ delay: 0.1 }}
                        className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0"
                      >
                        <HugeiconsIcon icon={CheckListIcon} size={24} className="text-blue-500" />
                      </motion.div>
                      <div>
                        <h3 className="text-foreground font-semibold text-[16px] mb-2">Getting started</h3>
                        <ol className="text-foreground-secondary text-[14px] space-y-1.5 list-decimal list-inside">
                          <li>Find your guild</li>
                          <li>Register your character</li>
                          <li>Submit your loot list</li>
                          <li>Get your loot</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                )}

                {step === 1 && (
                  <div className="space-y-6">
                    <div className="flex gap-5">
                      <motion.div
                        variants={iconVariants}
                        initial="initial"
                        animate="animate"
                        className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0"
                      >
                        <HugeiconsIcon icon={Shield01Icon} size={24} className="text-purple-500" />
                      </motion.div>
                      <div>
                        <h3 className="text-foreground font-semibold text-[16px] mb-2">How ranking works</h3>
                        <div className="text-foreground-secondary text-[14px] leading-relaxed space-y-3">
                          <p>
                            Rank items from <span className="text-foreground font-medium">50 to 1</span> based on how much you want them.
                          </p>
                          <p>
                            When loot drops, the highest priority player gets it. Ties are broken by /roll.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Epic glow highlight box */}
                    <motion.div
                      variants={epicGlowVariants}
                      initial="initial"
                      animate="animate"
                      className="relative rounded-lg p-4 text-center overflow-hidden"
                    >
                      {/* Animated gradient border */}
                      <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-purple-500/50 via-accent/50 to-purple-500/50 animate-gradient-x" />
                      <div className="absolute inset-[1px] rounded-lg bg-background-subtle" />
                      <p className="relative text-foreground font-medium text-[14px]">
                        Higher number = High priority
                      </p>
                    </motion.div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-6">
                    <div className="flex gap-5">
                      <motion.div
                        variants={iconVariants}
                        initial="initial"
                        animate="animate"
                        className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0"
                      >
                        <HugeiconsIcon icon={SparklesIcon} size={24} className="text-green-500" />
                      </motion.div>
                      <div>
                        <h3 className="text-foreground font-semibold text-[16px] mb-2">Why use it?</h3>
                        <ul className="text-foreground-secondary text-[14px] space-y-2">
                          <li><span className="text-foreground font-medium">Faster loot distribution</span> = more raid time</li>
                          <li><span className="text-foreground font-medium">Clear expectations</span> = no surprises</li>
                          <li><span className="text-foreground font-medium">Export to in-game addons</span> = easy reference during raids</li>
                        </ul>
                      </div>
                    </div>

                    {/* Epic glow CTA box */}
                    <motion.div
                      variants={epicGlowVariants}
                      initial="initial"
                      animate="animate"
                      className="relative rounded-lg p-4 text-center overflow-hidden"
                    >
                      {/* Animated gradient border */}
                      <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-accent/50 via-yellow-500/50 to-accent/50 animate-gradient-x" />
                      <div className="absolute inset-[1px] rounded-lg bg-background-subtle" />
                      <p className="relative text-foreground-secondary text-[14px]">
                        Ready to get started? Head to your <span className="text-accent font-medium">Loot List</span> and rank the items you want!
                      </p>
                    </motion.div>
                  </div>
                )}
                </motion.div>
              </AnimatePresence>
            </div>
          </ModalBody>

          <ModalFooter className="flex-col gap-4">
            {/* Step indicators */}
            <div className="flex justify-center gap-2">
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setDirection(i > step ? 1 : -1)
                    setStep(i)
                  }}
                  className={`w-2 h-2 rounded-full transition-all duration-200 ${
                    i === step
                      ? 'bg-accent w-6'
                      : 'bg-foreground/20 hover:bg-foreground/40'
                  }`}
                />
              ))}
            </div>

            {/* Navigation buttons */}
            <div className="flex gap-3 w-full">
              <Button
                variant="secondary"
                onClick={prevStep}
                disabled={step === 0}
                className="flex-1"
              >
                Back
              </Button>

              {step < TOTAL_STEPS - 1 ? (
                <Button onClick={nextStep} className="flex-1 gap-2">
                  Next
                  <HugeiconsIcon icon={ArrowRight01Icon} size={18} />
                </Button>
              ) : (
                <Button onClick={handleClose} className="flex-1 relative overflow-hidden group">
                  <span className="relative z-10">Got it</span>
                  {/* Shine effect */}
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                </Button>
              )}
            </div>
          </ModalFooter>
        </Modal>
      )}
    </AnimatePresence>
  )
}

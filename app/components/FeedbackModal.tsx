'use client'

import { useState, useEffect, useRef } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Bug01Icon, Camera01Icon, SentIcon, Cancel01Icon, Loading03Icon } from '@hugeicons/core-free-icons'
import html2canvas from 'html2canvas'

interface FeedbackModalProps {
  isOpen: boolean
  onClose: () => void
}

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const [description, setDescription] = useState('')
  const [screenshot, setScreenshot] = useState<string | null>(null)
  const [capturing, setCapturing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Capture screenshot when modal opens
  useEffect(() => {
    if (isOpen && !screenshot) {
      captureScreenshot()
    }
  }, [isOpen])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setDescription('')
      setScreenshot(null)
      setError('')
      setSuccess(false)
    }
  }, [isOpen])

  const captureScreenshot = async () => {
    setCapturing(true)
    try {
      // Hide the modal temporarily for screenshot
      if (modalRef.current) {
        modalRef.current.style.display = 'none'
      }

      // Small delay to ensure modal is hidden
      await new Promise(resolve => setTimeout(resolve, 100))

      const canvas = await html2canvas(document.body, {
        useCORS: true,
        allowTaint: true,
        scale: 0.5, // Reduce size for Discord
        logging: false,
        ignoreElements: (element) => {
          // Ignore the modal backdrop
          return element.classList?.contains('feedback-modal-backdrop')
        }
      })

      const dataUrl = canvas.toDataURL('image/png', 0.8)
      setScreenshot(dataUrl)
    } catch (err) {
      console.error('Failed to capture screenshot:', err)
    } finally {
      // Show the modal again
      if (modalRef.current) {
        modalRef.current.style.display = ''
      }
      setCapturing(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!description.trim()) {
      setError('Please describe the bug or feedback')
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          description: description.trim(),
          screenshot,
          pageUrl: window.location.href,
          userAgent: navigator.userAgent
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to submit feedback')
        return
      }

      setSuccess(true)
      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (err) {
      console.error('Error submitting feedback:', err)
      setError('Failed to submit feedback. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="feedback-modal-backdrop fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="bg-background-subtle border border-border-strong rounded-xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-border-strong flex items-center justify-between bg-background-elevated">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
              <HugeiconsIcon icon={Bug01Icon} size={20} className="text-accent" />
            </div>
            <div>
              <h3 className="text-[20px] font-bold text-foreground">Report a Bug</h3>
              <p className="text-[12px] text-muted-foreground">Help us improve LootList+</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={24} />
          </button>
        </div>

        {/* Content */}
        {success ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-600/20 flex items-center justify-center mx-auto mb-4">
              <HugeiconsIcon icon={SentIcon} size={32} className="text-green-400" />
            </div>
            <h4 className="text-[18px] font-semibold text-foreground mb-2">Thanks for your feedback!</h4>
            <p className="text-[14px] text-muted-foreground">We'll look into this and get back to you if needed.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="p-6 space-y-5 overflow-y-auto">
              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-900/20 border border-red-600 rounded-xl">
                  <p className="text-red-200 text-[13px]">{error}</p>
                </div>
              )}

              {/* Screenshot Preview */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[13px] font-medium text-foreground flex items-center gap-2">
                    <HugeiconsIcon icon={Camera01Icon} size={16} className="text-muted-foreground" />
                    Screenshot
                  </label>
                  <button
                    type="button"
                    onClick={captureScreenshot}
                    disabled={capturing}
                    className="text-[12px] text-accent hover:text-accent/80 transition disabled:opacity-50"
                  >
                    {capturing ? 'Capturing...' : 'Retake'}
                  </button>
                </div>
                <div className="relative bg-background-elevated border border-border-strong rounded-xl overflow-hidden aspect-video">
                  {capturing ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <HugeiconsIcon icon={Loading03Icon} size={32} className="text-muted-foreground animate-spin" />
                    </div>
                  ) : screenshot ? (
                    <img
                      src={screenshot}
                      alt="Screenshot"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-foreground-muted">
                      No screenshot captured
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-foreground-muted mt-1">
                  This screenshot was taken when you opened the feedback form
                </p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-[13px] font-medium text-foreground mb-2">
                  What went wrong? <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 bg-background-elevated border border-border-strong rounded-xl text-foreground text-[14px] focus:outline-none focus:border-accent transition resize-none placeholder:text-foreground-muted"
                  placeholder="Describe the bug or issue you encountered..."
                  autoFocus
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-border-strong bg-background-elevated flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-6 py-2.5 bg-background-elevated hover:bg-muted border border-border-strong rounded-[52px] text-foreground text-[13px] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !description.trim()}
                className="px-6 py-2.5 bg-accent hover:bg-accent/80 rounded-[52px] text-foreground text-[13px] font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <HugeiconsIcon icon={Loading03Icon} size={16} className="animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <HugeiconsIcon icon={SentIcon} size={16} />
                    Submit Feedback
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

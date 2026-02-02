'use client'

import { useState, useEffect, useRef } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Bug01Icon, Camera01Icon, SentIcon } from '@hugeicons/core-free-icons'
import { Spinner } from '@/components/ui/loading-spinner'
import html2canvas from 'html2canvas'
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
} from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

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

  return (
    <Modal open={isOpen} onClose={onClose} size="default">
      <div ref={modalRef}>
        {success ? (
          <>
            <ModalHeader onClose={onClose} showCloseButton={false}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                  <HugeiconsIcon icon={Bug01Icon} size={20} className="text-accent" />
                </div>
                <div>
                  <ModalTitle>Report a Bug</ModalTitle>
                  <ModalDescription>Help us improve LootList+</ModalDescription>
                </div>
              </div>
            </ModalHeader>
            <ModalBody className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4">
                <HugeiconsIcon icon={SentIcon} size={32} className="text-success" />
              </div>
              <h4 className="text-[18px] font-semibold text-foreground mb-2">Thanks for your feedback!</h4>
              <p className="text-[14px] text-muted-foreground">We'll look into this and get back to you if needed.</p>
            </ModalBody>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <ModalHeader onClose={onClose}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                  <HugeiconsIcon icon={Bug01Icon} size={20} className="text-accent" />
                </div>
                <div>
                  <ModalTitle>Report a Bug</ModalTitle>
                  <ModalDescription>Help us improve LootList+</ModalDescription>
                </div>
              </div>
            </ModalHeader>

            <ModalBody className="space-y-5">
              {/* Error Message */}
              {error && (
                <div className="p-4 bg-destructive/10 border border-destructive rounded-xl">
                  <p className="text-destructive text-[13px]">{error}</p>
                </div>
              )}

              {/* Screenshot Preview */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="flex items-center gap-2">
                    <HugeiconsIcon icon={Camera01Icon} size={16} className="text-muted-foreground" />
                    Screenshot
                  </Label>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={captureScreenshot}
                    disabled={capturing}
                    className="text-[12px] h-auto p-0"
                  >
                    {capturing ? 'Capturing...' : 'Retake'}
                  </Button>
                </div>
                <div className="relative bg-background-elevated border border-border-strong rounded-xl overflow-hidden aspect-video">
                  {capturing ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Spinner size="lg" className="text-muted-foreground" />
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
                <Label className="mb-2">
                  What went wrong? <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  variant="rounded"
                  placeholder="Describe the bug or issue you encountered..."
                  autoFocus
                />
              </div>
            </ModalBody>

            <ModalFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="accent"
                loading={submitting}
                disabled={!description.trim()}
              >
                <HugeiconsIcon icon={SentIcon} size={16} />
                Submit Feedback
              </Button>
            </ModalFooter>
          </form>
        )}
      </div>
    </Modal>
  )
}

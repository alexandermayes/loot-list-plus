'use client'

import { useEffect, useRef } from 'react'
import { trackClientEvent } from '@/utils/analytics/client'

interface BlogTrackerProps {
  slug: string
  title: string
}

/**
 * Client component for blog engagement tracking.
 * Tracks: blog_post_viewed, blog_scroll_depth, blog_time_on_page, blog_cta_clicked.
 * Drop into any blog post page alongside the article content.
 */
export default function BlogTracker({ slug, title }: BlogTrackerProps) {
  const startTime = useRef(Date.now())
  const firedDepths = useRef(new Set<number>())

  useEffect(() => {
    trackClientEvent('blog_post_viewed', { slug, title })
  }, [slug, title])

  // Scroll depth tracking (25%, 50%, 75%, 100%)
  useEffect(() => {
    const article = document.querySelector('article')
    if (!article) return

    const milestones = [25, 50, 75, 100]

    const handleScroll = () => {
      const rect = article.getBoundingClientRect()
      const articleHeight = rect.height
      const scrolled = window.innerHeight - rect.top
      const pct = Math.min(Math.round((scrolled / articleHeight) * 100), 100)

      for (const milestone of milestones) {
        if (pct >= milestone && !firedDepths.current.has(milestone)) {
          firedDepths.current.add(milestone)
          trackClientEvent('blog_scroll_depth', { slug, depth: milestone })
        }
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // check initial position
    return () => window.removeEventListener('scroll', handleScroll)
  }, [slug])

  // Time on page (fires on visibility change or unload)
  useEffect(() => {
    const sendTime = () => {
      const seconds = Math.round((Date.now() - startTime.current) / 1000)
      if (seconds > 2) {
        trackClientEvent('blog_time_on_page', { slug, seconds })
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') sendTime()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      sendTime()
    }
  }, [slug])

  // CTA click tracking (links to lootlistplus.com within the article)
  useEffect(() => {
    const article = document.querySelector('article')
    if (!article) return

    const handleClick = (e: Event) => {
      const target = (e.target as HTMLElement).closest('a')
      if (!target) return
      const href = target.getAttribute('href')
      if (href && href.includes('lootlistplus.com')) {
        trackClientEvent('blog_cta_clicked', { slug, cta_url: href })
      }
    }

    article.addEventListener('click', handleClick)
    return () => article.removeEventListener('click', handleClick)
  }, [slug])

  return null
}

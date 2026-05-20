'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Rocket01Icon,
  ScrollIcon,
  Settings01Icon,
  Calendar01Icon,
  HelpCircleIcon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
} from '@hugeicons/core-free-icons'
import { helpCategories, findArticle, type HelpArticle, type HelpCategory } from '@/lib/help-content'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { cn } from '@/lib/utils'

// Map icon names to actual icons
const iconMap: Record<string, typeof Rocket01Icon> = {
  RocketIcon: Rocket01Icon,
  ScrollIcon: ScrollIcon,
  Settings01Icon: Settings01Icon,
  Calendar01Icon: Calendar01Icon,
  HelpCircleIcon: HelpCircleIcon,
}

// Simple markdown renderer (basic support for common elements)
function renderMarkdown(content: string) {
  const lines = content.trim().split('\n')
  const elements: React.ReactNode[] = []
  let currentList: string[] = []
  let inList = false
  let listKey = 0

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`list-${listKey++}`} className="list-disc list-inside space-y-1 mb-4 text-foreground-secondary">
          {currentList.map((item, i) => (
            <li key={i}>{parseInline(item)}</li>
          ))}
        </ul>
      )
      currentList = []
    }
    inList = false
  }

  // Parse inline markdown (bold, links, code)
  const parseInline = (text: string): React.ReactNode => {
    // Handle bold (**text**)
    const parts = text.split(/(\*\*[^*]+\*\*)/g)
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-semibold text-foreground">
            {part.slice(2, -2)}
          </strong>
        )
      }
      // Handle inline code (`code`)
      const codeParts = part.split(/(`[^`]+`)/g)
      return codeParts.map((codePart, j) => {
        if (codePart.startsWith('`') && codePart.endsWith('`')) {
          return (
            <code key={`${i}-${j}`} className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">
              {codePart.slice(1, -1)}
            </code>
          )
        }
        return codePart
      })
    })
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Skip empty lines but flush list first
    if (!line.trim()) {
      flushList()
      continue
    }

    // Headers
    if (line.startsWith('# ')) {
      flushList()
      elements.push(
        <h1 key={i} className="text-3xl font-bold text-foreground mb-4 mt-6 first:mt-0">
          {line.slice(2)}
        </h1>
      )
      continue
    }
    if (line.startsWith('## ')) {
      flushList()
      elements.push(
        <h2 key={i} className="text-xl font-semibold text-foreground mb-3 mt-6">
          {line.slice(3)}
        </h2>
      )
      continue
    }
    if (line.startsWith('### ')) {
      flushList()
      elements.push(
        <h3 key={i} className="text-lg font-semibold text-foreground mb-2 mt-4">
          {line.slice(4)}
        </h3>
      )
      continue
    }

    // List items
    if (line.startsWith('- ')) {
      inList = true
      currentList.push(line.slice(2))
      continue
    }

    // Numbered list
    if (/^\d+\.\s/.test(line)) {
      flushList()
      const match = line.match(/^\d+\.\s(.+)/)
      if (match) {
        elements.push(
          <div key={i} className="flex gap-2 mb-1 text-foreground-secondary">
            <span className="text-accent font-medium">{line.match(/^\d+/)?.[0]}.</span>
            <span>{parseInline(match[1])}</span>
          </div>
        )
      }
      continue
    }

    // Regular paragraph
    flushList()
    elements.push(
      <p key={i} className="text-foreground-secondary mb-4 leading-relaxed">
        {parseInline(line)}
      </p>
    )
  }

  flushList()
  return elements
}

function Sidebar({
  currentSlug,
  onNavigate,
}: {
  currentSlug: string
  onNavigate: (slug: string) => void
}) {
  return (
    <nav className="w-64 flex-shrink-0 pr-8 border-r border-border self-start sticky top-0 max-h-screen overflow-y-auto py-4 sm:py-6 lg:py-8">
        {helpCategories.map((category) => {
          const Icon = iconMap[category.icon] || Rocket01Icon
          const hasCurrentArticle = category.articles.some((a) => a.slug === currentSlug)

          return (
            <div key={category.id} className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <HugeiconsIcon
                  icon={Icon}
                  size={16}
                  className={cn('text-muted-foreground', hasCurrentArticle && 'text-accent')}
                />
                <span
                  className={cn(
                    'text-sm font-medium text-muted-foreground',
                    hasCurrentArticle && 'text-foreground'
                  )}
                >
                  {category.title}
                </span>
              </div>
              <div className="space-y-1 ml-6">
                {category.articles.map((article) => (
                  <Button
                    key={article.slug}
                    variant="ghost"
                    size="sm"
                    onClick={() => onNavigate(article.slug)}
                    className={cn(
                      'w-full justify-start text-sm py-1.5 px-2 h-auto whitespace-normal text-left',
                      article.slug === currentSlug
                        ? 'bg-accent/10 text-accent font-medium'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    )}
                  >
                    {article.title}
                  </Button>
                ))}
              </div>
            </div>
          )
        })}
    </nav>
  )
}

export default function HelpArticlePage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string

  const [articleData, setArticleData] = useState<{
    article: HelpArticle
    category: HelpCategory
  } | null>(null)

  useEffect(() => {
    const found = findArticle(slug)
    if (found) {
      setArticleData(found)
      document.title = `LootList+ • ${found.article.title}`
    } else {
      // Redirect to help home if article not found
      router.push('/help')
    }
  }, [slug, router])

  // Find prev/next articles
  const getAdjacentArticles = () => {
    const allArticles = helpCategories.flatMap((c) => c.articles)
    const currentIndex = allArticles.findIndex((a) => a.slug === slug)
    return {
      prev: currentIndex > 0 ? allArticles[currentIndex - 1] : null,
      next: currentIndex < allArticles.length - 1 ? allArticles[currentIndex + 1] : null,
    }
  }

  const { prev, next } = getAdjacentArticles()

  if (!articleData) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[40vh]">
        <LoadingSpinner />
      </div>
    )
  }

  const { article, category } = articleData

  return (
    <div className="p-4 sm:p-6 lg:px-8 lg:py-0 flex flex-col lg:flex-row">
      {/* Sidebar - hidden on mobile, shown on desktop */}
      <div className="hidden lg:block">
        <Sidebar currentSlug={slug} onNavigate={(newSlug) => router.push(`/help/${newSlug}`)} />
      </div>

      {/* Main Content */}
      <main className="flex-1 lg:pl-8 lg:py-8 max-w-3xl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6">
          <Button
            variant="link"
            size="sm"
            onClick={() => router.push('/help')}
            className="text-sm text-muted-foreground hover:text-foreground p-0 h-auto"
          >
            Help center
          </Button>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm text-muted-foreground">{category.title}</span>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm text-foreground">{article.title}</span>
        </div>

        {/* Article Content */}
        <article className="prose prose-invert max-w-none">
          {renderMarkdown(article.content)}
        </article>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-12 pt-6 border-t border-border">
          {prev ? (
            <Button
              variant="ghost"
              onClick={() => router.push(`/help/${prev.slug}`)}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground group h-auto py-2"
            >
              <HugeiconsIcon
                icon={ArrowLeft01Icon}
                size={16}
                className="group-hover:-translate-x-1 transition-transform"
              />
              <div className="text-left">
                <span className="text-xs block">Previous</span>
                <span className="text-sm font-medium text-foreground">{prev.title}</span>
              </div>
            </Button>
          ) : (
            <div />
          )}

          {next ? (
            <Button
              variant="ghost"
              onClick={() => router.push(`/help/${next.slug}`)}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground group h-auto py-2"
            >
              <div className="text-right">
                <span className="text-xs block">Next</span>
                <span className="text-sm font-medium text-foreground">{next.title}</span>
              </div>
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                size={16}
                className="group-hover:translate-x-1 transition-transform"
              />
            </Button>
          ) : (
            <div />
          )}
        </div>

        {/* Back to Help Center */}
        <div className="mt-8 text-center">
          <Button variant="ghost" onClick={() => router.push('/help')}>
            <HugeiconsIcon icon={ArrowLeft01Icon} size={16} className="mr-2" />
            Back to help center
          </Button>
        </div>
      </main>
    </div>
  )
}

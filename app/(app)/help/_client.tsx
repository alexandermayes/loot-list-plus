'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Rocket01Icon,
  ScrollIcon,
  Settings01Icon,
  Calendar01Icon,
  HelpCircleIcon,
  Search01Icon,
  ArrowRight01Icon,
} from '@hugeicons/core-free-icons'
import { helpCategories, getAllArticles, glossaryTerms, type HelpCategory, type HelpArticle } from '@/lib/help-content'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Heading, Text } from '@/components/ui/typography'

// Map icon names to actual icons
const iconMap: Record<string, typeof Rocket01Icon> = {
  RocketIcon: Rocket01Icon,
  ScrollIcon: ScrollIcon,
  Settings01Icon: Settings01Icon,
  Calendar01Icon: Calendar01Icon,
  HelpCircleIcon: HelpCircleIcon,
}

function CategoryCard({ category }: { category: HelpCategory }) {
  const router = useRouter()
  const Icon = iconMap[category.icon] || Rocket01Icon

  return (
    <div
      onClick={() => router.push(`/help/${category.articles[0]?.slug || ''}`)}
      className="bg-background-elevated border border-border rounded-xl p-6 hover:border-accent/50 transition-colors cursor-pointer group"
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-accent/20 transition-colors">
          <HugeiconsIcon icon={Icon} size={24} className="text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <Heading level={3} className="text-lg group-hover:text-accent transition-colors">
            {category.title}
          </Heading>
          <p className="text-sm text-muted-foreground mt-1">{category.description}</p>
          <p className="text-xs text-muted-foreground mt-3">
            {category.articles.length} article{category.articles.length !== 1 ? 's' : ''}
          </p>
        </div>
        <HugeiconsIcon
          icon={ArrowRight01Icon}
          size={20}
          className="text-muted-foreground group-hover:text-accent group-hover:translate-x-1 transition-all flex-shrink-0"
        />
      </div>
    </div>
  )
}

function SearchResult({
  article,
  categoryTitle,
}: {
  article: HelpArticle & { categoryId: string; categoryTitle: string }
  categoryTitle: string
}) {
  const router = useRouter()

  return (
    <div
      onClick={() => router.push(`/help/${article.slug}`)}
      className="bg-background-elevated border border-border rounded-lg p-4 hover:border-accent/50 transition-colors cursor-pointer"
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs text-accent font-medium">{categoryTitle}</span>
      </div>
      <Heading level={4} className="text-base">{article.title}</Heading>
      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{article.description}</p>
    </div>
  )
}

// Loading screen tips — WoW style
const TIPS = [
  'Raiders who submit their Loot Lists early get reviewed first.',
  'You can rank up to 50 items on your Loot List.',
  'Your Loot Score combines ranking, attendance and modifiers.',
  'Officers can set per-item priority rules from loot settings.',
  'Linking your Battle.net account auto-imports your characters.',
  'Reserved items can only be placed alone at a rank.',
  'Attendance points are earned by showing up to raids on time.',
  'The Master Sheet shows everyone\'s priorities at a glance.',
  'You can export Master Sheet data to clipboard for spreadsheets.',
  'Trial members have a temporary penalty to their Loot Score.',
  'Excused absences don\'t count against your attendance.',
  'Invite codes let you recruit guildies without sharing a link.',
  'Each expansion and phase has its own Loot List.',
  'Your #1 priority item has the best chance of being awarded.',
]

type ArticleWithCategory = HelpArticle & { categoryId: string; categoryTitle: string }

export default function HelpPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ArticleWithCategory[]>([])
  // Approved community answers grown from Discord /help questions (DB-only).
  const [extraArticles, setExtraArticles] = useState<ArticleWithCategory[]>([])
  const [tip] = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)])

  useEffect(() => {
    document.title = 'LootList+ • Help Center'
  }, [])

  useEffect(() => {
    let active = true
    fetch('/api/help/articles')
      .then((r) => (r.ok ? r.json() : { articles: [] }))
      .then((d) => {
        if (!active) return
        const rows: Array<HelpArticle> = d.articles || []
        setExtraArticles(
          rows.map((a) => ({ ...a, categoryId: 'community', categoryTitle: 'Community Answers' }))
        )
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    const query = searchQuery.toLowerCase()
    const allArticles = [...getAllArticles(), ...extraArticles]
    const filtered = allArticles.filter(
      (article) =>
        article.title.toLowerCase().includes(query) ||
        article.description.toLowerCase().includes(query) ||
        article.content.toLowerCase().includes(query)
    )
    setSearchResults(filtered)
  }, [searchQuery, extraArticles])

  const communityCategory: HelpCategory | null =
    extraArticles.length > 0
      ? {
          id: 'community',
          title: 'Community Answers',
          description: 'Answers grown from questions people asked the help bot',
          icon: 'HelpCircleIcon',
          articles: extraArticles,
        }
      : null

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center mb-10">
        <Heading level={1} className="mb-3">
          How can we help?
        </Heading>
        <Text color="secondary" size="lg" className="max-w-xl mx-auto">
          Find answers to common questions about LootList+
        </Text>
      </div>

      {/* Search */}
      <div className="relative max-w-xl mx-auto mb-10">
        <HugeiconsIcon
          icon={Search01Icon}
          size={20}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="text"
          placeholder="Search for help..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-12 h-12 text-base"
          variant="rounded"
        />
      </div>

      {/* Loading screen tip */}
      {!searchQuery.trim() && (
        <p className="text-center text-[12px] text-muted-foreground/60 italic -mt-6 mb-10">
          Tip: {tip}
        </p>
      )}

      {/* Search Results */}
      {searchQuery.trim() && (
        <div className="mb-10">
          <Text color="secondary" size="sm" className="mb-4">
            {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for &quot;{searchQuery}&quot;
          </Text>
          {searchResults.length > 0 ? (
            <div className="grid gap-3">
              {searchResults.map((article) => (
                <SearchResult
                  key={article.slug}
                  article={article}
                  categoryTitle={article.categoryTitle}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Text color="muted">No articles found. Try a different search term.</Text>
            </div>
          )}
        </div>
      )}

      {/* Categories Grid */}
      {!searchQuery.trim() && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
            {helpCategories.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
            {communityCategory && (
              <CategoryCard key={communityCategory.id} category={communityCategory} />
            )}
          </div>

          {/* Popular Articles */}
          <div>
            <Heading level={3} className="mb-4">
              Popular articles
            </Heading>
            <div className="grid gap-3">
              {getAllArticles()
                .slice(0, 5)
                .map((article) => (
                  <SearchResult
                    key={article.slug}
                    article={article}
                    categoryTitle={article.categoryTitle}
                  />
                ))}
            </div>
          </div>
        </>
      )}

      {/* Glossary */}
      {!searchQuery.trim() && (
        <div className="mt-10">
          <Heading level={3} className="mb-2">
            Glossary
          </Heading>
          <Text color="secondary" size="sm" className="mb-6">
            Quick definitions for common terms
          </Text>
          <div className="grid gap-3">
            {glossaryTerms.map((entry) => (
              <div
                key={entry.term}
                className="bg-background-elevated border border-border rounded-lg p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Heading level={4} className="text-base">{entry.term}</Heading>
                    <p className="text-sm text-muted-foreground mt-1">{entry.definition}</p>
                  </div>
                  {entry.articleSlug && (
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => router.push(`/help/${entry.articleSlug}`)}
                      className="flex-shrink-0 mt-0.5 text-xs h-auto p-0"
                    >
                      Learn more
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contact Support */}
      <div className="mt-12 text-center py-8 border-t border-border">
        <Text color="secondary" className="mb-2">
          Can&apos;t find what you&apos;re looking for?
        </Text>
        <Text color="muted" size="sm">
          Reach out to your guild officers or contact us on Discord
        </Text>
      </div>
    </div>
  )
}

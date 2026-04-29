type RelatedPost = {
  slug: string
  title: string
  description: string
  readTime: string
  tag: string
}

const ALL_POSTS: RelatedPost[] = [
  {
    slug: 'loot-priority-lists-vs-loot-council',
    title: 'Loot Priority Lists vs Loot Council: An Honest Comparison',
    description:
      'Two of the most popular loot systems in WoW, compared honestly. When priority lists win, when council wins, and when you should use both.',
    readTime: '9 min read',
    tag: 'Guide',
  },
  {
    slug: 'the-officer-burnout-problem-and-how-to-fix-it',
    title: 'The Officer Burnout Problem (and How to Fix It)',
    description:
      'Guild officers burn out quietly and take the guild down with them. Here\'s why and how to fix it.',
    readTime: '8 min read',
    tag: 'Guide',
  },
  {
    slug: 'how-to-onboard-new-raiders-without-killing-morale',
    title: 'How to Onboard New Raiders Without Killing Morale',
    description:
      'New raiders quit in the first two weeks more than any other time. Here\'s how to onboard them without overwhelming them.',
    readTime: '8 min read',
    tag: 'Guide',
  },
  {
    slug: 'dkp-is-dead-what-classic-guilds-use-in-2026',
    title: 'DKP Is Dead: What Classic Guilds Use in 2026',
    description:
      'DKP had its time, but Classic guilds in 2026 have moved on. Here\'s what replaced it and why.',
    readTime: '8 min read',
    tag: 'Guide',
  },
  {
    slug: 'why-attendance-tracking-matters-more-than-loot-rules',
    title: 'Why Attendance Tracking Matters More Than Loot Rules',
    description:
      'Your loot system is only as good as your attendance data. Fix attendance first, the rest gets easier.',
    readTime: '7 min read',
    tag: 'Guide',
  },
  {
    slug: 'how-to-set-up-a-fair-loot-system-for-your-wow-guild',
    title: 'How to Set Up a Fair Loot System for Your WoW Guild',
    description:
      'A practical guide to building a loot system your raiders actually trust. Compare DKP, EPGP, Loot Council and more.',
    readTime: '8 min read',
    tag: 'Guide',
  },
]

export default function BlogRelatedPosts({ currentSlug }: { currentSlug: string }) {
  const related = ALL_POSTS.filter((post) => post.slug !== currentSlug)

  return (
    <section
      aria-labelledby="related-posts-heading"
      className="relative px-6 md:px-12 lg:px-20 pb-20"
    >
      <div className="max-w-3xl mx-auto">
        <div className="border-t border-border pt-12">
          <h2
            id="related-posts-heading"
            className="text-2xl font-bold text-foreground mb-2"
          >
            Keep reading
          </h2>
          <p className="text-foreground-secondary mb-8">
            More guides on guild management and loot systems.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {related.map((post) => (
              <a
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="block group"
              >
                <article className="h-full p-5 rounded-xl border border-border bg-background-elevated hover:border-accent/40 transition-colors">
                  <p className="text-xs font-medium text-accent mb-2">
                    {post.tag}
                  </p>
                  <h3 className="text-base font-semibold text-foreground group-hover:text-accent transition-colors mb-2 leading-snug">
                    {post.title}
                  </h3>
                  <p className="text-sm text-foreground-secondary leading-relaxed mb-3">
                    {post.description}
                  </p>
                  <span className="text-xs text-foreground-muted">
                    {post.readTime}
                  </span>
                </article>
              </a>
            ))}
          </div>
          <div className="mt-8">
            <a
              href="/blog"
              className="text-sm text-accent hover:text-accent/80 transition-colors underline underline-offset-2"
            >
              See all posts
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

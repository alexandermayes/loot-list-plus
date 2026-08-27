import type { Metadata } from 'next'
import Link from 'next/link'
import LandingNav from '@/app/components/landing/LandingNav'
import LandingFooter from '@/app/components/landing/LandingFooter'

const APP_URL = 'https://www.lootlistplus.com'

export const metadata: Metadata = {
  title: 'LootList+ Pricing — Free Core Plan and $4.99 Premium',
  description:
    'Run ranked loot lists, attendance, and transparent item priority free. Premium adds multiple raid teams and officer activity for $4.99/month.',
  alternates: {
    canonical: 'https://www.getlootlist.com/pricing',
  },
}

const FREE_FEATURES = [
  'Ranked loot lists for every raider',
  'Transparent item-by-item Loot Scores',
  'Attendance tracking and score weighting',
  'Bad-luck protection and configurable modifiers',
  'Loot history, submissions, and Master Sheet',
  'Discord and raid-tool workflows',
  'Classic Era through Mists of Pandaria',
]

const PREMIUM_FEATURES = [
  'Multiple raid teams',
  'Separate schedules, attendance, and loot views per team',
  'Officer activity feed for loot awards, roster changes, and settings',
  'Reserve runs for pugs and one-off raids',
  'One subscription for the entire guild',
]

const FAQ = [
  {
    q: 'Is LootList+ actually free?',
    a: 'Yes. The core system for loot lists, attendance, priority scores, and raid distribution is available without a subscription. Premium adds multi-team support, the officer activity feed, and reserve runs.',
  },
  {
    q: 'Does every officer or raider pay?',
    a: 'No. Premium is one subscription for the entire guild.',
  },
  {
    q: 'Can we start free and upgrade later?',
    a: 'Yes. Set up the guild on the free plan, then upgrade from the sidebar or Guild Settings when you need Premium features.',
  },
  {
    q: 'How much is the annual plan?',
    a: 'Premium is $39 per year for the whole guild, compared with $4.99 month to month.',
  },
]

const cardGradient = 'linear-gradient(190deg, rgb(12, 11, 14) 15%, rgb(23, 21, 27) 83%)'
const premiumGradient = 'linear-gradient(200deg, rgb(46, 42, 53) 15%, rgb(80, 73, 95) 83%)'

export default function PricingPage() {
  return (
    <main className="relative bg-[#080808] overflow-x-hidden min-h-screen">
      <LandingNav />

      <div className="max-w-4xl mx-auto px-6 md:px-12 pt-16 md:pt-24 pb-20">
        <header className="text-center mb-12 md:mb-16">
          <h1 className="font-poppins font-bold text-[32px] md:text-[48px] leading-[1.05] text-white mb-4">
            One guild. One plan. No per-raider pricing.
          </h1>
          <p className="font-poppins text-[16px] text-[#bababa] leading-relaxed max-w-2xl mx-auto">
            Start with the complete core loot system for free. Upgrade the whole guild only
            when you need multiple raid teams or deeper officer oversight.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
          {/* Free */}
          <div
            className="flex flex-col gap-5 rounded-[20px] md:rounded-[28px] p-8 md:p-10"
            style={{ backgroundImage: cardGradient }}
          >
            <p className="font-poppins font-semibold text-[14px] uppercase tracking-wide text-[#bababa]">Free</p>
            <div className="flex items-baseline gap-2">
              <span className="font-poppins font-bold text-[56px] leading-none text-white">$0</span>
            </div>
            <p className="font-poppins font-medium text-[14px] text-[#bababa]">
              For guilds running one raid team.
            </p>
            <ul className="flex flex-col gap-2">
              {FREE_FEATURES.map((item) => (
                <li key={item} className="flex items-start gap-2 font-poppins font-medium text-[14px] text-white">
                  <span className="text-[#9940ec] shrink-0">✦</span> {item}
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-2">
              <a
                href={APP_URL}
                className="inline-flex items-center justify-center px-5 py-3 rounded-[60px] bg-white font-poppins font-semibold text-[16px] text-black no-underline hover:bg-white/90 transition-colors"
              >
                Create your guild free
              </a>
            </div>
          </div>

          {/* Premium */}
          <div
            className="flex flex-col gap-5 rounded-[20px] md:rounded-[28px] p-8 md:p-10 border border-[#ff8000]/40"
            style={{ backgroundImage: premiumGradient }}
          >
            <p className="font-poppins font-semibold text-[14px] uppercase tracking-wide text-[#ff8000]">Premium</p>
            <div className="flex items-baseline gap-2">
              <span className="font-poppins font-bold text-[40px] leading-none text-white">$4.99</span>
              <span className="font-poppins font-medium text-[16px] text-[#bababa]">/month or $39/year</span>
            </div>
            <p className="font-poppins font-medium text-[14px] text-[#bababa]">
              For guilds running multiple teams or needing deeper officer visibility.
            </p>
            <p className="font-poppins font-semibold text-[13px] text-white">Everything in Free, plus</p>
            <ul className="flex flex-col gap-2">
              {PREMIUM_FEATURES.map((item) => (
                <li key={item} className="flex items-start gap-2 font-poppins font-medium text-[14px] text-white">
                  <span className="text-[#ff8000] shrink-0">✦</span> {item}
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-2">
              <Link
                href="/premium"
                className="inline-flex items-center justify-center px-5 py-3 rounded-[60px] bg-[#121218] border border-[#383838] font-poppins font-semibold text-[16px] text-white no-underline hover:bg-[#1a1a22] transition-colors"
              >
                Start free trial
              </Link>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <section className="mt-16 md:mt-20">
          <h2 className="font-poppins font-bold text-[24px] md:text-[28px] text-white mb-8">Pricing FAQ</h2>
          <div className="space-y-8">
            {FAQ.map(({ q, a }) => (
              <div key={q}>
                <h3 className="font-poppins font-semibold text-[16px] text-white mb-2">{q}</h3>
                <p className="font-poppins text-[15px] text-[#bababa] leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <LandingFooter />
    </main>
  )
}

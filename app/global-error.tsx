'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Global error:', error)
  }, [error])

  // global-error must define its own html and body tags
  // since it replaces the root layout when triggered
  return (
    <html lang="en">
      <body className="bg-[#0a0a0b] text-[#e4e4e7]">
        <div className="min-h-screen flex flex-col">
          {/* Simple Header */}
          <header className="border-b border-[#2a2a2e] bg-[#111114]">
            <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
              <nav className="flex items-center h-16">
                <a href="/" className="flex items-center hover:opacity-80 transition-opacity">
                  <img
                    src="/logo.svg"
                    alt="LootList+"
                    width={100}
                    height={16}
                    className="h-4 w-auto"
                  />
                </a>
              </nav>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 flex flex-col items-center justify-center p-8">
            <div className="max-w-2xl w-full text-center">
              {/* Gnome Image */}
              <div className="mb-8">
                <img
                  src="/images/404-gnome.png"
                  alt="Gnome engineer looking confused"
                  className="w-full max-w-md mx-auto"
                  draggable={false}
                />
              </div>

              {/* Message */}
              <div className="space-y-3">
                <h1 className="text-[32px] font-bold tracking-tight text-white">
                  Something broke
                </h1>
                <p className="text-[16px] text-[#a1a1aa]">
                  A critical error occurred. Hit retry or hearth back home.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={reset}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-[#ff8000] text-white font-medium hover:bg-[#e67300] transition-colors"
                >
                  Try again
                </button>
                <a
                  href="/"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-[#1f1f23] text-white font-medium hover:bg-[#2a2a2e] transition-colors border border-[#2a2a2e]"
                >
                  <img
                    src="/images/hearthstone-icon.png"
                    alt=""
                    className="w-5 h-5"
                  />
                  Hearth back home
                </a>
              </div>
            </div>
          </main>
        </div>
      </body>
    </html>
  )
}

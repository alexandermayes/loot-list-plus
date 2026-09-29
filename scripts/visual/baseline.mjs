#!/usr/bin/env node

/**
 * Captures a fixed before/after screenshot set for the Phase 07 design-token
 * work (reused by Phases 08 to 12).
 *
 * Usage: node scripts/visual/baseline.mjs --label <label>
 *
 * The one required argument is --label, which names the output directory:
 * .planning/workstreams/design-system/baselines/<YYYY-MM-DD>-<label>/.
 *
 * This script only ever talks to a local Next.js dev server (hostname
 * "localhost" or "127.0.0.1"). It refuses to run against any other origin,
 * so it can never be pointed at a deployed environment and can never
 * screenshot real user data. It captures Home (public), Overview,
 * Guild Settings (expansion-manager panel expanded), Loot Management
 * (SettingsModal open), Master Sheet, Raid Tracking and Profile -- all
 * authenticated pages via the dev-only /dev-login flow, gated on
 * NODE_ENV === 'development' -- at two viewports and both themes:
 * 11 pages x 2 themes x 2 widths = 44 images per run (Phase 10 10-01-PLAN.md
 * Task 1 added master-sheet, raid-tracking and profile to reach that
 * phase's COLOR-04/COLOR-05/COLOR-07 sites: the master-sheet primary
 * button, the raid-card Epic/Warcraft-Logs/Discord spans and the profile
 * Battle.net chip and card-shaped inset site. Phase 11 11-01-PLAN.md Task 1
 * added blog-post, research, compare and pricing -- the four public
 * reading-page types TYPE-04's prose-measure narrowing touches, all
 * `auth: false`, reading no environment variable. None of the seven added
 * entries (three from Phase 10, four from Phase 11) needs an `afterGoto`
 * hook -- like the existing guild-settings entry's Faction toggle, every
 * capture already passes `fullPage: true`, and each new site renders in
 * its page's normal document flow. D-17's own text says "5 pages... 20
 * images", a miscount against its own committed PAGES array -- the fixed
 * page set is one public page plus one app page (ROADMAP.md's general
 * rule), and Phase 10's two heaviest-screen entry points reach all three
 * named heaviest screens, since ExpansionManager and GuildSettingsContent
 * both render on the guild-settings page load and SettingsModal opens via
 * the loot-management click step -- four pages accounted for all of it
 * before Phase 10's three additions). It never logs or records a
 * credential or an environment-variable value; the committed
 * manifest.json records only the origin hostname. Each page's optional
 * `afterGoto` hook performs UI interaction only (clicks, DOM waits) -- it
 * never reads, logs or writes an environment variable, preserving that
 * same boundary.
 */

import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'
import puppeteer from 'puppeteer'

/**
 * Expands the first expansion card's "Raid Schedule" accordion on
 * /guild-settings (app/(app)/guild-settings/components/ExpansionManager.tsx).
 * The accordion header is a <button> whose text includes "Raid Schedule";
 * clicking it renders the "Raid Start Date" panel. Finds the control by its
 * stable, visible text rather than a positional selector -- no test id
 * exists on this element and this plan does not add one (no file under
 * app/ or components/ is edited by this plan).
 */
async function expandExpansionSchedule(page) {
  await page.waitForFunction(
    () => Array.from(document.querySelectorAll('button')).some((el) => el.textContent?.includes('Raid Schedule')),
    { timeout: 15000 }
  )
  const clicked = await page.evaluate(() => {
    const button = Array.from(document.querySelectorAll('button')).find((el) =>
      el.textContent?.includes('Raid Schedule')
    )
    if (!button) return false
    button.click()
    return true
  })
  if (!clicked) {
    throw new Error(
      'guild-settings afterGoto: could not find the "Raid Schedule" accordion header button to expand the expansion-manager panel.'
    )
  }
  await page.waitForFunction(() => document.body.innerText.includes('Raid Start Date'), {
    timeout: 15000,
  })
}

/**
 * Opens SettingsModal on /loot-management
 * (app/(app)/loot-management/components/LootSettingsContent.tsx) by
 * clicking the "Loot settings" button, which sets showSettingsModal to
 * true. Waits for the resulting Modal's role="dialog" element
 * (components/ui/modal.tsx) rather than assuming a fixed settle delay.
 */
async function openLootSettingsModal(page) {
  await page.waitForFunction(
    () => Array.from(document.querySelectorAll('button')).some((el) => el.textContent?.includes('Loot settings')),
    { timeout: 15000 }
  )
  const clicked = await page.evaluate(() => {
    const button = Array.from(document.querySelectorAll('button')).find((el) =>
      el.textContent?.includes('Loot settings')
    )
    if (!button) return false
    button.click()
    return true
  })
  if (!clicked) {
    throw new Error(
      'loot-management afterGoto: could not find the "Loot settings" button to open SettingsModal.'
    )
  }
  await page.waitForSelector('[role="dialog"]', { timeout: 15000 })
}

// Fixed capture matrix (D-17, extended by Phase 10 10-01-PLAN.md Task 1 and
// Phase 11 11-01-PLAN.md Task 1):
// 11 pages x 2 themes x 2 viewports = 44 images.
const PAGES = [
  { name: 'home', path: '/', auth: false },
  { name: 'overview', path: '/overview', auth: true },
  { name: 'guild-settings', path: '/guild-settings', auth: true, afterGoto: expandExpansionSchedule },
  { name: 'loot-management', path: '/loot-management', auth: true, afterGoto: openLootSettingsModal },
  { name: 'master-sheet', path: '/master-sheet', auth: true },
  { name: 'raid-tracking', path: '/raid-tracking', auth: true },
  { name: 'profile', path: '/profile', auth: true },
  { name: 'design-system', path: '/design-system', auth: true },
  { name: 'blog-post', path: '/blog/dkp-is-dead-what-classic-guilds-use-in-2026', auth: false },
  { name: 'research', path: '/research/wow-classic-loot-systems-2026', auth: false },
  { name: 'compare', path: '/compare', auth: false },
  { name: 'pricing', path: '/pricing', auth: false },
]

const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]

const THEMES = ['light', 'dark']

// Next.js's App Router dev error overlay renders inside a <nextjs-portal>
// custom element. A server that boots without the Supabase env vars renders
// this instead of the Home page, and we must not screenshot that as if it
// were a baseline.
const NEXT_ERROR_OVERLAY_MARKER = 'nextjs-portal'

function parseArgs(argv) {
  const labelIndex = argv.indexOf('--label')
  const label = labelIndex !== -1 ? argv[labelIndex + 1] : undefined
  if (!label) {
    throw new Error(
      'Missing required argument: --label <label>. Usage: node scripts/visual/baseline.mjs --label <label>'
    )
  }
  return { label }
}

function resolveOrigin() {
  const raw = process.env.BASE_URL || 'http://localhost:3100'
  let origin
  try {
    origin = new URL(raw)
  } catch {
    throw new Error(`Invalid BASE_URL: "${raw}" is not a valid URL.`)
  }
  if (origin.hostname !== 'localhost' && origin.hostname !== '127.0.0.1') {
    throw new Error(
      `Refusing to run: this baseline script only ever runs against a local dev server (hostname must be "localhost" or "127.0.0.1"), got "${origin.hostname}". Start the dev server with \`npm run dev\` and capture against http://localhost:3100.`
    )
  }
  return origin
}

async function assertServerReady(origin) {
  let response
  try {
    response = await fetch(origin)
  } catch {
    throw new Error(
      `Could not reach ${origin.href}. Start the dev server with \`npm run dev\`, with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY exported in that shell.`
    )
  }
  if (!response.ok) {
    throw new Error(
      `Dev server responded with ${response.status} at ${origin.href}. Start the dev server with \`npm run dev\`, with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY exported in that shell.`
    )
  }
  const body = await response.text()
  if (body.includes(NEXT_ERROR_OVERLAY_MARKER)) {
    throw new Error(
      `The dev server at ${origin.href} rendered a Next.js error overlay instead of the Home page. This usually means NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are not exported in the dev server's shell. Export both and restart \`npm run dev\`.`
    )
  }
}

/**
 * Retries a Puppeteer action on known-transient CDP races: a first
 * navigation on a freshly created page occasionally aborts with
 * `net::ERR_ABORTED`, and Next.js's dev-mode HMR websocket handshake can
 * briefly invalidate the execution/DOM context mid-navigation, surfacing as
 * a `Protocol error`. Neither reflects a real problem with the target
 * server or the captured page; assertServerReady already proved the origin
 * answers before any browser navigation happens. Anything else rethrows
 * immediately. Up to 3 attempts total, with a growing settle delay so the
 * dev server's HMR handshake has time to finish between tries.
 */
const TRANSIENT_MARKERS = [
  'ERR_ABORTED',
  'Protocol error',
  'Execution context was destroyed',
  'Cannot find context',
  'does not belong to the document',
]

async function withTransientRetry(action, attempts = 4) {
  let lastError
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await action()
    } catch (error) {
      lastError = error
      if (!TRANSIENT_MARKERS.some((marker) => String(error.message).includes(marker))) throw error
      if (attempt === attempts) break
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
    }
  }
  throw lastError
}

async function gotoWithRetry(page, url, options) {
  return withTransientRetry(async () => {
    await page.goto(url, options)
    // Give the dev server's on-demand compile and HMR handshake a moment to
    // settle before the caller runs evaluate/addStyleTag/screenshot against
    // this navigation's execution context. Next.js dev mode can trigger a
    // Fast-Refresh-driven reload shortly after `load` fires on a route that
    // was still compiling, which invalidates any execution context grabbed
    // too early.
    await new Promise((resolve) => setTimeout(resolve, 1500))
  })
}

/** Fetches the seeded dev test users. Never throws; a missing/empty result is a D-16 skip, not a hard failure. */
async function fetchTestUser(origin, overviewPages, skipped) {
  let response
  try {
    response = await fetch(new URL('/api/dev/test-users', origin))
  } catch {
    response = null
  }
  if (!response || !response.ok) {
    const reason = response
      ? `GET /api/dev/test-users returned ${response.status}`
      : 'GET /api/dev/test-users failed to respond'
    for (const page of overviewPages) skipped.push({ page: page.name, reason })
    return null
  }
  const data = await response.json()
  if (!data.users || data.users.length === 0) {
    for (const page of overviewPages) {
      skipped.push({ page: page.name, reason: 'No test users returned by /api/dev/test-users' })
    }
    return null
  }
  return data.users[0]
}

async function main() {
  const { label } = parseArgs(process.argv.slice(2))
  const origin = resolveOrigin()
  await assertServerReady(origin)

  const date = new Date().toISOString().slice(0, 10)
  const projectRoot = fileURLToPath(new URL('../../', import.meta.url))
  const outputDir = join(
    projectRoot,
    '.planning/workstreams/design-system/baselines',
    `${date}-${label}`
  )
  mkdirSync(outputDir, { recursive: true })

  const images = []
  const skipped = []

  const overviewPages = PAGES.filter((p) => p.auth)
  const testUser =
    overviewPages.length > 0 ? await fetchTestUser(origin, overviewPages, skipped) : null

  const browser = await puppeteer.launch({ protocolTimeout: 45000 })
  try {
    const browserPage = await browser.newPage()
    // The landing page runs continuous Framer Motion animations. A running
    // animation can keep Chrome's screenshot protocol call from settling,
    // which surfaces as "Page.captureScreenshot timed out" rather than a
    // navigation error. Reducing motion before each screenshot lets the
    // page reach a stable paint.
    await browserPage.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])

    if (testUser) {
      await gotoWithRetry(browserPage, new URL('/dev-login', origin).href, { waitUntil: 'load' })
      await browserPage.type('#email', testUser.email)
      await browserPage.type('#password', testUser.password)
      await Promise.all([
        browserPage.waitForFunction(() => !window.location.pathname.startsWith('/dev-login'), {
          timeout: 15000,
        }),
        browserPage.click('button[type="submit"]'),
      ])
    }

    for (const capturePage of PAGES) {
      // Overview with no authenticated test user was already recorded as a
      // D-16 skip above; don't attempt to capture it.
      if (capturePage.auth && !testUser) continue

      for (const theme of THEMES) {
        for (const viewport of VIEWPORTS) {
          const fileName = `${capturePage.name}-${theme}-${viewport.width}.png`

          // The whole per-image sequence is one retryable unit: Next.js dev
          // mode can trigger a Fast-Refresh reload shortly after a
          // navigation settles, invalidating any execution context grabbed
          // in between, and Framer Motion's per-frame (JS-driven, not CSS)
          // transforms can leave a resized, already-animated page
          // thrashing layout during a screenshot. Retrying the full
          // sequence from a fresh navigation is simpler and more robust
          // than trying to patch each intermediate step.
          await withTransientRetry(async () => {
            // Set the viewport BEFORE navigating so the target page loads
            // fresh at that size rather than being resized after render.
            await browserPage.setViewport(viewport)

            // Set the theme against the origin first; localStorage is
            // per-origin and survives the navigation to the target path.
            await gotoWithRetry(browserPage, origin.href, { waitUntil: 'load' })
            await browserPage.evaluate((t) => localStorage.setItem('theme', t), theme)

            await gotoWithRetry(browserPage, new URL(capturePage.path, origin).href, {
              waitUntil: 'load',
            })
            await browserPage.addStyleTag({
              content:
                '*, *::before, *::after { animation: none !important; transition: none !important; }',
            })

            // Additive per-page interaction step (D-17): runs on an
            // already-settled, animation-free page so the panel/dialog it
            // opens is captured without a fighting transition. Existing
            // PAGES entries have no afterGoto and are unaffected.
            if (capturePage.afterGoto) {
              await capturePage.afterGoto(browserPage)
            }

            const appliedDark = await browserPage.evaluate(() =>
              document.documentElement.classList.contains('dark')
            )
            const expectDark = theme === 'dark'
            if (appliedDark !== expectDark) {
              throw new Error(
                `Theme mismatch on ${capturePage.name}: expected "${theme}", but html.classList.contains('dark') === ${appliedDark}.`
              )
            }

            // Let one paint cycle land after the animation-disabling style
            // tag before asking Chrome for pixels.
            await browserPage.evaluate(
              () =>
                new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
            )
            await browserPage.screenshot({ path: join(outputDir, fileName), fullPage: true })
          })

          console.log(`Wrote ${fileName}`)
          images.push({
            file: fileName,
            page: capturePage.name,
            path: capturePage.path,
            theme,
            width: viewport.width,
            height: viewport.height,
          })
        }
      }
    }
  } finally {
    await browser.close()
  }

  const manifest = {
    label,
    captured_at: new Date().toISOString(),
    git_sha: execSync('git rev-parse --short HEAD', { cwd: projectRoot }).toString().trim(),
    origin_hostname: origin.hostname,
    images,
    skipped,
  }
  writeFileSync(join(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')

  console.log(`Captured ${images.length} image(s) into ${outputDir}`)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})

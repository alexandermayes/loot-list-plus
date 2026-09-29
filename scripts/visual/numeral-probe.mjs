#!/usr/bin/env node

/**
 * G-11-1 acceptance instrument: measures whether the app's `.tabular-nums`
 * class actually renders digits at a uniform glyph advance in real Chrome.
 *
 * WHY THIS EXISTS: `app/globals.css` has declared
 * `font-variant-numeric: tabular-nums` on `.tabular-nums` since before this
 * milestone, and the declaration computes correctly on every element that
 * carries the class -- and changes nothing, because Poppins ships no `tnum`
 * feature. Reading the CSS rule back, checking the computed style, or
 * grepping source for the class name all read as passing. None of them can
 * detect a font that silently ignores the feature. Only measuring rendered
 * glyph width -- `getBoundingClientRect().width` on a real element in a
 * real browser -- can tell "declared" from "renders". This script does
 * that measurement, nothing else.
 *
 * ACCEPTANCE MODE (default): navigates to one or more `--url`s, injects
 * spans carrying the app's own `.tabular-nums` class at weights 400, 500,
 * 600 and 700, measures the rendered advance of the ten four-digit strings
 * `0000`-`9999` plus the real score-column case `11.1`/`88.8`, and reads
 * the family Chrome actually rasterised via CDP `CSS.getPlatformFontsForNode`
 * -- because a webfont that silently failed to load and fell back to
 * `system-ui` would also measure uniform, and only the rasterised family
 * separates that false pass from a real one. Two controls run on every
 * invocation: forcing the family to Poppins must measure non-uniform (or
 * the probe is not measuring glyph advances), and forcing it to
 * `system-ui` must measure uniform (or the probe cannot detect success
 * where success exists). Either control coming back the other way voids
 * the run.
 *
 * SCREENING MODE (`--screen "Family One,Family Two"`): loads each named
 * family from the Google Fonts CSS2 stylesheet service inside the page for
 * measurement only, so the decision checkpoint this probe feeds gets
 * numbers instead of opinions. This is the ONLY place this script (or the
 * shipped application) ever fetches a font from a non-origin host, and it
 * does so by calling `page.setBypassCSP(true)` -- a Puppeteer-only,
 * measurement-only escape hatch that never ships. Acceptance mode never
 * bypasses the page's CSP, so a real `font-src` regression in the shipped
 * app still surfaces in the run that gates the fix.
 *
 * ORIGIN GUARD: every `--url` must resolve to `localhost` or `127.0.0.1`.
 * Anything else is refused before a browser ever launches -- this script
 * injects arbitrary measurement script into whatever page it navigates to,
 * and must never be pointed at a deployed environment holding real user
 * data.
 *
 * EXIT CODES:
 *   0 - every measured surface is uniform at every weight, and the
 *       rasterised family matches the declared family on every one.
 *       (Screening mode: exits 0 whenever it successfully reaches the
 *       Google Fonts stylesheet service, regardless of which candidates
 *       pass -- screening reports, it does not gate.)
 *   1 - a measurement completed and found the product NOT rendering
 *       tabular numerals: a weight measured non-uniform, or the rasterised
 *       family did not match the declared family (a fallback pass).
 *   2 - the run is VOID and proves nothing about the product: an origin
 *       was refused, the dev server was unreachable or rendered the
 *       Next.js error overlay, a browser/CDP call failed, or either
 *       control assertion came back the wrong way. (Screening mode: exits
 *       2 when the Google Fonts stylesheet service could not be reached.)
 * A caller must be able to tell "the app is broken" (1) from "the probe
 * could not measure" (2) -- conflating them is how a broken measurement
 * becomes a silent pass.
 */

import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'
import puppeteer from 'puppeteer'

const DEFAULT_URL = 'http://localhost:3100/pricing'
const WEIGHTS = [400, 500, 600, 700]
const DIGIT_STRINGS = Array.from({ length: 10 }, (_, d) => String(d).repeat(4))
const DECIMAL_STRINGS = ['11.1', '88.8']
const TEST_STRINGS = [...DIGIT_STRINGS, ...DECIMAL_STRINGS]
const UNIFORMITY_TOLERANCE_PX = 0.05
const CONTROL_WEIGHT = 600
const GOOGLE_FONTS_CSS2 = 'https://fonts.googleapis.com/css2'

// Next.js's App Router dev error overlay renders inside a <nextjs-portal>
// custom element. A server that boots without the Supabase env vars renders
// this instead of the real page, and we must not measure that as if it
// were the application.
const NEXT_ERROR_OVERLAY_MARKER = 'nextjs-portal'

function round(n) {
  return Math.round(n * 1000) / 1000
}

function parseArgs(argv) {
  const urls = []
  let label
  let reportPath
  let screenArg

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--url') {
      urls.push(argv[++i])
    } else if (arg === '--label') {
      label = argv[++i]
    } else if (arg === '--report') {
      reportPath = argv[++i]
    } else if (arg === '--screen') {
      screenArg = argv[++i]
    }
  }

  if (!label) {
    throw new Error(
      'Missing required argument: --label <label>. Usage: node scripts/visual/numeral-probe.mjs --url <url> --label <label> [--report <path>] [--screen "Family One,Family Two"]'
    )
  }

  if (urls.length === 0) urls.push(DEFAULT_URL)

  const families = screenArg
    ? screenArg
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : null

  return { urls, label, reportPath, families }
}

/**
 * Refuses any hostname other than localhost/127.0.0.1, before a browser
 * ever launches. Copied in spirit from scripts/visual/baseline.mjs's own
 * resolveOrigin() guard (T-11-12).
 */
function assertLocalOrigin(rawUrl) {
  let origin
  try {
    origin = new URL(rawUrl)
  } catch {
    throw new Error(`Invalid URL: "${rawUrl}" is not a valid URL.`)
  }
  if (origin.hostname !== 'localhost' && origin.hostname !== '127.0.0.1') {
    throw new Error(
      `Refusing to run: numeral-probe.mjs only ever measures a local dev server (hostname must be "localhost" or "127.0.0.1"), got "${origin.hostname}". Start the dev server with \`npm run dev\` and point --url at http://localhost:3100/....`
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
      `Could not reach ${origin.href}. Start the dev server with \`npm run dev\`.`
    )
  }
  if (!response.ok) {
    throw new Error(`Dev server responded with ${response.status} at ${origin.href}.`)
  }
  const body = await response.text()
  if (body.includes(NEXT_ERROR_OVERLAY_MARKER)) {
    throw new Error(
      `The dev server at ${origin.href} rendered a Next.js error overlay instead of the real page. Fix the dev server and retry.`
    )
  }
}

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
    await new Promise((resolve) => setTimeout(resolve, 500))
  })
}

/** Reads the font size a real score-column call site renders at (e.g. BossSection.tsx's `text-12` numerals), rather than hard-coding one. */
async function readCallSiteFontSize(page) {
  return page.evaluate(() => {
    const probe = document.createElement('span')
    probe.className = 'text-12 tabular-nums'
    probe.style.position = 'absolute'
    probe.style.left = '-99999px'
    probe.textContent = '0'
    document.body.appendChild(probe)
    const size = getComputedStyle(probe).fontSize
    probe.remove()
    return size
  })
}

/**
 * Injects one persistent span per weight, each carrying the app's real
 * `.tabular-nums` class (exercising the shipped cascade, not a
 * reimplementation of the property), and measures the rendered advance of
 * every test string on that same span by mutating its textContent and
 * reading getBoundingClientRect().width after each mutation.
 */
async function measureWeightSpans(page, { fontSizeUsed }) {
  return page.evaluate(
    async ({ weights, strings, fontSizeUsed }) => {
      const container = document.createElement('div')
      container.style.position = 'absolute'
      container.style.left = '-99999px'
      container.style.top = '0px'
      container.style.whiteSpace = 'pre'
      container.setAttribute('data-numeral-probe-container', 'true')
      document.body.appendChild(container)

      const widths = {}
      const declaredFamilies = {}

      for (const weight of weights) {
        const span = document.createElement('span')
        span.className = 'tabular-nums'
        span.style.fontWeight = String(weight)
        span.style.fontSize = fontSizeUsed
        span.setAttribute('data-numeral-probe-weight', String(weight))
        span.textContent = '0000' // placeholder so a layout/paint need for this weight exists
        container.appendChild(span)

        const declaredFamily = getComputedStyle(span)
          .fontFamily.split(',')[0]
          .trim()
          .replace(/^["']|["']$/g, '')
        declaredFamilies[weight] = declaredFamily

        // CRITICAL: a font-display:swap face is not fetched until something
        // actually needs to render with it, and `document.fonts.ready`
        // alone only awaits fonts that have ALREADY started loading. Every
        // weight but the browser's already-cached default can otherwise be
        // measured against a FALLBACK font's metrics, not the declared
        // one -- explicitly requesting and awaiting this exact
        // weight/size/family combination before measuring is what makes
        // the measurement trustworthy.
        try {
          await document.fonts.load(`${weight} ${fontSizeUsed} "${declaredFamily}"`)
        } catch {
          // A family that fails to load (or isn't a real @font-face, e.g.
          // a bare generic like "system-ui") throws here; measurement
          // continues and reports whatever actually rendered.
        }
        await document.fonts.ready

        widths[weight] = {}
        for (const str of strings) {
          span.textContent = str
          void span.offsetWidth // force reflow before reading
          widths[weight][str] = span.getBoundingClientRect().width
        }
      }

      return { widths, declaredFamilies }
    },
    { weights: WEIGHTS, strings: TEST_STRINGS, fontSizeUsed }
  )
}

async function removeProbeContainer(page, attribute) {
  await page.evaluate((attr) => {
    document.querySelector(`[${attr}]`)?.remove()
  }, attribute)
}

/** Reads the family Chrome actually rasterised for a node, via CDP CSS.getPlatformFontsForNode -- the only thing separating a real pass from a fallback pass. */
async function getRasterisedFamilyBySelector(client, selector) {
  const { root } = await client.send('DOM.getDocument', { depth: -1, pierce: true })
  const { nodeId } = await client.send('DOM.querySelector', { nodeId: root.nodeId, selector })
  if (!nodeId) return null
  const { fonts } = await client.send('CSS.getPlatformFontsForNode', { nodeId })
  return fonts && fonts.length > 0 ? fonts[0].familyName : null
}

// Chrome's CDP CSS.getPlatformFontsForNode reports the specific rasterised
// font INSTANCE for a multi-weight static webfont family -- e.g. "Poppins
// SemiBold" at weight 600, not the bare "Poppins" the declared font-family
// names. A correctly-loaded weight-600 instance of the declared family is
// therefore not a byte-identical string to the declared family, even though
// it is not a fallback. Stripping the trailing weight-name token reduces
// the rasterised instance name back to its base family so the comparison
// this script uses to detect a REAL fallback (T-11-15) -- a rasterised
// family that shares no base name with the declared one, e.g. "-apple-
// system"/"Segoe UI"/"Arial" when a webfont silently failed to load --
// still fails loudly, while a correctly-loaded weight instance of the
// declared family correctly matches.
const WEIGHT_SUFFIX_PATTERN = /\s+(Thin|Extra ?Light|Light|Regular|Medium|Semi ?Bold|Bold|Extra ?Bold|Black|Italic)$/i

function normalizeRasterisedFamily(name) {
  if (!name) return name
  let normalized = name
  let previous
  do {
    previous = normalized
    normalized = normalized.replace(WEIGHT_SUFFIX_PATTERN, '').trim()
  } while (normalized !== previous)
  return normalized
}

function computeVerdict(widthsByString) {
  const digitWidths = DIGIT_STRINGS.map((s) => widthsByString[s])
  const spread = Math.max(...digitWidths) - Math.min(...digitWidths)
  const uniform = spread <= UNIFORMITY_TOLERANCE_PX
  const decimalJitterPx = Math.abs(widthsByString['11.1'] - widthsByString['88.8'])
  return {
    advanceSpreadPx: round(spread),
    uniform,
    decimalJitterPx: round(decimalJitterPx),
  }
}

/**
 * Method-validation controls (T-11-16), run once per invocation regardless
 * of how many --url surfaces are measured. Control A forces the family to
 * Poppins and MUST measure non-uniform. Control B forces it to system-ui
 * and MUST measure uniform. Either coming back the other way means the
 * probe is not measuring what it claims to, and the run is void.
 */
async function measureControls(page) {
  const forced = await page.evaluate(
    async ({ fontSizeUsed, strings, weight }) => {
      const container = document.createElement('div')
      container.style.position = 'absolute'
      container.style.left = '-99999px'
      container.style.whiteSpace = 'pre'
      container.setAttribute('data-numeral-probe-controls', 'true')
      document.body.appendChild(container)

      async function measure(family) {
        const span = document.createElement('span')
        span.className = 'tabular-nums'
        span.style.fontWeight = String(weight)
        span.style.fontSize = fontSizeUsed
        span.style.fontFamily = family
        span.textContent = '0000'
        container.appendChild(span)
        try {
          await document.fonts.load(`${weight} ${fontSizeUsed} "${family.split(',')[0].trim()}"`)
        } catch {
          // generic families (system-ui) are not a @font-face and throw; fine
        }
        await document.fonts.ready
        const widths = {}
        for (const str of strings) {
          span.textContent = str
          void span.offsetWidth
          widths[str] = span.getBoundingClientRect().width
        }
        span.remove()
        return widths
      }

      const poppinsWidths = await measure('Poppins, sans-serif')
      const systemUiWidths = await measure('system-ui, sans-serif')
      return { poppinsWidths, systemUiWidths }
    },
    { fontSizeUsed: await readCallSiteFontSize(page), strings: TEST_STRINGS, weight: CONTROL_WEIGHT }
  )

  await removeProbeContainer(page, 'data-numeral-probe-controls')

  const poppins = computeVerdict(forced.poppinsWidths)
  const systemUi = computeVerdict(forced.systemUiWidths)
  return { poppins, systemUi }
}

/** Scans the page for elements that natively carry the numerals class and contain a digit -- never let an injected-span pass imply page coverage that does not exist. Reports zero as zero. */
async function scanNativeElements(page) {
  return page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('.tabular-nums')).filter(
      (el) => /\d/.test(el.textContent || '') && !el.hasAttribute('data-numeral-probe-weight')
    )
    return {
      count: els.length,
      elements: els.slice(0, 20).map((el) => ({
        tag: el.tagName.toLowerCase(),
        text: (el.textContent || '').trim().slice(0, 40),
        widthPx: round(el.getBoundingClientRect().width),
      })),
    }
  })
}

function makeOutputDir(label) {
  const date = new Date().toISOString().slice(0, 10)
  const projectRoot = fileURLToPath(new URL('../../', import.meta.url))
  const outputDir = join(projectRoot, '.planning/workstreams/design-system/baselines', `${date}-${label}`)
  mkdirSync(outputDir, { recursive: true })
  return outputDir
}

function writeReport(outputDir, reportPath, result, markdown) {
  const json = JSON.stringify(result, null, 2) + '\n'
  writeFileSync(join(outputDir, 'result.json'), json)
  writeFileSync(join(outputDir, 'result.md'), markdown)
  if (reportPath) writeFileSync(reportPath, json)
}

function formatAcceptanceMarkdown(result) {
  const lines = [`# numeral-probe acceptance run: ${result.label}`, '', `Timestamp: ${result.timestamp}`, '']
  lines.push('## Controls')
  lines.push(
    `- Poppins (forced): uniform=${result.controls.poppins.uniform} spread=${result.controls.poppins.advanceSpreadPx}px`
  )
  lines.push(
    `- system-ui (forced): uniform=${result.controls.systemUi.uniform} spread=${result.controls.systemUi.advanceSpreadPx}px`
  )
  lines.push('')
  for (const s of result.surfaces) {
    lines.push(`## ${s.url}`)
    lines.push(
      `Font size used: ${s.fontSizeUsed} | declared: ${s.declaredFamily} | rasterised: ${s.rasterisedFamily} | native elements: ${s.nativeElementCount}`
    )
    lines.push('')
    lines.push('| Weight | Uniform | Spread (px) | Decimal jitter (px) | Declared | Rasterised |')
    lines.push('|---|---|---|---|---|---|')
    for (const w of s.weights) {
      lines.push(
        `| ${w.weight} | ${w.uniform} | ${w.advanceSpreadPx} | ${w.decimalJitterPx} | ${w.declaredFamily} | ${w.rasterisedFamily} |`
      )
    }
    lines.push('')
  }
  lines.push(`Exit code: ${result.exitCode}`)
  return lines.join('\n') + '\n'
}

async function measureSurface(page, client, url) {
  await gotoWithRetry(page, url, { waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready)

  const fontSizeUsed = await readCallSiteFontSize(page)
  const { widths, declaredFamilies } = await measureWeightSpans(page, { fontSizeUsed })

  const weightResults = []
  for (const weight of WEIGHTS) {
    const verdict = computeVerdict(widths[weight])
    const rasterisedFamilyRaw = await getRasterisedFamilyBySelector(
      client,
      `[data-numeral-probe-weight="${weight}"]`
    )
    weightResults.push({
      weight,
      advanceSpreadPx: verdict.advanceSpreadPx,
      uniform: verdict.uniform,
      decimalJitterPx: verdict.decimalJitterPx,
      declaredFamily: declaredFamilies[weight],
      rasterisedFamily: normalizeRasterisedFamily(rasterisedFamilyRaw),
      rasterisedFamilyRaw,
    })
  }

  const native = await scanNativeElements(page)
  await removeProbeContainer(page, 'data-numeral-probe-container')

  const representative = weightResults.find((w) => w.weight === CONTROL_WEIGHT) || weightResults[0]

  return {
    url,
    fontSizeUsed,
    declaredFamily: representative.declaredFamily,
    rasterisedFamily: representative.rasterisedFamily,
    weights: weightResults,
    nativeElementCount: native.count,
    nativeElements: native.elements,
  }
}

async function runAcceptance({ urls, label, reportPath }) {
  const origins = urls.map(assertLocalOrigin)
  for (const origin of origins) {
    await assertServerReady(origin)
  }

  const outputDir = makeOutputDir(label)
  const browser = await puppeteer.launch({ protocolTimeout: 45000 })
  try {
    const page = await browser.newPage()
    const client = await page.createCDPSession()
    await client.send('DOM.enable')
    await client.send('CSS.enable')

    const consoleErrors = []
    const failedRequests = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })
    page.on('requestfailed', (req) => {
      failedRequests.push({ url: req.url(), reason: req.failure()?.errorText || 'unknown' })
    })

    const surfaces = []
    let controls = null

    for (let i = 0; i < urls.length; i++) {
      const surface = await measureSurface(page, client, urls[i])
      surfaces.push(surface)
      if (i === 0) {
        controls = await measureControls(page)
      }
    }

    const controlsVoid = !controls || controls.poppins.uniform || !controls.systemUi.uniform
    const anyWeightFailed = surfaces.some((s) =>
      s.weights.some((w) => !w.uniform || w.rasterisedFamily !== w.declaredFamily)
    )

    const exitCode = controlsVoid ? 2 : anyWeightFailed ? 1 : 0

    const result = {
      label,
      mode: 'acceptance',
      timestamp: new Date().toISOString(),
      controls,
      surfaces,
      consoleErrors,
      failedRequests,
      exitCode,
    }

    writeReport(outputDir, reportPath, result, formatAcceptanceMarkdown(result))
    console.log(formatAcceptanceMarkdown(result))
    if (controlsVoid) {
      console.error(
        'VOID RUN: a control assertion failed (Poppins measured uniform, or system-ui measured non-uniform) -- the probe is not measuring glyph advances correctly.'
      )
    }
    return exitCode
  } finally {
    await browser.close()
  }
}

function buildGoogleFontsUrl(family, weights) {
  const familyParam = family.replace(/ /g, '+')
  const axis = weights && weights.length > 0 ? `:wght@${weights.join(';')}` : ''
  return `${GOOGLE_FONTS_CSS2}?family=${familyParam}${axis}&display=swap`
}

async function fetchGoogleFontsCss(page, url) {
  return page.evaluate(async (u) => {
    const res = await fetch(u)
    if (!res.ok) throw new Error('HTTP ' + res.status)
    return res.text()
  }, url)
}

async function measureForcedFamily(page, { family, weight, fontSizeUsed, featureOn }) {
  return page.evaluate(
    async ({ family, weight, fontSizeUsed, featureOn, strings }) => {
      const container = document.createElement('div')
      container.style.position = 'absolute'
      container.style.left = '-99999px'
      container.style.whiteSpace = 'pre'
      document.body.appendChild(container)
      const span = document.createElement('span')
      span.style.fontFamily = `"${family}", sans-serif`
      span.style.fontWeight = String(weight)
      span.style.fontSize = fontSizeUsed
      if (featureOn) span.style.fontVariantNumeric = 'tabular-nums'
      span.textContent = '0000'
      container.appendChild(span)

      // Same fix as measureWeightSpans: a font-display:swap @font-face is
      // not fetched until something needs to render with it, and
      // document.fonts.ready alone only awaits fonts already loading.
      // Without this explicit load+await, every weight but a
      // coincidentally-already-cached one measures the fallback font.
      try {
        await document.fonts.load(`${weight} ${fontSizeUsed} "${family}"`)
      } catch {
        // A family/weight combination that fails to load throws here;
        // measurement continues and reports whatever actually rendered.
      }
      await document.fonts.ready

      const widths = {}
      for (const str of strings) {
        span.textContent = str
        void span.offsetWidth
        widths[str] = span.getBoundingClientRect().width
      }
      container.remove()
      return widths
    },
    { family, weight, fontSizeUsed, featureOn, strings: TEST_STRINGS }
  )
}

/** x-height and cap-height at a fixed 100px canvas size, via measureText's actualBoundingBoxAscent on 'x' and 'H' -- a standard glyph-metric technique that needs no font parsing. */
async function measureGlyphMetrics(page, family) {
  return page.evaluate((family) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    ctx.font = `100px "${family}", sans-serif`
    const x = ctx.measureText('x')
    const cap = ctx.measureText('H')
    return {
      xHeight: x.actualBoundingBoxAscent,
      capHeight: cap.actualBoundingBoxAscent,
    }
  }, family)
}

async function screenCandidate(page, { family, fontSizeUsed, poppinsMetrics }) {
  const requestedWeights = WEIGHTS
  let cssText
  let availableWeights

  try {
    cssText = await fetchGoogleFontsCss(page, buildGoogleFontsUrl(family, requestedWeights))
    availableWeights = requestedWeights.filter((w) => new RegExp(`font-weight:\\s*${w}\\b`).test(cssText))
    if (availableWeights.length === 0) {
      cssText = await fetchGoogleFontsCss(page, buildGoogleFontsUrl(family, null))
      availableWeights = requestedWeights.filter((w) => new RegExp(`font-weight:\\s*${w}\\b`).test(cssText))
    }
  } catch (error) {
    return { family, unreachable: true, error: `could not reach Google Fonts stylesheet service: ${error.message}` }
  }

  await page.addStyleTag({ content: cssText })
  await page.evaluate((fam) => document.fonts.load(`16px "${fam}"`), family)
  await page.evaluate(() => document.fonts.ready)

  const missingWeights = requestedWeights.filter((w) => !availableWeights.includes(w))

  const perWeight = []
  for (const weight of requestedWeights) {
    if (!availableWeights.includes(weight)) {
      perWeight.push({ weight, unavailable: true })
      continue
    }
    const featureOnWidths = await measureForcedFamily(page, { family, weight, fontSizeUsed, featureOn: true })
    const featureOffWidths = await measureForcedFamily(page, { family, weight, fontSizeUsed, featureOn: false })
    perWeight.push({
      weight,
      featureOn: computeVerdict(featureOnWidths),
      featureOff: computeVerdict(featureOffWidths),
    })
  }

  const glyphMetrics = await measureGlyphMetrics(page, family)
  const xHeightRatio = poppinsMetrics.xHeight ? round(glyphMetrics.xHeight / poppinsMetrics.xHeight) : null
  const capHeightRatio = poppinsMetrics.capHeight ? round(glyphMetrics.capHeight / poppinsMetrics.capHeight) : null

  const availablePerWeight = perWeight.filter((w) => !w.unavailable)
  const uniformAtAllWeightsWithFeature =
    availablePerWeight.length === requestedWeights.length && availablePerWeight.every((w) => w.featureOn.uniform)

  return {
    family,
    missingWeights,
    perWeight,
    glyphMetrics,
    xHeightRatio,
    capHeightRatio,
    uniformAtAllWeightsWithFeature,
  }
}

function rankScore(candidate) {
  if (candidate.unreachable) return -Infinity
  let score = candidate.uniformAtAllWeightsWithFeature ? 100 : 0
  if (candidate.xHeightRatio) score -= Math.abs(1 - candidate.xHeightRatio) * 10
  if (candidate.capHeightRatio) score -= Math.abs(1 - candidate.capHeightRatio) * 10
  return score
}

function formatScreeningMarkdown(result) {
  const lines = [`# numeral-probe screening run: ${result.label}`, '', `Timestamp: ${result.timestamp}`, `Measured against: ${result.url}`, '']
  lines.push('| Rank | Family | Uniform at all 4 weights (feature on) | Missing weights | x-height ratio to Poppins | cap-height ratio to Poppins |')
  lines.push('|---|---|---|---|---|---|')
  result.candidates.forEach((c, i) => {
    if (c.unreachable) {
      lines.push(`| ${i + 1} | ${c.family} | UNREACHABLE | - | - | - |`)
      return
    }
    lines.push(
      `| ${i + 1} | ${c.family} | ${c.uniformAtAllWeightsWithFeature} | ${c.missingWeights.join(', ') || 'none'} | ${c.xHeightRatio} | ${c.capHeightRatio} |`
    )
  })
  return lines.join('\n') + '\n'
}

async function runScreening({ families, label, reportPath, url }) {
  const origin = assertLocalOrigin(url)
  await assertServerReady(origin)
  const outputDir = makeOutputDir(label)

  const browser = await puppeteer.launch({ protocolTimeout: 45000 })
  try {
    const page = await browser.newPage()
    // Screening-only CSP bypass (T-11-14): lets a candidate face be loaded
    // from Google Fonts for measurement before it is chosen. Never called
    // in runAcceptance(), so a real font-src regression in the shipped app
    // still surfaces in the run that gates the fix.
    await page.setBypassCSP(true)

    await gotoWithRetry(page, url, { waitUntil: 'load' })
    await page.evaluate(() => document.fonts.ready)
    const fontSizeUsed = await readCallSiteFontSize(page)
    const poppinsMetrics = await measureGlyphMetrics(page, 'Poppins')

    const candidates = []
    for (const family of families) {
      try {
        candidates.push(await screenCandidate(page, { family, fontSizeUsed, poppinsMetrics }))
      } catch (error) {
        candidates.push({ family, unreachable: true, error: error.message })
      }
    }

    const allUnreachable = candidates.every((c) => c.unreachable)
    if (allUnreachable) {
      console.error('VOID RUN: the Google Fonts stylesheet service could not be reached for any candidate.')
      return 2
    }

    candidates.sort((a, b) => rankScore(b) - rankScore(a))

    const result = {
      label,
      mode: 'screen',
      timestamp: new Date().toISOString(),
      url,
      fontSizeUsed,
      poppinsMetrics,
      candidates,
    }

    writeReport(outputDir, reportPath, result, formatScreeningMarkdown(result))
    console.log(formatScreeningMarkdown(result))
    return 0
  } finally {
    await browser.close()
  }
}

async function main() {
  const { urls, label, reportPath, families } = parseArgs(process.argv.slice(2))

  if (families) {
    return runScreening({ families, label, reportPath, url: urls[0] })
  }

  return runAcceptance({ urls, label, reportPath })
}

main()
  .then((code) => process.exit(code ?? 0))
  .catch((error) => {
    console.error(error.message)
    process.exit(2)
  })

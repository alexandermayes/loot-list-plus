#!/usr/bin/env node

/**
 * ENF-05 local-detector wrapper (D-03).
 *
 * WHY THIS EXISTS: ENF-04 and ENF-05 need the deployed public pages
 * (`origin/main` is 264+ commits behind local `main` at the time this plan
 * runs -- nothing from Phases 07-11 is live). This script cannot satisfy
 * ENF-05: it is a LOCAL dev-server run, interim evidence for ENF-05's
 * SUBSTANCE only, and every artifact it produces is labelled `local`
 * everywhere it appears. Do not present this run as the deployed run ENF-05
 * requires, and do not mark ENF-05 satisfied on its strength.
 *
 * ORIGIN GUARD: copied in spirit from `scripts/visual/numeral-probe.mjs`'s
 * `assertLocalOrigin` -- refuses any origin whose protocol is not http or
 * whose hostname is not `localhost`/`127.0.0.1`, before any network call.
 *
 * GATE 2.3 (already true of the underlying detector, stated here so a
 * reader of this file's output does not have to re-derive it): the rendered
 * detector attaches NO design system to an http(s) target
 * (`detector/cli/main.mjs`'s `urlOptions` branch only resolves a design
 * system for `file://` targets). `design-system-*` rules never fire in this
 * run, raw mode or not -- `--no-config` here only strips project
 * ignoreValues/ignoreFiles/advisoryRules filtering, which for a URL target
 * that never had a design system attached changes nothing about
 * `design-system-*` coverage specifically, but DOES change coverage for
 * every OTHER rule this run measures.
 *
 * PAGE LIST: exactly the seven pages ENF-04 names, as a hardcoded constant
 * -- NOT derived from `scripts/visual/baseline.mjs`'s `PAGES` array, which
 * lacks `/about` and `/changelog` (reusing it would silently drop two of the
 * seven).
 *
 * THEME: the detector renders each page in whatever theme is the default at
 * request time (it does not control theme). Light and dark are NOT both
 * measured by this run.
 *
 * STDOUT-TRUNCATION WORKAROUND: `detectCli()` (`detector/cli/main.mjs`)
 * calls `process.stdout.write(...)` immediately followed by
 * `process.exit(...)`. When stdout is a non-TTY pipe (always true under
 * `spawnSync`'s default `stdio: 'pipe'`), that write is asynchronous and
 * `process.exit()` can terminate the process before the pipe finishes
 * flushing -- a well-known Node.js gotcha (nodejs/node#6379), reproduced
 * here directly: a `spawnSync`-captured JSON payload was silently cut off
 * mid-string at exactly 65520 bytes with no error and no stderr, on every
 * run. Redirecting the child's stdout to a real file descriptor (synchronous
 * file I/O, not a pipe) instead of capturing the `stdout` pipe sidesteps the
 * race entirely. This is a workaround in THIS wrapper, not a fix to the
 * shared, un-tracked `.claude/skills/impeccable/` scripts (out of this
 * plan's file scope).
 */

import { spawnSync } from 'node:child_process'
import { execSync } from 'node:child_process'
import { closeSync, existsSync, mkdtempSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PROJECT_ROOT = fileURLToPath(new URL('../../', import.meta.url))
const DETECT_PATH = path.join(PROJECT_ROOT, '.claude/skills/impeccable/scripts/detect.mjs')

const PAGES = [
  '/',
  '/pricing',
  '/compare',
  '/about',
  '/research/wow-classic-loot-systems-2026',
  '/blog/dkp-is-dead-what-classic-guilds-use-in-2026',
  '/changelog',
]

const VIEWPORTS = ['1440x900', '390x844']

const GATING_RULES = ['undersized-ui-text', 'tiny-text', 'low-contrast', 'nested-cards']

function parseArgs(argv) {
  const out = { origin: 'http://localhost:3100', mode: 'raw' }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--origin') out.origin = argv[++i]
    else if (arg === '--mode') out.mode = argv[++i]
    else if (arg === '--out') out.outPath = argv[++i]
  }
  return out
}

/** Refuses any origin other than localhost/127.0.0.1, before any network call (T-12-12). */
function assertLocalOrigin(rawOrigin) {
  let url
  try {
    url = new URL(rawOrigin)
  } catch {
    process.stderr.write(`Refusing to run: "${rawOrigin}" is not a valid URL.\n`)
    process.exit(2)
  }
  if (url.protocol !== 'http:' || (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1')) {
    process.stderr.write(
      `Refusing to run: local-detector-run.mjs only ever measures a local dev server (protocol must be http, hostname must be "localhost" or "127.0.0.1"), got "${rawOrigin}".\n`
    )
    process.exit(2)
  }
  return url
}

async function assertPagesReady(origin, pages) {
  const bad = []
  for (const p of pages) {
    const url = new URL(p, origin).href
    let status = null
    try {
      const res = await fetch(url)
      status = res.status
    } catch (err) {
      bad.push(`${url}: ${err.message}`)
      continue
    }
    if (status !== 200) bad.push(`${url}: HTTP ${status}`)
  }
  if (bad.length > 0) {
    process.stderr.write(`Refusing to run: not all seven pages returned HTTP 200:\n${bad.join('\n')}\n`)
    process.exit(3)
  }
}

function runDetectFor(origin, pages, viewport, mode) {
  const urls = pages.map((p) => new URL(p, origin).href)
  const args = ['detect', ...urls, '--json', '--viewport', viewport]
  if (mode === 'raw') args.push('--no-config')

  // Redirect stdout to a real file (synchronous fs I/O) instead of capturing
  // the pipe -- see the STDOUT-TRUNCATION WORKAROUND header comment.
  const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'enf05-detect-'))
  const stdoutPath = path.join(tmpDir, `${viewport}.json`)
  const stdoutFd = openSync(stdoutPath, 'w')
  let result
  try {
    result = spawnSync(process.execPath, [DETECT_PATH, ...args], {
      stdio: ['ignore', stdoutFd, 'pipe'],
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024,
    })
  } finally {
    closeSync(stdoutFd)
  }

  const stderrErrorLines = (result.stderr || '').split('\n').filter((l) => l.startsWith('Error:'))
  if (![0, 2].includes(result.status) || stderrErrorLines.length > 0) {
    process.stderr.write(
      `Refusing to accept detector run at viewport ${viewport}: exit=${result.status}\nstderr:\n${result.stderr}\n`
    )
    rmSync(tmpDir, { recursive: true, force: true })
    process.exit(5)
  }
  const stdoutText = readFileSync(stdoutPath, 'utf-8')
  let findings
  try {
    findings = JSON.parse(stdoutText || '[]')
  } catch (err) {
    process.stderr.write(`Refusing to accept detector run at viewport ${viewport}: could not parse JSON: ${err.message}\n`)
    rmSync(tmpDir, { recursive: true, force: true })
    process.exit(5)
  }
  rmSync(tmpDir, { recursive: true, force: true })
  return findings
}

/** The finding field carrying the URL, confirmed against `findings.mjs`'s `finding()` helper: `file: filePath` — for a URL scan, `filePath` IS the URL. */
function pageKeyFor(finding, origin, pages) {
  const raw = finding.file || ''
  for (const p of pages) {
    const url = new URL(p, origin).href
    if (raw === url || raw.startsWith(url)) return p
  }
  return raw
}

function main() {
  const { origin: rawOrigin, mode, outPath } = parseArgs(process.argv.slice(2))
  const originUrl = assertLocalOrigin(rawOrigin)
  const origin = originUrl.origin

  if (!existsSync(DETECT_PATH)) {
    process.stderr.write(`FATAL: bundled detector not found at ${DETECT_PATH}\n`)
    process.exit(4)
  }
  if (!outPath) {
    process.stderr.write('Usage: local-detector-run.mjs [--origin http://localhost:3100] [--mode raw|config] --out <path>\n')
    process.exit(2)
  }

  return assertPagesReady(origin, PAGES).then(() => {
    const perViewport = {}
    for (const viewport of VIEWPORTS) {
      const findings = runDetectFor(origin, PAGES, viewport, mode)
      const byPage = {}
      for (const p of PAGES) byPage[p] = []
      for (const f of findings) {
        const page = pageKeyFor(f, origin, PAGES)
        if (!byPage[page]) byPage[page] = []
        byPage[page].push(f)
      }
      perViewport[viewport] = byPage
    }

    // Per-rule counts, and gatingCounts for the four ENF-05 rule ids, per
    // viewport per page with totals.
    const perRuleCounts = {}
    const gatingCounts = {}
    for (const rule of GATING_RULES) gatingCounts[rule] = { total: 0, byViewport: {} }

    let nonAdvisoryTotal = 0
    let advisoryTotal = 0

    for (const viewport of VIEWPORTS) {
      for (const rule of GATING_RULES) gatingCounts[rule].byViewport[viewport] = { total: 0, byPage: {} }
      for (const p of PAGES) {
        const findings = perViewport[viewport][p] || []
        for (const f of findings) {
          const rule = f.antipattern
          perRuleCounts[rule] = (perRuleCounts[rule] || 0) + 1
          if (f.advisory === true) advisoryTotal += 1
          else nonAdvisoryTotal += 1
          if (GATING_RULES.includes(rule)) {
            gatingCounts[rule].total += 1
            gatingCounts[rule].byViewport[viewport].total += 1
            gatingCounts[rule].byViewport[viewport].byPage[p] = (gatingCounts[rule].byViewport[viewport].byPage[p] || 0) + 1
          }
        }
      }
    }

    let gitHead = null
    try {
      gitHead = execSync('git rev-parse HEAD', { cwd: PROJECT_ROOT, encoding: 'utf-8' }).trim()
    } catch {
      gitHead = null
    }

    const notice =
      'LOCAL dev-server run. Interim evidence for ENF-05\'s substance only -- does NOT satisfy ENF-05, which requires the deployed pages.'

    const result = {
      environment: 'local',
      notice,
      detectorPath: DETECT_PATH,
      origin,
      gitHead,
      timestamp: new Date().toISOString(),
      mode,
      viewports: VIEWPORTS,
      pages: PAGES,
      findings: perViewport,
      perRuleCounts,
      gatingCounts,
      nonAdvisoryTotal,
      advisoryTotal,
      themeNote: 'The detector renders each page in its default theme, which it does not control; light and dark are not both measured.',
    }

    writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n')

    console.log(`Local detector run (${mode}) complete: ${nonAdvisoryTotal} non-advisory / ${advisoryTotal} advisory finding(s) across ${PAGES.length} pages x ${VIEWPORTS.length} viewports.`)
    for (const rule of GATING_RULES) {
      console.log(`  ${rule}: ${gatingCounts[rule].total}`)
    }
    process.exit(0)
  })
}

main()

// @vitest-environment node
//
// Source-scan guard for EXPN-06 and Standing Constraint 5: nothing at build,
// deploy, request or test time may call wago or Wowhead live.
//
// Why: the wago reference tables returned 503 on every probe on 2026-10-12, so
// CI and the app must never depend on them. The committed snapshot under
// data/expansions/forever/reference/ is the only copy of wago data the repo
// reads, and a scheduled workflow refreshes it offline.
//
// Three rules, applied to every scanned file with comments stripped:
//   1. No fetch-family call (fetch, axios, got, ky, http or https get and
//      request, new XMLHttpRequest, new WebSocket) has argument text that names
//      the wago host or a Wowhead host.
//   2. Neither the wago host nor the Wowhead tooltip API host appears anywhere
//      as text. That is stricter than "fetches live" on purpose: it keeps a
//      future URL constant from slipping in. A Wowhead link builder that returns
//      a plain item URL string and never fetches it is fine.
//   3. Runtime code (non-test files under app, lib, utils, domain, components,
//      data and discord-bot) imports nothing from scripts/, so offline tooling
//      cannot be pulled into the app. Tests may import from scripts/.
//
// Out of scope, and why:
//   - The Wowhead tooltip widget loaded from the zamimg host in app/layout.tsx
//     is a third-party script that runs in the visitor's browser. No first-party
//     code fetches anything.
//   - next.config.ts lists the tooltip API host in the CSP connect-src. That is
//     an allowance for the widget, not a call, and the file is outside the scan.
//   - Non-test files under scripts/ are offline tooling (the snapshot refresh
//     and the existing Wowhead icon and unique-flag fetchers). They run by hand
//     or from a scheduled workflow, never at build, request or test time.
//
// The host literals below are built by concatenation, so this file scans clean
// without excluding itself. It is part of the walk like every other test file.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const WAGO_HOST = 'wago' + '.tools'
const WOWHEAD_HOST = 'wowhead' + '.com'
const TOOLTIP_HOST = 'nether.' + WOWHEAD_HOST

const REPO_ROOT = path.resolve(__dirname, '../../..')
const RUNTIME_DIRS = ['app', 'lib', 'utils', 'domain', 'components', 'data', 'discord-bot']
const CODE_FILE = /\.(?:ts|tsx|js|mjs|cjs)$/
const TEST_FILE = /\.(?:test|spec)\.(?:ts|tsx|js|mjs|cjs)$/
const SKIP_DIRS = new Set([
  'node_modules',
  '.next',
  '.git',
  '.claude',
  '.planning',
  '.gsd',
  '.agents',
  '.codex',
  '.vercel',
  'coverage',
  'dist',
  'out',
])
const MIN_SCANNED_FILES = 700

interface ScanOptions {
  /** True for non-test files under the runtime directories (rule 3 applies). */
  isRuntimeFile: boolean
}

interface Piece {
  out: string
  end: number
}

// Characters after which a slash starts a regular expression rather than a
// division. `<` is left out so a JSX closing tag is not read as a regex.
const REGEX_PRECEDERS = new Set(['', '(', ',', '=', ':', '[', '!', '&', '|', '?', '{', '}', ';', '+', '-', '*', '%', '>', '~', '^'])

/** Copies a template literal verbatim, recursing into ${ } so comments inside are stripped. */
function scanTemplate(source: string, start: number): Piece {
  let out = '`'
  let i = start + 1
  while (i < source.length) {
    const ch = source[i]
    if (ch === '\\') {
      out += source.slice(i, i + 2)
      i += 2
      continue
    }
    if (ch === '`') return { out: `${out}\``, end: i + 1 }
    if (ch === '$' && source[i + 1] === '{') {
      const inner = scanCode(source, i + 2, true)
      out += `\${${inner.out}}`
      i = inner.end + 1
      continue
    }
    out += ch
    i++
  }
  return { out, end: source.length }
}

/**
 * Copies code with block and line comments removed and string, template and
 * regex contents kept. A quote in plain text (a JSX apostrophe) cannot swallow
 * more than its own line, because single and double quoted strings end at a
 * newline. With inExpr set it stops at the brace that closes a ${ } expression.
 */
function scanCode(source: string, start: number, inExpr: boolean): Piece {
  let out = ''
  let i = start
  let braceDepth = 0
  while (i < source.length) {
    const ch = source[i]
    const next = source[i + 1]
    if (ch === '/' && next === '/') {
      const end = source.indexOf('\n', i)
      if (end === -1) return { out, end: source.length }
      i = end
      continue
    }
    if (ch === '/' && next === '*') {
      const end = source.indexOf('*/', i + 2)
      if (end === -1) return { out, end: source.length }
      out += ' '
      i = end + 2
      continue
    }
    if (inExpr) {
      if (ch === '{') braceDepth++
      else if (ch === '}') {
        if (braceDepth === 0) return { out, end: i }
        braceDepth--
      }
    }
    if (ch === '`') {
      const template = scanTemplate(source, i)
      out += template.out
      i = template.end
      continue
    }
    if (ch === "'" || ch === '"') {
      let j = i + 1
      while (j < source.length && source[j] !== ch && source[j] !== '\n') {
        if (source[j] === '\\') j++
        j++
      }
      const closed = source[j] === ch
      out += source.slice(i, closed ? j + 1 : j)
      i = closed ? j + 1 : j
      continue
    }
    if (ch === '/' && REGEX_PRECEDERS.has(out.trimEnd().slice(-1))) {
      let j = i + 1
      let inClass = false
      while (j < source.length && source[j] !== '\n') {
        if (source[j] === '\\') j++
        else if (source[j] === '[') inClass = true
        else if (source[j] === ']') inClass = false
        else if (source[j] === '/' && !inClass) break
        j++
      }
      if (source[j] === '/') {
        out += source.slice(i, j + 1)
        i = j + 1
        continue
      }
    }
    out += ch
    i++
  }
  return { out, end: source.length }
}

function stripComments(source: string): string {
  return scanCode(source, 0, false).out
}

/**
 * Returns the text between the parenthesis at `openIndex` and its match, or
 * null when it never balances. Expects comments already stripped. Strings and
 * template literals are skipped so a bracket inside them does not count.
 */
function readBalanced(source: string, openIndex: number): string | null {
  let depth = 0
  let i = openIndex
  while (i < source.length) {
    const ch = source[i]
    if (ch === "'" || ch === '"' || ch === '`') {
      let j = i + 1
      while (j < source.length && source[j] !== ch && (ch === '`' || source[j] !== '\n')) {
        if (source[j] === '\\') j++
        j++
      }
      i = j + 1
      continue
    }
    if (ch === '(') depth++
    if (ch === ')') {
      depth--
      if (depth === 0) return source.slice(openIndex + 1, i)
    }
    i++
  }
  return null
}

const HTTP_METHODS = '(?:get|post|put|patch|delete|head|options|request|stream)'
const FETCH_FAMILY_CALL = new RegExp(
  [
    '\\bfetch\\s*\\(',
    `\\baxios(?:\\s*\\.\\s*${HTTP_METHODS})?\\s*\\(`,
    `\\bgot(?:\\s*\\.\\s*${HTTP_METHODS})?\\s*\\(`,
    `\\bky(?:\\s*\\.\\s*${HTTP_METHODS})?\\s*\\(`,
    '\\bhttps?\\s*\\.\\s*(?:get|request)\\s*\\(',
    '\\bnew\\s+XMLHttpRequest\\s*\\(',
    '\\bnew\\s+WebSocket\\s*\\(',
  ].join('|'),
  'g',
)

// import x from 'p', export * from 'p', import 'p', import('p') and require('p').
const MODULE_PATH = /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)(['"])([^'"\n]+)\1/g
// 'scripts' as a whole path segment: '../../scripts/x', '@/scripts/x', 'scripts/x'.
const SCRIPTS_SEGMENT = /(?:^|\/)scripts\//

/** One message per way `source` reaches wago or Wowhead live, or pulls scripts/ into runtime. */
export function findLiveFetchViolations(source: string, { isRuntimeFile }: ScanOptions): string[] {
  const code = stripComments(source)
  const violations: string[] = []

  for (const match of code.matchAll(FETCH_FAMILY_CALL)) {
    const index = match.index ?? 0
    // `function fetch(` declares a function rather than calling one.
    if (/\bfunction\s+$/.test(code.slice(Math.max(0, index - 20), index))) continue
    const args = readBalanced(code, index + match[0].length - 1) ?? code.slice(index + match[0].length)
    if (args.includes(WAGO_HOST) || args.includes(WOWHEAD_HOST)) {
      violations.push(`rule 1: ${match[0].replace(/\s*\($/, '')} call names the wago or Wowhead host`)
    }
  }

  if (code.includes(WAGO_HOST)) violations.push('rule 2: names the wago host')
  if (code.includes(TOOLTIP_HOST)) violations.push('rule 2: names the Wowhead tooltip API host')

  if (isRuntimeFile) {
    for (const match of code.matchAll(MODULE_PATH)) {
      if (SCRIPTS_SEGMENT.test(match[2])) {
        violations.push(`rule 3: runtime code imports from scripts/ (${match[2]})`)
      }
    }
  }

  return violations
}

/**
 * Every file the guard reads, as absolute paths: code files under the runtime
 * directories, plus test files anywhere in the repo. A directory that holds its
 * own .git entry is a nested local worktree and is skipped.
 */
function collectScannedFiles(repoRoot: string): string[] {
  const found = new Set<string>()

  function walk(dir: string, underRuntimeDir: boolean): void {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue
        if (fs.existsSync(path.join(full, '.git'))) continue
        walk(full, underRuntimeDir)
      } else if (entry.isFile() && CODE_FILE.test(entry.name)) {
        if (underRuntimeDir || TEST_FILE.test(entry.name)) found.add(full)
      }
    }
  }

  // Test files anywhere, then every code file under the runtime directories.
  walk(repoRoot, false)
  for (const dir of RUNTIME_DIRS) {
    const full = path.join(repoRoot, dir)
    if (fs.existsSync(full)) walk(full, true)
  }
  return [...found].sort()
}

/** Runtime means a non-test file under a runtime directory. */
function isRuntimeFile(repoRelative: string): boolean {
  const posix = repoRelative.split(path.sep).join('/')
  const topDir = posix.split('/')[0]
  if (!RUNTIME_DIRS.includes(topDir)) return false
  if (TEST_FILE.test(posix)) return false
  return !posix.split('/').includes('__tests__')
}

const SELF = path.relative(REPO_ROOT, __filename).split(path.sep).join('/')
const scannedFiles = collectScannedFiles(REPO_ROOT)
const scannedRelative = scannedFiles.map((file) => path.relative(REPO_ROOT, file).split(path.sep).join('/'))

describe('no live wago or Wowhead fetch in runtime or test code (EXPN-06)', () => {
  it('resolves the repo root', () => {
    expect(fs.existsSync(path.join(REPO_ROOT, 'package.json'))).toBe(true)
  })

  it(`scans at least ${MIN_SCANNED_FILES} files, so the walk is not vacuous`, () => {
    expect(scannedFiles.length).toBeGreaterThanOrEqual(MIN_SCANNED_FILES)
  })

  it('scans its own file, runtime files and test files outside the runtime directories', () => {
    expect(scannedRelative).toContain(SELF)
    expect(scannedRelative).toContain('scripts/lib/__tests__/wago-snapshot.test.ts')
    expect(scannedRelative.some((file) => isRuntimeFile(file))).toBe(true)
  })

  it('finds no violation in any scanned file', () => {
    const offenders = scannedFiles.flatMap((file, index) => {
      const relative = scannedRelative[index]
      return findLiveFetchViolations(fs.readFileSync(file, 'utf8'), {
        isRuntimeFile: isRuntimeFile(relative),
      }).map((violation) => `${relative}: ${violation}`)
    })
    expect(offenders).toEqual([])
  })
})

describe('the scan flags violations (self-checks)', () => {
  const runtime = { isRuntimeFile: true }
  const test = { isRuntimeFile: false }

  it('flags a fetch whose template argument is on the wago host (rule 1 and 2)', () => {
    const source = 'const res = await fetch(`https://' + WAGO_HOST + '/db2/ItemSparse/csv?build=${build}`)'
    const violations = findLiveFetchViolations(source, runtime)
    expect(violations.some((v) => v.startsWith('rule 1'))).toBe(true)
    expect(violations.some((v) => v.startsWith('rule 2'))).toBe(true)
  })

  it('flags an axios.get on a Wowhead tooltip URL', () => {
    const source = "const { data } = await axios.get('https://" + TOOLTIP_HOST + "/tooltip/item/19019')"
    const violations = findLiveFetchViolations(source, runtime)
    expect(violations.some((v) => v.startsWith('rule 1'))).toBe(true)
    expect(violations.some((v) => v.startsWith('rule 2'))).toBe(true)
  })

  it('flags a fetch to a Wowhead host that is not the tooltip host (rule 1 only)', () => {
    const source = "await fetch('https://www." + WOWHEAD_HOST + "/classic/item=19019')"
    expect(findLiveFetchViolations(source, test)).toEqual([expect.stringMatching(/^rule 1/)])
  })

  it('flags a bare string literal of the tooltip host (rule 2)', () => {
    const source = "const TOOLTIP_BASE = 'https://" + TOOLTIP_HOST + "'"
    expect(findLiveFetchViolations(source, test)).toEqual([expect.stringMatching(/^rule 2/)])
  })

  it('flags the other fetch-family callees', () => {
    const url = "'https://" + WAGO_HOST + "/x'"
    for (const call of [`https.get(${url})`, `http.request(${url})`, `got(${url})`, `ky.get(${url})`, `new WebSocket(${url})`, `xhr.open('GET', ${url})`]) {
      const violations = findLiveFetchViolations(call, test)
      expect(violations.length, call).toBeGreaterThan(0)
    }
    expect(findLiveFetchViolations(`new XMLHttpRequest(${url})`, test).some((v) => v.startsWith('rule 1'))).toBe(true)
  })

  it('flags an import from scripts/ in a runtime file (rule 3)', () => {
    const relative = "import { refreshSnapshot } from '../../scripts/lib/wago-snapshot'"
    const alias = "import { refreshSnapshot } from '@/scripts/lib/wago-snapshot'"
    const required = "const snap = require('../scripts/lib/wago-snapshot')"
    const dynamic = "const snap = await import('../scripts/lib/wago-snapshot')"
    for (const source of [relative, alias, required, dynamic]) {
      expect(findLiveFetchViolations(source, runtime), source).toEqual([expect.stringMatching(/^rule 3/)])
    }
  })

  it('allows an import from scripts/ in a test file', () => {
    const source = "import { refreshSnapshot } from '../wago-snapshot'\nimport { x } from '@/scripts/lib/wago-snapshot'"
    expect(findLiveFetchViolations(source, test)).toEqual([])
  })

  it('does not treat a package or folder that merely ends in "scripts" as scripts/', () => {
    const source = "import { a } from 'ts-scripts/x'\nimport { b } from '@/domain/transcripts/x'"
    expect(findLiveFetchViolations(source, runtime)).toEqual([])
  })

  it('accepts a clean source', () => {
    const source = ["import { getItem } from '@/lib/items'", "export const load = () => fetch('/api/items')"].join('\n')
    expect(findLiveFetchViolations(source, runtime)).toEqual([])
  })

  it('accepts a Wowhead link builder that never fetches', () => {
    const source = [
      'export function itemUrl(id: string): string {',
      "  return 'https://www." + WOWHEAD_HOST + "/classic/item=' + id",
      '}',
      'export const label = (id: string) => `Open ${itemUrl(id)}`',
    ].join('\n')
    expect(findLiveFetchViolations(source, runtime)).toEqual([])
  })

  it('accepts a fetch of a Wowhead-free URL beside a Wowhead link string', () => {
    const source = [
      "const link = 'https://www." + WOWHEAD_HOST + "/item=1'",
      "await fetch('/api/items?link=' + encodeURIComponent(link))",
    ].join('\n')
    expect(findLiveFetchViolations(source, runtime)).toEqual([])
  })

  it('ignores a host that only appears in comments', () => {
    const source = [
      '// The reference tables live on ' + WAGO_HOST + ' and ' + TOOLTIP_HOST,
      '/* fetch("https://' + WAGO_HOST + '/x") and',
      "   import x from '../scripts/y' */",
      'export const ok = 1',
    ].join('\n')
    expect(findLiveFetchViolations(source, runtime)).toEqual([])
  })

  it('keeps string contents: a slash pair inside a URL string is not a comment', () => {
    const source = "const a = 'https://" + WAGO_HOST + "/x' // trailing comment"
    expect(findLiveFetchViolations(source, test)).toEqual([expect.stringMatching(/^rule 2/)])
  })

  it('is not confused by a JSX apostrophe, a regex literal or a comment inside a template expression', () => {
    const source = [
      "const a = <p>Don't panic</p>",
      "const b = /https?:\\/\\/[^'\"]+/",
      'const c = `${/* ' + WAGO_HOST + ' */ value}`',
      '// ' + WAGO_HOST,
      'export const ok = 1',
    ].join('\n')
    expect(findLiveFetchViolations(source, runtime)).toEqual([])
  })

  it('reads fetch arguments through nested parentheses and strings', () => {
    const source = "await fetch(buildUrl('a)b', (x) => x.id), { headers: { h: 'https://" + WAGO_HOST + "' } })"
    expect(findLiveFetchViolations(source, test).some((v) => v.startsWith('rule 1'))).toBe(true)
  })

  it('does not treat a function declaration named fetch as a call', () => {
    const source = "function fetch(url: string) { return 'https://www." + WOWHEAD_HOST + "/' + url }"
    expect(findLiveFetchViolations(source, runtime)).toEqual([])
  })
})

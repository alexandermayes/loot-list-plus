// Reads DESIGN.md and parses its YAML frontmatter using the exact subset the
// impeccable detector supports (`.claude/skills/impeccable/scripts/detector/
// design-system.mjs`'s `parseYamlSubset`/`parseScalar`/`findTopLevelColon`/
// `unquoteYamlKey`/`stripInlineYamlComment`). This file mirrors that parser's
// semantics on purpose (ENF-01, D-06): a frontmatter value the detector would
// read as a plain string (anything opening with `{` or `[`, i.e. flow style)
// silently disables the design-system-* rules that depend on it, and that
// failure looks exactly like "no findings" -- the single worst outcome this
// phase could ship. `parseFrontmatterSubset` throws naming the line instead
// of silently degrading, so a flow-style regression in DESIGN.md fails the
// parity guard loudly rather than quietly abstaining like the real hook
// would.
//
// No npm dependency: block-style nested maps, quoted/unquoted scalars,
// numbers, booleans, null, and full-line `#` comments only. Never add a YAML
// library here -- that is the whole point of "the frontmatter subset is
// hand-parsed" (12-02-PLAN.md prohibition).

import * as fs from 'node:fs'
import * as path from 'node:path'

export interface ParsedDesignMd {
  raw: string
  frontmatter: string
  body: string
}

/**
 * Resolves `DESIGN.md` against `process.cwd()` by default (or the given
 * `filePath`), throws naming the resolved path when the file is absent,
 * requires the first line to be exactly three hyphens, splits the
 * frontmatter from the body at the next such line, and returns the raw
 * frontmatter/body text (unparsed).
 */
export function readDesignMd(filePath?: string): ParsedDesignMd {
  const resolved = filePath ? path.resolve(filePath) : path.resolve(process.cwd(), 'DESIGN.md')
  if (!fs.existsSync(resolved)) {
    throw new Error(`readDesignMd: DESIGN.md not found at "${resolved}"`)
  }
  const raw = fs.readFileSync(resolved, 'utf-8')
  const lines = raw.split(/\r?\n/)
  if (lines[0]?.trim() !== '---') {
    throw new Error(`readDesignMd: "${resolved}" does not start with a "---" frontmatter fence`)
  }
  let end = -1
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      end = i
      break
    }
  }
  if (end === -1) {
    throw new Error(`readDesignMd: "${resolved}" frontmatter fence is never closed`)
  }
  const frontmatter = lines.slice(1, end).join('\n')
  const body = lines.slice(end + 1).join('\n')
  return { raw, frontmatter, body }
}

/**
 * Returns the text between one `## ` heading (matched by exact trimmed
 * equality, e.g. `## Colors`) and the next `## ` heading, or end of string
 * when there is no next one. A nested `### ` subsection (e.g. `### Contrast
 * record`) is contained within its parent's range, not treated as a
 * boundary -- only two-hash headings end a section (12-03 Task 1).
 *
 * Throws naming the heading when it is not present, so a Task 2 section
 * reorder or a typo cannot silently make a downstream assertion look like
 * "no findings" instead of "the section moved".
 */
export function sectionBody(body: string, heading: string): string {
  const lines = body.split(/\r?\n/)
  const startIdx = lines.findIndex((line) => line.trim() === heading)
  if (startIdx === -1) {
    throw new Error(`sectionBody: heading "${heading}" not found`)
  }
  let endIdx = lines.length
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (/^##\s/.test(lines[i])) {
      endIdx = i
      break
    }
  }
  return lines.slice(startIdx + 1, endIdx).join('\n')
}

/**
 * Parses the first GitHub-flavoured markdown table whose header row's first
 * cell equals `firstHeaderCell` exactly (trimmed), returning each data row
 * (skipping the header row and its `---` separator row) as an array of
 * trimmed cells with one layer of surrounding backticks stripped, so a
 * token cell written as `` `--accent` `` reads as `--accent`.
 *
 * Throws naming the header cell when no such table exists, so a renamed
 * column or a missing table cannot silently produce an empty, vacuously
 * passing row set.
 */
export function parseTable(text: string, firstHeaderCell: string): string[][] {
  const lines = text.split(/\r?\n/)
  const headerIdx = lines.findIndex((line) => {
    const trimmed = line.trim()
    if (!trimmed.startsWith('|')) return false
    const firstCell = trimmed.split('|')[1]?.trim()
    return firstCell === firstHeaderCell
  })
  if (headerIdx === -1) {
    throw new Error(`parseTable: no table found with first header cell "${firstHeaderCell}"`)
  }

  const rows: string[][] = []
  for (let i = headerIdx + 2; i < lines.length; i++) {
    const trimmed = lines[i].trim()
    if (!trimmed.startsWith('|')) break
    const cells = trimmed
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim().replace(/^`(.*)`$/, '$1'))
    rows.push(cells)
  }
  return rows
}

/** A parsed frontmatter value: a nested map, a string, a number, a boolean, or null. */
export type YamlValue = string | number | boolean | null | { [key: string]: YamlValue }

function findTopLevelColon(s: string): number {
  let inQuote: string | null = null
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (inQuote) {
      if (ch === inQuote && s[i - 1] !== '\\') inQuote = null
    } else if (ch === '"' || ch === "'") {
      inQuote = ch
    } else if (ch === ':') {
      return i
    }
  }
  return -1
}

function unquoteYamlKey(key: string): string {
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    return key.slice(1, -1)
  }
  return key
}

function stripInlineYamlComment(s: string): string {
  let inQuote: string | null = null
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (inQuote) {
      if (ch === inQuote && s[i - 1] !== '\\') inQuote = null
    } else if (ch === '"' || ch === "'") {
      inQuote = ch
    } else if (ch === '#' && i > 0 && /\s/.test(s[i - 1])) {
      return s.slice(0, i).trimEnd()
    }
  }
  return s
}

const YAML_SIMPLE_ESCAPES: Record<string, string> = {
  '0': '\0',
  a: '\x07',
  b: '\b',
  t: '\t',
  n: '\n',
  v: '\v',
  f: '\f',
  r: '\r',
  e: '\x1b',
  ' ': ' ',
  '"': '"',
  '/': '/',
  '\\': '\\',
  N: '\u0085',
  _: ' ',
  L: ' ',
  P: ' ',
}
const YAML_HEX_ESCAPE_LENGTHS: Record<string, number> = { x: 2, u: 4, U: 8 }

function unescapeYamlDoubleQuoted(body: string): string {
  let out = ''
  for (let i = 0; i < body.length; i++) {
    const ch = body[i]
    if (ch !== '\\' || i === body.length - 1) {
      out += ch
      continue
    }
    const next = body[i + 1]
    if (Object.prototype.hasOwnProperty.call(YAML_SIMPLE_ESCAPES, next)) {
      out += YAML_SIMPLE_ESCAPES[next]
      i++
      continue
    }
    const hexLen = YAML_HEX_ESCAPE_LENGTHS[next]
    if (hexLen) {
      const hex = body.slice(i + 2, i + 2 + hexLen)
      const codePoint =
        hex.length === hexLen && /^[0-9a-fA-F]+$/.test(hex) ? parseInt(hex, 16) : -1
      if (codePoint >= 0 && codePoint <= 0x10ffff) {
        out += String.fromCodePoint(codePoint)
        i += 1 + hexLen
        continue
      }
    }
    out += ch
  }
  return out
}

function parseScalar(raw: string): YamlValue {
  const s = raw.trim()
  if (s.length >= 2 && s.startsWith('"') && s.endsWith('"')) {
    return unescapeYamlDoubleQuoted(s.slice(1, -1))
  }
  if (s.length >= 2 && s.startsWith("'") && s.endsWith("'")) {
    return s.slice(1, -1).split("''").join("'")
  }
  if (s === 'true') return true
  if (s === 'false') return false
  if (s === 'null' || s === '~') return null
  if (/^-?\d+$/.test(s)) return Number(s)
  if (/^-?\d*\.\d+$/.test(s)) return Number(s)
  return s
}

/**
 * Reproduces the detector's `parseYamlSubset`/`parseScalar` semantics
 * exactly: indentation-nested block maps, double- and single-quoted
 * strings, integers and decimals as numbers, `true`/`false`/`null`,
 * full-line `#` comments skipped. Throws, naming the line, on any value that
 * begins with a brace or a bracket -- the detector would read that value as
 * a plain string and the dependent design-system rule would silently
 * abstain. No npm dependency.
 */
export function parseFrontmatterSubset(yaml: string): Record<string, YamlValue> {
  const root: Record<string, YamlValue> = {}
  const stack: { indent: number; obj: Record<string, YamlValue> }[] = [
    { indent: -1, obj: root },
  ]

  const lines = String(yaml || '').split(/\r?\n/)
  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const raw = lines[lineNum]
    if (!raw.trim() || /^\s*#/.test(raw)) continue
    const indent = raw.match(/^\s*/)![0].length
    const content = raw.slice(indent)
    const colonIdx = findTopLevelColon(content)
    if (colonIdx === -1) continue

    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) stack.pop()

    const key = unquoteYamlKey(content.slice(0, colonIdx).trim())
    const rest = stripInlineYamlComment(content.slice(colonIdx + 1).trim())
    const parent = stack[stack.length - 1].obj

    if (rest === '') {
      const obj: Record<string, YamlValue> = {}
      parent[key] = obj
      stack.push({ indent, obj })
    } else {
      if (rest.startsWith('{') || rest.startsWith('[')) {
        throw new Error(
          `parseFrontmatterSubset: line ${lineNum + 1} key "${key}" has a flow-style value ` +
            `("${rest}") -- the detector's parseYamlSubset would read this as a plain string ` +
            `and the dependent design-system rule would silently abstain. Use block style.`
        )
      }
      parent[key] = parseScalar(rest)
    }
  }

  return root
}

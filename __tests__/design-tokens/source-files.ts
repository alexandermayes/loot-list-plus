import fs from 'node:fs'
import path from 'node:path'

// Shared source-enumeration helpers for the design-token guard tests
// (TYPE-01's type-scale-floor suite and the Plan 05 palette-literal suite).
// Deliberately not filtered by source extension and does not skip
// `__tests__` directories, so this mirrors a plain recursive grep exactly.

const SKIPPED_DIRECTORY_NAMES = new Set(['node_modules', '.next', '.git'])

const BINARY_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.svg',
  '.ico',
  '.webp',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.mp4',
  '.webm',
])

/**
 * Recursively walks each root (resolved against process.cwd()) and returns
 * every file path found, skipping node_modules/.next/.git directories and
 * binary asset extensions. Throws an Error naming the missing path when a
 * root does not exist, so a zero-match result from `matchesIn` can never
 * mean "scanned nothing" rather than "scanned and clean".
 *
 * @param roots - directory paths, relative to process.cwd()
 * @returns absolute file paths for every non-binary file under the roots
 */
export function sourceFiles(roots: string[]): string[] {
  const files: string[] = []

  for (const root of roots) {
    const absoluteRoot = path.resolve(process.cwd(), root)
    if (!fs.existsSync(absoluteRoot)) {
      throw new Error(`sourceFiles: root path does not exist: ${absoluteRoot}`)
    }
    walk(absoluteRoot, files)
  }

  return files
}

function walk(dir: string, files: string[]): void {
  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SKIPPED_DIRECTORY_NAMES.has(entry.name)) {
        continue
      }
      walk(path.join(dir, entry.name), files)
      continue
    }

    const ext = path.extname(entry.name).toLowerCase()
    if (BINARY_EXTENSIONS.has(ext)) {
      continue
    }

    files.push(path.join(dir, entry.name))
  }
}

/** One matching line within a scanned file. */
export interface SourceMatch {
  file: string
  line: number
  text: string
}

/**
 * Reads each file as utf8, splits on newlines, and returns one entry per
 * line matching `pattern`, with a 1-based line number and the trimmed line
 * text. An empty return array is a pass (scanned-and-clean), not an error.
 *
 * @param files - file paths, as returned by sourceFiles()
 * @param pattern - the regular expression to test each line against
 * @returns every matching line, across every file, in file order
 */
export function matchesIn(files: string[], pattern: RegExp): SourceMatch[] {
  const matches: SourceMatch[] = []
  // Strip a global flag: a global RegExp's .test() advances lastIndex
  // across calls, which would silently skip matches when the same
  // pattern instance is reused across many lines.
  const singleUse = new RegExp(pattern.source, pattern.flags.replace('g', ''))

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8')
    const lines = content.split('\n')

    lines.forEach((text, index) => {
      if (singleUse.test(text)) {
        matches.push({ file, line: index + 1, text: text.trim() })
      }
    })
  }

  return matches
}

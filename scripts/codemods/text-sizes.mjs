#!/usr/bin/env node

/**
 * Rewrites arbitrary Tailwind text-size class literals (text-[Npx]) onto
 * the named fontSize scale steps committed in
 * scripts/codemods/text-size-map.json (TYPE-03, D-01 through D-04).
 *
 * Usage: node scripts/codemods/text-sizes.mjs <path> [--dry-run]
 *
 * <path> is a file or directory, resolved against process.cwd(). It must
 * resolve to a location under app/ or components/ (relative to the repo
 * root) -- any other path is a hard error naming the out-of-scope path, so
 * a mis-scoped argument can never rewrite the wrong tree.
 *
 * Only .ts/.tsx files are scanned, walking the same node_modules/.next/.git
 * skip set as __tests__/design-tokens/source-files.ts. Every occurrence of
 * text-[Npx] (N captured as ASCII decimal digits only) whose pixel value is
 * a key in text-size-map.json is rewritten to text-<alias>. A pixel value
 * NOT present in the table is a hard error naming the file, line and
 * value -- this script never silently skips a site or invents an alias.
 *
 * Idempotent: the match pattern only recognises the arbitrary-value bracket
 * form, and the replacement always emits the named-alias form, so a second
 * run over an already-rewritten path matches nothing and reports a zero
 * total.
 *
 * --dry-run prints the identical report described below and writes no
 * file. Report: one line per rewritten site (file, 1-based line, original
 * pixel value, the alias it became), then one per-file subtotal line, then
 * one grand total line, always in fixed (file, then line) order so two
 * runs of the same scope produce byte-identical stdout.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '..', '..')
const ALLOWED_ROOTS = ['app', 'components']
const SKIPPED_DIRECTORY_NAMES = new Set(['node_modules', '.next', '.git'])
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx'])
const ARBITRARY_TEXT_SIZE_PATTERN = /text-\[([0-9]+)px\]/g

const textSizeMap = JSON.parse(
  readFileSync(path.join(__dirname, 'text-size-map.json'), 'utf8')
)

function parseArgs(argv) {
  const dryRun = argv.includes('--dry-run')
  const positional = argv.filter((arg) => arg !== '--dry-run')
  const targetArg = positional[0]
  if (!targetArg) {
    throw new Error(
      'Missing required argument: <path>. Usage: node scripts/codemods/text-sizes.mjs <path> [--dry-run]'
    )
  }
  return { targetArg, dryRun }
}

function resolveScopedPath(targetArg) {
  const resolved = path.resolve(process.cwd(), targetArg)
  const relative = path.relative(REPO_ROOT, resolved)
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(
      `Refusing to run: "${targetArg}" resolves outside the repository root (${REPO_ROOT}).`
    )
  }
  const firstSegment = relative.split(path.sep)[0]
  if (!ALLOWED_ROOTS.includes(firstSegment)) {
    throw new Error(
      `Refusing to run: "${targetArg}" resolves to "${relative}", which is not under app/ or components/. Usage: node scripts/codemods/text-sizes.mjs <path-under-app-or-components> [--dry-run]`
    )
  }
  return resolved
}

function collectSourceFiles(root) {
  const files = []
  const rootStat = statSync(root)
  if (rootStat.isFile()) {
    if (SOURCE_EXTENSIONS.has(path.extname(root))) {
      files.push(root)
    }
    return files
  }
  walk(root, files)
  files.sort()
  return files
}

function walk(dir, files) {
  const entries = readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SKIPPED_DIRECTORY_NAMES.has(entry.name)) continue
      walk(path.join(dir, entry.name), files)
      continue
    }
    if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(path.join(dir, entry.name))
    }
  }
}

function processFile(filePath, dryRun) {
  const original = readFileSync(filePath, 'utf8')
  const lines = original.split('\n')
  const rewrites = []

  const newLines = lines.map((line, index) => {
    return line.replace(ARBITRARY_TEXT_SIZE_PATTERN, (_match, pxValue) => {
      const alias = textSizeMap[pxValue]
      if (!alias) {
        throw new Error(
          `text-sizes.mjs: unmapped pixel value "${pxValue}px" at ${filePath}:${index + 1}. ` +
            `Add "${pxValue}" to scripts/codemods/text-size-map.json before rewriting this file -- ` +
            'never invent an alias for an unmapped value.'
        )
      }
      rewrites.push({ file: filePath, line: index + 1, px: pxValue, alias })
      return `text-${alias}`
    })
  })

  if (!dryRun && rewrites.length > 0) {
    writeFileSync(filePath, newLines.join('\n'))
  }

  return rewrites
}

function buildReport(allRewrites, files) {
  const lines = []
  const byFile = new Map()

  for (const rewrite of allRewrites) {
    if (!byFile.has(rewrite.file)) byFile.set(rewrite.file, [])
    byFile.get(rewrite.file).push(rewrite)
  }

  for (const file of files) {
    const fileRewrites = byFile.get(file)
    if (!fileRewrites || fileRewrites.length === 0) continue
    const relFile = path.relative(REPO_ROOT, file)
    for (const rewrite of fileRewrites) {
      lines.push(`${relFile}:${rewrite.line}: ${rewrite.px}px -> text-${rewrite.alias}`)
    }
    lines.push(`  subtotal: ${relFile}: ${fileRewrites.length} rewrite(s)`)
  }

  lines.push(`TOTAL: ${allRewrites.length} rewrite(s) across ${byFile.size} file(s)`)
  return lines.join('\n')
}

function main() {
  const { targetArg, dryRun } = parseArgs(process.argv.slice(2))
  const resolvedPath = resolveScopedPath(targetArg)
  const files = collectSourceFiles(resolvedPath)

  const allRewrites = []
  for (const file of files) {
    const rewrites = processFile(file, dryRun)
    allRewrites.push(...rewrites)
  }

  console.log(buildReport(allRewrites, files))
}

try {
  main()
} catch (error) {
  console.error(error.message)
  process.exit(1)
}

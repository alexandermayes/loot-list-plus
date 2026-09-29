#!/usr/bin/env node

/**
 * Enumerates every `<Card>` rendered directly, or indirectly through
 * intermediate JSX, inside another `<Card>`, by walking the real JSX
 * parent chain -- not a regex, and not a memory of the 2026-09-15 audit's
 * three named screens (D-12, PRIM-01).
 *
 * Usage: node scripts/codemods/nested-card-ancestry.mjs <path>
 *
 * <path> is a file or directory, resolved against process.cwd(). It must
 * resolve to a location under app/ or components/ (relative to the repo
 * root) -- any other path is a hard error naming the out-of-scope path,
 * matching hand-rolled-cards.mjs and text-sizes.mjs's own out-of-scope
 * rejection.
 *
 * This script is READ-ONLY: it writes no file, ever. It shares the
 * parse-and-walk scaffolding those two codemods established (the same
 * ts.createSourceFile call with setParentNodes true, the same
 * skip-node_modules/.next/.git directory walk, the same fixed-order,
 * one-console.log report convention), but it is a check, not a mutation --
 * there is no --dry-run flag because every run is a dry run.
 *
 * IMPORTANT: this script does NOT read or apply
 * hand-rolled-card-pattern.json's scanExclusions. That list exists to
 * exclude specific interactive-trigger/component-tag sites from the
 * PRIM-01 hand-rolled-card guard and codemod -- an entirely different,
 * unrelated concern from this script's ancestry walk. In particular,
 * app/(app)/loot-management/components/SettingsModal.tsx is a
 * scanExclusions entry (for one unrelated <Button> that still matches the
 * hand-rolled-card regex string pattern) but MUST still be fully scanned
 * here: it is one of this plan's own named files_modified and one of the
 * three screens CONTEXT.md D-12 names.
 *
 * Mechanism: for each .tsx file under the resolved path, parse with
 * ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true,
 * ts.ScriptKind.TSX) -- setParentNodes true is what makes `.parent`
 * walkable on every node. First resolve whether the file imports `Card`
 * from "@/components/ui/card"; if it does not, skip the file entirely, so
 * a locally-defined component that happens to be named Card, or a Card
 * sourced from anywhere else, is never counted. Then walk every
 * ts.isJsxOpeningElement (the opening half of a `<Card>...</Card>` pair)
 * and ts.isJsxSelfClosingElement (a bare `<Card />`) whose tag name is
 * exactly "Card", and climb the element's own `.parent` chain through JSX
 * elements and JSX fragments looking for the nearest enclosing JSX element
 * whose own tag is also "Card".
 *
 * DIRECT: the nearest enclosing JSX element ancestor found while climbing
 * is itself a Card -- the inner card is drawn immediately inside the outer
 * one, with no other element between them.
 * INDIRECT: a Card ancestor exists further up the parent chain, with one
 * or more non-Card JSX elements (or fragments) between the inner and outer
 * Card. This may or may not read as a visual double border depending on
 * what those intermediate elements draw -- it is reported for a human to
 * judge at the plan's checkpoint, never auto-converted.
 *
 * For every hit in both categories, the report prints: the file path, the
 * 1-based line of the inner Card, the line of its enclosing Card, the
 * ancestry path as a tag-name chain (outermost to innermost, e.g.
 * "Card > CardContent > div > Card"), whether the inner element already
 * carries a `variant` prop, and its current `className` text.
 *
 * Report order is fixed and stable: DIRECT hits first, then INDIRECT hits,
 * each section sorted by file path then by the inner Card's line number,
 * so two consecutive runs over the same tree produce byte-identical
 * stdout. Printed in one console.log call at the end, matching this
 * workstream's committed-script-not-hand-typed-numbers convention.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '..', '..')
const ALLOWED_ROOTS = ['app', 'components']
const SKIPPED_DIRECTORY_NAMES = new Set(['node_modules', '.next', '.git'])
const CARD_MODULE_SPECIFIER = '@/components/ui/card'
const CARD_TAG_NAME = 'Card'

function parseArgs(argv) {
  const positional = argv.filter((arg) => !arg.startsWith('--'))
  const targetArg = positional[0]
  if (!targetArg) {
    throw new Error(
      'Missing required argument: <path>. Usage: node scripts/codemods/nested-card-ancestry.mjs <path>'
    )
  }
  return { targetArg }
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
      `Refusing to run: "${targetArg}" resolves to "${relative}", which is not under app/ or components/. Usage: node scripts/codemods/nested-card-ancestry.mjs <path-under-app-or-components>`
    )
  }
  return resolved
}

function collectTsxFiles(root) {
  const files = []
  const rootStat = statSync(root)
  if (rootStat.isFile()) {
    if (path.extname(root) === '.tsx') {
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
    if (path.extname(entry.name) === '.tsx') {
      files.push(path.join(dir, entry.name))
    }
  }
}

/** True only if the file has `import { Card, ... } from "@/components/ui/card"`
 * (or an equivalent named-import spelling). A locally-defined component
 * that happens to be named Card, or a Card sourced from anywhere else, is
 * never counted -- this is the resolution step key_links in the plan
 * requires before any ancestry walk begins. */
function importsCard(sourceFile) {
  for (const stmt of sourceFile.statements) {
    if (!ts.isImportDeclaration(stmt)) continue
    if (!ts.isStringLiteral(stmt.moduleSpecifier)) continue
    if (stmt.moduleSpecifier.text !== CARD_MODULE_SPECIFIER) continue
    const namedBindings = stmt.importClause && stmt.importClause.namedBindings
    if (namedBindings && ts.isNamedImports(namedBindings)) {
      if (namedBindings.elements.some((el) => el.name.text === CARD_TAG_NAME)) {
        return true
      }
    }
  }
  return false
}

function getLineNumber(sourceFile, node) {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1
}

function getElementAttributes(elementNode) {
  return ts.isJsxSelfClosingElement(elementNode)
    ? elementNode.attributes
    : elementNode.openingElement.attributes
}

function getElementTag(elementNode, sourceFile) {
  const tagName = ts.isJsxSelfClosingElement(elementNode)
    ? elementNode.tagName
    : elementNode.openingElement.tagName
  return tagName.getText(sourceFile)
}

function hasVariantProp(attrs) {
  return attrs.properties.some(
    (p) => ts.isJsxAttribute(p) && ts.isIdentifier(p.name) && p.name.text === 'variant'
  )
}

function getClassNameText(attrs, sourceFile) {
  const classAttr = attrs.properties.find(
    (p) => ts.isJsxAttribute(p) && ts.isIdentifier(p.name) && p.name.text === 'className'
  )
  if (!classAttr || !classAttr.initializer) return '(none)'
  return classAttr.initializer.getText(sourceFile).replace(/\s+/g, ' ')
}

/** Climbs from `startNode`'s own parent, through every ancestor node in
 * document order, tracking each JSX element/fragment tag encountered,
 * until it finds a JsxElement whose own tag is "Card" (the nearest
 * enclosing Card by document ancestry) or runs out of ancestors entirely
 * (no enclosing Card -- not a candidate, never reported). Self-closing
 * elements are never enclosing ancestors: they have no children, so
 * nothing can be rendered "inside" one. */
function findEnclosingCard(startNode, sourceFile) {
  const intermediateTags = []
  let current = startNode.parent
  while (current) {
    if (ts.isJsxElement(current)) {
      const tag = current.openingElement.tagName.getText(sourceFile)
      if (tag === CARD_TAG_NAME) {
        return { found: true, outerElement: current, intermediateTags }
      }
      intermediateTags.push(tag)
    } else if (ts.isJsxFragment(current)) {
      intermediateTags.push('<>')
    }
    current = current.parent
  }
  return { found: false, intermediateTags }
}

/** Renders the ancestry as an outer-to-inner tag chain, e.g.
 * "Card > CardContent > div > Card" for an inner Card nested two levels
 * deep inside CardContent inside the outer Card, or "Card > Card" for a
 * DIRECT hit with nothing in between. */
function buildAncestryPath(intermediateTags) {
  const outerToInner = [CARD_TAG_NAME, ...[...intermediateTags].reverse(), CARD_TAG_NAME]
  return outerToInner.join(' > ')
}

function walkFile(sourceFile, filePath) {
  const direct = []
  const indirect = []

  function evaluate(elementNode) {
    const tag = getElementTag(elementNode, sourceFile)
    if (tag !== CARD_TAG_NAME) return
    const { found, outerElement, intermediateTags } = findEnclosingCard(elementNode, sourceFile)
    if (!found) return

    const attrs = getElementAttributes(elementNode)
    const hit = {
      file: filePath,
      innerLine: getLineNumber(sourceFile, elementNode),
      outerLine: getLineNumber(sourceFile, outerElement.openingElement),
      ancestryPath: buildAncestryPath(intermediateTags),
      hasVariant: hasVariantProp(attrs),
      className: getClassNameText(attrs, sourceFile),
    }
    if (intermediateTags.length === 0) {
      direct.push(hit)
    } else {
      indirect.push(hit)
    }
  }

  function visit(node) {
    if (ts.isJsxOpeningElement(node)) {
      // node.parent is the JsxElement this opening tag belongs to -- the
      // Card element itself, not its own descendants.
      evaluate(node.parent)
    } else if (ts.isJsxSelfClosingElement(node)) {
      evaluate(node)
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return { direct, indirect }
}

function processFile(filePath) {
  const text = readFileSync(filePath, 'utf8')
  const sourceFile = ts.createSourceFile(
    filePath,
    text,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    ts.ScriptKind.TSX
  )
  if (!importsCard(sourceFile)) {
    return { direct: [], indirect: [] }
  }
  return walkFile(sourceFile, filePath)
}

function sortHits(hits) {
  return [...hits].sort((a, b) => {
    const relA = path.relative(REPO_ROOT, a.file)
    const relB = path.relative(REPO_ROOT, b.file)
    if (relA !== relB) return relA < relB ? -1 : 1
    return a.innerLine - b.innerLine
  })
}

function formatSection(title, hits) {
  const lines = [`== ${title} ==`]
  if (hits.length === 0) {
    lines.push('(none)')
  } else {
    for (const hit of hits) {
      const relFile = path.relative(REPO_ROOT, hit.file)
      lines.push(
        `${relFile}:${hit.innerLine} (outer Card at :${hit.outerLine}) [${hit.ancestryPath}] variant=${hit.hasVariant ? 'present' : 'absent'} className=${hit.className}`
      )
    }
  }
  lines.push('')
  lines.push(`${title} TOTAL: ${hits.length}`)
  return lines
}

function buildReport(allDirect, allIndirect) {
  const direct = sortHits(allDirect)
  const indirect = sortHits(allIndirect)
  const lines = []
  lines.push(...formatSection('DIRECT', direct))
  lines.push('')
  lines.push(...formatSection('INDIRECT', indirect))
  lines.push('')
  lines.push(`GRAND TOTAL: ${direct.length + indirect.length} card-in-card hit(s)`)
  return lines.join('\n')
}

function main() {
  const { targetArg } = parseArgs(process.argv.slice(2))
  const resolvedPath = resolveScopedPath(targetArg)
  const files = collectTsxFiles(resolvedPath)

  const allDirect = []
  const allIndirect = []
  for (const file of files) {
    const { direct, indirect } = processFile(file)
    allDirect.push(...direct)
    allIndirect.push(...indirect)
  }

  console.log(buildReport(allDirect, allIndirect))
}

try {
  main()
} catch (error) {
  console.error(error.message)
  process.exit(1)
}

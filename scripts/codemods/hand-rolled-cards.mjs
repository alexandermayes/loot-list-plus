#!/usr/bin/env node

/**
 * Rewrites hand-rolled card `<div>`s onto `<Card>` from
 * "@/components/ui/card" (PRIM-01, D-06 through D-09, D-15).
 *
 * Usage: node scripts/codemods/hand-rolled-cards.mjs <path> [--dry-run]
 *
 * <path> is a file or directory, resolved against process.cwd(). It must
 * resolve to a location under app/ or components/ (relative to the repo
 * root) -- any other path is a hard error naming the out-of-scope path.
 *
 * Only .tsx files are scanned, walking the same node_modules/.next/.git
 * skip set as __tests__/design-tokens/source-files.ts, and excluding every
 * path listed in scripts/codemods/hand-rolled-card-pattern.json's
 * scanExclusions (components/ui/card.tsx: the primitive itself, plus the 6
 * checkpoint-approved cn(...)-built sites' 5 host files, never rewritten or
 * scanned as call sites).
 *
 * Mechanism: parse with ts.createSourceFile(filePath, text,
 * ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX), walk the tree read-only
 * over ts.isJsxElement / ts.isJsxSelfClosingElement nodes, and for every
 * matched, safely-rewritable site compute a small set of exact-offset text
 * edits against the ORIGINAL source string: the opening (and closing) tag
 * identifier's own span renamed to "Card", and the className literal's own
 * span (excluding its surrounding quote/backtick delimiters, which are
 * preserved) replaced with the surviving classes. All edits are applied in
 * one pass, sorted by descending start offset, by slicing the original text
 * -- nothing else in the file is touched, so untouched lines, blank lines,
 * comments, and quote-style choices elsewhere in the file survive
 * byte-identical. This deliberately avoids ts.createPrinter().printFile()
 * on a mutated tree: reprinting the whole file reformats every untouched
 * line (collapses blank lines, changes quote style on new nodes, and --
 * critically -- can insert the new import before a leading "use client"/
 * "use server" directive prologue, breaking the Next.js client-boundary
 * contract). Import insertion here explicitly walks past any leading
 * directive prologue before inserting or extending the Card import, so the
 * directive always stays the file's first statement (see
 * findImportInsertPoint). ts.transform() is not used either, for the
 * unrelated JSX-transform limitation named in RESEARCH.md Pitfall 3
 * [CITED: github.com/microsoft/TypeScript/issues/57054].
 *
 * A className attribute is read as one of two literal shapes: a plain
 * string literal (bare or `{"..."}`-wrapped), or a template literal
 * wrapping one or more ${...} expressions (the confirmed
 * LootListContent.tsx:509 shape) -- only the static text segments of a
 * template are matched/rewritten, every ${...} substitution is left
 * byte-identical, delimiter tokens (backtick, `${`, `}`) are reconstructed
 * exactly, never reprinted from a factory node.
 *
 * A hand-rolled card is any className whose text matches the composed
 * detection regex in hand-rolled-card-pattern.json (the surface token --
 * bg-background-elevated or its bg-card synonym -- a rounded-* utility,
 * and the border-border/border-border-strong token, in any order). A
 * matched site is rewritten by renaming the element (and its closing tag)
 * to Card, stripping only the surface classes named in the pattern file,
 * and passing every remaining class through verbatim in the same order
 * (D-07). A site carrying border-border-strong keeps that token so its
 * emphasis survives. The import is added or extended as needed, using the
 * project's `@/` alias, never a relative path.
 *
 * A matched site the visitor cannot or must not rewrite is reported SKIPPED
 * with file, line and reason -- never rewritten, never silently dropped:
 * a spread attribute in place of className, a className built by a
 * function call, a computed tag name, or (found live, first application)
 * a custom component tag whose className coincidentally matches the D-08
 * regex (e.g. a styled <Button>) -- renaming that to <Card> would discard
 * the component's own semantics for a plain div, a correctness bug, not a
 * style change.
 *
 * Idempotent: once an element is Card, its className no longer carries the
 * stripped surface tokens, so a second run over an already-rewritten path
 * reports zero rewrites.
 *
 * --dry-run prints the identical report and writes no file. Report
 * sections, in fixed order: one line per rewritten element (file, line,
 * original tag, classes stripped, import action), a SKIPPED section, a
 * RADIUS DELTA section (every rewritten site whose original class string
 * carried the rounded-lg utility (12px) -- Card's new rounded-xl base
 * changes that site's rendered radius), and an EXCLUDED (no border token)
 * section (bg-background-elevated/bg-card + rounded-* lines with no border
 * token, kept out of both the rewrite and the guard per D-08).
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '..', '..')
const ALLOWED_ROOTS = ['app', 'components']
const SKIPPED_DIRECTORY_NAMES = new Set(['node_modules', '.next', '.git'])
const CARD_MODULE_SPECIFIER = '@/components/ui/card'

// Intrinsic HTML elements with native interactive/form-control semantics
// (keyboard activation, the real `:disabled` pseudo-class Tailwind's
// `disabled:*` variants depend on, implicit ARIA role, or -- for `form` --
// the submit event a `type="submit"` button depends on) that Card's plain
// `<div>` does not replicate. Even though these are lowercase (intrinsic)
// tags, renaming one to Card is a correctness/accessibility regression,
// not a style change -- found live (first application) at
// app/reserve/join/[token]/page.tsx:198, a `<button type="button"
// disabled={disabled} onClick={...}>` whose disabled:cursor-not-allowed
// and disabled:opacity-50 utilities would silently stop applying once the
// element is no longer a real button. `form` was added after 09-06 Task 2
// renamed `app/(app)/characters/[id]/edit/_client.tsx`'s real `<form
// onSubmit={handleSubmit}>` to `<Card onSubmit={...}>`, silently breaking
// its `type="submit"` Save button (a div has no submit event) -- found and
// fixed at the 09-07 checkpoint, not caught by the original denylist.
const INTERACTIVE_INTRINSIC_TAGS = new Set([
  'button',
  'a',
  'input',
  'select',
  'textarea',
  'option',
  'summary',
  'label',
  'form',
])

const pattern = JSON.parse(
  readFileSync(path.join(__dirname, 'hand-rolled-card-pattern.json'), 'utf8')
)
const detectionRegex = new RegExp(pattern.detectionRegexSource)
const scanExclusions = new Set(pattern.scanExclusions)

// The ~29 lines with an elevated surface plus a radius but no border token
// (pills, wells, inputs) -- inventoried, never rewritten, never guarded
// (D-08). A separate, narrower predicate than the full detection regex:
// surface + radius, independent of the border-token lookahead.
const EXCLUDED_NO_BORDER_PATTERN = new RegExp(
  `(?=.*(?:${pattern.surfaceTokens.join('|')}))(?=.*${pattern.radiusTokenPrefix}\\S+)`
)

function parseArgs(argv) {
  const dryRun = argv.includes('--dry-run')
  const positional = argv.filter((arg) => arg !== '--dry-run')
  const targetArg = positional[0]
  if (!targetArg) {
    throw new Error(
      'Missing required argument: <path>. Usage: node scripts/codemods/hand-rolled-cards.mjs <path> [--dry-run]'
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
      `Refusing to run: "${targetArg}" resolves to "${relative}", which is not under app/ or components/. Usage: node scripts/codemods/hand-rolled-cards.mjs <path-under-app-or-components> [--dry-run]`
    )
  }
  return resolved
}

function isExcludedPath(filePath) {
  const relative = path.relative(REPO_ROOT, filePath).split(path.sep).join('/')
  return scanExclusions.has(relative)
}

function collectTsxFiles(root) {
  const files = []
  const rootStat = statSync(root)
  if (rootStat.isFile()) {
    if (path.extname(root) === '.tsx' && !isExcludedPath(root)) {
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
      const fullPath = path.join(dir, entry.name)
      if (!isExcludedPath(fullPath)) {
        files.push(fullPath)
      }
    }
  }
}

function matchesPredicate(text) {
  return new RegExp(detectionRegex.source).test(text)
}

/** Splits a class-string segment into tokens, separating what to strip
 * (surface classes per D-07/D-08) from what passes through unchanged.
 * border-border-strong is explicitly kept (its emphasis must survive). */
function analyzeTokens(text) {
  const tokens = text.split(/\s+/).filter(Boolean)
  const stripped = []
  const kept = []
  let hadRoundedLg = false
  let hasBorderStrong = false

  for (const token of tokens) {
    if (token === pattern.borderColorStrongToken) {
      hasBorderStrong = true
      kept.push(token)
      continue
    }
    if (token === 'rounded-lg') {
      hadRoundedLg = true
    }
    const isSurface = pattern.surfaceTokens.includes(token)
    const isBareBorder = token === pattern.bareBorderToken
    const isBorderColor = token === pattern.borderColorToken
    const isRadius = token.startsWith(pattern.radiusTokenPrefix)
    if (isSurface || isBareBorder || isBorderColor || isRadius) {
      stripped.push(token)
      continue
    }
    kept.push(token)
  }

  return { keptText: kept.join(' '), stripped, hadRoundedLg, hasBorderStrong }
}

function getClassNameAttribute(node) {
  return node.attributes.properties.find(
    (p) => ts.isJsxAttribute(p) && ts.isIdentifier(p.name) && p.name.text === 'className'
  )
}

/** Classifies a className attribute's initializer shape, carrying along the
 * exact literal NODE (not just its text) for shapes we can rewrite, so the
 * caller can compute an exact-offset text edit against that node's own
 * span rather than reprinting anything. */
function classifyClassNameAttr(attr) {
  const init = attr.initializer
  if (!init) {
    return { shape: 'ambiguous', reason: 'className attribute has no value' }
  }
  if (ts.isStringLiteral(init)) {
    return { shape: 'string', text: init.text, literalNode: init }
  }
  if (ts.isJsxExpression(init) && init.expression) {
    const expr = init.expression
    if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr)) {
      return { shape: 'string', text: expr.text, literalNode: expr }
    }
    if (ts.isTemplateExpression(expr)) {
      const staticText =
        expr.head.text + ' ' + expr.templateSpans.map((s) => s.literal.text).join(' ')
      return { shape: 'template', text: staticText, node: expr }
    }
    return { shape: 'ambiguous', reason: 'className built by a non-literal expression' }
  }
  return { shape: 'ambiguous', reason: 'unrecognized className initializer shape' }
}

/** Builds a replacement literal's raw text, reusing the ORIGINAL quote or
 * backtick character (read directly off the source) rather than choosing
 * one, so untouched literals elsewhere in the file are never made to look
 * inconsistent with this one. */
function buildQuotedText(literalNode, sourceFile, newContent) {
  const raw = literalNode.getText(sourceFile)
  const quoteChar = raw[0]
  return `${quoteChar}${newContent}${quoteChar}`
}

/** Computes the per-segment text edits for a template-literal className,
 * reconstructing each segment's own delimiter tokens (backtick / ${ / })
 * exactly, and touching only the static text between them -- every
 * ${...} substitution keeps its original source span untouched. */
function rewriteTemplateExpression(templateExpr, sourceFile) {
  const allStripped = []
  let hadRoundedLg = false
  let hasBorderStrong = false
  const edits = []

  const headAnalysis = analyzeTokens(templateExpr.head.text)
  allStripped.push(...headAnalysis.stripped)
  hadRoundedLg = hadRoundedLg || headAnalysis.hadRoundedLg
  hasBorderStrong = hasBorderStrong || headAnalysis.hasBorderStrong
  const headText = headAnalysis.keptText ? `${headAnalysis.keptText} ` : ''
  edits.push({
    start: templateExpr.head.getStart(sourceFile),
    end: templateExpr.head.getEnd(),
    text: '`' + headText + '${',
  })

  const spanCount = templateExpr.templateSpans.length
  templateExpr.templateSpans.forEach((span, index) => {
    const analysis = analyzeTokens(span.literal.text)
    allStripped.push(...analysis.stripped)
    hadRoundedLg = hadRoundedLg || analysis.hadRoundedLg
    hasBorderStrong = hasBorderStrong || analysis.hasBorderStrong
    const isLast = index === spanCount - 1
    const filtered = analysis.keptText
    const literalText = isLast
      ? '}' + (filtered ? ` ${filtered}` : '') + '`'
      : '}' + (filtered ? ` ${filtered} ` : ' ') + '${'
    edits.push({
      start: span.literal.getStart(sourceFile),
      end: span.literal.getEnd(),
      text: literalText,
    })
  })

  return { edits, stripped: allStripped, hadRoundedLg, hasBorderStrong }
}

function getLineNumber(sourceFile, node) {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1
}

function getLineText(sourceFile, lineNumber) {
  const lines = sourceFile.text.split('\n')
  return lines[lineNumber - 1] || ''
}

/** Decides what to do with one JsxOpeningElement/JsxSelfClosingElement:
 * 'none' (not a match), 'rewrite' (safe to rewrite, with exact-offset
 * classNameEdits already computed), or 'skip' (matched but ambiguous --
 * reported, never silently dropped). */
function evaluateElement(node, sourceFile) {
  const lineNumber = getLineNumber(sourceFile, node)
  const classAttr = getClassNameAttribute(node)
  const hasSpread = node.attributes.properties.some((p) => ts.isJsxSpreadAttribute(p))
  const tagText = node.tagName.getText(sourceFile)
  // JSX's own convention distinguishes an intrinsic host element (lowercase
  // first letter: div, span, article, p...) from a reference to a custom
  // component (uppercase first letter: Button, Card, MyThing...). Only an
  // intrinsic element is "hand-rolled" in the D-08 sense; a component
  // reference whose className coincidentally matches the detection regex
  // (e.g. <Button className="... bg-background-elevated rounded-[52px]
  // border-border-strong ...">) is never renamed -- doing so would discard
  // that component's own semantics (button role, keyboard/focus handling,
  // its own prop contract) for Card's plain div, a correctness bug, not a
  // style change.
  const isSimpleTag = ts.isIdentifier(node.tagName) && /^[a-z]/.test(tagText)
  const isComponentTag = ts.isIdentifier(node.tagName) && !isSimpleTag
  const isInteractiveIntrinsic = isSimpleTag && INTERACTIVE_INTRINSIC_TAGS.has(tagText)

  if (!classAttr) {
    if (hasSpread) {
      const lineText = getLineText(sourceFile, lineNumber)
      if (matchesPredicate(lineText)) {
        return {
          action: 'skip',
          line: lineNumber,
          reason: 'spread attribute in place of className',
        }
      }
    }
    return { action: 'none' }
  }

  const classification = classifyClassNameAttr(classAttr)

  if (classification.shape === 'string' || classification.shape === 'template') {
    if (!matchesPredicate(classification.text)) {
      return { action: 'none' }
    }
    if (isComponentTag) {
      return {
        action: 'skip',
        line: lineNumber,
        reason: `custom component tag <${tagText}>, not a native intrinsic element`,
      }
    }
    if (isInteractiveIntrinsic) {
      return {
        action: 'skip',
        line: lineNumber,
        reason: `interactive intrinsic element <${tagText}>, would lose native keyboard/disabled/ARIA semantics as Card's plain div`,
      }
    }
    if (!isSimpleTag) {
      return { action: 'skip', line: lineNumber, reason: 'computed tag name' }
    }

    if (classification.shape === 'string') {
      const analysis = analyzeTokens(classification.text)
      const newText = buildQuotedText(classification.literalNode, sourceFile, analysis.keptText)
      return {
        action: 'rewrite',
        line: lineNumber,
        tag: tagText,
        classNameEdits: [
          {
            start: classification.literalNode.getStart(sourceFile),
            end: classification.literalNode.getEnd(),
            text: newText,
          },
        ],
        stripped: analysis.stripped,
        hadRoundedLg: analysis.hadRoundedLg,
        hasBorderStrong: analysis.hasBorderStrong,
      }
    }

    const { edits, stripped, hadRoundedLg, hasBorderStrong } = rewriteTemplateExpression(
      classification.node,
      sourceFile
    )
    return {
      action: 'rewrite',
      line: lineNumber,
      tag: tagText,
      classNameEdits: edits,
      stripped,
      hadRoundedLg,
      hasBorderStrong,
    }
  }

  // Ambiguous className shape (function call, identifier reference, etc.).
  // The candidate text may be a multi-line cn(...) call whose surface
  // tokens live several lines below the attribute's own start line (see
  // e.g. components/ui/dropdown-menu.tsx:61), so test the full attribute
  // initializer text, not just the single line the attribute starts on.
  const attrText = classAttr.initializer ? classAttr.initializer.getText(sourceFile) : ''
  if (matchesPredicate(attrText)) {
    return { action: 'skip', line: lineNumber, reason: classification.reason }
  }
  return { action: 'none' }
}

/** Builds the tag-rename + className text edits for one matched element,
 * all measured against the ORIGINAL source's own offsets. */
function buildRewriteEdits(node, result, sourceFile) {
  const isSelfClosing = ts.isJsxSelfClosingElement(node)
  const openingNode = isSelfClosing ? node : node.openingElement
  const edits = [
    {
      start: openingNode.tagName.getStart(sourceFile),
      end: openingNode.tagName.getEnd(),
      text: 'Card',
    },
  ]
  if (!isSelfClosing && node.closingElement) {
    edits.push({
      start: node.closingElement.tagName.getStart(sourceFile),
      end: node.closingElement.tagName.getEnd(),
      text: 'Card',
    })
  }
  edits.push(...result.classNameEdits)
  return edits
}

/** Read-only AST walk collecting rewrite/skip decisions plus their exact
 * text edits; never mutates or reprints the tree. Recurses into every
 * JsxElement's children (and every other node kind via ts.forEachChild)
 * so a further match nested inside a matched or unmatched wrapper is still
 * found -- the sweep batches turn every in-scope string into plain Card
 * mechanically, leaving today's double borders exactly where they are
 * (D-12); no card-in-card judgement is made here. */
function walkFile(sourceFile) {
  const siteReports = []
  const skippedReports = []
  const edits = []

  function visit(node) {
    if (ts.isJsxElement(node)) {
      const result = evaluateElement(node.openingElement, sourceFile)
      if (result.action === 'rewrite') {
        siteReports.push({
          line: result.line,
          tag: result.tag,
          stripped: result.stripped,
          hadRoundedLg: result.hadRoundedLg,
          hasBorderStrong: result.hasBorderStrong,
        })
        edits.push(...buildRewriteEdits(node, result, sourceFile))
      } else if (result.action === 'skip') {
        skippedReports.push({ line: result.line, reason: result.reason })
      }
      node.children.forEach(visit)
      return
    }

    if (ts.isJsxSelfClosingElement(node)) {
      const result = evaluateElement(node, sourceFile)
      if (result.action === 'rewrite') {
        siteReports.push({
          line: result.line,
          tag: result.tag,
          stripped: result.stripped,
          hadRoundedLg: result.hadRoundedLg,
          hasBorderStrong: result.hasBorderStrong,
        })
        edits.push(...buildRewriteEdits(node, result, sourceFile))
      } else if (result.action === 'skip') {
        skippedReports.push({ line: result.line, reason: result.reason })
      }
      return
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return { siteReports, skippedReports, edits }
}

/** Finds the statement index to insert a new import after: past any
 * leading directive prologue (e.g. "use client"/"use server", which MUST
 * remain the file's first statement per the Next.js client-boundary
 * contract) and past every contiguous leading import declaration. */
function findImportInsertPoint(sourceFile) {
  let insertIndex = 0
  for (let i = 0; i < sourceFile.statements.length; i++) {
    const stmt = sourceFile.statements[i]
    const isDirective = ts.isExpressionStatement(stmt) && ts.isStringLiteral(stmt.expression)
    if (isDirective || ts.isImportDeclaration(stmt)) {
      insertIndex = i + 1
      continue
    }
    break
  }
  return insertIndex
}

/** Computes the single text edit needed to add or extend the Card import,
 * or no-ops if it's already present. Never reprints the import
 * declaration wholesale beyond the minimal span that actually changes. */
function computeImportEdit(sourceFile) {
  let existingDecl = null
  for (const stmt of sourceFile.statements) {
    if (
      ts.isImportDeclaration(stmt) &&
      ts.isStringLiteral(stmt.moduleSpecifier) &&
      stmt.moduleSpecifier.text === CARD_MODULE_SPECIFIER
    ) {
      existingDecl = stmt
    }
  }

  if (existingDecl) {
    const namedBindings = existingDecl.importClause && existingDecl.importClause.namedBindings
    if (namedBindings && ts.isNamedImports(namedBindings)) {
      const hasCard = namedBindings.elements.some((el) => el.name.text === 'Card')
      if (hasCard) {
        return { edit: null, action: 'none' }
      }
      const raw = namedBindings.getText(sourceFile)
      const closingBraceIndex = raw.lastIndexOf('}')
      const before = raw.slice(0, closingBraceIndex).replace(/\s+$/, '')
      return {
        edit: {
          start: namedBindings.getStart(sourceFile),
          end: namedBindings.getEnd(),
          text: `${before}, Card }`,
        },
        action: 'extended',
      }
    }
  }

  const insertIndex = findImportInsertPoint(sourceFile)
  const insertPos =
    insertIndex < sourceFile.statements.length
      ? sourceFile.statements[insertIndex].getFullStart()
      : sourceFile.text.length
  const importLine = `import { Card } from '${CARD_MODULE_SPECIFIER}'`
  const text = insertPos === 0 ? `${importLine}\n` : `\n${importLine}`
  return {
    edit: { start: insertPos, end: insertPos, text },
    action: 'added',
  }
}

/** Applies a set of {start, end, text} edits to the original source text
 * by slicing, processing highest offset first so earlier offsets stay
 * valid for the rest of the pass. */
function applyEdits(text, edits) {
  const sorted = [...edits].sort((a, b) => b.start - a.start)
  let result = text
  for (const edit of sorted) {
    result = result.slice(0, edit.start) + edit.text + result.slice(edit.end)
  }
  return result
}

function processFile(filePath, dryRun) {
  const text = readFileSync(filePath, 'utf8')
  const sourceFile = ts.createSourceFile(
    filePath,
    text,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    ts.ScriptKind.TSX
  )

  const { siteReports, skippedReports, edits } = walkFile(sourceFile)

  let importAction = 'none'
  if (siteReports.length > 0) {
    const importResult = computeImportEdit(sourceFile)
    importAction = importResult.action
    if (importResult.edit) {
      edits.push(importResult.edit)
    }
  }

  if (!dryRun && siteReports.length > 0) {
    writeFileSync(filePath, applyEdits(text, edits))
  }

  // Excluded (no border token): lines matching surface+radius but not the
  // full D-08 predicate (no border-border/border-border-strong token),
  // measured directly off the source text rather than the AST, since these
  // sites are inventoried, not rewritten (D-08).
  const excludedLines = []
  const rawLines = text.split('\n')
  rawLines.forEach((line, index) => {
    if (EXCLUDED_NO_BORDER_PATTERN.test(line) && !matchesPredicate(line)) {
      excludedLines.push({ file: filePath, line: index + 1 })
    }
  })

  const withFile = (r) => ({ file: filePath, ...r })
  return {
    siteReports: siteReports.map(withFile),
    skippedReports: skippedReports.map(withFile),
    excludedLines,
    importAction,
  }
}

function buildReport(results, files) {
  const lines = []
  const allSiteReports = []
  const allSkipped = []
  const allExcluded = []
  const importByFile = new Map()

  for (const file of files) {
    const result = results.get(file)
    if (!result) continue
    allSiteReports.push(...result.siteReports)
    allSkipped.push(...result.skippedReports)
    allExcluded.push(...result.excludedLines)
    if (result.siteReports.length > 0) {
      importByFile.set(file, result.importAction)
    }
  }

  lines.push('== REWRITTEN ==')
  if (allSiteReports.length === 0) {
    lines.push('(none)')
  } else {
    for (const site of allSiteReports) {
      const relFile = path.relative(REPO_ROOT, site.file)
      const importAction = importByFile.get(site.file)
      lines.push(
        `${relFile}:${site.line}: <${site.tag}> -> <Card> (stripped: ${site.stripped.join(', ')}) [import: ${importAction}]`
      )
    }
  }

  lines.push('')
  lines.push('== SKIPPED ==')
  if (allSkipped.length === 0) {
    lines.push('(none)')
  } else {
    for (const skip of allSkipped) {
      const relFile = path.relative(REPO_ROOT, skip.file)
      lines.push(`${relFile}:${skip.line}: SKIPPED (${skip.reason})`)
    }
  }

  lines.push('')
  lines.push('== RADIUS DELTA ==')
  const radiusDelta = allSiteReports.filter((s) => s.hadRoundedLg)
  const contextDelta = 13
  lines.push(
    `${radiusDelta.length} site(s) carry rounded-lg today and gain 4px once Card's base radius moves to rounded-xl (delta from CONTEXT.md D-06's stated figure of ${contextDelta}: ${radiusDelta.length - contextDelta >= 0 ? '+' : ''}${radiusDelta.length - contextDelta})`
  )
  for (const site of radiusDelta) {
    const relFile = path.relative(REPO_ROOT, site.file)
    lines.push(`${relFile}:${site.line}`)
  }

  lines.push('')
  lines.push('== EXCLUDED (no border token) ==')
  const excludedFileSet = new Set(allExcluded.map((e) => e.file))
  lines.push(`${allExcluded.length} line(s) across ${excludedFileSet.size} file(s)`)
  for (const excluded of allExcluded) {
    const relFile = path.relative(REPO_ROOT, excluded.file)
    lines.push(`${relFile}:${excluded.line}`)
  }

  lines.push('')
  const fileSet = new Set(allSiteReports.map((s) => s.file))
  lines.push(`TOTAL: ${allSiteReports.length} rewrite(s) across ${fileSet.size} file(s)`)

  return lines.join('\n')
}

function main() {
  const { targetArg, dryRun } = parseArgs(process.argv.slice(2))
  const resolvedPath = resolveScopedPath(targetArg)
  const files = collectTsxFiles(resolvedPath)

  const results = new Map()
  for (const file of files) {
    results.set(file, processFile(file, dryRun))
  }

  console.log(buildReport(results, files))
}

try {
  main()
} catch (error) {
  console.error(error.message)
  process.exit(1)
}

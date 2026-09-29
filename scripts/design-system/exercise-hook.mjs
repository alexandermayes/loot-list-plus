#!/usr/bin/env node

/**
 * ENF-02 hook probe harness (D-09, D-16 point 1).
 *
 * WHY THIS EXISTS: `.impeccable/config.json` (D-07) must be rewritten from an
 * exception list backed by observation, not inference -- D-13 and D-15 forbid
 * writing a suppression for a finding nobody has seen fire. Reading the
 * detector's registry, grepping source for a pattern, or reasoning about what
 * "should" flag all read as evidence but are not: only driving the ACTUAL
 * wired hook (`.claude/skills/impeccable/scripts/hook.mjs`, the PostToolUse +
 * Stop pair `.claude/settings.local.json` runs) on the named files, and
 * reading its own rendered output back, proves what fires. This script does
 * that, nothing else: it drives the hook this repo actually wires, not the
 * Cursor-only pre-edit gate, and it proves nothing about a file it was not
 * pointed at.
 *
 * TWO-TIER MECHANICS (D-16 point 1 / 12-01 gate item 2.5): the PostToolUse
 * pass surfaces only `IMMEDIATE_TIER_RULES` (the four `design-system-*` rules,
 * `low-contrast`, `tiny-text`, etc.). `side-tab`, `ai-color-palette`,
 * `pulsing-dot` and `numbered-section-labels` are NOT in that set and only
 * ever surface on the Stop deep pass. Every probe therefore sends a
 * PostToolUse event, THEN a Stop event, sharing one fresh `session_id` --
 * a reused session_id is silently deduped by the hook's own session cache,
 * which looks exactly like "no longer flags" and is the false-pass this
 * fresh-session-per-probe design exists to prevent.
 *
 * PROOF SHAPE (D-15): the NDJSON audit record's `findings` count is the raw
 * detector count BEFORE ignore-value filtering -- a suppressed exception
 * still reads `findings > 0` with `freshFindings === 0`. This harness never
 * treats `findings === 0` as proof an exception works. Whether a rule is
 * FLAGGED is read from the hook's own emitted finding lines
 * (`- L<n> [<rule-id>] ...`), not from the findings count.
 *
 * TWO-DIRECTIONAL CONTROL (copied in spirit from
 * `scripts/visual/numeral-probe.mjs`): every invocation of the red arm
 * carries two controls that MUST flag (C1: `ai-color-palette` on the Stop
 * pass; C2: `design-system-color` on the PostToolUse pass). If either control
 * fails to flag, the run proves nothing about the exceptions it also
 * measured, and this script exits with its instrument-not-discriminating
 * code (3) rather than reporting the observations as usable.
 *
 * SCOPE LIMIT: this script observes the post-edit hook's behaviour on the
 * named files, in this repo, at this moment. It proves nothing about files it
 * was not pointed at, and nothing about the CLI's `--no-config` census mode
 * (a different code path, already run separately in 12-MEASUREMENTS.md).
 *
 * CONFIG-OVERRIDE SAFETY: an `--ignore-values-override` run backs up
 * `.impeccable/config.json` to the OS temp directory before writing a copy
 * with `detector.ignoreValues` replaced, and restores it in a `finally`
 * block. The starting and ending SHA-256 of `config.json` are compared; a
 * mismatch exits 5 rather than silently leaving the override in place. A
 * temporary `.impeccable/config.local.json` (gitignored, raises
 * `hook.limits.maxFindings`/`maxChars` so no finding hides behind the
 * default five-finding-per-emission cap) is refused if one already exists
 * (exit 6) and is always deleted in the same `finally` block.
 *
 * EXIT CODES:
 *   0 - every probe valid; in --mode verify, every `expect` matched.
 *   1 - a --mode verify expectation failed.
 *   2 - usage error (missing --probes/--out, or the manifest/override file
 *       could not be read).
 *   3 - a probe was invalid (the hook never actually scanned the file), or a
 *       control failed to flag its expected rule (instrument not
 *       discriminating).
 *   4 - `.claude/skills/impeccable/scripts/hook.mjs` is missing.
 *   5 - `.impeccable/config.json` was not restored to its starting hash.
 *   6 - `.impeccable/config.local.json` already existed before this run.
 */

import { spawnSync } from 'node:child_process'
import { createHash, randomBytes } from 'node:crypto'
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PROJECT_ROOT = fileURLToPath(new URL('../../', import.meta.url))
const HOOK_PATH = path.join(PROJECT_ROOT, '.claude/skills/impeccable/scripts/hook.mjs')
const CONFIG_PATH = path.join(PROJECT_ROOT, '.impeccable/config.json')
const LOCAL_CONFIG_PATH = path.join(PROJECT_ROOT, '.impeccable/config.local.json')

// Rule ids not in the PostToolUse immediate tier (hook-lib.mjs's
// IMMEDIATE_TIER_RULES) only ever surface on the Stop deep pass.
const DEFERRED_TIER_RULES = new Set(['side-tab', 'ai-color-palette', 'pulsing-dot', 'numbered-section-labels'])

// Matches a rendered finding line: "- L123 [rule-id] Name. Description..."
// or "- [rule-id] Name..." when the finding carries no line number.
const FINDING_LINE_RE = /^-\s*(?:L\d+\s+)?\[([a-z0-9][a-z0-9-]*)\]/i

function parseArgs(argv) {
  const out = { mode: 'discover' }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--probes') out.probesPath = argv[++i]
    else if (arg === '--out') out.outPath = argv[++i]
    else if (arg === '--mode') out.mode = argv[++i]
    else if (arg === '--ignore-values-override') out.overridePath = argv[++i]
  }
  return out
}

function sha256File(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex')
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf-8'))
}

function extractRuleIds(additionalContext) {
  if (!additionalContext || typeof additionalContext !== 'string') return []
  const ids = []
  for (const rawLine of additionalContext.split('\n')) {
    const line = rawLine.trim()
    const m = FINDING_LINE_RE.exec(line)
    if (m) ids.push(m[1])
  }
  return ids
}

function parseHookStdout(raw) {
  const text = typeof raw === 'string' ? raw.trim() : ''
  if (!text) return { raw, additionalContext: '', ruleIds: [] }
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    return { raw, additionalContext: '', ruleIds: [], parseError: true }
  }
  const additionalContext = parsed?.hookSpecificOutput?.additionalContext || ''
  return { raw, additionalContext, ruleIds: extractRuleIds(additionalContext) }
}

function readAuditRecords(logPath) {
  if (!existsSync(logPath)) return []
  const text = readFileSync(logPath, 'utf-8')
  const records = []
  for (const line of text.split('\n')) {
    if (!line.trim()) continue
    try {
      records.push(JSON.parse(line))
    } catch {
      /* skip malformed line */
    }
  }
  return records
}

function lastMatching(records, sessionId, event) {
  let found = null
  for (const rec of records) {
    if (rec && rec.session === sessionId && rec.event === event) found = rec
  }
  return found
}

function buildChildEnv(logPath) {
  const env = { ...process.env }
  delete env.IMPECCABLE_HOOK_DEPTH
  delete env.CLAUDE_HOOK_DEPTH
  delete env.IMPECCABLE_HOOK_DISABLED
  env.IMPECCABLE_HOOK_LOG = logPath
  return env
}

function spawnHook(event, childEnv) {
  const result = spawnSync(process.execPath, [HOOK_PATH], {
    input: JSON.stringify(event),
    env: childEnv,
    cwd: PROJECT_ROOT,
    encoding: 'utf-8',
    maxBuffer: 20 * 1024 * 1024,
  })
  return {
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    error: result.error ? String(result.error.message || result.error) : null,
  }
}

function makeSessionId(probeId) {
  return `enf02-${probeId}-${Date.now()}-${randomBytes(4).toString('hex')}`
}

function postToolUseValid(rec) {
  return Boolean(rec) && typeof rec.findings === 'number'
}

function stopValid(rec) {
  return Boolean(rec) && typeof rec.scannedFiles === 'number' && rec.scannedFiles >= 1
}

function runProbe(probe, logPath) {
  const absFile = path.join(PROJECT_ROOT, probe.file)
  const sessionId = makeSessionId(probe.id)
  const childEnv = buildChildEnv(logPath)

  const postEvent = {
    hook_event_name: 'PostToolUse',
    tool_name: 'Edit',
    tool_input: { file_path: absFile },
    cwd: PROJECT_ROOT,
    session_id: sessionId,
  }
  const postResult = spawnHook(postEvent, childEnv)
  const postParsed = parseHookStdout(postResult.stdout)

  const stopEvent = {
    hook_event_name: 'Stop',
    cwd: PROJECT_ROOT,
    session_id: sessionId,
    stop_hook_active: false,
  }
  let stopResult = spawnHook(stopEvent, childEnv)
  let stopParsed = parseHookStdout(stopResult.stdout)

  let records = readAuditRecords(logPath)
  const postRecord = lastMatching(records, sessionId, 'PostToolUse')
  let stopRecord = lastMatching(records, sessionId, 'Stop')

  let retried = false
  if (!stopValid(stopRecord) && stopRecord?.skipped === 'no-touched-files') {
    retried = true
    stopResult = spawnHook(stopEvent, childEnv)
    stopParsed = parseHookStdout(stopResult.stdout)
    records = readAuditRecords(logPath)
    stopRecord = lastMatching(records, sessionId, 'Stop')
  }

  const postValid = postToolUseValid(postRecord)
  const stopOk = stopValid(stopRecord)
  const valid = postValid && stopOk

  const invalidReasons = []
  if (!postValid) invalidReasons.push(`PostToolUse: ${postRecord?.skipped || 'no numeric findings field'}`)
  if (!stopOk) invalidReasons.push(`Stop: ${stopRecord?.skipped || 'no scannedFiles >= 1'}`)

  return {
    id: probe.id,
    file: probe.file,
    category: probe.category,
    source: probe.source,
    role: probe.role,
    watch: probe.watch || [],
    expectedRule: probe.expectedRule || null,
    sessionId,
    retriedStop: retried,
    stdout: {
      postToolUse: postResult.stdout,
      stop: stopResult.stdout,
    },
    audit: {
      postToolUse: postRecord || null,
      stop: stopRecord || null,
    },
    rulesObserved: {
      postToolUse: postParsed.ruleIds,
      stop: stopParsed.ruleIds,
    },
    // True when every watched rule id is deferred-tier (12-01 gate item 2.5):
    // it can ONLY ever surface on the Stop pass, never PostToolUse, so a
    // reader of this transcript does not mistake an empty PostToolUse
    // observation for "did not fire".
    watchedRulesAreDeferredTier:
      (probe.watch || []).length > 0 && (probe.watch || []).every((r) => DEFERRED_TIER_RULES.has(r)),
    valid,
    invalidReasons: valid ? [] : invalidReasons,
  }
}

function flaggedRule(probeResult, rule) {
  return probeResult.rulesObserved.postToolUse.includes(rule) || probeResult.rulesObserved.stop.includes(rule)
}

function runOnce({ probesPath, outPath, mode, overridePath }) {
  if (!existsSync(HOOK_PATH)) {
    process.stderr.write(`FATAL: hook not found at ${HOOK_PATH}\n`)
    process.exit(4)
  }
  if (existsSync(LOCAL_CONFIG_PATH)) {
    process.stderr.write(`FATAL: ${LOCAL_CONFIG_PATH} already exists -- refusing to start (exit 6).\n`)
    process.exit(6)
  }
  if (!probesPath || !outPath) {
    process.stderr.write('Usage: exercise-hook.mjs --probes <path> --out <path> [--mode discover|verify] [--ignore-values-override <path>]\n')
    process.exit(2)
  }

  let manifest
  try {
    manifest = readJson(probesPath)
  } catch (err) {
    process.stderr.write(`FATAL: could not read probe manifest ${probesPath}: ${err.message}\n`)
    process.exit(2)
  }
  const probes = manifest.probes || []

  let overrideIgnoreValues = null
  if (overridePath) {
    try {
      const overrideJson = readJson(overridePath)
      overrideIgnoreValues = Array.isArray(overrideJson.ignoreValues) ? overrideJson.ignoreValues : []
    } catch (err) {
      process.stderr.write(`FATAL: could not read override file ${overridePath}: ${err.message}\n`)
      process.exit(2)
    }
  }

  const startHash = sha256File(CONFIG_PATH)
  const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'enf02-'))
  const configBackupPath = path.join(tmpDir, 'config.json.bak')
  const logPath = path.join(tmpDir, 'hook-audit.ndjson')

  let overrodeConfig = false
  let endHash = startHash
  let results = []
  let runError = null

  try {
    // Raise the per-emission caps so a finding cannot hide behind the
    // default five-finding cap. Key path confirmed against
    // hook-lib.mjs's applyConfigSource: hook settings (including limits)
    // live under the top-level `hook` key, detector filters under `detector`.
    writeFileSync(
      LOCAL_CONFIG_PATH,
      JSON.stringify({ hook: { limits: { maxFindings: 200, maxChars: 200000 } } }, null, 2) + '\n'
    )

    if (overrideIgnoreValues !== null) {
      copyFileSync(CONFIG_PATH, configBackupPath)
      overrodeConfig = true // set BEFORE the write, so a throw mid-write still restores in finally
      const current = readJson(CONFIG_PATH)
      const overridden = {
        ...current,
        detector: { ...current.detector, ignoreValues: overrideIgnoreValues },
      }
      writeFileSync(CONFIG_PATH, JSON.stringify(overridden, null, 2) + '\n')
    }

    results = probes.map((probe) => runProbe(probe, logPath))
  } catch (err) {
    runError = String(err && err.stack ? err.stack : err)
  } finally {
    // Config restoration and hash verification happen here, UNCONDITIONALLY,
    // so a probe-loop exception still restores config.json rather than
    // leaving the empty-override write in place (T-12-13).
    if (overrodeConfig && existsSync(configBackupPath)) {
      copyFileSync(configBackupPath, CONFIG_PATH)
    }
    endHash = sha256File(CONFIG_PATH)
    if (existsSync(LOCAL_CONFIG_PATH)) unlinkSync(LOCAL_CONFIG_PATH)
    try {
      rmSync(tmpDir, { recursive: true, force: true })
    } catch {
      /* best effort */
    }
  }

  let exitCode = 0
  const anyInvalid = results.some((r) => !r.valid)
  if (anyInvalid) exitCode = 3

  const controlFailures = []
  for (const r of results) {
    if (r.role !== 'control') continue
    if (!r.valid) continue
    if (!flaggedRule(r, r.expectedRule || (r.watch || [])[0])) {
      controlFailures.push(r.id)
    }
  }
  if (controlFailures.length > 0) exitCode = 3

  const verifyFailures = []
  if (mode === 'verify') {
    for (const probe of probes) {
      if (!probe.expect) continue
      const r = results.find((x) => x.id === probe.id)
      const flagged = r ? flaggedRule(r, probe.expect.rule) : false
      const wantPresent = probe.expect.state === 'present'
      if (flagged !== wantPresent) {
        verifyFailures.push({ id: probe.id, expect: probe.expect, flagged })
      }
    }
    if (verifyFailures.length > 0 && exitCode === 0) exitCode = 1
  }

  const transcript = {
    mode,
    overridePath: overridePath || null,
    startHash,
    endHash,
    runError,
    controlFailures,
    verifyFailures,
    probes: results,
  }
  writeFileSync(outPath, JSON.stringify(transcript, null, 2) + '\n')

  if (runError) {
    process.stderr.write(`FATAL: probe loop threw: ${runError}\n`)
    process.exitCode = 3
    return
  }
  if (endHash !== startHash) {
    process.stderr.write(`FATAL: ${CONFIG_PATH} was not restored to its starting hash (exit 5).\n`)
    process.exitCode = 5
    return
  }

  process.exitCode = exitCode
}

const args = parseArgs(process.argv.slice(2))
runOnce(args)

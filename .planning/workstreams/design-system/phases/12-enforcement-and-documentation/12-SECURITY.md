---
phase: 12
slug: enforcement-and-documentation
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
block_on: high
created: 2026-09-24
---

# Phase 12 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.
> Register authored at plan time (all seven PLAN files carry a `<threat_model>` block).
> Verified by `gsd-security-auditor` against the live tree, not against plan claims.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Puppeteer-driven browser -> local dev server | Capture and detector runs render real pages from a localhost server | Rendered page content, local only |
| user's shell -> repository | Supabase credentials live only in the user's shell | Credentials, never reaching repo or agent |
| DESIGN.md frontmatter -> impeccable hook allowlist | Every value in the frontmatter becomes one the hook no longer flags repo-wide | Design token values |
| harness -> `hook.mjs` subprocess | Constructed stdin events drive the wired hook against repo files | Hook event JSON |
| harness -> `.impeccable/config.json` | The empty-override run replaces the live exception list for its duration | Suppression config |
| `.impeccable/config.json` -> every hook run and the future ENF-04 gate | An entry silences a rule for every edit and scan it matches | Suppression scope |
| widened guard -> CI | The Vitest suite runs on every PR under Node 20 | Build status |
| docs page -> authenticated dev session | `/design-system` renders only in development behind the `(app)` auth layout | Static documentation |
| planning records -> future readers | REQUIREMENTS, ROADMAP and WINDOWS decide what a later audit believes shipped | Requirement status |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-12-01 | Information Disclosure | pre-phase-12 capture output | medium | mitigate | Manifest records `origin_hostname` only; credential-shaped grep over phase dir + both baseline dirs returns zero hits; `test:users:create` never run | closed |
| T-12-02 | Spoofing | capture target origin | medium | mitigate | `baseline.mjs:154-168` `resolveOrigin` refuses any host but localhost/127.0.0.1, called before any network call. Exercised live: production origin refused, exit 1, no directory created | closed |
| T-12-SC | Tampering | npm/pip/cargo installs | high | accept | Zero package installs in the phase; `package.json`/`package-lock.json` diff empty across the full range. See Accepted Risks AR-01 | closed |
| T-12-03 | Tampering | `design-md-parity.test.ts` | medium | mitigate | Family-coverage assertion blocks a vacuous pass on emptied frontmatter; fail-loud missing-path test | closed |
| T-12-04 | Elevation of Privilege | DESIGN.md frontmatter as hook allowlist | medium | mitigate | Exactly 13 colour keys + two typography roles + Tailwind radius/spacing; every value asserted equal to its light-theme source, so no dark value can enter; `#ff8000` still flagged at runtime | closed |
| T-12-05 | Tampering | hook probe subprocess | low | mitigate | `spawnSync(process.execPath, [HOOK_PATH], { input })` — argv array, no shell, stdin JSON. Verified on the committed successor artifact (see Scope Notes) | closed |
| T-12-06 | Repudiation | carried-forward contrast figures | medium | mitigate | 29-row Contrast record, each ratio recomputed by the guard from current tokens at three decimals | closed |
| T-12-07 | Tampering | fabricated or deleted token names | medium | mitigate | Fabrication assertion requires every custom-property, `text-` and `rounded-` name to exist in source | closed |
| T-12-08 | Tampering | `parseTokens` refactor in `contrast.ts` | low | mitigate | `extractBlock` shared by `parseTokens` and `parseTokenAlphas`, plus a zero-token guard preventing vacuous truth; `token-contrast.test.ts` green | closed |
| T-12-09 | Information Disclosure | `/design-system` page | low | accept | `notFound()` when `NODE_ENV === 'production'`; no data fetching (sole `useEffect` is a scroll-spy observer). See Accepted Risks AR-02 | closed |
| T-12-10 | Tampering | `design-system-page-absence.test.ts` | medium | mitigate | Absence loop paired with four sibling-survival controls and a fail-loud missing-path test; observed red on the real stale line | closed |
| T-12-11 | Repudiation | focus-ring contrast claim | medium | mitigate | Caption's two ratios asserted verbatim and all three pass/fail claims recomputed from tokens | closed |
| T-12-12 | Spoofing / Information Disclosure | `local-detector-run.mjs` target origin | **high** | mitigate | `assertLocalOrigin` refuses non-`http:` or non-localhost before the first network call. Exercised live in both directions: https and http production origins refused (exit 2, no output); localhost accepted | closed |
| T-12-13 | Tampering | `exercise-hook.mjs` config override | medium | mitigate | Backup to OS temp, `overrodeConfig` set before the write, restore in `finally`, SHA-256 comparison with its own exit code, cap file refused if pre-existing. Verified live: config hash identical before/after | closed |
| T-12-14 | Elevation of Privilege | subprocess spawning in both scripts | medium | mitigate | Both use `spawnSync` with argv arrays; no `shell:` anywhere; the sole `execSync` is a constant with no interpolation; probe paths from a committed 19-file manifest | closed |
| T-12-15 | Repudiation | false-clean probe results | **high** | mitigate | Fresh `session_id` per probe (19/19 distinct), validity gate on scan counts, caps raised, two controls across both hook tiers. **See Mitigation Integrity Note below** | closed |
| T-12-16 | Elevation of Privilege | over-broad suppression in `.impeccable/config.json` | **high** | mitigate | `ignoreRules` and `ignoreFiles` both empty; 13 `ignoreValues`, none unscoped; the only two `value: "*"` entries are each scoped to one file; all carry a reason naming the backing observation | closed |
| T-12-17 | Repudiation | loss of previous entries' provenance | medium | mitigate | `12-CONFIG-BEFORE.json` preserves all five pre-rewrite entries verbatim, tracked as of `97f42373` | closed |
| T-12-18 | Denial of Service | CI turned red by the widened guard | medium | mitigate | `toEqual` deep equality on a pinned per-file count map — fails on a rise, a fall, a new file and a removed file. Full suite green: 83 files / 1396 tests | closed |
| T-12-19 | Tampering | a D-08 literal quietly migrated or re-suppressed | low | mitigate | Commit-range diff over `app/reserve/**`, `OnboardingModal.tsx`, `KonamiEasterEgg.tsx` is empty; no `ai-color-palette` entry remains | closed |
| T-12-20 | Repudiation | blocked requirements reported as done | **high** | mitigate | ENF-04/05 read Blocked in all three D-02 places; a `Pending|Complete` grep across all three returns nothing; the local run is labelled non-satisfying in the JSON, the evidence file and WINDOWS 52 | closed |
| T-12-21 | Spoofing / Information Disclosure | detector and capture origin | **high** | mitigate | Both localhost guards exercised live; every committed artifact records a local origin; the production baseline is a recorded procedure for its owner, never run by the agent | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Only open threats at or above `high` count toward `threats_open`.*

---

## Mitigation Integrity Note (T-12-15)

This is the phase's one case where a recorded mitigation was **weaker than its own
description**, and it is recorded here rather than quietly closed.

T-12-15's declared mechanism is "two controls, one per hook tier, must flag or the run is
discarded (exit 3)". During the phase, `runProbe()` never copied `expectedRule` onto its
result object, so the control-validation loop always took its `watch[0]` fallback. The
`expectedRule` key is absent from every probe object in both `12-HOOK-PROBES-RED.json`
arms and in `12-HOOK-PROBES-GREEN.json`, confirming the field was never populated. The
check returned the correct answer **only because C1 and C2 each declare a single-element
`watch` array whose sole entry equals `expectedRule`** — correct by coincidence, not by
the described design.

**The recorded evidence remains valid.** Each arm's control verdict was re-derived from
the recorded `rulesObserved` using the manifest's true `expectedRule`, and all three arms
reproduce their recorded `controlFailures` exactly: RED/currentConfig `['C1']` (the
pre-rewrite `reserve/join` suppression genuinely did silence C1, so that run was correctly
discarded), RED/emptyOverride `[]`, GREEN `[]`. The transcripts do not need regenerating.

Fixed post-phase in `9cec95ed` (advisory review finding WR-01). Re-run on HEAD in verify
mode: exit 0, `controlFailures: []`, 19/19 probes valid, `expectedRule` populated, C1
firing on the Stop/deferred tier and C2 on the PostToolUse/immediate tier.

**Residual, non-blocking:** the latent weakness would bite any control probe watching more
than one rule; no such probe exists today. The committed transcripts predate the fix and
carry no `expectedRule` field, so a reader of the JSON alone cannot see which rule was
validated without re-deriving it as done here.

---

## Post-Phase Change Assessment

Three commits landed after the plans were written. Each was judged against the mitigations
it touches rather than assumed benign.

| Commit | Change | Threats touched | Verdict |
|--------|--------|-----------------|---------|
| `ea0b9f78` | one `PAGES` row added to `scripts/visual/baseline.mjs` | T-12-01, T-12-02 | **Both remain closed.** The "unmodified / byte-unchanged" wording is now literally false at file level and is recorded as such. `resolveOrigin` — the function T-12-02 actually names — is byte-unchanged. The new entry is `auth: true` and every auth page is skipped while `/api/dev/test-users` 404s. The committed capture was taken at `eaae8711`, which predates this commit. Disclosure surface unchanged. |
| `9cec95ed` | `expectedRule` forwarded in `exercise-hook.mjs` | T-12-15 | **Closed**, see Mitigation Integrity Note. |
| `9cec95ed` | ROADMAP Phase 12 goal restated as a user story | T-12-20 | **Unaffected.** Prose-only; success criteria 4 and 5 and their blocked-on-deploy markers are untouched. |

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-01 | T-12-SC | Supply-chain tampering via package installs is accepted because the phase performs **zero** installs. Verified: `package.json` and `package-lock.json` diffs are empty across the full phase range, and the complete non-planning changed-file set is 12 files, none a dependency manifest. Puppeteer 24.43.1, Vitest and tsx were all pre-existing. `12-RESEARCH.md` records the Package Legitimacy Audit as not applicable. | Plan-time disposition, `12-01-PLAN.md` threat model; verified by security audit 2026-09-24 | 2026-09-24 |
| AR-02 | T-12-09 | Information disclosure via `/design-system` is accepted because the route is unreachable in production: `app/(app)/design-system/page.tsx` returns `notFound()` when `NODE_ENV === 'production'`, it sits behind the `(app)` auth layout, and it performs no data fetching (its only `useEffect` is an IntersectionObserver scroll-spy). No new input surface was added. | Plan-time disposition, `12-04-PLAN.md` threat model; verified by security audit 2026-09-24 | 2026-09-24 |

*Accepted risks do not resurface in future audit runs.*

**Note on authority:** both dispositions were authored in their PLAN threat models and
carried through execution. This log records that provenance; it does not assert a separate
per-risk human sign-off beyond the phase's own approved plans.

---

## Scope Notes

- **T-12-05** — plan 12-02's probe was an ad-hoc in-transcript invocation, not committed
  code, so no artifact from that plan survives to inspect. The identical mechanism was
  codified and committed in 12-05 as `exercise-hook.mjs:176` and verified there. Closed on
  the successor artifact; `low` severity, non-blocking under either reading.
- **Unregistered flags: none.** No SUMMARY carries a `## Threat Flags` section. Rather than
  rely on that absence, the auditor enumerated the phase's complete non-planning changed-file
  set (12 files) and confirmed each maps to a registered threat. No unmapped attack surface
  appeared during implementation.
- **Pre-recorded, not new findings:** `pageKeyFor` prefix mis-bucketing (WINDOWS 55,
  aggregates unaffected), `context.mjs`'s `EXISTING_VISUAL_SYSTEM` directive (WINDOWS 40),
  and IN-01's three invisible Unicode codepoints (scanner false positive). None affects any
  threat's disposition.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-24 | 22 | 22 | 0 | gsd-security-auditor (ASVS L1; the six `high` threats verified above L1 depth by exercising guards live) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log (AR-01, AR-02)
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-24

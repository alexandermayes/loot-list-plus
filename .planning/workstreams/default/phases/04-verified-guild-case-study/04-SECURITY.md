---
phase: 04
slug: verified-guild-case-study
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-09-06
---

# Phase 04: Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Guild interview to committed registry | A person transcribes the guild's written, approved answers into `data/case-studies/` | Guild name, quote, roster and tier figures, admin-time figures, optional public-profile URL (approved marketing content) |
| Committed registry to rendered page | `app/customers/[slug]/page.tsx` resolves approved templates against one registry entry | Same content, rendered into HTML, metadata, and JSON-LD |
| Anonymous web to middleware | `proxy.ts` decides which paths bypass the Supabase session check | Path only; `/research` and `/customers` now public with boundary matching |
| Product database to published page | Forbidden crossing: no registry field may be read from a guild's LootList+ account data (D-03) | None (verified: no Supabase or db imports under `data/case-studies` or `app/customers`) |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-04-01 | Information Disclosure | data/case-studies/*, page.tsx | high | mitigate | templates and token resolver only; no guild literal in page.tsx | closed |
| T-04-02 | Spoofing | generateStaticParams | high | mitigate | empty publishedCaseStudies, NODE_ENV read at call time, dynamicParams false, production test | closed |
| T-04-03 | Spoofing | JSON-LD blocks | medium | mitigate | Article and BreadcrumbList only, shared Person @id, recursive Review/AggregateRating rejection test | closed |
| T-04-04 | Tampering | outbound guild profile anchor | medium | mitigate | QuoteCard is the sole producer, target=_blank rel=noopener noreferrer asserted in LandingValueProps.test.tsx (page-level branch is vacuous until a wcl_link entry ships) | closed |
| T-04-05 | Information Disclosure | robots directive, sitemap | medium | mitigate | interim noindex present, zero /customers/ sitemap entries, publish-race guard test | closed |
| T-04-06 | Tampering | slug resolution | low | mitigate | exact equality against committed list, throwing accessor, charset assertion at module load | closed |
| T-04-07 | Information Disclosure | registry field population | high | mitigate | no Supabase or db imports in data/case-studies or app/customers | closed |
| T-04-08 | Repudiation | interview kit approval checklist | high | mitigate | itemised written-approval checklist, verbal yes insufficient | closed |
| T-04-09 | Information Disclosure | copy draft content | high | mitigate | 13 CONTENT-TOKEN declarations, no guild value in the file | closed |
| T-04-10 | Tampering | sign-off vs shipped page | high | mitigate | STATUS: APPROVED, SIGN-OFF marker, 04-03 preconditions | closed |
| T-04-11 | Information Disclosure | proof-strip sourcing | high | mitigate | kit questions 11 and 12 with the no-account-data rule | closed |
| T-04-12 | Tampering | copy drift draft vs page.tsx | high | mitigate | parity test reads 04-COPY-DRAFT.md at test time | closed |
| T-04-13 | Spoofing | ProofStrip omit rule | high | mitigate | candidate-then-filter, three-block tests, no placeholder | closed |
| T-04-14 | Repudiation | contextual CTA instrumentation | low | accept | see Accepted Risks Log AR-04-01 | closed |
| T-04-15 | Repudiation | STATE.md blocker record | high | mitigate | record present, not resolved, names both unblocking artifacts; REQUIREMENTS row Blocked | closed |
| T-04-16 | Information Disclosure | publish runbook step three | medium | mitigate | robots removal, sitemap entry, test swap are one commit | closed |
| T-04-17 | Tampering | recrawl submission record | low | mitigate | once-only rule and dated per-URL table | closed |
| T-04-18 | Information Disclosure | guild content in planning records | high | mitigate | no guild name, quote, or figure in runbook, COVERAGE, STATE, REQUIREMENTS | closed |
| T-04-15b | Tampering | CaseStudy.size to lead and meta | high | mitigate | bare count, CASE_STUDY_SIZE_PATTERN at module load, exactly-once unit test | closed |
| T-04-16b | Information Disclosure | ProofStrip figure rendering | high | mitigate | length-aware sizing, min-w-0 break-words, no nowrap/truncate/clamp tests | closed |
| T-04-SC | Tampering | package installs | high | mitigate | package.json and package-lock.json unchanged across the phase diff | closed |
| T-04-Q1 | Elevation of Privilege | proxy.ts public-route allowlist | high | mitigate | boundary-matched predicate in lib/public-routes.ts, lookalikes and app routes still gated, tests, refreshSupabaseSession still called for non-public paths | closed |
| T-04-CR1 | Tampering (XSS) | JSON-LD dangerouslySetInnerHTML in page.tsx | medium | mitigate | expected: escape `<` to `<` before injection; not implemented. Content is committed source, not request input, so no exploit path exists today; a transcribed guild string containing `</script` would break the block | open (below high threshold, non-blocking) |
| T-04-CR2 | Tampering (javascript: URL) | verification.url rendered as href | medium | mitigate | expected: https-only assertion in the data/case-studies/index.ts module-load loop; not implemented. URL is a committed literal copied from the guild's written answer | open (below high threshold, non-blocking) |

*Status: open, closed, or open below the high threshold (non-blocking)*
*Severity: critical > high > medium > low. Only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required), accept (documented risk), transfer (third-party)*

**Remediation note for the two open items.** Both belong in the publish commit at the latest and are cheap: a `toSafeJsonLd` wrapper (or `JSON.stringify(x).replace(/</g, '\\u003c')`) in `app/customers/[slug]/page.tsx`, and an `https://` scheme assertion added to the existing module-load loop in `data/case-studies/index.ts` next to the slug and size patterns. The research report page shares the JSON-LD pattern and should receive the same wrapper.

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-04-01 | T-04-14 | The case-study CTA is reported through BlogTracker's existing article click delegation, which fires a blog-namespaced event on a customers page. Attribution holds; only the event namespace is off. Renaming the event is deferred to the analytics cleanup already captured in the pending todos. | Plan 04-03 (user-approved plan), orchestrator | 2026-09-06 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-06 | 24 | 22 | 2 (both medium, non-blocking) | gsd-security-auditor (opus), State B run from plan artifacts plus 04-REVIEW.md warnings and quick task 260906-ure |

Process observation from the audit: only 04-04-SUMMARY.md carried a `## Threat Flags` section; every closure above rests on a direct code, artifact, or command check rather than on summary narration.

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed (two medium items open below the block threshold)
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-06

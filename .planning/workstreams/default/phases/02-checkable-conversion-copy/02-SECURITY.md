---
phase: 02
slug: checkable-conversion-copy
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-09-01
---

# Phase 02 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Executor to production Postgres (Supabase Management API) | Privileged personal access token crosses; returns production guild data. Read-only, authoring time only (plan 02-01). | Guild names, WCL URLs, activity dates (aggregate) |
| Executor working context to git repository | Public repo; anything committed becomes public. | Copy artifacts, testimonial metadata |
| Planning artifact to public website | Recorded data becomes visible copy in later plans. | Approved marketing strings |
| Signup domain (lootlistplus.com) to marketing domain (getlootlist.com) | Cross-origin secondary link on the signup page. | Navigation only |
| Private interview record to public web page | Attribution and outbound WCL profile links become permanently public. | Names, guild names, consent-gated links |
| Authored metadata to search engines / AI crawlers, incl. JSON-LD script tags | `app/layout.tsx` and `app/compare/page.tsx` serialize authored objects into script elements. | Marketing claims |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-02-01 | Information Disclosure | Management API response in 02-COPY-AUDIT.md | high | mitigate | Column allowlist + UUID grep gate; verified 2026-09-01: zero UUID matches in artifact | closed |
| T-02-02 | Tampering | Guild-name literals in raw Management API query | low | mitigate | Escaped IN-list of executor-read constants, charset refusal guard; authoring-time only, executed in 02-01 gates | closed |
| T-02-03 | Information Disclosure | Supabase PAT from macOS keychain | high | mitigate | Token never echoed/written; grep gate for sbp_/service_role/JWT prefixes; verified 2026-09-01: only mitigation-text mentions match, no tokens | closed |
| T-02-04 | Repudiation | Testimonial attribution from user-supplied metadata | high | mitigate | D-02 non-invention rule; NOT SUPPLIED fields omitted, render test asserts absence; D-16 sign-off; UAT test 3 passed | closed |
| T-02-07 | Spoofing | Verification line reading as third-party attestation | high | mitigate | Approved self-attestation wording; human D-16 review; UAT test 3 explicitly confirmed self-attestation reading | closed |
| T-02-08 | Tampering | Authored copy in JSON-LD dangerouslySetInnerHTML blocks | low | mitigate | Plain-prose restriction; verified 2026-09-01: no angle brackets in authored description/headline values; React escaping as defence in depth | closed |
| T-02-09 | Information Disclosure | Open-question block quoting production data | medium | mitigate | Guilds referenced only by already-public names; raw API response never written to file; UUID grep clean | closed |
| T-02-10 | Tampering | Copy drift between approved artifact and committed source | high | mitigate | Per-plan parity-loop gates over APPROVED-STRING keys; 02-VERIFICATION.md 4/4 must-haves | closed |
| T-02-11 | Spoofing | Outbound cross-domain anchor in LoginPage.tsx | low | mitigate | Fixed first-party literal href; verified 2026-09-01 at LoginPage.tsx:174; test asserts exact value | closed |
| T-02-12 | Elevation of Privilege | Removal of robots noindex on app/page.tsx | medium | mitigate | Verified 2026-09-01: `index: false` intact at app/page.tsx:16 | closed |
| T-02-13 | Denial of Service | Breaking Discord OAuth / invite fetch while editing JSX | medium | mitigate | Scoped edit + diff criteria; UAT test 2 confirmed OAuth still starts | closed |
| T-02-14 | Information Disclosure | Publishing guild profile link without author consent | high | mitigate | Per-quote consent at 02-01 checkpoint; text-only variant when consent absent | closed |
| T-02-15 | Tampering | Reverse tabnabbing via outbound WCL anchor | low | mitigate | Verified 2026-09-01: `rel="noopener noreferrer"` present (LandingValueProps.tsx:99) + test assertion | closed |
| T-02-16 | Spoofing | Self-serving review structured data on testimonials | medium | mitigate | D-05 prohibition; test asserts zero structured-data scripts in testimonial container; JSON-LD confined to layout/compare/blog/about pages | closed |
| T-02-17 | Spoofing | Broadened positioning read as Retail compatibility claim | high | mitigate | D-13 ban; human D-16 review; feature claims stay expansion-specific | closed |
| T-02-18 | Repudiation | Half-applied sweep leaving JSON-LD narrower than visible copy | medium | mitigate | Same-edit rule for JSON-LD + plain metadata; residual counts gated; 02-VERIFICATION.md passed | closed |
| T-02-19 | Elevation of Privilege | Accidental robots noindex on /changelog | low | mitigate | Verified 2026-09-01: no robots key under app/changelog/ | closed |
| T-02-SC | Tampering | npm/pip/cargo installs | low | accept | No packages installed this phase; Package Legitimacy Audit N/A per 02-RESEARCH.md | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| R-02-01 | T-02-SC | Phase installs no packages; any surfaced package need is scope creep to flag back to the user | plan 02-01 through 02-07 (recorded at plan time) | 2026-08-28 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-01 | 18 | 18 | 0 | gsd-secure-phase (orchestrator, L1 grep verification + UAT/D-16 evidence) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-01

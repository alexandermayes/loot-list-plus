---
phase: 5
slug: internal-authority-recrawl
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-09-07
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.0 (jsdom) for the app; Python 3 `unittest` for `scripts/analytics/` |
| **Config file** | `vitest.config.ts` (globals enabled, `@/` alias, `vitest.setup.ts`); the Python suites need no config |
| **Quick run command** | `npx vitest run <file>` and `python3 -m unittest discover -s scripts/analytics -p 'test_*.py'` |
| **Full suite command** | `npm test` plus `python3 -m unittest discover -s scripts/analytics -p 'test_*.py'` |
| **Estimated runtime** | Under 5 seconds for a single Vitest file; under 2 seconds for the Python suites; `npm test` is the long pole |

---

## Sampling Rate

- **After every task commit:** the task's own `<automated>` block, which always names at least one runnable command
- **After every plan wave:** `npm test` and `python3 -m unittest discover -s scripts/analytics -p 'test_*.py'`
- **Before `/gsd-verify-work`:** full suite green, plus `npm run typecheck` and `npm run build`
- **Max feedback latency:** 5 seconds for a scoped file run

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 5-01-CP | 01 | 1 | LINK-02 | T-05-06 | Deploy one requests no indexing | checkpoint:decision | N/A (blocking human) | N/A | ⬜ pending |
| 5-01-01 | 01 | 1 | LINK-02 | T-05-02 / T-05-04 / T-05-05 | Case-study route stays unlisted; deploy proven by content not by identifier | integration (production) | `curl` status + sitemap entry-count battery in the task verify | ✅ | ⬜ pending |
| 5-01-02 | 01 | 1 | LINK-02 | T-05-01 / T-05-03 | Probe uses no credentials; malformed sitemap raises rather than passing | unit + integration | `python3 -m unittest discover -s scripts/analytics -p 'test_*.py'` then a live baseline probe run | ❌ W0 | ⬜ pending |
| 5-02-01 | 02 | 1 | LINK-02 | T-05-08 / T-05-09 / T-05-10 | Append-only; requested event refused twice; piped field cannot forge a column | unit | `python3 -m unittest discover -s scripts/analytics -p 'test_*.py'` | ❌ W0 | ⬜ pending |
| 5-02-02 | 02 | 1 | LINK-02 | T-05-07 / T-05-11 | No token material in output; read scope only, no write endpoints | integration (live API) | `python3 scripts/analytics/inspect-url.py --url https://www.getlootlist.com/compare --json` + secret grep | ❌ W0 | ⬜ pending |
| 5-02-03 | 02 | 1 | LINK-02 | T-05-09 | Runbook keeps its one-request warning byte-identical | source assertion | grep battery in the task verify | ✅ | ⬜ pending |
| 5-03-01 | 03 | 2 | LINK-01, LINK-02 | T-05-13 / T-05-15 / T-05-17 | Figure anchors tied to a metric id; no curly quote or em dash; no case-study link | source assertion + parse | shell grep battery plus the inline `python3` structural parse | ❌ W0 | ⬜ pending |
| 5-03-CP | 03 | 2 | LINK-01 | T-05-14 | Nothing ships without an explicit approval | checkpoint:decision | N/A (blocking human) | N/A | ⬜ pending |
| 5-03-02 | 03 | 2 | LINK-01 | T-05-14 / T-05-16 | Dated sign-off marker; recrawl list and table agree | source assertion + parse | shell grep battery plus the inline `python3` key and URL uniqueness parse | ✅ | ⬜ pending |
| 5-04-01 | 04 | 3 | LINK-01 | T-05-18 / T-05-19 / T-05-22 | Anchor byte-matches the sign-off; no case-study href; no em dash | unit (RTL) + source assertion | `npx vitest run app/__tests__/internal-links.test.tsx` | ❌ W0 | ⬜ pending |
| 5-04-02 | 04 | 3 | LINK-01 | T-05-20 / T-05-21 | One link per target per page; no-link surfaces stay clean | unit (RTL) + source assertion | `npx vitest run app/__tests__/internal-links.test.tsx` then `npm test` | ✅ | ⬜ pending |
| 5-05-01 | 05 | 3 | LINK-01 | T-05-23 / T-05-24 / T-04-CR1 | Approved-strings record untouched; heading count unchanged | unit (RTL) + source assertion | `npx vitest run app/research/wow-classic-loot-systems-2026/__tests__/page.test.tsx` | ✅ | ⬜ pending |
| 5-05-02 | 05 | 3 | LINK-01 | T-05-25 / T-05-26 | Excluded guides stay unlinked; no date field touched | unit (RTL) | `npx vitest run app/blog/__tests__/guide-report-links.test.tsx` | ❌ W0 | ⬜ pending |
| 5-05-03 | 05 | 3 | LINK-01 | T-05-25 | Linked count equals approved anchor count | unit (RTL) + source assertion | `npx vitest run app/blog/__tests__/guide-report-links.test.tsx` then `npm test` | ✅ | ⬜ pending |
| 5-06-01 | 06 | 4 | LINK-02 | T-05-28 / T-05-29 | Missing key throws rather than defaulting; derived helpers are order-independent | unit | `npx vitest run app/__tests__/content-dates.test.ts` | ❌ W0 | ⬜ pending |
| 5-06-02 | 06 | 4 | LINK-02 | T-05-27 / T-05-30 / T-05-31 | No current-time constructor; canonical parity; no duplicate canonical | unit + source assertion | `npx vitest run app/__tests__/sitemap.test.ts` then `npm test` | ✅ (extend) | ⬜ pending |
| 5-07-01 | 07 | 5 | LINK-02 | T-05-32 / T-05-33 / T-05-35 | Structured data agrees with the module and the sitemap; no republish | unit (RTL) + diff assertion | `npx vitest run app/__tests__/blog-dates.test.tsx` | ❌ W0 | ⬜ pending |
| 5-07-02 | 07 | 5 | LINK-02 | T-05-34 | Redated post count equals linked guide count | unit (RTL) + diff assertion | `npx vitest run app/__tests__/blog-dates.test.tsx` then `npm test` | ✅ | ⬜ pending |
| 5-08-01 | 08 | 6 | LINK-02 | T-05-41 / T-05-42 | Date correction lands in one commit; account guard runs | integration (production) | parity suites plus the `curl` build-identifier and sitemap-lastmod battery | ✅ | ⬜ pending |
| 5-08-02 | 08 | 6 | LINK-02 | T-05-36 / T-05-40 | Frozen list cross-checked three ways; probe run twice, results identical | integration (production) | `python3 scripts/analytics/probe-recrawl-urls.py --url-list scripts/analytics/recrawl-targets.json --dates-file data/content-dates.json --anchors-file scripts/analytics/recrawl-targets.json --json` | ✅ | ⬜ pending |
| 5-08-03 | 08 | 6 | LINK-02 | T-05-37 / T-05-38 / T-05-39 | No credential material in the log; no request date before the human acts | integration (live API) + parse | `python3 scripts/analytics/inspect-url.py --url-list scripts/analytics/recrawl-targets.json --json` plus the log-row parse | ✅ | ⬜ pending |
| 5-09-CP | 09 | 7 | LINK-02 | T-05-43 / T-05-47 | One click per URL; no browser automation | checkpoint:human-action | N/A (blocking human) | N/A | ⬜ pending |
| 5-09-01 | 09 | 7 | LINK-01, LINK-02 | T-05-43 / T-05-44 / T-05-45 / T-05-46 / T-05-48 | No URL requested twice; no fabricated date; prepared rows preserved | parse assertion | the inline `python3` request-date counter plus a `log-recrawl.py --check` sweep | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**Nyquist continuity:** every task above carries an `<automated>` block. The three checkpoints are the only gaps, and no two of them are adjacent: 5-01-CP is followed immediately by 5-01-01's production battery, 5-03-CP sits between two automated tasks in the same plan, and 5-09-CP is followed by 5-09-01's log parse. There is no run of three consecutive tasks without an automated verify.

---

## Wave 0 Requirements

Created inside the plans that first need them, not as a separate scaffold plan:

- [ ] `scripts/analytics/probe-recrawl-urls.py` and `scripts/analytics/test_probe_recrawl_urls.py` — plan 05-01 task 2, covers LINK-02's "probe passed" condition (D-14)
- [ ] `scripts/analytics/log-recrawl.py`, `scripts/analytics/RECRAWL-LOG.md` and `scripts/analytics/test_log_recrawl.py` — plan 05-02 task 1, covers D-15
- [ ] `scripts/analytics/inspect-url.py` — plan 05-02 task 2, covers the inspection half of D-14
- [ ] `app/__tests__/internal-links.test.tsx` — plan 05-04 task 1, covers LINK-01 on the four marketing surfaces
- [ ] `app/blog/__tests__/guide-report-links.test.tsx` — plan 05-05 task 2, covers LINK-01 on the guides and the negative case per excluded guide
- [ ] `data/content-dates.json`, `lib/content-dates.ts`, `lib/CONTENT-DATES.md` and `app/__tests__/content-dates.test.ts` — plan 05-06 task 1, covers D-09 through D-12
- [ ] `app/__tests__/blog-dates.test.tsx` — plan 05-07 task 1, covers D-09's structured-data parity requirement
- [ ] `scripts/analytics/recrawl-targets.json` — plan 05-08 task 2, the machine-readable frozen list the probe reads

`app/__tests__/sitemap.test.ts` and `app/research/wow-classic-loot-systems-2026/__tests__/page.test.tsx` already exist and are extended in place, never replaced.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Approving the wording of every new anchor and connective sentence | LINK-01 | The user's voice is the acceptance criterion; no test can decide whether a sentence sounds like this site. D-05 makes it a single consolidated pass | Read the link table in `05-COPY-DRAFT.md`, judging each anchor against its surrounding sentences. Answer the open questions, in particular the attendance-anchor discrepancy. Reply approve, or give replacement wording |
| Clicking Request indexing once per URL in Search Console | LINK-02 | Google provides no API for this action, and the Indexing API is documented for `JobPosting` and `BroadcastEvent` pages only, none of which apply here (D-16) | Open Search Console for `sc-domain:getlootlist.com`. Inspect each URL on the plan 05-09 checklist, click Request indexing exactly once, never twice for the same URL |
| Resubmitting the sitemap once | LINK-02 | `sitemaps.submit` needs the write scope the stored read-only token does not carry, and re-consenting for one action is not warranted (D-16, COVERAGE.md) | In the same Search Console session, open Sitemaps and resubmit `sitemap.xml` once |
| Confirming the submission date and requester name | LINK-02 | Only the person who clicked knows when they clicked and under whose name it should be recorded; the git author of the recording commit is the agent, not them | Reply with the date and the name at the plan 05-09 checkpoint, or name any URL you skipped and why |

Everything else in this phase has an automated verify.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s for scoped runs
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
</content>

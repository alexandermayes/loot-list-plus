#!/usr/bin/env python3
"""
Probe production URLs and report, per URL, whether they are ready for a
recrawl request: HTTP status, self-canonical, absence of noindex (meta tag
and header), presence of an expected anchor, and sitemap lastmod parity
against the committed dates source. Each check is reported by name, never
collapsed into a single pass/fail, so a failing probe names exactly which
condition broke.

Examples:
    python3 scripts/analytics/probe-recrawl-urls.py \\
        --url https://www.getlootlist.com/research/wow-classic-loot-systems-2026 \\
        --skip-anchor --skip-dates

    python3 scripts/analytics/probe-recrawl-urls.py \\
        --url-list scripts/analytics/recrawl-urls.txt \\
        --anchors-file scripts/analytics/recrawl-anchors.json \\
        --dates-file data/content-dates.json --json

    python3 scripts/analytics/probe-recrawl-urls.py \\
        --origin https://www.getlootlist.com \\
        --url https://www.getlootlist.com/compare

Exit status is 0 only when every non-skipped check on every supplied URL
passed, and 1 otherwise.

stdlib only - no third-party HTTP client, no Google client library, no node.
"""
import argparse
import json
import re
import sys
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET

SITEMAP_NS = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}

# The order every result reports its checks in, and the full set of names a
# transport failure must mark as failed (never skipped, never passing).
CHECK_ORDER = [
    "status_200",
    "self_canonical",
    "no_noindex_meta",
    "no_noindex_header",
    "anchor_present",
    "sitemap_lastmod_matches",
]

# The one normalization performed on HTML before an anchor-text or
# canonical/attribute comparison: the ampersand and apostrophe entity forms
# that encode the exact same character as its literal glyph. Nothing here
# maps a curly quote to a straight one - that is a different character, and
# a near-match on it must fail, not pass.
_ENTITY_UNESCAPES = (
    ("&amp;", "&"),
    ("&#39;", "'"),
    ("&#x27;", "'"),
    ("&#X27;", "'"),
    ("&apos;", "'"),
)

_ATTR_RE = re.compile(
    r'([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*"([^"]*)"'
    r"|([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*'([^']*)'",
    re.IGNORECASE,
)


class SitemapParseError(ValueError):
    """Raised when a sitemap document is empty, malformed, or has no <url> entries.

    An empty parse that reports success is worse than a crash: a caller that
    treats {} as "sitemap has no entries for this URL" would silently pass
    every sitemap_lastmod_matches check as skipped rather than surfacing that
    the document could not be read at all.
    """


def _unescape_entities(html):
    for entity, char in _ENTITY_UNESCAPES:
        html = html.replace(entity, char)
    return html


def _parse_attrs(attr_text):
    """Parse an HTML tag's attribute string into a lowercase-keyed dict.

    Tolerates attribute order (rel before or after href) and both single and
    double quoting, matching the loose HTML this repo's own pages emit.
    """
    attrs = {}
    for match in _ATTR_RE.finditer(attr_text):
        if match.group(1) is not None:
            attrs[match.group(1).lower()] = match.group(2)
        else:
            attrs[match.group(3).lower()] = match.group(4)
    return attrs


def parse_sitemap(xml_text):
    """Parse a sitemap.xml document into a dict of loc -> lastmod.

    Uses the explicit sitemaps.org namespace map rather than a bare
    tag-name search: root.findall("url") silently returns an empty list
    against the default-namespaced document Next.js actually emits, because
    ElementTree treats the default xmlns as part of every child tag's
    fully-qualified name. Raises SitemapParseError on empty input, malformed
    XML, or a parse that yields zero <url> elements from non-empty input,
    rather than returning an empty mapping that reads as success.
    """
    if not xml_text or not xml_text.strip():
        raise SitemapParseError("sitemap input is empty")

    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError as e:
        raise SitemapParseError(f"malformed sitemap XML: {e}") from e

    url_elements = root.findall("sm:url", SITEMAP_NS)
    if not url_elements:
        raise SitemapParseError(
            "sitemap parsed but contains zero <url> elements - "
            "check the namespace or the source feed"
        )

    result = {}
    for url_el in url_elements:
        loc_el = url_el.find("sm:loc", SITEMAP_NS)
        if loc_el is None or not loc_el.text:
            raise SitemapParseError("a <url> element is missing its <loc>")
        lastmod_el = url_el.find("sm:lastmod", SITEMAP_NS)
        lastmod = lastmod_el.text.strip() if lastmod_el is not None and lastmod_el.text else None
        result[loc_el.text.strip()] = lastmod
    return result


def extract_canonical(html):
    """Return the href of the first <link rel="canonical"> element, or None.

    Matches case-insensitively and tolerates either attribute order, since
    rel may precede or follow href in the source markup.
    """
    for match in re.finditer(r"<link\b([^>]*)>", html, re.IGNORECASE):
        attrs = _parse_attrs(match.group(1))
        if attrs.get("rel", "").strip().lower() == "canonical":
            href = attrs.get("href")
            if href:
                return href
    return None


def has_noindex_meta(html):
    """True when a <meta name="robots"> element's content contains noindex."""
    for match in re.finditer(r"<meta\b([^>]*)>", html, re.IGNORECASE):
        attrs = _parse_attrs(match.group(1))
        if attrs.get("name", "").strip().lower() == "robots":
            if "noindex" in attrs.get("content", "").lower():
                return True
    return False


def has_noindex_header(headers):
    """True when an X-Robots-Tag response header contains noindex.

    `headers` is any mapping of header name to value (case is not assumed).
    """
    for key, value in headers.items():
        if key.lower() == "x-robots-tag" and "noindex" in (value or "").lower():
            return True
    return False


def contains_anchor(html, anchor_text, href):
    """True only when both the exact anchor text and the exact href appear.

    This is the byte-level parity check tying what shipped to the approved
    copy table, so it compares as an exact UTF-8 substring with no
    normalization beyond unescaping the ampersand/apostrophe entity forms
    (see _ENTITY_UNESCAPES). A curly quote in the document never matches a
    straight quote in the expected anchor text, or the reverse.
    """
    if not anchor_text or not href:
        return False
    unescaped = _unescape_entities(html)
    return anchor_text in unescaped and href in unescaped


def fetch_build_id(origin):
    """Fetch the deploy identifier from <origin>/api/version.

    This value is a Vercel deployment identifier on this deployment (the
    route prefers NEXT_BUILD_ID and VERCEL_DEPLOYMENT_ID over
    VERCEL_GIT_COMMIT_SHA), not a git commit SHA. Callers record it as an
    opaque deploy identifier and never compare it to a git SHA - the deploy
    is proven by content assertions, not by this value alone.
    """
    url = origin.rstrip("/") + "/api/version"
    req = urllib.request.Request(url, headers={"User-Agent": "lootlist-probe/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.load(resp)
    return data.get("buildId")


def dates_equal(actual_lastmod, expected_date):
    """Compare two date-ish strings on their date (first 10 chars) only.

    Sitemap lastmod values and dates-file values may carry a full
    RFC3339 timestamp or a bare YYYY-MM-DD date; only the calendar date
    needs to agree for this check.
    """
    if not actual_lastmod or not expected_date:
        return False
    return actual_lastmod[:10] == expected_date[:10]


def _fetch_url(url):
    """Fetch a URL, returning (status, headers, body, transport_error).

    transport_error is None on any response the server actually sent
    (including 4xx/5xx, which HTTPError still carries a status/body for);
    it is set only when the request never got a response at all.
    """
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "lootlist-probe/1.0"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            status = resp.getcode()
            headers = dict(resp.headers.items())
            body = resp.read().decode("utf-8", errors="replace")
        return status, headers, body, None
    except urllib.error.HTTPError as e:
        headers = dict(e.headers.items()) if e.headers else {}
        try:
            body = e.read().decode("utf-8", errors="replace")
        except Exception:
            body = ""
        return e.code, headers, body, None
    except urllib.error.URLError as e:
        return None, {}, None, str(e.reason)
    except Exception as e:  # noqa: BLE001 - a transport failure is a named failure, never a skip
        return None, {}, None, str(e)


def probe_url(url, sitemap_map, expected_anchor, dates_map, opts):
    """Run every named check for one URL and return its result record.

    `expected_anchor` is None or a dict with "text" and "href" keys.
    `dates_map` is a mapping of URL to the expected lastmod date, or None.
    `opts` is a dict with boolean "skip_anchor" and "skip_dates" keys.

    A URL that cannot be fetched at all reports every check as a failure
    naming the URL and the transport error - never a skip, never a pass.
    """
    status, headers, body, transport_error = _fetch_url(url)

    if transport_error is not None:
        detail = f"could not fetch {url}: {transport_error}"
        return {
            "url": url,
            "checks": {name: {"result": "fail", "detail": detail} for name in CHECK_ORDER},
        }

    checks = {}

    if status == 200:
        checks["status_200"] = {"result": "pass", "detail": f"HTTP {status}"}
    else:
        checks["status_200"] = {"result": "fail", "detail": f"expected HTTP 200, got {status}"}

    canonical = extract_canonical(body) if body else None
    if canonical == url:
        checks["self_canonical"] = {"result": "pass", "detail": f"canonical matches {url}"}
    else:
        checks["self_canonical"] = {
            "result": "fail",
            "detail": f"canonical is {canonical!r}, expected {url!r}",
        }

    if body and has_noindex_meta(body):
        checks["no_noindex_meta"] = {"result": "fail", "detail": "meta[name=robots] content contains noindex"}
    else:
        checks["no_noindex_meta"] = {"result": "pass", "detail": "no noindex meta robots tag"}

    if has_noindex_header(headers):
        checks["no_noindex_header"] = {"result": "fail", "detail": "X-Robots-Tag header contains noindex"}
    else:
        checks["no_noindex_header"] = {"result": "pass", "detail": "no noindex X-Robots-Tag header"}

    if opts.get("skip_anchor") or not expected_anchor:
        checks["anchor_present"] = {
            "result": "skipped",
            "detail": "skipped (--skip-anchor or no anchor supplied for this URL)",
        }
    else:
        text = expected_anchor.get("text")
        href = expected_anchor.get("href")
        if body and contains_anchor(body, text, href):
            checks["anchor_present"] = {
                "result": "pass",
                "detail": f"anchor text {text!r} with href {href!r} found",
            }
        else:
            checks["anchor_present"] = {
                "result": "fail",
                "detail": f"anchor text {text!r} with href {href!r} not found",
            }

    expected_date = (dates_map or {}).get(url)
    if opts.get("skip_dates") or not expected_date:
        checks["sitemap_lastmod_matches"] = {
            "result": "skipped",
            "detail": "skipped (--skip-dates or no dates entry supplied for this URL)",
        }
    else:
        actual_lastmod = (sitemap_map or {}).get(url)
        if dates_equal(actual_lastmod, expected_date):
            checks["sitemap_lastmod_matches"] = {
                "result": "pass",
                "detail": f"sitemap lastmod {actual_lastmod} matches dates file {expected_date}",
            }
        else:
            checks["sitemap_lastmod_matches"] = {
                "result": "fail",
                "detail": f"sitemap lastmod {actual_lastmod!r} does not match dates file {expected_date!r}",
            }

    return {"url": url, "checks": checks}


def load_url_list(path):
    """Read one URL per line; blank lines and lines beginning with # are ignored."""
    urls = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            urls.append(line)
    return urls


def load_json_file(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def parse_args(argv=None):
    parser = argparse.ArgumentParser(
        description="Probe production URLs for recrawl readiness (status, canonical, robots, anchor, lastmod)."
    )
    parser.add_argument("--url", action="append", default=[], help="URL to probe (repeatable)")
    parser.add_argument("--url-list", dest="url_list", help="file of one URL per line")
    parser.add_argument("--origin", default="https://www.getlootlist.com", help="site origin for /api/version and /sitemap.xml")
    parser.add_argument("--dates-file", dest="dates_file", help="JSON map of URL to expected lastmod date")
    parser.add_argument("--anchors-file", dest="anchors_file", help="JSON map of URL to {\"text\": ..., \"href\": ...}")
    parser.add_argument("--skip-dates", dest="skip_dates", action="store_true", help="mark sitemap_lastmod_matches as skipped for every URL")
    parser.add_argument("--skip-anchor", dest="skip_anchor", action="store_true", help="mark anchor_present as skipped for every URL")
    parser.add_argument("--json", dest="as_json", action="store_true", help="print a machine-readable JSON array instead of a table")
    return parser.parse_args(argv)


def print_table(results, build_id):
    print(f"build_id: {build_id}")
    for r in results:
        print(f"\n{r['url']}")
        for name in CHECK_ORDER:
            check = r["checks"].get(name, {"result": "unknown", "detail": ""})
            print(f"  {name:28} {check['result']:8} {check['detail']}")


def main(argv=None):
    args = parse_args(argv)

    urls = list(args.url)
    if args.url_list:
        urls.extend(load_url_list(args.url_list))
    if not urls:
        print("No URLs supplied. Use --url or --url-list.", file=sys.stderr)
        return 1

    dates_map = {}
    if args.dates_file and not args.skip_dates:
        try:
            dates_map = load_json_file(args.dates_file)
        except Exception as e:
            print(f"Failed to load dates file {args.dates_file}: {e}", file=sys.stderr)
            return 1

    anchors_map = {}
    if args.anchors_file and not args.skip_anchor:
        try:
            anchors_map = load_json_file(args.anchors_file)
        except Exception as e:
            print(f"Failed to load anchors file {args.anchors_file}: {e}", file=sys.stderr)
            return 1

    try:
        build_id = fetch_build_id(args.origin)
    except Exception as e:
        print(f"Warning: could not fetch build id from {args.origin}: {e}", file=sys.stderr)
        build_id = None

    sitemap_map = {}
    if not args.skip_dates:
        try:
            sitemap_url = args.origin.rstrip("/") + "/sitemap.xml"
            req = urllib.request.Request(sitemap_url, headers={"User-Agent": "lootlist-probe/1.0"})
            with urllib.request.urlopen(req, timeout=30) as resp:
                sitemap_text = resp.read().decode("utf-8", errors="replace")
            sitemap_map = parse_sitemap(sitemap_text)
        except Exception as e:
            print(f"Warning: could not fetch/parse sitemap from {args.origin}: {e}", file=sys.stderr)
            sitemap_map = {}

    opts = {"skip_anchor": args.skip_anchor, "skip_dates": args.skip_dates}

    results = []
    for url in urls:
        expected_anchor = None if args.skip_anchor else anchors_map.get(url)
        results.append(probe_url(url, sitemap_map, expected_anchor, dates_map, opts))

    if args.as_json:
        print(json.dumps(results, indent=2))
    else:
        print_table(results, build_id)

    all_pass = all(
        check["result"] != "fail" for r in results for check in r["checks"].values()
    )
    return 0 if all_pass else 1


if __name__ == "__main__":
    sys.exit(main())

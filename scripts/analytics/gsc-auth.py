#!/usr/bin/env python3
"""
One-time local OAuth flow for the GSC pull script. Replaces the OAuth
Playground steps in pull-gsc.py's docstring.

Prereqs: GSC_CLIENT_ID and GSC_CLIENT_SECRET in .env.local (a Desktop-type
OAuth client from Google Cloud Console works as-is; loopback redirects need
no registration).

Run from the repo root:
    python3 scripts/analytics/gsc-auth.py

It opens the Google consent page in your browser, catches the redirect on
127.0.0.1, exchanges the code, and writes GSC_REFRESH_TOKEN (and a default
GSC_SITE_URL if missing) into .env.local. No tokens are printed.

stdlib only — no google client libraries.
"""
import http.server
import json
import re
import socket
import sys
import threading
import urllib.parse
import urllib.request
import webbrowser

ENV_PATH = ".env.local"
SCOPE = "https://www.googleapis.com/auth/webmasters.readonly"
DEFAULT_SITE_URL = "sc-domain:getlootlist.com"


def read_env(path=ENV_PATH):
    env = {}
    try:
        for line in open(path):
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip().strip('"').strip("'")
    except FileNotFoundError:
        pass
    return env


def upsert_env(updates, path=ENV_PATH):
    try:
        lines = open(path).read().splitlines()
    except FileNotFoundError:
        lines = []
    for key, value in updates.items():
        pattern = re.compile(rf"^\s*{re.escape(key)}\s*=")
        replaced = False
        for i, line in enumerate(lines):
            if pattern.match(line):
                lines[i] = f"{key}={value}"
                replaced = True
                break
        if not replaced:
            lines.append(f"{key}={value}")
    with open(path, "w") as f:
        f.write("\n".join(lines) + "\n")


def main():
    env = read_env()
    # Whitespace inside a pasted id/secret is always a paste artifact.
    cid = re.sub(r"\s+", "", env.get("GSC_CLIENT_ID", ""))
    secret = re.sub(r"\s+", "", env.get("GSC_CLIENT_SECRET", ""))
    if not cid or not secret:
        sys.exit(f"Add GSC_CLIENT_ID and GSC_CLIENT_SECRET to {ENV_PATH} first.")
    if not cid.endswith(".apps.googleusercontent.com"):
        sys.exit("GSC_CLIENT_ID looks wrong: it should end in .apps.googleusercontent.com")

    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        port = s.getsockname()[1]
    redirect_uri = f"http://127.0.0.1:{port}"

    result = {}
    done = threading.Event()

    class Handler(http.server.BaseHTTPRequestHandler):
        def do_GET(self):
            params = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            code = (params.get("code") or [None])[0]
            error = (params.get("error") or [None])[0]
            if not code and not error:
                # Stray request (favicon, prefetch) — not the OAuth redirect.
                self.send_response(404)
                self.end_headers()
                return
            result["code"] = code
            result["error"] = error
            self.send_response(200)
            self.send_header("Content-Type", "text/html")
            self.end_headers()
            msg = "Authorized. You can close this tab." if result.get("code") else f"Error: {result.get('error')}"
            self.wfile.write(f"<h2>{msg}</h2>".encode())
            done.set()

        def log_message(self, *args):
            pass

    server = http.server.HTTPServer(("127.0.0.1", port), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()

    auth_url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode({
        "client_id": cid,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": SCOPE,
        "access_type": "offline",
        "prompt": "consent",
    })
    print("Opening Google consent page in your browser...")
    print("(If nothing opens, paste this URL yourself:)\n" + auth_url + "\n")
    webbrowser.open(auth_url)

    if not done.wait(timeout=300):
        sys.exit("Timed out after 5 minutes waiting for authorization.")
    server.shutdown()
    if not result.get("code"):
        sys.exit(f"Authorization failed: {result.get('error')}")

    data = urllib.parse.urlencode({
        "client_id": cid,
        "client_secret": secret,
        "code": result["code"],
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code",
    }).encode()
    req = urllib.request.Request(
        "https://oauth2.googleapis.com/token",
        data=data,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            tokens = json.load(r)
    except urllib.error.HTTPError as e:
        sys.exit(f"Token exchange failed ({e.code}): {e.read().decode()}")

    refresh = tokens.get("refresh_token")
    if not refresh:
        sys.exit("No refresh_token in response. Re-run; the script always requests prompt=consent.")

    updates = {"GSC_CLIENT_ID": cid, "GSC_CLIENT_SECRET": secret, "GSC_REFRESH_TOKEN": refresh}
    if not env.get("GSC_SITE_URL"):
        updates["GSC_SITE_URL"] = DEFAULT_SITE_URL
    upsert_env(updates)
    print(f"Refresh token saved to {ENV_PATH}. Verify with: python3 scripts/analytics/pull-gsc.py")


if __name__ == "__main__":
    main()

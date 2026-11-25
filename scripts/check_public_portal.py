#!/usr/bin/env python3
"""Check the deployed public portal, including module MIME and release consistency."""
import argparse
import hashlib
from pathlib import Path
import re
import time
from urllib.parse import urljoin, urlsplit
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://sashido01.github.io/21percent/"
ASSETS = {
    "": {"text/html"},
    "portal/style.css": {"text/css"},
    "portal/app.mjs": {"text/javascript", "application/javascript", "application/ecmascript", "text/ecmascript"},
    "portal/content.mjs": {"text/javascript", "application/javascript", "application/ecmascript", "text/ecmascript"},
    "portal/calculations.mjs": {"text/javascript", "application/javascript", "application/ecmascript", "text/ecmascript"},
    "portal/icon.svg": {"image/svg+xml"},
}
def check(condition, message):
    if not condition:
        raise ValueError(message)

def fetch(path, nonce):
    url = urljoin(BASE, path) + "?qa=" + str(nonce)
    request = Request(url, headers={"User-Agent": "21percent-public-portal-qa", "Cache-Control": "no-cache"})
    with urlopen(request, timeout=12) as response:
        final = urlsplit(response.geturl())
        check(final.scheme == "https" and final.hostname == "sashido01.github.io"
              and final.path.startswith("/21percent/"), "Unexpected redirect: " + response.geturl())
        check(response.status == 200, f"{path or '/'}: HTTP {response.status}")
        media = response.headers.get_content_type()
        check(media in ASSETS[path], f"{path or '/'}: unexpected MIME {media}")
        body = response.read(2_000_001)
        check(0 < len(body) <= 2_000_000, f"{path or '/'}: invalid size")
        return body, media

def probe(expect_current):
    nonce = time.time_ns()
    paths = list(ASSETS)
    if expect_current:
        ASSETS['portal/previews.mjs'] = ASSETS['portal/app.mjs']
        paths.append('portal/previews.mjs')
    assets = {path: fetch(path, nonce) for path in paths}
    html = assets[""][0].decode("utf-8")
    for marker in ['id="research"', 'id="practice"', 'id="projects"', 'id="community"',
                   'id="motion-toggle"', 'src="portal/app.mjs"', 'href="portal/style.css"']:
        check(marker in html, "HTML marker missing: " + marker)
    html_version = re.search(r'id="version">(\d+\.\d+\.\d+)<', html)
    js_version = re.search(r"export const VERSION = '(\d+\.\d+\.\d+)';",
                           assets["portal/content.mjs"][0].decode("utf-8"))
    check(html_version and js_version and html_version.group(1) == js_version.group(1),
          "Inconsistent deployed versions")
    if expect_current:
        expected = (ROOT / "VERSION").read_text(encoding="utf-8").strip()
        check(html_version.group(1) == expected,
              f"Deployment still serves {html_version.group(1)}, expected {expected}")
        for path, (body, _) in assets.items():
            local = ROOT / "docs" / (path or "index.html")
            check(hashlib.sha256(body).digest() == hashlib.sha256(local.read_bytes()).digest(),
                  f"Published bytes differ: {path or 'index.html'}")
    for path, (body, media) in assets.items():
        print(f"HTTP 200 / {media} / {len(body)} bytes / {path or '/'}")
    print("PASS: public HTTPS portal, " + str(len(assets)) + " resources, consistent version " + html_version.group(1))
    if expect_current:
        print("PASS: published files match the current commit byte-for-byte")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--expect-current", action="store_true")
    parser.add_argument("--attempts", type=int, default=1)
    args = parser.parse_args()
    check(1 <= args.attempts <= 40, "Invalid attempts")
    for attempt in range(1, args.attempts + 1):
        try:
            probe(args.expect_current)
            return
        except (OSError, ValueError) as exc:
            print(f"Attempt {attempt}/{args.attempts}: {exc}", flush=True)
            if attempt == args.attempts:
                raise SystemExit("Public portal verification failed") from exc
            time.sleep(12)
if __name__ == "__main__":
    main()

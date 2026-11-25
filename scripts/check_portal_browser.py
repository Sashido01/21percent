#!/usr/bin/env python3
"""Headless Chromium integration checks without third-party packages."""
import contextlib
import functools
import http.server
from pathlib import Path
import shutil
import subprocess
import tempfile
import threading

ROOT = Path(__file__).resolve().parents[1]
chrome = next((shutil.which(name) for name in ("google-chrome", "chromium", "chromium-browser") if shutil.which(name)), None)
if not chrome:
    raise SystemExit("Browser test requires Chrome or Chromium")
with tempfile.TemporaryDirectory() as tmp:
    site = Path(tmp) / "site"
    shutil.copytree(ROOT / "docs", site)
    shutil.copy2(ROOT / "scripts/portal_browser_test.html", site / "browser-test.html")
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *_):
            pass
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=str(site)))
    worker = threading.Thread(target=server.serve_forever, daemon=True)
    worker.start()
    try:
        proc = subprocess.run([
            chrome, "--headless", "--no-sandbox", "--disable-dev-shm-usage",
            "--disable-background-networking", "--no-first-run",
            "--user-data-dir=" + str(Path(tmp) / "chrome"),
            "--window-size=1600,1100", "--force-prefers-reduced-motion", "--virtual-time-budget=15000", "--dump-dom",
            f"http://127.0.0.1:{server.server_port}/browser-test.html",
        ], capture_output=True, text=True, timeout=60)
        marker = "PASS: portal browser interactions, five-width visual geometry, focus and contrast"
        if proc.returncode or f'<pre id="out">{marker}</pre>' not in proc.stdout:
            print(proc.stdout[:5000])
            print(proc.stderr[-4000:])
            raise SystemExit("Portal browser test failed")
        print(marker)
    finally:
        server.shutdown()
        server.server_close()
        worker.join()

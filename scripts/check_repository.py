#!/usr/bin/env python3
"""Offline checks for tracked documentation and SVG assets."""
from pathlib import Path
import re
import subprocess
import sys
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
TRACKED = set(subprocess.check_output(
    ["git", "ls-files", "-z"], cwd=ROOT
).decode("utf-8").rstrip("\0").split("\0"))
REQUIRED = {
    "README.md", "VERSION", "CHANGELOG.md", "ROADMAP.md", "AGENTS.md",
    "CONTRIBUTING.md", "CODE_OF_CONDUCT.md", "SECURITY.md",
    "docs/PUBLISHING.md", "docs/DESIGN.md", "docs/VERSIONING.md",
    "research/METHOD.md", "practice/README.md", "events/README.md",
    "projects/README.md", "assets/brand/hero.svg", "assets/brand/atlas.svg",
    "assets/brand/mark.svg", "assets/brand/signature.svg",
    "assets/brand/research.svg", "assets/brand/practice.svg",
    "assets/brand/experiments.svg", "assets/brand/community.svg",
    ".github/workflows/quality.yml", "scripts/build_signal_motion.mjs",
    "assets/brand/signal-motion.gif", "assets/brand/portal-entry.svg",
    "docs/index.html", "docs/.nojekyll", "docs/PORTAL.md",
    "scripts/check_public_portal.py", ".github/workflows/portal-public.yml",
    "docs/portal/style.css", "docs/portal/content.mjs", "docs/portal/calculations.mjs",
    "docs/portal/app.mjs", "docs/portal/previews.mjs", "scripts/build_portal_previews.mjs", "docs/portal/icon.svg", "scripts/portal.test.mjs",
    "scripts/check_portal_browser.py", "scripts/portal_browser_test.html",
}
LINKS = re.compile(r'\]\(([^)\s]+)\)|\b(?:src|href)="([^"]+)"')
ERRORS = []
for missing in sorted(REQUIRED - TRACKED):
    ERRORS.append(f"Missing tracked path: {missing}")
for name in sorted(TRACKED):
    if not name.endswith((".md", ".svg")):
        continue
    path = ROOT / name
    try:
        content = path.read_text(encoding="utf-8")
    except (OSError, UnicodeError) as exc:
        ERRORS.append(f"{name}: {exc}")
        continue
    if name.endswith(".md"):
        for match in LINKS.finditer(content):
            target = match.group(1) or match.group(2)
            if target.startswith(("#", "https://", "http://", "mailto:")):
                continue
            relative = target.split("#", 1)[0]
            try:
                resolved = (path.parent / relative).resolve().relative_to(ROOT)
            except ValueError:
                ERRORS.append(f"{name}: link escapes repository: {target}")
                continue
            if resolved.as_posix() not in TRACKED:
                ERRORS.append(f"{name}: unresolved link: {target}")
    else:
        try:
            root = ET.fromstring(content)
            if root.tag != "{http://www.w3.org/2000/svg}svg":
                ERRORS.append(f"{name}: missing SVG namespace")
            if not root.get("viewBox"):
                ERRORS.append(f"{name}: missing viewBox")
            if root.find("{http://www.w3.org/2000/svg}title") is None:
                ERRORS.append(f"{name}: missing title")
            if name.startswith("assets/brand/"):
                if root.find("{http://www.w3.org/2000/svg}desc") is None:
                    ERRORS.append(f"{name}: missing description")
                if root.get("role") != "img" or not root.get("aria-labelledby"):
                    ERRORS.append(f"{name}: missing accessible name metadata")
                if path.stat().st_size > 250_000:
                    ERRORS.append(f"{name}: SVG exceeds 250 kB budget")
                if "animation:" in content and "prefers-reduced-motion" not in content:
                    ERRORS.append(f"{name}: animation has no reduced-motion fallback")
            for node in root.iter():
                if node.tag.rsplit("}", 1)[-1] in {"script", "foreignObject"}:
                    ERRORS.append(f"{name}: forbidden SVG element")
                for key, value in node.attrib.items():
                    if key.rsplit("}", 1)[-1].lower().startswith("on"):
                        ERRORS.append(f"{name}: forbidden event handler")
                    if key.rsplit("}", 1)[-1] == "href" and not value.startswith("#"):
                        ERRORS.append(f"{name}: external SVG reference")
        except ET.ParseError as exc:
            ERRORS.append(f"{name}: invalid XML: {exc}")
try:
    version = (ROOT / "VERSION").read_text(encoding="utf-8").strip()
    if not re.fullmatch(r"\d+\.\d+\.\d+", version):
        ERRORS.append("VERSION must contain X.Y.Z")
    changelog = (ROOT / "CHANGELOG.md").read_text(encoding="utf-8")
    first = re.search(r"^## (\d+\.\d+\.\d+)\b", changelog, re.M)
    if not first or first.group(1) != version:
        ERRORS.append("VERSION and latest CHANGELOG entry differ")
except (OSError, UnicodeError) as exc:
    ERRORS.append(str(exc))
# Decode the fixed-width LZW used by the motion generator independently.
try:
    gif = (ROOT / "assets/brand/signal-motion.gif").read_bytes()
    assert gif[:6] == b"GIF89a" and len(gif) < 1_800_000
    width = int.from_bytes(gif[6:8], "little")
    height = int.from_bytes(gif[8:10], "little")
    assert (width, height) == (640, 144)
    offset = 13 + 3 * (2 ** ((gif[10] & 7) + 1))
    frames = 0
    signatures = set()
    import hashlib
    while gif[offset] != 0x3B:
        assert gif[offset:offset+4] == bytes([0x21, 0xF9, 4, 4])
        assert int.from_bytes(gif[offset+4:offset+6], "little") == 12
        assert gif[offset+6:offset+8] == bytes([0, 0])
        offset += 8
        assert gif[offset] == 0x2C and gif[offset+9:offset+11] == bytes([0, 8])
        assert int.from_bytes(gif[offset+5:offset+7], "little") == width
        assert int.from_bytes(gif[offset+7:offset+9], "little") == height
        offset += 11
        packed = bytearray()
        while gif[offset]:
            size = gif[offset]
            offset += 1
            packed.extend(gif[offset:offset+size])
            offset += size
        offset += 1
        dictionary = {i: bytes([i]) for i in range(256)}
        previous = None
        next_code = 258
        decoded = bytearray()
        acc = bits = 0
        ended = False
        for value in packed:
            acc |= value << bits
            bits += 8
            if bits < 9:
                continue
            code = acc & 511
            acc >>= 9
            bits -= 9
            if code == 256:
                dictionary = {i: bytes([i]) for i in range(256)}
                previous = None
                next_code = 258
                continue
            if code == 257:
                ended = True
                break
            if code in dictionary:
                entry = dictionary[code]
            else:
                assert previous is not None and code == next_code
                entry = previous + previous[:1]
            decoded.extend(entry)
            if previous is not None:
                dictionary[next_code] = previous + entry[:1]
                next_code += 1
                assert next_code <= 511
            previous = entry
        assert ended and len(decoded) == width * height
        signatures.add(hashlib.sha256(decoded).digest())
        frames += 1
    assert offset == len(gif) - 1 and frames == 40 and len(signatures) == 40
    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    assert readme.count("<details>") == readme.count("</details>") == 9
    assert readme.count("<summary>") == readme.count("</summary>") == 9
    print("PASS: 40 distinct decoded GIF frames, 4.8 seconds; 9 disclosure panels")
except (AssertionError, IndexError, OSError, ValueError) as exc:
    ERRORS.append(f"Motion or interactive panels invalid: {exc}")
if ERRORS:
    print("\n".join(ERRORS), file=sys.stderr)
    sys.exit(1)
print(f"PASS: {len(TRACKED)} tracked files; links, SVG, version and required paths checked")

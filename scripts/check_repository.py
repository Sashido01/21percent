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
    ".github/workflows/quality.yml",
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
if ERRORS:
    print("\n".join(ERRORS), file=sys.stderr)
    sys.exit(1)
print(f"PASS: {len(TRACKED)} tracked files; links, SVG, version and required paths checked")

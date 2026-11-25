#!/usr/bin/env python3
"""Independently verify social cover PNG and metadata with stdlib."""
from pathlib import Path
from html.parser import HTMLParser
import struct
import zlib

ROOT = Path(__file__).resolve().parents[1]
data = (ROOT / "docs/portal/social-preview.png").read_bytes()
assert len(data) < 500_000 and data[:8] == b"\x89PNG\r\n\x1a\n"
offset = 8
chunks = {}
while offset < len(data):
    length = struct.unpack(">I", data[offset:offset+4])[0]
    kind = data[offset+4:offset+8]
    value = data[offset+8:offset+8+length]
    crc = struct.unpack(">I", data[offset+8+length:offset+12+length])[0]
    assert zlib.crc32(kind+value) & 0xffffffff == crc
    chunks.setdefault(kind, []).append(value)
    offset += length + 12
assert offset == len(data) and b"IEND" in chunks
w,h,depth,ctype,comp,filt,interlace = struct.unpack(">IIBBBBB", chunks[b"IHDR"][0])
assert (w,h,depth,ctype,comp,filt,interlace) == (1280,640,4,3,0,0,0)
assert len(chunks[b"PLTE"][0]) == 48
raw = zlib.decompress(b"".join(chunks[b"IDAT"]))
assert len(raw) == h * (1+w//2)
assert all(raw[y*(1+w//2)] == 0 for y in range(h))
assert len(set(raw)) > 16
class Meta(HTMLParser):
    def __init__(self):
        super().__init__()
        self.meta={}
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if tag=="meta" and ("property" in a or "name" in a):
            self.meta[a.get("property",a.get("name"))]=a.get("content")
m=Meta()
m.feed((ROOT/"docs/index.html").read_text(encoding="utf-8"))
base="https://sashido01.github.io/21percent/"
assert m.meta["og:url"] == base
assert m.meta["og:image"] == m.meta["twitter:image"] == base+"portal/social-preview.png"
assert m.meta["og:image:width"] == str(w) and m.meta["og:image:height"] == str(h)
assert m.meta["og:image:type"] == "image/png" and m.meta["og:image:alt"]
print(f"PASS: social PNG decoded, {w}x{h}, {len(data)} bytes, Open Graph metadata consistent")

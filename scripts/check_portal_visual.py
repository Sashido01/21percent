#!/usr/bin/env python3
"""Capture reproducible portal views and compare PR/base pixels in one browser environment."""
import argparse
from contextlib import contextmanager
import functools
import hashlib
import http.server
import io
import json
from pathlib import Path
import shutil
import struct
import subprocess
import tarfile
import tempfile
import threading
import zlib

ROOT = Path(__file__).resolve().parents[1]
VIEWS = [
    ("desktop-home", 1440, 1000, ""),
    ("desktop-library", 1440, 1000, "#research"),
    ("desktop-practice", 1440, 1000, "#practice"),
    ("desktop-projects", 1440, 1000, "#projects"),
    ("tablet-home", 768, 1024, ""),
    ("mobile-home", 390, 844, ""),
    ("mobile-practice", 390, 844, "#practice"),
    ("narrow-home", 320, 800, ""),
]
def ensure(ok, msg):
    if not ok:
        raise RuntimeError(msg)

@contextmanager
def serve(directory):
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *_):
            pass
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=str(directory)))
    worker = threading.Thread(target=server.serve_forever, daemon=True)
    worker.start()
    try:
        yield f"http://127.0.0.1:{server.server_port}/"
    finally:
        server.shutdown()
        server.server_close()
        worker.join()

def paeth(a,b,c):
    p=a+b-c
    pa,pb,pc=abs(p-a),abs(p-b),abs(p-c)
    return a if pa<=pb and pa<=pc else b if pb<=pc else c

def read_png(path):
    """Decode non-interlaced 8-bit RGB/RGBA Chrome PNG, all five filters."""
    data=path.read_bytes()
    ensure(data[:8]==b"\x89PNG\r\n\x1a\n", f"{path}: not a PNG")
    pos=8
    packed=[]
    info=None
    while pos<len(data):
        n=struct.unpack(">I",data[pos:pos+4])[0]
        typ=data[pos+4:pos+8]
        payload=data[pos+8:pos+8+n]
        ensure(len(payload)==n and zlib.crc32(typ+payload)&0xffffffff==struct.unpack(">I",data[pos+8+n:pos+12+n])[0],f"{path}: corrupt PNG chunk")
        if typ==b"IHDR":
            info=struct.unpack(">IIBBBBB",payload)
        elif typ==b"IDAT":
            packed.append(payload)
        pos+=n+12
    ensure(info is not None, "Missing IHDR")
    w,h,depth,ctype,comp,filt,interlace=info
    ensure(depth==8 and ctype in (2,6) and comp==filt==interlace==0,"Unsupported Chrome screenshot format")
    channels=3 if ctype==2 else 4
    stride=w*channels
    raw=zlib.decompress(b"".join(packed))
    ensure(len(raw)==h*(stride+1),"Invalid raster length")
    previous=bytearray(stride)
    rgb=bytearray()
    for y in range(h):
        offset=y*(stride+1)
        kind=raw[offset]
        row=bytearray(raw[offset+1:offset+1+stride])
        if kind:
            ensure(1<=kind<=4,"Invalid PNG filter")
            for i in range(stride):
                a=row[i-channels] if i>=channels else 0
                b=previous[i]
                c=previous[i-channels] if i>=channels else 0
                if kind==1: value=a
                elif kind==2: value=b
                elif kind==3: value=(a+b)//2
                else: value=paeth(a,b,c)
                row[i]=(row[i]+value)&255
        if channels==3:
            rgb.extend(row)
        else:
            for i in range(0,stride,4):
                rgb.extend(row[i:i+3])
        previous=row
    return w,h,bytes(rgb)

def diff_pct(a,b):
    ensure(a[:2]==b[:2],"Screenshot dimensions differ")
    aa,bb=a[2],b[2]
    return round(100*sum(aa[i:i+3]!=bb[i:i+3] for i in range(0,len(aa),3))/(a[0]*a[1]),4)

def prepare_capture_site(source, destination):
    """Use a test-only document to scroll after modules and layout are ready."""
    shutil.copytree(source,destination)
    html=(destination/"index.html").read_text(encoding="utf-8")
    fixture="""<style>html{scroll-behavior:auto!important}*,*::before,*::after{animation:none!important;transition:none!important}</style>
<script>
window.addEventListener('load',()=>{
  const id=new URLSearchParams(location.search).get('view');
  const target=id&&document.getElementById(id);
  function position(){
    const top=target?target.getBoundingClientRect().top+window.scrollY-90:0;
    window.scrollTo({top:Math.max(0,top),behavior:'instant'});
  }
  position();setTimeout(position,150);setTimeout(position,700);
},{once:true});
</script>"""
    (destination/"capture.html").write_text(html.replace("</body>",fixture+"</body>"),encoding="utf-8")
    return destination

def capture(chrome,url,dest,w,h,profile):
    last_error=None
    for attempt in range(1,4):
        dest.unlink(missing_ok=True)
        proc=subprocess.run([
            chrome,"--headless","--no-sandbox","--disable-dev-shm-usage",
            "--disable-background-networking","--no-first-run","--hide-scrollbars",
            "--force-device-scale-factor=1","--force-prefers-reduced-motion",
            "--run-all-compositor-stages-before-draw",
            "--user-data-dir="+str(profile)+"-"+str(attempt),
            "--window-size="+str(w)+","+str(h),
            "--virtual-time-budget=5000","--screenshot="+str(dest),url,
        ],capture_output=True,text=True,timeout=45)
        try:
            ensure(proc.returncode==0 and dest.is_file(),f"Chrome screenshot failed: {proc.stderr[-1200:]}")
            image=read_png(dest)
            ensure(image[:2]==(w,h),f"Unexpected screenshot dimensions: {dest.name} {image[:2]}")
            ensure(len(set(image[2]))>=16,f"Blank or nearly uniform screenshot: {dest.name}")
            return image
        except (RuntimeError, OSError, ValueError, zlib.error) as exc:
            last_error=exc
            print(f"Capture attempt {attempt}/3 failed: {exc}",flush=True)
    raise RuntimeError(f"All capture attempts failed: {dest.name}") from last_error

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--out",type=Path,default=Path("visual-qa"))
    parser.add_argument("--baseline",default="")
    args=parser.parse_args()
    chrome=next((shutil.which(n) for n in ("google-chrome","chromium","chromium-browser") if shutil.which(n)),None)
    ensure(chrome,"Chrome or Chromium required")
    out=args.out.resolve()
    out.mkdir(parents=True,exist_ok=True)
    report={"browser":subprocess.check_output([chrome,"--version"],text=True).strip(),
            "commit":subprocess.check_output(["git","rev-parse","HEAD"],cwd=ROOT,text=True).strip(),
            "baseline":args.baseline or None,"views":[]}
    with tempfile.TemporaryDirectory() as tmp:
        tmp=Path(tmp)
        base_dir=None
        if args.baseline and set(args.baseline)!={"0"}:
            archive=subprocess.check_output(["git","archive",args.baseline,"docs"],cwd=ROOT)
            baseline=tmp/"baseline"
            baseline.mkdir()
            with tarfile.open(fileobj=io.BytesIO(archive)) as tar:
                # Git archive of a fixed repository commit, reject unsafe paths.
                for member in tar.getmembers():
                    ensure(not member.issym() and not member.islnk() and (baseline/member.name).resolve().is_relative_to(baseline),"Unsafe baseline archive")
                tar.extractall(baseline,filter="data")
            base_dir=prepare_capture_site(baseline/"docs",tmp/"baseline-capture")
        current_dir=prepare_capture_site(ROOT/"docs",tmp/"current-capture")
        with serve(current_dir) as current_url:
            for name,w,h,anchor in VIEWS:
                path=out/(name+".png")
                current=capture(chrome,current_url+'capture.html?view='+anchor.lstrip('#'),path,w,h,tmp/("profile-"+name))
                record={"view":name,"width":w,"height":h,"sha256":hashlib.sha256(path.read_bytes()).hexdigest()}
                if base_dir:
                    with serve(base_dir) as old_url:
                        previous_path=out/("baseline-"+name+".png")
                        previous=capture(chrome,old_url+'capture.html?view='+anchor.lstrip('#'),previous_path,w,h,tmp/("baseline-"+name))
                    record["changed_pixels_percent"]=diff_pct(current,previous)
                report["views"].append(record)
                print(name,record,flush=True)
    (out/"report.json").write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(f"PASS: {len(VIEWS)} real Chromium screenshots; dimensions and raster integrity verified")
    if args.baseline:
        print("Visual pixel differences are reported for review, not automatic aesthetic approval.")

if __name__=="__main__":
    main()

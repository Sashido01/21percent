#!/usr/bin/env python3
"""Capture reproducible portal views and compare PR/base pixels in one browser environment."""
import argparse
import base64
import os
import socket
import time
from urllib.parse import urlsplit
from urllib.request import urlopen
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

class DevTools:
    """Small local-only RFC6455/CDP client; no network dependencies."""
    def __init__(self,url):
        u=urlsplit(url)
        ensure(u.scheme=="ws" and u.hostname=="127.0.0.1","Unexpected DevTools address")
        self.sock=socket.create_connection((u.hostname,u.port),timeout=20)
        self.stream=self.sock.makefile("rb")
        key=base64.b64encode(os.urandom(16)).decode()
        req=f"GET {u.path} HTTP/1.1\r\nHost: {u.netloc}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n"
        self.sock.sendall(req.encode("ascii"))
        status=self.stream.readline().decode("ascii")
        ensure(" 101 " in status,"DevTools handshake failed: "+status)
        headers={}
        while True:
            line=self.stream.readline()
            if line in (b"\r\n",b""):
                break
            k,v=line.decode("ascii").split(":",1)
            headers[k.lower()]=v.strip()
        accept=base64.b64encode(hashlib.sha1((key+"258EAFA5-E914-47DA-95CA-C5AB0DC85B11").encode()).digest()).decode()
        ensure(headers.get("sec-websocket-accept")==accept,"DevTools handshake mismatch")
        self.seq=0
    def send(self,payload,opcode=1):
        n=len(payload)
        prefix=bytes([0x80|opcode,0x80|(n if n<126 else 126 if n<65536 else 127)])
        if n>=126:
            prefix+=struct.pack(">H" if n<65536 else ">Q",n)
        mask=os.urandom(4)
        self.sock.sendall(prefix+mask+bytes(v^mask[i%4] for i,v in enumerate(payload)))
    def read_message(self):
        chunks=[]
        while True:
            a,b=self.stream.read(2)
            n=b&127
            if n==126: n=struct.unpack(">H",self.stream.read(2))[0]
            elif n==127: n=struct.unpack(">Q",self.stream.read(8))[0]
            ensure(n<40_000_000,"DevTools frame too large")
            mask=self.stream.read(4) if b&128 else None
            payload=self.stream.read(n)
            ensure(len(payload)==n,"Truncated DevTools frame")
            if mask: payload=bytes(v^mask[i%4] for i,v in enumerate(payload))
            opcode=a&15
            if opcode==8: raise RuntimeError("DevTools disconnected")
            if opcode==9:
                self.send(payload,10)
                continue
            if opcode==10: continue
            chunks.append(payload)
            if a&128: return json.loads(b"".join(chunks))
    def call(self,method,**params):
        self.seq+=1
        self.send(json.dumps({"id":self.seq,"method":method,"params":params}).encode())
        while True:
            data=self.read_message()
            if data.get("id")==self.seq:
                ensure("error" not in data,f"{method}: {data.get('error')}")
                return data["result"]
    def evaluate(self,expression):
        data=self.call("Runtime.evaluate",expression=expression,returnByValue=True,awaitPromise=True)
        ensure("exceptionDetails" not in data,"JavaScript evaluation failed: "+expression)
        return data["result"].get("value")
    def close(self):
        self.stream.close()
        self.sock.close()

def capture(chrome,url,dest,w,h,profile,anchor):
    profile.mkdir(parents=True,exist_ok=True)
    proc=subprocess.Popen([
        chrome,"--headless","--no-sandbox","--disable-dev-shm-usage",
        "--disable-background-networking","--no-first-run","--hide-scrollbars",
        "--remote-debugging-port=0","--remote-debugging-address=127.0.0.1",
        "--user-data-dir="+str(profile),"--window-size="+str(w)+","+str(h),
        "about:blank",
    ],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    dev=None
    try:
        portfile=profile/"DevToolsActivePort"
        deadline=time.monotonic()+20
        target=None
        while time.monotonic()<deadline and proc.poll() is None:
            try:
                # Chrome can create the port file before writing its contents.
                lines=portfile.read_text().splitlines()
                if not lines or not lines[0].isdigit():
                    time.sleep(.1)
                    continue
                port=int(lines[0])
                with urlopen(f"http://127.0.0.1:{port}/json/list",timeout=2) as response:
                    targets=json.load(response)
                target=next((x for x in targets if x.get("type")=="page" and x.get("webSocketDebuggerUrl")),None)
                if target:
                    break
            except (OSError, ValueError):
                pass
            time.sleep(.1)
        ensure(target is not None,"Chrome DevTools endpoint did not become ready")
        dev=DevTools(target["webSocketDebuggerUrl"])
        dev.call("Page.enable")
        dev.call("Emulation.setDeviceMetricsOverride",width=w,height=h,deviceScaleFactor=1,mobile=False)
        dev.call("Emulation.setEmulatedMedia",features=[{"name":"prefers-reduced-motion","value":"reduce"}])
        dev.call("Page.navigate",url=url)
        deadline=time.monotonic()+20
        ready=False
        while time.monotonic()<deadline:
            ready=dev.evaluate("document.readyState==='complete' && !!document.querySelector('#resource-grid .reader-open') && [6,7].includes(document.querySelector('#resource-grid').children.length)")
            if ready: break
            time.sleep(.15)
        ensure(ready,"Portal did not initialize before screenshot")
        selector=json.dumps(anchor.lstrip("#"))
        location=dev.evaluate("""(async()=>{const id="""+selector+""";const e=id?document.getElementById(id):null;if(id&&!e)throw Error('Missing section');await document.fonts.ready;document.documentElement.style.scrollBehavior='auto';window.scrollTo(0,e?Math.max(0,e.getBoundingClientRect().top+window.scrollY-90):0);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return {top:e?e.getBoundingClientRect().top:0,scroll:window.scrollY,viewport:window.innerHeight,visible:e?e.getBoundingClientRect().bottom>0:true};})()""")
        ensure(location["visible"] and -100<=location["top"]<h,f"Wrong section position: {anchor} {location}")
        time.sleep(.25)
        shot=dev.call("Page.captureScreenshot",format="png",fromSurface=True,captureBeyondViewport=False)
        dest.write_bytes(base64.b64decode(shot["data"],validate=True))
        image=read_png(dest)
        ensure(image[:2]==(w,h),f"Unexpected screenshot dimensions: {dest.name} {image[:2]}")
        sample={image[2][i:i+3] for i in range(0,len(image[2]),3*31)}
        ensure(len(sample)>20,f"Blank or nearly uniform screenshot: {dest.name}")
        print(f"Captured {dest.name}: {location}",flush=True)
        return image
    finally:
        if dev: dev.close()
        proc.terminate()
        try: proc.wait(timeout=8)
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.wait()

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
            base_dir=baseline/"docs"
        with serve(ROOT/"docs") as current_url:
            for name,w,h,anchor in VIEWS:
                path=out/(name+".png")
                current=capture(chrome,current_url,path,w,h,tmp/("profile-"+name),anchor)
                record={"view":name,"width":w,"height":h,"sha256":hashlib.sha256(path.read_bytes()).hexdigest()}
                if base_dir:
                    with serve(base_dir) as old_url:
                        previous_path=out/("baseline-"+name+".png")
                        previous=capture(chrome,old_url,previous_path,w,h,tmp/("baseline-"+name),anchor)
                    record["changed_pixels_percent"]=diff_pct(current,previous)
                report["views"].append(record)
                print(name,record,flush=True)
    (out/"report.json").write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(f"PASS: {len(VIEWS)} real Chromium screenshots; dimensions and raster integrity verified")
    if args.baseline:
        print("Visual pixel differences are reported for review, not automatic aesthetic approval.")

if __name__=="__main__":
    main()

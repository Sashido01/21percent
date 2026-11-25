// Deterministic SIGNAL ROOM social cover. Native JavaScript; no external fonts or packages.
import { readFileSync, writeFileSync } from 'node:fs';
function buildSocial(){
 const W=1280,H=640;
 const colors=[[7,17,22],[10,25,31],[15,35,42],[24,51,57],[41,67,76],[69,97,106],[109,139,148],[128,186,198],[176,194,194],[243,245,242],[199,246,90],[140,177,67],[83,112,52],[16,45,38],[50,77,54],[222,250,161]];
 const p=new Uint8Array(W*H);
 const px=(x,y,c)=>{x=Math.round(x);y=Math.round(y);if(x>=0&&y>=0&&x<W&&y<H)p[y*W+x]=c;};
 function rect(x,y,w,h,c){for(let j=Math.max(0,y);j<Math.min(H,y+h);j++)p.fill(c,j*W+Math.max(0,x),j*W+Math.min(W,x+w));}
 function disk(x,y,r,c){for(let j=Math.floor(y-r);j<=y+r;j++)for(let i=Math.floor(x-r);i<=x+r;i++)if((i-x)**2+(j-y)**2<=r*r)px(i,j,c);}
 function line(x1,y1,x2,y2,c,t=1){const n=Math.max(1,Math.ceil(Math.hypot(x2-x1,y2-y1)));for(let i=0;i<=n;i++){const q=i/n;if(t<=1)px(x1+(x2-x1)*q,y1+(y2-y1)*q,c);else disk(x1+(x2-x1)*q,y1+(y2-y1)*q,t/2,c);}}
 function path(points,c,t=1){for(let i=1;i<points.length;i++)line(...points[i-1],...points[i],c,t);}
 function ellipse(cx,cy,rx,ry,ang,c,t=1,start=0,end=Math.PI*2){let prev=null;const n=Math.ceil((end-start)*Math.max(rx,ry));for(let i=0;i<=n;i++){const a=start+(end-start)*i/n,xx=rx*Math.cos(a),yy=ry*Math.sin(a),pt=[cx+xx*Math.cos(ang)-yy*Math.sin(ang),cy+xx*Math.sin(ang)+yy*Math.cos(ang)];if(prev)line(...prev,...pt,c,t);prev=pt;}}
 function ring(cx,cy,r,t,c){ellipse(cx,cy,r,r,0,c,t);}
 // Geometric monoline alphabet, drawn as strokes (no installed fonts needed).
 const font={
 'A':[[[0,7],[2.5,0],[5,7]],[[1,4.5],[4,4.5]]],
 'B':[[[0,7],[0,0],[3.5,0],[5,1.5],[3.5,3.5],[0,3.5]],[[3.5,3.5],[5,5],[3.5,7],[0,7]]],
 'C':[[[5,1],[4,0],[1,0],[0,1],[0,6],[1,7],[4,7],[5,6]]],
 'D':[[[0,0],[3,0],[5,2],[5,5],[3,7],[0,7],[0,0]]],
 'E':[[[5,0],[0,0],[0,7],[5,7]],[[0,3.5],[4,3.5]]],
 'F':[[[5,0],[0,0],[0,7]],[[0,3.5],[4,3.5]]],
 'G':[[[5,1],[4,0],[1,0],[0,1],[0,6],[1,7],[5,7],[5,4],[3,4]]],
 'H':[[[0,0],[0,7]],[[5,0],[5,7]],[[0,3.5],[5,3.5]]],
 'I':[[[0,0],[5,0]],[[2.5,0],[2.5,7]],[[0,7],[5,7]]],
 'K':[[[0,0],[0,7]],[[5,0],[0,3.5],[5,7]]],
 'L':[[[0,0],[0,7],[5,7]]],
 'M':[[[0,7],[0,0],[2.5,3.5],[5,0],[5,7]]],
 'N':[[[0,7],[0,0],[5,7],[5,0]]],
 'O':[[[1,0],[4,0],[5,1],[5,6],[4,7],[1,7],[0,6],[0,1],[1,0]]],
 'P':[[[0,7],[0,0],[4,0],[5,1],[5,3],[4,4],[0,4]]],
 'R':[[[0,7],[0,0],[4,0],[5,1],[5,3],[4,4],[0,4]],[[2.8,4],[5,7]]],
 'S':[[[5,1],[4,0],[1,0],[0,1],[0,2.5],[1,3.5],[4,3.5],[5,4.5],[5,6],[4,7],[1,7],[0,6]]],
 'T':[[[0,0],[5,0]],[[2.5,0],[2.5,7]]],
 'U':[[[0,0],[0,6],[1,7],[4,7],[5,6],[5,0]]],
 'V':[[[0,0],[2.5,7],[5,0]]],
 'W':[[[0,0],[1,7],[2.5,3.5],[4,7],[5,0]]],
 'X':[[[0,0],[5,7]],[[5,0],[0,7]]],
 'Y':[[[0,0],[2.5,3.5],[5,0]],[[2.5,3.5],[2.5,7]]],
 '0':[[[1,0],[4,0],[5,1],[5,6],[4,7],[1,7],[0,6],[0,1],[1,0]]],
 '1':[[[1,1.5],[2.5,0],[2.5,7]],[[0,7],[5,7]]],
 '2':[[[0,1],[1,0],[4,0],[5,1],[5,2.5],[0,7],[5,7]]],
 '3':[[[0,0],[5,0],[2,3.3],[5,4.5],[5,6],[4,7],[0,7]]],
 '4':[[[4,7],[4,0],[0,5],[5,5]]],
 '5':[[[5,0],[0,0],[0,3.5],[4,3.5],[5,4.5],[5,6],[4,7],[0,7]]],
 '6':[[[5,0],[1,0],[0,1],[0,6],[1,7],[4,7],[5,6],[5,4],[4,3],[0,3]]],
 '7':[[[0,0],[5,0],[1,7]]],
 '8':[[[1,0],[4,0],[5,1],[5,2.5],[4,3.5],[1,3.5],[0,2.5],[0,1],[1,0]],[[1,3.5],[0,4.5],[0,6],[1,7],[4,7],[5,6],[5,4.5],[4,3.5]]],
 '9':[[[5,4],[1,4],[0,3],[0,1],[1,0],[4,0],[5,1],[5,6],[4,7],[0,7]]],
 '/':[[[0,7],[5,0]]],'.':[[[2.5,7],[2.5,6.8]]],'-':[[[0,3.5],[5,3.5]]],
 'Ф':[[[2.5,0],[2.5,7]],[[0,2],[1,1],[4,1],[5,2],[5,5],[4,6],[1,6],[0,5],[0,2]]],
 'И':[[[0,0],[0,7],[5,0],[5,7]]],
 'Й':[[[0,1],[0,7],[5,1],[5,7]],[[1.5,0],[3.5,0]]],
 'Ы':[[[0,0],[0,7],[2,7],[3,6],[3,4.5],[2,3.5],[0,3.5]],[[5,0],[5,7]]],
 'Б':[[[5,0],[0,0],[0,7],[4,7],[5,6],[5,4.5],[4,3.5],[0,3.5]]],
 'У':[[[0,0],[2.8,4.5]],[[5,0],[1.5,7]]],
 'Л':[[[0,7],[2,0],[5,0],[5,7]]],
 'Ш':[[[0,0],[0,7],[5,7],[5,0]],[[2.5,0],[2.5,7]]],
 'Д':[[[0,6],[1,5],[1,0],[4,0],[4,6]],[[0,7],[0,6],[5,6],[5,7]]],
 'Г':[[[0,7],[0,0],[5,0]]],
 'Р':[[[0,7],[0,0],[4,0],[5,1],[5,3],[4,4],[0,4]]],
 'А':[[[0,7],[2.5,0],[5,7]],[[1,4.5],[4,4.5]]],
 'Н':[[[0,0],[0,7]],[[5,0],[5,7]],[[0,3.5],[5,3.5]]],
 'С':[[[5,1],[4,0],[1,0],[0,1],[0,6],[1,7],[4,7],[5,6]]],
 'О':[[[1,0],[4,0],[5,1],[5,6],[4,7],[1,7],[0,6],[0,1],[1,0]]],
 'В':[[[0,7],[0,0],[3.5,0],[5,1.5],[3.5,3.5],[0,3.5]],[[3.5,3.5],[5,5],[3.5,7],[0,7]]],
 'К':[[[0,0],[0,7]],[[5,0],[0,3.5],[5,7]]],
 'Е':[[[5,0],[0,0],[0,7],[5,7]],[[0,3.5],[4,3.5]]],
 ' ':[]};
 function text(s,x,y,scale,c,t){for(const ch of s){for(const seg of font[ch]||[]){path(seg.map(([a,b])=>[x+a*scale,y+b*scale]),c,t);}x+=scale*7;}}
 // Frame, a quiet grid, signal traces and a single focal point.
 for(let y=0;y<H;y+=32)line(0,y,W-1,y,2);
 for(let x=0;x<W;x+=32)line(x,0,x,H-1,2);
 for(let y=24;y<H-24;y+=16)for(let x=24;x<W-24;x+=16)if((x+y)%64===0)px(x,y,4);
 rect(34,34,1212,2,5);rect(34,604,1212,2,5);rect(34,34,2,572,5);rect(1244,34,2,572,5);
 line(34,34,94,34,10,3);line(34,34,34,94,10,3);line(1245,605,1185,605,10,3);line(1245,605,1245,545,10,3);
 rect(60,65,7,16,10);text("SIGNAL ROOM / SCHOOL 21",83,66,2.6,8,2);
 line(62,109,1218,109,4);
 const cx=930,cy=335;
 for(let r=220;r>=145;r-=5)disk(cx,cy,r,r>205?1:r>185?2:r>160?3:2);
 ring(cx,cy,218,1,5);ring(cx,cy,202,1,4);ring(cx,cy,154,2,7);
 for(const ry of [42,86,123])ellipse(cx,cy,154,ry,0,5,1);
 for(const rx of [46,91,127])ellipse(cx,cy,rx,154,0,5,1);
 line(cx-154,cy,cx+154,cy,6);line(cx,cy-154,cx,cy+154,6);
 for(let i=0;i<48;i++){const a=i*Math.PI/24;line(cx+210*Math.cos(a),cy+210*Math.sin(a),cx+218*Math.cos(a),cy+218*Math.sin(a),i%4===0?7:4,1);}
 ellipse(cx,cy,265,87,-.43,6,1);ellipse(cx,cy,265,87,-.43,10,3,0.2,3.15);
 ellipse(cx,cy,222,114,.59,7,1);
 for(const [a,rx,ry,rot,c] of [[.2,265,87,-.43,10],[3.15,265,87,-.43,10],[4.7,222,114,.59,7]]){const xx=rx*Math.cos(a),yy=ry*Math.sin(a),x=cx+xx*Math.cos(rot)-yy*Math.sin(rot),y=cy+xx*Math.sin(rot)+yy*Math.cos(rot);disk(x,y,6,c);ring(x,y,12,1,c);}
 rect(870,302,120,66,0);rect(870,302,120,2,5);rect(870,366,120,2,5);text("CORE",889,319,3,10,2.3);
 // Dominant custom 21% mark; no stock graphics.
 path([[88,190],[112,161],[151,147],[196,147],[230,166],[243,197],[231,228],[87,347],[247,347]],9,34);
 path([[285,187],[338,151],[338,347]],9,34);
 line(397,347,548,151,10,29);ring(422,182,34,18,10);ring(524,316,34,18,10);
 text("ФИНАНСОВЫЙ КЛУБ",74,400,4.3,9,3);
 text("ШКОЛА 21 / БЕЛГОРОД",75,454,2.8,8,2);
 line(75,508,624,508,5);rect(75,506,108,4,10);
 text("KNOW / TEST / BUILD",75,535,2.8,10,2);
 text("21% / FIELD NOTES",0,0,0,0,0); // percent mark is above; footer uses digits and lines.
 rect(60,572,1158,1,4);
 text("RESEARCH / PRACTICE / EXPERIMENTS / COMMUNITY",62,583,1.7,8,1);
 text("01 / SIGNAL",1080,583,1.65,10,1);
 // Encode a deterministic indexed PNG (4-bit palette, no external dependencies).
 const bytes=[137,80,78,71,13,10,26,10],be=n=>[(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255];
 const crcTable=Array.from({length:256},(_,i)=>{let c=i;for(let j=0;j<8;j++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
 const pushMany=(arr,data)=>{for(let i=0;i<data.length;i++)arr.push(data[i]);};
 function chunk(name,data){const type=Array.from(name,s=>s.charCodeAt(0));pushMany(bytes,be(data.length));pushMany(bytes,type);pushMany(bytes,data);let crc=0xffffffff;for(const v of type)crc=crcTable[(crc^v)&255]^(crc>>>8);for(const v of data)crc=crcTable[(crc^v)&255]^(crc>>>8);pushMany(bytes,be((crc^0xffffffff)>>>0));}
 chunk("IHDR",[...be(W),...be(H),4,3,0,0,0]);chunk("PLTE",colors.flat());
 const raw=new Uint8Array(H*(1+W/2));for(let y=0;y<H;y++)for(let x=0;x<W;x+=2)raw[y*(1+W/2)+1+x/2]=(p[y*W+x]<<4)|p[y*W+x+1];
 // Fixed Huffman DEFLATE with run-length matching at distance one.
 const z=[0x78,0x01];let acc=0,bits=0;
 function write(v,n){acc|=v<<bits;bits+=n;while(bits>=8){z.push(acc&255);acc>>>=8;bits-=8;}}
 const rev=(v,n)=>{let o=0;for(let i=0;i<n;i++){o=(o<<1)|(v&1);v>>>=1;}return o;};
 function code(v){if(v<144)write(rev(0x30+v,8),8);else if(v<256)write(rev(0x190+v-144,9),9);else if(v<280)write(rev(v-256,7),7);else write(rev(0xc0+v-280,8),8);}
 const lb=[3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258],le=[0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0];
 write(1,1);write(1,2);
 for(let i=0;i<raw.length;){let len=0;if(i>0&&raw[i]===raw[i-1])while(len<258&&i+len<raw.length&&raw[i+len]===raw[i-1])len++;if(len>=3){let k=lb.length-1;while(lb[k]>len)k--;code(257+k);if(le[k])write(len-lb[k],le[k]);write(0,5);i+=len;}else{code(raw[i]);i++;}}
 code(256);if(bits)z.push(acc&255);
 let a=1,b=0;for(const v of raw){a=(a+v)%65521;b=(b+a)%65521;}pushMany(z,be((b<<16)|a));chunk("IDAT",z);chunk("IEND",[]);return new Uint8Array(bytes);
}
const target=new URL('../docs/portal/social-preview.png',import.meta.url);const bytes=Buffer.from(buildSocial());
if(process.argv.includes('--check')){if(!readFileSync(target).equals(bytes))throw Error('Social cover differs from generator');console.log('PASS: reproducible social PNG, '+bytes.length+' bytes');}else writeFileSync(target,bytes);

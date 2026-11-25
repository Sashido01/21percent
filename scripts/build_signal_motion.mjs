// Reproducible 40-frame, 4.8-second decorative GIF; no external packages.
import { readFileSync, writeFileSync } from 'node:fs';
function makeMotion(){
  const W=640,H=144,N=40,delay=12;
  const palette=[[7,17,22],[10,24,30],[16,37,44],[24,48,57],[43,73,81],[71,104,111],[128,186,198],[176,194,194],[243,245,242],[50,78,42],[83,120,48],[132,176,62],[199,246,90],[223,255,157],[36,63,69],[19,31,37]];
  const out=[],put=(...b)=>out.push(...b),word=v=>put(v&255,(v>>8)&255),ascii=s=>put(...Array.from(s,c=>c.charCodeAt(0)));
  ascii("GIF89a");word(W);word(H);put(0xf7,0,0);
  for(let i=0;i<256;i++)put(...(palette[i]||[0,0,0]));
  const nodes=[78,239,400,561],mid=72;
  function frame(k){
    const a=new Uint8Array(W*H),t=k/(N-1),pos=38+t*564;
    function px(x,y,c){x=Math.round(x);y=Math.round(y);if(x>=0&&x<W&&y>=0&&y<H)a[y*W+x]=c;}
    function ln(x0,y0,x1,y1,c){const steps=Math.max(1,Math.ceil(Math.max(Math.abs(x1-x0),Math.abs(y1-y0))));for(let j=0;j<=steps;j++)px(x0+(x1-x0)*j/steps,y0+(y1-y0)*j/steps,c);}
    function circle(x,y,r,c){for(let j=0;j<360;j+=Math.max(1,Math.floor(35/r))){const q=j*Math.PI/180;px(x+r*Math.cos(q),y+r*Math.sin(q),c);}}
    function disk(x,y,r,c){for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++)if(dx*dx+dy*dy<=r*r)px(x+dx,y+dy,c);}
    function rect(x,y,w,h,c){ln(x,y,x+w,y,c);ln(x+w,y,x+w,y+h,c);ln(x+w,y+h,x,y+h,c);ln(x,y+h,x,y,c);}
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){if(x%20===0||y%20===0)a[y*W+x]=3;else if((x+y)%29===0&&y>12&&y<132)a[y*W+x]=1;}
    rect(5,5,W-11,H-11,4);rect(10,10,W-21,H-21,2);
    for(let x=18;x<623;x+=8){ln(x,13,x,15,4);ln(x,129,x,131,4);}
    const curve=x=>mid+15*Math.sin((x-78)*Math.PI/161);
    for(let x=30;x<610;x++){let y=curve(x);px(x,y,5);px(x,y+1,3);if(x<pos&&x>pos-104){let q=1-(pos-x)/104;px(x,y,q>.7?12:q>.3?11:10);px(x,y-1,q>.7?11:10);}}
    for(let i=0;i<nodes.length;i++){
      const x=nodes[i],active=Math.abs(pos-x)<49,passed=pos>=x;
      circle(x,mid,29,4);circle(x,mid,25,3);circle(x,mid,20,active?12:passed?11:6);disk(x,mid,17,1);
      for(let j=0;j<12;j++){const q=j*Math.PI/6;ln(x+31*Math.cos(q),mid+31*Math.sin(q),x+34*Math.cos(q),mid+34*Math.sin(q),active?11:4);}
      const c=active?12:passed?11:7;
      if(i===0){for(let h=0;h<3;h++){let q=x-10+h*9;rect(q,mid+7-(h+1)*5,5,(h+1)*5,c);}}
      if(i===1){ln(x,mid-10,x+11,mid-4,c);ln(x+11,mid-4,x,mid+2,c);ln(x,mid+2,x-11,mid-4,c);ln(x-11,mid-4,x,mid-10,c);ln(x-11,mid+2,x,mid+8,c);ln(x,mid+8,x+11,mid+2,c);}
      if(i===2){circle(x,mid,9,c);ln(x-13,mid,x+13,mid,c);ln(x,mid-13,x,mid+13,c);disk(x,mid,2,c);}
      if(i===3){for(let j=0;j<3;j++){const q=j*2*Math.PI/3-Math.PI/2;const u=x+10*Math.cos(q),v=mid+10*Math.sin(q);ln(x,mid,u,v,c);disk(u,v,3,c);}disk(x,mid,3,c);}
      ln(x-21,114,x+21,114,4);if(passed)ln(x-21,114,x+21,114,11);
    }
    const y=curve(pos);disk(pos,y,9,9);disk(pos,y,6,10);disk(pos,y,4,12);disk(pos,y,2,13);
    for(let x=20;x<620;x++){px(x,124,x<=20+600*t?12:3);}
    return a;
  }
  function lzw(a){
    // 8-bit minimum size, fixed 9-bit codes: clear before dictionary width increases.
    const bytes=[];let acc=0,bits=0;
    const emit=c=>{acc|=c<<bits;bits+=9;while(bits>=8){bytes.push(acc&255);acc>>>=8;bits-=8;}};
    let dict=new Map(),next=258,prefix=a[0];emit(256);
    for(let i=1;i<a.length;i++){
      const c=a[i],key=prefix*256+c;
      if(dict.has(key)){prefix=dict.get(key);continue;}
      emit(prefix);
      if(next<510){dict.set(key,next++);}else{emit(256);dict=new Map();next=258;}
      prefix=c;
    }
    emit(prefix);emit(257);if(bits)bytes.push(acc&255);
    return bytes;
  }
  for(let k=0;k<N;k++){
    put(0x21,0xf9,4,4);word(delay);put(0,0);
    put(0x2c);word(0);word(0);word(W);word(H);put(0,8);
    const b=lzw(frame(k));
    for(let j=0;j<b.length;j+=255){const z=b.slice(j,j+255);put(z.length,...z);}put(0);
  }
  put(0x3b);return new Uint8Array(out);
}
const path = new URL('../assets/brand/signal-motion.gif', import.meta.url);
const expected = Buffer.from(makeMotion());
if(process.argv.includes('--check')) {
  if (!readFileSync(path).equals(expected)) throw new Error('Motion asset differs from generator');
  console.log('PASS: deterministic motion GIF, ' + expected.length + ' bytes');
} else writeFileSync(path, expected);

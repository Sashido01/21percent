/* Shared visual grammar for the original research lens. */
const NS='http://www.w3.org/2000/svg';
const icons={
 cash:'<rect x="7" y="13" width="50" height="38" rx="6"/><circle cx="32" cy="32" r="10"/><path d="M13 21h7m24 22h7"/>',
 bank:'<path d="M5 22 32 7 59 22H5Zm7 7h40M10 55h44M18 29v19m14-19v19m14-19v19"/>',
 ruble:'<circle cx="32" cy="32" r="27"/><path d="M26 48V16h13c15 0 15 21 0 21H20m0 7h23"/>',
 card:'<rect x="6" y="13" width="52" height="38" rx="6"/><path d="M6 25h52M14 41h13"/>',
 qr:'<path d="M6 6h20v20H6zm32 0h20v20H38zM6 38h20v20H6zm32 0h8v8h-8zm12 12h8v8h-8zM38 52h5m8-14h7"/>',
 phone:'<rect x="16" y="3" width="32" height="58" rx="7"/><path d="M25 10h14m-11 43h8"/><rect x="23" y="20" width="18" height="22" rx="3"/>',
 people:'<circle cx="32" cy="19" r="10"/><path d="M13 56v-9a19 19 0 0 1 38 0v9m-45-3v-8m52 8v-8"/>',
 shop:'<path d="M8 25 15 8h34l7 17M10 25v31h44V25M4 25h56M25 56V37h14v19"/>',
 flow:'<circle cx="12" cy="32" r="7"/><circle cx="52" cy="12" r="7"/><circle cx="52" cy="52" r="7"/><path d="M19 32h12l14-20M31 32l14 20"/>',
 globe:'<circle cx="32" cy="32" r="27"/><ellipse cx="32" cy="32" rx="12" ry="27"/><path d="M5 32h54M11 18h42M11 46h42"/>',
 wifi:'<path d="M5 23a43 43 0 0 1 54 0M14 34a28 28 0 0 1 36 0M24 45a13 13 0 0 1 16 0"/><circle cx="32" cy="55" r="2"/>',
 shield:'<path d="M32 5 54 13v19c0 12-10 22-22 27C20 54 10 44 10 32V13Z"/><path d="m22 31 7 7 13-15"/>',
 calendar:'<rect x="8" y="13" width="48" height="43" rx="5"/><path d="M8 25h48M20 6v14m24-14v14M20 36h5m8 0h5m-18 10h5m8 0h5"/>',
 check:'<circle cx="32" cy="32" r="27"/><path d="m17 32 10 10 20-23"/>'
};
function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n}
function icon(name){const n=document.createElementNS(NS,'svg');n.setAttribute('viewBox','0 0 64 64');n.setAttribute('aria-hidden','true');n.setAttribute('class','rv-icon');n.setAttribute('fill','none');n.setAttribute('stroke','currentColor');n.setAttribute('stroke-width','2.4');n.setAttribute('stroke-linecap','round');n.setAttribute('stroke-linejoin','round');n.innerHTML=icons[name]||icons.ruble;return n}
function tile(item,i){const [glyph,value,label]=item,n=el('div','rv-tile');n.style.setProperty('--delay',i*55+'ms');n.append(icon(glyph),el('strong','rv-value',value),el('span','rv-label',label));return n}
export function renderResearchVisual(spec){const [tag,type,items,note,connector='→']=spec,fig=el('figure','research-visual rv-'+type);fig.append(el('figcaption','rv-tag',tag));const body=el('div','rv-body');fig.append(body);
 if(type==='bars'){const max=items.every(x=>x[2].endsWith('%'))?100:Math.max(1,...items.map(x=>x[1]));for(const [i,[label,value,display]] of items.entries()){const bar=el('div','rv-bar'),top=el('div','rv-bar-top');top.append(el('span','',label),el('strong','',display));const track=el('div','rv-track'),fill=el('i','');fill.style.setProperty('--width',value/max*100+'%');fill.style.setProperty('--delay',i*60+'ms');track.append(fill);bar.append(top,track);body.append(bar)}}
 else if(type==='forms'){for(const [i,[glyph,title,where,pay]] of items.entries()){const row=el('div','rv-form-row');row.style.setProperty('--delay',i*55+'ms');const copy=el('div','rv-form-copy');copy.append(el('strong','rv-form-title',title),el('span','rv-form-where',where),el('span','rv-form-pay',pay));row.append(icon(glyph),copy);body.append(row)}}
 else if(type==='rows'||type==='route'||type==='decision'){for(const [i,[glyph,heading,detail]] of items.entries()){const row=el('div','rv-explain-row');row.style.setProperty('--delay',i*55+'ms');const marker=el('span','rv-explain-marker');if(type==='route'){marker.append(el('span','rv-order',String(i+1).padStart(2,'0')))}else marker.append(icon(glyph));const copy=el('div','rv-explain-copy');copy.append(el('strong','rv-explain-title',heading),el('span','rv-explain-detail',detail));row.append(marker,copy);body.append(row);if(type==='route'&&i<items.length-1)body.append(el('div','rv-route-arrow','↓'))}}
 else if(type==='contrast'){for(const [title,left,right,detail] of items){const row=el('div','rv-contrast-row');row.append(el('strong','rv-contrast-title',title));const pair=el('div','rv-contrast-pair');pair.append(el('span','rv-contrast-side',left),el('span','rv-contrast-side',right));row.append(pair,el('p','rv-explain-detail',detail));body.append(row)}}
 else if(type==='timeline'){for(const [i,[date,label]] of items.entries()){const n=el('div','rv-date');n.style.setProperty('--delay',i*55+'ms');n.append(el('strong','',date),el('i',''),el('span','',label));body.append(n)}}
 else if(type==='fork'){body.append(tile(items[0],0));const branch=el('div','rv-branch');for(const [i,item] of items.slice(1).entries()){const line=el('div','rv-branch-line');line.append(el('i',''),tile(item,i+1));branch.append(line)}body.append(branch)}
 else {for(const [i,item] of items.entries()){if(i&&(type==='flow'||type==='transfer'))body.append(el('span','rv-arrow',connector));body.append(tile(item,i));}}
 fig.append(el('p','rv-note',note));return fig}

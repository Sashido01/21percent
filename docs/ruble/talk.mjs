// Public visual-first presentation. No presenter-only features or external dependencies.
export function makeTalkRoute(scenes){return [{mode:'start'},...scenes.flatMap((s,i)=>Array.from({length:s.count},(_,j)=>({mode:'scene',scene:i,branch:s.branch,reveal:j+1}))),{mode:'final'}]}
export function createTalkSession(scenes){const route=makeTalkRoute(scenes),seen=new Set(),maxReveals=new Map();let pos=0;function go(index){pos=Math.min(route.length-1,Math.max(0,index));const f=route[pos];if(f.mode==='scene'){seen.add(f.branch);maxReveals.set(f.scene,Math.max(maxReveals.get(f.scene)||0,f.reveal));}return f;}return {route,seen,maxReveals,go,get pos(){return pos},get frame(){return route[pos]}}}
if(typeof document!=='undefined'){
const $=id=>document.getElementById(id),root=$('main'),map=$('talk-map'),nodes=[...document.querySelectorAll('.talk-node')],scenes=[...document.querySelectorAll('.talk-scene')],items=scenes.map(s=>({branch:Number(s.dataset.branchIndex),count:Number(s.dataset.stepCount)})),session=createTalkSession(items),svg='http://www.w3.org/2000/svg';
const legacy=new Set(['essence','future','compare','use','personal','business','state','engineering','offline','earn','risks','plan','question-index','sources','evidence']);
function redirectLegacy(){const id=location.hash.slice(1);if(legacy.has(id)||/^(q-|src-|source-)/.test(id)){location.replace('detail.html'+location.hash);return true;}return false;}
if(!redirectLegacy()){
let overview=false,previousScene=-1;
const edges=nodes.map(()=>{const p=document.createElementNS(svg,'path');p.setAttribute('class','talk-edge');$('talk-edges').append(p);return p;});
const crossPairs=[[0,1],[0,2],[2,4],[2,5],[3,7],[5,6],[6,10],[7,8],[9,5],[10,11],[1,8]];
const cross=crossPairs.map(([a,b])=>{const p=document.createElementNS(svg,'path');p.setAttribute('class','talk-cross');$('talk-edges').append(p);return {p,a,b}});
function xy(n,compact){return {x:parseFloat(n.style.getPropertyValue(compact?'--cx':'--x'))*10,y:parseFloat(n.style.getPropertyValue(compact?'--cy':'--y'))*10}}
function path(a,b){return 'M'+a.x+' '+a.y+' Q'+a.x+' '+b.y+' '+b.x+' '+b.y}
function geometry(){const compact=root.dataset.mode==='scene'||matchMedia('(max-width:760px)').matches;const origin={x:500,y:compact?105:500};edges.forEach((p,i)=>p.setAttribute('d',path(origin,xy(nodes[i],compact))));cross.forEach(({p,a,b})=>p.setAttribute('d',path(xy(nodes[a],compact),xy(nodes[b],compact))));}
function render(){
 const f=session.frame,mode=overview?'overview':f.mode,start=mode==='start',final=mode==='final',focus=mode==='scene';
 root.dataset.mode=mode;root.dataset.activeBranch=focus?String(f.branch):'';
 $('talk-intro').hidden=!start;$('talk-final').hidden=!final;$('talk-overview').hidden=!overview;
 $('talk-scenes').hidden=!focus;
 nodes.forEach((n,i)=>{const show=!start&&(session.seen.has(i)||final),wasHidden=n.hidden;n.hidden=!show;n.classList.toggle('enter',show&&wasHidden);n.classList.toggle('active',focus&&f.branch===i);n.classList.toggle('unvisited',final&&!session.seen.has(i));n.setAttribute('aria-pressed',String(focus&&f.branch===i));edges[i].classList.toggle('on',show)});
 cross.forEach(({p,a,b})=>p.classList.toggle('on',!focus&&!start&&(session.seen.has(a)&&session.seen.has(b)||final)));
 scenes.forEach((s,i)=>{s.hidden=!focus||i!==f.scene;if(s.hidden)return;const reveal=f.reveal;s.dataset.revealCount=String(reveal);s.querySelectorAll('[data-reveal]').forEach(n=>{const shown=Number(n.dataset.reveal)<=reveal;const changed=n.dataset.visible!=='yes'&&shown;n.dataset.visible=shown?'yes':'no';n.classList.toggle('new-detail',changed&&previousScene===i);n.setAttribute('aria-hidden',String(!shown));});s.querySelectorAll('[data-insight]').forEach(p=>p.hidden=Number(p.dataset.insight)!==reveal);s.querySelectorAll('[data-before][data-after]').forEach(n=>n.textContent=reveal>=2?n.dataset.after:n.dataset.before);if(s.contains($('talk-wallet-balance'))){$('talk-wallet-balance').textContent=['1 000 ₽','650 ₽','0 ₽'][reveal-1];$('talk-wallet-action').textContent=['Пополнение','Оплата 350 ₽','Остаток выведен'][reveal-1];}if(previousScene!==i){s.querySelector('.talk-visual').scrollTop=0;}});
 if(focus)previousScene=f.scene;
 $('talk-count').textContent=String(session.pos+1).padStart(2,'0')+' / '+session.route.length;$('talk-branch-count').textContent=session.seen.size+' / '+nodes.length+' узлов';
 $('talk-progress').style.width=(session.pos/(session.route.length-1)*100)+'%';
 $('talk-status').textContent=start?'ВСТУПЛЕНИЕ':final?'ИТОГ':overview?'ОБЩАЯ КАРТА':'СВЯЗЬ '+String(f.branch+1).padStart(2,'0')+' / '+nodes.length;
 $('talk-foot-title').textContent=start?'Один рубль — три формы денег':final?'Подробное исследование доступно каждому':overview?'Изученные связи сохранены':nodes[f.branch].textContent.trim()+' · '+f.reveal+' / '+items[f.scene].count;
 $('talk-prev').disabled=session.pos===0&&!overview;
 $('talk-next').disabled=false;$('talk-next').textContent=overview?'Продолжить →':start?'Начать →':final?'К исследованию →':f.reveal<items[f.scene].count?'Раскрыть →':'Далее →';
 $('talk-overview-button').disabled=start;$('talk-overview-button').setAttribute('aria-pressed',String(overview));$('talk-overview-button').textContent=overview?'К шагу':'Карта';$('talk-core').disabled=start;
 geometry();
}
function go(pos){overview=false;session.go(pos);const hash=pos===0?'':('#slide-'+(session.pos+1));if(location.hash!==hash)history.replaceState(null,'',hash||location.pathname+location.search);render()}
function move(delta){if(overview){overview=false;render();return}if(delta>0&&session.frame.mode==='final'){location.href='detail.html';return}go(session.pos+delta)}
function toggleMap(){if(session.pos===0)return;overview=!overview;render()}
nodes.forEach((n,b)=>n.addEventListener('click',()=>{const i=session.route.findIndex(f=>f.mode==='scene'&&f.branch===b);if(i>=0)go(i)}));
$('talk-core').onclick=toggleMap;$('talk-overview-button').onclick=toggleMap;$('talk-prev').onclick=()=>move(-1);$('talk-next').onclick=()=>move(1);$('talk-full').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen?.();else document.documentElement.requestFullscreen?.().catch(()=>{});};
addEventListener('resize',geometry);addEventListener('hashchange',()=>{if(redirectLegacy())return;const m=location.hash.match(/^#slide-(\d+)$/);if(m)go(Number(m[1])-1);});
addEventListener('keydown',e=>{if(e.altKey||e.ctrlKey||e.metaKey||e.shiftKey||/^(INPUT|SELECT|TEXTAREA|BUTTON|A)$/.test(e.target.tagName)||e.target.isContentEditable)return;if(['ArrowRight','PageDown',' '].includes(e.key)){e.preventDefault();move(1)}else if(['ArrowLeft','PageUp'].includes(e.key)){e.preventDefault();move(-1)}else if(e.key.toLowerCase()==='m'||e.key.toLowerCase()==='ь'){e.preventDefault();toggleMap()}});
document.body.classList.add('talk-ready');$('talk-footer').hidden=false;$('talk-full').hidden=!document.fullscreenEnabled;const hash=location.hash.match(/^#slide-(\d+)$/);if(hash){const target=Math.min(session.route.length-1,Math.max(0,Number(hash[1])-1));for(let i=0;i<=target;i++)session.go(i);}render();
}
}

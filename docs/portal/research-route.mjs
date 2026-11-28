import {matches} from './research-search.mjs';
// A presentation is a persistent map, not a document with collapsible chapters.
export function buildResearchRoute(counts){
 const frames=[{mode:'start',b:-1,s:-1}];
 counts.forEach((count,b)=>{frames.push({mode:'map',b,s:-1});for(let s=0;s<count;s++)frames.push({mode:'focus',b,s});frames.push({mode:'return',b,s:count-1});});
 frames.push({mode:'final',b:-1,s:-1});return frames;
}
export function createResearchSession(counts){
 const route=buildResearchRoute(counts),visited=new Set(),complete=new Set(),revealed=counts.map(()=>new Set());let pos=0;
 function go(index){pos=Math.max(0,Math.min(route.length-1,index));const f=route[pos];if(f.b>=0){visited.add(f.b);if(f.mode==='focus')revealed[f.b].add(f.s);if(f.mode==='return'&&revealed[f.b].size===counts[f.b])complete.add(f.b);}return f;}
 return {route,visited,complete,revealed,go,get pos(){return pos},get frame(){return route[pos]},focusIndex:(b,s)=>route.findIndex(f=>f.mode==='focus'&&f.b===b&&f.s===s)};
}
export function initResearchRoute({summaries=[]}={}){
 const $=id=>document.getElementById(id),chapters=[...document.querySelectorAll('[data-chapter]')],nodes=[...document.querySelectorAll('.live-node')],stage=$('live-stage'),world=$('live-world'),main=$('main'),dialog=$('live-dialog'),dialogBody=$('live-dialog-body'),sources=$('sources'),finder=$('question-index'),search=$('faq-search');
 const data=chapters.map((chapter,b)=>{
  const steps=[...chapter.querySelectorAll('.r-step')].map((node,s)=>({node,title:node.querySelector('summary span:last-child').textContent.trim(),body:node.querySelector('.r-detail'),s}));
  const questions=[...chapter.querySelectorAll('[data-faq-item]')].map(node=>({node,title:node.querySelector('summary').textContent.trim(),body:node.querySelector('.faq-answer'),text:node.textContent,b}));
  return {chapter,steps,questions,title:nodes[b].querySelector('strong').textContent,lead:chapter.querySelector('.r-chapter-lead').textContent};
 });
 const session=createResearchSession(data.map(d=>d.steps.length)),questions=data.flatMap(d=>d.questions),allQuestions=new Map(questions.map(q=>[q.node.id,q]));
 let overview=false,question=null,questionList=false,mounted=null,panel=null,opener=null;
 const make=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n};
 function button(cls,txt,fn){const n=make('button',cls,txt);n.type='button';n.onclick=fn;return n;}
 const paths=[];
 const svg='http://www.w3.org/2000/svg';
 const pairs=[[0,1],[0,2],[2,4],[2,5],[3,7],[5,6],[6,10],[7,8],[9,5],[10,11],[1,8]];
 function path(){const p=document.createElementNS(svg,'path');$('live-edges').append(p);return p;}
 nodes.forEach(()=>{const p=path();p.setAttribute('class','live-edge');paths.push(p)});
 const cross=pairs.filter(([a,b])=>nodes[a]&&nodes[b]).map(([a,b])=>{const p=path();p.setAttribute('class','live-cross');return {p,a,b}});
 function point(n){const mobile=matchMedia('(max-width: 760px)').matches;return {x:parseFloat(n.style.getPropertyValue(mobile?'--mx':'--x'))*10,y:parseFloat(n.style.getPropertyValue(mobile?'--my':'--y'))*6};}
 function link(a,b){return 'M'+a.x+' '+a.y+' C'+(a.x+(b.x-a.x)*.5)+' '+a.y+' '+(a.x+(b.x-a.x)*.5)+' '+b.y+' '+b.x+' '+b.y;}
 function geometry(){
  const mobile=matchMedia('(max-width: 760px)').matches,core={x:500,y:mobile?54:300};
  paths.forEach((p,i)=>p.setAttribute('d',link(core,point(nodes[i]))));cross.forEach(({p,a,b})=>p.setAttribute('d',link(point(nodes[a]),point(nodes[b]))));
  const frame=session.frame,focus=!overview&&frame.mode==='focus'&&!mobile;
  if(focus){const p=point(nodes[frame.b]),w=stage.clientWidth,h=stage.clientHeight,z=1.16;world.style.transform='translate('+(w*.115-p.x*w/1000*z)+'px,'+(h*.44-p.y*h/600*z)+'px) scale('+z+')';}
  else world.style.transform='none';
 }
 data.forEach((d,i)=>{
  const c=d.chapter,store=make('div','live-store');store.hidden=true;for(const child of [...c.children])store.append(child);c.append(store);
  const context=make('div','live-context');context.append(make('p','micro','ВЕТКА '+String(i+1).padStart(2,'0')),make('h2','',d.title),make('p','',d.lead));d.context=context;c.append(context);
  const chain=make('div','live-chain'),lens=make('div','live-lens'),lensHead=make('div','live-lens-head'),lensBody=make('div','live-lens-body');lens.append(lensHead,lensBody);c.append(chain,lens);Object.assign(d,{store,chain,lens,lensHead,lensBody,links:new Map()});
 });
 function restore(){if(mounted){mounted.parent.append(mounted.body);mounted=null;}}
 function mount(item,d){restore();mounted={body:item.body,parent:item.node};d.lensBody.append(item.body);}
 function clearLens(d){restore();d.lensHead.replaceChildren();d.lensBody.replaceChildren();d.lensBody.scrollTop=0;}
 function titleFor(d,kind,title){d.lensHead.append(make('p','micro',kind),make('h3','',title));}
 function scrollChain(d){const active=d.chain.querySelector('[aria-current=true]');if(active){const r=active.getBoundingClientRect(),p=d.chain.getBoundingClientRect();if(r.left<p.left)d.chain.scrollLeft+=r.left-p.left;else if(r.right>p.right)d.chain.scrollLeft+=r.right-p.right;if(r.top<p.top)d.chain.scrollTop+=r.top-p.top;else if(r.bottom>p.bottom)d.chain.scrollTop+=r.bottom-p.bottom;}}
 function renderFocus(f){
  const d=data[f.b];clearLens(d);
  const shown=session.revealed[f.b];
  if(!d.qbutton){d.steps.forEach((s,i)=>{const n=make('div','live-link pending');n.append(make('span','live-link-index',String(i+1).padStart(2,'0')),make('span','','Следующее звено'));d.chain.append(n);d.links.set(i,n);});d.qbutton=button('live-link live-question-link','',()=>{question=null;questionList=true;render();});d.qbutton.append(make('span','live-link-index','?'),make('span','','Вопросы · '+d.questions.length));d.chain.append(d.qbutton);}
  d.steps.forEach((s,i)=>{let n=d.links.get(i);if(shown.has(i)&&!n.dataset.liveStep){const next=button('live-link','',()=>jump(f.b,i));next.dataset.liveStep=String(i);next.append(make('span','live-link-index',String(i+1).padStart(2,'0')),make('span','',s.title));n.replaceWith(next);d.links.set(i,next);n=next;}n.toggleAttribute('data-selected',!question&&!questionList&&i===f.s);if(!question&&!questionList&&i===f.s)n.setAttribute('aria-current','true');else n.removeAttribute('aria-current');});
  if(question||questionList)d.qbutton.setAttribute('aria-current','true');else d.qbutton.removeAttribute('aria-current');
  if(question){titleFor(d,'ВОПРОС / ПОДРОБНО',question.title);d.lensHead.append(button('button secondary live-small','← Все вопросы ветки',()=>{question=null;questionList=true;render()}));question.node.open=true;question.node.closest('[data-question-branch]').open=true;mount(question,d);}
  else if(questionList){titleFor(d,'УГЛУБЛЕНИЕ / '+d.title,'Вопросы по этой связи');const list=make('div','live-question-list');d.questions.forEach(q=>list.append(button('live-question-option',q.title,()=>openQuestion(q))));d.lensBody.append(list);}
  else{const s=d.steps[f.s];s.node.open=true;titleFor(d,'ЗВЕНО '+String(f.s+1).padStart(2,'0')+' / '+d.steps.length,s.title);mount(s,d);}
  d.lensBody.scrollTop=0;scrollChain(d);
 }
 function updateHash(hash){if(location.hash!==hash)history.replaceState(null,'',hash||location.pathname+location.search);}
 function render(){
  const f=session.frame,mode=overview?'overview':f.mode,focus=mode==='focus',isStart=mode==='start',final=mode==='final';restore();
  stage.dataset.mode=mode;main.dataset.liveMode=mode;world.dataset.focus=focus?'true':'false';
  document.querySelector('.r-intro').hidden=!isStart;document.querySelector('.live-intro-right').hidden=!isStart;
  chapters.forEach((c,i)=>c.hidden=!focus||i!==f.b);
  nodes.forEach((node,i)=>{const seen=session.visited.has(i),show=!isStart&&(seen||final);const entering=node.hidden&&show;node.hidden=!show;node.classList.toggle('revealed',show);node.classList.toggle('entering',entering);node.classList.toggle('dim',focus&&i!==f.b);node.classList.toggle('active',i===f.b&&(focus||mode==='map'));node.classList.toggle('complete',session.complete.has(i));node.classList.toggle('unvisited',final&&!seen);node.tabIndex=show&&(!focus||i===f.b)?0:-1;node.querySelector('.live-check').textContent=session.complete.has(i)?'✓':seen?'·':'○';paths[i].classList.toggle('on',show);paths[i].classList.toggle('dim',focus&&i!==f.b);});
  cross.forEach(({p,a,b})=>p.classList.toggle('on',!focus&&session.complete.has(a)&&session.complete.has(b)));
  $('live-core').disabled=isStart;$('live-core').tabIndex=focus||isStart?-1:0;$('live-core').classList.toggle('dim',focus);
  const msg=$('live-map-message');msg.hidden=focus||isStart;msg.textContent=isStart?'':final?'Вся система: '+session.complete.size+' из '+data.length+' веток изучено. Откройте любой узел, чтобы вернуться к деталям.':mode==='return'?'Связь сохранена. Следующий шаг добавит новую ветку.':mode==='overview'?'Изученные связи остаются на карте. Нажмите на узел для повторного изучения.':'Добавилась новая связь: '+data[f.b].title+'.';
  if(focus)renderFocus(f);
  $('live-title').textContent=isStart?'Цифровой рубль':final?'Вся система':focus?data[f.b].title:mode==='overview'?'Общая картина':data[f.b].title;
  $('step-label').textContent='RESEARCH / '+(focus?'РАСКРЫТИЕ СВЯЗИ':isStart?'ВСТУПЛЕНИЕ':final?'ИТОГ':'КАРТА');
  $('live-status').textContent=focus?'ЦЕПОЧКА / '+String(f.b+1).padStart(2,'0'):final?'ИТОГ':mode==='return'?'СВЯЗЬ СОХРАНЕНА':isStart?'ОДИН РУБЛЬ':'ЖИВАЯ КАРТА';
  $('system-summary').textContent=focus?summaries[f.b]||data[f.b].lead:final?'Сравнивайте пользу, риски и альтернативы; используйте цифровой рубль, только если он решает вашу задачу.':isStart?'Начните с привычных денег.':mode==='overview'?'Вернитесь к текущему шагу или откройте нужную связь.':data[f.b].lead;
  $('live-count').textContent=String(session.pos+1).padStart(2,'0')+' / '+session.route.length;$('progress-label').textContent=session.visited.size+' / '+data.length+' узлов';$('live-progress').style.width=(session.pos/(session.route.length-1)*100)+'%';
  $('r-prev').disabled=session.pos===0&&!overview&&!question&&!questionList;
  $('r-next').disabled=final&&!overview;$('r-next').textContent=overview?'К шагу →':question||questionList?'К цепочке →':isStart?'Начать →':final?'Завершено':mode==='map'?'Раскрыть →':mode==='return'?'Следующая связь →':f.s===data[f.b].steps.length-1?'К общей картине →':'Следующее звено →';
  $('show-all').disabled=isStart;$('show-all').setAttribute('aria-pressed',String(overview));$('show-all').textContent=overview?'К шагу':'Общая картина';geometry();
 }
 function go(index){overview=false;question=null;questionList=false;const f=session.go(index);if(f.mode==='focus')updateHash('#'+data[f.b].chapter.id);else if(f.mode==='start')updateHash('');render();}
 function jump(b,s=0){go(session.focusIndex(b,s));}
 function move(delta){if(dialog.open){dialog.close();return}if(question||questionList){question=null;questionList=false;updateHash('#'+data[session.frame.b].chapter.id);render();return}if(overview){overview=false;render();return}go(session.pos+delta);}
 function map(){if(session.pos===0)return;overview=!overview;question=null;questionList=false;render();}
 function openQuestion(q){const current=session.frame,b=q.b;if(current.mode!=='focus'||current.b!==b){const seen=[...session.revealed[b]];session.go(session.focusIndex(b,seen.length?Math.max(...seen):0));}overview=false;question=q;questionList=false;updateHash('#'+q.node.id);render();}
 function closePanel(){if(panel){main.insertBefore(panel,dialog);panel=null;}dialogBody.replaceChildren();if(opener?.isConnected)opener.focus({preventScroll:true});opener=null;}
 dialog.addEventListener('close',()=>{if(!dialog.open)closePanel()});$('live-dialog-close').onclick=()=>dialog.close();
 function openPanel(title,content,isPanel=false){if(dialog.open){dialog.close();closePanel()}opener=document.activeElement;$('live-dialog-title').textContent=title;dialogBody.replaceChildren(content);if(isPanel)panel=content;dialog.showModal();dialog.scrollTop=0;$('live-dialog-close').focus();}
 function showSources(anchor){openPanel('Источники и методика',sources,true);if(anchor&&anchor!==sources.id)document.getElementById(anchor)?.scrollIntoView({block:'start'});}
 function renderQuestions(){const results=$('question-results'),found=questions.filter(q=>matches(q.text,search.value));results.replaceChildren();$('faq-count').textContent='Найдено: '+found.length+' из '+questions.length;$('faq-empty').hidden=found.length!==0;found.forEach(q=>{const a=make('a','live-question-result');a.href='#'+q.node.id;a.append(make('small','micro',data[q.b].title),make('span','',q.title));a.onclick=e=>{e.preventDefault();dialog.close();closePanel();openQuestion(q);};results.append(a)});}
 function showFinder(){renderQuestions();openPanel('Вопросы внутри живой системы',finder,true);search.focus();}
 function showChapters(){const list=make('div','live-chapter-list');data.forEach((d,b)=>{const n=button('live-question-option',String(b+1).padStart(2,'0')+' / '+d.title,()=>{dialog.close();closePanel();jump(b)});n.dataset.jump=String(b);n.append(make('small','micro',session.complete.has(b)?'ИЗУЧЕНО':session.visited.has(b)?'ОТКРЫТО':'ЕЩЁ НЕ ИЗУЧЕНО'));list.append(n)});openPanel('Маршрут исследования',list);}
 function followHash(){const id=location.hash.slice(1);if(id==='question-index'){showFinder();return}if(id==='sources'||id.startsWith('source-')||id.startsWith('src-')){showSources(id);return}if(allQuestions.has(id)){openQuestion(allQuestions.get(id));return}const target=$(id);if(!target)return;const b=chapters.findIndex(c=>c.contains(target)||c===target);if(b<0)return;const s=data[b].steps.findIndex(s=>s.node.contains(target)||s.body.contains(target));jump(b,Math.max(0,s));if(s>=0&&target!==chapters[b])target.scrollIntoView({block:'nearest'});}
 document.addEventListener('click',e=>{const a=e.target.closest('a[href^="#"]');if(!a)return;const id=a.hash.slice(1);if(id==='main')return;if(id==='question-index'){e.preventDefault();showFinder();}else if(id==='sources'||id.startsWith('source-')||id.startsWith('src-')){e.preventDefault();showSources(id)}else if(allQuestions.has(id)){e.preventDefault();openQuestion(allQuestions.get(id))}else if(chapters.some(c=>c.id===id)){e.preventDefault();const b=chapters.findIndex(c=>c.id===id);jump(b,session.frame.b===b?Math.max(0,session.frame.s):0);}});
 nodes.forEach((n,b)=>n.onclick=()=>{if(session.frame.mode==='map'&&session.frame.b===b&&!overview){move(1);return}const seen=[...session.revealed[b]];jump(b,seen.length?Math.max(...seen):0)});
 $('live-core').onclick=map;$('show-all').onclick=map;$('r-prev').onclick=()=>move(-1);$('r-next').onclick=()=>move(1);$('live-chapters').onclick=showChapters;
 $('live-full').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen?.();else document.documentElement.requestFullscreen?.().catch(()=>{});};
 search.addEventListener('input',renderQuestions);$('faq-clear').onclick=()=>{search.value='';renderQuestions();search.focus()};
 addEventListener('hashchange',followHash);addEventListener('resize',geometry);
 addEventListener('keydown',e=>{if(dialog.open||e.altKey||e.ctrlKey||e.metaKey||/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)||e.target.isContentEditable)return;if(['ArrowRight','PageDown'].includes(e.key)){e.preventDefault();move(1)}else if(['ArrowLeft','PageUp'].includes(e.key)){e.preventDefault();move(-1)}else if(e.key.toLowerCase()==='m'||e.key.toLowerCase()==='ь'){e.preventDefault();map()}});
 document.body.classList.add('live-ready');world.hidden=false;$('r-navigation').hidden=false;$('live-chapters').hidden=false;$('live-full').hidden=false;render();if(location.hash){try{followHash();}catch(e){main.dataset.linkError=String(e);throw e;}}
}

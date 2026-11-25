import {VERSION,BASE,resources,projects,categoryNames,selectResources} from './content.mjs';
import {realReturn,reserveCalc} from './calculations.mjs';
import {previews} from './previews.mjs';
const $=id=>document.getElementById(id);
const el=(tag,text,cls)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node;};
const number=new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2,minimumFractionDigits:0});
const money=new Intl.NumberFormat('ru-RU',{style:'currency',currency:'RUB',maximumFractionDigits:2});
const fmt=n=>number.format(Math.abs(n)<1e-9?0:n);
const rub=n=>money.format(Math.abs(n)<.005?0:n);
const val=id=>$(id).valueAsNumber;
const glyphPaths={"research":"M5 4h14v16H5z M8 8h8 M8 12h8 M8 16h5","practice":"M4 19h16 M6 16V9h3v7 M11 16V5h3v11 M16 16v-4h3v4","community":"M12 5a3 3 0 1 0 0 6 3 3 0 0 0 0-6 M5 19v-2c0-3 3-5 7-5s7 2 7 5v2 M3 7a2 2 0 1 0 0 4 M21 7a2 2 0 1 1 0 4","invest":"M3 18h18 M4 15l5-5 4 3 7-8 M15 5h5v5","finplay":"M8 7h8l4 8-2 2-4-3h-4l-4 3-2-2z M8 10v4 M6 12h4 M16 11h.1 M18 13h.1","cash404":"M4 5h16v14H4z M7 9h4 M7 13h3 M15 9v5 M15 17h.1","auction":"M6 6l4-4 6 6-4 4z M10 10l9 9 M3 20h10","moneyhub":"M12 3l8 5v8l-8 5-8-5V8z M12 3v18 M4 8l16 8 M20 8L4 16","tax":"M5 3h14v18H5z M8 7h8 M9 11h.1 M15 17h.1 M8 18l8-8"};
const projectKeys=['invest','finplay','cash404','auction','moneyhub','tax'];
const ns='http://www.w3.org/2000/svg';
function glyph(key){const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.classList.add('card-glyph');const path=document.createElementNS(ns,'path');path.setAttribute('d',glyphPaths[key]);path.setAttribute('fill','none');path.setAttribute('stroke','currentColor');path.setAttribute('stroke-width','1.5');path.setAttribute('stroke-linecap','round');path.setAttribute('stroke-linejoin','round');svg.append(path);return svg;}
function highlight(node,value,query){
 const words=query.trim().split(/\s+/).filter(Boolean).sort((a,b)=>b.length-a.length);if(!words.length){node.textContent=value;return;}
 const lower=value.toLocaleLowerCase('ru-RU');let i=0;
 while(i<value.length){let hit=-1,word='';for(const term of words){const pos=lower.indexOf(term.toLocaleLowerCase('ru-RU'),i);if(pos>=0&&(hit<0||pos<hit)){hit=pos;word=term;}}if(hit<0){node.append(document.createTextNode(value.slice(i)));break;}node.append(document.createTextNode(value.slice(i,hit)),el('mark',value.slice(hit,hit+word.length)));i=hit+word.length;}
}
const reader=$('reader');let readerTrigger=null;
function openReader(item,trigger){
 readerTrigger=trigger;$('reader-category').textContent=categoryNames[item.category];$('reader-title').textContent=item.title;$('reader-source').href=BASE+item.path;
 // Treat all source text as text, never inject Markdown or HTML into the DOM.
 const body=$('reader-body');body.replaceChildren();let list=null;
 for(const raw of previews[item.path].split('\n')){const line=raw.trim();if(!line){list=null;continue;}const clean=s=>s.replace(/\*\*([^*]+)\*\*/g,'$1').replace(/\[([^\]]+)\]\([^)]+\)/g,'$1').replace(/\x60([^\x60]+)\x60/g,'$1');if(/^#\s/.test(line))continue;const heading=line.match(/^#{2,6}\s+(.+)/);if(heading){body.append(el('h3',clean(heading[1])));list=null;continue;}const bullet=line.match(/^[-*]\s+(.+)/);const numbered=line.match(/^\d+\.\s+(.+)/);if(bullet||numbered){const tag=bullet?'ul':'ol';if(!list||list.tagName.toLowerCase()!==tag){list=el(tag);body.append(list);}list.append(el('li',clean((bullet||numbered)[1])));continue;}list=null;body.append(el('p',clean(line)));}
 reader.showModal();$('reader-close').focus();
}
$('reader-close').addEventListener('click',()=>reader.close());reader.addEventListener('close',()=>{if(readerTrigger?.isConnected)readerTrigger.focus();});
function itemCard(item,isProject=false){
 const card=el('article',undefined,isProject?'project':'resource');const key=isProject?projectKeys[projects.indexOf(item)]:item.category;
 card.dataset.kind=key;const head=el('div',undefined,'card-top');head.append(glyph(key),el('span',isProject?item.status:categoryNames[item.category],'micro'));card.append(head);
 const title=el('h3'),description=el('p');highlight(title,item.title,isProject?'':$('search').value);highlight(description,item.description,isProject?'':$('search').value);card.append(title,description);
 const link=el('a',isProject?'Подробнее ↗':'Оригинал ↗');link.href=BASE+item.path;link.setAttribute('aria-label',item.title+' — открыть материал на GitHub');
 const actions=el('div',undefined,'card-actions');if(!isProject&&typeof reader.showModal==='function'){const button=el('button','Читать','reader-open');button.type='button';button.setAttribute('aria-label','Читать: '+item.title);button.addEventListener('click',()=>openReader(item,button));actions.append(button);}actions.append(link);card.append(actions);return card;
}
let filter='all';
function renderLibrary(){
 const found=selectResources($('search').value,filter);
 $('resource-grid').replaceChildren(...found.map(item=>itemCard(item)));
 if(!found.length)$('resource-grid').append(el('p','Ничего не найдено. Измените запрос или категорию.','empty'));
 $('search-status').textContent='Материалов найдено: '+found.length+' из '+resources.length;
 $('clear-search').hidden=!$('search').value&&filter==='all';
}
$('library-controls').hidden=false;
$('search').addEventListener('input',renderLibrary);
$('clear-search').addEventListener('click',()=>{filter='all';$('search').value='';document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter==='all')));renderLibrary();$('search').focus();});
document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{
 filter=button.dataset.filter;
 document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
 renderLibrary();
}));
$('resource-count').textContent=resources.length+' материалов';
$('project-count').textContent=projects.length+' инициатив';
$('version').textContent=VERSION;
$('project-grid').replaceChildren(...projects.map(item=>itemCard(item,true)));
renderLibrary();
function paintChart(id,items,format,note,outcome){
 const max=Math.max(1e-12,...items.map(item=>item[1]));
 for(const [key,value] of items){$(id+'-'+key+'-value').textContent=format(value);$(id+'-'+key+'-bar').style.width=(100*Math.max(0,value)/max)+'%';}
 const chart=$(id);chart.dataset.outcome=outcome;$(id+'-note').textContent=note;
}
function bindCalc(formId,errorId,resultId,calculate){
 const form=$(formId),err=$(errorId),result=$(resultId),chart=$(resultId.replace('-result','-chart'));
 function update(event){
  if(event)event.preventDefault();
  try{if(!form.checkValidity())throw new RangeError('Проверьте заполнение полей и допустимые диапазоны.');calculate();err.hidden=true;result.hidden=false;chart.hidden=false;}
  catch(e){result.hidden=true;chart.hidden=true;err.textContent=e instanceof RangeError?e.message:'Не удалось выполнить расчёт.';err.hidden=false;}
 }
 form.noValidate=true;
 form.addEventListener('submit',update);
 form.addEventListener('input',update);
 update();
}
bindCalc('real-form','real-error','real-result',()=>{
 const r=realReturn(val('capital'),val('nominal'),val('inflation'));
 $('real-rate').textContent=fmt(r.rate)+'%';$('real-nominal').textContent=rub(r.nominalValue);$('real-value').textContent=rub(r.realValue);$('real-delta').textContent=rub(r.delta);
 const outcome=r.rate>1e-9?'positive':r.rate<-1e-9?'negative':'neutral';
 paintChart('real-chart',[['start',val('capital')],['nominal',r.nominalValue],['real',r.realValue]],rub,'Общая шкала сумм. '+(outcome==='positive'?'Покупательная способность выросла.':outcome==='negative'?'Покупательная способность снизилась.':'Покупательная способность не изменилась.'),outcome);
});
bindCalc('reserve-form','reserve-error','reserve-result',()=>{
 const r=reserveCalc(val('income'),val('expenses'),val('reserve'),val('shock'));
 $('reserve-months').textContent=fmt(r.months)+' мес.';$('reserve-before').textContent=fmt(r.before)+' мес.';$('reserve-gap').textContent=rub(r.gap);$('reserve-recovery').textContent=r.recovery===null?'Нет свободного остатка':fmt(r.recovery)+' мес.';
 paintChart('reserve-chart',[['before',r.before],['after',r.months]],value=>fmt(value)+' мес.','Общая шкала месяцев. '+(r.gap>0?'Резерва недостаточно: дефицит '+rub(r.gap)+'.':r.remaining===0?'Резерв исчерпан.':'После расхода осталось '+rub(r.remaining)+'.'),r.gap>0||r.remaining===0?'negative':'neutral');
});
const motion=$('motion-toggle'),preference=window.matchMedia('(prefers-reduced-motion: reduce)');
function motionState(paused){
 document.documentElement.dataset.motion=paused?'paused':'running';
 motion.setAttribute('aria-pressed',String(paused));
 motion.textContent=preference.matches?'Движение отключено системой':paused?'Возобновить движение':'Приостановить движение';
 motion.disabled=preference.matches;
}
motion.hidden=false;motionState(preference.matches);
motion.addEventListener('click',()=>motionState(document.documentElement.dataset.motion==='running'));
preference.addEventListener('change',event=>motionState(event.matches));

// Enhance the four native links only after JavaScript initializes.
const coreModules=[{"id":"research","name":"Исследования","label":"RESEARCH / 01","desc":"Факты, первоисточники и проверяемые финансовые гипотезы.","cta":"Открыть библиотеку"},{"id":"practice","name":"Практикум","label":"PRACTICE / 02","desc":"Сценарии, расчёты и финансовые решения на конкретных числах.","cta":"Перейти к расчётам"},{"id":"projects","name":"Эксперименты","label":"EXPERIMENTS / 03","desc":"Игровые форматы, исследования и совместные технологические проекты.","cta":"Посмотреть инициативы"},{"id":"community","name":"Сообщество","label":"COMMUNITY / 04","desc":"Встречи, открытые обсуждения и совместная работа участников.","cta":"Присоединиться"}];
const coreButtons=[];
function selectCore(id){
 const module=coreModules.find(item=>item.id===id);if(!module)return;
 $('signal-map').dataset.module=id;
 for(const button of coreButtons)button.setAttribute('aria-pressed',String(button.dataset.module===id));
 $('core-label').textContent=module.label;$('core-title').textContent=module.name;$('core-desc').textContent=module.desc;
 const enter=$('core-enter');enter.href='#'+id;enter.textContent=module.cta+' ↗';
}
document.querySelectorAll('[data-module-select]').forEach(link=>{
 const button=document.createElement('button');button.type='button';button.className=link.className;button.dataset.module=link.dataset.moduleSelect;
 button.append(...Array.from(link.childNodes).map(node=>node.cloneNode(true)));
 button.setAttribute('aria-controls','core-preview');button.addEventListener('click',()=>selectCore(button.dataset.module));
 link.replaceWith(button);coreButtons.push(button);
});
$('core-preview').hidden=false;selectCore('research');
const sectionLinks=Array.from(document.querySelectorAll('.nav a[href^="#"]'));
function highlightSection(id){for(const link of sectionLinks){if(link.hash==='#'+id)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');}}
function activeSection(){
 const threshold=Math.min(220,window.innerHeight*.35);let current='';
 for(const link of sectionLinks){const section=document.getElementById(link.hash.slice(1));if(section&&section.getBoundingClientRect().top<=threshold)current=section.id;}
 highlightSection(current);
}
for(const link of sectionLinks)link.addEventListener('click',()=>highlightSection(link.hash.slice(1)));
let scrollPending=false;window.addEventListener('scroll',()=>{if(scrollPending)return;scrollPending=true;requestAnimationFrame(()=>{activeSection();scrollPending=false;});},{passive:true});
window.addEventListener('hashchange',()=>highlightSection(location.hash.slice(1)));activeSection();

const realScenarios={base:[12,8],inflation:[12,20],loss:[-10,8]};
$('real-scenarios').hidden=false;
for(const button of document.querySelectorAll('[data-real-scenario]'))button.addEventListener('click',()=>{const pair=realScenarios[button.dataset.realScenario];$('nominal').value=pair[0];$('inflation').value=pair[1];$('nominal').dispatchEvent(new Event('input',{bubbles:true}));});

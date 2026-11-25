import {VERSION,BASE,resources,projects,categoryNames,selectResources} from './content.mjs';
import {realReturn,reserveCalc} from './calculations.mjs';
const $=id=>document.getElementById(id);
const el=(tag,text,cls)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node;};
const number=new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2,minimumFractionDigits:0});
const money=new Intl.NumberFormat('ru-RU',{style:'currency',currency:'RUB',maximumFractionDigits:2});
const fmt=n=>number.format(Math.abs(n)<1e-9?0:n);
const rub=n=>money.format(Math.abs(n)<.005?0:n);
const val=id=>$(id).valueAsNumber;
function itemCard(item,isProject=false){
 const card=el('article',undefined,isProject?'project':'resource');
 card.append(el('span',isProject?item.status:categoryNames[item.category],'micro'),el('h3',item.title),el('p',item.description));
 const link=el('a',isProject?'Подробнее ↗':'Открыть материал ↗');
 link.href=BASE+item.path;link.setAttribute('aria-label',item.title+' — открыть материал на GitHub');card.append(link);return card;
}
let filter='all';
function renderLibrary(){
 const found=selectResources($('search').value,filter);
 $('resource-grid').replaceChildren(...found.map(item=>itemCard(item)));
 if(!found.length)$('resource-grid').append(el('p','Ничего не найдено. Измените запрос или категорию.','empty'));
 $('search-status').textContent='Материалов найдено: '+found.length+' из '+resources.length;
}
$('library-controls').hidden=false;
$('search').addEventListener('input',renderLibrary);
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

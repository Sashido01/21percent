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
function bindCalc(formId,errorId,resultId,calculate){
 const form=$(formId),err=$(errorId),result=$(resultId);
 function update(event){
  if(event)event.preventDefault();
  try{if(!form.checkValidity())throw new RangeError('Проверьте заполнение полей и допустимые диапазоны.');calculate();err.hidden=true;result.hidden=false;}
  catch(e){result.hidden=true;err.textContent=e instanceof RangeError?e.message:'Не удалось выполнить расчёт.';err.hidden=false;}
 }
 form.noValidate=true;
 form.addEventListener('submit',update);
 form.addEventListener('input',update);
 update();
}
bindCalc('real-form','real-error','real-result',()=>{
 const r=realReturn(val('capital'),val('nominal'),val('inflation'));
 $('real-rate').textContent=fmt(r.rate)+'%';$('real-nominal').textContent=rub(r.nominalValue);$('real-value').textContent=rub(r.realValue);$('real-delta').textContent=rub(r.delta);
});
bindCalc('reserve-form','reserve-error','reserve-result',()=>{
 const r=reserveCalc(val('income'),val('expenses'),val('reserve'),val('shock'));
 $('reserve-months').textContent=fmt(r.months)+' мес.';$('reserve-before').textContent=fmt(r.before)+' мес.';$('reserve-gap').textContent=rub(r.gap);$('reserve-recovery').textContent=r.recovery===null?'Нет свободного остатка':fmt(r.recovery)+' мес.';
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

export const VERSION = '0.0.11';
export const BASE = 'https://github.com/Sashido01/21percent/blob/main/';
export const resources = [
 {id:'verify',category:'research',title:'Как проверить финансовую новость',description:'Первоисточники, даты, определения, расчёты и ограничения.',path:'research/METHOD.md'},
 {id:'template',category:'research',title:'Шаблон исследования',description:'От проверяемого утверждения до фактов, гипотез и вывода.',path:'research/TEMPLATE.md'},
 {id:'real',category:'practice',title:'Что осталось после инфляции?',description:'Номинальная и реальная доходность, покупательная способность.',path:'practice/01-real-return.md'},
 {id:'reserve',category:'practice',title:'Резерв и непредвиденный расход',description:'Ликвидность, обязательные расходы и финансовая устойчивость.',path:'practice/02-reserve.md'},
 {id:'event',category:'community',title:'Подготовить встречу',description:'Сценарий, цели, фактические результаты и следующий шаг.',path:'events/TEMPLATE.md'},
 {id:'contribute',category:'community',title:'Как внести вклад',description:'Предложить идею, исследование, учебный кейс или проект.',path:'CONTRIBUTING.md'}
];
export const projects = [
 {title:'21% INVEST',status:'Практика обсуждений',description:'Личный инвестиционный эксперимент организатора. Не общий счёт и не управление чужими средствами.',path:'projects/INVEST.md'},
 {title:'FinPlay',status:'Разработка / прототип',description:'Многопользовательский игровой образовательный формат.',path:'projects/README.md'},
 {title:'CASH404',status:'Разработка',description:'Интерактивный финансовый детектив.',path:'projects/README.md'},
 {title:'Аукцион знаний',status:'Идея',description:'Игровой обмен знаниями и обсуждение финансовых вопросов.',path:'projects/README.md'},
 {title:'MoneyHub',status:'Идея',description:'Направление совместного финансового технологического проекта.',path:'projects/README.md'},
 {title:'Налоговый калькулятор',status:'Идея',description:'Инструмент учебных расчётов с проверяемыми правилами.',path:'projects/README.md'}
];
export const categoryNames = {research:'Исследования',practice:'Практика',community:'Сообщество'};
export function selectResources(query='',category='all'){
 const words=query.trim().toLocaleLowerCase('ru-RU').split(/\s+/).filter(Boolean);
 return resources.filter(item=>(category==='all'||item.category===category)&&words.every(word=>[item.title,item.description,categoryNames[item.category]].join(' ').toLocaleLowerCase('ru-RU').includes(word)));
}

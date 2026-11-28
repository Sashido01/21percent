export const VERSION = '0.0.20';
export const BASE = 'https://github.com/Sashido01/21percent/blob/main/';
export const researchPublications = [
  {
    "id": "ruble",
    "title": "Цифровой рубль",
    "description": "Единая живая карта: 12 веток, 32 визуальные схемы, 51 вопрос. Полный текст и модели раскрываются на каждом этапе.",
    "date": "2026-11-28",
    "category": "Деньги и платежи",
    "page": "ruble/",
    "format": "interactive",
    "keywords": "цифровой рубль СБП пенсия зарплата комиссии кошелёк безопасность бизнес будущее",
    "questionAnchor": "#question-index",
    "sourceChecks": [
      {
        "source": "cbr",
        "status": "reviewed",
        "date": "2026-11-28",
        "query": "site:cbr.ru цифровой рубль вопросы ответы добровольно наличные офлайн",
        "links": ["https://www.cbr.ru/faq/dr/"]
      },
      {
        "source": "habr",
        "status": "reviewed",
        "date": "2026-11-28",
        "query": "site:habr.com цифровой рубль зачем нам цифровой рубль комментарии",
        "links": ["https://habr.com/ru/companies/rshb/articles/1031170/comments/","https://habr.com/ru/articles/946840/comments/"]
      },
      {
        "source": "reddit",
        "status": "reviewed",
        "date": "2026-11-28",
        "query": "site:reddit.com цифровой рубль СБП наличные; digital euro CBDC cash privacy offline payments",
        "links": ["https://www.reddit.com/r/eupersonalfinance/comments/1qh4ifk/how_do_do_you_feel_about_the_digital_euro/","https://www.reddit.com/r/EU_Economics/comments/1qbertn/the_digital_euro_let_the_public_interest_prevail/"],
        "note": "Международные ветки открыты; российские — индекс, прямой доступ недоступен"
      }
    ]
  }
];
export const recentResearch=(limit=3)=>[...researchPublications].sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id)).slice(0,limit);
export const resources = [
 ...researchPublications.map(item=>({id:item.id,category:'research',title:item.title,description:item.description,keywords:item.keywords||'',path:'docs/'+item.page+'index.html',page:item.page,questions:item.questionAnchor?item.page+item.questionAnchor:undefined})),
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
 return resources.filter(item=>(category==='all'||item.category===category)&&words.every(word=>[item.title,item.description,item.keywords||"",categoryNames[item.category]].join(' ').toLocaleLowerCase('ru-RU').includes(word)));
}

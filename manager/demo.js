/* Демо-данные: структура и справочники как в таблице, кандидаты вымышленные (Кандидат №…, телефоны 7900…). */
(function(){
var L={statuses:['Новый','В обработке','Собеседование назначено','Собеседование проведено','Оффер сделан','Трудоустроен','Вышел на смену','Отказ кандидата','Отказ компании','Не вышел на смену','Прошел стажировку','Подтвердил прибытие','Заселился'],
sources:['Авито','HeadHunter','Реферальная программа','Telegram','Ярмарка вакансий','Листовки/наружная реклама','Другое'],
vacancies:['Комплектовщик','Грузчик','Водитель эл погрузчика до 4 квт','Водитель эл погрузчика свыше 4 квт'],
recruiters:['Дарья','Любовь','Шаповалов Влад','Минаков Анатолий','Алиса Забота'],
reasons:['Не устроила ЗП','Не устроил график','Не устроила локация/логистика','Не прошёл проверку СБ','Не вышел на связь','Нашёл другую работу','Медицинские противопоказания','Низкое качество предоставляемых услуг']};
var sites=['Химки -1 ( склад Лемано ПРО)','Химки -2 ( склад Лемано ПРО)','Химки -3 ( склад Лемано ПРО) Северная Звезда'];
var wS=[0,0,0,1,34,11,38,55,21,2,20,11,4],wR=[70,93,17,3,2],wSrc=[145,0,8,0,0,0,44];
var seed=7;function rnd(){seed=(seed*16807)%2147483647;return seed/2147483647}
function pick(a,w){var t=w.reduce(function(s,x){return s+x},0),r=rnd()*t;for(var i=0;i<a.length;i++){r-=w[i];if(r<0)return a[i]}return a[0]}
function d(off){var x=new Date(2026,10,3);x.setDate(x.getDate()-off);return x.toISOString().slice(0,10)}
var C=[];for(var i=0;i<197;i++){var off=Math.floor(rnd()*125),st=pick(L.statuses,wS),out=/Трудоустроен|Вышел на смену|Прошел стажировку|Заселился/.test(st);
var site=pick(sites,[50,69,60]);C.push({row:5+i,date:d(off),fio:'Кандидат №'+(i+1),phone:'7900'+String(1000000+i*37).slice(0,7),source:pick(L.sources,wSrc),vacancy:pick(L.vacancies,[3,1,2,4]),object:site.indexOf('Звезда')>0?'Северная звезда':'Химки',
resp:pick(L.recruiters,wR),status:st,interview:d(Math.max(0,off-1)),plan:d(Math.max(0,off-3)),fact:out?d(Math.max(0,off-3)):'',days:out?Math.floor(rnd()*4):Math.floor(rnd()*30),
reason:/Отказ/.test(st)?pick(L.reasons,[2,2,2,1,6,3,1,1]):'',comment:'',site:site,brief:'Адрес: МО, д Елино к21 (до работы добираются за счет компании, такси) | Описание: Склад строительных материалов | Проживание: да (333 ₽ в сутки)',
docs:{passport:rnd()>.1,inn:rnd()>.2,snils:rnd()>.25,tractor:rnd()>.5},citizenship:'РФ',gender:rnd()>.15?'Мужской':'Женский',psycho:rnd()>.6?'действует':'нет справки'})}
var LS=['Новый лид','Думает / перезвонить','Планирует приехать','Передан в CRM','Нецелевой','Отказ лида'],Ld=[];
for(i=0;i<60;i++){var o=Math.floor(rnd()*45),s=pick(LS,[10,25,8,10,4,8]);Ld.push({row:13+i,date:d(o),fio:'Лид №'+(i+1),phone:'7911'+String(2000000+i*53).slice(0,7),source:'Авито',vacancy:pick(L.vacancies,[3,1,2,4]),site:pick(sites,[1,2,1]),resp:pick(L.recruiters,[5,6,1,0,0]),status:s,next:/Думает|Новый|Планирует/.test(s)?'Перезвонить':'',nextDate:/Думает|Новый|Планирует/.test(s)?d(Math.floor(rnd()*10)-4):'',plan:s==='Планирует приехать'?d(-Math.floor(rnd()*7)):'',transferred:s==='Передан в CRM'?d(o-2):'',days:o,crmStatus:s==='Передан в CRM'?'Оффер сделан':'—',comment:''})}
var A=[];C.filter(function(c){return c.fact}).slice(0,40).forEach(function(c){var sh=Math.floor(rnd()*12);A.push({fio:c.fio,vacancy:c.vacancy,start:c.fact,mentor:pick(['Шаповалов Влад','Минаков Анатолий','Любовь'],[1,1,1]),status:sh>=5?'Адаптация пройдена':(rnd()>.85?'Уволен на испытательном сроке':'Проходит адаптацию'),site:c.site,resp:c.resp,shifts:sh,five:sh>=5?'Да':'Нет',reward:sh>=5?3000:0,payStatus:sh>=5?(rnd()>.5?'Выплачено':'Начислено'):'Не начислено',payDate:''})});
window.MGR_DEMO={ok:true,user:{name:'Демо: руководитель',role:'admin'},fetchedAt:Date.now(),lists:L,candidates:C,leads:Ld,adapt:A,
needs:[{site:sites[0],need:10,closed:14,inWork:4,left:0},{site:sites[1],need:10,closed:15,inWork:29,left:0},{site:sites[2],need:20,closed:13,inWork:36,left:7}]};
})();

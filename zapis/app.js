/* Запись исполнителей на выходы (ZAPIS_APP_V1.2, UI v=11, тёмная тема) */
(function(){
var VER=11, CFG=window.ZAPIS_CONFIG||{}, LIVE=CFG.mode==='live'&&/^https:\/\/script\.google\.com\//.test(CFG.apiUrl||'');
var D=null, E=null, C=null, CP=null, tab='slots', mineSeg='up', F={site:'',date:'',q:''}, role='', loadSeq=0, EP='', CPid='', searchOn=false;
var $ = function(s, r){return (r||document).querySelector(s)};
var TOKEN='zapisToken', KIND='zapisKind';
var THEMES=[
  {bg:'#2A2350',soft:'#1C1833',acc:'#7C6CFF',ink:'#fff'},
  {bg:'#123A2E',soft:'#0F241E',acc:'#22C08A',ink:'#fff'},
  {bg:'#3D2414',soft:'#24170F',acc:'#FF8A3D',ink:'#fff'},
  {bg:'#14284D',soft:'#0F1A30',acc:'#4F8BFF',ink:'#fff'},
  {bg:'#3A3112',soft:'#221D0E',acc:'#F2B51B',ink:'#1A1400'},
  {bg:'#3F1530',soft:'#26101E',acc:'#FF4D8D',ink:'#fff'}
];
var WD=['вс','пн','вт','ср','чт','пт','сб'];
var MONTHS=['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
var ICO={
  cal:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  map:'<path d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.2"/>',
  bag:'<path d="M6 7h12l1 13H5L6 7z"/><path d="M9 7V6a3 3 0 0 1 6 0v1"/>',
  pay:'<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.2"/>',
  users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
  user:'<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  shield:'<path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3z"/>',
  phone:'<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7A2 2 0 0 1 22 16.9z"/>',
  check:'<path d="M20 6 9 17l-5-5"/>',
  x:'<path d="M18 6 6 18M6 6l12 12"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
  refresh:'<path d="M21 12a9 9 0 1 1-2.6-6.4L21 8"/><path d="M21 3v5h-5"/>',
  list:'<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  alert:'<path d="M10.3 4.3 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  more:'<circle cx="5" cy="12" r="1.15"/><circle cx="12" cy="12" r="1.15"/><circle cx="19" cy="12" r="1.15"/>',
  file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
  chev:'<path d="m9 18 6-6-6-6"/>',
  down:'<path d="m6 9 6 6 6-6"/>',
  home:'<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  wallet:'<path d="M3 7a2 2 0 0 1 2-2h12v4"/><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M16 13.5h2"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  sliders:'<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  spark:'<path d="M12 3c.6 4.2 2.3 6.4 6 7.2-3.7.8-5.4 3-6 7.3-.6-4.3-2.3-6.5-6-7.3 3.7-.8 5.4-3 6-7.2z"/>',
  upload:'<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
  download:'<path d="M12 4v12M7 11l5 5 5-5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
  arrowUp:'<path d="M12 19V5M5 12l7-7 7 7"/>',
  link:'<path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>',
  minus:'<path d="M5 12h14"/>',
  eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  trash:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  grid:'<rect x="4" y="4" width="6" height="6" rx="1.5"/><rect x="14" y="4" width="6" height="6" rx="1.5"/><rect x="4" y="14" width="6" height="6" rx="1.5"/><rect x="14" y="14" width="6" height="6" rx="1.5"/>'
};
function ic(n, cls){return '<svg class="ic '+(cls||'')+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">'+((ICO[n])||'')+'</svg>'}
var LGN=0;function logoSvg(){var id='lg'+(++LGN);return '<svg viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="'+id+'" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4F6BFF"/><stop offset=".55" stop-color="#C13BD8"/><stop offset="1" stop-color="#FF4D8D"/></linearGradient></defs><rect width="32" height="32" rx="10" fill="#8B5CF6"/><rect width="32" height="32" rx="10" fill="url(#'+id+')"/><path d="M10 10.5h12.2c.1 2.7-1.9 4.4-5.3 5.4 3.7.7 6.1 2.6 6.3 5.6H11" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/></svg>'}
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function fd(s){if(!s)return'—';var p=String(s).split('-');return p.length===3?p[2]+'.'+p[1]+'.'+p[0]:s}
function dateParts(s){
  var p=String(s||'').split('-');
  if(p.length!==3)return null;
  return {y:+p[0], m:+p[1], d:+p[2], dt:new Date(+p[0],+p[1]-1,+p[2])};
}
function fdLong(s){
  var x=dateParts(s); if(!x)return fd(s);
  return WD[x.dt.getDay()]+', '+('0'+x.d).slice(-2)+'.'+('0'+x.m).slice(-2)+'.'+x.y;
}
function dayHeading(s){
  var x=dateParts(s); if(!x)return fd(s);
  var t=today(), mon=MONTHS[x.m-1]||'';
  if(s===t)return 'Сегодня, '+x.d+' '+mon;
  if(s===addDays(t,1))return 'Завтра';
  return cap(WD[x.dt.getDay()])+', '+x.d+' '+mon;
}
function cap(s){s=String(s||'');return s?s.charAt(0).toUpperCase()+s.slice(1):s}
function tableDate(s){
  var x=dateParts(s); if(!x)return esc(fd(s));
  var mon=MONTHS[x.m-1]||'', t=today(), day=x.d+' '+mon;
  if(s===t)return '<b>Сегодня</b><span>'+esc(day)+'</span>';
  if(s===addDays(t,1))return '<b>Завтра</b><span>'+esc(day)+'</span>';
  return '<b>'+esc(cap(WD[x.dt.getDay()]))+'</b><span>'+esc(day)+'</span>';
}
function today(){
  try{return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Moscow',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
  catch(e){var u=new Date(Date.now()+3*3600e3);return u.getUTCFullYear()+'-'+('0'+(u.getUTCMonth()+1)).slice(-2)+'-'+('0'+u.getUTCDate()).slice(-2);}
}
function addDays(ymd,n){var p=ymd.split('-'),d=new Date(+p[0],+p[1]-1,+p[2]+n);return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2)}
function moscowHour(){
  try{return +new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Moscow',hour:'numeric',hourCycle:'h23'}).format(new Date())}
  catch(e){return new Date().getHours()}
}
function firstName(n){n=String(n||'').trim();return n?n.split(/\s+/)[0]:''}
function hello(){
  var h=moscowHour();
  var g=h<5||h>=23?'Доброй ночи':h<12?'Доброе утро':h<18?'Добрый день':'Добрый вечер';
  var fn=firstName(D&&D.user&&D.user.name);
  return fn?g+', '+fn:g;
}
function toast(t, kind){
  var e=$('#toast'); e.textContent=t; e.className=kind||''; e.hidden=false;
  clearTimeout(e._t); e._t=setTimeout(function(){e.hidden=true}, 2800);
}
function plural(n, one, few, many){
  n=Math.abs(parseInt(n,10)||0);
  var n10=n%10, n100=n%100;
  if(n10===1 && n100!==11)return one;
  if(n10>=2 && n10<=4 && (n100<12 || n100>14))return few;
  return many;
}
function numWord(n, one, few, many){n=Math.abs(parseInt(n,10)||0);return n+' '+plural(n, one, few, many)}
function fmtLen(min){min=Math.round(+min||0);var h=Math.floor(min/60),m=min%60;var hs=h?numWord(h,'час','часа','часов'):'';var ms=m?numWord(m,'минута','минуты','минут'):'';if(h&&m)return hs+' '+ms;return hs||ms}
function fmtEnd(start,len){
  var m=/^(\d{1,2}):(\d{2})/.exec(start||''); if(!m)return '';
  var t=(+m[1])*60+(+m[2])+Math.round(+len||0); t=((t%1440)+1440)%1440;
  return ('0'+Math.floor(t/60)).slice(-2)+':'+('0'+(t%60)).slice(-2);
}
function timeRange(s){var a=s&&s.start||'—', b=fmtEnd(s&&s.start,s&&s.length); return b?a+'–'+b:a}
function fmtPhone(p){p=String(p||'').replace(/\D/g,'');if(p.length===11&&p[0]==='7')return '+7 '+p.slice(1,4)+' '+p.slice(4,7)+'-'+p.slice(7,9)+'-'+p.slice(9);return p||'—'}
function digitsPhone(s){
  var p=String(s||'').replace(/\D/g,'');
  if(p.length===11&&p[0]==='8')p='7'+p.slice(1);
  if(p.length===10)p='7'+p;
  return p.slice(0,11);
}
function maskPhone(s){
  var d=digitsPhone(s); if(!d)return '';
  if(d[0]!=='7')d=('7'+d).slice(0,11);
  var out='+7';
  if(d.length>1)out+=' '+d.slice(1,4);
  if(d.length>4)out+=' '+d.slice(4,7);
  if(d.length>7)out+='-'+d.slice(7,9);
  if(d.length>9)out+='-'+d.slice(9,11);
  return out;
}
function rewardParts(v){
  v=String(v||'').trim();
  if(!v)return {pre:'', num:'—', suf:''};
  var m=v.match(/^(.*?)(\d[\d\s]*)(.*)$/); if(!m)return {pre:'', num:v, suf:''};
  var n=m[2].replace(/\s/g,''); if(!/^\d+$/.test(n))return {pre:'', num:v, suf:''};
  var pretty=n.replace(/\B(?=(\d{3})+(?!\d))/g,' ');
  var pre=m[1].trim(), suf=m[3].trim().replace(/^руб\.?/i,'₽').replace(/^р$/i,'₽');
  if(!/₽|руб/i.test(pre+' '+suf)) suf='₽';
  return {pre:pre, num:pretty, suf:suf};
}
function fmtReward(v){var p=rewardParts(v); return ((p.pre?p.pre+' ':'')+p.num+(p.suf?' '+p.suf:'')).trim()}
function rewardHtml(v){
  var p=rewardParts(v);
  return (p.pre?'<span class="pre">'+esc(p.pre)+' </span>':'')+esc(p.num)+(p.suf?' '+esc(p.suf):'');
}
function siteTheme(name){var s=String(name||''),i=0,h=0;for(i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))>>>0;return THEMES[h%THEMES.length]}
function siteColor(name){return siteTheme(name).acc}
function themeVars(name){var t=siteTheme(name);return '--c-bg:'+t.bg+';--c-soft:'+t.soft+';--c-acc:'+t.acc+';--c-ink:'+t.ink}
function initials(name){
  var p=String(name||'').replace(/[«»"()]/g,' ').split(/[\s\-]+/).filter(function(w){return /[A-Za-zА-Яа-яЁё]/.test(w)});
  if(!p.length)return '•';
  if(p.length===1)return p[0].slice(0,2).toUpperCase();
  return (p[0][0]+p[1][0]).toUpperCase();
}
function avatar(name, size){return '<span class="av" style="background:'+siteColor(name)+((size)?';width:'+size+'px;height:'+size+'px':'')+'">'+esc(initials(name))+'</span>'}
function siteInitials(name){
  var short=parseSite(name).short, m=/(\d+)\s*$/.exec(short);
  if(m)return (short.charAt(0)||'•').toUpperCase()+m[1];
  return initials(short||name);
}
function siteAvatar(name,size){return '<span class="av" style="background:'+siteColor(name)+((size)?';width:'+size+'px;height:'+size+'px':'')+'">'+esc(siteInitials(name))+'</span>'}
function cleanSitePart(s){
  s=String(s||'').replace(/\s+/g,' ').trim();
  s=s.replace(/^склад\s+/i,'');
  s=s.replace(/Лемано/gi,'Лемана');
  return s;
}
function parseSite(name){
  var raw=String(name||'').replace(/\s+/g,' ').trim();
  if(!raw)return {title:'—', sub:'', short:'—'};
  var extras=[], main=raw.replace(/\s*\(([^)]*)\)\s*/g,function(_,inn){
    var c=cleanSitePart(inn); if(c)extras.push(c); return ' ';
  });
  main=cleanSitePart(main.replace(/\s*-\s*/g,' '));
  var title=main, rest='';
  var m=main.match(/^([A-Za-zА-Яа-яЁё]+\s+\d+)\s+(.*)$/);
  if(m){title=m[1]; rest=m[2];}
  if(rest)extras.push(rest);
  var sub=extras.filter(Boolean).join(' · ');
  return {title:title||raw, sub:sub, short:title||raw};
}
function emptyArt(){
  return '<svg class="empty-art" viewBox="0 0 160 100" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    +'<rect x="44" y="26" width="72" height="56" rx="10"/>'
    +'<path d="M58 26v-8h44v8"/>'
    +'<path d="M60 50h40M60 62h24"/>'
    +'</svg>';
}
function emptyBox(title,sub,action){
  return '<div class="empty">'+emptyArt()+'<b>'+title+'</b><span>'+sub+'</span>'+(action||'')+'</div>';
}
function placesLeft(s){
  var places=+s.places||0, taken=+s.taken||Math.max(0,places-(+s.left||0));
  var left=s.left!=null?+s.left:Math.max(0,places-taken);
  return {places:places, taken:taken, left:left};
}
function segind(s){
  var p=placesLeft(s);
  if(!p.places||p.places>8)return '';
  var h='<span class="segind" aria-hidden="true">',i;
  for(i=0;i<p.places;i++)h+='<i'+(i<p.taken?' class="on"':'')+'></i>';
  return h+'</span>';
}
function placesText(s, long){
  var p=placesLeft(s);
  if(!p.places)return 'места не указаны';
  if(p.left<=0)return 'мест нет';
  var of=numWord(p.places,'места','мест','мест');
  if(long){
    if(p.left===p.places)return 'свободно '+numWord(p.places,'место','места','мест');
    return 'свободно '+p.left+' из '+of;
  }
  if(p.left===p.places)return numWord(p.places,'место','места','мест');
  return p.left+' из '+of;
}
function slotStatus(s){
  if(s.status==='Закрыт')return {cls:'bad',label:'Закрыт'};
  if((s.left||0)<=0)return {cls:'w',label:'Мест нет'};
  return {cls:'ok',label:'Открыт'};
}
function gph(s){s=String(s==null?'':s);if(!s)return s;
 s=s.replace(/сотрудник(?=[а-яё]*)/gi,function(m){return m[0]==='С'?'Исполнитель':'исполнитель'});
 s=s.replace(/работник(?=[а-яё]*)/gi,function(m){return m[0]==='Р'?'Исполнитель':'исполнитель'});
 s=s.replace(/зарплат[аыуе]/gi,'вознаграждение').replace(/\bЗП\b/g,'вознаграждение');
 s=s.replace(/(^|[^А-Яа-яЁё0-9])смен[аыуе]?(?=[^А-Яа-яЁё]|$)/gi,'$1выход');
 s=s.replace(/штраф[а-яё]*/gi,'удержание по договору').replace(/аванс[а-яё]*/gi,'предоплата').replace(/брак[а-яё]*/gi,'ненадлежащее качество');
 s=s.replace(/^\s*Комплектовщик(и|ов)?/i,'Комплектация').replace(/(^|,\s*)Водител[ьяи]\s+(на\s+)?/gi,function(m,a){return a+'Управление техникой: '});
 s=s.replace(/опыт работы/gi,'опыт оказания услуг').replace(/готовность работать/gi,'готовность оказывать услуги').replace(/работать на сделке/gi,'оказывать услуги со сдельным вознаграждением').replace(/на сделке/gi,'со сдельным вознаграждением');
 return s}
function hlReq(s){s=gph(s);var e=esc(s);return e.replace(/медкнижк[а-яё]*|ЛМК/gi,function(m){return'<mark class="req-hl">'+m+'</mark>'})}

function closeSheet(){var sh=$('#sheet'); if(sh){sh.hidden=true;} var b=$('#shBody'); if(b)b.innerHTML=''; var c=$('#shCta'); if(c){c.innerHTML='';c.hidden=true;}}
function openSheet(html, cta){
  $('#shBody').innerHTML=html;
  var foot=$('#shCta');
  if(cta){foot.innerHTML=cta; foot.hidden=false;} else {foot.innerHTML=''; foot.hidden=true;}
  $('#sheet').hidden=false;
  var x=$('#shclose');
  if(x){x.innerHTML=ic('x'); x.onclick=closeSheet;}
  var body=$('#shBody'); if(body)body.scrollTop=0;
}
function skel(){
  var n='',i;
  for(i=0;i<3;i++)n+='<div class="scard sk-card"><div class="sk" style="height:22px;width:70%"></div><div class="sk sk-t" style="margin-top:10px"></div><div class="sk sk-b"></div></div>';
  return '<div class="day-cards">'+n+'</div>';
}

function errText(e){
  return ({
    locked:'Слишком много попыток, подождите 15 минут',
    pending:'Заявка отправлена, ожидайте одобрения администратора',
    rejected:'Заявка отклонена администратором',
    blocked:'Аккаунт заблокирован',
    bad_pin:'Неверный телефон или PIN',
    bad_name:'Укажите ФИО',
    bad_phone:'Укажите телефон в формате +7 XXX XXX-XX-XX',
    phone_taken:'Этот телефон уже зарегистрирован',
    need_confirm:'Подтвердите требования, чтобы записаться',
    closed:'Выход закрыт',
    started:'Запись на этот выход уже недоступна',
    already:'Вы уже записаны на этот выход',
    full:'Свободных мест нет',
    too_late:'Отменить запись уже нельзя',
    not_active:'Запись уже не действует',
    not_found:'Не найдено',
    forbidden:'Недостаточно прав',
    bad_site:'Укажите площадку',
    bad_date:'Укажите дату',
    bad_time:'Укажите время начала',
    bad_length:'Укажите длительность',
    bad_places:'Укажите число мест',
    auth:'Сессия истекла, войдите снова',
    bad_hours:'Некорректное число часов',
    bad_share:'Доля должна быть от 1 до 100%',
    no_file:'Выберите файл',
    too_big:'Файл слишком большой',
    bad_file:'Не удалось прочитать файл',
    no_rows:'В файле не найдены строки для расчёта',
    no_parser:'Для площадки нет формата файла',
    published:'Период опубликован',
    bad_amount:'Некорректная сумма',
    bad_input:'Проверьте поля',
    timeout:'Сервер долго отвечает, попробуйте ещё раз'
  })[e]||('Ошибка: '+(e||'неизвестно'))
}
function netErr(){return 'Нет связи. Нажмите ещё раз — сервер иногда запускается дольше обычного.'}
function api(body, opts){
  opts=opts||{};
  body.token=localStorage[TOKEN]||'';
  var timeout=opts.timeout||25000, retries=opts.retries==null?1:opts.retries, seq=opts.seq;
  function once(attempt){
    var ctrl=typeof AbortController!=='undefined'?new AbortController():null;
    var timer=setTimeout(function(){if(ctrl)ctrl.abort();}, timeout);
    return fetch(CFG.apiUrl,{method:'POST',body:JSON.stringify(body),signal:ctrl?ctrl.signal:undefined}).then(function(r){
      return r.text().then(function(t){
        var j; try{j=JSON.parse(t)}catch(e){throw new Error('bad_response')}
        return j;
      });
    }).finally(function(){clearTimeout(timer)}).catch(function(e){
      if(e&&e.message==='auth')throw e;
      if(attempt<retries){ if(opts.onRetry)opts.onRetry(attempt+1); return once(attempt+1); }
      throw e&&e.name==='AbortError'?new Error('timeout'):(e||new Error('net'));
    });
  }
  return once(0).then(function(j){
    if(seq && seq!==loadSeq){var err=new Error('stale'); err.stale=true; throw err}
    if(j&&j.error==='auth'){localStorage.removeItem(TOKEN);localStorage.removeItem(KIND);login();throw new Error('auth')}
    return j;
  });
}

/* ---------- деньги, периоды ---------- */
function money(n,signed){
  n=+n||0; var neg=n<0, a=Math.abs(n), r=Math.round(a*100)/100;
  var int=Math.floor(r), dec=Math.round((r-int)*100);
  var s=String(int).replace(/\B(?=(\d{3})+(?!\d))/g,'\u2009')+(dec?','+('0'+dec).slice(-2):'');
  return (neg?'−':signed?'+':'')+s+'\u00a0₽';
}
function bigMoney(n){
  n=+n||0; var r=Math.round(Math.abs(n)*100)/100, int=Math.floor(r), dec=Math.round((r-int)*100);
  return '<span class="big-int">'+(n<0?'−':'')+String(int).replace(/\B(?=(\d{3})+(?!\d))/g,'\u2009')+'</span><span class="big-dec">,'+('0'+dec).slice(-2)+'\u00a0₽</span>';
}
var MON_N=['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
function periodLabel(p){
  if(!p)return '—';
  var a=dateParts(p.from), b=dateParts(p.to);
  if(a&&b&&a.d===1&&a.m===b.m&&a.y===b.y&&new Date(b.y,b.m,0).getDate()===b.d)return MON_N[a.m-1];
  return shortRange(p.from,p.to);
}
function shortRange(f,t){var a=dateParts(f),b=dateParts(t);if(!a||!b)return fd(f)+'–'+fd(t);return ('0'+a.d).slice(-2)+'.'+('0'+a.m).slice(-2)+'–'+('0'+b.d).slice(-2)+'.'+('0'+b.m).slice(-2)+'.'+b.y}
function curPeriod(){var l=(E&&E.periods)||[];if(!l.length)return null;return l.filter(function(p){return p.id===EP})[0]||l[0]}
function prevPeriod(p){var l=(E&&E.periods)||[],i=l.indexOf(p);return i>=0&&i+1<l.length?l[i+1]:null}
function deltaHtml(p){
  var q=prevPeriod(p);
  if(!p)return '';
  if(!q)return '<div class="delta muted">'+(p.dataTo&&p.dataTo<p.to?'Данные заказчика по '+fd(p.dataTo):'Период '+esc(shortRange(p.from,p.to)))+'</div>';
  var d=p.payout-q.payout, pct=q.payout?d/q.payout*100:0;
  return '<div class="delta '+(d>=0?'up':'down')+'">'+(d>=0?'+':'−')+Math.abs(pct).toFixed(1).replace('.',',')+'% <span>('+money(d,true)+')</span> <i>к '+esc(periodLabel(q).toLowerCase())+'</i></div>';
}
function rowIcon(name, iconName, color){
  if(iconName)return '<span class="ricon" style="--c:'+(color||'#7C6CFF')+'">'+ic(iconName,'sm')+'</span>';
  var t=siteTheme(name);
  return '<span class="ricon site" style="--c:'+t.acc+'">'+esc(siteInitials(name))+'</span>';
}
function lrow(o){
  return '<div class="lrow'+(o.cls?' '+o.cls:'')+'"'+(o.attrs||'')+'>'+(o.icon||'')
    +'<div class="lmain"><div class="lt">'+o.title+'</div>'+(o.sub?'<div class="ls">'+o.sub+'</div>':'')+'</div>'
    +'<div class="lright"><div class="la">'+(o.amount||'')+'</div>'+(o.line?'<div class="ll '+(o.lineCls||'')+'">'+o.line+'</div>':'')+'</div></div>';
}
function card(title, body, tools){
  return '<section class="dcard"><div class="dcard-h"><h2>'+title+'</h2>'+(tools?'<div class="dtools">'+tools+'</div>':'')+'</div>'+body+'</section>';
}
function placesLine(s){
  var p=placesLeft(s);
  if(s.status==='Закрыт')return {t:'закрыт',c:'bad'};
  if(!p.places)return {t:'места не указаны',c:''};
  if(p.left<=0)return {t:'мест нет',c:'bad'};
  var warn=p.left<=2||p.left/p.places<=.25;
  return {t:'свободно '+numWord(p.left,'место','места','мест'),c:warn?'warn':'up'};
}

/* ---------- каркас ---------- */
function closeMenu(){}
function setChrome(){
  var logged=!!(role&&localStorage[TOKEN]);
  document.body.classList.toggle('is-login', !logged);
  document.body.classList.toggle('role-admin', role==='admin');
  document.body.classList.toggle('role-contractor', role==='contractor');
  var side=$('#side'); if(side)side.hidden=!(logged&&role==='admin');
  $('#tabs').hidden=!logged;
  document.querySelectorAll('.logo').forEach(function(el){if(!el.innerHTML)el.innerHTML=logoSvg()});
  if(logged)setNav();
}
function navItems(){
  if(role==='admin')return [['slots','cal','Выходы'],['people','users','Исполнители'],['*','plus','Создать'],['calc','wallet','Расчёты'],['more','grid','Ещё']];
  return [['slots','home','Главная'],['mine','list','Записи'],['*','spark','Записаться'],['earn','wallet','Расчёт'],['profile','user','Профиль']];
}
function navHtml(side){
  return navItems().map(function(it){
    if(it[0]==='*')return side?'':'<button class="nav-c" data-t="*" aria-label="'+it[2]+'"><span>'+ic(it[1])+'</span></button>';
    return '<button data-t="'+it[0]+'"'+(tab===it[0]?' class="on"':'')+' aria-label="'+it[2]+'">'+ic(it[1])+'<span>'+it[2]+'</span></button>';
  }).join('');
}
function goTab(t){
  if(t==='*'){ if(role==='admin')openSlotForm(null); else openQuick(); return; }
  tab=t; window.scrollTo(0,0); render();
  if(t==='earn'&&role==='contractor'&&!E)loadEarn();
  if(t==='calc'&&role==='admin'&&!C)loadCalc();
}
function setNav(){
  var n=$('#tabs'); if(n){n.innerHTML=navHtml(false); n.hidden=false; n.querySelectorAll('button').forEach(function(b){b.onclick=function(){goTab(b.dataset.t)}});}
  var s=$('#sidenav'); if(s){s.innerHTML=navHtml(true)+'<button class="side-new" data-t="*">'+ic('plus','sm')+' Создать выход</button>'; s.querySelectorAll('button').forEach(function(b){b.onclick=function(){goTab(b.dataset.t)}});}
}

function load(){
  if(!LIVE){$('#view').innerHTML='<div class="errbox"><b>Приложение доступно только в боевом режиме.</b></div>';return}
  var seq=++loadSeq, kind=localStorage[KIND];
  var action=kind==='admin'?'adminZapisData':'contractorData';
  closeSheet();
  role=kind||'contractor'; setChrome();
  $('#view').innerHTML=skel()+'<p class="muted" id="ldhint" style="text-align:center">Загрузка… если сервер отвечает дольше 15 секунд, подождите.</p>';
  api({action:action},{seq:seq,onRetry:function(){var h=$('#ldhint');if(h)h.textContent='Сервер отвечает дольше обычного, пробуем ещё раз…'}}).then(function(j){
    if(seq!==loadSeq)return;
    if(!j.ok)throw new Error(j.error||'load');
    D=j; role=j.role||kind||'contractor';
    setChrome(); render();
    if(role==='contractor')loadEarn(); else if(tab==='calc')loadCalc();
  }).catch(function(e){
    if(e&&(e.stale||e.message==='stale'||e.message==='auth'))return;
    if(seq!==loadSeq)return;
    $('#view').innerHTML='<div class="errbox"><b>Не удалось загрузить данные</b><p class="hint">'+esc(netErr())+'</p><button class="btn" id="retry">Повторить</button></div>';
    var b=$('#retry'); if(b)b.onclick=function(){load()};
  });
}
function loadEarn(){
  api({action:'contractorEarnings'},{timeout:40000}).then(function(j){
    if(!j.ok)return;
    E=j; if(!EP&&E.periods&&E.periods[0])EP=E.periods[0].id;
    if(tab==='slots'||tab==='earn')render();
  }).catch(function(){});
}
function logout(){
  if(!confirm('Выйти из аккаунта?'))return;
  loadSeq++; closeSheet();
  [TOKEN,KIND,'zapisCache'].forEach(function(k){localStorage.removeItem(k)});
  D=null; E=null; C=null; CP=null; role=''; tab='slots'; mineSeg='up';
  setChrome(); login(); toast('Вы вышли');
}

/* ---------- вход и регистрация ---------- */
function bindPhone(id){
  var el=$(id); if(!el)return;
  el.addEventListener('input',function(){var next=maskPhone(el.value);el.value=next;try{el.setSelectionRange(next.length,next.length)}catch(e){}});
}
function bindOtp(wrapId, inputId){
  var wrap=$(wrapId), inp=$(inputId); if(!wrap||!inp)return;
  var cells=wrap.querySelectorAll('.otp-cells i');
  function paint(){
    var v=String(inp.value||'').replace(/\D/g,'').slice(0,6);
    if(inp.value!==v)inp.value=v;
    for(var i=0;i<cells.length;i++){cells[i].classList.toggle('fill', !!v[i]);cells[i].classList.toggle('on', i===Math.min(v.length, cells.length-1));}
  }
  wrap.addEventListener('click',function(){inp.focus()});
  inp.addEventListener('input',paint);
  inp.addEventListener('focus',function(){wrap.classList.add('focus');paint()});
  inp.addEventListener('blur',function(){wrap.classList.remove('focus')});
  paint();
}
function setInvalid(id, on, msg){var f=$(id); if(!f)return; f.classList.toggle('is-invalid', !!on); var e=$('.ferr', f); if(e&&msg)e.textContent=msg;}
function otpField(id, inputId, label, auto){
  return '<label class="fld" id="'+id+'"><span>'+label+'</span><div class="otp" id="'+id+'-otp">'
    +'<input id="'+inputId+'" class="otp-inp" type="tel" inputmode="numeric" maxlength="6" autocomplete="'+(auto||'one-time-code')+'" pattern="[0-9]{4,6}">'
    +'<div class="otp-cells" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div></div>'
    +'<div class="ferr">PIN должен содержать 4–6 цифр</div></label>';
}
function authShell(title, lead, inner){
  return '<div class="auth-scene"><div class="auth-glow" aria-hidden="true"></div>'
    +'<div class="auth"><div class="logo lg auth-mark">'+logoSvg()+'</div><h1>'+title+'</h1>'
    +(lead?'<p class="lead">'+lead+'</p>':'')+inner+'</div></div>';
}
function login(mode){
  mode=mode||'contractor';
  role=''; setChrome();
  if(mode==='admin'){
    $('#view').innerHTML=authShell('Запись','Вход для администратора',
      '<label class="fld" id="f-name"><span>Имя</span><input id="ln" autocomplete="username"><div class="ferr">Укажите имя</div></label>'
      +otpField('f-pin','lp','PIN, если требуется','current-password')
      +'<button class="btn" id="lb">Войти</button>'
      +'<div class="auth-alt"><button type="button" class="link" id="lback">Вход исполнителя</button></div>'
      +'<div id="le" class="errline"></div>');
    bindOtp('#f-pin-otp','#lp');
    $('#lback').onclick=function(){login('contractor')};
    $('#lb').onclick=function(){
      var name=$('#ln').value.trim(); setInvalid('#f-name', !name); if(!name)return;
      var b=$('#lb'); b.disabled=true; $('#le').textContent='Входим…';
      api({action:'login',name:name,pin:$('#lp').value},{retries:1}).then(function(j){
        if(!j.ok){$('#le').textContent=j.error==='bad_pin'||!j.error?'Неверное имя или PIN':errText(j.error);b.disabled=false;return}
        if(!j.user||j.user.role!=='admin'){$('#le').textContent='Этот вход только для администратора';b.disabled=false;return}
        localStorage[TOKEN]=j.token; localStorage[KIND]='admin'; tab='slots'; load();
      }).catch(function(){$('#le').textContent=netErr();b.disabled=false});
    };
    return;
  }
  if(mode==='reg'){
    $('#view').innerHTML=authShell('Регистрация','Заявка поступит администратору. Вход откроется после одобрения.',
      '<label class="fld" id="f-name"><span>ФИО</span><input id="rn" autocomplete="name" placeholder="Фамилия Имя Отчество"><div class="ferr">Укажите ФИО</div></label>'
      +'<label class="fld" id="f-phone"><span>Телефон</span><input id="rp" type="tel" inputmode="tel" autocomplete="tel" placeholder="+7 900 000-00-00"><div class="ferr">Укажите телефон в формате +7 XXX XXX-XX-XX</div></label>'
      +'<label class="fld" id="f-site"><span>Площадка оказания услуг</span><select id="rsite"><option value="">Загрузка списка…</option></select><div class="ferr">Выберите площадку</div></label>'
      +'<label class="fld" id="f-ext"><span>Идентификатор в системе заказчика <em>необязательно</em></span><input id="rext" autocomplete="off" placeholder="логин, номер или ФИО как у заказчика"><div class="fhint">По нему мы найдём ваш объём услуг в отчёте площадки. Если не знаете, оставьте пустым.</div></label>'
      +otpField('f-pin','rpin','PIN (4–6 цифр)','new-password')
      +otpField('f-pin2','rpin2','Повторите PIN','new-password')
      +'<button class="btn" id="rb">Отправить заявку</button>'
      +'<div class="auth-alt"><button type="button" class="link" id="lback">Назад ко входу</button></div>'
      +'<div id="le" class="errline"></div>');
    bindPhone('#rp'); bindOtp('#f-pin-otp','#rpin'); bindOtp('#f-pin2-otp','#rpin2');
    api({action:'publicSites'},{retries:1}).then(function(j){
      var sel=$('#rsite'); if(!sel)return;
      var o='<option value="">Выберите площадку</option>';
      ((j&&j.sites)||[]).forEach(function(s){o+='<option value="'+esc(s.site)+'">'+esc(parseSite(s.site).title+(parseSite(s.site).sub?' · '+parseSite(s.site).sub:''))+'</option>'});
      sel.innerHTML=o;
    }).catch(function(){var sel=$('#rsite');if(sel)sel.innerHTML='<option value="">Не удалось загрузить список</option>'});
    $('#lback').onclick=function(){login('contractor')};
    $('#rb').onclick=function(){
      var name=$('#rn').value.trim(), phone=digitsPhone($('#rp').value), pin=$('#rpin').value, pin2=$('#rpin2').value, site=$('#rsite').value, ext=$('#rext').value.trim();
      setInvalid('#f-name', name.length<2, 'Укажите ФИО');
      setInvalid('#f-phone', !/^7\d{10}$/.test(phone));
      setInvalid('#f-site', !site);
      setInvalid('#f-pin', !/^\d{4,6}$/.test(pin));
      setInvalid('#f-pin2', pin!==pin2, 'PIN не совпадают');
      if(name.length<2||!/^7\d{10}$/.test(phone)||!site||!/^\d{4,6}$/.test(pin)||pin!==pin2)return;
      var b=$('#rb'); b.disabled=true; $('#le').textContent='Отправляем…';
      api({action:'contractorRegister',name:name,fio:name,phone:phone,pin:pin,pin2:pin2,site:site,extId:ext},{retries:1}).then(function(j){
        if(!j.ok){$('#le').textContent=errText(j.error);b.disabled=false;return}
        $('#view').innerHTML=authShell('Заявка отправлена','',
          '<div class="okmsg">Статус «Ожидает». Вход будет доступен после одобрения администратора.</div>'
          +'<button class="btn" id="lback" style="margin-top:16px">Назад ко входу</button>');
        $('#lback').onclick=function(){login('contractor')};
      }).catch(function(){$('#le').textContent=netErr();b.disabled=false});
    };
    return;
  }
  $('#view').innerHTML=authShell('Запись на выходы','Выходы на площадках, ваши записи и расчёт вознаграждения в одном месте',
    '<label class="fld" id="f-phone"><span>Телефон</span><input id="lpn" type="tel" inputmode="tel" autocomplete="tel" placeholder="+7 900 000-00-00"><div class="ferr">Укажите телефон в формате +7 XXX XXX-XX-XX</div></label>'
    +otpField('f-pin','lp','PIN','current-password')
    +'<button class="btn" id="lb">Войти</button>'
    +'<div class="auth-alt"><button type="button" class="link" id="lreg">Регистрация</button><button type="button" class="link" id="ladm">Вход для администратора</button></div>'
    +'<div id="le" class="errline"></div>');
  bindPhone('#lpn'); bindOtp('#f-pin-otp','#lp');
  $('#lreg').onclick=function(){login('reg')};
  $('#ladm').onclick=function(){login('admin')};
  $('#lb').onclick=function(){
    var phone=digitsPhone($('#lpn').value), pin=$('#lp').value;
    setInvalid('#f-phone', !/^7\d{10}$/.test(phone));
    setInvalid('#f-pin', pin && !/^\d{4,6}$/.test(pin));
    if(!/^7\d{10}$/.test(phone))return;
    var b=$('#lb'); b.disabled=true; $('#le').textContent='Входим…';
    api({action:'contractorLogin',phone:phone,pin:pin},{retries:1}).then(function(j){
      if(!j.ok){$('#le').textContent=errText(j.error);b.disabled=false;return}
      localStorage[TOKEN]=j.token; localStorage[KIND]='contractor'; tab='slots'; load();
    }).catch(function(){$('#le').textContent=netErr();b.disabled=false});
  };
}

/* ---------- выходы: исполнитель ---------- */
function filterSlots(list){
  var q=String(F.q||'').toLowerCase();
  return (list||[]).filter(function(s){
    if(F.site&&s.site!==F.site)return false;
    if(F.date&&s.date!==F.date)return false;
    if(q&&(s.site+' '+gph(s.vacancy||'')).toLowerCase().indexOf(q)<0)return false;
    return true;
  }).slice().sort(function(a,b){return String(a.date||'').localeCompare(b.date||'')||String(a.start||'').localeCompare(b.start||'')});
}
function nearestMine(){return (D.mine||[]).filter(isUpcoming).slice().sort(function(a,b){return slotStartMs(a.slot)-slotStartMs(b.slot)})[0]||null}
function weekOpenCount(){var from=today(), to=addDays(from,6);return (D.slots||[]).filter(function(s){return s.date>=from&&s.date<=to&&s.status!=='Закрыт'}).length}
function slotRowHtml(s, admin){
  var site=parseSite(s.site||''), pl=placesLine(s), end=fmtEnd(s.start,s.length);
  var x=dateParts(s.date), dl=s.date===today()?'сегодня':s.date===addDays(today(),1)?'завтра':(x?WD[x.dt.getDay()]+' '+x.d+'.'+('0'+x.m).slice(-2):fd(s.date));
  var sub=esc(dl)+' '+esc(s.start||'—')+' · '+esc(gph(s.vacancy||'вид услуг не указан'));
  var line=admin?(placesLeft(s).taken+' из '+placesLeft(s).places+' занято'+(s.status==='Закрыт'?' · закрыт':'')):pl.t;
  var lc=admin?(s.status==='Закрыт'?'bad':(placesLeft(s).left<=0?'up':'')):pl.c;
  return lrow({attrs:' data-row="'+s.row+'"', icon:rowIcon(s.site), title:esc(site.title)+(s.mySignup?' <span class="badge-ok" title="Вы записаны">'+ic('check')+'</span>':'')+(s.req?' <span class="req-dot" title="Есть требования">'+ic('shield','xs')+'</span>':''), sub:sub, amount:esc(fmtReward(s.reward)), line:line, lineCls:lc});
}
function slotsList(list, admin){
  if(!list.length)return '<div class="empty dk">'+emptyArt()+'<b>Нет открытых выходов</b><span>Измените площадку, дату или поиск</span></div>';
  return '<div class="lrows">'+list.map(function(s){return slotRowHtml(s, admin)}).join('')+'</div>';
}
function heroHead(left, right){
  return '<div class="hero-head"><button type="button" class="hsel" id="hsite">'+esc(left)+' '+ic('down','xs')+'</button>'
    +(right!=null?'<button type="button" class="hsel" id="hper">'+esc(right)+' '+ic('down','xs')+'</button>':'<span></span>')+'</div>';
}
function glassActions(items){
  return '<div class="gacts">'+items.map(function(it){return '<button type="button" class="gbtn" data-act="'+it[0]+'">'+ic(it[1])+'<span>'+it[2]+'</span></button>'}).join('')+'</div>';
}
function chipsRow(label, chips){
  return '<div class="chips-wrap"><div class="chips"><span class="chips-l">'+label+'</span>'+chips.join('')+'</div></div>';
}
function contractorHero(){
  var p=curPeriod(), siteLab=F.site?parseSite(F.site).short:'Все площадки';
  var h='<section class="whero"><div class="mesh" aria-hidden="true"></div>'+heroHead(siteLab, p?periodLabel(p):(E?'Нет расчёта':'Расчёт'));
  if(p){
    h+='<div class="hk">К выплате · '+esc(parseSite(p.site).short)+'</div><div class="big">'+bigMoney(p.payout)+'</div>'+deltaHtml(p);
  } else if(!E){
    h+='<div class="hk">'+esc(hello())+'</div><div class="big"><span class="sk sk-big"></span></div><div class="delta muted">Загружаем расчёт…</div>';
  } else {
    var n=weekOpenCount();
    h+='<div class="hk">'+esc(hello())+'</div><div class="big"><span class="big-int">'+n+'</span><span class="big-dec"> '+plural(n,'выход','выхода','выходов')+'</span></div><div class="delta muted">открыто на ближайшие 7 дней</div>';
  }
  return h+glassActions([['quick','spark','Записаться'],['mine','list','Мои записи'],['earn','wallet','Расчёт']])+'</section>';
}
function quickChips(){
  var chips=[], m=nearestMine(), list=filterSlots(D.slots||[]), next=list.filter(function(s){return !s.mySignup})[0];
  if(m&&m.slot)chips.push('<button type="button" class="qchip" data-open="'+m.slot.row+'"><i class="dotc" style="--c:#22C08A"></i>Ближайший: '+esc(WD[(dateParts(m.slot.date)||{dt:new Date()}).dt.getDay()]+' '+(m.slot.start||''))+' <b class="up">→</b></button>');
  if(next)chips.push('<button type="button" class="qchip" data-open="'+next.row+'"><i class="dotc" style="--c:#FF4D8D"></i>'+esc(parseSite(next.site).short)+' → <b class="pink">Записаться</b></button>');
  var cnt={}; (D.slots||[]).forEach(function(s){if(!F.site||s.site===F.site)cnt[s.date]=(cnt[s.date]||0)+1});
  Object.keys(cnt).sort().slice(0,10).forEach(function(d){
    var x=dateParts(d); if(!x)return;
    chips.push('<button type="button" class="qchip'+(F.date===d?' on':'')+'" data-date="'+d+'">'+esc(WD[x.dt.getDay()]+' '+x.d)+' · <b class="'+(F.date===d?'pink':'up')+'">'+cnt[d]+'</b></button>');
  });
  if(F.date)chips.push('<button type="button" class="qchip" data-date="">Все даты ✕</button>');
  return chipsRow('Быстро:', chips);
}
function bindHome(){
  var v=$('#view');
  v.querySelectorAll('.gbtn').forEach(function(b){b.onclick=function(){var a=b.dataset.act; if(a==='quick')openQuick(); else if(a==='newslot')openSlotForm(null); else if(a==='upload')openUpload(); else if(a==='publish')togglePublish(); else if(a==='export')exportCalc(); else goTab(a)}});
  v.querySelectorAll('[data-open]').forEach(function(b){b.onclick=function(){openSignup(+b.dataset.open)}});
  v.querySelectorAll('[data-date]').forEach(function(b){b.onclick=function(){F.date=b.dataset.date||'';render()}});
  var hs=$('#hsite'); if(hs)hs.onclick=openSitePicker;
  var hp=$('#hper'); if(hp)hp.onclick=function(){if(role==='admin')openCalcPeriodPicker(); else openPeriodPicker()};
  var sb=$('#tsearch'); if(sb)sb.onclick=function(){searchOn=!searchOn; if(!searchOn)F.q=''; render(); var i=$('#qinp'); if(i)i.focus()};
  var fb=$('#tfilter'); if(fb)fb.onclick=openFilter;
  var qi=$('#qinp'); if(qi)qi.oninput=function(){F.q=qi.value; var box=$('#slist'); if(box){box.innerHTML=slotsList(filterSlots(D.slots||[]), role==='admin'); bindRows();}};
  bindRows();
}
function bindRows(){
  $('#view').querySelectorAll('.lrow[data-row]').forEach(function(el){el.onclick=function(){(role==='admin'?openAdminSlot:openSignup)(+el.dataset.row)}});
}
function listTools(){return '<button type="button" class="tbtn'+(searchOn?' on':'')+'" id="tsearch" aria-label="Поиск">'+ic('search','sm')+'</button><button type="button" class="tbtn'+(F.site||F.date?' on':'')+'" id="tfilter" aria-label="Фильтр">'+ic('sliders','sm')+'</button>'}
function searchBox(){return searchOn?'<div class="qsearch">'+ic('search','sm')+'<input id="qinp" placeholder="Площадка или вид услуг" value="'+esc(F.q||'')+'"></div>':''}
function renderSlotsContractor(){
  var list=filterSlots(D.slots||[]);
  $('#view').innerHTML=contractorHero()+quickChips()
    +card('Открытые выходы:', searchBox()+'<div id="slist">'+slotsList(list)+'</div>', listTools());
  bindHome();
}
function openSitePicker(){
  var sites=(D&&D.sites)||[], h='<h3>Площадка</h3><div class="lrows">';
  h+=lrow({attrs:' data-s=""', icon:rowIcon('', 'grid', '#8A8A99'), title:'Все площадки', amount:F.site?'':ic('check','sm')});
  sites.forEach(function(s){var p=parseSite(s.site); h+=lrow({attrs:' data-s="'+esc(s.site)+'"', icon:rowIcon(s.site), title:esc(p.title), sub:esc(p.sub), amount:F.site===s.site?ic('check','sm'):''})});
  openSheet(h+'</div>');
  $('#shBody').querySelectorAll('[data-s]').forEach(function(el){el.onclick=function(){F.site=el.dataset.s||''; closeSheet(); render()}});
}
function openPeriodPicker(){
  var l=(E&&E.periods)||[];
  if(!l.length){openSheet('<h3>Расчёт</h3><div class="empty dk"><b>Расчёт пока не опубликован</b><span>Он появится после того, как заказчик пришлёт отчёт и администратор его проверит</span></div>');return}
  var h='<h3>Период</h3><div class="lrows">';
  l.forEach(function(p){h+=lrow({attrs:' data-p="'+p.id+'"', icon:rowIcon(p.site), title:esc(periodLabel(p))+' · '+esc(parseSite(p.site).short), sub:esc(shortRange(p.from,p.to)), amount:money(p.payout), line:p.id===(curPeriod()||{}).id?'выбран':'', lineCls:'up'})});
  openSheet(h+'</div>');
  $('#shBody').querySelectorAll('[data-p]').forEach(function(el){el.onclick=function(){EP=el.dataset.p; closeSheet(); render()}});
}
function openFilter(){
  var sites=(D&&D.sites)||[], opts='<option value="">Все площадки</option>';
  sites.forEach(function(s){opts+='<option value="'+esc(s.site)+'"'+(F.site===s.site?' selected':'')+'>'+esc(parseSite(s.site).title+(parseSite(s.site).sub?' · '+parseSite(s.site).sub:''))+'</option>'});
  openSheet('<h3>Фильтр</h3><label class="fld"><span>Площадка</span><select id="fsite">'+opts+'</select></label><label class="fld"><span>Дата</span><input id="fdate" type="date" value="'+esc(F.date||'')+'"></label>',
    '<button class="btn" id="fgo">Показать</button><button class="btn s" id="freset">Сбросить</button>');
  $('#fgo').onclick=function(){F.site=$('#fsite').value;F.date=$('#fdate').value;closeSheet();render()};
  $('#freset').onclick=function(){F.site='';F.date='';F.q='';closeSheet();render()};
}
function openQuick(){
  var list=filterSlots(D.slots||[]).filter(function(s){return !s.mySignup&&placesLeft(s).left>0}).slice(0,8);
  openSheet('<div class="sh-glow"></div><h3>Записаться</h3><p class="hint">Ближайшие выходы со свободными местами</p>'+slotsList(list));
  $('#shBody').querySelectorAll('.lrow[data-row]').forEach(function(el){el.onclick=function(){openSignup(+el.dataset.row)}});
}

function sheetHero(s){
  var site=parseSite(s.site||''), end=fmtEnd(s.start,s.length);
  return '<div class="sh-hero"><div class="sh-glow"></div><div class="sh-top">'+rowIcon(s.site)+'<div><p class="sh-kicker">'+esc(dayHeading(s.date))+'</p><h3>'+esc(site.title)+'</h3>'+(site.sub?'<div class="sh-sub">'+esc(site.sub)+'</div>':'')+'</div></div>'
    +'<div class="sh-pay"><div class="tm">'+esc(s.start||'—')+(end?' — '+end:'')+'<small>'+esc(fmtLen(s.length))+'</small></div><div class="am">'+esc(fmtReward(s.reward))+'<small>вознаграждение</small></div></div></div>';
}
function openSignup(row){
  var s=(D.slots||[]).filter(function(x){return x.row===row})[0];
  if(!s){var mm=(D.mine||[]).filter(function(it){return it.slot&&it.slot.row===row})[0]; if(mm)s=mm.slot;}
  if(!s)return;
  var can=s.left>0&&s.status==='Открыт'&&!s.started, already=s.mySignup||(D.mine||[]).some(function(it){return it.slot&&it.slot.row===s.row&&it.signup&&it.signup.status==='Записан'});
  var mine=(D.mine||[]).filter(function(it){return it.slot&&it.slot.row===s.row&&it.signup&&it.signup.status==='Записан'})[0];
  var canCancel=already&&mine&&mine.slot&&mine.slot.canCancel, pl=placesLine(s);
  var body=sheetHero(s)+'<div class="lrows">'
    +lrow({icon:rowIcon('','bag','#4F8BFF'), title:'Вид услуг', sub:esc(gph(s.vacancy||'—'))})
    +lrow({icon:rowIcon('','users','#22C08A'), title:'Места', sub:esc(placesText(s,true)), line:pl.t, lineCls:pl.c})
    +(s.comment?lrow({icon:rowIcon('','file','#F2B51B'), title:'Комментарий', sub:esc(gph(s.comment))}):'')
    +'</div>'
    +(s.req?'<div class="reqbox"><div class="rh">'+ic('shield','sm')+' Требования</div><div class="rt">'+hlReq(s.req)+'</div>'
      +(!already&&can?'<label class="confirm"><input type="checkbox" id="cnf"><span>Подтверждаю, что ознакомлен(а) с требованиями и готов(а) оказать услуги на этом выходе</span></label>':'')+'</div>':'')
    +(!s.req&&!already&&can?'<label class="confirm"><input type="checkbox" id="cnf"><span>Подтверждаю запись на этот выход</span></label>':'')
    +(already?'<div class="okmsg">Вы записаны на этот выход</div>':'')
    +(!already&&!can?'<p class="hint">Запись на этот выход недоступна</p>':'');
  var cta='';
  if(already&&canCancel)cta='<button class="btn danger" id="scancel">Отменить запись</button>';
  else if(!already&&can)cta='<button class="btn" id="sgo">Записаться на выход</button>';
  openSheet(body, cta);
  var go=$('#sgo');
  if(go)go.onclick=function(){
    if(!$('#cnf')||!$('#cnf').checked){toast('Отметьте подтверждение','bad');return}
    go.disabled=true;
    api({action:'signup',row:s.row,confirm:true}).then(function(j){
      if(!j.ok){toast(errText(j.error),'bad');go.disabled=false;return}
      toast('Вы записаны','ok'); closeSheet(); load();
    }).catch(function(){toast(netErr(),'bad');go.disabled=false});
  };
  var cl=$('#scancel');
  if(cl)cl.onclick=function(){
    if(!confirm('Отменить запись на этот выход?'))return;
    cl.disabled=true;
    api({action:'cancelSignup',row:mine.signup.row}).then(function(j){
      if(!j.ok){toast(errText(j.error),'bad');cl.disabled=false;return}
      toast('Запись отменена','ok'); closeSheet(); load();
    }).catch(function(){toast(netErr(),'bad');cl.disabled=false});
  };
}

/* ---------- мои записи ---------- */
function slotStartMs(s){
  if(s&&s.startMs)return +s.startMs;
  if(!s||!s.date)return 0;
  var p=String(s.date).split('-'), m=/^(\d{1,2}):(\d{2})/.exec(s.start||'');
  if(p.length!==3)return 0;
  var t=Date.parse(p[0]+'-'+p[1]+'-'+p[2]+'T'+('0'+(m?+m[1]:0)).slice(-2)+':'+('0'+(m?+m[2]:0)).slice(-2)+':00+03:00'); return isNaN(t)?0:t;
}
function countdown(s){
  var start=slotStartMs(s), ms=start-Date.now();
  if(!start)return fdLong(s.date);
  if(ms<=0)return 'уже начался';
  var m=Math.round(ms/60000);
  if(m<60)return 'через '+numWord(m,'минуту','минуты','минут');
  var h=Math.floor(m/60), rm=m%60;
  if(h<24)return 'через '+numWord(h,'час','часа','часов')+(rm?' '+numWord(rm,'минуту','минуты','минут'):'');
  var d=Math.floor(h/24);
  if(d===1)return 'завтра в '+(s.start||'');
  return 'через '+numWord(d,'день','дня','дней');
}
function isUpcoming(item){var s=item.slot||{}, sg=item.signup||{};return sg.status==='Записан'&&!s.started}
function mineRowHtml(item){
  var s=item.slot||{}, sg=item.signup||{}, site=parseSite(s.site||''), end=fmtEnd(s.start,s.length);
  var c=sg.status==='Записан'?'up':(sg.status==='Отменена'?'warn':'bad');
  return lrow({attrs:' data-open="'+s.row+'"', icon:rowIcon(s.site), title:esc(site.title), sub:esc(dayHeading(s.date))+' · '+esc(s.start||'—')+(end?'–'+end:''), amount:esc(fmtReward(s.reward)), line:esc(sg.status==='Записан'?(isUpcoming(item)?countdown(s):'выход прошёл'):sg.status), lineCls:c});
}
function pageHead(title, sub){return '<header class="phead"><div><h1>'+title+'</h1>'+(sub?'<p>'+sub+'</p>':'')+'</div></header>'}
function renderMine(){
  var all=D.mine||[], up=all.filter(isUpcoming).slice().sort(function(a,b){return slotStartMs(a.slot)-slotStartMs(b.slot)}), hist=all.filter(function(x){return !isUpcoming(x)});
  var h=pageHead('Мои записи')+'<div class="segtab"><button type="button" data-seg="up"'+(mineSeg==='up'?' class="on"':'')+'>Предстоящие · '+up.length+'</button><button type="button" data-seg="hist"'+(mineSeg==='hist'?' class="on"':'')+'>История · '+hist.length+'</button></div>';
  if(mineSeg==='up'){
    if(!up.length)h+='<div class="empty dk">'+emptyArt()+'<b>Нет предстоящих записей</b><span>Нажмите центральную кнопку, чтобы записаться</span></div>';
    else{
      var s=up[0].slot||{}, site=parseSite(s.site||''), end=fmtEnd(s.start,s.length);
      h+='<article class="ticket" data-open="'+s.row+'"><div class="mesh" aria-hidden="true"></div><div class="ticket-k">Ближайший выход · '+esc(countdown(s))+'</div><div class="ticket-title">'+esc(site.title)+'</div>'+(site.sub?'<div class="ticket-sub">'+esc(site.sub)+'</div>':'')
        +'<div class="ticket-row"><div class="feat-time">'+esc(s.start||'—')+(end?' — '+end:'')+'<small>'+esc(dayHeading(s.date))+'</small></div><div class="feat-pay">'+esc(fmtReward(s.reward))+'</div></div></article>';
      if(up.length>1)h+=card('Дальше:','<div class="lrows">'+up.slice(1).map(mineRowHtml).join('')+'</div>');
    }
  } else {
    h+=hist.length?card('История:','<div class="lrows">'+hist.map(mineRowHtml).join('')+'</div>'):'<div class="empty dk">'+emptyArt()+'<b>История пуста</b><span>Прошедшие и отменённые записи появятся здесь</span></div>';
  }
  $('#view').innerHTML=h;
  $('#view').querySelectorAll('.segtab button').forEach(function(b){b.onclick=function(){mineSeg=b.dataset.seg;render()}});
  $('#view').querySelectorAll('[data-open]').forEach(function(el){el.onclick=function(){openSignup(+el.dataset.open)}});
}

/* ---------- вознаграждение ---------- */
var NOTE='Вознаграждение рассчитано по объёму оказанных услуг в соответствии с договором. Чек НПД формируется исполнителем самостоятельно.';
function earnBody(p, opts){
  opts=opts||{};
  var h='';
  var rows=lrow({icon:rowIcon('','bag','#4F8BFF'), title:'Объём услуг', sub:esc(String(p.units).replace('.',','))+' ед. · по отчёту площадки', amount:money(p.volume), line:'стоимость услуг', lineCls:'muted'})
    +lrow({icon:rowIcon('','wallet','#22C08A'), title:'Вознаграждение', sub:esc(String(p.share).replace('.',','))+'% от объёма услуг', amount:money(p.reward,true), line:'по договору', lineCls:'up'});
  (p.deductions||[]).forEach(function(d){
    var col=d.kind==='quality'?'#FF5A6E':d.kind==='housing'?'#FF8A3D':'#F2B51B', icn=d.kind==='quality'?'alert':d.kind==='housing'?'home':'pay';
    rows+=lrow({cls:d.items&&d.items.length?'tap':'', attrs:d.items&&d.items.length?' data-ded="'+d.kind+'"':'', icon:rowIcon('',icn,col), title:esc(d.label), sub:d.kind==='quality'?numWord((d.items||[]).length,'случай','случая','случаев')+' · удержание по договору':(d.note?esc(d.note):'зачёт встречных требований'), amount:'<span class="neg">'+money(-d.amount)+'</span>', line:d.items&&d.items.length?'подробнее':'', lineCls:'muted'});
  });
  rows+='<div class="ltotal"><span>Итого к выплате</span><b>'+money(p.payout)+'</b></div>';
  if(p.carry)rows+='<p class="hint pad">Удержания превысили вознаграждение. Остаток '+money(p.carry)+' будет учтён в следующем периоде по согласованию сторон.</p>';
  h+=card('Расчёт за '+esc(shortRange(p.from,p.to))+':', '<div class="lrows">'+rows+'</div>');
  if(p.days&&p.days.length){
    var dr=p.days.slice().reverse().map(function(d){
      var x=dateParts(d.date), descr=d.items.map(function(it){return it.descr}).join(' + ');
      return lrow({icon:'<span class="ricon day">'+(x?x.d:'')+'<small>'+(x?WD[x.dt.getDay()]:'')+'</small></span>', title:esc(dayHeading(d.date)), sub:esc(descr), amount:money(d.value), line:esc(String(d.units).replace('.',','))+' ед.', lineCls:'muted'});
    }).join('');
    h+=card('По дням · '+numWord(p.days.length,'выход','выхода','выходов')+':', '<div class="lrows">'+dr+'</div>');
  }
  h+='<p class="note">'+NOTE+'</p>';
  return h;
}
function bindEarn(p, root){
  (root||$('#view')).querySelectorAll('[data-ded]').forEach(function(el){el.onclick=function(){
    var d=(p.deductions||[]).filter(function(x){return x.kind===el.dataset.ded})[0]; if(!d)return;
    openSheet('<h3>'+esc(d.label)+'</h3><p class="hint">Удержание по договору (зачёт встречных требований) по данным заказчика</p><div class="lrows">'+(d.items||[]).map(function(it){
      return lrow({icon:rowIcon('','alert','#FF5A6E'), title:esc(it.date?dayHeading(it.date):'Дополнительно'), sub:esc(it.text), amount:'<span class="neg">'+money(-it.amount)+'</span>'});
    }).join('')+'</div>');
  }});
}
function renderEarn(){
  var p=curPeriod();
  var head='<section class="whero sm"><div class="mesh" aria-hidden="true"></div>'+heroHead(p?parseSite(p.site).short:'Расчёт', p?periodLabel(p):null);
  if(!E){$('#view').innerHTML=head+'<div class="big"><span class="sk sk-big"></span></div></section>'+skel(); bindHome(); return}
  if(!p){
    $('#view').innerHTML=head+'<div class="hk">Вознаграждение</div><div class="big"><span class="big-int">—</span></div><div class="delta muted">Расчёт пока не опубликован</div></section>'
      +'<div class="empty dk">'+emptyArt()+'<b>Здесь появится ваш расчёт</b><span>После того как площадка пришлёт отчёт об объёме услуг и администратор его проверит</span></div><p class="note">'+NOTE+'</p>';
    bindHome(); return;
  }
  $('#view').innerHTML=head+'<div class="hk">К выплате · '+esc(shortRange(p.from,p.to))+'</div><div class="big">'+bigMoney(p.payout)+'</div>'+deltaHtml(p)+'</section>'+earnBody(p);
  bindHome(); bindEarn(p);
}

/* ---------- профиль ---------- */
function renderProfile(){
  var u=(D&&D.user)||{};
  var h=pageHead('Профиль')+card('Данные:','<div class="lrows">'
    +lrow({icon:'<span class="ricon site" style="--c:#7C6CFF">'+esc(initials(u.name))+'</span>', title:esc(u.name||'—'), sub:esc(fmtPhone(u.phone))})
    +lrow({icon:rowIcon('','map','#22C08A'), title:'Площадка оказания услуг', sub:esc(u.site?parseSite(u.site).title+(parseSite(u.site).sub?' · '+parseSite(u.site).sub:''):'не указана')})
    +lrow({icon:rowIcon('','link','#4F8BFF'), title:'Идентификатор в системе заказчика', sub:esc(u.extId||'не указан, сопоставление по ФИО')})
    +'</div>')
    +'<div class="stack"><button class="btn s" id="prf">'+ic('refresh','sm')+' Обновить</button><button class="btn s" id="plo">'+ic('logout','sm')+' Выйти</button></div>'
    +'<p class="note">Площадку и идентификатор меняет администратор. '+NOTE+'</p>';
  $('#view').innerHTML=h;
  $('#prf').onclick=function(){E=null;load()}; $('#plo').onclick=logout;
}

/* ---------- админ: выходы ---------- */
function adminHero(){
  var slots=D.slots||[], open=slots.filter(function(s){return s.status==='Открыт'}), places=0, taken=0;
  open.forEach(function(s){places+=(+s.places||0); taken+=(+s.taken||0)});
  var fill=places?Math.round(taken/places*100):0, pend=(D.contractors||[]).filter(function(u){return u.status==='Ожидает'}).length;
  return '<section class="whero"><div class="mesh" aria-hidden="true"></div>'+heroHead(F.site?parseSite(F.site).short:'Все площадки', null)
    +'<div class="hk">Открытые выходы</div><div class="big"><span class="big-int">'+open.length+'</span><span class="big-dec"> · '+fill+'% мест занято</span></div>'
    +'<div class="delta '+(pend?'warn':'up')+'">'+(pend?numWord(pend,'заявка ждёт','заявки ждут','заявок ждут')+' одобрения':'новых заявок нет')+' · '+taken+' из '+numWord(places,'места','мест','мест')+'</div>'
    +glassActions([['newslot','plus','Создать выход'],['people','users','Исполнители'],['calc','wallet','Расчёты']])+'</section>';
}
function renderSlotsAdmin(){
  var list=filterSlots(D.slots||[]);
  var cnt={}; (D.slots||[]).forEach(function(s){if(!F.site||s.site===F.site)cnt[s.date]=(cnt[s.date]||0)+1});
  var chips=Object.keys(cnt).sort().filter(function(d){return d>=today()}).slice(0,12).map(function(d){var x=dateParts(d);return '<button type="button" class="qchip'+(F.date===d?' on':'')+'" data-date="'+d+'">'+esc(WD[x.dt.getDay()]+' '+x.d)+' · <b class="up">'+cnt[d]+'</b></button>'});
  if(F.date)chips.push('<button type="button" class="qchip" data-date="">Все даты ✕</button>');
  $('#view').innerHTML=adminHero()+chipsRow('Даты:', chips)+card('Выходы:', searchBox()+'<div id="slist">'+slotsList(list,true)+'</div>', listTools());
  bindHome();
}

function slotFormFields(s){
  s=s||{};
  var hours=s.length?((s.length/60).toString().replace(/\.0$/,'').replace('.',',')):'';
  var sites=(D&&D.sites)||[], opts='<option value="">Выберите площадку</option>';
  sites.forEach(function(x){var n=x.site||'';opts+='<option value="'+esc(n)+'"'+(n===(s.site||'')?' selected':'')+'>'+esc(n)+'</option>'});
  return '<label class="fld"><span>Площадка</span><select id="ssite">'+opts+'</select></label>'
    +'<div class="two"><label class="fld"><span>Дата</span><input id="sdate" type="date" value="'+esc(s.date||'')+'"></label>'
    +'<label class="fld"><span>Начало</span><input id="sstime" type="time" value="'+esc(s.start||'')+'"></label></div>'
    +'<div class="two"><label class="fld"><span>Длительность, часов</span><input id="slen" type="text" inputmode="decimal" placeholder="11" value="'+esc(hours)+'"></label>'
    +'<label class="fld"><span>Мест</span><input id="splaces" type="number" min="1" value="'+(s.places||'')+'"></label></div>'
    +'<label class="fld"><span>Вид услуг</span><input id="svac" value="'+esc(s.vacancy||'')+'"></label>'
    +'<label class="fld"><span>Вознаграждение</span><input id="srew" value="'+esc(s.reward||'')+'"></label>'
    +'<label class="fld"><span>Комментарий</span><textarea id="scom">'+esc(s.comment||'')+'</textarea></label>';
}
function readSlotForm(){
  var hours=String($('#slen').value||'').replace(',','.');
  return {site:$('#ssite').value,date:$('#sdate').value,start:$('#sstime').value,length:Math.round(parseFloat(hours||'0')*60),places:+$('#splaces').value,vacancy:$('#svac').value,reward:$('#srew').value,comment:$('#scom').value};
}
function prefillsFromSite(){
  var name=$('#ssite').value, site=((D&&D.sites)||[]).filter(function(s){return s.site===name})[0];
  if(!site)return;
  if(!$('#svac').value&&site.vacancies)$('#svac').value=site.vacancies;
  if(!$('#srew').value&&site.rate)$('#srew').value=site.rate;
}
function weekBoxes(from){
  from=from||today(); var h='',i,d,p,dt;
  for(i=0;i<7;i++){d=addDays(from,i); p=d.split('-'); dt=new Date(+p[0],+p[1]-1,+p[2]); h+='<label><input type="checkbox" class="wd" value="'+d+'"'+(i===0?' checked':'')+'> '+WD[dt.getDay()]+' '+p[2]+'.'+p[1]+'</label>';}
  return h;
}
function openSlotForm(s){
  var edit=!!(s&&s.row);
  var extra=edit?'':'<label class="fld"><span>Даты (можно выбрать несколько дней)</span></label><div class="week" id="wdays">'+weekBoxes(s&&s.date||today())+'</div>';
  openSheet('<h3>'+(edit?'Редактировать выход':'Новый выход')+'</h3>'+slotFormFields(s||{date:today(),start:'09:00',length:660,places:1})+extra,
    '<button class="btn" id="ssave">'+(edit?'Сохранить':'Создать')+'</button>');
  $('#ssite').onchange=prefillsFromSite;
  if(!edit)prefillsFromSite();
  if($('#sdate')){var syncW=function(){if($('#wdays'))$('#wdays').innerHTML=weekBoxes($('#sdate').value||today())};$('#sdate').onchange=syncW;$('#sdate').oninput=syncW;}
  $('#ssave').onclick=function(){
    var body=readSlotForm();
    if(!edit){var dates=[]; var box=$('#wdays'); if(box)box.querySelectorAll('.wd:checked').forEach(function(x){dates.push(x.value)}); if(!dates.length)dates=[body.date]; body.dates=dates; body.date=dates[0];}
    if(edit)body.row=s.row;
    $('#ssave').disabled=true;
    api(Object.assign({action:edit?'updateSlot':'createSlot'},body)).then(function(j){
      if(!j.ok){toast(errText(j.error),'bad');$('#ssave').disabled=false;return}
      toast(edit?'Сохранено':'Выход создан','ok'); closeSheet(); load();
    }).catch(function(){toast(netErr(),'bad');$('#ssave').disabled=false});
  };
}
function openAdminSlot(row){
  var s=(D.slots||[]).filter(function(x){return x.row===row})[0]; if(!s)return;
  var sigs=s.signups||[], active=sigs.filter(function(x){return x.status==='Записан'}), other=sigs.filter(function(x){return x.status!=='Записан'});
  var people=active.map(function(x){return lrow({icon:'<span class="ricon site" style="--c:'+siteColor(x.name)+'">'+esc(initials(x.name))+'</span>', title:esc(x.name), sub:esc(fmtPhone(x.phone)), amount:'<button class="btn xs s" data-rm="'+x.row+'">Снять</button>'})}).join('')
    +other.map(function(x){return lrow({icon:'<span class="ricon site" style="--c:#3A3A48">'+esc(initials(x.name))+'</span>', title:esc(x.name), sub:esc(fmtPhone(x.phone)), line:esc(x.status), lineCls:'warn'})}).join('');
  var h=sheetHero(s)+'<h4 class="subhead">Записавшиеся · '+placesLeft(s).taken+' из '+placesLeft(s).places+'</h4>'
    +(sigs.length?'<div class="lrows">'+people+'</div>':'<div class="empty dk sm"><b>Пока никто не записался</b></div>')
    +'<div class="lrows">'+lrow({icon:rowIcon('','bag','#4F8BFF'), title:'Вид услуг', sub:esc(gph(s.vacancy||'—'))})+(s.comment?lrow({icon:rowIcon('','file','#F2B51B'), title:'Комментарий', sub:esc(s.comment)}):'')+'</div>'
    +(s.req?'<div class="reqbox"><div class="rh">'+ic('shield','sm')+' Требования</div><div class="rt">'+hlReq(s.req)+'</div></div>':'');
  openSheet(h, '<button class="btn" id="sedit">Редактировать</button><div class="cta-row"><button class="btn s" id="scopy">Копировать</button><button class="btn s" id="sclose">'+(s.status==='Закрыт'?'Открыть выход':'Закрыть выход')+'</button></div>');
  $('#sedit').onclick=function(){openSlotForm(s)};
  $('#sclose').onclick=function(){api({action:'closeSlot',row:s.row}).then(function(j){if(!j.ok){toast(errText(j.error),'bad');return}toast(j.status==='Закрыт'?'Выход закрыт':'Выход открыт','ok');closeSheet();load()}).catch(function(){toast(netErr(),'bad')})};
  $('#scopy').onclick=function(){
    openSheet('<h3>Копировать выход</h3><p class="hint">Будут созданы такие же выходы на следующие дни после '+fd(s.date)+'.</p><label class="fld"><span>Сколько следующих дней</span><input id="cdays" type="number" min="1" max="31" value="6"></label>','<button class="btn" id="cgo">Создать копии</button>');
    $('#cgo').onclick=function(){$('#cgo').disabled=true;api({action:'copySlot',row:s.row,days:+$('#cdays').value}).then(function(j){if(!j.ok){toast(errText(j.error),'bad');$('#cgo').disabled=false;return}toast('Создано выходов: '+((j.rows&&j.rows.length)||0),'ok');closeSheet();load()}).catch(function(){toast(netErr(),'bad');$('#cgo').disabled=false})};
  };
  $('#sheet').querySelectorAll('[data-rm]').forEach(function(b){b.onclick=function(ev){ev.stopPropagation(); if(!confirm('Снять исполнителя с этого выхода?'))return;
    api({action:'removeSignup',row:+b.dataset.rm}).then(function(j){if(!j.ok){toast(errText(j.error),'bad');return}toast('Снят с выхода','ok');closeSheet();load()}).catch(function(){toast(netErr(),'bad')})}});
}

/* ---------- админ: исполнители ---------- */
function stCls(st){return st==='Одобрен'?'up':st==='Заблокирован'||st==='Отклонён'?'bad':'warn'}
function renderPeople(){
  var list=(D.contractors||[]).slice().sort(function(a,b){return (a.status==='Ожидает'?0:1)-(b.status==='Ожидает'?0:1)}), pend=list.filter(function(u){return u.status==='Ожидает'}).length;
  var rows=list.map(function(u){return lrow({attrs:' data-u="'+u.row+'"', icon:'<span class="ricon site" style="--c:'+siteColor(u.name)+'">'+esc(initials(u.name))+'</span>', title:esc(u.name), sub:esc(fmtPhone(u.phone))+(u.site?' · '+esc(parseSite(u.site).short):'')+(u.extId?' · ID '+esc(u.extId):''), amount:'', line:esc(u.status), lineCls:stCls(u.status)})}).join('');
  $('#view').innerHTML=pageHead('Исполнители', numWord(list.length,'исполнитель','исполнителя','исполнителей')+(pend?' · '+pend+' ждут одобрения':''))
    +(list.length?card('Список:','<div class="lrows">'+rows+'</div>'):'<div class="empty dk">'+emptyArt()+'<b>Пока нет исполнителей</b><span>Заявки появятся после регистрации</span></div>');
  $('#view').querySelectorAll('[data-u]').forEach(function(el){el.onclick=function(){openPerson(+el.dataset.u)}});
}
function openPerson(row){
  var u=(D.contractors||[]).filter(function(x){return x.row===row})[0]; if(!u)return;
  var sites=(D&&D.sites)||[], opts='<option value="">Не указана</option>';
  sites.forEach(function(s){opts+='<option value="'+esc(s.site)+'"'+(u.site===s.site?' selected':'')+'>'+esc(s.site)+'</option>'});
  var acts='';
  if(u.status!=='Одобрен')acts+='<button class="btn" data-st="Одобрен">Одобрить</button>';
  acts+='<div class="cta-row">'+(u.status!=='Заблокирован'?'<button class="btn s" data-st="Заблокирован">Заблокировать</button>':'')+(u.status==='Ожидает'?'<button class="btn s" data-st="Отклонён">Отклонить</button>':'')+'</div>';
  openSheet('<div class="sh-top">'+'<span class="ricon site big" style="--c:'+siteColor(u.name)+'">'+esc(initials(u.name))+'</span><div><h3>'+esc(u.name)+'</h3><div class="sh-sub">'+esc(fmtPhone(u.phone))+' · <span class="'+stCls(u.status)+'">'+esc(u.status)+'</span></div></div></div>'
    +'<label class="fld"><span>Площадка оказания услуг</span><select id="psite">'+opts+'</select></label>'
    +'<label class="fld"><span>Идентификатор в системе заказчика</span><input id="pext" value="'+esc(u.extId||'')+'" placeholder="логин или ФИО как в отчёте"></label>'
    +'<button class="btn s" id="psave">Сохранить площадку и идентификатор</button>', acts);
  $('#psave').onclick=function(){api({action:'updateContractor',row:u.row,site:$('#psite').value,extId:$('#pext').value}).then(function(j){if(!j.ok){toast(errText(j.error),'bad');return}toast('Сохранено','ok');closeSheet();load()}).catch(function(){toast(netErr(),'bad')})};
  $('#sheet').querySelectorAll('[data-st]').forEach(function(b){b.onclick=function(){api({action:'updateContractor',row:u.row,status:b.dataset.st}).then(function(j){if(!j.ok){toast(errText(j.error),'bad');return}toast('Статус обновлён','ok');closeSheet();load()}).catch(function(){toast(netErr(),'bad')})}});
}

/* ---------- админ: расчёты ---------- */
var MSTAT={manual:['вручную','up'],id:['по идентификатору','up'],name:['по ФИО','up'],ambiguous:['неоднозначно','warn'],none:['нет пары','bad'],skip:['исключён','muted']};
function loadCalc(id){
  api({action:'calcList'},{timeout:40000}).then(function(j){
    if(!j.ok){toast(errText(j.error),'bad');return}
    C=j; var pid=id||CPid||(j.periods[0]&&j.periods[0].id)||'';
    if(pid)loadCalcPeriod(pid); else {CP=null; if(tab==='calc')render();}
  }).catch(function(){toast(netErr(),'bad')});
}
function loadCalcPeriod(id){
  CPid=id; if(tab==='calc')render();
  api({action:'calcPeriod',id:id},{timeout:60000}).then(function(j){
    if(!j.ok){toast(errText(j.error),'bad');return}
    CP=j; if(tab==='calc')render();
  }).catch(function(){toast(netErr(),'bad')});
}
function renderCalc(){
  var per=CP&&CP.period&&CP.period.id===CPid?CP.period:null;
  var h='<section class="whero"><div class="mesh" aria-hidden="true"></div>'+heroHead(per?parseSite(per.site).short:'Расчёты', per?periodLabel(per)+' · '+(per.status==='Опубликован'?'опубликован':'черновик'):(C&&C.periods.length?'Период':'Нет периодов'));
  if(!C||(CPid&&!per)){ $('#view').innerHTML=h+'<div class="big"><span class="sk sk-big"></span></div></section>'+skel(); bindHome(); var hs0=$('#hsite'); if(hs0)hs0.onclick=openCalcPeriodPicker; return; }
  if(!per){
    $('#view').innerHTML=h+'<div class="hk">Вознаграждение исполнителей</div><div class="big"><span class="big-int">0</span><span class="big-dec"> периодов</span></div><div class="delta muted">Загрузите файл площадки, чтобы рассчитать вознаграждение</div>'
      +glassActions([['upload','upload','Загрузить файл']])+'</section>';
    bindHome(); var hs1=$('#hsite'); if(hs1)hs1.onclick=openCalcPeriodPicker; return;
  }
  var k=CP.counts||{}, ok=(k.manual||0)+(k.id||0)+(k.name||0), bad=(k.none||0)+(k.ambiguous||0);
  h+='<div class="hk">К выплате · '+esc(shortRange(per.from,per.to))+(per.dataTo?' · данные по '+fd(per.dataTo):'')+'</div><div class="big">'+bigMoney(per.payout)+'</div>'
    +'<div class="delta muted">Объём '+money(per.volume)+' · '+esc(String(per.share))+'% = '+money(per.reward)+' · удержания <span class="neg">'+money(-per.deductions)+'</span></div>'
    +glassActions([['upload','upload','Загрузить'],['publish',per.status==='Опубликован'?'eye':'check',per.status==='Опубликован'?'Снять':'Опубликовать'],['export','download','Выгрузить']])+'</section>';
  var chips=['<span class="qchip"><i class="dotc" style="--c:#22C08A"></i>Сопоставлено <b class="up">'+ok+'</b></span>',
    '<button type="button" class="qchip" data-flt="bad"><i class="dotc" style="--c:#FF5A6E"></i>Нет пары <b class="pink">'+bad+'</b></button>',
    '<span class="qchip">Исполнителей в файле <b>'+per.npeople+'</b></span>','<span class="qchip">Строк <b>'+per.nrows+'</b></span>',
    '<span class="qchip">Доля <b class="up">'+esc(String(per.share))+'%</b></span>'];
  h+=chipsRow('Статус:', chips);
  var persons=(CP.persons||[]).slice();
  if(F.calcBad)persons=persons.filter(function(x){return x.match.status==='none'||x.match.status==='ambiguous'});
  var q=String(F.cq||'').toLowerCase(); if(q)persons=persons.filter(function(x){return (x.name+' '+x.key).toLowerCase().indexOf(q)>=0});
  persons.sort(function(a,b){return b.payout-a.payout});
  var rows=persons.map(function(x){
    var m=MSTAT[x.match.status]||['',''];
    return lrow({attrs:' data-k="'+esc(x.key)+'"', icon:'<span class="ricon site" style="--c:'+siteColor(x.name)+'">'+esc(initials(x.name))+'</span>', title:esc(x.name||x.key), sub:esc(x.key.replace(/^n:/,''))+' · '+(x.match.exec?esc(x.match.exec.name):'<span class="'+m[1]+'">'+m[0]+'</span>'),
      amount:money(x.payout), line:x.deductions?'<span class="neg">'+money(-x.deductions)+'</span>':'+'+money(x.reward).replace(/\u00a0₽$/,'')+' · '+m[0], lineCls:x.deductions?'':m[1]});
  }).join('');
  h+=card((F.calcBad?'Без пары:':'Исполнители в файле:'), '<div class="qsearch">'+ic('search','sm')+'<input id="cq" placeholder="ФИО или идентификатор" value="'+esc(F.cq||'')+'"></div><div class="lrows" id="clist">'+rows+'</div>', '<button type="button" class="tbtn'+(F.calcBad?' on':'')+'" id="cbad" aria-label="Только без пары">'+ic('sliders','sm')+'</button>');
  if(per.notes)h+='<p class="note">'+esc(per.notes)+'</p>';
  h+='<p class="note">Файл: '+esc(per.file||'—')+' · '+esc(per.uploaded||'')+(per.archive?'<br>Архив: '+esc(per.archive):'')+'</p>';
  if(per.status!=='Опубликован')h+='<div class="stack"><button class="btn s" id="cdel">'+ic('trash','sm')+' Удалить черновик</button></div>';
  $('#view').innerHTML=h; bindHome();
  var hs=$('#hsite'); if(hs)hs.onclick=openCalcPeriodPicker;
  $('#view').querySelectorAll('[data-k]').forEach(function(el){el.onclick=function(){openCalcPerson(el.dataset.k)}});
  var cb=$('#cbad'); if(cb)cb.onclick=function(){F.calcBad=!F.calcBad;render()};
  var fb=$('[data-flt="bad"]'); if(fb)fb.onclick=function(){F.calcBad=!F.calcBad;render()};
  var cq=$('#cq'); if(cq)cq.oninput=function(){F.cq=cq.value; clearTimeout(cq._t); cq._t=setTimeout(function(){var pos=cq.selectionStart;render();var n=$('#cq');if(n){n.focus();try{n.setSelectionRange(pos,pos)}catch(e){}}},250)};
  var cd=$('#cdel'); if(cd)cd.onclick=function(){if(!confirm('Удалить черновик расчёта за '+shortRange(per.from,per.to)+'? Строки и ручные удержания будут удалены.'))return;
    api({action:'calcDeletePeriod',id:per.id}).then(function(j){if(!j.ok){toast(errText(j.error),'bad');return}toast('Черновик удалён','ok');CP=null;CPid='';loadCalc()}).catch(function(){toast(netErr(),'bad')})};
}
function openCalcPeriodPicker(){
  var l=(C&&C.periods)||[], h='<h3>Периоды расчёта</h3><div class="lrows">';
  l.forEach(function(p){h+=lrow({attrs:' data-p="'+p.id+'"', icon:rowIcon(p.site), title:esc(periodLabel(p))+' · '+esc(parseSite(p.site).short), sub:esc(shortRange(p.from,p.to))+' · '+numWord(p.npeople,'исполнитель','исполнителя','исполнителей'), amount:money(p.payout), line:p.status==='Опубликован'?'опубликован':'черновик', lineCls:p.status==='Опубликован'?'up':'warn'})});
  if(!l.length)h+='<div class="empty dk sm"><b>Периодов пока нет</b></div>';
  openSheet(h+'</div>','<button class="btn" id="pup">'+ic('upload','sm')+' Загрузить файл площадки</button>');
  $('#shBody').querySelectorAll('[data-p]').forEach(function(el){el.onclick=function(){closeSheet();loadCalcPeriod(el.dataset.p)}});
  $('#pup').onclick=openUpload;
}
function openUpload(){
  var sites=(C&&C.sites)||[], opts='<option value="">Выберите площадку</option>';
  sites.forEach(function(s){opts+='<option value="'+esc(s.site)+'" data-share="'+s.share+'" data-parser="'+esc(s.parserTitle)+'"'+(/северн/i.test(s.site)?' selected':'')+'>'+esc(s.site)+'</option>'});
  openSheet('<div class="sh-glow"></div><h3>Загрузить файл площадки</h3><p class="hint">У каждой площадки свой формат. Строки разбираются автоматически, расчёт сохраняется черновиком и не виден исполнителям до публикации.</p>'
    +'<label class="fld"><span>Площадка</span><select id="usite">'+opts+'</select></label><p class="hint" id="uparser"></p>'
    +'<div class="two"><label class="fld"><span>Период с <em>необязательно</em></span><input id="ufrom" type="date"></label><label class="fld"><span>по</span><input id="uto" type="date"></label></div>'
    +'<label class="fld"><span>Доля вознаграждения, %</span><input id="ushare" type="number" min="1" max="100" step="0.5" value="65"></label>'
    +'<label class="fld"><span>Файл (.xlsm, .xlsx, .csv)</span><input id="ufile" type="file" accept=".xlsm,.xlsx,.csv"></label><div id="ust" class="errline"></div>',
    '<button class="btn" id="ugo">'+ic('upload','sm')+' Загрузить и рассчитать</button>');
  function sync(){var o=$('#usite').selectedOptions[0]; if(o&&o.value){$('#ushare').value=o.dataset.share||65; $('#uparser').textContent='Формат: '+(o.dataset.parser||'');} else $('#uparser').textContent='';}
  $('#usite').onchange=sync; sync();
  $('#ugo').onclick=function(){doUpload(false)};
}
function doUpload(replace){
  var f=$('#ufile').files[0], site=$('#usite').value;
  if(!site){toast('Выберите площадку','bad');return} if(!f){toast('Выберите файл','bad');return}
  var b=$('#ugo'); b.disabled=true; $('#ust').textContent='Читаем файл…';
  var rd=new FileReader();
  rd.onload=function(){
    var b64=String(rd.result).split(',')[1]||'';
    $('#ust').textContent='Разбираем и считаем, это до минуты…';
    api({action:'calcUpload',site:site,name:f.name,mime:f.type,b64:b64,share:+$('#ushare').value,from:$('#ufrom').value,to:$('#uto').value,replacePublished:!!replace},{timeout:240000,retries:0}).then(function(j){
      if(!j.ok){
        if(j.error==='published'&&!replace){if(confirm('Расчёт за этот период уже опубликован. Обновить его данными из нового файла? Исполнители сразу увидят новые цифры.'))return doUpload(true);}
        $('#ust').textContent=errText(j.error)+(j.notes?': '+j.notes.join('; '):''); b.disabled=false; return;
      }
      toast('Загружено: '+numWord(j.totals.npeople,'исполнитель','исполнителя','исполнителей'),'ok'); closeSheet(); CP=null; loadCalc(j.id);
    }).catch(function(e){$('#ust').textContent=e&&e.message==='timeout'?errText('timeout'):netErr(); b.disabled=false});
  };
  rd.readAsDataURL(f);
}
function togglePublish(){
  var per=CP&&CP.period; if(!per)return;
  var pub=per.status!=='Опубликован';
  if(!confirm(pub?'Опубликовать расчёт за '+shortRange(per.from,per.to)+'? Исполнители с сопоставлением увидят свои суммы.':'Снять публикацию? Исполнители перестанут видеть этот период.'))return;
  api({action:'calcPublish',id:per.id,unpublish:!pub}).then(function(j){if(!j.ok){toast(errText(j.error),'bad');return}toast(pub?'Опубликовано':'Публикация снята','ok');loadCalc(per.id)}).catch(function(){toast(netErr(),'bad')});
}
function exportCalc(){
  var per=CP&&CP.period; if(!per)return;
  toast('Готовим выгрузку…');
  api({action:'calcExport',id:per.id},{timeout:60000}).then(function(j){
    if(!j.ok){toast(errText(j.error),'bad');return}
    function cell(v){v=String(v==null?'':v);if(/[;"\n]/.test(v))return'"'+v.replace(/"/g,'""')+'"';return v}
    var lines=[j.head.map(cell).join(';')].concat(j.rows.map(function(r){return r.map(function(v){return typeof v==='number'?String(v).replace('.',','):v}).map(cell).join(';')}));
    downloadCsv(lines.join('\n'),'raschet_'+per.from+'_'+per.to+'.csv');
    toast('Выгружено строк: '+j.count+' (лист «'+j.sheet+'»)','ok');
  }).catch(function(){toast(netErr(),'bad')});
}
function openCalcPerson(key){
  var per=CP.period, x=(CP.persons||[]).filter(function(p){return p.key===key})[0]; if(!x)return;
  var m=MSTAT[x.match.status]||['',''], man=x.manual||{};
  var opts='<option value="">— выберите исполнителя —</option>';
  var cands=x.match.candidates||[];
  (CP.contractors||[]).forEach(function(c){opts+='<option value="'+c.row+'"'+(x.match.exec&&x.match.exec.row===c.row?' selected':'')+'>'+esc(c.name)+' · '+esc(fmtPhone(c.phone))+(cands.some(function(z){return z.row===c.row})?' ★':'')+'</option>'});
  var rows=lrow({icon:rowIcon('','bag','#4F8BFF'), title:'Объём услуг', sub:esc(String(x.units).replace('.',','))+' ед. · '+numWord(x.days.length,'день','дня','дней'), amount:money(x.volume)})
    +lrow({icon:rowIcon('','wallet','#22C08A'), title:'Вознаграждение '+esc(String(per.share))+'%', amount:money(x.reward,true)})
    +lrow({icon:rowIcon('','alert','#FF5A6E'), title:'Качество по файлу', sub:numWord(x.qItems.length,'случай','случая','случаев'), amount:'<span class="neg">'+money(-x.qualityFile)+'</span>'})
    +'<div class="ltotal"><span>К выплате</span><b>'+money(x.payout)+'</b></div>';
  var q=x.qItems.map(function(it){return lrow({icon:rowIcon('','alert','#FF5A6E'), title:esc(dayHeading(it.date)), sub:esc(it.type+(it.descr?': '+it.descr:'')), amount:'<span class="neg">'+money(-it.amount)+'</span>'})}).join('');
  openSheet('<div class="sh-top"><span class="ricon site big" style="--c:'+siteColor(x.name)+'">'+esc(initials(x.name))+'</span><div><h3>'+esc(x.name)+'</h3><div class="sh-sub">'+esc(x.key.replace(/^n:/,''))+' · <span class="'+m[1]+'">'+m[0]+'</span>'+(x.match.exec?' · '+esc(x.match.exec.name):'')+'</div></div></div>'
    +'<div class="lrows">'+rows+'</div>'
    +'<h4 class="subhead">Сопоставление</h4><label class="fld"><span>Исполнитель в приложении'+(cands.length?' (★ — подходят по ФИО)':'')+'</span><select id="lsel">'+opts+'</select></label>'
    +'<div class="cta-row"><button class="btn s" id="lsave">'+ic('link','sm')+' Связать</button>'+(x.match.status==='manual'?'<button class="btn s" id="lclear">Убрать связь</button>':'<button class="btn s" id="lskip">Не сопоставлять</button>')+'</div>'
    +'<h4 class="subhead">Удержания вручную</h4>'
    +'<div class="two"><label class="fld"><span>Проживание (зачёт), ₽</span><input id="dh" type="number" min="0" step="0.01" value="'+(man.housing?man.housing.amount:'')+'"></label><label class="fld"><span>Предоплата, ₽</span><input id="dp" type="number" min="0" step="0.01" value="'+(man.prepay?man.prepay.amount:'')+'"></label></div>'
    +'<label class="fld"><span>Качество услуг, если нет в файле, ₽</span><input id="dq" type="number" min="0" step="0.01" value="'+(man.quality?man.quality.amount:'')+'"></label>'
    +'<button class="btn s" id="dsave">Сохранить удержания</button>'
    +(q?'<h4 class="subhead">Качество по файлу</h4><div class="lrows">'+q+'</div>':''),
    '<button class="btn" id="pview">'+ic('eye','sm')+' Как увидит исполнитель</button>');
  function after(j){if(!j.ok){toast(errText(j.error),'bad');return false}return true}
  $('#lsave').onclick=function(){var r=+$('#lsel').value; if(!r){toast('Выберите исполнителя','bad');return}
    api({action:'calcLink',site:per.site,key:x.key,name:x.name,exec:r}).then(function(j){if(after(j)){toast('Связано','ok');closeSheet();loadCalcPeriod(per.id)}}).catch(function(){toast(netErr(),'bad')})};
  var lc=$('#lclear'); if(lc)lc.onclick=function(){api({action:'calcLink',site:per.site,key:x.key,clear:true}).then(function(j){if(after(j)){toast('Связь убрана','ok');closeSheet();loadCalcPeriod(per.id)}}).catch(function(){toast(netErr(),'bad')})};
  var ls=$('#lskip'); if(ls)ls.onclick=function(){api({action:'calcLink',site:per.site,key:x.key,name:x.name,exec:0}).then(function(j){if(after(j)){toast('Исключён из сопоставления','ok');closeSheet();loadCalcPeriod(per.id)}}).catch(function(){toast(netErr(),'bad')})};
  $('#dsave').onclick=function(){
    var b=$('#dsave'); b.disabled=true;
    var jobs=[['housing','#dh'],['prepay','#dp'],['quality','#dq']].map(function(z){return function(){return api({action:'calcSetDeduction',id:per.id,key:x.key,kind:z[0],amount:+($(z[1]).value||0)})}});
    jobs.reduce(function(pr,fn){return pr.then(function(r){if(r&&!r.ok)throw new Error(r.error);return fn()})},Promise.resolve(null)).then(function(r){if(r&&!r.ok)throw new Error(r.error);toast('Удержания сохранены','ok');closeSheet();loadCalcPeriod(per.id)}).catch(function(e){toast(errText(e&&e.message),'bad');b.disabled=false});
  };
  $('#pview').onclick=function(){
    api({action:'calcPreviewAs',id:per.id,key:x.key}).then(function(j){
      if(!after(j))return; var p=j.periods[0];
      openSheet('<div class="preview-tag">Так увидит исполнитель'+(j.draft?' после публикации':'')+'</div><section class="whero sm in-sheet"><div class="mesh"></div><div class="hk">К выплате · '+esc(shortRange(p.from,p.to))+'</div><div class="big">'+bigMoney(p.payout)+'</div></section>'+earnBody(p));
      bindEarn(p, $('#shBody'));
    }).catch(function(){toast(netErr(),'bad')});
  };
}

/* ---------- админ: ещё ---------- */
function toCsv(rows){
  function cell(v){v=String(v==null?'':v);if(/[;"\n]/.test(v))return'"'+v.replace(/"/g,'""')+'"';return v}
  var head=['Дата','Площадка','Начало','Длительность_мин','Вид услуг','Вознаграждение','Исполнитель','Телефон','Статус записи','Комментарий'];
  return [head.join(';')].concat((rows||[]).map(function(r){return [r.date,r.site,r.start,r.length,r.vacancy,r.reward,r.name,r.phone,r.status,r.comment].map(cell).join(';')})).join('\n');
}
function downloadCsv(text,name){
  var blob=new Blob(['\ufeff'+text],{type:'text/csv;charset=utf-8'});
  var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},1000);
}
function renderMore(){
  var sites=(D&&D.sites)||[], opts='<option value="">Все площадки</option>';
  sites.forEach(function(s){opts+='<option value="'+esc(s.site)+'">'+esc(s.site)+'</option>'});
  $('#view').innerHTML=pageHead('Ещё','Настройки записи и выгрузки')
    +card('Окно отмены:','<p class="hint pad">Исполнитель может отменить запись не позднее чем за указанное число часов до начала выхода.</p><div class="pad"><label class="fld"><span>Часов до начала</span><input id="chours" type="number" min="0" max="168" value="'+(D.cancel_hours||12)+'"></label><button class="btn" id="csave">Сохранить</button></div>')
    +card('Выгрузка записей:','<p class="hint pad">Список записей за дату и площадку на лист «Выгрузка_выходов» и в CSV.</p><div class="pad"><label class="fld"><span>Дата</span><input id="edate" type="date" value="'+today()+'"></label><label class="fld"><span>Площадка (необязательно)</span><select id="esite">'+opts+'</select></label><button class="btn" id="ego">Выгрузить</button></div>')
    +'<div class="stack"><button class="btn s" id="mrf">'+ic('refresh','sm')+' Обновить</button><button class="btn s" id="mlo">'+ic('logout','sm')+' Выйти</button></div>';
  $('#csave').onclick=function(){api({action:'setZapisSetting',cancel_hours:+$('#chours').value}).then(function(j){if(!j.ok){toast(errText(j.error),'bad');return}toast('Сохранено','ok');load()}).catch(function(){toast(netErr(),'bad')})};
  $('#ego').onclick=function(){$('#ego').disabled=true;api({action:'exportSlots',date:$('#edate').value,site:$('#esite').value}).then(function(j){$('#ego').disabled=false;if(!j.ok){toast(errText(j.error),'bad');return}downloadCsv(toCsv(j.rows),'vyhody_'+$('#edate').value+'.csv');toast('Выгружено строк: '+(j.count||0),'ok')}).catch(function(){toast(netErr(),'bad');$('#ego').disabled=false})};
  $('#mrf').onclick=function(){C=null;CP=null;load()}; $('#mlo').onclick=logout;
}

function render(){
  if(!D)return;
  setChrome();
  if(role==='admin'){
    if(tab==='people')return renderPeople();
    if(tab==='more')return renderMore();
    if(tab==='calc')return renderCalc();
    tab='slots'; return renderSlotsAdmin();
  }
  if(tab==='mine')return renderMine();
  if(tab==='earn')return renderEarn();
  if(tab==='profile')return renderProfile();
  tab='slots'; return renderSlotsContractor();
}

if($('#sheet')){
  $('#sheet').addEventListener('click',function(e){if(e.target===this)closeSheet()});
  var handle=$('.sh-handle'), startY=0, dragging=false;
  if(handle){
    handle.addEventListener('pointerdown',function(e){dragging=true; startY=e.clientY; try{handle.setPointerCapture(e.pointerId)}catch(err){}});
    handle.addEventListener('pointerup',function(e){if(!dragging)return; dragging=false; if(e.clientY-startY>64)closeSheet(); var sh=$('.sh'); if(sh)sh.style.transform='';});
    handle.addEventListener('pointermove',function(e){if(!dragging)return; var dy=Math.max(0,e.clientY-startY); var sh=$('.sh'); if(sh)sh.style.transform='translateY('+dy+'px)';});
  }
}
(function bindPtr(){
  var startY=0, pulling=false;
  document.addEventListener('touchstart',function(e){if(!localStorage[TOKEN]||window.scrollY>0||!$('#sheet').hidden)return; startY=e.touches[0].clientY; pulling=true;},{passive:true});
  document.addEventListener('touchend',function(e){if(!pulling)return; pulling=false; var dy=(e.changedTouches[0]&&e.changedTouches[0].clientY||0)-startY; if(dy>72&&localStorage[TOKEN]){E=null;load()}},{passive:true});
})();
function hardUpdate(){toast('Обновляю приложение');var p=[];if(window.caches)p.push(caches.keys().then(function(k){return Promise.all(k.map(function(x){return caches.delete(x)}))}));if('serviceWorker'in navigator)p.push(navigator.serviceWorker.getRegistrations().then(function(rs){return Promise.all(rs.map(function(r){return r.unregister()}))}));Promise.all(p).catch(function(){}).then(function(){location.replace(location.pathname+'?v='+Date.now())})}
function checkVer(){fetch('index.html?t='+Date.now(),{cache:'no-store'}).then(function(r){return r.text()}).then(function(t){var m=t.match(/app\.js\?v=(\d+)/);if(m&&+m[1]>VER&&sessionStorage.zapisUpd!==m[1]){sessionStorage.zapisUpd=m[1];hardUpdate()}}).catch(function(){})}
if('serviceWorker'in navigator){var hadC=!!navigator.serviceWorker.controller,rl=false;navigator.serviceWorker.addEventListener('controllerchange',function(){if(hadC&&!rl){rl=true;location.reload()}});navigator.serviceWorker.register('sw.js?v='+VER,{updateViaCache:'none'}).then(function(r){r.update()}).catch(function(){})}
checkVer();document.addEventListener('visibilitychange',function(){if(!document.hidden)checkVer()});
if(localStorage[TOKEN])load();else login('contractor');
})();

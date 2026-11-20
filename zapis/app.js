/* Запись исполнителей на выходы (ZAPIS_APP_V1, UI v=7) */
(function(){
var VER=7, CFG=window.ZAPIS_CONFIG||{}, LIVE=CFG.mode==='live'&&/^https:\/\/script\.google\.com\//.test(CFG.apiUrl||'');
var D=null, tab='slots', mineSeg='up', F={site:'',date:''}, role='', loadSeq=0;
var $ = function(s, r){return (r||document).querySelector(s)};
var TOKEN='zapisToken', KIND='zapisKind';
var AV=['#1b2a4e','#2b4de0','#0f766e','#9a3412','#5b21b6','#1e3a8a'];
var WD=['вс','пн','вт','ср','чт','пт','сб'];
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
  eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff:'<path d="M17.9 17.9A10.9 10.9 0 0 1 12 19c-6 0-10-7-10-7a18.7 18.7 0 0 1 5.1-5.9M9.9 4.2A11 11 0 0 1 12 4c6 0 10 7 10 7a18.5 18.5 0 0 1-3.3 3.9M15 9.1a3 3 0 0 1-4 4.1M2 2l20 20"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
  refresh:'<path d="M21 12a9 9 0 1 1-2.6-6.4L21 8"/><path d="M21 3v5h-5"/>',
  list:'<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  alert:'<path d="M10.3 4.3 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  layout:'<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
  more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>'
};
function ic(n, cls){return '<svg class="ic '+(cls||'')+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+((ICO[n])||'')+'</svg>'}
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function fd(s){if(!s)return'—';var p=String(s).split('-');return p.length===3?p[2]+'.'+p[1]+'.'+p[0]:s}
function fdLong(s){
  if(!s)return'—';
  var p=String(s).split('-'); if(p.length!==3)return fd(s);
  var d=new Date(+p[0],+p[1]-1,+p[2]);
  return WD[d.getDay()]+', '+p[2]+'.'+p[1]+'.'+p[0];
}
function today(){
  try{return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Moscow',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
  catch(e){var u=new Date(Date.now()+3*3600e3);return u.getUTCFullYear()+'-'+('0'+(u.getUTCMonth()+1)).slice(-2)+'-'+('0'+u.getUTCDate()).slice(-2);}
}
function addDays(ymd,n){var p=ymd.split('-'),d=new Date(+p[0],+p[1]-1,+p[2]+n);return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2)}
function toast(t, kind){
  var e=$('#toast'); e.textContent=t; e.className=kind||''; e.hidden=false;
  clearTimeout(e._t); e._t=setTimeout(function(){e.hidden=true}, 2800);
}
function fmtLen(min){min=Math.round(+min||0);var h=Math.floor(min/60),m=min%60;if(h&&m)return h+' ч '+m+' мин';if(h)return h+' ч';return m+' мин'}
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
function fmtReward(v){
  v=String(v||'').trim(); if(!v)return'—';
  var m=v.match(/^(.*?)(\d[\d\s]*)(.*)$/); if(!m)return v;
  var n=m[2].replace(/\s/g,''); if(!/^\d+$/.test(n))return v;
  var pretty=n.replace(/\B(?=(\d{3})+(?!\d))/g,' ');
  var pre=m[1].trim(), suf=m[3].trim().replace(/^руб\.?/i,'₽').replace(/^р$/i,'₽');
  if(!/₽|руб/i.test(pre+' '+suf)) suf=(suf?suf+' ':'')+'₽';
  return (pre?pre+' ':'')+pretty+(suf?' '+suf:'');
}
function siteColor(name){var s=String(name||''),i=0,h=0;for(i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))>>>0;return AV[h%AV.length]}
function initials(name){
  var p=String(name||'').replace(/[«»"()]/g,' ').split(/[\s\-]+/).filter(function(w){return /[A-Za-zА-Яа-яЁё]/.test(w)});
  if(!p.length)return '•';
  if(p.length===1)return p[0].slice(0,2).toUpperCase();
  return (p[0][0]+p[1][0]).toUpperCase();
}
function avatar(name, size){return '<span class="av" style="background:'+siteColor(name)+((size)?';width:'+size+'px;height:'+size+'px':'')+'">'+esc(initials(name))+'</span>'}
function emptyBox(title,sub,action){
  return '<div class="empty"><div class="empty-ic">'+ic('cal','lg')+'</div><b>'+title+'</b><span>'+sub+'</span>'+(action||'')+'</div>';
}
function pbar(s){
  var places=+s.places||0, taken=+s.taken||Math.max(0,places-(+s.left||0));
  var left=s.left!=null?+s.left:Math.max(0,places-taken);
  var pct=places?Math.min(100,Math.round(taken/places*100)):0;
  var cls=s.status==='Закрыт'?'is-closed':(left<=0?'is-full':'');
  return '<div class="pbar '+cls+'"><i style="width:'+pct+'%"></i></div>'
    +'<span class="pbar-lab">'+(places?(left<=0?'Мест нет · '+taken+' из '+places:'Осталось '+left+' из '+places):'Места не указаны')+'</span>';
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
function skel(){var n='',i;for(i=0;i<3;i++)n+='<div class="scard sk-card"><div class="sk" style="width:40px;height:40px;border-radius:12px"></div><div style="grid-column:2/-1"><div class="sk sk-t"></div><div class="sk sk-b"></div></div><div class="sk" style="grid-column:1/-1;height:8px"></div></div>';return n}

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
    bad_hours:'Некорректное число часов'
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

function setChrome(){
  var logged=!!(role&&localStorage[TOKEN]);
  document.body.classList.toggle('is-login', !logged);
  document.body.classList.toggle('role-admin', role==='admin');
  document.body.classList.toggle('role-contractor', role==='contractor');
  $('#top').hidden=!logged;
  $('#tabs').hidden=!logged;
  if(logged){
    $('#who').textContent=(D&&D.user&&D.user.name)||'';
    $('#refresh').innerHTML=ic('refresh');
    $('#logout').innerHTML=ic('logout');
    setNav();
  }
}
function navHtml(){
  if(role==='admin'){
    return '<button data-t="slots"'+(tab==='slots'?' class="on"':'')+'>'+ic('cal')+'<span>Выходы</span></button>'
      +'<button data-t="people"'+(tab==='people'?' class="on"':'')+'>'+ic('users')+'<span>Исполнители</span></button>'
      +'<button data-t="more"'+(tab==='more'?' class="on"':'')+'>'+ic('more')+'<span>Ещё</span></button>';
  }
  return '<button data-t="slots"'+(tab==='slots'?' class="on"':'')+'>'+ic('cal')+'<span>Выходы</span></button>'
    +'<button data-t="mine"'+(tab==='mine'?' class="on"':'')+'>'+ic('list')+'<span>Мои записи</span></button>';
}
function setNav(){
  var n=$('#tabs'); if(!n)return;
  n.innerHTML=navHtml(); n.hidden=false;
  n.querySelectorAll('button').forEach(function(b){b.onclick=function(){tab=b.dataset.t;render()}});
}

function load(){
  if(!LIVE){$('#view').innerHTML='<div class="errbox"><b>Приложение доступно только в боевом режиме.</b></div>';return}
  var seq=++loadSeq, kind=localStorage[KIND];
  var action=kind==='admin'?'adminZapisData':'contractorData';
  closeSheet();
  $('#view').innerHTML=skel()+'<p class="muted" id="ldhint" style="text-align:center">Загрузка… если сервер отвечает дольше 15 секунд, подождите или обновите.</p>';
  api({action:action},{seq:seq,onRetry:function(){var h=$('#ldhint');if(h)h.textContent='Сервер отвечает дольше обычного, пробуем ещё раз…'}}).then(function(j){
    if(seq!==loadSeq)return;
    if(!j.ok)throw new Error(j.error||'load');
    D=j; role=j.role||kind||'contractor';
    setChrome(); render();
  }).catch(function(e){
    if(e&&(e.stale||e.message==='stale'||e.message==='auth'))return;
    if(seq!==loadSeq)return;
    $('#view').innerHTML='<div class="errbox"><b>Не удалось загрузить данные</b><p class="hint">'+esc(netErr())+'</p><button class="btn" id="retry">Повторить</button></div>';
    var b=$('#retry'); if(b)b.onclick=function(){load()};
  });
}
function logout(){
  if(!confirm('Выйти из аккаунта?'))return;
  loadSeq++; closeSheet();
  [TOKEN,KIND,'zapisCache'].forEach(function(k){localStorage.removeItem(k)});
  D=null; role=''; tab='slots'; mineSeg='up';
  setChrome(); login(); toast('Вы вышли');
}

function bindPhone(id){
  var el=$(id); if(!el)return;
  el.addEventListener('input',function(){
    var c=el.selectionStart, old=el.value, next=maskPhone(el.value);
    el.value=next;
    try{el.setSelectionRange(next.length,next.length)}catch(e){}
  });
}
function bindPinToggle(inputId, btnId){
  var inp=$(inputId), btn=$(btnId); if(!inp||!btn)return;
  btn.innerHTML=ic('eye');
  btn.onclick=function(){
    var show=inp.type==='password';
    inp.type=show?'text':'password';
    btn.innerHTML=ic(show?'eyeOff':'eye');
    btn.setAttribute('aria-label', show?'Скрыть PIN':'Показать PIN');
  };
}
function setInvalid(id, on, msg){
  var f=$(id); if(!f)return;
  f.classList.toggle('is-invalid', !!on);
  var e=$('.ferr', f); if(e&&msg)e.textContent=msg;
}

function login(mode){
  mode=mode||'contractor';
  role=''; setChrome();
  if(mode==='admin'){
    $('#view').innerHTML='<div class="auth"><div class="auth-mark">В</div><h1>Запись на выходы</h1><p class="lead">Вход администратора</p>'
      +'<label class="fld" id="f-name"><span>Имя</span><input id="ln" autocomplete="username"><div class="ferr">Укажите имя</div></label>'
      +'<label class="fld" id="f-pin"><span>PIN (4–6 цифр, если требуется)</span><div class="pin-wrap"><input id="lp" type="password" inputmode="numeric" maxlength="6" autocomplete="current-password" pattern="[0-9]{4,6}"><button type="button" class="pin-toggle" id="ptog" aria-label="Показать PIN"></button></div></label>'
      +'<button class="btn" id="lb">Войти</button>'
      +'<div class="auth-alt"><button type="button" class="btn ghost" id="lback">Вход исполнителя</button></div>'
      +'<div id="le" class="errline"></div></div>';
    bindPinToggle('#lp','#ptog');
    $('#lback').onclick=function(){login('contractor')};
    $('#lb').onclick=function(){
      var name=$('#ln').value.trim();
      setInvalid('#f-name', !name);
      if(!name)return;
      var b=$('#lb'); b.disabled=true; $('#le').textContent='Входим…';
      api({action:'login',name:name,pin:$('#lp').value},{retries:1}).then(function(j){
        if(!j.ok){$('#le').textContent=j.error==='bad_pin'||!j.error?'Неверное имя или PIN':errText(j.error);b.disabled=false;return}
        if(!j.user||j.user.role!=='admin'){$('#le').textContent='Этот вход только для администратора';b.disabled=false;return}
        localStorage[TOKEN]=j.token; localStorage[KIND]='admin'; load();
      }).catch(function(){$('#le').textContent=netErr();b.disabled=false});
    };
    return;
  }
  if(mode==='reg'){
    $('#view').innerHTML='<div class="auth"><div class="auth-mark">В</div><h1>Запись на выходы</h1><p class="lead">Регистрация исполнителя</p>'
      +'<label class="fld" id="f-name"><span>ФИО</span><input id="rn" autocomplete="name"><div class="ferr">Укажите ФИО</div></label>'
      +'<label class="fld" id="f-phone"><span>Телефон</span><input id="rp" type="tel" inputmode="tel" autocomplete="tel" placeholder="+7 900 000-00-00"><div class="ferr">Укажите телефон в формате +7 XXX XXX-XX-XX</div></label>'
      +'<label class="fld" id="f-pin"><span>PIN (4–6 цифр)</span><div class="pin-wrap"><input id="rpin" type="password" inputmode="numeric" maxlength="6" pattern="[0-9]{4,6}"><button type="button" class="pin-toggle" id="ptog" aria-label="Показать PIN"></button></div><div class="ferr">PIN должен содержать 4–6 цифр</div></label>'
      +'<label class="fld" id="f-pin2"><span>Повторите PIN</span><input id="rpin2" type="password" inputmode="numeric" maxlength="6" pattern="[0-9]{4,6}"><div class="ferr">PIN не совпадают</div></label>'
      +'<button class="btn" id="rb">Отправить заявку</button>'
      +'<div class="auth-alt"><button type="button" class="btn ghost" id="lback">Назад ко входу</button></div>'
      +'<div id="le" class="errline"></div></div>';
    bindPhone('#rp'); bindPinToggle('#rpin','#ptog');
    $('#lback').onclick=function(){login('contractor')};
    $('#rb').onclick=function(){
      var name=$('#rn').value.trim(), phone=digitsPhone($('#rp').value), pin=$('#rpin').value, pin2=$('#rpin2').value;
      setInvalid('#f-name', name.length<2, 'Укажите ФИО');
      setInvalid('#f-phone', !/^7\d{10}$/.test(phone));
      setInvalid('#f-pin', !/^\d{4,6}$/.test(pin));
      setInvalid('#f-pin2', pin!==pin2);
      if(name.length<2||!/^7\d{10}$/.test(phone)||!/^\d{4,6}$/.test(pin)||pin!==pin2)return;
      var b=$('#rb'); b.disabled=true; $('#le').textContent='Отправляем…';
      api({action:'contractorRegister',name:name,fio:name,phone:phone,pin:pin,pin2:pin2},{retries:1}).then(function(j){
        if(!j.ok){$('#le').textContent=errText(j.error);b.disabled=false;return}
        $('#view').innerHTML='<div class="auth"><div class="auth-mark">В</div><h1>Запись на выходы</h1><div class="okmsg">Заявка отправлена. Статус «Ожидает» — вход будет доступен после одобрения администратора.</div><button class="btn" id="lback" style="margin-top:16px">Назад ко входу</button></div>';
        $('#lback').onclick=function(){login('contractor')};
      }).catch(function(){$('#le').textContent=netErr();b.disabled=false});
    };
    return;
  }
  $('#view').innerHTML='<div class="auth"><div class="auth-mark">В</div><h1>Запись на выходы</h1><p class="lead">Вход исполнителя · НПД · ГПХ</p>'
    +'<label class="fld" id="f-phone"><span>Телефон</span><input id="lpn" type="tel" inputmode="tel" autocomplete="tel" placeholder="+7 900 000-00-00"><div class="ferr">Укажите телефон в формате +7 XXX XXX-XX-XX</div></label>'
    +'<label class="fld" id="f-pin"><span>PIN (4–6 цифр)</span><div class="pin-wrap"><input id="lp" type="password" inputmode="numeric" maxlength="6" autocomplete="current-password" pattern="[0-9]{4,6}"><button type="button" class="pin-toggle" id="ptog" aria-label="Показать PIN"></button></div><div class="ferr">PIN должен содержать 4–6 цифр</div></label>'
    +'<button class="btn" id="lb">Войти</button>'
    +'<div class="auth-alt"><button type="button" class="btn ghost" id="lreg">Регистрация</button><button type="button" class="btn ghost" id="ladm">Вход администратора</button></div>'
    +'<div id="le" class="errline"></div></div>';
  bindPhone('#lpn'); bindPinToggle('#lp','#ptog');
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
      localStorage[TOKEN]=j.token; localStorage[KIND]='contractor'; load();
    }).catch(function(){$('#le').textContent=netErr();b.disabled=false});
  };
}

function dateStrip(){
  var from=today(), h='<div class="strip-wrap"><div class="strip" id="dstrip">';
  h+='<button type="button" class="chip day'+(F.date?'':' on')+'" data-d=""><small>все</small><b>•</b></button>';
  var i,d,p,dt;
  for(i=0;i<14;i++){
    d=addDays(from,i); p=d.split('-'); dt=new Date(+p[0],+p[1]-1,+p[2]);
    h+='<button type="button" class="chip day'+(F.date===d?' on':'')+'" data-d="'+d+'"><small>'+(i===0?'сегодня':WD[dt.getDay()])+'</small><b>'+p[2]+'</b></button>';
  }
  return h+'</div></div>';
}
function siteStrip(){
  var sites=(D&&D.sites)||[], h='<div class="strip-wrap"><div class="strip" id="sstrip">';
  h+='<button type="button" class="chip site'+(F.site?'':' on')+'" data-s="">Все площадки</button>';
  sites.forEach(function(s){var n=s.site||''; if(!n)return; h+='<button type="button" class="chip site'+(F.site===n?' on':'')+'" data-s="'+esc(n)+'">'+esc(n)+'</button>'});
  return h+'</div></div>';
}
function bindFilters(){
  var d=$('#dstrip'); if(d)d.querySelectorAll('button').forEach(function(b){b.onclick=function(){F.date=b.dataset.d||'';render()}});
  var s=$('#sstrip'); if(s)s.querySelectorAll('button').forEach(function(b){b.onclick=function(){F.site=b.dataset.s||'';render()}});
}
function filterSlots(list){
  return (list||[]).filter(function(s){
    if(F.site&&s.site!==F.site)return false;
    if(F.date&&s.date!==F.date)return false;
    return true;
  });
}

function slotCard(s, opts){
  opts=opts||{};
  var st=slotStatus(s), can=s.left>0&&s.status==='Открыт'&&!s.started;
  var req=s.req?'<span class="badge req">'+ic('alert','sm')+' Требования</span>':'';
  var cta=opts.admin?'':(can?'<button type="button" class="btn sm go">Записаться</button>':'');
  return '<article class="scard" data-row="'+s.row+'">'
    +avatar(s.site||'')
    +'<div class="scard-main"><div class="scard-site">'+esc(s.site||'—')+'</div>'
    +'<div class="scard-time amt">'+esc(timeRange(s))+'</div>'
    +'<div class="scard-meta"><span>'+fdLong(s.date)+'</span><span>'+esc(gph(s.vacancy||'Вид услуг не указан'))+'</span></div></div>'
    +'<div class="scard-side"><span class="st '+st.cls+'">'+st.label+'</span>'
    +'<div class="scard-pay amt">'+esc(fmtReward(s.reward))+'<small>вознаграждение</small></div></div>'
    +'<div class="scard-cta">'+pbar(s)+cta+'</div>'
    +(req?'<div class="tags">'+req+'</div>':'')
    +'</article>';
}

function renderSlotsContractor(){
  var list=filterSlots(D.slots||[]);
  var h='<h1 class="h1">Открытые выходы</h1>'+dateStrip()+siteStrip();
  if(!list.length)h+=emptyBox('Нет открытых выходов','Измените площадку или дату');
  else list.forEach(function(s){h+=slotCard(s)});
  $('#view').innerHTML=h; bindFilters();
  $('#view').querySelectorAll('.scard').forEach(function(el){
    el.onclick=function(ev){ if(ev.target.closest && ev.target.closest('.go')) ev.preventDefault(); openSignup(+el.dataset.row); };
  });
}

function openSignup(row){
  var s=(D.slots||[]).filter(function(x){return x.row===row})[0];
  if(!s)return;
  var req=s.req?('<div class="drow">'+ic('shield')+'<div class="dk"><span>Требования</span><b>'+hlReq(s.req)+'</b></div></div>'):'';
  var can=s.left>0&&s.status==='Открыт'&&!s.started;
  var already=s.mySignup;
  var body='<h3>'+esc(s.site)+'</h3>'
    +'<div class="sheet-hero"><div class="scard-time amt">'+esc(timeRange(s))+'</div>'
    +'<div class="scard-meta">'+fdLong(s.date)+'</div>'
    +'<div class="scard-pay amt" style="margin-top:10px">'+esc(fmtReward(s.reward))+'<small>вознаграждение</small></div></div>'
    +'<div class="dlist">'
    +'<div class="drow">'+ic('bag')+'<div class="dk"><span>Вид услуг</span><b>'+esc(gph(s.vacancy||'—'))+'</b></div></div>'
    +'<div class="drow">'+ic('clock')+'<div class="dk"><span>Длительность</span><b>'+esc(fmtLen(s.length))+'</b></div></div>'
    +'<div class="drow">'+ic('users')+'<div class="dk"><span>Места</span><b>'+s.left+' из '+s.places+' свободно</b>'+pbar(s)+'</div></div>'
    +(s.comment?'<div class="drow">'+ic('file')+'<div class="dk"><span>Комментарий</span><b>'+esc(s.comment)+'</b></div></div>':'')
    +req+'</div>'
    +(already?'<div class="okmsg" style="margin-top:16px">Вы уже записаны на этот выход</div>':'')
    +(!already&&can?'<label class="confirm"><input type="checkbox" id="cnf"><span>Подтверждаю, что ознакомлен(а) с требованиями и готов(а) записаться на этот выход</span></label>':'')
    +(!already&&!can?'<p class="hint">Запись на этот выход недоступна</p>':'');
  var cta=already||!can?'<button class="btn s" id="shx">Закрыть</button>':'<button class="btn" id="sgo">Записаться</button><button class="btn s" id="shx">Отмена</button>';
  openSheet(body, cta);
  $('#shx')&&($('#shx').onclick=closeSheet);
  var go=$('#sgo');
  if(go)go.onclick=function(){
    if(!$('#cnf')||!$('#cnf').checked){toast('Отметьте «подтверждаю»','bad');return}
    go.disabled=true;
    api({action:'signup',row:s.row,confirm:true}).then(function(j){
      if(!j.ok){toast(errText(j.error),'bad');go.disabled=false;return}
      toast('Вы записаны','ok'); closeSheet(); load();
    }).catch(function(){toast(netErr(),'bad');go.disabled=false});
  };
}

function isUpcoming(item){
  var s=item.slot||{}, sg=item.signup||{};
  return sg.status==='Записан'&&!s.started;
}
function renderMine(){
  var all=D.mine||[], up=all.filter(isUpcoming), hist=all.filter(function(x){return !isUpcoming(x)});
  var list=mineSeg==='hist'?hist:up;
  var h='<h1 class="h1">Мои записи</h1><div class="segtab">'
    +'<button type="button" data-seg="up"'+(mineSeg==='up'?' class="on"':'')+'>Предстоящие'+(up.length?' · '+up.length:'')+'</button>'
    +'<button type="button" data-seg="hist"'+(mineSeg==='hist'?' class="on"':'')+'>История'+(hist.length?' · '+hist.length:'')+'</button></div>';
  if(!list.length)h+=emptyBox(mineSeg==='hist'?'История пуста':'Нет предстоящих записей', mineSeg==='hist'?'Завершённые и отменённые записи появятся здесь':'Откройте вкладку «Выходы», чтобы записаться');
  list.forEach(function(item){
    var s=item.slot||{}, sg=item.signup||{};
    var can=sg.status==='Записан'&&s.canCancel;
    var st=sg.status==='Записан'?'ok':(sg.status==='Отменена'?'w':'bad');
    h+='<article class="scard mine">'
      +avatar(s.site||'')
      +'<div class="scard-main"><div class="scard-site">'+esc(s.site||'—')+'</div>'
      +'<div class="scard-time amt">'+esc(timeRange(s))+'</div>'
      +'<div class="scard-meta">'+fdLong(s.date)+'</div></div>'
      +'<div class="scard-side"><span class="st '+st+'">'+esc(sg.status)+'</span>'
      +'<div class="scard-pay amt">'+esc(fmtReward(s.reward))+'<small>вознаграждение</small></div></div>';
    if(can)h+='<div class="scard-actions"><p class="hint">Отмена возможна не позднее чем за '+(D.cancel_hours||12)+' ч до начала</p><button class="btn s" data-cancel="'+sg.row+'">Отменить запись</button></div>';
    else if(sg.status==='Записан'&&s.startMs)h+='<div class="scard-actions"><p class="hint">Отмена уже недоступна (окно — '+(D.cancel_hours||12)+' ч до начала)</p></div>';
    h+='</article>';
  });
  $('#view').innerHTML=h;
  $('#view').querySelectorAll('.segtab button').forEach(function(b){b.onclick=function(){mineSeg=b.dataset.seg;render()}});
  $('#view').querySelectorAll('[data-cancel]').forEach(function(b){b.onclick=function(){
    if(!confirm('Отменить запись на этот выход?'))return;
    b.disabled=true;
    api({action:'cancelSignup',row:+b.dataset.cancel}).then(function(j){
      if(!j.ok){toast(errText(j.error),'bad');b.disabled=false;return}
      toast('Запись отменена','ok'); load();
    }).catch(function(){toast(netErr(),'bad');b.disabled=false});
  }});
}

function adminKpis(){
  var slots=D.slots||[], open=slots.filter(function(s){return s.status==='Открыт'});
  var places=0, taken=0;
  open.forEach(function(s){places+=(+s.places||0); taken+=(+s.taken||0)});
  var fill=places?Math.round(taken/places*100):0;
  var pend=(D.contractors||[]).filter(function(u){return u.status==='Ожидает'}).length;
  return '<div class="kpis">'
    +'<div class="kpi"><b class="amt">'+open.length+'</b><span>Открытых выходов</span></div>'
    +'<div class="kpi"><b class="amt">'+fill+'%</b><span>Заполнение мест</span></div>'
    +'<div class="kpi"><b class="amt">'+pend+'</b><span>Заявок на одобрение</span></div>'
    +'</div>';
}

function renderSlotsAdmin(){
  var list=filterSlots(D.slots||[]);
  var h='<div class="scr-row"><h1 class="h1">Выходы</h1><button class="btn sm" id="newslot">'+ic('plus','sm')+' Создать</button></div>'
    +adminKpis()+dateStrip()+siteStrip();
  if(!list.length){
    h+=emptyBox('Выходов нет','Создайте выход или снимите фильтр');
  } else {
    h+='<div class="cards-only">';
    list.forEach(function(s){h+=slotCard(s,{admin:true})});
    h+='</div><div class="tbl-wrap desk-only"><table class="tbl"><thead><tr><th>Дата</th><th>Время</th><th>Площадка</th><th>Вид услуг</th><th>Вознаграждение</th><th>Места</th><th>Статус</th></tr></thead><tbody>';
    list.forEach(function(s){
      var st=slotStatus(s);
      h+='<tr data-row="'+s.row+'"><td>'+fdLong(s.date)+'</td><td class="amt">'+esc(timeRange(s))+'</td><td>'+esc(s.site||'—')+'</td><td>'+esc(gph(s.vacancy||'—'))+'</td><td class="amt">'+esc(fmtReward(s.reward))+'</td><td>'+(s.taken||0)+' / '+s.places+'</td><td><span class="st '+st.cls+'">'+st.label+'</span></td></tr>';
    });
    h+='</tbody></table></div>';
  }
  $('#view').innerHTML=h; bindFilters();
  $('#newslot').onclick=function(){openSlotForm(null)};
  function openR(el){var r=el.closest('[data-row]'); if(r)openAdminSlot(+r.dataset.row)}
  $('#view').querySelectorAll('.scard, .tbl tbody tr').forEach(function(el){el.onclick=function(){openR(el)}});
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
  var length=Math.round(parseFloat(hours||'0')*60);
  return {site:$('#ssite').value,date:$('#sdate').value,start:$('#sstime').value,length:length,places:+$('#splaces').value,vacancy:$('#svac').value,reward:$('#srew').value,comment:$('#scom').value};
}
function prefillsFromSite(){
  var name=$('#ssite').value, site=((D&&D.sites)||[]).filter(function(s){return s.site===name})[0];
  if(!site)return;
  if(!$('#svac').value&&site.vacancies)$('#svac').value=site.vacancies;
  if(!$('#srew').value&&site.rate)$('#srew').value=site.rate;
}
function weekBoxes(from){
  from=from||today();
  var h='',i,d,p,dt;
  for(i=0;i<7;i++){
    d=addDays(from,i); p=d.split('-'); dt=new Date(+p[0],+p[1]-1,+p[2]);
    h+='<label><input type="checkbox" class="wd" value="'+d+'"'+(i===0?' checked':'')+'> '+WD[dt.getDay()]+' '+p[2]+'.'+p[1]+'</label>';
  }
  return h;
}
function openSlotForm(s){
  var edit=!!(s&&s.row);
  var extra=edit?'':'<label class="fld"><span>Даты (можно выбрать несколько дней)</span></label><div class="week" id="wdays">'+weekBoxes(s&&s.date||today())+'</div>';
  openSheet('<h3>'+(edit?'Редактировать выход':'Новый выход')+'</h3>'+slotFormFields(s||{date:today(),start:'09:00',length:660,places:1})+extra,
    '<button class="btn" id="ssave">'+(edit?'Сохранить':'Создать')+'</button><button class="btn s" id="shx">Отмена</button>');
  $('#ssite').onchange=prefillsFromSite;
  if(!edit)prefillsFromSite();
  if($('#sdate')){var syncW=function(){if($('#wdays'))$('#wdays').innerHTML=weekBoxes($('#sdate').value||today())};$('#sdate').onchange=syncW;$('#sdate').oninput=syncW;}
  $('#shx').onclick=closeSheet;
  $('#ssave').onclick=function(){
    var body=readSlotForm();
    if(!edit){
      var dates=[];
      var box=$('#wdays'); if(box)box.querySelectorAll('.wd:checked').forEach(function(x){dates.push(x.value)});
      if(!dates.length)dates=[body.date];
      body.dates=dates; body.date=dates[0];
    }
    var act=edit?'updateSlot':'createSlot';
    if(edit)body.row=s.row;
    $('#ssave').disabled=true;
    api(Object.assign({action:act},body)).then(function(j){
      if(!j.ok){toast(errText(j.error),'bad');$('#ssave').disabled=false;return}
      toast(edit?'Сохранено':'Выход создан','ok'); closeSheet(); load();
    }).catch(function(){toast(netErr(),'bad');$('#ssave').disabled=false});
  };
}

function openAdminSlot(row){
  var s=(D.slots||[]).filter(function(x){return x.row===row})[0];
  if(!s)return;
  var sigs=s.signups||[];
  var active=sigs.filter(function(x){return x.status==='Записан'});
  var other=sigs.filter(function(x){return x.status!=='Записан'});
  var people='<h3 class="subhead" style="font-size:16px;margin:4px 0 8px">Записавшиеся · '+active.length+'</h3>';
  if(!sigs.length)people+='<div class="empty sm"><b>Пока никто не записался</b><span>Исполнители появятся после записи</span></div>';
  active.forEach(function(x){
    people+='<div class="person">'+avatar(x.name||'')+'<div><div class="nm">'+esc(x.name)+'</div><div class="sub">'+esc(fmtPhone(x.phone))+'</div></div><button class="btn s" data-rm="'+x.row+'">Снять</button></div>';
  });
  other.forEach(function(x){
    people+='<div class="person">'+avatar(x.name||'')+'<div><div class="nm">'+esc(x.name)+'</div><div class="sub">'+esc(fmtPhone(x.phone))+' · '+esc(x.status)+'</div></div></div>';
  });
  var h='<h3>'+esc(s.site)+'</h3>'
    +'<div class="sheet-hero"><div class="scard-time amt">'+esc(timeRange(s))+'</div>'
    +'<div class="scard-meta">'+fdLong(s.date)+'</div>'
    +'<div class="scard-pay amt" style="margin-top:10px">'+esc(fmtReward(s.reward))+'<small>вознаграждение</small></div>'
    +'<div class="scard-meta" style="margin-top:8px">'+(s.taken||0)+' из '+s.places+' занято</div>'+pbar(s)+'</div>'
    +people
    +'<div class="dlist">'
    +'<div class="drow">'+ic('bag')+'<div class="dk"><span>Вид услуг</span><b>'+esc(gph(s.vacancy||'—'))+'</b></div></div>'
    +(s.comment?'<div class="drow">'+ic('file')+'<div class="dk"><span>Комментарий</span><b>'+esc(s.comment)+'</b></div></div>':'')
    +(s.req?'<div class="drow">'+ic('shield')+'<div class="dk"><span>Требования</span><b>'+hlReq(s.req)+'</b></div></div>':'')
    +'</div>';
  openSheet(h, '<button class="btn" id="sedit">Редактировать</button><div class="cta-row"><button class="btn s" id="scopy">Копировать</button><button class="btn s" id="sclose">'+(s.status==='Закрыт'?'Открыть выход':'Закрыть выход')+'</button></div>');
  $('#sedit').onclick=function(){openSlotForm(s)};
  $('#sclose').onclick=function(){
    api({action:'closeSlot',row:s.row}).then(function(j){if(!j.ok){toast(errText(j.error),'bad');return}toast(j.status==='Закрыт'?'Выход закрыт':'Выход открыт','ok');closeSheet();load()}).catch(function(){toast(netErr(),'bad')});
  };
  $('#scopy').onclick=function(){
    openSheet('<h3>Копировать выход</h3><p class="hint">Будут созданы такие же выходы на выбранные дни, начиная со следующего после '+fd(s.date)+'.</p><label class="fld"><span>Сколько следующих дней</span><input id="cdays" type="number" min="1" max="31" value="6"></label>',
      '<button class="btn" id="cgo">Создать копии</button><button class="btn s" id="shx">Отмена</button>');
    $('#shx').onclick=closeSheet;
    $('#cgo').onclick=function(){
      $('#cgo').disabled=true;
      api({action:'copySlot',row:s.row,days:+$('#cdays').value}).then(function(j){
        if(!j.ok){toast(errText(j.error),'bad');$('#cgo').disabled=false;return}
        toast('Создано выходов: '+(j.rows&&j.rows.length||0),'ok'); closeSheet(); load();
      }).catch(function(){toast(netErr(),'bad');$('#cgo').disabled=false});
    };
  };
  $('#sheet').querySelectorAll('[data-rm]').forEach(function(b){b.onclick=function(ev){
    ev.stopPropagation();
    if(!confirm('Снять исполнителя с этого выхода?'))return;
    api({action:'removeSignup',row:+b.dataset.rm}).then(function(j){if(!j.ok){toast(errText(j.error),'bad');return}toast('Снят с выхода','ok');closeSheet();load()}).catch(function(){toast(netErr(),'bad')});
  }});
}

function renderPeople(){
  var list=D.contractors||[], h='<h1 class="h1">Исполнители</h1>'+adminKpis();
  if(!list.length)h+=emptyBox('Пока нет исполнителей','Заявки появятся после регистрации');
  list.forEach(function(u){
    var st=u.status==='Одобрен'?'ok':u.status==='Заблокирован'||u.status==='Отклонён'?'bad':'w';
    h+='<div class="ucard"><div class="person" style="border:0;padding:0">'+avatar(u.name||'')+'<div><div class="nm">'+esc(u.name)+'</div><div class="sub">'+esc(fmtPhone(u.phone))+(u.date?' · '+esc(u.date):'')+'</div></div><span class="st '+st+'">'+esc(u.status)+'</span></div>';
    h+='<div class="uacts">';
    if(u.status!=='Одобрен')h+='<button class="btn" data-row="'+u.row+'" data-st="Одобрен">Одобрить</button>';
    if(u.status!=='Заблокирован')h+='<button class="btn s" data-row="'+u.row+'" data-st="Заблокирован">Заблокировать</button>';
    if(u.status==='Ожидает')h+='<button class="btn s" data-row="'+u.row+'" data-st="Отклонён">Отклонить</button>';
    h+='</div></div>';
  });
  $('#view').innerHTML=h;
  $('#view').querySelectorAll('.uacts .btn').forEach(function(b){b.onclick=function(){
    api({action:'updateContractor',row:+b.dataset.row,status:b.dataset.st}).then(function(j){
      if(!j.ok){toast(errText(j.error),'bad');return}toast('Статус обновлён','ok');load();
    }).catch(function(){toast(netErr(),'bad')});
  }});
}

function toCsv(rows){
  function cell(v){v=String(v==null?'':v);if(/[;"\n]/.test(v))return'"'+v.replace(/"/g,'""')+'"';return v}
  var head=['Дата','Площадка','Начало','Длительность_мин','Вид услуг','Вознаграждение','Исполнитель','Телефон','Статус записи','Комментарий'];
  var lines=[head.join(';')];
  (rows||[]).forEach(function(r){lines.push([r.date,r.site,r.start,r.length,r.vacancy,r.reward,r.name,r.phone,r.status,r.comment].map(cell).join(';'))});
  return lines.join('\n');
}
function downloadCsv(text,name){
  var blob=new Blob(['\ufeff'+text],{type:'text/csv;charset=utf-8'});
  var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(function(){URL.revokeObjectURL(a.href)},1000);
}
function renderMore(){
  var sites=(D&&D.sites)||[], opts='<option value="">Все площадки</option>';
  sites.forEach(function(s){opts+='<option value="'+esc(s.site)+'">'+esc(s.site)+'</option>'});
  var h='<h1 class="h1">Ещё</h1>'
    +'<div class="ucard"><h3 style="margin:0 0 8px;font-size:16px">Окно отмены</h3><p class="hint" style="margin-top:0">Исполнитель может отменить запись не позднее чем за указанное число часов до начала выхода.</p>'
    +'<label class="fld"><span>Часов до начала</span><input id="chours" type="number" min="0" max="168" value="'+(D.cancel_hours||12)+'"></label>'
    +'<button class="btn" id="csave">Сохранить</button></div>'
    +'<div class="ucard"><h3 style="margin:0 0 8px;font-size:16px">Выгрузка</h3><p class="hint" style="margin-top:0">Список записей за дату и площадку — на лист «Выгрузка_выходов» и в CSV-файл.</p>'
    +'<label class="fld"><span>Дата</span><input id="edate" type="date" value="'+today()+'"></label>'
    +'<label class="fld"><span>Площадка (необязательно)</span><select id="esite">'+opts+'</select></label>'
    +'<button class="btn" id="ego">Выгрузить</button></div>';
  $('#view').innerHTML=h;
  $('#csave').onclick=function(){
    api({action:'setZapisSetting',cancel_hours:+$('#chours').value}).then(function(j){if(!j.ok){toast(errText(j.error),'bad');return}toast('Сохранено','ok');load()}).catch(function(){toast(netErr(),'bad')});
  };
  $('#ego').onclick=function(){
    $('#ego').disabled=true;
    api({action:'exportSlots',date:$('#edate').value,site:$('#esite').value}).then(function(j){
      $('#ego').disabled=false;
      if(!j.ok){toast(errText(j.error),'bad');return}
      downloadCsv(toCsv(j.rows),'vyhody_'+(j.rows&&j.rows[0]&&j.rows[0].date||$('#edate').value)+'.csv');
      toast('Выгружено строк: '+(j.count||0)+' (лист «Выгрузка_выходов»)','ok');
    }).catch(function(){toast(netErr(),'bad');$('#ego').disabled=false});
  };
}

function render(){
  if(!D)return;
  setChrome();
  if(role==='admin'){
    if(tab==='people')return renderPeople();
    if(tab==='more')return renderMore();
    return renderSlotsAdmin();
  }
  if(tab==='mine')return renderMine();
  return renderSlotsContractor();
}

$('#logout').onclick=logout;
$('#refresh').onclick=function(){if(localStorage[TOKEN])load();else login()};
if($('#sheet')){
  $('#sheet').addEventListener('click',function(e){if(e.target===this)closeSheet()});
  var handle=$('.sh-handle'), startY=0, dragging=false;
  if(handle){
    handle.addEventListener('pointerdown',function(e){dragging=true; startY=e.clientY; try{handle.setPointerCapture(e.pointerId)}catch(err){}});
    handle.addEventListener('pointerup',function(e){if(!dragging)return; dragging=false; if(e.clientY-startY>64)closeSheet(); var sh=$('.sh'); if(sh)sh.style.transform='';});
    handle.addEventListener('pointermove',function(e){if(!dragging)return; var dy=Math.max(0,e.clientY-startY); var sh=$('.sh'); if(sh)sh.style.transform='translateY('+dy+'px)';});
  }
}
function hardUpdate(){toast('Обновляю приложение');var p=[];if(window.caches)p.push(caches.keys().then(function(k){return Promise.all(k.map(function(x){return caches.delete(x)}))}));if('serviceWorker'in navigator)p.push(navigator.serviceWorker.getRegistrations().then(function(rs){return Promise.all(rs.map(function(r){return r.unregister()}))}));Promise.all(p).catch(function(){}).then(function(){location.replace(location.pathname+'?v='+Date.now())})}
function checkVer(){fetch('index.html?t='+Date.now(),{cache:'no-store'}).then(function(r){return r.text()}).then(function(t){var m=t.match(/app\.js\?v=(\d+)/);if(m&&+m[1]>VER&&sessionStorage.zapisUpd!==m[1]){sessionStorage.zapisUpd=m[1];hardUpdate()}}).catch(function(){})}
if('serviceWorker'in navigator){var hadC=!!navigator.serviceWorker.controller,rl=false;navigator.serviceWorker.addEventListener('controllerchange',function(){if(hadC&&!rl){rl=true;location.reload()}});navigator.serviceWorker.register('sw.js?v='+VER,{updateViaCache:'none'}).then(function(r){r.update()}).catch(function(){})}
checkVer();document.addEventListener('visibilitychange',function(){if(!document.hidden)checkVer()});
if(localStorage[TOKEN])load();else login('contractor');
})();

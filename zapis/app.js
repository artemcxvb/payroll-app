/* Запись исполнителей на выходы (ZAPIS_APP_V1) */
(function(){
var VER=4, CFG=window.ZAPIS_CONFIG||{}, LIVE=CFG.mode==='live'&&/^https:\/\/script\.google\.com\//.test(CFG.apiUrl||'');
var D=null, tab='slots', F={site:'',date:''}, role='', loadSeq=0, $ = function(s){return document.querySelector(s)};
var TOKEN='zapisToken', KIND='zapisKind';

function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function fd(s){if(!s)return'—';var p=String(s).split('-');return p.length===3?p[2]+'.'+p[1]+'.'+p[0]:s}
function today(){
  try{
    return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Moscow',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  }catch(e){
    var u=new Date(Date.now()+3*3600e3);
    return u.getUTCFullYear()+'-'+('0'+(u.getUTCMonth()+1)).slice(-2)+'-'+('0'+u.getUTCDate()).slice(-2);
  }
}
function addDays(ymd,n){var p=ymd.split('-'),d=new Date(+p[0],+p[1]-1,+p[2]+n);return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2)}
function toast(t){var e=$('#toast');e.textContent=t;e.hidden=false;clearTimeout(e._t);e._t=setTimeout(function(){e.hidden=true},2500)}
function fmtLen(min){min=Math.round(+min||0);var h=Math.floor(min/60),m=min%60;if(h&&m)return h+' ч '+m+' мин';if(h)return h+' ч';return m+' мин'}
function fmtPhone(p){p=String(p||'').replace(/\D/g,'');if(p.length===11&&p[0]==='7')return '+7 '+p.slice(1,4)+' '+p.slice(4,7)+'-'+p.slice(7,9)+'-'+p.slice(9);return p||'—'}
function fmtReward(v){v=String(v||'').trim();return v||'—'}
function gph(s){s=String(s==null?'':s);if(!s)return s;
 s=s.replace(/сотрудник(?=[а-яё]*)/gi,function(m){return m[0]==='С'?'Исполнитель':'исполнитель'});
 s=s.replace(/работник(?=[а-яё]*)/gi,function(m){return m[0]==='Р'?'Исполнитель':'исполнитель'});
 s=s.replace(/зарплат[аыуе]/gi,'вознаграждение').replace(/\bЗП\b/g,'вознаграждение');
 s=s.replace(/(^|[^А-Яа-яЁё0-9])смен[аыуе]?(?=[^А-Яа-яЁё]|$)/gi,'$1выход');
 return s}
function hlReq(s){s=gph(s);var e=esc(s);return e.replace(/медкнижк[а-яё]*|ЛМК/gi,function(m){return'<mark class="req-hl">'+m+'</mark>'})}
function closeSheet(){$('#sheet').hidden=true;$('#shBody').innerHTML=''}
function openSheet(html){$('#shBody').innerHTML='<button type="button" class="sh-x" id="shclose" aria-label="Закрыть">×</button>'+html;$('#sheet').hidden=false;var x=$('#shclose');if(x)x.onclick=closeSheet}
function skel(){return'<div class="card"><div class="sk sk-t"></div><div class="sk sk-b"></div><div class="sk sk-s"></div></div><div class="card"><div class="sk sk-b"></div><div class="sk"></div></div>'}

function errText(e){
  return ({
    locked:'Слишком много попыток, подождите 15 минут',
    pending:'Заявка отправлена, ожидайте одобрения администратора',
    rejected:'Заявка отклонена администратором',
    blocked:'Аккаунт заблокирован',
    bad_pin:'Неверный телефон или PIN',
    bad_name:'Укажите ФИО',
    bad_phone:'Укажите телефон в формате +7XXXXXXXXXX',
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
      if(attempt<retries){
        if(opts.onRetry)opts.onRetry(attempt+1);
        return once(attempt+1);
      }
      throw e&&e.name==='AbortError'?new Error('timeout'):(e||new Error('net'));
    });
  }
  return once(0).then(function(j){
    if(seq && seq!==loadSeq){var err=new Error('stale'); err.stale=true; throw err}
    if(j&&j.error==='auth'){localStorage.removeItem(TOKEN);localStorage.removeItem(KIND);login();throw new Error('auth')}
    return j;
  });
}

function navHtml(){
  if(role==='admin'){
    return '<button data-t="slots"'+(tab==='slots'?' class="on"':'')+'><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg><span>Выходы</span></button>'+
      '<button data-t="people"'+(tab==='people'?' class="on"':'')+'><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/></svg><span>Исполнители</span></button>'+
      '<button data-t="more"'+(tab==='more'?' class="on"':'')+'><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg><span>Ещё</span></button>';
  }
  return '<button data-t="slots"'+(tab==='slots'?' class="on"':'')+'><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg><span>Выходы</span></button>'+
    '<button data-t="mine"'+(tab==='mine'?' class="on"':'')+'><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg><span>Мои записи</span></button>';
}

function setNav(){
  var n=$('#tabs');
  n.innerHTML=navHtml();
  n.style.display='';
  n.querySelectorAll('button').forEach(function(b){b.onclick=function(){tab=b.dataset.t;render()}});
}

function load(){
  if(!LIVE){$('#view').innerHTML='<div class="card">Приложение доступно только в боевом режиме.</div>';return}
  var seq=++loadSeq, kind=localStorage[KIND];
  var action=kind==='admin'?'adminZapisData':'contractorData';
  closeSheet();
  $('#view').innerHTML=skel()+'<p class="cnt" id="ldhint">Загрузка… если сервер отвечает дольше 15 секунд, подождите или нажмите «Обновить».</p>';
  api({action:action},{seq:seq,onRetry:function(){var h=$('#ldhint');if(h)h.textContent='Сервер отвечает дольше обычного, пробуем ещё раз…'}}).then(function(j){
    if(seq!==loadSeq)return;
    if(!j.ok)throw new Error(j.error||'load');
    D=j; role=j.role||kind||'contractor';
    $('#who').textContent=(j.user&&j.user.name)||'';
    $('#logout').style.display='';
    setNav(); render();
  }).catch(function(e){
    if(e&&(e.stale||e.message==='stale'||e.message==='auth'))return;
    if(seq!==loadSeq)return;
    $('#view').innerHTML='<div class="card"><b>Не удалось загрузить данные</b><p class="hint">'+esc(netErr())+'</p><button class="btn" id="retry">Повторить</button></div>';
    var b=$('#retry'); if(b)b.onclick=function(){load()};
  });
}

function logout(){
  if(!confirm('Выйти из аккаунта?'))return;
  loadSeq++; closeSheet();
  [TOKEN,KIND,'zapisCache'].forEach(function(k){localStorage.removeItem(k)});
  D=null; role=''; tab='slots';
  $('#tabs').style.display='none'; $('#who').textContent=''; $('#logout').style.display='none';
  login(); toast('Вы вышли');
}

function login(mode){
  mode=mode||'contractor';
  $('#tabs').style.display='none'; $('#who').textContent=''; $('#logout').style.display='none';
  if(mode==='admin'){
    $('#view').innerHTML='<div class="login card"><h3>Вход администратора</h3><label>Имя</label><input id="ln" autocomplete="username"><label>PIN (4–6 цифр, если требуется)</label><input id="lp" type="password" inputmode="numeric" maxlength="6" autocomplete="current-password" pattern="[0-9]{4,6}"><button class="btn" id="lb">Войти</button><button type="button" class="btn s" id="lback">Вход исполнителя</button><div id="le" class="cnt"></div></div>';
    $('#lback').onclick=function(){login('contractor')};
    $('#lb').onclick=function(){
      var b=$('#lb'); b.disabled=true; $('#le').textContent='Входим…';
      api({action:'login',name:$('#ln').value,pin:$('#lp').value},{retries:1}).then(function(j){
        if(!j.ok){$('#le').textContent=j.error==='bad_pin'||!j.error?'Неверное имя или PIN':errText(j.error);b.disabled=false;return}
        if(!j.user||j.user.role!=='admin'){$('#le').textContent='Этот вход только для администратора';b.disabled=false;return}
        localStorage[TOKEN]=j.token; localStorage[KIND]='admin'; load();
      }).catch(function(){$('#le').textContent=netErr();b.disabled=false});
    };
    return;
  }
  if(mode==='reg'){
    $('#view').innerHTML='<div class="login card"><h3>Регистрация исполнителя</h3><label>ФИО</label><input id="rn" autocomplete="name"><label>Телефон</label><input id="rp" type="tel" inputmode="tel" autocomplete="tel" placeholder="+7XXXXXXXXXX"><label>PIN (4–6 цифр)</label><input id="rpin" type="password" inputmode="numeric" maxlength="6" pattern="[0-9]{4,6}"><label>Повторите PIN</label><input id="rpin2" type="password" inputmode="numeric" maxlength="6" pattern="[0-9]{4,6}"><button class="btn" id="rb">Отправить заявку</button><button type="button" class="btn s" id="lback">Назад ко входу</button><div id="le" class="cnt"></div></div>';
    $('#lback').onclick=function(){login('contractor')};
    $('#rb').onclick=function(){
      var pin=$('#rpin').value, pin2=$('#rpin2').value;
      if(!/^\d{4,6}$/.test(pin)||pin!==pin2){$('#le').textContent=pin!==pin2?'PIN не совпадают':'PIN должен содержать 4–6 цифр';return}
      var b=$('#rb'); b.disabled=true; $('#le').textContent='Отправляем…';
      api({action:'contractorRegister',name:$('#rn').value,fio:$('#rn').value,phone:$('#rp').value,pin:pin,pin2:pin2},{retries:1}).then(function(j){
        if(!j.ok){$('#le').textContent=errText(j.error);b.disabled=false;return}
        $('#view').innerHTML='<div class="login card"><div class="okmsg">Заявка отправлена. Статус «Ожидает» — вход будет доступен после одобрения администратора.</div><button class="btn" id="lback">Назад ко входу</button></div>';
        $('#lback').onclick=function(){login('contractor')};
      }).catch(function(){$('#le').textContent=netErr();b.disabled=false});
    };
    return;
  }
  $('#view').innerHTML='<div class="login card"><h3>Вход исполнителя</h3><label>Телефон</label><input id="lpn" type="tel" inputmode="tel" autocomplete="tel" placeholder="+7XXXXXXXXXX"><label>PIN (4–6 цифр)</label><input id="lp" type="password" inputmode="numeric" maxlength="6" autocomplete="current-password" pattern="[0-9]{4,6}"><button class="btn" id="lb">Войти</button><button type="button" class="btn s" id="lreg">Регистрация</button><button type="button" class="btn s" id="ladm">Вход администратора</button><div id="le" class="cnt"></div></div>';
  $('#lreg').onclick=function(){login('reg')};
  $('#ladm').onclick=function(){login('admin')};
  $('#lb').onclick=function(){
    var b=$('#lb'); b.disabled=true; $('#le').textContent='Входим…';
    api({action:'contractorLogin',phone:$('#lpn').value,pin:$('#lp').value},{retries:1}).then(function(j){
      if(!j.ok){$('#le').textContent=errText(j.error);b.disabled=false;return}
      localStorage[TOKEN]=j.token; localStorage[KIND]='contractor'; load();
    }).catch(function(){$('#le').textContent=netErr();b.disabled=false});
  };
}

function siteOpts(sel, empty){
  var sites=(D&&D.sites)||[], h=empty?'<option value="">Все площадки</option>':'<option value="">Выберите площадку</option>';
  sites.forEach(function(s){var n=s.site||'';h+='<option value="'+esc(n)+'"'+(n===sel?' selected':'')+'>'+esc(n)+'</option>'});
  return h;
}

function slotCard(s, admin){
  var left=s.left, st=s.status==='Закрыт'?'bad':(left<=0?'w':'ok');
  var stLabel=s.status==='Закрыт'?'Закрыт':(left<=0?'Мест нет':left+' из '+s.places);
  var req=s.req?('<div class="brief" style="margin-top:10px"><span class="req-line">Требования: '+hlReq(s.req)+'</span></div>'):'';
  return '<div class="card it" data-row="'+s.row+'" style="flex-wrap:wrap"><div><div class="nm">'+esc(s.site||'—')+'</div>'+
    '<div class="sub">'+fd(s.date)+' · начало '+esc(s.start||'—')+' · '+esc(fmtLen(s.length))+'</div>'+
    '<div class="sub">'+esc(gph(s.vacancy||'Вид услуг не указан'))+' · вознаграждение '+esc(fmtReward(s.reward))+'</div></div>'+
    '<span class="st '+st+'">'+stLabel+'</span>'+(req?'<div style="flex:1 0 100%">'+req+'</div>':'')+'</div>';
}

function renderSlotsContractor(){
  var list=(D.slots||[]).filter(function(s){
    if(F.site&&s.site!==F.site)return false;
    if(F.date&&s.date!==F.date)return false;
    return true;
  });
  var h='<h2 class="scr">Открытые выходы</h2><div class="f"><select id="fsite">'+siteOpts(F.site,true)+'</select><input id="fdate" type="date" value="'+esc(F.date)+'"></div>';
  if(!list.length)h+='<div class="empty"><b>Нет открытых выходов</b><span>Измените площадку или дату</span></div>';
  else list.forEach(function(s){h+=slotCard(s)});
  $('#view').innerHTML=h;
  $('#fsite').onchange=function(){F.site=this.value;render()};
  $('#fdate').onchange=function(){F.date=this.value;render()};
  $('#view').querySelectorAll('.card.it').forEach(function(el){el.onclick=function(){openSignup(+el.dataset.row)}});
}

function openSignup(row){
  var s=(D.slots||[]).filter(function(x){return x.row===row})[0];
  if(!s)return;
  var req=s.req?('<div class="brief"><span class="req-line">Требования: '+hlReq(s.req)+'</span></div>'):'<p class="hint">Дополнительные требования к площадке не указаны.</p>';
  var can=s.left>0&&s.status==='Открыт'&&!s.started;
  var already=s.mySignup;
  var body='<h3>'+esc(s.site)+'</h3>'+
    '<div class="row"><span>Дата</span><span>'+fd(s.date)+'</span></div>'+
    '<div class="row"><span>Начало</span><span>'+esc(s.start)+'</span></div>'+
    '<div class="row"><span>Длительность</span><span>'+esc(fmtLen(s.length))+'</span></div>'+
    '<div class="row"><span>Вид услуг</span><span>'+esc(gph(s.vacancy||'—'))+'</span></div>'+
    '<div class="row"><span>Вознаграждение</span><span>'+esc(fmtReward(s.reward))+'</span></div>'+
    '<div class="row"><span>Мест осталось</span><span class="places'+(s.left<=0?' zero':'')+'">'+s.left+' из '+s.places+'</span></div>'+
    (s.comment?'<div class="row"><span>Комментарий</span><span>'+esc(s.comment)+'</span></div>':'')+
    req+
    (already?'<div class="okmsg" style="margin-top:16px">Вы уже записаны на этот выход</div><button class="btn s" id="shx">Закрыть</button>':
      (can?'<label class="confirm"><input type="checkbox" id="cnf"><span>Подтверждаю, что ознакомлен(а) с требованиями и готов(а) записаться на этот выход</span></label><button class="btn" id="sgo">Записаться</button><button class="btn s" id="shx">Отмена</button>':
        '<p class="hint">Запись недоступна</p><button class="btn s" id="shx">Закрыть</button>'));
  openSheet(body);
  $('#shx').onclick=closeSheet;
  var go=$('#sgo');
  if(go)go.onclick=function(){
    if(!$('#cnf').checked){toast('Отметьте «подтверждаю»');return}
    go.disabled=true;
    api({action:'signup',row:s.row,confirm:true}).then(function(j){
      if(!j.ok){toast(errText(j.error));go.disabled=false;return}
      toast('Вы записаны'); closeSheet(); load();
    }).catch(function(){toast('Нет связи');go.disabled=false});
  };
}

function renderMine(){
  var list=D.mine||[], h='<h2 class="scr">Мои записи</h2>';
  if(!list.length)h+='<div class="empty"><b>Записей пока нет</b><span>Откройте вкладку «Выходы», чтобы записаться</span></div>';
  list.forEach(function(item){
    var s=item.slot||{}, sg=item.signup||{};
    var can=sg.status==='Записан'&&s.canCancel;
    var st=sg.status==='Записан'?'ok':(sg.status==='Отменена'?'w':'bad');
    h+='<div class="card"><div class="it"><div><div class="nm">'+esc(s.site||'—')+'</div><div class="sub">'+fd(s.date)+' · начало '+(s.start||'—')+' · '+fmtLen(s.length)+'</div><div class="sub">вознаграждение '+esc(fmtReward(s.reward))+'</div></div><span class="st '+st+'">'+esc(sg.status)+'</span></div>';
    if(can)h+='<p class="hint">Отмена возможна не позднее чем за '+(D.cancel_hours||12)+' ч до начала</p><button class="btn s" data-cancel="'+sg.row+'">Отменить запись</button>';
    else if(sg.status==='Записан'&&s.startMs)h+='<p class="hint">Отмена уже недоступна (окно — '+(D.cancel_hours||12)+' ч до начала)</p>';
    h+='</div>';
  });
  $('#view').innerHTML=h;
  $('#view').querySelectorAll('[data-cancel]').forEach(function(b){b.onclick=function(){
    if(!confirm('Отменить запись на этот выход?'))return;
    b.disabled=true;
    api({action:'cancelSignup',row:+b.dataset.cancel}).then(function(j){
      if(!j.ok){toast(errText(j.error));b.disabled=false;return}
      toast('Запись отменена'); load();
    }).catch(function(){toast('Нет связи');b.disabled=false});
  }});
}

function renderSlotsAdmin(){
  var list=(D.slots||[]).filter(function(s){
    if(F.site&&s.site!==F.site)return false;
    if(F.date&&s.date!==F.date)return false;
    return true;
  });
  var h='<h2 class="scr">Выходы</h2><button class="btn" id="newslot">Создать выход</button><div class="f"><select id="fsite">'+siteOpts(F.site,true)+'</select><input id="fdate" type="date" value="'+esc(F.date)+'"></div>';
  if(!list.length)h+='<div class="empty"><b>Выходов нет</b><span>Создайте выход или снимите фильтр</span></div>';
  else list.forEach(function(s){
    var n=(s.signups||[]).filter(function(x){return x.status==='Записан'}).length;
    h+='<div class="card it" data-row="'+s.row+'"><div><div class="nm">'+esc(s.site||'—')+'</div>'+
      '<div class="sub">'+fd(s.date)+' · начало '+esc(s.start||'—')+' · '+esc(fmtLen(s.length))+'</div>'+
      '<div class="sub">'+esc(gph(s.vacancy||'—'))+' · вознаграждение '+esc(fmtReward(s.reward))+' · записано '+n+' из '+s.places+'</div></div>'+
      '<span class="st '+(s.status==='Закрыт'?'bad':'ok')+'">'+esc(s.status)+'</span></div>';
  });
  $('#view').innerHTML=h;
  $('#fsite').onchange=function(){F.site=this.value;render()};
  $('#fdate').onchange=function(){F.date=this.value;render()};
  $('#newslot').onclick=function(){openSlotForm(null)};
  $('#view').querySelectorAll('.card.it').forEach(function(el){el.onclick=function(){openAdminSlot(+el.dataset.row)}});
}

function slotFormFields(s){
  s=s||{};
  var hours=s.length?((s.length/60).toString().replace(/\.0$/,'').replace('.',',')):'';
  return '<label>Площадка</label><select id="ssite">'+siteOpts(s.site||'',false)+'</select>'+
    '<div class="two"><label>Дата</label><label>Начало</label><input id="sdate" type="date" value="'+esc(s.date||'')+'"><input id="sstime" type="time" value="'+esc(s.start||'')+'"></div>'+
    '<div class="two"><label>Длительность, часов</label><label>Мест</label><input id="slen" type="text" inputmode="decimal" placeholder="11" value="'+esc(hours)+'"><input id="splaces" type="number" min="1" value="'+(s.places||'')+'"></div>'+
    '<label>Вид услуг</label><input id="svac" value="'+esc(s.vacancy||'')+'">'+
    '<label>Вознаграждение</label><input id="srew" value="'+esc(s.reward||'')+'">'+
    '<label>Комментарий</label><textarea id="scom">'+esc(s.comment||'')+'</textarea>';
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
  var h='',i,d,wd=['вс','пн','вт','ср','чт','пт','сб'];
  for(i=0;i<7;i++){
    d=addDays(from,i);
    var p=d.split('-'); var dt=new Date(+p[0],+p[1]-1,+p[2]);
    h+='<label><input type="checkbox" class="wd" value="'+d+'"'+(i===0?' checked':'')+'> '+wd[dt.getDay()]+' '+p[2]+'.'+p[1]+'</label>';
  }
  return h;
}

function openSlotForm(s){
  var edit=!!(s&&s.row);
  var extra=edit?'':'<label>Даты (можно выбрать несколько дней)</label><div class="week" id="wdays">'+weekBoxes(s&&s.date||today())+'</div>';
  openSheet('<h3>'+(edit?'Редактировать выход':'Новый выход')+'</h3>'+slotFormFields(s||{date:today(),start:'09:00',length:660,places:1})+extra+
    '<button class="btn" id="ssave">'+(edit?'Сохранить':'Создать')+'</button><button class="btn s" id="shx">Отмена</button>');
  $('#ssite').onchange=prefillsFromSite;
  if(!edit)prefillsFromSite();
  if($('#sdate')){var syncW=function(){if($('#wdays'))$('#wdays').innerHTML=weekBoxes($('#sdate').value||today())};$('#sdate').onchange=syncW;$('#sdate').oninput=syncW;}
  $('#shx').onclick=closeSheet;
  $('#ssave').onclick=function(){
    var body=readSlotForm();
    if(!edit){
      var dates=[];
      $('#wdays').querySelectorAll('.wd:checked').forEach(function(x){dates.push(x.value)});
      if(!dates.length)dates=[body.date];
      body.dates=dates; body.date=dates[0];
    }
    var act=edit?'updateSlot':'createSlot';
    if(edit)body.row=s.row;
    $('#ssave').disabled=true;
    api(Object.assign({action:act},body)).then(function(j){
      if(!j.ok){toast(errText(j.error));$('#ssave').disabled=false;return}
      toast(edit?'Сохранено':'Выход создан'); closeSheet(); load();
    }).catch(function(){toast('Нет связи');$('#ssave').disabled=false});
  };
}

function openAdminSlot(row){
  var s=(D.slots||[]).filter(function(x){return x.row===row})[0];
  if(!s)return;
  var sigs=s.signups||[];
  var h='<h3>'+esc(s.site)+'</h3>'+
    '<div class="row"><span>Дата</span><span>'+fd(s.date)+'</span></div>'+
    '<div class="row"><span>Начало</span><span>'+esc(s.start)+' · '+esc(fmtLen(s.length))+'</span></div>'+
    '<div class="row"><span>Вид услуг</span><span>'+esc(gph(s.vacancy||'—'))+'</span></div>'+
    '<div class="row"><span>Вознаграждение</span><span>'+esc(fmtReward(s.reward))+'</span></div>'+
    '<div class="row"><span>Места</span><span>'+s.taken+' из '+s.places+' занято</span></div>'+
    (s.comment?'<div class="row"><span>Комментарий</span><span>'+esc(s.comment)+'</span></div>':'')+
    (s.req?'<div class="brief"><span class="req-line">Требования: '+hlReq(s.req)+'</span></div>':'')+
    '<h3 style="margin-top:20px;font-size:16px">Записавшиеся</h3>';
  var active=sigs.filter(function(x){return x.status==='Записан'});
  var other=sigs.filter(function(x){return x.status!=='Записан'});
  if(!sigs.length)h+='<div class="empty sm"><span>Пока никто не записался</span></div>';
  active.forEach(function(x){
    h+='<div class="card it"><div><div class="nm">'+esc(x.name)+'</div><div class="sub">'+esc(fmtPhone(x.phone))+'</div></div><button class="btn s" style="width:auto;margin:0;min-height:36px;padding:0 12px" data-rm="'+x.row+'">Снять</button></div>';
  });
  other.forEach(function(x){
    h+='<div class="card it"><div><div class="nm">'+esc(x.name)+'</div><div class="sub">'+esc(fmtPhone(x.phone))+' · '+esc(x.status)+'</div></div></div>';
  });
  h+='<button class="btn" id="sedit">Редактировать</button>'+
    '<button class="btn s" id="scopy">Копировать на следующие дни</button>'+
    '<button class="btn s" id="sclose">'+(s.status==='Закрыт'?'Открыть выход':'Закрыть выход')+'</button>'+
    '<button class="btn s" id="shx">Закрыть</button>';
  openSheet(h);
  $('#shx').onclick=closeSheet;
  $('#sedit').onclick=function(){openSlotForm(s)};
  $('#sclose').onclick=function(){
    api({action:'closeSlot',row:s.row}).then(function(j){if(!j.ok){toast(errText(j.error));return}toast(j.status==='Закрыт'?'Выход закрыт':'Выход открыт');closeSheet();load()}).catch(function(){toast('Нет связи')});
  };
  $('#scopy').onclick=function(){
    openSheet('<h3>Копировать выход</h3><p class="hint">Будут созданы такие же выходы на выбранные дни, начиная со следующего после '+fd(s.date)+'.</p><label>Сколько следующих дней</label><input id="cdays" type="number" min="1" max="31" value="6"><button class="btn" id="cgo">Создать копии</button><button class="btn s" id="shx">Отмена</button>');
    $('#shx').onclick=closeSheet;
    $('#cgo').onclick=function(){
      $('#cgo').disabled=true;
      api({action:'copySlot',row:s.row,days:+$('#cdays').value}).then(function(j){
        if(!j.ok){toast(errText(j.error));$('#cgo').disabled=false;return}
        toast('Создано выходов: '+(j.rows&&j.rows.length||0)); closeSheet(); load();
      }).catch(function(){toast('Нет связи');$('#cgo').disabled=false});
    };
  };
  $('#sheet').querySelectorAll('[data-rm]').forEach(function(b){b.onclick=function(ev){
    ev.stopPropagation();
    if(!confirm('Снять исполнителя с этого выхода?'))return;
    api({action:'removeSignup',row:+b.dataset.rm}).then(function(j){if(!j.ok){toast(errText(j.error));return}toast('Снят с выхода');closeSheet();load()}).catch(function(){toast('Нет связи')});
  }});
}

function renderPeople(){
  var list=D.contractors||[], h='<h2 class="scr">Исполнители</h2>';
  if(!list.length)h+='<div class="empty"><b>Пока нет исполнителей</b><span>Заявки появятся после регистрации</span></div>';
  list.forEach(function(u){
    var st=u.status==='Одобрен'?'ok':u.status==='Заблокирован'||u.status==='Отклонён'?'bad':'w';
    h+='<div class="card ucard"><div class="it"><div><div class="nm">'+esc(u.name)+'</div><div class="sub">'+esc(fmtPhone(u.phone))+(u.date?' · '+esc(u.date):'')+'</div></div><span class="st '+st+'">'+esc(u.status)+'</span></div>';
    h+='<div class="uacts">';
    if(u.status!=='Одобрен')h+='<button class="btn" data-row="'+u.row+'" data-st="Одобрен">Одобрить</button>';
    if(u.status!=='Заблокирован')h+='<button class="btn s" data-row="'+u.row+'" data-st="Заблокирован">Заблокировать</button>';
    if(u.status==='Ожидает')h+='<button class="btn s" data-row="'+u.row+'" data-st="Отклонён">Отклонить</button>';
    h+='</div></div>';
  });
  $('#view').innerHTML=h;
  $('#view').querySelectorAll('.uacts .btn').forEach(function(b){b.onclick=function(){
    api({action:'updateContractor',row:+b.dataset.row,status:b.dataset.st}).then(function(j){
      if(!j.ok){toast(errText(j.error));return}toast('Статус обновлён');load();
    }).catch(function(){toast('Нет связи')});
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
  var h='<h2 class="scr">Ещё</h2>'+
    '<div class="card"><h3>Окно отмены</h3><p class="hint">Исполнитель может отменить запись не позднее чем за указанное число часов до начала выхода.</p>'+
    '<label>Часов до начала</label><input id="chours" type="number" min="0" max="168" value="'+(D.cancel_hours||12)+'"><button class="btn" id="csave">Сохранить</button></div>'+
    '<div class="card"><h3>Выгрузка</h3><p class="hint">Список записей за дату и площадку — на лист «Выгрузка_выходов» и в CSV-файл.</p>'+
    '<label>Дата</label><input id="edate" type="date" value="'+today()+'"><label>Площадка (необязательно)</label><select id="esite">'+siteOpts('',true)+'</select>'+
    '<button class="btn" id="ego">Выгрузить</button></div>';
  $('#view').innerHTML=h;
  $('#csave').onclick=function(){
    api({action:'setZapisSetting',cancel_hours:+$('#chours').value}).then(function(j){if(!j.ok){toast(errText(j.error));return}toast('Сохранено');load()}).catch(function(){toast('Нет связи')});
  };
  $('#ego').onclick=function(){
    $('#ego').disabled=true;
    api({action:'exportSlots',date:$('#edate').value,site:$('#esite').value}).then(function(j){
      $('#ego').disabled=false;
      if(!j.ok){toast(errText(j.error));return}
      downloadCsv(toCsv(j.rows),'vyhody_'+(j.rows&&j.rows[0]&&j.rows[0].date||$('#edate').value)+'.csv');
      toast('Выгружено строк: '+(j.count||0)+' (лист «Выгрузка_выходов»)');
    }).catch(function(){toast('Нет связи');$('#ego').disabled=false});
  };
}

function render(){
  if(!D)return;
  setNav();
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
if($('#sheet'))$('#sheet').addEventListener('click',function(e){if(e.target===this)closeSheet()});
function hardUpdate(){toast('Обновляю приложение');var p=[];if(window.caches)p.push(caches.keys().then(function(k){return Promise.all(k.map(function(x){return caches.delete(x)}))}));if('serviceWorker'in navigator)p.push(navigator.serviceWorker.getRegistrations().then(function(rs){return Promise.all(rs.map(function(r){return r.unregister()}))}));Promise.all(p).catch(function(){}).then(function(){location.replace(location.pathname+'?v='+Date.now())})}
function checkVer(){fetch('index.html?t='+Date.now(),{cache:'no-store'}).then(function(r){return r.text()}).then(function(t){var m=t.match(/app\.js\?v=(\d+)/);if(m&&+m[1]>VER&&sessionStorage.zapisUpd!==m[1]){sessionStorage.zapisUpd=m[1];hardUpdate()}}).catch(function(){})}
if('serviceWorker'in navigator){var hadC=!!navigator.serviceWorker.controller,rl=false;navigator.serviceWorker.addEventListener('controllerchange',function(){if(hadC&&!rl){rl=true;location.reload()}});navigator.serviceWorker.register('sw.js?v='+VER,{updateViaCache:'none'}).then(function(r){r.update()}).catch(function(){})}
checkVer();document.addEventListener('visibilitychange',function(){if(!document.hidden)checkVer()});
if(localStorage[TOKEN])load();else login('contractor');
})();

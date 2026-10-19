(function(){
'use strict';
/* STARS_V1: игра «Кто хочет стать звездой склада?» внутри «Мои выплаты». Вся логика игры и правильные ответы — на сервере (Apps Script, действия stars*).
   Вход — тем же токеном, что и приложение (localStorage pr.session). Телефон бригадира приходит с сервера только вошедшему. */
var APPC=window.APP_CONFIG||{}, API=APPC.backendUrl||'';
var CFG={STAR_RUB:10, LADDER_STARS:[1,2,3,4,5,6,7,8,9,10], SAFE_STEPS:[5], PENALTY_STARS:1, MONTH_CAP_RUB:5000, CALL_SECONDS:30};   /* значения по умолчанию; сервер присылает свои (starsInfo.cfg) */
var RUB=CFG.STAR_RUB, CAP=CFG.MONTH_CAP_RUB, LADDER=CFG.LADDER_STARS, SAFE={5:true}, L='АБВГ';
function lr(i){return '⭐\u00a0'+LADDER[i]}
var INFO=null, Q=[], G=null, muted=false, audioOn=false, timers=[], screen='menu', ladOpen=false, poll=null, MAN={}, busy=false;
var $=function(s){return document.querySelector(s)}, app=$('#app'), fx=$('#fx');
var P=new URLSearchParams(location.search), FAST=P.has('fast'), ROOT=document.documentElement;
var st={get stars(){return INFO?INFO.balance:0}};
function session(){try{return JSON.parse(localStorage.getItem('pr.session'))||null}catch(e){return null}}
function api(action,body){var se=session(),b={action:action};for(var k in (body||{}))b[k]=body[k];if(se&&se.token)b.token=se.token;
  return fetch(API,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(b),redirect:'follow'}).then(function(r){return r.json()}).catch(function(){return {ok:false,error:'network'}})
    .then(function(r){if(r&&(r.error==='auth'||r.error==='closed'||r.error==='blocked'))needLogin(r.error);return r})}
var ERR={network:'Нет связи с сервером. Проверьте интернет и попробуйте ещё раз.',played_today:'Сегодня вы уже сыграли. Следующая игра — завтра.',no_questions:'Вопросы пока не готовы. Попробуйте позже.',not_enough:'Недостаточно звёзд.',cap:'Превышен лимит обмена за месяц.',bad_amount:'Неверное количество звёзд.',rate_limit:'Слишком много заявок. Попробуйте позже.',no_game:'Игра закрыта. Откройте вкладку заново.',step:'Ответ уже принят.',consent:'Сначала примите согласие в приложении.',server:'Ошибка сервера. Попробуйте ещё раз.'};
function errText(e){return ERR[e]||('Ошибка: '+(e||'неизвестно'))}
var loginNeeded=null;function needLogin(e){loginNeeded=e;G=null;clearT();stopVoice();stopMusic();screen='login';render()}

function h(tag,attrs){var e=document.createElement(tag);attrs=attrs||{};for(var k in attrs){var v=attrs[k];if(k==='class')e.className=v;else if(k==='text')e.textContent=v;else if(k==='html')e.innerHTML=v;else if(k.slice(0,2)==='on')e.addEventListener(k.slice(2),v);else if(v!=null&&v!==false)e.setAttribute(k,v)}var add=function(c){if(c==null)return;if(Array.isArray(c))return c.forEach(add);e.appendChild(typeof c==='string'?document.createTextNode(c):c)};for(var i=2;i<arguments.length;i++)add(arguments[i]);return e}
function later(fn,ms){var t=setTimeout(fn,FAST?Math.min(ms,250):ms);timers.push(t);return t}
function clearT(){timers.forEach(clearTimeout);timers=[]}
function rub(n){return n.toLocaleString('ru-RU')+'\u00a0₽'}
function plural(n,a,b,c){n=Math.abs(n)%100;var n1=n%10;if(n>10&&n<20)return c;if(n1>1&&n1<5)return b;if(n1===1)return a;return c}
function starsTxt(n){return n+' '+plural(n,'звезда','звезды','звёзд')}
function lz(content,cls,attrs){attrs=attrs||{};var b=h('button',Object.assign({class:'lzb'},attrs),h('div',{class:'lz'+(cls?' '+cls:'')},h('div',{class:'in'},content)));return b}
/* ---------- audio: один AudioContext, разблокировка первым касанием (iOS), декодированные буферы, кеш и предзагрузка ---------- */
window.QLOG=[];function lg(k,f,v){QLOG.push({k:k,f:f,v:v==null?1:v,t:performance.now()})}
var QA=window.QA={started:[],failed:[],tts:[],plays:[]}, AC=null, OUT=null, MG=null, BUF={}, vTok=0, vSrc=null, mSrc=null, ruVoice=null, unlocked=false;
function ensureAC(){if(AC)return AC;var C=window.AudioContext||window.webkitAudioContext;if(!C)return null;try{AC=new C();OUT=AC.createGain();OUT.connect(AC.destination);MG=AC.createGain();MG.gain.value=.35;MG.connect(OUT)}catch(e){AC=null}return AC}
function unlock(){var c=ensureAC();if(c){if(c.state!=='running')c.resume();if(!unlocked){try{var s=c.createBufferSource();s.buffer=c.createBuffer(1,1,22050);s.connect(OUT);s.start(0)}catch(e){}}}
  if(!unlocked&&window.speechSynthesis){if(!ruVoice)pickVoice();try{var u=new SpeechSynthesisUtterance(' ');u.volume=0;speechSynthesis.speak(u)}catch(e){}}unlocked=true}
['pointerdown','touchend','keydown'].forEach(function(ev){document.addEventListener(ev,unlock,{capture:true,passive:true})});
function pickVoice(){if(!window.speechSynthesis)return;var v=speechSynthesis.getVoices().filter(function(x){return /^ru/i.test(x.lang)});ruVoice=v[0]||null}
if(window.speechSynthesis){speechSynthesis.onvoiceschanged=pickVoice;setTimeout(pickVoice,3000)}   /* голоса грузятся асинхронно; не блокируем первый кадр */
function loadBuf(name){if(BUF[name])return BUF[name];if(!ensureAC())return Promise.resolve(null);
  var p=fetch(AUDIO+name+'.mp3').then(function(r){if(!r.ok)throw new Error(r.status);return r.arrayBuffer()}).then(function(ab){return new Promise(function(res,rej){AC.decodeAudioData(ab,res,rej)})})
    .catch(function(){delete BUF[name];QA.failed.push(name);return null});BUF[name]=p;return p}
function preload(names){names.forEach(loadBuf)}
function playBuf(name,vol,isVoice){var tok=isVoice?++vTok:0;
  if(!audioOn||muted||!ensureAC())return Promise.resolve(false);
  if(AC.state!=='running')AC.resume();
  return loadBuf(name).then(function(b){if(!b)return false;if(isVoice&&tok!==vTok)return true;if(muted)return true;
    if(AC.state!=='running')return false;   /* контекст не разблокирован — пусть говорит запасной синтез */
    var s=AC.createBufferSource(),g=AC.createGain();g.gain.value=vol==null?1:vol;s.buffer=b;s.connect(g);g.connect(OUT);
    QA.started.push(name);lg(isVoice?'v':'s',name,g.gain.value);var rec={n:name,dur:b.duration,t0:AC.currentTime,played:0,stopped:false};if(isVoice)QA.plays.push(rec);
    return new Promise(function(res){var done=false,t,fin=function(){if(done)return;done=true;clearInterval(t);rec.played=AC.currentTime-rec.t0;rec.stopped=!!s._stopped;if(vSrc===s)vSrc=null;res(true)};
      s.onended=fin;t=setInterval(function(){if(AC.currentTime-rec.t0>b.duration+1)fin()},500);   /* страховка, если ended не пришёл: по часам AudioContext (они стоят на паузе/прерывании), а не по setTimeout */
      if(isVoice){if(vSrc){vSrc._stopped=true;try{vSrc.stop()}catch(e){}};vSrc=s;s._fin=fin}
      try{s.start(0)}catch(e){fin()}})})}
function snd(name,vol){return playBuf(name,vol,false)}
function voice(name,fallbackText){
  if(!audioOn||muted)return new Promise(function(r){later(r,900)});
  stopVoice(true);var my=vTok+1;duck(true);host(true);calm(true);
  return playBuf(name,1,true).then(function(ok){if(ok===false&&my===vTok)return speak(fallbackText,my)}).then(function(){if(my===vTok){duck(false);host(false);calm(false)}})}
function host(on){var e=$('.host');if(e)e.style.visibility=on?'visible':'hidden'}
function speak(t,tok){return new Promise(function(r){if(!t||!window.speechSynthesis)return r();var done=false,fin=function(){if(!done){done=true;clearTimeout(to);r()}};
  var u=new SpeechSynthesisUtterance(t);u.lang='ru-RU';if(ruVoice)u.voice=ruVoice;u.rate=1.05;u.onend=fin;u.onerror=fin;QA.tts.push(t.slice(0,30));lg('tts',t.slice(0,30));
  var to=setTimeout(fin,1500+t.length*85);try{speechSynthesis.cancel();speechSynthesis.speak(u)}catch(e){fin()}})}
function stopVoice(keepHost){lg('vstop');vTok++;if(vSrc){var s=vSrc;vSrc=null;s._stopped=true;try{s.stop()}catch(e){}if(s._fin)s._fin()}if(window.speechSynthesis)try{speechSynthesis.cancel()}catch(e){}if(!keepHost){host(false);duck(false);calm(false)}}
function startMusic(){if(!audioOn||muted||!ensureAC()||mSrc)return;var my=mSrc={};loadBuf('m_suspense').then(function(b){if(mSrc!==my||!b)return;var s=AC.createBufferSource();s.buffer=b;s.loop=true;s.connect(MG);s.start(0);mSrc=s;lg('m')})}
function stopMusic(){lg('mstop');if(mSrc&&mSrc.stop)try{mSrc.stop()}catch(e){}mSrc=null}
function duck(on){if(MG&&AC)MG.gain.setTargetAtTime(on?.1:.32,AC.currentTime,.15)}
function setMuted(m){muted=m;if(m){stopMusic();stopVoice()}else if(G&&G.phase==='q')startMusic();render()}
function calm(on){ROOT.classList.toggle('calm',!!on)}   /* пока ведущий говорит — фоновые анимации на паузе */
document.addEventListener('visibilitychange',function(){if(!AC)return;if(document.visibilityState==='hidden'){stopVoice();AC.suspend()}else AC.resume()});
/* ---------- performance: low-power auto ---------- */
(function(){var mq=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)');if((mq&&mq.matches)||P.has('lite'))ROOT.classList.add('lite');if(P.has('full'))return;
  var n=0,slow=0,last=0,t0;function f(t){if(!t0)t0=performance.now();if(last){var d=t-last;if(d>34)slow++;n++}last=t;if(n<120&&performance.now()-t0<6000)requestAnimationFrame(f);else if(n&&slow/n>.25){ROOT.classList.add('lite');lg('lite',slow+'/'+n)}}setTimeout(function(){requestAnimationFrame(f)},2500)})();   /* замер частоты кадров — после загрузки */
/* ---------- fx ---------- */
function confetti(n){var cols=['#f4c430','#ff9a1a','#1fae4b','#8f75ff','#fff','#4a6cff'];n=Math.min(n||60,ROOT.classList.contains('lite')?20:50);for(var i=0;i<n;i++){var c=h('i',{class:'conf'});c.style.left=Math.random()*100+'vw';c.style.background=cols[i%cols.length];c.style.animationDuration=(2+Math.random()*2.5)+'s';c.style.animationDelay=Math.random()*.8+'s';fx.appendChild(c);(function(c){setTimeout(function(){c.remove()},5500)})(c)}}
function flyStars(n,from,minus){var b=$('.bal');if(!b)return;var r=b.getBoundingClientRect(),f=from?from.getBoundingClientRect():{left:innerWidth/2,top:innerHeight/2,width:0,height:0};for(var i=0;i<Math.min(n,12);i++){var s=h('span',{class:'flystar',text:minus?'💥':'⭐'});var x=minus?r.left+r.width/2:f.left+f.width/2+(Math.random()*60-30),y=minus?r.top+r.height/2:f.top+f.height/2;var tx=minus?f.left+f.width/2+(Math.random()*80-40):r.left+r.width/2,ty=minus?f.top+f.height/2:r.top+r.height/2;s.style.left=x+'px';s.style.top=y+'px';s.style.setProperty('--dx',(tx-x)+'px');s.style.setProperty('--dy',(ty-y)+'px');s.style.animationDelay=(i*.07)+'s';fx.appendChild(s);(function(s){setTimeout(function(){s.remove()},1800)})(s)}setTimeout(function(){b.classList.add('bump');snd('s_coin',.6);setTimeout(function(){b.classList.remove('bump')},700)},900)}
function dim(ms){var d=$('.dim');if(!d)return;d.classList.add('on');setTimeout(function(){d.classList.remove('on')},FAST?150:ms||900)}
/* ---------- игра (сервер) ---------- */
var AUDIO='a3/';
function hq(s){var x=5381;s=String(s||'');for(var i=0;i<s.length;i++)x=((x<<5)+x+s.charCodeAt(i))|0;return (x>>>0).toString(36)}   /* записанная озвучка — только если текст в таблице не меняли */
function hasAud(id,kind,text){var m=MAN[id];return !!(m&&m[kind]===hq(text))}
function qVoice(q){var txt=q.q+'. '+q.a.map(function(a,j){return L[j]+': '+a}).join('. ');return hasAud(q.id,'q',q.q)?voice('q'+q.id,txt):(stopVoice(true),duck(true),host(true),speak(txt,vTok).then(function(){host(false);duck(false)}))}
function eVoice(q){return hasAud(q.id,'e',q.explain)?voice('e'+q.id,q.explain):speak(q.explain)}
function loadInfo(){return api('starsInfo').then(function(r){if(r.ok){INFO=r;if(r.cfg){RUB=r.cfg.rub;CAP=r.cfg.cap;LADDER=r.cfg.ladder}}else if(!loginNeeded)INFO={error:r.error};if(screen==='menu'||screen==='ex'||screen==='rate')render();return r})}
function fromState(s){G.gid=s.g;G.i=s.step-1;G.qs[G.i]=s.q;G.removed=(s.removed||[]).slice();if(s.life){G.fifty=s.life.fifty;G.aud=s.life.aud;G.help=s.life.help}}
function newGame(){if(busy)return;busy=true;clearT();clearInterval(callT);stopVoice();poll=null;ladOpen=false;
  api('starsStart').then(function(r){busy=false;if(!r.ok){screen='menu';render();if(!loginNeeded)toast(errText(r.error));return}
    G={qs:[],i:0,phase:'q',fifty:false,help:false,aud:false,removed:[],sel:null,helpTxt:null,res:null,call:null};fromState(r.game);INFO&&(INFO.balance=r.balance);
    screen='game';pushNav();preload(['lock1','lock2','ok1','ok2','ok3','bad','safe','ladder','fifty','help','poll','penalty','s_lock','s_correct','s_wrong','s_coin','m_suspense']);askQ(true)})}
function safeStars(i){return i>=6?6:0}
function askQ(first){var q=G.qs[G.i];G.phase='dim';G.sel=null;G.helpTxt=null;G.shown=false;G.enter=false;poll=null;G.ans=null;
  if(hasAud(q.id,'q',q.q))preload(['q'+q.id]);render();dim(1100);snd('s_lock',.35);
  later(function(){G.phase='q';G.enter=true;render();if(FAST)app.querySelectorAll('.ans.enter').forEach(function(e){e.style.animationDelay='0s'});G.enter=false;G.shown=true;startMusic();qVoice(q)},1000)}
function choose(j){if(!G||G.phase!=='q'||G.call||G.removed.indexOf(j)>=0)return;var q=G.qs[G.i],g=G,step=G.i+1;G.sel=j;G.phase='lock';stopVoice();render();
  snd('s_lock',.8);var lp=voice(Math.random()<.5?'lock1':'lock2','Это ваш окончательный ответ? Принято.'),tp=new Promise(function(r){later(r,3800)});
  var ap=api('starsAnswer',{g:g.gid,k:j,step:step}).then(function(r){if(r.ok){q.correct=r.c;q.explain=r.explain;q.sourceLabel=r.src;g.ans=r;if(hasAud(q.id,'e',r.explain))preload(['e'+q.id]);if(r.next&&r.next.q&&hasAud(r.next.q.id,'q',r.next.q.q))preload(['q'+r.next.q.id])}return r});
  Promise.all([lp,tp,ap]).then(function(v){if(G!==g||G.phase!=='lock')return;var r=v[2];
    if(!r.ok){G.phase='q';G.sel=null;render();toast(errText(r.error));return}
    reveal(r.correct)})}   /* раскрытие — после фразы ведущего и ответа сервера */
function reveal(ok){var q=G.qs[G.i],g=G,step=G.i;G.phase=ok?'ok':'bad';stopMusic();render();
  var alive=function(){return G===g&&G.i===step&&(G.phase==='ok'||G.phase==='bad')};
  if(ok){snd('s_correct',.9);if(SAFE[step])later(function(){confetti(50)},500)}
  else{var b=$('.q');if(b)b.classList.add('shake');snd('s_wrong',.9)}
  later(function(){if(!alive())return;voice(ok?['ok1','ok2','ok3'][step%3]:'bad',ok?'Верно!':'Неверный ответ.')
    .then(function(){if(alive()&&ok&&SAFE[step]&&step<9)return voice('safe','Несгораемая сумма!')})
    .then(function(){if(alive())return eVoice(q)})},ok?400:700)}
function next(){if(!G||(G.phase!=='ok'&&G.phase!=='bad'))return;stopVoice();var r=G.ans;
  if(r&&r.end)return finish(r.end);
  if(r&&r.next){fromState(r.next);ladOpen=true;G.phase='ladder';render();snd('s_coin',.5);var g=G,lp=voice('ladder','Лестница'),tp=new Promise(function(x){later(x,FAST?300:3200)});Promise.all([lp,tp]).then(function(){if(G===g&&G.phase==='ladder'){ladOpen=false;askQ()}})}}
function takeStars(){if(!G||G.phase!=='q'||G.call||G.i===0||busy)return;busy=true;stopVoice();api('starsTake',{g:G.gid}).then(function(r){busy=false;if(r.ok)finish(r.end);else toast(errText(r.error))})}
function finish(e){clearT();clearInterval(callT);poll=null;stopMusic();ladOpen=false;var how=e.how;
  G.phase='end';G.res=e;if(INFO){INFO.balance=e.balance;INFO.playedToday=true}screen='end';render();
  if(how==='win'){snd('s_win');confetti(60);voice('win','Поздравляю!')}else if(how==='take')voice('take','Мудрое решение.');else if(e.penalty)voice('penalty','За ошибку одна звезда сгорает.');
  if(e.penalty)later(function(){flyStars(e.penalty,$('.minus'),true)},700);
  if(e.earned)later(function(){flyStars(e.earned,$('.big'))},e.penalty?2000:600);loadInfo()}
function life(kind,cb){if(!G||G.phase!=='q'||G.call||G[kind==='fifty'?'fifty':kind==='aud'?'aud':'help']||busy)return;busy=true;var g=G;
  api('starsLife',{g:G.gid,kind:kind}).then(function(r){busy=false;if(G!==g)return;if(!r.ok){toast(errText(r.error));return}cb(r)})}
function fifty(){life('fifty',function(r){G.fifty=true;G.shown=true;var was=G.removed.slice();G.removed=r.removed;stopVoice();snd('s_fifty');voice('fifty','Уберите два неверных ответа.');render();
  r.removed.filter(function(k){return was.indexOf(k)<0}).forEach(function(k){var b=document.querySelector('.ans[data-k="'+k+'"]');if(b)b.classList.add('anim')})})}
var callT=null;
function help(){life('help',function(r){clearInterval(callT);G.help=true;G.shown=true;G.foreman=r.foreman;G.hint=r.hint;stopVoice();stopMusic();snd('s_ring',.7);voice('help','Звоним бригадиру.');
  G.call={left:CFG.CALL_SECONDS,dialed:false};render();callT=setInterval(function(){if(!G||!G.call)return clearInterval(callT);G.call.left--;var e=$('.cd b');if(e)e.textContent=G.call.left;var c=$('.cd');if(c)c.style.setProperty('--p',G.call.left/CFG.CALL_SECONDS);if(G.call.left<=5&&G.call.left>0)snd('s_coin',.3);if(G.call.left<=0)endCall()},1000)})}
function endCall(){clearInterval(callT);if(!G||!G.call)return;G.call=null;render();startMusic()}
function simHint(){var q=G.qs[G.i],hn=G.hint||{k:0,conf:.8},pk=hn.k;G.helpTxt='(подсказка-симуляция) '+(hn.conf>.9?'Тут без вариантов — ':hn.conf>.7?'Почти уверен: ':'Не на сто процентов, но я бы сказал ')+'«'+L[pk]+': '+q.a[pk]+'».';endCall()}
document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible'&&G&&G.call&&G.call.dialed)endCall()});   /* вернулись после звонка tel: */
window.addEventListener('pageshow',function(e){if(e.persisted&&G&&G.call&&G.call.dialed)endCall()});
function callCard(){var c=G.call,F=G.foreman;return h('div',{class:'overlay','data-testid':'call'},h('div',{class:'poll callcard'},
  h('h3',{text:'ПОМОЩЬ БРИГАДИРА'}),h('div',{class:'muted',style:'text-align:center',text:F?'Звоним бригадиру '+F.short+'…':'Номер бригадира не задан'}),
  h('div',{class:'sm',style:'margin:8px 0 2px;color:#fff;font-size:13px','data-testid':'call-q',text:G.qs[G.i].q+' '+G.qs[G.i].a.map(function(x,k){return G.removed.indexOf(k)<0?L[k]+': '+x:''}).filter(Boolean).join(' · ')}),h('div',{class:'cd',style:'--p:'+(c.left/CFG.CALL_SECONDS)},h('b',{text:String(c.left)})),
  h('div',{class:'sm',style:'text-align:center;margin-bottom:8px',text:'Игра на паузе. У вас '+CFG.CALL_SECONDS+' секунд — прочитайте вопрос и варианты.'}),
  F?h('a',{class:'callbtn',href:'tel:'+F.tel,'data-testid':'call-btn',onclick:function(){c.dialed=true}},'📞 Позвонить · '+F.name):null,
  F?h('div',{class:'sm',style:'text-align:center;margin:4px 0 10px',text:F.shown}):null,
  h('button',{class:'mini',style:'width:100%;padding:10px','data-testid':'call-done',onclick:endCall},'Я поговорил — выбрать ответ'),
  h('button',{class:'mini g',style:'width:100%;padding:9px;margin-top:8px','data-testid':'call-sim',onclick:simHint},'Нет связи? Подсказка-симуляция'),
  h('div',{class:'sm',style:'text-align:center;margin-top:8px;opacity:.8',text:'Разговор не записывается.'})))}
function audience(){life('aud',function(r){G.aud=true;G.shown=true;stopVoice();poll=r.poll;render();voice('poll','Помощь зала.');later(function(){document.querySelectorAll('.bar i').forEach(function(b,i){b.style.height=poll[i]+'%'})},120)})}
/* ---------- views ---------- */
var ICON_PHONE='<svg viewBox="0 0 24 24"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z"/></svg>';
var ICON_AUD='<svg viewBox="0 0 24 24"><rect x="3" y="12" width="4" height="9"/><rect x="10" y="6" width="4" height="15"/><rect x="17" y="9" width="4" height="12"/></svg>';
function hdr(){return h('div',{class:'hdr'},h('button',{class:'ico','aria-label':'Меню',text:'☰',onclick:function(){if(G&&(G.phase==='q'||G.phase==='lock'))return;G=null;clearT();clearInterval(callT);poll=null;stopVoice();stopMusic();screen='menu';render()}}),
  h('div',{class:'bal','data-testid':'bal'},'⭐ ',h('span',{text:INFO&&INFO.balance!=null?String(INFO.balance):'…'})),
  h('button',{class:'ico','aria-label':muted?'Включить звук':'Выключить звук',text:muted?'🔇':'🔊',onclick:function(){setMuted(!muted)}}))}
function lifes(){if(!G)return null;var dis=G.phase!=='q';return h('div',{class:'lifes'},
  h('button',{class:'life'+(G.fifty?' used':''),'data-testid':'fifty','aria-label':'50 на 50',onclick:fifty,disabled:dis||G.fifty?'':null},'50:50'),
  h('button',{class:'life'+(G.help?' used':''),'data-testid':'help','aria-label':'Помощь бригадира',onclick:help,disabled:dis||G.help?'':null,html:ICON_PHONE}),
  h('button',{class:'life'+(G.aud?' used':''),'data-testid':'aud','aria-label':'Помощь зала',onclick:audience,disabled:dis||G.aud?'':null,html:ICON_AUD}))}
function ladder(){var p=h('aside',{class:'ladpanel'+(ladOpen?' open':''),'data-testid':'ladder'},h('button',{class:'close','aria-label':'Закрыть',text:'×',onclick:function(){ladOpen=false;render()}}),h('div',{class:'ttl',text:'ЛЕСТНИЦА ВЫИГРЫША'}));
  if(G)p.appendChild(lifes());
  for(var i=9;i>=0;i--){var done=G&&(i<G.i||(i===G.i&&G.phase==='ok')),isCur=G&&i===G.i&&G.phase!=='ok';p.appendChild(h('div',{class:'rung'+(SAFE[i]?' safe':'')+(isCur?' cur':'')+(isCur&&G.phase==='ladder'?' climb':'')},h('span',{class:'n',text:String(i+1)}),h('span',{class:'d',text:done?'◆':''}),h('span',{class:'v',text:lr(i)})))}
  p.appendChild(h('div',{class:'sm',style:'margin-top:10px;text-align:center',text:'Белым — несгораемая сумма · 1 верный ответ = 1 ⭐'}));return p}
function decor(){var f=document.createElement('div');f.id='bg';f.setAttribute('aria-hidden','true');f.appendChild(h('div',{class:'studio'}));f.appendChild(h('div',{class:'beams'}));f.appendChild(h('div',{class:'spot l'}));f.appendChild(h('div',{class:'spot r'}));
  for(var i=0;i<10;i++){var s=h('i',{class:'spark'});s.style.left=(i*53%100)+'vw';s.style.top=(i*37%100)+'vh';s.style.animationDelay=(i*.37%3)+'s';f.appendChild(s)}return f}
document.body.insertBefore(decor(),app);document.body.appendChild(h('div',{class:'dim'}));
function emblem(){return h('div',{class:'emb'},h('div',{class:'rays'}),h('div',{class:'ring'},h('div',{class:'disc'},h('small',{text:'КТО ХОЧЕТ СТАТЬ'}),h('b',{html:'ЗВЕЗДОЙ<br>СКЛАДА'}),h('i',{text:'⭐'}))))}
function viewGame(){var q=G.qs[G.i],ph=G.phase,stage=h('div',{class:'stage'}),main=h('div',null);
  main.appendChild(h('div',{class:'hdr',style:'margin:6px 0'},h('div',{class:'sm',text:'Вопрос '+(G.i+1)+' из 10 · '+lr(G.i)+(SAFE[G.i]?' · несгораемая':'')}),h('button',{class:'ladtoggle','data-testid':'lad-toggle',onclick:function(){ladOpen=!ladOpen;render()}},'≡ Лестница')));
  main.appendChild(lifes());main.appendChild(h('div',{class:'host'},h('i',{class:'mic'}),'Ведущий говорит…'));
  var body=h('div',{class:'qbody'+(ph==='dim'||ph==='ladder'?' hid':'')});main.appendChild(body);main=body;{
    main.appendChild(h('div',{class:'q line'+(G.enter?' reveal':'')},h('div',{class:'lz'},h('div',{class:'in '+lenCls(q.q,90,130,175),text:q.q}))));
    var g=h('div',{class:'grid'+(innerWidth<520&&Math.max.apply(null,q.a.map(function(x){return x.length}))>40?' one':'')});   /* длинные варианты на узком экране — в одну колонку */q.a.forEach(function(a,k){var c='ans'+(G.enter?' enter':'')+' '+lenCls(a,28,46,64);
      if(G.removed.indexOf(k)>=0)c+=' gone';
      if(ph==='lock'&&G.sel===k)c+=' sel pulse';
      if(ph==='ok'&&k===q.correct)c+=' ok';
      if(ph==='bad'){if(k===G.sel)c+=' wrong';if(k===q.correct)c+=' ok'}
      var b=lz([h('span',{class:'k',text:L[k]+':'}),h('span',{class:'t',text:a})],null,{'data-k':k,'data-testid':'ans-'+k,disabled:ph!=='q'?'':null,style:'--i:'+k,onclick:function(){choose(k)}});b.className='lzb '+c;g.appendChild(b)});
    main.appendChild(h('div',{class:'line',style:'margin:0 4px'},g));
    if(ph==='ok'||ph==='bad')main.appendChild(h('div',{class:'acts'},lz(ph==='ok'?(G.i===9?'🏆 Забрать главный приз':'Следующий вопрос'):'Итоги игры','gold',{'data-testid':'next',onclick:next})));
    else main.appendChild(h('div',{class:'acts'},lz('Забрать '+(G.i?lr(G.i-1):'⭐ 0')+' и уйти','gold',{'data-testid':'take',disabled:G.i===0||ph!=='q'?'':null,style:G.i===0?'opacity:.45':'',onclick:takeStars})));   /* одна и та же ячейка кнопки — без скачков */
    if(G.helpTxt)main.appendChild(h('div',{class:'bubble','data-testid':'help-bubble'},h('b',{text:'Бригадир'}),G.helpTxt));
    if(ph==='ok'||ph==='bad')main.appendChild(h('div',{class:'expl','data-testid':'expl'},h('div',{html:ph==='ok'?'✅ <b>Верно!</b> ':'❌ <b>Неверно.</b> Правильный ответ: <b>'+L[q.correct]+'</b>. '}),q.explain,h('div',null,h('span',{class:'src',text:q.sourceLabel}))));
  }
  stage.appendChild(main.parentNode===null?main:main.parentNode);stage.appendChild(ladder());
  if(G.call)stage.appendChild(callCard());
  if(poll)stage.appendChild(h('div',{class:'overlay','data-testid':'poll',onclick:function(){poll=null;render()}},h('div',{class:'poll'},h('h3',{text:'ПОМОЩЬ ЗАЛА'}),
    h('div',{class:'bars'},poll.map(function(v,i){return h('div',{class:'bar'},h('span',{text:v+'%'}),h('i',{style:document.querySelector('.bar')?'height:'+v+'%':''}))})),
    h('div',{class:'lbls'},L.split('').map(function(x){return h('span',{text:x})})),h('div',{class:'sm',style:'text-align:center;margin-top:8px',text:'Нажмите, чтобы закрыть'}))));
  return stage}
function viewMenu(){var I=INFO,played=I&&I.playedToday;
  return h('div',{class:'menu'},emblem(),
    h('div',{class:'sub','data-testid':'menu-sub',text:!I?'Загружаем…':I.error?errText(I.error):'Баланс: ⭐ '+I.balance+(I.myPlace?' · место в рейтинге: '+I.myPlace:'')}),
    lz(played?'Сегодня вы уже сыграли':(I&&I.active?'Продолжить игру':'Играть'),null,{'data-testid':'play',disabled:!I||I.error||played?'':null,style:played?'opacity:.55':'',onclick:function(){if(!I||played)return;audioOn=true;unlock();stopWelcome();
      if(I.active){newGame();return}screen='intro';pushNav();render();startTopic()}}),
    lz('Мои звёзды / Обмен',null,{'data-testid':'m-ex',onclick:function(){audioOn=true;go('ex')}}),
    lz('Рейтинг',null,{'data-testid':'m-rate',onclick:function(){go('rate')}}),
    lz('Правила',null,{'data-testid':'m-rules',onclick:function(){go('rules')}}),
    played?h('div',{class:'sm',text:'Следующая игра — завтра. Звёзды можно обменять уже сейчас.'}):null,
    welcomed?null:h('div',{class:'sm hint',text:'🔊 Коснитесь экрана — включится звук'}),
    h('a',{href:'../#/home',class:'sm',style:'color:#8f9ac0;margin-top:6px','data-testid':'to-app',text:'← В приложение «Мои выплаты»'}))}
function startTopic(){preload(['intro','s_lock','m_suspense']);if(Date.now()-welcomeAt>12000)snd('s_intro',.55);
  voice('intro','Добро пожаловать в игру «Звезда склада»!').then(function(){if(screen==='intro')newGame()});later(function(){if(screen==='intro')newGame()},FAST?300:40000)}
function viewEnd(){var r=G.res,t={win:'🏆 Главный приз!',take:'Вы забрали звёзды',lost:'Игра окончена'}[r.how];
  return h('div',{class:'menu',style:'justify-content:flex-start'},emblem(),h('div',{class:'panel','data-testid':'result'},h('h2',{text:t}),
    r.penalty?h('div',{class:'big minus',style:'background:linear-gradient(180deg,#ffb3b3,#ff3b3b);-webkit-background-clip:text;background-clip:text;font-size:40px','data-testid':'penalty',text:'−'+r.penalty+' ⭐'}):null,
    h('div',{class:'big',text:'+'+r.earned+' ⭐'}),h('div',{class:'muted',style:'text-align:center',text:starsTxt(r.earned)+' за игру'}),
    h('div',{class:'muted',style:'text-align:center',text:(r.penalty?'Штраф за ошибку: −'+starsTxt(r.penalty)+' (только звёзды, не деньги). ':'')+'Верных ответов: '+r.answered+' из 10'}),
    h('div',{class:'stat',style:'margin-top:8px'},h('span',{text:'Баланс'}),h('b',{text:'⭐ '+r.balance}))),
    lz('Мои звёзды / Обмен','gold',{'data-testid':'to-exchange',onclick:function(){G=null;go('ex')}}),
    lz('В главное меню',null,{onclick:function(){G=null;screen='menu';render()}}))}
function backBtn(){return h('div',{class:'back'},lz('← В меню',null,{onclick:function(){if(history.state&&history.state.qd)history.back();else{screen='menu';render()}}}))}
function viewEx(){var I=INFO||{},bal=I.balance||0,left=I.capLeft!=null?I.capLeft:CAP,maxS=Math.max(0,Math.min(bal,Math.floor(left/RUB),500)),val=maxS;
  var inp=h('input',{class:'inp',type:'number',inputmode:'numeric',min:1,max:maxS,value:val,'data-testid':'ex-n',oninput:function(){var n=+inp.value||0;out.textContent='= '+rub(n*RUB);btn.firstChild.style.opacity=(n>=1&&n<=maxS)?1:.45}});
  var out=h('div',{class:'big',style:'font-size:32px;margin:6px 0',text:'= '+rub(val*RUB)});
  var btn=lz('Отправить заявку админу','gold',{'data-testid':'ex-send',onclick:function(){var n=+inp.value;if(!(n>=1&&n<=maxS)||busy)return;busy=true;
    api('starsExchange',{n:n,rid:'x'+Date.now()+Math.random().toString(36).slice(2,8)}).then(function(r){busy=false;if(!r.ok){toast(errText(r.error));return}snd('s_coin');toast('Заявка отправлена админу');loadInfo()})}});
  var list=h('div',{class:'list'});(I.requests||[]).forEach(function(r){list.appendChild(h('div',{class:'it'},h('div',null,h('b',{text:rub(r.rub)}),h('div',{class:'sm',text:String(r.at||'').slice(0,10).split('-').reverse().join('.')+' · '+starsTxt(r.stars)})),h('span',{class:'chip '+({pending:'p',approved:'y',rejected:'n'})[r.status],text:{pending:'⏳ ждёт одобрения',approved:'✅ одобрено',rejected:'отклонено'+(r.note?': '+r.note:'')}[r.status]})))});
  if(!(I.requests||[]).length)list.appendChild(h('div',{class:'sm',text:'Заявок пока нет.'}));
  return h('div',null,h('div',{class:'panel','data-testid':'ex'},h('h2',{text:'МОИ ЗВЁЗДЫ · ОБМЕН'}),h('div',{class:'stat'},h('span',{text:'Доступно'}),h('b',{text:starsTxt(bal)})),h('div',{class:'stat'},h('span',{text:'Курс обмена'}),h('b',{text:'1 ⭐ = '+RUB+' ₽'})),h('div',{class:'stat'},h('span',{text:'Лимит месяца'}),h('b',{text:'осталось '+rub(left)+' из '+rub(CAP)})),
    maxS>=1?[h('div',{class:'muted',style:'margin:10px 0 6px',text:'Сколько звёзд обменять'}),inp,out,btn]:h('div',{class:'muted',style:'margin:10px 0',text:bal?'Лимит месяца исчерпан.':'Пока нет звёзд для обмена — сыграйте!'}),
    h('div',{class:'prop',text:'После одобрения админом сумма будет выплачена как бонус (отдельно от ведомости). При отклонении звёзды вернутся.'})),
    h('div',{class:'panel'},h('h2',{text:'МОИ ЗАЯВКИ'}),list),backBtn())}
function viewRate(){var I=INFO||{},rl=h('div',{class:'list'});(I.rating||[]).forEach(function(r){rl.appendChild(h('div',{class:'it'+(r.me?' me':'')},h('div',null,h('b',{text:(['🥇','🥈','🥉'][r.place-1]||(r.place+'.'))+' '+r.name+(r.me?' (вы)':'')}),h('div',{class:'sm',text:'игр: '+r.games})),h('b',{style:'color:var(--gold2)',text:'⭐ '+r.stars})))});
  if(!(I.rating||[]).length)rl.appendChild(h('div',{class:'sm',text:'В этом месяце ещё никто не играл — будьте первым!'}));
  return h('div',null,h('div',{class:'panel','data-testid':'rate'},h('h2',{text:'РЕЙТИНГ МЕСЯЦА'}),h('div',{class:'sm',style:'text-align:center;margin-bottom:6px',text:'Звёзды, заработанные в играх за '+(I.month||'месяц')+(I.myPlace&&I.myPlace>10?' · ваше место: '+I.myPlace:'')}),rl),backBtn())}
function viewRules(){var li=function(t){return h('li',{style:'margin:6px 0',html:t})};
  return h('div',null,h('div',{class:'panel','data-testid':'rules'},h('h2',{text:'ПРАВИЛА'}),h('ul',{style:'padding-left:18px;font-size:14px'},
    li('Вопросы о складе и о наших приложениях: ступени 1–3 — лёгкие, 4–6 — средние, 7–10 — сложные. Недавние вопросы не повторяются ~30 дней. <b>Одна игра в день.</b>'),
    li('10 вопросов, <b>1 верный ответ = 1 ⭐</b>. <b>Несгораемая сумма — ⭐ 6</b>.'),
    li('Подсказки по одному разу: <b>50:50</b>, <b>Помощь бригадира</b> (звонок, 30 секунд), <b>Помощь зала</b>.'),
    li('Можно в любой момент забрать выигранное и уйти.'),
    li('<b>Ошибка:</b> игра заканчивается; если дошли до несгораемой суммы — ⭐ 6 ваши, иначе 0. С баланса списывается <b>1 звезда</b> (не ниже 0). Штраф — только звёздами, из выплат деньги за игру не удерживаются.'),
    li('Если игра прервалась (закрыли приложение), начисляется уже отвеченное.'),
    li('Обмен: 1 ⭐ = '+RUB+' ₽, до '+rub(CAP)+' в месяц; после одобрения админом — бонус к выплате.'))),backBtn())}
function viewLogin(){return h('div',{class:'menu'},emblem(),h('div',{class:'panel','data-testid':'login'},h('h2',{text:'НУЖЕН ВХОД'}),
  h('div',{class:'muted',style:'text-align:center',text:loginNeeded==='closed'?'Приложение сейчас закрыто (работает днём). Зайдите позже.':loginNeeded==='blocked'?'Доступ закрыт. Обратитесь к администратору.':'Игра доступна только сотрудникам. Войдите в приложение «Мои выплаты» по номеру телефона и коду, затем откройте вкладку «Звёзды».'})),
  lz('Открыть «Мои выплаты»','gold',{onclick:function(){location.href='../#/home'}}))}
var ladShown=false;
function go(sc){screen=sc;pushNav();render()}
function pushNav(){try{if(!(history.state&&history.state.qd))history.pushState({qd:1},'')}catch(e){}}
window.addEventListener('popstate',function(){   /* кнопка «Назад»: во время вопроса не выходим (иначе можно уйти от штрафа) */
  if(screen==='game'&&G&&(G.phase==='q'||G.phase==='lock'||G.phase==='dim'||G.phase==='ladder')){pushNav();toast('Чтобы выйти, нажмите «Забрать и уйти»');return}
  if(G&&G.call)endCall();if(G&&G.phase!=='end'&&G.phase!=='ok'&&G.phase!=='bad'){pushNav();return}G=null;clearT();clearInterval(callT);poll=null;stopVoice();stopMusic();screen='menu';render()});
function toast(t){var e=h('div',{class:'toast',text:t});document.body.appendChild(e);setTimeout(function(){e.remove()},2200)}
var welcomed=false,welcomeAt=0;function welcome(){if(welcomed||screen!=='menu')return;welcomed=true;welcomeAt=Date.now();audioOn=true;unlock();snd('s_intro',.6);var e=$('.hint');if(e)e.style.visibility='hidden'}
function stopWelcome(){welcomed=true}
document.addEventListener('pointerdown',function(e){if(screen==='menu'&&!e.target.closest('button,a'))welcome()},{passive:true});
function render(){var y=window.scrollY;app.textContent='';app.appendChild(hdr());
  app.appendChild(screen==='login'?viewLogin():screen==='game'&&G?viewGame():screen==='end'&&G?viewEnd():screen==='intro'?h('div',{class:'menu'},emblem(),h('div',{class:'sub',text:'Ведущий представляет игру…'})):screen==='ex'?viewEx():screen==='rate'?viewRate():screen==='rules'?viewRules():viewMenu());
  var lp=app.querySelector('.ladpanel');if(lp&&ladOpen!==ladShown){lp.classList.toggle('open',ladShown);void lp.offsetWidth;lp.classList.toggle('open',ladOpen)}ladShown=ladOpen;
  if(screen==='game'){fit();window.scrollTo(0,y)}}
function fit(){if(P.has('nofit'))return;var els=app.querySelectorAll('.q .in,.ans .t'),key=G&&G.qs[G.i].id+'|'+(app.querySelector('.grid.one')?1:0)+'|'+innerWidth;
  if(G&&G.fitKey===key){els.forEach(function(e,i){if(G.fit[i])e.style.fontSize=G.fit[i]});return}   /* уже подобрано для этого вопроса — без замеров */
  if(!app.querySelector('.qbody:not(.hid)'))return;
  var arr=[].slice.call(els),out=arr.map(function(){return ''});
  for(var pass=0;pass<3;pass++){   /* пакетно: сначала все замеры, потом все записи — 2–3 раскладки вместо десятков */
    var m=arr.map(function(e){var box=e.classList.contains('t')?e.parentNode:e;return Math.max(e.scrollHeight/Math.max(1,e.clientHeight),box.scrollHeight/Math.max(1,box.clientHeight))});
    var any=false;arr.forEach(function(e,i){if(m[i]>1.02){var fs=parseFloat(out[i])||parseFloat(getComputedStyle(e).fontSize);fs=Math.max(9.5,Math.floor(fs*(pass?0.94:Math.max(.6,1/Math.sqrt(m[i])))*2)/2);out[i]=fs+'px';any=true}});
    if(!any)break;arr.forEach(function(e,i){if(out[i])e.style.fontSize=out[i]})}
  if(G&&app.querySelector('.qbody:not(.hid)')){G.fitKey=key;G.fit=out}}   /* длинный текст: уменьшаем шрифт, а не растим плашку */
function lenCls(t,a,b,c){var n=t.length;return n>c?'l3':n>b?'l2':n>a?'l1':''}
window.QD={get screen(){return screen},get G(){return G},get info(){return INFO},newGame:newGame,choose:choose,next:next,fifty:fifty,help:help,audience:audience,take:takeStars,set audio(v){audioOn=v}};
var h0=location.hash.replace('#','');if(h0==='ex'||h0==='rate'||h0==='rules')screen=h0;
if(!API||!session()){loginNeeded='auth';screen='login';render()}
else{render();fetch(AUDIO+'manifest.json').then(function(r){return r.json()}).then(function(m){MAN=m}).catch(function(){MAN={}});loadInfo()}
})();
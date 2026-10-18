(function(){
'use strict';
/* КОНФИГ (предложения на согласование) */
var CFG={RUB_PER_STAR:10, LADDER_RUB:[50,100,200,300,500,1000,1500,2000,3000,5000], SAFE_STEPS:[5], PENALTY_FACTOR:1, MONTH_CAP_RUB:5000, CALL_SECONDS:30,
  /* ПРОТОТИП: телефон бригадира задан здесь (страница noindex). В рабочей версии номер придёт с сервера (FOREMAN_PHONES) только вошедшему сотруднику. */
  FOREMAN:{name:'Егор Ильченко', short:'Егору', tel:'+79774073549', shown:'+7 977 407-35-49'}};
/* PENALTY_FACTOR: при ошибке с баланса списывается PENALTY_FACTOR × стоимость текущей ступени (в звёздах); баланс не ниже 0 */
var RUB=CFG.RUB_PER_STAR, CAP=CFG.MONTH_CAP_RUB, LADDER=CFG.LADDER_RUB.map(function(r){return r/RUB}), SAFE={}, L='ABCD';CFG.SAFE_STEPS.forEach(function(i){SAFE[i]=true});
function lr(i){return rub(LADDER[i]*RUB)}
var TOPICS_UNUSED={wh:{t:'Склад',f:function(q){return q.source!=='apps'}},apps:{t:'Наши приложения',f:function(q){return q.source==='apps'}},mix:{t:'Всё вперемешку',f:function(){return true}}};
var LS='quizDemo.v2', st=load(), Q=[], G=null, muted=false, audioOn=false, cur=null, music=null, timers=[], screen='menu', ladOpen=false, poll=null;
var $=function(s){return document.querySelector(s)}, app=$('#app'), fx=$('#fx');
var P=new URLSearchParams(location.search), FAST=P.has('fast');
function load(){try{return JSON.parse(localStorage.getItem(LS))||null}catch(e){return null}}
function save(){localStorage.setItem(LS,JSON.stringify(st))}
if(!st) st={stars:12,streak:2,best:20,lastPlay:null,history:[],requests:[{id:1,stars:30,rub:300,at:'15.10.2026',status:'approved'}]};
function h(tag,attrs){var e=document.createElement(tag);attrs=attrs||{};for(var k in attrs){var v=attrs[k];if(k==='class')e.className=v;else if(k==='text')e.textContent=v;else if(k==='html')e.innerHTML=v;else if(k.slice(0,2)==='on')e.addEventListener(k.slice(2),v);else if(v!=null&&v!==false)e.setAttribute(k,v)}var add=function(c){if(c==null)return;if(Array.isArray(c))return c.forEach(add);e.appendChild(typeof c==='string'?document.createTextNode(c):c)};for(var i=2;i<arguments.length;i++)add(arguments[i]);return e}
function later(fn,ms){var t=setTimeout(fn,FAST?Math.min(ms,250):ms);timers.push(t);return t}
function clearT(){timers.forEach(clearTimeout);timers=[]}
function rub(n){return n.toLocaleString('ru-RU')+'\u00a0₽'}
function plural(n,a,b,c){n=Math.abs(n)%100;var n1=n%10;if(n>10&&n<20)return c;if(n1>1&&n1<5)return b;if(n1===1)return a;return c}
function starsTxt(n){return n+' '+plural(n,'звезда','звезды','звёзд')}
function lz(content,cls,attrs){attrs=attrs||{};var b=h('button',Object.assign({class:'lzb'},attrs),h('div',{class:'lz'+(cls?' '+cls:'')},h('div',{class:'in'},content)));return b}
/* ---------- audio ---------- */
window.QLOG=[];function lg(k,f,v){QLOG.push({k:k,f:f,v:v==null?1:v,t:performance.now()})}
function snd(name,vol){if(!audioOn||muted)return Promise.resolve();var a=new Audio('audio/'+name+'.mp3');a.volume=vol==null?1:vol;lg('s',name,a.volume);return a.play().then(function(){return new Promise(function(r){a.onended=r;a.onerror=r})}).catch(function(){})}
function voice(name,fallbackText){
  if(!audioOn||muted)return new Promise(function(r){later(r,900)});
  if(cur){try{cur.pause()}catch(e){}}
  duck(true);var a=new Audio('audio/'+name+'.mp3');cur=a;lg('v',name);host(true);
  return new Promise(function(res){var done=function(){if(cur===a){duck(false);host(false)}res()};a.onended=done;a.onerror=function(){speak(fallbackText).then(done)};a.play().catch(function(){speak(fallbackText).then(done)})});
}
function host(on){var e=$('.host');if(e)e.style.visibility=on?'visible':'hidden'}
function speak(t){return new Promise(function(r){if(!t||!window.speechSynthesis)return r();var u=new SpeechSynthesisUtterance(t);u.lang='ru-RU';u.onend=r;u.onerror=r;speechSynthesis.cancel();speechSynthesis.speak(u)})}
function stopVoice(){lg('vstop');if(cur){try{cur.pause()}catch(e){}}cur=null;if(window.speechSynthesis)speechSynthesis.cancel();host(false)}
function startMusic(){if(!audioOn||muted)return;if(!music){music=new Audio('audio/m_suspense.mp3');music.loop=true}music.volume=.35;lg('m');music.play().catch(function(){})}
function stopMusic(){lg('mstop');if(music)music.pause()}
function duck(on){if(music)music.volume=on?.12:.35}
function setMuted(m){muted=m;if(m){stopMusic();stopVoice()}else if(G&&G.phase==='q')startMusic();render()}
/* ---------- fx ---------- */
function confetti(n){var cols=['#f4c430','#ff9a1a','#1fae4b','#8f75ff','#fff','#4a6cff'];for(var i=0;i<(n||120);i++){var c=h('i',{class:'conf'});c.style.left=Math.random()*100+'vw';c.style.background=cols[i%cols.length];c.style.animationDuration=(2+Math.random()*2.5)+'s';c.style.animationDelay=Math.random()*.8+'s';fx.appendChild(c);(function(c){setTimeout(function(){c.remove()},5500)})(c)}}
function flyStars(n,from,minus){var b=$('.bal');if(!b)return;var r=b.getBoundingClientRect(),f=from?from.getBoundingClientRect():{left:innerWidth/2,top:innerHeight/2,width:0,height:0};for(var i=0;i<Math.min(n,12);i++){var s=h('span',{class:'flystar',text:minus?'💥':'⭐'});var x=minus?r.left+r.width/2:f.left+f.width/2+(Math.random()*60-30),y=minus?r.top+r.height/2:f.top+f.height/2;var tx=minus?f.left+f.width/2+(Math.random()*80-40):r.left+r.width/2,ty=minus?f.top+f.height/2:r.top+r.height/2;s.style.left=x+'px';s.style.top=y+'px';s.style.setProperty('--dx',(tx-x)+'px');s.style.setProperty('--dy',(ty-y)+'px');s.style.animationDelay=(i*.07)+'s';fx.appendChild(s);(function(s){setTimeout(function(){s.remove()},1800)})(s)}setTimeout(function(){b.classList.add('bump');snd('s_coin',.6);setTimeout(function(){b.classList.remove('bump')},700)},900)}
function dim(ms){var d=$('.dim');if(!d)return;d.classList.add('on');setTimeout(function(){d.classList.remove('on')},FAST?150:ms||900)}
/* ---------- game ---------- */
function pick(topic){var pool=Q.slice(),by={1:[],2:[],3:[]};pool.forEach(function(q){by[q.level].push(q)});[1,2,3].forEach(function(l){by[l].sort(function(){return Math.random()-.5})});
  var want=[1,1,1,2,2,2,2,3,3,3],out=[];want.forEach(function(l){var c=by[l].shift()||by[2].shift()||by[1].shift()||by[3].shift();if(c)out.push(c)});return out}
function newGame(topic){clearT();ladOpen=false;G={topic:topic||'mix',qs:pick(topic||'mix'),i:0,phase:'q',fifty:false,help:false,aud:false,removed:[],sel:null,helpTxt:null,res:null,startBal:st.stars};screen='game';askQ(true)}
function safeStars(i){var s=0;for(var k=0;k<i;k++)if(SAFE[k])s=LADDER[k];return s}
function askQ(first){var q=G.qs[G.i];G.phase='dim';G.sel=null;G.removed=[];G.helpTxt=null;G.shown=false;poll=null;render();dim(1100);snd('s_lock',.35);
  later(function(){G.phase='q';render();startMusic();
    later(function(){document.querySelectorAll('.ans').forEach(function(a,i){setTimeout(function(){a.classList.add('in')},FAST?0:i*380)});later(function(){G.shown=true},1700)},FAST?50:700);
    voice('q'+q.id,q.q+'. '+q.a.map(function(a,j){return L[j]+': '+a}).join('. '))},1000)}
function choose(j){if(!G||G.phase!=='q'||G.removed.indexOf(j)>=0)return;var q=G.qs[G.i];G.sel=j;G.phase='lock';stopVoice();render();
  snd('s_lock',.8);voice(Math.random()<.5?'lock1':'lock2','Это ваш окончательный ответ? Принято.');
  later(function(){reveal(j===q.correct)},3800)}   /* драматическая пауза */
function reveal(ok){var q=G.qs[G.i];G.phase=ok?'ok':'bad';stopMusic();render();
  if(ok){snd('s_correct',.9);later(function(){voice(['ok1','ok2','ok3'][G.i%3],'Верно!').then(function(){if(SAFE[G.i]&&G.i<9)return voice('safe','Несгораемая сумма!')})},400);if(SAFE[G.i])later(function(){confetti(70)},500)}
  else{var b=$('.q');if(b)b.classList.add('shake');snd('s_wrong',.9);later(function(){voice('bad','Неверный ответ.')},700)}
  later(function(){voice('e'+q.id,q.explain)},ok?2700:2900)}
function next(){stopVoice();if(G.phase==='ok'){if(G.i===9)return finish('win');G.i++;ladOpen=true;G.phase='ladder';render();snd('s_coin',.5);voice('ladder','Лестница');later(function(){if(G&&G.phase==='ladder'){ladOpen=false;askQ()}},FAST?300:3200)}else finish('lost')}
function takeStars(){if(!G||G.phase!=='q'||G.i===0)return;stopVoice();finish('take')}
function finish(how){clearT();stopMusic();ladOpen=false;var safe=safeStars(G.i),step=LADDER[G.i];
  var earned=how==='win'?LADDER[9]:how==='take'?LADDER[G.i-1]:safe, penalty=0;
  if(how==='lost'){penalty=Math.min(Math.round(step*CFG.PENALTY_FACTOR),st.stars);st.stars-=penalty}   /* штраф: минус ступень текущего вопроса, баланс не ниже 0; только звёзды, не деньги */
  st.stars+=earned;G.phase='end';G.res={how:how,earned:earned,penalty:penalty,answered:G.i+(how==='win'?1:0)};
  st.streak=earned>0?st.streak+1:0;st.best=Math.max(st.best,earned);st.lastPlay=new Date().toISOString().slice(0,10);st.history.unshift({at:new Date().toLocaleDateString('ru-RU'),earned:earned,penalty:penalty});save();screen='end';render();
  if(how==='win'){snd('s_win');confetti(180);voice('win','Поздравляю!')}else if(how==='take')voice('take','Мудрое решение.');else if(penalty)voice('penalty','За ошибку часть звёзд сгорает.');
  if(penalty)later(function(){flyStars(penalty,$('.minus'),true)},700);
  if(earned)later(function(){flyStars(earned,$('.big'))},penalty?2000:600)}
function fifty(){if(!G||G.phase!=='q'||G.fifty)return;var q=G.qs[G.i];G.fifty=true;G.shown=true;var w=[0,1,2,3].filter(function(k){return k!==q.correct}).sort(function(){return Math.random()-.5}).slice(0,2);G.removed=w;
  stopVoice();snd('s_fifty');voice('fifty','Уберите два неверных ответа.');render();w.forEach(function(k){var b=document.querySelector('.ans[data-k="'+k+'"]');if(b)b.classList.add('anim')})}
var callT=null;
function help(){if(!G||G.phase!=='q'||G.help)return;G.help=true;G.shown=true;stopVoice();stopMusic();snd('s_ring',.7);voice('help','Звоним бригадиру.');
  G.call={left:CFG.CALL_SECONDS,dialed:false};render();callT=setInterval(function(){if(!G||!G.call)return clearInterval(callT);G.call.left--;var e=$('.cd b');if(e)e.textContent=G.call.left;var r=$('.cd');if(r)r.style.setProperty('--p',G.call.left/CFG.CALL_SECONDS);if(G.call.left<=5&&G.call.left>0)snd('s_coin',.3);if(G.call.left<=0)endCall()},1000)}
function endCall(){clearInterval(callT);if(!G||!G.call)return;G.call=null;render();startMusic()}
function simHint(){var q=G.qs[G.i],conf={1:.95,2:.8,3:.65}[q.level],alt=[0,1,2,3].filter(function(k){return k!==q.correct&&G.removed.indexOf(k)<0}),pk=Math.random()<conf||!alt.length?q.correct:alt[0];
  G.helpTxt='(симуляция, демо) '+(conf>.9?'Тут без вариантов — ':conf>.7?'Почти уверен: ':'Не на сто процентов, но я бы сказал ')+'«'+L[pk]+': '+q.a[pk]+'».';endCall()}
document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible'&&G&&G.call&&G.call.dialed)endCall()});
function callCard(){var c=G.call,F=CFG.FOREMAN;return h('div',{class:'overlay','data-testid':'call'},h('div',{class:'poll callcard'},
  h('h3',{text:'ПОМОЩЬ БРИГАДИРА'}),h('div',{class:'muted',style:'text-align:center',text:'Звоним бригадиру '+F.short+'…'}),
  h('div',{class:'sm',style:'margin:8px 0 2px;color:#fff;font-size:13px','data-testid':'call-q',text:G.qs[G.i].q+' '+G.qs[G.i].a.map(function(x,k){return G.removed.indexOf(k)<0?L[k]+': '+x:''}).filter(Boolean).join(' · ')}),h('div',{class:'cd',style:'--p:'+(c.left/CFG.CALL_SECONDS)},h('b',{text:String(c.left)})),
  h('div',{class:'sm',style:'text-align:center;margin-bottom:8px',text:'Игра на паузе. У вас '+CFG.CALL_SECONDS+' секунд — прочитайте вопрос и варианты.'}),
  h('a',{class:'callbtn',href:'tel:'+F.tel,'data-testid':'call-btn',onclick:function(){c.dialed=true}},'📞 Позвонить · '+F.name),
  h('div',{class:'sm',style:'text-align:center;margin:4px 0 10px',text:F.shown}),
  h('button',{class:'mini',style:'width:100%;padding:10px','data-testid':'call-done',onclick:endCall},'Я поговорил — выбрать ответ'),
  h('button',{class:'mini g',style:'width:100%;padding:9px;margin-top:8px','data-testid':'call-sim',onclick:simHint},'Нет телефона? Подсказка-симуляция (демо)'),
  h('div',{class:'sm',style:'text-align:center;margin-top:8px;opacity:.8',text:'Разговор не записывается.'})))}
function audience(){if(!G||G.phase!=='q'||G.aud)return;var q=G.qs[G.i];G.aud=true;G.shown=true;stopVoice();
  var live=[0,1,2,3].filter(function(k){return G.removed.indexOf(k)<0}),wc={1:62,2:48,3:36}[q.level]+Math.random()*12,v=[0,0,0,0],rest=100-wc;
  live.forEach(function(k){if(k!==q.correct){var x=Math.random();v[k]=x}});var sum=v.reduce(function(a,b){return a+b},0)||1;live.forEach(function(k){if(k!==q.correct)v[k]=Math.round(v[k]/sum*rest)});v[q.correct]=100-v.reduce(function(a,b,i){return i===q.correct?a:a+b},0);
  poll=v;render();voice('poll','Помощь зала.');later(function(){document.querySelectorAll('.bar i').forEach(function(b,i){b.style.height=v[i]+'%'})},120)}
/* ---------- views ---------- */
var ICON_PHONE='<svg viewBox="0 0 24 24"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z"/></svg>';
var ICON_AUD='<svg viewBox="0 0 24 24"><rect x="3" y="12" width="4" height="9"/><rect x="10" y="6" width="4" height="15"/><rect x="17" y="9" width="4" height="12"/></svg>';
function hdr(){return h('div',{class:'hdr'},h('button',{class:'ico','aria-label':'Меню',text:'☰',onclick:function(){if(G&&(G.phase==='q'||G.phase==='lock'))return;G=null;clearT();stopVoice();stopMusic();screen='menu';render()}}),
  h('div',{class:'bal','data-testid':'bal'},'⭐ ',h('span',{text:String(st.stars)})),
  h('button',{class:'ico','aria-label':muted?'Включить звук':'Выключить звук',text:muted?'🔇':'🔊',onclick:function(){setMuted(!muted)}}))}
function lifes(){if(!G)return null;var dis=G.phase!=='q';return h('div',{class:'lifes'},
  h('button',{class:'life'+(G.fifty?' used':''),'data-testid':'fifty','aria-label':'50 на 50',onclick:fifty,disabled:dis||G.fifty?'':null},'50:50'),
  h('button',{class:'life'+(G.help?' used':''),'data-testid':'help','aria-label':'Помощь бригадира',onclick:help,disabled:dis||G.help?'':null,html:ICON_PHONE}),
  h('button',{class:'life'+(G.aud?' used':''),'data-testid':'aud','aria-label':'Помощь зала',onclick:audience,disabled:dis||G.aud?'':null,html:ICON_AUD}))}
function ladder(){var p=h('aside',{class:'ladpanel'+(ladOpen?' open':''),'data-testid':'ladder'},h('button',{class:'close','aria-label':'Закрыть',text:'×',onclick:function(){ladOpen=false;render()}}),h('div',{class:'ttl',text:'ЛЕСТНИЦА ВЫИГРЫША'}));
  if(G)p.appendChild(lifes());
  for(var i=9;i>=0;i--){var done=G&&(i<G.i||(i===G.i&&G.phase==='ok')),isCur=G&&i===G.i&&G.phase!=='ok';p.appendChild(h('div',{class:'rung'+(SAFE[i]?' safe':'')+(isCur?' cur':'')+(isCur&&G.phase==='ladder'?' climb':'')},h('span',{class:'n',text:String(i+1)}),h('span',{class:'d',text:done?'◆':''}),h('span',{class:'v',text:lr(i)})))}
  p.appendChild(h('div',{class:'sm',style:'margin-top:10px;text-align:center',text:'Белым — несгораемая сумма · 1 ⭐ = '+RUB+' ₽'}));return p}
function decor(){var f=document.createDocumentFragment();f.appendChild(h('div',{class:'studio'}));f.appendChild(h('div',{class:'beams'}));f.appendChild(h('div',{class:'spot l'}));f.appendChild(h('div',{class:'spot r'}));
  for(var i=0;i<18;i++){var s=h('i',{class:'spark'});s.style.left=(i*53%100)+'vw';s.style.top=(i*37%100)+'vh';s.style.animationDelay=(i*.37%3)+'s';f.appendChild(s)}f.appendChild(h('div',{class:'dim'}));return f}
function emblem(){return h('div',{class:'emb'},h('div',{class:'rays'}),h('div',{class:'ring'},h('div',{class:'disc'},h('small',{text:'КТО ХОЧЕТ СТАТЬ'}),h('b',{html:'ЗВЕЗДОЙ<br>СКЛАДА'}),h('i',{text:'⭐'}))))}
function viewMenu(){var played=st.lastPlay===new Date().toISOString().slice(0,10)&&!P.has('again');
  return h('div',{class:'menu'},emblem(),
    h('div',{class:'sub',text:'Баланс: '+starsTxt(st.stars)+' ≈ '+rub(st.stars*RUB)+' · серия 🔥 '+st.streak}),
    lz('Играть',null,{'data-testid':'play',onclick:function(){audioOn=true;snd('s_intro',.8);screen='intro';render();startTopic('mix')}}),
    lz('Мои звёзды / Обмен',null,{'data-testid':'m-ex',onclick:function(){audioOn=true;screen='ex';render()}}),
    lz('Рейтинг',null,{'data-testid':'m-rate',onclick:function(){screen='rate';render()}}),
    lz('Правила',null,{'data-testid':'m-rules',onclick:function(){screen='rules';render()}}),
    h('a',{href:'#',class:'sm',style:'color:#8f9ac0;margin-top:6px','data-testid':'m-admin',onclick:function(e){e.preventDefault();screen='admin';render()},text:'Кабинет админа (макет)'}),
    played?h('div',{class:'sm',text:'Сегодня уже сыграно (в прототипе можно ещё раз).'}):null)}
function startTopic(t){voice('intro','Добро пожаловать!').then(function(){if(screen==='intro')newGame(t)});later(function(){if(screen==='intro')newGame(t)},FAST?300:10000)}
function viewGame(){var q=G.qs[G.i],ph=G.phase,stage=h('div',{class:'stage'}),main=h('div',null);
  main.appendChild(h('div',{class:'hdr',style:'margin:6px 0'},h('div',{class:'sm',text:'Вопрос '+(G.i+1)+' из 10 · '+lr(G.i)+(SAFE[G.i]?' · несгораемая':'')}),h('button',{class:'ladtoggle','data-testid':'lad-toggle',onclick:function(){ladOpen=!ladOpen;render()}},'≡ Лестница')));
  main.appendChild(lifes());main.appendChild(h('div',{class:'host'},h('i',{class:'mic'}),'Ведущий говорит…'));
  if(ph!=='dim'){
    main.appendChild(h('div',{class:'q line'+(ph==='q'&&!G.shown?' reveal':'')},h('div',{class:'lz'},h('div',{class:'in',text:q.q}))));
    var g=h('div',{class:'grid'});q.a.forEach(function(a,k){var c='ans'+(ph!=='q'||G.shown?' in':'');
      if(G.removed.indexOf(k)>=0)c+=' gone';
      if(ph==='lock'&&G.sel===k)c+=' sel pulse';
      if(ph==='ok'&&k===q.correct)c+=' ok';
      if(ph==='bad'){if(k===G.sel)c+=' wrong';if(k===q.correct)c+=' ok'}
      var b=lz([h('span',{class:'k',text:L[k]+':'}),h('span',{text:a})],null,{'data-k':k,'data-testid':'ans-'+k,disabled:ph!=='q'?'':null,onclick:function(){choose(k)}});b.className='lzb ans '+c.replace(/^ans ?/,'');b.classList.add('ans');g.appendChild(b)});
    main.appendChild(h('div',{class:'line',style:'margin:0 4px'},g));
    if(G.helpTxt)main.appendChild(h('div',{class:'bubble','data-testid':'help-bubble'},h('b',{text:'Бригадир'}),G.helpTxt));
    if(ph==='q'||ph==='lock')main.appendChild(h('div',{class:'acts'},lz('Забрать '+(G.i?lr(G.i-1):'0 ₽')+' и уйти','gold',{'data-testid':'take',disabled:G.i===0||ph!=='q'?'':null,style:G.i===0?'opacity:.45':'',onclick:takeStars})));
    if(ph==='ok'||ph==='bad'){main.appendChild(h('div',{class:'expl','data-testid':'expl'},h('div',{html:ph==='ok'?'✅ <b>Верно!</b> ':'❌ <b>Неверно.</b> Правильный ответ: <b>'+L[q.correct]+'</b>. '}),q.explain,h('div',null,h('span',{class:'src',text:q.sourceLabel}))));
      main.appendChild(h('div',{class:'acts'},lz(ph==='ok'?(G.i===9?'🏆 Забрать главный приз':'Следующий вопрос'):'Итоги игры','gold',{'data-testid':'next',onclick:next})))}
  }
  stage.appendChild(main);stage.appendChild(ladder());
  if(G.call)stage.appendChild(callCard());
  if(poll)stage.appendChild(h('div',{class:'overlay','data-testid':'poll',onclick:function(){poll=null;render()}},h('div',{class:'poll'},h('h3',{text:'ПОМОЩЬ ЗАЛА'}),
    h('div',{class:'bars'},poll.map(function(v,i){return h('div',{class:'bar'},h('span',{text:v+'%'}),h('i',{style:document.querySelector('.bar')?'height:'+v+'%':''}))})),
    h('div',{class:'lbls'},L.split('').map(function(x){return h('span',{text:x})})),h('div',{class:'sm',style:'text-align:center;margin-top:8px',text:'Нажмите, чтобы закрыть'}))));
  return stage}
function viewEnd(){var r=G.res,t={win:'🏆 Главный приз!',take:'Вы забрали звёзды',lost:'Игра окончена'}[r.how];
  return h('div',{class:'menu',style:'justify-content:flex-start'},emblem(),h('div',{class:'panel','data-testid':'result'},h('h2',{text:t}),
    r.penalty?h('div',{class:'big minus',style:'background:linear-gradient(180deg,#ffb3b3,#ff3b3b);-webkit-background-clip:text;background-clip:text;font-size:40px','data-testid':'penalty',text:'−'+r.penalty+' ⭐ (−'+rub(r.penalty*RUB)+')'}):null,
    h('div',{class:'big',text:'+'+rub(r.earned*RUB)}),h('div',{class:'muted',style:'text-align:center',text:'= '+starsTxt(r.earned)}),
    h('div',{class:'muted',style:'text-align:center',text:(r.penalty?'Штраф за ошибку: −'+starsTxt(r.penalty)+' (только звёзды, не деньги). ':'')+(r.earned?'Несгораемые/выигранные: +'+starsTxt(r.earned)+'. ':'')+'Верных ответов: '+r.answered+' из 10'}),
    h('div',{class:'stat',style:'margin-top:8px'},h('span',{text:'Баланс'}),h('b',{text:starsTxt(st.stars)+' ≈ '+rub(st.stars*RUB)})),
    h('div',{class:'stat'},h('span',{text:'Серия'}),h('b',{text:'🔥 '+st.streak}))),
    lz('Обменять звёзды на рубли','gold',{'data-testid':'to-exchange',onclick:function(){G=null;screen='ex';render()}}),
    lz('В главное меню',null,{onclick:function(){G=null;screen='menu';render()}}))}
function monthRub(){return st.requests.filter(function(r){return r.status!=='rejected'}).reduce(function(s,r){return s+r.rub},0)}
function backBtn(){return h('div',{class:'back'},lz('← В меню',null,{onclick:function(){screen='menu';render()}}))}
function viewEx(){var left=Math.max(0,CAP-monthRub()),maxS=Math.min(st.stars,Math.floor(left/RUB)),val=maxS;
  var inp=h('input',{class:'inp',type:'number',min:1,max:maxS,value:val,'data-testid':'ex-n',oninput:function(){var n=+inp.value||0;out.textContent='= '+rub(n*RUB);btn.firstChild.style.opacity=(n>=1&&n<=maxS)?1:.45}});
  var out=h('div',{class:'big',style:'font-size:32px;margin:6px 0',text:'= '+rub(val*RUB)});
  var btn=lz('Отправить заявку админу','gold',{'data-testid':'ex-send',onclick:function(){var n=+inp.value;if(!(n>=1&&n<=maxS))return;st.stars-=n;st.requests.unshift({id:Date.now(),stars:n,rub:n*RUB,at:new Date().toLocaleDateString('ru-RU'),status:'pending'});save();snd('s_coin');render()}});
  var list=h('div',{class:'list'});st.requests.forEach(function(r){list.appendChild(h('div',{class:'it'},h('div',null,h('b',{text:rub(r.rub)}),h('div',{class:'sm',text:r.at+' · '+starsTxt(r.stars)})),h('span',{class:'chip '+({pending:'p',approved:'y',rejected:'n'})[r.status],text:{pending:'⏳ ждёт одобрения',approved:'✅ одобрено · в выплате',rejected:'отклонено'}[r.status]})))});
  return h('div',null,h('div',{class:'panel'},h('h2',{text:'МОИ ЗВЁЗДЫ · ОБМЕН'}),h('div',{class:'stat'},h('span',{text:'Доступно'}),h('b',{text:starsTxt(st.stars)})),h('div',{class:'stat'},h('span',{text:'Курс (предложение)'}),h('b',{text:'1 ⭐ = '+RUB+' ₽'})),h('div',{class:'stat'},h('span',{text:'Лимит месяца'}),h('b',{text:'осталось '+rub(left)+' из '+rub(CAP)})),
    h('div',{class:'muted',style:'margin:10px 0 6px',text:'Сколько звёзд обменять'}),inp,out,btn,h('div',{class:'prop',text:'После одобрения админом сумма добавится в ближайшую выплату как премия. При отклонении звёзды вернутся.'})),
    h('div',{class:'panel'},h('h2',{text:'МОИ ЗАЯВКИ'}),list),backBtn())}
var RATING=[['Ахметов М.',148,9],['Зотов В.',121,6],['Витров И.',96,4],['Ушаков А.',74,3],['Землянов П.',52,1]];
function viewRate(){var rl=h('div',{class:'list'});RATING.forEach(function(r,i){rl.appendChild(h('div',{class:'it'},h('div',null,h('b',{text:(['🥇','🥈','🥉'][i]||(i+1)+'.')+' '+r[0]}),h('div',{class:'sm',text:'🔥 '+r[2]+' дней подряд'})),h('b',{style:'color:var(--gold2)',text:'⭐ '+r[1]})))});
  return h('div',null,h('div',{class:'panel'},h('h2',{text:'РЕЙТИНГ ЗА ОКТЯБРЬ'}),h('div',{class:'prop',text:'ДЕМО: вымышленные цифры.'}),rl),backBtn())}
function viewRules(){var li=function(t){return h('li',{style:'margin:6px 0',html:t})};
  return h('div',null,h('div',{class:'panel','data-testid':'rules'},h('h2',{text:'ПРАВИЛА'}),h('div',{class:'prop',text:'Все цифры — предложение на согласование.'}),h('ul',{style:'padding-left:18px;font-size:14px'},
    li('Вопросы о складе и о наших приложениях выпадают <b>случайно из общего пула</b>; с каждой ступенью сложнее. 1 игра в день.'),
    li('10 вопросов, лестница: '+CFG.LADDER_RUB.map(function(r,i){return SAFE[i]?'<b>'+r.toLocaleString('ru-RU')+'</b>':r.toLocaleString('ru-RU')}).join(' · ')+' ₽. <b>Несгораемая сумма — '+rub(CFG.LADDER_RUB[CFG.SAFE_STEPS[0]])+'</b>.'),
    li('Выигрыш начисляется звёздами: 1 ⭐ = '+RUB+' ₽.'),
    li('Подсказки по одному разу: <b>50:50</b>, <b>Помощь бригадира</b>, <b>Помощь зала</b>.'),
    li('Можно в любой момент забрать выигранное и уйти.'),
    li('<b>Ошибка:</b> игра заканчивается; если несгораемая сумма достигнута — она ваша, иначе 0. Кроме того, с баланса <b>списывается '+(CFG.PENALTY_FACTOR===1?'':CFG.PENALTY_FACTOR+' × ')+'стоимость текущей ступени</b> (ошибка на вопросе за 300 ₽ — −30 ⭐). Баланс не уходит ниже 0.'),
    li('<b>Штраф — только звёздами.</b> Из выплат деньги за игру никогда не удерживаются.'),
    li('Обмен звёзд: до '+rub(CAP)+' в месяц; после одобрения админом — премия в ближайшую выплату.'))),backBtn())}
function viewAdmin(){var reqs=[['Зотов В.',50,500],['Витров И.',30,300],['Антонов А.',20,200]],ql=h('div',{class:'list'});
  reqs.forEach(function(r){var row=h('div',{class:'it'},h('div',null,h('b',{text:r[0]}),h('div',{class:'sm',text:r[1]+' ⭐ → '+rub(r[2])})),h('div',{style:'display:flex;gap:6px'},h('button',{class:'mini','data-testid':'adm-ok',onclick:function(){row.lastChild.replaceWith(h('span',{class:'chip y',text:'✅ в выплату'}))}},'Одобрить'),h('button',{class:'mini g',onclick:function(){row.lastChild.replaceWith(h('span',{class:'chip n',text:'отклонено'}))}},'✕')));ql.appendChild(row)});
  return h('div',null,h('div',{class:'panel'},h('h2',{text:'КАБИНЕТ АДМИНА · ВИКТОРИНА'}),h('div',{class:'prop',text:'ДЕМО: макет, вымышленные цифры.'}),h('div',{class:'stat'},h('span',{text:'Сыграли сегодня'}),h('b',{text:'41'})),h('div',{class:'stat'},h('span',{text:'Верных ответов'}),h('b',{text:'68%'})),h('div',{class:'stat'},h('span',{text:'Сгорело звёзд (штрафы)'}),h('b',{text:'186 ⭐'}))),
    h('div',{class:'panel'},h('h2',{text:'ЗАЯВКИ НА ОБМЕН · 3'}),ql),backBtn())}
function render(){app.innerHTML='';app.appendChild(decor());app.appendChild(h('div',{class:'demo-tag',text:'ПРОТОТИП · не в приложении'}));app.appendChild(hdr());
  app.appendChild(screen==='game'&&G?viewGame():screen==='end'&&G?viewEnd():screen==='intro'?h('div',{class:'menu'},emblem(),h('div',{class:'sub',text:'Ведущий представляет игру…'})):screen==='ex'?viewEx():screen==='rate'?viewRate():screen==='rules'?viewRules():screen==='admin'?viewAdmin():viewMenu())}
window.QD={get G(){return G},newGame:newGame,choose:choose,next:next,fifty:fifty,help:help,audience:audience,set audio(v){audioOn=v},get stars(){return st.stars}};
fetch('questions.json').then(function(r){return r.json()}).then(function(j){Q=j;render()});
})();

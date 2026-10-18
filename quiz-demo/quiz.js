(function(){
'use strict';
var LADDER=[1,2,3,5,10,15,20,30,40,50], SAFE={4:true,9:true}, RUB=10, CAP=1000;
var LS='quizDemo.v1', st=load(), Q=[], G=null, muted=false, audioOn=false, cur=null, music=null, timers=[];
var $=function(s){return document.querySelector(s)}, app=$('#app'), fx=$('#fx');
var P=new URLSearchParams(location.search), FAST=P.has('fast');
function load(){try{return JSON.parse(localStorage.getItem(LS))||null}catch(e){return null}}
function save(){localStorage.setItem(LS,JSON.stringify(st))}
if(!st) st={stars:12,streak:2,best:20,lastPlay:null,history:[],requests:[{id:1,stars:30,rub:300,at:'15.10.2026',status:'approved'}]};
function h(tag,attrs){var e=document.createElement(tag);attrs=attrs||{};for(var k in attrs){var v=attrs[k];if(k==='class')e.className=v;else if(k==='text')e.textContent=v;else if(k==='html')e.innerHTML=v;else if(k.slice(0,2)==='on')e.addEventListener(k.slice(2),v);else if(v!=null&&v!==false)e.setAttribute(k,v)}for(var i=2;i<arguments.length;i++){var c=arguments[i];if(c==null)continue;e.appendChild(typeof c==='string'?document.createTextNode(c):c)}return e}
function later(fn,ms){var t=setTimeout(fn,FAST?Math.min(ms,250):ms);timers.push(t);return t}
function clearT(){timers.forEach(clearTimeout);timers=[]}
function rub(n){return n.toLocaleString('ru-RU')+'\u00a0₽'}
function plural(n,a,b,c){n=Math.abs(n)%100;var n1=n%10;if(n>10&&n<20)return c;if(n1>1&&n1<5)return b;if(n1===1)return a;return c}
function starsTxt(n){return n+' '+plural(n,'звезда','звезды','звёзд')}
/* ---------- audio ---------- */
var cache={};window.QLOG=[];function lg(k,f,v){QLOG.push({k:k,f:f,v:v==null?1:v,t:performance.now()})}
function snd(name,vol){if(!audioOn||muted)return Promise.resolve();var a=new Audio('audio/'+name+'.mp3');a.volume=vol==null?1:vol;cache[name]=a;lg('s',name,a.volume);return a.play().then(function(){return new Promise(function(r){a.onended=r;a.onerror=r})}).catch(function(){})}
function voice(name,fallbackText){
  if(!audioOn||muted)return new Promise(function(r){later(r,900)});
  if(cur){try{cur.pause()}catch(e){}}
  duck(true);
  var a=new Audio('audio/'+name+'.mp3');cur=a;lg('v',name);
  return new Promise(function(res){
    var done=function(){duck(false);res()};
    a.onended=done;
    a.onerror=function(){speak(fallbackText).then(done)};
    a.play().catch(function(){speak(fallbackText).then(done)});
  });
}
function speak(t){return new Promise(function(r){if(!t||!window.speechSynthesis)return r();var u=new SpeechSynthesisUtterance(t);u.lang='ru-RU';u.rate=1;u.onend=r;u.onerror=r;speechSynthesis.cancel();speechSynthesis.speak(u)})}
function stopVoice(){lg('vstop');if(cur){try{cur.pause()}catch(e){}}cur=null;if(window.speechSynthesis)speechSynthesis.cancel()}
function startMusic(){if(!audioOn||muted)return;if(!music){music=new Audio('audio/m_suspense.mp3');music.loop=true}music.volume=.35;lg('m');music.play().catch(function(){})}
function stopMusic(){lg('mstop');if(music)music.pause()}
function duck(on){if(music)music.volume=on?.12:.35}
function setMuted(m){muted=m;if(m){stopMusic();stopVoice()}else if(G&&G.phase==='q')startMusic();render()}
/* ---------- fx ---------- */
function confetti(n){var cols=['#f5c542','#ff9b21','#22c55e','#8f75ff','#fff','#ef4444'];for(var i=0;i<(n||120);i++){var c=h('i',{class:'conf'});c.style.left=Math.random()*100+'vw';c.style.background=cols[i%cols.length];c.style.animationDuration=(2+Math.random()*2.5)+'s';c.style.animationDelay=Math.random()*.8+'s';fx.appendChild(c);(function(c){setTimeout(function(){c.remove()},5500)})(c)}}
function flyStars(n,from){var b=$('.bal');if(!b)return;var r=b.getBoundingClientRect(),f=from?from.getBoundingClientRect():{left:innerWidth/2,top:innerHeight/2,width:0,height:0};for(var i=0;i<Math.min(n,12);i++){var s=h('span',{class:'flystar',text:'⭐'});var x=f.left+f.width/2+(Math.random()*60-30),y=f.top+f.height/2;s.style.left=x+'px';s.style.top=y+'px';s.style.setProperty('--dx',(r.left+r.width/2-x)+'px');s.style.setProperty('--dy',(r.top+r.height/2-y)+'px');s.style.animationDelay=(i*.07)+'s';fx.appendChild(s);(function(s){setTimeout(function(){s.remove()},1800)})(s)}setTimeout(function(){b.classList.add('bump');snd('s_coin',.6);setTimeout(function(){b.classList.remove('bump')},700)},900)}
/* ---------- game ---------- */
function pick(){var by={1:[],2:[],3:[]};Q.forEach(function(q){by[q.level].push(q)});function take(l,k){var a=by[l].slice().sort(function(){return Math.random()-.5});return a.slice(0,k)}return take(1,3).concat(take(2,4),take(3,3))}
function newGame(){clearT();G={qs:pick(),i:0,phase:'q',fifty:false,help:false,removed:[],sel:null,won:0,safe:0,helpTxt:null,res:null};render();askQ()}
function safeStars(i){var s=0;for(var k=0;k<i;k++)if(SAFE[k])s=LADDER[k];return s}
function askQ(){var q=G.qs[G.i];G.phase='q';G.sel=null;G.removed=[];G.helpTxt=null;G.shown=false;render();startMusic();
  later(function(){document.querySelectorAll('.a').forEach(function(a,i){setTimeout(function(){a.classList.add('in')},FAST?0:i*350)});later(function(){G.shown=true},1500)},FAST?50:600);
  voice('q'+q.id,q.q+'. '+q.a.map(function(a,j){return 'АБВГ'[j]+': '+a}).join('. ')).then(function(){if(G&&G.phase==='q')G.ready=true})}
function choose(j){if(!G||G.phase!=='q')return;var q=G.qs[G.i];G.sel=j;G.phase='lock';stopVoice();render();
  snd('s_lock',.8);voice(Math.random()<.5?'lock1':'lock2','Это ваш окончательный ответ? Принято.');
  later(function(){reveal(j===q.correct)},2600)}
function reveal(ok){var q=G.qs[G.i];G.phase=ok?'ok':'bad';stopMusic();render();
  document.body.classList.add(ok?'flashg':'flashr');setTimeout(function(){document.body.classList.remove('flashg','flashr')},900);
  if(ok){G.won=LADDER[G.i];snd('s_correct',.9);later(function(){voice(['ok1','ok2','ok3'][G.i%3],'Верно!').then(function(){if(SAFE[G.i]&&G.i<9)return voice('safe','Несгораемая сумма!')})},400);
    if(SAFE[G.i])later(function(){confetti(60)},500)}
  else{var q2=$('#qb');if(q2)q2.classList.add('shake');snd('s_wrong',.9);later(function(){voice('bad','Неверный ответ.')},600)}
  later(function(){voice('e'+q.id,q.explain)},ok?2600:2800)}
function next(){stopVoice();if(G.phase==='ok'){if(G.i===9)return finish('win');G.i++;askQ()}else finish('lost')}
function takeStars(){if(!G||G.phase!=='q'||G.i===0)return;stopVoice();finish('take')}
function finish(how){clearT();stopMusic();var earned=how==='win'?LADDER[9]:how==='take'?LADDER[G.i-1]:safeStars(G.i);
  G.phase='end';G.res={how:how,earned:earned,answered:how==='lost'?G.i:(how==='win'?10:G.i)};
  st.stars+=earned;st.streak=earned>0?st.streak+1:0;st.best=Math.max(st.best,earned);st.lastPlay=new Date().toISOString().slice(0,10);st.history.unshift({at:new Date().toLocaleDateString('ru-RU'),earned:earned});save();render();
  if(how==='win'){snd('s_win');confetti(180);voice('win','Поздравляю!')}else if(how==='take')voice('take','Мудрое решение.');
  if(earned)later(function(){flyStars(earned,$('.big'))},600)}
function fifty(){if(!G||G.phase!=='q'||G.fifty)return;var q=G.qs[G.i];G.fifty=true;G.shown=true;var w=[0,1,2,3].filter(function(k){return k!==q.correct}).sort(function(){return Math.random()-.5}).slice(0,2);G.removed=w;
  stopVoice();snd('s_fifty');voice('fifty','Уберите два неверных ответа.');render();w.forEach(function(k){var b=document.querySelector('.a[data-k="'+k+'"]');if(b)b.classList.add('anim')})}
function help(){if(!G||G.phase!=='q'||G.help)return;var q=G.qs[G.i];G.help=true;G.shown=true;stopVoice();render();snd('s_ring',.7);
  var conf={1:.95,2:.8,3:.65}[q.level],pickK=Math.random()<conf?q.correct:[0,1,2,3].filter(function(k){return k!==q.correct&&G.removed.indexOf(k)<0})[0];
  voice('help','Звоним бригадиру.').then(function(){G.helpTxt=(conf>.9?'Тут без вариантов — ':conf>.7?'Почти уверен: ':'Не на сто процентов, но я бы сказал ')+'«'+'АБВГ'[pickK]+': '+q.a[pickK]+'». ';if(G.phase==='q')render()})}
/* ---------- views ---------- */
var tab='game';
function topbar(){return h('div',{class:'top'},h('div',{class:'logo',text:'Склад-миллионер'}),h('div',{class:'row',style:'align-items:center;gap:8px'},h('div',{class:'bal','data-testid':'bal'},'⭐ ',h('span',{text:String(st.stars)})),h('button',{class:'mute','aria-label':muted?'Включить звук':'Выключить звук',text:muted?'🔇':'🔊',onclick:function(){setMuted(!muted)}})))}
function ladderEl(){var l=h('div',{class:'ladder',id:'lad'});LADDER.forEach(function(v,i){var c='rung'+(SAFE[i]?' safe':'')+(G&&i<G.i||G&&i===G.i&&G.phase==='ok'?' done':'')+(G&&i===G.i&&G.phase!=='ok'?' cur':'');l.appendChild(h('div',{class:c},h('b',{text:'⭐'+v}),String(i+1)+(SAFE[i]?' 🔒':'')))});return l}
function viewStart(){var played=st.lastPlay===new Date().toISOString().slice(0,10)&&!P.has('again');
  return h('div',null,
    h('div',{class:'hero'},h('div',{class:'diamond',text:'⭐'}),h('h1',{style:'margin:6px 0 2px;font-size:26px',text:'Кто хочет стать звёздой склада?'}),h('div',{class:'muted',text:'10 вопросов о работе на складе. Звёзды можно обменять на рубли.'})),
    h('div',{class:'card'},
      h('div',{class:'stat'},h('span',{text:'Баланс'}),h('b',{text:starsTxt(st.stars)+' ≈ '+rub(st.stars*RUB)})),
      h('div',{class:'stat'},h('span',{text:'Серия дней подряд'}),h('b',{text:'🔥 '+st.streak})),
      h('div',{class:'stat'},h('span',{text:'Лучшая игра'}),h('b',{text:'⭐ '+st.best})),
      audioOn?null:h('div',{class:'muted',style:'margin-top:10px',text:'🔊 Включите звук: ведущий читает вопросы вслух.'}),
      h('button',{class:'btn','data-testid':'start',disabled:played?'':null,onclick:function(){audioOn=true;snd('s_intro',.8);voice('intro','Добро пожаловать в игру!').then(function(){if(!G)newGame()});G=null;later(function(){if(!G)newGame()},FAST?300:9000)}},played?'Сегодня уже сыграно — приходите завтра':'▶ Играть'),
      played?h('a',{href:'?again=1',class:'sm',style:'display:block;text-align:center;margin-top:8px;color:#c7c2ff',text:'(прототип: сыграть ещё раз)'}):null,
      h('div',{class:'prop',html:'<b>Предложение (на согласование):</b> 1 игра в день · лестница 1→50 ⭐, несгораемые 5-й (10 ⭐) и 10-й (50 ⭐) · неверный ответ — игра окончена, остаются несгораемые · 1 ⭐ = 10 ₽ · лимит обмена 1 000 ₽ в месяц · обмен — премия в выплату после одобрения админом.'})));
}
function viewGame(){var q=G.qs[G.i],L='АБВГ',ph=G.phase;
  var ans=h('div',{class:'ans'});q.a.forEach(function(a,k){var c='a'+(ph!=='q'||G.shown?' in':'')+(G.sel===k?' sel':'')+(G.removed.indexOf(k)>=0?' gone':'');
    if(ph==='ok'||ph==='bad'){if(k===q.correct)c+=' ok';else if(k===G.sel)c+=' bad'}
    ans.appendChild(h('button',{class:c,'data-k':k,'data-testid':'ans-'+k,disabled:ph!=='q'||G.removed.indexOf(k)>=0?'':null,onclick:function(){choose(k)}},h('span',{class:'l',text:L[k]+':'}),h('span',{text:a})))});
  var box=h('div',null,ladderEl(),h('div',{class:'qnum',text:'Вопрос '+(G.i+1)+' из 10 · на кону ⭐'+LADDER[G.i]+(SAFE[G.i]?' · несгораемая':'')}),
    h('div',{class:'qbox'+(ph==='q'?' reveal':''),id:'qb',text:q.q}),ans);
  if(G.helpTxt)box.appendChild(h('div',{class:'bubble','data-testid':'help-bubble'},h('b',{text:'Бригадир'}),G.helpTxt));
  if(ph==='q'||ph==='lock')box.appendChild(h('div',{class:'lifes'},
    h('button',{class:'life'+(G.fifty?' used':''),'data-testid':'fifty',onclick:fifty},h('span',null,'50:50')),
    h('button',{class:'life'+(G.help?' used':''),'data-testid':'help',onclick:help},h('span',{html:'👷<br><small>Бригадир</small>'})),
    h('button',{class:'life','data-testid':'take',disabled:G.i===0?'':null,style:G.i===0?'opacity:.35':'',onclick:takeStars},h('span',{html:'🏳️<br><small>Забрать ⭐'+(G.i?LADDER[G.i-1]:0)+'</small>'}))));
  if(ph==='ok'||ph==='bad'){box.appendChild(h('div',{class:'expl','data-testid':'expl'},h('div',{html:(ph==='ok'?'✅ <b>Верно!</b> ':'❌ <b>Неверно.</b> Правильный ответ: <b>'+L[q.correct]+'</b>. ')}),q.explain,h('div',null,h('span',{class:'src',text:q.sourceLabel}))));
    box.appendChild(h('button',{class:'btn','data-testid':'next',onclick:next},ph==='ok'?(G.i===9?'🏆 Забрать главный приз':'Следующий вопрос →'):'Итоги игры'))}
  setTimeout(function(){var c=document.querySelector('.rung.cur,.rung.done:last-of-type');if(c)c.scrollIntoView({inline:'center',block:'nearest'})},30);
  return box}
function viewEnd(){var r=G.res,t={win:'🏆 Главный приз!',take:'Вы забрали звёзды',lost:r.earned?'Несгораемые звёзды ваши':'В этот раз без звёзд'}[r.how];
  return h('div',null,h('div',{class:'hero'},h('div',{class:'diamond',text:r.how==='win'?'🏆':r.earned?'⭐':'💫'}),h('h1',{style:'margin:8px 0 4px;font-size:24px',text:t})),
    h('div',{class:'card','data-testid':'result'},h('div',{class:'big',text:'+'+r.earned+' ⭐'}),h('div',{class:'muted',style:'text-align:center',text:'≈ '+rub(r.earned*RUB)+' · правильных ответов: '+r.answered+' из 10'}),
      h('div',{class:'stat',style:'margin-top:10px'},h('span',{text:'Баланс'}),h('b',{text:starsTxt(st.stars)})),
      h('div',{class:'stat'},h('span',{text:'Серия'}),h('b',{text:'🔥 '+st.streak+' '+plural(st.streak,'день','дня','дней')+' подряд'})),
      h('div',{class:'muted',style:'margin-top:10px',text:'Следующая игра — завтра. Разбор ошибок по штрафам — в разделе «Штрафы» приложения.'})),
    h('button',{class:'btn','data-testid':'to-exchange',onclick:function(){tab='ex';G=null;render()}},'Обменять звёзды на рубли'),
    h('button',{class:'btn ghost',onclick:function(){G=null;tab='game';render()}},'На главную'))}
function monthRub(){return st.requests.filter(function(r){return r.status!=='rejected'}).reduce(function(s,r){return s+r.rub},0)}
function viewEx(){var left=Math.max(0,CAP-monthRub()),maxS=Math.min(st.stars,Math.floor(left/RUB));var val=Math.min(maxS,st.stars);
  var inp=h('input',{class:'inp',type:'number',min:1,max:maxS,value:val,'data-testid':'ex-n',oninput:function(){var n=+inp.value||0;out.textContent='= '+rub(n*RUB);btn.disabled=!(n>=1&&n<=maxS)}});
  var out=h('div',{class:'big',style:'font-size:34px;margin:6px 0',text:'= '+rub(val*RUB)});
  var btn=h('button',{class:'btn','data-testid':'ex-send',disabled:maxS<1?'':null,onclick:function(){var n=+inp.value;if(!(n>=1&&n<=maxS))return;st.stars-=n;st.requests.unshift({id:Date.now(),stars:n,rub:n*RUB,at:new Date().toLocaleDateString('ru-RU'),status:'pending'});save();snd('s_coin');render()}},'Отправить заявку админу');
  var list=h('div',{class:'list'});st.requests.forEach(function(r){list.appendChild(h('div',{class:'it'},h('div',null,h('b',{text:rub(r.rub)}),h('div',{class:'sm',text:r.at+' · '+starsTxt(r.stars)})),h('span',{class:'chip '+({pending:'p',approved:'y',rejected:'n'})[r.status],text:{pending:'⏳ ждёт одобрения',approved:'✅ одобрено · в выплате',rejected:'отклонено'}[r.status]})))});
  return h('div',null,h('h1',{style:'font-size:22px;margin:6px 0',text:'Обмен звёзд'}),
    h('div',{class:'card'},h('div',{class:'stat'},h('span',{text:'Доступно'}),h('b',{text:starsTxt(st.stars)})),h('div',{class:'stat'},h('span',{text:'Курс (предложение)'}),h('b',{text:'1 ⭐ = '+RUB+' ₽'})),h('div',{class:'stat'},h('span',{text:'Лимит в этом месяце'}),h('b',{text:'осталось '+rub(left)+' из '+rub(CAP)})),
      h('div',{class:'muted',style:'margin:12px 0 6px',text:'Сколько звёзд обменять'}),inp,out,btn,
      h('div',{class:'prop',text:'После одобрения админом сумма добавится в ближайшую выплату как премия. Звёзды списываются сразу; при отклонении — вернутся.'})),
    h('div',{class:'card'},h('h2',{text:'Мои заявки'}),list))}
function viewAdmin(){var rating=[['Ахметов М.',148,'🔥 9'],['Зотов В.',121,'🔥 6'],['Витров И.',96,'🔥 4'],['Ушаков А.',74,'🔥 3'],['Землянов П.',52,'🔥 1']];
  var reqs=[['Зотов В.',50,500],['Витров И.',30,300],['Антонов А.',20,200]];
  var rl=h('div',{class:'list'});rating.forEach(function(r,i){rl.appendChild(h('div',{class:'it'},h('div',null,h('b',{text:(['🥇','🥈','🥉'][i]||(i+1)+'.')+' '+r[0]}),h('div',{class:'sm',text:'за октябрь · '+r[2]+' дней подряд'})),h('b',{style:'color:var(--gold2)',text:'⭐ '+r[1]})))});
  var ql=h('div',{class:'list'});reqs.forEach(function(r){var chip=h('span',{class:'chip p',text:'⏳ ждёт'});var row=h('div',{class:'it'},h('div',null,h('b',{text:r[0]}),h('div',{class:'sm',text:r[1]+' ⭐ → '+rub(r[2])+' · в месяце уже 300 ₽ из 1 000 ₽'})),h('div',{class:'row',style:'gap:6px'},h('button',{class:'btn',style:'margin:0;padding:8px 10px;font-size:13px;width:auto','data-testid':'adm-ok',onclick:function(){row.lastChild.replaceWith(h('span',{class:'chip y',text:'✅ в выплату'}))}},'Одобрить'),h('button',{class:'btn ghost',style:'margin:0;padding:8px 10px;font-size:13px;width:auto',onclick:function(){row.lastChild.replaceWith(h('span',{class:'chip n',text:'отклонено'}))}},'✕')));ql.appendChild(row)});
  return h('div',null,h('h1',{style:'font-size:22px;margin:6px 0',text:'Кабинет админа · Викторина'}),h('div',{class:'prop',text:'ДЕМО: вымышленные цифры, макет экрана админа.'}),
    h('div',{class:'card'},h('div',{class:'row'},h('div',{style:'flex:1'},h('div',{class:'big',style:'font-size:30px',text:'41'}),h('div',{class:'sm',style:'text-align:center',text:'сыграли сегодня'})),h('div',{style:'flex:1'},h('div',{class:'big',style:'font-size:30px',text:'68%'}),h('div',{class:'sm',style:'text-align:center',text:'верных ответов'})),h('div',{style:'flex:1'},h('div',{class:'big',style:'font-size:30px',text:'Q3'}),h('div',{class:'sm',style:'text-align:center',text:'самый трудный'})))),
    h('div',{class:'card'},h('h2',{text:'Заявки на обмен · 3'}),ql),
    h('div',{class:'card'},h('h2',{text:'Рейтинг за октябрь'}),rl))}
function tabs(){function b(id,ic,t){return h('button',{class:tab===id?'on':'','data-testid':'tab-'+id,onclick:function(){if(G&&G.phase!=='end'&&id!=='game')return;tab=id;if(id!=='game')G=G&&G.phase==='end'?null:G;render()}},h('span',{text:ic}),t)}return h('nav',{class:'tabs'},b('game','🎮','Игра'),b('ex','💱','Обмен'),b('admin','🛡️','Админ'))}
function render(){app.innerHTML='';app.appendChild(h('div',{class:'rays'}));app.appendChild(h('div',{class:'demo-tag',text:'ПРОТОТИП · не в приложении'}));app.appendChild(topbar());
  app.appendChild(tab==='ex'?viewEx():tab==='admin'?viewAdmin():!G?viewStart():G.phase==='end'?viewEnd():viewGame());app.appendChild(tabs())}
window.QD={get G(){return G},newGame:newGame,choose:choose,next:next,fifty:fifty,help:help,set audio(v){audioOn=v}};
fetch('questions.json').then(function(r){return r.json()}).then(function(j){Q=j;render()});
})();

'use strict';
/* Архитектура личности · Майя Явь — логика по разделу 9 ТЗ. Ответы живут только в текущей вкладке (sessionStorage). */
const $=s=>document.querySelector(s),app=$('#app');
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const KEY='arch_v1',SKEY='arch_sound';
['arch_v0'].forEach(k=>{try{localStorage.removeItem(k);sessionStorage.removeItem(k)}catch(e){}});
const fresh=()=>({v:1,entered:false,seed:(Math.random()*1e9)|0,pos:-1,ans:{},mode:'cover',book:{done:false,open:false,ch:0}});
function sane(o){if(!o||o.v!==1||typeof o.ans!=='object'||!o.ans||Array.isArray(o.ans)||typeof o.pos!=='number'||!isFinite(o.pos)||typeof o.seed!=='number')return fresh();
 if(!o.book||typeof o.book!=='object')o.book={done:false,open:false,ch:0};if(!['cover','book','test'].includes(o.mode))o.mode='cover';
 for(const k in o.ans){const a=o.ans[k];if(!a||typeof a!=='object'){delete o.ans[k];continue}if(a.list&&!Array.isArray(a.list))delete o.ans[k]}return o}
let S;try{S=sane(JSON.parse(sessionStorage.getItem(KEY)||'null'))}catch(e){S=fresh()}
const save=()=>{try{sessionStorage.setItem(KEY,JSON.stringify(S))}catch(e){}};
let sound=true;try{sound=localStorage.getItem(SKEY)!=='off'}catch(e){}

/* ---------- sound & haptics: мягкий «кожаный» щелчок ---------- */
let AC=null;
function click(){try{navigator.vibrate&&navigator.vibrate(12)}catch(e){}
 if(!sound)return;try{AC=AC||new(window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume();const t=AC.currentTime;
 const o=AC.createOscillator(),g=AC.createGain();o.type='sine';o.frequency.setValueAtTime(660,t);o.frequency.exponentialRampToValueAtTime(420,t+.09);
 g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.16,t+.006);g.gain.exponentialRampToValueAtTime(.0001,t+.16);o.connect(g).connect(AC.destination);o.start(t);o.stop(t+.17);
 const o2=AC.createOscillator(),g2=AC.createGain();o2.type='triangle';o2.frequency.setValueAtTime(150,t);o2.frequency.exponentialRampToValueAtTime(80,t+.08);
 g2.gain.setValueAtTime(.0001,t);g2.gain.exponentialRampToValueAtTime(.12,t+.005);g2.gain.exponentialRampToValueAtTime(.0001,t+.1);o2.connect(g2).connect(AC.destination);o2.start(t);o2.stop(t+.11)}catch(e){}}
function tone(list,vol,type='sine'){if(!sound)return;try{AC=AC||new(window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume();const t=AC.currentTime;
 list.forEach(([f,d,len,f2])=>{const o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.setValueAtTime(f,t+d);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+d+len*.6);g.gain.setValueAtTime(.0001,t+d);g.gain.exponentialRampToValueAtTime(vol,t+d+.012);g.gain.exponentialRampToValueAtTime(.0001,t+d+len);o.connect(g).connect(AC.destination);o.start(t+d);o.stop(t+d+len+.05)})}catch(e){}}
const SND={leather:()=>{tone([[180,0,.12,95]],.16,'triangle');tone([[900,0,.05,600]],.05)},
 tap:()=>tone([[740,0,.16,520]],.14),
 chime:()=>tone([[523.3,0,.9],[784,.07,1.0]],.11),
 warm:()=>{tone([[261.6,0,2.2],[329.6,.12,2.0],[392,.24,2.0],[523.3,.36,2.2]],.10);tone([[130.8,0,2.2]],.06,'triangle')},
 tick:()=>tone([[300,0,.08,180]],.15,'triangle')};
document.addEventListener('pointerdown',e=>{const b=e.target.closest('button,a.btn');if(!b||b.id==='core'||b.classList.contains('snd'))return;try{navigator.vibrate&&navigator.vibrate(12)}catch(x){}
 let k='leather';if(b.classList.contains('opt')||b.classList.contains('star')||b.classList.contains('day'))k='tap';
 else if(b.id==='next'||b.id==='start'||b.id==='ttest'||b.id==='ctat'||b.classList.contains('round'))k='chime';
 else if(b.id==='back'||b.id==='bback'||b.id==='fab'||b.dataset.v==='menu'||b.id==='tomenu'||b.id==='cls'||b.classList.contains('skip'))k='tick';
 SND[k]()},{passive:true});
const sndBtn=(cls='')=>`<button class="icb snd ${cls}${sound?'':' off'}" aria-label="${sound?'Звук включен':'Звук выключен'}" title="Звук">${sound?'🔊':'🔈'}</button>`;
document.addEventListener('click',e=>{const b=e.target.closest('.snd');if(!b)return;sound=!sound;try{localStorage.setItem(SKEY,sound?'on':'off')}catch(x){}
 document.querySelectorAll('.snd').forEach(x=>{x.textContent=sound?'🔊':'🔈';x.classList.toggle('off',!sound);x.setAttribute('aria-label',sound?'Звук включен':'Звук выключен')});if(sound)click()});

/* ---------- seeded shuffle (A01–A10) ---------- */
function rng(seed){let s=seed>>>0;return()=>{s=(s+0x6D2B79F5)>>>0;let t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function order(q,qi){const n=q.o.length,idx=[...Array(n).keys()];const neutral=idx.filter(i=>!q.o[i].c),rest=idx.filter(i=>q.o[i].c);
 const r=rng(S.seed+qi*7919);for(let i=rest.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[rest[i],rest[j]]=[rest[j],rest[i]]}return rest.concat(neutral)}

/* ---------- helpers ---------- */
const A=Object.fromEntries(DATA.A.map(q=>[q.id,q])),B=Object.fromEntries(DATA.B.map(q=>[q.id,q])),C=Object.fromEntries(DATA.C.map(q=>[q.id,q]));
const ACODES=Array.from({length:12},(_,i)=>'A'+(i+1)),BCODES=Array.from({length:8},(_,i)=>'B'+(i+1));
const ans=id=>S.ans[id];
const picked=id=>{const a=ans(id);return a&&!a.skip&&a.i!=null?a.i:null};
const phraseA=c=>DATA.codesA[c].phrase;
const lc=s=>s.charAt(0).toLowerCase()+s.slice(1);
function plural(n,f){const m=n%10,h=n%100;return f[(m===1&&h!==11)?0:(m>=2&&m<=4&&(h<10||h>=20))?1:2]}
const isOther=t=>/^(Другое|Свой |Свой$)/.test(t);

/* ---------- scoring (раздел 9) ---------- */
function score(){
 const sA=Object.fromEntries(ACODES.map(c=>[c,0])),sit=Object.fromEntries(ACODES.map(c=>[c,0])),a11rank={},firstSit={};
 let skipsA=0;
 ['A01','A02','A03','A04','A05','A06','A07','A08','A09','A10'].forEach(id=>{const i=picked(id);if(i==null){skipsA++;return}const o=A[id].o[i];
  if(o.c){sA[o.c]++;sit[o.c]++;if(!firstSit[o.c])firstSit[o.c]={q:A[id].title,t:o.t}}});
 const a11=ans('A11'),l=(a11&&!a11.skip&&a11.list)||[];let a11neutral=false;
 if(!l.length)skipsA++;
 l.forEach((i,k)=>{const c=A.A11.o[i].c;if(!c){a11neutral=true;return}a11rank[c]=k;sA[c]+=[3,2,1][k]||0});
 const r12=picked('A12');let R=null;if(r12==null)skipsA++;else{const c=A.A12.o[r12].c;R=c==='RX'?null:+c.slice(1)}
 const rank=Object.keys(sA).filter(c=>sA[c]>0).sort((x,y)=>sA[y]-sA[x]||((x in a11rank?a11rank[x]:9)-(y in a11rank?a11rank[y]:9))||sit[y]-sit[x]||ACODES.indexOf(x)-ACODES.indexOf(y));
 const aCand=rank.slice(0,2);
 const sB=Object.fromEntries(BCODES.map(c=>[c,0]));
 DATA.B.forEach(q=>{const i=picked(q.id);if(i!=null&&q.o[i].c)sB[q.o[i].c]++});
 const rankB=Object.keys(sB).filter(c=>sB[c]>0).sort((x,y)=>sB[y]-sB[x]||BCODES.indexOf(x)-BCODES.indexOf(y));
 const bCand=rankB.slice(0,2);
 const sC={C1:0,C2:0,C3:0,C4:0};DATA.C.forEach(q=>{const i=picked(q.id);if(i!=null)sC[q.o[i].c]++});
 return{sA,sit,a11rank,a11neutral,firstSit,R,skipsA,aCand,sB,bCand,sC}}

function finalize(){
 const s=score(),{sA,sit,a11rank,R,skipsA,aCand}=s;
 const v01={},v02={};
 aCand.forEach(c=>{const i1=picked('V01:'+c);v01[c]=i1==null?null:(i1===5?'none':(i1===4?'other':'area'));
  const i2=picked('V02:'+c);v02[c]=i2==null?null:[2,1,0,0,null][i2]});
 const t1=aCand[0],t2=aCand[1];
 function stA(c){if(!c)return'unclear';const sc=sA[c],inA11=c in a11rank,v2=v02[c],none=v01[c]==='none';
  if(skipsA>=5)return'unclear';
  if(none&&!(v2>=1))return'unclear';            // противоречивые подтверждения
  if(R===0&&!(v2>=1))return'unclear';
  const sup=sc>=4&&sit[c]>=2&&inA11&&R!=null&&R>=2&&v2>=1&&!none;
  if(sup)return'supported';
  if(sc>=3&&(inA11||v2>=1))return'tentative';
  return'unclear'}
 let aStatus=stA(t1);
 if(aStatus!=='unclear'&&t2&&sA[t1]-sA[t2]<=1&&sA[t1]>=3&&sA[t2]>=3&&v02[t1]>=1&&v02[t2]>=1)aStatus='mixed';
 // B
 const adj={...s.sB},[b1,b2]=s.bCand;const v05i=picked('V05'),v05=v05i==null?null:['functional','reinforcing','cost','context','disconfirm'][v05i];
 const v06i=picked('V06');let v06=null;
 if(v06i!=null&&b1&&b2){v06=['top1','top2','both','none'][v06i];if(v06==='top1')adj[b1]+=2;if(v06==='top2')adj[b2]+=2;if(v06==='both'){adj[b1]++;adj[b2]++}if(v06==='none'){adj[b1]-=2;adj[b2]-=2}}
 const rb=Object.keys(adj).filter(c=>adj[c]>0).sort((x,y)=>adj[y]-adj[x]||s.sB[y]-s.sB[x]||BCODES.indexOf(x)-BCODES.indexOf(y));
 const B1=rb[0],B2=rb[1];let bStatus='unclear';
 if(B1){const disc=v05==='disconfirm'&&B1===b1;
  if(B2&&adj[B1]-adj[B2]<=1&&adj[B1]>=3&&adj[B2]>=3&&v06==='both')bStatus='mixed';
  else if(adj[B1]>=3&&s.sB[B1]>=3&&!disc)bStatus='supported';
  else if(adj[B1]>=2)bStatus='tentative'}
 // C
 const sC=s.sC,mx=Math.max(...Object.values(sC)),tops=Object.keys(sC).filter(c=>sC[c]===mx);let mode;
 if(sC.C4>=3)mode='C4';
 else if(tops.length===1&&mx>=3)mode=tops[0];
 else if(tops.length>1&&((tops.includes('C1')&&tops.includes('C2'))||(tops.includes('C2')&&tops.includes('C3')))&&sC.C4>=2)mode='C4';
 else mode='MIX';
 // consistency 9.4
 let cons='low';
 if(aStatus==='supported'&&bStatus==='supported'&&(v05==='reinforcing'||v05==='cost')&&v01[t1]&&v01[t1]!=='none')cons='high';
 else if(aStatus!=='unclear'&&bStatus!=='unclear')cons='medium';
 // switch branch
 let focus=t1;if(aStatus==='mixed'&&t2&&(a11rank[t2]??9)<(a11rank[t1]??9))focus=t2;
 const branch=aStatus==='unclear'?'U':focus;
 return{...s,v01,v02,t1,t2,aStatus,adj,B1,B2,bStatus,v05,v06,b1,b2,mode,cons,focus,branch}}

/* ---------- flow ---------- */
function flow(){const F=['S1','ST1',...DATA.A.map(q=>q.id),'ST2',...DATA.B.map(q=>q.id),'ST3',...DATA.C.map(q=>q.id),'ST4'];
 const s=score();const [a1,a2]=s.aCand;
 a1&&F.push('V01:'+a1);a2&&F.push('V01:'+a2);a1&&F.push('V02:'+a1);a2&&F.push('V02:'+a2);
 if(a1)F.push('V03','V04');if(s.bCand[0])F.push('V05');if(s.bCand[1])F.push('V06');F.push('VF');
 const br=finalize().branch;F.push('ST5','P1:'+br,'P2:'+br,'P3:'+br,'ST6','D01','D02','D03','PR','AN','RES');return F}
const STAGEOF=id=>id==='S1'?0:/^A/.test(id)?1:/^B/.test(id)?2:/^C/.test(id)?3:/^V/.test(id)?4:/^P\d/.test(id)?5:/^D|^PR/.test(id)?6:7;

/* ---------- question model ---------- */
function model(id){const f=finalize();
 if(id==='S1')return{type:'single',q:DATA.S.s1q,o:DATA.S.s1.map(o=>o.t),lead:DATA.S.s0text+'.',noskip:true,label:'Вступление'};
 if(A[id]){const q=A[id],ord=q.type?[...q.o.keys()]:order(q,+id.slice(1));
  const m={type:q.type||'single',q:q.q,o:q.o.map(o=>o.t),ord,label:'Жизненные ситуации',max:q.max};
  if(q.type==='rank'){m.hint='Можно выбрать до трех. Порядок важен: первым отметьте самое частое.';m.excl=q.o.findIndex(o=>!o.c)}
  if(id==='A12'){const l=ans('A11');const first=l&&!l.skip&&l.list&&l.list.length&&A.A11.o[l.list[0]].c?A.A11.o[l.list[0]].t:null;
   m.hint=first?`Речь о чувстве: <b>«${esc(first)}»</b>`:'Речь о чувстве, которое чаще всего повторялось в Ваших ответах. Если не можете определить, так и отметьте.'}
  return m}
 if(B[id])return{type:'single',q:B[id].q,o:B[id].o.map(o=>o.t),label:'Привычные реакции'};
 if(C[id])return{type:'single',q:C[id].q,o:C[id].o.map(o=>o.t),label:'Режим взаимодействия'};
 if(id.startsWith('V01:')){const c=id.slice(4);return{type:'single',q:DATA.V.V01.q.replace('{точная фраза A}',phraseA(c)),o:DATA.V.V01.o.map(o=>o.t),label:'Проверка',other:4}}
 if(id.startsWith('V02:')){const c=id.slice(4);return{type:'single',q:DATA.V.V02.q,hint:`Про ощущение <b>«${esc(phraseA(c))}»</b>`,o:DATA.V.V02.o.map(o=>o.t),label:'Проверка'}}
 if(id==='V03'||id==='V04'){const t=f.aCand[0];return{type:'single',q:DATA.V[id].q,hint:t?`Про ощущение <b>«${esc(phraseA(t))}»</b>`:'',o:DATA.V[id].o.map(o=>o.t),label:'Проверка'}}
 if(id==='V05'){const b=f.bCand[0];return{type:'single',q:DATA.V.V05.q.replace('{описание B без ярлыка}',UI.bHuman[b]),o:DATA.V.V05.o.map(o=>o.t),label:'Проверка'}}
 if(id==='V06'){const[b1,b2]=f.bCand;return{type:'single',q:DATA.V.V06.q,o:DATA.V.V06.o.map(o=>o.t.replace('{человеческое описание B-top1}',UI.bHuman[b1]).replace('{человеческое описание B-top2}',UI.bHuman[b2])),label:'Проверка'}}
 if(id==='VF')return{type:'text',q:DATA.V.FREE.q,hint:'Необязательно. Фраза останется только в Вашей карте на этом устройстве.',label:'Проверка'};
 if(/^P\d:/.test(id)){const p=DATA.P[id.slice(3)],qq=p.qs[+id[1]-1];return{type:'single',q:qq.q,o:qq.o,label:'Точка переключения'}}
 const d=DATA.D.find(x=>x.id===id);if(d)return{type:'single',q:d.q,o:d.o.map(o=>o.t),label:'Желаемое состояние',noskip:id==='D01'?false:false};
 return null}

/* ---------- render ---------- */
let F=[];
function go(p){S.pos=p;save();render()}
function render(){setTimeout(fab,0);F=flow();if(S.pos>=F.length)S.pos=F.length-1;if(S.pos<-1)S.pos=-1;
 try{if(S.mode==='cover'&&!S.entered)return entry();if(S.mode==='book')return book();if(S.mode!=='test'||S.pos===-1)return cover();const id=F[S.pos];
  if(id.startsWith('ST'))return stage(+id.slice(2));if(id==='PR')return practice();if(id==='AN')return analysis();if(id==='RES')return result();return question(id)}
 catch(e){console.error(e);S=fresh();save();cover()}}
function entry(){app.innerHTML=`<section class="scr entry dark"><div class="ent"><p class="eh">ТОЧКА<br>ОТСЧЕТА</p><button class="core" id="core" aria-label="Войти: точка отсчета"><span class="halo"></span><span class="ring"></span><span class="ring r2"></span><span class="wave"></span></button><p class="es">коснитесь</p></div></section>`;
 const c=$('#core');c.onclick=()=>{if(c.classList.contains('go'))return;try{navigator.vibrate&&navigator.vibrate([18,40,28])}catch(e){}chime();c.classList.add('go');setTimeout(()=>{S.entered=true;save();render()},RM?100:900)}}
function chime(){if(!sound)return;try{AC=AC||new(window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume();const t=AC.currentTime;
 [[392,0],[587.3,.09],[784,.18]].forEach(([f,d])=>{const o=AC.createOscillator(),g=AC.createGain();o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(.0001,t+d);g.gain.exponentialRampToValueAtTime(.13,t+d+.02);g.gain.exponentialRampToValueAtTime(.0001,t+d+1.4);o.connect(g).connect(AC.destination);o.start(t+d);o.stop(t+d+1.5)})}catch(e){}}
function cover(){app.innerHTML=`<section class="scr cover2 dark">${sndBtn('sndc')}<svg class="circ" viewBox="0 0 400 400" aria-hidden="true"><g fill="none" stroke="#C67B4A"><circle cx="200" cy="200" r="190" stroke-width=".7" opacity=".35"/><circle cx="200" cy="200" r="150" stroke-width=".9" opacity=".55"/><circle cx="200" cy="200" r="104" stroke-width="1" opacity=".7"/><circle cx="200" cy="200" r="60" stroke-width="1.1" opacity=".85"/><path d="M200 0V400M0 200H400" stroke-width=".5" opacity=".3" stroke-dasharray="2 5"/><ellipse cx="200" cy="200" rx="190" ry="80" stroke-width=".6" opacity=".35" transform="rotate(-25 200 200)"/></g><circle cx="200" cy="200" r="5" fill="#C96B3A"/><circle cx="350" cy="130" r="2.5" fill="#F0D6B8"/><circle cx="80" cy="260" r="2.5" fill="#F0D6B8"/></svg><div class="in">
 <div class="brand">МАЙЯ ЯВЬ<small>Автор состояний</small></div>
 <div class="ttl"><h1>ТО<span id="chq">Ч</span>КА<br>ОТСЧЕТА</h1><p class="sub">Найдите свое ведущее фоновое звучание</p></div>
 <p class="lead">Цифровой практикум по методу «Архитектура личности»: 12 глав, исследование и личная практика на 60 дней.</p>
 <button class="btn wide" id="read">Читать практикум <span aria-hidden="true">→</span></button><button class="btn ghost wide" id="start" style="margin-top:10px">Пройти тест</button>
 <div class="sp"></div><div class="meta"><span><b>12</b>глав</span><span><b>15–20</b>мин тест</span><span><b>60</b>дней практики</span></div></div></section>`;placeCirc();
 $('#start').onclick=startTest;$('#read').onclick=()=>openView('menu')}
function placeCirc(){const c=$('.circ'),q=$('#chq'),sc=$('.cover2');if(!c||!q||!sc)return;const f=()=>{const r=q.getBoundingClientRect(),b=sc.getBoundingClientRect();c.style.left=(r.left+r.width/2-b.left)+'px';c.style.top=(r.top-b.top-c.getBoundingClientRect().height*0.035)+'px'};f();document.fonts&&document.fonts.ready.then(f);addEventListener('resize',f,{once:true})}
function startTest(){const b=S.book||{};S=fresh();S.entered=true;S.book=b;S.mode='test';S.pos=0;save();render()}
const MAP=[
 '<path d="M20 300 C110 250 140 200 215 180 C290 160 320 80 380 40" stroke-width="1.3"/>',
 '<ellipse cx="215" cy="180" rx="80" ry="80" stroke-width=".9"/>',
 '<path d="M10 120 C90 140 150 170 215 180 C280 190 330 260 390 300" stroke-width=".8"/>',
 '<ellipse cx="215" cy="180" rx="150" ry="115" stroke-width=".7"/>',
 '<ellipse cx="215" cy="180" rx="110" ry="150" stroke-width=".7" transform="rotate(30 215 180)"/>',
 '<path d="M215 10 V350 M40 180 H390" stroke-width=".6"/>'];
function innerMap(n){return`<svg class="map" viewBox="0 0 410 360" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><g fill="none" stroke="#E79A66">${MAP.slice(0,n).map((p,i)=>p.replace('<path','<path class="'+(i<n-1?'done':'')+'"').replace('<ellipse','<ellipse class="'+(i<n-1?'done':'')+'"')).join('')}</g><circle cx="215" cy="180" r="5" fill="#C96B3A" stroke="#FFF8EF" stroke-width="2"/></svg>`}
function progress(st,frac){return`<div class="prog" aria-hidden="true">${[1,2,3,4,5,6].map(i=>`<i><b style="width:${i<st?100:i===st?Math.round(frac*100):0}%"></b></i>`).join('')}</div>`}
function hdr(mid){return`<div class="hdr"><button class="icb" id="back" aria-label="Назад">←</button><div class="hmid">${mid}</div>${sndBtn()}</div>`}
function bindBack(){const b=$('#back');if(b)b.onclick=()=>{if(S.pos<=0){S.mode=S.book.seen?'book':'cover';S.book.view='menu';S.pos=-1;save();render()}else go(S.pos-1)}}
function stage(n){const st=UI.stages[n-1];
 app.innerHTML=`<section class="scr stage dark">${hdr('Этап '+n+' из 6')}<div class="scroll"><div class="art" style="background-image:url(${st.img})">${innerMap(n)}</div>
 <div class="body"><div class="lbl">Этап ${n}</div><h2>${esc(st.title)}</h2><p>${esc(st.text)}</p></div></div>
 <div class="foot"><span class="cnt">${esc(st.count)}</span><button class="btn round" id="next" aria-label="Далее">→</button></div></section>`;
 bindBack();$('#next').onclick=()=>go(S.pos+1);$('#next').focus({preventScroll:true})}
function stageFrac(id){const st=STAGEOF(id);const ids=F.filter(x=>STAGEOF(x)===st&&!x.startsWith('ST'));return(ids.indexOf(id)+1)/ids.length}
function question(id){const m=model(id);if(!m){go(S.pos+1);return}
 const st=STAGEOF(id),a=S.ans[id]||{};let body='';
 if(m.type==='text'){body=`<textarea class="txt" id="ftxt" rows="2" maxlength="300" placeholder="Ваша фраза">${esc(a.x||'')}</textarea>`}
 else{const ord=m.ord||[...m.o.keys()];const short=m.type==='single'&&m.o.length<=6&&m.o.every(t=>t.length<=26);
  const cls=m.type==='scale'?'opts scale':short?'opts two':'opts';
  body=`<div class="${cls}" role="${m.type==='rank'?'group':'radiogroup'}">${ord.map(i=>{let on,mk='';
   if(m.type==='rank'){const k=(a.list||[]).indexOf(i);on=k>=0;mk=on?(i===m.excl?'✓':k+1):''}else{on=a.i===i&&!a.skip;mk=on?'✓':''}
   const bars=m.type==='scale'&&i<5?`<span class="bars">${[0,1,2,3].map(b=>`<i class="${b<i?'f':''}" style="height:${6+b*4}px"></i>`).join('')}</span>`:'';
   return`<button class="opt${m.type==='rank'?' sq':''}${on?' on':''}" data-i="${i}" role="${m.type==='rank'?'checkbox':'radio'}" aria-checked="${on}"><span class="mk">${mk}</span>${bars}<span>${esc(m.o[i])}</span></button>`}).join('')}</div>`;
  const oi=a.i;if(m.type==='single'&&oi!=null&&!a.skip&&isOther(m.o[oi]))body+=`<textarea class="txt" id="otxt" rows="1" maxlength="200" placeholder="Коротко, если хотите">${esc(a.x||'')}</textarea>`}
 const ok=m.type==='text'||(m.type==='rank'?(a.list||[]).length>0:a.i!=null&&!a.skip);
 const counter=st===0?'Вступление':'Этап '+st+' из 6';
 app.innerHTML=`<section class="scr q">${hdr(counter)}${progress(st,st?stageFrac(id):1)}<div class="sheet"><div class="scroll" id="sc">
  ${m.lead?`<p class="lead2">${esc(m.lead)}</p>`:''}<div class="slbl">${esc(m.label)}</div><h2 class="qt">${esc(m.q)}</h2>${m.hint?`<p class="hint">${m.hint}</p>`:''}${body}</div>
  <div class="qfoot">${m.noskip?'<span></span>':`<button class="skip" id="skip">${m.type==='text'?'Пропустить':'Пропустить'}</button>`}<button class="btn round" id="next" aria-label="Далее" ${ok?'':'disabled'}>→</button></div></div></section>`;
 bindBack();
 document.querySelectorAll('.opt').forEach(b=>b.onclick=()=>{const i=+b.dataset.i;const cur=S.ans[id]||{};
  if(m.type==='rank'){let l=(cur.list||[]).slice();const k=l.indexOf(i);
   if(k>=0)l.splice(k,1);else if(i===m.excl)l=[i];else{l=l.filter(x=>x!==m.excl);if(l.length>=m.max){toast('Можно выбрать до трех');return}l.push(i)}
   S.ans[id]={list:l}}else S.ans[id]={i,x:cur.i===i?cur.x:''};
  save();const y=$('#sc').scrollTop;question(id);$('#sc').scrollTop=y;
  if(m.type==='single'&&!isOther(m.o[i])){} else{const t=$('#otxt');t&&t.focus()}});
 const grow=t=>{t.style.height='auto';t.style.height=t.scrollHeight+'px'};
 const ot=$('#otxt');if(ot){grow(ot);ot.oninput=()=>{grow(ot);S.ans[id].x=ot.value;save()}}
 const ft=$('#ftxt');if(ft){grow(ft);ft.oninput=()=>{grow(ft);S.ans[id]={x:ft.value};save()}}
 $('#next').onclick=()=>{if(m.type==='text'&&!S.ans[id])S.ans[id]={x:''};go(S.pos+1)};
 const sk=$('#skip');if(sk)sk.onclick=()=>{S.ans[id]={skip:true};go(S.pos+1)}}
function practice(){app.innerHTML=`<section class="scr stage dark">${hdr('Точка сборки')}<div class="scroll"><div class="art" style="background-image:url(img/stage6.webp);height:34%">${innerMap(6)}</div>
 <div class="body"><div class="lbl">Короткая практика</div><h2>Точка сборки</h2><p>${esc(DATA.S.practice)}</p><p style="margin-top:12px;color:#e2c6a8;font-size:15px">${esc(DATA.S.practiceNote)}</p></div></div>
 <div class="foot"><span class="cnt">Готово?</span><button class="btn" id="next">Собрать карту →</button></div></section>`;bindBack();$('#next').onclick=()=>go(S.pos+1)}
function analysis(){app.innerHTML=`<section class="scr an dark">${hdr('Анализ')}<div class="scroll"><div style="width:220px;height:200px;position:relative" class="stage">${innerMap(6)}</div>
 <h2>Сопоставляем<br>Ваши ответы</h2><ul class="steps"><li>Жизненные ситуации</li><li>Привычные реакции</li><li>Режим взаимодействия</li><li>Ваши проверки</li></ul></div>
 <div class="foot"><span></span><button class="btn" id="next" ${RM?'':'disabled'}>Посмотреть результат →</button></div></section>`;bindBack();
 const li=[...document.querySelectorAll('.steps li')];li.forEach((l,k)=>setTimeout(()=>l.classList.add('ok'),RM?0:450*(k+1)));
 setTimeout(()=>{const n=$('#next');if(n)n.disabled=false},RM?0:2000);$('#next').onclick=()=>go(S.pos+1)}

/* ---------- result (разделы 10–13) ---------- */
function build(){const f=finalize(),RA=DATA.RA,out={f};const unclear=f.aStatus==='unclear';
 out.unclear=unclear;out.A=unclear?RA.U:RA[f.focus];out.A2=f.aStatus==='mixed'?RA[f.focus===f.t1?f.t2:f.t1]:null;
 const per=picked('S1');out.stress=per===2;
 // основание
 if(!unclear&&f.v01[f.focus]&&f.v01[f.focus]!=='none'){const N=f.sit[f.focus]+(f.focus in f.a11rank?0:0),M=1+(f.v02[f.focus]>=1?1:0);
  if(N>0)out.basis=`Вы отметили это ощущение в ${N} ${plural(N,['ситуации','ситуациях','ситуациях'])} и ${M} ${plural(M,['сфере','сферах','сферах'])} жизни.`}
 out.cons=f.cons==='low'?'Пока недостаточно совпадений, чтобы выделить один фон.':'Вы описали похожий финал в нескольких разных ситуациях.'+(f.cons==='medium'?' Часть совпадений еще стоит проверить в жизни.':'');
 out.B=f.bStatus!=='unclear'?f.B1:null;out.Bb=f.bStatus==='mixed'?f.B2:null;
 // связка
 const Ac=f.focus,Bc=out.B,Bi=Bc?+Bc.slice(1)-1:-1,neg=Ac&&Ac!=='A12';
 if(!unclear&&Bc){if(Ac==='A12'&&Bc!=='B8')out.link=`В целом Вы описываете внутреннюю опору, но в некоторых ситуациях включается способ «${lc(DATA.codesB[Bc].name)}». Его можно исследовать отдельно.`;
  else if(Bc==='B8'&&neg)out.link='В качестве опоры у Вас уже есть привычка прояснять ситуацию и действовать по фактам. Она может помочь проверять знакомое ощущение, а не принимать его за единственно возможный итог.';
  else if((f.v05==='reinforcing'||f.v05==='cost')&&Bc===f.b1&&neg)out.link=`Когда появляется ощущение «${phraseA(Ac)}», Вы можете узнать в себе ход «${DATA.MX[Ac][Bi]}». Если после этого снова возникает «${phraseA(Ac)}», привычный круг замыкается. По Вашим ответам это возможная закономерность; проверьте, узнаете ли Вы ее в конкретных ситуациях.`}
 out.causalOk=(f.v05==='reinforcing'||f.v05==='cost');
 // цепочка
 if(!unclear){const fs=f.firstSit[Ac];out.chain=[{k:'Событие',t:fs?fs.q:'Знакомая ситуация'},{k:'Мысль',t:fs?'«'+fs.t+'»':'«'+phraseA(Ac)+'»'},{k:'Реакция',t:Bc?DATA.MX[Ac][Bi]:'привычная реакция пока не выделилась'},{k:'Эмоциональный итог',t:'«'+phraseA(Ac)+'»'}];out.hot=Bc?2:1}
 out.C=DATA.RC[f.mode];
 const P=DATA.P[f.branch];out.P=P.qs.map((q,k)=>{const pid='P'+(k+1)+':'+f.branch,i=picked(pid);return i==null?null:{q:q.q,a:q.o[i]+((S.ans[pid]||{}).x?': '+S.ans[pid].x:'')}}).filter(Boolean);
 const d=k=>{const q=DATA.D[k],a=S.ans[q.id];if(!a||a.skip||a.i==null)return null;let t=q.o[a.i].t;if(isOther(t)&&a.x)t=a.x;return t};
 out.D1=d(0);out.D2=d(1);out.D3=d(2);
 const fr=S.ans.VF;out.quote=fr&&fr.x&&fr.x.trim()?fr.x.trim():null;
 // что еще проверить
 const chk=[];if(!unclear&&f.t2&&!out.A2)chk.push(`В ответах также встречалось ощущение «${phraseA(f.focus===f.t1?f.t2:f.t1)}». Посмотрите, в каких ситуациях оно появляется.`);
 const v03=picked('V03');if(v03===4)chk.push('Вы отметили, что ситуация в действительности была неблагоприятной. Иногда знакомое чувство точно отражает реальные условия, а не только привычный взгляд.');
 if(v03===1||v03===2)chk.push('Проверьте, замечаете ли Вы хорошие исходы так же внимательно, как неприятные.');
 const v04=picked('V04');if(v04===4)chk.push('В некоторых ситуациях у Вас есть прямые доказательства. Стоит отделять такие случаи от тех, где решает первая догадка.');
 if(f.bStatus!=='unclear'&&!out.causalOk)chk.push('Ваш привычный способ реагировать может поддерживать этот финал, но не обязательно его вызывает. Это стоит проверить на конкретных эпизодах.');
 if(out.stress)chk.push('Вы отвечали в сложный период. Острый стресс может усиливать отдельные ответы, поэтому результат стоит перепроверить позже.');
 if(unclear)chk.push('Попробуйте понаблюдать за конкретной сферой жизни 10–14 дней и пройти исследование еще раз.');
 out.check=chk;return out}
const card=(k,h,body,cls='')=>`<article class="card ${cls}">${k?`<div class="k">${k}</div>`:''}${h?`<h3>${h}</h3>`:''}${body}</article>`;
let star=0;
function result(){const R=build(),f=R.f;if(!result._p){result._p=1;setTimeout(SND.warm,250)}if(!S.book.done){S.book.done=true;S.book.open=true;save()}
 const orbT=R.unclear?'Фон пока не выделился':(R.f.focus==='A12'?'Внутренняя опора':phraseA(R.f.focus).replace(/[«»]/g,''));
 let h=`<section class="scr res dark">${hdr('Ваш результат')}<div class="scroll" id="sc"><div class="hero"><div class="t">Ваша внутренняя карта</div>
 <div class="orb"><div class="blob"></div></div><div class="orbl"><small>${R.unclear?'Результат исследования':'Ваше ведущее фоновое состояние'}</small><strong>${esc(orbT)}</strong></div>
 <div class="chips">${R.B?`<div class="pill"><small>Поддерживающий сценарий</small><b>${esc(DATA.codesB[R.B].name)}${R.Bb?' · '+esc(DATA.codesB[R.Bb].name):''}</b></div>`:''}
 <div class="pill"><small>Режим взаимодействия</small><b>${esc(R.C.name)}</b></div></div><p class="cons">${esc(R.cons)}</p></div><div class="cards">`;
 h+=card(R.unclear?'Фоновое состояние':'Ведущее фоновое состояние',esc(R.A.head),`${R.basis?`<p><b>${esc(R.basis)}</b></p>`:''}<p>${esc(R.A.text)}</p><div class="newp">Новая точка: «${esc(R.A.point)}»</div>`);
 if(R.A2)h+=card('Второе близкое состояние',esc(R.A2.head),`<p>${esc(R.A2.text)}</p><div class="newp">Новая точка: «${esc(R.A2.point)}»</div>`);
 if(R.B){h+=card('Что может поддерживать этот сценарий',esc(DATA.codesB[R.B].name),`<p>${esc(DATA.RB[R.B].text)}</p>${R.Bb?`<p><b>${esc(DATA.codesB[R.Bb].name)}.</b> ${esc(DATA.RB[R.Bb].text)}</p>`:''}${R.link?`<div class="newp" style="font-weight:600">${esc(R.link)}</div>`:''}`)}
 if(R.chain)h+=card('Возможная цепочка','Событие → Мысль → Реакция → Итог',`<div class="chain">${R.chain.map((c,i)=>`${i?'<div class="arrow">↓</div>':''}<div class="ch${i===R.hot?' hot':''}"><span class="n">${i+1}</span><div><small>${c.k}${i===R.hot?' · точка изменения':''}</small>${esc(c.t)}</div></div>`).join('')}</div><button class="btn wide" id="sw" style="margin-top:14px">Ваша точка переключения →</button>`,'accent');
 h+=card('Как Вы сейчас реагируете',esc(R.C.name),`<p>${esc(R.C.text)}</p><p class="small">Режим описывает ответы за выбранный период и не является оценкой человека.</p>`);
 h+=card('Где находится точка переключения',esc(R.A.point),`${R.P.length?`<ul class="li">${R.P.map(p=>`<li>${esc(p.a)}</li>`).join('')}</ul>`:'<p>Вы пропустили вопросы о переключении. К ним можно вернуться при повторном прохождении.</p>'}${R.B&&R.B!=='B8'?`<div class="newp">${esc(swt(R.B))}</div>`:''}${R.unclear?'':'<button class="btn light wide" id="sw2" style="margin-top:14px">Попробовать новый способ →</button>'}`);
 if(R.D1)h+=card('Какое состояние Вы хотите развивать',esc(R.D1.split(':')[0]),`<p>${esc(R.D1)}</p>`);
 if(R.D2)h+=card('Ваш первый признак перемен','',`<p class="quote">${esc(R.D2)}</p>`);
 if(R.D3)h+=card('Один шаг на ближайшие два дня','',`<p class="quote">${esc(R.D3)}</p>`,'accent');
 if(R.quote)h+=card('Ваша фраза','',`<p class="quote">«${esc(R.quote)}»</p>`);
 if(R.check.length)h+=card('Что еще стоит проверить','',R.check.map(c=>`<p>${esc(c)}</p>`).join(''));
 h+=card('Практика','Точка сборки',`<p>${esc(DATA.S.practice)}</p><p class="small">${esc(DATA.S.practiceNote)}</p>`);
 h+=card('','Насколько исследование попало в точку?',`<div class="stars">${[1,2,3,4,5].map(n=>`<button class="star" data-star="${n}" aria-label="${n} из 5">★</button>`).join('')}</div><textarea class="txt" id="fbText" rows="2" placeholder="Что попало в точку, а что не похоже на Вас? (необязательно)"></textarea><button class="btn wide" id="fbSend" style="margin-top:12px" disabled>Отправить отзыв</button><p class="small">Отправляются только оценка и этот текст.</p><div id="fbMsg" class="small"></div>`);
 h+=card('Продолжение практикума','Читайте дальше с Вашим результатом',`<p>Следующие главы теперь открыты. Вот где искать ответы именно для Вашей карты:</p><div class="chain">${chLinks(R).map(([n,why])=>`<button class="ch" data-ch="${n}" style="text-align:left;width:100%"><span class="n">${n+1}</span><div><small>${esc(why)}</small>${esc(BOOK[n].t)}</div></button>`).join('')}</div><button class="btn wide" id="cont" style="margin-top:14px">Продолжить чтение →</button>`,'accent');
 h+=`</div><div class="acts"><button class="btn wide" id="copy">Скопировать мою карту</button><button class="btn ghost wide" id="tomenu">В меню</button><button class="btn ghost wide" id="restart">Пройти заново</button>${donate()}</div>
 <p class="small">Это авторский инструмент саморефлексии, а не психологическая или медицинская диагностика. Если исследование вызвало сильное напряжение, бережно предложите себе поддержку специалиста.</p><p class="small">Майя Явь · Точка отсчета · по методу «Архитектура личности»</p></div></section>`;
 app.innerHTML=h;bindBack();
 const sw=()=>switchScreen(R);if($('#sw'))$('#sw').onclick=sw;if($('#sw2'))$('#sw2').onclick=sw;
 document.querySelectorAll('[data-star]').forEach(b=>b.onclick=()=>{star=+b.dataset.star;document.querySelectorAll('[data-star]').forEach(x=>x.classList.toggle('on',+x.dataset.star<=star));$('#fbSend').disabled=false});
 $('#fbSend').onclick=sendFb;
 $('#copy').onclick=()=>{const t=summary(R);(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).catch(()=>{const a=document.createElement('textarea');a.value=t;document.body.append(a);a.select();document.execCommand('copy');a.remove()}).finally(()=>toast('Карта скопирована'))};
 $('#restart').onclick=startTest;$('#cont').onclick=()=>openView('ch:8');$('#tomenu').onclick=()=>openView('menu');document.querySelectorAll('[data-ch]').forEach(b=>b.onclick=()=>openBook(+b.dataset.ch))}
function switchScreen(R){if(!R.chain){return}const fs=R.chain;
 const m=document.createElement('div');m.className='modal';m.innerHTML=`<div class="card" role="dialog" aria-modal="true" aria-label="Ваша точка переключения"><div class="k">Переключатель</div><h3>Ваша точка переключения</h3>
 <div class="chain">${fs.map((c,i)=>`${i?'<div class="arrow">↓</div>':''}<div class="ch${i===R.hot?' hot':''}"><span class="n">${i+1}</span><div><small>${c.k}</small>${esc(c.t)}</div></div>`).join('')}</div>
 <p style="margin-top:14px"><b>Привычная мысль:</b> ${esc(fs[1].t)}</p><div class="newp">Новая возможность: «${esc(R.A.point)}»</div>
 <div id="how"></div><button class="btn wide" id="try" style="margin-top:14px">Попробовать новый способ →</button><button class="btn ghost wide" id="cls" style="margin-top:10px">Вернуться к карте</button></div>`;
 app.querySelector('.scr').append(m);
 m.querySelector('#try').onclick=()=>{m.querySelector('#how').innerHTML=`<p style="margin-top:14px">${R.B&&R.B!=='B8'?esc(swt(R.B))+' ':''}${esc(DATA.S.practice)}</p>${R.D3?`<div class="newp">Ваш шаг на два дня: ${esc(R.D3)}</div>`:''}`;m.querySelector('#try').remove()};
 m.querySelector('#cls').onclick=()=>m.remove();m.onclick=e=>{if(e.target===m)m.remove()}}
function sendFb(){const b=$('#fbSend');b.disabled=true;$('#fbMsg').textContent='Отправляем...';
 fetch('https://formsubmit.co/ajax/zhiza24@gmail.com',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},
  body:JSON.stringify({_subject:'Отзыв: Точка отсчета',_template:'table',_captcha:'false','Оценка':star+' из 5','Отзыв':($('#fbText').value||'').slice(0,2000)})})
 .then(r=>r.ok?r.json():Promise.reject()).then(()=>{$('#fbMsg').textContent='Спасибо! Ваш отзыв отправлен.'}).catch(()=>{$('#fbMsg').textContent='Не получилось отправить. Попробуйте позже.';b.disabled=false})}
function summary(R){const L=['Точка отсчета · Майя Явь','',R.A.head,R.A.text,'Новая точка: «'+R.A.point+'»'];
 if(R.A2)L.push('',R.A2.head,'Новая точка: «'+R.A2.point+'»');
 if(R.B)L.push('','Что может поддерживать: '+DATA.codesB[R.B].name,DATA.RB[R.B].text);if(R.link)L.push(R.link);
 if(R.chain)L.push('','Цепочка: '+R.chain.map(c=>c.k+': '+c.t).join(' → '));
 L.push('','Режим: '+R.C.name,R.C.text);
 if(R.P.length)L.push('','Точка переключения:',...R.P.map(p=>'— '+p.a));
 if(R.D1)L.push('','Состояние: '+R.D1);if(R.D2)L.push('Первый признак: '+R.D2);if(R.D3)L.push('Шаг на два дня: '+R.D3);
 if(R.quote)L.push('','Моя фраза: «'+R.quote+'»');
 L.push('','Точка сборки: '+DATA.S.practice);return L.join('\n')}
function toast(t){const d=document.createElement('div');d.className='toast';d.textContent=t;document.body.append(d);setTimeout(()=>d.remove(),2000)}
const swt=b=>{let t=(DATA.RB[b].text.split('Переключатель: ')[1]||'').trim();t=t.charAt(0).toUpperCase()+t.slice(1);return t&&!/[.!?]$/.test(t)?t+'.':t};
/* ---------- практикум (лендинг) ---------- */
const CHIMG=['img/cover.webp','img/stage1.webp','img/stage2.webp','img/stage1.webp','img/stage3.webp','img/stage5.webp','img/stage4.webp','img/stage2.webp','img/stage4.webp','img/stage5.webp','img/stage6.webp','img/stage6.webp'];
function chLinks(R){const l=[];if(!R.unclear)l.push([7,'Как работает Ваш ведущий узор']);else l.push([7,'Как искать повторяющийся финал']);
 if(R.B)l.push([4,'Почему внимание находит подтверждения']);l.push([5,'Ваш режим: '+R.C.name]);l.push([8,'Ваша точка переключения']);l.push([9,'Практика для состояния «Я есмь»']);if(R.D1)l.push([10,'Как закрепить: '+R.D1.split(':')[0]]);return l}
function chapter(n,extra=''){const c=BOOK[n],items=c.p,html=items.map(para);let cut=0,len=0;for(;cut<items.length&&len<700;cut++)len+=items[cut].length;
 const long=items.length-cut>3;
 return`<section class="chap" id="ch${n}"><div class="chimg" style="background-image:url(${CHIMG[n]})"></div><div class="chin"><div class="k">Глава ${n+1}</div><h3>${esc(c.t)}</h3><div class="chsub">${esc(c.s)}</div>${extra}
 <div class="txtb">${long?html.slice(0,cut).join('')+`<details><summary>Читать главу полностью</summary>${html.slice(cut).join('')}</details>`:html.join('')}</div></div></section>`}
function plan60(R){const ph=R.unclear?'знакомое чувство':'«'+phraseA(R.f.focus)+'»';
 const mx=!R.unclear&&R.B?DATA.MX[R.f.focus][+R.B.slice(1)-1]:null;const sw=R.B&&R.B!=='B8'?swt(R.B):'';
 const st=R.D1?R.D1.split(':')[0]:'выбранное состояние';
 return[{d:'Дни 1–20',t:'Замечать',p:[`Каждый раз, когда появляется ${ph}, остановитесь и назовите: «Я замечаю знакомый финал».`,mx?`Отмечайте момент, когда включается привычный ход: «${mx}».`:'Отмечайте, в каких ситуациях это происходит чаще всего.','Вечером запишите одну ситуацию за день. Без оценки, как исследователь.']},
 {d:'Дни 21–40',t:'Выбирать',p:['В момент узнавания сделайте «Точку сборки»: опора, дыхание, вопрос «Что сейчас в моих силах?».',`Новая возможность: «${R.A.point}»`,sw?'Ваш переключатель: '+sw:'Выберите один небольшой обратимый шаг вместо привычной реакции.',R.D3?'Ваш шаг: '+R.D3:'']},
 {d:'Дни 41–60',t:'Закреплять',p:[`Первое решение дня: еще до телефона выберите состояние «${st}».`,R.D2?`Отмечайте первый признак: «${R.D2}».`:'Отмечайте, где этого состояния стало хотя бы на 10% больше.','Повторяемое состояние становится новой нормой: важно не идеально, а каждый день.']}]}
function dots(){let m={};try{m=JSON.parse(localStorage.getItem('arch_60')||'{}');if(!m||typeof m!=='object'||Array.isArray(m))m={}}catch(e){m={}}return m}
function para(p,i,arr){if(p==='KEY')return'';const key=arr[i-1]==='KEY';
 if(key)return`<div class="key"><small>🔑 Ключ Архитектуры личности</small>${esc(p)}</div>`;
 if(p[0]==='#'){const t=p.slice(1);if(t.startsWith('✦'))return`<h4 class="pr" id="a${i}">${esc(t)}</h4>`;return t.length<60?`<h4 id="a${i}">${esc(t)}</h4>`:`<p><b>${esc(t)}</b></p>`}
 if(/^(—|–|●|•|\d+\))/.test(p))return`<p class="li2">${esc(p.replace(/^[●•]\s*/,''))}</p>`;
 if(/→/.test(p)&&p.length<160)return`<p class="flow">${esc(p)}</p>`;
 return`<p>${esc(p)}</p>`}
function getR(){if(!(S.book.done&&S.ans&&Object.keys(S.ans).length>5))return null;try{return build()}catch(e){return null}}
function openBook(t){if(t==='bridge')return openView('ch:8');if(typeof t==='number'&&t>0)return openView('ch:'+t);openView('menu')}
function openView(v){S.mode='book';S.book.seen=true;S.book.view=v;save();render();const sc=$('#bk');if(sc)sc.scrollTop=0}
const ITEMS=()=>{const L=[];TREE().forEach((g,gi)=>g.dir?L.push({v:'grp:'+gi,t:g.t}):g.k?g.k.forEach(x=>L.push({v:x.v,t:x.t})):L.push({v:g.v,t:g.t}));return L};
const SUBS={3:[[5,'Принцип 4. Формирование узора'],[11,'Принцип 5. Первая модель — эталон'],[24,'Принцип 6. Адаптация — автоматизм'],[30,'Смещение центра внимания']],
 4:[[6,'Принцип 8. Внимание формирует реальность'],[19,'Принцип 9. Состояние задает направление'],[53,'Мозг не противник'],[76,'Настоящий момент — точка выбора']],
 5:[[6,'Принцип 10. Позиция и реальность'],[16,'Принцип 11. Момент — точка выбора'],[25,'Центр — Я'],[61,'Карта путешествия']],
 6:[[4,'Перестаньте «чинить» себя'],[21,'Принцип 7. Самоценность прежде оценки']]};
const SEC=n=>{const L=SUBS[n],o=[];if(L[0][0]>0)o.push({a:0,t:'Вступление к уровню'});L.forEach(([j,t])=>o.push({a:j,t}));o.forEach((x,k)=>x.b=k+1<o.length?o[k+1].a:BOOK[n].p.length);return o};
const LVN={3:['УРОВЕНЬ 1','СОЗДАНИЕ УЗОРА'],4:['УРОВЕНЬ 2','ФОКУС ВНИМАНИЯ'],5:['УРОВЕНЬ 3','НОВАЯ ПОЗИЦИЯ'],6:['УРОВЕНЬ 4','ПЕРЕСБОРКА УЗОРА']};
const lv=n=>({l:LVN[n][0],t:LVN[n][1],cls:'mlv',dir:1,k:SEC(n).map((x,k)=>({v:`sec:${n}:${k}`,t:x.t}))});
const TREE=()=>[{l:'ПРАКТИКУМ',t:'ВВЕДЕНИЕ',cls:'mintro',dir:1,k:[{v:'ch:1',t:BOOK[1].t},{v:'ch:2',t:BOOK[2].t}]},
 lv(3),lv(4),lv(5),lv(6),
 {l:'ИССЛЕДОВАНИЕ',t:'ПРОЙТИ ТЕСТ',cls:'mtest',k:[{v:'ch:7',t:BOOK[7].t},{v:'test',t:'Тест «Точка отсчета»'}]},
 {l:'ЕЖЕДНЕВНО',t:'ПРАКТИКИ',cls:'mpr',k:[{v:'ch:9',t:'Практика «Я есмь»'},{v:'pr:sborka',t:'Точка сборки'},{v:'pr:60',t:'Личная практика на 60 дней'}]},
 {l:'ПОСЛЕ ТЕСТА',t:'НОВАЯ ТОЧКА СБОРКИ',cls:'mgold',dir:1,k:[{v:'ch:8',t:BOOK[8].t},{v:'ch:10',t:BOOK[10].t}]},
 {l:'ЗАВЕРШЕНИЕ',t:'КАРТА ПРОЙДЕННОГО ПУТИ',cls:'mmap',v:'ch:11'}];
const donate=()=>`<a class="btn ghost wide donate" href="${esc(DONATE_URL||'#')}" target="_blank" rel="noopener">Поддержать автора ♥</a>`;
function book(){let v=S.book.view||'menu';if(/^(ch|sec):/.test(v)){const T=TREE();let hit=null;T.forEach((g,gi)=>{if(!g.dir)return;g.k.forEach((x,j)=>{if(x.v===v||(v.startsWith('ch:')&&x.v.startsWith('sec:'+v.slice(3)+':')&&hit==null))hit=[gi,x.v===v?j:0]})});if(hit){S.book.view=v='grp:'+hit[0];S.book.sj=hit[1];save()}}
 if(v.startsWith('grp:'))return grpView(+v.slice(4));if(v.startsWith('ch:')){const[a,b]=v.slice(3).split('@');chView(+a);if(b){const e=document.getElementById('a'+b);e&&setTimeout(()=>e.scrollIntoView({block:'start'}),30)}return}if(v.startsWith('pr:'))return prView(v.slice(3));if(v.startsWith('sec:')){const[,n,k]=v.split(':');return secView(+n,+k)}
 const R=getR(),c=BOOK[0];let h=`<section class="scr dark bookscr"><div class="hdr"><button class="icb" id="bback" aria-label="На обложку">←</button><div class="hmid">Практикум</div>${sndBtn()}</div><div class="scroll" id="bk">
 <div class="bhero"><div class="lbl">Майя Явь · метод «Архитектура личности»</div><h2>Точка<br>отсчета</h2></div><div class="cards">
 <section class="chap"><div class="chin"><div class="k">Глава 1</div><h3>${esc(c.t)}</h3><div class="txtb">${c.p.map(para).join('')}</div></div></section>
 <div class="menu" role="list">${TREE().map((g,gi)=>{const one=!g.k||g.dir;if(g.dir)g.v='grp:'+gi;const cls=g.cls||'';const head=`<button class="mi ${cls}" ${one?`data-v="${g.v}"`:`data-g="${gi}" aria-expanded="${S.book.og===gi}"`} role="listitem"><span class="mt2"><small>${esc(g.l)}</small><b>${esc(g.t)}</b></span><span class="ma">${one?'›':'⌄'}</span></button>`;
  return one?head:`<div class="grp${S.book.og===gi?' open':''}">${head}<div class="sub"><div class="subin">${g.k.map(x=>`<button class="mi ms ${x.cls||cls}" data-v="${x.v}"><span class="mt">${esc(x.t)}</span><span class="ma">›</span></button>`).join('')}</div></div></div>`}).join('')}</div>
 ${donate()}</div><p class="small">Майя Явь · Точка отсчета · по методу «Архитектура личности»</p></div></section>`;
 app.innerHTML=h;$('#bback').onclick=()=>{S.mode='cover';save();render()};
 document.querySelectorAll('[data-g]').forEach(b=>b.onclick=()=>{const gi=+b.dataset.g,open=S.book.og===gi;document.querySelectorAll('.grp').forEach(g=>g.classList.remove('open'));document.querySelectorAll('[data-g]').forEach(x=>x.setAttribute('aria-expanded','false'));if(!open){b.parentNode.classList.add('open');b.setAttribute('aria-expanded','true');S.book.og=gi}else S.book.og=-1;save()});
 document.querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>{const v=b.dataset.v;if(v==='test'){if(S.book.done){S.mode='test';S.pos=flow().length-1;save();render()}else if(S.pos>0&&Object.keys(S.ans).length){S.mode='test';save();render()}else startTest();return}openView(v)});
 const sc=$('#bk');sc.scrollTop=S.book.y||0;let t;sc.onscroll=()=>{clearTimeout(t);t=setTimeout(()=>{S.book.y=sc.scrollTop;save()},200)}}
function navFoot(v){const L=ITEMS().map(i=>i.v),k=L.indexOf(v),pv=L[k-1],nx=L[k+1],lab=x=>{const i=ITEMS().find(y=>y.v===x);return i?i.t:''};
 return`<div class="nav2">${pv?`<button class="btn ghost" data-v="${pv}">← ${pv.startsWith('grp:')?'Предыдущий уровень':'Назад'}</button>`:'<span></span>'}${nx?`<button class="btn" data-v="${nx}">Следующий →</button>`:''}</div><button class="btn ghost wide" data-v="menu" style="margin-top:10px">В меню</button><a class="dlink" href="${esc(DONATE_URL||'#')}" target="_blank" rel="noopener">Поддержать автора ♥</a>`}
function shell(title,body,v){app.innerHTML=`<section class="scr dark bookscr"><div class="hdr"><button class="icb" id="bback" aria-label="В меню">←</button><div class="hmid">${esc(title)}</div>${sndBtn()}</div><div class="scroll" id="bk"><div class="cards">${body}${navFoot(v)}</div><p class="small">Майя Явь · Точка отсчета</p></div></section>`;
 $('#bback').onclick=()=>openView('menu');document.querySelectorAll('.nav2 [data-v],[data-v="menu"],.stp [data-v]').forEach(b=>b.onclick=()=>{const x=b.dataset.v;if(x==='test'){startTestOr();return}openView(x)})}
function startTestOr(){if(S.book.done){S.mode='test';S.pos=flow().length-1;save();render()}else if(S.pos>0&&Object.keys(S.ans).length){S.mode='test';save();render()}else startTest()}
function chExtra(n,R){let extra='';if(R){if(n===7)extra=`<div class="newp">Ваш ведущий узор: ${esc(R.A.head)}</div>`;if(n===4&&R.B)extra=`<div class="newp">Ваш поддерживающий сценарий: ${esc(DATA.codesB[R.B].name)}</div>`;if(n===5)extra=`<div class="newp">Ваш режим: ${esc(R.C.name)}</div>`;
  if(n===8)extra=`<div class="newp">Ваша новая точка: «${esc(R.A.point)}»${R.chain?'<br>Точка переключения: '+esc(R.chain[R.hot].t):''}</div>`;if(n===9&&R.D1)extra=`<div class="newp">Ваше состояние для практики: ${esc(R.D1)}</div>`;if(n===10&&R.D3)extra=`<div class="newp">Ваш шаг на два дня: ${esc(R.D3)}</div>`}return extra}
function chView(n){const R=getR();let extra='';extra=chExtra(n,R);
 const c=BOOK[n],cta=n===7&&!R?`<div class="cta" style="margin-top:14px"><div class="chin"><div class="lbl">Самое время</div><h3>Исследование «Точка отсчета»</h3><p>Вы прочитали, как устроен ведущий внутренний узор. Теперь найдите свой.</p><button class="btn wide" data-v="test" id="ctat">Пройти тест →</button></div></div>`:'';
 shell('Глава '+(n+1),`<section class="chap"><div class="chimg" style="background-image:url(${CHIMG[n]})"></div><div class="chin"><div class="k">Глава ${n+1}</div><h3>${esc(c.t)}</h3><div class="chsub">${esc(c.s)}</div>${stp('ch:'+n)}${extra}<div class="txtb">${c.p.map(para).join('')}</div>${cta}</div></section>`,'ch:'+n);
 const ct=$('#ctat');ct&&(ct.onclick=startTestOr)}
function stp(v){const g=TREE().find(g=>g.dir&&g.k.some(x=>x.v===v));if(!g)return'';const i=g.k.findIndex(x=>x.v===v);
 return`<div class="stp"><div class="stpn">${i+1} из ${g.k.length}</div><div class="stpd">${g.k.map((x,j)=>`<button class="sd${j===i?' on':''}${j<i?' past':''}" data-v="${x.v}" title="${esc(x.t)}" aria-label="${j+1}. ${esc(x.t)}"></button>`).join('')}</div></div>`}
const SL=t=>{if(/^Вступление/.test(t))return'Вступление';const m=/^Принцип (\d+)/.exec(t);if(m)return'Принцип '+m[1];const w=t.replace(/[«»]/g,'').split(' ');return w.slice(0,w[0].length<5?2:1).join(' ')};
function grpView(gi){const R=getR(),g=TREE()[gi];
 const blocks=g.k.map((x,j)=>{let h='',body='';
  if(x.v.startsWith('sec:')){const[,n,k]=x.v.split(':').map(Number),c=BOOK[n],L=SEC(n),z=L[k],hp=c.p[z.a],dup=hp&&hp[0]==='#';const ttl=dup?hp.slice(1).replace(/^✦\s*/,''):z.t;
   h=ttl;body=(k===0?chExtra(n,R):'')+c.p.map(para).slice(dup?z.a+1:z.a,z.b).join('')}
  else{const n=+x.v.slice(3);h=BOOK[n].t;body=`<div class="chsub">${esc(BOOK[n].s)}</div>${chExtra(n,R)}${BOOK[n].p.map(para).join('')}`}
  const bd=g.k.length>1?`<span class="snum">${j+1}</span>`:'';return`<section class="chap sect" id="s${j}"><div class="chin"><h3 class="sh">${bd}<span>${esc(h)}</span></h3><div class="txtb">${body}</div></div></section>`}).join('');
 const bar=g.k.length>1?`<nav class="sbar" aria-label="Разделы">${g.k.map((x,j)=>`<button class="sp" data-s="${j}" title="${esc(x.t)}" aria-label="${j+1}. ${esc(x.t)}"><b>${j+1}</b> ${esc(SL(x.t))}</button>`).join('')}</nav>`:'';
 const hero=`<section class="chap ghero"><div class="chimg" style="background-image:url(${CHIMG[+g.k[0].v.split(':')[1]]})"></div><div class="chin"><div class="k">${esc(g.l)}</div><h2 class="gt">${esc(g.t)}</h2></div></section>`;
 shell(g.l.charAt(0)+g.l.slice(1).toLowerCase(),hero+bar+blocks,'grp:'+gi);
 const sc=$('#bk');
 const nb=$('.sbar'),off=()=>nb?nb.offsetHeight+8:0,secs=[...document.querySelectorAll('.sect')];
 const Y=e=>e.getBoundingClientRect().top-sc.getBoundingClientRect().top+sc.scrollTop-off();
 const spy=()=>{if(!nb)return;let a=0;secs.forEach((e,j)=>{if(Y(e)<=sc.scrollTop+40)a=j});if(sc.scrollTop+sc.clientHeight>=sc.scrollHeight-4)a=secs.length-1;nb.querySelectorAll('.sp').forEach((b,j)=>{const was=b.classList.contains('on');b.classList.toggle('on',j===a);if(j===a&&!was)nb.scrollTo({left:b.offsetLeft-nb.clientWidth/2+b.offsetWidth/2,behavior:'smooth'})})};
 const go=(j,sm)=>{const e=secs[j];if(e)sc.scrollTo({top:Y(e),behavior:sm?'smooth':'auto'})};
 document.querySelectorAll('.sp').forEach(b=>b.onclick=()=>{click&&0;go(+b.dataset.s,1)});
 sc.addEventListener('scroll',spy,{passive:true});if(S.book.sj){go(S.book.sj,0);S.book.sj=0;save()}spy()}
function secView(n,k){const R=getR(),L=SEC(n),x=L[k]||L[0],c=BOOK[n];let extra='';
 if(R&&k===0){if(n===4&&R.B)extra=`<div class="newp">Ваш поддерживающий сценарий: ${esc(DATA.codesB[R.B].name)}</div>`;if(n===5)extra=`<div class="newp">Ваш режим: ${esc(R.C.name)}</div>`}
 const hp=c.p[x.a],dup=hp&&hp[0]==='#';const ttl=dup?hp.slice(1).replace(/^✦\s*/,''):x.t;const html=c.p.map(para).slice(dup?x.a+1:x.a,x.b).join('');
 shell(LVN[n][0],`<section class="chap"><div class="chimg" style="background-image:url(${CHIMG[n]})"></div><div class="chin"><div class="k">${LVN[n][0]} · ${esc(LVN[n][1])} · ${k+1}/${L.length}</div><h3>${esc(ttl)}</h3>${stp(`sec:${n}:${k}`)}${extra}<div class="txtb">${html}</div></div></section>`,`sec:${n}:${k}`)}
function prView(k){const R=getR();let body;
 if(k==='sborka')body=`<section class="chap"><div class="chimg" style="background-image:url(img/stage6.webp)"></div><div class="chin"><div class="k">Практика</div><h3>Точка сборки</h3><div class="txtb"><p>${esc(DATA.S.practice)}</p><p>${esc(DATA.S.practiceNote)}</p>${R&&R.D1?`<div class="newp">Ваше состояние: ${esc(R.D1)}</div>`:''}</div></div></section>`;
 else if(R){const m=dots();body=`<section class="card bonus" id="bonus"><div class="k">Практика · собрана из Ваших ответов</div><h3>Личная практика переключения на 60 дней</h3><p>Отмечайте каждый день, когда сделали практику: отметки хранятся только на этом устройстве.</p>
  ${plan60(R).map(x=>`<div class="phase"><div class="pd">${x.d}</div><h4>${x.t}</h4>${x.p.filter(Boolean).map(t=>`<p class="li2">— ${esc(t)}</p>`).join('')}</div>`).join('')}
  <div class="days" role="group" aria-label="Отметки дней">${Array.from({length:60},(_,i)=>`<button class="day${m[i+1]?' on':''}" data-day="${i+1}" aria-pressed="${!!m[i+1]}">${i+1}</button>`).join('')}</div></section>
  <section class="card closing"><p class="quote">Вы не уничтожаете старую версию себя. Вы возвращаете себе возможность выбирать, какой версией себя встречать жизнь дальше.</p><p class="small">С уважением к вашему пути,<br>Майя Явь</p></section>`}
 else body=`<section class="card lock"><div class="k">Практика</div><h3>Личная практика на 60 дней</h3><p>Она собирается из Ваших ответов: три этапа «Замечать — Выбирать — Закреплять» и дневник отметок. Пройдите тест, и практика появится здесь.</p><button class="btn wide" id="ctat">Пройти тест →</button></section>`;
 shell('Практика',body,'pr:'+k);const ct=$('#ctat');ct&&(ct.onclick=startTestOr);
 document.querySelectorAll('[data-day]').forEach(b=>b.onclick=()=>{const m=dots(),d=b.dataset.day;m[d]=!m[d];try{localStorage.setItem('arch_60',JSON.stringify(m))}catch(e){}b.classList.toggle('on',!!m[d]);b.setAttribute('aria-pressed',!!m[d])})}
function fab(){const old=$('#fab');old&&old.remove();if(S.mode==='cover'&&!S.entered)return;if(S.mode==='book'&&(S.book.view||'menu')==='menu')return;if(S.mode==='cover')return;
 const b=document.createElement('button');b.id='fab';b.className='fab';b.setAttribute('aria-label','В меню практикума');b.title='В меню';b.innerHTML='<span>☰</span>';
 b.onclick=()=>{if(S.mode==='test'&&!S.book.done&&S.pos>0)toast('Прогресс теста сохранен');openView('menu')};app.append(b)}

window.__arch={finalize,flow,state:()=>S};
render();

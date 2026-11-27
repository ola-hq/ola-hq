/* Unreleased OLA lore sample. Own canvas/state; production modules are read-only assets. */
(()=>{
'use strict';
const C=window.OLALoreCore,stage=document.querySelector('.globe-stage'),sky=document.querySelector('#living-sky'),ctx=sky.getContext('2d'),off=document.createElement('canvas'),offctx=off.getContext('2d'),motion=matchMedia('(prefers-reduced-motion: reduce)'),ship=document.querySelector('#passing-vessel'),star=document.querySelector('#star-26'),fly=C.createFlyby(),visits=C.createVisits();
let width=0,height=0,dpr=1,stars=[],frame=0,last=0,visible=true,energy=0,pointer={x:0,y:0},smooth={x:0,y:0},toastTimer=0,visitAbort=null,returnAllowed=true;
const $=s=>document.querySelector(s),modals=()=>!!document.querySelector('dialog[open]');
const active=()=>visible&&!document.hidden&&!modals();
const cabin=$('#cabin'),secret=$('#secret-room'),cabinScene=$('#cabin-scene'),secretImage=$('#secret-image'),secretTitle=$('#secret-title'),secretText=$('#secret-text'),worldDialog=$('#world-visit');
function toast(text,color='#cde9de'){const el=$('#return-greeting');clearTimeout(toastTimer);el.style.setProperty('--greeting-color',color);el.textContent=text;el.classList.add('is-visible');toastTimer=setTimeout(()=>{el.classList.remove('is-visible');el.textContent=''},6500)}
function openDialog(dialog){cancelAnimationFrame(frame);frame=0;last=0;fly.hold(true);dialog.showModal()}
function closeScene(){secret.hidden=true;cabinScene.hidden=false;$('#back-to-cabin').hidden=true}
function openCabin(){closeScene();openDialog(cabin)}
function openStar(){openDialog($('#star-message'))}
function showSecret(key){
 const data={chair:{cell:0,title:'The quiet deck.',text:'A photograph found its way here. Some moments travel further than we do.',world:'polaroid'},bar:{cell:1,title:'A song tucked between worlds.',text:'A Wave26 sleeve. A ticket from the Cinema Club. Someone has been here before.',world:'wave26'},window:{cell:2,title:'A route still being drawn.',text:'One teal coordinate keeps returning. The rest is a possibility, not a promise.',world:'simulation'}}[key];
 if(!data)return;cabinScene.hidden=true;secret.hidden=false;$('#back-to-cabin').hidden=false;secretImage.dataset.cell=data.cell;secretImage.setAttribute('aria-label',key==='chair'?'A secret pool deck inside the vessel':key==='bar'?'A hidden vinyl listening room':'The celestial navigation room');secretTitle.textContent=data.title;secretText.textContent=data.text;$('#follow-current').dataset.world=data.world;$('#map-star').hidden=key!=='window';
}
function endWorld(){visitAbort?.abort();visitAbort=null;const result=returnAllowed?visits.finish(performance.now()):null;visits.cancel();$('#world-frame-slot').replaceChildren();if(result)toast(result.greeting,result.color)}
async function visitWorld(key){
 const world=C.worlds[key];if(!world)return;
 if(cabin.open)cabin.close();const id=visits.begin(key,performance.now()),url=C.ORIGIN+world.path;
 $('#world-heading').textContent=world.name;$('#world-status').textContent='Opening this world…';$('#world-open').href=url;
 const frame=document.createElement('iframe');frame.title=world.name;frame.referrerPolicy='no-referrer';frame.setAttribute('allow','web-share');frame.src=url;
 let head=false,loaded=false;
 const update=()=>{if(visits.current()?.id!==id)return;if(head&&loaded)$('#world-status').textContent='Your world is open. Return when you are ready.'};
 frame.addEventListener('load',()=>{if(visits.current()?.id!==id)return;loaded=true;visits.loaded(id);update()},{once:true});
 $('#world-frame-slot').replaceChildren(frame);openDialog(worldDialog);
 visitAbort=new AbortController();const abort=visitAbort,timeout=setTimeout(()=>abort.abort(),8000);
 try{const response=await fetch(url,{method:'HEAD',credentials:'omit',mode:'cors',signal:abort.signal});if(visits.current()?.id===id&&response.ok&&C.matchesWorld(key,response.url)){head=true;visits.verified(id,response.url);update()}else if(visits.current()?.id===id)$('#world-status').textContent='This sample could not confirm the page. You can open the world separately.'}
 catch{if(visits.current()?.id===id)$('#world-status').textContent='This sample could not confirm the page. You can open the world separately.'}
 finally{clearTimeout(timeout)}
}
document.querySelectorAll('[data-secret]').forEach(b=>b.addEventListener('click',()=>showSecret(b.dataset.secret)));
document.querySelectorAll('[data-world]').forEach(b=>b.addEventListener('click',()=>visitWorld(b.dataset.world)));
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>document.getElementById(b.dataset.close).close()));
$('#back-to-cabin').addEventListener('click',()=>{closeScene();$('#chair').focus()});
$('#map-star').addEventListener('click',openStar);star.addEventListener('click',openStar);ship.addEventListener('click',openCabin);
ship.addEventListener('pointerenter',()=>fly.hold(true));ship.addEventListener('pointerleave',()=>{if(document.activeElement!==ship&&!modals())fly.hold(false)});
ship.addEventListener('pointerdown',()=>fly.hold(true));ship.addEventListener('focus',()=>fly.hold(true));ship.addEventListener('blur',()=>{if(!modals())fly.hold(false)});
document.querySelectorAll('dialog').forEach(dialog=>{dialog.addEventListener('close',()=>{if(dialog===worldDialog)endWorld();if(!modals()){fly.hold(document.activeElement===ship);start()}})});
$('#try-vessel').addEventListener('click',()=>{fly.summon();draw(performance.now());ship.focus()});
$('#try-star').addEventListener('click',()=>{star.focus();star.classList.add('is-noticed');setTimeout(()=>star.classList.remove('is-noticed'),2500)});
$('#direct-cabin').addEventListener('click',openCabin);
$('#phone-width').addEventListener('click',e=>{document.body.classList.toggle('phone-study');e.currentTarget.setAttribute('aria-pressed',String(document.body.classList.contains('phone-study')));resize()});
stage.addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;const r=stage.getBoundingClientRect();pointer={x:(e.clientX-r.left)/r.width-.5,y:(e.clientY-r.top)/r.height-.5}},{passive:true});
stage.addEventListener('pointerleave',()=>{pointer={x:0,y:0}});
window.OLACosmos=Object.freeze({travel(a,b){if(!active()||!Array.isArray(a)||!Array.isArray(b))return;const dot=Math.min(1,Math.abs(a.reduce((s,v,i)=>s+v*b[i],0)));const amount=2*Math.acos(dot);if(Number.isFinite(amount))energy=Math.min(1,energy+amount*1.8)}});
function resize(){
 const r=stage.getBoundingClientRect();width=r.width;height=r.height;dpr=Math.min(devicePixelRatio||1,1.5);
 for(const c of [sky,off]){c.width=Math.round(width*dpr);c.height=Math.round(height*dpr)}
 ctx?.setTransform(dpr,0,0,dpr,0,0);offctx?.setTransform(dpr,0,0,dpr,0,0);
 stars=Array.from({length:Math.min(210,Math.round(width*height/4600))},(_,i)=>({x:Math.random(),y:Math.random(),depth:[.2,.55,1][i%3],phase:Math.random()*Math.PI*2,r:.4+Math.random()*.8}));
 draw(performance.now());
}
function draw(now){
 if(!ctx||!offctx||!width||!height)return;ctx.clearRect(0,0,width,height);offctx.clearRect(0,0,width,height);
 const still=motion.matches;smooth.x+=(pointer.x-smooth.x)*.055;smooth.y+=(pointer.y-smooth.y)*.055;
 for(const s of stars){const drift=still?0:Math.sin(now/32000+s.phase)*4*s.depth;const x=s.x*width+(still?0:smooth.x*23*s.depth)+drift,y=s.y*height+(still?0:smooth.y*16*s.depth);ctx.globalAlpha=.25+s.depth*.32;ctx.fillStyle=s.depth===1?'#ecdfbb':'#bcd6df';ctx.beginPath();ctx.arc(x,y,s.r,0,Math.PI*2);ctx.fill()}
 window.OLAJourney?.sky(offctx,{width,height,level:4,now,reduced:still,energy});
 const pw=off.width/2,ph=off.height/2;
 for(let i=0;i<4;i++){const x=i%2,y=Math.floor(i/2);ctx.globalAlpha=C.constellationOpacity(now,i,still);ctx.drawImage(off,x*pw,y*ph,pw,ph,x*width/2,y*height/2,width/2,height/2)}
 ctx.globalAlpha=1;
 const f=fly.state();ship.hidden=!(still||f.visible);ship.style.left=(still?width*.12:-55+f.progress*width)+'px';ship.style.top=(height*.15+(still?0:Math.sin(f.progress*Math.PI)*height*.025))+'px';
 if(!still)energy*=.94;
}
function tick(now){frame=0;if(!active())return;if(!last||now-last>=40){const dt=last?now-last:40;last=now;if(!motion.matches)fly.step(dt);draw(now)}if(!motion.matches)frame=requestAnimationFrame(tick)}
function start(){if(!active())return;if(motion.matches){draw(performance.now());return}if(!frame)frame=requestAnimationFrame(tick)}
function pause(){cancelAnimationFrame(frame);frame=0;last=0;pointer={x:0,y:0};energy=0}
if(typeof IntersectionObserver!=='undefined')new IntersectionObserver(es=>{visible=es[0].isIntersecting;if(visible)start();else pause()}).observe(stage);
addEventListener('resize',resize,{passive:true});document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();else start()});
addEventListener('pagehide',()=>{returnAllowed=false;visits.cancel();visitAbort?.abort();pause();clearTimeout(toastTimer)});
addEventListener('pageshow',()=>{returnAllowed=true;start()});motion.addEventListener('change',()=>{pause();resize();start()});
resize();window.OLAJourney?.load(()=>draw(performance.now()));start();
})();

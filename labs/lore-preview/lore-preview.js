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

let revealTimer=0,sceneRevision=0,artPromise=null,artReady=false;
const artFiles=['assets/cabin.png','assets/secret-rooms.png'];
function loadImage(src){return new Promise((resolve,reject)=>{
 const image=new Image();let done=false;
 const finish=error=>{if(done)return;done=true;clearTimeout(timer);image.onload=image.onerror=null;error?reject(error):resolve(image)};
 const timer=setTimeout(()=>finish(new Error('Image load timed out')),12000);
 image.onload=()=>{if(image.decode)image.decode().then(()=>finish(),()=>finish());else finish()};
 image.onerror=()=>finish(new Error('Image did not load'));image.src=src;
})}
function prepareArt(){
 if(artReady)return Promise.resolve(true);
 if(!artPromise)artPromise=Promise.all(artFiles.map(loadImage)).then(()=>{artReady=true;return true}).catch(()=>{artPromise=null;return false});
 return artPromise;
}
function sceneStatus(text){$('#scene-load-status').textContent=text}
function closeScene(){
 sceneRevision++;clearTimeout(revealTimer);secret.hidden=true;cabinScene.hidden=false;
 cabin.classList.remove('is-revealing');cabinScene.classList.remove('is-returning');
 void cabinScene.offsetWidth;cabinScene.classList.add('is-returning');
 $('#back-to-cabin').hidden=true;cabin.scrollTop=0;sceneStatus('');
}
async function openCabin(){
 closeScene();if(!cabin.open)openDialog(cabin);
 const revision=sceneRevision;sceneStatus(artReady?'':'Preparing the cabin…');
 const ready=await prepareArt();if(revision!==sceneRevision||!cabin.open)return;
 sceneStatus(ready?'':'The cabin artwork could not load. Return to the sky and try again.');
}

function openStar(){openDialog($('#star-message'))}

async function showSecret(key){
 const data={
 chair:{cell:0,origin:'36% 48%',title:'The quiet deck.',text:'A photograph found its way here. Some moments travel further than we do.',world:'polaroid'},
 bar:{cell:1,origin:'8% 45%',title:'A song tucked between worlds.',text:'A Wave26 sleeve. A ticket from the Cinema Club. Someone has been here before.',world:'wave26'},
 window:{cell:2,origin:'75% 23%',title:'A route still being drawn.',text:'One teal coordinate keeps returning. The rest is a possibility, not a promise.',world:'simulation'}
 }[key];
 if(!data)return false;
 const revision=++sceneRevision;clearTimeout(revealTimer);sceneStatus(artReady?'':'Opening the hidden room…');
 const ready=await prepareArt();if(revision!==sceneRevision||!cabin.open)return false;
 if(!ready){sceneStatus('The hidden room could not load. Tap the object to try again.');return false}
 sceneStatus('');cabin.scrollTop=0;cabinScene.hidden=false;secret.hidden=false;
 $('#back-to-cabin').hidden=false;secretImage.dataset.cell=data.cell;secretImage.setAttribute('aria-label',key==='chair'?'A secret pool deck inside the vessel':key==='bar'?'A hidden vinyl listening room':'The celestial navigation room');
 secretTitle.textContent=data.title;secretText.textContent=data.text;$('#follow-current').dataset.world=data.world;$('#map-star').hidden=key!=='window';
 cabin.style.setProperty('--reveal-origin',data.origin);cabin.classList.remove('is-revealing');void secret.offsetWidth;cabin.classList.add('is-revealing');
 $('#back-to-cabin').focus({preventScroll:true});
 revealTimer=setTimeout(()=>{if(revision!==sceneRevision)return;cabinScene.hidden=true;cabin.classList.remove('is-revealing')},motion.matches?0:1050);
 return true;
}

function endWorld(){visitAbort?.abort();visitAbort=null;const result=returnAllowed?visits.finish(performance.now()):null;visits.cancel();$('#world-frame-slot').replaceChildren();if(result)toast(result.greeting,result.color)}
async function visitWorld(key){
 const world=C.worlds[key];if(!world)return;
 stopWalkthrough();if(cabin.open)cabin.close();const id=visits.begin(key,performance.now()),url=C.ORIGIN+world.path;
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
document.querySelectorAll('[data-secret]').forEach(b=>b.addEventListener('click',()=>{stopWalkthrough();showSecret(b.dataset.secret)}));
document.querySelectorAll('[data-world]').forEach(b=>b.addEventListener('click',()=>visitWorld(b.dataset.world)));
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>{stopWalkthrough();document.getElementById(b.dataset.close).close()}));
$('#back-to-cabin').addEventListener('click',()=>{stopWalkthrough();closeScene();$('#chair').focus({preventScroll:true})});
$('#map-star').addEventListener('click',()=>{stopWalkthrough();openStar()});star.addEventListener('click',()=>{stopWalkthrough();openStar()});ship.addEventListener('click',()=>{stopWalkthrough();openCabin()});
ship.addEventListener('pointerenter',()=>fly.hold(true));ship.addEventListener('pointerleave',()=>{if(document.activeElement!==ship&&!modals())fly.hold(false)});
ship.addEventListener('pointerdown',()=>fly.hold(true));ship.addEventListener('focus',()=>fly.hold(true));ship.addEventListener('blur',()=>{if(!modals())fly.hold(false)});
document.querySelectorAll('dialog').forEach(dialog=>{dialog.addEventListener('close',()=>{if(dialog===worldDialog)endWorld();if(!modals()){fly.hold(document.activeElement===ship);start()}})});
$('#try-vessel').addEventListener('click',()=>{stopWalkthrough();fly.hold(false);fly.summon();fly.step(1000);draw(performance.now());ship.focus()});
$('#try-star').addEventListener('click',()=>{star.focus();star.classList.add('is-noticed');setTimeout(()=>star.classList.remove('is-noticed'),2500)});
$('#direct-cabin').addEventListener('click',()=>{stopWalkthrough();openCabin()});
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
 const f=fly.state(),tourShip=walkthrough.state().running&&walkthrough.state().step?.scene==='ship';ship.hidden=!(tourShip||still||f.visible);ship.style.left=(tourShip?width*.5-55:still?width*.12:-55+f.progress*width)+'px';ship.style.top=(height*.15+(still?0:Math.sin(f.progress*Math.PI)*height*.025))+'px';
 if(!still)energy*=.94;
}
function tick(now){frame=0;if(!active())return;if(!last||now-last>=40){const dt=last?now-last:40;last=now;if(!motion.matches)fly.step(dt);draw(now)}if(!motion.matches)frame=requestAnimationFrame(tick)}
function start(){if(!active())return;if(motion.matches){draw(performance.now());return}if(!frame)frame=requestAnimationFrame(tick)}
function pause(){cancelAnimationFrame(frame);frame=0;last=0;pointer={x:0,y:0};energy=0}
if(typeof IntersectionObserver!=='undefined')new IntersectionObserver(es=>{visible=es[0].isIntersecting;if(visible)start();else pause()}).observe(stage);
addEventListener('resize',resize,{passive:true});document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();else start()});
addEventListener('pagehide',()=>{stopWalkthrough();returnAllowed=false;visits.cancel();visitAbort?.abort();pause();clearTimeout(toastTimer)});
addEventListener('pageshow',()=>{returnAllowed=true;start()});motion.addEventListener('change',()=>{pause();resize();start()});

const walkthrough=C.createWalkthrough();
let tourFrame=0,tourLast=0,tourRevision=0,tourBusy=false,tourLaunch=0;
function tourControls(){
 const state=walkthrough.state();
 document.querySelectorAll('.tour-controls').forEach(el=>{el.hidden=!state.running});
 document.querySelectorAll('.tour-step').forEach(el=>{el.textContent=state.running?state.step.label:''});
 document.querySelectorAll('[data-tour-pause]').forEach(el=>{el.textContent=state.paused?'Resume walkthrough':'Pause walkthrough'});
 document.body.classList.toggle('tour-paused',state.paused);
}
function stopWalkthrough(){
 tourLaunch++;tourRevision++;walkthrough.stop();cancelAnimationFrame(tourFrame);tourFrame=0;tourLast=0;tourBusy=false;tourControls();
 $('#watch-walkthrough').disabled=false;$('#preview-load-status').textContent='';
 fly.hold(modals()||document.activeElement===ship);draw(performance.now());
}
async function enterTourScene(){
 const revision=++tourRevision,state=walkthrough.state();tourBusy=true;tourControls();
 const starDialog=$('#star-message');
 if(state.step.scene==='ship'){
  if(starDialog.open)starDialog.close();if(cabin.open)cabin.close();
  stage.scrollIntoView({behavior:'auto',block:'start'});fly.hold(true);draw(performance.now());
 }else if(state.step.scene==='cabin'){
  if(starDialog.open)starDialog.close();await openCabin();
 }else if(state.step.scene==='star'){openStar()}
 else {await showSecret(state.step.scene)}
 if(revision===tourRevision){tourBusy=false;tourLast=0}
}
function tourTick(now){
 tourFrame=0;const before=walkthrough.state();if(!before.running)return;
 const dt=tourLast?now-tourLast:0;tourLast=now;
 if(!document.hidden&&!tourBusy){
  const after=walkthrough.step(dt);
  if(!after.running){
   if($('#star-message').open)$('#star-message').close();if(cabin.open)cabin.close();
   stopWalkthrough();$('#preview-load-status').textContent='Walkthrough complete. Replay it, or catch the ship and explore.';
   $('#watch-walkthrough').textContent='Replay the walkthrough';$('#watch-walkthrough').focus({preventScroll:true});return;
  }
  if(after.index!==before.index)enterTourScene();
 }
 if(!document.hidden)tourFrame=requestAnimationFrame(tourTick);
}
async function startWalkthrough(){
 stopWalkthrough();const launch=++tourLaunch;$('#watch-walkthrough').disabled=true;$('#preview-load-status').textContent='Preparing your passage…';
 const ready=await prepareArt();if(launch!==tourLaunch)return;
 $('#watch-walkthrough').disabled=false;
 if(!ready){$('#preview-load-status').textContent='The room artwork could not load. Please try the walkthrough again.';return}
 $('#preview-load-status').textContent='';if(worldDialog.open)worldDialog.close();
 walkthrough.start();await enterTourScene();if(walkthrough.state().running)tourFrame=requestAnimationFrame(tourTick);
}
$('#watch-walkthrough').addEventListener('click',startWalkthrough);
document.querySelectorAll('[data-tour-pause]').forEach(b=>b.addEventListener('click',()=>{
 const state=walkthrough.state();walkthrough.pause(!state.paused);tourLast=0;tourControls();
}));
document.querySelectorAll('[data-tour-stop]').forEach(b=>b.addEventListener('click',()=>{stopWalkthrough();if(cabin.open)$('#back-to-cabin').hidden?$('#chair').focus({preventScroll:true}):$('#back-to-cabin').focus({preventScroll:true})}));
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('cancel',()=>stopWalkthrough()));
document.addEventListener('visibilitychange',()=>{
 tourLast=0;if(document.hidden){cancelAnimationFrame(tourFrame);tourFrame=0}
 else if(walkthrough.state().running&&!tourFrame)tourFrame=requestAnimationFrame(tourTick);
});

resize();window.OLAJourney?.load(()=>draw(performance.now()));start();
})();

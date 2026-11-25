import {oceanComposition,originalOceanComposition} from './ocean-layout.js?v=20261124-worlds29';
// Reuses the supplied complete moon/ocean scenes. No private account access.
const base=new URL('../',import.meta.url), reduced=matchMedia('(prefers-reduced-motion: reduce)');
const constrained=()=>reduced.matches||navigator.connection?.saveData;
let paused=false;try{paused=localStorage.getItem('ola-cinema-motion')==='paused'}catch{}
const world=document.body.classList.contains('club-wave')||document.body.classList.contains('stats-world');
const originalWallpaper=world&&new URLSearchParams(location.search).get('ocean')!=='living',livingBackground=world&&!originalWallpaper;
const canvas=document.createElement('div');canvas.className='ocean-canvas';canvas.setAttribute('aria-hidden','true');
const still=document.createElement('img');still.className='ocean-still';still.alt='';still.decoding='async';
const video=document.createElement('video');video.muted=true;video.defaultMuted=true;video.playsInline=true;video.loop=true;video.preload='none';video.className='living-ocean';video.setAttribute('aria-hidden','true');video.dataset.analyticsIgnore='';video.tabIndex=-1;
canvas.append(still,video);
let source='',variant='',seam=false;
const button=document.createElement('button');button.type='button';button.className='ocean-motion-control';button.dataset.world='cinema-ocean-motion';button.textContent='Play ocean motion';
if(world){document.body.classList.add('living-cinema');document.body.dataset.oceanArtwork=originalWallpaper?'original':'living';document.body.prepend(canvas);if(livingBackground)document.body.append(button);}
function stop(){video.pause();canvas.classList.remove('ocean-playing');button.disabled=Boolean(constrained());button.textContent=constrained()?'Motion off':'Play ocean motion';button.setAttribute('aria-pressed','false');}
async function play(){if(!livingBackground||constrained()||paused||document.hidden){stop();return;}if(video.getAttribute('src')!==source)video.src=source;try{await video.play();if(paused||constrained()||document.hidden){stop();return;}canvas.classList.add('ocean-playing');button.disabled=false;button.textContent='Pause ocean motion';button.setAttribute('aria-pressed','true');}catch{stop();}}
function layout(){
 const header=document.querySelector('.site-header');const headerBottom=header?header.offsetTop+header.offsetHeight:160;
 const view=originalWallpaper?originalOceanComposition(innerWidth,innerHeight,headerBottom,Boolean(document.body.dataset.filmId)):oceanComposition(innerWidth,headerBottom);
 for(const [name,value]of Object.entries({left:view.left,top:view.top,width:view.mediaWidth,height:view.mediaHeight,gap:view.skyGap}))document.body.style.setProperty('--ocean-'+name,value+'px');
 const next=view.portrait?'mobile':'desktop';if(next!==variant){variant=next;source=new URL('assets/living-world/ocean-'+variant+'.mp4',base).href;still.src=new URL(originalWallpaper?'assets/la-ola-wave-banner-v3.webp':'assets/living-world/ocean-'+variant+'.jpg',base);video.poster=new URL('assets/living-world/ocean-'+variant+'.jpg',base).href;if(livingBackground&&!paused&&!constrained())play();}
}
layout();
if(world){let resizeFrame=0;const relayout=()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(layout)};addEventListener('resize',relayout);if(typeof ResizeObserver!=='undefined'){const header=document.querySelector('.site-header');if(header)new ResizeObserver(relayout).observe(header);}document.fonts?.ready.then(relayout);}
button.onclick=()=>{paused=!video.paused;try{localStorage.setItem('ola-cinema-motion',paused?'paused':'playing')}catch{}paused?stop():play();};
video.addEventListener('error',stop);
// The sources are ten-second cinematic takes, not exact matched-end loops.
// Briefly blend to their matching still frame at the boundary instead of a hard reset.
video.addEventListener('timeupdate',()=>{const next=Number.isFinite(video.duration)&&video.duration-video.currentTime<.65; if(next!==seam){seam=next;canvas.classList.toggle('ocean-seam',seam);}});
if(world)document.addEventListener('visibilitychange',()=>document.hidden?stop():play());reduced.addEventListener('change',()=>constrained()?stop():play());navigator.connection?.addEventListener?.('change',()=>constrained()?stop():play());
if(navigator.getBattery)navigator.getBattery().then(b=>{if(!b.charging&&b.level<.2){paused=true;stop();}}).catch(()=>{});
let seen=false;try{seen=sessionStorage.getItem('ola-cinema-entered')==='yes';sessionStorage.setItem('ola-cinema-entered','yes')}catch{seen=true;}
if(!seen&&!constrained()&&!paused){
 const intro=document.createElement('div');intro.className='cinema-entrance';const scene=video;scene.className='entrance-ocean';scene.src=source;scene.preload='metadata';
 const strip=document.createElement('img');strip.src=new URL('assets/entrance-ribbon.svg',base);strip.alt='';strip.className='entrance-filmstrip';strip.setAttribute('aria-hidden','true');const logo=document.createElement('img');logo.src=new URL('assets/brand/la-ola-wordmark-official-v2.webp',base);logo.alt='';logo.className='entrance-logo';const skip=document.createElement('button');skip.type='button';skip.dataset.world='cinema-entrance-skip';skip.className='entrance-skip';skip.textContent='Skip entrance';
 const emblem=document.createElement('img');emblem.src=new URL('assets/brand/la-ola-emblem-v2.webp',base);emblem.alt='';emblem.className='entrance-emblem';const light=document.createElement('div');light.className='entrance-light';const lockup=document.createElement('div');lockup.className='entrance-lockup';lockup.append(emblem,logo);intro.append(scene,light,strip,lockup,skip);document.body.append(intro);let done=false;const finish=()=>{if(done)return;done=true;clearTimeout(timer);if(livingBackground){video.className='living-ocean';canvas.append(video);}else scene.pause();intro.remove();document.removeEventListener('pointerdown',dismiss,true);document.removeEventListener('keydown',dismiss,true);};const dismiss=()=>finish();const timer=setTimeout(finish,3200);skip.onclick=finish;scene.addEventListener('error',finish,{once:true});document.addEventListener('pointerdown',dismiss,true);document.addEventListener('keydown',dismiss,true);scene.play().catch(finish);
}
if(livingBackground){if(!constrained()&&!paused)play();else stop();}

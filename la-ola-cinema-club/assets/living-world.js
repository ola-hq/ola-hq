// Supplied public media only. Navigation never waits for video playback.
const base=new URL('../',import.meta.url), reduced=matchMedia('(prefers-reduced-motion: reduce)');
const constrained=()=>reduced.matches||navigator.connection?.saveData;
let paused=false;try{paused=localStorage.getItem('ola-cinema-motion')==='paused'}catch{}
const mobile=matchMedia('(max-width:600px)').matches;const video=document.createElement('video');video.muted=true;video.defaultMuted=true;video.playsInline=true;video.loop=true;video.preload='none';video.className='living-ocean';video.setAttribute('aria-hidden','true');video.dataset.analyticsIgnore='';video.tabIndex=-1;
const variant=mobile?'mobile':'desktop';video.poster=new URL('assets/living-world/ocean-'+variant+'.jpg',base);const src=new URL('assets/living-world/ocean-'+variant+'.mp4',base);
const world=document.body.classList.contains('club-wave')||document.body.classList.contains('stats-world');
if(world){document.body.classList.add('living-cinema');document.body.prepend(video);}
const button=document.createElement('button');button.type='button';button.className='ocean-motion-control';button.dataset.world='cinema-ocean-motion';button.textContent='Play ocean motion';if(world)document.body.append(button);
function stop(){video.pause();button.textContent='Play ocean motion';button.setAttribute('aria-pressed','false');}
async function play(){if(constrained()||paused||document.hidden){stop();return;}if(!video.src)video.src=src;try{await video.play();button.textContent='Pause ocean motion';button.setAttribute('aria-pressed','true');}catch{stop();}}
button.onclick=()=>{paused=!video.paused;try{localStorage.setItem('ola-cinema-motion',paused?'paused':'playing')}catch{}paused?stop():play();};
video.addEventListener('error',stop);if(world)document.addEventListener('visibilitychange',()=>document.hidden?stop():play());reduced.addEventListener('change',()=>constrained()?stop():play());
// A low battery uses the static ocean rather than a decoding loop.
if(navigator.getBattery)navigator.getBattery().then(b=>{if(!b.charging&&b.level<.2){paused=true;stop();}}).catch(()=>{});
let seen=false;try{seen=sessionStorage.getItem('ola-cinema-entered')==='yes';sessionStorage.setItem('ola-cinema-entered','yes')}catch{seen=true;}
if(!seen&&!constrained()&&!paused){
 const intro=document.createElement('div');intro.className='cinema-entrance';const scene=video;scene.className='entrance-ocean';scene.muted=true;scene.playsInline=true;scene.src=src;scene.preload='metadata';scene.setAttribute('aria-hidden','true');
 const strip=document.createElement('div');strip.className='entrance-filmstrip';strip.setAttribute('aria-hidden','true');const logo=document.createElement('img');logo.src=new URL('assets/brand/la-ola-wordmark-official-v2.webp',base);logo.alt='';logo.className='entrance-logo';const skip=document.createElement('button');skip.type='button';skip.dataset.world='cinema-entrance-skip';skip.className='entrance-skip';skip.textContent='Skip entrance';
 intro.append(scene,strip,logo,skip);document.body.append(intro);let done=false;const finish=()=>{if(done)return;done=true;clearTimeout(timer);if(world){video.className='living-ocean';document.body.prepend(video);}else scene.pause();intro.remove();if(!world)video.remove();document.removeEventListener('pointerdown',dismiss,true);document.removeEventListener('keydown',dismiss,true);};const dismiss=()=>finish();const timer=setTimeout(finish,3200);skip.onclick=finish;scene.addEventListener('error',finish);document.addEventListener('pointerdown',dismiss,true);document.addEventListener('keydown',dismiss,true);scene.play().catch(finish);
}
if(world&&!constrained()&&!paused)play();

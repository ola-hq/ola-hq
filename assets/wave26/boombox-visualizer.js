import {bandLevel,logBands} from './boombox-spectrum.js?v=wave26-polish-20261126';

// Attaches only artwork overlays. Disposing a room never pauses the shared audio session.
export function createBoomboxVisualizer({session,scene,canvases}){
 const preference=matchMedia('(prefers-reduced-motion: reduce)');
 let disposed=false,raf=0,lastDraw=0,bass=[0,0],state=session.state();
 const surfaces=canvases.map(el=>({el,g:el.getContext('2d'),w:0,h:0}));
 function ring(s,bands,low,active){
  if(!s.g)return;const g=s.g;g.clearRect(0,0,s.w,s.h);g.save();g.translate(s.w/2,s.h/2);g.scale(s.w*.455,s.h*.455);
  // Annulus excludes the original winged-heart centers, including their wing tips.
  g.beginPath();g.arc(0,0,.995,0,Math.PI*2);g.arc(0,0,.88,0,Math.PI*2,true);g.clip('evenodd');
  g.strokeStyle=active?`rgba(232,194,116,${.22+low*.65})`:'rgba(95,157,205,.24)';g.shadowColor='#e5b85d';g.shadowBlur=active?6+low*18:0;g.lineWidth=.018+low*.045;g.beginPath();g.arc(0,0,.94,0,Math.PI*2);g.stroke();
  if(active)for(let i=0;i<bands.length;i++){
   const angle=i/bands.length*Math.PI*2-Math.PI/2,v=bands[i],end=Math.min(.99,.89+v*.085+low*.02);
   g.strokeStyle=i%4===0?`rgba(255,210,143,${.3+v*.7})`:`rgba(112,174,221,${.24+v*.75})`;
   g.lineWidth=.02;g.beginPath();g.moveTo(Math.cos(angle)*.89,Math.sin(angle)*.89);g.lineTo(Math.cos(angle)*end,Math.sin(angle)*end);g.stroke();
  }g.restore();
 }
 function idle(){
  for(const s of surfaces)s.g?.clearRect(0,0,s.w,s.h);for(let i=0;i<2;i++)ring(surfaces[i],[],0,false);
  const s=surfaces[2];if(s.g){s.g.fillStyle='#b9955144';s.g.fillRect(0,s.h-2,s.w,2)}
  scene.dataset.renderState=preference.matches?'reduced-motion':'idle';scene.dataset.bassLeft=scene.dataset.bassRight='0';
 }
 const active=()=>!disposed&&!document.hidden&&!preference.matches&&state.playing&&!state.muted&&state.volume>0&&state.visuals&&state.analysisAvailable;
 function stop(){cancelAnimationFrame(raf);raf=0;bass=[0,0];session.releaseAnalysis();idle()}
 function frame(t){
  raf=0;if(!active()){stop();return}
  if(t-lastDraw>=1000/30){lastDraw=t;const signal=session.readSpectrum();if(!signal){stop();return}
   for(let i=0;i<2;i++){bass[i]=bass[i]*.55+bandLevel(signal.arrays[i],signal.sampleRate,2048,40,180)*.45;ring(surfaces[i],logBands(signal.arrays[i],signal.sampleRate,48),bass[i],true)}
   const s=surfaces[2],bands=logBands(signal.arrays[2],signal.sampleRate,32);
   if(s.g){s.g.clearRect(0,0,s.w,s.h);const gap=2,w=(s.w-gap*31)/32;bands.forEach((v,i)=>{s.g.fillStyle=i<7?'#f3c17e':'#86b8e0';const h=Math.max(1,v*s.h*.95);s.g.fillRect(i*(w+gap),s.h-h,w,h)})}
   scene.dataset.analysisSource='pre-volume-stereo';scene.dataset.renderState='reactive';scene.dataset.bassLeft=bass[0].toFixed(3);scene.dataset.bassRight=bass[1].toFixed(3);
  }raf=requestAnimationFrame(frame);
 }
 function refresh(){scene.classList.toggle('audio-active',state.playing&&!state.muted&&state.volume>0);if(active()){if(!raf)raf=requestAnimationFrame(frame)}else stop()}
 function size(){for(const s of surfaces){const r=s.el.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,1.5);s.w=r.width;s.h=r.height;s.el.width=Math.max(1,Math.round(s.w*dpr));s.el.height=Math.max(1,Math.round(s.h*dpr));s.g?.setTransform(dpr,0,0,dpr,0,0)}if(!raf)idle()}
 const observer=new ResizeObserver(size);surfaces.forEach(s=>observer.observe(s.el));
 window.addEventListener('wave26:layout',size);document.addEventListener('visibilitychange',refresh);preference.addEventListener('change',refresh);
 const unsubscribe=session.subscribe(s=>{state=s;refresh()});size();
 return {dispose(){disposed=true;unsubscribe();stop();observer.disconnect();window.removeEventListener('wave26:layout',size);document.removeEventListener('visibilitychange',refresh);preference.removeEventListener('change',refresh)}};
}

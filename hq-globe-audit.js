/* Opt-in, device-local globe observation. No gesture, preference or pose writes. */
(function(root){'use strict';
 function angle(a,b){if(!a||!b)return 0;const dot=a.reduce((sum,v,i)=>sum+v*b[i],0);return 2*Math.acos(Math.min(1,Math.abs(dot)/(Math.hypot(...a)*Math.hypot(...b))))||0}
 function travel(samples){let total=0;for(let i=1;i<samples.length;i++)total+=angle(samples[i-1].q,samples[i].q);return total}
 function analyze(report){
  const counts=report.counts||{},samples=report.samples||[],input=(counts.touchstart||0)+(counts.pointerdown||0)>0;
  // Exclude release's final position and require several later observations.
  const coast=samples.filter(s=>report.releaseAt!==null&&s.t>=report.releaseAt+150&&!s.active&&s.releaseAt===report.releaseAt);
  let held=0;for(let i=1;i<samples.length;i++)if(samples[i-1].active&&samples[i].active)held+=angle(samples[i-1].q,samples[i].q);
  const coasting=travel(coast),observed=coast.length>=4&&coast.at(-1).t-coast[0].t>=400,continues=observed&&coasting>.025;
  let finding;
  if(!input)finding='No globe contact was recorded. Run again and drag directly on the globe.';
  else if(report.state?.ready!=='ready')finding='The 3D globe was not ready. Its load state is included in the report.';
  else if(report.endState?.onScreen===false||report.endState?.hidden)finding='The globe left the visible page. Its motion pauses outside the view; rerun without entering a world.';
  else if(continues)finding='Rotation continued after release during this check.';
  else if(report.state?.reduceMotion)finding='Reduce Motion is on. The current globe code disables release momentum with that setting.';
  else if(!observed)finding='There was not enough time after release to measure momentum. Run again, spin, then lift and wait.';
  else if(held<.01)finding='Input arrived, but held rotation was not observed. The event and renderer details are included.';
  else finding='Held rotation was observed, but continuing release momentum was not.';
  return {finding,contactRecorded:input,postReleaseWindowObserved:observed,releaseMomentumObserved:continues,heldRadians:+held.toFixed(3),postReleaseRadians:+coasting.toFixed(3)};
 }
 const api=Object.freeze({angle,travel,analyze});if(typeof module!=='undefined')module.exports=api;
 if(!root.document||new URL(root.location.href).searchParams.get('globeAudit')!=='1')return;
 const d=root.document;if(d.querySelector('#hq-globe-audit'))return;
 const panel=d.createElement('section');panel.id='hq-globe-audit';panel.setAttribute('aria-label','Phone globe check');
 const style=d.createElement('style');style.textContent='#hq-globe-audit{position:fixed;z-index:20000;left:12px;bottom:calc(12px + env(safe-area-inset-bottom));box-sizing:border-box;width:min(330px,calc(100vw - 24px));max-height:36svh;overflow:auto;padding:14px;border:1px solid #bda36e;border-radius:14px;background:#071525f5;color:#fff4db;font:14px/1.4 system-ui;box-shadow:0 8px 32px #0005}#hq-globe-audit p{margin:7px 0}#hq-globe-audit button{font:inherit;min-height:44px;padding:8px 12px;margin:6px 6px 0 0;border:1px solid #d3b977;border-radius:8px;background:#f3e3b5;color:#071525;cursor:pointer}#hq-globe-audit button:disabled{opacity:.5;cursor:default}#hq-globe-audit textarea{box-sizing:border-box;width:100%;min-height:100px;font:12px/1.3 monospace}';d.head.append(style);
 const title=d.createElement('strong');title.textContent='Phone globe check';const status=d.createElement('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.textContent='Run the check, spin the globe, then lift your finger and wait. The report stays on this device.';
 const run=d.createElement('button');run.type='button';run.textContent='Run 8-second check';const copy=d.createElement('button');copy.type='button';copy.textContent='Copy report';copy.disabled=true;const close=d.createElement('button');close.type='button';close.textContent='Close';const output=d.createElement('textarea');output.readOnly=true;output.hidden=true;output.setAttribute('aria-label','Globe diagnostic report');panel.append(title,status,run,copy,close,output);d.body.append(panel);
 let recording=false,started=0,report=null,sampleTimer=0,endTimer=0,active=false,nativeCount=0,lastSample=0;const listeners=[];
 const anchor=()=>d.querySelector('.portal-globe-door,#hero-world-jump');
 function state(){const a=anchor(),c=a?.querySelector('.hq-globe-canvas'),r=c?.getBoundingClientRect(),ar=a?.getBoundingClientRect();return {ready:a?.dataset.globe3d||'absent',engine:a?.dataset.globeEngine||'unknown',error:a?.dataset.globeError||null,reduceMotion:root.matchMedia('(prefers-reduced-motion: reduce)').matches,hidden:d.hidden,onScreen:!!ar&&ar.width>0&&ar.height>0&&ar.bottom>0&&ar.top<root.innerHeight&&ar.right>0&&ar.left<root.innerWidth,scrollY:Math.round(root.scrollY),canvas:c?{width:c.width,height:c.height,cssWidth:Math.round(r.width),top:Math.round(r.top),touchAction:root.getComputedStyle(c).touchAction}:null}}
 function sample(){if(!recording)return;const a=anchor(),c=a?.querySelector('.hq-globe-canvas'),q=c?.dataset.orientation?.split(',').map(Number),t=Math.round(root.performance.now()-started);if(q?.length===4&&q.every(Number.isFinite))report.samples.push({t,q,active,releaseAt:report.releaseAt,hidden:d.hidden,spinning:a.classList.contains('is-spinning')});lastSample=t}
 function observe(e){
  if(!recording)return;const a=anchor(),onGlobe=e.composedPath().includes(a),start=e.type==='touchstart'||e.type==='pointerdown';if(!active&&!onGlobe)return;if(start&&!onGlobe)return;
  const t=Math.round(root.performance.now()-started);report.counts[e.type]=(report.counts[e.type]||0)+1;
  if(start){active=true;report.releaseAt=null}
  if(e.type.startsWith('touch'))nativeCount=e.touches.length;
  if(e.type==='touchend'||e.type==='touchcancel'){active=nativeCount>0;if(!active)report.releaseAt=t}
  if((e.type==='pointerup'||e.type==='pointercancel')&&!nativeCount){active=false;report.releaseAt=t}
  const point=e.touches?.[0]||e.changedTouches?.[0]||e;
  const record={t,type:e.type,trusted:e.isTrusted,pointerType:e.pointerType||null,touches:e.touches?.length??null,cancelable:e.cancelable,x:Math.round(point.clientX||0),y:Math.round(point.clientY||0)};
  if(report.events.length<60){report.events.push(record);root.queueMicrotask(()=>{record.prevented=e.defaultPrevented})}
 }
 for(const name of ['pointerdown','pointermove','pointerup','pointercancel','lostpointercapture','touchstart','touchmove','touchend','touchcancel']){d.addEventListener(name,observe,{capture:true,passive:true});listeners.push(name)}
 function stop(){recording=false;root.clearInterval(sampleTimer);root.clearTimeout(endTimer);sampleTimer=endTimer=0;run.disabled=false;run.textContent='Run 8-second check'}
 run.addEventListener('click',()=>{
  if(recording)return;started=root.performance.now();active=false;nativeCount=0;lastSample=0;
  report={audit:'20261126-audit1',surface:root.location.pathname,standalone:root.matchMedia('(display-mode: standalone)').matches||root.navigator.standalone===true,userAgent:root.navigator.userAgent,pixelRatio:root.devicePixelRatio,versions:[...d.scripts].filter(s=>/hq-globe(?:-input|-motion)?\.js/.test(s.src)).map(s=>{const u=new URL(s.src);return u.pathname.split('/').at(-1)+'?'+u.searchParams.toString()}),state:state(),releaseAt:null,counts:{},events:[],samples:[]};
  recording=true;run.disabled=true;copy.disabled=true;output.hidden=true;status.textContent='Spin the globe now. Lift your finger, then wait for the result.';sample();sampleTimer=root.setInterval(sample,80);
  endTimer=root.setTimeout(()=>{sample();report.endState=state();report.duration=lastSample;report.result=analyze(report);output.value=JSON.stringify(report);stop();status.textContent=report.result.finding+' Tap Copy report and paste it in this chat.';copy.disabled=false},8000);
 });
 copy.addEventListener('click',async()=>{if(!report?.result)return;const text=JSON.stringify(report);try{await root.navigator.clipboard.writeText(text);status.textContent='Copied. Paste the report in this chat.'}catch{output.value=text;output.hidden=false;output.focus();output.select();status.textContent='Select and copy the report below, then paste it in this chat.'}});
 close.addEventListener('click',()=>{stop();for(const name of listeners)d.removeEventListener(name,observe,true);panel.remove();style.remove()});
})(typeof window!=='undefined'?window:globalThis);

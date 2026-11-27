/* Native link dragging is disabled; pointer, trackpad and tap sequences stay distinct. */
(function(root){'use strict';
 function attach(element,{press=()=>{},rotate,release,reset,activate,surprise},clock=root){
  let state=null,suppressUntil=0,tapCount=0,tapTimer=0,wheelTimer=0,nativeTouchUntil=0,committing=false;const listeners=[];
  const later=(fn,ms)=>(clock.setTimeout||root.setTimeout)(fn,ms),clear=id=>(clock.clearTimeout||root.clearTimeout)(id);
  const on=(name,fn,options)=>{element.addEventListener(name,fn,options);listeners.push([name,fn,options])};
  // Safari variants may expose touch events without a TouchEvent constructor.
  const nativeTouch=typeof clock.TouchEvent!=='undefined'||'ontouchstart' in clock||(clock.navigator?.maxTouchPoints||0)>0;
  const now=()=>clock.performance.now(),clamp=v=>Math.max(-24,Math.min(24,v)),modifier=e=>e.metaKey||e.ctrlKey||e.altKey||e.shiftKey;
  const clearTaps=()=>{clear(tapTimer);tapTimer=0;tapCount=0};
  function finish(cancelled=false){
   if(!state)return;const s=state;state=null;
   try{element.releasePointerCapture(s.id)}catch{}
   if(s.dragged||cancelled){suppressUntil=now()+500;clearTaps()}
   if(s.dragged&&!cancelled){const moving=now()-s.motionTime<120;
    if(s.touch&&moving&&s.samples.length>1){const end=s.samples.at(-1),start=s.samples.find(p=>p!==end&&end.t-p.t<=80)||s.samples.at(-2)||end,dt=Math.max(16,end.t-start.t);release(clamp((end.x-start.x)*20/dt),clamp((end.y-start.y)*20/dt))}
    else release(moving?s.vx:0,moving?s.vy:0)}else release(0,0);
  }
  function begin(id,point,touch){
   clear(tapTimer);tapTimer=0;clear(wheelTimer);wheelTimer=0;
   suppressUntil=0;press();state={id,x:point.clientX,y:point.clientY,lastX:point.clientX,lastY:point.clientY,time:now(),vx:0,vy:0,motionTime:now(),touch,samples:[{x:point.clientX,y:point.clientY,t:now()}],dragged:false};
  }
  function move(point,event){
   if(!state)return;
   const s=state,t=now(),dx=point.clientX-s.lastX,dy=point.clientY-s.lastY,dt=Math.max(8,t-s.time);
   if(Math.hypot(point.clientX-s.x,point.clientY-s.y)>6){if(!s.dragged)clearTaps();s.dragged=true}
   if(s.dragged){if(event.cancelable)event.preventDefault();rotate(dx,dy);s.vx=clamp(dx*16/dt);s.vy=clamp(dy*16/dt);if(Math.hypot(dx,dy)>.25){s.motionTime=t;s.samples.push({x:point.clientX,y:point.clientY,t});s.samples=s.samples.filter(p=>t-p.t<160)}}
   s.lastX=point.clientX;s.lastY=point.clientY;s.time=t;
  }
  function tap(){
   if(!activate)return;clear(tapTimer);tapCount++;
   if(tapCount===3&&surprise){clearTaps();surprise();return}
   tapTimer=later(()=>{tapTimer=0;tapCount=0;committing=true;try{activate()}finally{committing=false}},320);
  }
  on('dragstart',e=>e.preventDefault(),true);
  on('dblclick',e=>e.preventDefault());
  if(nativeTouch){
   on('touchstart',e=>{
    nativeTouchUntil=now()+800;
    if(e.touches.length!==1){finish(true);clearTaps();return}
    // Claim a one-finger globe gesture at contact, before WebKit starts native
    // link handling/page panning. Waiting until touchmove is too late there.
    if(e.cancelable)e.preventDefault();
    const point=e.touches[0];begin(point.identifier,point,true);
   },{passive:false,capture:true});
   on('touchmove',e=>{
    if(!state?.touch)return;
    if(e.touches.length!==1){finish(true);clearTaps();return}
    const point=Array.from(e.touches).find(p=>p.identifier===state.id);if(!point){finish(true);return}
    // Safari needs a non-passive native touchmove, before it claims page scroll.
    if(e.cancelable)e.preventDefault();move(point,e);
   },{passive:false,capture:true});
   on('touchend',e=>{
    if(!state?.touch)return;
    if(Array.from(e.touches).some(p=>p.identifier===state.id))return;
    const dragged=state.dragged;finish();nativeTouchUntil=now()+800;
    // Count native releases, not Safari's delayed/zero-detail compatibility click.
    if(e.cancelable)e.preventDefault();if(!dragged)tap();
   },{passive:false});
   on('touchcancel',()=>{finish(true);clearTaps();nativeTouchUntil=now()+800},{passive:true});
   on('contextmenu',e=>{if(state?.touch||now()<nativeTouchUntil)e.preventDefault()});
  }
  on('pointerdown',e=>{
   if(nativeTouch&&e.pointerType==='touch')return;
   if(nativeTouch&&e.pointerType==='mouse'&&now()<nativeTouchUntil){if(e.cancelable)e.preventDefault();return}
   if(e.isPrimary===false){finish(true);clearTaps();return}
   if(e.button!==0||modifier(e))return;
   if(e.pointerType==='mouse'&&e.cancelable){e.preventDefault();element.focus?.({preventScroll:true})}
   begin(e.pointerId,e,e.pointerType==='touch');
   try{element.setPointerCapture(e.pointerId)}catch{}
  },{passive:false});
  on('pointermove',e=>{if(nativeTouch&&e.pointerType==='touch')return;if(state&&e.pointerId===state.id)move(e,e)},{passive:false});
  on('pointerup',e=>{if(nativeTouch&&e.pointerType==='touch')return;if(state?.id===e.pointerId)finish()});
  on('pointercancel',e=>{if(nativeTouch&&e.pointerType==='touch')return;finish(true);clearTaps()});
  on('lostpointercapture',()=>{if(state&&!(nativeTouch&&state.touch))finish(true)});
  on('click',e=>{
   if(modifier(e)){clearTaps();return}
   if(e.detail!==0&&now()<suppressUntil){e.preventDefault();e.stopImmediatePropagation();return}
   if(!committing&&now()<nativeTouchUntil){e.preventDefault();e.stopImmediatePropagation();return}
   if(e.detail===0){clearTaps();return} // Keyboard and the committed single-tap native click.
   if(!activate)return;
   e.preventDefault();e.stopImmediatePropagation();tap();
  },true);
  on('wheel',e=>{
   if(e.ctrlKey||e.metaKey||e.altKey)return; // Trackpad pinch remains browser zoom.
   if(e.cancelable)e.preventDefault();clearTaps();finish(true);press();clear(wheelTimer);
   const unit=e.deltaMode===1?16:e.deltaMode===2?100:1,dx=clamp(e.deltaX*unit*.6),dy=clamp(e.deltaY*unit*.6);
   rotate(dx,dy);wheelTimer=later(()=>{wheelTimer=0;release(dx*.45,dy*.45)},90);
  },{passive:false});
  on('keydown',e=>{
   if(e.key==='Enter'||e.key===' ')nativeTouchUntil=0;
   const keys={ArrowLeft:[-16,0],ArrowRight:[16,0],ArrowUp:[0,-16],ArrowDown:[0,16]};
   if(keys[e.key]){e.preventDefault();clearTaps();press();rotate(...keys[e.key]);release(0,0)}
   else if(e.key==='Home'){e.preventDefault();clearTaps();press();reset()}
   else if(e.key==='Escape'){finish(true);clearTaps();clear(wheelTimer);press()}
   else if(e.key?.toLowerCase()==='r'&&!modifier(e)&&surprise){e.preventDefault();clearTaps();surprise()}
  });
  function cancel(){finish(true);clearTaps();clear(wheelTimer);wheelTimer=0;nativeTouchUntil=0}
  return {cancel,destroy(){cancel();for(const [name,fn,options]of listeners)element.removeEventListener(name,fn,options);suppressUntil=0}};
 }
 root.OLAGlobeInput=Object.freeze({attach});if(typeof module!=='undefined')module.exports={attach};
})(typeof window!=='undefined'?window:globalThis);

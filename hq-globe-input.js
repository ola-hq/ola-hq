/* Native link dragging is disabled; pointer, trackpad and tap sequences stay distinct. */
(function(root){'use strict';
 function attach(element,{press=()=>{},rotate,release,reset,activate,surprise},clock=root){
  let state=null,suppressUntil=0,tapCount=0,tapTimer=0,wheelTimer=0,nativeTouchUntil=0,committing=false;const listeners=[];
  const later=(fn,ms)=>(clock.setTimeout||root.setTimeout)(fn,ms),clear=id=>(clock.clearTimeout||root.clearTimeout)(id);
  const track=element.ownerDocument||element;
  const on=(name,fn,options,target=element)=>{target.addEventListener(name,fn,options);listeners.push([target,name,fn,options])};
  // Safari variants may expose touch events without a TouchEvent constructor.
  const nativeTouch=typeof clock.TouchEvent!=='undefined'||'ontouchstart' in clock||(clock.navigator?.maxTouchPoints||0)>0;
  const now=()=>clock.performance.now(),clamp=v=>Math.max(-24,Math.min(24,v)),modifier=e=>e.metaKey||e.ctrlKey||e.altKey||e.shiftKey;
  // Sample time belongs to the input, not to a render which may have delayed it.
  const time=e=>{let t=e?.timeStamp;if(t>1e12)t-=clock.performance.timeOrigin||0;return Number.isFinite(t)&&t>=0&&Math.abs(t-now())<60000?t:now()};
  const clearTaps=()=>{clear(tapTimer);tapTimer=0;tapCount=0};
  function finish(cancelled=false,t=now()){
   if(!state)return;const s=state;state=null;
   try{if(s.captureId!==undefined)element.releasePointerCapture(s.captureId)}catch{}
   if(s.dragged||cancelled){suppressUntil=now()+500;clearTaps()}
   if(s.dragged&&!cancelled){const moving=t-s.motionTime<120;
    if(s.touch&&moving&&s.samples.length>1){const end=s.samples.at(-1),start=s.samples.find(p=>p!==end&&end.t-p.t<=80)||s.samples.at(-2)||end,dt=Math.max(16,end.t-start.t);release(clamp((end.x-start.x)*20/dt),clamp((end.y-start.y)*20/dt))}
    else release(moving?s.vx:0,moving?s.vy:0)}else release(0,0);
  }
  function begin(id,point,touch,event,native=false){
   clear(tapTimer);tapTimer=0;clear(wheelTimer);wheelTimer=0;
   const t=time(event);suppressUntil=0;press();state={id,x:point.clientX,y:point.clientY,lastX:point.clientX,lastY:point.clientY,time:t,vx:0,vy:0,motionTime:t,touch,native,samples:[{x:point.clientX,y:point.clientY,t}],dragged:false};
  }
  function move(point,event){
   if(!state)return;
   const s=state,t=Math.max(s.time,time(event)),dx=point.clientX-s.lastX,dy=point.clientY-s.lastY,dt=Math.max(8,t-s.time);
   if(Math.hypot(point.clientX-s.x,point.clientY-s.y)>6){if(!s.dragged)clearTaps();s.dragged=true}
   if(s.dragged){if(event.cancelable)event.preventDefault();if(dx||dy)rotate(dx,dy);s.vx=clamp(dx*16/dt);s.vy=clamp(dy*16/dt);if(Math.hypot(dx,dy)>.25){s.motionTime=t;s.samples.push({x:point.clientX,y:point.clientY,t});s.samples=s.samples.filter(p=>t-p.t<160)}}
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
    const point=e.touches[0];
    // Pointer Events can arrive first on iOS. Promote that same contact rather
    // than resetting it; subsequent pointer copies must not rotate it twice.
    if(state?.touch&&!state.native){state.id=point.identifier;state.native=true}
    else begin(point.identifier,point,true,e,true);
   },{passive:false,capture:true});
   on('touchmove',e=>{
    if(!state?.native)return;
    if(e.touches.length!==1){finish(true);clearTaps();return}
    const point=Array.from(e.touches).find(p=>p.identifier===state.id);if(!point){finish(true);return}
    // Safari needs a non-passive native touchmove, before it claims page scroll.
    if(e.cancelable)e.preventDefault();move(point,e);
   },{passive:false,capture:true},track);
   on('touchend',e=>{
    if(!state?.native)return;
    if(Array.from(e.touches).some(p=>p.identifier===state.id))return;
    // A quick flick may expose its final displacement only at touchend.
    const end=Array.from(e.changedTouches||[]).find(p=>p.identifier===state.id);
    if(end&&(end.clientX!==state.lastX||end.clientY!==state.lastY))move(end,e);
    const dragged=state.dragged;finish(false,time(e));nativeTouchUntil=now()+800;
    // Count native releases, not Safari's delayed/zero-detail compatibility click.
    if(e.cancelable)e.preventDefault();if(!dragged)tap();
   },{passive:false,capture:true},track);
   on('touchcancel',()=>{if(state?.touch){finish(true);clearTaps();nativeTouchUntil=now()+800}},{passive:true,capture:true},track);
   on('touchstart',e=>{if(state?.touch&&e.touches.length!==1){finish(true);clearTaps()}},{passive:true,capture:true},track);
   on('contextmenu',e=>{if(state?.touch||now()<nativeTouchUntil)e.preventDefault()});
  }
  on('pointerdown',e=>{
   if(e.pointerType==='touch'&&state?.native){state.captureId=e.pointerId;try{element.setPointerCapture(e.pointerId)}catch{}return}
   if(nativeTouch&&e.pointerType==='mouse'&&now()<nativeTouchUntil){if(e.cancelable)e.preventDefault();return}
   if(e.isPrimary===false){finish(true);clearTaps();return}
   if(e.button!==0||modifier(e))return;
   if(e.pointerType==='mouse'&&e.cancelable){e.preventDefault();element.focus?.({preventScroll:true})}
   begin(e.pointerId,e,e.pointerType==='touch',e);state.captureId=e.pointerId;
   try{element.setPointerCapture(e.pointerId)}catch{}
  },{passive:false});
  on('pointermove',e=>{if(state&&!state.native&&e.pointerId===state.id)move(e,e)},{passive:false,capture:true},track);
  on('pointerup',e=>{
   if(!state||state.native||state.id!==e.pointerId)return;
   if(e.clientX!==state.lastX||e.clientY!==state.lastY)move(e,e);
   const dragged=state.dragged,touch=state.touch;finish(false,time(e));
   if(nativeTouch&&touch){nativeTouchUntil=now()+800;if(e.cancelable)e.preventDefault();if(!dragged)tap()}
  },{passive:false,capture:true},track);
  on('pointercancel',e=>{if(state?.native||state?.id!==e.pointerId)return;finish(true);clearTaps()},{capture:true},track);
  // Document tracking remains active if WebKit releases pointer capture early.
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
  return {cancel,destroy(){cancel();for(const [target,name,fn,options]of listeners)target.removeEventListener(name,fn,options);suppressUntil=0}};
 }
 root.OLAGlobeInput=Object.freeze({attach});if(typeof module!=='undefined')module.exports={attach};
})(typeof window!=='undefined'?window:globalThis);

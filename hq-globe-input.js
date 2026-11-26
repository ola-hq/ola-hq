/* Native link dragging is disabled; pointer, trackpad and tap sequences stay distinct. */
(function(root){'use strict';
 function attach(element,{press=()=>{},rotate,release,reset,activate,surprise},clock=root){
  let state=null,suppressUntil=0,tapCount=0,tapTimer=0,wheelTimer=0;const listeners=[];
  const later=(fn,ms)=>(clock.setTimeout||root.setTimeout)(fn,ms),clear=id=>(clock.clearTimeout||root.clearTimeout)(id);
  const on=(name,fn,options)=>{element.addEventListener(name,fn,options);listeners.push([name,fn,options])};
  const now=()=>clock.performance.now(),clamp=v=>Math.max(-24,Math.min(24,v)),modifier=e=>e.metaKey||e.ctrlKey||e.altKey||e.shiftKey;
  const clearTaps=()=>{clear(tapTimer);tapTimer=0;tapCount=0};
  function finish(cancelled=false){
   if(!state)return;const s=state;state=null;
   try{element.releasePointerCapture(s.id)}catch{}
   if(s.dragged||cancelled){suppressUntil=now()+500;clearTaps()}
   if(s.dragged&&!cancelled){const moving=now()-s.time<100;release(moving?s.vx:0,moving?s.vy:0)}else release(0,0);
  }
  on('dragstart',e=>e.preventDefault(),true);
  on('dblclick',e=>e.preventDefault());
  on('pointerdown',e=>{
   if(e.isPrimary===false){finish(true);clearTaps();return}
   if(e.button!==0||modifier(e))return;
   clear(tapTimer);tapTimer=0;clear(wheelTimer);wheelTimer=0;
   // Cancel the anchor's native mouse drag without blocking touch pinch zoom.
   if(e.pointerType==='mouse'&&e.cancelable){e.preventDefault();element.focus?.({preventScroll:true})}
   suppressUntil=0;press();state={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,time:now(),vx:0,vy:0,dragged:false};
   try{element.setPointerCapture(e.pointerId)}catch{}
  },{passive:false});
  on('pointermove',e=>{
   if(!state||e.pointerId!==state.id)return;
   const s=state,t=now(),dx=e.clientX-s.lastX,dy=e.clientY-s.lastY,dt=Math.max(8,t-s.time);
   if(Math.hypot(e.clientX-s.x,e.clientY-s.y)>6){if(!s.dragged)clearTaps();s.dragged=true}
   if(s.dragged){if(e.cancelable)e.preventDefault();rotate(dx,dy);s.vx=clamp(dx*16/dt);s.vy=clamp(dy*16/dt)}
   s.lastX=e.clientX;s.lastY=e.clientY;s.time=t;
  },{passive:false});
  on('pointerup',e=>{if(state?.id===e.pointerId)finish()});
  on('pointercancel',()=>{finish(true);clearTaps()});
  on('lostpointercapture',()=>{if(state)finish(true)});
  on('click',e=>{
   if(modifier(e)){clearTaps();return}
   if(e.detail!==0&&now()<suppressUntil){e.preventDefault();e.stopImmediatePropagation();return}
   if(e.detail===0){clearTaps();return} // Keyboard and the committed single-tap native click.
   if(!activate)return;
   e.preventDefault();e.stopImmediatePropagation();clear(tapTimer);tapCount++;
   if(tapCount===3&&surprise){clearTaps();surprise();return}
   // Wait only long enough to distinguish a hidden triple tap from ordinary entry.
   tapTimer=later(()=>{tapTimer=0;tapCount=0;activate()},320);
  },true);
  on('wheel',e=>{
   if(e.ctrlKey||e.metaKey||e.altKey)return; // Trackpad pinch remains browser zoom.
   if(e.cancelable)e.preventDefault();clearTaps();finish(true);press();clear(wheelTimer);
   const unit=e.deltaMode===1?16:e.deltaMode===2?100:1,dx=clamp(e.deltaX*unit*.6),dy=clamp(e.deltaY*unit*.6);
   rotate(dx,dy);wheelTimer=later(()=>{wheelTimer=0;release(dx*.45,dy*.45)},90);
  },{passive:false});
  on('keydown',e=>{
   const keys={ArrowLeft:[-16,0],ArrowRight:[16,0],ArrowUp:[0,-16],ArrowDown:[0,16]};
   if(keys[e.key]){e.preventDefault();clearTaps();press();rotate(...keys[e.key]);release(0,0)}
   else if(e.key==='Home'){e.preventDefault();clearTaps();press();reset()}
   else if(e.key==='Escape'){finish(true);clearTaps();clear(wheelTimer);press()}
   else if(e.key?.toLowerCase()==='r'&&!modifier(e)&&surprise){e.preventDefault();clearTaps();surprise()}
  });
  function cancel(){finish(true);clearTaps();clear(wheelTimer);wheelTimer=0}
  return {cancel,destroy(){cancel();for(const [name,fn,options]of listeners)element.removeEventListener(name,fn,options);suppressUntil=0}};
 }
 root.OLAGlobeInput=Object.freeze({attach});if(typeof module!=='undefined')module.exports={attach};
})(typeof window!=='undefined'?window:globalThis);

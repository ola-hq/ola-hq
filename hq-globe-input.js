/* Drag-to-spin and tap-to-enter remain distinct on the centered globe. */
(function(root){
 function attach(element,{press=()=>{},rotate,release,reset},clock=root){
  let state=null,suppressUntil=0;const listeners=[];
  const on=(name,fn,options)=>{element.addEventListener(name,fn,options);listeners.push([name,fn,options])};
  const now=()=>clock.performance.now(),clamp=v=>Math.max(-24,Math.min(24,v));
  function finish(cancelled=false){
   if(!state)return;
   const s=state;state=null;
   try{element.releasePointerCapture(s.id)}catch{}
   if(s.dragged||cancelled)suppressUntil=now()+500;
   if(s.dragged&&!cancelled){const moving=now()-s.time<100;release(moving?s.vx:0,moving?s.vy:0)}
   else release(0,0);
  }
  on('pointerdown',e=>{
   if(e.isPrimary===false){finish(true);return}
   if(e.button!==0||e.metaKey||e.ctrlKey||e.altKey||e.shiftKey)return;
   suppressUntil=0;press();state={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,time:now(),vx:0,vy:0,dragged:false};
   try{element.setPointerCapture(e.pointerId)}catch{}
  });
  on('pointermove',e=>{
   if(!state||e.pointerId!==state.id)return;
   const s=state,t=now(),dx=e.clientX-s.lastX,dy=e.clientY-s.lastY,dt=Math.max(8,t-s.time);
   if(Math.hypot(e.clientX-s.x,e.clientY-s.y)>6)s.dragged=true;
   if(s.dragged){if(e.cancelable)e.preventDefault();rotate(dx,dy);s.vx=clamp(dx*16/dt);s.vy=clamp(dy*16/dt)}
   s.lastX=e.clientX;s.lastY=e.clientY;s.time=t;
  },{passive:false});
  on('pointerup',e=>{if(state?.id===e.pointerId)finish()});
  on('pointercancel',()=>finish(true));
  on('lostpointercapture',()=>{if(state)finish(true)});
  on('click',e=>{if(e.detail!==0&&now()<suppressUntil){e.preventDefault();e.stopImmediatePropagation()}},true);
  on('keydown',e=>{
   const keys={ArrowLeft:[-16,0],ArrowRight:[16,0],ArrowUp:[0,-16],ArrowDown:[0,16]};
   if(keys[e.key]){e.preventDefault();press();rotate(...keys[e.key])}
   else if(e.key==='Home'){e.preventDefault();press();reset()}
  });
  return {cancel:()=>finish(true),destroy(){finish(true);for(const [name,fn,options]of listeners)element.removeEventListener(name,fn,options);suppressUntil=0}};
 }
 root.OLAGlobeInput=Object.freeze({attach});if(typeof module!=='undefined')module.exports={attach};
})(typeof window!=='undefined'?window:globalThis);

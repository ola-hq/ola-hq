// Desktop input adapter only: all browsing, sound and motion stay in CardViewer.
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const clock=e=>Number.isFinite(e.timeStamp)?e.timeStamp:performance.now();
export function trackpadDelta(e,height){
 const unit=e.deltaMode===1?16:e.deltaMode===2?height:1;
 return {x:Number.isFinite(e.deltaX)?clamp(e.deltaX*unit,-height,height):0,y:Number.isFinite(e.deltaY)?clamp(e.deltaY*unit,-height,height):0};
}
export class PolaroidTrackpad {
 constructor(viewer){
  this.viewer=viewer;this.stage=viewer.stage;this.desktop=matchMedia('(hover: hover) and (pointer: fine)');this.timer=0;this.session=null;this.gesture=null;this.tail=false;this.suppressPinchUntil=0;
  this.wheel=e=>{
   if(!this.accepts(e))return;
   e.preventDefault();const now=clock(e);
   if(this.tail){this.quiet();return;}
   if(viewer.turning||viewer.browsing||viewer.exitWaiting)return;
   if(this.gesture||(e.ctrlKey&&performance.now()<this.suppressPinchUntil))return;
   const {x,y}=trackpadDelta(e,this.stage.clientHeight);if(!x&&!y)return;
   const mode=e.ctrlKey?'zoom':e.altKey?'rotate':e.shiftKey?'pan':'browse';
   if(!this.session)this.session={item:viewer.items[viewer.index],mode,x:0,y:0,time:now-16,last:now-16,panX:viewer.panX,panY:viewer.panY};
   const s=this.session;
   // Changing modifier, item or input owner cannot complete an older scroll as a swipe.
   if(s.item!==viewer.items[viewer.index]||s.mode!==mode){this.cancel();return;}
   viewer.clearPhotoTap();viewer.dialog.dataset.trackpad='true';
   if(mode==='zoom')viewer.zoom(viewer.scale*Math.exp(-y*.01),{keepPan:true});
   else if(mode==='rotate'){viewer.rotZ-=(Math.abs(x)>Math.abs(y)?x:y)*.45;viewer.paint();}
   else{
    s.x+=x;s.y+=y;
    const elapsed=Math.max(16,now-s.time),speed=Math.abs(s.x)/elapsed;
    if(mode==='browse'&&Math.abs(s.x)>=96&&Math.abs(s.x)>Math.abs(s.y)*1.5&&speed>=.55){
     // Restore the departure pose, then request exactly one existing sideways flip.
     viewer.panX=s.panX;viewer.panY=s.panY;viewer.paint();
     const direction=s.x>0?1:-1;this.cancel();viewer.move(direction);return;
    }
    viewer.panX=clamp(viewer.panX-x,-this.stage.clientWidth*.45,this.stage.clientWidth*.45);
    viewer.panY=clamp(viewer.panY-y,-this.stage.clientHeight*.45,this.stage.clientHeight*.45);viewer.paint();
   }
   s.last=now;this.quiet();
  };
  this.start=e=>{
   if(!this.accepts(e)||viewer.turning||viewer.browsing||viewer.exitWaiting)return;
   e.preventDefault();this.session=null;this.tail=false;clearTimeout(this.timer);this.timer=0;
   this.gesture={item:viewer.items[viewer.index],scale:viewer.scale,rotation:viewer.rotZ||0};viewer.clearPhotoTap();viewer.dialog.dataset.trackpad='true';
  };
  this.change=e=>{
   if(!this.gesture)return;
   if(!this.accepts(e)||viewer.turning||viewer.browsing||viewer.exitWaiting||this.gesture.item!==viewer.items[viewer.index]){this.cancel();return;}
   e.preventDefault();if(Number.isFinite(e.rotation))viewer.rotZ=this.gesture.rotation+e.rotation;
   if(Number.isFinite(e.scale)&&e.scale>0)viewer.zoom(this.gesture.scale*e.scale,{keepPan:true});else viewer.paint();
  };
  this.end=e=>{if(!this.gesture)return;e.preventDefault();this.suppressPinchUntil=performance.now()+100;this.cancel();};
  this.stop=()=>this.cancel();this.visibility=()=>{if(document.hidden)this.cancel();};
  this.stage.addEventListener('wheel',this.wheel,{passive:false});
  for(const [name,fn]of [['gesturestart',this.start],['gesturechange',this.change],['gestureend',this.end]])this.stage.addEventListener(name,fn,{passive:false});
  viewer.dialog.addEventListener('close',this.stop);document.addEventListener('visibilitychange',this.visibility);
  if(typeof window!=='undefined')window.addEventListener('blur',this.stop);
 }
 accepts(e){const v=this.viewer;return !this.destroyed&&v.immersive&&v.physicalCard&&this.desktop.matches&&v.dialog.open&&!document.hidden&&!v.flipped&&!v.pointers.size&&!e.target?.closest?.('button,a,input,textarea,select,[contenteditable]');}
 quiet(){clearTimeout(this.timer);this.timer=setTimeout(()=>this.finish(),220);}
 finish(){clearTimeout(this.timer);this.timer=0;this.session=null;this.tail=false;this.viewer.dialog.dataset.trackpad='false';}
 cancel(){const active=Boolean(this.session||this.gesture||this.tail);this.session=null;this.gesture=null;this.tail=active;this.viewer.dialog.dataset.trackpad='false';if(active)this.quiet();else this.finish();}
 destroy(){this.destroyed=true;this.gesture=null;this.finish();this.stage.removeEventListener('wheel',this.wheel);for(const [name,fn]of [['gesturestart',this.start],['gesturechange',this.change],['gestureend',this.end]])this.stage.removeEventListener(name,fn);this.viewer.dialog.removeEventListener('close',this.stop);document.removeEventListener('visibilitychange',this.visibility);if(typeof window!=='undefined')window.removeEventListener('blur',this.stop);}
}

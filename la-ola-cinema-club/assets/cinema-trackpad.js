// Desktop trackpads expose two-finger translation through wheel events, not touch pointers.
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export function trackpadDelta(event,height){
 const mode=event.deltaMode,unit=mode===1?16:mode===2?height:1;
 return {x:Number.isFinite(event.deltaX)?clamp(event.deltaX*unit,-height,height):0,y:Number.isFinite(event.deltaY)?clamp(event.deltaY*unit,-height,height):0};
}
export class CinemaTrackpad {
 constructor(viewer){
  this.viewer=viewer;this.stage=viewer.stage;this.timer=0;this.gesture=null;this.suppressPinchUntil=0;
  this.desktop=matchMedia('(hover: hover) and (pointer: fine)');
  this.wheel=event=>{
   if(!this.accepts(event))return;
   event.preventDefault();
   if(this.gesture||(event.ctrlKey&&performance.now()<this.suppressPinchUntil))return;
   const {x,y}=trackpadDelta(event,this.stage.clientHeight);
   if(!x&&!y)return;
   this.begin();
   if(event.ctrlKey)viewer.zoom(viewer.scale*Math.exp(-y*.01),{keepPan:true});
   else{
    viewer.panX=clamp(viewer.panX-x,-this.stage.clientWidth*.45,this.stage.clientWidth*.45);
    viewer.panY=clamp(viewer.panY-y,-this.stage.clientHeight*.45,this.stage.clientHeight*.45);
    viewer.paint();
   }
   clearTimeout(this.timer);this.timer=setTimeout(()=>this.cancel(),180);
  };
  this.start=event=>{
   if(!this.accepts(event))return;
   event.preventDefault();this.begin();
   this.gesture={scale:viewer.scale,rotation:viewer.rotZ||0};
  };
  this.change=event=>{
   if(!this.gesture)return;
   if(!this.accepts(event)){this.cancel();return;}
   event.preventDefault();
   if(Number.isFinite(event.rotation))viewer.rotZ=this.gesture.rotation+event.rotation;
   if(Number.isFinite(event.scale)&&event.scale>0)viewer.zoom(this.gesture.scale*event.scale,{keepPan:true});
   else viewer.paint();
  };
  this.end=event=>{if(!this.gesture)return;event.preventDefault();this.suppressPinchUntil=performance.now()+100;this.cancel();};
  this.stop=()=>this.cancel();this.visibility=()=>{if(document.hidden)this.cancel();};
  this.stage.addEventListener('wheel',this.wheel,{passive:false});
  for(const [type,handler]of [['gesturestart',this.start],['gesturechange',this.change],['gestureend',this.end]])this.stage.addEventListener(type,handler,{passive:false});
  viewer.dialog.addEventListener('close',this.stop);
  if(typeof window!=='undefined')window.addEventListener('blur',this.stop);
  document.addEventListener('visibilitychange',this.visibility);
 }
 accepts(event){
  const v=this.viewer;
  return !this.destroyed&&this.desktop.matches&&v.dialog.open&&!document.hidden&&!v.flipped&&!v.turning&&!v.browsing&&!v.exitWaiting&&!v.pointers.size&&!event.target?.closest?.('button,a,input,textarea,select,[contenteditable]');
 }
 begin(){clearTimeout(this.timer);this.timer=0;this.viewer.clearPhotoTap();this.viewer.dialog.dataset.trackpad='true';}
 cancel(){clearTimeout(this.timer);this.timer=0;this.gesture=null;this.viewer.dialog.dataset.trackpad='false';}
 destroy(){
  this.destroyed=true;this.cancel();this.stage.removeEventListener('wheel',this.wheel);
  for(const [type,handler]of [['gesturestart',this.start],['gesturechange',this.change],['gestureend',this.end]])this.stage.removeEventListener(type,handler);
  this.viewer.dialog.removeEventListener('close',this.stop);document.removeEventListener('visibilitychange',this.visibility);
  if(typeof window!=='undefined')window.removeEventListener('blur',this.stop);
 }
}

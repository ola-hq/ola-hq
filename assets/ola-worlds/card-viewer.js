import {CardFlickSound} from './card-sound.js?v=20261125-worlds33';
// One viewer for public artwork in every Ola world. No account or private-media fetching.
export function gestureAction({dx=0,dy=0,scale=1,multi=false,threshold=65,velocity=0}={}){
 if(multi||scale>1.01)return 'pan';
 return (Math.abs(dx)>threshold||(Math.abs(dx)>65&&Math.abs(velocity)>.55))&&Math.abs(dx)>Math.abs(dy)*1.4?(dx<0?'next':'previous'):'tilt';
}
// Dismiss only after a deliberate pull and a release near the bottom of the stage.
export function downwardExit({dx=0,dy=0,scale=1,multi=false,stageTop=0,stageHeight=0,releaseY=0}={}){
 return !multi&&scale<=1.01&&stageHeight>0&&dy>=stageHeight*.45&&releaseY>=stageTop+stageHeight*.85&&dy>Math.abs(dx)*1.35;
}
// Physical cards use screen-space flicks. Slow movement positions the card; rotation never changes swipe direction.
export function physicalGestureAction({dx=0,dy=0,velocityX=0,velocityY=0,multi=false}={}){
 if(multi)return 'pose';
 if(Math.abs(dx)>=72&&Math.abs(dx)>Math.abs(dy)*1.4&&Math.abs(velocityX)>=.55)return dx<0?'next':'previous';
 if(dy<=-72&&-dy>Math.abs(dx)*1.4&&velocityY<=-.55)return 'return';
 return 'pose';
}
// Edge gestures are measured against the visible stage, never the rotated photograph.
export function physicalEdgeAction({dx=0,dy=0,y=0,stageTop=0,stageHeight=0,multi=false}={}){
 if(multi||stageHeight<=0||Math.abs(dy)<72||Math.abs(dy)<=Math.abs(dx)*1.35)return 'pose';
 if(dy>0&&y>=stageTop+stageHeight*.75)return 'exit';
 if(dy<0&&y<=stageTop+stageHeight*.25)return 'return';
 return 'pose';
}
const gestureTime=e=>Number.isFinite(e?.timeStamp)?e.timeStamp:performance.now();
const node=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
export class CardViewer{
 constructor({theme='cinema',intensity=8,renderBack,label='Artwork viewer',mount=null,onNavigate=null,onExpand=null,immersive=false,onActivate=null,sound=immersive,forwardFlourish=false,physicalCard=false,paperBack=true,backgroundNavigation=false,onDismiss=null}={}){
  this.immersive=immersive;this.physicalCard=Boolean(physicalCard&&immersive);this.paperBack=Boolean(paperBack);this.backgroundNavigation=Boolean(this.physicalCard&&backgroundNavigation);this.onDismiss=onDismiss;this.onActivate=onActivate;this.turn=0;this.turning=false;this.sound=Boolean(sound);this.soundAvailable=Boolean(sound);this.forwardFlourish=forwardFlourish;this.inline=Boolean(mount);this.onNavigate=onNavigate;this.onExpand=onExpand;
  this.items=[];this.index=0;this.intensity=intensity;this.renderBack=renderBack;this.reduced=matchMedia('(prefers-reduced-motion: reduce)');
  if(!document.querySelector('link[data-ola-viewer]')){const css=node('link');css.rel='stylesheet';css.href=new URL('./card-viewer.css?v=20261125-physical42',import.meta.url);css.dataset.olaViewer='';document.head.append(css);}
  this.dialog=node(this.inline?'section':'dialog',this.inline?'ola-inline-card-viewer':'ola-card-dialog');this.dialog.setAttribute('aria-label',label);this.dialog.dataset.theme=theme;if(this.immersive)this.dialog.className+=' ola-card-immersive';
  const tools=this.tools=node('div','ola-card-tools');this.closeButton=this.button('Close',()=>this.close());this.prev=this.button('Previous',()=>this.move(-1));this.next=this.button('Next',()=>this.forward());this.flipButton=this.button('Read the back',()=>this.flip());this.zoomButton=this.button('Zoom in',()=>this.zoom(this.scale>1?1:2));this.resetButton=this.button('Reset view',()=>this.reset());tools.append(this.closeButton,this.prev,this.next,this.flipButton,this.zoomButton,this.resetButton);
  this.stage=node('div','ola-card-stage');this.card=node('div','ola-physical-card');this.front=node('div','ola-card-front');this.image=node('img');this.image.draggable=false;this.image.decoding='async';this.front.append(this.image);this.back=node('section','ola-card-back');this.back.hidden=true;this.back.tabIndex=0;this.card.append(this.front,this.back);this.stage.append(this.card);
  if(this.physicalCard){
   this.dialog.dataset.physical='true';this.flipButton.hidden=!this.paperBack;this.flipButton.disabled=!this.paperBack;
   this.reverse=node('div','ola-card-paper-reverse');this.reverse.setAttribute('role','img');this.reverse.setAttribute('aria-label','Plain paper reverse. A scan of the actual back has not been added.');this.card.append(this.reverse);
   this.rotateLeft=this.button('Rotate left',()=>this.rotate(-90));this.rotateRight=this.button('Rotate right',()=>this.rotate(90));this.returnButton=this.button('Toss and return',()=>this.loft({playMotion:true}));this.returnButton.title='Play the full spin-and-return animation once';tools.append(this.rotateLeft,this.rotateRight,this.returnButton);
  }
  this.caption=node('p','ola-card-caption');this.caption.setAttribute('role','status');this.source=node('a','ola-card-source','Open original image');this.source.target='_blank';this.source.rel='noopener';
  if(this.inline){const controls=node('details','ola-inline-controls');controls.append(node('summary',null,'Card controls'),tools,this.source);this.closeButton.textContent='Expand card';this.closeButton.onclick=()=>this.onExpand?.(this.index);this.caption.className='ola-inline-caption';this.dialog.append(this.stage,controls,this.caption);mount.append(this.dialog);}else{this.dialog.append(tools,this.stage,this.caption,this.source);document.body.append(this.dialog);}this.pointers=new Map();
  if(this.immersive){this.source.hidden=true;this.closeButton.textContent='Review details';this.closeButton.onclick=()=>this.activate();this.flipButton.textContent='Read the back';this.stage.tabIndex=0;this.stage.setAttribute('aria-label','Drag to turn the card, pinch to zoom, flick sideways for another card. Tap the card for review details. Tap the surrounding space for controls.');this.dialog.dataset.controls='false';this.stage.addEventListener('click',e=>{if(this.suppressTap){this.suppressTap=false;return;}if((this.physicalCard?this.card:this.front).contains(e.target))this.activate();else this.setControls(this.dialog.dataset.controls!=='true');});}

  if(this.immersive)tools.addEventListener('click',e=>{if(e.target===tools)this.setControls(false);});
  // Safari may permit audio only at the trusted release, not touchstart. Re-arm without changing mute.
  for(const type of ['touchend','pointerup','keydown'])this.dialog.addEventListener(type,()=>{if(this.sound)this.unlockAudio();},{capture:true,passive:true});
  if(this.soundAvailable){this.soundButton=this.button('Sound on',()=>{this.sound=!this.sound;if(!this.sound)this.projector?.stop();this.soundButton.textContent=this.sound?'Sound on':'Sound off';this.soundButton.setAttribute('aria-pressed',String(this.sound));if(this.sound)this.reelSound();});this.soundButton.setAttribute('aria-pressed','true');tools.append(this.soundButton);}

  this.dialog.addEventListener('close',()=>{document.documentElement.style.overflow=this.oldOverflow||'';this.notifyStage(false);this.pointers.clear();this.projector?.stop();this.turn++;this.turning=false;this.returning=false;this.returnAnimation?.cancel?.();this.returnAnimation=null;this.opener?.focus({preventScroll:true});});
  this.dialog.addEventListener('keydown',e=>{if(e.target.matches('input,textarea,select'))return;if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();this.move(e.key==='ArrowRight'?1:-1)}if(this.immersive&&(e.key==='Enter'||e.key===' ' )&&e.target===this.stage){e.preventDefault();this.activate();}if(this.physicalCard&&e.target===this.stage&&['f','F','r','R','ArrowUp'].includes(e.key)){e.preventDefault();if(e.key==='ArrowUp')this.loft({playMotion:true});else if(e.key.toLowerCase()==='f')this.flip();else this.rotate(e.shiftKey?-90:90);}if(this.immersive&&e.key==='Tab')this.setControls(true);if(e.key==='Escape'){e.preventDefault();e.stopPropagation();if(this.physicalCard)this.exit();else if(this.immersive)this.activate();else if(this.inline)this.reset();else this.close();return;}if(e.key==='Tab'&&!this.inline)this.trapFocus(e);});
  this.stage.addEventListener('pointerdown',e=>{if(!(this.immersive&&e.pointerType==='touch'))this.down(e)});this.stage.addEventListener('pointermove',e=>{if(!(this.immersive&&e.pointerType==='touch'))this.drag(e)});for(const type of ['pointerup','pointercancel','lostpointercapture'])this.stage.addEventListener(type,e=>{if(!(this.immersive&&e.pointerType==='touch'))this.up(e,type==='pointerup')});
  if(this.immersive){
   // Native touch events keep both fingers through Safari's gesture recognition. Do not process pointer-touch duplicates.
   const adapt=(t,e)=>({pointerId:t.identifier,pointerType:'native-touch',target:t.target,clientX:t.clientX,clientY:t.clientY,timeStamp:e.timeStamp,preventDefault:()=>e.preventDefault()});
   for(const type of ['touchstart','touchmove','touchend','touchcancel'])this.stage.addEventListener(type,e=>{if(this.flipped)return;e.preventDefault();if(this.physicalCard&&type!=='touchstart')for(const t of e.changedTouches){if(this.pointers.has(t.identifier))this.pointers.set(t.identifier,{x:t.clientX,y:t.clientY});}for(const t of e.changedTouches){const point=adapt(t,e);if(type==='touchstart')this.down(point);else if(type==='touchmove')this.drag(point);else this.up(point,type==='touchend');}},{passive:false});
   for(const type of ['gesturestart','gesturechange','gestureend'])this.stage.addEventListener(type,e=>e.preventDefault(),{passive:false});
  }
  if(this.physicalCard){this.resizePhysical=()=>{if(this.dialog.open)this.paint();};this.image.addEventListener('load',this.resizePhysical);if(typeof window!=='undefined'){window.addEventListener?.('resize',this.resizePhysical);window.visualViewport?.addEventListener('resize',this.resizePhysical);}}
  this.image.addEventListener('error',()=>{this.caption.textContent='This image could not load. Open the original or try another card.';});
 }
 setControls(show){this.dialog.dataset.controls=String(show);if(!show&&(this.physicalCard?this.dialog:this.tools).contains(document.activeElement)&&document.activeElement!==this.stage)this.stage.focus({preventScroll:true});}
 button(text,fn){const b=node('button',null,text);b.type='button';b.dataset.world='card-'+text.toLowerCase().replace(/[^a-z0-9]+/g,'-');b.onclick=fn;return b;}
 trapFocus(e){const list=[...this.dialog.querySelectorAll('button:not(:disabled),a[href],textarea,input,[tabindex="0"]')].filter(n=>n.getClientRects().length);const first=list[0],last=list.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}
 setCollection(items){this.items=items.filter(x=>x?.src);}
 open(items,index=0,opener=document.activeElement){this.consumedPointers?.clear();this.setCollection(items);if(!this.items.length)return;this.index=Math.max(0,Math.min(index,this.items.length-1));this.opener=opener;if(this.sound)this.unlockAudio();this.show();if(this.inline)return;if(!this.dialog.open){this.oldOverflow=document.documentElement.style.overflow;document.documentElement.style.overflow='hidden';this.dialog.showModal();this.notifyStage(true);}if(this.immersive)this.stage.focus();else this.closeButton.focus();}
 close(){if(this.dialog.open)this.dialog.close();}
 show(){const f=this.items[this.index];this.reset();this.image.src=f.src;this.image.alt=f.alt||f.title||'Artwork';this.source.href=f.src;this.back.replaceChildren();if(this.renderBack)this.renderBack(this.back,f);else this.back.append(node('h2',null,f.title||'About this card'),node('p',null,f.description||'No additional details are published for this image.'));this.caption.textContent=(f.title||f.alt||'Artwork')+' · '+(this.index+1)+' of '+this.items.length;this.prev.disabled=this.next.disabled=this.items.length<2;}
 forward(){if(this.forwardFlourish)return this.toss(1,{flourish:true});this.move(1);}
 move(delta){if(this.immersive){this.toss(delta);return;}if(this.items.length<2)return;this.reelSound();this.index=(this.index+delta+this.items.length)%this.items.length;this.show();if(this.inline)this.onNavigate?.(this.items[this.index]);}
 flip(){if(this.pointers.size||this.turning||(this.physicalCard&&!this.paperBack))return;if(this.physicalCard){this.faceY=this.faceY?0:180;this.turnPreview=0;this.updateFace();this.paint();return;}if(this.immersive){this.activate();return;}this.flipped=!this.flipped;this.front.hidden=this.flipped;this.back.hidden=!this.flipped;this.flipButton.textContent=this.flipped?'See the image':'Read the back';this.flipButton.setAttribute('aria-pressed',String(this.flipped));this.zoomButton.disabled=this.flipped;this.stage.style.touchAction=this.flipped?'pan-y':'none';if(this.flipped)this.back.focus();}
 reset(){if(this.returning){this.turn++;this.turning=false;this.returning=false;this.returnAnimation?.cancel?.();this.returnAnimation=null;}this.faceY=0;this.turnPreview=0;this.orientation=0;this.scale=1;this.panX=this.panY=this.rotX=this.rotY=this.rotZ=0;this.flipped=false;this.front.hidden=false;this.back.hidden=true;this.zoomButton.disabled=false;this.flipButton.textContent='Read the back';this.flipButton.setAttribute('aria-pressed','false');this.zoomButton.textContent='Zoom in';this.stage.style.touchAction='none';if(this.physicalCard)this.updateFace();this.paint();}
 zoom(scale,{keepPan=false}={}){this.scale=Math.max(1,Math.min(3,scale));if(this.scale===1&&!keepPan)this.panX=this.panY=0;this.zoomButton.textContent=this.scale>1?'Zoom out':'Zoom in';this.paint();}
 // Physical mode is opt-in; Cinema retains its original front/details behavior.
 updateFace(){
  const back=Boolean(this.faceY);this.front.setAttribute('aria-hidden',String(back));this.reverse.setAttribute('aria-hidden',String(!back));
  this.flipButton.textContent=back?'See photograph':'Turn card over';this.flipButton.setAttribute('aria-pressed',String(back));
  this.caption.textContent=back?'Plain paper reverse · actual back scan not yet added':this.items[this.index]?.title||'Photograph';
 }
 rotate(degrees){if(!this.physicalCard||this.pointers.size||this.turning)return;this.orientation=(this.orientation+degrees+360)%360;this.rotZ=0;this.panX=this.panY=0;this.paint();}
 paint(){
  const r=this.reduced.matches,z=(this.rotZ||0)+(this.orientation||0);
  let fit=1;
  if(this.physicalCard){const angle=z*Math.PI/180,w=this.card.offsetWidth||0,h=this.card.offsetHeight||0;
   const width=Math.abs(Math.cos(angle))*w+Math.abs(Math.sin(angle))*h,height=Math.abs(Math.sin(angle))*w+Math.abs(Math.cos(angle))*h;
   if(width&&height)fit=Math.min(1,this.stage.clientWidth*.94/width,this.stage.clientHeight*.9/height);
  }
  this.card.style.transform=`translate(${this.panX}px,${this.panY}px) scale(${this.scale*fit}) rotateX(${r?0:this.rotX}deg) rotateY(${(this.faceY||0)+(this.turnPreview||0)+(r?0:this.rotY)}deg) rotateZ(${z}deg)`;
  this.card.style.setProperty('--gloss-x',(50+this.rotY*3)+'%');
 }
 physicalPose(){return {panX:this.panX,panY:this.panY,rotX:this.rotX,rotY:this.rotY,rotZ:this.rotZ,orientation:this.orientation,faceY:this.faceY,scale:this.scale};}
 restorePhysicalPose(pose){for(const key of ['panX','panY','rotX','rotY','rotZ','orientation','faceY','scale'])if(Number.isFinite(pose[key]))this[key]=pose[key];this.zoomButton.textContent=this.scale>1?'Zoom out':'Zoom in';this.updateFace();this.paint();}
 async loft({playMotion=false}={}){
  if(!this.physicalCard||this.turning||this.pointers.size)return;
  this.turning=this.returning=true;const token=++this.turn;this.dialog.dataset.dragging='false';this.reelSound();
  const departure=this.card.style.transform;
  this.restorePhysicalPose({panX:0,panY:0,rotX:0,rotY:0,rotZ:0,orientation:0,faceY:0,scale:1});
  const home=this.card.style.transform;
  if((playMotion===true||!this.reduced.matches)&&this.card.animate){
   // One continuous end-over-end turn; no yaw reversal or overlapping-axis tumble.
   const distance=this.stage.clientHeight+Math.hypot(this.card.offsetWidth||this.stage.clientWidth,this.card.offsetHeight||this.stage.clientHeight);
   const fit=Number(home.match(/scale\(([^)]+)\)/)?.[1])||1;
   const pose=(x,y,size,pitch,roll=0)=>`translate(${x}px,${y}px) scale(${fit*size}) rotateX(${pitch}deg) rotateY(0deg) rotateZ(${roll}deg)`;
   const animation=this.returnAnimation=this.card.animate([
    {transform:departure,offset:0},
    {transform:pose(0,-this.stage.clientHeight*.5,.8,75,-5),offset:.22},
    {transform:pose(0,-distance,.55,180,-7),offset:.43},
    {transform:pose(0,-distance,.55,245,-4),offset:.53},
    {transform:pose(0,9,1,355,0),offset:.88},
    {transform:pose(0,0,1,360,0),offset:1}
   ],{duration:1150,easing:'cubic-bezier(.3,0,.25,1)',fill:'none'});
   try{await animation.finished;}catch{}
  }
  if(token!==this.turn)return;
  this.returnAnimation=null;this.returning=this.turning=false;this.paint();
 }
 exit(){if(this.turning||this.pointers.size)return;this.close();this.onDismiss?.(this.items[this.index]);}
 down(e){
  if(this.physicalCard&&this.consumedPointers?.size){this.consumedPointers.add(e.pointerId);e.preventDefault();return;}
  if(this.flipped||this.turning)return;e.preventDefault();this.dialog.dataset.dragging='true';if(e.pointerType!=='native-touch')this.stage.setPointerCapture(e.pointerId);if(this.sound)this.unlockAudio();
  this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(this.pointers.size===1){
   const time=this.physicalCard?gestureTime(e):performance.now();
   this.start={...(this.physicalCard?this.physicalPose():{}),x:e.clientX,y:e.clientY,panX:this.panX,panY:this.panY,time,target:e.target,background:this.backgroundNavigation&&!this.card.contains(e.target)};
   this.last={x:e.clientX,y:e.clientY,time};this.velocity=this.velocityY=0;this.travel=0;this.suppressTap=false;this.multi=false;
  }else{
   this.multi=true;const [a,b]=[...this.pointers.values()];this.pinch=Math.hypot(a.x-b.x,a.y-b.y);this.pinchScale=this.scale;this.pinchAngle=Math.atan2(b.y-a.y,b.x-a.x);this.pinchRotation=this.rotZ||0;this.pinchFace=this.faceY||0;this.turnPreview=0;this.pinchCenter={x:(a.x+b.x)/2,y:(a.y+b.y)/2,panX:this.panX,panY:this.panY};
  }
 }
 drag(e){
  if(!this.pointers.has(e.pointerId)||this.flipped)return;
  this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(this.pointers.size>1){
   const [a,b]=[...this.pointers.values()];
   const angle=Math.atan2(b.y-a.y,b.x-a.x)-this.pinchAngle,delta=Math.atan2(Math.sin(angle),Math.cos(angle))*180/Math.PI;
   const ratio=Math.hypot(a.x-b.x,a.y-b.y)/Math.max(this.pinch,1),cx=(a.x+b.x)/2-this.pinchCenter.x,cy=(a.y+b.y)/2-this.pinchCenter.y;
   if(this.immersive){this.rotZ=this.pinchRotation+delta;this.panX=this.pinchCenter.panX+cx;this.panY=this.pinchCenter.panY+cy;this.suppressTap=true;}
   // A broad, level two-finger sweep turns the paper. Pinch/twist remain simultaneous pan/zoom/rotation.
   if(this.physicalCard&&this.paperBack&&this.pinchScale<=1.01&&Math.abs(ratio-1)<.12&&Math.abs(delta)<20&&Math.abs(cx)>Math.abs(cy)*1.4){
    this.turnPreview=Math.max(-180,Math.min(180,cx/this.stage.clientWidth*360));this.panX=this.pinchCenter.panX;this.panY=this.pinchCenter.panY;
   }else this.turnPreview=0;
   this.zoom(this.pinchScale*ratio,{keepPan:this.physicalCard});return;
  }
  const dx=e.clientX-this.start.x,dy=e.clientY-this.start.y;this.travel=Math.max(this.travel||0,Math.hypot(dx,dy));if(this.travel>8)this.suppressTap=true;
  const now=this.physicalCard?gestureTime(e):performance.now();if(!this.physicalCard||e.clientX!==this.last.x||e.clientY!==this.last.y){if(now-this.last?.time>0){this.velocity=(e.clientX-this.last.x)/(now-this.last.time);this.velocityY=(e.clientY-this.last.y)/(now-this.last.time);}this.last={x:e.clientX,y:e.clientY,time:now};}
  if(this.scale>(this.physicalCard?1.01:1)){const limitX=this.stage.clientWidth*this.scale/2,limitY=this.stage.clientHeight*this.scale/2;this.panX=Math.max(-limitX,Math.min(limitX,this.start.panX+dx));this.panY=Math.max(-limitY,Math.min(limitY,this.start.panY+dy));}
  else{this.rotY=Math.max(-this.intensity,Math.min(this.intensity,(this.physicalCard?this.start.rotY:0)+dx/10));this.rotX=Math.max(-this.intensity,Math.min(this.intensity,(this.physicalCard?this.start.rotX:0)-dy/10));if(this.immersive){this.panX=this.start.panX+dx*.85;this.panY=this.start.panY+dy*.85;this.rotZ=(this.physicalCard?this.start.rotZ:0)+Math.max(-18,Math.min(18,dx/18));}else if(this.inline){this.panX=Math.max(-this.stage.clientWidth*.3,Math.min(this.stage.clientWidth*.3,dx*.6));this.panY=Math.max(-this.stage.clientHeight*.2,Math.min(this.stage.clientHeight*.2,dy*.6));}}
  this.paint();
  if(this.physicalCard&&!this.multi){
   const action=physicalEdgeAction({dx,dy,y:e.clientY,stageTop:this.stage.getBoundingClientRect().top,stageHeight:this.stage.clientHeight});
   if(action!=='pose'){
    // Consume the complete held gesture before animating; its eventual releases cannot activate anything else.
    this.suppressTap=true;this.consumedPointers=new Set(this.pointers.keys());this.pointers.clear();this.dialog.dataset.dragging='false';
    if(action==='exit')this.dismiss();else this.loft();
   }
  }
 }
 up(e,commit){if(this.physicalCard&&this.consumedPointers?.has(e.pointerId)){this.consumedPointers.delete(e.pointerId);return;}if(!this.pointers.has(e.pointerId))return;if(this.physicalCard&&commit){this.drag(e);if(!this.pointers.has(e.pointerId)){this.consumedPointers?.delete(e.pointerId);return;}}this.pointers.delete(e.pointerId);if(!commit)this.turnPreview=0;if(this.pointers.size){this.multi=true;const [a]=this.pointers.values();this.start={...(this.physicalCard?this.physicalPose():{}),x:a.x,y:a.y,panX:this.panX,panY:this.panY,...(this.physicalCard?{time:gestureTime(e),target:this.start?.target}:{})};if(this.physicalCard)this.last={x:a.x,y:a.y,time:gestureTime(e)};return;}if(this.physicalCard&&this.multi){if(this.paperBack&&commit&&Math.abs(this.turnPreview||0)>=90)this.faceY=this.pinchFace?0:180;this.turnPreview=0;this.updateFace();}if(this.start){this.travel=Math.max(this.travel||0,Math.hypot(e.clientX-this.start.x,e.clientY-this.start.y));if(this.travel>8)this.suppressTap=true;}if(this.physicalCard){this.finishPhysicalGesture(e,commit);return;}if(commit&&this.start&&!this.flipped){const dx=e.clientX-this.start.x,dy=e.clientY-this.start.y;if(this.immersive&&downwardExit({dx,dy,scale:this.scale,multi:this.multi,stageTop:this.stage.getBoundingClientRect().top,stageHeight:this.stage.clientHeight,releaseY:e.clientY})){this.dismiss();return;}const action=gestureAction({dx:e.clientX-this.start.x,dy:e.clientY-this.start.y,scale:this.scale,multi:this.multi,threshold:(this.inline||this.immersive)?Math.max(110,this.stage.clientWidth*.38):65,velocity:this.immersive&&performance.now()-this.last.time<100?this.velocity:0});if(action==='next'||action==='previous')this.move(action==='next'?1:-1);}this.dialog.dataset.dragging='false';if((this.inline||this.immersive)&&this.scale===1)this.panX=this.panY=0;this.rotX=this.rotY=0;if(this.immersive&&this.scale===1&&!this.multi)this.rotZ=0;this.paint();if(e.pointerType==='native-touch'&&commit&&!this.multi&&(this.travel||0)<8){this.suppressTap=true;if((this.physicalCard?this.card:this.front).contains(this.start.target))this.activate();else this.setControls(this.dialog.dataset.controls!=='true');}}
 finishPhysicalGesture(e,commit){
  this.dialog.dataset.dragging='false';
  if(commit&&this.start){
   const dx=e.clientX-this.start.x,dy=e.clientY-this.start.y;
   // A fresh background swipe recovers an offscreen card even after a slower stroke or pause.
   // Card-start drags still retain their physical pose; a multi-touch gesture never becomes navigation.
   if(this.start.background&&!this.multi&&Math.abs(dx)>=Math.max(96,this.stage.clientWidth*.2)&&Math.abs(dx)>Math.abs(dy)*1.4){this.move(dx<0?1:-1);return;}
   const recent=gestureTime(e)-this.last.time<=140;
   const action=physicalGestureAction({dx,dy,multi:this.multi,velocityX:recent?this.velocity:0,velocityY:recent?this.velocityY:0});
   if(action==='next'||action==='previous'){this.move(action==='next'?1:-1);return;}
  }
  // Position, twist, tilt, scale and paper face stay where the owner left them.
  this.paint();
  if(e.pointerType==='native-touch'&&commit&&!this.multi&&(this.travel||0)<8){this.suppressTap=true;if(this.card.contains(this.start.target))this.activate();else this.setControls(this.dialog.dataset.controls!=='true');}
 }
 notifyStage(active){if(this.immersive&&typeof window!=='undefined'&&window.parent!==window)window.parent.postMessage({type:'ola-cinema-card-stage',active},location.origin);}
 activate(){if(this.turning||this.pointers.size)return;this.onActivate?.(this.items[this.index]);this.close();}
 async toss(delta,{flourish=false}={}){
  if(this.turning||this.items.length<2)return;this.turning=true;const token=++this.turn;const sign=delta>0?-1:1;this.dialog.dataset.dragging='false';this.reelSound();
  const animate=async (frames,duration=240)=>{if(this.reduced.matches||!this.card.animate)return;const a=this.card.animate(frames,{duration,easing:'cubic-bezier(.2,.7,.3,1)',fill:'none'});try{await a.finished;}catch{}};
  const away=`translate(${sign*this.stage.clientWidth*1.25}px,-${this.stage.clientHeight*.35}px) rotateZ(${sign*40}deg) rotateY(${sign*-210}deg) scale(.45)`;
  await animate(flourish?[{transform:this.card.style.transform,opacity:1},{transform:away,opacity:0,offset:.65},{transform:away,opacity:0}]:[{transform:this.card.style.transform,opacity:1},{transform:`translate(${sign*this.stage.clientWidth*1.25}px,${this.panY-30}px) rotateZ(${sign*26}deg) rotateY(${sign*-35}deg) scale(.88)`,opacity:0}],flourish?850:240);
  if(token!==this.turn)return;this.index=(this.index+delta+this.items.length)%this.items.length;this.show();this.onNavigate?.(this.items[this.index]);
  await animate([{transform:flourish?`translate(${-sign*80}px,-30px) rotateY(${-sign*165}deg) rotateZ(${-sign*16}deg) scale(.5)`:`translate(${-sign*45}px,12px) rotateZ(${-sign*8}deg) scale(.94)`,opacity:0},{transform:'translate(0px,0px) rotateY(0deg) rotateZ(0deg) scale(1)',opacity:1}],flourish?950:240);if(token===this.turn)this.turning=false;
 }
 unlockAudio(){if(this.sound)(this.projector||(this.projector=new CardFlickSound())).unlock();}
 reelSound(){if(this.sound)(this.projector||(this.projector=new CardFlickSound())).burst();}
 async dismiss(){if(this.turning)return;this.turning=true;const token=++this.turn;this.reelSound();this.dialog.dataset.dragging='false';if(!this.reduced.matches&&this.card.animate){const a=this.card.animate([{transform:this.card.style.transform,opacity:1},{transform:`translate(${this.panX}px,${this.stage.clientHeight*1.3}px) rotateZ(${this.rotZ||8}deg) scale(.9)`,opacity:0}],{duration:260,easing:'ease-in',fill:'none'});try{await a.finished;}catch{}}if(token!==this.turn)return;this.turning=false;if(this.physicalCard)this.exit();else this.activate();}

 destroy(){this.close();this.projector?.destroy();if(this.resizePhysical&&typeof window!=='undefined'){window.removeEventListener?.('resize',this.resizePhysical);window.visualViewport?.removeEventListener('resize',this.resizePhysical);}this.dialog.remove();}
}

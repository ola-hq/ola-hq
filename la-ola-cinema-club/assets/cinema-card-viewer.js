import {CardViewer} from '../../assets/ola-worlds/card-viewer.js?v=20261126-cinema49';
import {CardFlickSound} from '../../assets/ola-worlds/card-sound.js?v=20261125-worlds33';
import {CinemaRoomScene} from './cinema-room-scene.js?v=20261127-room62';
import {CinemaTrackpad} from './cinema-trackpad.js?v=20261127-trackpad64';

// Cinema opts into the published physical viewer, retaining its own sound backend and review routes.
export class CinemaCardViewer extends CardViewer {
 constructor(options={}) {
  super({...options,theme:'cinema',immersive:true,physicalCard:true,paperBack:false,backgroundNavigation:true,doubleTapDetails:true,intensity:18});
  if(!document.querySelector('link[data-cinema-stage]')){
   const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('./cinema-card-viewer.css?v=20261127-trackpad64',import.meta.url);css.dataset.cinemaStage='';document.head.append(css);
  }
  this.closeButton.textContent='Review details';
  this.stage.setAttribute('aria-label','Move and tilt the card. Pinch and twist with two fingers. Flick sideways to flip to another review. Slide into the top quarter to toss and return centered, or the bottom quarter to leave. Double-tap the card for review details. Tap empty space for controls. Arrow keys browse, R rotates, Up tosses, and Escape returns to the collection. On a desktop trackpad, slide two fingers to move the card and pinch to zoom. Reset view centers it again.');
  const back=this.button('Back to collection',()=>this.exit());back.className='cinema-stage-return';
  this.controlsToggle=this.button('Card controls',()=>this.setControls(this.dialog.dataset.controls!=='true'));this.controlsToggle.className='cinema-stage-controls';this.controlsToggle.setAttribute('aria-expanded','false');
  const mark=document.createElement('div');mark.className='cinema-stage-mark';mark.setAttribute('aria-hidden','true');
  const emblem=document.createElement('img');emblem.src=new URL('./brand/la-ola-emblem-v2.webp',import.meta.url);emblem.alt='';
  const name=document.createElement('span');name.textContent='LA OLA CINEMA CLUB';mark.append(emblem,name);
  this.dialog.append(mark,back,this.controlsToggle);
  // The existing cinema interior surrounds the same gesture plane used by every card.
  this.room=document.createElement('div');this.room.className='cinema-viewing-room';
  this.room.setAttribute('aria-hidden','true');this.room.inert=true;
  const scene=document.createElement('div');scene.className='cinema-room-scene';
  for(const face of ['back','left','right','floor','ceiling']){
   const wall=document.createElement('div');wall.className='cinema-room-wall cinema-room-wall--'+face;scene.append(wall);
  }
  const light=document.createElement('div');light.className='cinema-room-projector';
  this.room.append(scene,light);this.dialog.append(this.room);
  this.roomScene=new CinemaRoomScene(this.room,this.stage,{imageURL:new URL('../../assets/portal-interiors-20261125/cinema-interior.webp',import.meta.url).href});
  this.roomVisibility=()=>{this.room.style.setProperty('--cinema-room-motion',document.hidden?'paused':'running');this.roomScene.refresh();};
  this.roomVisibility();document.addEventListener('visibilitychange',this.roomVisibility);
  this.trackpad=new CinemaTrackpad(this);
 }
 // Motion comes from the shared engine. No Polaroid sound module or recording is imported.
 loft(options={}) {this.trackpad?.cancel();return super.loft({playMotion:true,...options});}
 toss(delta,options={}) {this.trackpad?.cancel();return super.toss(delta,{paperFlip:true,playMotion:true,...options});}
 dismiss() {this.trackpad?.cancel();return super.dismiss({feedbackDelay:380});}
 reset() {this.trackpad?.cancel();return super.reset();}
 down(event) {this.trackpad?.cancel();return super.down(event);}
 unlockAudio() {if(this.sound)(this.projector||(this.projector=new CardFlickSound())).unlock();}
 reelSound(action='browse') {if(this.sound)(this.projector||(this.projector=new CardFlickSound())).burst(action);}
 setControls(show) {super.setControls(show);this.controlsToggle?.setAttribute('aria-expanded',String(show));}
 updateFace() {
  super.updateFace();
  this.reverse.hidden=true;
  this.flipButton.hidden=false;this.flipButton.disabled=false;this.flipButton.textContent='Read the back';
 }
 // Cinema's real back is the published review, not Polaroid's unused paper reverse.
 flip() {if(!this.pointers.size&&!this.turning)this.activate();}
 destroy() {this.trackpad.destroy();document.removeEventListener('visibilitychange',this.roomVisibility);this.roomScene.destroy();super.destroy();}
}

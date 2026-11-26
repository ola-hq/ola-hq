import {CardViewer} from '../../assets/ola-worlds/card-viewer.js?v=20261126-cinema49';
import {CardFlickSound} from '../../assets/ola-worlds/card-sound.js?v=20261125-worlds33';

// Cinema opts into the published physical viewer, retaining its own sound backend and review routes.
export class CinemaCardViewer extends CardViewer {
 constructor(options={}) {
  super({...options,theme:'cinema',immersive:true,physicalCard:true,paperBack:false,backgroundNavigation:true,doubleTapDetails:true,intensity:18});
  if(!document.querySelector('link[data-cinema-stage]')){
   const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('./cinema-card-viewer.css?v=20261126-cinema49',import.meta.url);css.dataset.cinemaStage='';document.head.append(css);
  }
  this.closeButton.textContent='Review details';
  this.stage.setAttribute('aria-label','Move and tilt the card. Pinch and twist with two fingers. Flick sideways to flip to another review. Slide into the top quarter to toss and return centered, or the bottom quarter to leave. Double-tap the card for review details. Tap empty space for controls. Arrow keys browse, R rotates, Up tosses, and Escape returns to the collection.');
  const back=this.button('Back to collection',()=>this.exit());back.className='cinema-stage-return';
  this.controlsToggle=this.button('Card controls',()=>this.setControls(this.dialog.dataset.controls!=='true'));this.controlsToggle.className='cinema-stage-controls';this.controlsToggle.setAttribute('aria-expanded','false');
  const mark=document.createElement('div');mark.className='cinema-stage-mark';mark.setAttribute('aria-hidden','true');
  const emblem=document.createElement('img');emblem.src=new URL('./brand/la-ola-emblem-v2.webp',import.meta.url);emblem.alt='';
  const name=document.createElement('span');name.textContent='LA OLA CINEMA CLUB';mark.append(emblem,name);
  this.dialog.append(mark,back,this.controlsToggle);
 }
 // Motion comes from the shared engine. No Polaroid sound module or recording is imported.
 loft(options={}) {return super.loft({playMotion:true,...options});}
 toss(delta,options={}) {return super.toss(delta,{paperFlip:true,playMotion:true,...options});}
 dismiss() {return super.dismiss({feedbackDelay:380});}
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
}

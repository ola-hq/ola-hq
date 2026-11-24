export function tiltAt(x,y,box){
 const unit=(value,start,size)=>size>0?Math.max(-1,Math.min(1,2*(value-start)/size-1)):0;
 return {x:-unit(y,box.top,box.height)*9,y:unit(x,box.left,box.width)*12};
}
export function initArtViewer(){
 const links=[...document.querySelectorAll('.film-art-column > a')].filter(a=>a.querySelector('.film-main-art'));
 if(!links.length)return;
 const dialog=document.createElement('dialog');dialog.className='art-viewer';dialog.setAttribute('aria-label','Review artwork viewer');
 const close=document.createElement('button');close.type='button';close.className='button secondary art-viewer-close';close.textContent='Close artwork';
 const caption=document.createElement('p');caption.className='art-viewer-caption';
 const stage=document.createElement('div');stage.className='art-viewer-stage';
 const image=document.createElement('img');image.className='art-viewer-image';image.draggable=false;stage.append(image);
 const full=document.createElement('a');full.className='art-viewer-full';full.textContent='Open full-size image';
 dialog.append(close,caption,stage,full);document.body.append(dialog);
 const coarse=matchMedia('(hover: none) and (pointer: coarse)'),reduced=matchMedia('(prefers-reduced-motion: reduce)');let origin=null,dragging=false,previousOverflow='';
 const reset=()=>{dragging=false;image.style.transform='';stage.classList.remove('is-dragging')};
 const shut=()=>dialog.close();close.addEventListener('click',shut);
 dialog.addEventListener('close',()=>{reset();document.body.style.overflow=previousOverflow;if(origin)origin.focus()});
 dialog.addEventListener('click',e=>{if(e.target===dialog)shut()});
 for(const link of links)link.addEventListener('click',event=>{
  if(!(event.pointerType==='touch'||coarse.matches))return;
  event.preventDefault();origin=link;const source=link.querySelector('img');image.src=link.href;image.alt=source.alt;full.href=link.href;
  caption.textContent=reduced.matches?'Review artwork':'Drag gently to tilt the card. Lift your finger to settle it.';
  reset();previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';dialog.showModal();close.focus();
 });
 stage.addEventListener('pointerdown',event=>{
  if(event.pointerType!=='touch'||reduced.matches)return;
  dragging=true;stage.classList.add('is-dragging');stage.setPointerCapture(event.pointerId);event.preventDefault();
 });
 stage.addEventListener('pointermove',event=>{
  if(!dragging||reduced.matches)return;
  const tilt=tiltAt(event.clientX,event.clientY,stage.getBoundingClientRect());image.style.transform=`rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`;
 });
 stage.addEventListener('pointerup',reset);stage.addEventListener('pointercancel',reset);stage.addEventListener('lostpointercapture',reset);
 reduced.addEventListener('change',reset);
}

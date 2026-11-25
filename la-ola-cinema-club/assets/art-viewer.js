import {CardViewer} from '../../assets/ola-worlds/card-viewer.js?v=20261124-worlds29';
import {scoreText} from './collection-data.js?v=20261124-worlds29';
export function tiltAt(x,y,b){const clamp=n=>Math.max(-1,Math.min(1,n));return {x:-clamp(b.height?(y-b.top)/b.height*2-1:0)*9,y:clamp(b.width?(x-b.left)/b.width*2-1:0)*12};}
export function initArtViewer(){
 let records=[],collection=[],base,viewer,inlineViewer;
 const directTouch=()=>matchMedia('(pointer: coarse)').matches&&innerWidth<=700;
 const el=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
 const renderReview=(target,item)=>{const f=item.film;target.classList.add('cinema-review-back');target.append(el('p','FROM THE COLLECTION'),el('h2',f.title));const meta=el('p',[f.year,f.director?'Directed by '+f.director:'',f.genre,f.secondaryGenre].filter(Boolean).join(' · '));meta.className='cinema-back-meta';target.append(meta);const scores=el('div');scores.className='cinema-back-scores';for(const [key,label,max] of [['clubScore','The Club',10],['brain','The Brain',5],['heart','The Heart',5]]){const box=el('section'),value=el('strong',scoreText(f[key]));value.append(el('small',' /'+max));box.append(el('span',label),value);scores.append(box);}target.append(scores);if(f.quote)target.append(el('blockquote',f.quote));for(const [key,label]of [['brain','From the Brain'],['heart','From the Heart']]){const section=el('section');section.append(el('h3',label),el('p',f[key+'Reaction']||'No separate reaction is recorded.'));target.append(section);}if(f.review)target.append(el('p',f.review));if(f.artworkNotice)target.append(el('p',f.artworkNotice));const a=el('a','Read the full review and archive');a.href=new URL('films/'+f.slug+'/?details=1#review-details',base);target.append(a);};
 const getViewer=()=>viewer||(viewer=new CardViewer({label:'Cinema Club card viewer',renderBack:renderReview}));
 const open=(id,opener)=>{const source=collection.some(f=>f.id===id)?collection:records;const items=source.map(f=>({id:f.id,src:new URL(f.image,base).href,title:f.title,film:f}));getViewer().open(items,items.findIndex(f=>f.id===id),opener);};
 document.addEventListener('club-collection',e=>{records=collection=e.detail.films;base=e.detail.base;const f=records.find(f=>f.id===document.body.dataset.filmId);if(f){const a=document.querySelector('.film-art-column a');if(a){if(!directTouch())a.addEventListener('click',event=>{event.preventDefault();open(f.id,a)});const img=a.querySelector('img');if(img)img.src=new URL(f.image,base);}if(f.artworkNotice&&!document.querySelector('[data-edition-notice]')){const p=el('p',f.artworkNotice);p.className='artwork-edition-note';a?.after(p);}}});
 document.addEventListener('club-filtered',e=>collection=e.detail);
 // Review navigation and the educational stamp remain separate from this explicit viewer control.
 const decorate=()=>{
  const detail=document.querySelector('.film-art-column .film-art-frame');
  const current=records.find(f=>f.id===document.body.dataset.filmId);
  if(detail&&current){const heading=document.querySelector('h1');if(heading)heading.id='review-details';}
  if(detail&&current&&directTouch()&&!inlineViewer){
   const original=detail.querySelector('a');detail.dataset.viewerReady='true';detail.id='review-card';const reviewHeading=document.querySelector('h1');if(reviewHeading)reviewHeading.id='review-details';
   const source=collection.some(f=>f.id===current.id)?collection:records;const items=source.map(f=>({id:f.id,src:new URL(f.image,base).href,title:f.title,film:f}));
   const reveal=item=>{const target=new URL('films/'+item.film.slug+'/?details=1#review-details',base);if(item.id===current.id){history.replaceState(null,'',target);requestAnimationFrame(()=>document.querySelector('#review-details')?.scrollIntoView({block:'start',behavior:'instant'}));}else location.assign(target);};
   inlineViewer=new CardViewer({label:'Cinema card stage',immersive:true,intensity:18,renderBack:renderReview,onActivate:reveal});
   original.addEventListener('click',event=>{event.preventDefault();inlineViewer.open(items,items.findIndex(f=>f.id===current.id),original);});
   // The collection opens with just the card; tapping it reveals this review's full page.
   if(!new URL(location.href).searchParams.has('details'))inlineViewer.open(items,items.findIndex(f=>f.id===current.id),original);else{const focusReview=()=>requestAnimationFrame(()=>document.querySelector('#review-details')?.scrollIntoView({block:'start',behavior:'instant'}));document.fonts?.ready.then(focusReview);if(document.readyState==='complete')focusReview();else addEventListener('load',focusReview,{once:true});}

  }
  for(const frame of document.querySelectorAll('.film-art-frame')){if(frame.dataset.viewerReady==='true')continue;const anchor=frame.querySelector('a[href*="films/"]');if(!anchor)continue;const f=records.find(f=>anchor.href===new URL('films/'+f.slug+'/',base).href);if(!f)continue;const b=el('button','View card');b.type='button';b.dataset.viewCard=f.id;b.dataset.world='cinema-view-card';b.className='view-card-button';b.onclick=()=>open(f.id,b);frame.after(b);frame.dataset.viewerReady='true';}
 };
 const observer=new MutationObserver(()=>{observer.disconnect();decorate();observer.observe(document.querySelector('main'),{childList:true,subtree:true});});observer.observe(document.querySelector('main'),{childList:true,subtree:true});
}

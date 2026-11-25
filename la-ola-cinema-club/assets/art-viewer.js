import {CardViewer} from '../../assets/ola-worlds/card-viewer.js?v=20261124-worlds24';
import {scoreText} from './collection-data.js?v=20261124-worlds24';
export function tiltAt(x,y,b){const clamp=n=>Math.max(-1,Math.min(1,n));return {x:-clamp(b.height?(y-b.top)/b.height*2-1:0)*9,y:clamp(b.width?(x-b.left)/b.width*2-1:0)*12};}
export function initArtViewer(){
 let records=[],collection=[],base,viewer,inlineViewer;
 const directTouch=()=>matchMedia('(pointer: coarse)').matches&&innerWidth<=700;
 const el=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
 const getViewer=()=>viewer||(viewer=new CardViewer({label:'Cinema Club card viewer',renderBack:(target,item)=>{const f=item.film;target.append(el('h2',f.title),el('p','La Ola '+scoreText(f.clubScore)+'/10 · Brain '+scoreText(f.brain)+'/5 · Heart '+scoreText(f.heart)+'/5'));if(f.quote)target.append(el('blockquote',f.quote));if(f.review)target.append(el('p',f.review));else for(const [key,label]of [['brain','Brianna · The Brain'],['heart','Jonathan · The Heart']]){target.append(el('h3',label),el('p',f[key+'Reaction']||'No separate reaction is recorded.'));}if(f.artworkNotice)target.append(el('p',f.artworkNotice));const a=el('a','Read the review');a.href=new URL('films/'+f.slug+'/',base);target.append(a);}}));
 const open=(id,opener)=>{const source=collection.some(f=>f.id===id)?collection:records;const items=source.map(f=>({id:f.id,src:new URL(f.image,base).href,title:f.title,film:f}));getViewer().open(items,items.findIndex(f=>f.id===id),opener);};
 document.addEventListener('club-collection',e=>{records=collection=e.detail.films;base=e.detail.base;const f=records.find(f=>f.id===document.body.dataset.filmId);if(f){const a=document.querySelector('.film-art-column a');if(a){if(!directTouch())a.addEventListener('click',event=>{event.preventDefault();open(f.id,a)});const img=a.querySelector('img');if(img)img.src=new URL(f.image,base);}if(f.artworkNotice&&!document.querySelector('[data-edition-notice]')){const p=el('p',f.artworkNotice);p.className='artwork-edition-note';a?.after(p);}}});
 document.addEventListener('club-filtered',e=>collection=e.detail);
 // Review navigation and the educational stamp remain separate from this explicit viewer control.
 const decorate=()=>{
  const detail=document.querySelector('.film-art-column .film-art-frame');
  const current=records.find(f=>f.id===document.body.dataset.filmId);
  if(detail&&current&&directTouch()&&!inlineViewer){
   const original=detail.querySelector('a');const mount=el('div');mount.className='inline-card-mount';original.replaceWith(mount);detail.dataset.viewerReady='true';detail.id='review-card';
   const source=collection.some(f=>f.id===current.id)?collection:records;const items=source.map(f=>({id:f.id,src:new URL(f.image,base).href,title:f.title,film:f}));
   inlineViewer=new CardViewer({mount,label:'Interactive review card',intensity:11,renderBack:getViewer().renderBack,onNavigate:item=>{location.assign(new URL('films/'+item.film.slug+'/#review-card',base));},onExpand:index=>getViewer().open(items,index,inlineViewer.closeButton)});
   inlineViewer.stage.tabIndex=0;inlineViewer.stage.setAttribute('aria-label','Drag in any direction to tilt. Swipe across for the next or previous review. Card controls include zoom and the back.');inlineViewer.open(items,items.findIndex(f=>f.id===current.id));
   const focusCard=()=>requestAnimationFrame(()=>detail.scrollIntoView({block:'start'}));const style=document.querySelector('link[data-ola-viewer]');if(style?.sheet)focusCard();else style?.addEventListener('load',focusCard,{once:true});
  }
  for(const frame of document.querySelectorAll('.film-art-frame')){if(frame.dataset.viewerReady==='true')continue;const anchor=frame.querySelector('a[href*="films/"]');if(!anchor)continue;const f=records.find(f=>anchor.href===new URL('films/'+f.slug+'/',base).href);if(!f)continue;const b=el('button','View card');b.type='button';b.dataset.viewCard=f.id;b.dataset.world='cinema-view-card';b.className='view-card-button';b.onclick=()=>open(f.id,b);frame.after(b);frame.dataset.viewerReady='true';}
 };
 const observer=new MutationObserver(()=>{observer.disconnect();decorate();observer.observe(document.querySelector('main'),{childList:true,subtree:true});});observer.observe(document.querySelector('main'),{childList:true,subtree:true});
}

import {rememberBrowse} from './browse-context.js?v=20261125-worlds32';
import {CardViewer} from '../../assets/ola-worlds/card-viewer.js?v=20261125-worlds32';
const node=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text)e.textContent=text;return e;};
// One full collection, sourced from the approved registry-resolved records used by the shelf.
export function initContactSheet(){
 document.addEventListener('club-collection',event=>{
  if(!document.querySelector('[data-latest-grid],[data-review-grid]'))return;
  if(document.querySelector('[data-contact-open]'))return;
  const {films:records,base}=event.detail;const films=[...records].sort((a,b)=>b.order-a.order);let selected=[],opener,viewer,oldOverflow='';
  const dialog=node('dialog','cinema-contact-sheet');dialog.setAttribute('aria-label','Every review card');
  const header=node('header','contact-header'),title=node('h2',null,'Every card. Your next discovery.'),close=node('button','button secondary','Close grid');close.type='button';
  const search=node('input');search.type='search';search.placeholder='Find a film, genre or stamp';search.setAttribute('aria-label','Search review cards');
  const count=node('p','contact-count');count.setAttribute('role','status');
  const help=node('p','contact-help','Hover or hold a card to magnify. Scroll to explore; tap a card to open it.');
  const grid=node('div','contact-grid');grid.setAttribute('aria-label','All review cards');
  const lens=node('aside','contact-lens');lens.hidden=true;lens.setAttribute('aria-hidden','true');const image=node('img'),caption=node('p');image.alt='';lens.append(image,caption);
  header.append(title,close,search,count,help);dialog.append(header,grid,lens);document.body.append(dialog);
  const showLens=(button,x,y)=>{const f=selected.find(f=>f.id===button?.dataset.contactId);if(!f)return;image.src=f.image;caption.textContent=f.title;lens.hidden=false;
   const w=Math.min(220,innerWidth*.48),h=w*1.5+44;let left=x-w-24;if(left<10)left=Math.min(innerWidth-w-10,x+24);const top=Math.max(12,Math.min(innerHeight-h-12,y-h-24));lens.style.left=left+'px';lens.style.top=top+'px';
  };
  const hideLens=()=>{lens.hidden=true;};
  const openCard=(f,button)=>{rememberBrowse(selected,base);hideLens();const coarse=matchMedia('(pointer:coarse)').matches;viewer?.destroy();viewer=new CardViewer({immersive:coarse,sound:true,forwardFlourish:true,label:'Contact sheet card viewer',intensity:18,onActivate:item=>location.assign(new URL('films/'+item.film.slug+'/?details=1#review-details',base)),renderBack:(target,item)=>{target.append(node('h2',null,item.title));const a=node('a',null,'Read the full review');a.href=new URL('films/'+item.film.slug+'/?details=1#review-details',base);target.append(a);}});viewer.open(selected.map(f=>({id:f.id,src:f.image,title:f.title,film:f})),selected.indexOf(f),button);};
  const render=()=>{const q=search.value.trim().toLowerCase();selected=films.filter(f=>[f.title,f.genre,f.secondaryGenre,f.stamp].join(' ').toLowerCase().includes(q));hideLens();grid.replaceChildren();for(const f of selected){const b=node('button','contact-card');b.type='button';b.dataset.contactId=f.id;b.setAttribute('aria-label','Open '+f.title);const im=node('img');im.src=f.thumbnail||f.image;im.alt=f.title;im.loading='lazy';im.decoding='async';im.width=200;im.height=300;const label=node('span',null,f.title);b.append(im,label);b.addEventListener('pointermove',e=>{if(e.pointerType==='mouse')showLens(b,e.clientX,e.clientY)});b.addEventListener('pointerleave',hideLens);b.addEventListener('focus',()=>{const r=b.getBoundingClientRect();showLens(b,r.left+r.width/2,r.top)});b.addEventListener('blur',hideLens);b.addEventListener('click',()=>openCard(f,b));grid.append(b);}count.textContent=selected.length+' review card'+(selected.length===1?'':'s');if(!selected.length)grid.append(node('p',null,'No cards match that search.'));};
  // Passive native touch inspection keeps normal vertical scrolling. No fabricated finger hover.
  const inspect=e=>{const t=e.touches[0];if(!t)return;const b=document.elementFromPoint(t.clientX,t.clientY)?.closest('.contact-card');if(b)showLens(b,t.clientX,t.clientY);else hideLens();};
  grid.addEventListener('touchstart',inspect,{passive:true});grid.addEventListener('touchmove',inspect,{passive:true});grid.addEventListener('touchend',hideLens,{passive:true});grid.addEventListener('touchcancel',hideLens,{passive:true});
  search.addEventListener('input',render);close.onclick=()=>dialog.close();dialog.addEventListener('close',()=>{hideLens();viewer?.close();document.documentElement.style.overflow=oldOverflow;opener?.focus({preventScroll:true});});
  dialog.addEventListener('keydown',e=>{if(e.key!=='Tab')return;const all=[...dialog.querySelectorAll('button,input,a[href]')].filter(e=>e.getClientRects().length),first=all[0],last=all.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}});
  const b=node('button','button secondary','Browse every card');b.type='button';b.dataset.contactOpen='';b.dataset.world='cinema-contact-sheet';b.onclick=()=>{opener=b;oldOverflow=document.documentElement.style.overflow;document.documentElement.style.overflow='hidden';render();dialog.showModal();search.focus();};
  const home=document.querySelector('[data-latest-grid]');const target=home?.parentElement||document.querySelector('.page-intro');if(home)target.insertBefore(b,home);else target.append(b);
 });
}

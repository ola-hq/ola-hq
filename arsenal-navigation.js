
(() => {
'use strict';
const menu=document.getElementById('ars-mobile-menu');
const more=document.getElementById('ars-mobile-more');
const dock=document.querySelector('.ars-mobile-dock');
if(!menu||!more||!dock)return;
let lastFocused=null;
const open=()=>{
 lastFocused=document.activeElement;
 menu.hidden=false;
 more.setAttribute('aria-expanded','true');
 more.classList.add('is-active');
 menu.querySelector('.ars-mobile-sheet-top button')?.focus();
};
const close=()=>{
 if(menu.hidden)return;
 menu.hidden=true;
 more.setAttribute('aria-expanded','false');
 more.classList.remove('is-active');
 (lastFocused||more).focus({preventScroll:true});
};
more.addEventListener('click',()=>menu.hidden?open():close());
menu.querySelectorAll('[data-ars-menu-close]').forEach(el=>el.addEventListener('click',close));
menu.querySelectorAll('a').forEach(el=>el.addEventListener('click',()=>{
 menu.hidden=true;more.setAttribute('aria-expanded','false');more.classList.remove('is-active');
}));
document.addEventListener('keydown',event=>{
 if(menu.hidden)return;
 if(event.key==='Escape'){event.preventDefault();close();return;}
 if(event.key==='Tab'){
  const focusables=[...menu.querySelectorAll('button:not([disabled]), a[href]')].filter(el=>!el.classList.contains('ars-mobile-backdrop'));
  if(!focusables.length)return;
  const first=focusables[0],last=focusables[focusables.length-1];
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
 }
});
const keyFor=id=>id==='scores'?'scores':id==='culture'?'culture':id==='archive'?'archive':'club';
const setActive=key=>{
 dock.querySelectorAll('a[data-ars-dock]').forEach(a=>{
  const selected=a.dataset.arsDock===key;
  a.classList.toggle('is-active',selected);
  if(selected)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');
 });
};
const sections=['club','season','matchday','scores','culture','collection','crossover','archive'].map(x=>document.getElementById(x)).filter(Boolean);
const update=()=>{
 const threshold=window.scrollY+window.innerHeight*.32;
 const section=[...sections].reverse().find(s=>s.getBoundingClientRect().top+window.scrollY<=threshold);
 setActive(keyFor(section?.id||'club'));
};
document.addEventListener('scroll',update,{passive:true});
window.addEventListener('hashchange',()=>{if(!menu.hidden)close();update()});
update();
})();

const toggle=document.querySelector('.menu'),nav=document.querySelector('.nav');
const closeMenu=()=>{nav?.classList.remove('open');toggle?.setAttribute('aria-expanded','false')};
toggle?.addEventListener('click',()=>{const open=nav.classList.toggle('open');toggle.setAttribute('aria-expanded',String(open))});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&nav?.classList.contains('open')){closeMenu();toggle.focus()}});
nav?.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));

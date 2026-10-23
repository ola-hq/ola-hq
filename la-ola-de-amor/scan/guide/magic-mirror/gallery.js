(() => {
  'use strict';
  const $=s=>document.querySelector(s), dialog=$('#viewer'), image=$('#full-photo');
  const cards=[...document.querySelectorAll('[data-photo]')];
  const originals=document.body.dataset.collection==='originals';
  let lang='en',current=0,opener=null,sharing=false,photoFile=null,renderToken=0,zoomed=false,touchStart=null;
  try{lang=localStorage.getItem('laOlaGuideLang')==='es'?'es':'en';}catch{}
  const requested=new URL(location.href).searchParams.get('lang');
  if(['en','es'].includes(requested))lang=requested;
  const text=(en,es)=>lang==='es'?es:en;
  function setLanguage(next){
    lang=next;document.documentElement.lang=lang==='es'?'es-MX':'en';
    document.title=(originals?text('Original Magic Mirror Strips','Tiras originales del Espejo Mágico'):text('Magic Mirror Keepsakes','Recuerdos del Espejo Mágico'))+' · La Ola de Amor';
    document.querySelectorAll('[data-en]').forEach(el=>el.textContent=el.dataset[lang]);
    document.querySelectorAll('[data-lang]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.lang===lang)));
    cards.forEach((card,i)=>{card.setAttribute('aria-label',text('Open photo ','Abrir foto ')+(i+1));card.querySelector('img').alt=(originals?text('Original double strip ','Tira doble original '):text('La Ola keepsake strip ','Recuerdo de La Ola '))+(i+1);});
    $('#close').setAttribute('aria-label',text('Close photo','Cerrar foto'));
    $('#previous').setAttribute('aria-label',text('Previous photo','Foto anterior'));
    $('#next').setAttribute('aria-label',text('Next photo','Siguiente foto'));
    $('#photos').setAttribute('aria-label',text('Magic Mirror photos','Fotos del Espejo Mágico'));
    document.querySelector('.collection-nav').setAttribute('aria-label',text('Photo collections','Colecciones de fotos'));
    document.querySelector('.languages').setAttribute('aria-label',text('Language','Idioma'));
    setZoom(zoomed);
    try{localStorage.setItem('laOlaGuideLang',lang);}catch{}
    if(dialog.open)render();
  }
  function render(){
    const token=++renderToken;
    photoFile=null;$('#share-status').textContent='';
    setZoom(false);
    const src=cards[current].getAttribute('href');
    $('#photo-title').textContent=originals?text('Original strip','Tira original'):text('Your La Ola keepsake','Tu recuerdo de La Ola');
    $('#counter').textContent=`${current+1} / ${cards.length}`;
    $('#previous').disabled=current===0;$('#next').disabled=current===cards.length-1;
    $('#load-status').textContent=text('Loading photo…','Cargando foto…');
    image.alt=(originals?text('Original double strip ','Tira doble original '):text('La Ola keepsake strip ','Recuerdo de La Ola '))+(current+1);
    image.onload=()=>{$('#load-status').textContent='';};
    image.onerror=()=>{$('#load-status').textContent=text('Couldn’t load this photo. Check your connection and try again.','No se pudo cargar la foto. Revisa tu conexión e inténtalo de nuevo.');};
    image.src=src;$('#download').href=src;$('#download').download=src.split('/').pop();$('#open-original').href=src;
    if(navigator.canShare){
      fetch(src).then(r=>{if(!r.ok)throw Error('photo');return r.blob();}).then(blob=>{if(token===renderToken)photoFile=new File([blob],src.split('/').pop(),{type:'image/jpeg'});}).catch(()=>{});
    }
  }
  function open(index,card){current=index;opener=card;render();dialog.showModal();$('#close').focus();}
  function setZoom(value){
    zoomed=value;$('#image-stage').classList.toggle('zoomed',value);
    $('#zoom').setAttribute('aria-pressed',String(value));
    $('#zoom').textContent=value?text('Fit to screen','Ajustar a pantalla'):text('Zoom in','Ampliar');
    $('#image-stage').scrollTo(0,0);
  }
  function move(delta){const next=current+delta;if(next>=0&&next<cards.length){current=next;render();}}
  cards.forEach((card,i)=>card.addEventListener('click',e=>{e.preventDefault();open(i,card);}));
  document.querySelectorAll('[data-lang]').forEach(b=>b.addEventListener('click',()=>setLanguage(b.dataset.lang)));
  $('#close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>opener?.focus());
  $('#previous').addEventListener('click',()=>move(-1));
  $('#next').addEventListener('click',()=>move(1));
  $('#zoom').addEventListener('click',()=>setZoom(!zoomed));
  $('#image-stage').addEventListener('pointerdown',e=>{touchStart=e.pointerType==='touch'&&!zoomed?{x:e.clientX,y:e.clientY}:null;});
  $('#image-stage').addEventListener('pointerup',e=>{if(!touchStart||zoomed)return;const dx=e.clientX-touchStart.x,dy=e.clientY-touchStart.y;touchStart=null;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.5)move(dx<0?1:-1);});
  $('#image-stage').addEventListener('pointercancel',()=>{touchStart=null;});
  dialog.addEventListener('keydown',e=>{if(!['INPUT','TEXTAREA'].includes(e.target.tagName)&&!zoomed){if(e.key==='ArrowLeft'){e.preventDefault();move(-1);}if(e.key==='ArrowRight'){e.preventDefault();move(1);}}});
  $('#share').addEventListener('click',async()=>{
    if(sharing)return;
    if(!photoFile||!navigator.canShare?.({files:[photoFile]})){$('#share-status').textContent=text('Use Download photo, or open the full-size photo and press and hold to save it.','Usa Descargar foto, o abre la foto completa y mantenla presionada para guardarla.');return;}
    sharing=true;
    try{await navigator.share({files:[photoFile],title:'La Ola de Amor · Magic Mirror'});}catch(error){if(error.name!=='AbortError')$('#share-status').textContent=text('Sharing is unavailable here. Use Download photo or open the full-size photo.','No se puede compartir aquí. Usa Descargar foto o abre la foto completa.');}finally{sharing=false;}
  });
  setLanguage(lang);
})();

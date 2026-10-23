(() => {
  'use strict';
  const $=s=>document.querySelector(s), dialog=$('#viewer'), image=$('#full-photo');
  const cards=[...document.querySelectorAll('[data-photo]')];
  let lang='en',current=0,opener=null,sharing=false,photoFile=null;
  try{lang=localStorage.getItem('laOlaGuideLang')==='es'?'es':'en';}catch{}
  const requested=new URL(location.href).searchParams.get('lang');
  if(['en','es'].includes(requested))lang=requested;
  const text=(en,es)=>lang==='es'?es:en;
  function setLanguage(next){
    lang=next;document.documentElement.lang=lang==='es'?'es-MX':'en';
    document.title=text('Magic Mirror Photos','Fotos del Espejo Mágico')+' · La Ola de Amor';
    document.querySelectorAll('[data-en]').forEach(el=>el.textContent=el.dataset[lang]);
    document.querySelectorAll('[data-lang]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.lang===lang)));
    cards.forEach((card,i)=>{card.setAttribute('aria-label',text('Open photo ','Abrir foto ')+(i+1));card.querySelector('img').alt=text('Magic Mirror photo strip ','Tira de fotos del Espejo Mágico ')+(i+1);});
    $('#close').setAttribute('aria-label',text('Close photo','Cerrar foto'));
    $('#previous').setAttribute('aria-label',text('Previous photo','Foto anterior'));
    $('#next').setAttribute('aria-label',text('Next photo','Siguiente foto'));
    $('#photos').setAttribute('aria-label',text('Magic Mirror photos','Fotos del Espejo Mágico'));
    try{localStorage.setItem('laOlaGuideLang',lang);}catch{}
    if(dialog.open)render();
  }
  function render(){
    photoFile=null;$('#share-status').textContent='';
    const src=cards[current].getAttribute('href');
    $('#photo-title').textContent=text('Magic Mirror','Espejo Mágico');
    $('#counter').textContent=`${current+1} / ${cards.length}`;
    $('#previous').disabled=current===0;$('#next').disabled=current===cards.length-1;
    $('#load-status').textContent=text('Loading photo…','Cargando foto…');
    image.alt=text('Magic Mirror photo strip ','Tira de fotos del Espejo Mágico ')+(current+1);
    image.onload=()=>{$('#load-status').textContent='';};
    image.onerror=()=>{$('#load-status').textContent=text('Couldn’t load this photo. Check your connection and try again.','No se pudo cargar la foto. Revisa tu conexión e inténtalo de nuevo.');};
    image.src=src;$('#download').href=src;$('#download').download=src.split('/').pop();$('#open-original').href=src;
    if(navigator.canShare){
      const index=current;
      fetch(src).then(r=>{if(!r.ok)throw Error('photo');return r.blob();}).then(blob=>{if(index===current)photoFile=new File([blob],src.split('/').pop(),{type:'image/jpeg'});}).catch(()=>{});
    }
  }
  function open(index,card){current=index;opener=card;render();dialog.showModal();$('#close').focus();}
  cards.forEach((card,i)=>card.addEventListener('click',e=>{e.preventDefault();open(i,card);}));
  document.querySelectorAll('[data-lang]').forEach(b=>b.addEventListener('click',()=>setLanguage(b.dataset.lang)));
  $('#close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>opener?.focus());
  $('#previous').addEventListener('click',()=>{if(current>0){current--;render();}});
  $('#next').addEventListener('click',()=>{if(current<cards.length-1){current++;render();}});
  dialog.addEventListener('keydown',e=>{if(!['INPUT','TEXTAREA'].includes(e.target.tagName)){if(e.key==='ArrowLeft'&&current>0){e.preventDefault();current--;render();}if(e.key==='ArrowRight'&&current<cards.length-1){e.preventDefault();current++;render();}}});
  $('#share').addEventListener('click',async()=>{
    if(sharing)return;
    if(!photoFile||!navigator.canShare?.({files:[photoFile]})){$('#share-status').textContent=text('Use Download photo, or open the full-size photo and press and hold to save it.','Usa Descargar foto, o abre la foto completa y mantenla presionada para guardarla.');return;}
    sharing=true;
    try{await navigator.share({files:[photoFile],title:'La Ola de Amor · Magic Mirror'});}catch(error){if(error.name!=='AbortError')$('#share-status').textContent=text('Sharing is unavailable here. Use Download photo or open the full-size photo.','No se puede compartir aquí. Usa Descargar foto o abre la foto completa.');}finally{sharing=false;}
  });
  setLanguage(lang);
})();

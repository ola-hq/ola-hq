/* The wedding album reads the canonical public event registry. */
(() => {
'use strict';
const ROOT = new URL('../../', document.currentScript.src);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const url = value => {
  const parsed = new URL(value, ROOT);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Invalid media URL');
  return parsed.href;
};
const registries=new Map();
async function events(eventId=null) {
 const key=eventId||'catalog';
 if(!registries.has(key))registries.set(key,(async()=>{
  const response=await fetch(new URL('data/events/index.json',ROOT));if(!response.ok)throw Error('Collection unavailable');return response.json();
 })());
 return registries.get(key);
}
const image = (p, eager=false) => p.thumbnailAvailable===false?'<div class="og-missing-thumb" role="img" aria-label="Archive thumbnail unavailable">Preview unavailable<br>Source preserved</div>':`<img src="${esc(url(p.thumbnail))}" width="${p.width}" height="${p.height}" alt="${esc(p.caption)}" loading="${eager?'eager':'lazy'}" decoding="async">`;
class OlaGallery extends HTMLElement {
  async connectedCallback() {
    try {
      const data = await events(this.getAttribute('event'));
      if (!this.isConnected) return;
      this.event = data.events.find(e => e.id === this.getAttribute('event'));
      if (!this.event) throw new Error('Collection unavailable');
      this.preview = data.privatePreview === true;
      this.photos = this.event.photos.filter(p => this.preview || (this.event.publicationStatus==='approved' && p.publicationStatus==='approved'));
      this.recommendationPreview=this.preview&&new URLSearchParams(location.search).get('recommendations')==='1';
      this.selectionPreview=this.preview&&(this.event.selectionOnly||this.recommendationPreview||new URLSearchParams(location.search).get('reviewSelection')==='1');
      if(this.selectionPreview)this.photos=this.photos.filter(p=>p.draftDecision==='include');
      this.shown = 36;
      this.render();
      this.onHash = () => {this.restorePhoto();this.scrollToGrid();};
      window.addEventListener('hashchange', this.onHash);
      this.restorePhoto();
      this.scrollToGrid();
    } catch { this.innerHTML = '<p role="status">The photographs couldn’t load. Please check your connection and reload this page.</p>'; }
  }
  scrollToGrid(){
    const target=location.hash;if(!['#photographs','#downloads'].includes(target))return;
    requestAnimationFrame(()=>{if(this.isConnected&&location.hash===target)this.querySelector(target)?.scrollIntoView({block:'start',behavior:'instant'});});
  }
  disconnectedCallback() { window.removeEventListener('hashchange',this.onHash); }
  render() {
    const e=this.event,brand=this.getAttribute('brand')||'default';
    const copy={eyebrow:'EVENT PHOTO ARCHIVE',heading:e.title,emphasis:'One frame at a time.',coverLabel:e.title+' · '+e.dateLabel,collectionLabel:'photographs',gridLabel:'Event photographs',emptyMessage:'The photographs are being prepared.',relatedPrefix:'',gridEyebrow:'A LITTLE PIECE OF THAT NIGHT',gridHeading:'Keep the feeling.',gridButton:'Find your people ↓',downloadHint:'Photographs need an internet connection. On iPhone, open the original and touch and hold to save it to Photos.',downloadsHeading:'A little wave. Or all of it.',downloadsDescription:'Choose a smaller part for your phone, or keep the complete collection.',...e.gallery,...e.gallery?.brands?.[brand]};
    const covers = [this.photos.find(p=>p.id===e.coverId)||this.photos[0],this.photos.find(p=>p.id===e.secondaryCoverId)||this.photos[8]||this.photos[1]].filter(Boolean);
    const packages = (this.preview || e.publicationStatus==='approved') ? e.packages.filter(p=>(!this.selectionPreview||(!this.recommendationPreview&&p.selectionOnly))&&(this.preview||p.publicationStatus==='approved')) : [];
    const wedding=brand==='wedding';
    this.setAttribute('data-brand',brand);
    const heroImage=p=>image({...p,thumbnail:p.display||p.thumbnail,caption:p.caption},true);
    const mirror=(copy.collections||[])[0];
    const liveRoot=document.querySelector('meta[name="public-root"]')?.content||ROOT.href;
    const mirrorUrl=mirror?new URL(mirror.href,liveRoot).href:'';
    const mirrorCount=mirror?.label.match(/\d+/)?.[0]||'40';
    const downloadCards=packages.map((p,i)=>`<a class="album-package ${i===0?'album-package--complete':''}" href="${esc(url(p.url))}" download="${esc(p.filename)}"><span class="album-package-icon" aria-hidden="true">↓</span><span><strong>${i===0?'The complete collection':'Part '+i}</strong><small>${esc(p.label.replace(/^(Complete collection|Part \d+) · /,''))} <span>·</span> ${(p.bytes/1e6).toFixed(1)} MB</small></span><span aria-hidden="true">↗</span></a>`).join('');
    const keepLink=mirror?`<a class="album-keepsakes" href="${esc(mirrorUrl)}"><span class="album-keepsakes-mark" aria-hidden="true">✧</span><span><small>ANOTHER LITTLE PIECE OF THAT NIGHT</small><strong>Magic Mirror Keepsakes</strong><span>${esc(mirrorCount)} photo-booth keepsakes. All your people, a little more magic.</span></span><span class="album-keepsakes-cta">Explore keepsakes <b aria-hidden="true">↗</b></span></a>`:'';
    const hero=wedding?`<section class="album-hero"><div class="album-hero-copy"><p class="album-kicker">${esc(e.title)} <span>—</span> THE WEDDING ALBUM</p><div class="album-couple">${esc(this.getAttribute('couple')||e.title)} <span>✧</span> ${esc(e.dateLabel)}</div><h1>A night to remember.<br><em>A little piece to keep.</em></h1><p class="album-intro">Our people. Our happy accidents. The feeling of being together, kept in ${this.photos.length} little frames.</p><div class="album-actions"><a class="og-button album-primary" href="#photographs">Browse the photographs <span>↓</span></a><a class="album-text-link" href="#downloads">Download photos ↓</a></div><p class="album-place">${esc(e.location)} <span>·</span> INSTANT FILM, FOREVER FEELINGS</p></div><div class="album-cover"><figure class="album-main-print">${covers[0]?heroImage(covers[0]):''}<figcaption>${esc(this.getAttribute('couple')||e.title)} <i>with love, from Guadalajara</i></figcaption></figure>${covers[1]?`<figure class="album-small-print">${heroImage(covers[1])}<figcaption>OUR KIND OF MAGIC.</figcaption></figure>`:''}<span class="album-cover-note">one night, so many little waves</span></div></section>${keepLink}`:`<div class="archive-breadcrumb"><a href="${esc(url('our-polaroid-project/events/'))}">Events</a><span>/</span><span>${esc(e.title)}</span></div><section class="event-hero"><div class="event-hero-copy"><p class="album-kicker">EVENT 001 <span>·</span> ${esc(e.type||(e.collectionId?.includes('wedding')?'Wedding':'Event'))} <span>·</span> ${esc(e.year)}</p><h1>${esc(e.title)}<span>One night.<br>All our people.</span></h1><p>${esc(e.description)}</p><dl class="event-facts"><div><dt>DATE</dt><dd>${esc(e.dateLabel)}</dd></div><div><dt>PLACE</dt><dd>${esc(e.location)}</dd></div></dl><div class="album-actions"><a class="og-button album-primary" href="#photographs">Explore ${this.photos.length} frames <span>↓</span></a><a class="album-text-link" href="#downloads">Downloads ↓</a></div></div><figure class="event-main-print">${covers[0]?heroImage(covers[0]):''}<figcaption><span>${esc(e.title)} / ${esc(e.year)}</span><span>FRAME ${String(covers[0]?.frameNumber||'').padStart(3,'0')}</span></figcaption></figure></section><nav class="event-tabs" aria-label="Event sections"><a href="#photographs">Photographs <span>${this.photos.length}</span></a><a href="#downloads">Downloads <span>${packages.length}</span></a>${mirror?`<a href="${esc(mirrorUrl)}">Magic Mirror Keepsakes ↗</a>`:''}</nav>`;
    this.innerHTML = `${hero}<section id="photographs" class="og-photos"><div class="album-section-heading"><div><p class="album-kicker">${wedding?'THE ALBUM':'THE PHOTOGRAPHS'}</p><h2>${wedding?'Find your people.':'The night, frame by frame.'}</h2></div><div class="album-grid-tools"><span class="album-photo-total">${this.photos.length} photographs</span><label class="album-frame-search"><span class="sr-only">Find a frame</span><input type="search" placeholder="Find a frame, e.g. 029" aria-label="Find a frame"></label></div></div><div class="og-grid" aria-label="${esc(copy.gridLabel)}"></div><p class="album-photo-status" role="status" aria-live="polite"></p><button class="og-button og-more" type="button">Show more photographs</button><p class="album-save-hint">Open any frame to view it larger, save the original, or share a little wave.</p></section>${packages.length?`<section id="downloads" class="og-downloads"><div class="album-download-intro"><p class="album-kicker">TAKE A LITTLE OF IT WITH YOU</p><h2>${wedding?'Keep the whole night.':'Download the collection.'}</h2><p>The original photographs, just as they were scanned. Save all ${this.photos.length}, or choose a smaller part for your phone.</p><span class="album-download-note">ZIP FILES <span>·</span> ORIGINAL JPEGS <span>·</span> NO SIGN-IN</span></div><div class="album-packages">${downloadCards}</div></section>`:''}${wedding?'':keepLink}<p class="og-related">${esc(copy.relatedPrefix)} ${(copy.related||[]).map(link=>`<a href="${esc(url(link.href))}">${esc(link.label)}</a>`).join(' · ')}</p>
      <dialog class="og-viewer" aria-label="Photograph viewer"><div class="og-viewer-top"><span class="og-position" aria-live="polite"></span><button type="button" class="og-close" aria-label="Close photograph">Close ✕</button></div><div class="og-viewer-image"><img alt=""><p class="og-image-error" hidden>Display image unavailable. Check your connection and try again.</p></div><p class="og-caption"></p><div class="og-viewer-actions"><button type="button" class="og-prev" aria-label="Previous photograph">← Previous</button><a class="og-save" download>Download original ↓</a><button type="button" class="og-share">Share ↗</button><button type="button" class="og-next" aria-label="Next photograph">Next →</button></div><p><a class="og-original" target="_blank" rel="noopener">Open original to save ↗</a></p><p class="og-feedback" role="status"></p></dialog>`;
    this.querySelector('.album-frame-search input').oninput=ev=>{const q=ev.target.value.trim().toLowerCase();this.filteredPhotos=q?this.photos.filter(p=>p.caption.toLowerCase().includes(q)||String(p.frameNumber).padStart(3,'0').includes(q)):null;this.shown=36;this.draw();};
    this.dialog = this.querySelector('dialog');
    this.draw();
    this.querySelector('.og-more').onclick = () => { this.shown += 36; this.draw(); };
    this.querySelector('.og-close').onclick = () => this.closePhoto();
    this.dialog.addEventListener('cancel',ev=>{ev.preventDefault();this.closePhoto();});
    this.dialog.addEventListener('click',ev=>{if(ev.target===this.dialog)this.closePhoto();});
    this.querySelector('.og-prev').onclick=()=>this.move(-1);
    this.querySelector('.og-next').onclick=()=>this.move(1);
    this.dialog.addEventListener('keydown',ev=>{if(ev.key==='ArrowLeft'||ev.key==='ArrowRight'){ev.preventDefault();this.move(ev.key==='ArrowLeft'?-1:1);}});
    this.querySelector('.og-share').onclick=()=>this.share();
    const large=this.querySelector('.og-viewer-image img');
    large.onerror=()=>{this.querySelector('.og-image-error').hidden=false;};
  }
  draw() {
    const visible=this.filteredPhotos||this.photos;
    this.querySelector('.og-grid').innerHTML = visible.slice(0,this.shown).map((p,i)=>`<button type="button" class="og-frame" data-photo="${esc(p.id)}" aria-label="Open photograph ${this.photos.indexOf(p)+1}: ${esc(p.caption)}">${image(p)}<span>FRAME ${String(p.frameNumber||i+1).padStart(3,'0')} <span aria-hidden="true">↗</span></span></button>`).join('');
    this.querySelector('.og-more').hidden=this.shown>=visible.length;
    this.querySelector('.album-photo-status').textContent=visible.length?`${Math.min(this.shown,visible.length)} of ${visible.length} photographs${this.filteredPhotos?' matching your search':''}`:'No frames match that search.';
    this.querySelectorAll('[data-photo]').forEach(b=>b.onclick=()=>{this.opener=b;location.hash='photo='+encodeURIComponent(b.dataset.photo);});
  }
  restorePhoto() {
    const id=new URLSearchParams(location.hash.slice(1)).get('photo');
    const index=this.photos.findIndex(p=>p.id===id);
    if(index<0){if(this.dialog.open)this.dialog.close();return;}
    this.index=index;this.showPhoto();
    if(!this.dialog.open)this.dialog.showModal();
  }
  showPhoto() {
    const p=this.photos[this.index], large=this.querySelector('.og-viewer-image img');
    this.querySelector('.og-image-error').hidden=true;
    large.hidden=p.displayAvailable===false;large.src=p.displayAvailable===false?'':url(p.display);large.alt=p.caption;if(p.displayAvailable===false)this.querySelector('.og-image-error').hidden=false;
    this.querySelector('.og-caption').textContent=(this.event.isAggregate&&p.sourceEventTitle?p.sourceEventTitle+' · ':'')+p.caption;
    this.querySelector('.og-position').textContent=`${this.index+1} / ${this.photos.length} · ${this.event.title}`;
    const save=this.querySelector('.og-save');save.href=url(p.download);save.download=p.originalFilename;save.textContent=(p.downloadLabel||'Download original')+' ↓';save.hidden=p.downloadAvailable===false;
    const inline=new URL(url(p.download));inline.searchParams.set('inline','1');const originalLink=this.querySelector('.og-original');originalLink.href=inline.href;originalLink.textContent=(p.inlineLabel||'Open original to save')+' ↗';originalLink.hidden=p.downloadAvailable===false;
    this.querySelector('.og-feedback').textContent=p.downloadNote||'';
    const p2=this.photos[(this.index+1)%this.photos.length];
    // Only the next display image is prefetched, never all originals.
    if(p2){this.nextImage=new Image();this.nextImage.src=url(p2.display);}
  }
  move(delta) {
    this.index=(this.index+delta+this.photos.length)%this.photos.length;
    history.replaceState(history.state,'','#photo='+encodeURIComponent(this.photos[this.index].id));
    this.showPhoto();
  }
  closePhoto() {
    this.dialog.close();
    // Replace the photograph state; preserve the app shell's joint history.
    history.replaceState(history.state,'',location.pathname+location.search+'#photographs');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    this.opener?.focus({preventScroll:true});
  }
  async share() {
    const status=this.querySelector('.og-feedback');
    try {
      if(navigator.share&&!this.event.gallery?.privateLinkOnly) await navigator.share({title:this.event.title,text:this.photos[this.index].caption,url:location.href});
      else {await navigator.clipboard.writeText(location.href);status.textContent='Photo link copied.';}
    } catch(error) {
      if(error.name!=='AbortError')status.textContent='Sharing is unavailable here. Copy this page’s address, or open the original to save it.';
    }
  }
}
customElements.define('ola-gallery', OlaGallery);
})();

/* LIVE 1: verified film and stable continuous wedding album. */
(()=>{'use strict';const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// ZIP membership is verified against these consecutive slices of the approved album.
const partSizes = [50, 50, 50, 24];
const partAnchors = partSizes.map((_, index) => '#part-' + (index + 1));

class RefinedGallery extends customElements.get('ola-gallery'){

 async connectedCallback() {
  document.documentElement.classList.add('wedding-album-navigation');
  this.previousScrollRestoration = history.scrollRestoration;
  history.scrollRestoration = 'manual';
  this.restoreNativeHistory = () => { history.scrollRestoration = this.previousScrollRestoration; };
  this.useAlbumHistory = () => { history.scrollRestoration = 'manual'; };
  window.addEventListener('pagehide', this.restoreNativeHistory);
  window.addEventListener('pageshow', this.useAlbumHistory);
  this.sectionClick = event => {
    const link = event.target.closest?.('a[href]');
    const target = link?.getAttribute('href');
    if (!this.isAlbumSection(target)) return;
    event.preventDefault();
    if (location.hash !== target) history.pushState(history.state, '', target);
    this.scrollToGrid();
  };
  document.addEventListener('click', this.sectionClick);
  await super.connectedCallback();
 }

 disconnectedCallback() {
  document.removeEventListener('click', this.sectionClick);
  document.documentElement.classList.remove('wedding-album-navigation');
  history.scrollRestoration = this.previousScrollRestoration;
  window.removeEventListener('pagehide', this.restoreNativeHistory);
  window.removeEventListener('pageshow', this.useAlbumHistory);
  cancelAnimationFrame(this.sectionScroll);
  super.disconnectedCallback();
 }

 isAlbumSection(target) {
  return ['#photographs', '#downloads', '#keepsakes', ...partAnchors].includes(target);
 }
 render(){super.render();const mirror=this.querySelector('.album-keepsakes'),mirrorURL=mirror?.href||'';
  const hero=this.querySelector('.album-hero');hero.className='keepsake-opening';hero.innerHTML=`<div class="keepsake-title"><p>PLAZA SAN ROBERTO · GUADALAJARA</p><h1>Our night, forever.</h1><span>Bri + Jon <b>♥</b> October 16, 2026</span></div><figure class="wedding-film" aria-labelledby="film-title"><div class="film-caption"><h2 id="film-title">Our wedding film.</h2><span>1 MIN 25 SEC · SOUND ON WHEN YOU PRESS PLAY</span></div><video id="wedding-film" width="1080" height="1920" style="aspect-ratio:9/16" controls playsinline preload="none" poster="https://loda-wedding-media.jonathanmlizardi.workers.dev/events/la-ola-de-amor-2026/film/la-ola-de-amor-wedding-film-guest-safe-review-v1-poster.jpg" aria-label="La Ola de Amor wedding film" aria-describedby="film-help"><source src="https://loda-wedding-media.jonathanmlizardi.workers.dev/events/la-ola-de-amor-2026/film/la-ola-de-amor-wedding-film-guest-safe-review-v1.mp4" type="video/mp4">Your browser cannot play this film. <a href="https://loda-wedding-media.jonathanmlizardi.workers.dev/events/la-ola-de-amor-2026/film/la-ola-de-amor-wedding-film-guest-safe-review-v1.mp4">Open the wedding film</a>.</video><figcaption id="film-help">Press play to relive the night. Sound and full-screen controls are in the player. <a href="https://loda-wedding-media.jonathanmlizardi.workers.dev/events/la-ola-de-amor-2026/film/la-ola-de-amor-wedding-film-guest-safe-review-v1.mp4">Open film separately ↗</a></figcaption><p class="film-error" role="status" hidden>The film could not load. <a href="https://loda-wedding-media.jonathanmlizardi.workers.dev/events/la-ola-de-amor-2026/film/la-ola-de-amor-wedding-film-guest-safe-review-v1.mp4">Try opening the film separately</a>, or continue to the photographs below.</p></figure><div class="keepsake-foot"><div class="plaza-identity"><img src="/ola-hq/la-ola-de-amor/scan/guide/art/identity-01.webp" alt="Plaza San Roberto — original festival identity"><span>From our favorite corner,<br><i>with love.</i></span></div><nav aria-label="Album shortcuts"><a class="download-shortcut" href="#downloads">Downloads <span>↓</span></a>${mirrorURL?`<a class="mirror-button" href="${esc(mirrorURL)}">Magic Mirror Keepsakes <span>↗</span></a>`:''}</nav></div>`;
  this.querySelector('#wedding-film').addEventListener('error', () => { this.querySelector('.film-error').hidden = false; });
  this.querySelector('.album-section-heading h2').textContent='The photographs.';this.querySelector('.album-frame-search input').placeholder='Find a frame';
  this.querySelector('.album-section-heading .album-kicker').textContent='LA OLA DE AMOR / THE ALBUM';
  if(mirror){mirror.id='keepsakes';mirror.className='album-keepsakes refined-keepsakes';mirror.innerHTML='<span><small>THE PHOTO BOOTH / ESPEJO MÁGICO</small><strong>Magic Mirror Keepsakes</strong><span>One more little piece of the night. Explore all 40 keepsakes.</span></span><span class="mirror-button">Open keepsakes <b aria-hidden="true">↗</b></span>';this.querySelector('.og-downloads').after(mirror);}
  const grid = this.querySelector('.og-grid');
  grid.insertAdjacentHTML('beforebegin', `<nav class="album-part-links" aria-label="Jump to an album part">
    ${partAnchors.map((anchor, index) => `<a href="${anchor}">Part ${index + 1}</a>`).join('')}
  </nav>`);
  grid.addEventListener('click', event => {
    const button = event.target.closest('[data-photo]');
    if (!button) return;
    this.opener = button;
    location.hash = 'photo=' + encodeURIComponent(button.dataset.photo);
  });
  this.querySelector('.album-save-hint').textContent='Open any photograph to view it larger, share its link, or download the original JPEG.';
 }
 draw() {
  const grid = this.querySelector('.og-grid');
  const visible = this.filteredPhotos || this.photos;
  const positions = new Map(this.photos.map((photo, index) => [photo.id, index + 1]));
  const cards = photos => photos.map(photo => `
    <button type="button" class="og-frame" data-photo="${esc(photo.id)}"
      aria-label="Open photograph ${positions.get(photo.id)}: ${esc(photo.caption)}">
      <img src="${esc(photo.display || photo.thumbnail)}" width="${photo.width}" height="${photo.height}"
        alt="${esc(photo.caption)}" style="aspect-ratio:${photo.width}/${photo.height}" loading="lazy" decoding="async">
      <span>FRAME ${String(photo.frameNumber).padStart(3, '0')} <span aria-hidden="true">↗</span></span>
    </button>`).join('');

  grid.classList.add('album-parts');
  if (this.filteredPhotos) {
    grid.innerHTML = `<div class="og-grid">${cards(visible)}</div>`;
  } else {
    let start = 0;
    grid.innerHTML = partSizes.map((size, index) => {
      const photos = visible.slice(start, start + size);
      start += size;
      const part = index + 1;
      return `<section id="part-${part}" class="album-part" aria-labelledby="part-${part}-title">
        <h3 id="part-${part}-title">Part ${part} <span>${photos.length} photographs</span></h3>
        <div class="og-grid">${cards(photos)}</div>
      </section>`;
    }).join('');
  }

  const jumpLinks = this.querySelector('.album-part-links');
  if (jumpLinks) jumpLinks.hidden = Boolean(this.filteredPhotos);
  this.querySelector('.og-more').hidden = true;
  this.querySelector('.album-photo-status').textContent = visible.length
    ? `${visible.length} photographs${this.filteredPhotos ? ' matching your search' : ''}`
    : 'No frames match that search.';
 }

 scrollToGrid() {
  const target = location.hash;
  if (!this.isAlbumSection(target)) return;
  if (partAnchors.includes(target) && this.filteredPhotos) {
    this.querySelector('.album-frame-search input').value = '';
    this.filteredPhotos = null;
    this.draw();
  }
  cancelAnimationFrame(this.sectionScroll);
  this.sectionScroll = requestAnimationFrame(() => {
    if (!this.isConnected || location.hash !== target) return;
    const section = this.querySelector(target);
    if (!section) return;
    const headerHeight = document.querySelector('.og-shell-header')?.getBoundingClientRect().height || 0;
    const top = window.scrollY + section.getBoundingClientRect().top - headerHeight - 12;
    window.scrollTo({top: Math.max(0, top), behavior: 'auto'});
  });
 }

 closePhoto() {
  this.dialog.close();
  history.replaceState(history.state, '', location.pathname + location.search + '#photographs');
  const current = this.photos[this.index];
  const button = Array.from(this.querySelectorAll('[data-photo]'))
    .find(frame => frame.dataset.photo === current?.id) || this.opener;
  button?.focus();
 }
}
customElements.define('refined-gallery', RefinedGallery);
})();

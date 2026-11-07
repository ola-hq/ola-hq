/* One canonical event registry, consumed by both branded entrances. */
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
  const response=await fetch(new URL('data/events/index.json',ROOT));
  if(!response.ok)throw Error('Collection unavailable');
  const catalog=await response.json();
  const summary=eventId&&catalog.events.find(event=>event.id===eventId);
  if(!summary?.manifest)return catalog;
  if(summary.publicationStatus!=='approved')throw Error('Collection unavailable');
  const target=new URL(summary.manifest,ROOT);
  if(target.origin!==ROOT.origin||!target.pathname.startsWith(new URL('data/events/',ROOT).pathname))throw Error('Invalid event manifest');
  const detail=await fetch(target);if(!detail.ok)throw Error('Collection unavailable');
  const data=await detail.json(),event=data.events?.find(event=>event.id===eventId);
  if(!event||event.publicationStatus!=='approved')throw Error('Collection unavailable');
  return {...catalog,events:[event]};
 })());
 return registries.get(key);
}
const image = (p, eager=false) => p.thumbnailAvailable===false?'<div class="og-missing-thumb" role="img" aria-label="Archive thumbnail unavailable">Preview unavailable<br>Source preserved</div>':`<img src="${esc(url(p.thumbnail))}" width="${p.width}" height="${p.height}" alt="${esc(p.caption)}" loading="${eager?'eager':'lazy'}" decoding="async">`;

// Published event grouping uses only approved, present leaf galleries. No private-child metadata is needed.
function groupPublishedEvents(data,filters={},parentId='') {
 const approved=(data.events||[]).filter(event=>event.publicationStatus==='approved');
 const alphabetical=(a,b)=>String(a.title??'').localeCompare(String(b.title??''),'en',{sensitivity:'base',numeric:true})||String(a.id??'').localeCompare(String(b.id??''),'en');
 const recordedStart=event=>{
  const value=event.dateStart||event.date||'';
  if(!/^\d{4}-\d{2}(?:-\d{2})?$/.test(value))return '';
  const [year,month,day]=value.split('-').map(Number);
  if(month<1||month>12||day!=null&&(day<1||day>new Date(Date.UTC(year,month,0)).getUTCDate()))return '';
  return value;
 };
 const newestFirst=(a,b)=>{
  const startA=recordedStart(a),startB=recordedStart(b);
  const yearA=Number(a.year)||Number(startA.slice(0,4)),yearB=Number(b.year)||Number(startB.slice(0,4));
  // A partial month remains partial. Year-only entries follow known dates; unknown years sort last.
  return yearB-yearA||Number(!!startB)-Number(!!startA)||startB.localeCompare(startA)||alphabetical(a,b);
 };
 const daySequence=(a,b)=>{
  const weekendA=a.title?.match(/Weekend\s+(\d+)/i),weekendB=b.title?.match(/Weekend\s+(\d+)/i);
  if(weekendA&&weekendB&&Number(weekendA[1])!==Number(weekendB[1]))return Number(weekendA[1])-Number(weekendB[1]);
  const dayA=a.title?.match(/\bDay\s+(\d+)/i),dayB=b.title?.match(/\bDay\s+(\d+)/i);
  if(dayA&&dayB)return Number(dayA[1])-Number(dayB[1])||alphabetical(a,b);
  const startA=recordedStart(a),startB=recordedStart(b);
  return Number(!!startB)-Number(!!startA)||startA.localeCompare(startB)||alphabetical(a,b);
 };
 const byId=new Map(approved.map(event=>[event.id,event]));
 const parents=(data.parentEvents||[]).filter(parent=>parent.publicationStatus==='approved').map(parent=>({...parent,children:parent.childEventIds.map(id=>byId.get(id)).filter(Boolean).sort(daySequence)})).filter(parent=>parent.children.length);
 const byParent=new Map(parents.map(parent=>[parent.id,parent]));
 const normalize=value=>String(value??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
 const query=normalize(filters.q);
 const matches=(event,parent)=>{
  if(filters.year&&(filters.year==='unknown'?!!event.year:String(event.year)!==filters.year))return false;
  return (' '+normalize([event.title,event.dateLabel,event.location,...(event.searchTerms||[]),parent?.title,...(parent?.searchTerms||[])].join(' '))).includes(' '+query);
 };
 const selectedParent=parentId?byParent.get(parentId):null;
 if(parentId&&!selectedParent)return {rows:[],eventCount:0,leafGalleryCount:0,photoCount:0,parentEventCount:0,dayGalleryCount:0};
 if(selectedParent){
  const rows=selectedParent.children.filter(event=>matches(event,selectedParent));
  return {rows,eventCount:1,leafGalleryCount:rows.length,photoCount:rows.reduce((n,event)=>n+(event.photoCount??event.photos.length),0),parentEventCount:1,dayGalleryCount:rows.length,parent:selectedParent};
 }
 const parentByChild=new Map(parents.flatMap(parent=>parent.children.map(event=>[event.id,parent]))),seen=new Set(),rows=[];
 for(const event of approved){
  const parent=parentByChild.get(event.id);
  if(!parent){if(matches(event))rows.push(event);continue;}
  if(seen.has(parent.id))continue;seen.add(parent.id);
  const children=parent.children.filter(child=>matches(child,parent));if(!children.length)continue;
  const cover=children.flatMap(child=>child.photos).find(photo=>photo.id===parent.coverId)||children[0].photos[0];
  rows.push({...parent,isParent:true,photos:cover?[cover]:[],coverId:cover?.id,photoCount:children.reduce((n,child)=>n+(child.photoCount??child.photos.length),0),galleryCount:children.length,matchingGalleries:query?children:[]});
 }
 rows.sort(newestFirst);
 return {rows,eventCount:rows.length,leafGalleryCount:rows.reduce((n,row)=>n+(row.isParent?row.galleryCount:1),0),photoCount:rows.reduce((n,row)=>n+(row.photoCount??row.photos.length),0),parentEventCount:rows.filter(row=>row.isParent).length,dayGalleryCount:rows.filter(row=>row.isParent).reduce((n,row)=>n+row.galleryCount,0)};
}
// End published event grouping.

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
    if(location.hash!=='#photographs')return;
    requestAnimationFrame(()=>{if(this.isConnected&&location.hash==='#photographs')this.querySelector('#photographs')?.scrollIntoView({block:'start',behavior:'instant'});});
  }
  disconnectedCallback() { window.removeEventListener('hashchange',this.onHash); }
  render() {
    const e=this.event,brand=this.getAttribute('brand')||'default';
    const copy={eyebrow:'EVENT PHOTO ARCHIVE',heading:e.title,emphasis:'One frame at a time.',coverLabel:e.title+' · '+e.dateLabel,collectionLabel:'photographs',gridLabel:'Event photographs',emptyMessage:'The photographs are being prepared.',relatedPrefix:'',gridEyebrow:'A LITTLE PIECE OF THAT NIGHT',gridHeading:'Keep the feeling.',gridButton:'Find your people ↓',downloadHint:'Photographs need an internet connection. On iPhone, open the original and touch and hold to save it to Photos.',downloadsHeading:'A little wave. Or all of it.',downloadsDescription:'Choose a smaller part for your phone, or keep the complete collection.',...e.gallery,...e.gallery?.brands?.[brand]};
    const covers = [this.photos.find(p=>p.id===e.coverId)||this.photos[0],this.photos.find(p=>p.id===e.secondaryCoverId)||this.photos[8]||this.photos[1]].filter(Boolean);
    const packages = (this.preview || e.publicationStatus==='approved') ? e.packages.filter(p=>(!this.selectionPreview||(!this.recommendationPreview&&p.selectionOnly))&&(this.preview||p.publicationStatus==='approved')) : [];
    this.innerHTML = `${this.preview?`<p class="og-review">PRIVATE REVIEW · ${this.recommendationPreview?'PROVISIONAL RECOMMENDATIONS · Owner choices take priority · No exclusion or publication approval':this.selectionPreview?'Saved owner selection · '+this.photos.length+' candidates · '+(e.heldCount||0)+' reversible holds · Selected ZIPs contain included originals only':'Photographs awaiting publication approval'}</p>`:''}
      <section class="og-hero${e.archive?' og-hero--archive':''}"><div><p class="og-eyebrow">${esc(copy.eyebrow)}</p>
      <h1>${esc(copy.heading)}<br><em>${esc(copy.emphasis)}</em></h1>
      <p class="og-description">${esc(e.description)}</p><p class="og-meta">${esc(e.dateLabel)}<br>${esc(e.location)}</p>
      <a class="og-button" href="#photographs">${esc(copy.gridButton)}</a></div><div class="og-cover-stack" aria-hidden="true">${covers.map(p=>`<figure>${image({...p,caption:''},true)}<figcaption>${esc(copy.coverLabel)}</figcaption></figure>`).join('')||'<span class="og-ornament">✧</span>'}</div></section>
      <nav class="og-collections" aria-label="Photo collections"><span>${this.photos.length?this.photos.length+' '+esc(copy.collectionLabel):esc(copy.collectionLabel)+' · coming soon'}</span>${(copy.collections||[]).map(link=>`<a href="${esc(url(link.href))}">${esc(link.label)}</a>`).join('')}</nav>
      <section id="photographs" class="og-photos"><div class="og-heading"><div><p class="og-eyebrow">${esc(copy.gridEyebrow)}</p><h2>${esc(copy.gridHeading)}</h2></div><p>Open a frame. Save a memory.<br>Send it to someone who was there.</p></div>
      <p class="og-hint">${esc(copy.downloadHint)}</p>${e.missingAssetCount?`<p class="og-asset-warning" role="status">${e.missingAssetCount} archive previews are unavailable or unverified. No replacements have been substituted.</p>`:''}
      <div class="og-grid" aria-label="${esc(copy.gridLabel)}"></div><button class="og-button og-more" type="button">Show more photographs</button>
      ${!this.photos.length?`<p class="og-empty">${this.selectionPreview?'No photographs have been included in this draft yet. Return to the local photo review to choose frames.':esc(copy.emptyMessage)}</p>`:''}</section>
      ${packages.length?`<section class="og-downloads"><p class="og-eyebrow">TAKE THE NIGHT HOME</p><h2>${esc(copy.downloadsHeading)}</h2><p>${esc(copy.downloadsDescription)}</p><div>${packages.map(p=>`<a class="og-button" href="${esc(url(p.url))}" download="${esc(p.filename)}">${esc(p.label)} · ${(p.bytes/1e6).toFixed(1)} MB ↓</a>`).join('')}</div></section>`:''}
      <p class="og-related">${esc(copy.relatedPrefix)} ${(copy.related||[]).map(link=>`<a href="${esc(url(link.href))}">${esc(link.label)}</a>`).join(' · ')}</p>
      <dialog class="og-viewer" aria-label="Photograph viewer"><div class="og-viewer-top"><span class="og-position" aria-live="polite"></span><button type="button" class="og-close" aria-label="Close photograph">Close ✕</button></div>
      <div class="og-viewer-image"><img alt=""><p class="og-image-error" hidden>Display image unavailable. Check the available download or the archive inventory.</p></div><p class="og-caption"></p><div class="og-viewer-actions"><button type="button" class="og-prev" aria-label="Previous photograph">← Previous</button><a class="og-save" download>Download original ↓</a><button type="button" class="og-share">Share ↗</button><button type="button" class="og-next" aria-label="Next photograph">Next →</button></div><p><a class="og-original" target="_blank" rel="noopener">Open original to save ↗</a></p><p class="og-feedback" role="status"></p></dialog>`;
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
    this.querySelector('.og-grid').innerHTML = this.photos.slice(0,this.shown).map((p,i)=>`<button type="button" class="og-frame" data-photo="${esc(p.id)}" aria-label="Open photograph ${i+1}: ${esc(p.caption)}">${image(p)}<span>FRAME ${String(p.frameNumber||i+1).padStart(3,'0')} <span aria-hidden="true">↗</span></span></button>`).join('');
    this.querySelector('.og-more').hidden=this.shown>=this.photos.length;
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
class OlaEvents extends HTMLElement {
 async connectedCallback(){
  try{
   this.data=await events();if(!this.isConnected)return;const q=new URLSearchParams(location.search);
   this.filters={q:q.get('q')||'',year:q.get('year')||'',family:q.has('family')?q.get('family'):(this.getAttribute('family')||''),view:q.get('view')||'events',sort:q.get('sort')||'newest'};this.limit=24;this.render();this.onSectionHash=()=>this.scrollToSection();window.addEventListener('hashchange',this.onSectionHash);this.scrollToSection();
  }catch{this.innerHTML='<p role="status">Events couldn’t load. Please check your connection and reload.</p>';}
 }
 disconnectedCallback(){window.removeEventListener('hashchange',this.onSectionHash);}
 scrollToSection(){
  const selector={'#event-cards':'#event-cards','#browse':'#browse','#event-families':'#event-families'}[location.hash];if(!selector)return;
  requestAnimationFrame(()=>{if(!this.isConnected||selector!==location.hash)return;const target=this.querySelector(selector);target?.scrollIntoView({block:'start',behavior:'instant'});target?.focus?.({preventScroll:true});});
 }
 card(e){const p=e.photos.find(p=>p.id===e.coverId)||e.photos[0],visible=this.data.privatePreview||(e.publicationStatus==='approved'&&p?.publicationStatus==='approved'),count=e.photoCount??e.photos.length;return `<a class="og-event-card" href="${esc(url(e.route||('our-polaroid-project/events/'+encodeURIComponent(e.id)+'/')))}">${p&&visible?image(p):'<div class="og-event-placeholder">✧</div>'}<div><p class="og-eyebrow">${esc(e.dateLabel||'')}${e.location?' · '+esc(e.location):''}</p><h2>${esc(e.title)}</h2>${e.description?`<p>${esc(e.description)}</p>`:''}<span>${visible?count+(e.pendingCuration?' candidate photographs · Awaiting curation':' photographs')+(e.isFamily?' · '+e.galleryCount+' galleries':''):'Photographs coming soon'}${e.heldCount?' · '+e.heldCount+' holds preserved':''} · ${e.isFamily?'Explore collection':'Open event'} ↗</span></div></a>`;}
 exhibition(family){
  const roots=(this.data.families||[]).filter(p=>(this.data.rootFamilyIds||[]).includes(p.id)),features=family?[family]:roots;
  const lead=family||roots.find(p=>p.title==='Coachella')||roots[0]||this.data.events.find(p=>p.archive)||this.data.events[0],secondary=family?this.data.events.find(p=>family.childEventIds.includes(p.id)&&p.photos?.[0]?.id!==lead?.photos?.[0]?.id):this.data.events.find(p=>!p.archive);
  const art=(e,tag)=>e?.photos?.[0]?`<figure class="og-exhibit-print">${image({...e.photos[0],thumbnail:e.photos[0].display||e.photos[0].thumbnail,caption:e.title},true)}<figcaption>${esc(tag)} / ${esc(e.title)}</figcaption></figure>`:'';
  return `<nav class="og-quick-jumps" aria-label="Event shortcuts"><a href="#event-cards">Jump to events <span>↓</span></a><a href="#browse">Search &amp; filters</a>${family?'':'<a href="#event-families">Collections</a>'}</nav><section class="og-exhibition-hero"><div class="og-exhibition-copy"><p class="og-eyebrow">OUR POLAROID WAVE / THE EVENT ARCHIVE</p><h1>${family?esc(family.title):'We were<br><em>here.</em>'}</h1><p class="og-exhibition-lead">${family?'Every edition. Every little moment. The photographs, together.':'The nights that became stories.<br>The people who made them ours.'}</p><a class="og-exhibition-link" href="#browse">${family?'Explore this collection':'Find your chapter'} <span>↓</span></a><p class="og-exhibition-note">${family?family.galleryCount+' galleries / '+family.photoCount+' photographs':this.data.events.length+' events / '+this.data.events.reduce((n,e)=>n+(e.photoCount??e.photos.length),0).toLocaleString()+' photographs / a lifetime in frames'}</p></div><div class="og-exhibition-art">${art(lead,'FROM THE ARCHIVE')}${art(secondary,'ONE FRAME, ONE MEMORY')}<span class="og-art-caption">INSTANT FILM. REAL MOMENTS.</span></div></section>
  ${family?'':`<section class="og-family-exhibition" id="event-families" tabindex="-1" aria-label="Featured archive families"><div class="og-exhibition-heading"><div><p class="og-eyebrow">THE COLLECTIONS WITHIN THE COLLECTION</p><h2>Some places stay with you.</h2></div><p>Go back to a feeling.</p></div><div class="og-family-exhibit-grid">${features.map((e,i)=>`<a class="og-family-exhibit" href="${esc(url(e.route))}"><div class="og-family-art">${e.photos?.[0]?image(e.photos[0]):''}<span>0${i+1}</span></div><div class="og-family-title"><h3>${esc(e.title)}</h3><span>↗</span></div><p>${e.galleryCount} galleries <span>·</span> ${e.photoCount} photographs</p></a>`).join('')}</div></section>`}
  <div class="og-browse-heading" id="browse" tabindex="-1"><p class="og-eyebrow">THE COMPLETE EVENT ARCHIVE</p><h2>${family?'Every chapter.':'Find your chapter.'}</h2><p>Follow a year, a place, or a familiar name.</p></div>`;
 }
 renderPublished() {
  this.publishedEvents=this.data.events.filter(event=>event.publicationStatus==='approved');
  const years=[...new Set(this.publishedEvents.map(event=>event.year).filter(Boolean))].sort((a,b)=>b-a);
  const unknown=this.publishedEvents.some(event=>!event.year);
  this.filters.family='';this.filters.view='events';this.filters.sort='newest';
  if(!years.some(year=>String(year)===this.filters.year)&&!(unknown&&this.filters.year==='unknown'))this.filters.year='';
  const parent=(this.data.parentEvents||[]).find(parent=>parent.id===this.getAttribute('parent'));
  this.innerHTML=`<header class="og-events-intro"><h1>${parent?esc(parent.title):'We were here'}</h1>
    <p class="og-results" role="status" aria-live="polite"></p>
    <div class="og-events-filters" aria-label="Find an event">
      <label>Search events<input id="og-search" aria-label="Search events" type="search" placeholder="Event, day, place, or name" value="${esc(this.filters.q)}"></label>
      ${years.length>1||unknown?`<label>Year<select id="og-year" aria-label="Year"><option value="">All years</option>${years.map(year=>`<option value="${year}" ${String(year)===this.filters.year?'selected':''}>${year}</option>`).join('')}${unknown?`<option value="unknown" ${this.filters.year==='unknown'?'selected':''}>Year to confirm</option>`:''}</select></label>`:''}
      <button class="og-button og-clear" type="button">Clear filters</button>
    </div></header><div class="og-event-grid" id="event-cards" tabindex="-1" aria-label="Published events"></div>`;
  this.querySelector('#og-search').oninput=event=>{this.filters.q=event.target.value;this.writeQuery();this.drawPublished();};
  const year=this.querySelector('#og-year');if(year)year.oninput=event=>{this.filters.year=event.target.value;this.writeQuery();this.drawPublished();};
  this.querySelector('.og-clear').onclick=()=>{this.filters.q='';this.filters.year='';this.writeQuery();this.renderPublished();};
  this.drawPublished();
 }
 drawPublished() {
  const result=groupPublishedEvents(this.data,this.filters,this.getAttribute('parent')||'');
  const parent=result.parent;
  this.querySelector('.og-results').textContent=parent?
   `${result.leafGalleryCount} day ${result.leafGalleryCount===1?'gallery':'galleries'} · ${result.photoCount.toLocaleString()} photos`:
   `${result.eventCount} ${result.eventCount===1?'event':'events'} · ${result.leafGalleryCount} ${result.leafGalleryCount===1?'gallery':'galleries'} · ${result.photoCount.toLocaleString()} photos`;
  this.querySelector('.og-event-grid').innerHTML=result.rows.map(event=>{
   const cover=event.photos.find(photo=>photo.id===event.coverId)||event.photos[0];
   const detail=[event.dateLabel,event.location].filter(Boolean).join(' · ');
   const media=cover?.publicationStatus==='approved'?image({...cover,caption:`${event.title} album cover`}):'<div class="og-event-placeholder">✧</div>';
   const route=url(event.route||('our-polaroid-project/events/'+encodeURIComponent(event.id)+'/'));
   const matches=(event.matchingGalleries||[]).map(child=>`<a href="${esc(url(child.route))}">${esc(child.title)} · ${child.photoCount??child.photos.length} photos ↗</a>`).join('');
   return `<article class="og-event-card${event.isParent?' og-parent-event':''}"><a class="og-event-entry" href="${esc(route)}">${media}<div><h2>${esc(event.title)}</h2><p class="og-event-date">${esc(detail)}</p><span>${event.isParent?event.galleryCount+' day galleries · ':''}${(event.photoCount??event.photos.length).toLocaleString()} photos · ${event.isParent?'Open event':'Open album'} ↗</span></div></a>${matches?`<nav class="og-matching-days" aria-label="Matching day galleries">${matches}</nav>`:''}</article>`;
  }).join('')||'<p class="og-empty">No events match these filters. Try another year or name.</p>';
 }

 render(){
  if(this.getAttribute('layout')==='published')return this.renderPublished();
  const data=this.data,f=this.filters,stats=data.archiveStats,all=data.events,families=data.families||[],family=families.find(p=>p.id===f.family),wedding=all.filter(p=>!p.archive),totalPhotos=all.reduce((sum,e)=>sum+(e.photoCount??e.photos.length),0),years=[...new Set(all.map(e=>e.year).filter(Boolean))].sort((a,b)=>b-a);
  this.innerHTML=`${this.exhibition(family)}${data.privatePreview?'<p class="og-review">PRIVATE LOCAL ARCHIVE · Selected does not mean approved for public sharing · Links work on this Mac</p>':''}${stats?`<section class="og-archive-stats" aria-label="Connected archive totals"><div><strong>${stats.events}</strong><span>archive galleries</span></div><div><strong>${stats.photos.toLocaleString()}</strong><span>selected archive photographs</span></div><div><strong>${stats.destinations}</strong><span>preserved archive destinations</span></div><div><strong>${wedding.reduce((n,e)=>n+(e.photoCount??e.photos.length),0)}</strong><span>new-event candidates · ${wedding.reduce((n,e)=>n+(e.heldCount||0),0)} holds preserved</span></div></section>`:''}
   <section class="og-directory-controls" aria-label="Find an event"><label>Search events<input id="og-search" aria-label="Search events" type="search" placeholder="Event, festival, or collection name" value="${esc(f.q)}"></label><label>Year<select id="og-year" aria-label="Year"><option value="">All years</option>${years.map(y=>`<option value="${y}" ${String(y)===f.year?'selected':''}>${y}</option>`).join('')}<option value="unknown" ${f.year==='unknown'?'selected':''}>Year to confirm</option></select></label><label>Collection<select id="og-family" aria-label="Collection"><option value="">All collections</option>${families.map(p=>`<option value="${esc(p.id)}" ${p.id===f.family?'selected':''}>${esc(p.title)}</option>`).join('')}</select></label><label>Browse<select id="og-view" aria-label="Browse"><option value="events" ${f.view==='events'?'selected':''}>Every event</option><option value="destinations" ${f.view==='destinations'?'selected':''}>Archive destinations</option></select></label><label>Sort<select id="og-sort" aria-label="Sort">${[['newest','Newest first'],['oldest','Oldest first'],['title','Event name'],['largest','Most photographs']].map(([v,l])=>`<option value="${v}" ${f.sort===v?'selected':''}>${l}</option>`).join('')}</select></label><button class="og-button og-clear" type="button">Clear filters</button></section>
   <section class="og-family-context" ${family?'':'hidden'}>${family?`<p class="og-eyebrow">${esc(family.title)} · ${family.galleryCount} galleries · ${family.photoCount} photographs</p><a class="og-button" href="${esc(url(family.allRoute))}">Explore all ${family.photoCount} photographs ↗</a>${family.childFamilyIds?.length?`<nav aria-label="Nested collections">${family.childFamilyIds.map(id=>families.find(p=>p.id===id)).filter(Boolean).map(p=>`<a href="${esc(url(p.route))}">${esc(p.title)} · ${p.galleryCount} galleries ↗</a>`).join('')}</nav>`:''}`:''}</section>
   <nav class="og-family-links" aria-label="Archive family entrances">${families.filter(p=>(data.rootFamilyIds||[]).includes(p.id)).map(p=>`<a href="${esc(url(p.route))}">${esc(p.title)} <span>${p.galleryCount}</span></a>`).join('')}</nav><p class="og-results" role="status" aria-live="polite"></p><div class="og-event-grid" id="event-cards" tabindex="-1" aria-label="Event galleries"></div><button class="og-button og-events-more" type="button">Show more events</button>`;
  const wire=(id,key)=>{this.querySelector(id).oninput=()=>{this.filters[key]=this.querySelector(id).value;this.limit=24;if(key==='family'){this.writeQuery();this.render();}else{this.writeQuery();this.drawEvents();}};};
  wire('#og-search','q');wire('#og-year','year');wire('#og-family','family');wire('#og-view','view');wire('#og-sort','sort');this.querySelector('.og-clear').onclick=()=>{this.filters={q:'',year:'',family:'',view:'events',sort:'newest'};this.limit=24;this.writeQuery();this.render();};this.querySelector('.og-events-more').onclick=()=>{this.limit+=24;this.drawEvents();};this.drawEvents();
 }
 writeQuery(){const q=new URLSearchParams(location.search);for(const [key,value] of Object.entries(this.filters)){if(value&&(key!=='sort'||value!=='newest')&&(key!=='view'||value!=='events')||key==='family'&&this.getAttribute('family'))q.set(key,value);else q.delete(key);}history.replaceState(history.state,'',location.pathname+(q.toString()?'?'+q:'')+location.hash);}
 drawEvents(){
  const f=this.filters,normalize=t=>String(t??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase(),family=(this.data.families||[]).find(p=>p.id===f.family);let rows=f.view==='destinations'&&!family?(this.data.destinations||this.data.events):this.data.events;
  const matches=e=>{const ancestry=(this.data.families||[]).filter(p=>p.childEventIds.includes(e.id)).map(p=>p.title);return (!f.year||(f.year==='unknown'?!e.year:String(e.year)===f.year))&&normalize([e.title,e.dateLabel,e.location,...(e.searchTerms||[]),...ancestry].join(' ')).includes(normalize(f.q));};
  if(f.view==='destinations'&&!family)rows=rows.flatMap(e=>{if(!e.isFamily)return matches(e)?[e]:[];const children=this.data.events.filter(p=>e.childEventIds.includes(p.id)&&matches(p));if(!children.length)return [];const cover=e.photos.find(p=>children.some(child=>child.id===p.sourceEventId))||children[0].photos[0];return [{...e,photoCount:children.reduce((n,p)=>n+(p.photoCount??p.photos.length),0),galleryCount:children.length,photos:cover?[cover]:[],coverId:cover?.id}];});
  else rows=rows.filter(e=>(!family||family.childEventIds.includes(e.id))&&matches(e));
  rows=[...rows].sort((a,b)=>{if(f.sort==='title')return a.title.localeCompare(b.title);if(f.sort==='largest')return (b.photoCount??b.photos.length)-(a.photoCount??a.photos.length)||a.title.localeCompare(b.title);if(!a.year||!b.year)return (!a.year)-(!b.year)||a.title.localeCompare(b.title);return (f.sort==='oldest'?1:-1)*(a.year-b.year||String(a.date||'').localeCompare(String(b.date||'')))||a.title.localeCompare(b.title);});
  const count=rows.reduce((n,e)=>n+(e.photoCount??e.photos.length),0);this.querySelector('.og-results').textContent=`${rows.length} ${f.view==='destinations'&&!family?'destinations':'events'} · ${count.toLocaleString()} photographs${rows.length>this.limit?' · showing '+this.limit:''}`;this.querySelector('.og-event-grid').innerHTML=rows.slice(0,this.limit).map(e=>this.card(e)).join('')||'<p class="og-empty">No events match these filters. Try another year or collection.</p>';this.querySelector('.og-events-more').hidden=this.limit>=rows.length;
 }
}
customElements.define('ola-gallery',OlaGallery);
customElements.define('ola-events',OlaEvents);
})();
